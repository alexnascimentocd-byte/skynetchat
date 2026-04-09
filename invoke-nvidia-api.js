import axios from 'axios';

// Endpoint to call NVIDIA's chat completion API
const invokeUrl = process.env.NVIDIA_API_URL || "https://integrate.api.nvidia.com/v1/chat/completions";

/**
 * Invoke NVIDIA chat API
 * @param {Object} options
 * @param {string} options.prompt - User message content
 * @param {string} [options.model] - Model ID to use
 * @param {number} [options.max_tokens] - Maximum tokens for the response
 * @param {number} [options.temperature] - Sampling temperature
 * @param {number} [options.top_p] - Nucleus sampling parameter
 * @param {boolean} [options.stream] - If true, stream response
 * @param {boolean} [options.enableThinking] - Enable thinking template flag
 */
export async function invokeNvidiaChat(options = {}) {
  const {
    prompt = "",
    model = "google/gemma-4-31b-it",
    max_tokens = 16384,
    temperature = 1.0,
    top_p = 0.95,
    stream = false,
    enableThinking = true
  } = options;

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY environment variable is not set");
  }

  const payload = {
    model,
    messages: [{ role: "user", content: prompt }],
    max_tokens,
    temperature,
    top_p,
    stream,
    chat_template_kwargs: { enable_thinking: enableThinking }
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: stream ? "text/event-stream" : "application/json"
  };

  const responseType = stream ? 'stream' : 'json';

  try {
    const response = await axios.post(invokeUrl, payload, {
      headers,
      responseType,
      timeout: 60000 // 60s timeout
    });

    if (stream) {
      response.data.on('data', (chunk) => {
        process.stdout.write(chunk.toString());
      });
      response.data.on('error', (err) => {
        process.stderr.write(`Stream error: ${err.message}\n`);
      });
    } else {
      console.log(JSON.stringify(response.data));
    }
  } catch (error) {
    if (error.response) {
      console.error(`API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('No response received from NVIDIA API.');
    } else {
      console.error(`Error: ${error.message}`);
    }
    throw error;
  }
}
