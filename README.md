# Simple MP3 Player

A web-based MP3 player with folder-based authentication and streaming capabilities.

## Features

- Web-based MP3 player interface
- Folder-based authentication system
- Audio streaming with range request support
- Responsive design for desktop and mobile
- Session-based authentication
- Secure file access controls

## Installation

1. Clone the repository:
```bash
git clone https://github.com/y0gi9/SimpleMP3.git
cd SimpleMP3
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```
PORT=3000
SESSION_SECRET=your-secret-key-here
MP3_FOLDERS=music:/path/to/music,library:/path/to/library
FOLDER_CREDENTIALS=music:username:password,library:user2:pass2
```

## Configuration

### Environment Variables

- `PORT`: Server port (default: 3000)
- `SESSION_SECRET`: Secret key for session management
- `MP3_FOLDERS`: Comma-separated list of folder mappings (name:path)
- `FOLDER_CREDENTIALS`: Comma-separated list of authentication credentials (folder:username:password)

### Folder Setup

Configure your MP3 folders in the `.env` file using the format:
```
MP3_FOLDERS=folder1:/absolute/path/to/folder1,folder2:/absolute/path/to/folder2
FOLDER_CREDENTIALS=folder1:username1:password1,folder2:username2:password2
```

## Usage

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to `http://localhost:3000`

3. Select a folder from the dropdown menu

4. Enter the credentials for the selected folder

5. Browse and play your MP3 files

## API Endpoints

- `GET /api/folders` - Get list of available folders
- `GET /api/folders/:folder/files` - Get MP3 files in a folder (requires authentication)
- `GET /api/folders/:folder/stream/:filename` - Stream an MP3 file (requires authentication)
- `POST /api/folders/:folder/logout` - Logout from a folder

## Security Features

- Path traversal protection
- Session-based authentication
- Folder-specific access controls
- File type validation

## Requirements

- Node.js 14.0.0 or higher
- MP3 files organized in folders

## License

MIT