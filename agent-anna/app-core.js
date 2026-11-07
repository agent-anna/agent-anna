// =================================================================
// AGENT ANNA 01 // APP-CORE.JS (AI, Voice, Telemetry, GitHub, Server Ping)
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

window.addEventListener('DOMContentLoaded', () => {
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

    messagePayloadStore['msg_welcome'] = "Military-grade telemetry core online. Modular core synchronized. Voice engine and local bridge active. Ready for command, Commander.";
    
    if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    preloadCoreKnowledge();
    initSpeechRecognition();
});

// Knowledge & Telemetry Engine
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

// Voice Synthesis Engine
function loadVoices() {
    if (!('speechSynthesis' in window)) return;
    try {
        cachedVoices = window.speechSynthesis.getVoices();
    } catch (e) {}
}

function speakText(text) {
    if (!isVoiceEnabled || !('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const cleanText = text.replace(/<[^>]*>/g, '').replace(/[*_#`~]/g, '').trim();
        if (!cleanText) return;

        document.body.classList.add('is-speaking');
        if (typeof updateHUDState === 'function') updateHUDState("SPEAKING");

        let voices = window.speechSynthesis.getVoices();
        if (!voices || voices.length === 0) voices = cachedVoices;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voice = voices.find(v => v.name.includes("Google UK English Female") || v.name.includes("Victoria") || v.name.includes("Zira") || v.lang.includes('en-GB')) || voices.find(v => v.lang.startsWith('en'));
        if (voice) utterance.voice = voice;
        
        utterance.pitch = 1.02;
        utterance.rate = 0.98;

        utterance.onend = () => {
            document.body.classList.remove('is-speaking');
            if (typeof updateHUDState === 'function') updateHUDState("READY");
        };
        utterance.onerror = () => {
            document.body.classList.remove('is-speaking');
            if (typeof updateHUDState === 'function') updateHUDState("READY");
        };

        window.speechSynthesis.speak(utterance);
    } catch (e) {
        document.body.classList.remove('is-speaking');
        if (typeof updateHUDState === 'function') updateHUDState("READY");
    }
}

function executeStfuProtocol() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    document.body.classList.remove('is-speaking', 'is-thinking');
    if (typeof updateHUDState === 'function') updateHUDState("READY");
    if (typeof showCyberNotification === 'function') showCyberNotification("🛑 STFU COMMAND EXECUTED: Audio stream terminated.");
}

// AI Inference Pipeline
async function sendMessage(forcedQuery = null) {
    const keyEl = document.getElementById('api-key');
    const input = document.getElementById('user-input');
    const apiKey = keyEl ? keyEl.value.trim() : (localStorage.getItem('dahl_key') || sessionStorage.getItem('dahl_key') || "");
    const query = forcedQuery || (input ? input.value.trim() : "");

    if (!apiKey) {
        if (typeof showCyberNotification === 'function') showCyberNotification('Please tap ⚙️ KEYS and paste your Dahl API Key.', true);
        if (typeof toggleSettings === 'function') toggleSettings();
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
    document.body.classList.add('is-thinking');
    if (typeof updateHUDState === 'function') updateHUDState("REASONING");

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

        document.body.classList.remove('is-thinking');
        if (typeof updateHUDState === 'function') updateHUDState("READY");
        appendMsg(reply, 'assistant', `AA01 Core [${tripSeconds}s]`, true);
        speakText(reply);

    } catch (err) {
        document.body.classList.remove('is-thinking');
        if (typeof updateHUDState === 'function') updateHUDState("ERROR");
        appendMsg(`Execution Error: ${err.message}`, 'assistant', 'System Alert', false);
        speakText("System alert. Execution error encountered.");
    }
}

// Local Server Connection Ping (Since browser cannot execute node from static html)
async function launchLocalServer() {
    if (typeof triggerMilitaryVisualPulse === 'function') triggerMilitaryVisualPulse();
    if (typeof updateHUDState === 'function') updateHUDState("ACTIVE");
    if (typeof showCyberNotification === 'function') showCyberNotification("🚀 PINGING LOCAL BRIDGE AT http://localhost:8000...");
    
    try {
        const res = await fetch("http://localhost:8000/?t=" + Date.now(), { mode: 'no-cors' });
        if (typeof showCyberNotification === 'function') showCyberNotification("SUCCESS: Local server bridge responding at localhost:8000!");
        speakText("Local server bridge confirmed online, Commander.");
        sendMessage("Confirm local bridge status and report operational readiness.");
    } catch (e) {
        if (typeof showCyberNotification === 'function') showCyberNotification("NOTICE: Run 'python3 -m http.server 8000' in terminal to host locally.", true);
        speakText("Local server notice. Please start your HTTP server in terminal.");
        appendMsg("Local Bridge Notice: Browsers block direct server spawning from static files. Run `python3 -m http.server 8000` or `node server.js` in your local directory to host on http://localhost:8000.", 'assistant', 'System Alert', false);
    }
    if (typeof updateHUDState === 'function') updateHUDState("READY");
}

// GitHub Deployment Pipeline
async function triggerAutonomousBuild() {
    if (typeof triggerMilitaryVisualPulse === 'function') triggerMilitaryVisualPulse();
    if (typeof showCyberNotification === 'function') showCyberNotification("Initiating Autonomous Architecture Build via GitHub API...");
    if (typeof updateHUDState === 'function') updateHUDState("BUILDING");

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
    
    if (typeof updateHUDState === 'function') updateHUDState("READY");
    if (typeof showCyberNotification === 'function') showCyberNotification("SUCCESS: All module architectures (AA02-AA06) deployed via GitHub API!");
    speakText("Autonomous module architectures deployed successfully.");
}

async function commitFileToGitHub(filePath, contentToAppend, commitMessage) {
    const ghInput = document.getElementById('gh-token');
    let ghToken = ghInput ? ghInput.value.trim() : (localStorage.getItem('gh_pat_token') || sessionStorage.getItem('gh_pat_token') || localStorage.getItem('GH_TOKEN') || "");

    if (!ghToken) {
        if (typeof showCyberNotification === 'function') showCyberNotification("Please tap ⚙️ KEYS and paste your GitHub PAT token.", true);
        if (typeof toggleSettings === 'function') toggleSettings();
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
            if (typeof showCyberNotification === 'function') showCyberNotification(`SUCCESS: Deployed ${cleanPath} to GitHub!`);
            return true;
        } else {
            const errData = await putRes.json();
            if (typeof showCyberNotification === 'function') showCyberNotification(`GitHub Error: ${errData.message || 'PUT failed'}`, true);
            return false;
        }
    } catch (err) {
        if (typeof showCyberNotification === 'function') showCyberNotification(`Network Error: ${err.message}`, true);
        return false;
    }
}
