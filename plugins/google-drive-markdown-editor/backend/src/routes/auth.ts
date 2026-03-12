import { Hono } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { createSession, verifySession } from "../lib/session.js";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

const REDIRECT_URI = `${APP_URL}/api/auth/callback`;
const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

export const authRoutes = new Hono();

// Google OAuth ログイン開始
authRoutes.get("/login", (c) => {
  // Drive から開かれた時の state パラメータを保持する
  const driveState = c.req.query("drive_state");
  const oauthState = driveState
    ? encodeURIComponent(driveState)
    : "no_state";

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: oauthState,
  });

  return c.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
});

// Google OAuth コールバック
authRoutes.get("/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code) {
    return c.json({ error: "Missing authorization code" }, 400);
  }

  // コードをトークンに交換
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return c.json({ error: "Failed to exchange token" }, 500);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    id_token: string;
  };

  // ユーザー情報を取得
  const userRes = await fetch(
    `https://www.googleapis.com/oauth2/v3/userinfo`,
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );
  const user = await userRes.json() as { email: string; name: string };

  // JWT セッションを Cookie に保存
  const sessionToken = await createSession({
    access_token: tokens.access_token,
    email: user.email,
    name: user.name,
  });

  setCookie(c, "session", sessionToken, {
    httpOnly: true,
    secure: APP_URL.startsWith("https"),
    sameSite: "Lax",
    maxAge: 3600,
    path: "/",
  });

  // Drive から来た state があれば、そのファイルを開く
  if (state && state !== "no_state") {
    try {
      const driveState = JSON.parse(decodeURIComponent(state)) as {
        ids?: string[];
      };
      if (driveState.ids?.[0]) {
        return c.redirect(`/editor/${driveState.ids[0]}`);
      }
    } catch {
      // state のパースに失敗したらトップへ
    }
  }

  return c.redirect("/");
});

// ログイン状態確認
authRoutes.get("/me", async (c) => {
  const token = getCookie(c, "session");
  if (!token) return c.json({ authenticated: false }, 401);

  const session = await verifySession(token);
  if (!session) return c.json({ authenticated: false }, 401);

  return c.json({
    authenticated: true,
    email: session.email,
    name: session.name,
  });
});

// ログアウト
authRoutes.post("/logout", (c) => {
  deleteCookie(c, "session", { path: "/" });
  return c.json({ success: true });
});
