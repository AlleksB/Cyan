"use strict;"

const state = {
    currentLevel: 0,
    playerName: 'Player',
    settings: {
        sound: true,
    },
};

let timerInterval = null;
let levelStartTime = 0;
let currentLevelTime = 0;

(function loadSettings() {
    try {
        const saved = localStorage.getItem('cyan-settings');
        if (saved) Object.assign(state.settings, JSON.parse(saved));
        
        const progress = localStorage.getItem('cyan-progress');
        if (progress !== null) state.currentLevel = parseInt(progress, 10);
    } catch (_) {}
})();

function saveSettings() {
    try {
        localStorage.setItem('cyan-settings', JSON.stringify(state.settings));
    } catch (_) {}
}

// AUDIO
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (!state.settings.sound) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'hover') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
    }
    else if (type === 'click') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
    }
    else if (type === 'game') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
    else if (type === 'solve') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.6);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
    }
}

document.addEventListener('mouseover', (e) => {
    const btn = e.target.closest('button');
    if (btn && !btn.closest('#level-area')) {
        playSound('hover');
    }
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.id !== 'l1-btn') {
        playSound('click');
    }
});

// SCREEN
function showScreen(id) {
    const screens = document.querySelectorAll('.screen');
    const target = document.getElementById(id);

    screens.forEach(s => {
        if (s.classList.contains('active')) {
            s.classList.remove('active');
            setTimeout(() => {
                if (!s.classList.contains('active')) s.classList.add('hidden');
            }, 200); 
        } else if (s !== target) {
            s.classList.add('hidden');
        }
    });

    target.classList.remove('hidden');
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            target.classList.add('active');
        });
    });
}

function openModal(id) {
    document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// BACKGROUND CANVAS
(function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, dots;
    const SPACING = 48;
    const DOT_R = 3;

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        buildDots();
    }

    function buildDots() {
        dots = [];
        const cols = Math.ceil(W / SPACING) + 1;
        const rows = Math.ceil(H / SPACING) + 1;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                dots.push({
                    x: c * SPACING,
                    y: r * SPACING,
                    phase: (c + r) * 0.4,
                });
            }
        }
    }

    let t = 0;
    function draw() {
        ctx.clearRect(0, 0, W, H);

        for (const d of dots) {
            const wave = Math.sin(t * 0.8 + d.phase) * 0.5 + 0.5;
            const radial = Math.sin(t * 0.4) * 0.5 + 0.5;
            const alpha = wave * 0.5 + radial * 0.3;
            const r = DOT_R * (0.6 + wave * 0.8);

            ctx.beginPath();
            ctx.arc(d.x, d.y, r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 229, 229, ${alpha.toFixed(2)})`;
            ctx.fill();
        }

        t += 0.016;
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();
    draw();
})();

// MAIN MENU BUTTONS
document.getElementById('btn-play').addEventListener('click', () => {
    openModal('modal-nickname');
    setTimeout(() => document.getElementById('input-nickname').focus(), 100);
});

document.getElementById('btn-start-game').addEventListener('click', () => {
    const input = document.getElementById('input-nickname');
    const name = input.value.trim();
    if (!name) return; // Prevent empty names
    state.playerName = name;
    closeModal('modal-nickname');
    showScreen('screen-game');
    loadLevel(state.currentLevel);
});

document.getElementById('btn-ranking').addEventListener('click', () => {
    renderRankings(0);
    openModal('modal-ranking');
});

document.getElementById('btn-howto').addEventListener('click', () => {
    openModal('modal-howto');
});

document.getElementById('btn-settings').addEventListener('click', () => {
    openModal('modal-settings');
});

document.getElementById('close-howto').addEventListener('click', () => {
    closeModal('modal-howto');
});

document.getElementById('close-settings').addEventListener('click', () => {
    closeModal('modal-settings');
});

document.getElementById('close-nickname').addEventListener('click', () => {
    closeModal('modal-nickname');
});

document.getElementById('close-ranking').addEventListener('click', () => {
    closeModal('modal-ranking');
});

document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => {
        if (e.target === modal) closeModal(modal.id);
    });
});

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not(.hidden)').forEach(m => closeModal(m.id));
    }
});

// SETTINGS TOGGLES
function bindToggle(id, key) {
    const btn = document.getElementById(id);

    if (state.settings[key]) {
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
    }
    else {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    }

    btn.addEventListener('click', () => {
        state.settings[key] = !state.settings[key];
        btn.classList.toggle('active', state.settings[key]);
        btn.setAttribute('aria-pressed', String(state.settings[key]));
        saveSettings();
    });
}

bindToggle('toggle-sound', 'sound');

// RESET PROGRESS
document.getElementById('btn-reset-progress').addEventListener('click', () => {
    if (confirm('Reset all progress? This cannot be undone.')) {
        try { localStorage.removeItem('cyan-progress'); } catch (_) {}
        state.currentLevel = 0;
        const btn = document.getElementById('btn-reset-progress');
        btn.textContent = 'done';
        setTimeout(() => { btn.textContent = 'reset'; }, 1500);
    }
});

document.getElementById('btn-back').addEventListener('click', () => {
    clearInterval(timerInterval);

    if (levels[state.currentLevel].cleanup) {
        levels[state.currentLevel].cleanup();
    }
    
    showScreen('screen-title');
});

document.getElementById('btn-reset').addEventListener('click', () => {
    levels[state.currentLevel].reset();
    startTimer();
});

function startTimer() {
    clearInterval(timerInterval);
    levelStartTime = performance.now();
    const timerEl = document.getElementById('level-timer');
    timerEl.textContent = '0.00s';
    
    timerInterval = setInterval(() => {
        currentLevelTime = (performance.now() - levelStartTime) / 1000;
        timerEl.textContent = currentLevelTime.toFixed(2) + 's';
    }, 50);
}

// LEADERBOARD
function saveTime(levelIndex, name, time) {
    let lb = JSON.parse(localStorage.getItem('cyan-leaderboard') || '{}');
    if (!lb[levelIndex]) lb[levelIndex] = [];
    
    lb[levelIndex].push({ name, time });
    lb[levelIndex].sort((a, b) => a.time - b.time);
    localStorage.setItem('cyan-leaderboard', JSON.stringify(lb));
}

function renderRankings(levelIndex) {
    const tabs = document.getElementById('ranking-tabs');
    const list = document.getElementById('ranking-list');
    
    tabs.innerHTML = '';
    for (let i = 0; i < levels.length; i++) {
        const btn = document.createElement('button');
        btn.textContent = `lvl ${i + 1}`;
        btn.className = 'tab-btn ' + (i === levelIndex ? 'active' : '');
        btn.onclick = () => renderRankings(i);
        tabs.appendChild(btn);
    }

    let lb = JSON.parse(localStorage.getItem('cyan-leaderboard') || '{}');
    const levelData = lb[levelIndex] || [];
    
    list.innerHTML = '';
    if (levelData.length === 0) {
        list.innerHTML = '<div class="ranking-item empty">no times recorded yet</div>';
    }
    else {
        levelData.forEach((entry, idx) => {
            list.innerHTML += `
                <div class="ranking-item">
                    <span>${idx + 1}. ${entry.name}</span>
                    <span style="color: var(--cyan);">${entry.time.toFixed(2)}s</span>
                </div>
            `;
        });
    }
}

showScreen('screen-title');

// LEVEL 1
const level1 = {
    NUM_RECTS: 10,
    filled: 0,
 
    init() {
        const area = document.getElementById('level-area');
        area.innerHTML = '';
        this.filled = 0;
 
        const rectW = window.innerWidth / this.NUM_RECTS;
 
        for (let i = 0; i < this.NUM_RECTS; i++) {
            const rect = document.createElement('div');
            rect.classList.add('l1-rect');
            rect.dataset.index = i;
            rect.style.left  = (i * rectW) + 'px';
            rect.style.width = rectW + 'px';
            area.appendChild(rect);
        }

        const btn = document.createElement('button');
        btn.id = 'l1-btn';
        btn.addEventListener('click', () => this.onPress());
        area.appendChild(btn);
    },
 
    onPress() {
        if (this.filled >= this.NUM_RECTS) return;

        playSound('game');
 
        const rects = document.querySelectorAll('.l1-rect');
        rects[this.filled].classList.add('filled');
        this.filled++;
 
        if (this.filled >= this.NUM_RECTS) {
            setTimeout(() => solveLevel(), 350);
        }
    },
 
    reset() {
        this.init();
    },
};

// LEVEL 2
const level2 = {
    NUM_RINGS: 5,
    angles: [],
    locked: false,

    init() {
        const area = document.getElementById('level-area');
        area.innerHTML = '';
        this.locked = false;
        
        this.angles = [45, 135, 270, 180, 315];

        const container = document.createElement('div');
        container.id = 'l2-container';

        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 600 600");
        svg.id = "l2-svg";

        const center = 300;

        const core = document.createElementNS(svgNS, "circle");
        core.setAttribute("cx", center);
        core.setAttribute("cy", center);
        core.setAttribute("r", "14");
        core.id = "l2-core";
        svg.appendChild(core);

        for (let i = 0; i < this.NUM_RINGS; i++) {
            const r = 45 + (i * 45);
            const ring = document.createElementNS(svgNS, "circle");
            ring.classList.add('l2-svg-ring');
            ring.setAttribute("cx", center);
            ring.setAttribute("cy", center);
            ring.setAttribute("r", r);
            ring.setAttribute("stroke-width", "14");
            
            const circumference = 2 * Math.PI * r;
            const gap = circumference * (45 / 360);
            const dash = circumference - gap;
            
            ring.setAttribute("stroke-dasharray", `${dash} ${gap}`);
            ring.setAttribute("stroke-dashoffset", -gap / 2);

            ring.style.transform = `rotate(${this.angles[i]}deg)`;
            
            ring.addEventListener('click', () => this.rotateRing(i, ring));
            svg.appendChild(ring);
        }

        container.appendChild(svg);
        area.appendChild(container);
    },

    rotateRing(index, el) {
        if (this.locked) return;
        playSound('game'); 
        
        this.angles[index] += 45;
        el.style.transform = `rotate(${this.angles[index]}deg)`;
        
        if (this.checkWin()) {
            this.locked = true;
            document.getElementById('l2-core').classList.add('solved');
            setTimeout(() => solveLevel(), 800);
        }
    },

    checkWin() {
        const target = this.angles[0] % 360;
        return this.angles.every(a => (a % 360) === target);
    },

    reset() {
        this.init();
    },
};

// LEVEL 3
const level3 = {
    ROWS: 7,
    COLS: 7,
    grid: [],

    init() {
        const area = document.getElementById('level-area');
        area.innerHTML = '';
        this.grid = Array(this.ROWS * this.COLS).fill(false);

        const container = document.createElement('div');
        container.id = 'l3-grid';

        for (let i = 0; i < this.ROWS * this.COLS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('l3-cell');
            cell.dataset.index = i;
            cell.addEventListener('click', () => this.onPress(i));
            container.appendChild(cell);
        }

        area.appendChild(container);

        this.grid[24] = true;
        this.updateCell(24);
    },

    onPress(index) {
        playSound('game');

        const neighbors = this.getNeighbors(index);
        for (const n of neighbors) {
            this.grid[n] = !this.grid[n];
            this.updateCell(n);
        }
        if (this.isSolved()) {
            setTimeout(() => solveLevel(), 350);
        }
    },

    getNeighbors(index) {
        const row = Math.floor(index / this.COLS);
        const col = index % this.COLS;
        const neighbors = [];

        if (row > 0)              neighbors.push(index - this.COLS);
        if (row < this.ROWS - 1)  neighbors.push(index + this.COLS);
        if (col > 0)              neighbors.push(index - 1);
        if (col < this.COLS - 1)  neighbors.push(index + 1);

        return neighbors;
    },

    updateCell(index) {
        const cells = document.querySelectorAll('.l3-cell');
        cells[index].classList.toggle('on', this.grid[index]);
    },

    isSolved() {
        return this.grid.every(cell => cell == true);
    },

    reset() {
        this.init();
    },
};

// LEVEL 4
const level4 = {
    fillAmount: 0,
    isFilling: false,
    isFailed: false,
    holdTimer: 0,
    animFrame: null,

    boundStart: null,
    boundStop: null,

    init() {
        const area = document.getElementById('level-area');
        area.innerHTML = '';
        
        this.fillAmount = 0;
        this.isFilling = false;
        this.isFailed = false;
        this.holdTimer = 0;

        const container = document.createElement('div');
        container.id = 'l4-container';

        const targetZone = document.createElement('div');
        targetZone.id = 'l4-target-zone';

        const liquid = document.createElement('div');
        liquid.id = 'l4-liquid';

        container.appendChild(targetZone);
        container.appendChild(liquid);
        area.appendChild(container);

        this.boundStart = (e) => {
            if (e.type === 'mousedown' && e.button !== 0) return; 
            e.preventDefault();
            if (!this.isFailed && !this.isFilling) playSound('game');
            this.isFilling = true;
        };
        
        this.boundStop = () => {
            this.isFilling = false;
        };

        container.addEventListener('mousedown', this.boundStart);
        container.addEventListener('touchstart', this.boundStart, {passive: false});
        
        window.addEventListener('mouseup', this.boundStop);
        window.addEventListener('touchend', this.boundStop);

        this.loop();
    },

    loop() {
        if (this.isFailed) {
            this.fillAmount -= 0.8;
            if (this.fillAmount <= 0) {
                this.fillAmount = 0;
                this.isFailed = false;
                document.getElementById('l4-liquid').classList.remove('fail');
            }
        }
        else if (this.isFilling) {
            this.fillAmount += 0.2;
            if (this.fillAmount >= 100) {
                this.isFailed = true;
                this.isFilling = false;
                this.holdTimer = 0;
                document.getElementById('l4-liquid').classList.add('fail');
            }
        }
        else {
            this.fillAmount -= 0.6;
            if (this.fillAmount < 0) this.fillAmount = 0;
        }

        const liquid = document.getElementById('l4-liquid');
        if (!liquid) return;

        if (!this.isFailed && this.fillAmount >= 60 && this.fillAmount <= 75) {
            this.holdTimer++;
            liquid.classList.add('sweet');
            
            if (this.holdTimer >= 240) {
                this.win();
                return;
            }
        }
        else {
            this.holdTimer = 0;
            liquid.classList.remove('sweet');
        }

        liquid.style.height = `${this.fillAmount}%`;
        this.animFrame = requestAnimationFrame(() => this.loop());
    },

    win() {
        this.cleanup();
        const liquid = document.getElementById('l4-liquid');
        liquid.classList.add('solved');
        liquid.style.height = '100%';
        setTimeout(() => solveLevel(), 500);
    },

    cleanup() {
        cancelAnimationFrame(this.animFrame);
        window.removeEventListener('mouseup', this.boundStop);
        window.removeEventListener('touchend', this.boundStop);
    },

    reset() {
        this.cleanup();
        this.init();
    },
};

// LEVEL 5
const level5 = {
    targets: [80, 20, 60, 40],
    values: [10, 10, 10, 10],
    draggingIndex: -1,
    activeTrack: null,
    locked: false,

    boundMove: null,
    boundUp: null,

    init() {
        const area = document.getElementById('level-area');
        area.innerHTML = '';
        this.locked = false;
        this.values = [10, 10, 10, 10]; 

        const container = document.createElement('div');
        container.id = 'l5-container';

        const bg = document.createElement('div');
        bg.id = 'l5-bg';
        container.appendChild(bg);

        const slidersWrap = document.createElement('div');
        slidersWrap.id = 'l5-sliders';

        for (let i = 0; i < 4; i++) {
            const slider = document.createElement('div');
            slider.classList.add('l5-slider');
            
            const track = document.createElement('div');
            track.classList.add('l5-track');
            
            const fill = document.createElement('div');
            fill.classList.add('l5-fill');
            fill.id = `l5-fill-${i}`;
            
            track.appendChild(fill);
            slider.appendChild(track);

            slider.addEventListener('pointerdown', (e) => this.onPointerDown(e, i, track));
            slidersWrap.appendChild(slider);
        }

        container.appendChild(slidersWrap);
        area.appendChild(container);

        this.boundMove = (e) => this.onPointerMove(e);
        this.boundUp = () => this.onPointerUp();
        window.addEventListener('pointermove', this.boundMove);
        window.addEventListener('pointerup', this.boundUp);

        this.updateVisuals(false);
    },

    onPointerDown(e, index, track) {
        if (this.locked) return;
        this.draggingIndex = index;
        this.activeTrack = track;
        if (e.pointerType === 'mouse') e.preventDefault();
        this.setSliderValue(e);
    },

    onPointerMove(e) {
        if (this.locked || this.draggingIndex === -1) return;
        this.setSliderValue(e);
    },

    onPointerUp() {
        this.draggingIndex = -1;
        this.activeTrack = null;
    },

    setSliderValue(e) {
        const rect = this.activeTrack.getBoundingClientRect();
        let y = e.clientY - rect.top;
        let percent = 100 - ((y / rect.height) * 100);
        
        percent = Math.max(0, Math.min(100, percent));
        percent = Math.round(percent / 10) * 10;

        if (this.values[this.draggingIndex] !== percent) {
            this.values[this.draggingIndex] = percent;
            playSound('click');
            this.updateVisuals(true);
        }
    },

    updateVisuals(canWin) {
        let totalDiff = 0;
        for (let i = 0; i < 4; i++) {
            document.getElementById(`l5-fill-${i}`).style.height = `${this.values[i]}%`;
            totalDiff += Math.abs(this.values[i] - this.targets[i]);
        }

        const bg = document.getElementById('l5-bg');

        const threshold = 160;
        if (totalDiff < threshold) {
            const accuracy = 1 - (totalDiff / threshold);
            const alpha = Math.pow(accuracy, 2) * 0.9;
            bg.style.background = `rgba(0, 229, 229, ${alpha})`;
        }
        else {
            bg.style.background = `rgba(0, 229, 229, 0)`;
        }
        
        if (canWin && totalDiff === 0 && !this.locked) {
            this.locked = true;
            bg.classList.add('solved');
            setTimeout(() => {
                this.cleanup();
                solveLevel();
            }, 500);
        }
    },

    cleanup() {
        window.removeEventListener('pointermove', this.boundMove);
        window.removeEventListener('pointerup', this.boundUp);
    },

    reset() {
        this.cleanup();
        this.init();
    }
};

const levels = [
    level1, level2, level3, level4, level5
];

// ENGINE
function loadLevel(index) {
    state.currentLevel = index;
    try { localStorage.setItem('cyan-progress', state.currentLevel.toString()); } catch (_) {}
    document.getElementById('level-num').textContent = index + 1;
    levels[index].init();
    startTimer();
}

function solveLevel() {
    clearInterval(timerInterval);
    saveTime(state.currentLevel, state.playerName, currentLevelTime);
    
    playSound('solve');
    const flash = document.getElementById('flash-overlay');
    flash.classList.add('active');

    setTimeout(() => {
        const next = state.currentLevel + 1;
        if (next < levels.length) {
            loadLevel(next);
            flash.classList.remove('active');
        }
        else {
            showScreen('screen-congrats');
            setTimeout(() => {
                flash.classList.remove('active');
            }, 200);
        }
    }, 150);
}

document.getElementById('btn-congrats-menu').addEventListener('click', () => {
    state.currentLevel = 0;
    try { localStorage.setItem('cyan-progress', '0'); } catch (_) {}
    showScreen('screen-title');
});
