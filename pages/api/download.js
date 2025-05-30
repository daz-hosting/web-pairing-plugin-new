import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { file } = req.query;
  if (!file) return res.status(400).send('File tidak ditemukan');

  const filePath = path.join(process.cwd(), 'downloads', file);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    res.setHeader('Content-Type', 'application/zip');
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.status(404).send('File tidak ditemukan');
  }
}
