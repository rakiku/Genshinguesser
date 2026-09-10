'use strict';

/**
 * WebRTC (P2P) Multiplayer Implementation using PeerJS
 * 完全にサーバーレス・追加費用0円で動作します（GitHub Pages 単体で稼働可能）
 */

let _peer = null;
let _conn = null;
let _handlers = {};
let _session = null;
let _isHost = false;
let _hostManager = null;
let _timerInterval = null;
let _pendingAcks = new Map();
let _reqIdCounter = 1;
let _peerLoadPromise = null;

const PEERJS_CDN_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PEER_PREFIX = 'genshin-p2p-';

function mpIsConfigured() {
  return typeof window.Peer === 'function' && typeof window.RoomManager === 'function';
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

async function mpEnsureReady() {
  if (typeof window.RoomManager !== 'function') {
    await loadScript('room-manager.js');
  }
  if (typeof window.Peer !== 'function') {
    if (!_peerLoadPromise) {
      _peerLoadPromise = loadScript(PEERJS_CDN_URL);
    }
    await _peerLoadPromise;
  }
  if (!mpIsConfigured()) {
    throw new Error('P2P通信ライブラリの読み込みに失敗しました。ページを再読み込みしてください。');
  }
}

function mpInit(handlers = {}) {
  _handlers = handlers;
  void mpEnsureReady().then(() => {
    if (_handlers.onConnect) _handlers.onConnect();
  }).catch(error => {
    if (_handlers.onError) _handlers.onError(error);
  });
}

function stopHostTimer() {
  if (_timerInterval) {
    clearInterval(_timerInterval);
    _timerInterval = null;
  }
}

function startHostTimer(roomCode) {
  stopHostTimer();
  if (!_hostManager) return;

  const tick = () => {
    if (!_hostManager) {
      stopHostTimer();
      return;
    }
    const room = _hostManager.getRoom(roomCode);
    if (!room || room.status !== 'playing') {
      stopHostTimer();
      return;
    }

    const remainingSeconds = _hostManager.getRemainingSeconds(room);
    if (room.lastTimerSecond !== remainingSeconds) {
      room.lastTimerSecond = remainingSeconds;
      const timerPayload = {
        roomCode: room.code,
        remainingSeconds,
        currentTurnIndex: room.currentTurnIndex,
      };
      if (_handlers.onGameTimer) _handlers.onGameTimer(timerPayload);
      sendToGuest({ type: 'event', event: 'game:timer', payload: timerPayload });
    }

    if (remainingSeconds > 0) return;

    const result = _hostManager.timeoutTurn(room.code);
    if (!result) return;

    broadcastRoomState();
    const timeoutPayload = {
      roomCode: room.code,
      actorIndex: result.entry.actorIndex,
      actorName: result.room.players[result.entry.actorIndex].name,
    };
    if (_handlers.onTurnTimeout) _handlers.onTurnTimeout(timeoutPayload);
    sendToGuest({ type: 'event', event: 'game:turn_timeout', payload: timeoutPayload });
  };

  _timerInterval = setInterval(tick, 250);
  tick();
}

function sendToGuest(data) {
  if (_conn && _conn.open) {
    try {
      _conn.send(data);
    } catch (e) {
      console.warn('Failed to send to guest:', e);
    }
  }
}

function broadcastRoomState() {
  if (!_hostManager || !_session) return;
  const room = _hostManager.getRoom(_session.roomCode);
  if (!room) return;

  // ホスト自身のスナップショット
  if (_handlers.onRoomState) {
    _handlers.onRoomState(_hostManager.buildSnapshot(room, _session.playerKey));
  }

  // ゲストのスナップショット
  const guestPlayer = room.players[1];
  if (guestPlayer && guestPlayer.key) {
    const guestSnapshot = _hostManager.buildSnapshot(room, guestPlayer.key);
    sendToGuest({ type: 'event', event: 'room:state', payload: guestSnapshot });
  }
}

function broadcastGameEnded() {
  if (!_hostManager || !_session) return;
  const room = _hostManager.getRoom(_session.roomCode);
  if (!room) return;
  stopHostTimer();

  if (_handlers.onGameEnded) {
    _handlers.onGameEnded(_hostManager.buildSnapshot(room, _session.playerKey));
  }
  const guestPlayer = room.players[1];
  if (guestPlayer && guestPlayer.key) {
    sendToGuest({
      type: 'event',
      event: 'game:ended',
      payload: _hostManager.buildSnapshot(room, guestPlayer.key),
    });
  }
}

function handleHostIncomingMessage(conn, data) {
  if (!data || !data.type) return;
  const { type, reqId, payload } = data;

  if (type === 'room:join') {
    try {
      if (!_hostManager || !_session) throw new Error('ルームが存在しません。');
      const result = _hostManager.joinRoom(payload);
      const guestSnapshot = _hostManager.buildSnapshot(result.room, result.playerKey);

      conn.send({
        type: 'ack',
        reqId,
        response: {
          ok: true,
          roomCode: result.room.code,
          playerKey: result.playerKey,
          snapshot: guestSnapshot,
        },
      });

      broadcastRoomState();

      if (result.room.status === 'playing') {
        const startPayload = {
          roomCode: result.room.code,
          rules: { ...result.room.rules },
          currentTurnIndex: result.room.currentTurnIndex,
        };
        if (_handlers.onGameStarted) _handlers.onGameStarted(startPayload);
        sendToGuest({ type: 'event', event: 'game:started', payload: startPayload });
        startHostTimer(result.room.code);
      }
    } catch (error) {
      conn.send({
        type: 'ack',
        reqId,
        response: { ok: false, error: error.message },
      });
    }
    return;
  }

  if (type === 'game:guess') {
    try {
      if (!_hostManager || !_session) throw new Error('ルームが存在しません。');
      const room = _hostManager.getRoom(_session.roomCode);
      const guestPlayer = room?.players[1];
      const result = _hostManager.submitGuess({
        code: _session.roomCode,
        playerKey: guestPlayer?.key,
        guessId: payload && payload.guessId,
      });

      conn.send({ type: 'ack', reqId, response: { ok: true } });
      broadcastRoomState();

      const guessResultPayload = { roomCode: result.room.code, entry: result.entry };
      if (_handlers.onGuessResult) _handlers.onGuessResult(guessResultPayload);
      sendToGuest({ type: 'event', event: 'game:guess_result', payload: guessResultPayload });

      if (result.room.status === 'finished') {
        broadcastGameEnded();
      } else {
        startHostTimer(result.room.code);
      }
    } catch (error) {
      conn.send({ type: 'ack', reqId, response: { ok: false, error: error.message } });
    }
    return;
  }

  if (type === 'game:giveup') {
    try {
      const room = _hostManager.getRoom(_session.roomCode);
      const guestPlayer = room?.players[1];
      const updatedRoom = _hostManager.giveUp({
        code: _session.roomCode,
        playerKey: guestPlayer?.key,
      });
      conn.send({ type: 'ack', reqId, response: { ok: true } });
      broadcastRoomState();
      broadcastGameEnded();
    } catch (error) {
      conn.send({ type: 'ack', reqId, response: { ok: false, error: error.message } });
    }
    return;
  }

  if (type === 'stamp:send') {
    try {
      const room = _hostManager.getRoom(_session.roomCode);
      const guestPlayer = room?.players[1];
      const result = _hostManager.sendStamp({
        code: _session.roomCode,
        playerKey: guestPlayer?.key,
        stamp: payload && payload.stamp,
      });
      conn.send({ type: 'ack', reqId, response: { ok: true } });
      broadcastRoomState();

      const stampPayload = { roomCode: result.room.code, entry: result.entry };
      if (_handlers.onStampReceived) _handlers.onStampReceived(stampPayload);
      sendToGuest({ type: 'event', event: 'stamp:received', payload: stampPayload });
    } catch (error) {
      conn.send({ type: 'ack', reqId, response: { ok: false, error: error.message } });
    }
    return;
  }

  if (type === 'game:rematch_request') {
    try {
      const room = _hostManager.getRoom(_session.roomCode);
      const guestPlayer = room?.players[1];
      const result = _hostManager.requestRematch({
        code: _session.roomCode,
        playerKey: guestPlayer?.key,
      });
      conn.send({ type: 'ack', reqId, response: { ok: true, started: result.started } });
      broadcastRoomState();

      if (result.started) {
        const startPayload = {
          roomCode: result.room.code,
          rules: { ...result.room.rules },
          currentTurnIndex: result.room.currentTurnIndex,
        };
        if (_handlers.onGameStarted) _handlers.onGameStarted(startPayload);
        sendToGuest({ type: 'event', event: 'game:started', payload: startPayload });
        startHostTimer(result.room.code);
      }
    } catch (error) {
      conn.send({ type: 'ack', reqId, response: { ok: false, error: error.message } });
    }
    return;
  }

  if (type === 'room:leave') {
    try {
      const room = _hostManager.getRoom(_session.roomCode);
      const guestPlayer = room?.players[1];
      _hostManager.leaveRoom({ code: _session.roomCode, playerKey: guestPlayer?.key });
      conn.send({ type: 'ack', reqId, response: { ok: true } });
      broadcastRoomState();
      broadcastGameEnded();
    } catch (error) {
      conn.send({ type: 'ack', reqId, response: { ok: false, error: error.message } });
    }
  }
}

function handleGuestIncomingMessage(data) {
  if (!data || !data.type) return;

  if (data.type === 'ack') {
    const resolver = _pendingAcks.get(data.reqId);
    if (resolver) {
      _pendingAcks.delete(data.reqId);
      if (data.response && data.response.ok === false) {
        resolver.reject(new Error(data.response.error || '通信エラーが発生しました。'));
      } else {
        resolver.resolve(data.response);
      }
    }
    return;
  }

  if (data.type === 'event') {
    const { event, payload } = data;
    if (event === 'room:state' && _handlers.onRoomState) _handlers.onRoomState(payload);
    else if (event === 'game:started' && _handlers.onGameStarted) _handlers.onGameStarted(payload);
    else if (event === 'game:timer' && _handlers.onGameTimer) _handlers.onGameTimer(payload);
    else if (event === 'game:guess_result' && _handlers.onGuessResult) _handlers.onGuessResult(payload);
    else if (event === 'game:turn_timeout' && _handlers.onTurnTimeout) _handlers.onTurnTimeout(payload);
    else if (event === 'game:ended' && _handlers.onGameEnded) _handlers.onGameEnded(payload);
    else if (event === 'stamp:received' && _handlers.onStampReceived) _handlers.onStampReceived(payload);
  }
}

async function mpCreateRoom({ hostName, genre, rarityFilter, rules }) {
  await mpEnsureReady();
  mpDisconnect();

  _isHost = true;
  _hostManager = new window.RoomManager();
  const createResult = _hostManager.createRoom({ hostName, genre, rarityFilter, rules });
  const roomCode = createResult.room.code;
  const peerId = PEER_PREFIX + roomCode.toLowerCase();

  return new Promise((resolve, reject) => {
    let settled = false;
    _peer = new window.Peer(peerId, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    _peer.on('open', () => {
      if (settled) return;
      settled = true;

      _session = {
        roomCode,
        playerKey: createResult.playerKey,
        playerName: hostName || 'プレイヤー1',
        seat: 0,
      };

      if (_handlers.onConnect) _handlers.onConnect();

      resolve({
        ok: true,
        roomCode,
        playerKey: createResult.playerKey,
        snapshot: _hostManager.buildSnapshot(createResult.room, createResult.playerKey),
      });
    });

    _peer.on('connection', conn => {
      _conn = conn;
      conn.on('open', () => {
        // 接続完了
      });
      conn.on('data', data => {
        handleHostIncomingMessage(conn, data);
      });
      conn.on('close', () => {
        if (_hostManager && _session) {
          const room = _hostManager.getRoom(_session.roomCode);
          if (room && room.status === 'playing') {
            _hostManager.finishGame(room, {
              winnerIndex: 0,
              reason: 'left',
              actorIndex: 1,
            });
            broadcastRoomState();
            broadcastGameEnded();
          }
        }
      });
      conn.on('error', err => {
        console.warn('Peer connection error:', err);
      });
    });

    _peer.on('error', err => {
      if (!settled) {
        settled = true;
        reject(new Error('ルーム作成の通信初期化に失敗しました: ' + (err.message || err.type)));
      } else if (_handlers.onError) {
        _handlers.onError(err);
      }
    });
  });
}

async function mpJoinRoom({ code, guestName }) {
  await mpEnsureReady();
  mpDisconnect();

  _isHost = false;
  _hostManager = null;
  const roomCode = String(code || '').trim().toUpperCase();
  const targetPeerId = PEER_PREFIX + roomCode.toLowerCase();

  return new Promise((resolve, reject) => {
    let settled = false;
    _peer = new window.Peer(null, {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      },
    });

    _peer.on('open', () => {
      const conn = _peer.connect(targetPeerId, { reliable: true });
      _conn = conn;

      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          mpDisconnect();
          reject(new Error('ルームが見つかりません。コードを確認するか、ホストが部屋を開いているか確認してください。'));
        }
      }, 10000);

      conn.on('open', () => {
        // ルーム参加リクエストを送信
        const reqId = _reqIdCounter++;
        _pendingAcks.set(reqId, {
          resolve: res => {
            clearTimeout(timeoutId);
            if (!settled) {
              settled = true;
              _session = {
                roomCode: res.roomCode,
                playerKey: res.playerKey,
                playerName: guestName || 'プレイヤー2',
                seat: 1,
              };
              if (_handlers.onConnect) _handlers.onConnect();
              resolve(res);
            }
          },
          reject: err => {
            clearTimeout(timeoutId);
            if (!settled) {
              settled = true;
              mpDisconnect();
              reject(err);
            }
          },
        });

        conn.send({
          type: 'room:join',
          reqId,
          payload: { code: roomCode, guestName },
        });
      });

      conn.on('data', data => {
        handleGuestIncomingMessage(data);
      });

      conn.on('close', () => {
        if (_handlers.onDisconnect) _handlers.onDisconnect('peer_closed');
      });

      conn.on('error', err => {
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          mpDisconnect();
          reject(new Error('対戦相手への接続に失敗しました: ' + (err.message || err.type)));
        } else if (_handlers.onError) {
          _handlers.onError(err);
        }
      });
    });

    _peer.on('error', err => {
      if (!settled) {
        settled = true;
        mpDisconnect();
        reject(new Error('P2P通信エラー: ' + (err.message || err.type)));
      } else if (_handlers.onError) {
        _handlers.onError(err);
      }
    });
  });
}

function sendAction(type, payload = {}) {
  if (_isHost) {
    if (!_hostManager || !_session) return Promise.reject(new Error('ルームが存在しません。'));
    const room = _hostManager.getRoom(_session.roomCode);
    if (!room) return Promise.reject(new Error('ルームが存在しません。'));

    if (type === 'game:guess') {
      try {
        const result = _hostManager.submitGuess({
          code: _session.roomCode,
          playerKey: _session.playerKey,
          guessId: payload.guessId,
        });
        broadcastRoomState();
        const guessResultPayload = { roomCode: result.room.code, entry: result.entry };
        if (_handlers.onGuessResult) _handlers.onGuessResult(guessResultPayload);
        sendToGuest({ type: 'event', event: 'game:guess_result', payload: guessResultPayload });

        if (result.room.status === 'finished') {
          broadcastGameEnded();
        } else {
          startHostTimer(result.room.code);
        }
        return Promise.resolve({ ok: true });
      } catch (err) {
        return Promise.reject(err);
      }
    }

    if (type === 'stamp:send') {
      try {
        const result = _hostManager.sendStamp({
          code: _session.roomCode,
          playerKey: _session.playerKey,
          stamp: payload.stamp,
        });
        broadcastRoomState();
        const stampPayload = { roomCode: result.room.code, entry: result.entry };
        if (_handlers.onStampReceived) _handlers.onStampReceived(stampPayload);
        sendToGuest({ type: 'event', event: 'stamp:received', payload: stampPayload });
        return Promise.resolve({ ok: true });
      } catch (err) {
        return Promise.reject(err);
      }
    }

    if (type === 'game:giveup') {
      try {
        _hostManager.giveUp({
          code: _session.roomCode,
          playerKey: _session.playerKey,
        });
        broadcastRoomState();
        broadcastGameEnded();
        return Promise.resolve({ ok: true });
      } catch (err) {
        return Promise.reject(err);
      }
    }

    if (type === 'game:update_rules') {
      try {
        const updated = _hostManager.updateRules({
          code: _session.roomCode,
          playerKey: _session.playerKey,
          rules: payload.rules,
        });
        broadcastRoomState();
        return Promise.resolve({ ok: true });
      } catch (err) {
        return Promise.reject(err);
      }
    }

    if (type === 'game:rematch_request') {
      try {
        const result = _hostManager.requestRematch({
          code: _session.roomCode,
          playerKey: _session.playerKey,
        });
        broadcastRoomState();
        if (result.started) {
          const startPayload = {
            roomCode: result.room.code,
            rules: { ...result.room.rules },
            currentTurnIndex: result.room.currentTurnIndex,
          };
          if (_handlers.onGameStarted) _handlers.onGameStarted(startPayload);
          sendToGuest({ type: 'event', event: 'game:started', payload: startPayload });
          startHostTimer(result.room.code);
        }
        return Promise.resolve({ ok: true, started: result.started });
      } catch (err) {
        return Promise.reject(err);
      }
    }

    return Promise.resolve({ ok: true });
  }

  // ゲストの場合: ホストにメッセージ送信
  if (!_conn || !_conn.open) {
    return Promise.reject(new Error('ホストとの接続が切断されています。'));
  }

  return new Promise((resolve, reject) => {
    const reqId = _reqIdCounter++;
    const timer = setTimeout(() => {
      _pendingAcks.delete(reqId);
      reject(new Error('通信がタイムアウトしました。'));
    }, 8000);

    _pendingAcks.set(reqId, {
      resolve: res => {
        clearTimeout(timer);
        resolve(res);
      },
      reject: err => {
        clearTimeout(timer);
        reject(err);
      },
    });

    _conn.send({ type, reqId, payload });
  });
}

function mpSubmitGuess({ guessId }) {
  return sendAction('game:guess', { guessId });
}

function mpSendStamp(stamp) {
  return sendAction('stamp:send', { stamp });
}

function mpGiveUp() {
  return sendAction('game:giveup', {});
}

function mpUpdateRules(rules) {
  return sendAction('game:update_rules', { rules });
}

function mpRequestRematch() {
  return sendAction('game:rematch_request', {});
}

function mpLeaveRoom({ roomCode, code, playerKey } = {}) {
  stopHostTimer();
  if (_isHost) {
    if (_hostManager && _session) {
      _hostManager.leaveRoom({ code: _session.roomCode, playerKey: _session.playerKey });
    }
    broadcastRoomState();
    broadcastGameEnded();
  } else if (_conn && _conn.open) {
    sendAction('room:leave', { roomCode: roomCode || code, playerKey });
  }

  mpDisconnect();
  return Promise.resolve({ ok: true });
}

function mpDisconnect() {
  stopHostTimer();
  _pendingAcks.forEach(ack => ack.reject(new Error('切断されました。')));
  _pendingAcks.clear();

  if (_conn) {
    try { _conn.close(); } catch (e) { /* noop */ }
    _conn = null;
  }
  if (_peer) {
    try { _peer.destroy(); } catch (e) { /* noop */ }
    _peer = null;
  }
  _session = null;
  _isHost = false;
  _hostManager = null;
}

function mpGetSession() {
  return _session ? { ..._session } : null;
}

function mpResetForTests() {
  mpDisconnect();
  _handlers = {};
  _peerLoadPromise = null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mpEnsureReady,
    mpGetSession,
    mpInit,
    mpIsConfigured,
    mpResetForTests,
    mpCreateRoom,
    mpJoinRoom,
    mpSubmitGuess,
    mpSendStamp,
    mpGiveUp,
    mpUpdateRules,
    mpRequestRematch,
    mpLeaveRoom,
    mpDisconnect,
  };
}
