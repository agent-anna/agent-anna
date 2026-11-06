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
        const savedGhToken = localStorage.getItem('gh_pat_token') || sessionStorage.getItem('gh_pat_token');
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
    banner.innerHTML = `<strong>[AA01 SYSTEM NOTICE]</strong><br>${message}`;  setTimeout(() => { banner.style.opacity = '1'; banner.style.transform = 'translateY(0)'; }, 10);  setTimeout(() => { banner.style.opacity = '0'; banner.style.transform = 'translateY(-10px)'; }, 4000); }  function triggerHudStrobe() { const hudPane = document.querySelector('.agent-hud-pane'); if (!hudPane) return;  let flashes = 0; const interval = setInterval(() => { hudPane.style.boxShadow = flashes \% 2 === 0 ? 'inset 0 0 30px #00ffcc' : 'none'; flashes++; if (flashes > 5) { clearInterval(interval); hudPane.style.boxShadow = 'none'; } }, 150); }  // ================================================================= // 1. SPEECH RECOGNITION & VISUALIZER ENGINE // ================================================================= function initSpeechRecognition() { const SpeechRecognition = window.SpeechRecognition \vert{}\vert{} window.webkitSpeechRecognition; if (!SpeechRecognition) return;  try { recognition = new SpeechRecognition(); recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'en-US';  recognition.onstart = function() { isListening = true; const micBtn = document.getElementById('mic-btn'); if (micBtn) micBtn.classList.add('listening'); updateHUDState("LISTENING"); startAudioVisualizer(); };  recognition.onresult = function(event) { const speechText = event.results[0][0].transcript; const userInput = document.getElementById('user-input'); if (userInput) userInput.value = speechText; stopListeningUI(); sendMessage(); };  recognition.onerror = function() { stopListeningUI(); }; recognition.onend = function() { stopListeningUI(); }; } catch (err) {} }  async function startAudioVisualizer() { try { if (!navigator.mediaDevices \vert{}\vert{} !navigator.mediaDevices.getUserMedia) return; micStream = await navigator.mediaDevices.getUserMedia({ audio: true });  audioCtx = new (window.AudioContext \vert{}\vert{} window.webkitAudioContext)(); analyser = audioCtx.createAnalyser(); analyser.fftSize = 32;  const source = audioCtx.createMediaStreamSource(micStream); source.connect(analyser);  const dataArray = new Uint8Array(analyser.frequencyBinCount); const eqBars = document.querySelectorAll('.eq-bar');  function renderFrame() { if (!isListening) return; analyser.getByteFrequencyData(dataArray);  eqBars.forEach((bar, index) => { const val = dataArray[index \% dataArray.length] \vert{}\vert{} 0; bar.style.height = `${Math.max(15, Math.min(100, (val / 255) * 100))}%`;
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
// 2. DYNAMIC KNOWLEDGE HARVESTER
// =================================================================
function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    cachedVoices = window.speechSynthesis.getVoices();
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
                if (cleanText) snippets.push(`[PERSISTENT MATRIX SOURCE: ${path}]\n${cleanText}`); } } catch (e) {} })); coreKnowledgeCache = snippets.join('\n\n---\n\n'); }  async function fetchLiveTelemetry() { let btc = "$98,450.00", eth = "$2,850.00", bnb = "$620.00", doge = "$0.1850", sol = "$142.85", shi = "0.000001 DOGE ($0.00000076)";  try { const cryptoRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,dogecoin,solana&vs_currencies=usd"); if (cryptoRes.ok) { const prices = await cryptoRes.json(); if (prices.bitcoin) btc = `$${prices.bitcoin.usd.toLocaleString()}`; if (prices.ethereum) eth = `$${prices.ethereum.usd.toLocaleString()}`; if (prices.binancecoin) bnb = `$${prices.binancecoin.usd.toLocaleString()}`; if (prices.dogecoin) doge = `$${prices.dogecoin.usd.toFixed(4)}`; if (prices.solana) sol = `$${prices.solana.usd.toFixed(2)}`; } } catch (e) {}  let status = "SYNCHRONIZED", activeBot = "Grok Multi-Asset Scanner", signal = "Active"; try { const localRes = await fetch(`./portal-relay.json?t=${Date.now()}`);
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
// 3. VOICE SYNTHESIS & MULTI-TURN INFERENCE LOOP
// =================================================================
function speakText(text) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    
    document.body.classList.remove('is-thinking');
    document.body.classList.add('is-speaking');
    updateHUDState("SPEAKING");

    window.speechSynthesis.cancel();
    
    const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#`~]/g, '').trim();
    if (!cleanText) return;

    if (cachedVoices.length === 0) loadVoices();
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const preferredVoices = ["Google UK English Female", "en-GB-Neural2-F", "Sonia", "Hazel", "Samantha", "Google US English"];
    let selectedVoice = cachedVoices.find(v => preferredVoices.some(p => v.name.includes(p)));
    if (!selectedVoice) selectedVoice = cachedVoices.find(v => v.lang.startsWith('en') && !v.name.toLowerCase().includes('male'));

    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.pitch = 1.05;
    utterance.rate = 0.96;

    utterance.onstart = () => { document.body.classList.add('is-speaking'); updateHUDState("SPEAKING"); };
    utterance.onend = () => { document.body.classList.remove('is-speaking'); updateHUDState("READY"); };
    utterance.onerror = () => { document.body.classList.remove('is-speaking'); updateHUDState("READY"); };

    window.speechSynthesis.speak(utterance);
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
// 4. AUTONOMOUS GITHUB API COMMIT & INGESTION CORE ENGINE
// =================================================================
async function commitFileToGitHub(filePath, contentToAppend, commitMessage) {
    const ghInput = document.getElementById('gh-token');
    let ghToken = ghInput ? ghInput.value.trim() : (localStorage.getItem('gh_pat_token') || sessionStorage.getItem('gh_pat_token') || "");

    if (!ghToken) {
        showCyberNotification("Please tap ⚙️ KEYS and paste your GitHub PAT token.", true);
        toggleSettings();
        return false;
    }

    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

    try {
        const getRes = await fetch(apiUrl, {
            headers: { "Authorization": `token ${ghToken}`, "Accept": "vnd.github.v3+json" }
        });
        
        let fileSha = "";
        let existingContent = "";
        if (getRes.ok) {
            const fileData = await getRes.json();
            fileSha = fileData.sha;
            existingContent = decodeURIComponent(escape(atob(fileData.content)));
        }

        const updatedContent = existingContent + `\n\n${contentToAppend}`;
        const base64Encoded = btoa(unescape(encodeURIComponent(updatedContent)));

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${ghToken}`,
                "Content-Type": "application/json",
                "Accept": "vnd.github.v3+json"
            },
            body: JSON.stringify({
                message: commitMessage,
                content: base64Encoded,
                sha: fileSha
            })
        });

        return putRes.ok;
    } catch (err) {
        return false;
    }
}

async function handleAction(actionType, messageId) {
    const textContent = messagePayloadStore[messageId] || "";
    if (!textContent) {
        showCyberNotification("Payload reference not found.", true);
        return;
    }

    if (actionType === 'summarize') {
        sendMessage(`Summarize the following harvested data into precise executive intelligence:\n\n${textContent}`);
    } else if (actionType === 'save') {
        const blob = new Blob([textContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `agent-anna-report-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    } else if (actionType === 'ingest') {
        updateHUDState("INGESTING");
        const timestamp = new Date().toISOString();
        const payload = `### CONSOLIDATED INTELLIGENCE ENTRY [${timestamp}]\n${textContent}`;
        
        const planSuccess = await commitFileToGitHub("agent-anna/plans/active/current-plan.md", payload, `Auto-Ingest Current Plan [${timestamp}]`);
        const logSuccess = await commitFileToGitHub("agent-anna/plans/logs/session-log.md", payload, `Auto-Log Session Entry [${timestamp}]`);

        updateHUDState("READY");

        if (planSuccess && logSuccess) {
            triggerHudStrobe();
            showCyberNotification("SUCCESS: Payload autonomously ingested into active plans & session log!");
        } else {
            showCyberNotification("Ingestion Warning: Check your GitHub PAT in settings or network connectivity.", true);
        }
    }
}

function deleteMessage(messageId) {
    const
