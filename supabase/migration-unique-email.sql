-- Supabase SQL Editor에서 실행하세요.
-- 같은 이메일 중복 저장을 막습니다.

-- 중복 이메일이 이미 있으면 가장 먼저 가입한 행만 남깁니다.
delete from public.signup_leads a
using public.signup_leads b
where a.email = b.email
  and a.created_at > b.created_at;

drop index if exists public.signup_leads_email_idx;

create unique index if not exists signup_leads_email_key
  on public.signup_leads (email);

create index if not exists signup_leads_created_at_idx
  on public.signup_leads (created_at desc);
