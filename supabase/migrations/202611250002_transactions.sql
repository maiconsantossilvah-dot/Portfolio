begin;
-- SECURITY INVOKER: toda escrita continua sujeita às políticas RLS.
create function public.save_project(payload jsonb, expected_updated_at timestamptz default null) returns timestamptz
language plpgsql security invoker set search_path = '' as $$
declare
  pid uuid := (payload->>'id')::uuid; previous public.projects%rowtype; saved timestamptz;
  b jsonb; c jsonb; aid uuid; refs uuid[] := '{}'; cid uuid; tid uuid; next_status text := payload->>'status';
begin
  if not public.is_admin() then raise insufficient_privilege using message='Administrator required'; end if;
  if jsonb_typeof(payload->'blocks')<>'array' or jsonb_array_length(payload->'blocks')>200 then raise check_violation using message='Invalid blocks'; end if;
  -- Serializa edições do mesmo projeto, inclusive duas inserções simultâneas.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(pid::text,0));
  select * into previous from public.projects where id=pid for update;
  if found and (expected_updated_at is null or previous.updated_at<>expected_updated_at) then raise serialization_failure using message='Stale edit'; end if;
  if next_status='published' and jsonb_array_length(payload->'category_ids')=0 then raise check_violation using message='Category required'; end if;
  if nullif(payload->>'cover_media_id','') is not null then refs=array_append(refs,(payload->>'cover_media_id')::uuid); end if;
  for b in select * from jsonb_array_elements(payload->'blocks') loop
    c=b->'content';
    if jsonb_typeof(c)<>'object' then raise check_violation using message='Invalid block content'; end if;
    if c ? 'url' and not private.safe_url(c->>'url') then raise check_violation using message='Unsafe URL'; end if;
    if next_status='published' then
      if b->>'block_type' in ('image','gallery','image_grid','banner') and coalesce(jsonb_array_length(c->'media_ids'),0)=0 then raise check_violation using message='Image required'; end if;
      if b->>'block_type'='comparison' and coalesce(jsonb_array_length(c->'media_ids'),0)<>2 then raise check_violation using message='Two images required'; end if;
      if b->>'block_type' in ('embed','video','link') and coalesce(c->>'url','')='' then raise check_violation using message='URL required'; end if;
      if b->>'block_type'='pdp' and coalesce(jsonb_array_length(c->'desktop_ids'),0)+coalesce(jsonb_array_length(c->'mobile_ids'),0)=0 then raise check_violation using message='PDP captures required'; end if;
    end if;
    for aid in select value::text::uuid from jsonb_array_elements_text(coalesce(c->'media_ids','[]') || coalesce(c->'desktop_ids','[]') || coalesce(c->'mobile_ids','[]')) loop refs=array_append(refs,aid); end loop;
  end loop;
  -- Bloqueia mídias contra exclusão concorrente e valida também o objeto real.
  for aid in select distinct unnest(refs) order by 1 loop
    perform 1 from public.media_assets m where m.id=aid and not m.deleting for update;
    if not found then raise check_violation using message='Missing media'; end if;
    if not exists(select 1 from public.media_assets m join storage.objects o on o.bucket_id='portfolio-media' and o.name=m.storage_path where m.id=aid) then raise check_violation using message='Missing storage object'; end if;
  end loop;
  insert into public.projects(id,title,slug,excerpt,description,project_type,cover_media_id,status,featured,sort_order,client_name,brand_name,contribution,external_url,demo_url,project_date,seo_title,seo_description,product_name,authorship,published_at)
  values(pid,payload->>'title',payload->>'slug',payload->>'excerpt',payload->>'description',payload->>'project_type',nullif(payload->>'cover_media_id','')::uuid,next_status,(payload->>'featured')::boolean,(payload->>'sort_order')::integer,payload->>'client_name',payload->>'brand_name',payload->>'contribution',payload->>'external_url',payload->>'demo_url',nullif(payload->>'project_date','')::date,payload->>'seo_title',payload->>'seo_description',payload->>'product_name',payload->>'authorship',case when next_status='published' then coalesce(previous.published_at,now()) else previous.published_at end)
  on conflict(id) do update set title=excluded.title,slug=excluded.slug,excerpt=excluded.excerpt,description=excluded.description,project_type=excluded.project_type,cover_media_id=excluded.cover_media_id,status=excluded.status,featured=excluded.featured,sort_order=excluded.sort_order,client_name=excluded.client_name,brand_name=excluded.brand_name,contribution=excluded.contribution,external_url=excluded.external_url,demo_url=excluded.demo_url,project_date=excluded.project_date,seo_title=excluded.seo_title,seo_description=excluded.seo_description,product_name=excluded.product_name,authorship=excluded.authorship,published_at=excluded.published_at
  returning updated_at into saved;
  delete from public.project_blocks where project_id=pid;
  for b in select * from jsonb_array_elements(payload->'blocks') loop
    insert into public.project_blocks(id,project_id,block_type,content,sort_order) values((b->>'id')::uuid,pid,b->>'block_type',b->'content',(b->>'sort_order')::integer);
  end loop;
  delete from public.project_categories where project_id=pid;
  for cid in select value::uuid from jsonb_array_elements_text(payload->'category_ids') loop insert into public.project_categories values(pid,cid); end loop;
  delete from public.project_technologies where project_id=pid;
  for tid in select value::uuid from jsonb_array_elements_text(payload->'technology_ids') loop insert into public.project_technologies values(pid,tid); end loop;
  delete from public.project_media where project_id=pid;
  insert into public.project_media(project_id,media_id) select pid,unnest(refs) on conflict do nothing;
  return saved;
end $$;
revoke all on function public.save_project(jsonb,timestamptz) from public, anon;
grant execute on function public.save_project(jsonb,timestamptz) to authenticated;

create function public.reorder_projects(ordered_ids uuid[]) returns void language plpgsql security invoker set search_path = '' as $$
declare pid uuid; position integer := 0; begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  foreach pid in array ordered_ids loop update public.projects set sort_order=position where id=pid; position=position+1; end loop;
end $$;
revoke all on function public.reorder_projects(uuid[]) from public, anon;
grant execute on function public.reorder_projects(uuid[]) to authenticated;

create function public.prepare_media_delete(asset_id uuid) returns void language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  perform 1 from public.media_assets where id=asset_id for update;
  if exists(select 1 from public.project_media where media_id=asset_id) or exists(select 1 from public.projects where cover_media_id=asset_id) or exists(select 1 from public.public_profile where photo_media_id=asset_id) or exists(select 1 from public.site_settings where share_media_id=asset_id) then raise foreign_key_violation using message='Media in use'; end if;
  update public.media_assets set deleting=true where id=asset_id;
end $$;
revoke all on function public.prepare_media_delete(uuid) from public, anon;
grant execute on function public.prepare_media_delete(uuid) to authenticated;
commit;
