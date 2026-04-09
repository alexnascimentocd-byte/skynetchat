import { invokeNvidiaChat } from './invoke-nvidia-api.js';
(async () => {
  if (!process.env.NVIDIA_API_KEY) {
    console.error("NVIDIA_API_KEY is not defined. Set it and rerun.");
    process.exit(1);
  }
  try {
    await invokeNvidiaChat({ prompt: 'Oi' });
  } catch (e) {
    console.error('Error during NVIDIA API call:', e?.message ?? e);
  }
})();
