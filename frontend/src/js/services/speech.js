/**
 * speech.js — Frontend Web Speech Service
 * Handles: Speech Recognition (STT) and Speech Synthesis (TTS)
 */

const Speech = (() => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let synth = window.speechSynthesis;
  let isRecording = false;
  let audioContext = null;
  let analyser = null;
  let animFrame = null;
  let mediaStream = null;
  let onResultCallback = null;

  // Initialize recognition
  function init() {
    if (!SpeechRecognition) return false;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    return true;
  }

  // Start recording with visual feedback
  function startRecording(lang, onResult, onInterim, buttonEl) {
    if (!init()) {
      App.showToast('Trình duyệt không hỗ trợ nhận dạng giọng nói. Vui lòng dùng Chrome.', 'error', 'fa-microphone-slash');
      return;
    }

    if (isRecording) { stopRecording(buttonEl); return; }

    onResultCallback = onResult;
    recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    isRecording = true;
    if (buttonEl) {
      buttonEl.classList.add('recording');
      buttonEl.querySelector('i') && (buttonEl.querySelector('i').className = 'fas fa-stop');
    }

    // Setup audio visualizer
    setupVisualizer();

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      if (onInterim && interim) onInterim(interim);
      if (final && onResult) onResult(final.trim());
    };

    recognition.onerror = (event) => {
      stopRecording(buttonEl);
      let msg = 'Lỗi nhận dạng giọng nói.';
      if (event.error === 'not-allowed') msg = 'Cần quyền truy cập microphone!';
      else if (event.error === 'no-speech') msg = 'Không nghe thấy gì. Hãy nói to hơn.';
      App.showToast(msg, 'error', 'fa-microphone-slash');
    };

    recognition.onend = () => { stopRecording(buttonEl); };
    recognition.start();
    App.showToast('Đang nghe... Hãy nói to và rõ', 'info', 'fa-microphone');
  }

  function stopRecording(buttonEl) {
    isRecording = false;
    if (recognition) try { recognition.stop(); } catch {}
    if (buttonEl) {
      buttonEl.classList.remove('recording');
      const icon = buttonEl.querySelector('i');
      if (icon) icon.className = 'fas fa-microphone';
    }
    stopVisualizer();
  }

  // Audio visualizer
  function setupVisualizer() {
    const canvas = document.getElementById('waveform-canvas');
    if (!canvas) return;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      mediaStream = stream;
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      drawWaveform(canvas);
    }).catch(() => {});
  }

  function drawWaveform(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const bufferLength = analyser ? analyser.frequencyBinCount : 0;
    const dataArray = new Uint8Array(bufferLength);

    function draw() {
      animFrame = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(0,0,0,0)';
      ctx.fillRect(0, 0, W, H);

      if (analyser) {
        analyser.getByteFrequencyData(dataArray);
        const barW = (W / bufferLength) * 2.5;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
          const barH = (dataArray[i] / 255) * H;
          const hue = 260 + (i / bufferLength) * 60;
          ctx.fillStyle = `hsla(${hue}, 80%, 65%, 0.8)`;
          ctx.fillRect(x, H - barH, barW, barH);
          x += barW + 1;
        }
      } else {
        // Idle animation
        const time = Date.now() / 500;
        for (let i = 0; i < W; i += 4) {
          const barH = Math.sin(i / 20 + time) * 10 + 12;
          ctx.fillStyle = 'rgba(124,58,237,0.3)';
          ctx.fillRect(i, H / 2 - barH / 2, 3, barH);
        }
      }
    }
    draw();
  }

  function stopVisualizer() {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    if (audioContext) audioContext.close();
    audioContext = null; analyser = null;
    const canvas = document.getElementById('waveform-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw flat line
      ctx.strokeStyle = 'rgba(124,58,237,0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    }
  }

  // Text-to-Speech
  function speak(text, lang = 'en', rate = 1.0, pitch = 1.0) {
    if (!synth) return;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    utterance.rate = rate;
    utterance.pitch = pitch;

    // Try to find best voice
    const voices = synth.getVoices();
    if (voices.length) {
      const preferred = voices.find(v => {
        if (lang === 'zh') return v.lang.startsWith('zh') && v.name.includes('Google');
        return v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Premium'));
      }) || voices.find(v => lang === 'zh' ? v.lang.startsWith('zh') : v.lang.startsWith('en-US'));
      if (preferred) utterance.voice = preferred;
    }

    // Avatar animation
    utterance.onstart = () => {
      const avatar = document.getElementById('avatar-core');
      if (avatar) avatar.classList.add('speaking');
    };
    utterance.onend = () => {
      const avatar = document.getElementById('avatar-core');
      if (avatar) avatar.classList.remove('speaking');
    };

    synth.speak(utterance);
    return utterance;
  }

  // Speak slowly for pronunciation practice
  function speakSlow(text, lang = 'en') {
    return speak(text, lang, 0.7, 1.0);
  }

  // Score pronunciation by comparing spoken to target
  function scorePronunciation(spoken, target, lang) {
    if (!spoken || !target) return 0;
    spoken = spoken.toLowerCase().trim();
    target = target.toLowerCase().trim();

    if (lang === 'zh') {
      // For Chinese: character-by-character comparison
      let match = 0;
      const maxLen = Math.max(spoken.length, target.length);
      for (let i = 0; i < Math.min(spoken.length, target.length); i++) {
        if (spoken[i] === target[i]) match++;
      }
      return Math.round((match / maxLen) * 100);
    }

    // For English: word-level comparison with phonetic similarity
    const spokenWords = spoken.split(/\s+/);
    const targetWords = target.split(/\s+/);
    let score = 0;
    const maxWords = Math.max(spokenWords.length, targetWords.length);

    targetWords.forEach((tw, i) => {
      const sw = spokenWords[i] || '';
      if (sw === tw) score += 2;
      else if (levenshteinSimilarity(sw, tw) > 0.7) score += 1.5;
      else if (soundsLike(sw, tw)) score += 1;
    });

    return Math.min(100, Math.round((score / (maxWords * 2)) * 100));
  }

  function levenshteinSimilarity(a, b) {
    if (!a || !b) return 0;
    const matrix = Array.from({ length: b.length + 1 }, (_, i) =>
      Array.from({ length: a.length + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
    );
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i-1] === a[j-1]
          ? matrix[i-1][j-1]
          : Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
      }
    }
    const dist = matrix[b.length][a.length];
    return 1 - dist / Math.max(a.length, b.length);
  }

  // Simple soundex-like comparison
  function soundsLike(a, b) {
    const simplify = s => s.replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1');
    return simplify(a) === simplify(b);
  }

  function isAvailable() { return !!SpeechRecognition; }
  function isSynthAvailable() { return !!synth; }

  return {
    startRecording, stopRecording, speak, speakSlow,
    scorePronunciation, isAvailable, isSynthAvailable,
    get isRecording() { return isRecording; }
  };
})();
