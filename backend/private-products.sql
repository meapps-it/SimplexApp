-- Full-product destinations never belong in the public catalog payload.
create table if not exists public.simplex_product_private (
 product_id text primary key references public.simplex_apps(id) on delete cascade,
 full_url text not null check (full_url ~ '^https://'),
 updated_at timestamptz not null default now()
);
alter table public.simplex_product_private enable row level security;
revoke all on public.simplex_product_private from public,anon,authenticated;
grant select,insert,update,delete on public.simplex_product_private to service_role;
