const STORAGE_KEY = 'lottoSignupCompleted';

const overlayEl = document.getElementById('signupOverlay');
const formEl = document.getElementById('signupForm');
const nameEl = document.getElementById('signupName');
const phoneEl = document.getElementById('signupPhone');
const emailEl = document.getElementById('signupEmail');
const errorEl = document.getElementById('signupError');
const submitBtnEl = document.getElementById('signupSubmitBtn');
const dismissBtnEl = document.getElementById('signupDismissBtn');
const closeBtnEl = document.getElementById('signupCloseBtn');

const isReady = Boolean(
  overlayEl && formEl && nameEl && phoneEl && emailEl && errorEl && submitBtnEl && dismissBtnEl && closeBtnEl
);

function isSignedUp() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

function validateName(value) {
  return value.trim().length >= 2;
}

function validatePhone(value) {
  const digits = value.replace(/\D/g, '');
  return /^01[016789]\d{7,8}$/.test(digits);
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function setError(message) {
  if (errorEl) errorEl.textContent = message || '';
}

function setLoading(active) {
  submitBtnEl.disabled = active;
  dismissBtnEl.disabled = active;
  closeBtnEl.disabled = active;
  nameEl.disabled = active;
  phoneEl.disabled = active;
  emailEl.disabled = active;
  submitBtnEl.textContent = active ? '가입 중...' : '가입하기';
}

function openModal() {
  if (!isReady) return;
  overlayEl.removeAttribute('hidden');
  overlayEl.classList.add('is-open');
  overlayEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('signup-open');
  requestAnimationFrame(() => nameEl.focus());
}

function closeModal() {
  if (!isReady) return;
  overlayEl.classList.remove('is-open');
  overlayEl.setAttribute('hidden', '');
  overlayEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('signup-open');
  setError('');
  formEl.reset();
}

export function promptSignupAfterNumbers(source = 'draw') {
  if (!isReady || isSignedUp()) return;

  overlayEl.dataset.source = source;
  setTimeout(openModal, 700);
}

async function handleSubmit(e) {
  e.preventDefault();
  setError('');

  const name = nameEl.value.trim();
  const phone = phoneEl.value.trim();
  const email = emailEl.value.trim();

  if (!validateName(name)) {
    setError('이름을 2자 이상 입력해 주세요.');
    nameEl.focus();
    return;
  }
  if (!validatePhone(phone)) {
    setError('올바른 휴대폰 번호를 입력해 주세요. (예: 010-1234-5678)');
    phoneEl.focus();
    return;
  }
  if (!validateEmail(email)) {
    setError('올바른 이메일 주소를 입력해 주세요.');
    emailEl.focus();
    return;
  }

  setLoading(true);

  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone,
        email,
        source: overlayEl.dataset.source || 'draw',
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || '가입에 실패했습니다.');
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    closeModal();
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}

if (isReady) {
  formEl.addEventListener('submit', handleSubmit);
  dismissBtnEl.addEventListener('click', closeModal);
  closeBtnEl.addEventListener('click', closeModal);
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl.classList.contains('is-open')) {
      closeModal();
    }
  });
}
