begin;
create or replace function sg_private.admin_analytics() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if current_setting('role',true)<>'service_role' then raise exception 'Amministrazione riservata al server' using errcode='42501'; end if;
 with months as (
 select generate_series(date_trunc('month',now() at time zone 'Europe/Rome')-interval '5 months',date_trunc('month',now() at time zone 'Europe/Rome'),interval '1 month') as month
 ), customers as (
 select c.* from public.sg_customers c where not (coalesce(c.config,'{}'::jsonb) ? 'admin_deleted_at')
 ), active_subscriptions as (
 select distinct ss.customer_id from sg_private.stripe_subscriptions ss join customers c on c.id=ss.customer_id
 where c.active and lower(ss.status)='active' and ss.current_period_end>now()
 ), active_trials as (
 select t.* from sg_private.trials t join customers c on c.id=t.customer_id
 where c.active and t.cleared_at is null and t.expires_at>now()
 and not exists(select 1 from active_subscriptions s where s.customer_id=c.id)
 and not exists(select 1 from public.sg_licenses l where l.customer_id=c.id and l.active and l.expires_at>now() and l.plan not ilike 'Prova gratuita%')
 )
 select jsonb_build_object('generated_at',now(),'timezone','Europe/Rome',
 'totals',jsonb_build_object(
 'registered',(select count(*) from auth.users),
 'trials_active',(select count(*) from active_trials),
 'subscriptions_active',(select count(*) from active_subscriptions),
 'trials_expired',(select count(*) from sg_private.trials t join customers c on c.id=t.customer_id where t.expires_at<=now() and t.cleared_at is null
 and not exists(select 1 from sg_private.stripe_subscriptions ss where ss.customer_id=c.id and lower(ss.status) in ('active','trialing','past_due') and ss.current_period_end>now())
 and not exists(select 1 from public.sg_licenses l where l.customer_id=c.id and l.active and l.expires_at>now()))
 ),
 'months',(select jsonb_agg(jsonb_build_object('key',to_char(m.month,'YYYY-MM'),
 'registrations',(select count(*) from auth.users u where u.created_at>=(m.month at time zone 'Europe/Rome') and u.created_at<((m.month+interval '1 month') at time zone 'Europe/Rome')),
 'trials',(select count(*) from sg_private.trials t where t.started_at>=(m.month at time zone 'Europe/Rome') and t.started_at<((m.month+interval '1 month') at time zone 'Europe/Rome'))) order by m.month) from months m)
 ) into result;
 return result;
end $$;
revoke all on function sg_private.admin_analytics() from public,anon,authenticated;
grant execute on function sg_private.admin_analytics() to service_role;
create or replace function public.sg_admin_analytics() returns jsonb language sql security invoker set search_path='' as $$select sg_private.admin_analytics()$$;
revoke all on function public.sg_admin_analytics() from public,anon,authenticated;
grant execute on function public.sg_admin_analytics() to service_role;
commit;
