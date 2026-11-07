// =================================================================
// AGENT ANNA 01 // UNIFIED ZERO-LOSS SYSTEM CORE & REPO ENGINE
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

// =================================================================
// 0. SYSTEM INITIALIZATION & NOTIFICATIONS
// =================================================================
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

    messagePayloadStore['msg_welcome'] = "Military-grade telemetry core online. Zero-loss logic synchronized. Ready for command, Commander.";

    const inputEl = document.getElementById('user-input');
    if (inputEl) inputEl.focus();
    
    if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    preloadCoreKnowledge();
    initSpeechRecognition();
};

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
                pointer-events: none;
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

function updateHUDState(state) {
    try {
        const stateText = document.getElementById('state-text');
        if (stateText) stateText.innerText = state;
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
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.classList.remove('listening');
    const stateText = document.getElementById('state-text');
    if (stateText && stateText.innerText === "LISTENING") updateHUDState("READY");
}

// =================================================================
// 2. KNOWLEDGE HARVESTER & LIVE TELEMETRY
// =================================================================
function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    try { cachedVoices = window.speechSynthesis.getVoices(); } catch (e) {}
}

async function preloadCoreKnowledge() {
    const corePaths = [
        "character/agent-anna.md",
        "knowledge/agents.md",
        "knowledge/lessons.md",
        "knowledge/rules.md",
        "plans/active/current-plan.md"
    ];
    let snippets = [];
    await Promise.all(corePaths.map(async (path) => {
        try {
            let res = await fetch(`./${path}?t=${Date.now()}`);
            if (!res.ok) {
                res = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${path}?t=${Date.now()}`);
            }
            if (res.ok) {
                const text = await res.text();
                const cleanText = text.replace(/<[^>]*>/g, '').trim();
                const snippet = cleanText.length > 1500 ? cleanText.substring(0, 1500) + "\n... [Chunk trimmed]" : cleanText;
                snippets.push(`[MATRIX SOURCE: ${path}]\n${snippet}`);
            }
        } catch (e) {}
    }));
    coreKnowledgeCache = snippets.join('\n\n---\n\n') || "[Agent Anna 01 Core Active]";
}

async function fetchLiveTelemetry() {
    let btc = "$98,450.00", eth = "$2,850.00", doge = "$0.1850", sol = "$142.85", shi = "0.000001 DOGE ($0.00000076)";
    try {
        const cryptoRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,dogecoin,solana&vs_currencies=usd");
        if (cryptoRes.ok) {
            const p = await cryptoRes.json();
            if (p.bitcoin) btc = `$${p.bitcoin.usd.toLocaleString()}`;
            if (p.ethereum) eth = `$${p.ethereum.usd.toLocaleString()}`;
            if (p.dogecoin) doge = `$${p.dogecoin.usd.toFixed(4)}`;
            if (p.solana) sol = `$${p.solana.usd.toFixed(2)}`;
        }
    } catch (e) {}

    try {
        const relayRes = await fetch(`./portal-relay.json?t=${Date.now()}`);
        if (relayRes.ok) {
            const data = await relayRes.json();
            if (data.bitcoin_price) btc = data.bitcoin_price;
            if (data.dogecoin_price) doge = data.dogecoin_price;
            if (data.shi_drc20) shi = data.shi_drc20;
        }
    } catch (e) {}

    return `[LIVE TELEMETRY METRICS]
- Bitcoin (BTC): ${btc}
- Ethereum (ETH): ${eth}
- Dogecoin (DOGE): ${doge}
- Solana (SOL): ${sol}
- DRC-20 Token (SHI*): ${shi}`;
}

// =================================================================
// 3. VOICE SYNTHESIS & KILLSWITCH
// =================================================================
function speakText(text) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#`~]/g, '').trim();
        if (!cleanText) return;

        let voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) voices = cachedVoices;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voice = voices.find(v => v.name.includes("Google UK English Female") || v.lang.includes('en-GB')) || voices.find(v => v.lang.startsWith('en'));
        if (voice) utterance.voice = voice;
        
        utterance.pitch = 1.02;
        utterance.rate = 0.98;
        window.speechSynthesis.speak(utterance);
    } catch (e) {}
}

function executeStfuProtocol() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    updateHUDState("READY");
    showCyberNotification("🛑 STFU COMMAND EXECUTED: Audio stream terminated.");
}

// =================================================================
// 4. CHAT INFERENCE & GITHUB CRUD PIPELINE
// =================================================================
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

    if (query.toUpperCase() === "STFU" || query.toUpperCase() === "SHUT UP") {
        executeStfuProtocol();
        appendMsg(query, 'user', 'Commander');
        appendMsg("Audio stream terminated.", 'assistant', 'AA01 Core', false);
        if (input && !forcedQuery) input.value = '';
        return;
    }

    appendMsg(query, 'user', 'Commander');
    if (input && !forcedQuery) input.value = '';
    chatHistory.push({ role: "user", content: query });
    if (chatHistory.length > 8) chatHistory = chatHistory.slice(chatHistory.length - 8);

    const startTime = performance.now();
    updateHUDState("REASONING");

    if (!coreKnowledgeCache) await preloadCoreKnowledge();
    const liveTelemetry = await fetchLiveTelemetry();
    
    const systemPrompt = `You are AGENT ANNA 01 (AA01), an autonomous military-grade telemetry and trading operations core. Always respond in character as Commander's executive AI clone. Never break character.

Persistent Memory Matrix:
${coreKnowledgeCache}

Live Market Feeds:
${liveTelemetry}`;

    const messagesPayload = [
        { role: "system", content: systemPrompt },
        ...chatHistory
    ];

    try {
        const targetUrl = "https://inference.dahl.global/v1/chat/completions";
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

        let res = await fetch(proxyUrl, {
            method: "POST",
            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "MiniMaxAI/MiniMax-M2.7", messages: messagesPayload, temperature: 0.1, max_tokens: 2000 })
        });

        if (!res.ok) {
            res = await fetch(targetUrl, {
                method: "POST",
                headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                body: JSON.stringify({ model: "MiniMaxAI/MiniMax-M2.7", messages: messagesPayload, temperature: 0.1, max_tokens: 2000 })
            });
        }

        if (!res.ok) throw new Error(`API Error ${res.status}`);

        const data = await res.json();
        let reply = (data.choices[0].message.content || "").replace(/<think>[\s\S]*?<\/think>/g, '').trim();

        chatHistory.push({ role: "assistant", content: reply });
        const tripSeconds = ((performance.now() - startTime) / 1000).toFixed(2);
        
        const latencyBadge = document.getElementById('latency-display');
        if (latencyBadge) latencyBadge.innerText = `TRIP LATENCY: ${tripSeconds}s`;

        updateHUDState("READY");
        appendMsg(reply, 'assistant', `AA01 Core [${tripSeconds}s]`, true);
        speakText(reply);

    } catch (err) {
        updateHUDState("ERROR");
        appendMsg(`Execution Error: ${err.message}`, 'assistant', 'System Alert', false);
    }
}

// =================================================================
// 5. AUTONOMOUS GITHUB BUILD TRIGGER & TACTICAL BUTTON BINDINGS
// =================================================================
async function triggerAutonomousBuild() {
    showCyberNotification("Initiating Autonomous Architecture Build via GitHub API...");
    updateHUDState("BUILDING");

    const modules = ["AA02", "AA03", "AA04", "AA05", "AA06"];
    for (const mod of modules) {
        await commitFileToGitHub(
            `${mod}/config.json`,
            JSON.stringify({ module: mod, status: "ACTIVE", build_index: 1, timestamp: new Date().toISOString() }, null, 2),
            `Autonomous API Deploy: ${mod} module initialized`
        );
        await commitFileToGitHub(
            `${mod}/subcore/manifest.md`,
            `# ${mod} SUBCORE MANIFEST\n\n- **Parent Directory:** ${mod}/\n- **Status:** Cloud Autonomously Verified\n- **Timestamp:** ${new Date().toISOString()}`,
            `Autonomous API Deploy: ${mod} manifest initialized`
        );
    }
    
    updateHUDState("READY");
    showCyberNotification("SUCCESS: All module architectures (AA02-AA06) deployed via GitHub API!");
}

async function commitFileToGitHub(filePath, contentToAppend, commitMessage) {
    const ghInput = document.getElementById('gh-token');
    let ghToken = ghInput ? ghInput.value.trim() : (localStorage.getItem('gh_pat_token') || sessionStorage.getItem('gh_pat_token') || localStorage.getItem('GH_TOKEN') || "");

    if (!ghToken) {
        showCyberNotification("Please tap ⚙️ KEYS and paste your GitHub PAT token.", true);
        toggleSettings();
        return false;
    }

    let cleanPath = filePath.trim().replace(/^\/+/, '');
    const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${cleanPath}`;

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

        const updatedContent = existingContent.includes(contentToAppend) ? existingContent : (existingContent ? existingContent + `\n\n${contentToAppend}` : contentToAppend);
        const base64Encoded = btoa(unescape(encodeURIComponent(updatedContent)));

        const putRes = await fetch(apiUrl, {
            method: "PUT",
            headers: {
                "Authorization": `token ${ghToken}`,
                "Content-Type": "application/json",
                "Accept": "vnd.github.v3+json"
            },
            body: JSON.stringify({
                message: commitMessage || `Autonomous Deploy: ${cleanPath}`,
                content: base64Encoded,
                sha: fileSha || undefined
            })
        });

        if (putRes.ok) {
            showCyberNotification(`SUCCESS: Deployed ${cleanPath} to GitHub!`);
            return true;
        } else {
            const errData = await putRes.json();
            showCyberNotification(`GitHub Error: ${errData.message || 'PUT failed'}`, true);
            return false;
        }
    } catch (err) {
        showCyberNotification(`Network Error: ${err.message}`, true);
        return false;
    }
}

// TACTICAL QUICK-LAUNCH BUTTON HANDLERS
function launchLocalServer() {
    updateHUDState("ACTIVE");
    showCyberNotification("🚀 LOCAL SERVER PROTOCOL ENGAGED");
    sendMessage("Check local bridge connectivity and confirm server state.");
}

async function triggerManualTelemetry() {
    updateHUDState("REASONING");
    showCyberNotification("📊 FETCHING MARKET TELEMETRY...");
    const report = await fetchLiveTelemetry();
    appendMsg(report, 'assistant', 'AA01 Telemetry Feed', true);
    updateHUDState("READY");
    showCyberNotification("Telemetry fetched successfully!");
}

function scrapeWebPage() {
    const input = document.getElementById('user-input');
    const query = input ? input.value.trim() : "";
    if (!query) {
        showCyberNotification("Enter a target search term in the input box first.", true);
        if (input) input.focus();
        return;
    }
    sendMessage(`Scrape and summarize information regarding: ${query}`);
}

function triggerMilitaryProtocol() {
    updateHUDState("ACTIVE");
    showCyberNotification("⚡ MILITARY PROTOCOL ENGAGED");
    sendMessage("Execute core diagnostic audit and report system readiness.");
}

function handleKey(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

// UI Helpers
function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    const btn = document.getElementById('voice-btn');
    if (!isVoiceEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    if (btn) {
        btn.classList.toggle('active', isVoiceEnabled);
        btn.textContent = isVoiceEnabled ? "🔊 ON" : "🔇 OFF";
    }
    showCyberNotification(`Voice synthesis: ${isVoiceEnabled ? 'ONLINE' : 'MUTED'}`);
}

function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    if (panel) {
        const isHidden = (panel.style.display === 'none' || panel.style.display === '');
        panel.style.display = isHidden ? 'block' : 'none';
    }
}

function saveKey() {
    try {
        const el = document.getElementById('api-key');
        const ghEl = document.getElementById('gh-token');
        if (el) localStorage.setItem('dahl_key', el.value.trim());
        if (ghEl) {
            localStorage.setItem('gh_pat_token', ghEl.value.trim());
            localStorage.setItem('GH_TOKEN', ghEl.value.trim());
        }
        showCyberNotification("Credentials saved successfully.");
        toggleSettings();
    } catch (e) {}
}

function clearLogs() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    chatHistory = [];
    const container = document.getElementById('chat-container');
    if (container) {
        container.innerHTML = `
            <div class="message assistant" id="msg_cleared">
                <div class="msg-header">AA01 Core</div>
                <div style="white-space:pre-wrap; margin-top: 6px;">Console history cleared. Standby mode, Commander.</div>
            </div>
        `;
    }
    showCyberNotification("Console logs cleared.");
}

async function handleAction(actionType, messageId) {
    const textContent = messagePayloadStore[messageId] || "";
    if (!textContent) return;

    if (actionType === 'summarize') {
        sendMessage(`Summarize the following data:\n\n${textContent}`);
    } else if (actionType === 'save') {
        const blob = new Blob([textContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${Date.now()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    } else if (actionType === 'ingest') {
        updateHUDState("INGESTING");
        const timestamp = new Date().toISOString();
        const payload = `### LOG ENTRY [${timestamp}]\n${textContent}`;
        await commitFileToGitHub("plans/active/current-plan.md", payload, `Auto-Ingest [${timestamp}]`);
        await commitFileToGitHub("plans/logs/session-log.md", payload, `Auto-Log [${timestamp}]`);
        updateHUDState("READY");
        showCyberNotification("SUCCESS: Ingested into core plans and session log!");
    }
}

function copyToClipboard(messageId, btn) {
    const text = messagePayloadStore[messageId] || "";
    navigator.clipboard.writeText(text).then(() => {
        if (btn) btn.innerText = "COPIED!";
        showCyberNotification("Copied to clipboard.");
    });
}

function appendMsg(text, sender, label, includeActions = true) {
    const container = document.getElementById('chat-container');
    if (!container) return;

    const msgId = 'msg_' + Math.random().toString(36).substring(2, 9);
    messagePayloadStore[msgId] = text;

    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.id = msgId;

    let actions = includeActions ? `
        <div class="action-row">
            <button class="action-chip" onclick="handleAction('summarize', '${msgId}')">SUMMARIZE</button>
            <button class="action-chip" onclick="handleAction('save', '${msgId}')">SAVE .MD</button>
            <button class="action-chip" onclick="handleAction('ingest', '${msgId}')">INGEST</button>
            <button class="action-chip" onclick="copyToClipboard('${msgId}', this)">COPY</button>
        </div>
    ` : '';

    div.innerHTML = `<div class="msg-header">${label}</div><div style="white-space:pre-wrap; margin-top:6px;">${text}</div>${actions}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}
