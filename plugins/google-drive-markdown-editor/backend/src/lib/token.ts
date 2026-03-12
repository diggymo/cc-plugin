const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? "";

export async function refreshGoogleToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error("Token refresh failed");
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}
