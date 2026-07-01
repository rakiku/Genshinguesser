/**
 * script.js — Genshin Guesser ゲームロジック
 * Daily / Endless / Challenge モード、キャラクター/武器ジャンル、判定、サジェスト、共有を管理。
 */

'use strict';

// ---------------------------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------------------------
let gameMode   = 'daily';       // 'daily' | 'endless' | 'challenge'
let genre      = 'character';   // 'character' | 'weapon'
let rarityFilter = 'all';       // 'all' | '5' | '4' | '45'
let answer     = null;          // 正規化済み対象
let guesses    = [];            // { item, results }[] — 回答履歴
let solved     = false;
let attempts   = 0;
let streak     = 0;             // エンドレス連勝数
let bestStreak = 0;
let challengeRemain = 10;       // チャレンジ残り回数
let currentScore    = 0;        // チャレンジスコア

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------
const CHALLENGE_MAX_WRONG = 10;
const LS_SETTINGS_KEY     = 'genshin-guesser-settings';
const LS_DAILY_KEY        = 'genshin-guesser-daily-v2';
const LS_STREAK_KEY       = 'genshin-guesser-streak';
const LS_BEST_STREAK_KEY  = 'genshin-guesser-best-streak';
const LS_CHALLENGE_BEST   = 'genshin-guesser-challenge-best';

let settings = {};

// ---------------------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  parseUrlParams();
  loadSettings();
  loadStreakData();
  bindEvents();
  initMode(gameMode);
});

function parseUrlParams() {
  const params = new URLSearchParams(location.search);
  const m = params.get('mode');
  if (m === 'daily' || m === 'endless' || m === 'challenge') gameMode = m;
  const g = params.get('genre');
  if (g === 'character' || g === 'weapon') genre = g;
  const r = params.get('rarity');
  if (r === '5' || r === '4' || r === '45') rarityFilter = r;
}

/** イベントバインド */
function bindEvents() {
  // モード切替
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (mode !== gameMode) switchMode(mode);
    });
  });

  // 入力欄
  const input = document.getElementById('guessInput');
  if (input) {
    input.addEventListener('input', onInputChange);
    input.addEventListener('keydown', onInputKeydown);
  }

  // 送信ボタン
  document.getElementById('submitBtn')?.addEventListener('click', submitGuess);

  // サジェスト外クリックで閉じる
  document.addEventListener('click', e => {
    if (!e.target.closest('.input-wrapper')) closeSuggest();
  });

  // 共有ボタン
  document.getElementById('shareBtn')?.addEventListener('click', shareToX);
  document.getElementById('copyBtn')?.addEventListener('click', copyResult);

  // リセット
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (gameMode === 'endless') initMode('endless');
    else if (gameMode === 'challenge') initMode('challenge');
  });

  // 正解演出クリックで閉じる
  document.getElementById('winOverlay')?.addEventListener('click', closeWinOverlay);
}

// ---------------------------------------------------------------------------
// モード管理
// ---------------------------------------------------------------------------
function switchMode(mode) {
  gameMode = mode;
  initMode(mode);
}

function getPool() {
  if (genre === 'weapon') {
    return WEAPONS.filter(w => {
      if (!w.enabled) return false;
      if (rarityFilter === '5')  return w.rarity === 5;
      if (rarityFilter === '4')  return w.rarity === 4;
      if (rarityFilter === '45') return w.rarity >= 4;
      return true;
    });
  }
  return CHARACTERS.filter(c => c.enabled);
}

function getCurrentHintFields() {
  return genre === 'weapon' ? WEAPON_HINT_FIELDS : HINT_FIELDS;
}

function initMode(mode) {
  gameMode = mode;
  guesses  = [];
  solved   = false;
  attempts = 0;
  challengeRemain = CHALLENGE_MAX_WRONG;
  currentScore    = 0;

  clearGuessHistory();
  closeWinOverlay();
  updateShareBtns(false);

  // モード切替ボタン更新
  document.querySelectorAll('.mode-btn').forEach(btn => {
    const isActive = btn.dataset.mode === mode;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });

  // UI更新
  updateGenreIndicator();
  updateModeLabel(mode);
  updateChallengeInfo();
  updateStreakUI();

  const pool = getPool();
  if (pool.length === 0) {
    showError('出題できるデータがありません。');
    return;
  }

  if (mode === 'daily') {
    answer = getDailyItem(pool);
    document.getElementById('resetBtn')?.classList.add('hidden');
    restoreDailyState();
  } else {
    answer = getRandomItem(pool, answer);
    document.getElementById('resetBtn')?.classList.remove('hidden');
  }

  setInputEnabled(true);
  const input = document.getElementById('guessInput');
  if (input) { input.value = ''; input.focus(); }
  document.getElementById('resultBanner')?.classList.add('hidden');
}

function updateGenreIndicator() {
  const el = document.getElementById('genreIndicator');
  if (!el) return;
  const genreLabel = genre === 'weapon' ? '⚔ 武器モード' : '👤 キャラクターモード';
  let rarityLabel = '';
  if (genre === 'weapon' && rarityFilter !== 'all') {
    rarityLabel = { '5':'★5のみ', '4':'★4のみ', '45':'★5+★4' }[rarityFilter] || '';
    rarityLabel = ` (${rarityLabel})`;
  }
  el.textContent = genreLabel + rarityLabel;
}

function updateModeLabel(mode) {
  const labels = { daily: '📅 デイリーモード', endless: '🔁 エンドレスモード', challenge: '🏆 チャレンジモード（10ミス終了）' };
  const el = document.getElementById('modeLabel');
  if (el) el.textContent = labels[mode] || '';

  // チャレンジ情報バー
  const ci = document.getElementById('challengeInfo');
  if (ci) ci.classList.toggle('hidden', mode !== 'challenge');

  // ストリーク情報バー
  const si = document.getElementById('streakInfo');
  if (si) si.classList.toggle('hidden', mode !== 'endless');

  // リセットボタン表示
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.classList.toggle('hidden', mode === 'daily');
}

function updateChallengeInfo() {
  const rc = document.getElementById('remainCount');
  if (rc) rc.textContent = challengeRemain;
  const sc = document.getElementById('currentScore');
  if (sc) sc.textContent = currentScore;
}

function updateStreakUI() {
  const sc = document.getElementById('streakCount');
  if (sc) sc.textContent = streak;
  const bs = document.getElementById('bestStreakCount');
  if (bs) bs.textContent = bestStreak;
}

// ---------------------------------------------------------------------------
// Daily seed ロジック
// ---------------------------------------------------------------------------
function seededIndex(dateStr, max) {
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash) ^ dateStr.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash % max;
}

function getTodayString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}

function getDailyItem(pool) {
  return pool[seededIndex(getTodayString() + genre, pool.length)];
}

function getRandomItem(pool, exclude = null) {
  const filtered = exclude ? pool.filter(x => x.id !== exclude.id) : pool;
  const src = filtered.length > 0 ? filtered : pool;
  return src[Math.floor(Math.random() * src.length)];
}

// ---------------------------------------------------------------------------
// Dailyセーブ / 復元
// ---------------------------------------------------------------------------
function saveDailyState() {
  const data = {
    date: getTodayString(),
    genre,
    answerId: answer.id,
    guesses: guesses.map(g => g.item.id),
    solved,
    attempts,
  };
  localStorage.setItem(LS_DAILY_KEY, JSON.stringify(data));
}

function restoreDailyState() {
  try {
    const raw = localStorage.getItem(LS_DAILY_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.date !== getTodayString()) return;
    if (data.genre !== genre) return;
    if (data.answerId !== answer.id) return;
    const pool = genre === 'weapon' ? WEAPONS : CHARACTERS;
    data.guesses.forEach(id => {
      const item = pool.find(c => c.id === id);
      if (item) processGuess(item, false);
    });
    solved   = data.solved;
    attempts = data.attempts;
    if (solved) onSolve(false);
  } catch (e) { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Streak データ
// ---------------------------------------------------------------------------
function loadStreakData() {
  streak     = parseInt(localStorage.getItem(LS_STREAK_KEY) || '0', 10);
  bestStreak = parseInt(localStorage.getItem(LS_BEST_STREAK_KEY) || '0', 10);
}

function saveStreakData() {
  localStorage.setItem(LS_STREAK_KEY, String(streak));
  if (streak > bestStreak) {
    bestStreak = streak;
    localStorage.setItem(LS_BEST_STREAK_KEY, String(bestStreak));
  }
}

// ---------------------------------------------------------------------------
// 入力補助（オートコンプリート）
// ---------------------------------------------------------------------------
let suggestSelected = -1;
let currentSuggestions = [];

function onInputChange() {
  const q = document.getElementById('guessInput').value.trim();
  if (!q) { closeSuggest(); return; }
  showSuggest(searchItems(q));
}

function onInputKeydown(e) {
  const list = document.getElementById('suggestList');
  if (!list || list.classList.contains('hidden')) {
    if (e.key === 'Enter') submitGuess();
    return;
  }
  const items = list.querySelectorAll('.suggest-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    suggestSelected = Math.min(suggestSelected + 1, items.length - 1);
    updateSuggestHighlight(items);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    suggestSelected = Math.max(suggestSelected - 1, -1);
    updateSuggestHighlight(items);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (suggestSelected >= 0 && items[suggestSelected]) {
      selectSuggestItem(currentSuggestions[suggestSelected]);
    } else {
      submitGuess();
    }
  } else if (e.key === 'Escape') {
    closeSuggest();
  }
}

function searchItems(query) {
  const q = query.toLowerCase();
  const guessedIds = new Set(guesses.map(g => g.item.id));
  const pool = getPool();
  return pool.filter(item => {
    if (guessedIds.has(item.id)) return false;
    return item.displayNames.some(name => name.toLowerCase().includes(q));
  }).slice(0, 8);
}

function showSuggest(results) {
  const list = document.getElementById('suggestList');
  if (!list) return;
  currentSuggestions = results;
  suggestSelected = -1;
  if (results.length === 0) { closeSuggest(); return; }

  list.innerHTML = '';
  results.forEach((item, i) => {
    const el = document.createElement('div');
    el.className = 'suggest-item';
    el.dataset.index = i;

    const img = document.createElement('img');
    img.src = item.iconUrl;
    img.alt = item.name;
    img.className = 'suggest-icon';
    img.onerror = () => { img.style.display = 'none'; };

    const span = document.createElement('span');
    span.textContent = item.name;

    el.appendChild(img);
    el.appendChild(span);
    el.addEventListener('mousedown', e => { e.preventDefault(); selectSuggestItem(item); });
    list.appendChild(el);
  });
  list.classList.remove('hidden');
}

function closeSuggest() {
  document.getElementById('suggestList')?.classList.add('hidden');
  suggestSelected = -1;
}

function updateSuggestHighlight(items) {
  items.forEach((item, i) => item.classList.toggle('highlighted', i === suggestSelected));
  if (suggestSelected >= 0) items[suggestSelected]?.scrollIntoView({ block: 'nearest' });
}

function selectSuggestItem(item) {
  document.getElementById('guessInput').value = item.name;
  closeSuggest();
  submitGuess();
}

// ---------------------------------------------------------------------------
// 回答送信
// ---------------------------------------------------------------------------
function submitGuess() {
  if (solved) return;
  const input = document.getElementById('guessInput');
  const name = input.value.trim();
  if (!name) return;

  const pool = genre === 'weapon' ? WEAPONS : CHARACTERS;
  const item = pool.find(x =>
    x.displayNames.some(n => n === name)
  );

  if (!item) {
    showInputError('見つかりません。サジェストから選んでください。');
    return;
  }
  if (!getPool().some(x => x.id === item.id)) {
    showInputError('現在の出題範囲外です。');
    return;
  }
  if (guesses.some(g => g.item.id === item.id)) {
    showInputError('すでに入力済みです。');
    return;
  }

  input.value = '';   // ← 決定後にクリア (Req 5)
  closeSuggest();
  clearInputError();
  processGuess(item, true);
}

function processGuess(item, save = true) {
  attempts++;
  const fields = getCurrentHintFields();
  const results = compareItem(item, answer, fields);
  guesses.unshift({ item, results });

  renderGuessRow({ item, results }, guesses.length - 1);

  if (item.id === answer.id) {
    solved = true;
    onSolve(true);
  } else {
    // チャレンジモード: 誤答カウント
    if (gameMode === 'challenge') {
      challengeRemain--;
      updateChallengeInfo();
      if (challengeRemain <= 0) onChallengeOver();
    }
  }

  if (gameMode === 'daily' && save) saveDailyState();
}

function onSolve(animate) {
  setInputEnabled(false);
  updateShareBtns(true);

  if (gameMode === 'endless') {
    streak++;
    saveStreakData();
    updateStreakUI();
    currentScore++;
  } else if (gameMode === 'challenge') {
    currentScore++;
    updateChallengeInfo();
  }

  showResultBanner('🎉 正解！ ' + answer.name, 'success', animate);
  if (animate) showWinOverlay(answer);
}

function onChallengeOver() {
  setInputEnabled(false);
  updateShareBtns(true);
  const prevBest = parseInt(localStorage.getItem(LS_CHALLENGE_BEST) || '0', 10);
  const isNew = currentScore > prevBest;
  if (isNew) localStorage.setItem(LS_CHALLENGE_BEST, String(currentScore));
  const hintCount = attempts - guesses.filter(g => g.item.id === answer.id).length;
  showResultBanner(
    `😭 ゲームオーバー！ 正解は「${answer.name}」でした。\nスコア: ${currentScore}${isNew ? ' 🏆 新記録！' : ''} / 最高: ${Math.max(currentScore, prevBest)} / 総ヒント数: ${attempts}`,
    'fail',
    true
  );
}

// エンドレス: 不正解で次へ進む機能は resetBtn から呼び出す
// （エンドレスは誤答でも継続できるが、次の問題へ進むにはリセットボタンを押す）

// ---------------------------------------------------------------------------
// 判定ロジック
// ---------------------------------------------------------------------------
function compareItem(guess, ans, fields) {
  const out = {};
  fields.forEach(field => {
    out[field.key] = compareField(field, guess, ans);
  });
  return out;
}

function compareField(field, guess, ans) {
  const gVal = guess[field.key];
  const aVal = ans[field.key];

  switch (field.type) {
    case 'numeric': {
      const g = Number(gVal) || 0;
      const a = Number(aVal) || 0;
      if (g === a) return { result: 'green' };
      return { result: 'gray', arrow: g > a ? 'down' : 'up' };
    }
    case 'group': {
      if (!gVal || !aVal) return { result: 'gray' };
      if (gVal === aVal) return { result: 'green' };
      const gGroup = guess[field.group];
      const aGroup = ans[field.group];
      if (gGroup && aGroup && gGroup === aGroup) return { result: 'yellow' };
      return { result: 'gray' };
    }
    case 'exact':
    default: {
      if (String(gVal) === String(aVal)) return { result: 'green' };
      return { result: 'gray' };
    }
  }
}

// ---------------------------------------------------------------------------
// 結果表示（展開状態で追加 — Req 6）
// ---------------------------------------------------------------------------
function renderGuessRow(entry, rowIndex) {
  const history = document.getElementById('guessHistory');
  if (!history) return;
  const { item, results } = entry;
  const fields = getCurrentHintFields();
  const enabledFields = fields.filter(f => settings[f.key] !== false);

  const wrapper = document.createElement('div');
  wrapper.className = 'guess-row';
  wrapper.dataset.index = rowIndex;

  // --- サマリ（ヘッダー）— 初期: 展開アイコン ▲（展開済み表示）---
  const summary = document.createElement('div');
  summary.className = 'guess-summary';
  summary.setAttribute('role', 'button');
  summary.setAttribute('tabindex', '0');
  summary.setAttribute('aria-expanded', 'true');
  summary.setAttribute('aria-label', item.name + ' の詳細を表示');

  const img = document.createElement('img');
  img.src = item.iconUrl;
  img.alt = item.name;
  img.className = 'guess-icon';
  img.onerror = () => { img.style.display = 'none'; };
  summary.appendChild(img);

  const nameSpan = document.createElement('span');
  nameSpan.className = 'guess-name';
  nameSpan.textContent = item.name;
  summary.appendChild(nameSpan);

  const dotWrap = document.createElement('div');
  dotWrap.className = 'summary-dots';
  enabledFields.slice(0, 4).forEach(f => {
    const r = results[f.key];
    const dot = document.createElement('span');
    dot.className = `dot dot-${r ? r.result : 'gray'}`;
    dot.title = f.label;
    dotWrap.appendChild(dot);
  });
  summary.appendChild(dotWrap);

  const chevron = document.createElement('span');
  chevron.className = 'chevron';
  chevron.textContent = '▲';  // 初期: 展開済みなので▲
  chevron.setAttribute('aria-hidden', 'true');
  summary.appendChild(chevron);

  // --- 詳細パネル（初期: 展開 — Req 6）---
  const detail = document.createElement('div');
  detail.className = 'guess-detail';   // hidden クラス無し → 初期展開
  detail.setAttribute('role', 'region');
  detail.setAttribute('aria-label', item.name + ' の詳細判定');

  const grid = document.createElement('div');
  grid.className = 'detail-grid';

  enabledFields.forEach(field => {
    const r = results[field.key];
    if (!r) return;
    const cell = document.createElement('div');
    cell.className = `detail-cell result-${r.result}`;

    const label = document.createElement('div');
    label.className = 'cell-label';
    label.textContent = field.label;

    const val = document.createElement('div');
    val.className = 'cell-value';

    // 素材アイコン表示 (Req 6)
    const iconEl = buildMaterialIcon(field.key, item);
    if (iconEl) val.appendChild(iconEl);

    const textNode = document.createTextNode(getDisplayValue(field.key, item[field.key], item));
    val.appendChild(textNode);

    if (r.arrow) {
      const arrow = document.createElement('span');
      arrow.className = `arrow arrow-${r.arrow}`;
      arrow.textContent = r.arrow === 'up' ? ' ▲' : ' ▼';
      arrow.setAttribute('aria-label', r.arrow === 'up' ? '正解より低い' : '正解より高い');
      val.appendChild(arrow);
    }

    cell.appendChild(label);
    cell.appendChild(val);
    grid.appendChild(cell);
  });

  detail.appendChild(grid);

  // ヘッダータップで折りたたみ (Req 6)
  function toggleDetail() {
    const isOpen = !detail.classList.contains('hidden');
    detail.classList.toggle('hidden', isOpen);
    summary.setAttribute('aria-expanded', String(!isOpen));
    chevron.textContent = isOpen ? '▼' : '▲';
  }

  summary.addEventListener('click', toggleDetail);
  summary.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetail(); }
  });

  wrapper.appendChild(summary);
  wrapper.appendChild(detail);
  history.insertBefore(wrapper, history.firstChild);
}

/**
 * 素材アイコン要素を生成する（対象項目のみ）
 * キャラ: 突破ボス, 週ボス素材, 敵素材, 天賦本
 * 武器: 武器突破素材, 敵素材
 */
function buildMaterialIcon(fieldKey, item) {
  const matKeys = {
    // キャラ
    talentBoss:   () => `${IMAGE_BASE}/materials/boss/${encodeURIComponent(item.talentBoss)}.png`,
    talentWeekly: () => `${IMAGE_BASE}/materials/weekly/${encodeURIComponent(item.talentWeekly)}.png`,
    talentBook:   () => `${IMAGE_BASE}/materials/talent/${encodeURIComponent(item.talentBook)}.png`,
    enemyMaterial: () => `${IMAGE_BASE}/materials/enemy/${encodeURIComponent(item.enemyMaterial)}.png`,
    // 武器
    weaponBreakMaterial: () => `${IMAGE_BASE}/materials/weapon_break/${encodeURIComponent(item.weaponBreakMaterial)}.png`,
  };
  if (!matKeys[fieldKey]) return null;

  const img = document.createElement('img');
  img.src = matKeys[fieldKey]();
  img.alt = '';
  img.className = 'mat-icon';
  img.onerror = () => { img.remove(); };
  return img;
}

function clearGuessHistory() {
  const history = document.getElementById('guessHistory');
  if (history) history.innerHTML = '';
}

// ---------------------------------------------------------------------------
// 結果バナー
// ---------------------------------------------------------------------------
function showResultBanner(msg, cls, animate) {
  const banner = document.getElementById('resultBanner');
  if (!banner) return;
  banner.textContent = msg;
  banner.className = `result-banner ${cls}`;
  banner.classList.remove('hidden');
  if (animate) {
    banner.classList.add('bounce');
    banner.addEventListener('animationend', () => banner.classList.remove('bounce'), { once: true });
  }
}

// ---------------------------------------------------------------------------
// 正解演出 (Req 7)
// ---------------------------------------------------------------------------
function showWinOverlay(item) {
  const overlay = document.getElementById('winOverlay');
  if (!overlay) return;
  const img = document.getElementById('winImage');
  if (img) { img.src = item.iconUrl; img.alt = item.name; }
  const title = document.getElementById('winTitle');
  if (title) title.textContent = '🎉 ' + item.name + ' 正解！';
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeWinOverlay() {
  const overlay = document.getElementById('winOverlay');
  overlay?.classList.add('hidden');
  overlay?.setAttribute('aria-hidden', 'true');
}

// ---------------------------------------------------------------------------
// 共有機能 (Req 7)
// ---------------------------------------------------------------------------
function buildShareText() {
  const fields = getCurrentHintFields().filter(f => settings[f.key] !== false);
  const lines = [];
  const today = getTodayString();
  const genreLabel = genre === 'weapon' ? '武器' : 'キャラ';

  if (gameMode === 'daily') {
    lines.push(`#GenshinGuesser デイリー ${today} [${genreLabel}]`);
  } else if (gameMode === 'endless') {
    lines.push(`#GenshinGuesser エンドレス [${genreLabel}] 🔥${streak}連勝`);
  } else {
    lines.push(`#GenshinGuesser チャレンジ [${genreLabel}] スコア:${currentScore}`);
  }

  if (solved) {
    lines.push(`✅ ${attempts}回で正解！`);
  } else {
    lines.push(`❌ 失敗... 正解は「${answer.name}」`);
  }
  lines.push('');

  [...guesses].reverse().forEach(({ results }) => {
    const row = fields.map(f => {
      const r = results[f.key];
      if (!r) return '⬜';
      return r.result === 'green' ? '🟩' : r.result === 'yellow' ? '🟨' : '⬜';
    }).join('');
    lines.push(row);
  });

  lines.push('');
  lines.push('https://rakiku.github.io/Genshinguesser/guesser/');
  return lines.join('\n');
}

function shareToX() {
  const text = buildShareText();
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function copyResult() {
  const text = buildShareText();
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('copyBtn');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'コピーしました！';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }
  }).catch(() => alert('コピーに失敗しました。\n\n' + text));
}

function updateShareBtns(show) {
  document.getElementById('shareBtn')?.classList.toggle('hidden', !show);
  document.getElementById('copyBtn')?.classList.toggle('hidden', !show);
}

// ---------------------------------------------------------------------------
// 設定
// ---------------------------------------------------------------------------
function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) settings = JSON.parse(raw);
  } catch (e) { settings = {}; }

  [...HINT_FIELDS, ...WEAPON_HINT_FIELDS].forEach(f => {
    if (settings[f.key] === undefined) settings[f.key] = f.defaultOn;
  });
}

// ---------------------------------------------------------------------------
// UI ユーティリティ
// ---------------------------------------------------------------------------
function setInputEnabled(enabled) {
  const input = document.getElementById('guessInput');
  const btn   = document.getElementById('submitBtn');
  if (input) { input.disabled = !enabled; if (enabled) input.focus(); }
  if (btn)   btn.disabled = !enabled;
}

function showInputError(msg) {
  const el = document.getElementById('inputError');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function clearInputError() {
  const el = document.getElementById('inputError');
  if (el) { el.textContent = ''; el.classList.add('hidden'); }
}

function showError(msg) {
  showResultBanner(msg, 'fail', false);
}

function getDisplayValue(key, value, item) {
  if (value === null || value === undefined || value === '') return '—';
  switch (key) {
    case 'rarity':       return `★${value}`;
    case 'bannerType':   return { limited:'限定', standard:'恒常', distributed:'配布', pool:'ガチャ' }[value] || value;
    case 'body':         return (item && item.bodyLabel) || value;
    case 'distributed':  return value ? 'あり' : 'なし';
    case 'costume':      return value ? 'あり' : 'なし';
    case 'trace':        return value ? 'あり' : 'なし';
    case 'trainingRoad': return value ? 'あり' : 'なし';
    case 'releaseVersionNum': return (item && item.releaseVersionLabel) || String(value);
    default:             return String(value);
  }
}
