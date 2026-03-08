#!/usr/bin/env python3
"""Claude Code会話履歴のキーワード検索スクリプト"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path


def extract_text(content):
    """message.contentからテキストを抽出"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        texts = []
        for c in content:
            if isinstance(c, dict):
                t = c.get("text", "")
                if t:
                    texts.append(t)
        return " ".join(texts)
    return ""


def search_sessions(keyword, projects_dir, project_filter=None, limit=20):
    """全JONLファイルからキーワードを検索し、sessionId別に結果を返す"""
    projects_path = Path(projects_dir)
    if not projects_path.exists():
        print("エラー: ~/.claude/projects/ が見つかりません", file=sys.stderr)
        return

    # プロジェクトフィルタ
    if project_filter:
        search_dirs = [projects_path / project_filter]
    else:
        search_dirs = [projects_path]

    # sessionIdごとの情報を収集
    # { sessionId: { "files": set(), "matches": [], "user_messages": [] } }
    sessions = defaultdict(lambda: {"files": set(), "matches": [], "user_messages": []})

    pattern = re.compile(re.escape(keyword), re.IGNORECASE)

    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for jsonl_file in search_dir.rglob("*.jsonl"):
            # subagentsディレクトリも含める
            file_has_match = False
            try:
                with open(jsonl_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        # 高速フィルタ: 行にキーワードが含まれるかチェック
                        if keyword.lower() not in line.lower():
                            # キーワードを含まない行でもユーザーメッセージは後で必要
                            if file_has_match:
                                try:
                                    obj = json.loads(line)
                                    if obj.get("type") == "user":
                                        sid = obj.get("sessionId", "N/A")
                                        if sid in sessions:
                                            content = extract_text(
                                                obj.get("message", {}).get(
                                                    "content", ""
                                                )
                                            )
                                            ts = obj.get("timestamp", "")
                                            if content and len(content) > 5:
                                                sessions[sid][
                                                    "user_messages"
                                                ].append(
                                                    {
                                                        "timestamp": ts,
                                                        "content": content[:200]
                                                        .replace("\n", " ")
                                                        .strip(),
                                                    }
                                                )
                                except Exception:
                                    pass
                            continue

                        try:
                            obj = json.loads(line)
                        except json.JSONDecodeError:
                            continue

                        sid = obj.get("sessionId", "N/A")
                        ts = obj.get("timestamp", "")
                        msg_type = obj.get("type", "")
                        content = extract_text(
                            obj.get("message", {}).get("content", "")
                        )

                        file_has_match = True
                        sessions[sid]["files"].add(str(jsonl_file))

                        # マッチスニペットを抽出
                        m = pattern.search(content)
                        if m and len(sessions[sid]["matches"]) < 2:
                            start = max(0, m.start() - 50)
                            end = min(len(content), m.end() + 80)
                            snippet = content[start:end].replace("\n", " ").strip()
                            sessions[sid]["matches"].append(
                                {
                                    "timestamp": ts,
                                    "type": msg_type,
                                    "snippet": snippet,
                                }
                            )

                        # ユーザーメッセージを収集
                        if msg_type == "user" and content and len(content) > 5:
                            sessions[sid]["user_messages"].append(
                                {
                                    "timestamp": ts,
                                    "content": content[:200]
                                    .replace("\n", " ")
                                    .strip(),
                                }
                            )
            except Exception:
                continue

    # 2パス目: マッチしたsessionIdのユーザーメッセージを全ファイルから収集
    matched_session_ids = set(sessions.keys())
    for search_dir in search_dirs:
        if not search_dir.exists():
            continue
        for jsonl_file in search_dir.rglob("*.jsonl"):
            try:
                with open(jsonl_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line or '"user"' not in line:
                            continue
                        try:
                            obj = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if obj.get("type") != "user":
                            continue
                        sid = obj.get("sessionId")
                        if sid not in matched_session_ids:
                            continue
                        content = extract_text(
                            obj.get("message", {}).get("content", "")
                        )
                        ts = obj.get("timestamp", "")
                        if content and len(content) > 5:
                            # tool_resultなどのメタ的な内容を除外
                            if content.startswith('{"role"') or content.startswith(
                                "[{"
                            ):
                                continue
                            sessions[sid]["user_messages"].append(
                                {
                                    "timestamp": ts,
                                    "content": content[:200]
                                    .replace("\n", " ")
                                    .strip(),
                                }
                            )
            except Exception:
                continue

    # タイムスタンプでソートして出力
    results = []
    for sid, data in sessions.items():
        if sid == "N/A":
            continue
        # 最新のタイムスタンプを取得
        all_ts = [m["timestamp"] for m in data["matches"]] + [
            m["timestamp"] for m in data["user_messages"]
        ]
        latest_ts = max(all_ts) if all_ts else ""

        # ユーザーメッセージを重複排除してタイムスタンプ降順でソート
        seen_contents = set()
        unique_user_msgs = []
        for msg in sorted(
            data["user_messages"], key=lambda x: x["timestamp"], reverse=True
        ):
            content_key = msg["content"][:80]
            if content_key not in seen_contents:
                seen_contents.add(content_key)
                unique_user_msgs.append(msg)

        results.append(
            {
                "sessionId": sid,
                "latest_timestamp": latest_ts,
                "matches": data["matches"][:2],
                "recent_user_inputs": unique_user_msgs[:3],
            }
        )

    results.sort(key=lambda x: x["latest_timestamp"], reverse=True)
    results = results[:limit]

    for r in results:
        # タイムスタンプをYYYY-MM-DD HH:mm形式に変換
        ts = r["latest_timestamp"]
        if ts:
            ts_display = ts[:10] + " " + ts[11:16]
        else:
            ts_display = "N/A"

        print(f"### session: {r['sessionId']}  ({ts_display})")
        print()

        if r["matches"]:
            print("マッチ箇所:")
            for m in r["matches"]:
                print(f"- {m['snippet']}")
            print()

        if r["recent_user_inputs"]:
            print("直近のユーザー入力:")
            for i, msg in enumerate(r["recent_user_inputs"], 1):
                print(f"{i}. {msg['content']}")
            print()

        print("---")
        print()


def main():
    parser = argparse.ArgumentParser(description="Claude Code会話履歴のキーワード検索")
    parser.add_argument("keyword", help="検索キーワード")
    parser.add_argument("--project", help="特定プロジェクトのみ検索（ディレクトリ名）")
    parser.add_argument(
        "--limit", type=int, default=20, help="表示件数の上限（デフォルト: 20）"
    )
    args = parser.parse_args()

    projects_dir = os.path.expanduser("~/.claude/projects")
    search_sessions(args.keyword, projects_dir, args.project, args.limit)


if __name__ == "__main__":
    main()
