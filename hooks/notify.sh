#!/bin/bash

# Claude Codeのイベント時にmacOS通知を表示するスクリプト
# 通知本文にユーザーの最後の指示内容を含める

# --- 通知サウンド設定 ---
# 環境変数 CLAUDE_SOUND_NOTIFICATION / CLAUDE_SOUND_STOP で上書き可能
# 利用可能: Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink
SOUND_NOTIFICATION="${CLAUDE_SOUND_NOTIFICATION:-Glass}"
SOUND_STOP="${CLAUDE_SOUND_STOP:-Submarine}"

INPUT=$(cat)
EVENT=$(echo "$INPUT" | jq -r '.hook_event_name')

# Stopイベント: stop_hook_activeならスキップ（無限ループ防止）
if [ "$EVENT" = "Stop" ]; then
  ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active')
  if [ "$ACTIVE" = "true" ]; then
    exit 0
  fi
fi

# セッションIDからログファイルを特定
SID=$(echo "$INPUT" | jq -r '.session_id')
LOGFILE=$(ls ~/.claude/projects/*/"$SID".jsonl 2>/dev/null | head -1)

# ログファイルからユーザーの最後のテキスト入力を取得
# isMeta=true（スキル展開プロンプト等）の場合は [meta] プレフィックス付きで前のメッセージを表示
PROMPT="不明"
if [ -n "$LOGFILE" ]; then
  # 最新のユーザーメッセージがisMeta=trueか確認
  LATEST_IS_META=$(
    tail -r "$LOGFILE" \
    | grep '"type":"user"' \
    | jq -r 'select(
        ((.message.content | type) == "string" and (.message.content | length) > 0) or
        ((.message.content | type) == "array" and ([.message.content[] | select(.type == "text")] | length) > 0)
      ) | .isMeta // false' 2>/dev/null \
    | head -1
  )

  # isMeta以外のユーザー入力を取得
  USER_TEXT=$(
    tail -r "$LOGFILE" \
    | grep '"type":"user"' \
    | jq -r '
        select(.isMeta != true) |
        if (.message.content | type) == "string" then
          .message.content
        elif (.message.content | type) == "array" then
          [.message.content[] | select(.type == "text") | .text] | first // empty
        else
          empty
        end
      ' 2>/dev/null \
    | grep -v '^\[Request interrupted' \
    | head -1 \
    | head -c 100
  )

  if [ "$LATEST_IS_META" = "true" ]; then
    PROMPT="[meta] ${USER_TEXT}"
  else
    PROMPT="$USER_TEXT"
  fi
fi

# イベントに応じた通知タイトル/サブタイトル/サウンドを設定
if [ "$EVENT" = "Notification" ]; then
  TITLE="Claude Code"
  SUBTITLE=$(echo "$INPUT" | jq -r '.notification_type')
  SOUND="$SOUND_NOTIFICATION"
elif [ "$EVENT" = "Stop" ]; then
  TITLE="Claude Code 完了"
  SUBTITLE="応答が完了しました"
  SOUND="$SOUND_STOP"
else
  TITLE="Claude Code"
  SUBTITLE="$EVENT"
  SOUND="$SOUND_NOTIFICATION"
fi

# macOS通知を表示
osascript -e "display notification \"$PROMPT\" with title \"$TITLE\" subtitle \"$SUBTITLE\" sound name \"$SOUND\""
