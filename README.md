# cc-plugin

Claude Code 用プラグイン集。

## インストール

```bash
# マーケットプレイスとしてリポジトリを追加
claude plugin marketplace add diggymo/cc-plugin

# 使いたいプラグインをインストール
claude plugin install notify
claude plugin install grep-sessions
```

## プラグイン一覧

### [notify](./plugins/notify/)

macOS 通知で Claude Code のイベント（Notification / Stop）を知らせるフックプラグイン。

- 応答完了時や確認要求時に macOS 通知を表示
- 通知本文にユーザーの最後の指示内容を表示（複数セッション稼働中でも識別可能）
- イベントごとに通知音をカスタマイズ可能

### [grep-sessions](./plugins/grep-sessions/)

Claude Code の全会話履歴からキーワード検索するスキルプラグイン。

- `/grep-sessions {キーワード}` で過去の会話を横断検索
- セッション ID ごとにマッチ箇所と直近のユーザー入力を一覧表示
- プロジェクト指定・件数制限のオプション付き

## ライセンス

MIT
