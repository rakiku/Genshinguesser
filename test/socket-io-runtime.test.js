'use strict';

const http = require('node:http');
const test = require('node:test');
const assert = require('node:assert/strict');
const { setImmediate: waitForImmediate } = require('node:timers/promises');
const { Server } = require('socket.io');
const { app, SOCKET_IO_PATH } = require('../server');
const multiplayer = require('../guesser/multiplayer.js');

function installDomStubs({ appendChild } = {}) {
  const previousWindow = global.window;
  const previousDocument = global.document;
  const previousLocation = global.location;
  const scripts = [];

  global.window = {};
  global.document = {
    head: {
      appendChild: appendChild || (script => {
        scripts.push(script);
      }),
    },
    createElement: () => {
      const listeners = { load: [], error: [] };
      const script = {
        dataset: {},
        addEventListener(eventName, handler) {
          listeners[eventName]?.push(handler);
        },
        removeEventListener(eventName, handler) {
          listeners[eventName] = (listeners[eventName] || []).filter(entry => entry !== handler);
        },
        dispatch(eventName) {
          for (const handler of listeners[eventName] || []) handler();
        },
      };
      scripts.push(script);
      return script;
    },
    querySelector: selector => (
      selector === 'script[data-socket-io-client="true"]'
        ? scripts.find(script => script.dataset?.socketIoClient === 'true') || null
        : null
    ),
  };
  global.location = new URL('http://localhost:3000/guesser/index.html');

  return {
    scripts,
    restore() {
    global.window = previousWindow;
    global.document = previousDocument;
    global.location = previousLocation;
    },
  };
}

test('socket.io client bundle is served from the app server path', async t => {
  const testServer = http.createServer(app);
  const testIo = new Server(testServer, { path: SOCKET_IO_PATH });
  await new Promise(resolve => testServer.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise((resolve, reject) => {
      testIo.close();
      testServer.close(error => (error ? reject(error) : resolve()));
    });
  });

  const { port } = testServer.address();
  const response = await fetch(`http://127.0.0.1:${port}${SOCKET_IO_PATH}/socket.io.js`);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /socket\.io/i);
});

test('mpEnsureReady uses the same explicit socket path on the client', async () => {
  const { restore } = installDomStubs();
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

  restore();
  multiplayer.mpResetForTests();
});

test('mpInit reports a readable error instead of throwing when the client bundle is unavailable', async () => {
  const { restore } = installDomStubs({
    appendChild: script => {
      setImmediate(() => script.dispatch('error'));
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

  restore();
  multiplayer.mpResetForTests();
});

test('mpEnsureReady reuses the existing socket script tag instead of appending a duplicate', async () => {
  const { scripts, restore } = installDomStubs();
  multiplayer.mpResetForTests();

  const existingScript = global.document.createElement('script');
  existingScript.dataset.socketIoClient = 'true';
  global.document.head.appendChild(existingScript);

  const initialScriptCount = scripts.length;
  const readyPromise = multiplayer.mpEnsureReady();
  global.window.io = () => ({
    connected: true,
    on() {},
    connect() {},
  });
  existingScript.dispatch('load');

  await readyPromise;

  assert.equal(scripts.length, initialScriptCount);

  restore();
  multiplayer.mpResetForTests();
});
