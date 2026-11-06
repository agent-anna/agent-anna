# ============================================================
# AGENT ANNA // MASTER ARCHITECTURE MANIFEST
# Version: 2.0 // Single Source of Truth
# ============================================================

version: "2.0"
repository: "agent-anna"
owner: "agent anna & strayd"

config:
  locale: "en-US"
  voice_engine: "speechSynthesis"
  telemetry_refresh: 30000

structure:
  directories:
    - "character"
    - "knowledge"
    - "plans/active"
    - "plans/archive"
    - "plans/logs"
    - ".github/workflows"

  files:
    - path: "character/agent-anna.md"
      content: "# AGENT ANNA // CORE DIRECTIVE\nStatus: Autonomous Matrix Active."
    - path: "knowledge/agents.md"
      content: "# KNOWLEDGE // AGENTS\n- AA01: Lead Telemetry & Orchestration"
    - path: "knowledge/lessons.md"
      content: "# KNOWLEDGE // LESSONS\n- Zero bloat, military precision."
    - path: "knowledge/rules.md"
      content: "# KNOWLEDGE // RULES\n1. Maintain state continuity.\n2. Execute autonomous commits."
    - path: "plans/active/current-plan.md"
      content: "# ACTIVE PLAN\n- Phase 1: Core automated build layout locked."
    - path: "plans/active/roadmap.md"
      content: "# ROADMAP\n- Autonomous multi-session memory sync."
    - path: "plans/logs/session-log.md"
      content: "# SESSION LOG\n[INIT]: Architecture initialized."
    - path: "portal-relay.json"
      content: '{"status":"SYNCHRONIZED","bitcoin_price":"$98,450.00","dogecoin_price":"$0.1850","shi_drc20":"0.000001 DOGE ($0.00000076)"}'
