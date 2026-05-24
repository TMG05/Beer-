document.addEventListener('DOMContentLoaded', () => {
    const canvas      = document.getElementById('visualizer');
    const ctx         = canvas.getContext('2d');
    const audio       = document.getElementById('audio-exp');
    const btnPlay     = document.getElementById('btn-exp-play');
    const progressBar = document.getElementById('exp-progress');
    const currentEl   = document.getElementById('exp-current');
    const durationEl  = document.getElementById('exp-duration');
    const volumeBar   = document.getElementById('exp-volume');
    const volIcon     = document.getElementById('exp-vol-icon');
    const hint        = document.getElementById('exp-hint');

    let audioCtx    = null;
    let analyser    = null;
    let source      = null;
    let animId      = null;
    let idleAnimId  = null;
    let isPlaying   = false;

    function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight - 64;
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function drawIdle() {
        const W = canvas.width;
        const H = canvas.height;
        const t = Date.now() * 0.0008;
        const numBars = Math.floor(W / 8);
        const barW = W / numBars;

        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < numBars; i++) {
            const n = Math.sin(i * 0.35 + t) * Math.cos(i * 0.15 + t * 0.6);
            const h = (n * 0.5 + 0.5) * H * 0.12 + 6;
            ctx.fillStyle = `rgba(124, 226, 254, 0.18)`;
            ctx.beginPath();
            ctx.roundRect(i * barW, H - h, barW - 2, h, 3);
            ctx.fill();
        }

        if (!isPlaying) idleAnimId = requestAnimationFrame(drawIdle);
    }

    function drawVisualizer() {
        if (!analyser) return;
        animId = requestAnimationFrame(drawVisualizer);

        const bufLen = analyser.frequencyBinCount;
        const data   = new Uint8Array(bufLen);
        analyser.getByteFrequencyData(data);

        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        const usable  = Math.floor(bufLen * 0.65);
        const barW    = (W / 2) / usable;
        const centerX = W / 2;

        for (let i = 0; i < usable; i++) {
            const val    = data[i];
            const ratio  = val / 255;
            const barH   = ratio * H * 0.82 + 2;

            const r = Math.round(20  + ratio * 60);
            const g = Math.round(100 + ratio * 130);
            const b = Math.round(180 + ratio * 75);

            const grad = ctx.createLinearGradient(0, H - barH, 0, H);
            grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
            grad.addColorStop(1, `rgba(${r},${g},${b},0.2)`);
            ctx.fillStyle = grad;

            const x = centerX + i * barW;
            ctx.beginPath();
            ctx.roundRect(x, H - barH, Math.max(barW - 2, 1), barH, [3, 3, 0, 0]);
            ctx.fill();

            const xMirror = centerX - (i + 1) * barW;
            ctx.beginPath();
            ctx.roundRect(xMirror, H - barH, Math.max(barW - 2, 1), barH, [3, 3, 0, 0]);
            ctx.fill();
        }
    }

    idleAnimId = requestAnimationFrame(drawIdle);

    function formatTime(s) {
        const m = Math.floor(s / 60);
        return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
    }

    audio.addEventListener('loadedmetadata', () => {
        progressBar.max = audio.duration;
        durationEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
        progressBar.value = audio.currentTime;
        currentEl.textContent = formatTime(audio.currentTime);
    });

    audio.addEventListener('ended', () => {
        isPlaying = false;
        cancelAnimationFrame(animId);
        btnPlay.textContent = '▶';
        btnPlay.setAttribute('aria-label', 'Lecture');
        if (hint) hint.textContent = 'Appuyez sur ▶ pour recommencer';
        idleAnimId = requestAnimationFrame(drawIdle);
    });

    function initAudioCtx() {
        if (audioCtx) return;
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser  = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source    = audioCtx.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
    }

    btnPlay.addEventListener('click', () => {
        initAudioCtx();
        if (audioCtx.state === 'suspended') audioCtx.resume();

        if (audio.paused) {
            audio.play();
            isPlaying = true;
            cancelAnimationFrame(idleAnimId);
            animId = requestAnimationFrame(drawVisualizer);
            btnPlay.textContent = '⏸';
            btnPlay.setAttribute('aria-label', 'Pause');
            if (hint) hint.textContent = 'Visualisation en cours…';
        } else {
            audio.pause();
            isPlaying = false;
            cancelAnimationFrame(animId);
            btnPlay.textContent = '▶';
            btnPlay.setAttribute('aria-label', 'Lecture');
            if (hint) hint.textContent = 'Appuyez sur ▶ pour reprendre';
            idleAnimId = requestAnimationFrame(drawIdle);
        }
    });

    progressBar.addEventListener('input', () => {
        audio.currentTime = progressBar.value;
    });

    volumeBar.addEventListener('input', () => {
        audio.volume = volumeBar.value;
        const v = parseFloat(volumeBar.value);
        volIcon.textContent = v === 0 ? '🔇' : v < 0.5 ? '🔉' : '🔊';
    });

    audio.volume = 0.7;

    document.addEventListener('keydown', e => {
        if (e.altKey && e.key.toLowerCase() === 'm') {
            e.preventDefault();
            btnPlay.click();
        }
    });
});
