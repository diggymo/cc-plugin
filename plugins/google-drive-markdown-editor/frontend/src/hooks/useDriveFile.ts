import { useState, useEffect, useCallback, useRef } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseDriveFileResult {
  content: string;
  fileName: string;
  loading: boolean;
  saveStatus: SaveStatus;
  setContent: (content: string) => void;
}

export function useDriveFile(fileId: string): UseDriveFileResult {
  const [content, setContentState] = useState("");
  const [fileName, setFileName] = useState("読み込み中...");
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  // ファイル読み込み
  useEffect(() => {
    setLoading(true);
    initialLoadRef.current = true;

    fetch(`/api/drive/file/${fileId}`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load file");
        return res.json() as Promise<{ content: string; name: string }>;
      })
      .then((data) => {
        setContentState(data.content);
        setFileName(data.name);
        setLoading(false);
        initialLoadRef.current = false;
      })
      .catch(() => {
        setLoading(false);
        setSaveStatus("error");
        initialLoadRef.current = false;
      });
  }, [fileId]);

  // 自動保存（Debounce 2秒）
  const save = useCallback(
    async (newContent: string) => {
      setSaveStatus("saving");
      try {
        const res = await fetch(`/api/drive/file/${fileId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: newContent }),
        });
        if (!res.ok) throw new Error("Save failed");
        setSaveStatus("saved");
        // 3秒後に "saved" 表示を消す
        setTimeout(() => setSaveStatus("idle"), 3000);
      } catch {
        setSaveStatus("error");
      }
    },
    [fileId]
  );

  const setContent = useCallback(
    (newContent: string) => {
      setContentState(newContent);

      // 初回ロード時は保存しない
      if (initialLoadRef.current) return;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = setTimeout(() => {
        save(newContent);
      }, 2000);
    },
    [save]
  );

  return { content, fileName, loading, saveStatus, setContent };
}
