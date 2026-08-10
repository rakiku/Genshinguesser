/**
 * multiplayer.js — Supabase オンライン対戦モジュール
 *
 * 依存: Supabase JS SDK (CDN から読み込み)
 * 設定: index.html で window.SUPABASE_URL / window.SUPABASE_ANON_KEY を定義する。
 *
 * 公開 API:
 *   mpIsConfigured()
 *   mpGetClient()
 *   mpGenerateCode()        → 6桁数字文字列
 *   mpCreateRoom(opts)      → Promise<room>
 *   mpJoinRoom(code, name)  → Promise<room>
 *   mpSubscribeToRoom(code, { onRoomUpdate, onGameEvent }) → channel
 *   mpBroadcast(type, data)
 *   mpUnsubscribe()
 *   mpMarkFinished(code)
 */

'use strict';

// ---------------------------------------------------------------------------
// Supabase クライアント
// ---------------------------------------------------------------------------

let _client = null;
let _channel = null;

function mpIsConfigured() {
  return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY &&
    window.SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co');
}

function mpGetClient() {
  if (_client) return _client;
  if (!mpIsConfigured()) {
    throw new Error(
      'Supabase の設定が未完了です。\n' +
      'index.html 内の SUPABASE_URL と SUPABASE_ANON_KEY を正しい値に変更してください。\n' +
      '詳細は SUPABASE_SETUP.md を参照してください。'
    );
  }
  if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
    throw new Error('Supabase JS SDK が読み込まれていません。');
  }
  _client = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  return _client;
}

// ---------------------------------------------------------------------------
// 6桁ルームコード生成
// ---------------------------------------------------------------------------

function mpGenerateCode() {
  const buf = new Uint32Array(1);
  window.crypto.getRandomValues(buf);
  // 100000–999999 の一様乱数
  return String(100000 + (buf[0] % 900000));
}

// ---------------------------------------------------------------------------
// ルーム作成
// ---------------------------------------------------------------------------

/**
 * @param {{ genre: string, rarityFilter: string, hostName: string, answerId: string }} opts
 * @returns {Promise<{code:string, host_name:string, genre:string, rarity_filter:string, answer_id:string, status:string}>}
 */
async function mpCreateRoom({ genre, rarityFilter, hostName, answerId }) {
  const client = mpGetClient();
  const code = mpGenerateCode();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const { data, error } = await client
    .from('rooms')
    .insert({
      code,
      host_name: hostName,
      guest_name: null,
      genre,
      rarity_filter: rarityFilter,
      answer_id: answerId,
      status: 'waiting',
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) throw new Error('ルームの作成に失敗しました: ' + error.message);
  return data;
}

// ---------------------------------------------------------------------------
// ルーム参加
// ---------------------------------------------------------------------------

/**
 * @param {string} code  6桁ルームコード
 * @param {string} guestName
 * @returns {Promise<room>}
 */
async function mpJoinRoom(code, guestName) {
  const client = mpGetClient();

  // guest_name をセット & status を playing に更新（waiting かつ有効期限内のみ）
  const { data, error } = await client
    .from('rooms')
    .update({ guest_name: guestName, status: 'playing' })
    .eq('code', code)
    .eq('status', 'waiting')
    .gt('expires_at', new Date().toISOString())
    .select()
    .single();

  if (!data || error) {
    // 失敗原因を詳しく取得
    const { data: room } = await client
      .from('rooms')
      .select('status, expires_at')
      .eq('code', code)
      .maybeSingle();

    if (!room) throw new Error('ルームが見つかりません。コードを確認してください。');
    if (new Date(room.expires_at) < new Date()) throw new Error('このルームは有効期限切れです。');
    if (room.status !== 'waiting') throw new Error('このルームはすでに満員か終了しています。');
    throw new Error('ルームへの参加に失敗しました。しばらくしてから再試行してください。');
  }

  return data;
}

// ---------------------------------------------------------------------------
// Realtime 購読
// ---------------------------------------------------------------------------

/**
 * ルームの DB 変更とゲームイベント（Broadcast）の両方を購読する。
 * @param {string} code
 * @param {{ onRoomUpdate?: Function, onGameEvent?: Function }} handlers
 * @returns {RealtimeChannel}
 */
function mpSubscribeToRoom(code, { onRoomUpdate, onGameEvent } = {}) {
  const client = mpGetClient();

  // 既存チャンネルをクリーンアップ
  if (_channel) {
    try { client.removeChannel(_channel); } catch (e) { /* noop */ }
    _channel = null;
  }

  _channel = client
    .channel(`room:${code}`, { config: { broadcast: { self: false } } })
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
      payload => { if (onRoomUpdate) onRoomUpdate(payload.new); }
    )
    .on('broadcast', { event: 'game' }, payload => {
      if (onGameEvent) onGameEvent(payload.payload);
    })
    .subscribe();

  return _channel;
}

// ---------------------------------------------------------------------------
// Broadcast 送信
// ---------------------------------------------------------------------------

/**
 * 相手にゲームイベントを送信する。
 * @param {string} type  'init' | 'guess' | 'giveup'
 * @param {Object} data
 */
function mpBroadcast(type, data) {
  if (!_channel) return;
  _channel.send({
    type: 'broadcast',
    event: 'game',
    payload: { ...data, type },  // type last — prevents data from overriding the event type
  });
}

// ---------------------------------------------------------------------------
// クリーンアップ
// ---------------------------------------------------------------------------

function mpUnsubscribe() {
  if (_channel) {
    try { mpGetClient().removeChannel(_channel); } catch (e) { /* noop */ }
    _channel = null;
  }
}

/** ルームを finished にマーク（ページ離脱時など） */
async function mpMarkFinished(code) {
  if (!code) return;
  try {
    await mpGetClient()
      .from('rooms')
      .update({ status: 'finished' })
      .eq('code', code);
  } catch (e) { /* noop */ }
}
