-- SimplexApp analytics: no cookies, no IP addresses or user identity.
begin;
create table if not exists public.simplex_visit_events (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default now(),
 kind text not null check (kind in ('visit','page','app_view','demo','open','download','contact')),
 page text not null check (page in ('home','catalogo','preferiti','detail')),
 source text not null check (source in ('facebook','instagram','google','direct','other')),
 product text not null default '' check (length(product) <= 64 and product ~ '^[a-zA-Z0-9_-]*$')
);
create index if not exists simplex_visit_events_when on public.simplex_visit_events(occurred_at);
create index if not exists simplex_visit_events_kind_when on public.simplex_visit_events(kind,occurred_at);
create index if not exists simplex_visit_events_product_when on public.simplex_visit_events(product,occurred_at);
alter table public.simplex_visit_events enable row level security;
revoke all on public.simplex_visit_events from public, anon, authenticated;
grant all on public.simplex_visit_events to service_role;
create or replace function public.simplex_track_event(p_kind text, p_page text, p_source text, p_product text default '')
returns void language plpgsql security definer set search_path=''
as $$
begin
 if p_kind is null or p_kind not in ('visit','page','app_view','demo','open','download','contact') then raise exception 'Invalid event'; end if;
 if p_page is null or p_page not in ('home','catalogo','preferiti','detail') then raise exception 'Invalid page'; end if;
 if p_source is null or p_source not in ('facebook','instagram','google','direct','other') then raise exception 'Invalid source'; end if;
 if p_product is null or length(p_product)>64 or p_product !~ '^[a-zA-Z0-9_-]*$' then raise exception 'Invalid product'; end if;
 insert into public.simplex_visit_events(kind,page,source,product) values(p_kind,p_page,p_source,p_product);
end $$;
revoke all on function public.simplex_track_event(text,text,text,text) from public,anon,authenticated;
grant execute on function public.simplex_track_event(text,text,text,text) to anon,authenticated,service_role;
create or replace function public.simplex_visit_summary(p_days integer default 30)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare v_start timestamptz; v_end timestamptz; v_today date; v_result jsonb;
begin
 if (select auth.uid()) is null or not exists(select 1 from public.simplex_admins a where a.user_id=(select auth.uid())) then
  raise exception 'Accesso amministratore richiesto' using errcode='42501';
 end if;
 if p_days not in (7,30,90) then raise exception 'Intervallo non valido'; end if;
 v_today=(now() at time zone 'Europe/Rome')::date;
 v_start=((v_today-(p_days-1))::timestamp at time zone 'Europe/Rome');
 v_end=((v_today+1)::timestamp at time zone 'Europe/Rome');
 select jsonb_build_object(
   'generated_at',now(),'period_days',p_days,
   'totals',(select jsonb_build_object(
     'visits',count(*) filter (where kind='visit'),
     'pageviews',count(*) filter (where kind='page'),
     'app_views',count(*) filter (where kind='app_view'),
     'demos',count(*) filter (where kind='demo'),
     'opens',count(*) filter (where kind='open'),
     'downloads',count(*) filter (where kind='download'),
     'contacts',count(*) filter (where kind='contact')
   ) from public.simplex_visit_events where occurred_at>=v_start and occurred_at<v_end),
   'days',(select coalesce(jsonb_agg(jsonb_build_object('day',d.visit_day,'visits',(
       select count(*) from public.simplex_visit_events e
       where e.kind='visit' and e.occurred_at >= (d.visit_day::timestamp at time zone 'Europe/Rome')
       and e.occurred_at < ((d.visit_day+1)::timestamp at time zone 'Europe/Rome')
   )) order by d.visit_day),'[]'::jsonb)
     from (select generate_series(v_today-(p_days-1),v_today,'1 day'::interval)::date as visit_day) d),
   'sources',(select coalesce(jsonb_agg(jsonb_build_object('source',s.source,'visits',s.visits) order by s.visits desc),'[]'::jsonb)
     from (select source,count(*) visits from public.simplex_visit_events
           where kind='visit' and occurred_at>=v_start and occurred_at<v_end group by source) s),
   'products',(select coalesce(jsonb_agg(jsonb_build_object('product',p.product,'views',p.views,'demos',p.demos,'opens',p.opens,'downloads',p.downloads) order by p.views desc),'[]'::jsonb)
     from (select product,
       count(*) filter (where kind='app_view') views,
       count(*) filter (where kind='demo') demos,
       count(*) filter (where kind='open') opens,
       count(*) filter (where kind='download') downloads
       from public.simplex_visit_events
       where product<>'' and occurred_at>=v_start and occurred_at<v_end
       group by product) p)
 ) into v_result;
 return v_result;
end $$;
revoke all on function public.simplex_visit_summary(integer) from public,anon,authenticated;
grant execute on function public.simplex_visit_summary(integer) to authenticated,service_role;
commit;