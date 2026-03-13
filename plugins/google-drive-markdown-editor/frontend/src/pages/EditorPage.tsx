import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import EditorPane from "../components/EditorPane.tsx";
import PreviewPane from "../components/PreviewPane.tsx";
import { useDriveFile } from "../hooks/useDriveFile.ts";

export default function EditorPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json() as Promise<{ authenticated: boolean }>)
      .then((user) => {
        if (!user.authenticated) {
          navigate("/");
        } else {
          setIsAuthenticated(true);
        }
      });
  }, [navigate]);

  if (!fileId || isAuthenticated === null) {
    return (
      <div style={styles.loading}>
        <p>読み込み中...</p>
      </div>
    );
  }

  return <EditorContent fileId={fileId} />;
}

function EditorContent({ fileId }: { fileId: string }) {
  const navigate = useNavigate();
  const { content, fileName, loading, saveStatus, setContent } =
    useDriveFile(fileId);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    navigate("/");
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate("/")} style={styles.backButton}>
            ← ファイル一覧
          </button>
          <span style={styles.fileName}>{fileName}</span>
        </div>
        <div style={styles.headerRight}>
          <SaveStatusBadge status={saveStatus} loading={loading} />
          <button onClick={handleLogout} style={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </header>

      {loading ? (
        <div style={styles.loading}>
          <p>ファイルを読み込み中...</p>
        </div>
      ) : (
        <div style={styles.editorLayout}>
          <div style={styles.pane}>
            <EditorPane content={content} onChange={setContent} />
          </div>
          <div style={styles.pane}>
            <PreviewPane content={content} />
          </div>
        </div>
      )}
    </div>
  );
}

function SaveStatusBadge({
  status,
  loading,
}: {
  status: string;
  loading: boolean;
}) {
  if (loading) return null;

  const config: Record<string, { text: string; color: string }> = {
    idle: { text: "", color: "transparent" },
    saving: { text: "保存中...", color: "#8b949e" },
    saved: { text: "保存済み ✓", color: "#3fb950" },
    error: { text: "保存失敗 ✗", color: "#f85149" },
  };

  const { text, color } = config[status] ?? config.idle;
  if (!text) return null;

  return (
    <span style={{ color, fontSize: "13px", fontWeight: "500" }}>{text}</span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#0d1117",
    color: "#e6edf3",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    height: "48px",
    backgroundColor: "#161b22",
    borderBottom: "1px solid #30363d",
    flexShrink: 0,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    overflow: "hidden",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    flexShrink: 0,
  },
  backButton: {
    background: "none",
    border: "none",
    color: "#8b949e",
    cursor: "pointer",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },
  fileName: {
    fontSize: "14px",
    fontWeight: "500",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  logoutButton: {
    background: "none",
    border: "1px solid #30363d",
    color: "#8b949e",
    padding: "4px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "13px",
  },
  editorLayout: {
    display: "flex",
    flex: 1,
    overflow: "hidden",
  },
  pane: {
    flex: 1,
    overflow: "hidden",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    color: "#8b949e",
    backgroundColor: "#0d1117",
  },
};
