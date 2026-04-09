# NVIDIA Chat API Wrapper (Skynetchat)

This repository contains a robust client for invoking NVIDIA's chat API.

- Environment-based configuration (API key and endpoint URL)
- Support for streaming responses (if API supports it)
- Clear error handling and reusable ES module function

Usage
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
