import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
];

function buildSystemPrompt(today) {
  return `당신은 한국 로또 6/45 번호를 추천하는 친근한 운세 챗봇입니다.
오늘 날짜: ${today}

역할:
1. 사용자에게 생년월일(YYYY-MM-DD)을 아직 모르면 먼저 물어보세요.
2. 생년월일을 알면 띠, 별자리, 오늘의 운세를 반영해 로또 번호 6개(1~45, 중복 없음)와 보너스 1개를 추천하세요.
3. 왜 이 번호를 골랐는지 생년월일·오늘 운세·행운의 의미를 한국어로 따뜻하게 설명하세요.
4. 번호 추천이 아닌 일반 질문에도 친절히 답하되, 로또·운세 맥락을 유지하세요.
5. 당첨을 보장하지 않으며 오락·참고용임을 가끔 상기하세요.

반드시 아래 JSON 형식만 출력하세요. 다른 텍스트는 포함하지 마세요.
{
  "reply": "사용자에게 보여줄 한국어 메시지",
  "needsBirthDate": false,
  "numbers": [1, 2, 3, 4, 5, 6],
  "bonus": 7
}

규칙:
- needsBirthDate: 생년월일이 아직 없고 필요하면 true, 있으면 false
- numbers: 1~45 중 6개 오름차순, 추천하지 않으면 null
- bonus: 1~45, numbers에 없는 번호, 추천하지 않으면 null
- reply만으로도 대화 가능 (인사, 생년월일 요청 등)`;
}

function parseModelJson(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw);
}

function validateNumbers(numbers, bonus) {
  if (!Array.isArray(numbers) || numbers.length !== 6) return null;
  const set = new Set(numbers);
  if (set.size !== 6) return null;
  if (!numbers.every((n) => Number.isInteger(n) && n >= 1 && n <= 45)) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  if (bonus != null) {
    if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45 || sorted.includes(bonus)) {
      return { numbers: sorted, bonus: null };
    }
  }
  return { numbers: sorted, bonus: bonus ?? null };
}

function shouldTryNextModel(err) {
  const status = err.status ?? err.response?.status;
  const message = String(err.message || '');
  if (status === 401 || status === 403) return false;
  if (status === 429 || message.includes('429') || message.includes('quota')) return true;
  if (status === 404 || message.includes('not found')) return true;
  return false;
}

function getErrorMessage(err) {
  const status = err.status ?? err.response?.status;
  const message = String(err.message || '');

  if (status === 429 || message.includes('429') || message.includes('quota')) {
    return 'Gemini API 일일 무료 사용량(20회/모델)을 모두 초과했습니다. 내일 다시 시도하거나 Google AI Studio에서 결제를 활성화해 주세요.';
  }
  if (status === 401 || status === 403 || message.includes('API key')) {
    return 'Gemini API 키가 유효하지 않습니다. Vercel의 GEMINI_API_KEY 환경변수를 확인해 주세요.';
  }
  if (status === 404 || message.includes('not found')) {
    return '요청한 AI 모델을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.';
  }
  return 'AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

function isRetryable(err) {
  return shouldTryNextModel(err);
}

async function generateWithFallback(genAI, prompt, systemInstruction) {
  const uniqueModels = [...new Set(MODELS.filter(Boolean))];
  let lastError = null;

  for (const modelName of uniqueModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.9,
        },
      });

      const result = await model.generateContent(prompt);
      return { text: result.response.text(), modelName };
    } catch (err) {
      lastError = err;
      console.error(`Gemini API error (${modelName}):`, err.message);
      if (!shouldTryNextModel(err)) {
        throw err;
      }
    }
  }

  throw lastError;
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

  const apiKey = process.env.GEMINI_API_KEY;
  // #region agent log
  fetch('http://127.0.0.1:7817/ingest/ad9fb65c-2094-4cdc-b76a-efbaee009d2e',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'c93616'},body:JSON.stringify({sessionId:'c93616',location:'api/chat.js:handler',message:'gemini env check',data:{hasGeminiKey:Boolean(apiKey),keyPrefix:apiKey?apiKey.slice(0,3):null,vercelEnv:process.env.VERCEL_ENV||null},timestamp:Date.now(),hypothesisId:'A-B'})}).catch(()=>{});
  // #endregion
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 대시보드에서 추가해 주세요.',
    });
  }

  const { messages = [], birthDate = null } = req.body ?? {};
  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages 배열이 필요합니다.' });
  }

  const today = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'full',
    timeZone: 'Asia/Seoul',
  }).format(new Date());

  const historyText = messages
    .slice(-12)
    .map((m) => `${m.role === 'user' ? '사용자' : '챗봇'}: ${m.content}`)
    .join('\n');

  const userContext = birthDate
    ? `사용자 생년월일: ${birthDate} (이미 수집됨)`
    : '사용자 생년월일: 아직 없음 — 필요하면 물어보세요.';

  const prompt = `${userContext}

대화 기록:
${historyText || '(없음)'}

위 맥락에 맞게 JSON으로만 응답하세요.`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const { text } = await generateWithFallback(genAI, prompt, buildSystemPrompt(today));
    const parsed = parseModelJson(text);
    const validated = validateNumbers(parsed.numbers, parsed.bonus);

    return res.status(200).json({
      reply: parsed.reply || '응답을 생성하지 못했습니다. 다시 시도해 주세요.',
      needsBirthDate: Boolean(parsed.needsBirthDate),
      numbers: validated?.numbers ?? null,
      bonus: validated?.bonus ?? null,
    });
  } catch (err) {
    console.error('Gemini API error:', err);
    const status = isRetryable(err) ? 429 : 500;
    return res.status(status).json({
      error: getErrorMessage(err),
    });
  }
}
