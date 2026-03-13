import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

interface AuthUser {
  authenticated: boolean;
  email?: string;
  name?: string;
}

export default function HomePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Drive から開かれた時は state パラメータにファイル ID が入る
  // 例: state={"ids":["fileId"],"action":"open","userId":"xxx"}
  useEffect(() => {
    const stateParam = searchParams.get("state");
    if (stateParam) {
      try {
        const driveState = JSON.parse(stateParam) as {
          ids?: string[];
          action?: string;
        };
        if (driveState.ids?.[0]) {
          // 未ログインの場合は state を保持してログインへ
          fetch("/api/auth/me", { credentials: "include" })
            .then((res) => res.json() as Promise<AuthUser>)
            .then((u) => {
              if (u.authenticated) {
                navigate(`/editor/${driveState.ids![0]}`);
              } else {
                window.location.href = `/api/auth/login?drive_state=${encodeURIComponent(stateParam)}`;
              }
            });
          return;
        }
      } catch {
        // state のパース失敗は無視
      }
    }

    // 通常アクセス: 認証状態確認
    fetch("/api/auth/me", { credentials: "include" })
      .then((res) => res.json() as Promise<AuthUser>)
      .then((u) => {
        setUser(u);
        if (u.authenticated) {
          return fetch("/api/drive/files", { credentials: "include" })
            .then((r) => r.json() as Promise<{ files: DriveFile[] }>)
            .then((data) => setFiles(data.files));
        }
      })
      .finally(() => setLoading(false));
  }, [navigate, searchParams]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser({ authenticated: false });
    setFiles([]);
  };

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: "#8b949e" }}>読み込み中...</p>
      </div>
    );
  }

  if (!user?.authenticated) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h1 style={styles.title}>Drive Markdown Editor</h1>
          <p style={styles.description}>
            Google Drive の Markdown ファイルをブラウザで編集できます
          </p>
          <a href="/api/auth/login" style={styles.loginButton}>
            Google でログイン
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Drive Markdown Editor</h1>
        <div style={styles.headerRight}>
          <span style={styles.userName}>{user.name}</span>
          <button onClick={handleLogout} style={styles.logoutButton}>
            ログアウト
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.sectionTitle}>Markdown ファイル一覧</h2>
        {files.length === 0 ? (
          <p style={{ color: "#8b949e" }}>
            Google Drive に .md ファイルが見つかりませんでした
          </p>
        ) : (
          <ul style={styles.fileList}>
            {files.map((file) => (
              <li key={file.id} style={styles.fileItem}>
                <button
                  onClick={() => navigate(`/editor/${file.id}`)}
                  style={styles.fileButton}
                >
                  <span style={styles.fileName}>{file.name}</span>
                  <span style={styles.fileDate}>
                    {new Date(file.modifiedTime).toLocaleString("ja-JP")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
    backgroundColor: "#0d1117",
  },
  card: {
    backgroundColor: "#161b22",
    border: "1px solid #30363d",
    borderRadius: "12px",
    padding: "48px",
    textAlign: "center",
    maxWidth: "400px",
    width: "100%",
  },
  title: {
    color: "#e6edf3",
    fontSize: "24px",
    marginBottom: "12px",
  },
  description: {
    color: "#8b949e",
    marginBottom: "32px",
    lineHeight: 1.6,
  },
  loginButton: {
    display: "inline-block",
    backgroundColor: "#238636",
    color: "#ffffff",
    padding: "12px 24px",
    borderRadius: "6px",
    textDecoration: "none",
    fontWeight: "bold",
  },
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
    padding: "0 24px",
    height: "56px",
    backgroundColor: "#161b22",
    borderBottom: "1px solid #30363d",
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "bold",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  userName: {
    color: "#8b949e",
    fontSize: "14px",
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
  main: {
    padding: "32px",
    flex: 1,
    overflowY: "auto",
  },
  sectionTitle: {
    fontSize: "18px",
    marginBottom: "16px",
    color: "#e6edf3",
  },
  fileList: {
    listStyle: "none",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  fileItem: {
    border: "1px solid #30363d",
    borderRadius: "6px",
    overflow: "hidden",
  },
  fileButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "12px 16px",
    background: "none",
    border: "none",
    color: "#e6edf3",
    cursor: "pointer",
    textAlign: "left",
    transition: "background 0.1s",
  },
  fileName: {
    fontSize: "14px",
    fontWeight: "500",
  },
  fileDate: {
    fontSize: "12px",
    color: "#8b949e",
  },
};
