/**
 * app.js — Frontend Application Controller
 * Orchestrates navigation, all modules, and UI interactions
 */

const App = (() => {

  let currentPage = 'home';
  let currentLang = 'en';
  let sidebarOpen = false;
  let currentListenExercise = null;
  let currentListenType = 'fill-blank';
  let currentReadArticle = null;
  let currentFlashcardIndex = 0;
  let dueCards = [];
  let isFlashcardFlipped = false;
  let isListening = false;
  let audioProgressInterval = null;
  let tutorHistory = [];
  let tutorRequestInFlight = false;

  // ── INIT ─────────────────────────────────────────
  function init() {
    Progress.load();
    initParticles();
    initNavigation();
    initLanguageSwitcher();
    initProfessorChat();
    initSpeaking();
    initListening();
    initReading();
    initWriting();
    initDictionary();
    initFlashcard();
    initMobileMenu();
    initFloatingElements();
    Translator.init();


    // Load initial page
    navigateTo('home');
    Progress.updateUI();
    Dictionary.renderDailyWord();

    // Load voices for TTS (Chrome needs this)
    window.speechSynthesis?.getVoices();
    setTimeout(() => window.speechSynthesis?.getVoices(), 500);
  }

  // ── PARTICLES ────────────────────────────────────
  function initParticles() {
    const container = document.getElementById('particles-bg');
    if (!container) return;
    const colors = ['rgba(124,58,237,0.5)', 'rgba(14,165,233,0.4)', 'rgba(16,185,129,0.3)'];
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      const size = Math.random() * 4 + 2;
      particle.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        bottom: -10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-duration: ${Math.random() * 15 + 10}s;
        animation-delay: ${Math.random() * 10}s;
      `;
      container.appendChild(particle);
    }
  }

  // ── NAVIGATION ───────────────────────────────────
  function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        if (page) navigateTo(page);
        if (window.innerWidth < 900) closeSidebar();
      });
    });

    // Quick action cards
    document.querySelectorAll('.quick-card[data-page], .fc-empty button[data-page]').forEach(card => {
      card.addEventListener('click', () => navigateTo(card.dataset.page));
    });
  }

  function navigateTo(page) {
    // Deactivate all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    // Activate target
    const pageEl = document.getElementById('page-' + page);
    const navEl = document.getElementById('nav-' + page);
    if (pageEl) pageEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    currentPage = page;

    // Page-specific init
    if (page === 'progress') Progress.updateProgressPage();
    if (page === 'flashcard') loadFlashcards();
    if (page === 'home') Dictionary.renderDailyWord();
  }

  // ── LANGUAGE SWITCHER ────────────────────────────
  function initLanguageSwitcher() {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        Progress.currentLang = currentLang;
        AITutor.currentLang = currentLang;

        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update mobile toggle
        const mobileFlag = document.getElementById('mobile-lang-toggle');
        if (mobileFlag) {
          mobileFlag.innerHTML = `<img src="https://flagcdn.com/${currentLang === 'zh' ? 'cn' : 'gb'}.svg" alt="Lang" class="flag-icon-sm" />`;
        }

        // Update dictionary toggle
        updateDictLangUI(currentLang);

        showToast(`Đã chuyển sang ${currentLang === 'zh' ? 'Tiếng Trung 🇨🇳' : 'Tiếng Anh 🇬🇧'}`, 'info', 'fa-language');
      });
    });

    // Mobile lang toggle
    document.getElementById('mobile-lang-toggle')?.addEventListener('click', () => {
      const otherLang = currentLang === 'en' ? 'zh' : 'en';
      document.querySelector(`.lang-btn[data-lang="${otherLang}"]`)?.click();
    });
  }

  // ── PROFESSOR CHAT ────────────────────────────────
  function initProfessorChat() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const voiceBtn = document.getElementById('chat-voice-btn');

    // Auto-resize textarea
    input?.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Send on Enter (not Shift+Enter)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    sendBtn?.addEventListener('click', sendMessage);

    // Voice input for chat
    voiceBtn?.addEventListener('click', () => {
      Speech.startRecording(currentLang, (text) => {
        if (input) input.value = text;
        sendMessage();
      }, null, voiceBtn);
    });

    // Quick prompts
    document.querySelectorAll('.qp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (input) input.value = btn.dataset.prompt;
        sendMessage();
      });
    });
  }

  async function requestTutorReply(message) {
    const response = await fetch('/api/tutor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: tutorHistory,
        language: currentLang
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || typeof data.reply !== 'string') {
      throw new Error(data.error || `AI request failed: HTTP ${response.status}`);
    }
    return data.reply;
  }

  async function sendMessage() {
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');
    const sendBtn = document.getElementById('chat-send-btn');
    if (!input || !messages || tutorRequestInFlight) return;

    const text = input.value.trim();
    if (!text) return;

    tutorRequestInFlight = true;
    if (sendBtn) sendBtn.disabled = true;
    input.value = '';
    input.style.height = 'auto';

    // Add user message
    const grammarToggle = document.getElementById('grammar-toggle');
    const doGrammar = grammarToggle?.checked;

    appendMessage(text, 'user', doGrammar);

    // Show typing
    const typingId = 'typing-' + Date.now();
    appendTyping(typingId);

    // Update avatar
    const avatarStatus = document.getElementById('avatar-status-text');
    const statusDot = document.getElementById('status-dot');
    if (avatarStatus) avatarStatus.textContent = 'Đang suy nghĩ...';
    if (statusDot) { statusDot.classList.remove('online'); statusDot.classList.add('thinking'); }

    try {
      const reply = await requestTutorReply(text);
      tutorHistory.push(
        { role: 'user', text },
        { role: 'assistant', text: reply }
      );
      tutorHistory = tutorHistory.slice(-20);

      removeTyping(typingId);
      appendMessage(reply, 'assistant', false, true);
      Progress.recordActivity(10, 'speaking');

      // Auto-speak response if short
      if (reply.length < 300 && window.speechSynthesis) {
        const plainText = reply.replace(/[#*`>\-]/g, '').replace(/\[.*?\]/g, '').trim();
        if (plainText.length < 150) Speech.speak(plainText, currentLang);
      }
    } catch (error) {
      console.warn('Gemini unavailable, using local tutor:', error);
      removeTyping(typingId);
      const fallback = AITutor.generateResponse(text, currentLang);
      appendMessage(fallback.text, 'assistant', false, true);
      Progress.recordActivity(fallback.xp || 5, 'speaking');
      showToast('Gemini tạm thời không khả dụng — đang dùng trợ giảng cục bộ.', 'info', 'fa-triangle-exclamation');
    } finally {
      tutorRequestInFlight = false;
      if (sendBtn) sendBtn.disabled = false;
      if (avatarStatus) avatarStatus.textContent = 'Sẵn sàng';
      if (statusDot) {
        statusDot.classList.remove('thinking');
        statusDot.classList.add('online');
      }
    }
  }

  function appendMessage(text, role, checkGrammar = false, isMarkdown = false) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;

    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const isUser = role === 'user';

    let content = isMarkdown ? AITutor.renderMarkdown(text) : escapeHtml(text);

    let grammarHtml = '';
    if (checkGrammar && isUser) {
      const result = AITutor.checkGrammar(text, currentLang);
      if (!result.isCorrect && result.errors.length > 0) {
        const fixes = result.errors.slice(0, 3).map(e =>
          `<div>❌ <strong>${e.type}</strong>: "${e.original}" → ✅ <em>${e.correction || '?'}</em></div>`
        ).join('');
        grammarHtml = `<div class="grammar-correction"><div class="corr-label">Gợi ý ngữ pháp</div>${fixes}</div>`;
      }
    }

    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user-msg' : 'assistant-msg'}`;
    div.innerHTML = `
      <div class="msg-avatar">
        ${isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>'}
      </div>
      <div class="msg-bubble">
        ${content}
        ${grammarHtml}
        <span class="msg-time">${time}</span>
        ${!isUser ? `<div class="message-actions">
          <button class="message-speak-button" aria-label="Đọc câu trả lời" onclick="Speech.speak(this.closest('.msg-bubble').textContent, '${currentLang}')"><i class="fas fa-volume-high"></i></button>
        </div>` : ''}
      </div>
    `;

    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function appendTyping(id) {
    const messages = document.getElementById('chat-messages');
    if (!messages) return;
    const div = document.createElement('div');
    div.className = 'message assistant-msg typing-indicator';
    div.id = id;
    div.innerHTML = `
      <div class="msg-avatar"><i class="fas fa-robot"></i></div>
      <div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping(id) {
    document.getElementById(id)?.remove();
  }

  // ── SPEAKING MODULE ───────────────────────────────
  function initSpeaking() {
    const newPhraseBtn = document.getElementById('new-phrase-btn');
    const listenModelBtn = document.getElementById('listen-model-btn');
    const startRecordBtn = document.getElementById('start-record-btn');
    const playBackBtn = document.getElementById('play-back-btn');
    const levelSelect = document.getElementById('speak-level');
    const topicSelect = document.getElementById('speak-topic');

    let lastSpokenText = '';

    newPhraseBtn?.addEventListener('click', () => {
      const lang = currentLang;
      const level = levelSelect?.value || 'B1';
      const topic = topicSelect?.value || 'daily';
      Exercises.loadNewPhrase(lang, topic, level);
      document.getElementById('score-panel').style.display = 'none';
      document.getElementById('play-back-btn').disabled = true;
    });

    listenModelBtn?.addEventListener('click', () => {
      const phrase = document.getElementById('speak-phrase-main')?.textContent;
      if (phrase && phrase !== 'Nhấn "Câu mới" để bắt đầu luyện tập') {
        Speech.speakSlow(phrase, currentLang);
        showToast('Đang phát mẫu phát âm chuẩn...', 'info', 'fa-volume-high');
      } else {
        showToast('Hãy nhấn "Câu mới" trước!', 'info', 'fa-info-circle');
      }
    });

    startRecordBtn?.addEventListener('click', () => {
      const phrase = document.getElementById('speak-phrase-main')?.textContent;
      if (!phrase || phrase === 'Nhấn "Câu mới" để bắt đầu luyện tập') {
        showToast('Hãy chọn câu mới trước!', 'info', 'fa-info-circle');
        return;
      }

      Speech.startRecording(
        currentLang,
        (spokenText) => {
          lastSpokenText = spokenText;
          const score = Speech.scorePronunciation(spokenText, phrase, currentLang);
          showSpeakingScore(score, spokenText, phrase);
          playBackBtn.disabled = false;
          Progress.recordAccuracy(score);
          Progress.recordActivity(10 + Math.floor(score / 10), 'speaking');
        },
        null,
        startRecordBtn
      );
    });

    playBackBtn?.addEventListener('click', () => {
      if (lastSpokenText) Speech.speak(lastSpokenText, currentLang, 0.9);
    });
  }

  function showSpeakingScore(score, spoken, target) {
    const panel = document.getElementById('score-panel');
    const numberEl = document.getElementById('score-number');
    const circleEl = document.getElementById('score-circle-fill');
    const feedbackEl = document.getElementById('score-feedback');

    panel.style.display = 'flex';

    // Animate score
    let current = 0;
    const interval = setInterval(() => {
      current += 2;
      if (current >= score) { current = score; clearInterval(interval); }
      if (numberEl) numberEl.textContent = current;
      // SVG circle
      const circumference = 283;
      const offset = circumference - (current / 100) * circumference;
      if (circleEl) circleEl.style.strokeDashoffset = offset;

      // Color
      const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
      if (circleEl) circleEl.style.stroke = color;
      if (numberEl) numberEl.style.color = color;
    }, 20);

    // Sub-scores
    const pronunciation = Math.min(100, score + Math.floor(Math.random() * 10 - 5));
    const rhythm = Math.min(100, score + Math.floor(Math.random() * 15 - 7));
    const fluency = Math.min(100, score + Math.floor(Math.random() * 12 - 6));

    setTimeout(() => {
      document.getElementById('score-pronunciation').style.width = pronunciation + '%';
      document.getElementById('score-rhythm').style.width = rhythm + '%';
      document.getElementById('score-fluency').style.width = fluency + '%';
    }, 500);

    // Feedback
    let msg = '';
    if (score >= 90) msg = '🎉 Tuyệt vời! Phát âm chuẩn Oxford/Cambridge!';
    else if (score >= 75) msg = '👏 Rất tốt! Một vài âm cần luyện thêm.';
    else if (score >= 55) msg = '📈 Khá tốt! Hãy nghe mẫu lại và thử lần nữa.';
    else msg = `💪 Tiếp tục cố gắng! Bạn đã nói: "${spoken.substring(0, 50)}..."`;

    if (feedbackEl) feedbackEl.textContent = msg;
  }

  // ── LISTENING MODULE ──────────────────────────────
  function initListening() {
    const playBtn = document.getElementById('listen-play-btn');
    const newBtn = document.getElementById('listen-new-btn');
    const checkBtn = document.getElementById('listen-check-btn');
    const hintBtn = document.getElementById('listen-hint-btn');
    const speedSelect = document.getElementById('listen-speed-select');

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        currentListenType = tab.dataset.tab;
        currentListenExercise = null;
        document.getElementById('listen-content-area').innerHTML = `
          <div class="listen-placeholder"><i class="fas fa-headphones-simple"></i><p>Nhấn <strong>Bài mới</strong> để bắt đầu</p></div>
        `;
        document.getElementById('listen-actions').style.display = 'none';
        document.getElementById('audio-progress-fill').style.width = '0%';
      });
    });

    newBtn?.addEventListener('click', () => loadListeningExercise());
    playBtn?.addEventListener('click', playListenAudio);

    checkBtn?.addEventListener('click', checkListeningAnswer);

    hintBtn?.addEventListener('click', () => {
      if (!currentListenExercise) return;
      showToast('Gợi ý: Hãy nghe lại chậm hơn bằng cách giảm tốc độ!', 'info', 'fa-lightbulb');
      playListenAudio(0.7);
    });
  }

  function loadListeningExercise() {
    const lang = currentLang;
    const type = currentListenType.replace('-', '') === 'fillblank' ? 'fillBlank' : currentListenType === 'dictation' ? 'dictation' : 'mcq';

    currentListenExercise = Exercises.loadListeningExercise(
      currentListenType === 'fill-blank' ? 'fillBlank' : currentListenType,
      lang
    );

    if (!currentListenExercise) {
      showToast('Không có bài tập cho ngôn ngữ này!', 'error', 'fa-exclamation-circle');
      return;
    }

    renderListeningExercise(currentListenExercise, currentListenType);
    document.getElementById('listen-actions').style.display = 'flex';
    document.getElementById('audio-progress-fill').style.width = '0%';
  }

  function renderListeningExercise(exercise, type) {
    const area = document.getElementById('listen-content-area');

    if (type === 'fill-blank') {
      let html = exercise.template;
      exercise.blanks.forEach(blank => {
        html = html.replace(`{${blank}}`, `<input type="text" class="fill-blank-input" data-answer="${blank}" placeholder="___" aria-label="Fill in: ${blank}" />`);
      });
      area.innerHTML = `
        <div style="margin-bottom:12px;font-size:12px;color:var(--text-muted)">Nghe và điền vào chỗ trống:</div>
        <div class="fill-blank-sentence">${html}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px"><em>Nghe audio rồi điền từ còn thiếu</em></div>
      `;
    } else if (type === 'dictation') {
      area.innerHTML = `
        <div style="margin-bottom:12px;font-size:12px;color:var(--text-muted)">Nghe và viết lại những gì bạn nghe được:</div>
        <textarea class="dictation-area" id="dictation-input" placeholder="Gõ những gì bạn nghe được..." rows="4"></textarea>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px">Bạn có thể nghe nhiều lần</div>
      `;
    } else if (type === 'mcq') {
      const opts = exercise.options.map((opt, i) =>
        `<button class="mcq-option" data-index="${i}" data-correct="${i === exercise.correct}">
          <span class="mcq-letter">${String.fromCharCode(65 + i)}</span>
          ${opt}
        </button>`
      ).join('');
      area.innerHTML = `
        <div style="margin-bottom:16px;font-size:12px;color:var(--text-muted)">Nghe audio và chọn đáp án đúng:</div>
        <p style="font-size:15px;font-weight:600;margin-bottom:16px">${exercise.question}</p>
        <div id="mcq-options">${opts}</div>
      `;
      // MCQ click handlers
      area.querySelectorAll('.mcq-option').forEach(btn => {
        btn.addEventListener('click', () => {
          area.querySelectorAll('.mcq-option').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
      });
    }
  }

  function playListenAudio(speed = null) {
    if (!currentListenExercise) {
      showToast('Hãy tải bài tập trước!', 'info', 'fa-info-circle');
      return;
    }

    const spd = speed || parseFloat(document.getElementById('listen-speed-select')?.value || 1);
    const text = currentListenExercise.audio || currentListenExercise.text;

    Speech.speak(text, currentLang, spd);
    showToast('Đang phát audio...', 'info', 'fa-headphones');

    // Animate progress bar
    const duration = (text.split(' ').length / (spd * 2.5)) * 1000;
    const fillEl = document.getElementById('audio-progress-fill');
    if (fillEl) {
      fillEl.style.width = '0%';
      const start = Date.now();
      const interval = setInterval(() => {
        const pct = Math.min(((Date.now() - start) / duration) * 100, 100);
        fillEl.style.width = pct + '%';
        if (pct >= 100) clearInterval(interval);
      }, 50);
    }
  }

  function checkListeningAnswer() {
    if (!currentListenExercise) return;

    let correct = 0, total = 0;

    if (currentListenType === 'fill-blank') {
      const inputs = document.querySelectorAll('.fill-blank-input');
      inputs.forEach(input => {
        total++;
        const answer = input.value.trim().toLowerCase();
        const expected = input.dataset.answer.toLowerCase();
        if (answer === expected || levenshteinSim(answer, expected) > 0.8) {
          input.classList.add('correct');
          input.value = input.dataset.answer;
          correct++;
        } else {
          input.classList.add('wrong');
          setTimeout(() => {
            input.value = input.dataset.answer;
            input.classList.remove('wrong');
            input.classList.add('correct');
          }, 2000);
        }
      });
    } else if (currentListenType === 'dictation') {
      const input = document.getElementById('dictation-input');
      const userText = input?.value.trim() || '';
      const expected = currentListenExercise.text;
      const score = levenshteinSim(userText.toLowerCase(), expected.toLowerCase());
      correct = Math.round(score * 100);
      total = 100;

      // Show comparison
      const area = document.getElementById('listen-content-area');
      area.innerHTML += `
        <div class="result-comparison">
          <div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--text-muted)">Đáp án đúng:</div>
          <div style="color:var(--accent-green);margin-bottom:8px">${expected}</div>
          <div style="font-size:12px;font-weight:600;margin-bottom:4px;color:var(--text-muted)">Của bạn:</div>
          <div>${userText}</div>
          <div style="margin-top:8px;font-weight:700">Độ chính xác: ${correct}%</div>
        </div>
      `;
    } else if (currentListenType === 'mcq') {
      const selected = document.querySelector('.mcq-option.selected');
      if (!selected) { showToast('Hãy chọn một đáp án!', 'info', 'fa-hand-pointer'); return; }

      total = 1;
      const isCorrect = selected.dataset.correct === 'true';
      document.querySelectorAll('.mcq-option').forEach(btn => {
        if (btn.dataset.correct === 'true') btn.classList.add('correct');
        else if (btn.classList.contains('selected') && !isCorrect) btn.classList.add('wrong');
      });
      if (isCorrect) { correct = 1; }

      // Show explanation
      const area = document.getElementById('listen-content-area');
      area.innerHTML += `
        <div class="grammar-correction" style="margin-top:16px">
          <div class="corr-label">${isCorrect ? '✅ Đúng!' : '❌ Sai!'}</div>
          <div>${currentListenExercise.explanation || ''}</div>
        </div>
      `;
    }

    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const msg = pct >= 80 ? '🎉 Xuất sắc!' : pct >= 60 ? '👍 Tốt!' : '💪 Tiếp tục cố gắng!';
    showToast(`${msg} Độ chính xác: ${pct}%`, pct >= 60 ? 'success' : 'info', 'fa-check-circle');

    Progress.recordAccuracy(pct);
    Progress.recordActivity(10, 'listening');
  }

  // ── READING MODULE ────────────────────────────────
  function initReading() {
    const newBtn = document.getElementById('read-new-btn');
    const listenBtn = document.getElementById('read-listen-btn');

    newBtn?.addEventListener('click', loadReadingArticle);
    listenBtn?.addEventListener('click', () => {
      const body = document.getElementById('reading-article')?.textContent;
      if (body && currentReadArticle) {
        Speech.speak(currentReadArticle.body.substring(0, 500), currentLang, 0.9);
        showToast('Đang đọc bài...', 'info', 'fa-volume-high');
      }
    });

    // Word popup close
    document.getElementById('wp-close-btn')?.addEventListener('click', () => {
      document.getElementById('word-popup').style.display = 'none';
    });

    document.addEventListener('click', (e) => {
      const popup = document.getElementById('word-popup');
      if (popup && !popup.contains(e.target) && !e.target.classList.contains('article-word')) {
        popup.style.display = 'none';
      }
    });

    // Font size
    document.querySelectorAll('.fs-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.fs-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const sizes = { small: '14px', medium: '16px', large: '19px' };
        const articleBody = document.querySelector('.article-body');
        if (articleBody) articleBody.style.fontSize = sizes[btn.dataset.size] || '16px';
      });
    });

    // Check answers
    document.getElementById('check-reading-btn')?.addEventListener('click', checkReadingAnswers);
  }

  function loadReadingArticle() {
    const lang = currentLang;
    const level = document.getElementById('read-level')?.value || 'B1';
    const topic = document.getElementById('read-topic')?.value || 'news';

    const article = Exercises.loadReadingArticle(lang, topic, level);
    if (!article) {
      showToast('Chưa có bài đọc cho chủ đề và cấp độ này. Hãy thử kết hợp khác!', 'info', 'fa-book');
      return;
    }

    currentReadArticle = article;
    renderReadingArticle(article, lang);
    Progress.recordActivity(5, 'reading');
  }

  function renderReadingArticle(article, lang) {
    const container = document.getElementById('reading-article');
    if (!container) return;

    // Make each word clickable
    const bodyHtml = article.body.replace(/\n\n/g, '</p><p>').split(/(\s+|[，。！？,\.!?])/)
      .map(token => {
        if (/\s+/.test(token) || /^[，。！？,\.!?]$/.test(token)) return token;
        if (!token.trim()) return token;
        const safe = escapeHtml(token);
        return `<span class="article-word" data-word="${token}" data-lang="${lang}">${safe}</span>`;
      }).join('');

    container.innerHTML = `
      <div class="article-title">${article.title}</div>
      <div class="article-meta">${article.meta}</div>
      <div class="article-body"><p>${bodyHtml}</p></div>
    `;

    // Word click events
    container.querySelectorAll('.article-word').forEach(word => {
      word.addEventListener('click', async (e) => {
        e.stopPropagation();
        const w = word.dataset.word;
        if (w.length < 2) return;
        container.querySelectorAll('.article-word').forEach(el => el.classList.remove('highlighted'));
        word.classList.add('highlighted');
        await Dictionary.showWordPopup(w, lang, word);
      });
    });

    // Show questions
    if (article.questions?.length) {
      const qContainer = document.getElementById('reading-questions');
      const qContent = document.getElementById('questions-content');
      if (qContainer && qContent) {
        qContainer.style.display = 'block';
        qContent.innerHTML = article.questions.map((q, qi) => `
          <div class="question-item" data-qi="${qi}" data-correct="${q.correct}">
            <div class="question-text">${qi + 1}. ${q.q}</div>
            <div class="question-options">
              ${q.options.map((opt, oi) => `
                <button class="question-option" data-qi="${qi}" data-oi="${oi}">${String.fromCharCode(65 + oi)}. ${opt}</button>
              `).join('')}
            </div>
          </div>
        `).join('');

        // Answer selection
        qContent.querySelectorAll('.question-option').forEach(btn => {
          btn.addEventListener('click', () => {
            const qi = btn.dataset.qi;
            qContent.querySelectorAll(`.question-option[data-qi="${qi}"]`).forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
        });
      }
    }
  }

  function checkReadingAnswers() {
    const items = document.querySelectorAll('.question-item');
    let correct = 0;
    items.forEach(item => {
      const qi = item.dataset.qi;
      const correctIdx = parseInt(item.dataset.correct);
      const selected = item.querySelector('.question-option.selected');
      item.querySelectorAll('.question-option').forEach((btn, i) => {
        if (i === correctIdx) btn.classList.add('correct');
        else if (btn.classList.contains('selected')) btn.classList.add('wrong');
      });
      if (selected && parseInt(selected.dataset.oi) === correctIdx) correct++;
    });

    const pct = items.length > 0 ? Math.round((correct / items.length) * 100) : 0;
    showToast(`Kết quả: ${correct}/${items.length} câu đúng (${pct}%)`, pct >= 70 ? 'success' : 'info', 'fa-check-circle');
    Progress.recordAccuracy(pct);
    Progress.recordActivity(15, 'reading');
  }

  // ── WRITING MODULE ────────────────────────────────
  function initWriting() {
    const editor = document.getElementById('writing-editor');
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const checkGrammarBtn = document.getElementById('check-grammar-btn');
    const clearBtn = document.getElementById('clear-editor-btn');
    const newPromptBtn = document.getElementById('new-writing-prompt-btn');

    editor?.addEventListener('input', () => {
      const text = editor.textContent || '';
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      if (wordCountEl) wordCountEl.textContent = words + ' từ';
      if (charCountEl) charCountEl.textContent = text.length + ' ký tự';
    });

    editor?.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') { e.preventDefault(); document.execCommand('insertText', false, '    '); }
    });

    checkGrammarBtn?.addEventListener('click', () => {
      const text = editor?.textContent?.trim() || '';
      if (!text) { showToast('Hãy viết gì đó trước!', 'info', 'fa-pen'); return; }
      const lang = document.getElementById('write-lang-select')?.value || currentLang;
      const level = document.getElementById('write-level')?.value || 'B1';
      const result = Exercises.scoreWriting(text, lang, level);
      renderWritingFeedback(result);
      Progress.recordAccuracy(result.score);
      Progress.recordActivity(20, 'writing');
    });

    clearBtn?.addEventListener('click', () => {
      if (editor) editor.innerHTML = '';
      if (wordCountEl) wordCountEl.textContent = '0 từ';
      if (charCountEl) charCountEl.textContent = '0 ký tự';
      document.getElementById('grammar-feedback').style.display = 'none';
    });

    newPromptBtn?.addEventListener('click', () => {
      const lang = document.getElementById('write-lang-select')?.value || currentLang;
      const topic = document.getElementById('write-topic-select')?.value || 'daily';
      const level = document.getElementById('write-level')?.value || 'B1';
      const prompt = Exercises.getWritingPrompt(lang, topic, level);
      const promptEl = document.getElementById('writing-prompt-text');
      if (promptEl) {
        promptEl.style.opacity = '0';
        setTimeout(() => {
          promptEl.textContent = prompt;
          promptEl.style.opacity = '1';
        }, 200);
      }
    });
  }

  function renderWritingFeedback(result) {
    const panel = document.getElementById('grammar-feedback');
    const scoreEl = document.getElementById('writing-score');
    const contentEl = document.getElementById('feedback-content');

    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (scoreEl) {
      scoreEl.textContent = result.score + '/100';
      const color = result.score >= 75 ? 'var(--accent-green)' : result.score >= 55 ? 'var(--accent-orange)' : 'var(--accent-red)';
      scoreEl.style.color = color;
    }

    const errors = result.feedback.filter(f => f.type === 'error');
    const positives = result.feedback.filter(f => f.type === 'positive');
    const tips = result.feedback.filter(f => f.type === 'tip' || f.type === 'warning');

    let html = '';

    if (positives.length) {
      html += `<div class="feedback-section">
        <div class="feedback-section-title" style="color:var(--accent-green)">✅ Điểm tích cực</div>
        ${positives.map(f => `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">${f.text}</div>`).join('')}
      </div>`;
    }

    if (errors.length) {
      html += `<div class="feedback-section">
        <div class="feedback-section-title" style="color:var(--accent-red)">❌ Lỗi cần sửa</div>
        ${errors.map(e => `<div class="feedback-error-item">
          ${e.original ? `<div class="feedback-error-original">❌ "${e.original}"</div>` : ''}
          ${e.correction ? `<div class="feedback-error-corrected">✅ "${e.correction}"</div>` : ''}
          <div class="feedback-error-explain">${e.explain || e.text}</div>
        </div>`).join('')}
      </div>`;
    }

    if (tips.length) {
      html += `<div class="feedback-section">
        <div class="feedback-section-title" style="color:var(--accent-orange)">💡 Gợi ý cải thiện</div>
        ${tips.map(f => `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:6px">${f.text}</div>`).join('')}
      </div>`;
    }

    html += `<div style="margin-top:16px;padding:14px;background:rgba(124,58,237,0.08);border-radius:10px;border:1px solid rgba(124,58,237,0.2)">
      <strong style="color:var(--text-accent)">${result.grade}</strong>: ${result.suggestion}
    </div>`;

    if (contentEl) contentEl.innerHTML = html;
  }

  // ── DICTIONARY MODULE ─────────────────────────────
  function initDictionary() {
    const input = document.getElementById('dict-search-input');
    const searchBtn = document.getElementById('dict-search-btn');
    const voiceBtn = document.getElementById('dict-voice-btn');
    const langToggle = document.getElementById('dict-lang-toggle');

    let dictLang = currentLang;

    searchBtn?.addEventListener('click', () => {
      const word = input?.value.trim();
      if (word) searchDictionary(word, dictLang);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const word = input.value.trim();
        if (word) searchDictionary(word, dictLang);
      }
    });

    // Auto-detect language
    input?.addEventListener('input', () => {
      const val = input.value.trim();
      if (val) {
        const detected = Dictionary.detectLang(val);
        if (detected !== dictLang) {
          dictLang = detected;
          updateDictLangUI(dictLang);
        }
      }
    });

    voiceBtn?.addEventListener('click', () => {
      Speech.startRecording(dictLang, (text) => {
        if (input) input.value = text;
        searchDictionary(text, dictLang);
      }, null, voiceBtn);
    });

    langToggle?.addEventListener('click', () => {
      dictLang = dictLang === 'en' ? 'zh' : 'en';
      updateDictLangUI(dictLang);
      if (input) input.placeholder = dictLang === 'zh' ? '输入汉字或拼音...' : 'Enter English word...';
    });

    // Example word buttons
    document.querySelectorAll('.dict-example-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const word = btn.dataset.word;
        const lang = btn.dataset.lang;
        if (input) input.value = word;
        dictLang = lang;
        updateDictLangUI(lang);
        searchDictionary(word, lang);
      });
    });
  }

  function updateDictLangUI(lang) {
    const flagEl = document.getElementById('dict-flag');
    const labelEl = document.getElementById('dict-lang-label');
    if (flagEl) flagEl.src = `https://flagcdn.com/${lang === 'zh' ? 'cn' : 'gb'}.svg`;
    if (labelEl) labelEl.textContent = lang === 'zh' ? 'ZH' : 'EN';
  }

  async function searchDictionary(word, lang) {
    const container = document.getElementById('dict-result');
    if (!container) return;

    container.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner" style="margin:0 auto 12px"></div><p style="color:var(--text-muted)">Đang tra cứu...</p></div>';

    const result = await Dictionary.lookup(word, lang);
    Dictionary.renderResult(result, container);
    Progress.recordActivity(5);
  }

  // ── FLASHCARD MODULE ──────────────────────────────
  function initFlashcard() {
    const card = document.getElementById('flashcard');
    card?.addEventListener('click', flipCard);
    card?.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') flipCard(); });

    document.querySelectorAll('.fc-rate-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const rating = parseInt(btn.dataset.rating);
        rateCurrentCard(rating);
      });
    });
  }

  function loadFlashcards() {
    dueCards = Progress.getDueFlashcards();
    currentFlashcardIndex = 0;
    Progress.updateUI();

    const empty = document.getElementById('fc-empty');
    const stage = document.getElementById('flashcard');
    const rating = document.getElementById('fc-rating');

    if (dueCards.length === 0) {
      if (empty) empty.style.display = 'block';
      if (stage) stage.style.display = 'none';
      if (rating) rating.style.display = 'none';
    } else {
      if (empty) empty.style.display = 'none';
      if (stage) stage.style.display = 'block';
      showFlashcard(0);
    }
  }

  function showFlashcard(index) {
    if (index >= dueCards.length) {
      const empty = document.getElementById('fc-empty');
      if (empty) empty.style.display = 'block';
      document.getElementById('flashcard').style.display = 'none';
      document.getElementById('fc-rating').style.display = 'none';
      showToast('🎉 Hoàn thành ôn tập hôm nay!', 'success', 'fa-check-circle');
      Progress.recordActivity(20);
      return;
    }

    const card = dueCards[index];
    isFlashcardFlipped = false;

    const fcCard = document.getElementById('flashcard');
    const inner = document.getElementById('flashcard-inner');
    if (inner) inner.style.transform = 'rotateY(0deg)';

    document.getElementById('fc-lang-badge').textContent = card.lang === 'zh' ? 'ZH 中文' : 'EN';
    document.getElementById('fc-word').textContent = card.word;
    document.getElementById('fc-word').style.fontFamily = card.lang === 'zh' ? 'var(--font-zh)' : 'var(--font-main)';
    document.getElementById('fc-phonetic').textContent = card.phonetic || '';
    document.getElementById('fc-word-back').textContent = card.word;
    document.getElementById('fc-meaning').textContent = card.meaning || '—';
    document.getElementById('fc-example').textContent = card.example ? `"${card.example}"` : '';
    document.getElementById('fc-source').textContent = card.source || '';
    document.getElementById('fc-rating').style.display = 'none';
  }

  function flipCard() {
    const inner = document.getElementById('flashcard-inner');
    const rating = document.getElementById('fc-rating');
    if (!inner) return;

    isFlashcardFlipped = !isFlashcardFlipped;
    inner.style.transform = isFlashcardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)';

    if (isFlashcardFlipped && rating) {
      rating.style.display = 'flex';
      Speech.speak(dueCards[currentFlashcardIndex]?.word || '', dueCards[currentFlashcardIndex]?.lang || 'en');
    } else if (rating) {
      rating.style.display = 'none';
    }
  }

  function rateCurrentCard(rating) {
    const card = dueCards[currentFlashcardIndex];
    if (!card) return;
    Progress.rateFlashcard(card.idx, rating);
    currentFlashcardIndex++;
    showFlashcard(currentFlashcardIndex);
    Progress.updateUI();
  }

  // ── MOBILE MENU ───────────────────────────────────
  function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    menuBtn?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      sidebarOpen = !sidebarOpen;
      if (sidebarOpen) {
        sidebar.classList.add('open');
        // Add overlay
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.id = 'sidebar-overlay';
        overlay.style.display = 'block';
        overlay.addEventListener('click', closeSidebar);
        document.body.appendChild(overlay);
      } else {
        closeSidebar();
      }
    });
  }

  function closeSidebar() {
    sidebarOpen = false;
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.remove();
  }

  // ── FLOATING / MISC ───────────────────────────────
  function initFloatingElements() {
    // Add SVG gradient def for circular progress
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.display = 'none';
    svg.innerHTML = `<defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#7c3aed"/>
        <stop offset="100%" stop-color="#0ea5e9"/>
      </linearGradient>
    </defs>`;
    document.body.prepend(svg);
  }

  // ── TOAST NOTIFICATIONS ───────────────────────────
  function showToast(message, type = 'info', icon = 'fa-info-circle') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas ${icon}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ── HELPERS ───────────────────────────────────────
  function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function levenshteinSim(a, b) {
    if (!a || !b) return 0;
    if (a === b) return 1;
    const m = a.length, n = b.length;
    const dp = Array.from({length: m+1}, (_, i) => Array.from({length: n+1}, (_, j) => i === 0 ? j : j === 0 ? i : 0));
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return 1 - dp[m][n] / Math.max(m, n);
  }

  // Expose searchDictionary for dictionary.js
  return { init, navigateTo, showToast, searchDictionary };
})();

// ── ADD TOAST KEYFRAME ────────────────────────────────
const style = document.createElement('style');
style.textContent = `@keyframes toastOut { to { opacity:0; transform:translateX(20px); } }`;
document.head.appendChild(style);

// ── BOOT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
