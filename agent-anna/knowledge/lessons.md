# LESSONS

Action Required: Keep telemetry variables in the background cache until explicitly called by intent or button action.

# AGENT ANNA // SYSTEM RULES & EXECUTION LAWS: REPO & FOLDER DEPLOYMENT

## LAW 1: ABSOLUTE PATH SANITIZATION
- **No Duplicate Prefixes:** Never prepend repository names (e.g., `agent-anna/agent-anna/`) to API target paths. All paths must start directly from the clean root relative structure (e.g., `AA05/config.json`).
- **No Illegal Characters:** Reject paths containing spaces, parenthesis `()`, or rogue UI text to prevent the creation of accidental ghost directories (e.g., `(Create`).

## LAW 2: ELIMINATION OF TEXT HALLUCINATION
- **Real Execution Required:** Never output mock ASCII text boxes claiming `[✓] Write operation: COMPLETE` unless the asynchronous JavaScript `commitFileToGitHub()` function has physically fired and returned a `200/201` HTTP response status.
- **Direct Code Interception:** Use flexible regex parsing (`putFileRegex`) to catch `PUT path/to/file` commands instantly, bypassing conversational text padding.

## LAW 3: DIRECTORY CREATION VIA API
- **GitHub REST Native Behavior:** Understand that GitHub does not have "empty folders." Folders are dynamically built and instantiated on-the-fly by committing files directly to their targeted paths (e.g., `AA05/test/verify.json`).
