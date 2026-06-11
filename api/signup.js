import { getSupabaseAdmin } from '../lib/supabase-server.js';

function validateName(name) {
  return typeof name === 'string' && name.trim().length >= 2;
}

function validatePhone(phone) {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return /^01[016789]\d{7,8}$/.test(digits);
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function normalizePhone(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits;
}

function mapSupabaseError(error) {
  if (error.code === '23505') {
    return '이미 가입된 이메일입니다.';
  }
  return '가입 정보 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, phone, email, source = 'unknown' } = req.body ?? {};

  if (!validateName(name)) {
    return res.status(400).json({ error: '이름을 2자 이상 입력해 주세요.' });
  }
  if (!validatePhone(phone)) {
    return res.status(400).json({ error: '올바른 휴대폰 번호를 입력해 주세요.' });
  }
  if (!validateEmail(email)) {
    return res.status(400).json({ error: '올바른 이메일 주소를 입력해 주세요.' });
  }

  const lead = {
    name: name.trim(),
    phone: normalizePhone(phone),
    email: email.trim().toLowerCase(),
    source: String(source).slice(0, 32),
  };

  try {
    // #region agent log
    fetch('http://127.0.0.1:7817/ingest/ad9fb65c-2094-4cdc-b76a-efbaee009d2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c93616'},body:JSON.stringify({sessionId:'c93616',location:'api/signup.js:handler',message:'signup attempt',data:{source:lead.source,vercelEnv:process.env.VERCEL_ENV||null,nodeEnv:process.env.NODE_ENV||null},timestamp:Date.now(),hypothesisId:'D-E'})}).catch(()=>{});
    // #endregion
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('signup_leads').insert(lead);

    if (error) {
      console.error('[signup] Supabase error:', error);
      return res.status(500).json({ error: mapSupabaseError(error) });
    }

    return res.status(201).json({
      ok: true,
      message: '가입이 완료되었습니다. AI 번호 추천 서비스 오픈 시 알려드릴게요!',
    });
  } catch (err) {
    console.error('[signup] error:', err);
    if (err.message === 'SUPABASE_NOT_CONFIGURED') {
      // #region agent log
      fetch('http://127.0.0.1:7817/ingest/ad9fb65c-2094-4cdc-b76a-efbaee009d2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c93616'},body:JSON.stringify({sessionId:'c93616',location:'api/signup.js:catch',message:'SUPABASE_NOT_CONFIGURED',data:{hasUrl:Boolean(process.env.SUPABASE_URL),hasKey:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY)},timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
      // #endregion
      return res.status(500).json({
        error: 'Supabase 환경변수(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.',
      });
    }
    return res.status(500).json({
      error: '가입 정보 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    });
  }
}
