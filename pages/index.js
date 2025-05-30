import { useState } from 'react';

export default function Home() {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [sessionId, setSessionId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Sedang memproses...');
    setDownloadUrl('');

    const res = await fetch(`/api/connect?phone=${encodeURIComponent(phone)}`);
    const data = await res.json();

    setMessage(data.message);
    if (data.sessionId) {
      setSessionId(data.sessionId);
      pollStatus(data.sessionId);
    }
  };

  const pollStatus = (session) => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/status?session=${session}`);
      const data = await res.json();
      if (data.connected && data.downloadUrl) {
        clearInterval(interval);
        setMessage('✅ Terhubung! Klik tombol untuk mengunduh session.');
        setDownloadUrl(data.downloadUrl);
      }
    }, 5000);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Connect WhatsApp dengan Pairing Code</h1>
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
