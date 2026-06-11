import { createBall } from './lotto-core.js';

const chatWidgetEl = document.getElementById('chatWidget');
const chatPanelEl = document.getElementById('chatPanel');
const chatFabEl = document.getElementById('chatFab');
const chatCloseBtnEl = document.getElementById('chatCloseBtn');
const chatMessagesEl = document.getElementById('chatMessages');
const chatFormEl = document.getElementById('chatForm');
const chatInputEl = document.getElementById('chatInput');
const chatSendBtnEl = document.getElementById('chatSendBtn');
const chatStatusEl = document.getElementById('chatStatus');
const chatBirthDateEl = document.getElementById('chatBirthDate');
const chatBirthResetBtnEl = document.getElementById('chatBirthResetBtn');

const isChatReady = Boolean(
  chatWidgetEl && chatPanelEl && chatFabEl && chatCloseBtnEl &&
  chatMessagesEl && chatFormEl && chatInputEl && chatSendBtnEl && chatStatusEl
);

const API_URL = '/api/chat';

const state = {
  birthDate: sessionStorage.getItem('lottoBirthDate') || null,
  messages: [],
  loading: false,
  greeted: false,
  open: false,
};

function normalizeDateParts(y, m, d) {
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseBirthDate(text) {
  const trimmed = text.trim();

  const numeric = trimmed.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (numeric) {
    return normalizeDateParts(numeric[1], numeric[2], numeric[3]);
  }

  const korean = trimmed.match(/^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/);
  if (korean) {
    return normalizeDateParts(korean[1], korean[2], korean[3]);
  }

  return null;
}

function isBirthDateResetCommand(text) {
  return /생년월일\s*(변경|수정|바꿔|다시|초기화)|다른\s*생년월일|생일\s*(변경|바꿔)/.test(text.trim());
}

function saveBirthDate(value) {
  state.birthDate = value;
  sessionStorage.setItem('lottoBirthDate', value);
  updateBirthDateUi();
}

function clearBirthDate() {
  state.birthDate = null;
  sessionStorage.removeItem('lottoBirthDate');
  updateBirthDateUi();
}

function updateBirthDateUi() {
  if (!chatBirthDateEl || !chatBirthResetBtnEl) return;

  if (state.birthDate) {
    chatBirthDateEl.textContent = `현재 생년월일: ${state.birthDate}`;
    chatBirthDateEl.removeAttribute('hidden');
    chatBirthResetBtnEl.removeAttribute('hidden');
    chatInputEl.placeholder = '메시지 입력... (생년월일 변경: 1995-03-15)';
  } else {
    chatBirthDateEl.setAttribute('hidden', '');
    chatBirthResetBtnEl.setAttribute('hidden', '');
    chatInputEl.placeholder = '생년월일 입력 (예: 1995-03-15, 1995년 3월 15일)';
  }
}

function appendMessage(role, content, extras = {}) {
  const row = document.createElement('div');
  row.className = `chat-msg chat-msg--${role}`;

  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble';
  bubble.textContent = content;
  row.appendChild(bubble);

  if (extras.numbers?.length === 6) {
    const ballsWrap = document.createElement('div');
    ballsWrap.className = 'chat-balls';
    extras.numbers.forEach((num) => {
      ballsWrap.appendChild(createBall(num, { small: true }));
    });
    if (extras.bonus) {
      const plus = document.createElement('span');
      plus.className = 'plus-sign chat-plus';
      plus.textContent = '+';
      ballsWrap.appendChild(plus);
      ballsWrap.appendChild(createBall(extras.bonus, { small: true }));
    }
    row.appendChild(ballsWrap);
  }

  chatMessagesEl.appendChild(row);
  chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

function setLoading(active) {
  state.loading = active;
  chatSendBtnEl.disabled = active;
  chatInputEl.disabled = active;
  chatStatusEl.textContent = active ? '운세를 읽는 중...' : '';
}

function showGreetingIfNeeded() {
  if (state.greeted) return;
  state.greeted = true;

  const greeting = state.birthDate
    ? `안녕하세요! ${state.birthDate} 생년월일로 오늘의 운세를 반영한 번호를 추천해 드릴게요. 다른 생년월일을 쓰려면 상단의 「생년월일 변경」을 누르거나 새 날짜를 입력해 주세요.`
    : '안녕하세요! 생년월일과 오늘의 운세를 바탕으로 로또 번호를 추천해 드려요. 먼저 생년월일을 알려주세요. (예: 1995-03-15, 1995년 3월 15일)';

  appendMessage('assistant', greeting);
}

function setPanelOpen(open) {
  if (!isChatReady) return;

  state.open = open;
  chatWidgetEl.classList.toggle('chat-widget--open', open);
  chatFabEl.setAttribute('aria-expanded', String(open));

  if (open) {
    chatPanelEl.removeAttribute('hidden');
    chatPanelEl.classList.add('is-open');
    chatFabEl.setAttribute('hidden', '');
    updateBirthDateUi();
    showGreetingIfNeeded();
    requestAnimationFrame(() => chatInputEl.focus());
  } else {
    chatPanelEl.classList.remove('is-open');
    chatPanelEl.setAttribute('hidden', '');
    chatFabEl.removeAttribute('hidden');
  }
}

async function sendToApi(userText) {
  state.messages.push({ role: 'user', content: userText });

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: state.messages,
      birthDate: state.birthDate,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '요청에 실패했습니다.');
  }

  state.messages.push({ role: 'assistant', content: data.reply });
  return data;
}

async function requestRecommendation(birthDate, { isUpdate = false } = {}) {
  const prompt = isUpdate
    ? `생년월일을 ${birthDate}로 변경했어. 이 생년월일과 오늘 운세에 맞는 로또 번호를 추천해줘.`
    : `내 생년월일은 ${birthDate}이야. 오늘 운세에 맞는 로또 번호를 추천해줘.`;

  const data = await sendToApi(prompt);
  appendMessage('assistant', data.reply, {
    numbers: data.numbers,
    bonus: data.bonus,
  });
}

async function handleSubmit(text) {
  const trimmed = text.trim();
  if (!trimmed || state.loading) return;

  if (isBirthDateResetCommand(trimmed)) {
    appendMessage('user', trimmed);
    chatInputEl.value = '';
    clearBirthDate();
    state.greeted = false;
    appendMessage(
      'assistant',
      '생년월일을 초기화했어요. 새 생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.\n예: 1995-03-15, 1995년 3월 15일'
    );
    return;
  }

  const parsedDate = parseBirthDate(trimmed);
  if (parsedDate) {
    const previousDate = state.birthDate;
    const isUpdate = Boolean(previousDate && previousDate !== parsedDate);

    saveBirthDate(parsedDate);
    appendMessage('user', trimmed);
    chatInputEl.value = '';
    setLoading(true);

    try {
      if (isUpdate) {
        appendMessage(
          'assistant',
          `생년월일을 ${previousDate}에서 ${parsedDate}(으)로 바꿨어요. 새 운세로 번호를 추천할게요.`
        );
      }
      await requestRecommendation(parsedDate, { isUpdate });
    } catch (err) {
      appendMessage('assistant', err.message);
    } finally {
      setLoading(false);
    }
    return;
  }

  if (!state.birthDate) {
    appendMessage('user', trimmed);
    chatInputEl.value = '';
    appendMessage(
      'assistant',
      '생년월일을 입력해 주세요.\n예: 1995-03-15, 1995.3.15, 1995/03/15, 1995년 3월 15일'
    );
    return;
  }

  appendMessage('user', trimmed);
  chatInputEl.value = '';
  setLoading(true);

  try {
    const data = await sendToApi(trimmed);
    appendMessage('assistant', data.reply, {
      numbers: data.numbers,
      bonus: data.bonus,
    });
  } catch (err) {
    appendMessage('assistant', err.message);
  } finally {
    setLoading(false);
  }
}

function onFormSubmit(e) {
  e.preventDefault();
  handleSubmit(chatInputEl.value);
}

function resetBirthDateFlow() {
  clearBirthDate();
  state.greeted = false;
  appendMessage(
    'assistant',
    '생년월일을 다시 입력해 주세요. (예: 1995-03-15, 1995년 3월 15일)'
  );
  chatInputEl.focus();
}

if (isChatReady) {
  updateBirthDateUi();
  chatFabEl.addEventListener('click', () => setPanelOpen(true));
  chatCloseBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setPanelOpen(false);
  });
  chatFormEl.addEventListener('submit', onFormSubmit);
  chatSendBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    onFormSubmit(e);
  });

  if (chatBirthResetBtnEl) {
    chatBirthResetBtnEl.addEventListener('click', resetBirthDateFlow);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) {
      setPanelOpen(false);
    }
  });
}
