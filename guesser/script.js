/**
 * script.js — Genshin Guesser ゲームロジック
 * Daily / Endless モード、判定、サジェスト、設定、共有を管理する。
 */

'use strict';

// ---------------------------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------------------------
let gameMode = 'daily';      // 'daily' | 'endless'
let answer = null;           // 正規化済みキャラクター
let guesses = [];            // { char, results }[] — 回答履歴
let settings = {};           // { [fieldKey]: boolean }
let solved = false;
let attempts = 0;

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------
const MAX_GUESSES = 10;
const LS_SETTINGS_KEY = 'genshin-guesser-settings';
const LS_DAILY_KEY    = 'genshin-guesser-daily';

// ---------------------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initMode(gameMode);
  bindEvents();
});

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
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.addEventListener('click', submitGuess);

  // サジェスト外クリックで閉じる
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) closeSuggest();
  });

  // 設定ボタン
  document.getElementById('settingsBtn')?.addEventListener('click', openSettings);
  document.getElementById('settingsClose')?.addEventListener('click', closeSettings);
  document.getElementById('settingsOverlay')?.addEventListener('click', closeSettings);
  document.getElementById('settingsSaveBtn')?.addEventListener('click', saveSettings);

  // 共有ボタン
  document.getElementById('shareBtn')?.addEventListener('click', shareResult);

  // リセットボタン（Endless用）
  document.getElementById('resetBtn')?.addEventListener('click', () => initMode('endless'));
}

// ---------------------------------------------------------------------------
// モード管理
// ---------------------------------------------------------------------------
function switchMode(mode) {
  gameMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.mode === mode)
  );
  initMode(mode);
}

function initMode(mode) {
  guesses = [];
  solved = false;
  attempts = 0;

  clearGuessHistory();
  updateShareBtn(false);

  const pool = CHARACTERS.filter(c => c.enabled);
  if (pool.length === 0) {
    showError('出題できるキャラクターがいません。');
    return;
  }

  if (mode === 'daily') {
    answer = getDailyCharacter(pool);
    document.getElementById('resetBtn')?.classList.add('hidden');
  } else {
    answer = getRandomCharacter(pool);
    document.getElementById('resetBtn')?.classList.remove('hidden');
  }

  setInputEnabled(true);
  document.getElementById('guessInput').value = '';
  document.getElementById('guessInput').focus();

  const modeLabel = mode === 'daily' ? 'デイリーモード' : 'エンドレスモード';
  document.getElementById('modeLabel').textContent = modeLabel;

  // Dailyセーブデータ復元
  if (mode === 'daily') restoreDailyState();
}

// ---------------------------------------------------------------------------
// Daily seed ロジック
// ---------------------------------------------------------------------------

/**
 * YYYY-MM-DD 文字列から安定した擬似乱数インデックスを生成する。
 * @param {string} dateStr
 * @param {number} max
 * @returns {number}
 */
function seededIndex(dateStr, max) {
  // 簡易 djb2 ハッシュ
  let hash = 5381;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) + hash) ^ dateStr.charCodeAt(i);
    hash = hash >>> 0; // 32bit unsigned
  }
  return hash % max;
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDailyCharacter(pool) {
  const idx = seededIndex(getTodayString(), pool.length);
  return pool[idx];
}

function getRandomCharacter(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ---------------------------------------------------------------------------
// Dailyセーブ / 復元
// ---------------------------------------------------------------------------
function saveDailyState() {
  const data = {
    date: getTodayString(),
    answerId: answer.id,
    guesses: guesses.map(g => g.char.id),
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
    if (data.answerId !== answer.id) return;

    data.guesses.forEach(id => {
      const char = CHARACTERS.find(c => c.id === id);
      if (char) processGuess(char, /* save= */ false);
    });
    solved = data.solved;
    attempts = data.attempts;
    if (solved) onSolve(false);
  } catch (e) {
    // 破損データは無視
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
  const results = searchCharacters(q);
  showSuggest(results);
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

/**
 * 名前・displayNames で部分一致検索する。
 * @param {string} query
 * @returns {object[]}
 */
function searchCharacters(query) {
  const q = query.toLowerCase();
  const guessedIds = new Set(guesses.map(g => g.char.id));
  return CHARACTERS.filter(c => {
    if (guessedIds.has(c.id)) return false;
    return c.displayNames.some(name => name.toLowerCase().includes(q));
  }).slice(0, 8);
}

function showSuggest(results) {
  const list = document.getElementById('suggestList');
  if (!list) return;
  currentSuggestions = results;
  suggestSelected = -1;

  if (results.length === 0) { closeSuggest(); return; }

  list.innerHTML = '';
  results.forEach((char, i) => {
    const item = document.createElement('div');
    item.className = 'suggest-item';
    item.dataset.index = i;

    const img = document.createElement('img');
    img.src = char.iconUrl;
    img.alt = char.name;
    img.className = 'suggest-icon';
    img.onerror = () => { img.style.display = 'none'; };

    const span = document.createElement('span');
    span.textContent = char.name;

    item.appendChild(img);
    item.appendChild(span);
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      selectSuggestItem(char);
    });
    list.appendChild(item);
  });

  list.classList.remove('hidden');
}

function closeSuggest() {
  const list = document.getElementById('suggestList');
  if (list) list.classList.add('hidden');
  suggestSelected = -1;
}

function updateSuggestHighlight(items) {
  items.forEach((item, i) => item.classList.toggle('highlighted', i === suggestSelected));
  if (suggestSelected >= 0) items[suggestSelected]?.scrollIntoView({ block: 'nearest' });
}

function selectSuggestItem(char) {
  document.getElementById('guessInput').value = char.name;
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

  const char = CHARACTERS.find(c =>
    c.displayNames.some(n => n === name)
  );
  if (!char) {
    showInputError('キャラクターが見つかりません。');
    return;
  }
  if (guesses.some(g => g.char.id === char.id)) {
    showInputError('すでに入力済みです。');
    return;
  }

  input.value = '';
  clearInputError();
  processGuess(char, /* save= */ true);
}

/**
 * キャラクターを比較して結果を表示する。
 * @param {object} char - 推測キャラクター
 * @param {boolean} save - Daily セーブするか
 */
function processGuess(char, save = true) {
  attempts++;
  const results = compareCharacter(char, answer);
  guesses.unshift({ char, results }); // 新しい回答を先頭に

  renderGuessRow({ char, results }, guesses.length - 1);

  if (char.id === answer.id) {
    solved = true;
    onSolve(true);
  } else if (attempts >= MAX_GUESSES) {
    onGameOver();
  }

  if (gameMode === 'daily' && save) saveDailyState();
}

function onSolve(animate) {
  setInputEnabled(false);
  updateShareBtn(true);
  showResultBanner('🎉 正解！ ' + answer.name, 'success', animate);
}

function onGameOver() {
  setInputEnabled(false);
  updateShareBtn(true);
  showResultBanner('😭 残念... 正解は「' + answer.name + '」でした。', 'fail', true);
}

// ---------------------------------------------------------------------------
// 判定ロジック
// ---------------------------------------------------------------------------

/**
 * 推測キャラクターを正解と全フィールドで比較する。
 * @param {object} guess
 * @param {object} ans
 * @returns {object} key→{result:'green'|'yellow'|'gray', arrow?:'up'|'down'}
 */
function compareCharacter(guess, ans) {
  const out = {};
  HINT_FIELDS.forEach(field => {
    out[field.key] = compareField(field, guess, ans);
  });
  return out;
}

/**
 * 1フィールドを比較して判定を返す。
 * @param {object} field - HINT_FIELDS の要素
 * @param {object} guess
 * @param {object} ans
 * @returns {{ result: string, arrow?: string }}
 */
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
// 結果表示（1行サマリ + 展開詳細）
// ---------------------------------------------------------------------------

/** 有効化されている上位3フィールドのキー一覧（サマリ用） */
function getSummaryFields() {
  return HINT_FIELDS.filter(f => settings[f.key] !== false).slice(0, 4);
}

/**
 * 1件分の回答行を履歴に追加する。
 * @param {{ char, results }} entry
 * @param {number} rowIndex
 */
function renderGuessRow(entry, rowIndex) {
  const history = document.getElementById('guessHistory');
  if (!history) return;

  const { char, results } = entry;
  const enabledFields = HINT_FIELDS.filter(f => settings[f.key] !== false);

  // --- ラッパー ---
  const wrapper = document.createElement('div');
  wrapper.className = 'guess-row';
  wrapper.dataset.index = rowIndex;

  // --- 1行サマリ ---
  const summary = document.createElement('div');
  summary.className = 'guess-summary';
  summary.setAttribute('role', 'button');
  summary.setAttribute('tabindex', '0');
  summary.setAttribute('aria-expanded', 'false');
  summary.setAttribute('aria-label', char.name + ' の詳細を表示');

  // キャラ画像
  const img = document.createElement('img');
  img.src = char.iconUrl;
  img.alt = char.name;
  img.className = 'guess-icon';
  img.onerror = () => { img.style.display = 'none'; };
  summary.appendChild(img);

  // キャラ名
  const nameSpan = document.createElement('span');
  nameSpan.className = 'guess-name';
  nameSpan.textContent = char.name;
  summary.appendChild(nameSpan);

  // サマリ判定ドット（上位4項目）
  const dotWrap = document.createElement('div');
  dotWrap.className = 'summary-dots';
  getSummaryFields().forEach(f => {
    const r = results[f.key];
    const dot = document.createElement('span');
    dot.className = `dot dot-${r ? r.result : 'gray'}`;
    dot.title = f.label;
    dotWrap.appendChild(dot);
  });
  summary.appendChild(dotWrap);

  // 展開アイコン
  const chevron = document.createElement('span');
  chevron.className = 'chevron';
  chevron.textContent = '▼';
  chevron.setAttribute('aria-hidden', 'true');
  summary.appendChild(chevron);

  // --- 詳細パネル（最初は非表示）---
  const detail = document.createElement('div');
  detail.className = 'guess-detail hidden';
  detail.setAttribute('role', 'region');
  detail.setAttribute('aria-label', char.name + ' の詳細判定');

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
    val.textContent = getDisplayValue(field.key, char[field.key], char);

    if (r.arrow) {
      const arrow = document.createElement('span');
      arrow.className = `arrow arrow-${r.arrow}`;
      arrow.textContent = r.arrow === 'up' ? ' ↑' : ' ↓';
      arrow.setAttribute('aria-label', r.arrow === 'up' ? '正解より低い' : '正解より高い');
      val.appendChild(arrow);
    }

    cell.appendChild(label);
    cell.appendChild(val);
    grid.appendChild(cell);
  });

  detail.appendChild(grid);

  // トグル処理
  function toggleDetail() {
    const isOpen = !detail.classList.contains('hidden');
    detail.classList.toggle('hidden', isOpen);
    summary.setAttribute('aria-expanded', String(!isOpen));
    chevron.textContent = isOpen ? '▼' : '▲';
  }

  summary.addEventListener('click', toggleDetail);
  summary.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleDetail(); }
  });

  wrapper.appendChild(summary);
  wrapper.appendChild(detail);

  // 最新回答が一番上
  history.insertBefore(wrapper, history.firstChild);
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
// 共有機能
// ---------------------------------------------------------------------------

/**
 * 現在の結果を絵文字グリッドに変換してクリップボードにコピーする。
 */
function shareResult() {
  const lines = [];
  const modeStr = gameMode === 'daily' ? `#GenshinGuesser デイリー ${getTodayString()}` : '#GenshinGuesser エンドレス';
  lines.push(modeStr);
  lines.push(solved ? `✅ ${attempts}回で正解！` : `❌ ${MAX_GUESSES}回不正解`);
  lines.push('');

  const enabledFields = HINT_FIELDS.filter(f => settings[f.key] !== false);

  // 逆順（古い回答→新しい回答）で表示
  [...guesses].reverse().forEach(({ results }) => {
    const row = enabledFields.map(f => {
      const r = results[f.key];
      if (!r) return '⬜';
      switch (r.result) {
        case 'green':  return '🟩';
        case 'yellow': return '🟨';
        default:       return '⬜';
      }
    }).join('');
    lines.push(row);
  });

  lines.push('');
  lines.push('https://rakiku.github.io/Genshinguesser/guesser/');

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.getElementById('shareBtn');
    if (btn) {
      const orig = btn.textContent;
      btn.textContent = 'コピーしました！';
      setTimeout(() => { btn.textContent = orig; }, 2000);
    }
  }).catch(() => {
    alert('クリップボードへのコピーに失敗しました。\n\n' + text);
  });
}

function updateShareBtn(show) {
  const btn = document.getElementById('shareBtn');
  if (btn) btn.classList.toggle('hidden', !show);
}

// ---------------------------------------------------------------------------
// 設定
// ---------------------------------------------------------------------------

/** LocalStorage から設定を読み込み、デフォルトで埋める */
function loadSettings() {
  try {
    const raw = localStorage.getItem(LS_SETTINGS_KEY);
    if (raw) settings = JSON.parse(raw);
  } catch (e) { settings = {}; }

  HINT_FIELDS.forEach(f => {
    if (settings[f.key] === undefined) settings[f.key] = f.defaultOn;
  });
}

function saveSettings() {
  // モーダル内のチェック状態を読み取って settings に反映
  document.querySelectorAll('.settings-toggle').forEach(cb => {
    settings[cb.dataset.key] = cb.checked;
  });
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
  closeSettings();
}

function openSettings() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;

  const list = document.getElementById('settingsList');
  if (list) {
    list.innerHTML = '';
    HINT_FIELDS.forEach(f => {
      const row = document.createElement('label');
      row.className = 'settings-row';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'settings-toggle';
      cb.dataset.key = f.key;
      cb.checked = settings[f.key] !== false;
      cb.id = `setting-${f.key}`;

      const lbl = document.createElement('span');
      lbl.textContent = f.label;
      lbl.setAttribute('for', cb.id);

      row.appendChild(cb);
      row.appendChild(lbl);
      list.appendChild(row);
    });
  }

  modal.classList.remove('hidden');
  document.getElementById('settingsOverlay')?.classList.remove('hidden');
  document.getElementById('settingsClose')?.focus();
}

function closeSettings() {
  document.getElementById('settingsModal')?.classList.add('hidden');
  document.getElementById('settingsOverlay')?.classList.add('hidden');
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
