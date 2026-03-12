import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { verifySession } from "../lib/session.js";
import {
  getFileContent,
  getFileName,
  updateFileContent,
  listMarkdownFiles,
} from "../lib/google-drive.js";

export const driveRoutes = new Hono();

// 認証ミドルウェア
driveRoutes.use("/*", async (c, next) => {
  const token = getCookie(c, "session");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  const session = await verifySession(token);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  c.set("access_token" as never, session.access_token);
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
