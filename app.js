import {
  createBonusSpinnerWrap,
  createSpinningBall,
} from './lotto-core.js';
import { createLottoMachine } from './machine.js';

const MAX_NUMBER = 45;
const PICK_COUNT = 6;
const MIN_SETS = 1;
const MAX_SETS = 5;
const INITIAL_SPIN_MS = 700;
const STOP_STAGGER_MS = 280;
const MACHINE_PICK_GAP_MS = 320;

const setCountEl = document.getElementById('setCount');
const decreaseBtn = document.getElementById('decrease');
const increaseBtn = document.getElementById('increase');
const drawBtn = document.getElementById('drawBtn');
const resultsEl = document.getElementById('results');

let setCount = 1;

function drawNumbers() {
  const pool = Array.from({ length: MAX_NUMBER }, (_, i) => i + 1);
  const pickOrder = [];

  for (let i = 0; i < PICK_COUNT; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    pickOrder.push(pool.splice(idx, 1)[0]);
  }

  const bonusIdx = Math.floor(Math.random() * pool.length);
  const bonus = pool[bonusIdx];

  return {
    pickOrder,
    main: [...pickOrder].sort((a, b) => a - b),
    bonus,
  };
}

function showEmptyState() {
  resultsEl.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon" aria-hidden="true"></div>
      <p class="empty-title">아직 추첨한 번호가 없습니다</p>
      <p class="empty-desc">하단 버튼을 눌러 번호를 뽑아보세요</p>
    </div>
  `;
}

function createResultCard(setIndex) {
  const card = document.createElement('div');
  card.className = 'result-card';

  const label = document.createElement('div');
  label.className = 'result-label';
  label.textContent = setCount > 1 ? `${setIndex + 1}번째 세트 · 추첨 결과 대기 중...` : '추첨 결과 대기 중...';
  card.appendChild(label);

  const balls = document.createElement('div');
  balls.className = 'balls';
  card.appendChild(balls);

  return { card, label, balls };
}

async function animateResultCard(card, result, setIndex) {
  const labelEl = card.querySelector('.result-label');
  const balls = card.querySelector('.balls');
  balls.innerHTML = '';

  const mainSpinners = Array.from({ length: PICK_COUNT }, () => createSpinningBall());
  mainSpinners.forEach((spinner) => balls.appendChild(spinner.element));

  const plus = document.createElement('span');
  plus.className = 'plus-sign';
  plus.textContent = '+';
  balls.appendChild(plus);

  const bonusSpinner = createSpinningBall();
  balls.appendChild(createBonusSpinnerWrap(bonusSpinner));

  await delay(INITIAL_SPIN_MS + setIndex * 80);

  await Promise.all(
    mainSpinners.map((spinner, i) =>
      delay(i * STOP_STAGGER_MS).then(() => spinner.stop(result.main[i]))
    )
  );

  await delay(350);
  await bonusSpinner.stop(result.bonus);

  labelEl.textContent = setCount > 1 ? `${setIndex + 1}번째 세트 · 추첨 결과` : '추첨 결과';
}

async function animateDraw() {
  drawBtn.disabled = true;
  resultsEl.innerHTML = '';

  const session = document.createElement('div');
  session.className = 'draw-session';

  const machine = createLottoMachine();
  machine.setLabel(setCount > 1 ? '1번째 세트 추첨 중' : '추첨기에서 번호를 뽑는 중');
  session.appendChild(machine.element);
  machine.init();

  const resultsList = document.createElement('div');
  resultsList.className = 'draw-results-list';
  session.appendChild(resultsList);

  resultsEl.appendChild(session);

  for (let s = 0; s < setCount; s++) {
    const { card } = createResultCard(s);
    resultsList.appendChild(card);

    const result = drawNumbers();

    machine.setLabel(setCount > 1 ? `${s + 1}번째 세트 추첨 중` : '추첨기에서 번호를 뽑는 중');
    machine.resetTray();

    await machine.mix(s === 0 ? 900 : 650);

    for (const num of result.pickOrder) {
      await machine.eject(num);
      await delay(MACHINE_PICK_GAP_MS);
    }

    await delay(400);
    machine.setLabel(setCount > 1 ? `${s + 1}번째 세트 · 보너스 번호` : '보너스 번호 추첨');
    await machine.eject(result.bonus, { bonus: true });

    await delay(350);
    await animateResultCard(card, result, s);
  }

  machine.setLabel(setCount > 1 ? '전체 추첨 완료' : '추첨 완료');
  await delay(500);
  machine.destroy();

  drawBtn.disabled = false;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateSetCount(delta) {
  setCount = Math.min(MAX_SETS, Math.max(MIN_SETS, setCount + delta));
  setCountEl.textContent = setCount;
}

decreaseBtn.addEventListener('click', () => updateSetCount(-1));
increaseBtn.addEventListener('click', () => updateSetCount(1));
drawBtn.addEventListener('click', animateDraw);

showEmptyState();
