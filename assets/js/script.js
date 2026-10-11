/* ==========================================================
   Hexora89 — Windows XP-style desktop
   ----------------------------------------------------------
   The desktop "shell": window management, taskbar, start menu,
   the PDF resume viewer and a small XP-style music player.

   File layout:
     1.  Shared state
     2.  Desktop icons
     3.  Window positioning
     4.  Start menu
     5.  Window controls (open / close / minimize / maximize)
     6.  Taskbar
     7.  Window dragging
     8.  PDF resume viewer
     9.  Resume actions
     10. Music player
     11. Keyboard support
     12. Boot
   ========================================================== */

/* ==========================================================
   1. Shared state
   ========================================================== */
let zIndexCounter = 10;       // stacking depth of the most recently focused window
let nextCascadeLeft = null;   // where the next opened window is placed...
let nextCascadeTop = null;    // ...before each new window steps down/right
const CASCADE_STEP_PX = 24;   // offset applied per newly opened window
const TASKBAR_HEIGHT = 30;    // keep in sync with #taskbar height in style.css

/* ==========================================================
   2. Desktop icons
   ========================================================== */

/* Enlarge the icon whose window is being opened (visual feedback). */
function highlightDesktopIcon(event) {
    document.querySelectorAll('.desktop-icon').forEach(icon => icon.classList.remove('desktop-icon-large'));
    if (event && event.currentTarget) event.currentTarget.classList.add('desktop-icon-large');
}

/* ==========================================================
   3. Window positioning
   ========================================================== */

/* Place a window in a cascading pattern, wrapping back toward the
   centre whenever it would overflow the right or bottom edge. */
function positionWindowWithCascade(win) {
    const wasHidden = win.style.display === 'none' || getComputedStyle(win).display === 'none';
    if (wasHidden) win.style.display = 'block'; // must be visible to be measurable

    const width = win.offsetWidth || 900;
    const height = win.offsetHeight || 700;

    if (nextCascadeLeft === null || nextCascadeTop === null) {
        // first window: start centred, slightly left of centre
        nextCascadeLeft = Math.max(0, Math.floor((window.innerWidth - width) / 2) - 60);
        nextCascadeTop = Math.max(0, Math.floor((window.innerHeight - height - TASKBAR_HEIGHT) / 2));
    } else {
        // subsequent windows: step down and to the right
        nextCascadeLeft += CASCADE_STEP_PX;
        nextCascadeTop += CASCADE_STEP_PX;
    }

    // wrap back to the centred start when we run off-screen
    if (nextCascadeLeft + width > window.innerWidth - 10) {
        nextCascadeLeft = Math.max(0, Math.floor((window.innerWidth - width) / 2) - 60);
    }
    if (nextCascadeTop + height > window.innerHeight - TASKBAR_HEIGHT) {
        nextCascadeTop = Math.max(0, Math.floor((window.innerHeight - height - TASKBAR_HEIGHT) / 2));
    }

    win.style.left = nextCascadeLeft + 'px';
    win.style.top = nextCascadeTop + 'px';
}

/* ==========================================================
   4. Start menu
   ========================================================== */
function toggleStartMenu() {
    const menu = document.getElementById('startMenu');
    const button = document.getElementById('startButton');
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
    menu.setAttribute('aria-hidden', isVisible ? 'true' : 'false');
    button.setAttribute('aria-expanded', isVisible ? 'false' : 'true');
}

/* Clicking anywhere outside the menu (or the Start button) closes it. */
document.addEventListener('click', (e) => {
    const menu = document.getElementById('startMenu');
    const button = document.getElementById('startButton');
    if (!menu.contains(e.target) && !button.contains(e.target)) {
        menu.style.display = 'none';
    }
});

/* ==========================================================
   5. Window controls
   ========================================================== */

/* Open a window: show it, cascade-position it, raise it, then run
   any per-app lazy initialisation. */
function openWindow(event, id) {
    highlightDesktopIcon(event);

    const win = document.getElementById(id);
    if (!win) return;

    win.style.display = 'block';
    win.setAttribute('aria-hidden', 'false');

    positionWindowWithCascade(win);
    bringToFront(win);

    // windows are not kept in the taskbar while they are open
    removeTaskbarButton(id);

    // app-specific lazy init
    if (id === 'resumeWindow') setTimeout(loadResumePDF, 200);
    if (id === 'musicWindow') initializeMusicPlayer();
}

function closeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = 'none';
    win.setAttribute('aria-hidden', 'true');
    removeTaskbarButton(id);

    // stop audio when the music window is closed
    if (id === 'musicWindow') stopAllMusic();
}

/* Hide the window but keep a taskbar button so it can be restored. */
function minimizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;
    win.style.display = 'none';
    win.setAttribute('aria-hidden', 'true');
    addTaskbarButton(id);
}

/* Toggle between the remembered geometry and a fullscreen fit. */
function maximizeWindow(id) {
    const win = document.getElementById(id);
    if (!win) return;

    if (win.dataset.maximized === 'true') {
        // restore the geometry saved before maximizing
        win.style.width = win.dataset.prevWidth || '900px';
        win.style.height = win.dataset.prevHeight || '700px';
        win.style.top = win.dataset.prevTop || '40px';
        win.style.left = win.dataset.prevLeft || '40px';
        win.dataset.maximized = 'false';
    } else {
        // remember the current geometry, then fill the screen
        win.dataset.prevWidth = win.style.width || '900px';
        win.dataset.prevHeight = win.style.height || '700px';
        win.dataset.prevTop = win.style.top || '40px';
        win.dataset.prevLeft = win.style.left || '40px';

        win.style.left = '0';
        win.style.top = '0';
        win.style.width = '100%';
        win.style.height = `calc(100% - ${TASKBAR_HEIGHT}px)`;
        win.dataset.maximized = 'true';
    }

    // the resume viewer needs a re-render at the new size
    if (id === 'resumeWindow') setTimeout(loadResumePDF, 120);
}

/* Raise a window above all others. */
function bringToFront(win) {
    zIndexCounter++;
    win.style.zIndex = zIndexCounter;
}

/* ==========================================================
   6. Taskbar
   ========================================================== */

/* Add a taskbar button for a minimized window (ignored if present). */
function addTaskbarButton(id) {
    const taskbarWindows = document.getElementById('taskbar-windows');
    if (!taskbarWindows) return;
    if (document.getElementById('task-' + id)) return;

    const btn = document.createElement('button');
    btn.id = 'task-' + id;

    // label it with the window's title bar text
    const headerTitle = document.querySelector(`#${id} .window-header span`);
    btn.innerText = headerTitle ? headerTitle.innerText : id.replace('Window', '');

    // clicking restores the window, or minimizes it again if already open
    btn.onclick = () => {
        const win = document.getElementById(id);
        if (!win) return;
        if (win.style.display === 'none' || win.style.display === '') {
            win.style.display = 'block';
            bringToFront(win);
            removeTaskbarButton(id);
            if (id === 'resumeWindow') setTimeout(loadResumePDF, 120);
        } else {
            minimizeWindow(id);
        }
    };

    taskbarWindows.appendChild(btn);
}

function removeTaskbarButton(id) {
    const btn = document.getElementById('task-' + id);
    if (btn) btn.remove();

    // also clear the enlarged-icon state for that desktop icon
    const desktopIcon = document.querySelector(`.desktop-icon[onclick*='${id}']`);
    if (desktopIcon) desktopIcon.classList.remove('desktop-icon-large');
}

/* ==========================================================
   7. Window dragging (mouse only — desktop experience)
   ========================================================== */
document.querySelectorAll('.window-header').forEach(header => {
    let dragged = null;

    header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return; // let the window controls work

        dragged = header.parentElement;
        bringToFront(dragged);

        const offsetX = e.clientX - dragged.offsetLeft;
        const offsetY = e.clientY - dragged.offsetTop;

        function onMove(e) {
            // clamp so the window stays within the viewport / above the taskbar
            const newLeft = Math.min(window.innerWidth - dragged.offsetWidth, Math.max(0, e.clientX - offsetX));
            const newTop = Math.min(window.innerHeight - dragged.offsetHeight - TASKBAR_HEIGHT, Math.max(0, e.clientY - offsetY));
            dragged.style.left = newLeft + 'px';
            dragged.style.top = newTop + 'px';
        }

        function onUp() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            dragged = null;
        }

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    });
});

/* ==========================================================
   8. PDF resume viewer
   Renders every page of the resume onto canvases so it works
   without any native browser PDF plugin.
   ========================================================== */

const RESUME_URL = 'assets/files/Ayush-Resume.pdf';

/* Point PDF.js at its worker as soon as the library is available. */
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

let PDF_DOC = null; // cached document, reused when re-rendering on resize

/* Fetch the PDF and render it into #pdfViewer. */
function loadResumePDF() {
    const pdfViewer = document.getElementById('pdfViewer');
    if (!pdfViewer) return;

    pdfViewer.innerHTML = '<div style="color:#fff;padding:20px;text-align:center;">Loading PDF...</div>';

    // fetch as an arrayBuffer so the browser never tries to embed it
    fetch(RESUME_URL, { cache: 'no-cache' })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok: ' + response.status);
            return response.arrayBuffer();
        })
        .then(arrayBuffer => pdfjsLib.getDocument({ data: arrayBuffer }).promise)
        .then(pdf => {
            PDF_DOC = pdf;
            pdfViewer.innerHTML = '';
            renderAllPages(pdf, pdfViewer);
        })
        .catch(err => {
            console.error('PDF load error:', err);
            pdfViewer.innerHTML = `<div style="color:#fff;padding:20px;text-align:center;">
                Could not load PDF. <br>
                <button onclick="openResumeNewTab()" style="margin-top:10px;padding:6px 12px;cursor:pointer;">Open in New Tab</button>
            </div>`;
        });
}

/* Render every page sequentially, scaled to fit the viewer width. */
async function renderAllPages(pdf, pdfViewer) {
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const baseViewport = page.getViewport({ scale: 1 });

        // scale so the page fills the viewer (with a little padding)
        const maxWidth = Math.max(600, pdfViewer.clientWidth - 20);
        const viewport = page.getViewport({ scale: maxWidth / baseViewport.width });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const outputScale = window.devicePixelRatio || 1;

        // render at device pixel ratio for crisp text on HiDPI screens
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';
        canvas.style.display = 'block';
        canvas.style.margin = '10px auto';
        canvas.style.background = '#fff';
        canvas.style.boxShadow = '0 2px 8px rgba(0,0,0,.35)';

        ctx.setTransform(outputScale, 0, 0, outputScale, 0, 0);

        pdfViewer.appendChild(canvas);
        await page.render({ canvasContext: ctx, viewport }).promise;
    }
}

/* Re-render (debounced) on resize while the resume window is open. */
let _pdfResizeTimer = null;
window.addEventListener('resize', () => {
    const resumeWin = document.getElementById('resumeWindow');
    if (resumeWin && resumeWin.style.display !== 'none' && PDF_DOC) {
        clearTimeout(_pdfResizeTimer);
        _pdfResizeTimer = setTimeout(loadResumePDF, 220);
    }
});

/* ==========================================================
   9. Resume actions
   ========================================================== */
function downloadResume() {
    const a = document.createElement('a');
    a.href = RESUME_URL;
    a.download = 'Ayush-Resume.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

function openResumeNewTab() {
    window.open(RESUME_URL, '_blank');
}

/* ==========================================================
   10. Music player (XP style)
   ========================================================== */

const TRACKS = [
    { title: 'Rick Roll',       artist: 'Rick',     src: 'assets/music/song1.mp3', albumArt: 'assets/images/song1.gif' },
    { title: 'Song for Denise', artist: 'Artist 1', src: 'assets/music/song2.mp3', albumArt: 'assets/images/song2.png' },
];

/* Simple status logger, handy when debugging playback on devices. */
function reportPlayerStatus(status, data) {
    console.log('Music Player Status:', status, data || '');
}

/* Wire up all player controls. Called once on boot. */
function setupMusicPlayer() {
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

    let current = 0; // index of the active track

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60) || 0;
        const s = Math.floor(seconds % 60) || 0;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const setPlayingUI = (isPlaying) => {
        if (playBtn) playBtn.textContent = isPlaying ? '▌▌' : '▶';
    };

    /* Load a track by index, wrapping around at both ends. */
    const loadTrack = (idx) => {
        if (idx < 0) idx = TRACKS.length - 1;
        if (idx >= TRACKS.length) idx = 0;
        current = idx;

        const track = TRACKS[current];
        audioEl.src = track.src;
        if (albumArtEl) albumArtEl.src = track.albumArt || '';
        if (progressBar) { progressBar.value = 0; progressBar.max = 0; }
        if (currentTimeEl) currentTimeEl.textContent = '0:00';
        if (totalTimeEl) totalTimeEl.textContent = '0:00';

        // fill in the duration once the browser has read the metadata
        audioEl.addEventListener('loadedmetadata', function onMeta() {
            if (totalTimeEl) totalTimeEl.textContent = formatTime(audioEl.duration);
            if (progressBar) progressBar.max = Math.floor(audioEl.duration || 0);
            audioEl.removeEventListener('loadedmetadata', onMeta);
        });
    };

    /* Attempt playback, handling promise rejection (autoplay policies). */
    const tryPlay = () => {
        try {
            const p = audioEl.play();
            if (p && p.then) {
                p.then(() => setPlayingUI(true))
                 .catch(err => { setPlayingUI(false); console.warn('play() rejected', err); });
            } else {
                setPlayingUI(!audioEl.paused);
            }
        } catch (e) {
            console.warn('Error attempting play', e);
        }
    };

    const togglePlay = () => {
        if (!audioEl.src) loadTrack(current);
        if (audioEl.paused) {
            tryPlay();
        } else {
            audioEl.pause();
            setPlayingUI(false);
        }
    };

    const nextTrack = () => { loadTrack(current + 1); tryPlay(); };
    const prevTrack = () => { loadTrack(current - 1); tryPlay(); };

    // expose controls so the desktop shell can drive them too
    window.togglePlayPause = togglePlay;
    window.nextTrack = nextTrack;
    window.previousTrack = prevTrack;

    // button listeners
    if (playBtn) playBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', () => { nextTrack(); reportPlayerStatus('user-click-next'); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prevTrack(); reportPlayerStatus('user-click-prev'); });

    // seek bar
    if (progressBar) progressBar.addEventListener('input', () => {
        audioEl.currentTime = Number(progressBar.value);
        if (currentTimeEl) currentTimeEl.textContent = formatTime(audioEl.currentTime);
    });

    // keep the UI in sync with playback, auto-advance when a track ends
    audioEl.addEventListener('timeupdate', () => {
        if (currentTimeEl) currentTimeEl.textContent = formatTime(audioEl.currentTime);
        if (progressBar) progressBar.value = Math.floor(audioEl.currentTime);
    });
    audioEl.addEventListener('ended', nextTrack);

    // start with the first track selected
    loadTrack(0);
    reportPlayerStatus('simple-player-initialized');
}

/* Best-effort autoplay — triggered when the music window opens. */
function initializeMusicPlayer() {
    setTimeout(attemptAutoPlay, 150);
}

function attemptAutoPlay() {
    const audioEl = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playPauseBtn');
    if (!audioEl) return;

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
        // no source yet — retry shortly (the first track loads on boot)
        setTimeout(attemptAutoPlay, 200);
    }
}

/* Pause playback and reset the UI (used when the window is closed). */
function stopAllMusic() {
    const audioEl = document.getElementById('audioPlayer');
    if (audioEl) {
        audioEl.pause();
        audioEl.currentTime = 0;
    }
    const playBtn = document.getElementById('playPauseBtn');
    if (playBtn) playBtn.textContent = '▶';
}

/* ==========================================================
   11. Keyboard support
   ========================================================== */
function addKeyboardSupport() {
    // Enter / Space activates the focused desktop icon
    document.querySelectorAll('.desktop-icon').forEach(icon => {
        icon.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // Escape closes every open window and the start menu
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.window').forEach(win => {
                if (win.style.display === 'block') closeWindow(win.id);
            });
            const menu = document.getElementById('startMenu');
            if (menu) menu.style.display = 'none';
        }
    });
}

/* ==========================================================
   12. Boot
   ========================================================== */
document.addEventListener('DOMContentLoaded', () => {
    setupMusicPlayer();
    addKeyboardSupport();

    // best-effort autoplay of the first track
    setTimeout(attemptAutoPlay, 100);
});
