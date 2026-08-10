# Supabase セットアップガイド — オンライン対戦モード

このドキュメントでは、Genshinguesser のオンライン対戦機能を有効にするために必要な Supabase プロジェクトの設定手順を説明します。

---

## 1. Supabase プロジェクトの作成

1. [https://supabase.com](https://supabase.com) にアクセスしてアカウントを作成またはログインする。
2. 「New project」をクリックしてプロジェクトを作成する。
3. プロジェクトが起動したら、**Project Settings → API** を開き、以下の値を控える。
   - `Project URL` (例: `https://abcdefghijklm.supabase.co`)
   - `anon public` キー

---

## 2. データベーステーブルの作成

Supabase ダッシュボードの **SQL Editor** を開き、以下の SQL を実行してください。

```sql
-- ルームテーブル
CREATE TABLE IF NOT EXISTS public.rooms (
  code          TEXT PRIMARY KEY,                       -- 6桁の数字ルームコード
  host_name     TEXT NOT NULL DEFAULT 'ホスト',
  guest_name    TEXT,
  genre         TEXT NOT NULL DEFAULT 'character',      -- 'character' | 'weapon'
  rarity_filter TEXT NOT NULL DEFAULT 'all',            -- 'all' | '4' | '5' | '45'
  answer_id     TEXT NOT NULL,                          -- 正解アイテムの ID
  status        TEXT NOT NULL DEFAULT 'waiting',        -- 'waiting' | 'playing' | 'finished'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '2 hours')
);

-- 期限切れルームを定期的に削除するインデックス（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS rooms_expires_at_idx ON public.rooms (expires_at);
CREATE INDEX IF NOT EXISTS rooms_status_idx ON public.rooms (status);
```

### 自動クリーンアップ（オプション）

期限切れルームを自動削除したい場合は、Supabase の **pg_cron** 拡張を使用します。

```sql
-- pg_cron 拡張を有効化（Supabase ダッシュボード Database → Extensions からも有効化可能）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1時間ごとに期限切れルームを削除
SELECT cron.schedule(
  'delete-expired-rooms',
  '0 * * * *',
  $$DELETE FROM public.rooms WHERE expires_at < now()$$
);
```

---

## 3. Row Level Security (RLS) の設定

セキュリティのため、RLS を有効にして適切なポリシーを設定します。

```sql
-- RLS を有効化
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがルームを読める（コードを知っている前提）
CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (true);

-- 全ユーザーがルームを作成できる
CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (true);

-- status が 'waiting' のルームのみ参加更新を許可
-- ホスト（作成者）が finished に更新することも許可
CREATE POLICY "rooms_update" ON public.rooms
  FOR UPDATE USING (true);
```

> **注意:** 上記は最小限のポリシーです。本番環境では、必要に応じて認証ユーザーのみ許可するなど、より厳格なポリシーを設定してください。

---

## 4. Realtime の有効化

Supabase ダッシュボードの **Database → Replication** を開き、`rooms` テーブルの **Realtime** を有効化してください。

または SQL で以下を実行します。

```sql
-- rooms テーブルの Realtime を有効化
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
```

---

## 5. フロントエンドへの設定適用

`guesser/index.html` 内の設定スタブを実際の値に書き換えます。

```html
<!-- Supabase 設定 -->
<script>
  window.SUPABASE_URL      = 'https://YOUR_PROJECT.supabase.co'; // ← ここを変更
  window.SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';                    // ← ここを変更
</script>
```

`YOUR_PROJECT.supabase.co` と `YOUR_ANON_KEY` を「1.」で控えた値に置き換えてください。

> **セキュリティ注意事項:**
> Supabase の `anon` キーはクライアントサイドで公開することを前提に設計されています。
> セキュリティは RLS（Row Level Security）ポリシーで担保します。
> ただし、`service_role` キーは絶対にフロントエンドに含めないでください。
>
> リポジトリを公開する場合は、実際の認証情報を含む状態でコミットしないよう注意してください。
> `guesser/index.html` の該当行を `.gitignore` の代わりに環境変数や別ファイルで管理することも検討できます。

---

## 6. ゲームフロー概要

```
ホスト                              Supabase               ゲスト
 │                                     │                     │
 │── rooms INSERT (status=waiting) ──▶ │                     │
 │◀─ ルームコード (6桁) を受け取る    │                     │
 │                                     │                     │
 │  ← ゲストがコードを入力 →         │                     │
 │                                     │ ◀── rooms UPDATE ──│
 │                                     │   (status=playing)  │
 │◀─ Realtime UPDATE 通知 ───────────  │                     │
 │                                     │                     │
 │── Broadcast 'init' ────────────────▶│────────────────────▶│
 │   (answer_id, players, turnIndex)   │                     │
 │                                     │                     │
 │  ゲーム開始（交互に回答）          │                     │
 │── Broadcast 'guess' ───────────────▶│────────────────────▶│
 │◀─ Broadcast 'guess' ───────────────│◀────────────────────│
 │                                     │                     │
 │  正解 / ギブアップ                 │                     │
 │── rooms UPDATE (status=finished) ──▶│                     │
```

### ブロードキャストイベント一覧

| type    | 説明                           | ペイロード                                        |
|---------|--------------------------------|---------------------------------------------------|
| `init`  | ゲーム開始情報をゲストに送信    | `{ players, turnIndex, answerId }`                |
| `guess` | 回答を相手に送信                | `{ guessId, actorIndex }`                         |
| `giveup`| ギブアップを相手に通知          | `{ actorIndex }`                                  |

---

## 7. ローカル開発での注意事項

- Supabase の Realtime は `localhost` でも動作します。ローカルでテストする際も本番の Supabase URL/キーを使用してください。
- ローカル Supabase CLI（`supabase start`）を使う場合は、ローカルの URL とアノンキーを設定してください。

---

## 8. トラブルシューティング

| 症状                         | 確認事項                                                    |
|------------------------------|-------------------------------------------------------------|
| 「設定が未完了」エラー       | `SUPABASE_URL` と `SUPABASE_ANON_KEY` が正しく設定されているか |
| ルームが見つからない         | RLS ポリシーで SELECT が許可されているか                    |
| 参加できない                 | `status` が `waiting` で期限内か                            |
| Realtime が届かない          | `rooms` テーブルで Realtime が有効になっているか            |
| ゲームが同期されない         | 両プレイヤーが同じ Supabase プロジェクトを使っているか      |
