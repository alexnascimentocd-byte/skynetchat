# NVIDIA Chat API Wrapper (Skynetchat)

This repository contains a robust client for invoking NVIDIA's chat API.

- Environment-based configuration (API key and endpoint URL)
- Support for streaming responses (if API supports it)
- Clear error handling and reusable ES module function

-Usage
- Local Testing Guide (Windows and Linux)

Windows
- Set the API key in the PowerShell session or permanently:
  - PowerShell (session): `$Env:NVIDIA_API_KEY = "your_key"`
  - PS script: `powershell -File scripts\run-nvidia-test.ps1 -ApiKey "your_key"`
- Run a basic test using the harnesses:
  - Node-based test: `node test-run.js` (requires `NVIDIA_API_KEY` to be set)
- Test the CLI wrapper:
  - `node run-nvidia-cli.js "Oi"`
- Optional PowerShell automation:
  - `powershell -File scripts/run-nvidia-test.ps1` (reads NVIDIA_API_KEY from environment)
- Optional: verify streaming by calling `invokeNvidiaChat({ prompt: 'Resumo', stream: true })` inside your Node script where needed.

Linux/macOS (PowerShell Core or Bash)
- Export API key for the current shell session:
  - Bash: `export NVIDIA_API_KEY="your_key"`
  - PowerShell Core on Linux: `$Env:NVIDIA_API_KEY = "your_key"`
- Run the basic test:
  - `node test-run.js` (requires `NVIDIA_API_KEY` to be set)
- Test the CLI wrapper:
  - `node run-nvidia-cli.js "Oi"`
- Optional: Windows PS script can still be invoked under PowerShell Core: `pwsh -File scripts/run-nvidia-test.ps1` (reads env var if not given via -ApiKey).

Notes
- If streaming is supported by the API, set `stream: true` to observe incremental chunks.
- The provided scripts are designed for local development; no remote push is required.
- Ensure Node.js (v18+) is installed and the project uses ES modules.
- Set environment variables:
  - NVIDIA_API_KEY=your_api_key
  - NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions (optional)
- Import and call the wrapper:
  - import { invokeNvidiaChat } from './invoke-nvidia-api.js';
  - await invokeNvidiaChat({ prompt: 'Oi' });

CLI/Testing notes
- You can invoke the module programmatically. For quick manual testing, you can run a tiny Node script that imports the module and calls with a sample prompt.

Changelog
- Initial scaffolding and NVIDIA wrapper added.
