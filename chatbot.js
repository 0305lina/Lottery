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

function saveBirthDate(value) {
  state.birthDate = value;
  sessionStorage.setItem('lottoBirthDate', value);
}

function parseBirthDate(text) {
  const match = text.trim().match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
    ? `안녕하세요! ${state.birthDate} 생년월일로 오늘의 운세를 반영한 번호를 추천해 드릴게요. "번호 추천해줘"라고 말씀해 보세요.`
    : '안녕하세요! 생년월일과 오늘의 운세를 바탕으로 로또 번호를 추천해 드려요. 먼저 생년월일을 YYYY-MM-DD 형식으로 알려주세요. (예: 1995-03-15)';

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

async function handleSubmit(text) {
  const trimmed = text.trim();
  if (!trimmed || state.loading) return;

  if (!state.birthDate) {
    const parsed = parseBirthDate(trimmed);
    if (!parsed) {
      appendMessage('user', trimmed);
      chatInputEl.value = '';
      appendMessage(
        'assistant',
        '생년월일을 YYYY-MM-DD 형식으로 입력해 주세요.\n예: 1995-03-15, 1995.3.15, 1995/03/15'
      );
      return;
    }

    saveBirthDate(parsed);
    appendMessage('user', trimmed);
    chatInputEl.value = '';
    setLoading(true);
    try {
      const data = await sendToApi(`내 생년월일은 ${parsed}이야. 오늘 운세에 맞는 로또 번호를 추천해줘.`);
      appendMessage('assistant', data.reply, {
        numbers: data.numbers,
        bonus: data.bonus,
      });
    } catch (err) {
      appendMessage('assistant', err.message);
    } finally {
      setLoading(false);
    }
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

if (isChatReady) {
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

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.open) {
      setPanelOpen(false);
    }
  });
}
