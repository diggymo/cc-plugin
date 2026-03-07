# claude-notify-plugin

Claude Code の Notification / Stop イベント時に macOS 通知を表示するプラグイン。

通知本文にユーザーの最後の指示内容を表示するので、複数セッション稼働中でもどのタスクが完了したか分かります。

## 機能

- **Notification イベント**: Claude が確認を求めている時に通知
- **Stop イベント**: Claude の応答完了時に通知
- イベントごとに通知音を変更可能
- スキル実行時（`/frontend-design` 等）は展開プロンプトをスキップし、`[meta] {直前の入力}` を表示

## 前提条件

- macOS
- `jq` がインストール済み（`brew install jq`）

## インストール

```bash
# 1. マーケットプレイスとしてリポジトリを追加
claude plugin marketplace add diggymo/cc-plugin

# 2. プラグインをインストール
claude plugin install notify
```

## 通知音の変更

`hooks/notify.sh` の先頭にある変数を編集してください。

```bash
SOUND_NOTIFICATION="Glass"    # Notification イベント時
SOUND_STOP="Submarine"        # Stop（完了）イベント時
```

利用可能なサウンド:

`Basso` `Blow` `Bottle` `Frog` `Funk` `Glass` `Hero` `Morse` `Ping` `Pop` `Purr` `Sosumi` `Submarine` `Tink`

## ライセンス

MIT
