'use strict';

let _socket = null;
let _handlers = {};
let _session = null;
let _hasConnectedOnce = false;
let _resumeSessionOnConnect = false;
let _socketLoadPromise = null;

const SOCKET_IO_RUNTIME = Object.freeze({
  path: '/socket.io',
  scriptSrc: '/socket.io/socket.io.js',
  // Prevent multiplayer actions from waiting forever if the static/injected client bundle never settles.
  loadTimeoutMs: 5_000,
});
const SOCKET_IO_PATH = SOCKET_IO_RUNTIME.path;
const SOCKET_IO_SCRIPT_SRC = SOCKET_IO_RUNTIME.scriptSrc;
const SOCKET_IO_LOAD_TIMEOUT_MS = SOCKET_IO_RUNTIME.loadTimeoutMs;

function buildSocketClientError() {
  return new Error('オンライン対戦を初期化できませんでした。npm start でアプリを開き、/socket.io/socket.io.js が 404 になっていないか確認してください。');
}

function getSocketScriptElement() {
  return document.querySelector('script[data-socket-io-client="true"]');
}

function createSocketScriptElement() {
  const script = document.createElement('script');
  script.src = SOCKET_IO_SCRIPT_SRC;
  script.async = true;
  script.dataset.socketIoClient = 'true';
  document.head.appendChild(script);
  return script;
}

function setSocketScriptState(script, state) {
  if (script && script.dataset) script.dataset.socketIoClientState = state;
}

function watchSocketScript(script) {
  return new Promise((resolve, reject) => {
    if (mpIsConfigured()) {
      setSocketScriptState(script, 'loaded');
      resolve();
      return;
    }

    const cleanupFns = [];
    const cleanup = () => {
      clearTimeout(timeoutId);
      cleanupFns.splice(0).forEach(fn => fn());
    };
    const settleLoaded = () => {
      cleanup();
      if (!mpIsConfigured()) {
        setSocketScriptState(script, 'error');
        reject(buildSocketClientError());
        return;
      }
      setSocketScriptState(script, 'loaded');
      resolve();
    };
    const settleFailed = () => {
      cleanup();
      setSocketScriptState(script, 'error');
      reject(buildSocketClientError());
    };
    const timeoutId = setTimeout(() => {
      cleanup();
      setSocketScriptState(script, 'timeout');
      reject(buildSocketClientError());
    }, SOCKET_IO_LOAD_TIMEOUT_MS);
    const attach = (eventName, handler) => {
      if (typeof script.addEventListener === 'function') {
        script.addEventListener(eventName, handler);
        cleanupFns.push(() => script.removeEventListener(eventName, handler));
        return;
      }
      const propertyName = `on${eventName}`;
      const previousHandler = script[propertyName];
      const wrappedHandler = event => {
        if (typeof previousHandler === 'function') previousHandler.call(script, event);
        handler(event);
      };
      script[propertyName] = wrappedHandler;
      cleanupFns.push(() => {
        if (script[propertyName] === wrappedHandler) script[propertyName] = previousHandler;
      });
    };

    setSocketScriptState(script, 'loading');
    attach('load', settleLoaded);
    attach('error', settleFailed);
  });
}

function mpIsConfigured() {
  return typeof window.io === 'function';
}

/**
 * Fire-and-forget bootstrap used during page startup.
 * Consumers that need a ready socket should await mpEnsureReady().
 */
function mpInit(handlers = {}) {
  _handlers = handlers;
  void mpEnsureReady().catch(error => {
    if (_handlers.onError) _handlers.onError(error);
  });
}

function loadSocketScript() {
  if (mpIsConfigured()) return Promise.resolve();
  if (_socketLoadPromise) return _socketLoadPromise;

  let script = getSocketScriptElement();
  const existingState = script?.dataset?.socketIoClientState;
  if (!script || existingState === 'error' || existingState === 'timeout') {
    script = createSocketScriptElement();
  }

  _socketLoadPromise = watchSocketScript(script).then(() => {
    if (!mpIsConfigured()) throw buildSocketClientError();
  }).catch(error => {
    _socketLoadPromise = null;
    throw error;
  });

  return _socketLoadPromise;
}

/**
 * Resolves once the Socket.IO client bundle is available and the socket has been created.
 */
function mpEnsureReady() {
  return loadSocketScript().then(() => ensureSocket());
}

function ensureSocket() {
  if (_socket) {
    if (!_socket.connected) _socket.connect();
    return _socket;
  }
  if (!mpIsConfigured()) {
    throw buildSocketClientError();
  }

  _socket = window.io({
    autoConnect: true,
    path: SOCKET_IO_PATH,
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
  return mpEnsureReady().then(socket => new Promise((resolve, reject) => {
    socket.emit(eventName, payload, response => {
      if (!response || response.ok === false) {
        reject(new Error(response && response.error ? response.error : '通信に失敗しました。'));
        return;
      }
      resolve(response);
    });
  }));
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

function mpResetForTests() {
  _socket = null;
  _handlers = {};
  _session = null;
  _hasConnectedOnce = false;
  _resumeSessionOnConnect = false;
  _socketLoadPromise = null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SOCKET_IO_RUNTIME,
    SOCKET_IO_PATH,
    SOCKET_IO_LOAD_TIMEOUT_MS,
    SOCKET_IO_SCRIPT_SRC,
    mpEnsureReady,
    mpGetSession,
    mpInit,
    mpIsConfigured,
    mpResetForTests,
  };
}
