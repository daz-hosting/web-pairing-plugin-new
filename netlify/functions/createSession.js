const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const FormData = require('form-data');
const axios = require('axios');
const { connectWithPairing } = require('../../plugins/waPairing');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const body = JSON.parse(event.body || '{}');
  const phone = body.phoneNumber;

  if (!phone) {
    return { statusCode: 400, body: 'phoneNumber is required' };
  }

  const result = await connectWithPairing(phone);
  if (result.status !== 'success') {
    return { statusCode: 200, body: JSON.stringify(result) };
  }

  // Zip folder
  const zipPath = `/tmp/session-${Date.now()}.zip`;
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory('Storage/session/', false);
  await archive.finalize();

  // Upload ke layanan
  const uploadFile = fs.createReadStream(zipPath);
  const urls = { catboxURL: '', supaURL: '', pixhostURL: '' };

  // Catbox
  try {
    const formCatbox = new FormData();
    formCatbox.append('reqtype', 'fileupload');
    formCatbox.append('fileToUpload', uploadFile);
    const resCat = await axios.post('https://catbox.moe/user/api.php', formCatbox, {
      headers: formCatbox.getHeaders()
    });
    urls.catboxURL = resCat.data.trim();
  } catch {}

  // Supa
  try {
    const formSupa = new FormData();
    formSupa.append('file', fs.createReadStream(zipPath));
    const resSupa = await axios.post('https://i.supa.codes/api/upload', formSupa, {
      headers: formSupa.getHeaders()
    });
    urls.supaURL = resSupa.data?.link || '';
  } catch {}

  // Pixhost
  try {
    const formPixhost = new FormData();
    formPixhost.append('content_type', '0');
    formPixhost.append('img', fs.createReadStream(zipPath));
    const resPixhost = await axios.post('https://pixhost.to/cgi-bin/upload.cgi', formPixhost, {
      headers: formPixhost.getHeaders()
    });
    if (resPixhost.data.includes('pixhost')) {
      const match = resPixhost.data.match(/https?:\/\/[^"]+/);
      urls.pixhostURL = match ? match[0] : '';
    }
  } catch {}

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'success',
      pairingCode: result.pairingCode,
      ...urls
    })
  };
};
    
