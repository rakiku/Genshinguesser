'use strict';

const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { Server } = require('socket.io');
const { RoomManager } = require('./server/room-manager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
});

const manager = new RoomManager();
const timerIntervals = new Map();

app.use(express.static(__dirname));
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

function emitRoomState(room) {
  room.players.forEach(player => {
    if (!player || !player.socketId) return;
    io.to(player.socketId).emit('room:state', manager.buildSnapshot(room, player.key));
  });
}

function stopRoomTimer(roomCode) {
  const timer = timerIntervals.get(roomCode);
  if (timer) {
    clearInterval(timer);
    timerIntervals.delete(roomCode);
  }
}

function startRoomTimer(roomCode) {
  stopRoomTimer(roomCode);

  const tick = () => {
    const room = manager.getRoom(roomCode);
    if (!room || room.status !== 'playing') {
      stopRoomTimer(roomCode);
      return;
    }

    const remainingSeconds = manager.getRemainingSeconds(room);
    if (room.lastTimerSecond !== remainingSeconds) {
      room.lastTimerSecond = remainingSeconds;
      io.to(room.code).emit('game:timer', {
        roomCode: room.code,
        remainingSeconds,
        currentTurnIndex: room.currentTurnIndex,
      });
    }

    if (remainingSeconds > 0) return;

    const result = manager.timeoutTurn(room.code);
    if (!result) return;
    emitRoomState(result.room);
    io.to(room.code).emit('game:turn_timeout', {
      roomCode: room.code,
      actorIndex: result.entry.actorIndex,
      actorName: result.room.players[result.entry.actorIndex].name,
    });
  };

  timerIntervals.set(roomCode, setInterval(tick, 250));
  tick();
}

setInterval(() => {
  manager.cleanup();
}, 60 * 1000).unref();

io.on('connection', socket => {
  socket.on('room:create', (payload, ack = () => {}) => {
    try {
      const result = manager.createRoom(payload || {});
      manager.attachSocket(result.room.code, result.playerKey, socket.id);
      socket.data.roomCode = result.room.code;
      socket.data.playerKey = result.playerKey;
      socket.join(result.room.code);
      ack({
        ok: true,
        roomCode: result.room.code,
        playerKey: result.playerKey,
        snapshot: manager.buildSnapshot(result.room, result.playerKey),
      });
      emitRoomState(result.room);
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('room:join', (payload, ack = () => {}) => {
    try {
      const result = manager.joinRoom(payload || {});
      manager.attachSocket(result.room.code, result.playerKey, socket.id);
      socket.data.roomCode = result.room.code;
      socket.data.playerKey = result.playerKey;
      socket.join(result.room.code);
      ack({
        ok: true,
        roomCode: result.room.code,
        playerKey: result.playerKey,
        snapshot: manager.buildSnapshot(result.room, result.playerKey),
      });
      emitRoomState(result.room);
      if (result.room.status === 'playing') {
        io.to(result.room.code).emit('game:started', {
          roomCode: result.room.code,
          rules: { ...result.room.rules },
          currentTurnIndex: result.room.currentTurnIndex,
        });
        startRoomTimer(result.room.code);
      }
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('room:leave', (payload, ack = () => {}) => {
    try {
      const code = payload && payload.roomCode ? payload.roomCode : socket.data.roomCode;
      const playerKey = payload && payload.playerKey ? payload.playerKey : socket.data.playerKey;
      const result = manager.leaveRoom({ code, playerKey });
      if (result.deleted) {
        stopRoomTimer(code);
        ack({ ok: true, deleted: true });
        return;
      }
      if (result.room) {
        if (result.room.status === 'finished') stopRoomTimer(result.room.code);
        emitRoomState(result.room);
        if (result.room.status === 'finished') {
          io.to(result.room.code).emit('game:ended', manager.buildSnapshot(result.room, playerKey));
        }
      }
      ack({ ok: true, deleted: false });
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('game:guess', (payload, ack = () => {}) => {
    try {
      const result = manager.submitGuess({
        code: socket.data.roomCode,
        playerKey: socket.data.playerKey,
        guessId: payload && payload.guessId,
      });
      emitRoomState(result.room);
      io.to(result.room.code).emit('game:guess_result', {
        roomCode: result.room.code,
        entry: result.entry,
      });
      if (result.room.status === 'finished') {
        stopRoomTimer(result.room.code);
        io.to(result.room.code).emit('game:ended', manager.buildSnapshot(result.room, socket.data.playerKey));
      } else {
        startRoomTimer(result.room.code);
      }
      ack({ ok: true });
    } catch (error) {
      if (error.timeoutResult) {
        emitRoomState(error.timeoutResult.room);
        io.to(error.timeoutResult.room.code).emit('game:turn_timeout', {
          roomCode: error.timeoutResult.room.code,
          actorIndex: error.timeoutResult.entry.actorIndex,
          actorName: error.timeoutResult.room.players[error.timeoutResult.entry.actorIndex].name,
        });
        startRoomTimer(error.timeoutResult.room.code);
      }
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('game:giveup', (_payload, ack = () => {}) => {
    try {
      const room = manager.giveUp({
        code: socket.data.roomCode,
        playerKey: socket.data.playerKey,
      });
      stopRoomTimer(room.code);
      emitRoomState(room);
      io.to(room.code).emit('game:ended', manager.buildSnapshot(room, socket.data.playerKey));
      ack({ ok: true });
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('stamp:send', (payload, ack = () => {}) => {
    try {
      const result = manager.sendStamp({
        code: socket.data.roomCode,
        playerKey: socket.data.playerKey,
        stamp: payload && payload.stamp,
      });
      emitRoomState(result.room);
      io.to(result.room.code).emit('stamp:received', {
        roomCode: result.room.code,
        entry: result.entry,
      });
      ack({ ok: true });
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('game:update_rules', (payload, ack = () => {}) => {
    try {
      const room = manager.updateRules({
        code: socket.data.roomCode,
        playerKey: socket.data.playerKey,
        rules: payload && payload.rules,
      });
      emitRoomState(room);
      ack({ ok: true });
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('game:rematch_request', (_payload, ack = () => {}) => {
    try {
      const result = manager.requestRematch({
        code: socket.data.roomCode,
        playerKey: socket.data.playerKey,
      });
      emitRoomState(result.room);
      if (result.started) {
        io.to(result.room.code).emit('game:started', {
          roomCode: result.room.code,
          rules: { ...result.room.rules },
          currentTurnIndex: result.room.currentTurnIndex,
        });
        startRoomTimer(result.room.code);
      }
      ack({ ok: true, started: result.started });
    } catch (error) {
      ack({ ok: false, error: error.message });
    }
  });

  socket.on('disconnect', () => {
    const room = manager.disconnectSocket(socket.id);
    if (!room) return;
    emitRoomState(room);
  });
});

const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  server.listen(port, () => {
    console.log(`Genshinguesser server running at http://localhost:${port}`);
  });
}

module.exports = {
  app,
  server,
  io,
  manager,
};
