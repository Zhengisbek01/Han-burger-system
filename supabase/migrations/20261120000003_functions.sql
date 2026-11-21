-- Бизнес-операции. Все проверяют права сами (security definer).

-- Регистрация производителя: пользователь без компании создаёт свою (пробный период 14 дней)
create or replace function public.create_company(p_name text, p_bin text default null, p_city text default 'Астана')
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Нужно войти'; end if;
  if exists (select 1 from profiles where id = auth.uid() and company_id is not null) then
    raise exception 'Вы уже состоите в компании';
  end if;
  insert into companies (name, bin, city) values (p_name, nullif(trim(p_bin), ''), p_city) returning id into cid;
  perform set_config('app.bypass', '1', true);
  update profiles set company_id = cid, role = 'owner', store_id = null where id = auth.uid();
  return cid;
end $$;

-- Суперадмин подключает клиента: компания + приглашение владельцу
create or replace function public.admin_create_company(p_name text, p_bin text, p_city text, p_plan text,
  p_owner_email text, p_owner_name text, p_trial_days int default 14)
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid; uid uuid;
begin
  if not is_admin() then raise exception 'Только для суперадмина'; end if;
  insert into companies (name, bin, city, plan_id, status, paid_till)
  values (p_name, nullif(trim(p_bin), ''), p_city, p_plan, 'trial', current_date + p_trial_days) returning id into cid;
  select id into uid from profiles where lower(email) = lower(p_owner_email) and company_id is null;
  if uid is not null then
    perform set_config('app.bypass', '1', true);
    update profiles set company_id = cid, role = 'owner', full_name = coalesce(full_name, p_owner_name) where id = uid;
  else
    insert into invitations (company_id, email, full_name, role) values (cid, p_owner_email, p_owner_name, 'owner');
  end if;
  return cid;
end $$;

-- Пригласить сотрудника (владелец). Если человек уже зарегистрирован и без компании — привязываем сразу.
create or replace function public.invite_employee(p_email text, p_name text, p_role text, p_store uuid default null)
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if coalesce(my_role(), '') <> 'owner' then raise exception 'Приглашать может только владелец'; end if;
  if p_role not in ('manager','store') then raise exception 'Недопустимая роль'; end if;
  if p_role = 'store' and not exists (select 1 from stores where id = p_store and company_id = my_company()) then
    raise exception 'Укажите магазин';
  end if;
  select id into uid from profiles where lower(email) = lower(p_email);
  if uid is not null then
    if exists (select 1 from profiles where id = uid and company_id is not null) then
      raise exception 'Этот пользователь уже работает в другой компании';
    end if;
    perform set_config('app.bypass', '1', true);
    update profiles set company_id = my_company(), role = p_role, store_id = case when p_role = 'store' then p_store end,
      full_name = coalesce(full_name, p_name) where id = uid;
    return 'linked';
  end if;
  delete from invitations where lower(email) = lower(p_email) and accepted_at is null and company_id = my_company();
  insert into invitations (company_id, email, full_name, role, store_id)
  values (my_company(), lower(p_email), p_name, p_role, case when p_role = 'store' then p_store end);
  return 'invited';
end $$;

-- Закрыть смену: продажи + списание из остатка магазина
-- p_items: [{"product_id": "...", "qty": 12}, ...]
create or replace function public.close_shift(p_store uuid, p_items jsonb, p_comment text default null, p_date date default current_date)
returns uuid language plpgsql security definer set search_path = public as $$
declare sid uuid; cid uuid; it jsonb; pr numeric; q numeric;
begin
  if not can_store(p_store) then raise exception 'Нет доступа к магазину'; end if;
  select company_id into cid from stores where id = p_store;
  if exists (select 1 from shifts where store_id = p_store and shift_date = p_date) then
    raise exception 'Смена за % уже закрыта', to_char(p_date, 'DD.MM.YYYY');
  end if;
  insert into shifts (company_id, store_id, shift_date, comment, closed_by)
  values (cid, p_store, p_date, p_comment, auth.uid()) returning id into sid;
  for it in select * from jsonb_array_elements(p_items) loop
    q := coalesce((it->>'qty')::numeric, 0);
    continue when q <= 0;
    select price into pr from products where id = (it->>'product_id')::uuid and company_id = cid;
    if pr is null then raise exception 'Неизвестная продукция'; end if;
    insert into shift_items (shift_id, company_id, store_id, shift_date, product_id, qty, price)
    values (sid, cid, p_store, p_date, (it->>'product_id')::uuid, q, pr);
    insert into store_stock (company_id, store_id, product_id, qty, updated_by)
    values (cid, p_store, (it->>'product_id')::uuid, 0, auth.uid())
    on conflict (store_id, product_id) do update set qty = greatest(0, store_stock.qty - q), updated_by = auth.uid();
  end loop;
  update shifts set total = (select coalesce(sum(qty * price), 0) from shift_items where shift_id = sid) where id = sid;
  return sid;
end $$;

-- Создать заявку от магазина
create or replace function public.create_order(p_store uuid, p_items jsonb, p_comment text default null,
  p_slot text default null, p_date date default current_date + 1)
returns bigint language plpgsql security definer set search_path = public as $$
declare oid uuid; num bigint; cid uuid; it jsonb; pr numeric; q numeric; n int := 0;
begin
  if not can_store(p_store) then raise exception 'Нет доступа к магазину'; end if;
  select company_id into cid from stores where id = p_store;
  insert into orders (company_id, store_id, comment, delivery_slot, delivery_date, created_by)
  values (cid, p_store, p_comment, p_slot, p_date, auth.uid()) returning id, number into oid, num;
  for it in select * from jsonb_array_elements(p_items) loop
    q := coalesce((it->>'qty')::numeric, 0);
    continue when q <= 0;
    select price into pr from products where id = (it->>'product_id')::uuid and company_id = cid and active;
    if pr is null then raise exception 'Неизвестная продукция'; end if;
    insert into order_items (order_id, company_id, product_id, qty, price) values (oid, cid, (it->>'product_id')::uuid, q, pr);
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'Заявка пустая'; end if;
  insert into order_events (order_id, company_id, status, actor) values (oid, cid, 'new', auth.uid());
  return num;
end $$;

-- Сменить статус заявки.
-- Производитель: new→confirmed→assembling→transit→delivered, отмена до отправки.
-- Магазин: подтверждает получение (transit→delivered) и может отменить свою новую заявку.
-- transit: списываем со склада производителя; delivered: добавляем в остаток магазина.
create or replace function public.set_order_status(p_order uuid, p_status text, p_courier text default null, p_eta text default null)
returns void language plpgsql security definer set search_path = public as $$
declare o orders; flow text[] := array['new','confirmed','assembling','transit','delivered']; staff boolean;
begin
  select * into o from orders where id = p_order for update;
  if o.id is null or not can_store(o.store_id) then raise exception 'Заявка не найдена'; end if;
  staff := is_staff();
  if p_status = 'cancelled' then
    if o.status not in ('new','confirmed') then raise exception 'Отправленную заявку отменить нельзя'; end if;
    if not staff and o.status <> 'new' then raise exception 'Нельзя отменить подтверждённую заявку'; end if;
  elsif array_position(flow, p_status) is distinct from array_position(flow, o.status) + 1 then
    raise exception 'Недопустимый переход статуса: % → %', o.status, p_status;
  elsif not staff and not (o.status = 'transit' and p_status = 'delivered') then
    raise exception 'Магазин может только подтвердить получение';
  end if;

  if p_status = 'transit' then
    update warehouse_stock w set qty = greatest(0, w.qty - i.qty)
      from order_items i where i.order_id = o.id and w.product_id = i.product_id;
  elsif p_status = 'delivered' then
    insert into store_stock (company_id, store_id, product_id, qty, updated_by)
    select o.company_id, o.store_id, i.product_id, i.qty, auth.uid() from order_items i where i.order_id = o.id
    on conflict (store_id, product_id) do update set qty = store_stock.qty + excluded.qty, updated_by = auth.uid();
  end if;

  update orders set status = p_status,
    courier = coalesce(p_courier, courier), eta = coalesce(p_eta, eta) where id = o.id;
  insert into order_events (order_id, company_id, status, actor) values (o.id, o.company_id, p_status, auth.uid());
end $$;

-- Цех выпустил продукцию: добавить на склад. p_items: [{"product_id","qty"}]
create or replace function public.add_production(p_items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  if not is_staff() then raise exception 'Нет доступа'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    continue when coalesce((it->>'qty')::numeric, 0) <= 0;
    if not exists (select 1 from products where id = (it->>'product_id')::uuid and company_id = my_company()) then
      raise exception 'Неизвестная продукция'; end if;
    insert into warehouse_stock (company_id, product_id, qty) values (my_company(), (it->>'product_id')::uuid, (it->>'qty')::numeric)
    on conflict (product_id) do update set qty = warehouse_stock.qty + excluded.qty;
  end loop;
end $$;

-- Демо-данные HAN Burger для пустой компании: 9 позиций, 5 магазинов Астаны, 14 дней продаж
create or replace function public.load_demo_data()
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid := my_company(); s record; p record; d date; dow numeric[] := array[1.25,0.9,0.92,0.95,1.0,1.15,1.3];
  sh uuid; q numeric; avgq numeric; ratio numeric;
begin
  if coalesce(my_role(), '') <> 'owner' then raise exception 'Только владелец'; end if;
  if exists (select 1 from stores where company_id = cid) or exists (select 1 from products where company_id = cid) then
    raise exception 'Демо-данные можно загрузить только в пустую компанию';
  end if;
  perform set_config('app.bypass', '1', true);
  update companies set plan_id = 'net' where id = cid;  -- чтобы влезли 5 магазинов

  create temp table _p (name text, cat text, unit text, price numeric, cost numeric, shelf int, base numeric, sort int) on commit drop;
  insert into _p values
   ('Хан Классик','Бургеры','шт',2490,1150,1,46,1), ('Чизбургер Хан','Бургеры','шт',2690,1240,1,40,2),
   ('Дабл Хан','Бургеры','шт',3490,1690,1,24,3), ('Чикен Хан','Бургеры','шт',2290,990,1,28,4),
   ('Булка бриошь, 4 шт','Булки','уп',990,380,3,14,5), ('Булка с кунжутом, 6 шт','Булки','уп',890,310,3,12,6),
   ('Соус Хан фирменный, 250 г','Соусы','шт',1290,420,30,9,7), ('Соус сырный, 250 г','Соусы','шт',1190,390,30,7,8),
   ('Соус барбекю, 250 г','Соусы','шт',1190,370,30,6,9);
  insert into products (company_id, name, category, unit, price, cost, shelf_days, sort)
  select cid, name, cat, unit, price, cost, shelf, sort from _p;

  create temp table _s (name text, addr text, k numeric, ratio numeric) on commit drop;
  insert into _s values ('Хан Шатыр','пр. Туран, 37, фудкорт',1.45,0.15), ('Mega Silk Way','пр. Кабанбай батыра, 62',1.25,0.6),
   ('Керуен','ул. Достык, 9',0.95,1.6), ('Абу-Даби Плаза','ул. Сыганак, 60',0.8,0.4), ('Сарыарка','пр. Сарыарка, 31/2',0.65,2.4);
  insert into stores (company_id, name, address) select cid, name, addr from _s;

  for s in select st.id, _s.k, _s.ratio from stores st join _s on _s.name = st.name where st.company_id = cid loop
    for d in select generate_series(current_date - 13, current_date, '1 day')::date loop
      insert into shifts (company_id, store_id, shift_date) values (cid, s.id, d) returning id into sh;
      for p in select pr.id, pr.price, _p.base from products pr join _p on _p.name = pr.name where pr.company_id = cid loop
        q := round(p.base * s.k * dow[extract(dow from d)::int + 1] * (0.8 + random() * 0.4));
        if q > 0 then
          insert into shift_items (shift_id, company_id, store_id, shift_date, product_id, qty, price) values (sh, cid, s.id, d, p.id, q, p.price);
        end if;
      end loop;
      update shifts set total = (select coalesce(sum(qty * price), 0) from shift_items where shift_id = sh) where id = sh;
    end loop;
    for p in select pr.id, _p.shelf from products pr join _p on _p.name = pr.name where pr.company_id = cid loop
      select coalesce(sum(qty), 0) / 7 into avgq from shift_items where store_id = s.id and product_id = p.id and shift_date > current_date - 7;
      ratio := s.ratio * (0.5 + random()) * case when p.shelf > 1 then 1.6 else 1 end;
      insert into store_stock (company_id, store_id, product_id, qty) values (cid, s.id, p.id, round(avgq * ratio));
    end loop;
  end loop;

  insert into warehouse_stock (company_id, product_id, qty)
  select cid, pr.id, case _p.cat when 'Соусы' then 90 when 'Булки' then 35 else 15 end
  from products pr join _p on _p.name = pr.name where pr.company_id = cid;
end $$;

revoke execute on function public.create_company, public.admin_create_company, public.invite_employee, public.close_shift,
  public.create_order, public.set_order_status, public.add_production, public.load_demo_data from public, anon;
grant execute on function public.create_company, public.admin_create_company, public.invite_employee, public.close_shift,
  public.create_order, public.set_order_status, public.add_production, public.load_demo_data to authenticated;

-- Realtime для заявок и остатков (на Supabase публикация уже есть)
do $$ begin
  alter publication supabase_realtime add table public.orders, public.store_stock;
exception when others then null; end $$;
