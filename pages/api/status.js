import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export default async function handler(req, res) {
  const { session } = req.query;
  if (!session) return res.status(400).json({ message: 'Session ID tidak ditemukan' });

  global.sessions = global.sessions || {};
  const sess = global.sessions[session];

  if (!sess) return res.status(404).json({ message: 'Session tidak ditemukan' });

  const sessionPath = path.join(process.cwd(), 'sessions', session);
  const zipName = `${session}.zip`;
  const zipPath = path.join(process.cwd(), 'downloads', zipName);

  // Jika sudah terkoneksi dan ZIP belum dibuat
  if (sess.connected && !fs.existsSync(zipPath)) {
    fs.mkdirSync(path.join(process.cwd(), 'downloads'), { recursive: true });

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(sessionPath, false);
    await archive.finalize();
  }

  return res.status(200).json({
    connected: sess.connected,
    downloadUrl: sess.connected ? `/api/download?file=${zipName}` : null,
  });
}
