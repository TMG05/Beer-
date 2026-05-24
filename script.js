const brailleDict = {
    'a': '⠁', 'b': '⠃', 'c': '⠉', 'd': '⠙', 'e': '⠑',
    'f': '⠋', 'g': '⠛', 'h': '⠓', 'i': '⠊', 'j': '⠚',
    'k': '⠅', 'l': '⠇', 'm': '⠍', 'n': '⠝', 'o': '⠕',
    'p': '⠏', 'q': '⠟', 'r': '⠗', 's': '⠎', 't': '⠞',
    'u': '⠥', 'v': '⠧', 'w': '⠺', 'x': '⠭', 'y': '⠽', 'z': '⠵',
    ' ': ' ', '1': '⠼⠁', '2': '⠼⠃', '3': '⠼⠉', '4': '⠼⠙', '5': '⠼⠑',
    '6': '⠼⠋', '7': '⠼⠛', '8': '⠼⠓', '9': '⠼⠊', '0': '⠼⠚',
    ',': '⠂', ';': '⠆', ':': '⠒', '.': '⠲', '!': '⠖', '?': '⠦'
};

function textToBraille(text) {
    return text.toLowerCase().split('').map(char => {
        const normalized = char.normalize("NFD").replace(/[̀-ͯ]/g, "");
        return brailleDict[normalized] || char;
    }).join('');
}

function walkDOM(node, fn) {
    const excludedIds = ['a11y-container', 'music-player', 'navbar', 'exp-player'];
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    if (node.id && excludedIds.includes(node.id)) return;
    if (node.nodeType === 3 && node.nodeValue.trim() !== '') {
        fn(node);
    } else {
        for (let i = 0; i < node.childNodes.length; i++) walkDOM(node.childNodes[i], fn);
    }
}

function translatePageToBraille() {
    walkDOM(document.body, node => {
        if (node.originalText === undefined) node.originalText = node.nodeValue;
        node.nodeValue = textToBraille(node.originalText);
    });
}

function revertPageToText() {
    walkDOM(document.body, node => {
        if (node.originalText !== undefined) node.nodeValue = node.originalText;
    });
}

let currentUtterance = null;
let availableVoices = [];

function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}

loadVoices();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getBestFrenchVoice() {
    const fr = availableVoices.filter(v => v.lang.startsWith('fr'));
    if (!fr.length) return null;
    return fr.find(v =>
        v.name.includes('Google') || v.name.includes('Microsoft') ||
        v.name.includes('Premium') || v.name.includes('Neural') || v.name.includes('Natural')
    ) || fr[0];
}

function readPageAloud() {
    window.speechSynthesis.cancel();
    const excluded = ['a11y-container', 'music-player', 'navbar', 'exp-player'];
    const allText = document.body.innerText;
    let clean = allText;
    excluded.forEach(id => {
        const el = document.getElementById(id);
        if (el) clean = clean.replace(el.innerText, '');
    });
    clean = clean.replace(/\n/g, '. ').replace(/([.!?])(?=[^\s])/g, "$1 ");

    currentUtterance = new SpeechSynthesisUtterance(clean);
    currentUtterance.lang = 'fr-FR';
    const voice = getBestFrenchVoice();
    if (voice) currentUtterance.voice = voice;
    currentUtterance.rate = 0.85;
    currentUtterance.pitch = 0.59;

    document.getElementById('btn-speech').style.display = 'none';
    document.getElementById('btn-stop-speech').style.display = 'block';

    currentUtterance.onend = () => {
        document.getElementById('btn-speech').style.display = 'block';
        document.getElementById('btn-stop-speech').style.display = 'none';
    };
    window.speechSynthesis.speak(currentUtterance);
}

function stopReading() {
    window.speechSynthesis.cancel();
    document.getElementById('btn-speech').style.display = 'block';
    document.getElementById('btn-stop-speech').style.display = 'none';
}

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => toast.classList.remove('show'), 2200);
}

function formatTime(s) {
    const m = Math.floor(s / 60);
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

function initMusicPlayer() {
    const audio = document.getElementById('audio');
    if (!audio) return { toggle: () => {} };

    const btnPlay = document.getElementById('btn-play-pause');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const volumeBar = document.getElementById('volume-bar');
    const volumeIcon = document.getElementById('volume-icon');
    const waveform = document.getElementById('waveform');

    audio.volume = 0.7;

    audio.addEventListener('loadedmetadata', () => {
        progressBar.max = audio.duration;
        durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
        progressBar.value = audio.currentTime;
        currentTimeEl.textContent = formatTime(audio.currentTime);
    });

    function setPlaying(on) {
        btnPlay.textContent = on ? '⏸' : '▶';
        btnPlay.setAttribute('aria-label', on ? 'Pause' : 'Lecture');
        waveform.classList.toggle('playing', on);
    }

    audio.addEventListener('ended', () => setPlaying(false));

    btnPlay.addEventListener('click', () => {
        if (audio.paused) { audio.play(); setPlaying(true); showToast('▶ Lecture'); }
        else              { audio.pause(); setPlaying(false); showToast('⏸ Pause'); }
    });

    progressBar.addEventListener('input', () => { audio.currentTime = progressBar.value; });

    volumeBar.addEventListener('input', () => {
        audio.volume = volumeBar.value;
        const v = parseFloat(volumeBar.value);
        volumeIcon.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
    });

    return { toggle: () => btnPlay.click() };
}

function initFontSize() {
    const STEP = 2, MIN = 10, MAX = 28;
    let size = parseInt(localStorage.getItem('fontSize') || '16', 10);

    const apply = () => { document.documentElement.style.fontSize = size + 'px'; };
    apply();

    document.getElementById('btn-font-increase').addEventListener('click', () => {
        if (size >= MAX) return;
        size = Math.min(size + STEP, MAX);
        apply();
        localStorage.setItem('fontSize', size);
        showToast('Texte agrandi');
    });

    document.getElementById('btn-font-decrease').addEventListener('click', () => {
        if (size <= MIN) return;
        size = Math.max(size - STEP, MIN);
        apply();
        localStorage.setItem('fontSize', size);
        showToast('Texte réduit');
    });

    document.getElementById('btn-font-reset').addEventListener('click', () => {
        size = 16;
        apply();
        localStorage.removeItem('fontSize');
        showToast('Taille réinitialisée');
    });

    return {
        increase: () => document.getElementById('btn-font-increase').click(),
        decrease: () => document.getElementById('btn-font-decrease').click(),
    };
}

function initDyslexia() {
    const btn = document.getElementById('btn-dyslexia');

    const apply = on => {
        document.body.classList.toggle('dyslexia-mode', on);
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', String(on));
    };

    apply(localStorage.getItem('dyslexia') === 'true');

    btn.addEventListener('click', () => {
        const on = !document.body.classList.contains('dyslexia-mode');
        apply(on);
        localStorage.setItem('dyslexia', on);
        showToast(on ? 'Police dyslexie activée' : 'Police standard');
    });
}

function initHighContrast() {
    const btn = document.getElementById('btn-high-contrast');
    if (!btn) return;

    const apply = on => {
        document.body.classList.toggle('high-contrast', on);
        btn.classList.toggle('active', on);
        btn.setAttribute('aria-pressed', String(on));
        if (on) document.body.classList.remove('light-theme');
    };

    apply(localStorage.getItem('highContrast') === 'true');

    btn.addEventListener('click', () => {
        const on = !document.body.classList.contains('high-contrast');
        apply(on);
        localStorage.setItem('highContrast', on);
        showToast(on ? 'Haut contraste activé' : 'Contraste normal');
    });
}

function setNavActive() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(link => {
        const href = link.getAttribute('href');
        link.classList.toggle('active', href === page || (page === '' && href === 'index.html'));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setNavActive();

    const btnBraille    = document.getElementById('btn-braille');
    const btnText       = document.getElementById('btn-text');
    const btnSpeech     = document.getElementById('btn-speech');
    const btnStopSpeech = document.getElementById('btn-stop-speech');
    const btnTheme      = document.getElementById('btn-theme');

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        btnTheme.textContent = '☀️';
    } else {
        btnTheme.textContent = '🌙';
    }

    btnTheme.addEventListener('click', () => {
        document.body.classList.remove('high-contrast');
        localStorage.removeItem('highContrast');
        const light = document.body.classList.toggle('light-theme');
        localStorage.setItem('theme', light ? 'light' : 'dark');
        btnTheme.textContent = light ? '☀️' : '🌙';
        showToast(light ? 'Thème clair' : 'Thème sombre');
        const hcBtn = document.getElementById('btn-high-contrast');
        if (hcBtn) { hcBtn.classList.remove('active'); hcBtn.setAttribute('aria-pressed', 'false'); }
    });

    btnBraille.addEventListener('click', () => {
        translatePageToBraille();
        btnBraille.style.display = 'none';
        btnText.style.display = 'block';
        showToast('Braille activé');
    });

    btnText.addEventListener('click', () => {
        revertPageToText();
        btnText.style.display = 'none';
        btnBraille.style.display = 'block';
        showToast('Texte normal restauré');
    });

    btnSpeech.addEventListener('click', () => { readPageAloud(); showToast('Lecture démarrée'); });
    btnStopSpeech.addEventListener('click', () => { stopReading(); showToast('Lecture stoppée'); });

    const player   = initMusicPlayer();
    const fontSize = initFontSize();
    initDyslexia();
    initHighContrast();

    document.addEventListener('keydown', e => {
        if (!e.altKey) return;
        const key = e.key.toLowerCase();

        if (key === 'b') {
            e.preventDefault();
            (btnBraille.style.display !== 'none' ? btnBraille : btnText).click();
        }
        if (key === 'l') {
            e.preventDefault();
            (btnSpeech.style.display !== 'none' ? btnSpeech : btnStopSpeech).click();
        }
        if (key === 'm') {
            e.preventDefault();
            player.toggle();
        }
        if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            fontSize.increase();
        }
        if (e.key === '-') {
            e.preventDefault();
            fontSize.decrease();
        }
    });
});
