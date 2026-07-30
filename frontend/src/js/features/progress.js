/**
 * progress.js — Frontend User Progress & Gamification
 * Handles XP, streaks, word counts, achievements, and localStorage
 */

const Progress = (() => {
  const KEY = 'linguamaster_progress';

  const defaults = {
    streak: 0,
    lastStudyDate: null,
    totalXP: 0,
    wordsLearned: 0,
    accuracy: [],
    skillXP: { speaking: 0, listening: 0, reading: 0, writing: 0 },
    activityLog: {},
    achievements: [],
    flashcards: [],
    currentLang: 'en',
    level: { en: 0, zh: 0 },
  };

  let data = {};

  function load() {
    try {
      const saved = localStorage.getItem(KEY);
      data = saved ? { ...defaults, ...JSON.parse(saved) } : { ...defaults };
    } catch {
      data = { ...defaults };
    }
    checkStreak();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
  }

  function checkStreak() {
    const today = todayStr();
    if (!data.lastStudyDate) return;
    const last = new Date(data.lastStudyDate);
    const diff = daysDiff(last, new Date());
    if (diff > 1) { data.streak = 0; save(); }
  }

  function recordActivity(xpAmount = 10, skill = null) {
    const today = todayStr();
    data.activityLog[today] = (data.activityLog[today] || 0) + 1;

    // Streak
    if (data.lastStudyDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (data.lastStudyDate === fmtDate(yesterday)) {
        data.streak++;
      } else if (!data.lastStudyDate) {
        data.streak = 1;
      } else {
        data.streak = 1;
      }
      data.lastStudyDate = today;
    }

    // XP
    data.totalXP += xpAmount;
    if (skill && data.skillXP[skill] !== undefined) {
      data.skillXP[skill] += xpAmount;
    }

    save();
    updateUI();
    checkAchievements();
  }

  function addWord(wordObj) {
    const existing = data.flashcards.find(w => w.word === wordObj.word && w.lang === wordObj.lang);
    if (existing) {
      App && App.showToast('Từ này đã có trong thư viện!', 'info', 'fa-bookmark');
      return false;
    }
    data.flashcards.push({
      word: wordObj.word,
      lang: wordObj.lang,
      phonetic: wordObj.phonetic || '',
      meaning: wordObj.meaning || '',
      example: wordObj.example || '',
      source: wordObj.source || '',
      interval: 1,
      easeFactor: 2.5,
      nextReview: todayStr(),
      lastReview: null,
      repetitions: 0,
    });
    data.wordsLearned = data.flashcards.length;
    save();
    App && App.showToast(`Đã lưu từ "${wordObj.word}" vào Flashcard!`, 'success', 'fa-bookmark');
    return true;
  }

  function recordAccuracy(pct) {
    data.accuracy.push(pct);
    if (data.accuracy.length > 100) data.accuracy.shift();
    save();
  }

  function getAvgAccuracy() {
    if (!data.accuracy.length) return null;
    return Math.round(data.accuracy.reduce((a, b) => a + b, 0) / data.accuracy.length);
  }

  // SM-2 Spaced Repetition
  function rateFlashcard(index, rating) {
    const card = data.flashcards[index];
    if (!card) return;

    // SM-2 algorithm
    let ef = card.easeFactor + (0.1 - (4 - rating) * (0.08 + (4 - rating) * 0.02));
    ef = Math.max(1.3, ef);
    card.easeFactor = ef;

    if (rating < 2) {
      card.interval = 1;
      card.repetitions = 0;
    } else {
      if (card.repetitions === 0) card.interval = 1;
      else if (card.repetitions === 1) card.interval = 6;
      else card.interval = Math.round(card.interval * ef);
      card.repetitions++;
    }

    const next = new Date();
    next.setDate(next.getDate() + card.interval);
    card.nextReview = fmtDate(next);
    card.lastReview = todayStr();

    save();
  }

  function getDueFlashcards() {
    const today = todayStr();
    return data.flashcards
      .map((c, i) => ({ ...c, idx: i }))
      .filter(c => c.nextReview <= today)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview));
  }

  function getNewFlashcards() {
    return data.flashcards.filter(c => !c.lastReview).length;
  }

  function getLearnedFlashcards() {
    return data.flashcards.filter(c => c.repetitions >= 3).length;
  }

  function updateUI() {
    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('streak-count', data.streak);
    setEl('total-xp', data.totalXP);
    setEl('words-learned', data.wordsLearned);

    const avg = getAvgAccuracy();
    setEl('accuracy-rate', avg !== null ? avg + '%' : '—');

    // Sidebar level bar
    const levelFill = document.getElementById('sidebar-level-fill');
    if (levelFill) {
      const pct = Math.min((data.totalXP % 500) / 5, 100);
      levelFill.style.width = pct + '%';
    }

    // Flashcard stats
    const due = getDueFlashcards();
    setEl('fc-new', getNewFlashcards());
    setEl('fc-review', due.length);
    setEl('fc-learned', getLearnedFlashcards());
  }

  function buildActivityCalendar() {
    const container = document.getElementById('activity-calendar');
    if (!container) return;
    container.innerHTML = '';
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = fmtDate(d);
      const count = data.activityLog[key] || 0;
      let cls = 'cal-day';
      if (count >= 6) cls += ' active-4';
      else if (count >= 4) cls += ' active-3';
      else if (count >= 2) cls += ' active-2';
      else if (count >= 1) cls += ' active-1';
      const div = document.createElement('div');
      div.className = cls;
      div.title = `${fmtDateDisplay(d)}: ${count} hoạt động`;
      div.textContent = d.getDate();
      container.appendChild(div);
    }
  }

  function drawSkillsRadar() {
    const canvas = document.getElementById('skills-radar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2, r = 100;
    const skills = ['Nói', 'Nghe', 'Đọc', 'Viết'];
    const maxXP = 500;
    const values = [
      Math.min(data.skillXP.speaking / maxXP, 1),
      Math.min(data.skillXP.listening / maxXP, 1),
      Math.min(data.skillXP.reading / maxXP, 1),
      Math.min(data.skillXP.writing / maxXP, 1),
    ];
    const angles = skills.map((_, i) => (i * Math.PI * 2) / skills.length - Math.PI / 2);

    // Draw web
    for (let level = 1; level <= 4; level++) {
      ctx.beginPath();
      angles.forEach((angle, i) => {
        const x = cx + (r * level / 4) * Math.cos(angle);
        const y = cy + (r * level / 4) * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Draw axes
    angles.forEach(angle => {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw data polygon
    ctx.beginPath();
    angles.forEach((angle, i) => {
      const val = values[i];
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(124,58,237,0.25)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(124,58,237,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    angles.forEach((angle, i) => {
      const x = cx + (r + 20) * Math.cos(angle);
      const y = cy + (r + 20) * Math.sin(angle);
      ctx.fillText(skills[i], x, y + 5);
    });

    // Draw dots
    angles.forEach((angle, i) => {
      const val = values[i];
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#7c3aed';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  }

  function buildAchievements() {
    const container = document.getElementById('achievements-grid');
    if (!container) return;
    const list = [
      { id: 'first_word', icon: '📚', name: 'Từ Đầu Tiên', desc: 'Học từ vựng đầu tiên', check: () => data.wordsLearned >= 1 },
      { id: 'ten_words', icon: '🔖', name: 'Bộ Sưu Tập', desc: 'Học 10 từ vựng', check: () => data.wordsLearned >= 10 },
      { id: 'streak_3', icon: '🔥', name: 'Kiên Trì', desc: 'Học 3 ngày liên tiếp', check: () => data.streak >= 3 },
      { id: 'streak_7', icon: '⚡', name: 'Không Thể Cản', desc: 'Học 7 ngày liên tiếp', check: () => data.streak >= 7 },
      { id: 'xp_100', icon: '⭐', name: 'Học Sinh Chăm', desc: 'Đạt 100 XP', check: () => data.totalXP >= 100 },
      { id: 'xp_500', icon: '🌟', name: 'Học Sinh Xuất Sắc', desc: 'Đạt 500 XP', check: () => data.totalXP >= 500 },
      { id: 'speak_master', icon: '🎤', name: 'Giọng Chuẩn', desc: '50 XP luyện nói', check: () => data.skillXP.speaking >= 50 },
      { id: 'write_master', icon: '✍️', name: 'Bút Sắc', desc: '50 XP luyện viết', check: () => data.skillXP.writing >= 50 },
    ];

    container.innerHTML = list.map(a => {
      const earned = a.check();
      return `<div class="achievement-item ${earned ? 'earned' : ''}">
        <span class="achievement-icon">${a.icon}</span>
        <div class="achievement-name">${a.name}</div>
        <div class="achievement-desc">${a.desc}</div>
      </div>`;
    }).join('');
  }

  function checkAchievements() {
    // Could trigger toast on new achievement
  }

  function updateProgressPage() {
    buildActivityCalendar();
    drawSkillsRadar();
    buildAchievements();

    // Circular progress EN
    const enPct = Math.min(data.skillXP.speaking + data.skillXP.listening + data.skillXP.reading + data.skillXP.writing, 2000) / 20;
    updateCircle('en-cp-fill', 'en-progress-text', enPct);

    const enLabel = document.getElementById('en-level-label');
    if (enLabel) {
      const lvl = enPct < 20 ? 'Beginner (A1)' : enPct < 40 ? 'Elementary (A2)' : enPct < 60 ? 'Intermediate (B1)' : enPct < 80 ? 'Upper-Intermediate (B2)' : 'Advanced (C1+)';
      enLabel.textContent = lvl;
    }

    // ZH progress (simplified estimate)
    const zhPct = Math.min(data.wordsLearned * 2, 100);
    updateCircle('zh-cp-fill', 'zh-progress-text', zhPct);

    const zhLabel = document.getElementById('zh-level-label');
    if (zhLabel) {
      const lvl = zhPct < 20 ? 'HSK 1' : zhPct < 40 ? 'HSK 2' : zhPct < 60 ? 'HSK 3' : zhPct < 80 ? 'HSK 4' : 'HSK 5+';
      zhLabel.textContent = lvl;
    }
  }

  function updateCircle(fillId, textId, pct) {
    const fillEl = document.getElementById(fillId);
    const textEl = document.getElementById(textId);
    if (!fillEl || !textEl) return;
    const circumference = 2 * Math.PI * 40; // r=40
    const offset = circumference - (pct / 100) * circumference;
    fillEl.style.strokeDashoffset = offset;
    textEl.textContent = Math.round(pct) + '%';
  }

  // Helpers
  function todayStr() { return fmtDate(new Date()); }
  function fmtDate(d) { return d.toISOString().split('T')[0]; }
  function fmtDateDisplay(d) { return d.toLocaleDateString('vi-VN'); }
  function daysDiff(d1, d2) { return Math.floor((d2 - d1) / 86400000); }

  return {
    load, save, recordActivity, addWord, recordAccuracy, getAvgAccuracy,
    rateFlashcard, getDueFlashcards, getNewFlashcards, getLearnedFlashcards,
    updateUI, updateProgressPage, buildActivityCalendar,
    get flashcards() { return data.flashcards; },
    get streak() { return data.streak; },
    get totalXP() { return data.totalXP; },
    get wordsLearned() { return data.wordsLearned; },
    get currentLang() { return data.currentLang; },
    set currentLang(v) { data.currentLang = v; save(); },
  };
})();
