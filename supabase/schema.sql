-- Supabase SQL Editor에서 실행하세요.
-- Table Editor → signup_leads 테이블이 생성됩니다.

create table if not exists public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

create unique index if not exists signup_leads_email_key
  on public.signup_leads (email);

alter table public.signup_leads enable row level security;

-- 서버(Vercel API)는 service_role 키로 저장합니다.
-- 클라이언트에서 직접 insert 하지 않으므로 anon 정책은 추가하지 않습니다.
