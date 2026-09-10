'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { setImmediate: waitForImmediate } = require('node:timers/promises');
const { server, SOCKET_IO_PATH } = require('../server');
const multiplayer = require('../guesser/multiplayer.js');

function installDomStubs({ appendChild } = {}) {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const previousLocation = global.location;

  global.window = {};
  global.document = {
    head: {
      appendChild: appendChild || (() => {}),
    },
    createElement: () => ({
      dataset: {},
    }),
  };
  global.location = new URL('http://localhost:3000/guesser/index.html');

  return () => {
    global.window = previousWindow;
    global.document = previousDocument;
    global.location = previousLocation;
  };
}

test('socket.io client bundle is served from the app server path', async t => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  });

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${SOCKET_IO_PATH}/socket.io.js`);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /socket\.io/i);
});

test('mpEnsureReady uses the same explicit socket path on the client', async () => {
  const restoreGlobals = installDomStubs();
  multiplayer.mpResetForTests();

  let receivedOptions = null;
  global.window.io = options => {
    receivedOptions = options;
    return {
      connected: true,
      on() {},
      connect() {},
    };
  };

  await multiplayer.mpEnsureReady();

  assert.equal(receivedOptions.path, SOCKET_IO_PATH);
  assert.deepEqual(receivedOptions.transports, ['websocket', 'polling']);

  restoreGlobals();
  multiplayer.mpResetForTests();
});

test('mpInit reports a readable error instead of throwing when the client bundle is unavailable', async () => {
  const restoreGlobals = installDomStubs({
    appendChild: script => {
      script.onerror();
    },
  });
  multiplayer.mpResetForTests();

  const errors = [];

  assert.doesNotThrow(() => {
    multiplayer.mpInit({
      onError: error => errors.push(error),
    });
  });

  await waitForImmediate();

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /\/socket\.io\/socket\.io\.js/);

  restoreGlobals();
  multiplayer.mpResetForTests();
});
