import { google } from "googleapis";
import { Readable } from "node:stream";

function getDriveClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth });
}

export async function getFileContent(
  accessToken: string,
  fileId: string
): Promise<string> {
  const drive = getDriveClient(accessToken);
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "text" }
  );
  return res.data as string;
}

export async function getFileName(
  accessToken: string,
  fileId: string
): Promise<string> {
  const drive = getDriveClient(accessToken);
  const res = await drive.files.get({ fileId, fields: "name" });
  return res.data.name ?? "Untitled";
}

export async function updateFileContent(
  accessToken: string,
  fileId: string,
  content: string
): Promise<void> {
  const drive = getDriveClient(accessToken);
  const stream = Readable.from([content]);
  await drive.files.update({
    fileId,
    media: {
      mimeType: "text/markdown",
      body: stream,
    },
  });
}

export async function listMarkdownFiles(accessToken: string) {
  const drive = getDriveClient(accessToken);
  const res = await drive.files.list({
    q: "(mimeType='text/markdown' or name contains '.md') and trashed=false",
    fields: "files(id, name, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 50,
  });
  return res.data.files ?? [];
}
