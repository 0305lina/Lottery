import { createBall } from './lotto-core.js';

const DRUM_BALL_COUNT = 32;
const PHYS_COLORS = ['#ffc342', '#539df5', '#f3727f', '#b3b3b3', '#1ed760'];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class DrumPhysics {
  constructor(worldEl) {
    this.world = worldEl;
    this.balls = [];
    this.mixing = false;
    this.running = true;
    this.gravity = 0.48;
    this.friction = 0.988;
    this.restitution = 0.58;
    this.spinForce = 0.14;
    this.measure();
    this.spawnBalls(DRUM_BALL_COUNT);
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  measure() {
    const rect = this.world.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.cx = this.w / 2;
    this.cy = this.h / 2;
    this.R = Math.min(this.w, this.h) / 2 - 3;
  }

  spawnBalls(count) {
    for (let i = 0; i < count; i++) {
      const r = 7 + Math.random() * 2.5;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (this.R - r - 10);
      const ball = {
        el: this.createDecorBall(r, PHYS_COLORS[i % PHYS_COLORS.length]),
        x: this.cx + Math.cos(angle) * dist,
        y: this.cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        r,
      };
      this.balls.push(ball);
      this.world.appendChild(ball.el);
    }
  }

  createDecorBall(r, color) {
    const el = document.createElement('div');
    el.className = 'phys-ball';
    el.style.width = `${r * 2}px`;
    el.style.height = `${r * 2}px`;
    el.style.background = color;
    return el;
  }

  setMixing(active) {
    this.mixing = active;
  }

  tick() {
    if (!this.running) return;

    if (this.world.offsetParent !== null) {
      this.measure();
    }

    for (const b of this.balls) {
      b.vy += this.gravity;

      if (this.mixing) {
        const dx = b.x - this.cx;
        const dy = b.y - this.cy;
        const dist = Math.hypot(dx, dy) || 1;
        b.vx += (-dy / dist) * this.spinForce;
        b.vy += (dx / dist) * this.spinForce;
        b.vx += (Math.random() - 0.5) * 0.55;
        b.vy += (Math.random() - 0.5) * 0.35;
      }

      b.vx *= this.friction;
      b.vy *= this.friction;
      b.x += b.vx;
      b.y += b.vy;

      const dx = b.x - this.cx;
      const dy = b.y - this.cy;
      const dist = Math.hypot(dx, dy);
      const maxD = this.R - b.r - 1;

      if (dist > maxD) {
        const nx = dx / dist;
        const ny = dy / dist;
        b.x = this.cx + nx * maxD;
        b.y = this.cy + ny * maxD;
        const vn = b.vx * nx + b.vy * ny;
        if (vn > 0) {
          b.vx -= (1 + this.restitution) * vn * nx;
          b.vy -= (1 + this.restitution) * vn * ny;
        }
      }

      if (!this.mixing && b.y > this.cy + this.R * 0.35) {
        b.vy += this.gravity * 0.25;
        b.vx *= 0.96;
        if (Math.abs(b.vy) < 0.35 && b.y > this.cy + this.R * 0.5) {
          b.vy *= 0.7;
        }
      }

      b.el.style.transform = `translate3d(${b.x - b.r}px, ${b.y - b.r}px, 0)`;
    }

    requestAnimationFrame(this.tick);
  }

  destroy() {
    this.running = false;
    this.balls.forEach((b) => b.el.remove());
    this.balls = [];
  }
}

function getRelativeRect(el, ancestor) {
  const a = ancestor.getBoundingClientRect();
  const b = el.getBoundingClientRect();
  return {
    left: b.left - a.left,
    top: b.top - a.top,
    width: b.width,
    height: b.height,
    centerX: b.left - a.left + b.width / 2,
    centerY: b.top - a.top + b.height / 2,
  };
}

function animateBallThroughChute(ballEl, assembly, chuteEl, targetEl) {
  const chute = getRelativeRect(chuteEl, assembly);
  const target = getRelativeRect(targetEl, assembly);
  const ballSize = ballEl.offsetWidth || 32;
  const half = ballSize / 2;

  let x = chute.centerX - half;
  let y = chute.top - half * 0.5;
  let vx = (Math.random() - 0.5) * 1.2;
  let vy = 0.5;
  const gravity = 0.72;
  const chuteLeft = chute.centerX - chute.width * 0.38;
  const chuteRight = chute.centerX + chute.width * 0.38;
  const floorY = target.centerY - half;
  let settled = false;
  let bounceCount = 0;

  ballEl.style.position = 'absolute';
  ballEl.style.left = '0';
  ballEl.style.top = '0';
  ballEl.style.zIndex = '20';
  ballEl.style.margin = '0';
  assembly.appendChild(ballEl);

  return new Promise((resolve) => {
    function frame() {
      if (!settled) {
        vy += gravity;
        x += vx;
        y += vy;

        if (x < chuteLeft) {
          x = chuteLeft;
          vx = Math.abs(vx) * 0.35;
        }
        if (x + ballSize > chuteRight) {
          x = chuteRight - ballSize;
          vx = -Math.abs(vx) * 0.35;
        }

        vx *= 0.985;

        if (y >= floorY && vy > 0) {
          y = floorY;
          vy = -vy * 0.42;
          vx *= 0.75;
          bounceCount += 1;
          if (bounceCount >= 2 || Math.abs(vy) < 1.2) {
            settled = true;
            vy = 0;
            vx = 0;
          }
        }
      } else {
        const dx = target.centerX - half - x;
        x += dx * 0.28;
        if (Math.abs(dx) < 0.6) {
          ballEl.remove();
          resolve();
          return;
        }
      }

      ballEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      requestAnimationFrame(frame);
    }
    frame();
  });
}

export function createLottoMachine() {
  const root = document.createElement('div');
  root.className = 'lotto-machine';
  root.innerHTML = `
    <p class="machine-label">추첨기 가동 중</p>
    <div class="machine-assembly">
      <div class="machine-stand"></div>
      <div class="machine-drum-unit">
        <div class="machine-drum">
          <div class="drum-balls-world"></div>
          <div class="drum-glass"></div>
          <div class="drum-rim"></div>
          <div class="drum-chute-mouth" aria-hidden="true"></div>
        </div>
      </div>
      <div class="machine-chute">
        <div class="chute-inner"></div>
      </div>
      <div class="machine-flight-layer"></div>
    </div>
    <div class="machine-tray">
      <div class="tray-rail"></div>
      <div class="tray-main"></div>
      <span class="tray-plus">+</span>
      <div class="tray-bonus">
        <span class="bonus-label">보너스</span>
        <div class="tray-bonus-slot"></div>
      </div>
    </div>
  `;

  const label = root.querySelector('.machine-label');
  const drum = root.querySelector('.machine-drum');
  const assembly = root.querySelector('.machine-assembly');
  const chuteEl = root.querySelector('.machine-chute');
  const worldEl = root.querySelector('.drum-balls-world');
  const trayMain = root.querySelector('.tray-main');
  const trayBonusSlot = root.querySelector('.tray-bonus-slot');

  for (let i = 0; i < 6; i++) {
    const slot = document.createElement('div');
    slot.className = 'tray-slot';
    trayMain.appendChild(slot);
  }

  let physics = null;

  function ensurePhysics() {
    if (!physics) {
      physics = new DrumPhysics(worldEl);
    }
    return physics;
  }

  return {
    element: root,
    init() {
      ensurePhysics();
    },
    setLabel(text) {
      label.textContent = text;
    },
    async mix(duration = 900) {
      const sim = ensurePhysics();
      drum.classList.add('mixing');
      sim.setMixing(true);
      await delay(duration);
    },
    async eject(num, { bonus = false } = {}) {
      const sim = ensurePhysics();
      sim.setMixing(true);
      drum.classList.add('mixing');
      await delay(380 + Math.random() * 120);

      sim.setMixing(false);
      drum.classList.remove('mixing');
      drum.classList.add('ejecting');
      chuteEl.classList.add('active');

      await delay(120);

      const flying = createBall(num, { small: true });
      flying.classList.add('chute-ball');

      const target = bonus
        ? trayBonusSlot
        : trayMain.querySelector('.tray-slot:not(.filled)');

      if (!target) {
        flying.remove();
        drum.classList.remove('ejecting');
        chuteEl.classList.remove('active');
        return;
      }

      await animateBallThroughChute(flying, assembly, chuteEl, target);

      drum.classList.remove('ejecting');
      chuteEl.classList.remove('active');

      const landed = createBall(num, { small: true });
      landed.classList.add('tray-landed');

      if (bonus) {
        trayBonusSlot.innerHTML = '';
        trayBonusSlot.appendChild(landed);
      } else {
        target.classList.add('filled');
        target.appendChild(landed);
      }

      await delay(220);
    },
    destroy() {
      if (physics) {
        physics.destroy();
        physics = null;
      }
    },
  };
}
