create table if not exists public.simplex_product_modules (
 product_id text primary key references public.simplex_apps(id) on delete cascade,
 modules jsonb not null default '[]'::jsonb check(jsonb_typeof(modules)='array'),
 management_url text,
 updated_at timestamptz not null default now()
);
alter table public.simplex_product_modules enable row level security;
revoke all on public.simplex_product_modules from public,anon,authenticated;
grant select,insert,update,delete on public.simplex_product_modules to service_role;
