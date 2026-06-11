-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.signup_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text not null,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

-- 이메일 중복 가입 방지
create unique index if not exists signup_leads_email_key
  on public.signup_leads (email);

create index if not exists signup_leads_created_at_idx
  on public.signup_leads (created_at desc);

alter table public.signup_leads enable row level security;

-- 서버(Vercel API)는 service_role 키로 저장합니다.
