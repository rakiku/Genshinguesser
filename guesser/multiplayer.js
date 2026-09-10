'use strict';

let _socket = null;
let _handlers = {};
let _session = null;
let _hasConnectedOnce = false;
let _resumeSessionOnConnect = false;

function mpIsConfigured() {
  return typeof window.io === 'function';
}

function mpInit(handlers = {}) {
  _handlers = handlers;
  ensureSocket();
}

function ensureSocket() {
  if (_socket) {
    if (!_socket.connected) _socket.connect();
    return _socket;
  }
  if (!mpIsConfigured()) {
    throw new Error('Socket.IO クライアントが読み込まれていません。');
  }

  _socket = window.io({
    autoConnect: true,
    transports: ['websocket', 'polling'],
  });

  _socket.on('connect', () => {
    if (_hasConnectedOnce && _resumeSessionOnConnect && _session && _session.roomCode && _session.playerKey) {
      void emitWithAck('room:reconnect', {
        code: _session.roomCode,
        playerKey: _session.playerKey,
        expectedSeat: _session.seat,
      }).catch(error => {
        if (_handlers.onError) _handlers.onError(error);
      });
    }
    _hasConnectedOnce = true;
    if (_handlers.onConnect) _handlers.onConnect();
  });

  _socket.on('disconnect', reason => {
    if (_handlers.onDisconnect) _handlers.onDisconnect(reason);
  });

  _socket.on('room:state', snapshot => {
    if (_handlers.onRoomState) _handlers.onRoomState(snapshot);
  });

  _socket.on('game:started', payload => {
    if (_handlers.onGameStarted) _handlers.onGameStarted(payload);
  });

  _socket.on('game:timer', payload => {
    if (_handlers.onGameTimer) _handlers.onGameTimer(payload);
  });

  _socket.on('game:guess_result', payload => {
    if (_handlers.onGuessResult) _handlers.onGuessResult(payload);
  });

  _socket.on('game:turn_timeout', payload => {
    if (_handlers.onTurnTimeout) _handlers.onTurnTimeout(payload);
  });

  _socket.on('game:ended', payload => {
    if (_handlers.onGameEnded) _handlers.onGameEnded(payload);
  });

  _socket.on('stamp:received', payload => {
    if (_handlers.onStampReceived) _handlers.onStampReceived(payload);
  });

  return _socket;
}

function emitWithAck(eventName, payload) {
  const socket = ensureSocket();
  return new Promise((resolve, reject) => {
    socket.emit(eventName, payload, response => {
      if (!response || response.ok === false) {
        reject(new Error(response && response.error ? response.error : '通信に失敗しました。'));
        return;
      }
      resolve(response);
    });
  });
}

function mpCreateRoom({ hostName, genre, rarityFilter, rules }) {
  return emitWithAck('room:create', { hostName, genre, rarityFilter, rules }).then(response => {
    _session = {
      roomCode: response.roomCode,
      playerKey: response.playerKey,
      playerName: hostName || 'プレイヤー1',
      seat: response.snapshot?.selfSeat,
    };
    _resumeSessionOnConnect = true;
    return response;
  });
}

function mpJoinRoom({ code, guestName, playerKey, expectedSeat }) {
  const eventName = playerKey ? 'room:reconnect' : 'room:join';
  const payload = playerKey
    ? { code, playerKey, expectedSeat }
    : { code, guestName };
  return emitWithAck(eventName, payload).then(response => {
    _session = {
      roomCode: response.roomCode,
      playerKey: response.playerKey,
      playerName: guestName || _session?.playerName || 'プレイヤー',
      seat: response.snapshot?.selfSeat,
    };
    _resumeSessionOnConnect = true;
    return response;
  });
}

function mpLeaveRoom({ roomCode, code, playerKey } = {}) {
  const activeRoomCode = roomCode || code || _session?.roomCode;
  const activePlayerKey = playerKey || _session?.playerKey;
  return emitWithAck('room:leave', {
    code: activeRoomCode,
    playerKey: activePlayerKey,
  }).finally(() => {
    _session = null;
    _resumeSessionOnConnect = false;
  });
}

function mpSubmitGuess({ guessId }) {
  return emitWithAck('game:guess', { guessId });
}

function mpSendStamp(stamp) {
  return emitWithAck('stamp:send', { stamp });
}

function mpGiveUp() {
  return emitWithAck('game:giveup', {});
}

function mpUpdateRules(rules) {
  return emitWithAck('game:update_rules', { rules });
}

function mpRequestRematch() {
  return emitWithAck('game:rematch_request', {});
}

function mpDisconnect() {
  _resumeSessionOnConnect = false;
  if (_socket) {
    _socket.disconnect();
  }
}

function mpGetSession() {
  return _session ? { ..._session } : null;
}
