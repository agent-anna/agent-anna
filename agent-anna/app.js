// =================================================================
// AGENT ANNA // AUTONOMOUS ENGINE & PERSISTENT MEMORY MATRIX
// =================================================================

const REPO_OWNER = "agent-anna";
const REPO_NAME = "agent-anna";

let isVoiceEnabled = true;
let recognition = null;
let isListening = false;
let cachedVoices = [];
let coreKnowledgeCache = null;
let messagePayloadStore = {};

let chatHistory = [];

let audioCtx = null;
let analyser = null;
let micStream = null;
let animFrameId = null;

window.onload = function() {
    try {
        const savedKey = localStorage.getItem('dahl_key') || sessionStorage.getItem('dahl_key');
        if (savedKey) {
            const keyInput = document.getElementById('api-key');
            if (keyInput) keyInput.value = savedKey;
        }
        const savedGhToken = localStorage.getItem('gh_pat_token') || sessionStorage.getItem('gh_pat_token') || localStorage.getItem('GH_TOKEN');
        if (savedGhToken) {
            const ghInput = document.getElementById('gh-token');
            if (ghInput) ghInput.value = savedGhToken;
        }
    } catch (e) {}

    const inputEl = document.getElementById('user-input');
    if (inputEl) inputEl.focus();
    
    if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    preloadCoreKnowledge();
    initSpeechRecognition();
    initWavCanvas();
};

window.addEventListener('beforeunload', function (e) {
    autoLogSessionEnd();
});

function showCyberNotification(message, isError = false) {
    try {
        let banner = document.getElementById('cyber-notification-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'cyber-notification-banner';
            banner.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 99999;
                padding: 14px 20px;
                background: rgba(11, 15, 25, 0.95);
                border: 1px solid ${isError ? '#ff0055' : '#00ffcc'};
                color: ${isError ? '#ff0055' : '#00ffcc'};
                font-family: monospace;
                font-size: 12px;
                letter-spacing: 1px;
                box-shadow: 0 0 20px ${isError ? 'rgba(255, 0, 85, 0.3)' : 'rgba(0, 255, 204, 0.3)'};
                border-radius: 4px;
                transition: opacity 0.4s ease, transform 0.4s ease;
                opacity: 0;
                transform: translateY(-10px);
            `;
            document.body.appendChild(banner);
        }

        banner.style.borderColor = isError ? '#ff0055' : '#00ffcc';
        banner.style.color = isError ? '#ff0055' : '#00ffcc';
        banner.style.boxShadow = `0 0 20px ${isError ? 'rgba(255, 0, 85, 0.3)' : 'rgba(0, 255, 204, 0.3)'}`;
        banner.innerHTML = `<strong>[AA01 SYSTEM NOTICE]</strong><br>${message}`;

        setTimeout(() => {
            banner.style.opacity = '1';
            banner.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            banner.style.opacity = '0';
            banner.style.transform = 'translateY(-10px)';
        }, 4000);
    } catch (err) {}
}

function triggerHudStrobe() {
    try {
        const hudPane = document.querySelector('.agent-hud-pane');
        if (!hudPane) return;

        let flashes = 0;
        const interval = setInterval(() => {
            hudPane.style.boxShadow = flashes % 2 === 0 ? 'inset 0 0 35px #00ffcc' : 'none';
            flashes++;
            if (flashes > 5) {
                clearInterval(interval);
                hudPane.style.boxShadow = 'inset 0 0 15px rgba(0, 255, 204, 0.05)';
            }
        }, 150);
    } catch (e) {}
}

// =================================================================
// 1. SPEECH RECOGNITION & VISUALIZER ENGINE
// =================================================================
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = function() {
            isListening = true;
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) micBtn.classList.add('listening');
            updateHUDState("LISTENING");
            startAudioVisualizer();
        };

        recognition.onresult = function(event) {
            const speechText = event.results[0][0].transcript;
            const userInput = document.getElementById('user-input');
            if (userInput) userInput.value = speechText;
            stopListeningUI();
            sendMessage();
        };

        recognition.onerror = function() { stopListeningUI(); };
        recognition.onend = function() { stopListeningUI(); };
    } catch (err) {}
}

async function startAudioVisualizer() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 32;

        const source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const eqBars = document.querySelectorAll('.eq-bar');

        function renderFrame() {
            if (!isListening) return;
            analyser.getByteFrequencyData(dataArray);

            eqBars.forEach((bar, index) => {
                const val = dataArray[index % dataArray.length] || 0;
                bar.style.height = `${Math.max(15, Math.min(100, (val / 255) * 100))}%`;
            });

            animFrameId = requestAnimationFrame(renderFrame);
        }
        renderFrame();
    } catch (e) {}
}

function stopAudioVisualizer() {
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (micStream) { micStream.getTracks().forEach(track => track.stop()); micStream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    document.querySelectorAll('.eq-bar').forEach(bar => bar.style.height = '20%');
}

function toggleMic() {
    if (!recognition) initSpeechRecognition();
    if (!recognition) return showCyberNotification("Speech recognition unavailable.", true);

    if (!isListening) {
        try { recognition.start(); } catch (e) { stopListeningUI(); }
    } else {
        try { recognition.stop(); } catch (e) {}
        stopListeningUI();
    }
}

function stopListeningUI() {
    isListening = false;
    stopAudioVisualizer();
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.classList.remove('listening');
    const stateText = document.getElementById('state-text');
    if (stateText && stateText.innerText === "LISTENING") updateHUDState("READY");
}

// =================================================================
// 2. DYNAMIC KNOWLEDGE HARVESTER & VOICE SYNC
// =================================================================
function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    try {
        cachedVoices = window.speechSynthesis.getVoices();
    } catch (e) {}
}

async function preloadCoreKnowledge() {
    const corePaths = [
        "agent-anna/character/agent-anna.md",
        "agent-anna/knowledge/agents.md",
        "agent-anna/knowledge/lessons.md",
        "agent-anna/knowledge/rules.md",
        "agent-anna/plans/active/current-plan.md",
        "agent-anna/plans/active/roadmap.md",
        "agent-anna/plans/logs/session-log.md"
    ];
    let snippets = [];
    await Promise.all(corePaths.map(async (path) => {
        try {
            let res = await fetch(`./${path}?t=${Date.now()}`);
            if (!res.ok) {
                const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}?t=${Date.now()}`;
                res = await fetch(rawUrl);
            }
            if (res.ok) {
                const text = await res.text();
                const cleanText = text.replace(/<[^>]*>/g, '').trim();
                if (cleanText) snippets.push(`[PERSISTENT MATRIX SOURCE: ${path}]\n${cleanText}`);
            }
        } catch (e) {}
    }));
    coreKnowledgeCache = snippets.join('\n\n---\n\n');
}

async function fetchLiveTelemetry() {
    let btc = "$98,450.00", eth = "$2,850.00", bnb = "$620.00", doge = "$0.1850", sol = "$142.85", shi = "0.000001 DOGE ($0.00000076)";
    
    try {
        const cryptoRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,dogecoin,solana&vs_currencies=usd");
        if (cryptoRes.ok) {
            const prices = await cryptoRes.json();
            if (prices.bitcoin) btc = `$${prices.bitcoin.usd.toLocaleString()}`;
            if (prices.ethereum) eth = `$${prices.ethereum.usd.toLocaleString()}`;
            if (prices.binancecoin) bnb = `$${prices.binancecoin.usd.toLocaleString()}`;
            if (prices.dogecoin) doge = `$${prices.dogecoin.usd.toFixed(4)}`;
            if (prices.solana) sol = `$${prices.solana.usd.toFixed(2)}`;
        }
    } catch (e) {}

    let status = "SYNCHRONIZED", activeBot = "Grok Multi-Asset Scanner", signal = "Active";
    try {
        const localRes = await fetch(`./portal-relay.json?t=${Date.now()}`);
        if (localRes.ok) {
            const data = await localRes.json();
            status = data.status || status;
            activeBot = data.active_bot || activeBot;
            sol = data.solana_equity || sol;
            signal = data.latest_signal || signal;
            if (data.shi_drc20) shi = data.shi_drc20;
        }
    } catch (e) {}

    return `[LIVE TELEMETRY & MARKET METRICS]
- Audit Status: ${status}
- Active Engine: ${activeBot}
- Solana Equity: ${sol}
- Bitcoin (BTC): ${btc}
- Ethereum (ETH): ${eth}
- Binance Coin (BNB): ${bnb}
- Dogecoin (DOGE): ${doge}
- DRC-20 Token (SHI*): ${shi}
- Latest Signal: ${signal}`;
}

// =================================================================
// 3. VOICE SYNTHESIS & ROBUST CONTROLS
// =================================================================
function speakText(text) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    
    try {
        document.body.classList.remove('is-thinking');
        document.body.classList.add('is-speaking');
        updateHUDState("SPEAKING");

        window.speechSynthesis.cancel();
        
        const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#`~]/g, '').trim();
        if (!cleanText) return;

        let voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) voices = cachedVoices;

        const utterance = new SpeechSynthesisUtterance(cleanText);

        const englishLadyVoices = [
            "Google UK English Female",
            "en-GB-Neural2-F",
            "Sonia",
            "Hazel",
            "Samantha",
            "Victoria",
            "Google US English"
        ];
        
        let selectedVoice = voices.find(v => englishLadyVoices.some(p => v.name.includes(p)));
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en_GB') || (v.lang.startsWith('en') && v.name.toLowerCase().includes('female')));
        }
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith('en'));
        }

        if (selectedVoice) utterance.voice = selectedVoice;
        
        utterance.pitch = 1.02;
        utterance.rate = 0.98;

        utterance.onstart = () => { 
            document.body.classList.add('is-speaking'); 
            updateHUDState("SPEAKING"); 
        };
        utterance.onend = () => { 
            document.body.classList.remove('is-speaking'); 
            updateHUDState("READY"); 
        };
        utterance.onerror = () => { 
            document.body.classList.remove('is-speaking'); 
            updateHUDState("READY"); 
        };

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        document.body.classList.remove('is-speaking');
        updateHUDState("READY");
    }
}

async function sendMessage(forcedQuery = null) {
    const keyEl = document.getElementById('api-key');
    const input = document.getElementById('user-input');
    const apiKey = keyEl ? keyEl.value.trim() : (localStorage.getItem('dahl_key') || sessionStorage.getItem('dahl_key') || "");
    const query = forcedQuery || (input ? input.value.trim() : "");

    if (!apiKey) {
        showCyberNotification('Please tap ⚙️ KEYS and paste your Dahl API Key.', true);
        toggleSettings();
        return;
    }
    if (!query) return;

    if (query.toUpperCase() === "SHUT UP" || query.toUpperCase() === "STFU") {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        document.body.classList.remove('is-speaking', 'is-thinking');
        updateHUDState("READY");
        appendMsg(query, 'user', 'Commander');
        appendMsg("Audio stream terminated by command.", 'assistant', 'AA01 Core', false);
        if (input && !forcedQuery) input.value = '';
        return;
    }

    if (query.startsWith('http://') || query.startsWith('https://')) {
        scrapeWebPage(query);
        if (input && !forcedQuery) input.value = '';
        return;
    }

    appendMsg(query, 'user', 'Commander');
    if (input && !forcedQuery) input.value = '';

    chatHistory.push({ role: "user", content: query });

    const startTime = performance.now();

    document.body.classList.remove('is-speaking');
    document.body.classList.add('is-thinking');
    updateHUDState("REASONING");

    if (!coreKnowledgeCache) await preloadCoreKnowledge();
    const liveTelemetry = await fetchLiveTelemetry();
    
    const systemPrompt = `You are AGENT ANNA 01 (AA01). 
Rules:
1. Provide precise, executive answers suitable for speech synthesis.
2. Maintain context awareness across the running conversation history.

Persistent System Directives & Active Memory Matrix:
${coreKnowledgeCache}

Telemetry & Live Market Data:
${liveTelemetry}`;

    const messagesPayload = [
        { role: "system", content: systemPrompt },
        ...chatHistory
    ];

    try {
        const res = await fetch("https://inference.dahl.global/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "MiniMaxAI/MiniMax-M2.7",
                messages: messagesPayload,
                temperature: 0.1,
                max_tokens: 1000
            })
        });

        if (!res.ok) throw new Error(`API Error ${res.status}`);

        const data = await res.json();
        let reply = (data.choices[0].message.content || "").replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        chatHistory.push({ role: "assistant", content: reply });

        const endTime = performance.now();
        const tripSeconds = ((endTime - startTime) / 1000).toFixed(2);
        const latencyBadge = document.getElementById('latency-display');
        if (latencyBadge) latencyBadge.innerText = `TRIP LATENCY: ${tripSeconds}s`;

        document.body.classList.remove('is-thinking');
        updateHUDState("READY");

        appendMsg(reply, 'assistant', `AA01 Core [${tripSeconds}s]`, true);
        speakText(reply);

    } catch (err) {
        document.body.classList.remove('is-thinking');
        updateHUDState("ERROR");
        appendMsg(`Execution Error: ${err.message}.`, 'assistant', 'System Alert', false);
    }
}

// =================================================================
// 4. UI INTERACTION CONTROLS (GUARANTEED TOGGLES)
// =================================================================
function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    const btn = document.getElementById('voice-btn');
    
    if (!isVoiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        document.body.classList.remove('is-speaking');
        updateHUDState("READY");
    }

    if (btn) {
        btn.className = isVoiceEnabled ? "ctrl-btn active" : "ctrl-btn";
        btn.textContent = isVoiceEnabled ? "🔊 ON" : "🔇 OFF";
    }
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        panel.style.display = (panel.style.display === 'block' || panel.style.display === '') ? 'none' : 'block';
    }
}

function saveKey() {
    try {
        const el = document.getElementById('api-key');
        const ghEl = document.getElementById('gh-token');
        
        if (el) {
            const val = el.value.trim();
            localStorage.setItem('dahl_key', val);
            sessionStorage.setItem('dahl_key', val);
        }
        if (ghEl) {
            const val = ghEl.value.trim();
            localStorage.setItem('gh_pat_token', val);
            sessionStorage.setItem('gh_pat_token', val);
            localStorage.setItem('GH_TOKEN', val);
        }
        showCyberNotification("Credentials saved successfully (Dahl & GH_TOKEN Matrix Locked).");
        toggleSettings();
    } catch (e) {
        showCyberNotification("Error saving credentials.", true);
    }
}

function clearLogs() {
    try {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        chatHistory = [];
        const chatContainer = document.getElementById('chat-container');
        if (chatContainer) {
            chatContainer.innerHTML = `
                <div class="message assistant" id="msg_cleared">
                    <div class="msg-header">AA01 Core</div>
                    <div class="msg-body">Console history and memory state cleared. Standby mode.</div>
                    <div class="action-row">
                        <button class="action-chip" style="border-color:#ff0055; color:#ff0055;" onclick="deleteMessage('msg_cleared')">🗑️ DEL</button>
                    </div>
                </div>
            `;
        }
        showCyberNotification("Console logs cleared.");
    } catch (e) {}
}

function appendMsg(text, sender, label, includeActions = false) {
    const container = document.getElementById('chat-container');
    if (!container) return;

    const messageId = 'msg_' + Math.random().toString(36).substring(2, 9);
    messagePayloadStore[messageId] = text;

    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.id = messageId;
    
    let actionsHTML = "";
    if (includeActions) {
        actionsHTML = `
            <div class="action-row">
                <button class="action-chip" onclick="handleAction('summarize', '${messageId}')">1. SUMMARIZE</button>
                <button class="action-chip" onclick="handleAction('save', '${messageId}')">2. SAVE AS .MD</button>
                <button class="action-chip" onclick="handleAction('ingest', '${messageId}')">3. INGEST TO CORE</button>
                <button class="action-chip" onclick="copyToClipboard('${messageId}', this)">COPY</button>
                <button class="action-chip" style="border-color:#ff0055; color:#ff0055;" onclick="deleteMessage('${messageId}')">🗑️ DEL</button>
            </div>
        `;
    } else {
        actionsHTML = `
            <div class="action-row">
                <button class="action-chip" style="border-color:#ff0055; color:#ff0055;" onclick="deleteMessage('${messageId}')">🗑️ DEL</button>
            </div>
        `;
    }

    div.innerHTML = `
        <div class="msg-header"><span>${label}</span></div>
        <div style="white-space:pre-wrap; margin-top: 6px;">${text}</div>
        ${actionsHTML}
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function updateHUDState(stateLabel) {
    const stateText = document.getElementById('state-text');
    if (stateText) stateText.innerText = stateLabel;
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        if (["REASONING", "LISTENING", "SCRAPING", "INGESTING"].includes(stateLabel)) {
            statusBar.classList.add('active');
        } else {
            statusBar.classList.remove('active');
        }
    }
}

// =================================================================
// 5. DUAL NEURON CANVAS RENDERER
// =================================================================
function initWavCanvas() {
    const canvas = document.getElementById('wav-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let step1 = 0;
    let step2 = 0;

    function drawDualWaves() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const isThinking = document.body.classList.contains('is-thinking');
        const isSpeaking = document.body.classList.contains('is-speaking');

        const primaryColor = isThinking ? '#ffaa00' : (isSpeaking ? '#ff007f' : '#00ffcc');
        const secondaryColor = isThinking ? 'rgba(255, 170, 0, 0.4)' : (isSpeaking ? 'rgba(255, 0, 127, 0.4)' : 'rgba(0, 255, 204, 0.3)');

        const amplitude = (isThinking || isSpeaking) ? 35 : 12;
        const frequency = (isThinking || isSpeaking) ? 0.045 : 0.02;

        ctx.beginPath();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = primaryColor;

        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.sin(x * frequency + step1) * amplitude * Math.sin(x / 85);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = secondaryColor;

        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.cos(x * (frequency * 0.85) + step2) * (amplitude * 0.75) * Math.cos(x / 105);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();

        step1 += (isThinking || isSpeaking) ? 0.12 : 0.03;
        step2 += (isThinking || isSpeaking) ? 0.08 : 0.02;

        requestAnimationFrame(drawDualWaves);
    }
    drawDualWaves();
}

async function autoLogSessionEnd() {}

function copyToClipboard(messageId, btnElement) {
    const textContent = messagePayloadStore[messageId] || "";
    navigator.clipboard.writeText(textContent).then(() => {
        if (btnElement) {
            const originalText = btnElement.innerText;
            btnElement.innerText = "COPIED!";
            setTimeout(() => { btnElement.innerText = originalText; }, 1500);
        }
    }).catch(err => {});
}

function deleteMessage(messageId) {
    const msgElement = document.getElementById(messageId);
    if (msgElement) {
        delete messagePayloadStore[messageId];
        msgElement.remove();
    }
}

function launchLocalServer() {
    window.open('http://localhost:8000', '_blank');
}

function triggerManualTelemetry() {
    sendMessage("Provide live crypto market telemetry including BTC, ETH, BNB, DOGE, and DRC-20 SHI* token rates.");
}

function triggerMilitaryProtocol() {
    sendMessage("MILITARY PROTOCOL ENGAGED: Executing deep diagnostic sweep.");
}
