import { createBall, createHistoryBalls, computeNumberStats, formatDate, formatMoney } from './lotto-core.js';

const PAGE_SIZE = 20;
const TOP_COUNT = 10;

const historyListEl = document.getElementById('historyList');
const historyMetaEl = document.getElementById('historyMeta');
const latestDrawEl = document.getElementById('latestDraw');
const statsDescEl = document.getElementById('statsDesc');
const topNumbersHighlightEl = document.getElementById('topNumbersHighlight');
const numberStatsEl = document.getElementById('numberStats');
const roundSearchEl = document.getElementById('roundSearch');
const numberFilterEl = document.getElementById('numberFilter');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const resetFilterBtn = document.getElementById('resetFilterBtn');

let allDraws = [];
let filteredDraws = [];
let visibleCount = PAGE_SIZE;

function getFirstDivision(draw) {
  return draw.divisions?.[0] ?? {};
}

function applyFilters() {
  const roundQuery = roundSearchEl.value.trim();
  const numberQuery = numberFilterEl.value.trim();

  filteredDraws = allDraws.filter((draw) => {
    if (roundQuery && draw.draw_no !== Number(roundQuery)) return false;

    if (numberQuery) {
      const num = Number(numberQuery);
      if (!num || num < 1 || num > 45) return false;
      const hasNumber = draw.numbers.includes(num) || draw.bonus_no === num;
      if (!hasNumber) return false;
    }

    return true;
  });

  visibleCount = PAGE_SIZE;
  renderHistoryList();
  updateMeta();
}

function renderNumberStats() {
  if (!allDraws.length) return;

  const stats = computeNumberStats(allDraws);
  const top = stats.slice(0, TOP_COUNT);
  const maxCount = top[0]?.count ?? 1;
  const latest = allDraws.reduce((a, b) => (a.draw_no > b.draw_no ? a : b));

  statsDescEl.textContent = `1~${latest.draw_no}회 기준 · 본번호·보너스 포함`;

  topNumbersHighlightEl.innerHTML = '';
  const highlight = document.createElement('div');
  highlight.className = 'card highlight-top-card';

  const topSix = stats.slice(0, 6);
  highlight.innerHTML = `
    <p class="highlight-top-label">TOP 6</p>
    <div class="highlight-top-balls"></div>
  `;
  const ballsWrap = highlight.querySelector('.highlight-top-balls');
  topSix.forEach((item, i) => {
    const itemEl = document.createElement('div');
    itemEl.className = 'highlight-top-item';
    itemEl.innerHTML = `<span class="highlight-rank">${i + 1}</span>`;
    itemEl.appendChild(createBall(item.num, { small: true }));
    const countEl = document.createElement('span');
    countEl.className = 'highlight-count';
    countEl.textContent = `${item.count}회`;
    itemEl.appendChild(countEl);
    ballsWrap.appendChild(itemEl);
  });
  topNumbersHighlightEl.appendChild(highlight);

  numberStatsEl.innerHTML = '';
  top.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span class="stat-rank">${i + 1}</span>
      <div class="stat-ball"></div>
      <div class="stat-bar-wrap">
        <div class="stat-bar" style="width: ${Math.round((item.count / maxCount) * 100)}%"></div>
      </div>
      <span class="stat-count">${item.count}회</span>
    `;
    row.querySelector('.stat-ball').appendChild(createBall(item.num, { small: true }));
    numberStatsEl.appendChild(row);
  });
}

function renderLatestDraw() {
  if (!allDraws.length) return;

  const latest = allDraws.reduce((a, b) => (a.draw_no > b.draw_no ? a : b));
  const first = getFirstDivision(latest);

  latestDrawEl.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'latest-header';
  header.innerHTML = `
    <div>
      <span class="latest-badge">최신 회차</span>
      <h3>${latest.draw_no}회</h3>
      <p class="latest-date">${formatDate(latest.date)}</p>
    </div>
    <div class="latest-prize">
      <span class="prize-label">1등 1인당</span>
      <strong>${formatMoney(first.prize)}</strong>
      <span class="prize-winners">${first.winners ?? '-'}명 당첨</span>
    </div>
  `;
  latestDrawEl.appendChild(header);
  latestDrawEl.appendChild(createHistoryBalls(latest, false));
}

function renderHistoryList() {
  const slice = filteredDraws.slice(0, visibleCount);
  historyListEl.innerHTML = '';

  if (!slice.length) {
    historyListEl.innerHTML = '<p class="history-empty">조건에 맞는 당첨번호가 없습니다.</p>';
    loadMoreBtn.hidden = true;
    return;
  }

  slice.forEach((draw) => {
    const first = getFirstDivision(draw);
    const item = document.createElement('article');
    item.className = 'history-item';

    const info = document.createElement('div');
    info.className = 'history-item-info';
    info.innerHTML = `
      <div class="history-round">${draw.draw_no}회</div>
      <div class="history-date">${formatDate(draw.date)}</div>
      <div class="history-prize">
        1등 ${first.winners ?? '-'}명 · ${formatMoney(first.prize)}
      </div>
    `;

    item.appendChild(info);
    item.appendChild(createHistoryBalls(draw));
    historyListEl.appendChild(item);
  });

  loadMoreBtn.hidden = visibleCount >= filteredDraws.length;
}

function updateMeta() {
  const latest = allDraws.reduce((a, b) => (a.draw_no > b.draw_no ? a : b), allDraws[0]);
  const hasFilter = roundSearchEl.value.trim() || numberFilterEl.value.trim();

  historyMetaEl.textContent = hasFilter
    ? `검색 결과 ${filteredDraws.length}건 (전체 1~${latest.draw_no}회)`
    : `1회(2002년)부터 ${latest.draw_no}회까지 총 ${allDraws.length}회`;
}

async function loadHistory() {
  try {
    const res = await fetch('lotto-history.json');
    if (!res.ok) throw new Error('failed');
    allDraws = await res.json();
    allDraws.sort((a, b) => b.draw_no - a.draw_no);
    filteredDraws = allDraws;

    renderNumberStats();
    renderLatestDraw();
    renderHistoryList();
    updateMeta();
  } catch {
    statsDescEl.textContent = '통계를 불러오지 못했어요.';
    topNumbersHighlightEl.innerHTML = '';
    numberStatsEl.innerHTML = '<p class="history-empty">데이터를 불러올 수 없어요.</p>';
    historyMetaEl.textContent = '역대 당첨번호를 불러오지 못했습니다.';
    historyListEl.innerHTML = '<p class="history-empty">로컬 서버에서 실행하거나 페이지를 새로고침해 주세요.</p>';
    latestDrawEl.innerHTML = '';
    loadMoreBtn.hidden = true;
  }
}

roundSearchEl.addEventListener('input', applyFilters);
numberFilterEl.addEventListener('input', applyFilters);
resetFilterBtn.addEventListener('click', () => {
  roundSearchEl.value = '';
  numberFilterEl.value = '';
  applyFilters();
});
loadMoreBtn.addEventListener('click', () => {
  visibleCount += PAGE_SIZE;
  renderHistoryList();
});

loadHistory();
