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
    source,
    createdAt: new Date().toISOString(),
  };

  console.log('[signup]', JSON.stringify(lead));

  return res.status(201).json({
    ok: true,
    message: '가입이 완료되었습니다. AI 번호 추천 서비스 오픈 시 알려드릴게요!',
  });
}
