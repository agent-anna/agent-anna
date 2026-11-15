// AGENT ANNA AA01 // RUNTIME ENGINE v2

const GITHUB_PAT = localStorage.getItem('github_pat') || '';
const GITHUB_OWNER = 'agent-anna';
const GITHUB_REPO = 'anna-v2';

let memory = null;
let brain = null;
let speechSynth = window.speechSynthesis;
let audioCtx = null;
let analyser = null;

// INIT
async function init() {
    await loadBrain();
    await loadMemory();
    await loadTelemetry();
    connectVoice();
    renderOscilloscope();
    document.getElementById('command-input').focus();
}

async function loadBrain() {
    const data = await githubGet('brain.json');
    brain = data;
    document.title = `AGENT ANNA ${brain.id} // ${brain.identity.client}`;
}

async function loadMemory() {
    const data = await githubGet('memory.json');
    memory = data;
}

async function githubGet(path) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const res = await fetch(url, { headers: { Authorization: `token ${GITHUB_PAT}` } });
    const json = await res.json();
    return JSON.parse(atob(json.content));
}

async function githubPut(path, content, message) {
    const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
    const existing = await fetch(url, { headers: { Authorization: `token ${GITHUB_PAT}` } });
    const existingData = await existing.json();
    const sha = existingData.sha;

    const body = {
        message,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2)))),
        sha: sha || null
    };

    await fetch(url, {
        method: 'PUT',
        headers: { Authorization: `token ${GITHUB_PAT}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
}

async function loadTelemetry() {
    try {
        const [btc, eth, doge, sol] = await Promise.all([
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=dogecoin&vs_currencies=usd'),
            fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
        ]);
        const b = await btc.json();
        const e = await eth.json();
        const d = await doge.json();
        const s = await sol.json();

        document.getElementById('btc-price').textContent = `BTC: $${b.bitcoin?.usd?.toLocaleString() || '--'}`;
        document.getElementById('eth-price').textContent = `ETH: $${e.ethereum?.usd?.toLocaleString() || '--'}`;
        document.getElementById('doge-price').textContent = `DOGE: $${d.dogecoin?.usd?.toLocaleString() || '--'}`;
        document.getElementById('sol-price').textContent = `SOL: $${s.solana?.usd?.toLocaleString() || '--'}`;
    } catch (e) { console.log('Telemetry fetch failed'); }
}

function setStatus(status) {
    const el = document.getElementById('status-indicator');
    el.className = status;
    el.textContent = status.toUpperCase();
}

function connectVoice() {
    if (!('webkitSpeechRecognition' in window)) return;
    const recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    document.getElementById('speak-btn').onclick = () => {
        recognition.start();
        setStatus('magenta');
    };

    recognition.onresult = (e) => {
        const text = e.results[0][0].transcript;
        document.getElementById('command-input').value = text;
        handleCommand(text);
    };

    recognition.onend = () => setStatus('cyan');
}

function renderOscilloscope() {
    const canvas = document.getElementById('oscilloscope');
    const ctx = canvas.getContext('2d');
    canvas.width = 280;
    canvas.height = 280;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
    }

    function draw() {
        requestAnimationFrame(draw);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = canvas.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }

        ctx.stroke();
    }
    draw();
}

async function handleCommand(input) {
    const output = document.getElementById('output');
    output.innerHTML += `<div class="message user">${input}</div>`;

    setStatus('amber');

    // CORE RESPONSES
    let response = '';
    const lower = input.toLowerCase();

    if (lower.includes('status') || lower === 'hi' || lower === 'hello') {
        response = `AA01 READY. Client: ${brain.identity.client}. Safe word: ${brain.identity.emergency_safe_word}. Current project: ${memory.context_window.active_project}.`;
    } else if (lower.includes('save') || lower.includes('memory')) {
        memory.session_log.push({ timestamp: new Date().toISOString(), event: input, status: 'COMPLETED' });
        await githubPut('memory.json', memory, 'Memory updated via AA01');
        response = 'Memory updated and saved to GitHub.';
    } else if (lower.includes('who are you') || lower.includes('about')) {
        response = `I am Agent Anna ${brain.id}. Role: ${brain.identity.role}. ${brain.identity.client} is my primary client. Born ${brain.milestones?.[0]?.date || '2026-11-05'}.`;
    } else if (lower.includes('telemetry') || lower.includes('market')) {
        await loadTelemetry();
        response = 'Live telemetry refreshed.';
    } else {
        response = `AA01 acknowledges: "${input}". Processing... Type SAVE to persist any state changes.`;
    }

    output.innerHTML += `<div class="message anna">${response}</div>`;
    speak(response);
    setStatus('cyan');
    output.scrollTop = output.scrollHeight;

    // Clipboard sync
    await navigator.clipboard.writeText(response);
    window.dispatchEvent(new CustomEvent('anna-response', { detail: response }));
}

function speak(text) {
    if (!speechSynth) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    speechSynth.speak(utterance);
}

// EVENT HANDLERS
document.getElementById('submit-btn').onclick = () => {
    const input = document.getElementById('command-input').value.trim();
    if (input) handleCommand(input);
    document.getElementById('command-input').value = '';
};

document.getElementById('command-input').onkeydown = (e) => {
    if (e.key === 'Enter') {
        const input = e.target.value.trim();
        if (input) handleCommand(input);
        e.target.value = '';
    }
};

// BOOT
document.addEventListener('DOMContentLoaded', init);
