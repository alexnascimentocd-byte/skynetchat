// ===== STATE =====
let conversations = JSON.parse(localStorage.getItem("sn_convs") || "[]");
let currentConvId = null;
let currentMode = "chat";
let isGenerating = false;

// ===== INIT =====
document.addEventListener("DOMContentLoaded", () => {
  const user = JSON.parse(localStorage.getItem("sn_user") || "null");
  if (!user) { window.location.href = "login.html"; return; }

  const name = user.name || user.email || "Usuário";
  document.getElementById("userName").textContent = name;
  document.getElementById("userAvatar").textContent = name[0].toUpperCase();

  renderConversations();
  newConversation();

  const apiCfg = JSON.parse(localStorage.getItem("sn_apikey") || "null");
  const geminiKey = localStorage.getItem("sn_gemini_key");
  
  // Mostrar banner se não tem config OU se tem proxy local sem key externa
  if (apiCfg && apiCfg.key !== "not-needed") {
    document.getElementById("apiKeyBanner").style.display = "none";
    updateProviderBadge(apiCfg.provider);
  } else if (!geminiKey && apiCfg?.key === "not-needed") {
    // Tem proxy local mas não tem key externa - mostrar banner informativo
    document.getElementById("apiKeyBanner").innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      Para usar de qualquer lugar, configure uma Gemini API Key gratuita.
      <button onclick="openApiKeyModal()">Configurar agora</button>
      <button onclick="this.parentElement.style.display='none'" class="banner-dismiss">×</button>
    `;
  }
});

// ===== CONVERSATION MANAGEMENT =====
function newConversation() {
  const id = Date.now().toString();
  const conv = { id, title: "Nova conversa", messages: [], model: document.getElementById("modelSelector")?.value || "gpt-4o", createdAt: new Date().toISOString() };
  conversations.unshift(conv);
  currentConvId = id;
  saveConversations();
  renderConversations();
  clearChatUI();
}

function getCurrentConv() {
  return conversations.find(c => c.id === currentConvId);
}

function saveConversations() {
  localStorage.setItem("sn_convs", JSON.stringify(conversations));
}

function renderConversations() {
  const list = document.getElementById("convList");
  list.innerHTML = "";
  conversations.slice(0, 30).forEach(conv => {
    const el = document.createElement("div");
    el.className = "conv-item" + (conv.id === currentConvId ? " active" : "");
    el.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>${escapeHtml(conv.title)}`;
    el.onclick = () => loadConversation(conv.id);
    list.appendChild(el);
  });
}

function loadConversation(id) {
  currentConvId = id;
  renderConversations();
  const conv = getCurrentConv();
  clearChatUI(false);
  if (conv.messages.length === 0) {
    document.getElementById("welcomeScreen").style.display = "flex";
  } else {
    document.getElementById("welcomeScreen").style.display = "none";
    conv.messages.forEach(msg => {
      if (msg.role === "user") appendUserMessage(msg.content, false);
      else appendAiMessage(msg.content, false);
    });
  }
  if (conv.model) document.getElementById("modelSelector").value = conv.model;
}

// ===== SEND MESSAGE =====
async function sendMessage() {
  const input = document.getElementById("messageInput");
  const content = input.value.trim();
  if (!content || isGenerating) return;

  const conv = getCurrentConv();
  if (!conv) return;

  // Hide welcome screen
  document.getElementById("welcomeScreen").style.display = "none";

  // Update conversation title
  if (conv.messages.length === 0) {
    conv.title = content.length > 40 ? content.substring(0, 40) + "…" : content;
  }

  // Add user message to state
  conv.messages.push({ role: "user", content });
  conv.model = document.getElementById("modelSelector").value;
  saveConversations();
  renderConversations();

  // Display user message
  appendUserMessage(content);
  input.value = "";
  autoResize(input);
  toggleSendBtn();

  // Show typing
  const typingEl = appendTyping();
  isGenerating = true;

  try {
    let response;
    if (currentMode === "image") {
      response = await generateImage(content);
    } else {
      response = await callAI(conv.messages, conv.model);
    }
    typingEl.remove();
    appendAiMessage(response);
    conv.messages.push({ role: "assistant", content: response });
    saveConversations();
  } catch (err) {
    typingEl.remove();
    const errMsg = `⚠️ **Erro:** ${err.message || "Não foi possível conectar à API."}

Verifique sua API Key nas configurações ou use o modo demo.`;
    appendAiMessage(errMsg);
  }
  isGenerating = false;
}

// ===== GEMINI DIRECT API (browser-compatible, no CORS issues) =====
async function callGeminiDirect(messages, model, apiKey) {
  // Mapear nomes de modelos para IDs do Gemini
  const modelMap = {
    "gemini-2.5-flash-proxy": "gemini-2.5-flash",
    "gemini-2.5-flash-puter": "gemini-2.5-flash",
    "gemini-2.0-flash": "gemini-2.0-flash",
    "gemini-1.5-pro": "gemini-1.5-pro"
  };
  
  const geminiModel = modelMap[model] || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;
  
  // Converter mensagens para formato Gemini
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${res.status}`);
  }
  
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da API.";
}

// ===== AI CALL =====
async function callAI(messages, model) {
  const apiCfg = JSON.parse(localStorage.getItem("sn_apikey") || "null");

  // Se modelo é Gemini proxy e não tem key configurada, tentar API Gemini direta
  if (!apiCfg) {
    // Verificar se tem Gemini key salva separadamente
    const geminiKey = localStorage.getItem("sn_gemini_key");
    if (geminiKey) {
      return await callGeminiDirect(messages, model, geminiKey);
    }
    // Modo demo
    return getDemoResponse(messages[messages.length-1]?.content || "");
  }

  const provider = apiCfg.provider;
  const key = apiCfg.key;

  // Gemini proxy/puter: usar API Gemini direta se key não é "not-needed"
  if ((provider === "gemini-proxy" || provider === "puter-proxy") && key === "not-needed") {
    // Tentar localhost primeiro, se falhar, pedir key
    try {
      const localUrl = provider === "gemini-proxy" ? "http://localhost:8081" : "http://localhost:8082";
      const ep = { url: `${localUrl}/v1/chat/completions`, header: "Bearer not-needed", streaming: true };
      return await callAIStreaming(ep.url, ep.header, model, messages);
    } catch {
      throw new Error("Proxy local não disponível. Para usar de qualquer lugar, configure uma Gemini API Key gratuita em https://aistudio.google.com/apikey");
    }
  }

  // Gemini/puter com key: usar API direta do Google
  if (provider === "gemini-proxy" || provider === "puter-proxy" || provider === "google") {
    return await callGeminiDirect(messages, model, key);
  }

  const endpoints = {
    openai: { url: "https://api.openai.com/v1/chat/completions", header: `Bearer ${key}`, streaming: true },
    anthropic: { url: "https://api.anthropic.com/v1/messages", header: key, streaming: false },
    google: { url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, header: null, streaming: false },
    openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", header: `Bearer ${key}`, streaming: true },
    "gemini-proxy": { url: "http://localhost:8081/v1/chat/completions", header: `Bearer not-needed`, streaming: true },
    "puter-proxy": { url: "http://localhost:8082/v1/chat/completions", header: `Bearer not-needed`, streaming: true },
    "openrouter-free": { url: "https://openrouter.ai/api/v1/chat/completions", header: `Bearer ${key}`, streaming: true }
  };

  const ep = endpoints[provider] || endpoints.openrouter;

  // Build request based on provider
  if (provider === "google") {
    const res = await fetch(ep.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) })
    });
    if (!res.ok) throw new Error(`Google API error: ${res.status}`);
    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  }

  if (provider === "anthropic") {
    const res = await fetch(ep.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: 4096, messages })
    });
    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`);
    const data = await res.json();
    return data.content[0].text;
  }

  // OpenAI / OpenRouter / Gemini proxy — with streaming
  if (ep.streaming) {
    return await callAIStreaming(ep.url, ep.header, model, messages);
  }

  const res = await fetch(ep.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": ep.header },
    body: JSON.stringify({ model, messages, stream: false })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

// ===== STREAMING AI CALL =====
async function callAIStreaming(url, authHeader, model, messages) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": authHeader },
    body: JSON.stringify({ model, messages, stream: true })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let typingEl = null;

  // Find the typing indicator and replace with streaming message
  const area = document.getElementById("messagesArea");
  typingEl = document.querySelector(".typing-indicator")?.closest(".msg-group");

  // Create streaming message element
  const div = document.createElement("div");
  div.className = "msg-group";
  const m = document.getElementById("modelSelector").value;
  div.innerHTML = `
    <div class="msg-ai">
      <div class="msg-ai-avatar">S</div>
      <div class="msg-ai-content">
        <div class="msg-ai-name">SKYNETchat · ${m}</div>
        <div class="msg-ai-text" id="streamingText"></div>
        <div class="msg-ai-actions">
          <button class="msg-action-btn" onclick="copyMsg(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copiar
          </button>
          <button class="msg-action-btn" onclick="regenerate(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Regenerar
          </button>
        </div>
      </div>
    </div>`;

  if (typingEl) typingEl.remove();
  area.appendChild(div);
  scrollToBottom();

  const streamEl = document.getElementById("streamingText");

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullText += delta;
              streamEl.innerHTML = formatMarkdown(fullText);
              scrollToBottom();
            }
          } catch {}
        }
      }
    }
  } catch (e) {
    // Stream ended
  }

  // Remove streaming ID and add final actions
  streamEl.removeAttribute("id");
  return fullText;
}

// ===== IMAGE GENERATION =====
async function generateImage(prompt) {
  const apiCfg = JSON.parse(localStorage.getItem("sn_apikey") || "null");
  if (!apiCfg) return `🎨 **Imagem gerada com IA** (modo demo)

*Prompt:* "${prompt}"

Para gerar imagens reais, configure sua OpenAI API Key.`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiCfg.key}` },
    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" })
  });
  if (!res.ok) throw new Error(`DALL·E API error: ${res.status}`);
  const data = await res.json();
  const url = data.data[0].url;
  return `<img src="${url}" alt="Imagem gerada" style="max-width:100%;border-radius:12px;"/>`;
}

// ===== DEMO RESPONSES =====
function getDemoResponse(msg) {
  const responses = [
    "Olá! Estou no modo demo. Configure uma API Key para usar os modelos reais. Posso te ajudar com perguntas, textos, código e muito mais!",
    "Que ótima pergunta! Em modo demo, minhas respostas são simuladas. Com uma API Key configurada, você terá acesso a GPT-4o, Claude 3.5, Gemini e outros modelos poderosos.",
    "Entendido! Para respostas reais e precisas, vá em **Configurar API Key** no banner acima. Você pode usar a OpenAI, Anthropic, Google ou OpenRouter.",
    "Posso te ajudar com textos, código, análises e muito mais — basta configurar sua API Key. No momento estou em modo demonstração.",
    "Interessante! Vou simular uma resposta aqui. Com a API configurada, você teria uma resposta detalhada e precisa do modelo escolhido."
  ];
  return responses[Math.floor(Math.random() * responses.length)];
}

// ===== UI HELPERS =====
function clearChatUI(showWelcome = true) {
  const area = document.getElementById("messagesArea");
  area.innerHTML = "";
  if (showWelcome) {
    const welcome = `<div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-logo"><svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <circle cx="28" cy="28" r="28" fill="rgba(0,207,255,0.08)"/>
        <path d="M14 28 L28 14 L42 28 L28 42 Z" stroke="#00CFFF" stroke-width="2.5" fill="none"/>
        <circle cx="28" cy="28" r="6" fill="#00CFFF" opacity="0.8"/>
      </svg></div>
      <h2>Olá! Como posso ajudar?</h2>
      <p>Escolha uma sugestão abaixo ou escreva sua pergunta</p>
      <div class="suggestions-grid">
        <button class="suggestion-card" onclick="useSuggestion(this)"><span class="suggestion-icon">✍️</span><span>Me ajude a escrever um e-mail profissional</span></button>
        <button class="suggestion-card" onclick="useSuggestion(this)"><span class="suggestion-icon">💡</span><span>Explique como funciona a inteligência artificial</span></button>
        <button class="suggestion-card" onclick="useSuggestion(this)"><span class="suggestion-icon">💻</span><span>Crie um script Python para organizar arquivos</span></button>
        <button class="suggestion-card" onclick="useSuggestion(this)"><span class="suggestion-icon">🌐</span><span>Traduza este texto para o inglês</span></button>
      </div></div>`;
    area.innerHTML = welcome;
  }
}

function appendUserMessage(content, scroll = true) {
  const area = document.getElementById("messagesArea");
  const div = document.createElement("div");
  div.className = "msg-group";
  div.innerHTML = `<div class="msg-user"><div class="msg-user-bubble">${escapeHtml(content)}</div></div>`;
  area.appendChild(div);
  if (scroll) scrollToBottom();
}

function appendAiMessage(content, scroll = true) {
  const area = document.getElementById("messagesArea");
  const div = document.createElement("div");
  div.className = "msg-group";
  const model = document.getElementById("modelSelector").value;
  const formatted = formatMarkdown(content);
  div.innerHTML = `
    <div class="msg-ai">
      <div class="msg-ai-avatar">S</div>
      <div class="msg-ai-content">
        <div class="msg-ai-name">SKYNETchat · ${model}</div>
        <div class="msg-ai-text">${formatted}</div>
        <div class="msg-ai-actions">
          <button class="msg-action-btn" onclick="copyMsg(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Copiar
          </button>
          <button class="msg-action-btn" onclick="regenerate(this)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>
            Regenerar
          </button>
        </div>
      </div>
    </div>`;
  area.appendChild(div);
  if (scroll) scrollToBottom();
}

function appendTyping() {
  const area = document.getElementById("messagesArea");
  const div = document.createElement("div");
  div.className = "msg-group";
  div.innerHTML = `
    <div class="msg-ai">
      <div class="msg-ai-avatar">S</div>
      <div class="msg-ai-content">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>`;
  area.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  const area = document.getElementById("messagesArea");
  area.scrollTop = area.scrollHeight;
}

// ===== MARKDOWN FORMATTER =====
function formatMarkdown(text) {
  // Check if it's HTML (image)
  if (text.startsWith("<img")) return text;
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // restore img tags after escape
    .replace(/&lt;img ([^&]*)&gt;/g, (_, attrs) => `<img ${attrs.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')} style="max-width:100%;border-radius:12px;"/>`)
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/```([\w]*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>")
    .replace(/^# (.+)$/gm, "<h3 style='font-size:18px;margin:16px 0 8px;'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h4 style='font-size:16px;margin:12px 0 6px;'>$1</h4>")
    .replace(/^### (.+)$/gm, "<h5 style='font-size:14px;margin:10px 0 4px;'>$1</h5>")
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^(.+)$/, "<p>$1</p>");
}

// ===== OTHER HELPERS =====
function handleInputKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 200) + "px";
}

function toggleSendBtn() {
  // Removed blocking: keep send button enabled for local usage
  const btn = document.getElementById("sendBtn");
  if (btn) btn.disabled = false;
}

function useSuggestion(btn) {
  const text = btn.querySelector("span:last-child").textContent;
  document.getElementById("messageInput").value = text;
  autoResize(document.getElementById("messageInput"));
  toggleSendBtn();
  sendMessage();
}

function clearChat() {
  const conv = getCurrentConv();
  if (conv) { conv.messages = []; conv.title = "Nova conversa"; saveConversations(); renderConversations(); }
  clearChatUI(true);
}

function setMode(mode) {
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  const imgBar = document.getElementById("imageModeBar");
  imgBar.style.display = mode === "image" ? "flex" : "none";
  const placeholder = mode === "image" ? "Descreva a imagem que deseja criar..." : "Mensagem para SKYNETchat...";
  document.getElementById("messageInput").placeholder = placeholder;
}

function onModelChange() {
  const conv = getCurrentConv();
  const model = document.getElementById("modelSelector").value;
  if (conv) { conv.model = model; saveConversations(); }
  
  // Auto-set provider based on model selection
  const apiCfg = JSON.parse(localStorage.getItem("sn_apikey") || "null");
  const modelProviderMap = {
    "gemini-2.5-flash-proxy": "gemini-proxy",
    "gemini-2.5-flash-puter": "puter-proxy",
    "google/gemma-3-1b-it:free": "openrouter-free",
    "meta-llama/llama-3.3-8b-instruct:free": "openrouter-free"
  };
  if (modelProviderMap[model]) {
    const newProvider = modelProviderMap[model];
    if (!apiCfg || apiCfg.provider !== newProvider) {
      localStorage.setItem("sn_apikey", JSON.stringify({ provider: newProvider, key: "not-needed" }));
      document.getElementById("apiKeyBanner").style.display = "none";
      updateProviderBadge(newProvider);
    }
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  const isOpen = sidebar.classList.contains("open");
  
  if (isOpen) {
    sidebar.classList.remove("open");
    if (overlay) overlay.classList.remove("active");
  } else {
    sidebar.classList.add("open");
    if (overlay) overlay.classList.add("active");
  }
}

function toggleUserMenu() {
  const menu = document.getElementById("userDropdown");
  menu.style.display = menu.style.display === "none" ? "block" : "none";
}

function logout() {
  localStorage.removeItem("sn_user");
  window.location.href = "../index.html";
}

function openApiKeyModal() {
  document.getElementById("apiKeyModal").style.display = "flex";
}

function closeApiKeyModal(e) {
  if (e.target === document.getElementById("apiKeyModal")) {
    document.getElementById("apiKeyModal").style.display = "none";
  }
}

function saveApiKey() {
  const provider = document.getElementById("apiProvider").value;
  const freeProviders = ["gemini-proxy", "puter-proxy"];
  
  let key = document.getElementById("apiKeyInput").value.trim();
  
  // Para provedores pagos, key é obrigatória
  if (!freeProviders.includes(provider) && !key) return alert("Insira a API Key");
  
  // Para Gemini proxy: salvar key separadamente se fornecida
  if (freeProviders.includes(provider)) {
    if (key) {
      localStorage.setItem("sn_gemini_key", key);
    }
    key = key || "not-needed";
  }
  
  localStorage.setItem("sn_apikey", JSON.stringify({ provider, key }));
  document.getElementById("apiKeyModal").style.display = "none";
  document.getElementById("apiKeyBanner").style.display = "none";
  
  const msg = key === "not-needed" 
    ? "Configurado! (tentando proxy local)" 
    : "API Key salva com sucesso!";
  alert(msg);
  updateProviderBadge(provider);
}

function updateProviderBadge(provider) {
  const badge = document.getElementById("providerBadge");
  if (!badge) return;
  const names = {
    "gemini-proxy": "🟢 Gemini Local",
    "puter-proxy": "🟢 Puter Proxy", 
    "openrouter-free": "🟡 OpenRouter Free",
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    openrouter: "OpenRouter"
  };
  badge.textContent = names[provider] || provider;
  badge.style.display = "inline-block";
}

function onProviderChange() {
  const provider = document.getElementById("apiProvider").value;
  const freeProviders = ["gemini-proxy", "puter-proxy"];
  const keyGroup = document.getElementById("apiKeyGroup");
  const keyLabel = document.querySelector("#apiKeyGroup .form-label");
  const keyInput = document.getElementById("apiKeyInput");
  
  if (keyGroup) {
    // Sempre mostrar campo de key (para acesso externo via GitHub Pages)
    keyGroup.style.display = "block";
    
    if (freeProviders.includes(provider)) {
      if (keyLabel) keyLabel.textContent = "Gemini API Key (opcional para acesso externo)";
      if (keyInput) keyInput.placeholder = "Cole sua key do aistudio.google.com/apikey";
    } else {
      if (keyLabel) keyLabel.textContent = "API Key";
      if (keyInput) keyInput.placeholder = "sk-...";
    }
  }
}

function togglePass(id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

function copyMsg(btn) {
  const text = btn.closest(".msg-ai-content").querySelector(".msg-ai-text").innerText;
  navigator.clipboard.writeText(text).then(() => {
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copiado!`;
    setTimeout(() => btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar`, 2000);
  });
}

function regenerate(btn) {
  const conv = getCurrentConv();
  if (!conv || conv.messages.length < 2) return;
  // Remove last assistant message
  if (conv.messages[conv.messages.length-1].role === "assistant") {
    conv.messages.pop();
    const groups = document.querySelectorAll(".msg-group");
    groups[groups.length-1].remove();
  }
  saveConversations();
  const lastMsg = conv.messages[conv.messages.length-1];
  if (lastMsg && lastMsg.role === "user") {
    const typingEl = appendTyping();
    isGenerating = true;
    callAI(conv.messages, conv.model || "gpt-4o").then(response => {
      typingEl.remove();
      appendAiMessage(response);
      conv.messages.push({ role: "assistant", content: response });
      saveConversations();
    }).catch(err => {
      typingEl.remove();
      appendAiMessage(`⚠️ Erro: ${err.message}`);
    }).finally(() => { isGenerating = false; });
  }
}

function escapeHtml(text) {
  return text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// Close dropdown on outside click
document.addEventListener("click", (e) => {
  if (!e.target.closest(".user-section")) {
    const d = document.getElementById("userDropdown");
    if (d) d.style.display = "none";
  }
});
