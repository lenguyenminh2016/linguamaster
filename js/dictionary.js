/**
 * dictionary.js — Dictionary Module
 * Supports: English (Free Dictionary API - Oxford/Cambridge style)
 *           Chinese (CC-CEDICT via Moedict API)
 */

const Dictionary = (() => {
  const EN_API = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

  // Moedict for Traditional Chinese (still useful for classical meanings)
  // CC-CEDICT JSON mirror hosted on GitHub
  const ZH_API = 'https://api.mymemory.translated.net/get';

  // ── ENGLISH LOOKUP ──────────────────────────────────
  async function lookupEnglish(word) {
    word = word.trim().toLowerCase();
    try {
      const res = await fetch(EN_API + encodeURIComponent(word));
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      return parseEnglishResult(data, word);
    } catch (err) {
      // Fallback to built-in dictionary
      return getBuiltInEN(word);
    }
  }

  function parseEnglishResult(data, word) {
    const entry = data[0];
    const phonetics = entry.phonetics || [];
    const phonetic = phonetics.find(p => p.text)?.text ||
                     phonetics[0]?.text || '';
    const audioUrl = phonetics.find(p => p.audio && p.audio.trim())?.audio || '';

    const meanings = (entry.meanings || []).map(m => ({
      pos: m.partOfSpeech,
      definitions: m.definitions.slice(0, 3).map(d => ({
        definition: d.definition,
        example: d.example || '',
        synonyms: (d.synonyms || []).slice(0, 5),
      })),
      synonyms: (m.synonyms || []).slice(0, 8),
      antonyms: (m.antonyms || []).slice(0, 4),
    }));

    return {
      lang: 'en',
      word: entry.word || word,
      phonetic,
      audioUrl,
      meanings,
      source: 'Oxford / Cambridge via Free Dictionary API',
      sourceUrl: `https://www.oxfordlearnersdictionaries.com/definition/english/${word}`,
    };
  }

  // ── CHINESE LOOKUP ───────────────────────────────────
  async function lookupChinese(word) {
    word = word.trim();
    // Try CC-CEDICT data embedded (common words) first, then fall back
    const built = getBuiltInZH(word);
    if (built) return built;

    // Try Moedict (Traditional Chinese, Taiwan standard — includes Classical)
    try {
      const res = await fetch(`https://www.moedict.tw/raw/${encodeURIComponent(word)}.json`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      return parseMoedictResult(data, word);
    } catch {
      return getBuiltInZH(word) || getFallbackZH(word);
    }
  }

  function parseMoedictResult(data, word) {
    const heteronyms = data.heteronyms || [];
    const meanings = heteronyms.map(h => {
      const pinyin = h.pinyin || '';
      const defs = (h.definitions || []).slice(0, 5).map(d => ({
        definition: d.def || '',
        example: (d.example || []).join('；'),
        pos: d.type || '',
        synonyms: [],
      }));
      return { pos: pinyin, definitions: defs, synonyms: [], antonyms: [] };
    });

    const mainPinyin = heteronyms[0]?.pinyin || '';

    return {
      lang: 'zh',
      word: data.title || word,
      pinyin: mainPinyin,
      phonetic: mainPinyin,
      radical: data.radical || '',
      strokeCount: data.stroke_count || '',
      meanings,
      source: 'CC-CEDICT / 教育部國語辭典 (北京標準)',
      audioUrl: '',
    };
  }

  // ── BUILT-IN EN DICTIONARY (fallback) ───────────────
  function getBuiltInEN(word) {
    const dict = {
      serendipity: {
        phonetic: '/ˌserənˈdɪpɪti/', meanings: [{ pos: 'noun', definitions: [{ definition: 'The occurrence and development of events by chance in a happy or beneficial way.', example: 'A fortunate stroke of serendipity brought them together.', synonyms: ['luck', 'fortune', 'chance'] }], synonyms: ['luck', 'fortune', 'providence', 'coincidence'], antonyms: ['misfortune'] }]
      },
      perseverance: {
        phonetic: '/ˌpɜːrsɪˈvɪərəns/', meanings: [{ pos: 'noun', definitions: [{ definition: 'Continued effort to do or achieve something despite difficulties, failure, or opposition.', example: 'His perseverance finally paid off.', synonyms: ['persistence', 'determination', 'tenacity'] }], synonyms: ['persistence', 'determination', 'tenacity', 'steadfastness'], antonyms: ['irresolution', 'laziness'] }]
      },
      ephemeral: {
        phonetic: '/ɪˈfem.ər.əl/', meanings: [{ pos: 'adjective', definitions: [{ definition: 'Lasting for only a short time; transitory.', example: 'Fame is ephemeral.', synonyms: ['fleeting', 'transient', 'momentary'] }], synonyms: ['fleeting', 'transient', 'momentary', 'brief'], antonyms: ['permanent', 'everlasting'] }]
      },
      ubiquitous: {
        phonetic: '/juːˈbɪk.wɪ.təs/', meanings: [{ pos: 'adjective', definitions: [{ definition: 'Present, appearing, or found everywhere.', example: 'Smartphones are now ubiquitous.', synonyms: ['omnipresent', 'pervasive', 'universal'] }], synonyms: ['omnipresent', 'pervasive', 'universal'], antonyms: ['rare', 'scarce'] }]
      },
      eloquent: {
        phonetic: '/ˈel.ə.kwənt/', meanings: [{ pos: 'adjective', definitions: [{ definition: 'Fluent or persuasive in speaking or writing.', example: 'She gave an eloquent speech.', synonyms: ['articulate', 'fluent', 'expressive'] }], synonyms: ['articulate', 'fluent', 'expressive', 'silver-tongued'], antonyms: ['inarticulate', 'mumbling'] }]
      }
    };

    const found = dict[word.toLowerCase()];
    if (found) {
      return {
        lang: 'en', word,
        phonetic: found.phonetic,
        audioUrl: '',
        meanings: found.meanings,
        source: 'LinguaMaster Built-in Dictionary',
        sourceUrl: `https://dictionary.cambridge.org/dictionary/english/${word}`,
      };
    }
    return null;
  }

  // ── BUILT-IN ZH DICTIONARY (fallback) ───────────────
  function getBuiltInZH(word) {
    const dict = {
      '美丽': { pinyin: 'měi lì', meanings: [{ pos: 'xíngróngcí (形容词)', definitions: [{ definition: '在外表或内在方面令人赏心悦目的；具有美好品质的。(Đẹp đẽ, xinh đẹp, có vẻ đẹp bề ngoài hoặc nội tâm)', example: '她很美丽。(Cô ấy rất xinh đẹp.)', synonyms: ['漂亮', '好看', '秀丽'] }], synonyms: ['漂亮', '好看', '秀丽', '俊美'], antonyms: ['丑陋'] }], hsk: 'HSK 4', radical: '女', strokeCount: 9 },
      '努力': { pinyin: 'nǔ lì', meanings: [{ pos: 'dòngcí (动词) / fùcí (副词)', definitions: [{ definition: '把力量尽量使出来；勤奋用力。(Cố gắng hết sức, nỗ lực)', example: '要努力学习。(Phải cố gắng học tập.)', synonyms: ['勤奋', '用功', '刻苦'] }], synonyms: ['勤奋', '用功', '刻苦', '勤劳'], antonyms: ['懒惰', '懈怠'] }], hsk: 'HSK 3', radical: '力', strokeCount: 7 },
      '学习': { pinyin: 'xué xí', meanings: [{ pos: 'dòngcí (动词)', definitions: [{ definition: '从阅读、听讲、研究、实践中获得知识或技能。(Học, học tập, tiếp thu kiến thức)', example: '我喜欢学习汉语。(Tôi thích học tiếng Trung.)', synonyms: ['学', '钻研', '进修'] }], synonyms: ['学', '钻研', '进修', '攻读'], antonyms: ['忘记', '遗忘'] }], hsk: 'HSK 1', radical: '子', strokeCount: 8 },
      '朋友': { pinyin: 'péng yǒu', meanings: [{ pos: 'míngcí (名词)', definitions: [{ definition: '在感情上相互亲近的人；互相有深厚感情的人。(Bạn bè, người bạn)', example: '他是我最好的朋友。(Anh ấy là người bạn thân nhất của tôi.)', synonyms: ['好友', '挚友', '知己'] }], synonyms: ['好友', '挚友', '知己', '伙伴'], antonyms: ['敌人', '陌生人'] }], hsk: 'HSK 1', radical: '月', strokeCount: 10 },
      '幸福': { pinyin: 'xìng fú', meanings: [{ pos: 'xíngróngcí/míngcí (形容词/名词)', definitions: [{ definition: '感到生活中充满欢乐、满足；心情愉快、满足。(Hạnh phúc, sung sướng)', example: '愿你永远幸福。(Chúc bạn mãi hạnh phúc.)', synonyms: ['快乐', '喜悦', '满足'] }], synonyms: ['快乐', '喜悦', '满足', '快活'], antonyms: ['痛苦', '悲伤', '不幸'] }], hsk: 'HSK 4', radical: '幸', strokeCount: 8 },
      '语言': { pinyin: 'yǔ yán', meanings: [{ pos: 'míngcí (名词)', definitions: [{ definition: '人类所特有的用来表达意思、交流思想的工具。(Ngôn ngữ, tiếng nói)', example: '语言是人类最重要的交流工具。(Ngôn ngữ là công cụ giao tiếp quan trọng nhất của con người.)', synonyms: ['话语', '言语'] }], synonyms: ['话语', '言语', '文字'], antonyms: [] }], hsk: 'HSK 4', radical: '言', strokeCount: 11 },
    };

    if (dict[word]) {
      const d = dict[word];
      return {
        lang: 'zh',
        word,
        pinyin: d.pinyin,
        phonetic: d.pinyin,
        radical: d.radical || '',
        strokeCount: d.strokeCount || '',
        hsk: d.hsk || '',
        meanings: d.meanings,
        source: 'CC-CEDICT / 北京语言大学 (Beijing Language Standard)',
        audioUrl: '',
      };
    }
    return null;
  }

  function getFallbackZH(word) {
    return {
      lang: 'zh',
      word,
      pinyin: '',
      phonetic: '',
      meanings: [{ pos: '未知', definitions: [{ definition: `Không tìm thấy "${word}" trong từ điển. Thử tra từ khác.`, example: '', synonyms: [] }], synonyms: [], antonyms: [] }],
      source: 'Không tìm thấy',
      audioUrl: '',
    };
  }

  // ── MAIN LOOKUP ─────────────────────────────────────
  async function lookup(word, lang) {
    if (!word) return null;
    if (lang === 'zh') return lookupChinese(word);
    return lookupEnglish(word);
  }

  // Auto-detect language
  function detectLang(word) {
    const chineseRegex = /[\u4e00-\u9fff\u3400-\u4dbf]/;
    return chineseRegex.test(word) ? 'zh' : 'en';
  }

  // ── RENDER RESULT ────────────────────────────────────
  function renderResult(result, container) {
    if (!result) {
      container.innerHTML = '<div class="dict-placeholder"><div class="dict-placeholder-icon">❌</div><p>Không tìm thấy từ này. Hãy kiểm tra lại chính tả.</p></div>';
      return;
    }

    const isZH = result.lang === 'zh';

    const wordClass = isZH ? 'dict-word-text dict-zh-word' : 'dict-word-text';
    const phoneticHtml = isZH
      ? `<span class="dict-zh-pinyin">${result.pinyin || ''}</span>`
      : `<span class="dict-phonetic-text">${result.phonetic || ''}</span>`;

    const extrasHtml = isZH ? `
      ${result.hsk ? `<span class="dict-zh-hsk">${result.hsk}</span>` : ''}
      ${result.radical ? `<span class="dict-zh-strokes">Bộ: <strong>${result.radical}</strong>${result.strokeCount ? ` | ${result.strokeCount} nét` : ''}</span>` : ''}
    ` : '';

    const meaningsHtml = result.meanings.map(m => `
      <div class="dict-meaning-block">
        <div class="dict-pos">${m.pos}</div>
        ${m.definitions.map((d, i) => `
          <div class="dict-definition">
            <span class="dict-def-num">${i + 1}.</span>
            ${d.definition}
          </div>
          ${d.example ? `<div class="dict-example">"${d.example}"</div>` : ''}
        `).join('')}
        ${m.synonyms && m.synonyms.length ? `
          <div class="dict-synonyms">
            <div class="dict-syns-label">Từ đồng nghĩa:</div>
            ${m.synonyms.map(s => `<span class="dict-syn-tag" data-word="${s}" data-lang="${result.lang}">${s}</span>`).join('')}
          </div>
        ` : ''}
        ${m.antonyms && m.antonyms.length ? `
          <div class="dict-synonyms">
            <div class="dict-syns-label" style="color:var(--accent-red)">Từ trái nghĩa:</div>
            ${m.antonyms.map(s => `<span class="dict-syn-tag" style="background:rgba(239,68,68,0.1);border-color:rgba(239,68,68,0.2);color:#f87171;" data-word="${s}" data-lang="${result.lang}">${s}</span>`).join('')}
          </div>
        ` : ''}
      </div>
    `).join('<hr style="border:none;border-top:1px solid var(--glass-border);margin:16px 0">');

    container.innerHTML = `
      <div class="dict-entry">
        <div class="dict-word-header">
          <div class="dict-word-main">
            <div class="${wordClass}">${result.word}</div>
            <div class="dict-phonetics">
              <div class="dict-phonetic-item">
                ${phoneticHtml}
                ${result.audioUrl ? `<button class="dict-speak-btn" id="dict-audio-btn" title="Nghe phát âm"><i class="fas fa-volume-high"></i></button>` : `<button class="dict-speak-btn" id="dict-tts-btn" data-word="${result.word}" data-lang="${result.lang}" title="Phát âm"><i class="fas fa-volume-high"></i></button>`}
              </div>
            </div>
            ${extrasHtml}
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
              <i class="fas fa-database" style="margin-right:4px"></i>${result.source}
              ${result.sourceUrl ? `<a href="${result.sourceUrl}" target="_blank" style="color:var(--accent-secondary);margin-left:8px">Xem đầy đủ ↗</a>` : ''}
            </div>
          </div>
          <button class="dict-save-btn" id="dict-save-btn" data-word="${result.word}" data-lang="${result.lang}">
            <i class="fas fa-bookmark"></i> Lưu vào Flashcard
          </button>
        </div>
        <div class="dict-meanings">${meaningsHtml}</div>
      </div>
    `;

    // Audio button
    const audioBtn = container.querySelector('#dict-audio-btn');
    if (audioBtn && result.audioUrl) {
      audioBtn.addEventListener('click', () => {
        new Audio(result.audioUrl).play().catch(() => Speech.speak(result.word, result.lang));
      });
    }

    const ttsBtn = container.querySelector('#dict-tts-btn');
    if (ttsBtn) {
      ttsBtn.addEventListener('click', () => Speech.speak(result.word, result.lang));
    }

    // Save button
    const saveBtn = container.querySelector('#dict-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const firstDef = result.meanings[0]?.definitions[0];
        Progress.addWord({
          word: result.word,
          lang: result.lang,
          phonetic: result.phonetic || '',
          meaning: firstDef?.definition || '',
          example: firstDef?.example || '',
          source: result.source,
        });
        Progress.recordActivity(5);
      });
    }

    // Synonym clicks
    container.querySelectorAll('.dict-syn-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const w = tag.dataset.word;
        const l = tag.dataset.lang;
        document.getElementById('dict-search-input').value = w;
        App.searchDictionary(w, l);
      });
    });
  }

  // Word popup for reading page
  async function showWordPopup(word, lang, targetEl) {
    const popup = document.getElementById('word-popup');
    const wordEl = document.getElementById('wp-word');
    const phoneticEl = document.getElementById('wp-phonetic');
    const bodyEl = document.getElementById('wp-body');

    wordEl.textContent = word;
    phoneticEl.textContent = '';
    bodyEl.innerHTML = '<div class="spinner"></div>';

    // Position popup
    const rect = targetEl.getBoundingClientRect();
    const scrollY = window.scrollY;
    popup.style.display = 'block';
    popup.style.left = Math.min(rect.left, window.innerWidth - 390) + 'px';
    popup.style.top = (rect.bottom + scrollY + 8) + 'px';

    // Fetch
    const result = await lookup(word, lang);
    if (!result) {
      bodyEl.innerHTML = '<p style="color:var(--text-muted)">Không tìm thấy từ này.</p>';
      return;
    }

    phoneticEl.textContent = result.phonetic || result.pinyin || '';

    const html = result.meanings.slice(0, 2).map(m => `
      <div class="wp-entry">
        <span class="wp-pos">${m.pos}</span>
        ${m.definitions.slice(0, 2).map(d => `
          <div class="wp-definition">${d.definition}</div>
          ${d.example ? `<div class="wp-example-text">${d.example}</div>` : ''}
        `).join('')}
      </div>
    `).join('');

    bodyEl.innerHTML = html;

    // Speak button
    document.getElementById('wp-speak-btn').onclick = () => Speech.speak(word, lang);

    // Save button
    document.getElementById('wp-save-btn').onclick = () => {
      const firstDef = result.meanings[0]?.definitions[0];
      Progress.addWord({
        word: result.word, lang: result.lang,
        phonetic: result.phonetic || result.pinyin || '',
        meaning: firstDef?.definition || '',
        example: firstDef?.example || '',
        source: result.source,
      });
      Progress.recordActivity(5);
    };
  }

  // Daily word feature
  const dailyWords = [
    { lang: 'en', word: 'serendipity', phonetic: '/ˌserənˈdɪpɪti/', meaning: 'The occurrence of events by chance in a happy way', example: 'It was pure serendipity that they met on that train.' },
    { lang: 'en', word: 'resilience', phonetic: '/rɪˈzɪl.i.əns/', meaning: 'The capacity to recover quickly from difficulties', example: 'Her resilience in the face of adversity was remarkable.' },
    { lang: 'en', word: 'ephemeral', phonetic: '/ɪˈfem.ər.əl/', meaning: 'Lasting for a very short time', example: 'The beauty of cherry blossoms is ephemeral.' },
    { lang: 'zh', word: '坚持', phonetic: 'jiān chí', meaning: 'Kiên trì, bền bỉ, tiếp tục cố gắng', example: '无论如何都要坚持下去。(Dù thế nào cũng phải kiên trì.)' },
    { lang: 'zh', word: '勇气', phonetic: 'yǒng qì', meaning: 'Dũng khí, can đảm', example: '你有勇气说出来。(Bạn có dũng khí nói ra điều đó.)' },
    { lang: 'en', word: 'eloquent', phonetic: '/ˈel.ə.kwənt/', meaning: 'Fluent or persuasive in speaking', example: 'She delivered an eloquent speech.' },
    { lang: 'zh', word: '温柔', phonetic: 'wēn róu', meaning: 'Dịu dàng, nhẹ nhàng, ân cần', example: '她说话很温柔。(Cô ấy nói chuyện rất dịu dàng.)' },
    { lang: 'en', word: 'ubiquitous', phonetic: '/juːˈbɪk.wɪ.təs/', meaning: 'Present or found everywhere', example: 'Smartphones have become ubiquitous.' },
  ];

  function renderDailyWord() {
    const container = document.getElementById('daily-word-card');
    if (!container) return;
    const today = new Date().getDay();
    const w = dailyWords[today % dailyWords.length];

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
        <div>
          <div class="dw-word ${w.lang === 'zh' ? 'font-zh' : ''}" style="${w.lang === 'zh' ? 'font-family:var(--font-zh)' : ''}">${w.word}</div>
          <div class="dw-phonetic">${w.phonetic}</div>
          <span class="source-badge ${w.lang === 'zh' ? 'beijing' : 'oxford'}" style="margin-bottom:8px;display:inline-block">${w.lang === 'en' ? 'Oxford' : '北京'}</span>
          <div class="dw-meaning">${w.meaning}</div>
          <div class="dw-example">${w.example}</div>
        </div>
        <div class="dw-actions">
          <button class="btn-outline" onclick="Speech.speak('${w.word}','${w.lang}')">
            <i class="fas fa-volume-high"></i> Nghe
          </button>
          <button class="btn-primary" onclick="
            Progress.addWord({word:'${w.word}',lang:'${w.lang}',phonetic:'${w.phonetic}',meaning:'${w.meaning.replace(/'/g,"\\'")}',example:'',source:'Daily Word'});
            Progress.recordActivity(10);
          ">
            <i class="fas fa-bookmark"></i> Lưu từ
          </button>
        </div>
      </div>
    `;
  }

  return { lookup, detectLang, renderResult, showWordPopup, renderDailyWord, dailyWords };
})();
