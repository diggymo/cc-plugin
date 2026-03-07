#!/bin/bash

# Claude Codeのイベント時にmacOS通知を表示するスクリプト
# 通知本文にユーザーの最後の指示内容を含める

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

# ログファイルからユーザーの最後の指示を取得
PROMPT="不明"
if [ -n "$LOGFILE" ]; then
  PROMPT=$(
    tail -r "$LOGFILE" \
    | grep -m1 '"type":"user"' \
    | jq -r '
        if (.message.content | type) == "string" then
          .message.content
        elif (.message.content | type) == "array" then
          [.message.content[] | select(.type == "text") | .text] | first // ""
        else
          ""
        end
      ' 2>/dev/null \
    | head -c 100
  )
fi

# イベントに応じた通知タイトル/サブタイトルを設定
if [ "$EVENT" = "Notification" ]; then
  TITLE="Claude Code"
  SUBTITLE=$(echo "$INPUT" | jq -r '.notification_type')
elif [ "$EVENT" = "Stop" ]; then
  TITLE="Claude Code 完了"
  SUBTITLE="応答が完了しました"
else
  TITLE="Claude Code"
  SUBTITLE="$EVENT"
fi

# macOS通知を表示
osascript -e "display notification \"$PROMPT\" with title \"$TITLE\" subtitle \"$SUBTITLE\" sound name \"Glass\""
