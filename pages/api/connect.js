import { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } from '@fizzxydev/baileys-pro';
import pino from 'pino';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const phone = req.query.phone;
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

  sock.ev.on('creds.update', saveCreds);

  try {
    const pairingCode = await sock.requestPairingCode(phone);

    // Simpan pairingCode & sessionId di memori (atau bisa juga Redis/Mongo untuk production)
    global.sessions = global.sessions || {};
    global.sessions[sessionId] = { pairingCode, connected: false };

    // Listen untuk status connect
    sock.ev.on('connection.update', async ({ connection }) => {
      if (connection === 'open') {
        global.sessions[sessionId].connected = true;
      }
    });

    return res.status(200).json({
      message: `📲 Kode Pairing: ${pairingCode}\nSilakan masukkan di WhatsApp.`,
      pairingCode,
      sessionId,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Gagal pairing', error: err.message });
  }
}
