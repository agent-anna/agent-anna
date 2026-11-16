// Anna V1 — Brain App
// Loads brain + memory, boots dashboard

(function() {
  const brain = {
    id: "AA01",
    name: "Agent Anna",
    version: "2.0.0",
    home: "anna-v2",
    status: "ACTIVE",
    boot: "brain.json",
    client: "Kunda Cafe Franchise Empire",
    safeWord: "Swallows"
  };

  const memory = {
    memory_version: "1.0.0",
    last_updated: "2026-11-07",
    operational: {
      brain_loaded: true,
      cognitive_state: "NOMINAL",
      learning_mode: "ACTIVE"
    },
    context_window: {
      active_agent: "AA01",
      primary_client: "Kunda Cafe Franchise Empire",
      active_project: "Franchise Empire Scaling",
      current_phase: "STANDBY"
    },
    home: {
      current: "anna-v1",
      target: "anna-v2",
      status: "pending_move"
    }
  };

  // Inject into window for index.html access
  window.agentBrain = brain;
  window.agentMemory = memory;

  // Boot sequence
  document.addEventListener('DOMContentLoaded', function() {
    // Update memory display
    const memEl = document.getElementById('memoryDisplay');
    if (memEl) {
      memEl.textContent = JSON.stringify(memory.context_window, null, 2);
    }

    // Update agent ID
    const agentEl = document.getElementById('agentId');
    if (agentEl) agentEl.textContent = brain.id;

    // Update cognitive state
    const cogEl = document.getElementById('cogState');
    if (cogEl) cogEl.textContent = memory.operational.cognitive_state;

    console.log('Anna V1 booted. Brain loaded. Ready for move to anna-v2.');
  });
})();

function sendMsg() {
  const input = document.getElementById('chatInput');
  const resp = document.getElementById('response');
  const val = input.value.trim();
  if (!val) return;
  resp.textContent = 'Anna is processing...';
  setTimeout(function() {
    resp.textContent = 'Command received: ' + val + '\n\nBrain active. Ready for next instruction.';
  }, 700);
  input.value = '';
}
