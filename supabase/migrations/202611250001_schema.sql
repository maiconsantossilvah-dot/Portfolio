-- Execute uma vez, em ordem. Nenhum UUID administrativo é criado por esta migration.
begin;
revoke create on schema public from public, anon, authenticated;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table private.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  require_mfa boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index single_owner on private.admin_users ((true));
alter table private.admin_users enable row level security;
revoke all on private.admin_users from public, anon, authenticated;

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.admin_users a where a.user_id = (select auth.uid())
    and (not a.require_mfa or (select auth.jwt()->>'aal') = 'aal2'));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create function private.safe_url(value text, contact boolean default false) returns boolean language sql immutable set search_path = '' as $$
  select value = '' or (value !~ '[[:cntrl:][:space:]]' and (
    value ~ '^https://[a-zA-Z0-9.-]+(:[0-9]+)?([/?#][^[:cntrl:]]*)?$'
    or (contact and value ~ '^(mailto:[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~@-]+|tel:\+?[0-9()-]+)$')));
$$;
create table public.media_assets (
  id uuid primary key default gen_random_uuid(), storage_path text not null unique,
  thumbnail_path text unique, file_name text not null check(length(file_name) between 1 and 255),
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  size bigint not null check(size > 0 and size <= 30000000), width integer not null check(width > 0), height integer not null check(height > 0),
  alt_text text not null default '', caption text not null default '', tag text not null default '',
  deleting boolean not null default false, created_at timestamptz not null default now(),
  check(storage_path ~ '^images/[a-f0-9-]{36}/original\.(jpg|png|webp|avif)$'),
  check(thumbnail_path is null or thumbnail_path ~ '^images/[a-f0-9-]{36}/thumb\.webp$')
);
create table public.projects (
  id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 3 and 180),
  slug text not null unique check(length(slug) <= 200 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null default '' check(length(excerpt)<=500), description text not null default '',
  project_type text not null default 'case' check(project_type in ('case','pdp','images','app')),
  cover_media_id uuid references public.media_assets(id) on delete restrict,
  status text not null default 'draft' check(status in ('draft','published','archived')),
  featured boolean not null default false, sort_order integer not null default 0 check(sort_order>=0),
  client_name text not null default '', brand_name text not null default '', contribution text not null default '',
  external_url text not null default '' check(private.safe_url(external_url)), demo_url text not null default '' check(private.safe_url(demo_url)),
  project_date date, seo_title text not null default '' check(length(seo_title)<=180), seo_description text not null default '' check(length(seo_description)<=500),
  product_name text not null default '', authorship text not null default '',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), published_at timestamptz,
  check(status <> 'published' or (length(trim(excerpt))>0 and cover_media_id is not null))
);
create table public.project_blocks (
  id uuid primary key default gen_random_uuid(), project_id uuid not null references public.projects(id) on delete cascade,
  block_type text not null check(block_type in ('heading','subheading','paragraph','rich_text','image','gallery','image_grid','comparison','banner','video','embed','features','technologies','specs','faq','process','code','link','metric','divider','spacer','pdp')),
  content jsonb not null default '{}' check(jsonb_typeof(content)='object'), sort_order integer not null default 0 check(sort_order>=0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(not(content ? 'url') or private.safe_url(content->>'url'))
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 120),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), description text not null default '', sort_order integer not null default 0
);
create table public.technologies (
  id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 100),
  slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), icon text
);
create table public.project_categories (
  project_id uuid not null references public.projects(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict, primary key(project_id, category_id)
);
create table public.project_technologies (
  project_id uuid not null references public.projects(id) on delete cascade,
  technology_id uuid not null references public.technologies(id) on delete restrict, primary key(project_id, technology_id)
);
create table public.project_media (
  project_id uuid not null references public.projects(id) on delete cascade,
  media_id uuid not null references public.media_assets(id) on delete restrict, primary key(project_id, media_id)
);
create table public.services (
  id uuid primary key default gen_random_uuid(), title text not null check(length(trim(title)) between 1 and 180),
  description text not null default '', icon text not null default 'layout', price text not null default '',
  active boolean not null default true, sort_order integer not null default 0
);
create table public.public_profile (
  id integer primary key default 1 check(id=1), name text not null, full_name text not null, role text not null,
  bio text not null, photo_media_id uuid references public.media_assets(id) on delete restrict,
  contacts jsonb not null default '[]' check(jsonb_typeof(contacts)='array')
);
create table public.site_settings (
  id integer primary key default 1 check(id=1), hero_title text not null, hero_description text not null,
  available boolean not null default true, availability_text text not null,
  contact_title text not null, contact_description text not null, accent text not null default 'blue' check(accent in ('blue','violet','teal')),
  sections jsonb not null default '[]' check(jsonb_typeof(sections)='array'), share_media_id uuid references public.media_assets(id) on delete restrict,
  institutional_text text not null default ''
);
create table public.admin_settings (
  id integer primary key default 1 check(id=1), autosave boolean not null default true
);
insert into public.admin_settings(id) values(1);

create index projects_public_order on public.projects(status, sort_order, created_at desc);
create index project_blocks_order on public.project_blocks(project_id, sort_order);
create index project_media_asset on public.project_media(media_id);
create index project_categories_category on public.project_categories(category_id);
create index project_technologies_technology on public.project_technologies(technology_id);

create function private.media_public(asset_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.project_media pm join public.projects p on p.id=pm.project_id where pm.media_id=asset_id and p.status='published')
    or exists(select 1 from public.public_profile where photo_media_id=asset_id)
    or exists(select 1 from public.site_settings where share_media_id=asset_id);
$$;
create function private.storage_readable(object_name text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists(select 1 from public.media_assets m where not m.deleting and (m.storage_path=object_name or m.thumbnail_path=object_name) and private.media_public(m.id));
$$;
create function private.storage_deletable(object_name text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() and not exists (
    select 1 from public.media_assets m where (m.storage_path=object_name or m.thumbnail_path=object_name)
    and (not m.deleting or exists(select 1 from public.project_media pm where pm.media_id=m.id)
      or exists(select 1 from public.projects p where p.cover_media_id=m.id)
      or private.media_public(m.id)));
$$;
revoke all on all functions in schema private from public;
grant execute on function private.safe_url(text, boolean), private.media_public(uuid), private.storage_readable(text), private.storage_deletable(text) to anon, authenticated;

do $$ declare t text; begin
  foreach t in array array['projects','project_blocks','categories','technologies','project_categories','project_technologies','media_assets','project_media','services','public_profile','site_settings','admin_settings'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select on public.%I to anon, authenticated',t);
    execute format('grant insert, update, delete on public.%I to authenticated',t);
    execute format('create policy admin_all on public.%I for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))',t);
  end loop;
end $$;
create policy published_read on public.projects for select to anon, authenticated using(status='published');
create policy published_read on public.project_blocks for select to anon, authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.status='published'));
create policy published_read on public.project_categories for select to anon, authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.status='published'));
create policy published_read on public.project_technologies for select to anon, authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.status='published'));
create policy published_read on public.project_media for select to anon, authenticated using(exists(select 1 from public.projects p where p.id=project_id and p.status='published'));
create policy public_read on public.categories for select to anon, authenticated using(true);
create policy public_read on public.technologies for select to anon, authenticated using(true);
create policy active_read on public.services for select to anon, authenticated using(active);
create policy public_read on public.public_profile for select to anon, authenticated using(true);
create policy public_read on public.site_settings for select to anon, authenticated using(true);
create policy authorized_read on public.media_assets for select to anon, authenticated using(not deleting and private.media_public(id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-media','portfolio-media',false,26214400,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;
create policy portfolio_read on storage.objects for select to anon, authenticated using(bucket_id='portfolio-media' and private.storage_readable(name));
create policy portfolio_upload on storage.objects for insert to authenticated with check(bucket_id='portfolio-media' and (select public.is_admin()) and name ~ '^images/[a-f0-9-]{36}/(original\.(jpg|png|webp|avif)|thumb\.webp)$');
-- Imagens são imutáveis; substituir uma imagem gera outro UUID.
create policy portfolio_delete on storage.objects for delete to authenticated using(bucket_id='portfolio-media' and private.storage_deletable(name));

create function private.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
create trigger projects_updated before update on public.projects for each row execute function private.touch_updated_at();
create trigger blocks_updated before update on public.project_blocks for each row execute function private.touch_updated_at();

create function private.validate_public_content() returns trigger language plpgsql set search_path = '' as $$
declare item jsonb; begin
  if tg_table_name='public_profile' then
    if jsonb_array_length(new.contacts)>20 then raise check_violation using message='Too many contacts'; end if;
    for item in select * from jsonb_array_elements(new.contacts) loop
      if not(item ? 'label' and item ? 'url') or not private.safe_url(item->>'url',true) or length(item->>'url')=0 then raise check_violation using message='Invalid contact'; end if;
    end loop;
  else
    if jsonb_array_length(new.sections)<>4 or (select count(distinct value->>'id') from jsonb_array_elements(new.sections))<>4 then raise check_violation using message='Invalid sections'; end if;
    for item in select * from jsonb_array_elements(new.sections) loop
      if item->>'id' not in ('projects','services','about','contact') or jsonb_typeof(item->'visible')<>'boolean' then raise check_violation using message='Invalid section'; end if;
    end loop;
  end if;
  return new;
end $$;
create trigger validate_profile before insert or update on public.public_profile for each row execute function private.validate_public_content();
create trigger validate_settings before insert or update on public.site_settings for each row execute function private.validate_public_content();
commit;
