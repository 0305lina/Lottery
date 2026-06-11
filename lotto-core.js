export function getBallColor(num) {
  if (num <= 10) return 'yellow';
  if (num <= 20) return 'blue';
  if (num <= 30) return 'red';
  if (num <= 40) return 'gray';
  return 'green';
}

export function createBall(num, options = {}) {
  const { delay = 0, small = false } = options;
  const ball = document.createElement('div');
  ball.className = `ball ${getBallColor(num)}${small ? ' sm' : ''}`;
  ball.textContent = num;
  if (delay) ball.style.animationDelay = `${delay}ms`;
  return ball;
}

export function createSpinningBall(options = {}) {
  const { small = false } = options;
  const size = small ? 34 : 48;

  const ball = document.createElement('div');
  ball.className = `ball spin-slot yellow${small ? ' sm' : ''}`;

  const viewport = document.createElement('div');
  viewport.className = 'spin-viewport';

  const reel = document.createElement('div');
  reel.className = 'spin-reel';
  viewport.appendChild(reel);
  ball.appendChild(viewport);

  let spinTimer = null;

  function randomNum() {
    return Math.floor(Math.random() * 45) + 1;
  }

  function setColor(num) {
    ball.className = `ball spin-slot ${getBallColor(num)}${small ? ' sm' : ''}`;
  }

  function start() {
    spinTimer = setInterval(() => {
      const num = randomNum();
      reel.innerHTML = `<span>${num}</span>`;
      reel.style.transform = 'translateY(0)';
      setColor(num);
    }, 45);
  }

  function stop(finalNum) {
    return new Promise((resolve) => {
      clearInterval(spinTimer);

      const sequence = Array.from({ length: 14 + Math.floor(Math.random() * 6) }, randomNum);
      sequence.push(finalNum);

      reel.style.transition = 'none';
      reel.innerHTML = sequence.map((n) => `<span>${n}</span>`).join('');
      reel.style.transform = 'translateY(0)';
      setColor(sequence[0]);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const duration = 850 + Math.random() * 250;
          reel.style.transition = `transform ${duration}ms cubic-bezier(0.14, 0.85, 0.22, 1)`;
          reel.style.transform = `translateY(-${(sequence.length - 1) * size}px)`;
          setColor(finalNum);

          setTimeout(() => {
            ball.className = `ball ${getBallColor(finalNum)}${small ? ' sm' : ''} spin-landed`;
            ball.textContent = finalNum;
            resolve();
          }, duration);
        });
      });
    });
  }

  start();
  return { element: ball, stop };
}

export function createBonusSpinnerWrap(spinner) {
  const bonusWrap = document.createElement('div');
  bonusWrap.className = 'bonus-wrap';

  const bonusLabel = document.createElement('span');
  bonusLabel.className = 'bonus-label';
  bonusLabel.textContent = '보너스';
  bonusWrap.appendChild(bonusLabel);
  bonusWrap.appendChild(spinner.element);

  return bonusWrap;
}

export function appendResultBalls(container, result, startDelay = 0) {
  const PICK_COUNT = 6;

  result.main.forEach((num, i) => {
    container.appendChild(createBall(num, { delay: startDelay + i * 60 }));
  });

  const plus = document.createElement('span');
  plus.className = 'plus-sign';
  plus.textContent = '+';
  plus.style.animationDelay = `${startDelay + PICK_COUNT * 60}ms`;
  container.appendChild(plus);

  const bonusWrap = document.createElement('div');
  bonusWrap.className = 'bonus-wrap';
  bonusWrap.style.animationDelay = `${startDelay + PICK_COUNT * 60 + 40}ms`;

  const bonusLabel = document.createElement('span');
  bonusLabel.className = 'bonus-label';
  bonusLabel.textContent = '보너스';
  bonusWrap.appendChild(bonusLabel);
  bonusWrap.appendChild(createBall(result.bonus, { delay: startDelay + PICK_COUNT * 60 + 80 }));

  container.appendChild(bonusWrap);
}

export function createHistoryBalls(draw, small = true) {
  const wrap = document.createElement('div');
  wrap.className = 'balls history-balls';

  draw.numbers.forEach((num) => {
    wrap.appendChild(createBall(num, { small }));
  });

  const plus = document.createElement('span');
  plus.className = 'plus-sign sm';
  plus.textContent = '+';
  wrap.appendChild(plus);

  const bonusWrap = document.createElement('div');
  bonusWrap.className = 'bonus-wrap';
  const bonusLabel = document.createElement('span');
  bonusLabel.className = 'bonus-label';
  bonusLabel.textContent = '보너스';
  bonusWrap.appendChild(bonusLabel);
  bonusWrap.appendChild(createBall(draw.bonus_no, { small }));
  wrap.appendChild(bonusWrap);

  return wrap;
}

export function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatMoney(amount) {
  if (!amount) return '-';
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`;
}

export function computeNumberStats(draws, { includeBonus = true } = {}) {
  const counts = Array.from({ length: 45 }, (_, i) => ({ num: i + 1, count: 0 }));

  for (const draw of draws) {
    for (const num of draw.numbers) {
      counts[num - 1].count += 1;
    }
    if (includeBonus && draw.bonus_no) {
      counts[draw.bonus_no - 1].count += 1;
    }
  }

  return counts.sort((a, b) => b.count - a.count || a.num - b.num);
}
