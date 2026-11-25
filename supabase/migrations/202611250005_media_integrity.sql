begin;
-- Referências de perfil/compartilhamento participam do mesmo bloqueio de exclusão.
create function private.validate_public_media() returns trigger language plpgsql security invoker set search_path = '' as $$
declare aid uuid; begin
  if tg_table_name='public_profile' then aid=new.photo_media_id; else aid=new.share_media_id; end if;
  if aid is not null then
    perform 1 from public.media_assets m where m.id=aid and not m.deleting for update;
    if not found then raise check_violation using message='Missing media'; end if;
    if not exists(select 1 from public.media_assets m join storage.objects o on o.bucket_id='portfolio-media' and o.name=m.storage_path where m.id=aid) then raise check_violation using message='Missing storage object'; end if;
  end if;
  return new;
end $$;
revoke all on function private.validate_public_media() from public, anon, authenticated;
create trigger validate_profile_media before insert or update on public.public_profile for each row execute function private.validate_public_media();
create trigger validate_share_media before insert or update on public.site_settings for each row execute function private.validate_public_media();
commit;
