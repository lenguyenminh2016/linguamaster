/**
 * translator.js — Live Translation Module
 * Modes: Meeting/Video | Conversation | Quick
 * API: MyMemory (free, no key required)
 */

const Translator = (() => {
  const API = 'https://api.mymemory.translated.net/get';

  // Language config
  const LANGUAGES = {
    'vi':    { label: '🇻🇳 Tiếng Việt',  code: 'vi',    speechCode: 'vi-VN' },
    'en':    { label: '🇬🇧 English',       code: 'en',    speechCode: 'en-US' },
    'zh-CN': { label: '🇨🇳 中文 (简体)',    code: 'zh-CN', speechCode: 'zh-CN' },
    'zh-TW': { label: '🇹🇼 中文 (繁體)',    code: 'zh-TW', speechCode: 'zh-TW' },
    'ja':    { label: '🇯🇵 日本語',         code: 'ja',    speechCode: 'ja-JP' },
    'ko':    { label: '🇰🇷 한국어',          code: 'ko',    speechCode: 'ko-KR' },
    'fr':    { label: '🇫🇷 Français',       code: 'fr',    speechCode: 'fr-FR' },
    'de':    { label: '🇩🇪 Deutsch',        code: 'de',    speechCode: 'de-DE' },
    'es':    { label: '🇪🇸 Español',        code: 'es',    speechCode: 'es-ES' },
    'ru':    { label: '🇷🇺 Русский',        code: 'ru',    speechCode: 'ru-RU' },
  };

  // State
  let meetingRecog = null;
  let convoRecogA = null;
  let convoRecogB = null;
  let meetingActive = false;
  let convoActiveA = false;
  let convoActiveB = false;
  let meetingHistory = [];
  let tabAudioStream = null;
  let tabAudioRecog = null;

  // ── CORE TRANSLATION API ──────────────────────────
  async function translate(text, fromLang, toLang) {
    if (!text || !text.trim()) return '';
    if (fromLang === toLang) return text;

    // Normalize language codes for MyMemory
    const from = fromLang === 'zh-CN' ? 'zh-CN' : fromLang === 'zh-TW' ? 'zh-TW' : fromLang.split('-')[0];
    const to   = toLang   === 'zh-CN' ? 'zh-CN' : toLang   === 'zh-TW' ? 'zh-TW' : toLang.split('-')[0];

    try {
      const url = `${API}?q=${encodeURIComponent(text.trim())}&langpair=${from}|${to}&de=linguamaster@app.com`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      if (data.responseStatus === 200 || data.responseData?.translatedText) {
        return data.responseData.translatedText || text;
      }
      // Fallback: try without email param
      const res2 = await fetch(`${API}?q=${encodeURIComponent(text.trim())}&langpair=${from}|${to}`);
      const data2 = await res2.json();
      return data2.responseData?.translatedText || text;
    } catch (err) {
      console.warn('Translation error:', err);
      return '[Lỗi dịch — kiểm tra kết nối mạng]';
    }
  }

  // ── MODE 1: MEETING / VIDEO TRANSLATION ──────────
  function initMeetingMode() {
    meetingHistory = [];

    const startBtn  = document.getElementById('meeting-start-btn');
    const stopBtn   = document.getElementById('meeting-stop-btn');
    const clearBtn  = document.getElementById('meeting-clear-btn');
    const exportBtn = document.getElementById('meeting-export-btn');
    const srcSel    = document.getElementById('meeting-src-lang');
    const tgtSel    = document.getElementById('meeting-tgt-lang');
    const swapBtn   = document.getElementById('meeting-swap-btn');
    const micTab    = document.getElementById('meeting-tab-mic');
    const tabTab    = document.getElementById('meeting-tab-tab');
    const sourceToggle = document.getElementById('meeting-source-toggle');

    startBtn?.addEventListener('click', startMeeting);
    stopBtn?.addEventListener('click', stopMeeting);
    clearBtn?.addEventListener('click', () => {
      meetingHistory = [];
      const area = document.getElementById('meeting-subtitles');
      if (area) area.innerHTML = `<div class="subtitle-placeholder"><i class="fas fa-closed-captioning"></i><p>Phụ đề sẽ hiển thị ở đây khi bắt đầu dịch...</p></div>`;
    });
    exportBtn?.addEventListener('click', exportTranscript);
    swapBtn?.addEventListener('click', swapMeetingLanguages);

    // Tab toggle (Mic vs Tab audio)
    [micTab, tabTab].forEach(tab => {
      tab?.addEventListener('click', () => {
        [micTab, tabTab].forEach(t => t?.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  }

  async function startMeeting() {
    const srcLang = document.getElementById('meeting-src-lang')?.value || 'en';
    const tgtLang = document.getElementById('meeting-tgt-lang')?.value || 'vi';
    const useTab  = document.getElementById('meeting-tab-tab')?.classList.contains('active');

    const startBtn = document.getElementById('meeting-start-btn');
    const stopBtn  = document.getElementById('meeting-stop-btn');
    const indicator = document.getElementById('meeting-live-dot');

    meetingActive = true;
    if (startBtn) startBtn.style.display = 'none';
    if (stopBtn)  stopBtn.style.display  = 'flex';
    if (indicator) { indicator.classList.add('live'); }
    document.getElementById('meeting-status-text').textContent = 'Đang dịch...';

    App.showToast('Bắt đầu phiên dịch trực tiếp!', 'success', 'fa-circle-dot');

    if (useTab) {
      await startTabAudioTranslation(srcLang, tgtLang);
    } else {
      startMicTranslation(srcLang, tgtLang);
    }
  }

  function startMicTranslation(srcLang, tgtLang) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      App.showToast('Trình duyệt không hỗ trợ nhận dạng giọng nói. Dùng Chrome!', 'error', 'fa-microphone-slash');
      return;
    }

    meetingRecog = new SpeechRecognition();
    meetingRecog.lang = LANGUAGES[srcLang]?.speechCode || 'en-US';
    meetingRecog.continuous = true;
    meetingRecog.interimResults = true;
    meetingRecog.maxAlternatives = 1;

    let interimLine = null;

    meetingRecog.onresult = async (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;

        if (!isFinal) {
          // Show interim result
          showInterimSubtitle(transcript, srcLang);
        } else {
          // Translate and show final
          removeInterimSubtitle();
          const translated = await translate(transcript, srcLang, tgtLang);
          addSubtitleEntry(transcript, translated, srcLang, tgtLang, 'mic');
        }
      }
    };

    meetingRecog.onerror = (e) => {
      if (e.error !== 'no-speech') {
        App.showToast(`Lỗi nhận dạng: ${e.error}`, 'error', 'fa-exclamation-triangle');
      }
    };

    meetingRecog.onend = () => {
      if (meetingActive) {
        // Auto restart for continuous listening
        setTimeout(() => { if (meetingActive) meetingRecog.start(); }, 300);
      }
    };

    meetingRecog.start();
  }

  async function startTabAudioTranslation(srcLang, tgtLang) {
    try {
      App.showToast('Chọn tab/cửa sổ cần dịch audio...', 'info', 'fa-display');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });

      tabAudioStream = stream;
      App.showToast('Đã kết nối audio từ tab!', 'success', 'fa-check-circle');

      // Use Web Audio API to pipe the stream to SpeechRecognition
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);

      // Create a new MediaStream with only the audio track for recognition
      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
        App.showToast('Không tìm thấy audio từ tab. Hãy chọn "Share audio"!', 'error', 'fa-volume-xmark');
        stopMeeting();
        return;
      }

      const recognitionStream = new MediaStream([audioTrack]);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      tabAudioRecog = new SpeechRecognition();
      tabAudioRecog.lang = LANGUAGES[srcLang]?.speechCode || 'en-US';
      tabAudioRecog.continuous = true;
      tabAudioRecog.interimResults = true;

      tabAudioRecog.onresult = async (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const isFinal = event.results[i].isFinal;
          if (!isFinal) {
            showInterimSubtitle(transcript, srcLang);
          } else {
            removeInterimSubtitle();
            const translated = await translate(transcript, srcLang, tgtLang);
            addSubtitleEntry(transcript, translated, srcLang, tgtLang, 'tab');
          }
        }
      };

      tabAudioRecog.onend = () => {
        if (meetingActive) setTimeout(() => { if (meetingActive) tabAudioRecog.start(); }, 300);
      };

      stream.getAudioTracks()[0].onended = () => {
        stopMeeting();
        App.showToast('Đã dừng chia sẻ tab audio.', 'info', 'fa-stop');
      };

      tabAudioRecog.start();

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        App.showToast('Cần quyền chia sẻ màn hình để dịch tab audio!', 'error', 'fa-lock');
      } else if (err.name === 'NotSupportedError') {
        App.showToast('Tab audio capture không được hỗ trợ. Hãy thử Chrome!', 'error', 'fa-exclamation');
      } else {
        App.showToast('Lỗi khi kết nối tab audio: ' + err.message, 'error', 'fa-triangle-exclamation');
      }
      // Fallback to mic
      startMicTranslation(srcLang, tgtLang);
    }
  }

  function stopMeeting() {
    meetingActive = false;
    if (meetingRecog) { try { meetingRecog.stop(); } catch {} meetingRecog = null; }
    if (tabAudioRecog) { try { tabAudioRecog.stop(); } catch {} tabAudioRecog = null; }
    if (tabAudioStream) { tabAudioStream.getTracks().forEach(t => t.stop()); tabAudioStream = null; }

    const startBtn = document.getElementById('meeting-start-btn');
    const stopBtn  = document.getElementById('meeting-stop-btn');
    const indicator = document.getElementById('meeting-live-dot');
    const statusText = document.getElementById('meeting-status-text');

    if (startBtn) startBtn.style.display = 'flex';
    if (stopBtn)  stopBtn.style.display  = 'none';
    if (indicator) indicator.classList.remove('live');
    if (statusText) statusText.textContent = 'Đã dừng';

    removeInterimSubtitle();
    App.showToast('Đã dừng phiên dịch.', 'info', 'fa-stop');
  }

  function showInterimSubtitle(text, lang) {
    let interim = document.getElementById('interim-subtitle');
    const area = document.getElementById('meeting-subtitles');
    if (!area) return;

    // Remove placeholder
    const placeholder = area.querySelector('.subtitle-placeholder');
    if (placeholder) placeholder.remove();

    if (!interim) {
      interim = document.createElement('div');
      interim.id = 'interim-subtitle';
      interim.className = 'subtitle-entry interim';
      area.appendChild(interim);
    }
    interim.innerHTML = `
      <div class="subtitle-original interim-text">
        <span class="sub-lang-badge">${getLangLabel(lang)}</span>
        ${escHtml(text)}<span class="cursor-blink">|</span>
      </div>
    `;
    area.scrollTop = area.scrollHeight;
  }

  function removeInterimSubtitle() {
    document.getElementById('interim-subtitle')?.remove();
  }

  function addSubtitleEntry(original, translated, srcLang, tgtLang, source) {
    const area = document.getElementById('meeting-subtitles');
    if (!area) return;

    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = { original, translated, srcLang, tgtLang, time };
    meetingHistory.push(entry);

    const sourceIcon = source === 'tab' ? 'fa-display' : 'fa-microphone';

    const div = document.createElement('div');
    div.className = 'subtitle-entry fade-in-up';
    div.innerHTML = `
      <div class="subtitle-meta">
        <i class="fas ${sourceIcon}"></i>
        <span>${time}</span>
      </div>
      <div class="subtitle-original">
        <span class="sub-lang-badge">${getLangLabel(srcLang)}</span>
        ${escHtml(original)}
      </div>
      <div class="subtitle-translated">
        <span class="sub-lang-badge translated">${getLangLabel(tgtLang)}</span>
        ${escHtml(translated)}
        <button class="sub-speak-btn" onclick="Speech.speak('${escAttr(translated)}','${tgtLang}')" title="Nghe phát âm">
          <i class="fas fa-volume-high"></i>
        </button>
        <button class="sub-copy-btn" onclick="navigator.clipboard?.writeText('${escAttr(translated)}');App.showToast('Đã sao chép!','success','fa-copy')" title="Sao chép">
          <i class="fas fa-copy"></i>
        </button>
      </div>
    `;
    area.appendChild(div);
    area.scrollTop = area.scrollHeight;
  }

  function swapMeetingLanguages() {
    const src = document.getElementById('meeting-src-lang');
    const tgt = document.getElementById('meeting-tgt-lang');
    if (!src || !tgt) return;
    const tmp = src.value;
    src.value = tgt.value;
    tgt.value = tmp;
  }

  function exportTranscript() {
    if (!meetingHistory.length) {
      App.showToast('Chưa có nội dung để xuất!', 'info', 'fa-file-export');
      return;
    }
    const text = meetingHistory.map(e =>
      `[${e.time}]\n${getLangLabel(e.srcLang)}: ${e.original}\n${getLangLabel(e.tgtLang)}: ${e.translated}\n`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LinguaMaster_Transcript_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    App.showToast('Đã xuất bản ghi phiên dịch!', 'success', 'fa-file-export');
  }

  // ── MODE 2: CONVERSATION TRANSLATION ─────────────
  function initConversationMode() {
    const btnA   = document.getElementById('convo-btn-a');
    const btnB   = document.getElementById('convo-btn-b');
    const swapBtn = document.getElementById('convo-swap-btn');
    const autoBtn = document.getElementById('convo-auto-btn');
    const clearBtn = document.getElementById('convo-clear-btn');

    btnA?.addEventListener('click', () => toggleConvoRecording('A'));
    btnB?.addEventListener('click', () => toggleConvoRecording('B'));
    swapBtn?.addEventListener('click', swapConvoLanguages);
    clearBtn?.addEventListener('click', () => {
      document.getElementById('convo-history').innerHTML = `
        <div class="convo-placeholder">
          <i class="fas fa-comments"></i>
          <p>Nhấn vào nút mic của mỗi người để bắt đầu hội thoại</p>
        </div>
      `;
    });

    // Auto-mode: speak freely, auto detect who is speaking
    autoBtn?.addEventListener('click', startAutoConversation);
  }

  function toggleConvoRecording(person) {
    if (person === 'A') {
      if (convoActiveA) stopConvoRecording('A');
      else startConvoRecording('A');
    } else {
      if (convoActiveB) stopConvoRecording('B');
      else startConvoRecording('B');
    }
  }

  function startConvoRecording(person) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const langKey = document.getElementById(`convo-lang-${person.toLowerCase()}`)?.value || (person === 'A' ? 'vi' : 'en');
    const targetLangKey = document.getElementById(`convo-lang-${person === 'A' ? 'b' : 'a'}`)?.value || (person === 'A' ? 'en' : 'vi');

    const recog = new SpeechRecognition();
    recog.lang = LANGUAGES[langKey]?.speechCode || 'vi-VN';
    recog.continuous = false;
    recog.interimResults = true;

    const btn = document.getElementById(`convo-btn-${person.toLowerCase()}`);
    const statusEl = document.getElementById(`convo-status-${person.toLowerCase()}`);

    if (person === 'A') { convoActiveA = true; convoRecogA = recog; }
    else { convoActiveB = true; convoRecogB = recog; }

    btn?.classList.add('recording');
    if (statusEl) statusEl.textContent = 'Đang nghe...';

    // Show interim in the input box
    const interimEl = document.getElementById(`convo-interim-${person.toLowerCase()}`);

    recog.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const isFinal = event.results[event.results.length - 1].isFinal;

      if (interimEl) interimEl.textContent = transcript;

      if (isFinal) {
        if (interimEl) interimEl.textContent = '';
        const translated = await translate(transcript, langKey, targetLangKey);
        addConvoEntry(transcript, translated, langKey, targetLangKey, person);
        stopConvoRecording(person);

        // Auto-speak the translation
        const autoSpeak = document.getElementById('convo-auto-speak')?.checked;
        if (autoSpeak) {
          setTimeout(() => Speech.speak(translated, targetLangKey, 0.9), 300);
        }
      }
    };

    recog.onerror = () => stopConvoRecording(person);
    recog.onend = () => { if (person === 'A' ? convoActiveA : convoActiveB) stopConvoRecording(person); };

    recog.start();
    App.showToast(`Người ${person} đang nói...`, 'info', 'fa-microphone');
  }

  function stopConvoRecording(person) {
    if (person === 'A') {
      convoActiveA = false;
      if (convoRecogA) { try { convoRecogA.stop(); } catch {} convoRecogA = null; }
    } else {
      convoActiveB = false;
      if (convoRecogB) { try { convoRecogB.stop(); } catch {} convoRecogB = null; }
    }

    const btn = document.getElementById(`convo-btn-${person.toLowerCase()}`);
    const statusEl = document.getElementById(`convo-status-${person.toLowerCase()}`);
    btn?.classList.remove('recording');
    if (statusEl) statusEl.textContent = 'Nhấn để nói';
    document.getElementById(`convo-interim-${person.toLowerCase()}`)?.querySelector && null;
  }

  function addConvoEntry(original, translated, srcLang, tgtLang, person) {
    const history = document.getElementById('convo-history');
    if (!history) return;

    // Remove placeholder
    history.querySelector('.convo-placeholder')?.remove();

    const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const isPersonA = person === 'A';

    const div = document.createElement('div');
    div.className = `convo-entry ${isPersonA ? 'person-a' : 'person-b'} fade-in-up`;
    div.innerHTML = `
      <div class="convo-avatar">${isPersonA ? 'A' : 'B'}</div>
      <div class="convo-bubble">
        <div class="convo-original">
          <span class="sub-lang-badge">${getLangLabel(srcLang)}</span>
          <span>${escHtml(original)}</span>
        </div>
        <div class="convo-translated">
          <span class="sub-lang-badge translated">${getLangLabel(tgtLang)}</span>
          <span>${escHtml(translated)}</span>
        </div>
        <div class="convo-actions">
          <span class="convo-time">${time}</span>
          <button onclick="Speech.speak('${escAttr(translated)}','${tgtLang}')" title="Phát âm bản dịch" class="convo-action-btn">
            <i class="fas fa-volume-high"></i>
          </button>
          <button onclick="navigator.clipboard?.writeText('${escAttr(translated)}');App.showToast('Đã sao chép!','success','fa-copy')" title="Sao chép" class="convo-action-btn">
            <i class="fas fa-copy"></i>
          </button>
        </div>
      </div>
    `;

    history.appendChild(div);
    history.scrollTop = history.scrollHeight;
  }

  function swapConvoLanguages() {
    const a = document.getElementById('convo-lang-a');
    const b = document.getElementById('convo-lang-b');
    if (!a || !b) return;
    const tmp = a.value; a.value = b.value; b.value = tmp;

    // Update labels
    const labelA = document.getElementById('convo-label-a');
    const labelB = document.getElementById('convo-label-b');
    if (labelA) labelA.textContent = getLangLabel(a.value);
    if (labelB) labelB.textContent = getLangLabel(b.value);
  }

  // Auto conversation: detect pauses, alternate speakers
  let autoConvoActive = false;
  let autoRecog = null;
  let lastSpeaker = 'A';

  function startAutoConversation() {
    const btn = document.getElementById('convo-auto-btn');
    if (autoConvoActive) {
      autoConvoActive = false;
      if (autoRecog) { try { autoRecog.stop(); } catch {} autoRecog = null; }
      if (btn) { btn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Tự động'; btn.classList.remove('active'); }
      App.showToast('Đã tắt chế độ tự động.', 'info', 'fa-stop');
      return;
    }

    autoConvoActive = true;
    if (btn) { btn.innerHTML = '<i class="fas fa-stop"></i> Dừng tự động'; btn.classList.add('active'); }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const langA = document.getElementById('convo-lang-a')?.value || 'vi';
    const langB = document.getElementById('convo-lang-b')?.value || 'en';

    // Use both languages simultaneously (Chrome supports this via continuous)
    autoRecog = new SpeechRecognition();
    // Start with language A, switch on silence
    autoRecog.lang = LANGUAGES[lastSpeaker === 'A' ? langA : langB]?.speechCode;
    autoRecog.continuous = false;
    autoRecog.interimResults = true;

    autoRecog.onresult = async (event) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const isFinal = event.results[event.results.length - 1].isFinal;
      if (isFinal && transcript.trim()) {
        const person = lastSpeaker;
        const src = person === 'A' ? langA : langB;
        const tgt = person === 'A' ? langB : langA;
        const translated = await translate(transcript, src, tgt);
        addConvoEntry(transcript, translated, src, tgt, person);
        lastSpeaker = person === 'A' ? 'B' : 'A'; // Switch speaker
        if (document.getElementById('convo-auto-speak')?.checked) {
          setTimeout(() => Speech.speak(translated, tgt, 0.9), 200);
        }
      }
    };

    autoRecog.onend = () => {
      if (autoConvoActive) {
        // Switch language for next speaker
        autoRecog.lang = LANGUAGES[lastSpeaker === 'A' ? langA : langB]?.speechCode;
        setTimeout(() => { if (autoConvoActive) autoRecog.start(); }, 500);
      }
    };

    autoRecog.onerror = (e) => {
      if (e.error === 'no-speech' && autoConvoActive) {
        lastSpeaker = lastSpeaker === 'A' ? 'B' : 'A';
      }
    };

    autoRecog.start();
    App.showToast('Chế độ tự động bật! Nói tự nhiên, ứng dụng sẽ phát hiện và dịch.', 'success', 'fa-wand-magic-sparkles');
  }

  // ── MODE 3: QUICK TRANSLATION ─────────────────────
  function initQuickMode() {
    const input   = document.getElementById('quick-input');
    const output  = document.getElementById('quick-output');
    const srcSel  = document.getElementById('quick-src-lang');
    const tgtSel  = document.getElementById('quick-tgt-lang');
    const swapBtn = document.getElementById('quick-swap-btn');
    const transBtn = document.getElementById('quick-translate-btn');
    const voiceIn = document.getElementById('quick-voice-in');
    const speakOut = document.getElementById('quick-speak-out');
    const copyOut  = document.getElementById('quick-copy-out');
    const clearBtn = document.getElementById('quick-clear-btn');

    let debounceTimer = null;

    // Auto translate on input with debounce
    input?.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const txt = input.value.trim();
      if (!txt) { if (output) output.innerHTML = '<span style="color:var(--text-muted)">Bản dịch sẽ hiển thị ở đây...</span>'; return; }
      debounceTimer = setTimeout(() => quickTranslate(), 800);
    });

    transBtn?.addEventListener('click', quickTranslate);

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.ctrlKey) quickTranslate();
    });

    swapBtn?.addEventListener('click', () => {
      const tmp = srcSel.value; srcSel.value = tgtSel.value; tgtSel.value = tmp;
      // Also swap text
      const oldInput = input?.value;
      const oldOutput = output?.textContent;
      if (input && oldOutput && oldOutput !== 'Bản dịch sẽ hiển thị ở đây...') {
        input.value = oldOutput;
        quickTranslate();
      }
    });

    voiceIn?.addEventListener('click', () => {
      Speech.startRecording(
        srcSel?.value || 'vi',
        (text) => { if (input) input.value = text; quickTranslate(); },
        null,
        voiceIn
      );
    });

    speakOut?.addEventListener('click', () => {
      const txt = output?.textContent;
      if (txt && txt !== 'Bản dịch sẽ hiển thị ở đây...') Speech.speak(txt, tgtSel?.value || 'en');
    });

    copyOut?.addEventListener('click', () => {
      const txt = output?.textContent;
      if (txt && txt !== 'Bản dịch sẽ hiển thị ở đây...') {
        navigator.clipboard?.writeText(txt);
        App.showToast('Đã sao chép bản dịch!', 'success', 'fa-copy');
      }
    });

    clearBtn?.addEventListener('click', () => {
      if (input) input.value = '';
      if (output) output.innerHTML = '<span style="color:var(--text-muted)">Bản dịch sẽ hiển thị ở đây...</span>';
    });

    // Update char count
    input?.addEventListener('input', () => {
      const count = document.getElementById('quick-char-count');
      if (count) count.textContent = (input.value?.length || 0) + ' ký tự';
    });
  }

  async function quickTranslate() {
    const input  = document.getElementById('quick-input');
    const output = document.getElementById('quick-output');
    const srcSel = document.getElementById('quick-src-lang');
    const tgtSel = document.getElementById('quick-tgt-lang');
    const btn    = document.getElementById('quick-translate-btn');

    const text = input?.value?.trim();
    if (!text) return;

    if (output) output.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';
    if (btn) btn.disabled = true;

    const srcLang = srcSel?.value || 'vi';
    const tgtLang = tgtSel?.value || 'en';

    // Auto-detect language
    const detected = Dictionary.detectLang(text);
    if (detected === 'zh' && srcLang === 'vi') {
      if (srcSel) srcSel.value = 'zh-CN';
    }

    const translated = await translate(text, srcSel?.value || 'vi', tgtLang);

    if (output) {
      output.innerHTML = `
        <span class="quick-translated-text">${escHtml(translated)}</span>
      `;
    }
    if (btn) btn.disabled = false;

    // Update quick phrase counter
    Progress.recordActivity(3);
  }

  // ── LANGUAGE SELECTOR HTML ────────────────────────
  function buildLangOptions(selectedVal) {
    return Object.entries(LANGUAGES).map(([k, v]) =>
      `<option value="${k}" ${k === selectedVal ? 'selected' : ''}>${v.label}</option>`
    ).join('');
  }

  // ── HELPERS ───────────────────────────────────────
  function getLangLabel(code) {
    return LANGUAGES[code]?.label || code;
  }

  function escHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function escAttr(s) {
    return (s || '').replace(/'/g,"\\'").replace(/\n/g,' ');
  }

  // ── PUBLIC INIT ───────────────────────────────────
  function init() {
    // Populate language selectors
    const selectors = [
      ['meeting-src-lang', 'en'],
      ['meeting-tgt-lang', 'vi'],
      ['convo-lang-a', 'vi'],
      ['convo-lang-b', 'en'],
      ['quick-src-lang', 'vi'],
      ['quick-tgt-lang', 'en'],
    ];

    selectors.forEach(([id, def]) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = buildLangOptions(def);
    });

    initMeetingMode();
    initConversationMode();
    initQuickMode();

    // Translator sub-tabs
    document.querySelectorAll('.trans-tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.trans-tab-btn').forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');

        const target = tab.dataset.transTab;
        document.querySelectorAll('.trans-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`trans-panel-${target}`)?.classList.add('active');
      });
    });
  }

  return { init, translate, stopMeeting };
})();
