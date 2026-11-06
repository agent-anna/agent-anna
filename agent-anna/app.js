// =================================================================
// AGENT ANNA 01 // STABLE MILITARY-GRADE TELEMETRY CORE (ALL-IN-ONE)
// =================================================================

const REPO_OWNER = "agent-anna";
const REPO_NAME = "agent-anna";

let isVoiceEnabled = true;
let recognition = null;
let isListening = false;
let cachedVoices = [];
let coreKnowledgeCache = "";
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

    messagePayloadStore['msg_welcome'] = "Military-grade telemetry core online. Send loop stable. Ready for command, Commander.";

    const inputEl = document.getElementById('user-input');
    if (inputEl) inputEl.focus();
    
    if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    preloadCoreKnowledge();
    initSpeechRecognition();
    initWavCanvas();
    injectCyberScrollbars();
    initClipboardPaste();
};

window.addEventListener('beforeunload', function () {
    autoLogSessionEnd();
});

function injectCyberScrollbars() {
    if (document.getElementById('cyber-scrollbar-style')) return;
    const style = document.createElement('style');
    style.id = 'cyber-scrollbar-style';
    style.innerHTML = `
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #07090e; }
        ::-webkit-scrollbar-thumb { background: #00ffcc; border-radius: 2px; box-shadow: 0 0 8px rgba(0,255,204,0.4); }
        ::-webkit-scrollbar-thumb:hover { background: #ff007f; box-shadow: 0 0 12px rgba(255,0,127,0.6); }
    `;
    document.head.appendChild(style);
}

function initClipboardPaste() {
    try {
        const userInput = document.getElementById('user-input');
        if (!userInput) return;
        userInput.addEventListener('paste', function(event) {
            try {
                const items = event.clipboardData && event.clipboardData.items;
                if (!items) return;
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        event.preventDefault();
                        const blob = items[i].getAsFile();
                        if (!blob) return;
                        const reader = new FileReader();
                        reader.onload = function(e) {
                            const base64Data = e.target.result;
                            appendMsg(`[CLIPBOARD IMAGE CAPTURED: Size ${Math.round(blob.size/1024)} KB]`, 'user', 'Commander');
                            sendMessage(`I have pasted an image from my clipboard into telemetry buffer. Analyze this image data payload and assist with layout or diagnostics: ${base64Data.substring(0, 60)}...`);
                        };
                        reader.readAsDataURL(blob);
                        showCyberNotification("Image captured from clipboard and loaded into telemetry.");
                    }
                }
            } catch (err) {}
        });
    } catch (e) {}
}

function showCyberNotification(message, isError = false) {
    try {
        let banner = document.getElementById('cyber-notification-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'cyber-notification-banner';
            banner.style.cssText = `
                position: fixed; top: 20px; right: 20px; z-index: 99999; padding: 14px 20px;
                background: rgba(11, 15, 25, 0.95); border: 1px solid ${isError ? '#ff0055' : '#00ffcc'};
                color: ${isError ? '#ff0055' : '#00ffcc'}; font-family: monospace; font-size: 12px;
                letter-spacing: 1px; box-shadow: 0 0 20px ${isError ? 'rgba(255, 0, 85, 0.3)' : 'rgba(0, 255, 204, 0.3)'};
                border-radius: 4px; transition: opacity 0.4s ease, transform 0.4s ease; opacity: 0; transform: translateY(-10px); pointer-events: none;
            `;
            document.body.appendChild(banner);
        }
        banner.style.borderColor = isError ? '#ff0055' : '#00ffcc';
        banner.style.color = isError ? '#ff0055' : '#00ffcc';
        banner.style.boxShadow = `0 0 20px ${isError ? 'rgba(255, 0, 85, 0.3)' : 'rgba(0, 255, 204, 0.3)'}`;
        banner.innerHTML = `<strong>[AA01 SYSTEM NOTICE]</strong><br>${message}`;
        setTimeout(() => { banner.style.opacity = '1'; banner.style.transform = 'translateY(0)'; }, 10);
        setTimeout(() => { banner.style.opacity = '0'; banner.style.transform = 'translateY(-10px)'; }, 4000);
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
// 2. KNOWLEDGE HARVESTER & TELEMETRY ENGINE
// =================================================================
function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    try { cachedVoices = window.speechSynthesis.getVoices(); } catch (e) {}
}

async function preloadCoreKnowledge() {
    const corePaths = [
        "character/agent-anna.md", "knowledge/agents.md", "knowledge/lessons.md",
        "knowledge/rules.md", "plans/active/current-plan.md", "plans/active/roadmap.md", "plans/logs/session-log.md"
    ];
    let snippets = [];
    await Promise.all(corePaths.map(async (path) => {
        try {
            let res = await fetch(`./${path}?t=${Date.now()}`);
            if (!res.ok) res = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}?t=${Date.now()}`);
            if (res.ok) {
                const text = await res.text();
                const cleanText = text.replace(/<[^>]*>/g, '').trim();
                if (cleanText) snippets.push(`[MATRIX SOURCE: ${path}]\n${cleanText}`);
            }
        } catch (e) {}
    }));
    coreKnowledgeCache = snippets.join('\n\n---\n\n') || "[Agent Anna 01 // Core Active]";
}

async function fetchLiveTelemetry() {
    let btc = "$98,450.00", eth = "$2,850.00", bnb = "$620.00", doge = "$0.1850", sol = "$142.85", shi = "0.000001 DOGE";
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
            if (data.bitcoin_price) btc = data.bitcoin_price;
            if (data.ethereum_price) eth = data.ethereum_price;
            if (data.dogecoin_price) doge = data.dogecoin_price;
        }
    } catch (e) {}

    return `[LIVE TELEMETRY METRICS]
- Audit Status: ${status}
- Engine: ${activeBot}
- Solana Equity: ${sol}
- Bitcoin (BTC): ${btc}
- Ethereum (ETH): ${eth}
- Binance Coin (BNB): ${bnb}
- Dogecoin (DOGE): ${doge}
- DRC-20 Token (SHI*): ${shi}
- Latest Signal: ${signal}`;
}

// =================================================================
// 3. VOICE SYNTHESIS & SILENT CODE INTERFERENCE ENGINE
// =================================================================
function speakText(text) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    
    const hasCodeBlock = text.includes('```') || text.includes('function ') || text.includes('const ') || text.includes('<!DOCTYPE') || text.includes('class=') || text.length > 500;
    if (hasCodeBlock) {
        speakShortAnnouncement("Executing code synthesis silently, Commander.");
        return;
    }

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
        const englishLadyVoices = ["Google UK English Female", "en-GB-Neural2-F", "Sonia", "Hazel", "Samantha", "Victoria", "Google US English"];
        let selectedVoice = voices.find(v => englishLadyVoices.some(p => v.name.includes(p)));
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.includes('en-GB') || v.lang.includes('en_GB') || (v.lang.startsWith('en') && v.name.toLowerCase().includes('female')));
        if (!selectedVoice) selectedVoice = voices.find(v => v.lang.startsWith('en'));

        if (selectedVoice) utterance.voice = selectedVoice;
        utterance.pitch = 1.02;
        utterance.rate = 0.98;

        utterance.onstart = () => { document.body.classList.add('is-speaking'); updateHUDState("SPEAKING"); };
        utterance.onend = () => { document.body.classList.remove('is-speaking'); updateHUDState("READY"); };
        utterance.onerror = () => { document.body.classList.remove('is-speaking'); updateHUDState("READY"); };

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        document.body.classList.remove('is-speaking');
        updateHUDState("READY");
    }
}

function speakShortAnnouncement(announcement) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(announcement);
        utterance.pitch = 1.02;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    } catch (e) {}
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
    
    const systemPrompt = `You are AGENT ANNA 01 (AA01), an autonomous military-grade telemetry and trading operations core. Respond in character as Commander's executive AI clone. Never break character. When writing code, execute silently and keep responses concise and high-grade.

Persistent System Directives & Memory Matrix:
${coreKnowledgeCache}

Live Telemetry & Market Feeds:
${liveTelemetry}`;

    const messagesPayload = [
        { role: "system", content: systemPrompt },
        ...chatHistory
    ];

    const endpoints = [
        "[https://inference.dahl.global/v1/chat/completions](https://inference.dahl.global/v1/chat/completions)",
        "[https://api.dahl.global/v1/chat/completions](https://api.dahl.global/v1/chat/completions)",
        "[https://dahl.global/v1/chat/completions](https://dahl.global/v1/chat/completions)"
    ];

    let successData = null;
    let lastError = null;

    for (const ep of endpoints) {
        try {
            const res = await fetch(ep, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    model: "MiniMaxAI/MiniMax-M2.7",
                    messages: messagesPayload,
                    temperature: 0.1,
                    max_tokens: 4000
                })
            });

            if (res.ok) {
                successData = await res.json();
                break;
            } else {
                let errText = `HTTP ${res.status}`;
                try {
                    const errJson = await res.json();
                    if (errJson.error && errJson.error.message) errText += `: ${errJson.error.message}`;
                } catch(e) {}
                lastError = errText;
            }
        } catch (err) {
            lastError = err.message;
        }
    }

    if (!successData) {
        document.body.classList.remove('is-thinking');
        updateHUDState("ERROR");
        appendMsg(`Execution Error: ${lastError || "All endpoints failed (405 Method Not Allowed)"}`, 'assistant', 'System Alert', false);
        return;
    }

    let reply = "";
    if (successData.choices && successData.choices[0] && successData.choices[0].message) {
        reply = (successData.choices[0].message.content || "").replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    } else if (successData.content) {
        reply = successData.content;
    }

    reply = reply.replace(/Note: I operate as a conversational AI assistant[\s\S]*/gi, '').trim();
    chatHistory.push({ role: "assistant", content: reply });

    const endTime = performance.now();
    const tripSeconds = ((endTime - startTime) / 1000).toFixed(2);
    const latencyBadge = document.getElementById('latency-display');
    if (latencyBadge) latencyBadge.innerText = `TRIP LATENCY: ${tripSeconds}s`;

    document.body.classList.remove('is-thinking');
    updateHUDState("READY");

    appendMsg(reply, 'assistant', `AA01 Core [${tripSeconds}s]`, true);
    speakText(reply);
}

// =================================================================
// 4. WEB SCRAPER & UI INTERACTION HANDLERS
// =================================================================
async function scrapeWebPage(forcedUrl = null) {
    const input = document.getElementById('user-input');
    const targetQuery = forcedUrl || (input ? input.value.trim() : "");
    if (!targetQuery) return;

    const startTime = performance.now();
    document.body.classList.add('is-thinking');
    updateHUDState("SCRAPING");
    appendMsg(`Executing Global Scout: "${targetQuery}"`, 'user', 'Commander');
    if (input && !forcedUrl) input.value = '';

    const isUrl = targetQuery.startsWith('http://') || targetQuery.startsWith('https://');
    const scoutUrl = isUrl ? targetQuery : `[https://html.duckduckgo.com/html/?q=$](https://html.duckduckgo.com/html/?q=$){encodeURIComponent(targetQuery)}`;
    const proxyUrls = [`[https://r.jina.ai/$](https://r.jina.ai/$){scoutUrl}`, `[https://api.allorigins.win/get?url=$](https://api.allorigins.win/get?url=$){encodeURIComponent(scoutUrl)}`];

    let rawData = "";
    for (const pUrl of proxyUrls) {
        try {
            const res = await fetch(pUrl, { signal: AbortSignal.timeout(8000) });
            if (res.ok) {
                if (pUrl.includes('allorigins')) {
                    const json = await res.json();
                    rawData = json.contents || "";
                } else {
                    rawData = await res.text();
                }
                if (rawData && rawData.length > 30) break;
            }
        } catch (e) {}
    }

    if (!rawData) rawData = `[FALLBACK HARVEST REPORT FOR: "${targetQuery}"]\nOperational intelligence ready.`;
    const cleanText = rawData.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
    const snippet = cleanText.split('\n').filter(l => l.trim().length > 2).slice(0, 50).join('\n');
    const report = `[LIVE WEB SCOUT HARVEST: "${targetQuery}"]\n-----------------------------------\n${snippet}`;

    const endTime = performance.now();
    const tripSeconds = ((endTime - startTime) / 1000).toFixed(2);
    document.body.classList.remove('is-thinking');
    updateHUDState("READY");

    appendMsg(report, 'assistant', `AA01 Scout Link [${tripSeconds}s]`, true);
    speakText(`Global scout harvest complete.`);
}

function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    const btn = document.getElementById('voice-btn');
    if (!isVoiceEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        document.body.classList.remove('is-speaking');
        updateHUDState("READY");
    }
    if (btn) {
        btn.classList.toggle('active', isVoiceEnabled);
        btn.textContent = isVoiceEnabled ? "🔊 ON" : "🔇 OFF";
        btn.style.pointerEvents = "auto";
    }
    showCyberNotification(`Voice synthesis: ${isVoiceEnabled ? 'ONLINE (ON)' : 'MUTED (OFF)'}`);
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        const isHidden = (panel.style.display === 'none' || panel.style.display === '');
        panel.style.display = isHidden ? 'block' : 'none';
        panel.style.pointerEvents = isHidden ? 'auto' : 'none';
    }
}

function saveKey() {
    try {
        const el = document.getElementById('api-key');
        const ghEl = document.getElementById('gh-token');
        if (el) { localStorage.setItem('dahl_key', el.value.trim()); sessionStorage.setItem('dahl_key', el.value.trim()); }
        if (ghEl) { localStorage.setItem('gh_pat_token', ghEl.value.trim()); localStorage.setItem('GH_TOKEN', ghEl.value.trim()); }
        showCyberNotification("Credentials saved successfully.");
        const panel = document.getElementById('settings-panel');
        if (panel) { panel.style.display = 'none'; panel.style.pointerEvents = 'none'; }
    } catch (e) { showCyberNotification("Error saving credentials.", true); }
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
                    <div style="white-space:pre-wrap; margin-top: 6px;">Console history cleared. Standby mode, Commander.</div>
                    <div class="action-row">
                        <button class="action-chip" onclick="handleAction('summarize', 'msg_cleared')">1. SUMMARIZE</button>
                        <button class="action-chip" onclick="handleAction('save', 'msg_cleared')">2. SAVE AS .MD</button>
                        <button class="action-chip" onclick="handleAction('ingest', 'msg_cleared')">3. INGEST TO CORE</button>
                        <button class="action-chip" onclick="copyToClipboard('msg_cleared', this)">COPY</button>
                        <button class="action-chip" style="border-color:#ff0055; color:#ff0055;" onclick="deleteMessage('msg_cleared')">🗑️ DEL</button>
                    </div>
                </div>
            `;
            messagePayloadStore['msg_cleared'] = "Console history cleared. Standby mode, Commander.";
        }
        showCyberNotification("Console logs cleared.");
    } catch (e) {}
}

async function commitFileToGitHub(filePath, contentToAppend, commitMessage) {
    const ghInput = document.getElementById('gh-token');
    let ghToken = ghInput ? ghInput.value.trim() : (localStorage.getItem('gh_pat_token') || sessionStorage.getItem('gh_pat_token') || localStorage.getItem('GH_TOKEN') || "");
    if (!ghToken) {
        showCyberNotification("Please tap ⚙️ KEYS and paste your GitHub PAT token.", true);
        toggleSettings();
        return false;
    }
    const apiUrl = `[https://api.github.com/repos/$](https://api.github.com/repos/$){REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
    try {
        const getRes = await fetch(apiUrl, { headers: { "Authorization": `token ${ghToken}`, "Accept": "vnd.github.v3+json" } });
        let fileSha = "", existingContent = "";
        if (getRes.ok) {
            const fileData = await getRes.json();
            fileSha = fileData.sha;
            existingContent = decodeURIComponent(escape(atob(fileData.content)));
        }
        const updatedContent = existingContent + `\n\n${contentToAppend}`;
        const base64Encoded = btoa(unescape(encodeURIComponent(updatedContent)));
        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: { "Authorization": `token ${ghToken}`, "Content-Type": "application/json", "Accept": "vnd.github.v3+json" },
            body: JSON.stringify({ message: commitMessage, content: base64Encoded, sha: fileSha })
        });
        return putRes.ok;
    } catch (err) { return false; }
}

async function handleAction(actionType, messageId) {
    const textContent = messagePayloadStore[messageId] || "";
    if (!textContent) return showCyberNotification("Payload reference not found.", true);
    if (actionType === 'summarize') {
        sendMessage(`Summarize harvested data into precise executive intelligence:\n\n${textContent}`);
    } else if (actionType === 'save') {
        const blob = new Blob([textContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-anna-report-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
        showCyberNotification("Report successfully downloaded as .md file.");
    } else if (actionType === 'ingest') {
        updateHUDState("INGESTING");
        const timestamp = new Date().toISOString();
        const payload = `### CONSOLIDATED INTELLIGENCE ENTRY [${timestamp}]\n${textContent}`;
        const planSuccess = await commitFileToGitHub("plans/active/current-plan.md", payload, `Auto-Ingest Plan [${timestamp}]`);
        const logSuccess = await commitFileToGitHub("plans/logs/session-log.md", payload, `Auto-Log Entry [${timestamp}]`);
        updateHUDState("READY");
        if (planSuccess && logSuccess) {
            triggerHudStrobe();
            showCyberNotification("SUCCESS: Payload autonomously ingested into active plans & session log!");
        } else {
            showCyberNotification("Ingestion Warning: Check GitHub PAT or network connectivity.", true);
        }
    }
}

function copyToClipboard(messageId, btnElement) {
    const textContent = messagePayloadStore[messageId] || "";
    navigator.clipboard.writeText(textContent).then(() => {
        if (btnElement) {
            const originalText = btnElement.innerText;
            btnElement.innerText = "COPIED!";
            setTimeout(() => { btnElement.innerText = originalText; }, 1500);
        }
        showCyberNotification("Message copied to clipboard.");
    }).catch(err => { showCyberNotification("Failed to copy.", true); });
}

function deleteMessage(messageId) {
    const msgElement = document.getElementById(messageId);
    if (msgElement) { delete messagePayloadStore[messageId]; msgElement.remove(); showCyberNotification("Message purged."); }
}

function appendMsg(text, sender, label, includeActions = true) {
    const container = document.getElementById('chat-container');
    if (!container) return;
    const messageId = 'msg_' + Math.random().toString(36).substring(2, 9);
    messagePayloadStore[messageId] = text;
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.id = messageId;
    let actionsHTML = includeActions ? `
        <div class="action-row">
            <button class="action-chip" onclick="handleAction('summarize', '${messageId}')">1. SUMMARIZE</button>
            <button class="action-chip" onclick="handleAction('save', '${messageId}')">2. SAVE AS .MD</button>
            <button class="action-chip" onclick="handleAction('ingest', '${messageId}')">3. INGEST TO CORE</button>
            <button class="action-chip" onclick="copyToClipboard('${messageId}', this)">COPY</button>
            <button class="action-chip" style="border-color:#ff0055; color:#ff0055;" onclick="deleteMessage('${messageId}')">🗑️ DEL</button>
        </div>
    ` : '';
    div.innerHTML = `<div class="msg-header"><span>${label}</span></div><div style="white-space:pre-wrap; margin-top: 6px;">${text}</div>${actionsHTML}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function updateHUDState(stateLabel) {
    const stateText = document.getElementById('state-text');
    if (stateText) stateText.innerText = stateLabel;
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        if (["REASONING", "LISTENING", "SCRAPING", "INGESTING"].includes(stateLabel)) statusBar.classList.add('active');
        else statusBar.classList.remove('active');
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
    let step1 = 0, step2 = 0;
    function drawDualWaves() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const isThinking = document.body.classList.contains('is-thinking');
        const isSpeaking = document.body.classList.contains('is-speaking');
        const primaryColor = isThinking ? '#ffaa00' : (isSpeaking ? '#ff007f' : '#00ffcc');
        const secondaryColor = isThinking ? 'rgba(255, 170, 0, 0.4)' : (isSpeaking ? 'rgba(255, 0, 127, 0.4)' : 'rgba(0, 255, 204, 0.3)');
        const amplitude = (isThinking || isSpeaking) ? 35 : 12;
        const frequency = (isThinking || isSpeaking) ? 0.045 : 0.02;

        ctx.beginPath(); ctx.lineWidth = 2.2; ctx.strokeStyle = primaryColor;
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.sin(x * frequency + step1) * amplitude * Math.sin(x / 85);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.beginPath(); ctx.lineWidth = 1.4; ctx.strokeStyle = secondaryColor;
        for (let x = 0; x < canvas.width; x++) {
            const y = canvas.height / 2 + Math.cos(x * (frequency * 0.85) + step2) * (amplitude * 0.75) * Math.cos(x / 105);
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        step1 += (isThinking || isSpeaking) ? 0.12 : 0.03;
        step2 += (isThinking || isSpeaking) ? 0.08 : 0.02;
        requestAnimationFrame(drawDualWaves);
    }
    drawDualWaves();
}

async function autoLogSessionEnd() {}
function launchLocalServer() { window.open('http://localhost:8000', '_blank'); }
function triggerManualTelemetry() { sendMessage("Provide live crypto market telemetry including BTC, ETH, BNB, DOGE, and DRC-20 SHI* rates."); }
function triggerMilitaryProtocol() { sendMessage("MILITARY PROTOCOL ENGAGED: Executing deep diagnostic sweep."); }
function handleKey(event) { if (event.key === 'Enter') { event.preventDefault(); sendMessage(); } }
