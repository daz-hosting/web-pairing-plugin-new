import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@fizzxydev/baileys-pro';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

export default async function handler(req, res) {
  const method = req.method;
  if (method !== 'POST' && method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const phone = method === 'POST' ? req.body.phone : req.query.phone;
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

  sock.ev.on("creds.update", saveCreds);

  let resEnded = false;

  sock.ev.on("connection.update", async (update) => {
    const { connection } = update;

    if (connection === 'open' && !resEnded) {
      const zipName = `${sessionId}.zip`;
      const zipPath = path.join(process.cwd(), 'downloads', zipName);
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.pipe(output);
      archive.directory(sessionPath, false);
      await archive.finalize();

      resEnded = true;
      return res.status(200).json({
        message: '✅ WhatsApp berhasil terhubung!',
        downloadUrl: `/api/download?file=${zipName}`,
      });
    }
  });

  try {
    if (!sock.authState.creds.registered) {
      const pairingCode = await sock.requestPairingCode(phone);
      console.log('📲 Pairing code:', pairingCode);

      // Kirim pairing code dulu ke frontend, user akan tunggu koneksi terbuka
      return res.status(200).json({
        message: `📲 Kode Pairing: ${pairingCode}\nSilakan masukkan di WhatsApp.`,
        pairingCode,
      });
    } else {
      return res.status(400).json({ message: 'Nomor sudah terhubung' });
    }
  } catch (error) {
    console.error(error);
    if (!resEnded) {
      resEnded = true;
      return res.status(500).json({ message: '❌ Gagal melakukan pairing', error: error.message });
    }
  }
}
