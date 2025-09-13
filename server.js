require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs').promises;
const { authenticateFolder, parseCredentials } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(session({
  secret: process.env.SESSION_SECRET || 'default-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(express.json());
app.use(express.static('public'));

const parseFolders = (foldersStr) => {
  const folders = {};
  if (foldersStr) {
    const pairs = foldersStr.split(',');
    pairs.forEach(pair => {
      const [name, folderPath] = pair.split(':');
      if (name && folderPath) {
        folders[name] = folderPath;
      }
    });
  }
  return folders;
};

app.get('/api/folders', (req, res) => {
  const folders = parseFolders(process.env.MP3_FOLDERS);
  const folderNames = Object.keys(folders);
  res.json(folderNames);
});

app.get('/api/folders/:folder/files', authenticateFolder, async (req, res) => {
  try {
    const { folder } = req.params;
    const folders = parseFolders(process.env.MP3_FOLDERS);
    const folderPath = folders[folder];

    if (!folderPath) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const files = await fs.readdir(folderPath);
    const mp3Files = files
      .filter(file => file.toLowerCase().endsWith('.mp3'))
      .map(file => ({
        name: file,
        path: `/api/folders/${folder}/stream/${encodeURIComponent(file)}`
      }));

    res.json(mp3Files);
  } catch (error) {
    console.error('Error reading folder:', error);
    res.status(500).json({ error: 'Unable to read folder contents' });
  }
});

app.get('/api/folders/:folder/stream/:filename', authenticateFolder, async (req, res) => {
  try {
    const { folder, filename } = req.params;
    const folders = parseFolders(process.env.MP3_FOLDERS);
    const folderPath = folders[folder];

    if (!folderPath) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    const decodedFilename = decodeURIComponent(filename);
    const filePath = path.join(folderPath, decodedFilename);

    // Security check: ensure the file is within the allowed folder
    const resolvedPath = path.resolve(filePath);
    const resolvedFolderPath = path.resolve(folderPath);

    if (!resolvedPath.startsWith(resolvedFolderPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists and is an MP3
    const stats = await fs.stat(filePath);
    if (!stats.isFile() || !decodedFilename.toLowerCase().endsWith('.mp3')) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for audio streaming
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', stats.size);

    // Handle range requests for seeking
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stats.size}`);
      res.setHeader('Content-Length', chunksize);

      const stream = require('fs').createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      const stream = require('fs').createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Error streaming file:', error);
    res.status(500).json({ error: 'Unable to stream file' });
  }
});

app.post('/api/folders/:folder/logout', (req, res) => {
  const { folder } = req.params;
  if (req.session.authenticatedFolders) {
    delete req.session.authenticatedFolders[folder];
  }
  res.json({ message: 'Logged out successfully' });
});

app.listen(PORT, () => {
  console.log(`MP3 Player server running on http://localhost:${PORT}`);
  console.log('Configure your .env file with MP3_FOLDERS and FOLDER_CREDENTIALS');
});