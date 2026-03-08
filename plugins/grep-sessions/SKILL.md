---
name: grep-sessions
description: Claude Codeの全会話履歴から特定のキーワードでgrep検索し、該当するsessionIdとマッチした内容を一覧表示します
---

Claude Codeの会話履歴JSONLファイルを検索して、キーワードにマッチする会話のsessionIdを取得するスキルです。

## 使い方

`/grep-sessions {キーワード}` の形式で呼び出します。

## 実行手順

1. 引数からキーワードを取得する（`--project` や `--limit` オプションがあればそれも取得）
2. まず `ccs` コマンドで検索を実行する
3. `ccs` が見つからない（command not found）場合は、ユーザーにalias設定を案内した上で、`${CLAUDE_SKILL_DIR}/search.py` で直接実行する
4. スクリプトが整形済みテキストを出力するので、そのまま表示する

## 検索コマンド

```sh
ccs "{keyword}"
```

オプション付き:
```sh
ccs "{keyword}" --project "{project_dir_name}" --limit {N}
```

## ccsコマンドが見つからない場合

ユーザーに以下のメッセージを表示してalias設定を案内すること:

> `ccs` コマンドが見つかりません。以下を `~/.zshrc` に追加してください:
>
> ```sh
> alias ccs='python3 ${CLAUDE_SKILL_DIR}/search.py'
> ```

案内後、今回は以下のコマンドで直接実行する:

```sh
python3 ${CLAUDE_SKILL_DIR}/search.py "{keyword}"
```

スクリプトが以下の整形済みフォーマットで直接出力する（JSONではない）:

```
### session: {sessionId（フルUUID）}  ({YYYY-MM-DD HH:mm})

マッチ箇所:
- {snippet}

直近のユーザー入力:
1. {content}
2. {content}
3. {content}

---
```

スキル経由で呼び出された場合も、bashから直接実行した場合も同じ出力になる。

## 注意事項

- 検索対象は `~/.claude/projects/` 配下の全JSONLファイル（subagentsディレクトリ含む）
- キーワードは大文字小文字を区別しない
- 結果が多い場合はsessionId単位でユニーク化される（デフォルト上限20件）
- 2パス検索: 1パス目でキーワードマッチ、2パス目でマッチしたセッションのユーザーメッセージを収集
- ファイル数が多いため実行に数十秒かかることがある
