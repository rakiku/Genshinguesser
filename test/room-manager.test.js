'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../server/room-manager');
const gameLogic = require('../guesser/game-logic.js');
const data = require('../guesser/data.js');

function createClock(start = 0) {
  let now = start;
  return {
    now: () => now,
    advance: milliseconds => {
      now += milliseconds;
    },
  };
}

test('room creation and join starts a turn-based match', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'ホスト', genre: 'character', rules: { turnTimeSeconds: 60 } });

  assert.match(created.room.code, /^[A-Z0-9]{6}$/);
  assert.equal(created.room.status, 'waiting');

  const joined = manager.joinRoom({ code: created.room.code, guestName: 'ゲスト' });
  assert.equal(joined.room.status, 'playing');
  assert.equal(joined.room.currentTurnIndex, 0);
  assert.equal(joined.room.rules.turnTimeSeconds, 60);
  assert.equal(joined.room.history.length, 0);
  assert.ok(joined.room.answerId);
});

test('out-of-turn guesses are rejected', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character' });
  const joined = manager.joinRoom({ code: created.room.code, guestName: 'P2' });

  assert.throws(() => {
    manager.submitGuess({
      code: created.room.code,
      playerKey: joined.playerKey,
      guessId: joined.room.answerId,
    });
  }, /現在のターンではありません/);
});

test('timeouts create a visible history entry and advance the turn', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character', rules: { turnTimeSeconds: 60 } });
  manager.joinRoom({ code: created.room.code, guestName: 'P2' });

  clock.advance(60_000);
  const result = manager.timeoutTurn(created.room.code);
  assert.equal(result.entry.type, 'timeout');
  assert.equal(result.entry.label, '時間切れ');
  assert.equal(result.room.currentTurnIndex, 1);
  assert.equal(result.room.history.length, 1);
});

test('correct guess ends the game and the acting player wins', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character' });
  const joined = manager.joinRoom({ code: created.room.code, guestName: 'P2' });

  const wrongGuess = joined.room.history.find(entry => entry.type === 'guess');
  assert.equal(wrongGuess, undefined);

  const result = manager.submitGuess({
    code: created.room.code,
    playerKey: created.playerKey,
    guessId: joined.room.answerId,
  });

  assert.equal(result.entry.correct, true);
  assert.equal(result.room.status, 'finished');
  assert.equal(result.room.winnerIndex, 0);
});

test('rematch allows changing turn time before restarting', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character' });
  const joined = manager.joinRoom({ code: created.room.code, guestName: 'P2' });

  manager.submitGuess({
    code: created.room.code,
    playerKey: created.playerKey,
    guessId: joined.room.answerId,
  });

  manager.updateRules({
    code: created.room.code,
    playerKey: created.playerKey,
    rules: { turnTimeSeconds: 90 },
  });

  const firstReady = manager.requestRematch({ code: created.room.code, playerKey: created.playerKey });
  assert.equal(firstReady.started, false);

  const secondReady = manager.requestRematch({ code: created.room.code, playerKey: joined.playerKey });
  assert.equal(secondReady.started, true);
  assert.equal(secondReady.room.status, 'playing');
  assert.equal(secondReady.room.rules.turnTimeSeconds, 90);
  assert.equal(secondReady.room.history.length, 0);
});

test('rarity and release-version hints use directional arrows', () => {
  const amber = data.CHARACTERS.find(character => character.name === 'アンバー');
  const jean = data.CHARACTERS.find(character => character.name === 'ジン');
  const diona = data.CHARACTERS.find(character => character.name === 'ディオナ');

  const rarityResult = gameLogic.compareItem(amber, jean, [{ key: 'rarity', type: 'numeric' }]);
  assert.deepEqual(rarityResult.rarity, { result: 'gray', arrow: 'up' });

  const versionResult = gameLogic.compareItem(amber, diona, [{ key: 'releaseVersionNum', type: 'numeric' }]);
  assert.deepEqual(versionResult.releaseVersionNum, { result: 'gray', arrow: 'up' });
});

test('release version parsing handles Luna labels', () => {
  assert.equal(data.parseReleaseVersion('Luna III (6.2)'), 6.2);
  assert.equal(data.parseReleaseVersion('7.0'), 7);
});

test('rejoin with expected seat fails fast for stale player keys', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character' });

  assert.throws(() => {
    manager.reconnectRoom({
      code: created.room.code,
      playerKey: 'stale-key',
      expectedSeat: 0,
    });
  }, /再接続セッションの復元に失敗しました/);
});

test('guest rejoin with expected seat also fails fast for stale player keys', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character' });
  manager.joinRoom({ code: created.room.code, guestName: 'P2' });

  assert.throws(() => {
    manager.reconnectRoom({
      code: created.room.code,
      playerKey: 'stale-key',
      expectedSeat: 1,
    });
  }, /再接続セッションの復元に失敗しました/);
});

test('rejoin rejects seat mismatch even with a valid player key', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character' });

  assert.throws(() => {
    manager.reconnectRoom({
      code: created.room.code,
      playerKey: created.playerKey,
      expectedSeat: 1,
    });
  }, /座席確認に失敗しました/);
});

test('late guess returns timeout result after the turn expires', () => {
  const clock = createClock(1_000);
  const manager = new RoomManager({ now: clock.now, random: () => 0 });
  const created = manager.createRoom({ hostName: 'P1', genre: 'character', rules: { turnTimeSeconds: 60 } });
  manager.joinRoom({ code: created.room.code, guestName: 'P2' });
  clock.advance(60_000);

  let thrownError = null;
  try {
    manager.submitGuess({
      code: created.room.code,
      playerKey: created.playerKey,
      guessId: 'ジン',
    });
  } catch (error) {
    thrownError = error;
  }

  assert.ok(thrownError);
  assert.equal(thrownError.message, '時間切れです。');
  assert.equal(thrownError.timeoutResult.entry.type, 'timeout');
  assert.equal(thrownError.timeoutResult.room.currentTurnIndex, 1);
});
