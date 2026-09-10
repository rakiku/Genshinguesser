'use strict';

const crypto = require('node:crypto');
const {
  getPool,
  getHintFields,
  findItemById,
  compareItem,
} = require('../guesser/game-logic.js');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_RULES = Object.freeze({
  turnTimeSeconds: 60,
});
const ALLOWED_STAMPS = Object.freeze([
  '💭 考え中…',
  '🎯 分かった！',
  '😱 惜しい！',
  '👑 GG!',
]);

class RoomManager {
  constructor(options = {}) {
    this.rooms = new Map();
    this.now = options.now || (() => Date.now());
    this.random = options.random || Math.random;
    this.roomTtlMs = options.roomTtlMs || 60 * 60 * 1000;
    this.finishedRoomTtlMs = options.finishedRoomTtlMs || 15 * 60 * 1000;
    this._eventId = 1;
  }

  createRoom({ hostName, genre, rarityFilter, rules }) {
    const room = {
      code: this.generateRoomCode(),
      genre: genre === 'weapon' ? 'weapon' : 'character',
      rarityFilter: ['4', '5', '45'].includes(rarityFilter) ? rarityFilter : 'all',
      rules: this.normalizeRules(rules),
      status: 'waiting',
      players: [
        this.createPlayer(0, hostName || 'プレイヤー1'),
        this.createEmptySeat(1),
      ],
      currentTurnIndex: 0,
      turnEndsAt: null,
      answerId: null,
      history: [],
      stamps: [],
      winnerIndex: null,
      createdAt: this.now(),
      updatedAt: this.now(),
      rematchReadySeats: [],
      lastAction: { id: this.nextEventId(), type: 'room_created', at: this.now() },
      lastTimerSecond: null,
    };

    this.rooms.set(room.code, room);
    return {
      room,
      playerKey: room.players[0].key,
      seat: 0,
    };
  }

  joinRoom({ code, guestName }) {
    const room = this.getRoom(code);
    if (!room) throw new Error('ルームが見つかりません。コードを確認してください。');

    if (room.status === 'finished') {
      throw new Error('このルームの対戦は終了しています。');
    }

    if (room.players[1].key) {
      throw new Error('このルームはすでに満員です。');
    }

    const guest = this.createPlayer(1, guestName || 'プレイヤー2');
    room.players[1] = guest;
    this.startGame(room);
    return {
      room,
      playerKey: guest.key,
      seat: 1,
      rejoined: false,
    };
  }

  reconnectRoom({ code, playerKey, expectedSeat }) {
    const room = this.getRoom(code);
    if (!room) throw new Error('ルームが見つかりません。コードを確認してください。');

    const existingSeat = playerKey ? room.players.findIndex(player => player && player.key === playerKey) : -1;
    if (existingSeat < 0) {
      throw new Error('再接続セッションの復元に失敗しました。もう一度ルームに入り直してください。');
    }
    if (Number.isInteger(expectedSeat) && existingSeat !== expectedSeat) {
      throw new Error('再接続セッションの座席確認に失敗しました。もう一度入り直してください。');
    }

    const player = room.players[existingSeat];
    player.connected = true;
    player.lastSeenAt = this.now();
    this.touchRoom(room, 'room_rejoined');
    return { room, playerKey: player.key, seat: existingSeat, rejoined: true };
  }

  attachSocket(code, playerKey, socketId) {
    const room = this.getRoom(code);
    if (!room) return null;
    const player = room.players.find(entry => entry && entry.key === playerKey);
    if (!player) return null;
    player.socketId = socketId;
    player.connected = true;
    player.lastSeenAt = this.now();
    room.updatedAt = this.now();
    return room;
  }

  disconnectSocket(socketId) {
    for (const room of this.rooms.values()) {
      for (const player of room.players) {
        if (player && player.socketId === socketId) {
          player.socketId = null;
          player.connected = false;
          player.lastSeenAt = this.now();
          room.updatedAt = this.now();
          room.lastAction = { id: this.nextEventId(), type: 'player_disconnected', at: this.now() };
          return room;
        }
      }
    }
    return null;
  }

  leaveRoom({ code, playerKey }) {
    const room = this.getRoom(code);
    if (!room) return { deleted: false, room: null };

    const seat = room.players.findIndex(player => player && player.key === playerKey);
    if (seat < 0) return { deleted: false, room };

    if (room.status === 'waiting') {
      this.rooms.delete(room.code);
      return { deleted: true, room: null };
    }

    room.players[seat].connected = false;
    room.players[seat].socketId = null;
    if (room.status === 'playing') {
      this.finishGame(room, {
        winnerIndex: this.findOpponentSeat(seat),
        reason: 'left',
        actorIndex: seat,
      });
    } else {
      this.touchRoom(room, 'player_left');
    }

    return { deleted: false, room };
  }

  updateRules({ code, playerKey, rules }) {
    const room = this.requireRoom(code);
    this.requirePlayer(room, playerKey);
    if (room.status === 'playing') {
      throw new Error('対戦中はルールを変更できません。');
    }

    room.rules = this.normalizeRules({ ...room.rules, ...rules });
    room.rematchReadySeats = [];
    room.lastAction = {
      id: this.nextEventId(),
      type: 'rules_updated',
      at: this.now(),
      rules: { ...room.rules },
    };
    room.updatedAt = this.now();
    return room;
  }

  requestRematch({ code, playerKey }) {
    const room = this.requireRoom(code);
    const seat = this.requirePlayerSeat(room, playerKey);
    if (room.status !== 'finished') {
      throw new Error('対戦終了後に再戦できます。');
    }

    if (!room.players.every(player => player && player.key)) {
      throw new Error('2人揃ってから再戦してください。');
    }

    if (!room.rematchReadySeats.includes(seat)) {
      room.rematchReadySeats.push(seat);
    }

    const started = room.rematchReadySeats.length === 2;
    if (started) {
      this.startGame(room, true);
      room.lastAction = {
        id: this.nextEventId(),
        type: 'rematch_started',
        at: this.now(),
        rules: { ...room.rules },
      };
    } else {
      room.lastAction = {
        id: this.nextEventId(),
        type: 'rematch_requested',
        at: this.now(),
        actorIndex: seat,
      };
      room.updatedAt = this.now();
    }

    return { room, started };
  }

  submitGuess({ code, playerKey, guessId }) {
    const room = this.requireRoom(code);
    if (room.status !== 'playing') {
      throw new Error('現在は対戦中ではありません。');
    }

    const seat = this.requirePlayerSeat(room, playerKey);
    if (seat !== room.currentTurnIndex) {
      throw new Error('現在のターンではありません。');
    }

    if (this.getRemainingSeconds(room) <= 0) {
      const timeoutResult = this.timeoutTurn(code);
      const error = new Error('時間切れです。');
      error.timeoutResult = timeoutResult;
      throw error;
    }

    const pool = getPool(room.genre, room.rarityFilter);
    const guessItem = pool.find(item => item.id === guessId);
    if (!guessItem) {
      throw new Error('不正な候補です。');
    }

    if (room.history.some(entry => entry.type === 'guess' && entry.actorIndex === seat && entry.guessId === guessId)) {
      throw new Error('その候補はすでに入力済みです。');
    }

    const answerItem = findItemById(room.genre, room.answerId, room.rarityFilter);
    if (!answerItem) {
      throw new Error('正解データが見つかりません。');
    }

    const entry = {
      id: this.nextEventId(),
      type: 'guess',
      actorIndex: seat,
      guessId: guessItem.id,
      results: compareItem(guessItem, answerItem, getHintFields(room.genre)),
      correct: guessItem.id === room.answerId,
      createdAt: this.now(),
    };

    room.history.push(entry);
    room.rematchReadySeats = [];

    if (entry.correct) {
      this.finishGame(room, {
        winnerIndex: seat,
        reason: 'correct',
        actorIndex: seat,
      });
    } else {
      this.advanceTurn(room);
      room.lastAction = {
        id: this.nextEventId(),
        type: 'guess_submitted',
        at: this.now(),
        actorIndex: seat,
      };
      room.updatedAt = this.now();
    }

    return { room, entry };
  }

  timeoutTurn(code) {
    const room = this.requireRoom(code);
    if (room.status !== 'playing') return null;
    if (this.getRemainingSeconds(room) > 0) return null;

    const actorIndex = room.currentTurnIndex;
    const entry = {
      id: this.nextEventId(),
      type: 'timeout',
      actorIndex,
      createdAt: this.now(),
      label: '時間切れ',
    };
    room.history.push(entry);
    room.rematchReadySeats = [];
    this.advanceTurn(room);
    room.lastAction = {
      id: this.nextEventId(),
      type: 'turn_timeout',
      at: this.now(),
      actorIndex,
    };
    room.updatedAt = this.now();
    return { room, entry };
  }

  sendStamp({ code, playerKey, stamp }) {
    const room = this.requireRoom(code);
    const seat = this.requirePlayerSeat(room, playerKey);
    if (!ALLOWED_STAMPS.includes(stamp)) {
      throw new Error('無効なスタンプです。');
    }

    const entry = {
      id: this.nextEventId(),
      actorIndex: seat,
      stamp,
      createdAt: this.now(),
    };
    room.stamps.push(entry);
    room.stamps = room.stamps.slice(-30);
    room.lastAction = {
      id: this.nextEventId(),
      type: 'stamp_sent',
      at: this.now(),
      actorIndex: seat,
      stamp,
    };
    room.updatedAt = this.now();
    return { room, entry };
  }

  giveUp({ code, playerKey }) {
    const room = this.requireRoom(code);
    const seat = this.requirePlayerSeat(room, playerKey);
    if (room.status !== 'playing') {
      throw new Error('現在は対戦中ではありません。');
    }

    this.finishGame(room, {
      winnerIndex: this.findOpponentSeat(seat),
      reason: 'giveup',
      actorIndex: seat,
    });
    return room;
  }

  cleanup() {
    const now = this.now();
    const evictedRoomCodes = [];
    for (const room of this.rooms.values()) {
      const ttl = room.status === 'finished' ? this.finishedRoomTtlMs : this.roomTtlMs;
      if (now - room.updatedAt > ttl) {
        evictedRoomCodes.push(room.code);
        this.rooms.delete(room.code);
      }
    }
    return evictedRoomCodes;
  }

  buildSnapshot(code, playerKey) {
    const room = typeof code === 'string' ? this.requireRoom(code) : code;
    const selfSeat = room.players.findIndex(player => player && player.key === playerKey);
    return {
      roomCode: room.code,
      status: room.status,
      genre: room.genre,
      rarityFilter: room.rarityFilter,
      rules: { ...room.rules },
      players: room.players.map((player, seat) => ({
        seat,
        name: player && player.key ? player.name : `プレイヤー${seat + 1}`,
        connected: !!(player && player.connected),
        occupied: !!(player && player.key),
        isSelf: seat === selfSeat,
      })),
      selfSeat,
      currentTurnIndex: room.currentTurnIndex,
      remainingSeconds: room.status === 'playing' ? this.getRemainingSeconds(room) : null,
      history: room.history.map(entry => ({
        ...entry,
        actorName: room.players[entry.actorIndex] ? room.players[entry.actorIndex].name : `プレイヤー${entry.actorIndex + 1}`,
      })),
      stamps: room.stamps.map(entry => ({
        ...entry,
        actorName: room.players[entry.actorIndex] ? room.players[entry.actorIndex].name : `プレイヤー${entry.actorIndex + 1}`,
      })),
      winnerIndex: room.winnerIndex,
      answerId: room.status === 'finished' ? room.answerId : null,
      rematch: {
        readySeats: [...room.rematchReadySeats],
        rules: { ...room.rules },
      },
      lastAction: room.lastAction,
    };
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(String(code).trim().toUpperCase()) || null;
  }

  getRemainingSeconds(room) {
    if (!room.turnEndsAt) return 0;
    return Math.max(0, Math.ceil((room.turnEndsAt - this.now()) / 1000));
  }

  startGame(room, isRematch = false) {
    const pool = getPool(room.genre, room.rarityFilter);
    if (!pool.length) throw new Error('出題できるデータがありません。');

    const answerItem = pool[Math.floor(this.random() * pool.length)];
    room.answerId = answerItem.id;
    room.status = 'playing';
    room.currentTurnIndex = 0;
    room.turnEndsAt = this.now() + (room.rules.turnTimeSeconds * 1000);
    room.history = [];
    room.stamps = [];
    room.winnerIndex = null;
    room.rematchReadySeats = [];
    room.updatedAt = this.now();
    room.lastTimerSecond = null;
    room.lastAction = {
      id: this.nextEventId(),
      type: isRematch ? 'rematch_started' : 'game_started',
      at: this.now(),
      rules: { ...room.rules },
    };
  }

  advanceTurn(room) {
    room.currentTurnIndex = room.currentTurnIndex === 0 ? 1 : 0;
    room.turnEndsAt = this.now() + (room.rules.turnTimeSeconds * 1000);
    room.lastTimerSecond = null;
  }

  finishGame(room, { winnerIndex, reason, actorIndex }) {
    room.status = 'finished';
    room.winnerIndex = winnerIndex;
    room.turnEndsAt = null;
    room.lastTimerSecond = null;
    room.updatedAt = this.now();
    room.lastAction = {
      id: this.nextEventId(),
      type: 'game_ended',
      at: this.now(),
      reason,
      winnerIndex,
      actorIndex,
      answerId: room.answerId,
    };
  }

  generateRoomCode() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      let code = '';
      for (let index = 0; index < 6; index += 1) {
        const charIndex = Math.floor(this.random() * CODE_ALPHABET.length);
        code += CODE_ALPHABET[charIndex];
      }
      if (!this.rooms.has(code)) return code;
    }
    return crypto.randomUUID().replace(/-/g, '').slice(0, 6).toUpperCase();
  }

  normalizeRules(rules) {
    const turnTimeRaw = Number(rules && rules.turnTimeSeconds);
    const turnTimeSeconds = Number.isFinite(turnTimeRaw)
      ? Math.min(180, Math.max(15, Math.round(turnTimeRaw)))
      : DEFAULT_RULES.turnTimeSeconds;

    return { turnTimeSeconds };
  }

  createPlayer(seat, name) {
    return {
      seat,
      name: this.normalizePlayerName(name, `プレイヤー${seat + 1}`),
      key: crypto.randomUUID(),
      socketId: null,
      connected: true,
      lastSeenAt: this.now(),
    };
  }

  createEmptySeat(seat) {
    return {
      seat,
      name: `プレイヤー${seat + 1}`,
      key: null,
      socketId: null,
      connected: false,
      lastSeenAt: null,
    };
  }

  normalizePlayerName(name, fallback) {
    const normalized = String(name || '').trim().replace(/\s+/g, ' ');
    if (!normalized) return fallback;
    return normalized.slice(0, 20);
  }

  touchRoom(room, actionType) {
    room.updatedAt = this.now();
    room.lastAction = { id: this.nextEventId(), type: actionType, at: this.now() };
  }

  requireRoom(code) {
    const room = this.getRoom(code);
    if (!room) throw new Error('ルームが見つかりません。');
    return room;
  }

  requirePlayer(room, playerKey) {
    const player = room.players.find(entry => entry && entry.key === playerKey);
    if (!player) throw new Error('プレイヤー情報が見つかりません。');
    return player;
  }

  requirePlayerSeat(room, playerKey) {
    const seat = room.players.findIndex(entry => entry && entry.key === playerKey);
    if (seat < 0) throw new Error('プレイヤー情報が見つかりません。');
    return seat;
  }

  findOpponentSeat(seat) {
    return seat === 0 ? 1 : 0;
  }

  nextEventId() {
    return this._eventId++;
  }
}

module.exports = {
  RoomManager,
  ALLOWED_STAMPS,
  DEFAULT_RULES,
};
