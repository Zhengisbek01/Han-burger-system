-- Согласие на обработку персональных данных (Закон РК «О персональных данных и их защите» № 94-V)
-- и язык интерфейса пользователя.

alter table public.profiles
  add column consent_at timestamptz,
  add column consent_version text,
  add column locale text not null default 'ru' check (locale in ('ru', 'kk', 'en'));

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv invitations; meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  select * into inv from invitations
   where lower(email) = lower(new.email) and accepted_at is null
   order by created_at desc limit 1;
  insert into profiles (id, email, full_name, phone, company_id, role, store_id, consent_at, consent_version, locale)
  values (new.id, new.email,
          coalesce(inv.full_name, meta->>'full_name'),
          meta->>'phone',
          inv.company_id, inv.role, inv.store_id,
          case when meta ? 'consent_version' then now() end,
          meta->>'consent_version',
          case when meta->>'locale' in ('ru', 'kk', 'en') then meta->>'locale' else 'ru' end);
  if inv.id is not null then
    update invitations set accepted_at = now() where id = inv.id;
  end if;
  return new;
end $$;

-- Пользователь может сам дать согласие (если зарегистрирован до появления согласия)
create or replace function public.give_consent(p_version text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Нужно войти'; end if;
  update profiles set consent_at = now(), consent_version = p_version where id = auth.uid();
end $$;

-- Отзыв согласия = удаление аккаунта. Владелец компании удаляет аккаунт через поддержку,
-- чтобы компания не осталась без владельца.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Нужно войти'; end if;
  if my_role() in ('owner', 'superadmin') then
    raise exception 'Владелец или администратор удаляет аккаунт через поддержку';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

revoke execute on function public.give_consent, public.delete_my_account from public, anon;
grant execute on function public.give_consent, public.delete_my_account to authenticated;
