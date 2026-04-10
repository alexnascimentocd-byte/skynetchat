// Lightweight chat window logic (local/demo) to keep UI consistent without backend
(() => {
  const STORAGE_KEY = 'sn_chatwindow_conv';
  let conv = null;

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) conv = JSON.parse(saved);
    else {
      conv = { id: 'win-1', title: 'Conversa SKYNETchat', messages: [] };
    }
    renderMessages();
    // Enable send button when typing
    const input = document.getElementById('windowMessageInput');
    const btn = document.getElementById('windowSendBtn');
    if (input) input.addEventListener('input', () => { btn.disabled = input.value.trim().length === 0; });
    if (input) input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendWindowMessage(); }
    });
  }

  function renderMessages() {
    const area = document.getElementById('windowMessagesArea');
    if (!area) return;
    // Clear and render from conv
    area.innerHTML = '';
    conv.messages.forEach(m => {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.justifyContent = m.role === 'user' ? 'flex-end' : 'flex-start';
      wrap.style.margin = '6px 0';
      const bubble = document.createElement('div');
      bubble.style.maxWidth = '75%';
      bubble.style.padding = '12px 14px';
      bubble.style.borderRadius = '14px';
      bubble.style.background = m.role === 'user' ? 'var(--accent)' : 'var(--bg-card)';
      bubble.style.color = m.role === 'user' ? '#0a0a0f' : 'var(--text-primary)';
      bubble.style.boxShadow = 'var(--shadow)';
      bubble.innerText = m.content;
      wrap.appendChild(bubble);
      area.appendChild(wrap);
    });
    area.scrollTop = area.scrollHeight;
  }

  window.sendWindowMessage = async function() {
    const input = document.getElementById('windowMessageInput');
    if (!input) return;
    const content = input.value.trim();
    if (!content) return;
    conv.messages.push({ role: 'user', content });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conv));
    input.value = '';
    renderMessages();
    const typing = document.createElement('div');
    typing.style.display = 'flex';
    typing.style.justifyContent = 'flex-start';
    typing.style.margin = '6px 0';
    typing.innerHTML = `<div class="msg-ai" style="display:flex;gap:14px;"><div class="msg-ai-avatar" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#00CFFF,#7b6fff);"></div><div class="msg-ai-content" style="flex:1;"><div class="typing-indicator" style="display:flex;gap:5px;"><div class='typing-dot' style='width:7px;height:7px;border-radius:50%;background:#00CFFF;'></div><div class='typing-dot' style='width:7px;height:7px;border-radius:50%;background:#00CFFF;opacity:0.6;'></div><div class='typing-dot' style='width:7px;height:7px;border-radius:50%;background:#00CFFF;opacity:0.6;'></div></div></div></div>`;
    const area = document.getElementById('windowMessagesArea');
    area.appendChild(typing);
    area.scrollTop = area.scrollHeight;
    // Simulate AI reply after delay (demo)
    setTimeout(() => {
      const reply = getDemoResponse(content);
      typing.remove();
      conv.messages.push({ role: 'assistant', content: reply });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conv));
      renderMessages();
    }, 800);
  };

  function getDemoResponse(msg) {
    const examples = [
      'Olá! Esta é uma resposta de demonstração.',
      'Ótima pergunta. No modo real, o modelo retornaria uma resposta com base no prompt.',
      'Posso ajudar com código, textos e mais. Configure uma API Key para usar modelos reais.',
      'Resposta de demonstração: encodei sua mensagem e retorno o conteúdo.'
    ];
    return examples[Math.floor(Math.random() * examples.length)];
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', init);
})();
