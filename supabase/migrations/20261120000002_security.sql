-- Доступ: helper-функции, триггеры-стражи, RLS-политики

-- ───────────── Кто я ─────────────
create or replace function public.my_company() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from profiles where id = auth.uid() and active
$$;
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;
create or replace function public.my_store() returns uuid
language sql stable security definer set search_path = public as $$
  select store_id from profiles where id = auth.uid() and active
$$;
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'superadmin' from profiles where id = auth.uid() and active), false)
$$;
create or replace function public.is_staff() returns boolean   -- владелец или менеджер производителя
language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('owner','manager') from profiles where id = auth.uid() and active), false)
$$;
-- может ли текущий пользователь работать с этим магазином
create or replace function public.can_store(p_store uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p join stores s on s.company_id = p.company_id
    where p.id = auth.uid() and p.active and s.id = p_store
      and (p.role in ('owner','manager') or p.store_id = p_store)
  )
$$;

-- ───────────── Новый пользователь ─────────────
-- Если на email есть приглашение — сразу привязываем к компании и роли.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare inv invitations;
begin
  select * into inv from invitations
   where lower(email) = lower(new.email) and accepted_at is null
   order by created_at desc limit 1;
  insert into profiles (id, email, full_name, phone, company_id, role, store_id)
  values (new.id, new.email,
          coalesce(inv.full_name, new.raw_user_meta_data->>'full_name'),
          new.raw_user_meta_data->>'phone',
          inv.company_id, inv.role, inv.store_id);
  if inv.id is not null then
    update invitations set accepted_at = now() where id = inv.id;
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────── Стражи от повышения прав ─────────────
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_admin() or current_setting('app.bypass', true) = '1' then return new; end if;
  -- владелец может менять роли/магазин/активность сотрудников своей компании, но не себе и не superadmin
  if my_role() = 'owner' and old.company_id = my_company() and old.id <> auth.uid() then
    if new.company_id is distinct from old.company_id then raise exception 'Нельзя перевести сотрудника в другую компанию'; end if;
    if new.role = 'superadmin' then raise exception 'Недопустимая роль'; end if;
    return new;
  end if;
  -- остальные: только своё имя и телефон
  new.company_id := old.company_id; new.role := old.role; new.store_id := old.store_id;
  new.active := old.active; new.email := old.email;
  return new;
end $$;
create trigger guard_profile before update on public.profiles
  for each row execute function public.guard_profile();

create or replace function public.guard_company() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_admin() and coalesce(current_setting('app.bypass', true), '') <> '1' then
    new.plan_id := old.plan_id; new.status := old.status; new.paid_till := old.paid_till;
  end if;
  return new;
end $$;
create trigger guard_company before update on public.companies
  for each row execute function public.guard_company();

-- лимит магазинов по тарифу
create or replace function public.check_store_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare lim int;
begin
  select p.max_stores into lim from companies c join plans p on p.id = c.plan_id where c.id = new.company_id;
  if lim is not null and (select count(*) from stores where company_id = new.company_id and active) >= lim then
    raise exception 'Лимит тарифа: не более % магазинов', lim;
  end if;
  return new;
end $$;
create trigger check_store_limit before insert on public.stores
  for each row execute function public.check_store_limit();

create or replace function public.touch_updated() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger t_orders before update on public.orders for each row execute function public.touch_updated();
create trigger t_store_stock before update on public.store_stock for each row execute function public.touch_updated();
create trigger t_wh before update on public.warehouse_stock for each row execute function public.touch_updated();

-- ───────────── RLS ─────────────
alter table public.plans enable row level security;
alter table public.companies enable row level security;
alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.products enable row level security;
alter table public.warehouse_stock enable row level security;
alter table public.store_stock enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;

create policy plans_read on public.plans for select to authenticated using (true);
create policy plans_admin on public.plans for all to authenticated using (is_admin()) with check (is_admin());

create policy companies_read on public.companies for select to authenticated using (id = my_company() or is_admin());
create policy companies_update on public.companies for update to authenticated
  using (is_admin() or (id = my_company() and my_role() = 'owner'))
  with check (is_admin() or (id = my_company() and my_role() = 'owner'));
create policy companies_admin_ins on public.companies for insert to authenticated with check (is_admin());
create policy companies_admin_del on public.companies for delete to authenticated using (is_admin());

create policy stores_read on public.stores for select to authenticated
  using (is_admin() or (company_id = my_company() and (is_staff() or id = my_store())));
create policy stores_write on public.stores for all to authenticated
  using (company_id = my_company() and is_staff()) with check (company_id = my_company() and is_staff());

create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or is_admin() or (company_id = my_company() and is_staff()));
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or is_admin() or (company_id = my_company() and my_role() = 'owner'))
  with check (id = auth.uid() or is_admin() or (company_id = my_company() and my_role() = 'owner'));

create policy inv_all on public.invitations for all to authenticated
  using (is_admin() or (company_id = my_company() and my_role() = 'owner'))
  with check (is_admin() or (company_id = my_company() and my_role() = 'owner' and role <> 'owner'));

create policy products_read on public.products for select to authenticated using (company_id = my_company() or is_admin());
create policy products_write on public.products for all to authenticated
  using (company_id = my_company() and is_staff()) with check (company_id = my_company() and is_staff());

create policy wh_read on public.warehouse_stock for select to authenticated using (is_admin() or (company_id = my_company() and is_staff()));
create policy wh_write on public.warehouse_stock for all to authenticated
  using (company_id = my_company() and is_staff()) with check (company_id = my_company() and is_staff());

create policy ss_read on public.store_stock for select to authenticated
  using (is_admin() or (company_id = my_company() and can_store(store_id)));
create policy ss_write on public.store_stock for all to authenticated
  using (company_id = my_company() and can_store(store_id)) with check (company_id = my_company() and can_store(store_id));

create policy shifts_read on public.shifts for select to authenticated
  using (is_admin() or (company_id = my_company() and can_store(store_id)));
create policy shift_items_read on public.shift_items for select to authenticated
  using (is_admin() or (company_id = my_company() and can_store(store_id)));

create policy orders_read on public.orders for select to authenticated
  using (is_admin() or (company_id = my_company() and can_store(store_id)));
create policy order_items_read on public.order_items for select to authenticated
  using (is_admin() or exists (select 1 from orders o where o.id = order_id and o.company_id = my_company() and can_store(o.store_id)));
create policy order_events_read on public.order_events for select to authenticated
  using (is_admin() or exists (select 1 from orders o where o.id = order_id and o.company_id = my_company() and can_store(o.store_id)));
-- смены и заявки пишутся только через функции ниже

revoke all on all functions in schema public from anon;
