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
  initAdminDashboard();
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
  const dailyBtn     = document.getElementById('startDailyBtn');
  const endlessBtn = document.getElementById('startEndlessBtn');
  const challengeBtn = document.getElementById('startChallengeBtn');
  const versusBtn = document.getElementById('startVersusBtn');
  if (dailyBtn)     dailyBtn.href     = buildGameUrl('daily');
  if (endlessBtn)   endlessBtn.href   = buildGameUrl('endless');
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
  ['howToBtn', 'howToBtn2', 'howToFooterBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openModal('howTo'));
  });
  document.getElementById('howToClose')?.addEventListener('click', () => closeModal('howTo'));
  document.getElementById('howToOverlay')?.addEventListener('click', () => closeModal('howTo'));

  document.getElementById('aboutBtn')?.addEventListener('click', () => openModal('about'));
  document.getElementById('aboutClose')?.addEventListener('click', () => closeModal('about'));
  document.getElementById('aboutOverlay')?.addEventListener('click', () => closeModal('about'));

  ['streamerBtn', 'streamerBtn2', 'streamerFooterBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openModal('streamer'));
  });
  document.getElementById('streamerClose')?.addEventListener('click', () => closeModal('streamer'));
  document.getElementById('streamerOverlay')?.addEventListener('click', () => closeModal('streamer'));

  document.getElementById('adminAuthClose')?.addEventListener('click', () => closeModal('adminAuth'));
  document.getElementById('adminAuthOverlay')?.addEventListener('click', () => closeModal('adminAuth'));
  document.getElementById('adminAuthBtn')?.addEventListener('click', handleAdminAuth);
  document.getElementById('adminPasswordInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdminAuth();
  });

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
  saveNewsToStorage();
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
    saveNewsToStorage();
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

async function loadNewsFromStorage() {
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

  try {
    const url = `news.json?v=${new Date().getTime()}`;
    const response = await fetch(url);
    if (response.ok) {
      const remoteItems = await response.json();
      if (Array.isArray(remoteItems) && remoteItems.length > 0) {
        newsItems = remoteItems;
        localStorage.setItem(LS_NEWS_KEY, JSON.stringify(newsItems));
        renderNewsList();
      }
    }
  } catch (err) {
    console.warn('GitHub上の最新情報の取得に失敗しました。', err);
  }
}

async function saveNewsToStorage() {
  localStorage.setItem(LS_NEWS_KEY, JSON.stringify(newsItems));
  renderNewsList();

  let token = localStorage.getItem('github_pat');
  if (!token) {
    token = prompt('【初回設定】GitHubのアクセストークン（github_pat_xxxx）を入力してください:');
    if (!token) {
      alert('トークン未入力のため、ブラウザのみで保存されました。');
      return;
    }
    localStorage.setItem('github_pat', token.trim());
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_PATH}`;
    let sha = null;
    const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
    if (res.ok) {
      const data = await res.json();
      sha = data.sha;
    }

    const jsonString = JSON.stringify(newsItems, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

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
      alert('GitHubへの送信が完了しました！');
    } else {
      const errData = await putRes.json();
      alert('GitHubへの保存に失敗しました: ' + (errData.message || 'Unknown Error'));
      if (putRes.status === 401 || putRes.status === 403) {
        localStorage.removeItem('github_pat');
      }
    }
  } catch (err) {
    console.error('通信エラー:', err);
    alert('通信に失敗しました。');
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

// ---------------------------------------------------------------------------
// 👑 ビジュアル管理者ダッシュボード機能
// ---------------------------------------------------------------------------
function initAdminDashboard() {
  const LS_CUSTOM_PREVIEW_KEY = 'genshin-guesser-custom-previews-v2';

  const openBtn = document.getElementById('openPreviewModalFromLogBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      document.getElementById('adminLogModal')?.classList.add('hidden');
      document.getElementById('adminLogOverlay')?.classList.add('hidden');
      document.getElementById('previewModal')?.classList.remove('hidden');
      document.getElementById('previewOverlay')?.classList.remove('hidden');
      renderAdminCardGrid();
    });
  }

  const previewClose = document.getElementById('previewClose');
  if (previewClose) {
    previewClose.addEventListener('click', () => {
      document.getElementById('previewModal')?.classList.add('hidden');
      document.getElementById('previewOverlay')?.classList.add('hidden');
    });
  }

  const previewOverlay = document.getElementById('previewOverlay');
  if (previewOverlay) {
    previewOverlay.addEventListener('click', () => {
      document.getElementById('previewModal')?.classList.add('hidden');
      document.getElementById('previewOverlay')?.classList.add('hidden');
    });
  }

  const adminGenreTab = document.getElementById('adminGenreTab');
  if (adminGenreTab) {
    adminGenreTab.addEventListener('change', () => {
      renderAdminCardGrid();
    });
  }

  const pvGenre = document.getElementById('pvGenre');
  if (pvGenre) {
    pvGenre.addEventListener('change', (e) => {
      const isChar = e.target.value === 'character';
      const charGroup = document.getElementById('characterFieldsGroup');
      const weaponGroup = document.getElementById('weaponFieldsGroup');
      if (charGroup) charGroup.style.display = isChar ? 'flex' : 'none';
      if (weaponGroup) weaponGroup.style.display = isChar ? 'none' : 'flex';
    });
  }

  document.getElementById('addNewItemBtn')?.addEventListener('click', () => {
    clearAdminForm();
  });

  function renderAdminCardGrid() {
    const grid = document.getElementById('adminCardGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const currentGenre = adminGenreTab ? adminGenreTab.value : 'character';
    
    let masterList = [];
    if (currentGenre === 'character' && typeof CHARACTERS !== 'undefined') {
      masterList = CHARACTERS.map(c => ({ ...c, genre: 'character', isPublished: true, isMaster: true }));
    } else if (currentGenre === 'weapon' && typeof WEAPONS !== 'undefined') {
      masterList = WEAPONS.map(w => ({ ...w, genre: 'weapon', isPublished: true, isMaster: true }));
    }

    let customList = [];
    try {
      const raw = localStorage.getItem(LS_CUSTOM_PREVIEW_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      customList = parsed.filter(item => item.genre === currentGenre);
    } catch (e) {
      customList = [];
    }

    const map = new Map();
    masterList.forEach(item => map.set(item.id, item));
    customList.forEach(item => map.set(item.id, item));

    const combinedList = Array.from(map.values());

    if (combinedList.length === 0) {
      grid.innerHTML = '<p style="font-size: 12px; color: #aaa; grid-column: span 3; text-align: center; padding: 20px;">データがありません。</p>';
      return;
    }

    combinedList.forEach(item => {
      const card = document.createElement('div');
      card.style.cssText = `
        background: rgba(255,255,255,0.05);
        border: 2px solid ${item.isPublished ? '#4ade80' : '#f87171'};
        border-radius: 8px;
        padding: 4px;
        text-align: center;
        cursor: pointer;
        transition: transform 0.1s;
      `;
      card.title = `${item.name} (${item.isPublished ? '公開中' : '非公開'})`;

      // 🖼️ 画像パスを正しく解決（マスターデータのパス優先、なければ files/日本語名.png）
      let imgPath = item.iconUrl || `files/${item.name}.png`;

      card.innerHTML = `
        <div style="position: relative; width: 100%; aspect-ratio: 1; border-radius: 4px; overflow: hidden; background: rgba(0,0,0,0.5);">
          <img src="${imgPath}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='images/default.png';">
          <span style="position: absolute; top: 2px; right: 2px; font-size: 9px; background: ${item.isPublished ? '#10b981' : '#ef4444'}; color: #fff; padding: 1px 3px; border-radius: 3px; z-index: 2;">
            ${item.isPublished ? '公開' : '非公開'}
          </span>
        </div>
        <div style="font-size: 11px; margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">${item.name}</div>
      `;

      card.addEventListener('click', () => loadItemIntoForm(item));
      grid.appendChild(card);
    });
  }

  function clearAdminForm() {
    document.getElementById('formTitle').textContent = '＋ 新規データの追加（実装）';
    document.getElementById('pvId').value = '';
    document.getElementById('pvName').value = '';
    document.getElementById('pvIsPublished').value = 'false';
    document.getElementById('pvGenre').value = adminGenreTab ? adminGenreTab.value : 'character';
    document.getElementById('pvGenre').dispatchEvent(new Event('change'));

    // フォーム内をリセット
    const inputs = document.querySelectorAll('#previewModal input, #previewModal select');
    inputs.forEach(input => {
      if (input.id !== 'pvId' && input.id !== 'pvName' && input.id !== 'pvIsPublished' && input.id !== 'pvGenre' && input.id !== 'adminGenreTab') {
        input.value = '';
      }
    });
  }

  function loadItemIntoForm(item) {
    const isMaster = item.isMaster;
    document.getElementById('formTitle').textContent = isMaster ? `✏️ 既存データの変更: ${item.name}` : `✏️ カスタムデータの編集: ${item.name}`;
    document.getElementById('pvIsPublished').value = String(item.isPublished !== false);
    document.getElementById('pvGenre').value = item.genre || 'character';
    document.getElementById('pvGenre').dispatchEvent(new Event('change'));
    
    document.getElementById('pvId').value = item.id || '';
    document.getElementById('pvName').value = item.name || '';
    document.getElementById('pvRarity').value = String(item.rarity || 5);

    if (item.genre === 'character') {
      document.getElementById('pvElement').value = item.element || '炎';
      document.getElementById('pvCharWeapon').value = item.weapon || '';
      document.getElementById('pvCountry').value = item.country || '';
      document.getElementById('pvBirthday').value = item.birthday || '';
      document.getElementById('pvBodyType').value = item.bodyType || '';
      document.getElementById('pvCharBaseAtk').value = item.baseAtk || '';
      document.getElementById('pvCharBaseHp').value = item.baseHp || '';
      document.getElementById('pvCharBaseDef').value = item.baseDef || '';
      document.getElementById('pvRole').value = item.role || '';
      document.getElementById('pvEnergy').value = item.energy || '';
      document.getElementById('pvAscensionStat').value = item.ascensionStat || '';
      document.getElementById('pvSpecialty').value = item.specialty || '';
      document.getElementById('pvTalentBoss').value = item.talentBoss || '';
      document.getElementById('pvTalentBook').value = item.talentBook || '';
      document.getElementById('pvTalentWeekly').value = item.talentWeekly || '';
      document.getElementById('pvEnemyMaterial').value = item.enemyMaterial || '';
      document.getElementById('pvOriginalDish').value = item.originalDish || '';
      document.getElementById('pvIsDistributed').value = String(!!item.isDistributed);
      document.getElementById('pvCostume').value = String(!!item.costume);
      document.getElementById('pvVersion').value = item.version || '';
    } else {
      document.getElementById('pvWeaponType').value = item.weaponType || '片手剣';
      document.getElementById('pvBaseAtk').value = item.baseAtk || '';
      document.getElementById('pvSubStat').value = item.subStat || '';
      document.getElementById('pvWeaponDistributed').value = String(!!item.isDistributed);
      document.getElementById('pvWeaponBreak').value = item.weaponBreakMaterial || '';
      document.getElementById('pvWeaponEnemy').value = item.weaponEnemyMaterial || '';
      document.getElementById('pvWeaponElite').value = item.weaponEliteMaterial || '';
      document.getElementById('pvWeaponVersion').value = item.version || '';
    }
  }

  const saveBtn = document.getElementById('savePreviewFormBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const genreVal = document.getElementById('pvGenre')?.value || 'character';
      const isPublished = document.getElementById('pvIsPublished')?.value === 'true';
      const id = document.getElementById('pvId')?.value.trim().toLowerCase();
      const name = document.getElementById('pvName')?.value.trim();
      const rarity = Number(document.getElementById('pvRarity')?.value || 5);

      if (!id || !name) {
        alert('「ID」と「表示名」は必須です。');
        return;
      }

      const iconUrl = `files/${name}.png`;

      const newItem = {
        id: id,
        name: name,
        displayNames: [name, id, name.toLowerCase()],
        iconUrl: iconUrl,
        rarity: rarity,
        genre: genreVal,
        isPublished: isPublished,
      };

      if (genreVal === 'character') {
        newItem.element = document.getElementById('pvElement')?.value || '炎';
        newItem.weapon = document.getElementById('pvCharWeapon')?.value.trim() || '';
        newItem.country = document.getElementById('pvCountry')?.value.trim() || '';
        newItem.birthday = document.getElementById('pvBirthday')?.value.trim() || '';
        newItem.bodyType = document.getElementById('pvBodyType')?.value.trim() || '';
        newItem.baseAtk = document.getElementById('pvCharBaseAtk')?.value.trim() || '';
        newItem.baseHp = document.getElementById('pvCharBaseHp')?.value.trim() || '';
        newItem.baseDef = document.getElementById('pvCharBaseDef')?.value.trim() || '';
        newItem.role = document.getElementById('pvRole')?.value.trim() || '';
        newItem.energy = Number(document.getElementById('pvEnergy')?.value) || 0;
        newItem.ascensionStat = document.getElementById('pvAscensionStat')?.value.trim() || '';
        newItem.specialty = document.getElementById('pvSpecialty')?.value.trim() || '';
        newItem.talentBoss = document.getElementById('pvTalentBoss')?.value.trim() || '';
        newItem.talentBook = document.getElementById('pvTalentBook')?.value.trim() || '';
        newItem.talentWeekly = document.getElementById('pvTalentWeekly')?.value.trim() || '';
        newItem.enemyMaterial = document.getElementById('pvEnemyMaterial')?.value.trim() || '';
        newItem.originalDish = document.getElementById('pvOriginalDish')?.value.trim() || '';
        newItem.isDistributed = document.getElementById('pvIsDistributed')?.value === 'true';
        newItem.costume = document.getElementById('pvCostume')?.value === 'true';
        newItem.version = document.getElementById('pvVersion')?.value.trim() || '';
      } else {
        newItem.weaponType = document.getElementById('pvWeaponType')?.value || '片手剣';
        newItem.baseAtk = document.getElementById('pvBaseAtk')?.value.trim() || '';
        newItem.subStat = document.getElementById('pvSubStat')?.value.trim() || '';
        newItem.isDistributed = document.getElementById('pvWeaponDistributed')?.value === 'true';
        newItem.weaponBreakMaterial = document.getElementById('pvWeaponBreak')?.value.trim() || '';
        newItem.weaponEnemyMaterial = document.getElementById('pvWeaponEnemy')?.value.trim() || '';
        newItem.weaponEliteMaterial = document.getElementById('pvWeaponElite')?.value.trim() || '';
        newItem.version = document.getElementById('pvWeaponVersion')?.value.trim() || '';
      }

      try {
        const raw = localStorage.getItem(LS_CUSTOM_PREVIEW_KEY);
        const list = raw ? JSON.parse(raw) : [];
        const existingIndex = list.findIndex(x => x.id === newItem.id);
        if (existingIndex >= 0) {
          list[existingIndex] = newItem;
        } else {
          list.push(newItem);
        }
        localStorage.setItem(LS_CUSTOM_PREVIEW_KEY, JSON.stringify(list));
        renderAdminCardGrid();
        alert(`✨ 「${name}」のデータを保存しました！\n（公開設定: ${isPublished ? '公開中 🟢' : '非公開 🔒'}）`);
      } catch (e) {
        alert('保存に失敗しました: ' + e.message);
      }
    });
  }

  const exportBtn = document.getElementById('exportPreviewJsonBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        const raw = localStorage.getItem(LS_CUSTOM_PREVIEW_KEY);
        if (!raw || JSON.parse(raw).length === 0) {
          alert('変更または新規追加されたデータがありません。');
          return;
        }
        const blob = new Blob([raw], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'custom_characters_weapons.json';
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        alert('ダウンロードに失敗しました: ' + e.message);
      }
    });
  }
}
