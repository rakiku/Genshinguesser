/**
 * styles.js — Genshin Guesser Hub Logic
 * Main menu: genre/mode selection, admin log, modals, GitHub Sync API
 */
'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let selectedGenre = 'character';
let selectedRarity = 'all';
let adminClickCount = 0;
let adminClickTimer = null;
let newsItems = [];
const ADMIN_CLICK_THRESHOLD = 10;
const ADMIN_CLICK_WINDOW = 10000; // ms

// ---------------------------------------------------------------------------
// GitHub API 設定
// ---------------------------------------------------------------------------
const GITHUB_OWNER = 'rakiku';         // あなたのGitHubユーザー名
const GITHUB_REPO  = 'Genshinguesser'; // リポジトリ名
const GITHUB_PATH  = 'news.json';      // 更新情報を保存するJSONファイルのパス

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  loadNewsFromStorage();
  bindGenreButtons();
  bindModeButtons();
  bindModalButtons();
  bindAdminTrigger();
});

// ---------------------------------------------------------------------------
// Genre selection
// ---------------------------------------------------------------------------
function bindGenreButtons() {
  document.querySelectorAll('.genre-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedGenre = btn.dataset.genre;
      document.querySelectorAll('.genre-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.genre === selectedGenre);
        b.setAttribute('aria-pressed', String(b.dataset.genre === selectedGenre));
      });
      // Show/hide rarity filter
      const rarityFilter = document.getElementById('rarityFilter');
      if (rarityFilter) {
        rarityFilter.classList.toggle('hidden', selectedGenre !== 'weapon');
      }
      updateModeLinks();
    });
  });

  document.querySelectorAll('.rarity-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRarity = btn.dataset.rarity;
      document.querySelectorAll('.rarity-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.rarity === selectedRarity)
      );
      updateModeLinks();
    });
  });
}

function buildGameUrl(mode) {
  const params = new URLSearchParams({
    mode,
    genre: selectedGenre,
  });
  if (selectedGenre === 'weapon' && selectedRarity !== 'all') {
    params.set('rarity', selectedRarity);
  }
  return `guesser/index.html?${params.toString()}`;
}

function updateModeLinks() {
  const dailyBtn   = document.getElementById('startDailyBtn');
  const endlessBtn = document.getElementById('startEndlessBtn');
  const challengeBtn = document.getElementById('startChallengeBtn');
  const versusBtn = document.getElementById('startVersusBtn');
  if (dailyBtn)    dailyBtn.href    = buildGameUrl('daily');
  if (endlessBtn)  endlessBtn.href  = buildGameUrl('endless');
  if (challengeBtn) challengeBtn.href = buildGameUrl('challenge');
  if (versusBtn) versusBtn.href = buildGameUrl('versus');
}

function bindModeButtons() {
  updateModeLinks();
}

// ---------------------------------------------------------------------------
// Modals
// ---------------------------------------------------------------------------
function bindModalButtons() {
  // How-to
  ['howToBtn', 'howToBtn2', 'howToFooterBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openModal('howTo'));
  });
  document.getElementById('howToClose')?.addEventListener('click', () => closeModal('howTo'));
  document.getElementById('howToOverlay')?.addEventListener('click', () => closeModal('howTo'));

  // About
  document.getElementById('aboutBtn')?.addEventListener('click', () => openModal('about'));
  document.getElementById('aboutClose')?.addEventListener('click', () => closeModal('about'));
  document.getElementById('aboutOverlay')?.addEventListener('click', () => closeModal('about'));

  // 🟢 配信者の方へモーダルの制御（追加）
  ['streamerBtn', 'streamerBtn2', 'streamerFooterBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openModal('streamer'));
  });
  document.getElementById('streamerClose')?.addEventListener('click', () => closeModal('streamer'));
  document.getElementById('streamerOverlay')?.addEventListener('click', () => closeModal('streamer'));

  // Admin auth
  document.getElementById('adminAuthClose')?.addEventListener('click', () => closeModal('adminAuth'));
  document.getElementById('adminAuthOverlay')?.addEventListener('click', () => closeModal('adminAuth'));
  document.getElementById('adminAuthBtn').addEventListener('click', () => adminAuthBtn);
  document.getElementById('adminAuthBtn').addEventListener('click', () => {
    // 既存の管理者認証処理
  });
  
  // Admin log
  document.getElementById('adminLogClose')?.addEventListener('click', () => closeModal('adminLog'));
  document.getElementById('adminLogOverlay')?.addEventListener('click', () => closeModal('adminLog'));
  document.getElementById('adminLogSaveBtn')?.addEventListener('click', handleAdminLogSave);
  document.getElementById('adminLogCancelBtn')?.addEventListener('click', resetAdminLogForm);
  document.getElementById('adminNewsList')?.addEventListener('click', handleAdminNewsAction);
}

function openModal(name) {
  document.getElementById(name + 'Modal')?.classList.remove('hidden');
  document.getElementById(name + 'Overlay')?.classList.remove('hidden');
}
function closeModal(name) {
  document.getElementById(name + 'Modal')?.classList.add('hidden');
  document.getElementById(name + 'Overlay')?.classList.add('hidden');
}

// ---------------------------------------------------------------------------
// Admin hidden feature
// ---------------------------------------------------------------------------
function bindAdminTrigger() {
  const trigger = document.getElementById('adminTrigger');
  if (!trigger) return;
  trigger.addEventListener('click', () => {
    adminClickCount++;
    if (adminClickTimer) clearTimeout(adminClickTimer);
    adminClickTimer = setTimeout(() => { adminClickCount = 0; }, ADMIN_CLICK_WINDOW);
    if (adminClickCount >= ADMIN_CLICK_THRESHOLD) {
      adminClickCount = 0;
      clearTimeout(adminClickTimer);
      openAdminAuth();
    }
  });
}

function openAdminAuth() {
  const input = document.getElementById('adminPasswordInput');
  if (input) input.value = '';
  document.getElementById('adminAuthError')?.classList.add('hidden');
  openModal('adminAuth');
  setTimeout(() => input?.focus(), 100);
}

function handleAdminAuth() {
  const input = document.getElementById('adminPasswordInput');
  if (!input) return;
  const password = input.value;
  // Use env variable if available (injected at build time), else default to 'password'
  const ADMIN_PASSWORD = (typeof ADMIN_LOG_PASSWORD !== 'undefined' && ADMIN_LOG_PASSWORD) ? ADMIN_LOG_PASSWORD : 'Liliavanrouge0101';
  if (password === ADMIN_PASSWORD) {
    closeModal('adminAuth');
    openAdminLogModal();
  } else {
    document.getElementById('adminAuthError')?.classList.remove('hidden');
  }
}

function openAdminLogModal() {
  resetAdminLogForm();
  renderAdminNewsList();
  openModal('adminLog');
}

function resetAdminLogForm() {
  const editIndex = document.getElementById('adminLogEditIndex');
  const dateInput = document.getElementById('adminLogDate');
  if (dateInput) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
  }
  const content = document.getElementById('adminLogContent');
  if (content) content.value = '';
  if (editIndex) editIndex.value = '';
  document.getElementById('adminLogSaveBtn').textContent = '追加する';
  document.getElementById('adminLogCancelBtn')?.classList.add('hidden');
}

function handleAdminLogSave() {
  const editIndex = document.getElementById('adminLogEditIndex');
  const dateInput = document.getElementById('adminLogDate');
  const contentInput = document.getElementById('adminLogContent');
  if (!editIndex || !dateInput || !contentInput) return;
  const date = dateInput.value.trim();
  const text = contentInput.value.trim();
  if (!date || !text) {
    alert('日付と内容を入力してください。');
    return;
  }
  if (editIndex.value !== '') {
    updateNewsItem(Number(editIndex.value), date, text);
  } else {
    addNewsItem(date, text);
  }
  saveNewsToStorage(); // 非同期に変更された保存処理を呼び出す
  resetAdminLogForm();
  renderAdminNewsList();
}

function handleAdminNewsAction(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const index = Number(button.dataset.index);
  if (Number.isNaN(index) || !newsItems[index]) return;

  if (button.dataset.action === 'edit') {
    const item = newsItems[index];
    document.getElementById('adminLogEditIndex').value = String(index);
    document.getElementById('adminLogDate').value = item.date;
    document.getElementById('adminLogContent').value = item.text;
    document.getElementById('adminLogSaveBtn').textContent = '更新する';
    document.getElementById('adminLogCancelBtn')?.classList.remove('hidden');
    document.getElementById('adminLogContent')?.focus();
    return;
  }

  if (button.dataset.action === 'delete' && window.confirm('この更新情報を削除しますか？')) {
    deleteNewsItem(index);
    saveNewsToStorage(); // 非同期に変更された保存処理を呼び出す
    resetAdminLogForm();
    renderAdminNewsList();
  }
}

// ---------------------------------------------------------------------------
// News log
// ---------------------------------------------------------------------------
const LS_NEWS_KEY = 'genshin-guesser-news';
const DEFAULT_NEWS_ITEMS = [
  { date: '2025-07-01', text: 'Genshin Guesser 公開！ キャラクター・武器の推測ゲームを楽しめます。' },
];

/** 
 * 【同期/非同期併用】
 * ページ起動時にまずLocalStorageから前回のデータを表示し、
 * その後GitHubからキャッシュを避けて最新の「news.json」を読み込んで完全に同期します。
 */
async function loadNewsFromStorage() {
  // まずローカル(LocalStorage)から即時に読み込んで表示しておく（フォールバック）
  try {
    const raw = localStorage.getItem(LS_NEWS_KEY);
    const items = raw ? JSON.parse(raw) : DEFAULT_NEWS_ITEMS;
    if (!Array.isArray(items) || items.length === 0) {
      newsItems = [...DEFAULT_NEWS_ITEMS];
    } else {
      newsItems = items
        .filter(item => item && item.date && item.text)
        .map(item => ({ date: item.date, text: item.text }));
    }
  } catch (e) {
    newsItems = [...DEFAULT_NEWS_ITEMS];
  }
  renderNewsList();

  // 次に、GitHub上の「news.json」から最新情報をキャッシュなし(?v=日付スタンプ)で動的に取得
  try {
    const url = `news.json?v=${new Date().getTime()}`;
    const response = await fetch(url);
    if (response.ok) {
      const remoteItems = await response.json();
      if (Array.isArray(remoteItems) && remoteItems.length > 0) {
        newsItems = remoteItems;
        localStorage.setItem(LS_NEWS_KEY, JSON.stringify(newsItems)); // ローカル側も同期
        renderNewsList();
      }
    }
  } catch (err) {
    console.warn('GitHub上の最新情報の取得に失敗しました。ローカルデータを使用します。', err);
  }
}

/**
 * 【非同期・GitHub完全同期】
 * 変更があった際、ローカルのLocalStorageに保存すると同時に、
 * あなたのGitHubへニュースデータをPUTリクエストで直接上書き保存（コミット）します。
 */
async function saveNewsToStorage() {
  // 1. ローカル側の表示を更新
  localStorage.setItem(LS_NEWS_KEY, JSON.stringify(newsItems));
  renderNewsList();

  // 2. ブラウザに保存されているGitHubトークンを取得
  let token = localStorage.getItem('github_pat');
  if (!token) {
    // 保存されていない（初回のみ）トークンの入力を求める
    token = prompt('【初回設定】GitHubのアクセストークン（github_pat_xxxx）を入力してください:');
    if (!token) {
      alert('トークン未入力のため、あなたのブラウザのみで保存されました。他の全員に反映させるにはトークンが必要です。');
      return;
    }
    // あなたのPCのLocalStorageにだけ保存
    localStorage.setItem('github_pat', token.trim());
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    
    // A. 現在のファイルのsha（ハッシュ値）を取得（GitHub APIの上書きに必須）
    let sha = null;
    const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }

    // B. 日本語対応のBase64エンコード
    const jsonString = JSON.stringify(newsItems, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    // C. GitHubへPUTして直接上書きコミット
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update news.json via Admin Panel',
        content: base64Content,
        sha: sha
      })
    });

    if (putRes.ok) {
      alert('GitHubへの送信が完了しました！約1〜2分で全員に反映されます。');
    } else {
      const errData = await putRes.json();
      alert('GitHubへの保存に失敗しました: ' + (errData.message || 'Unknown Error'));
      // トークンエラー（期限切れなど）の場合は、次回のために保存トークンを削除する
      if (putRes.status === 401 || putRes.status === 403) {
        localStorage.removeItem('github_pat');
      }
    }
  } catch (err) {
    console.error('保存処理中に通信エラー:', err);
    alert('通信に失敗したため、他のプレイヤーへ同期できませんでした。');
  }
}

function addNewsItem(date, text, prepend = true) {
  if (prepend) newsItems.unshift({ date, text });
  else newsItems.push({ date, text });
  renderNewsList();
}

function updateNewsItem(index, date, text) {
  if (!newsItems[index]) return;
  newsItems[index] = { date, text };
  renderNewsList();
}

function deleteNewsItem(index) {
  newsItems.splice(index, 1);
  if (newsItems.length === 0) newsItems = [...DEFAULT_NEWS_ITEMS];
  renderNewsList();
}

function renderNewsList() {
  const list = document.getElementById('newsList');
  if (!list) return;
  list.innerHTML = '';
  newsItems.forEach(item => {
    const row = document.createElement('div');
    row.className = 'news-item';
    const dateSpan = document.createElement('span');
    dateSpan.className = 'news-date';
    dateSpan.textContent = item.date;
    const textSpan = document.createElement('span');
    textSpan.className = 'news-text';
    textSpan.textContent = item.text;
    row.appendChild(dateSpan);
    row.appendChild(textSpan);
    list.appendChild(row);
  });
  list.classList.toggle('is-scrollable', newsItems.length > 4);
}

function renderAdminNewsList() {
  const list = document.getElementById('adminNewsList');
  if (!list) return;
  list.innerHTML = '';

  if (newsItems.length === 0) {
    list.innerHTML = '<p class="admin-news-empty">更新情報はありません。</p>';
    return;
  }

  newsItems.forEach((item, index) => {
    const row = document.createElement('div');
    row.className = 'admin-news-item';
    const meta = document.createElement('div');
    meta.className = 'admin-news-meta';
    meta.textContent = item.date;
    const text = document.createElement('div');
    text.className = 'admin-news-text';
    text.textContent = item.text;
    const actions = document.createElement('div');
    actions.className = 'admin-news-actions';
    ['edit', 'delete'].forEach(action => {
      const button = document.createElement('button');
      button.className = 'admin-news-btn';
      button.type = 'button';
      button.dataset.action = action;
      button.dataset.index = String(index);
      button.textContent = action === 'edit' ? '編集' : '削除';
      actions.appendChild(button);
    });
    row.append(meta, text, actions);
    list.appendChild(row);
  });
}
