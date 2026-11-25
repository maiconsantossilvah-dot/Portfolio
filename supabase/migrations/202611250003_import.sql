begin;
create function public.import_content(payload jsonb) returns void language plpgsql security invoker set search_path = '' as $$
declare row_data jsonb; current_stamp timestamptz; asset public.media_assets%rowtype;
begin
  if not public.is_admin() then raise insufficient_privilege; end if;
  if payload->>'version'<>'1' or pg_column_size(payload)>10485760 then raise check_violation using message='Invalid backup'; end if;
  -- Mescla, sem apagar conteúdos ausentes. Qualquer falha reverte toda a importação.
  for row_data in select * from jsonb_array_elements(payload->'categories') loop
    insert into public.categories select * from jsonb_populate_record(null::public.categories,row_data)
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,description=excluded.description,sort_order=excluded.sort_order;
  end loop;
  for row_data in select * from jsonb_array_elements(payload->'technologies') loop
    insert into public.technologies select * from jsonb_populate_record(null::public.technologies,row_data)
    on conflict(id) do update set name=excluded.name,slug=excluded.slug,icon=excluded.icon;
  end loop;
  for row_data in select * from jsonb_array_elements(payload->'media') loop
    asset=jsonb_populate_record(null::public.media_assets, row_data || '{"deleting":false}'::jsonb);
    if not exists(select 1 from storage.objects where bucket_id='portfolio-media' and name=asset.storage_path) or (asset.thumbnail_path is not null and not exists(select 1 from storage.objects where bucket_id='portfolio-media' and name=asset.thumbnail_path)) then raise check_violation using message='Restore storage files first'; end if;
    insert into public.media_assets select asset.* on conflict(id) do update set file_name=excluded.file_name,alt_text=excluded.alt_text,caption=excluded.caption,tag=excluded.tag;
  end loop;
  for row_data in select * from jsonb_array_elements(payload->'services') loop
    insert into public.services select * from jsonb_populate_record(null::public.services,row_data)
    on conflict(id) do update set title=excluded.title,description=excluded.description,icon=excluded.icon,price=excluded.price,active=excluded.active,sort_order=excluded.sort_order;
  end loop;
  for row_data in select * from jsonb_array_elements(payload->'projects') loop
    select updated_at into current_stamp from public.projects where id=(row_data->>'id')::uuid;
    perform public.save_project(row_data,current_stamp);
  end loop;
  insert into public.public_profile select * from jsonb_populate_record(null::public.public_profile,payload->'profile')
  on conflict(id) do update set name=excluded.name,full_name=excluded.full_name,role=excluded.role,bio=excluded.bio,photo_media_id=excluded.photo_media_id,contacts=excluded.contacts,author_note=excluded.author_note;
  insert into public.site_settings select * from jsonb_populate_record(null::public.site_settings,payload->'settings')
  on conflict(id) do update set hero_title=excluded.hero_title,hero_description=excluded.hero_description,available=excluded.available,availability_text=excluded.availability_text,contact_title=excluded.contact_title,contact_description=excluded.contact_description,accent=excluded.accent,sections=excluded.sections,share_media_id=excluded.share_media_id,institutional_text=excluded.institutional_text;
end $$;
revoke all on function public.import_content(jsonb) from public, anon;
grant execute on function public.import_content(jsonb) to authenticated;
commit;
