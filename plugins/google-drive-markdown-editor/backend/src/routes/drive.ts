import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { verifySession, createSession } from "../lib/session.js";
import { refreshGoogleToken } from "../lib/token.js";
import {
  getFileContent,
  getFileName,
  updateFileContent,
  listMarkdownFiles,
} from "../lib/google-drive.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const SESSION_MAX_AGE = 7 * 24 * 3600;

// access_token の残り有効期間がこの値を下回ったらプロアクティブに更新する
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 分

export const driveRoutes = new Hono();

// 認証ミドルウェア（トークン期限切れ間近なら自動更新）
driveRoutes.use("/*", async (c, next) => {
  const token = getCookie(c, "session");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const session = await verifySession(token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  let accessToken = session.access_token;

  // refresh_token があり、access_token が期限切れ間近なら更新する
  if (
    session.refresh_token &&
    session.access_token_expires_at !== undefined &&
    session.access_token_expires_at - Date.now() < REFRESH_THRESHOLD_MS
  ) {
    try {
      const refreshed = await refreshGoogleToken(session.refresh_token);
      accessToken = refreshed.access_token;

      // 新しいトークンで session cookie を上書き
      const newSessionToken = await createSession({
        ...session,
        access_token: accessToken,
        access_token_expires_at: Date.now() + refreshed.expires_in * 1000,
      });
      setCookie(c, "session", newSessionToken, {
        httpOnly: true,
        secure: APP_URL.startsWith("https"),
        sameSite: "Lax",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
    } catch (err) {
      console.error("Token refresh failed:", err);
      // リフレッシュ失敗時は既存のトークンで続行（Drive API が 401 を返す場合あり）
    }
  }

  c.set("access_token" as never, accessToken);
  await next();
});

// .md ファイル一覧
driveRoutes.get("/files", async (c) => {
  const accessToken = c.get("access_token" as never) as string;
  try {
    const files = await listMarkdownFiles(accessToken);
    return c.json({ files });
  } catch (err) {
    console.error("Failed to list files:", err);
    return c.json({ error: "Failed to list files" }, 500);
  }
});

// ファイル内容取得
driveRoutes.get("/file/:id", async (c) => {
  const accessToken = c.get("access_token" as never) as string;
  const fileId = c.req.param("id");

  try {
    const [content, name] = await Promise.all([
      getFileContent(accessToken, fileId),
      getFileName(accessToken, fileId),
    ]);
    return c.json({ content, name });
  } catch (err) {
    console.error("Failed to get file:", err);
    return c.json({ error: "Failed to get file" }, 500);
  }
});

// ファイル保存
driveRoutes.patch("/file/:id", async (c) => {
  const accessToken = c.get("access_token" as never) as string;
  const fileId = c.req.param("id");

  const body = await c.req.json<{ content: string }>();
  if (typeof body.content !== "string") {
    return c.json({ error: "content is required" }, 400);
  }

  try {
    await updateFileContent(accessToken, fileId, body.content);
    return c.json({ success: true });
  } catch (err) {
    console.error("Failed to save file:", err);
    return c.json({ error: "Failed to save file" }, 500);
  }
});
