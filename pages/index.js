import { useState } from 'react';

export default function Home() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  const handlePairing = async () => {
    setMessage('Sedang memproses...');
    setDownloadUrl('');

    const { requestPairingCode, makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = await import('@fizzxydev/baileys-pro');
    const fs = await import('fs');
    const path = await import('path');
    const archiver = await import('archiver');
    const pino = await import('pino');

    const sessionId = `session-${Date.now()}`;
    const sessionPath = path.join(process.cwd(), 'sessions', sessionId);
    fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      auth: state,
      logger: pino.default({ level: 'silent' }),
      browser: ['Desktop', 'Chrome', '1.0.0'],
      version
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection } = update;
      if (connection === 'open') {
        const zipName = `${sessionId}.zip`;
        const zipPath = path.join(process.cwd(), 'downloads', zipName);
        fs.mkdirSync(path.dirname(zipPath), { recursive: true });

        const output = fs.createWriteStream(zipPath);
        const archive = archiver.default('zip', { zlib: { level: 9 } });

        archive.pipe(output);
        archive.directory(sessionPath, false);
        await archive.finalize();

        setMessage('✅ Terhubung ke WhatsApp!');
        setDownloadUrl(`file://${zipPath}`);
      }
    });

    try {
      const code = await sock.requestPairingCode(phone);
      setMessage(`📲 Pairing Code: ${code}`);
    } catch (err) {
      setMessage(`❌ Gagal pairing: ${err.message}`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phone.startsWith('62')) {
      setMessage('❌ Nomor harus diawali 62');
      return;
    }
    handlePairing();
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>WhatsApp Session Generator (No API)</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Masukkan nomor (e.g. 628xxxxxxxxxx)"
          required
        />
        <button type="submit">Dapatkan Pairing Code</button>
      </form>
      <p>{message}</p>
      {downloadUrl && (
        <a href={downloadUrl} download>
          Download Session ZIP
        </a>
      )}
    </div>
  );
}
