/**
 * ai-tutor.js — AI Professor Module
 * Rule-based grammar checker + comprehensive language knowledge base
 * Handles: Chat responses, grammar correction, vocabulary teaching
 */

const AITutor = (() => {
  let currentLang = 'en';

  // ── ENGLISH GRAMMAR RULES ────────────────────────────
  const grammarRules = {
    en: [
      // Article errors
      { pattern: /\ba\s+([aeiouAEIOU]\w+)/gi, correction: (m) => 'an ' + m.replace(/^a\s+/i,''), type: 'article', desc: 'Dùng "an" trước âm nguyên âm (a apple → an apple)' },
      { pattern: /\ban\s+([^aeiouAEIOU\s]\w*)/gi, correction: (m) => 'a ' + m.replace(/^an\s+/i,''), type: 'article', desc: 'Dùng "a" trước âm phụ âm (an book → a book)' },

      // Subject-verb agreement  
      { pattern: /\b(he|she|it)\s+(have)\b/gi, correction: 'has', type: 'subject-verb', desc: 'He/She/It + "has" (không phải "have")' },
      { pattern: /\b(I|we|they|you)\s+(has)\b/gi, correction: 'have', type: 'subject-verb', desc: 'I/We/They/You + "have" (không phải "has")' },
      { pattern: /\b(he|she|it)\s+(are)\b/gi, correction: 'is', type: 'subject-verb', desc: 'He/She/It + "is" (không phải "are")' },
      { pattern: /\b(I)\s+(are)\b/gi, correction: 'am', type: 'subject-verb', desc: 'I + "am" (không phải "are")' },
      { pattern: /\b(he|she|it)\s+(were)\b/gi, correction: 'was', type: 'subject-verb', desc: 'He/She/It + "was" (không phải "were")' },
      { pattern: /\b(I)\s+(were)\b/gi, correction: 'was', type: 'subject-verb', desc: 'I + "was" (không phải "were")' },

      // Double negatives
      { pattern: /\bdon't\s+have\s+no\b/gi, correction: "don't have any", type: 'double-negative', desc: 'Tránh phủ định kép: "don\'t have any"' },
      { pattern: /\bcan't\s+do\s+nothing\b/gi, correction: "can't do anything", type: 'double-negative', desc: 'Phủ định kép: "can\'t do anything"' },

      // Common wrong words
      { pattern: /\b(your)\s+(welcome)\b/gi, correction: "you're welcome", type: 'word-form', desc: '"You\'re welcome" (you are welcome)' },
      { pattern: /\b(their)\s+(is|are|was|were)\b/gi, correction: 'there', type: 'homophone', desc: 'Nhầm "their" và "there": dùng "there" trước động từ' },
      { pattern: /\bshould\s+of\b/gi, correction: 'should have', type: 'modal', desc: '"Should have" (không phải "should of")' },
      { pattern: /\bcould\s+of\b/gi, correction: 'could have', type: 'modal', desc: '"Could have" (không phải "could of")' },
      { pattern: /\bwould\s+of\b/gi, correction: 'would have', type: 'modal', desc: '"Would have" (không phải "would of")' },

      // Prepositions
      { pattern: /\bmarried\s+with\b/gi, correction: 'married to', type: 'preposition', desc: 'Married + "to" (không phải "with")' },
      { pattern: /\bdepend\s+of\b/gi, correction: 'depend on', type: 'preposition', desc: 'Depend + "on" (không phải "of")' },
      { pattern: /\blisten\s+(?:the|music|to\s+the)?\b/gi, correction: 'listen to', type: 'preposition', desc: 'Listen + "to"' },

      // Tense errors
      { pattern: /\byesterday\s+I\s+(?:go|eat|come|see|do|make|take)\b/gi, type: 'tense', desc: 'Dùng quá khứ đơn với "yesterday" (went, ate, came, saw, did, made, took)' },
      { pattern: /\b(since|for)\s+(\d+)\s+(year|month|day)s?\s+(ago)\b/gi, type: 'tense', desc: '"Since/for" không dùng với "ago". Dùng "X years ago" hoặc "for X years"' },
    ],
    zh: [
      { pattern: /我很喜欢你/g, type: 'tone', desc: '"我很喜欢你" — câu đúng trong tiếng Trung thông thường' },
      { pattern: /(\S+)的的(\S+)/g, correction: '$1的$2', type: 'duplication', desc: 'Không lặp "的": chỉ dùng một lần' },
    ]
  };

  // ── KNOWLEDGE BASE ───────────────────────────────────
  const knowledgeBase = {
    // English Grammar Topics
    'since|for difference|since vs for': {
      answer: `## "Since" vs "For" trong tiếng Anh

**SINCE** — dùng với **thời điểm cụ thể** (mốc bắt đầu):
> I have lived here **since** 2015.  
> She has been waiting **since** 9 o'clock.

**FOR** — dùng với **khoảng thời gian** (độ dài):
> I have lived here **for** 8 years.  
> She has been waiting **for** 2 hours.

💡 **Mẹo nhớ**: Since = "từ khi" (một điểm). For = "trong vòng" (một khoảng).

❌ **Sai**: I haven't seen him since 3 weeks.  
✅ **Đúng**: I haven't seen him **for** 3 weeks.`,
      xp: 15
    },

    'passive voice|câu bị động|passive': {
      answer: `## Câu Bị Động (Passive Voice) trong Tiếng Anh

**Cấu trúc**: Subject + **be** (chia thì) + **V3** (past participle) + (by + agent)

**Các thì phổ biến:**

| Thì | Active | Passive |
|---|---|---|
| Hiện tại đơn | writes | is written |
| Hiện tại tiếp diễn | is writing | is being written |
| Quá khứ đơn | wrote | was written |
| Tương lai đơn | will write | will be written |
| Hiện tại hoàn thành | has written | has been written |

**Ví dụ:**
- The cat **ate** the fish. → The fish **was eaten** by the cat.
- They **are building** a new school. → A new school **is being built**.

🔑 Dùng bị động khi: không biết chủ thể, chủ thể không quan trọng, hoặc muốn nhấn mạnh tân ngữ.`,
      xp: 20
    },

    'articles|a an the|article': {
      answer: `## Mạo Từ trong Tiếng Anh: A, An, The

### **A / AN** — Mạo từ không xác định
- Dùng khi đề cập **lần đầu** hoặc **vật không cụ thể**
- **A** + phụ âm: **a** book, **a** cat, **a** university (/j/ sound)
- **AN** + nguyên âm: **an** apple, **an** hour (h câm), **an** umbrella

### **THE** — Mạo từ xác định
Dùng khi:
1. Đã đề cập trước đó: *I saw **a** dog. **The** dog was big.*
2. Chỉ có 1 cái duy nhất: **the** sun, **the** moon, **the** President
3. Trước danh từ cụ thể: **the** book on the table

### **Không dùng mạo từ (Zero Article)**
- Danh từ số nhiều chung: *I love **dogs**.*
- Tên riêng: *She lives in **Vietnam**.*
- Bữa ăn, môn học: *I had **breakfast**. I study **math**.*

❌ **Sai**: I am **the** student.  
✅ **Đúng**: I am **a** student. (lần đầu đề cập)`,
      xp: 20
    },

    'conditional|if clause|câu điều kiện': {
      answer: `## Câu Điều Kiện (Conditionals) trong Tiếng Anh

### **Type 0 — Sự thật hiển nhiên**
> If + Simple Present, Simple Present  
> *If you heat water to 100°C, it **boils**.*

### **Type 1 — Có thể xảy ra (tương lai)**
> If + Simple Present, will + V  
> *If it **rains**, I **will** stay home.*

### **Type 2 — Khó/không có thể xảy ra (hiện tại)**
> If + Simple Past, would + V  
> *If I **were** you, I **would** study harder.*

### **Type 3 — Không thể xảy ra (quá khứ)**
> If + Past Perfect, would have + V3  
> *If she **had studied**, she **would have passed** the exam.*

### **Mixed Conditional**
> *If I **had studied** harder (quá khứ), I **would be** a doctor now (hiện tại).*

💡 **Mẹo**: Type 2 dùng "were" cho mọi chủ ngữ (I/he/she/it were)`,
      xp: 25
    },

    '了 le|le particle|chinese le': {
      answer: `## 粒子 "了" (le) trong Tiếng Trung

"了" có **2 cách dùng** chính:

### **① 了 (le) — Động từ + 了 = Hành động đã hoàn thành**
> 我**吃了**。(Wǒ chī le.) — Tôi ăn xong rồi.  
> 他**来了**。(Tā lái le.) — Anh ấy đến rồi.

❌ **Chú ý**: Không phải lúc nào "đã" cũng cần 了!  
> 我昨天吃饭。(Wǒ zuótiān chīfàn.) — Tôi đã ăn hôm qua. (không cần 了)

### **② 了 (le) — Cuối câu = Tình huống mới/thay đổi**
> 我知道**了**。(Wǒ zhīdào le.) — Tôi hiểu rồi (mới biết).  
> 春天**了**！(Chūntiān le!) — Xuân đến rồi!

### **③ Phủ định: Không dùng 了 với 没 (méi)**
> ❌ 我没吃了。  
> ✅ 我**没吃**。— Tôi chưa ăn.

💡 **Tóm tắt**: Verb + 了 = hoàn thành | Câu + 了 = thay đổi trạng thái`,
      xp: 25
    },

    '的 地 得|de particles|chinese de': {
      answer: `## Ba loại "de" (的 地 得) trong Tiếng Trung

### **的 (de)** — Liên kết tính từ/sở hữu với danh từ
> **Cấu trúc**: Tính từ/Danh từ + **的** + Danh từ  
> 漂亮**的**女孩 (piàoliang de nǚhái) — cô gái xinh đẹp  
> 我**的**书 (wǒ de shū) — sách của tôi

### **地 (de)** — Liên kết trạng từ với động từ
> **Cấu trúc**: Trạng từ + **地** + Động từ  
> 快乐**地**跑 (kuàilè de pǎo) — chạy vui vẻ  
> 认真**地**学习 (rènzhēn de xuéxí) — học tập nghiêm túc

### **得 (de)** — Liên kết động từ với bổ ngữ kết quả
> **Cấu trúc**: Động từ + **得** + Bổ ngữ  
> 说**得**很好 (shuō de hěn hǎo) — nói rất tốt  
> 跑**得**快 (pǎo de kuài) — chạy nhanh

### Cách nhớ nhanh:
| Ký tự | Kết nối | Ví dụ |
|---|---|---|
| 的 | Adj → **的** → Noun | 好**的**人 |
| 地 | Adv → **地** → Verb | 快**地**走 |
| 得 | Verb → **得** → Complement | 走**得**快 |`,
      xp: 30
    },

    'hsk 4|hsk4 grammar|hsk four': {
      answer: `## Ngữ pháp HSK 4 — Các Cấu Trúc Quan Trọng

### **1. 只要...就... (Chỉ cần...thì...)**
> **只要**努力，**就**能成功。  
> (Chỉ cần nỗ lực, thì sẽ thành công.)

### **2. 不管...都... (Dù...cũng...)**
> **不管**下不下雨，我**都**要去。  
> (Dù mưa hay không, tôi cũng sẽ đi.)

### **3. 既然...就... (Đã...thì...)**
> **既然**你来了，**就**帮我一下吧。  
> (Đã đến rồi, thì giúp tôi một chút đi.)

### **4. 越来越... (Ngày càng...)**
> 天气**越来越**热了。(Thời tiết ngày càng nóng.)

### **5. 连...都/也... (Ngay cả...cũng...)**
> **连**小孩子**都**知道。  
> (Ngay cả trẻ con cũng biết.)

### **6. 对...来说 (Đối với...mà nói)**
> **对**我**来说**，这很重要。  
> (Đối với tôi, điều này rất quan trọng.)`,
      xp: 30
    },

    'business english|tiếng anh thương mại|vocabulary business': {
      answer: `## 5 Từ Vựng Tiếng Anh Thương Mại Nâng Cao

### 1. **Synergy** /ˈsɪn.ər.dʒi/ (n.)
> Sự cộng hưởng, tác động kết hợp tạo ra hiệu quả lớn hơn.  
> *The merger created **synergy** between the two teams.*

### 2. **Leverage** /ˈlev.ər.ɪdʒ/ (v/n.)
> Tận dụng (sức mạnh/nguồn lực); đòn bẩy.  
> *We need to **leverage** our existing customer base.*

### 3. **Bandwidth** /ˈbænd.wɪdθ/ (n.) [informal]
> Khả năng, thời gian/năng lực để xử lý thêm công việc.  
> *Do you have the **bandwidth** to take on this project?*

### 4. **Pivot** /ˈpɪv.ət/ (v.)
> Xoay chiến lược, thay đổi hướng kinh doanh.  
> *The company decided to **pivot** toward e-commerce.*

### 5. **KPI** — Key Performance Indicator
> Chỉ số đánh giá hiệu quả hoạt động.  
> *We need to set clear **KPIs** for this quarter.*

💼 **Bonus**: "Circle back" = liên lạc lại | "Take offline" = thảo luận riêng | "Low-hanging fruit" = cơ hội dễ nắm bắt`,
      xp: 20
    },

    'default_en': {
      answer: null // Will use intelligent response generation
    }
  };

  // ── GRAMMAR CHECKER ──────────────────────────────────
  function checkGrammar(text, lang = 'en') {
    if (lang === 'zh') return checkChineseGrammar(text);
    return checkEnglishGrammar(text);
  }

  function checkEnglishGrammar(text) {
    const errors = [];
    const corrections = [];
    let correctedText = text;

    grammarRules.en.forEach(rule => {
      if (rule.pattern) {
        const matches = [...text.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))];
        matches.forEach(match => {
          errors.push({
            type: rule.type,
            original: match[0],
            correction: rule.correction,
            desc: rule.desc,
            index: match.index,
          });
          if (rule.correction) {
            correctedText = correctedText.replace(match[0], rule.correction);
          }
        });
      }
    });

    // Sentence-level checks
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
    sentences.forEach(sentence => {
      const s = sentence.trim();

      // Check starting with lowercase (unless 'i')
      if (s.length > 0 && s[0] === s[0].toLowerCase() && s[0] !== 'i' && /[a-z]/.test(s[0])) {
        errors.push({ type: 'capitalization', original: s[0], correction: s[0].toUpperCase(), desc: 'Bắt đầu câu phải viết hoa' });
      }

      // Check "i" lowercase
      const iRegex = /\s+i\s+/g;
      let m;
      while ((m = iRegex.exec(s)) !== null) {
        errors.push({ type: 'capitalization', original: 'i', correction: 'I', desc: 'Đại từ "I" luôn viết hoa' });
      }
    });

    return { errors, correctedText, isCorrect: errors.length === 0 };
  }

  function checkChineseGrammar(text) {
    const errors = [];
    // Basic Chinese checks
    if (/的的/.test(text)) errors.push({ type: 'duplication', desc: '重复的 "的"：只需一个' });
    if (/是很/.test(text)) errors.push({ type: 'structure', desc: '通常说 "很...的", 不说 "是很..."' });
    return { errors, correctedText: text, isCorrect: errors.length === 0 };
  }

  // ── RESPONSE GENERATOR ───────────────────────────────
  function generateResponse(userMessage, lang) {
    const msg = userMessage.toLowerCase();

    // Find matching knowledge base entry
    for (const [keys, entry] of Object.entries(knowledgeBase)) {
      if (keys === 'default_en') continue;
      const keyList = keys.split('|');
      if (keyList.some(k => msg.includes(k.toLowerCase()))) {
        return { text: entry.answer, xp: entry.xp || 10, type: 'knowledge' };
      }
    }

    // Grammar correction request
    if (msg.includes('sửa') || msg.includes('kiểm tra') || msg.includes('correct') || msg.includes('check') || msg.includes('grammar')) {
      return generateGrammarFeedback(userMessage, lang);
    }

    // Translation request
    if (msg.includes('translate') || msg.includes('dịch') || msg.includes('what does') || msg.includes('nghĩa là gì')) {
      return generateTranslationHelp(userMessage, lang);
    }

    // Vocabulary request
    if (msg.includes('vocabulary') || msg.includes('từ vựng') || msg.includes('word') || msg.includes('synonym')) {
      return generateVocabHelp(userMessage, lang);
    }

    // Pronunciation help
    if (msg.includes('pronounce') || msg.includes('pronunciation') || msg.includes('phát âm') || msg.includes('how to say')) {
      return generatePronunciationHelp(userMessage, lang);
    }

    // Conversation practice
    if (msg.includes('hello') || msg.includes('hi ') || msg.includes('xin chào') || msg.includes('你好')) {
      return generateGreeting(lang);
    }

    // Default intelligent response
    return generateContextualResponse(userMessage, lang);
  }

  function generateGrammarFeedback(text, lang) {
    // Extract the sentence to check
    const sentence = text.replace(/sửa giúp|kiểm tra|correct this|check this|sửa câu|grammar check/gi, '').trim();
    if (!sentence || sentence.length < 3) {
      return {
        text: 'Hãy nhập câu bạn muốn kiểm tra ngữ pháp. Ví dụ: "Sửa giúp tôi câu này: He don\'t like apples"',
        xp: 0
      };
    }

    const result = checkGrammar(sentence, lang);
    if (result.isCorrect) {
      return {
        text: `✅ **Câu của bạn hoàn toàn đúng!** Không có lỗi ngữ pháp nào được tìm thấy.\n\n> "${sentence}"\n\n👏 Tiếp tục phát huy!`,
        xp: 10
      };
    }

    const errList = result.errors.map(e => `- ❌ **${e.type}**: "${e.original}" → ✅ "${e.correction || '?'}"\n  💡 ${e.desc}`).join('\n');
    return {
      text: `📝 **Phân tích ngữ pháp:**\n\n**Câu gốc:** "${sentence}"\n\n**Lỗi tìm thấy:**\n${errList}\n\n${result.correctedText !== sentence ? `**Câu đúng:** ✅ "${result.correctedText}"` : ''}`,
      xp: 15
    };
  }

  function generateTranslationHelp(msg, lang) {
    const responses = [
      'Để tôi giúp bạn với bản dịch đó! Bạn có thể dùng công cụ Từ Điển bên trái để tra nghĩa đầy đủ bất kỳ từ nào.',
      'Bạn muốn dịch câu nào? Hãy gõ câu cụ thể và tôi sẽ giải thích chi tiết.',
    ];
    return { text: responses[Math.floor(Math.random() * responses.length)], xp: 5 };
  }

  function generateVocabHelp(msg, lang) {
    if (lang === 'en') {
      const words = [
        { word: 'Procrastinate', phonetic: '/prəˈkræs.tɪ.neɪt/', meaning: 'Trì hoãn công việc', example: 'Stop procrastinating and start studying!' },
        { word: 'Meticulous', phonetic: '/məˈtɪk.jə.ləs/', meaning: 'Tỉ mỉ, cẩn thận đến từng chi tiết', example: 'She is meticulous in her work.' },
        { word: 'Eloquent', phonetic: '/ˈel.ə.kwənt/', meaning: 'Hùng hồn, có khả năng diễn đạt tốt', example: 'His eloquent speech moved the audience.' },
        { word: 'Tenacious', phonetic: '/tɪˈneɪ.ʃəs/', meaning: 'Kiên trì, bền bỉ', example: 'She is tenacious in pursuing her goals.' },
      ];
      const w = words[Math.floor(Math.random() * words.length)];
      return {
        text: `📚 **Từ vựng nâng cao hôm nay:**\n\n## ${w.word}\n**Phiên âm:** ${w.phonetic}\n**Nghĩa:** ${w.meaning}\n**Ví dụ:** *"${w.example}"*\n\n💡 Nhấn "Lưu từ" để thêm vào Flashcard!`,
        xp: 10
      };
    } else {
      const words = [
        { word: '坚持不懈', pinyin: 'jiān chí bù xiè', meaning: 'Kiên trì không ngừng nghỉ', example: '学习汉语要坚持不懈。' },
        { word: '精益求精', pinyin: 'jīng yì qiú jīng', meaning: 'Không ngừng hoàn thiện, tinh tế hơn nữa', example: '他精益求精的精神值得学习。' },
      ];
      const w = words[Math.floor(Math.random() * words.length)];
      return {
        text: `📚 **Thành ngữ Tiếng Trung:**\n\n## ${w.word}\n**Pinyin:** ${w.pinyin}\n**Nghĩa:** ${w.meaning}\n**Ví dụ:** *"${w.example}"*`,
        xp: 15
      };
    }
  }

  function generatePronunciationHelp(msg, lang) {
    if (lang === 'zh') {
      return {
        text: `## Hướng dẫn Phát âm Tiếng Trung (Putonghua)

**4 Thanh điệu cơ bản:**
- **Thanh 1 (ˉ)**: Giọng cao, đều. Ví dụ: 妈 (mā) = mẹ
- **Thanh 2 (ˊ)**: Giọng lên. Ví dụ: 麻 (má) = vừng
- **Thanh 3 (ˇ)**: Giọng xuống rồi lên. Ví dụ: 马 (mǎ) = ngựa  
- **Thanh 4 (ˋ)**: Giọng xuống mạnh. Ví dụ: 骂 (mà) = chửi

**Phụ âm khó:**
- **zh/ch/sh/r**: Cong lưỡi (retroflex)
- **z/c/s**: Không cong lưỡi
- **q/x/j**: Phát từ phần giữa miệng

💡 Bạn có thể luyện phát âm tại trang **Luyện Nói**!`,
        xp: 15
      };
    }
    return {
      text: `## Hướng dẫn Phát âm Tiếng Anh

**Nguyên âm khó:**
- **/æ/** (cat, bad): Há miệng rộng, lưỡi thấp
- **/ɜː/** (bird, word): Môi tròn nhẹ
- **/θ/** (think, three): Đặt lưỡi giữa 2 hàm răng
- **/ð/** (the, this): Giống /θ/ nhưng có thanh

**Phụ âm:**
- **/w/** vs **/v/**: W không chạm răng, V chạm răng
- **/r/**: Cong lưỡi nhẹ, không chạm vào đâu

**Trọng âm (Word Stress):**
Hầu hết danh từ 2 âm tiết → trọng âm ở âm 1: **TA**-ble, **WIN**-dow

💡 Luyện thêm tại trang **Luyện Nói** với tính năng chấm điểm!`,
      xp: 15
    };
  }

  function generateGreeting(lang) {
    const greetings = [
      `Chào mừng! Tôi rất vui được học cùng bạn hôm nay! 😊\n\nBạn muốn luyện gì? Tôi có thể:\n- 📖 Giải thích ngữ pháp\n- 🔤 Dạy từ vựng theo chủ đề\n- ✍️ Sửa lỗi câu của bạn\n- 🎤 Hướng dẫn phát âm\n\nHãy bắt đầu nhé!`,
      `Hello! Great to see you today! 🎓\n\nWhat would you like to practice?\n- Grammar correction\n- Vocabulary building\n- Pronunciation tips\n- Conversation practice\n\nJust ask me anything!`,
    ];
    return { text: greetings[Math.floor(Math.random() * greetings.length)], xp: 5 };
  }

  function generateContextualResponse(msg, lang) {
    // Check if user is writing a sentence that needs checking
    const hasSentence = msg.split(' ').length > 4 && /[a-zA-Z\u4e00-\u9fff]/.test(msg);

    if (hasSentence) {
      const grammarResult = checkGrammar(msg, lang);
      if (!grammarResult.isCorrect && grammarResult.errors.length > 0) {
        const errList = grammarResult.errors.slice(0, 3).map(e =>
          `- ❌ **${e.type}**: ${e.desc}`
        ).join('\n');

        return {
          text: `Tôi thấy câu của bạn có thể cải thiện! 📝\n\n**Nhận xét:**\n${errList}\n\n${grammarResult.correctedText !== msg ? `**Gợi ý:** "${grammarResult.correctedText}"` : ''}\n\n💬 Bạn muốn tôi giải thích thêm về điểm ngữ pháp nào không?`,
          xp: 10
        };
      }
    }

    // Generic helpful responses
    const genericResponses = lang === 'en' ? [
      `Great question! 🎓 As a language professor, I'd suggest focusing on this.\n\nCould you be more specific? For example:\n- "Explain the difference between X and Y"\n- "Check my grammar: [your sentence]"\n- "Teach me vocabulary about [topic]"\n\nI'm here to help you master English and Chinese!`,
      `That's an interesting point! Let me help you explore this topic further.\n\nTry asking me something specific like:\n- A grammar rule you're unsure about\n- A vocabulary question\n- "Correct this sentence: ..."\n\nOr use the **Luyện Nói** section to practice speaking!`,
    ] : [
      `很好的问题！🎓 让我来帮你。\n\n你可以问我:\n- 语法问题 (ngữ pháp)\n- 词汇解释 (từ vựng)\n- "请帮我改正：[你的句子]"\n- 成语解释 (thành ngữ)\n\n我随时为你服务！`,
    ];

    return {
      text: genericResponses[Math.floor(Math.random() * genericResponses.length)],
      xp: 5
    };
  }

  // ── RENDER MARKDOWN ──────────────────────────────────
  function renderMarkdown(text) {
    return text
      // Headers
      .replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:var(--text-accent);margin:10px 0 6px">$1</h3>')
      .replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;color:var(--text-primary);margin:8px 0 4px">$1</h4>')
      // Bold
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-accent)">$1</strong>')
      // Italic
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code inline
      .replace(/`(.+?)`/g, '<code style="background:rgba(124,58,237,0.2);padding:1px 6px;border-radius:4px;font-family:var(--font-mono);font-size:12px">$1</code>')
      // Blockquote
      .replace(/^> (.+)$/gm, '<div style="border-left:3px solid var(--accent-primary);padding-left:12px;color:var(--text-secondary);margin:6px 0;font-style:italic">$1</div>')
      // Table (basic)
      .replace(/\|(.+)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim() && !c.match(/^[-\s|]+$/));
        if (!cells.length) return match;
        return '<span style="display:flex;gap:16px;font-family:var(--font-mono);font-size:12px">' + cells.map(c => `<span>${c.trim()}</span>`).join('') + '</span>';
      })
      // List items
      .replace(/^- (.+)$/gm, '<li style="margin:3px 0;padding-left:4px">$1</li>')
      .replace(/(<li.*<\/li>)+/gs, '<ul style="padding-left:16px;margin:8px 0">$&</ul>')
      // Newlines
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  return {
    generateResponse,
    checkGrammar,
    renderMarkdown,
    set currentLang(l) { currentLang = l; },
    get currentLang() { return currentLang; }
  };
})();
