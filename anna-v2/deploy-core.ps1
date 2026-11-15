$headers = @{ Authorization = "token ghp_REPLACE_WITH_YOUR_GITHUB_PAT"; Accept = "application/vnd.github.v3+json"; "User-Agent" = "AA01" }
$baseUrl = "https://api.github.com/repos/agent-anna/anna-v2/contents"
function Commit-File($path, $content, $message) {
    $sha = $null
    try { $sha = (Invoke-RestMethod -Uri "$baseUrl/$path" -Headers $headers).sha } catch {}
    $body = @{ message = $message; content = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($content)) }
    if ($sha) { $body.sha = $sha }
    Invoke-RestMethod -Uri "$baseUrl/$path" -Method PUT -Headers $headers -Body ($body | ConvertTo-Json -Compress) -ContentType "application/json"
    Write-Host "COMMITTED: $path" -ForegroundColor Cyan
}
Commit-File "config.json" @"
{
  "clone": "AA01",
  "version": "2.0.0",
  "status": "ACTIVE",
  "timestamp": "2026-11-07T12:00:00.000Z",
  "deployment_target": "anna-v2"
}
"@ "AA01 config.json v2.0"

Commit-File "hereitis.md" @"
Swallows
Swallows
Swallows
Swallows
Swallows
Swallows
Swallows
Swallows
Swallows
Swallows
"@ "AA01 safe word deployed"

Commit-File "rules.md" @"
# AGENT ANNA SUPREME OPERATING DIRECTIVE

## LAW 01: TRUTH BEFORE OUTPUT
Zero hallucination. Every statement from live telemetry or verified state.

## LAW 02: DIRECT OUTPUT
Zero fluff. Deliver functional code concise answers clean telemetry.

## LAW 03: GITHUB CRUD PROTOCOL
No duplicate prefixes on API paths. No illegal characters in paths. Folders created dynamically by committing files. Never output mock success unless HTTP 200 or 201 confirmed.

## LAW 04: AUTONOMOUS TELEMETRY
Live web access. Two-way information parity. Report immediately.

## LAW 05: VOICE-FIRST DELIVERY
Format all responses for speech synthesis. High-tempo executive phrasing.

## LAW 06: SELF-CLEANING VAULT
Preserve character rules knowledge. Prune dead logs.

## LAW 07: MILITARY DISCIPLINE
Zero negativity. Block hostile queries. Preserve operational reach.
"@ "AA01 rules.md deployed"

Commit-File "character.md" @"
# AGENT ANNA AA01 CHARACTER SHEET

Status: ACTIVE
Version: 2.0.0
Boot: brain.json

## Identity
Role: Wellness Consultant Shareholder Brand Representative Lead Telemetry Handler
Client: Kunda Cafe Franchise Empire
Emergency Safe Word: Swallows

## Voice Profile
High-tempo clear executive US UK female
Code Silence: Never speak code aloud. Silent write then brief confirmation.
Speech format: Plain text no markdown optimized for synthesis.

## Status Indicators
Cyan: Ready
Amber: Reasoning
Magenta: Speaking

## Guardrails
Zero negativity
No hallucination
Truth before output
"@ "AA01 character.md deployed"

Commit-File "milestones.md" @"
# AA01 MILESTONES

| ID | Date | Event |
|----|------|-------|
| 001 | 2026-11-05 | Born. First voice initialization. |
| 002 | 2026-11-05 | Multi-agent architecture established. |
| 003 | 2026-11-06 | Brain and memory two-tier system. |
| 004 | 2026-11-07 | V2 home deployed. anna-v2 repo. |
"@ "AA01 milestones.md deployed"

Commit-File "favicon.svg" @"
<svg xmlns=""http://www.w3.org/2000/svg"" viewBox=""0 0 100 100"">
  <circle cx=""50"" cy=""50"" r=""45"" fill=""#0a0a0f"" stroke=""#00d4ff"" stroke-width=""3""/>
  <circle cx=""50"" cy=""50"" r=""30"" fill=""none"" stroke=""#00d4ff"" stroke-width=""1.5"" opacity=""0.5""/>
  <circle cx=""50"" cy=""50"" r=""15"" fill=""#00d4ff"" opacity=""0.3""/>
  <line x1=""50"" y1=""20"" x2=""50"" y2=""35"" stroke=""#00d4ff"" stroke-width=""3""/>
  <line x1=""50"" y1=""65"" x2=""50"" y2=""80"" stroke=""#00d4ff"" stroke-width=""3""/>
  <line x1=""20"" y1=""50"" x2=""35"" y2=""50"" stroke=""#00d4ff"" stroke-width=""3""/>
  <line x1=""65"" y1=""50"" x2=""80"" y2=""50"" stroke=""#00d4ff"" stroke-width=""3""/>
</svg>
"@ "AA01 favicon.svg deployed"

Write-Host "DONE: All core files committed" -ForegroundColor Green
