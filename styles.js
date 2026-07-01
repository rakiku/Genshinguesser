/**
 * styles.js — Genshin Guesser Hub Logic
 * Main menu: genre/mode selection, admin log, modals
 */
'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let selectedGenre = 'character';
let selectedRarity = 'all';
let adminClickCount = 0;
let adminClickTimer = null;
const ADMIN_CLICK_THRESHOLD = 3;
const ADMIN_CLICK_WINDOW = 2000; // ms

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
  if (dailyBtn)    dailyBtn.href    = buildGameUrl('daily');
  if (endlessBtn)  endlessBtn.href  = buildGameUrl('endless');
  if (challengeBtn) challengeBtn.href = buildGameUrl('challenge');
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

  // Admin auth
  document.getElementById('adminAuthClose')?.addEventListener('click', () => closeModal('adminAuth'));
  document.getElementById('adminAuthOverlay')?.addEventListener('click', () => closeModal('adminAuth'));
  document.getElementById('adminAuthBtn')?.addEventListener('click', handleAdminAuth);
  document.getElementById('adminPasswordInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdminAuth();
  });

  // Admin log
  document.getElementById('adminLogClose')?.addEventListener('click', () => closeModal('adminLog'));
  document.getElementById('adminLogOverlay')?.addEventListener('click', () => closeModal('adminLog'));
  document.getElementById('adminLogSaveBtn')?.addEventListener('click', handleAdminLogSave);
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
  document.getElementById('openNewsAdminBtn')?.addEventListener('click', openAdminAuth);
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
  const ADMIN_PASSWORD = (typeof ADMIN_LOG_PASSWORD !== 'undefined' && ADMIN_LOG_PASSWORD) ? ADMIN_LOG_PASSWORD : 'password';
  if (password === ADMIN_PASSWORD) {
    closeModal('adminAuth');
    openAdminLogModal();
  } else {
    document.getElementById('adminAuthError')?.classList.remove('hidden');
  }
}

function openAdminLogModal() {
  const dateInput = document.getElementById('adminLogDate');
  if (dateInput) {
    const today = new Date().toISOString().slice(0, 10);
    dateInput.value = today;
  }
  const content = document.getElementById('adminLogContent');
  if (content) content.value = '';
  openModal('adminLog');
}

function handleAdminLogSave() {
  const dateInput = document.getElementById('adminLogDate');
  const contentInput = document.getElementById('adminLogContent');
  if (!dateInput || !contentInput) return;
  const date = dateInput.value.trim();
  const text = contentInput.value.trim();
  if (!date || !text) {
    alert('日付と内容を入力してください。');
    return;
  }
  addNewsItem(date, text);
  saveNewsToStorage();
  closeModal('adminLog');
}

// ---------------------------------------------------------------------------
// News log
// ---------------------------------------------------------------------------
const LS_NEWS_KEY = 'genshin-guesser-news';

function loadNewsFromStorage() {
  try {
    const raw = localStorage.getItem(LS_NEWS_KEY);
    if (!raw) return;
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) return;
    items.forEach(item => addNewsItem(item.date, item.text, false));
  } catch (e) { /* ignore */ }
}

function saveNewsToStorage() {
  const list = document.getElementById('newsList');
  if (!list) return;
  const items = Array.from(list.querySelectorAll('.news-item')).map(el => ({
    date: el.querySelector('.news-date')?.textContent || '',
    text: el.querySelector('.news-text')?.textContent || '',
  }));
  localStorage.setItem(LS_NEWS_KEY, JSON.stringify(items));
}

function addNewsItem(date, text, prepend = true) {
  const list = document.getElementById('newsList');
  if (!list) return;
  const item = document.createElement('div');
  item.className = 'news-item';
  const dateSpan = document.createElement('span');
  dateSpan.className = 'news-date';
  dateSpan.textContent = date;
  const textSpan = document.createElement('span');
  textSpan.className = 'news-text';
  textSpan.textContent = text;
  item.appendChild(dateSpan);
  item.appendChild(textSpan);
  if (prepend) {
    list.insertBefore(item, list.firstChild);
  } else {
    list.appendChild(item);
  }
}
