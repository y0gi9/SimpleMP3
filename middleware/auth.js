const parseCredentials = (credentialsStr) => {
  const credentials = {};
  if (credentialsStr) {
    const pairs = credentialsStr.split(',');
    pairs.forEach(pair => {
      const [folder, username, password] = pair.split(':');
      if (folder && username && password) {
        credentials[folder] = { username, password };
      }
    });
  }
  return credentials;
};

const authenticateFolder = (req, res, next) => {
  const { folder } = req.params;
  const credentials = parseCredentials(process.env.FOLDER_CREDENTIALS);

  if (!credentials[folder]) {
    return res.status(404).json({ error: 'Folder not found' });
  }

  if (!req.session.authenticatedFolders) {
    req.session.authenticatedFolders = {};
  }

  if (req.session.authenticatedFolders[folder]) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="MP3 Player"');
    return res.status(401).json({ error: 'Authentication required' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const decodedCredentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = decodedCredentials.split(':');

  const folderCreds = credentials[folder];
  if (username === folderCreds.username && password === folderCreds.password) {
    req.session.authenticatedFolders[folder] = true;
    next();
  } else {
    res.set('WWW-Authenticate', 'Basic realm="MP3 Player"');
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

module.exports = { authenticateFolder, parseCredentials };