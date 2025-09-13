class MP3Player {
    constructor() {
        this.currentFolder = null;
        this.currentPlaylist = [];
        this.currentTrackIndex = -1;
        this.isShuffled = false;
        this.shuffledPlaylist = [];

        this.initializeElements();
        this.bindEvents();
        this.loadFolders();
    }

    initializeElements() {
        this.folderList = document.getElementById('folderList');
        this.fileList = document.getElementById('fileList');
        this.loginForm = document.getElementById('loginForm');
        this.authForm = document.getElementById('authForm');
        this.searchContainer = document.getElementById('searchContainer');
        this.searchInput = document.getElementById('searchInput');

        this.audioPlayer = document.getElementById('audioPlayer');
        this.currentTrack = document.getElementById('currentTrack');
        this.trackTime = document.getElementById('trackTime');

        this.prevButton = document.getElementById('prevTrack');
        this.nextButton = document.getElementById('nextTrack');
        this.shuffleButton = document.getElementById('shuffle');

        this.folderName = document.getElementById('folderName');
        this.cancelLogin = document.getElementById('cancelLogin');
    }

    bindEvents() {
        this.authForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.cancelLogin.addEventListener('click', () => this.hideLogin());

        this.audioPlayer.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
        this.audioPlayer.addEventListener('timeupdate', () => this.updateTimeDisplay());
        this.audioPlayer.addEventListener('ended', () => this.playNext());

        this.prevButton.addEventListener('click', () => this.playPrevious());
        this.nextButton.addEventListener('click', () => this.playNext());
        this.shuffleButton.addEventListener('click', () => this.toggleShuffle());

        this.searchInput.addEventListener('input', (e) => this.filterFiles(e.target.value));
    }

    async loadFolders() {
        try {
            const response = await fetch('/api/folders');
            const folders = await response.json();
            this.displayFolders(folders);
        } catch (error) {
            console.error('Error loading folders:', error);
            this.folderList.innerHTML = '<div class="loading">Error loading folders</div>';
        }
    }

    displayFolders(folders) {
        if (folders.length === 0) {
            this.folderList.innerHTML = '<div class="loading">No folders configured</div>';
            return;
        }

        this.folderList.innerHTML = '';
        folders.forEach(folder => {
            const button = document.createElement('button');
            button.className = 'folder-item';
            button.textContent = folder;
            button.addEventListener('click', () => this.selectFolder(folder));
            this.folderList.appendChild(button);
        });
    }

    async selectFolder(folder) {
        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });

        const folderButton = Array.from(document.querySelectorAll('.folder-item'))
            .find(button => button.textContent === folder);
        if (folderButton) {
            folderButton.classList.add('active');
        }

        this.currentFolder = folder;
        await this.loadFiles(folder);
    }

    async loadFiles(folder) {
        try {
            this.fileList.innerHTML = '<div class="loading">Loading files...</div>';

            const response = await fetch(`/api/folders/${folder}/files`);

            if (response.status === 401) {
                this.showLogin(folder);
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const files = await response.json();
            this.currentPlaylist = files;
            this.displayFiles(files);
            this.searchContainer.classList.remove('hidden');
            this.updatePlaylistControls();
        } catch (error) {
            console.error('Error loading files:', error);
            this.fileList.innerHTML = '<div class="placeholder">Error loading files</div>';
        }
    }

    displayFiles(files) {
        if (files.length === 0) {
            this.fileList.innerHTML = '<div class="placeholder">No MP3 files found in this folder</div>';
            return;
        }

        this.fileList.innerHTML = '';
        files.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            fileItem.innerHTML = `
                <div class="file-name">${file.name}</div>
                <button class="play-button" data-index="${index}">▶</button>
            `;

            fileItem.addEventListener('click', (e) => {
                if (e.target.classList.contains('play-button')) {
                    this.playTrack(index);
                }
            });

            this.fileList.appendChild(fileItem);
        });
    }

    showLogin(folder) {
        this.folderName.textContent = folder;
        this.loginForm.classList.remove('hidden');
        this.fileList.innerHTML = '';
        this.searchContainer.classList.add('hidden');
        document.getElementById('username').focus();
    }

    hideLogin() {
        this.loginForm.classList.add('hidden');
        this.fileList.innerHTML = '<div class="placeholder">Select a folder to view MP3 files</div>';
        this.currentFolder = null;

        document.querySelectorAll('.folder-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    async handleLogin(e) {
        e.preventDefault();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const credentials = btoa(`${username}:${password}`);

        try {
            const response = await fetch(`/api/folders/${this.currentFolder}/files`, {
                headers: {
                    'Authorization': `Basic ${credentials}`
                }
            });

            if (response.ok) {
                const files = await response.json();
                this.currentPlaylist = files;
                this.displayFiles(files);
                this.hideLogin();
                this.searchContainer.classList.remove('hidden');
                this.updatePlaylistControls();

                // Re-select the folder
                const folderButton = Array.from(document.querySelectorAll('.folder-item'))
                    .find(button => button.textContent === this.currentFolder);
                if (folderButton) {
                    folderButton.classList.add('active');
                }
            } else {
                alert('Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed');
        }

        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    playTrack(index) {
        if (index < 0 || index >= this.currentPlaylist.length) return;

        this.currentTrackIndex = index;
        const track = this.currentPlaylist[index];

        this.audioPlayer.src = track.path;
        this.audioPlayer.play();

        this.currentTrack.textContent = track.name;
        this.updateFileItemsDisplay();
        this.updatePlaylistControls();
    }

    playNext() {
        const playlist = this.isShuffled ? this.shuffledPlaylist : this.currentPlaylist;
        if (playlist.length === 0) return;

        let nextIndex;
        if (this.isShuffled) {
            const currentShuffledIndex = this.shuffledPlaylist.findIndex(
                track => track === this.currentPlaylist[this.currentTrackIndex]
            );
            nextIndex = (currentShuffledIndex + 1) % this.shuffledPlaylist.length;
            nextIndex = this.currentPlaylist.findIndex(track => track === this.shuffledPlaylist[nextIndex]);
        } else {
            nextIndex = (this.currentTrackIndex + 1) % this.currentPlaylist.length;
        }

        this.playTrack(nextIndex);
    }

    playPrevious() {
        const playlist = this.isShuffled ? this.shuffledPlaylist : this.currentPlaylist;
        if (playlist.length === 0) return;

        let prevIndex;
        if (this.isShuffled) {
            const currentShuffledIndex = this.shuffledPlaylist.findIndex(
                track => track === this.currentPlaylist[this.currentTrackIndex]
            );
            prevIndex = currentShuffledIndex === 0 ? this.shuffledPlaylist.length - 1 : currentShuffledIndex - 1;
            prevIndex = this.currentPlaylist.findIndex(track => track === this.shuffledPlaylist[prevIndex]);
        } else {
            prevIndex = this.currentTrackIndex === 0 ? this.currentPlaylist.length - 1 : this.currentTrackIndex - 1;
        }

        this.playTrack(prevIndex);
    }

    toggleShuffle() {
        this.isShuffled = !this.isShuffled;
        this.shuffleButton.classList.toggle('active', this.isShuffled);

        if (this.isShuffled) {
            this.shuffledPlaylist = [...this.currentPlaylist].sort(() => Math.random() - 0.5);
        }
    }

    updateFileItemsDisplay() {
        document.querySelectorAll('.file-item').forEach((item, index) => {
            item.classList.toggle('playing', index === this.currentTrackIndex);
        });
    }

    updatePlaylistControls() {
        const hasPlaylist = this.currentPlaylist.length > 0;
        this.prevButton.disabled = !hasPlaylist;
        this.nextButton.disabled = !hasPlaylist;
    }

    updateTimeDisplay() {
        const current = this.audioPlayer.currentTime;
        const duration = this.audioPlayer.duration;

        if (!isNaN(current) && !isNaN(duration)) {
            this.trackTime.textContent = `${this.formatTime(current)} / ${this.formatTime(duration)}`;
        }
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    filterFiles(searchTerm) {
        const fileItems = document.querySelectorAll('.file-item');
        const term = searchTerm.toLowerCase();

        fileItems.forEach(item => {
            const fileName = item.querySelector('.file-name').textContent.toLowerCase();
            const matches = fileName.includes(term);
            item.style.display = matches ? 'flex' : 'none';
        });
    }
}

// Initialize the player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MP3Player();
});