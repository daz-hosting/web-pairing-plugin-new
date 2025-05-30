import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  const { file } = req.query;
  if (!file) return res.status(400).json({ message: 'File tidak ditemukan' });

  const filePath = path.join(process.cwd(), 'downloads', file);
  if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File tidak ditemukan' });

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
  fs.createReadStream(filePath).pipe(res);
}
