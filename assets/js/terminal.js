/* ======================================================
   TERMINAL APPLICATION
   Old-school Windows terminal inside the XP desktop.
   Commands (ONLY): help, about, neofetch, clear
   ====================================================== */

/* ---- CONFIG — edit all profile/system text here ---- */
const TERMINAL_CONFIG = {
    user: "ayush",
    host: "workstation",
    prompt: "ayush@workstation:~$",
    startup: [
        "Welcome to my site",
        "Type 'help' to see available command...",
        "",
    ],
    profile: {
        whoami: "Whoami?",
        tagline: "Red Teaming | CTFs | Pentesting",
        name: "Ayush (Hexora)",
        role: "Red Teamer",
        intro: "Hey There! I am Hexora, a 20-year-old with a keen interest in Offsec. Dive in! Explore, and enjoy your stay.",
        outro: "Feel free to reach out if you have any suggestions or queries.",
    },
    neofetch: {
        os: "Windows XP",
        host: "MS-7E88 (1.0)",
        shell: "portfolio-shell",
        uptime: "6 hours, 2 mins",
    },
};

/* ---- State ---- */
let terminalBooted = false;
let history = [];
let historyIndex = -1;

function getOutput() {
    return document.getElementById('terminalOutput');
}
function getInput() {
    return document.getElementById('terminalInput');
}

/* ---- Rendering helpers ---- */
function scrollOutput() {
    const out = getOutput();
    if (out) out.scrollTop = out.scrollHeight;
}

function appendStyled(lines) {
    const out = getOutput();
    if (!out) return;
    lines.forEach(function (line) {
        const text = Array.isArray(line) ? line[0] : line;
        const cls = Array.isArray(line) ? line[1] : '';
        const div = document.createElement('div');
        div.className = 'terminal-line' + (cls ? ' ' + cls : '');
        div.textContent = text;
        out.appendChild(div);
    });
    scrollOutput();
}

function appendCommandLine(cmd) {
    const out = getOutput();
    if (!out) return;
    const div = document.createElement('div');
    div.className = 'terminal-line terminal-cmd-line';
    const p = document.createElement('span');
    p.className = 'terminal-prompt';
    p.textContent = TERMINAL_CONFIG.prompt + ' ';
    const c = document.createElement('span');
    c.className = 'terminal-cmd-text';
    c.textContent = cmd;
    div.appendChild(p);
    div.appendChild(c);
    out.appendChild(div);
    scrollOutput();
}

function clearOutput() {
    const out = getOutput();
    if (out) out.innerHTML = '';
}

/* ---- Commands ---- */
function cmdHelp() {
    return [
        ['Available commands:', 'terminal-head'],
        ['', ''],
        ['  help       Show available commands', ''],
        ['  about      A little about me', ''],
        ['  neofetch   Portfolio system info', ''],
        ['  clear      Clear the terminal', ''],
        ['', ''],
    ];
}

function cmdAbout() {
    const p = TERMINAL_CONFIG.profile;
    return [
        [p.whoami, 'terminal-head'],
        [p.tagline, 'terminal-green'],
        ['', ''],
        ['Name: ' + p.name, 'terminal-cyan'],
        ['Role: ' + p.role, 'terminal-cyan'],
        ['', ''],
        [p.intro, ''],
        ['', ''],
        [p.outro, 'terminal-green'],
        ['', '']
    ];
}

function cmdNeofetch() {
    const n = TERMINAL_CONFIG.neofetch;
    const user = TERMINAL_CONFIG.user;
    const host = TERMINAL_CONFIG.host;
    return [
        ['        .--.          ' + user + '@' + host, 'terminal-neofetch'],
        ['       |o_o |         ------------------', 'terminal-neofetch'],
        ['       |:_/ |         OS: ' + n.os, 'terminal-neofetch'],
        ['      //   \\ \\        Host: ' + n.host, 'terminal-neofetch'],
        ['     (|     | )       Shell: ' + n.shell, 'terminal-neofetch'],
        ["    /'\\_   _/`\\       Uptime: " + n.uptime, 'terminal-neofetch'],
        ['    \\___)=(___/', 'terminal-neofetch'],
        ['', ''],
    ];
}

function runCommand(raw) {
    const cmd = raw.trim();

    // clear wipes everything, including the echoed command
    if (cmd === 'clear') {
        clearOutput();
        return;
    }

    appendCommandLine(cmd);
    if (!cmd) return;

    const name = cmd.split(/\s+/)[0].toLowerCase();
    switch (name) {
        case 'help':     appendStyled(cmdHelp()); break;
        case 'about':    appendStyled(cmdAbout()); break;
        case 'neofetch': appendStyled(cmdNeofetch()); break;
        default:         appendStyled(['command not found']);
    }
}

/* ---- Boot / focus ---- */
function initTerminal() {
    const win = document.getElementById('terminalWindow');
    if (!win) return;

    // keep the visible prompt in sync with config
    const promptEl = document.querySelector('#terminalWindow .terminal-input-line .terminal-prompt');
    if (promptEl) promptEl.textContent = TERMINAL_CONFIG.prompt;

    if (!terminalBooted) {
        appendStyled(TERMINAL_CONFIG.startup);
        terminalBooted = true;
    }

    const input = getInput();
    if (input && document.activeElement !== input) input.focus();
}

/* ---- Events ---- */
document.addEventListener('DOMContentLoaded', function () {
    const input = getInput();
    if (!input) return;

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = input.value;
            runCommand(value);
            if (value.trim() !== '') history.push(value);
            historyIndex = history.length;
            input.value = '';
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (history.length === 0) return;
            historyIndex = Math.max(0, historyIndex - 1);
            input.value = history[historyIndex] || '';
            input.setSelectionRange(input.value.length, input.value.length);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            historyIndex = Math.min(history.length, historyIndex + 1);
            input.value = historyIndex < history.length ? history[historyIndex] : '';
            input.setSelectionRange(input.value.length, input.value.length);
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            clearOutput();
        }
    });

    // Clicking anywhere in the terminal refocuses the input
    const term = document.querySelector('.terminal');
    if (term) term.addEventListener('click', function () { initTerminal(); });
});