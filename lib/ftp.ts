import { Client } from "basic-ftp";
import * as path from "path";
import { Readable } from "stream";

export async function uploadToFTP(
  localFile: Buffer,
  remotePath: string
) {
  const client = new Client();

  try {
    await client.access({
      host: process.env.FTP_HOST!,
      port: Number(process.env.FTP_PORT || 21),
      user: process.env.FTP_USER!,
      password: process.env.FTP_PASSWORD!,
      secure: process.env.FTP_SECURE === "true",
    });

    const dir = path.posix.dirname(remotePath);
    const fileName = path.posix.basename(remotePath);

    // Ensure the remote directory exists (creates subfolders like lesson-materials)
    let dirEnsured = false;
    try {
      await client.ensureDir(dir);
      dirEnsured = true;
    } catch (err) {
      console.warn(`Could not ensureDir for '${dir}', trying relative path...`, err);
    }

    if (!dirEnsured) {
      // In chrooted FTP accounts where root is already /home/acfcomso or /storage:
      const withoutHome = dir.replace(/^\/home\/[^/]+\/?/, "");
      try {
        await client.ensureDir(withoutHome);
        dirEnsured = true;
      } catch {
        // Fallback: try relative subfolder name (e.g. lesson-materials)
        const subFolder = path.posix.basename(dir);
        await client.ensureDir(subFolder);
        dirEnsured = true;
      }
    }

    // Since ensureDir sets the working directory to the target folder,
    // uploading with fileName places the file directly into that directory.
    await client.uploadFrom(
      Readable.from(localFile),
      fileName
    );

    return true;
  } finally {
    client.close();
  }
}