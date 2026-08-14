/* ======================================================
   0) Defensive stubs (no-op globals for inline calls)
   Keeps inline onclicks safe before full init.
====================================================== */
if (typeof window !== 'undefined') {
    window.initializeMusicPlayer = window.initializeMusicPlayer || function() { console.warn('initializeMusicPlayer called before script loaded'); };
    window.togglePlayPause = window.togglePlayPause || function() { console.warn('togglePlayPause called before script loaded'); };
    window.nextTrack = window.nextTrack || function() { console.warn('nextTrack called before script loaded'); };
    window.previousTrack = window.previousTrack || function() { console.warn('previousTrack called before script loaded'); };
    window.selectTrack = window.selectTrack || function() { console.warn('selectTrack called before script loaded'); };
    window.initTerminal = window.initTerminal || function() { console.warn('initTerminal called before script loaded'); };
}

/* ======================================================
   1) GLOBALS
====================================================== */
let zIndexCounter = 10;
let nextCascadeLeft = null;
let nextCascadeTop = null;
const CASCADE_STEP_PX = 24;

/* ======================================================
   2) WINDOW POSITIONING (desktop-only cascade)
====================================================== */
function positionWindowWithCascade(win) {
    const taskbarHeight = 30;
    const wasHidden = win.style.display === "none" || getComputedStyle(win).display === "none";
    if (wasHidden) win.style.display = "block"; // measureable
    const width = win.offsetWidth || 900;
    const height = win.offsetHeight || 700;

    if (nextCascadeLeft === null || nextCascadeTop === null) {
        const centeredLeft = Math.max(0, Math.floor((window.innerWidth - width) / 2) - 60);
        const centeredTop = Math.max(0, Math.floor((window.innerHeight - height - taskbarHeight) / 2));
        nextCascadeLeft = centeredLeft;
        nextCascadeTop = centeredTop;
    } else {
        nextCascadeLeft += CASCADE_STEP_PX;
        nextCascadeTop += CASCADE_STEP_PX;
    }

    if (nextCascadeLeft + width > window.innerWidth - 10) {
        nextCascadeLeft = Math.max(0, Math.floor((window.innerWidth - width) / 2) - 60);
    }
    if (nextCascadeTop + height > window.innerHeight - taskbarHeight) {
        nextCascadeTop = Math.max(0, Math.floor((window.innerHeight - height - taskbarHeight) / 2));
    }

    win.style.left = nextCascadeLeft + 'px';
    win.style.top = nextCascadeTop + 'px';
}

/* ======================================================
   3) START MENU
====================================================== */
function toggleStartMenu() {
    const menu = document.getElementById("startMenu");
    const button = document.getElementById("startButton");
    const isVisible = menu.style.display === "block";
    menu.style.display = isVisible ? "none" : "block";
    menu.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
    button.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
}

// Close start menu when clicking outside (desktop)
document.addEventListener('click', (e) => {
    const menu = document.getElementById("startMenu");
    const button = document.getElementById("startButton");
    if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.style.display = 'none';
    }
});

/* ======================================================
   4) WINDOW CONTROLS (open / close / minimize / maximize)
====================================================== */
function openWindow(event, id) {
    // desktop-icon visual
    document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('desktop-icon-large'));
    if (event && event.currentTarget) event.currentTarget.classList.add('desktop-icon-large');

    const win = document.getElementById(id);
    if (!win) return;

    win.style.display = "block";
    win.setAttribute('aria-hidden', 'false');

    positionWindowWithCascade(win);
    bringToFront(win);

    // Remove existing taskbar button (we don't persist duplicates)
    removeTaskbarButton(id);

    // If opening resume, load PDF
    if (id === 'resumeWindow') {
        setTimeout(loadResumePDF, 200);
    }

    // If opening music window, ensure player initialized
    if (id === 'musicWindow') {
        try { initializeMusicPlayer(); } catch (e) { /* ignore */ }
    }

    // If opening terminal, boot it and focus the input
    if (id === 'terminalWindow') {
        setTimeout(initTerminal, 50);
    }
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = "none";
    win.setAttribute('aria-hidden', 'true');
    removeTaskbarButton(id);

    if (id === 'musicWindow') {
        stopAllMusic();
    }
}

function minimizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = "none";
    win.setAttribute('aria-hidden', 'true');
    addTaskbarButton(id);
}

function maximizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;

    if (win.dataset.maximized === "true") {
        // restore
        win.style.width = win.dataset.prevWidth || "900px";
        win.style.height = win.dataset.prevHeight || "700px";
        win.style.top = win.dataset.prevTop || "40px";
        win.style.left = win.dataset.prevLeft || "40px";
        win.dataset.maximized = "false";
    } else {
        // save
        win.dataset.prevWidth = win.style.width || "900px";
        win.dataset.prevHeight = win.style.height || "700px";
        win.dataset.prevTop = win.style.top || "40px";
        win.dataset.prevLeft = win.style.left || "40px";

        // maximize
        win.style.left = "0";
        win.style.top = "0";
        win.style.width = "100%";
        win.style.height = "calc(100% - 30px)";
        win.dataset.maximized = "true";
    }

    if (id === 'resumeWindow') {
        setTimeout(loadResumePDF, 120);
    }
}

/* Bring window to front */
function bringToFront(win) {
    zIndexCounter++;
    win.style.zIndex = zIndexCounter;
}

/* ======================================================
   5) TASKBAR MANAGEMENT
====================================================== */
function addTaskbarButton(id) {
    const taskbarWindows = document.getElementById("taskbar-windows");
    if (!taskbarWindows) return;
    if (document.getElementById("task-" + id)) return;

    const btn = document.createElement("button");
    btn.id = "task-" + id;
    const headerTitle = document.querySelector(`#${id} .window-header span`);
    btn.innerText = headerTitle ? headerTitle.innerText : id.replace("Window", "");

    btn.onclick = () => {
        const win = document.getElementById(id);
        if (!win) return;
        if (win.style.display === "none" || win.style.display === "") {
            win.style.display = "block";
            bringToFront(win);
            removeTaskbarButton(id);
            if (id === 'resumeWindow') setTimeout(loadResumePDF, 120);
            if (id === 'terminalWindow') setTimeout(initTerminal, 50);
        } else {
            minimizeWindow(id);
        }
    };

    taskbarWindows.appendChild(btn);
}

function removeTaskbarButton(id) {
    const btn = document.getElementById("task-" + id);
    if (btn) btn.remove();

    // remove desktop-icon-large
    const desktopIcon = document.querySelector(`.desktop-icon[onclick*='${id}']`);
    if (desktopIcon) desktopIcon.classList.remove('desktop-icon-large');
}

/* ======================================================
   6) DRAGGING (desktop mouse-only)
   - no touch handlers, desktop only
====================================================== */
document.querySelectorAll('.window-header').forEach(header => {
    let dragged = null;
    header.addEventListener('mousedown', (e) => {
        // ignore if maximize or close clicked
        if (e.target.tagName === 'BUTTON') return;
        dragged = header.parentElement;
        bringToFront(dragged);
        const offsetX = e.clientX - dragged.offsetLeft;
        const offsetY = e.clientY - dragged.offsetTop;

        function moveHandler(e) {
            const newLeft = Math.min(window.innerWidth - dragged.offsetWidth, Math.max(0, e.clientX - offsetX));
            const newTop = Math.min(window.innerHeight - dragged.offsetHeight - 30, Math.max(0, e.clientY - offsetY));
            dragged.style.left = newLeft + 'px';
            dragged.style.top = newTop + 'px';
        }

        function upHandler() {
            document.removeEventListener('mousemove', moveHandler);
            document.removeEventListener('mouseup', upHandler);
            dragged = null;
        }

        document.addEventListener('mousemove', moveHandler);
        document.addEventListener('mouseup', upHandler);
    });
});

/* ======================================================
   7) PDF VIEWER (MULTI-PAGE, NO CONTROLS)
   - Desktop-only viewer: fetch arrayBuffer -> render all pages
   - Uses path: /assets/files/Ayush-Resume.pdf (as provided)
====================================================== */

/* Ensure pdf.worker is set if pdfjsLib is present */
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

let PDF_DOC = null;

function loadResumePDF() {
    const pdfViewer = document.getElementById('pdfViewer');
    if (!pdfViewer) return;

    const url = '/assets/files/Ayush-Resume.pdf';

    // Clear any previous content
    pdfViewer.innerHTML = '<div style="color:#fff;padding:20px;text-align:center;">Loading PDF...</div>';

    // Fetch as arrayBuffer to avoid browser embedding
    fetch(url, { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok: ' + response.status);
            return response.arrayBuffer();
        })
        .then(arrayBuffer => pdfjsLib.getDocument({ data: arrayBuffer }).promise)
        .then(pdf => {
            PDF_DOC = pdf;
            // clear loading
            pdfViewer.innerHTML = '';

            // render pages sequentially
            const renderAll = async () => {
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 1 });

                    // determine scale to fit viewer width (leave some padding)
                    const maxWidth = Math.max(600, pdfViewer.clientWidth - 20);
                    const scale = maxWidth / viewport.width;
                    const scaledViewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const outputScale = window.devicePixelRatio || 1;
                    canvas.width = Math.floor(scaledViewport.width * outputScale);
                    canvas.height = Math.floor(scaledViewport.height * outputScale);
                    canvas.style.width = Math.floor(scaledViewport.width) + 'px';
                    canvas.style.height = Math.floor(scaledViewport.height) + 'px';
                    canvas.style.display = 'block';
                    canvas.style.margin = '10px auto';
                    canvas.style.background = '#fff';
                    canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,.35)';

                    // high DPI
                    ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

                    pdfViewer.appendChild(canvas);

                    await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;
                }
            };

            renderAll();
        })
        .catch(err => {
            console.error('PDF load error:', err);
            pdfViewer.innerHTML = `<div style="color:#fff;padding:20px;text-align:center;">
                Could not load PDF. <br>
                <button onclick="openResumeNewTab()" style="margin-top:10px;padding:6px 12px;cursor:pointer;">Open in New Tab</button>
            </div>`;
        });
}

/* Re-render PDF on window resize with debounce */
let _pdfResizeTimer = null;
window.addEventListener('resize', () => {
    const resumeWin = document.getElementById('resumeWindow');
    if (resumeWin && resumeWin.style.display !== 'none' && PDF_DOC) {
        clearTimeout(_pdfResizeTimer);
        _pdfResizeTimer = setTimeout(loadResumePDF, 220);
    }
});

/* ======================================================
   8) RESUME ACTIONS (download / open)
====================================================== */
function downloadResume() {
    const url = '/assets/files/Ayush-Resume.pdf';
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Ayush-Resume.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function openResumeNewTab() {
    window.open('/assets/files/Ayush-Resume.pdf', '_blank');
}

// ===== Simple music player (safe wiring after DOM ready) =====

if (typeof reportPlayerStatus === 'undefined') {
    window.reportPlayerStatus = function(status, data) {
        console.log('Music Player Status:', status, data || '');
    };
}

document.addEventListener('DOMContentLoaded', () => {
    const tracks = [
        { title: 'Rick Roll', artist: 'Rick', src: 'assets/music/song1.mp3', albumArt: 'assets/images/song1.gif' },
        { title: 'Song for Denise', artist: 'Artist 1', src: 'assets/music/song2.mp3', albumArt: 'assets/images/song2.png' },
    ];

    const audioEl = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playPauseBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const progressBar = document.getElementById('xpProgressBar');
    const albumArtEl = document.getElementById('albumArt');

    if (!audioEl) {
        console.warn('audioPlayer element not found');
        return;
    }

    let current = 0;
    let playing = false;

    function formatTimeLocal(seconds) {
        const m = Math.floor(seconds / 60) || 0;
        const s = Math.floor(seconds % 60) || 0;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    function loadTrackLocal(idx) {
        if (idx < 0) idx = tracks.length - 1;
        if (idx >= tracks.length) idx = 0;
        current = idx;
        const t = tracks[current];
        audioEl.src = t.src;
        if (albumArtEl) albumArtEl.src = t.albumArt || '';
        if (progressBar) { progressBar.value = 0; progressBar.max = 0; }
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (totalTimeEl) totalTimeEl.textContent = '0:00';
        // update metadata once loaded
        audioEl.addEventListener('loadedmetadata', function onMeta() {
            if (totalTimeEl) totalTimeEl.textContent = formatTimeLocal(audioEl.duration);
            if (progressBar) progressBar.max = Math.floor(audioEl.duration || 0);
            audioEl.removeEventListener('loadedmetadata', onMeta);
        });
    }

    function playPauseLocal() {
        if (!audioEl.src) loadTrackLocal(current);
        const p = audioEl.paused ? audioEl.play() : audioEl.pause();
        if (p && p.then) {
            p.then(() => {
                playing = !audioEl.paused;
                if (playBtn) playBtn.textContent = playing ? '▌▌' : '▶';
            }).catch(err => {
                console.warn('play() rejected', err);
            });
        } else {
            playing = !audioEl.paused;
            if (playBtn) playBtn.textContent = playing ? '▌▌' : '▶';
        }
    }

    function startPlaybackAfterLoad() {
        // Attempt to play and update UI/state
        try {
            const p = audioEl.play();
            if (p && p.then) {
                p.then(() => {
                    playing = true;
                    if (playBtn) playBtn.textContent = '▌▌';
                }).catch(err => {
                    // Autoplay blocked or other error
                    playing = false;
                    if (playBtn) playBtn.textContent = '▶';
                    console.warn('play() rejected after track change', err);
                });
            } else {
                playing = !audioEl.paused;
                if (playBtn) playBtn.textContent = playing ? '▌▌' : '▶';
            }
        } catch (e) {
            console.warn('Error attempting play after load', e);
        }
    }

    function nextLocal() { loadTrackLocal(current + 1); startPlaybackAfterLoad(); }
    function prevLocal() { loadTrackLocal(current - 1); startPlaybackAfterLoad(); }

    // Expose to window so other UI can call
    try { 
        window.nextTrack = nextLocal; 
        window.previousTrack = prevLocal; 
        window.togglePlayPause = playPauseLocal; 
        window.selectTrack = loadTrackLocal; 
    } catch (e) {}

    // Attach listeners
    if (playBtn) playBtn.addEventListener('click', playPauseLocal);
    if (nextBtn) nextBtn.addEventListener('click', () => { nextLocal(); reportPlayerStatus('user-click-next'); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prevLocal(); reportPlayerStatus('user-click-prev'); });
    if (progressBar) progressBar.addEventListener('input', () => { 
        audioEl.currentTime = Number(progressBar.value); 
        if (currentTimeEl) currentTimeEl.textContent = formatTimeLocal(audioEl.currentTime); 
    });
    audioEl.addEventListener('timeupdate', () => { 
        if (currentTimeEl) currentTimeEl.textContent = formatTimeLocal(audioEl.currentTime); 
        if (progressBar) progressBar.value = Math.floor(audioEl.currentTime); 
    });
    audioEl.addEventListener('ended', nextLocal);
    
    // Start with first track selected
    loadTrackLocal(0);
    reportPlayerStatus('simple-player-initialized');
    
    // Attempt autoplay after a short delay to ensure track is loaded
    setTimeout(attemptAutoPlay, 100);
});
    
// Autoplay support: try to start playback when the music window opens
const MUSIC_AUTOPLAY = true;

function attemptAutoPlay() {
    if (!MUSIC_AUTOPLAY) return;
    const audioEl = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playPauseBtn');
    if (!audioEl) return;

    // If audio already has source and is paused, try to play
    if (audioEl.src) {
        const p = audioEl.play();
        if (p && p.then) {
            p.then(() => {
                if (playBtn) playBtn.textContent = '▌▌';
                reportPlayerStatus('autoplay-success');
            }).catch(err => {
                console.warn('Autoplay blocked', err);
                reportPlayerStatus('autoplay-blocked', { error: err && err.message });
            });
        }
    } else {
        // if no source yet, select first track and try (no UI overlay)
        const select = window.selectTrack || function(){};
        try { select(0); } catch (e) {}
        setTimeout(() => attemptAutoPlay(), 200);
    }
}

// Initialize music player (called when music window opens)
function initializeMusicPlayer() {
    // Trigger autoplay when window is opened
    setTimeout(attemptAutoPlay, 150);
}

// Stop any music playback (pauses audio, stops demo progress, resets UI)
function stopAllMusic() {
    try {
        // Stop musicPlayer current audio if present
        if (window.musicPlayer) {
            if (musicPlayer.currentAudio && typeof musicPlayer.currentAudio.pause === 'function') {
                try { musicPlayer.currentAudio.pause(); } catch (e) {}
            }
            musicPlayer.isPlaying = false;
        }

        // Stop demo progress if running
        try { stopDemoProgress(); } catch (e) {}

        // Pause any <audio id="audioPlayer"> element
        const audioEl = document.getElementById('audioPlayer');
        if (audioEl && typeof audioEl.pause === 'function') {
            try { audioEl.pause(); audioEl.currentTime = 0; } catch (e) {}
        }

        // Update play button UI
        const playBtn = document.getElementById('playPauseBtn');
        if (playBtn) playBtn.textContent = '▶';
    } catch (e) {
        console.warn('Error stopping music', e);
    }
}

/* ======================================================
   10) KEYBOARD SUPPORT (desktop)
====================================================== */
function addKeyboardSupport() {
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            // close open windows
            document.querySelectorAll('.window').forEach(win => {
                if (win.style.display === 'block') closeWindow(win.id);
            });
            // close start menu
            const menu = document.getElementById('startMenu');
            if (menu) menu.style.display = 'none';
        }
    });
}

/* Initialize once DOM loaded */
window.addEventListener('DOMContentLoaded', () => {
    addKeyboardSupport();
});
