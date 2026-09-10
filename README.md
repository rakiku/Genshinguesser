# Genshinguesser

## ローカル起動

オンライン対戦は、このリポジトリ内の Socket.IO サーバーで動作します。

```bash
npm install
npm start
```

起動後に `http://localhost:3000/` を開いてください。

## テスト

```bash
npm test
```

## オンライン対戦メモ

- 2人用の交代ターン制です。
- 招待リンクは `guesser/index.html?room=XXXXXX` 形式です。
- 初期のターン時間は 60 秒です。
- 対戦終了後は同じルームで再戦でき、再戦前にターン時間を変更できます。

### `socket.io.js` が 404 になるとき

- オンライン対戦は GitHub Pages のような静的配信だけでは動かず、`npm start` で起動する Node + Socket.IO サーバーが必要です。
- ブラウザの Network で `/socket.io/socket.io.js` が 200 で返ること、Console に `Socket.IO クライアントが読み込まれていません` の未処理エラーが出ていないことを確認してください。
