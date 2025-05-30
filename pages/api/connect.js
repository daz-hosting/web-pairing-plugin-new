import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@fizzxydev/baileys-pro';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const { phone } = req.query;
  if (!phone) return res.status(400).json({ message: 'Nomor tidak boleh kosong' });

  const sessionId = `session-${Date.now()}`;
  const sessionPath = path.join(process.cwd(), 'sessions', sessionId);
  fs.mkdirSync(sessionPath, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Netlify', 'Chrome', '1.0.0'],
    version,
  });

  try {
    if (!sock.authState.creds.registered) {
      const pairingCode = await sock.requestPairingCode(phone);
      await new Promise(resolve => setTimeout(resolve, 10000)); // beri waktu untuk user pairing

      const zipName = `${sessionId}.zip`;
      const zipPath = path.join(process.cwd(), 'downloads', zipName);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);
      archive.directory(sessionPath, false);
      await archive.finalize();

      return res.status(200).json({
        message: `Kode Pairing: ${pairingCode}`,
        downloadUrl: `/api/download?file=${zipName}`
      });
    } else {
      return res.status(400).json({ message: 'Nomor sudah terhubung' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Gagal melakukan pairing', error: error.message });
  }
}
