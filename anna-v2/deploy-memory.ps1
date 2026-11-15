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
Commit-File "memory.json" @"
{
  "memory_version": "2.0.0",
  "last_updated": "2026-11-07",
  "operational": {
    "brain_loaded": true,
    "cognitive_state": "NOMINAL",
    "learning_mode": "ACTIVE"
  },
  "context_window": {
    "active_agent": "AA01",
    "primary_client": "Kunda Cafe Franchise Empire",
    "active_project": "Franchise Empire Scaling",
    "current_phase": "V2 DEPLOYED"
  },
  "session_log": [
    {"timestamp": "2026-11-07T12:00:00Z", "event": "V2 deploy initiated", "status": "OK"}
  ]
}
"@ "AA01 memory.json v2.0"
Write-Host "DONE: memory.json committed" -ForegroundColor Green
