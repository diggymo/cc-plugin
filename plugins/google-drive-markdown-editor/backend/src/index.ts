import { Hono } from "hono";
import { cors } from "hono/cors";
import { authRoutes } from "./routes/auth.js";
import { driveRoutes } from "./routes/drive.js";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: process.env.APP_URL ?? "http://localhost:5173",
    credentials: true,
  })
);

app.route("/api/auth", authRoutes);
app.route("/api/drive", driveRoutes);

// ローカル開発: hono/node-server で起動
// Lambda: handle(app) でエクスポート
const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

if (isLambda) {
  // Lambda ハンドラーとしてエクスポート
  const { handle } = await import("hono/aws-lambda");

  // Lambda では静的ファイルは public/ から配信しない
  // （フロントエンドは CloudFront や Lambda Function URL 経由でビルド済みを配置）
  // SPA フォールバック: /api/* 以外は index.html を返す
  app.get("*", async (c) => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    try {
      const html = readFileSync(
        join(process.cwd(), "public", "index.html"),
        "utf-8"
      );
      return c.html(html);
    } catch {
      return c.text("Not found", 404);
    }
  });

  export const handler = handle(app);
} else {
  // ローカル開発: 静的ファイル配信 + hono/node-server
  const { serveStatic } = await import("@hono/node-server/serve-static");

  app.get(
    "/assets/*",
    serveStatic({ root: "../frontend/dist" })
  );

  app.get("*", serveStatic({ path: "../frontend/dist/index.html" }));

  const { serve } = await import("@hono/node-server");
  const port = Number(process.env.PORT ?? 3000);
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}
