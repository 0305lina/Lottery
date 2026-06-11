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

async function animateResultCard(card, result, label, setIndex) {
  const labelEl = card.querySelector('.result-label');
  const balls = card.querySelector('.balls');

  const mainSpinners = Array.from({ length: PICK_COUNT }, () => createSpinningBall());
  mainSpinners.forEach((spinner) => balls.appendChild(spinner.element));

  const plus = document.createElement('span');
  plus.className = 'plus-sign';
  plus.textContent = '+';
  balls.appendChild(plus);

  const bonusSpinner = createSpinningBall();
  balls.appendChild(createBonusSpinnerWrap(bonusSpinner));

  labelEl.textContent = label;

  await delay(INITIAL_SPIN_MS + setIndex * 120);

  await Promise.all(
    mainSpinners.map((spinner, i) =>
      delay(i * STOP_STAGGER_MS).then(() => spinner.stop(result.main[i]))
    )
  );

  await delay(350);
  await bonusSpinner.stop(result.bonus);

  labelEl.textContent = setIndex > 0 || setCount > 1 ? `${setIndex + 1}번째 세트 · 추첨 결과` : '추첨 결과';
}

async function animateDraw() {
  drawBtn.disabled = true;
  resultsEl.innerHTML = '';

  for (let s = 0; s < setCount; s++) {
    const drawSet = document.createElement('div');
    drawSet.className = 'draw-set';

    const machine = createLottoMachine();
    machine.setLabel(setCount > 1 ? `${s + 1}번째 세트 · 추첨기` : '추첨기에서 번호를 뽑는 중');
    drawSet.appendChild(machine.element);
    machine.init();

    const card = document.createElement('div');
    card.className = 'result-card';

    const label = document.createElement('div');
    label.className = 'result-label';
    label.textContent = '추첨 결과 대기 중...';
    card.appendChild(label);

    const balls = document.createElement('div');
    balls.className = 'balls';
    card.appendChild(balls);

    drawSet.appendChild(card);
    resultsEl.appendChild(drawSet);

    const result = drawNumbers();

    await machine.mix(900);

    for (const num of result.pickOrder) {
      await machine.eject(num);
      await delay(MACHINE_PICK_GAP_MS);
    }

    await delay(400);
    machine.setLabel('보너스 번호 추첨');
    await machine.eject(result.bonus, { bonus: true });

    machine.setLabel('추첨 완료');
    await delay(500);
    machine.destroy();

    await animateResultCard(
      card,
      result,
      setCount > 1 ? `${s + 1}번째 세트 · 추첨 결과` : '추첨 결과',
      s
    );
  }

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
