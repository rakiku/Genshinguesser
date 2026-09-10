/**
 * script.js — Genshin Guesser ゲームロジック
 * Daily / Endless / Challenge モード、キャラクター/武器ジャンル、判定、サジェスト、共有を管理。
 */

'use strict';

// ---------------------------------------------------------------------------
// ゲーム状態
// ---------------------------------------------------------------------------
let gameMode   = 'daily';       // 'daily' | 'endless' | 'challenge' | 'versus'
let genre      = 'character';   // 'character' | 'weapon'
let rarityFilter = 'all';       // 'all' | '5' | '4' | '45'
let answer     = null;          // 正規化済み対象
let guesses    = [];            // { item, results }[] — 回答履歴
let solved     = false;
let gameEnded  = false;
let gaveUp     = false;
let attempts   = 0;
let streak     = 0;             // エンドレス連勝数
let bestStreak = 0;
let challengeRemain = 5;       // チャレンジ残り回数
let currentScore    = 0;        // チャレンジスコア
let versusTurnIndex = 0;
let versusPlayers   = ['プレイヤー1', 'プレイヤー2'];
let versusSelfIndex = 0;
let versusConnection = null; // { code, playerIndex } | null
let versusReady = false;
let versusRoomState = null;
let versusTimerSeconds = 0;
let requestedVersusRoomCode = '';
let versusLastFinishedActionId = null;

const VERSUS_STAMPS = ['💭 考え中…', '🎯 分かった！', '😱 惜しい！', '👑 GG!'];
const LS_VERSUS_PLAYER_PREFIX = 'genshin-guesser-versus-player-';

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------
const CHALLENGE_MAX_WRONG = 5;
const LS_SETTINGS_KEY     = 'genshin-guesser-settings-v3';
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
  void initMode(gameMode);
});

function parseUrlParams() {
  const params = new URLSearchParams(location.search);
  const room = params.get('room');
  const m = params.get('mode');
  if (m === 'daily' || m === 'endless' || m === 'challenge' || m === 'versus') gameMode = m;
  if (room) {
    requestedVersusRoomCode = room.trim().toUpperCase();
    gameMode = 'versus';
  }
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
      if (mode !== gameMode) void switchMode(mode);
    });
  });

// 遊び方モーダルの開閉イベント
  document.getElementById('howToBtn')?.addEventListener('click', () => openModal('howTo'));
  document.getElementById('howToClose')?.addEventListener('click', () => closeModal('howTo'));
  document.getElementById('howToOverlay')?.addEventListener('click', () => closeModal('howTo'));  

  // オンライン対戦モーダル
  document.getElementById('versusCreateBtn')?.addEventListener('click', () => versusShowPanel('versusCreate'));
  document.getElementById('versusJoinBtn')?.addEventListener('click', () => versusShowPanel('versusJoin'));
  document.getElementById('versusModalClose')?.addEventListener('click', cancelVersusModal);
  document.getElementById('versusModalOverlay')?.addEventListener('click', cancelVersusModal);
  document.getElementById('backFromCreateBtn')?.addEventListener('click', () => versusShowPanel('versusChoice'));
  document.getElementById('backFromJoinBtn')?.addEventListener('click', () => versusShowPanel('versusChoice'));
  document.getElementById('doCreateRoomBtn')?.addEventListener('click', handleDoCreateRoom);
  document.getElementById('doJoinRoomBtn')?.addEventListener('click', handleDoJoinRoom);
  document.getElementById('copyInviteLinkBtn')?.addEventListener('click', copyVersusInviteLink);
  document.getElementById('copyRoomCodeBtn')?.addEventListener('click', copyVersusRoomCode);
  document.getElementById('updateVersusRulesBtn')?.addEventListener('click', handleVersusRuleUpdate);
  document.getElementById('requestRematchBtn')?.addEventListener('click', handleVersusRematchRequest);
  document.getElementById('versusLeaveBtn')?.addEventListener('click', handleLeaveVersusRoom);
  document.querySelectorAll('[data-stamp]').forEach(btn => {
   btn.addEventListener('click', () => handleVersusStamp(btn.dataset.stamp || ''));
  });

  if (typeof mpInit === 'function') {
   mpInit({
     onConnect: handleVersusSocketConnect,
     onDisconnect: handleVersusSocketDisconnect,
     onRoomState: handleVersusRoomState,
     onGameStarted: handleVersusGameStarted,
     onGameTimer: handleVersusGameTimer,
     onGuessResult: handleVersusGuessResult,
     onTurnTimeout: handleVersusTurnTimeout,
     onGameEnded: handleVersusGameEnded,
     onStampReceived: handleVersusStampReceived,
     onError: handleVersusTransportError,
   });
  }

  // ページ離脱時にルームをクリーンアップ
  window.addEventListener('beforeunload', () => {
   if (typeof mpDisconnect === 'function') mpDisconnect();
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
  document.getElementById('settingsBtn')?.addEventListener('click', openSettingsModal);
  document.getElementById('settingsClose')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settingsOverlay')?.addEventListener('click', closeSettingsModal);
  document.getElementById('settingsSaveBtn')?.addEventListener('click', saveSettingsFromModal);
  document.getElementById('giveUpBtn')?.addEventListener('click', giveUpGame);

  // リセット
  document.getElementById('resetBtn')?.addEventListener('click', () => {
    if (gameMode === 'endless') void initMode('endless');
    else if (gameMode === 'challenge') void initMode('challenge');
    else if (gameMode === 'versus') void initMode('versus');
  });

  // 正解演出クリックで閉じる
  document.getElementById('winOverlay')?.addEventListener('click', closeWinOverlay);
}

// ---------------------------------------------------------------------------
// モード管理
// ---------------------------------------------------------------------------
async function switchMode(mode) {
  gameMode = mode;
  await initMode(mode);
}

function getPool() {
  if (window.GenshinGameLogic) {
    return window.GenshinGameLogic.getPool(genre, rarityFilter);
  }
  if (genre === 'weapon') {
    return WEAPONS.filter(w => {
      if (rarityFilter === '5') return w.rarity === 5;
      if (rarityFilter === '4') return w.rarity === 4;
      if (rarityFilter === '45') return w.rarity >= 4;
      return true;
    });
  }
  return CHARACTERS.filter(c => c.enabled);
}

function getCurrentHintFields() {
  if (window.GenshinGameLogic) {
    return window.GenshinGameLogic.getHintFields(genre);
  }
  return genre === 'weapon' ? WEAPON_HINT_FIELDS : HINT_FIELDS;
}

async function initMode(mode) {
  // チャレンジモードで正解（クリア）した状態から次の問題へ進むかを判定
  const isNextChallengeRound = (gameMode === 'challenge' && mode === 'challenge' && solved);

  gameMode = mode;
  guesses  = [];
  solved   = false;
  gameEnded = false;
  gaveUp = false;
  attempts = 0;
  challengeRemain = CHALLENGE_MAX_WRONG;
  versusTurnIndex = 0;

  // クリアして次の問題に進む場合以外は、チャレンジスコアを0にリセット
  if (!isNextChallengeRound) {
    currentScore = 0;
  }


  clearGuessHistory();
  closeWinOverlay();
  updateShareBtns(false);
  updateGiveUpBtn(true);

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
    await clearVersusConnection(false);
    answer = getDailyItem(pool);
    document.getElementById('resetBtn')?.classList.add('hidden');
    restoreDailyState();
  } else if (mode === 'versus') {
    if (!await setupVersusSession(pool)) {
      await switchMode('daily');
      return;
    }
    document.getElementById('resetBtn')?.classList.add('hidden');
  } else {
    await clearVersusConnection(false);
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
  const labels = {
    daily: '📅 デイリーモード',
    endless: '🔁 エンドレスモード',
    challenge: '🏆 チャレンジモード（5ミス終了）',
    versus: '🌐 オンライン対戦モード（交互回答）'
  };
  const el = document.getElementById('modeLabel');
  if (el) el.textContent = labels[mode] || '';

  // チャレンジ情報バー
  const ci = document.getElementById('challengeInfo');
  if (ci) ci.classList.toggle('hidden', mode !== 'challenge');

  // ストリーク情報バー
  const si = document.getElementById('streakInfo');
  if (si) si.classList.toggle('hidden', mode !== 'endless');

  // 対戦情報バー
  const vi = document.getElementById('versusInfo');
  if (vi) vi.classList.toggle('hidden', mode !== 'versus');

  // リセットボタン表示
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) resetBtn.classList.toggle('hidden', mode === 'daily');

   // ★追加：チャレンジモード時は「設定」ボタンを非表示にする
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.classList.toggle('hidden', mode === 'challenge');
}
    
  updateVersusInfo();
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

function getVersusItem(pool, code) {
  const seed = `${getTodayString()}-${genre}-${rarityFilter}-${code || ''}`;
  return pool[seededIndex(seed, pool.length)];
}

// ---------------------------------------------------------------------------
// Versus モーダル / セッション管理
// ---------------------------------------------------------------------------
let _versusModalResolve = null;

function getVersusStorageKey(code) {
  return LS_VERSUS_PLAYER_PREFIX + String(code || '').toUpperCase();
}

function loadVersusPlayerSession(code) {
  try {
    const raw = sessionStorage.getItem(getVersusStorageKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveVersusPlayerSession(code, playerKey, seat, name) {
  if (!code || !playerKey) return;
  try {
    sessionStorage.setItem(getVersusStorageKey(code), JSON.stringify({ playerKey, seat, name }));
  } catch (error) {
    /* noop */
  }
}

function clearVersusPlayerKey(code) {
  if (!code) return;
  try {
    sessionStorage.removeItem(getVersusStorageKey(code));
  } catch (error) {
    /* noop */
  }
}

function buildVersusInviteLink(code) {
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('room', String(code || '').toUpperCase());
  return url.toString();
}

function setCopiedLabel(buttonId, text) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  const original = button.dataset.originalLabel || button.textContent;
  button.dataset.originalLabel = original;
  button.textContent = text;
  setTimeout(() => {
    button.textContent = original;
  }, 1600);
}

function openVersusModal() {
  const createBtn = document.getElementById('doCreateRoomBtn');
  const joinBtn = document.getElementById('doJoinRoomBtn');
  if (createBtn) createBtn.disabled = false;
  if (joinBtn) joinBtn.disabled = false;
  const createTurnTime = document.getElementById('createTurnTimeSelect');
  if (createTurnTime) createTurnTime.value = String(versusRoomState?.rules?.turnTimeSeconds || 60);
  const rematchTurnTime = document.getElementById('rematchTurnTimeSelect');
  if (rematchTurnTime) rematchTurnTime.value = String(versusRoomState?.rules?.turnTimeSeconds || 60);
  const codeInput = document.getElementById('roomCodeInput');
  if (codeInput) codeInput.value = requestedVersusRoomCode || '';
  versusShowPanel(requestedVersusRoomCode ? 'versusJoin' : 'versusChoice');
  versusSetError('');
  document.getElementById('versusModal')?.classList.remove('hidden');
  document.getElementById('versusModalOverlay')?.classList.remove('hidden');
  return new Promise(resolve => { _versusModalResolve = resolve; });
}

function resolveVersusModal(result) {
  document.getElementById('versusModal')?.classList.add('hidden');
  document.getElementById('versusModalOverlay')?.classList.add('hidden');
  if (_versusModalResolve) {
    _versusModalResolve(result);
    _versusModalResolve = null;
  }
}

function cancelVersusModal() {
  resolveVersusModal(null);
}

function versusShowPanel(id) {
  ['versusChoice', 'versusCreate', 'versusJoin'].forEach(panelId => {
    document.getElementById(panelId)?.classList.toggle('hidden', panelId !== id);
  });
  versusSetError('');
}

function versusSetError(message) {
  const element = document.getElementById('versusModalError');
  if (!element) return;
  element.textContent = message;
  element.classList.toggle('hidden', !message);
}

async function handleDoCreateRoom() {
  const createBtn = document.getElementById('doCreateRoomBtn');
  if (createBtn) createBtn.disabled = true;
  versusSetError('');

  try {
    const hostName = (document.getElementById('hostNameInput')?.value.trim()) || 'プレイヤー1';
    const turnTimeSeconds = Number(document.getElementById('createTurnTimeSelect')?.value || 60);
    const response = await mpCreateRoom({
      hostName,
      genre,
      rarityFilter,
      rules: { turnTimeSeconds },
    });
    finalizeVersusSession(response);
    showResultBanner('🌐 ルームを作成しました。相手の参加を待っています。', 'success', false);
    resolveVersusModal(true);
  } catch (error) {
    versusSetError('ルームの作成に失敗しました: ' + error.message);
    if (createBtn) createBtn.disabled = false;
  }
}

async function handleDoJoinRoom() {
  const joinBtn = document.getElementById('doJoinRoomBtn');
  if (joinBtn) joinBtn.disabled = true;
  versusSetError('');

  const roomCode = (document.getElementById('roomCodeInput')?.value || '').trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(roomCode)) {
    versusSetError('6桁の英数字を入力してください。');
    if (joinBtn) joinBtn.disabled = false;
    return;
  }

  try {
    const guestName = (document.getElementById('guestNameInput')?.value.trim()) || 'プレイヤー2';
    const storedSession = loadVersusPlayerSession(roomCode);
    const response = await mpJoinRoom({
      code: roomCode,
      guestName,
      playerKey: storedSession?.playerKey || undefined,
      expectedSeat: storedSession?.seat,
    });
    finalizeVersusSession(response);
    resolveVersusModal(true);
  } catch (error) {
    clearVersusPlayerKey(roomCode);
    versusSetError(error.message);
    if (joinBtn) joinBtn.disabled = false;
  }
}

function finalizeVersusSession(response) {
  if (!response) return;
  versusConnection = {
    code: response.roomCode,
    playerKey: response.playerKey,
  };
  requestedVersusRoomCode = response.roomCode;
  const playerName = response.snapshot?.players?.[response.snapshot?.selfSeat]?.name || '';
  saveVersusPlayerSession(response.roomCode, response.playerKey, response.snapshot?.selfSeat, playerName);
  handleVersusRoomState(response.snapshot);
}

async function clearVersusConnection(leaveRoom = false) {
  const previousConnection = versusConnection;
  versusConnection = null;
  versusReady = false;
  versusRoomState = null;
  versusPlayers = ['プレイヤー1', 'プレイヤー2'];
  versusSelfIndex = 0;
  versusTurnIndex = 0;
  versusTimerSeconds = 0;
  versusLastFinishedActionId = null;
  hideVersusPanel();

  if (leaveRoom && previousConnection && typeof mpLeaveRoom === 'function') {
    try {
      await mpLeaveRoom({
        roomCode: previousConnection.code,
        playerKey: previousConnection.playerKey,
      });
    } catch (error) {
      /* noop */
    }
    clearVersusPlayerKey(previousConnection.code);
    return;
  }

  if (previousConnection && typeof mpDisconnect === 'function') {
    mpDisconnect();
  }
}

async function setupVersusSession() {
  if (!mpIsConfigured()) {
    showResultBanner('⚠️ オンライン対戦サーバーに接続できません。ローカルでは `npm start` を実行してください。', 'fail', false);
    return false;
  }

  hideVersusPanel();
  const reconnectCode = requestedVersusRoomCode;
  const reconnectSession = reconnectCode ? loadVersusPlayerSession(reconnectCode) : null;
  if (reconnectCode && reconnectSession?.playerKey) {
    try {
      const response = await mpJoinRoom({
        code: reconnectCode,
        guestName: reconnectSession.name || 'プレイヤー',
        playerKey: reconnectSession.playerKey,
        expectedSeat: reconnectSession.seat,
      });
      finalizeVersusSession(response);
      showResultBanner('🌐 ルームに再接続しました。', 'success', false);
      return true;
    } catch (error) {
      clearVersusPlayerKey(reconnectCode);
    }
  }

  const result = await openVersusModal();
  return !!result;
}

function handleVersusSocketConnect() {
  if (gameMode !== 'versus' || !versusConnection?.code) return;
  updateVersusInfo();
}

function handleVersusSocketDisconnect() {
  if (gameMode !== 'versus') return;
  showResultBanner('⚠️ 接続が切断されました。再接続を試みています…', 'fail', false);
  setInputEnabled(false);
  updateVersusInfo();
}

function handleVersusTransportError(error) {
  if (gameMode !== 'versus') return;
  showResultBanner(`⚠️ ${error.message}`, 'fail', false);
}

function handleVersusRoomState(snapshot) {
  if (!snapshot || gameMode !== 'versus') return;
  if (versusConnection?.code && snapshot.roomCode !== versusConnection.code) return;

  versusRoomState = snapshot;
  versusPlayers = snapshot.players.map(player => player.name || `プレイヤー${player.seat + 1}`);
  versusSelfIndex = snapshot.selfSeat >= 0 ? snapshot.selfSeat : 0;
  versusTurnIndex = Number(snapshot.currentTurnIndex) || 0;
  versusReady = snapshot.players.every(player => player.occupied);
  versusTimerSeconds = snapshot.remainingSeconds ?? snapshot.rules.turnTimeSeconds;
  genre = snapshot.genre === 'weapon' ? 'weapon' : 'character';
  rarityFilter = ['5', '4', '45'].includes(snapshot.rarityFilter) ? snapshot.rarityFilter : 'all';
  updateGenreIndicator();

  attempts = snapshot.history.filter(entry => entry.type === 'guess').length;
  guesses = snapshot.history
    .filter(entry => entry.type === 'guess')
    .map(entry => {
      const item = window.GenshinGameLogic.findItemById(snapshot.genre, entry.guessId, snapshot.rarityFilter);
      return item ? { item, results: entry.results, actorName: entry.actorName } : null;
    })
    .filter(Boolean)
    .reverse();

  if (snapshot.status !== 'finished') {
    answer = null;
    gameEnded = false;
    solved = false;
    gaveUp = false;
    updateShareBtns(false);
    updateGiveUpBtn(snapshot.status === 'playing');
  }

  renderVersusPanel();
  renderVersusHistory();
  renderVersusStampTimeline();
  updateVersusInfo();
  updateVersusTimerDisplay();
  updateVersusInputState();

  if (snapshot.status === 'finished') {
    handleVersusFinishedState(snapshot);
  }
}

function handleVersusGameStarted(payload) {
  if (!versusConnection || payload.roomCode !== versusConnection.code) return;
  versusTimerSeconds = payload.rules?.turnTimeSeconds || 60;
  closeWinOverlay();
  const hasHistory = (versusRoomState?.history?.length || 0) > 0;
  showResultBanner(
    hasHistory
      ? `🌐 対戦を同期しました。現在は ${versusPlayers[payload.currentTurnIndex] || 'プレイヤー1'} のターンです。`
      : `🌐 対戦開始！ ${versusPlayers[0]} からスタートです。`,
    'success',
    false
  );
  updateVersusTimerDisplay();
}

function handleVersusGameTimer(payload) {
  if (!versusConnection || payload.roomCode !== versusConnection.code) return;
  versusTimerSeconds = payload.remainingSeconds;
  if (typeof payload.currentTurnIndex === 'number') versusTurnIndex = payload.currentTurnIndex;
  updateVersusTimerDisplay();
  updateVersusInfo();
}

function handleVersusGuessResult() {
  clearInputError();
}

function handleVersusTurnTimeout(payload) {
  if (!versusConnection || payload.roomCode !== versusConnection.code) return;
  const nextPlayer = versusPlayers[versusTurnIndex] || '次のプレイヤー';
  showResultBanner(`⏰ ${payload.actorName} は時間切れです。自動スキップしました。\n次は ${nextPlayer} のターンです。`, 'fail', false);
}

function handleVersusGameEnded(snapshot) {
  if (!snapshot || gameMode !== 'versus') return;
  handleVersusRoomState(snapshot);
}

function handleVersusStampReceived() {
  renderVersusStampTimeline();
}

function handleVersusFinishedState(snapshot) {
  if (snapshot.lastAction?.id && snapshot.lastAction.id === versusLastFinishedActionId) return;
  versusLastFinishedActionId = snapshot.lastAction?.id || null;

  answer = window.GenshinGameLogic.findItemById(snapshot.genre, snapshot.answerId, snapshot.rarityFilter);
  gameEnded = true;
  solved = snapshot.lastAction?.reason === 'correct';
  gaveUp = snapshot.lastAction?.reason === 'giveup' && snapshot.lastAction?.actorIndex === versusSelfIndex;
  setInputEnabled(false);
  updateShareBtns(true);
  updateGiveUpBtn(false);

  const winner = snapshot.winnerIndex >= 0 ? versusPlayers[snapshot.winnerIndex] : 'プレイヤー';
  const actorName = snapshot.lastAction?.actorIndex >= 0 ? versusPlayers[snapshot.lastAction.actorIndex] : 'プレイヤー';
  const answerName = answer ? answer.name : '不明';

  if (snapshot.lastAction?.reason === 'correct') {
    showResultBanner(`🎉 ${winner} が正解！ 正解は「${answerName}」でした。`, 'success', true);
    if (answer) showWinOverlay(answer);
    return;
  }

  if (snapshot.lastAction?.reason === 'giveup') {
    showResultBanner(`🏳️ ${actorName} がギブアップしました。\n${winner} の勝利！ 正解は「${answerName}」でした。`, 'fail', false);
    return;
  }

  if (snapshot.lastAction?.reason === 'left') {
    showResultBanner(`⚠️ ${actorName} が退室しました。\n${winner} の勝利です。`, 'fail', false);
    return;
  }

  showResultBanner(`🏁 対戦終了。正解は「${answerName}」でした。`, 'success', false);
}

function renderVersusPanel() {
  const panel = document.getElementById('versusPanel');
  if (!panel) return;
  panel.classList.toggle('hidden', gameMode !== 'versus' || !versusConnection?.code);

  const roomCodeEl = document.getElementById('versusRoomCodeValue');
  if (roomCodeEl) roomCodeEl.textContent = versusConnection?.code || '------';

  const inviteInput = document.getElementById('versusInviteLink');
  if (inviteInput) inviteInput.value = versusConnection?.code ? buildVersusInviteLink(versusConnection.code) : '';

  const rematchPanel = document.getElementById('versusRematchPanel');
  if (rematchPanel) rematchPanel.classList.toggle('hidden', versusRoomState?.status !== 'finished');

  const rematchStatus = document.getElementById('versusRematchStatus');
  if (rematchStatus && versusRoomState?.status === 'finished') {
    const readySeats = versusRoomState.rematch?.readySeats || [];
    const readyNames = readySeats.map(seat => versusPlayers[seat]).filter(Boolean);
    rematchStatus.textContent = readyNames.length
      ? `再戦待ち: ${readyNames.join(' / ')}`
      : '再戦する場合は両プレイヤーが準備完了を押してください。';
  }

  const rematchTurnTime = document.getElementById('rematchTurnTimeSelect');
  if (rematchTurnTime && versusRoomState?.rules?.turnTimeSeconds) {
    rematchTurnTime.value = String(versusRoomState.rules.turnTimeSeconds);
  }

  [0, 1].forEach(index => {
    const player = versusRoomState?.players?.[index];
    const card = document.getElementById(`versusPlayerCard${index}`);
    const name = document.getElementById(`versusPlayerName${index}`);
    const status = document.getElementById(`versusPlayerStatus${index}`);
    if (!card || !name || !status) return;
    name.textContent = versusPlayers[index] || `プレイヤー${index + 1}`;
    const statusText = !player?.occupied
      ? '参加待ち'
      : player.connected ? '接続中' : '再接続待ち';
    status.textContent = statusText;
    card.classList.toggle('active', versusTurnIndex === index && versusRoomState?.status === 'playing');
    card.classList.toggle('self', versusSelfIndex === index);
  });
}

function renderVersusHistory() {
  if (gameMode !== 'versus' || !versusRoomState) return;
  clearGuessHistory();
  versusRoomState.history.forEach((entry, rowIndex) => {
    if (entry.type === 'timeout') {
      renderVersusTimeoutRow(entry, rowIndex);
      return;
    }
    const item = window.GenshinGameLogic.findItemById(versusRoomState.genre, entry.guessId, versusRoomState.rarityFilter);
    if (!item) return;
    renderGuessRow({
      item,
      results: entry.results,
      actorName: entry.actorName,
    }, rowIndex);
  });
}

function renderVersusTimeoutRow(entry, rowIndex) {
  const history = document.getElementById('guessHistory');
  if (!history) return;
  const wrapper = document.createElement('div');
  wrapper.className = 'guess-row timeout-row';
  wrapper.dataset.index = rowIndex;

  const summary = document.createElement('div');
  summary.className = 'guess-summary timeout-summary';

  const name = document.createElement('span');
  name.className = 'guess-name';
  name.textContent = `${entry.actorName}：時間切れ`;
  summary.appendChild(name);

  const badge = document.createElement('span');
  badge.className = 'guess-actor timeout-badge';
  badge.textContent = '自動スキップ';
  summary.appendChild(badge);

  wrapper.appendChild(summary);
  history.insertBefore(wrapper, history.firstChild);
}

function renderVersusStampTimeline() {
  const timeline = document.getElementById('versusStampTimeline');
  if (!timeline) return;
  timeline.innerHTML = '';
  const stamps = versusRoomState?.stamps || [];
  stamps.slice().reverse().forEach(entry => {
    const item = document.createElement('div');
    item.className = 'stamp-timeline-item';
    item.textContent = `${entry.actorName}：${entry.stamp}`;
    timeline.appendChild(item);
  });
}

function hideVersusPanel() {
  document.getElementById('versusPanel')?.classList.add('hidden');
  document.getElementById('versusRematchPanel')?.classList.add('hidden');
  const timeline = document.getElementById('versusStampTimeline');
  if (timeline) timeline.innerHTML = '';
}

function updateVersusInfo() {
  const current = document.getElementById('versusCurrentTurn');
  const players = document.getElementById('versusPlayers');
  if (players) {
    const status = !versusConnection?.code
      ? '未接続'
      : versusReady ? '2人対戦中' : '相手待ち';
    players.textContent = `${versusPlayers[0]} vs ${versusPlayers[1]} (${status})`;
  }
  if (!current) return;
  if (!versusRoomState || versusRoomState.status === 'waiting') {
    current.textContent = '相手の参加を待っています';
    return;
  }
  if (versusRoomState.status === 'finished') {
    current.textContent = '対戦終了';
    return;
  }
  current.textContent = `${versusPlayers[versusTurnIndex] || 'プレイヤー1'} のターン`;
}

function updateVersusTimerDisplay() {
  const timer = document.getElementById('versusTimerValue');
  if (!timer) return;
  if (!versusRoomState || versusRoomState.status !== 'playing') {
    timer.textContent = '—';
    return;
  }
  timer.textContent = String(versusTimerSeconds).padStart(2, '0');
}

function updateVersusInputState() {
  if (gameMode !== 'versus') return;
  const canInput = Boolean(
    versusRoomState &&
    versusRoomState.status === 'playing' &&
    versusSelfIndex === versusTurnIndex
  );
  setInputEnabled(canInput);
}

async function copyVersusInviteLink() {
  if (!versusConnection?.code) return;
  try {
    const inviteLink = buildVersusInviteLink(versusConnection.code);
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLabel('copyInviteLinkBtn', 'コピーしました！');
  } catch (error) {
    showResultBanner('⚠️ 招待リンクのコピーに失敗しました。', 'fail', false);
  }
}

async function copyVersusRoomCode() {
  if (!versusConnection?.code) return;
  try {
    await navigator.clipboard.writeText(versusConnection.code);
    setCopiedLabel('copyRoomCodeBtn', 'コピーしました！');
  } catch (error) {
    showResultBanner('⚠️ ルームコードのコピーに失敗しました。', 'fail', false);
  }
}

async function handleVersusRuleUpdate() {
  if (!versusConnection?.code) return;
  try {
    const turnTimeSeconds = Number(document.getElementById('rematchTurnTimeSelect')?.value || 60);
    await mpUpdateRules({ turnTimeSeconds });
    showResultBanner(`⚙️ 再戦ルールを ${turnTimeSeconds} 秒に更新しました。`, 'success', false);
  } catch (error) {
    showResultBanner(`⚠️ ${error.message}`, 'fail', false);
  }
}

async function handleVersusRematchRequest() {
  if (!versusConnection?.code) return;
  try {
    await mpRequestRematch();
    showResultBanner('🔄 再戦準備を送信しました。相手の準備を待っています。', 'success', false);
  } catch (error) {
    showResultBanner(`⚠️ ${error.message}`, 'fail', false);
  }
}

async function handleVersusStamp(stamp) {
  if (!stamp || !versusConnection?.code || versusRoomState?.status !== 'playing') return;
  try {
    await mpSendStamp(stamp);
  } catch (error) {
    showResultBanner(`⚠️ ${error.message}`, 'fail', false);
  }
}

async function handleLeaveVersusRoom() {
  if (!versusConnection?.code) {
    cancelVersusModal();
    return;
  }
  if (!window.confirm('オンライン対戦ルームから退出しますか？')) return;
  clearVersusPlayerKey(versusConnection.code);
  requestedVersusRoomCode = '';
  await clearVersusConnection(true);
  await switchMode('daily');
}

function getOpponentIndex() {
  return versusTurnIndex === 0 ? 1 : 0;
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
    gameEnded,
    gaveUp,
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
      if (item) processGuess(item, false, { animateSolve: false });
    });
    solved   = data.solved;
    gaveUp = Boolean(data.gaveUp);
    gameEnded = Boolean(data.gameEnded || data.solved || data.gaveUp);
    attempts = data.attempts;
    if (solved) onSolve(false);
    else if (gaveUp) onGiveUp(false);
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

/** カタカナをひらがなに変換するヘルパー関数 */
function katakanaToHiragana(src) {
  return src.replace(/[\u30a1-\u30f6]/g, match => {
    return String.fromCharCode(match.charCodeAt(0) - 0x60);
  });
}

function searchItems(query) {
  const q = katakanaToHiragana(query.toLowerCase()); // 入力をひらがなに統一
  const guessedIds = new Set(guesses.map(g => g.item.id));
  const pool = getPool();
  return pool.filter(item => {
    if (guessedIds.has(item.id)) return false;
    return item.displayNames.some(name => 
      katakanaToHiragana(name.toLowerCase()).includes(q) // 候補もひらがなに変換して部分一致判定
    );
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
async function submitGuess() {
  if (gameEnded) return;
  if (gameMode === 'versus' && (!versusReady || !versusConnection)) {
    showInputError('オンライン対戦の接続準備中です。少し待ってから再試行してください。');
    return;
  }
  if (gameMode === 'versus' && versusTurnIndex !== versusSelfIndex) {
    showInputError(`現在は ${versusPlayers[versusTurnIndex]} のターンです。`);
    return;
  }
  const input = document.getElementById('guessInput');
  const rawInput = input.value.trim();
  if (!rawInput) return;
  const name = katakanaToHiragana(rawInput); // 入力をひらがなに統一

  const pool = genre === 'weapon' ? WEAPONS : CHARACTERS;
  const item = pool.find(x =>
    x.displayNames.some(n => katakanaToHiragana(n) === name) // 候補もひらがなに変換して完全一致判定
  );

  if (!item) {
    showInputError('見つかりません。サジェストから選んでください。');
    return;
  }
  if (!getPool().some(x => x.id === item.id)) {
    showInputError('現在の出題範囲外です。');
    return;
  }
  if (gameMode !== 'versus' && guesses.some(g => g.item.id === item.id)) {
    showInputError('すでに入力済みです。');
    return;
  }

  input.value = '';
  closeSuggest();
  clearInputError();
  if (gameMode === 'versus') {
   try {
     await mpSubmitGuess({ guessId: item.id });
   } catch (error) {
     showInputError(error.message);
   }
   return;
  }
  processGuess(item, true);
}

function processGuess(item, save = true, options = {}) {
  const animateSolve = options.animateSolve !== false;
  const remoteAction = options.remoteAction === true;
  attempts++;
  const fields = getCurrentHintFields();
  const results = window.GenshinGameLogic
    ? window.GenshinGameLogic.compareItem(item, answer, fields)
    : compareItem(item, answer, fields);
  guesses.unshift({ item, results });

  renderGuessRow({ item, results }, guesses.length - 1);

  if (item.id === answer.id) {
    solved = true;
    gaveUp = false;
    onSolve(animateSolve);
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
  gameEnded = true;
  setInputEnabled(false);
  updateShareBtns(true);
  updateGiveUpBtn(false);

  if (gameMode === 'endless') {
    streak++;
    saveStreakData();
    updateStreakUI();
    currentScore++;
  } else if (gameMode === 'challenge') {
    currentScore++;
    updateChallengeInfo();
  } else if (gameMode === 'versus') {
    showResultBanner(`🎉 ${versusPlayers[versusTurnIndex]} が正解！ 勝者です。`, 'success', animate);
    if (animate) showWinOverlay(answer);
    return;
  }

  showResultBanner('🎉 正解！ ' + answer.name, 'success', animate);
  if (animate) showWinOverlay(answer);
}

function onChallengeOver() {
  gameEnded = true;
  setInputEnabled(false);
  updateShareBtns(true);
  updateGiveUpBtn(false);
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

function onGiveUp(animate) {
  gameEnded = true;
  setInputEnabled(false);
  updateShareBtns(true);
  updateGiveUpBtn(false);
  if (gameMode === 'versus') {
    const winner = versusPlayers[getOpponentIndex()];
    showResultBanner(`🏳️ ギブアップ… ${winner} の勝利！ 正解は「${answer.name}」でした。`, 'fail', animate);
    return;
  }
  showResultBanner(`🏳️ ギブアップ… 正解は「${answer.name}」でした。`, 'fail', animate);
}

async function giveUpGame() {
  if (gameEnded) return;
  if (!window.confirm('ギブアップしますか？ 正解を表示してこの問題を終了します。')) return;
  if (gameMode === 'versus') {
    try {
      await mpGiveUp();
    } catch (error) {
      showResultBanner(`⚠️ ${error.message}`, 'fail', false);
    }
    return;
  }
  gaveUp = true;
  solved = false;
  if (gameMode === 'endless') {
    streak = 0;
    saveStreakData();
    updateStreakUI();
  } else if (gameMode === 'challenge') {
    challengeRemain = 0;
    updateChallengeInfo();
  }
  onGiveUp(true);
  if (gameMode === 'daily') saveDailyState();
}

// エンドレス: 不正解で次へ進む機能は resetBtn から呼び出す
// （エンドレスは誤答でも継続できるが、次の問題へ進むにはリセットボタンを押す）

// ---------------------------------------------------------------------------
// 判定ロジック
// ---------------------------------------------------------------------------
function compareItem(guess, ans, fields) {
  if (window.GenshinGameLogic) {
    return window.GenshinGameLogic.compareItem(guess, ans, fields);
  }
  const out = {};
  fields.forEach(field => {
    out[field.key] = compareField(field, guess, ans);
  });
  return out;
}

function compareField(field, guess, ans) {
  if (window.GenshinGameLogic) {
    return window.GenshinGameLogic.compareField(field, guess, ans);
  }
  const gVal = guess[field.key];
  const aVal = ans[field.key];

  switch (field.type) {
    case 'numeric': {
      if (gVal === null || gVal === undefined || gVal === '' || aVal === null || aVal === undefined || aVal === '') {
        return { result: 'gray' };
      }
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
  const { item, results, actorName } = entry;
  
  // ★変更：常に共通のルールで判定させるために、getEnabledFields() に置き換える
  const enabledFields = getEnabledFields();

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

  if (actorName) {
    const actorSpan = document.createElement('span');
    actorSpan.className = 'guess-actor';
    actorSpan.textContent = actorName;
    summary.appendChild(actorSpan);
  }

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
 * キャラ: 元素、国、突破ボス、週ボス素材、敵素材、天賦本
 * 武器: 武器突破素材、一般敵素材、エリート敵素材
 */
function buildMaterialIcon(fieldKey, item) {
  const matKeys = {
    // 🟢 追加：元素と国のアイコン（新設フォルダから取得）
    element:      () => `${IMAGE_BASE}/elements/${encodeURIComponent(item.element)}.png`,
    country:      () => `${IMAGE_BASE}/country/${encodeURIComponent(item.country)}.png`,
    
    // 🟢 変更：新しいフォルダ構成に合わせたパスに修正
    talentBoss:   () => `${IMAGE_BASE}/materials/boss/${encodeURIComponent(item.talentBoss)}.png`,
    talentWeekly: () => `${IMAGE_BASE}/talent_weekly/${encodeURIComponent(item.talentWeekly)}.png`, // talent_weekly フォルダへ
    talentBook:   () => `${IMAGE_BASE}/talentBook/${encodeURIComponent(item.talentBook)}.png`,     // talentBook フォルダへ
    enemyMaterial:() => `${IMAGE_BASE}/enemy material/${encodeURIComponent(item.enemyMaterial)}.png`,
    
    // 🟢 変更：武器突破素材のパスを WEAPON_BREAK に修正
    weaponBreakMaterial: () => `${IMAGE_BASE}/WEAPON_BREAK/${encodeURIComponent(item.weaponBreakMaterial)}.png`,
    weaponEnemyMaterial: () => `${IMAGE_BASE}/weapons Enemy material/${encodeURIComponent(item.weaponEnemyMaterial)}.png`,
  };

  if (!matKeys[fieldKey]) return null;

  const img = document.createElement('img');
  img.src = matKeys[fieldKey]();
  img.alt = '';
  img.className = 'mat-icon';
  img.onerror = () => { img.remove(); }; // 画像がない場合は非表示
  return img;
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
  const fields = getEnabledFields();
  const lines = [];
  const today = getTodayString();
  const genreLabel = genre === 'weapon' ? '武器' : 'キャラ';

  if (gameMode === 'daily') {
    lines.push(`#GenshinGuesser デイリー ${today} [${genreLabel}]`);
  } else if (gameMode === 'endless') {
    lines.push(`#GenshinGuesser エンドレス [${genreLabel}] 🔥${streak}連勝`);
  } else if (gameMode === 'versus') {
    const winnerIndex = versusRoomState?.winnerIndex;
    const winner = winnerIndex >= 0 ? versusPlayers[winnerIndex] : '未決着';
    lines.push(`#GenshinGuesser オンライン対戦 [${genreLabel}] 勝者:${winner}`);
  } else {
    lines.push(`#GenshinGuesser チャレンジ [${genreLabel}] スコア:${currentScore}`);
  }

  if (solved) {
    lines.push(`✅ ${attempts}回で正解！`);
  } else {
    lines.push(`❌ 失敗... `);
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

function updateGiveUpBtn(show) {
  document.getElementById('giveUpBtn')?.classList.toggle('hidden', !show);
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

function saveSettings() {
  localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings));
}

function openSettingsModal() {
  renderSettingsModal();
  document.getElementById('settingsModal')?.classList.remove('hidden');
  document.getElementById('settingsOverlay')?.classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settingsModal')?.classList.add('hidden');
  document.getElementById('settingsOverlay')?.classList.add('hidden');
}

function renderSettingsModal() {
  const list = document.getElementById('settingsList');
  if (!list) return;
  list.innerHTML = '';
  getCurrentHintFields().forEach(field => {
    const row = document.createElement('label');
    row.className = 'settings-row';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'settings-toggle';
    toggle.dataset.key = field.key;
    toggle.checked = settings[field.key] !== false;

    const text = document.createElement('span');
    text.textContent = field.label;

    row.appendChild(toggle);
    row.appendChild(text);
    list.appendChild(row);
  });
}

function saveSettingsFromModal() {
  const toggles = Array.from(document.querySelectorAll('#settingsList .settings-toggle'));
  if (toggles.length > 0 && toggles.every(toggle => !toggle.checked)) {
    alert('ヒントは1つ以上ONにしてください。');
    return;
  }
  toggles.forEach(toggle => {
    settings[toggle.dataset.key] = toggle.checked;
  });
  saveSettings();
  rerenderGuessHistory();
  closeSettingsModal();
}

function rerenderGuessHistory() {
  clearGuessHistory();
  [...guesses].reverse().forEach((entry, index) => renderGuessRow(entry, index));
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
    case 'baseAtk':      return (item && item.baseAtkLabel) || String(value);
    case 'baseHp':       return (item && item.baseHpLabel) || String(value);
    case 'baseDef':      return (item && item.baseDefLabel) || String(value);
    case 'bannerType':   return { limited:'限定', standard:'恒常', distributed:'配布', pool:'ガチャ' }[value] || value;
    case 'body':         return (item && item.bodyLabel) || value;
    case 'distributed':  return value ? 'あり' : 'なし';
    case 'costume':      return value ? 'あり' : 'なし';
    case 'trace':        return value ? 'あり' : 'なし';
    case 'trainingRoad': return value ? 'あり' : 'なし';
    case 'isDistributed': return value ? 'あり' : 'なし';
    case 'releaseVersionNum': return (item && item.releaseVersionLabel) || String(value);
    default:             return String(value);
  }
}

/**
 * 現在有効なヒントフィールドのリストを取得する（チャレンジモード時は固定）
 */
function getEnabledFields() {
  if (gameMode === 'versus') {
    return getCurrentHintFields();
  }
  const fields = getCurrentHintFields();
  if (gameMode === 'challenge') {
    if (genre === 'character') {
      // 指定された8項目のみに強制固定する
      const allowedKeys = [
        'element',      // 元素
        'weapon',       // 武器種
        'rarity',       // レアリティ
        'country',      // 国
        'energy',       // エネルギー
        'birthMonth',   // 誕生月
        'talentBook',   // 天賦本
        'talentBoss'    // 突破ボス
      ];
      return fields.filter(f => allowedKeys.includes(f.key));
    } else {
      // 武器ジャンルの場合（必要に応じてすべて表示など）
      return fields;
    }
  }
  // 通常モード時は個人の設定を反映
  return fields.filter(f => settings[f.key] !== false);
}

// モーダルの開閉を制御する共通の関数
function openModal(name) {
  document.getElementById(name + 'Modal')?.classList.remove('hidden');
  document.getElementById(name + 'Overlay')?.classList.remove('hidden');
}

function closeModal(name) {
  document.getElementById(name + 'Modal')?.classList.add('hidden');
  document.getElementById(name + 'Overlay')?.classList.add('hidden');
}

/**
 * 回答履歴の表示エリアを空にする関数
 */
function clearGuessHistory() {
  const history = document.getElementById('guessHistory');
  if (history) {
    history.innerHTML = '';
  }
}
