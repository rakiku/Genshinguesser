'use strict';

// ---------------------------------------------------------------------------
// 状態管理
// ---------------------------------------------------------------------------
let quizKind = 'data';      // 'data' | 'variety'
let quizGenre = 'mix';      // 'mix' | 'character' | 'weapon'
let quizDiff = 'easy';      // 'easy' | 'normal' | 'hard'
let quizRule = 'ten';       // 'ten' | 'endless' | 'challenge'

let varietyQuestions = [];
let varietyQueue = [];
let currentQuestion = null;
let questionNumber = 0;
let correctCount = 0;
let challengeLives = 3;
let answeredCurrent = false;
let sessionHistory = [];
let suggestItems = [];
let suggestIndex = -1;

// GitHub同期設定（styles.js / database.html と同一リポジトリ）
const GITHUB_OWNER = 'rakiku';
const GITHUB_REPO  = 'Genshinguesser';
const VARIETY_JSON_PATH = 'guesser/variety-quiz.json';
const LS_VARIETY_KEY = 'genshin-guesser-variety-quiz-v1';
const ADMIN_PASS = 'Liliavanrouge0101';
let adminClicks = 0;
let adminClickTimer = null;

// ---------------------------------------------------------------------------
// 初期化
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  parseQueryParams();
  await loadVarietyQuestions();
  bindSetupUI();
  bindPlayUI();
  bindResultUI();
  bindAdminUI();
  syncSetupButtons();
});

function parseQueryParams() {
  const p = new URLSearchParams(location.search);
  const k = p.get('kind');
  const g = p.get('genre');
  const d = p.get('diff');
  const r = p.get('rule');
  if (k === 'data' || k === 'variety') quizKind = k;
  if (g === 'character' || g === 'weapon' || g === 'mix') quizGenre = g;
  if (d === 'easy' || d === 'normal' || d === 'hard') quizDiff = d;
  if (r === 'ten' || r === 'endless' || r === 'challenge') quizRule = r;
}

// ---------------------------------------------------------------------------
// バラエティ問題ロード & GitHub同期
// ---------------------------------------------------------------------------
async function loadVarietyQuestions() {
  try {
    const cached = localStorage.getItem(LS_VARIETY_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) varietyQuestions = parsed;
    }
  } catch (e) { /* noop */ }

  try {
    const res = await fetch(`variety-quiz.json?v=${Date.now()}`);
    if (res.ok) {
      const remote = await res.json();
      if (Array.isArray(remote)) {
        varietyQuestions = remote;
        localStorage.setItem(LS_VARIETY_KEY, JSON.stringify(varietyQuestions));
      }
    }
  } catch (e) {
    console.warn('variety-quiz.json の取得に失敗しました:', e);
  }
}

function b64EncodeUnicode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function saveVarietyToGitHub() {
  localStorage.setItem(LS_VARIETY_KEY, JSON.stringify(varietyQuestions));

  let token = localStorage.getItem('github_pat');
  if (!token) {
    token = prompt('【初回設定】GitHubのアクセストークン（repo権限）を入力してください:');
    if (!token) {
      alert('トークン未入力のため、このブラウザ内のみに一時保存しました。');
      return;
    }
    token = token.trim();
    localStorage.setItem('github_pat', token);
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${VARIETY_JSON_PATH}`;
    let sha = undefined;
    const getRes = await fetch(url, { headers: { Authorization: `token ${token}` } });
    if (getRes.ok) {
      const data = await getRes.json();
      sha = data.sha;
    }

    const content = b64EncodeUnicode(JSON.stringify(varietyQuestions, null, 2));
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update variety-quiz.json via Quiz Admin Panel',
        content,
        ...(sha ? { sha } : {}),
      }),
    });

    if (putRes.ok) {
      alert('GitHubへの保存が完了しました！数分後に全ユーザーへ反映されます。');
    } else {
      const err = await putRes.json();
      alert('GitHub保存に失敗しました: ' + (err.message || putRes.status));
      if (putRes.status === 401 || putRes.status === 403) localStorage.removeItem('github_pat');
    }
  } catch (e) {
    alert('通信エラーによりGitHubへ保存できませんでした。');
  }
}

// ---------------------------------------------------------------------------
// セットアップUI
// ---------------------------------------------------------------------------
function bindSetupUI() {
  document.querySelectorAll('[data-kind]').forEach(btn => {
    btn.addEventListener('click', () => {
      quizKind = btn.dataset.kind;
      syncSetupButtons();
    });
  });
  document.querySelectorAll('[data-qgenre]').forEach(btn => {
    btn.addEventListener('click', () => {
      quizGenre = btn.dataset.qgenre;
      syncSetupButtons();
    });
  });
  document.querySelectorAll('[data-diff]').forEach(btn => {
    btn.addEventListener('click', () => {
      quizDiff = btn.dataset.diff;
      syncSetupButtons();
    });
  });
  document.querySelectorAll('[data-rule]').forEach(btn => {
    btn.addEventListener('click', () => {
      quizRule = btn.dataset.rule;
      syncSetupButtons();
    });
  });
  document.getElementById('quizStartBtn')?.addEventListener('click', startQuizSession);
}

function syncSetupButtons() {
  document.querySelectorAll('[data-kind]').forEach(b => b.classList.toggle('active', b.dataset.kind === quizKind));
  document.querySelectorAll('[data-qgenre]').forEach(b => b.classList.toggle('active', b.dataset.qgenre === quizGenre));
  document.querySelectorAll('[data-diff]').forEach(b => b.classList.toggle('active', b.dataset.diff === quizDiff));
  document.querySelectorAll('[data-rule]').forEach(b => b.classList.toggle('active', b.dataset.rule === quizRule));
  document.getElementById('quizGenreGroup')?.classList.toggle('hidden', quizKind !== 'data');
}

// ---------------------------------------------------------------------------
// クイズ進行
// ---------------------------------------------------------------------------
function startQuizSession() {
  if (quizKind === 'variety' && varietyQuestions.length === 0) {
    alert('バラエティクイズの問題がまだ登録されていません。');
    return;
  }

  questionNumber = 0;
  correctCount = 0;
  challengeLives = 3;
  sessionHistory = [];
  varietyQueue = shuffleArray([...varietyQuestions]);

  document.getElementById('quizSetupCard')?.classList.add('hidden');
  document.getElementById('quizResultCard')?.classList.add('hidden');
  document.getElementById('quizPlayCard')?.classList.remove('hidden');

  loadNextQuestion();
}

function shuffleArray(arr) {
  const c = [...arr];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}

function buildNextQuestion() {
  if (quizKind === 'data') {
    return window.GenshinQuizEngine.generateDataQuestion(quizGenre, Math.random, '../files');
  }

  if (varietyQueue.length === 0) {
    varietyQueue = shuffleArray([...varietyQuestions]);
  }
  const v = varietyQueue.pop();
  const dummies = (v.dummyChoices || []).filter(Boolean).slice(0, 3);
  return {
    kind: 'variety',
    question: v.question,
    answer: v.answer,
    acceptAnswers: v.acceptAnswers || [],
    choices: shuffleArray([v.answer, ...dummies]),
    varietyAnswerPool: varietyQuestions,
    hintIcons: [],
    explanation: v.explanation || `正解は「${v.answer}」です。`,
  };
}

function loadNextQuestion() {
  answeredCurrent = false;
  questionNumber++;
  currentQuestion = buildNextQuestion();

  if (!currentQuestion) {
    alert('問題の生成に失敗しました。');
    return;
  }

  updateHud();
  renderQuestionCard();
}

function updateHud() {
  const kindLabel = quizKind === 'data' ? 'データクイズ' : 'バラエティ';
  const diffLabel = { easy: 'イージー', normal: 'ノーマル', hard: 'ハード' }[quizDiff];
  document.getElementById('hudModeBadge').textContent = `${kindLabel} / ${diffLabel}`;

  const progressText = quizRule === 'ten' ? `第 ${questionNumber} / 10 問` : `第 ${questionNumber} 問`;
  document.getElementById('hudProgress').textContent = progressText;
  document.getElementById('hudScore').textContent = `正解: ${correctCount}`;

  const livesEl = document.getElementById('hudLives');
  if (quizRule === 'challenge') {
    livesEl.classList.remove('hidden');
    livesEl.textContent = '❤️'.repeat(Math.max(0, challengeLives)) + '🖤'.repeat(Math.max(0, 3 - challengeLives));
  } else {
    livesEl.classList.add('hidden');
  }
}

function renderQuestionCard() {
  document.getElementById('quizQuestionText').textContent = currentQuestion.question;

  // アイコンヒント
  const iconsRow = document.getElementById('quizIconsRow');
  iconsRow.innerHTML = '';
  if (currentQuestion.hintIcons && currentQuestion.hintIcons.length > 0) {
    currentQuestion.hintIcons.forEach(icon => {
      const chip = document.createElement('div');
      chip.className = 'quiz-hint-chip';
      const img = document.createElement('img');
      img.src = icon.url;
      img.alt = icon.label;
      img.onerror = () => chip.remove();
      const span = document.createElement('span');
      span.textContent = icon.label;
      chip.append(img, span);
      iconsRow.appendChild(chip);
    });
    iconsRow.classList.remove('hidden');
  } else {
    iconsRow.classList.add('hidden');
  }

  // フィードバック初期化
  const fb = document.getElementById('quizFeedback');
  fb.classList.add('hidden');
  fb.textContent = '';
  document.getElementById('quizNextBtn').classList.add('hidden');

  const choicesGrid = document.getElementById('quizChoicesGrid');
  const inputWrap = document.getElementById('quizInputWrap');

if (quizDiff === 'easy') {
    inputWrap.classList.add('hidden');
    choicesGrid.classList.remove('hidden');
    choicesGrid.innerHTML = '';

    const items = (currentQuestion.choiceDetails && currentQuestion.choiceDetails.length > 0)
      ? currentQuestion.choiceDetails
      : currentQuestion.choices.map(c => ({ label: c, iconUrl: '' }));

    items.forEach(choiceObj => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'quiz-choice-btn';
      btn.dataset.value = choiceObj.label;

      if (choiceObj.iconUrl) {
        btn.classList.add('has-icon');
        const img = document.createElement('img');
        img.src = choiceObj.iconUrl;
        img.alt = choiceObj.label;
        img.className = 'quiz-choice-icon';
        img.onerror = () => {
          img.remove();
          btn.classList.remove('has-icon');
        };
        btn.appendChild(img);
      }

      const span = document.createElement('span');
      span.textContent = choiceObj.label;
      btn.appendChild(span);

      btn.addEventListener('click', () => submitAnswer(choiceObj.label, btn));
      choicesGrid.appendChild(btn);
    });
  } else {
    choicesGrid.classList.add('hidden');
    inputWrap.classList.remove('hidden');
    const input = document.getElementById('quizAnswerInput');
    const submitBtn = document.getElementById('quizAnswerSubmit');
    const hint = document.getElementById('quizInputHint');
    input.value = '';
    input.disabled = false;
    submitBtn.disabled = false;
    closeQuizSuggest();

    if (quizDiff === 'normal') {
      hint.textContent = '💡 入力すると候補（サジェスト）が表示されます。';
    } else {
      hint.textContent = currentQuestion.answerType === 'entity'
        ? '🔥 ハード：愛称不可・正式名称のみで解答してください。'
        : '🔥 ハード：サジェストなし（漢字またはひらがな読みで解答）。';
    }
    setTimeout(() => input.focus(), 50);
  }
}

// ---------------------------------------------------------------------------
// プレイ画面イベント（入力・サジェスト・次へ）
// ---------------------------------------------------------------------------
function bindPlayUI() {
  const input = document.getElementById('quizAnswerInput');
  input?.addEventListener('input', () => {
    if (quizDiff !== 'normal' || answeredCurrent) return;
    const q = input.value.trim();
    if (!q) { closeQuizSuggest(); return; }
    const results = window.GenshinQuizEngine.searchQuizSuggestions(currentQuestion, q);
    renderQuizSuggest(results);
  });

  input?.addEventListener('keydown', e => {
    const list = document.getElementById('quizSuggestList');
    const isOpen = list && !list.classList.contains('hidden');
    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      suggestIndex = Math.min(suggestIndex + 1, suggestItems.length - 1);
      highlightSuggest();
    } else if (e.key === 'ArrowUp' && isOpen) {
      e.preventDefault();
      suggestIndex = Math.max(suggestIndex - 1, -1);
      highlightSuggest();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && suggestIndex >= 0 && suggestItems[suggestIndex]) {
        selectQuizSuggest(suggestItems[suggestIndex].name);
      } else {
        submitAnswer(input.value);
      }
    } else if (e.key === 'Escape') {
      closeQuizSuggest();
    }
  });

  document.getElementById('quizAnswerSubmit')?.addEventListener('click', () => {
    submitAnswer(document.getElementById('quizAnswerInput').value);
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.quiz-input-wrap')) closeQuizSuggest();
  });

  document.getElementById('quizNextBtn')?.addEventListener('click', () => {
    if (shouldEndSession()) {
      showFinalResult();
    } else {
      loadNextQuestion();
    }
  });

  document.getElementById('quizQuitBtn')?.addEventListener('click', () => {
    if (sessionHistory.length > 0 && confirm('現在の結果を終了して結果画面を見ますか？')) {
      showFinalResult();
    } else if (sessionHistory.length === 0 || confirm('設定画面に戻りますか？')) {
      document.getElementById('quizPlayCard').classList.add('hidden');
      document.getElementById('quizSetupCard').classList.remove('hidden');
    }
  });
}

function renderQuizSuggest(items) {
  const list = document.getElementById('quizSuggestList');
  suggestItems = items;
  suggestIndex = -1;
  if (!items || items.length === 0) { closeQuizSuggest(); return; }

  list.innerHTML = '';
  items.forEach((entry, idx) => {
    const row = document.createElement('div');
    row.className = 'suggest-item';
    if (entry.iconUrl) {
      const img = document.createElement('img');
      img.src = entry.iconUrl;
      img.className = 'suggest-icon';
      img.onerror = () => img.remove();
      row.appendChild(img);
    }
    const span = document.createElement('span');
    span.textContent = entry.sub ? `${entry.name} (${entry.sub})` : entry.name;
    row.appendChild(span);
    row.addEventListener('mousedown', e => {
      e.preventDefault();
      selectQuizSuggest(entry.name);
    });
    list.appendChild(row);
  });
  list.classList.remove('hidden');
}

function highlightSuggest() {
  const rows = document.querySelectorAll('#quizSuggestList .suggest-item');
  rows.forEach((r, i) => r.classList.toggle('highlighted', i === suggestIndex));
}

function selectQuizSuggest(name) {
  document.getElementById('quizAnswerInput').value = name;
  closeQuizSuggest();
  submitAnswer(name);
}

function closeQuizSuggest() {
  document.getElementById('quizSuggestList')?.classList.add('hidden');
  suggestIndex = -1;
}

function submitAnswer(value, clickedBtn = null) {
  if (answeredCurrent) return;
  const trimmed = String(value || '').trim();
  if (!trimmed) return;

  answeredCurrent = true;
  closeQuizSuggest();

  const isCorrect = window.GenshinQuizEngine.checkQuizAnswer(currentQuestion, trimmed, quizDiff);
  if (isCorrect) {
    correctCount++;
  } else if (quizRule === 'challenge') {
    challengeLives--;
  }

  sessionHistory.push({
    question: currentQuestion.question,
    answer: currentQuestion.answer,
    userAnswer: trimmed,
    isCorrect,
  });

  // UI更新（★ここが変更箇所です）
  if (quizDiff === 'easy') {
    document.querySelectorAll('.quiz-choice-btn').forEach(btn => {
      btn.disabled = true;
      const val = btn.dataset.value || btn.textContent;
      if (val === currentQuestion.answer) btn.classList.add('is-correct');
      else if (btn === clickedBtn && !isCorrect) btn.classList.add('is-wrong');
    });
  } else {
    document.getElementById('quizAnswerInput').disabled = true;
    document.getElementById('quizAnswerSubmit').disabled = true;
  }

  updateHud();

  const fb = document.getElementById('quizFeedback');
  fb.className = `quiz-feedback ${isCorrect ? 'correct' : 'wrong'}`;
  fb.innerHTML = isCorrect
    ? `<strong>⭕ 正解！</strong><br>${escapeHtml(currentQuestion.explanation)}`
    : `<strong>❌ 不正解… 正解は「${escapeHtml(currentQuestion.answer)}」</strong><br>${escapeHtml(currentQuestion.explanation)}`;
  fb.classList.remove('hidden');

  const nextBtn = document.getElementById('quizNextBtn');
  nextBtn.textContent = shouldEndSession() ? '結果を見る →' : '次の問題へ →';
  nextBtn.classList.remove('hidden');
}

function shouldEndSession() {
  if (quizRule === 'ten' && questionNumber >= 10) return true;
  if (quizRule === 'challenge' && challengeLives <= 0) return true;
  return false;
}

// ---------------------------------------------------------------------------
// 結果画面 & 共有
// ---------------------------------------------------------------------------
function showFinalResult() {
  document.getElementById('quizPlayCard').classList.add('hidden');
  document.getElementById('quizResultCard').classList.remove('hidden');

  const total = sessionHistory.length;
  document.getElementById('quizFinalScore').textContent = `${correctCount} / ${total} 問正解`;
  const rate = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const ruleLabel = { ten: '10問モード', endless: 'エンドレスモード', challenge: 'チャレンジモード' }[quizRule];
  document.getElementById('quizResultSub').textContent = `${ruleLabel}（正答率 ${rate}%）`;

  const list = document.getElementById('quizHistoryList');
  list.innerHTML = '';
  sessionHistory.forEach((h, i) => {
    const div = document.createElement('div');
    div.className = `quiz-history-item ${h.isCorrect ? 'ok' : 'ng'}`;
    div.innerHTML = `<b>Q${i + 1}.</b> ${escapeHtml(h.question)}<br>
      <span>${h.isCorrect ? '⭕' : '❌'} あなた: ${escapeHtml(h.userAnswer)} / 正解: <b>${escapeHtml(h.answer)}</b></span>`;
    list.appendChild(div);
  });
}

function bindResultUI() {
  document.getElementById('quizRetryBtn')?.addEventListener('click', startQuizSession);
  document.getElementById('quizBackSetupBtn')?.addEventListener('click', () => {
    document.getElementById('quizResultCard').classList.add('hidden');
    document.getElementById('quizSetupCard').classList.remove('hidden');
  });
  document.getElementById('quizShareBtn')?.addEventListener('click', () => {
    const text = buildQuizShareText();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  });
  document.getElementById('quizCopyBtn')?.addEventListener('click', () => {
    navigator.clipboard.writeText(buildQuizShareText()).then(() => alert('結果をコピーしました！'));
  });
}

function buildQuizShareText() {
  const kindLabel = quizKind === 'data' ? 'データクイズ' : 'バラエティクイズ';
  const diffLabel = { easy: 'イージー', normal: 'ノーマル', hard: 'ハード' }[quizDiff];
  const ruleLabel = { ten: '10問', endless: 'エンドレス', challenge: 'チャレンジ' }[quizRule];
  const marks = sessionHistory.map(h => (h.isCorrect ? '⭕' : '❌')).join('');
  return `#GenshinGuesser ${kindLabel} [${diffLabel}/${ruleLabel}]\n結果: ${correctCount}/${sessionHistory.length} 問正解！\n${marks}\nhttps://rakiku.github.io/Genshinguesser/guesser/quiz.html`;
}

// ---------------------------------------------------------------------------
// バラエティクイズ管理者モーダル
// ---------------------------------------------------------------------------
function bindAdminUI() {
  document.getElementById('varietyAdminTrigger')?.addEventListener('click', () => {
    adminClicks++;
    clearTimeout(adminClickTimer);
    adminClickTimer = setTimeout(() => { adminClicks = 0; }, 10000);
    if (adminClicks >= 10) {
      adminClicks = 0;
      clearTimeout(adminClickTimer);
      document.getElementById('vAdminPassInput').value = '';
      document.getElementById('vAuthError').classList.add('hidden');
      document.getElementById('vAuthOverlay').classList.remove('hidden');
      document.getElementById('vAuthModal').classList.remove('hidden');
    }
  });

  document.getElementById('vAuthClose')?.addEventListener('click', closeVAuth);
  document.getElementById('vAuthOverlay')?.addEventListener('click', closeVAuth);
  document.getElementById('vAuthSubmit')?.addEventListener('click', handleVAuth);
  document.getElementById('vAdminPassInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') handleVAuth(); });

  document.getElementById('vManageClose')?.addEventListener('click', closeVManage);
  document.getElementById('vManageOverlay')?.addEventListener('click', closeVManage);
  document.getElementById('vSaveBtn')?.addEventListener('click', handleSaveVarietyQuestion);
  document.getElementById('vCancelEditBtn')?.addEventListener('click', resetVarietyForm);
}

function closeVAuth() {
  document.getElementById('vAuthOverlay').classList.add('hidden');
  document.getElementById('vAuthModal').classList.add('hidden');
}

function handleVAuth() {
  if (document.getElementById('vAdminPassInput').value === ADMIN_PASS) {
    closeVAuth();
    resetVarietyForm();
    renderVarietyAdminList();
    document.getElementById('vManageOverlay').classList.remove('hidden');
    document.getElementById('vManageModal').classList.remove('hidden');
  } else {
    document.getElementById('vAuthError').classList.remove('hidden');
  }
}

function closeVManage() {
  document.getElementById('vManageOverlay').classList.add('hidden');
  document.getElementById('vManageModal').classList.add('hidden');
}

function resetVarietyForm() {
  document.getElementById('vEditIndex').value = '';
  document.getElementById('vQuestionInput').value = '';
  document.getElementById('vAnswerInput').value = '';
  document.getElementById('vAcceptInput').value = '';
  document.getElementById('vDummy1').value = '';
  document.getElementById('vDummy2').value = '';
  document.getElementById('vDummy3').value = '';
  document.getElementById('vExplanationInput').value = '';
  document.getElementById('vSaveBtn').textContent = '追加してGitHubへ保存';
  document.getElementById('vCancelEditBtn').classList.add('hidden');
}

async function handleSaveVarietyQuestion() {
  const question = document.getElementById('vQuestionInput').value.trim();
  const answer = document.getElementById('vAnswerInput').value.trim();
  const d1 = document.getElementById('vDummy1').value.trim();
  const d2 = document.getElementById('vDummy2').value.trim();
  const d3 = document.getElementById('vDummy3').value.trim();
  const acceptRaw = document.getElementById('vAcceptInput').value.trim();
  const explanation = document.getElementById('vExplanationInput').value.trim();

  if (!question || !answer || !d1 || !d2 || !d3) {
    alert('問題文・正解・イージー用ダミー選択肢3つはすべて入力してください。');
    return;
  }

  const entry = {
    id: 'v_' + Date.now(),
    question,
    answer,
    acceptAnswers: acceptRaw ? acceptRaw.split(/[,、]/).map(s => s.trim()).filter(Boolean) : [],
    dummyChoices: [d1, d2, d3],
    explanation,
  };

  const editIdx = document.getElementById('vEditIndex').value;
  if (editIdx !== '') {
    entry.id = varietyQuestions[Number(editIdx)].id || entry.id;
    varietyQuestions[Number(editIdx)] = entry;
  } else {
    varietyQuestions.unshift(entry);
  }

  resetVarietyForm();
  renderVarietyAdminList();
  await saveVarietyToGitHub();
}

function renderVarietyAdminList() {
  document.getElementById('vCountLabel').textContent = varietyQuestions.length;
  const list = document.getElementById('vAdminList');
  list.innerHTML = '';

  varietyQuestions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'variety-item-card';
    card.innerHTML = `
      <div><strong>Q:</strong> ${escapeHtml(q.question)}</div>
      <div><strong>A:</strong> ${escapeHtml(q.answer)} <span style="opacity:.75;">（他択: ${(q.dummyChoices || []).map(escapeHtml).join(', ')}）</span></div>
    `;

    const actions = document.createElement('div');
    actions.className = 'variety-item-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'icon-btn';
    editBtn.textContent = '編集';
    editBtn.onclick = () => {
      document.getElementById('vEditIndex').value = String(idx);
      document.getElementById('vQuestionInput').value = q.question;
      document.getElementById('vAnswerInput').value = q.answer;
      document.getElementById('vAcceptInput').value = (q.acceptAnswers || []).join(', ');
      document.getElementById('vDummy1').value = (q.dummyChoices || [])[0] || '';
      document.getElementById('vDummy2').value = (q.dummyChoices || [])[1] || '';
      document.getElementById('vDummy3').value = (q.dummyChoices || [])[2] || '';
      document.getElementById('vExplanationInput').value = q.explanation || '';
      document.getElementById('vSaveBtn').textContent = '更新してGitHubへ保存';
      document.getElementById('vCancelEditBtn').classList.remove('hidden');
    };

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'icon-btn';
    delBtn.textContent = '削除';
    delBtn.onclick = async () => {
      if (!confirm('この問題を削除しますか？')) return;
      varietyQuestions.splice(idx, 1);
      renderVarietyAdminList();
      await saveVarietyToGitHub();
    };

    actions.append(editBtn, delBtn);
    card.appendChild(actions);
    list.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
