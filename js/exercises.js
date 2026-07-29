/**
 * exercises.js — All Exercise Types
 * Listening, Speaking phrases, Reading articles, Writing prompts
 */

const Exercises = (() => {

  // ══════════════════════════════════════════════════
  //  SPEAKING PHRASES DATABASE
  // ══════════════════════════════════════════════════
  const speakingPhrases = {
    en: {
      daily: {
        A1: [
          { text: 'Hello, how are you?', trans: 'Xin chào, bạn khỏe không?' },
          { text: 'My name is Anna.', trans: 'Tên tôi là Anna.' },
          { text: 'I live in Vietnam.', trans: 'Tôi sống ở Việt Nam.' },
          { text: 'Thank you very much!', trans: 'Cảm ơn bạn rất nhiều!' },
          { text: 'Where is the bathroom?', trans: 'Phòng vệ sinh ở đâu?' },
        ],
        B1: [
          { text: 'I was wondering if you could help me with this.', trans: 'Tôi tự hỏi liệu bạn có thể giúp tôi với điều này không.' },
          { text: 'Could you please repeat that more slowly?', trans: 'Bạn có thể nhắc lại chậm hơn không?' },
          { text: 'I would appreciate your feedback on my work.', trans: 'Tôi sẽ rất trân trọng phản hồi của bạn về công việc của tôi.' },
          { text: 'It seems like we have a misunderstanding.', trans: 'Có vẻ chúng ta đã có sự hiểu lầm.' },
        ],
        C1: [
          { text: 'The implications of this decision are far-reaching and multifaceted.', trans: 'Hệ quả của quyết định này rất rộng và đa chiều.' },
          { text: 'I\'d like to elaborate on my previous point if I may.', trans: 'Nếu được phép, tôi muốn giải thích thêm về điểm trước đó của mình.' },
        ],
      },
      business: {
        B1: [
          { text: 'Let\'s schedule a meeting for next Monday.', trans: 'Hãy sắp xếp một cuộc họp vào thứ Hai tuần tới.' },
          { text: 'I would like to follow up on our previous discussion.', trans: 'Tôi muốn theo dõi cuộc thảo luận trước của chúng ta.' },
          { text: 'Can we revisit this issue in our next meeting?', trans: 'Chúng ta có thể xem lại vấn đề này trong cuộc họp tiếp theo không?' },
        ],
        C1: [
          { text: 'The quarterly results exceeded our projected benchmarks by a significant margin.', trans: 'Kết quả hàng quý vượt quá các chỉ tiêu dự kiến của chúng tôi với biên độ đáng kể.' },
          { text: 'We need to leverage our competitive advantages to maintain market leadership.', trans: 'Chúng ta cần tận dụng các lợi thế cạnh tranh để duy trì vị trí dẫn đầu thị trường.' },
        ],
      },
      travel: {
        A2: [
          { text: 'Can I have a window seat, please?', trans: 'Tôi có thể có ghế cạnh cửa sổ không?' },
          { text: 'What time does the next train leave?', trans: 'Tàu tiếp theo khởi hành lúc mấy giờ?' },
          { text: 'Is there a pharmacy nearby?', trans: 'Có nhà thuốc nào gần đây không?' },
        ],
      },
    },
    zh: {
      daily: {
        A1: [
          { text: '你好！你叫什么名字？', pinyin: 'Nǐ hǎo! Nǐ jiào shénme míngzi?', trans: 'Xin chào! Bạn tên là gì?' },
          { text: '我是越南人。', pinyin: 'Wǒ shì Yuènán rén.', trans: 'Tôi là người Việt Nam.' },
          { text: '请问，洗手间在哪里？', pinyin: 'Qǐngwèn, xǐshǒujiān zài nǎlǐ?', trans: 'Xin hỏi, nhà vệ sinh ở đâu?' },
          { text: '谢谢你！', pinyin: 'Xièxie nǐ!', trans: 'Cảm ơn bạn!' },
        ],
        B1: [
          { text: '我想提高我的普通话水平。', pinyin: 'Wǒ xiǎng tígāo wǒ de pǔtōnghuà shuǐpíng.', trans: 'Tôi muốn nâng cao trình độ tiếng Phổ thông của mình.' },
          { text: '能帮我解释一下这个词的意思吗？', pinyin: 'Néng bāng wǒ jiěshì yīxià zhège cí de yìsi ma?', trans: 'Bạn có thể giải thích nghĩa của từ này cho tôi không?' },
          { text: '我在学习汉字，这很有趣。', pinyin: 'Wǒ zài xuéxí hànzì, zhè hěn yǒuqù.', trans: 'Tôi đang học chữ Hán, điều này rất thú vị.' },
        ],
        C1: [
          { text: '这个问题的解决方案需要从多个角度来分析。', pinyin: 'Zhège wèntí de jiějué fāng\'àn xūyào cóng duō gè jiǎodù lái fēnxī.', trans: 'Giải pháp cho vấn đề này cần được phân tích từ nhiều góc độ.' },
        ],
      },
    },
  };

  function getPhrase(lang, topic, level) {
    const db = speakingPhrases[lang] || speakingPhrases.en;
    const topicDb = db[topic] || db.daily;
    const levelPhrases = topicDb[level] || topicDb.B1 || Object.values(topicDb)[0];
    if (!levelPhrases) return null;
    return levelPhrases[Math.floor(Math.random() * levelPhrases.length)];
  }

  // ══════════════════════════════════════════════════
  //  LISTENING EXERCISES
  // ══════════════════════════════════════════════════
  const listeningExercises = {
    fillBlank: {
      en: [
        {
          template: 'The quick brown {fox} jumps over the lazy {dog}.',
          blanks: ['fox', 'dog'],
          audio: 'The quick brown fox jumps over the lazy dog.',
          level: 'A1'
        },
        {
          template: 'She has been studying English for {five} years and is now {fluent} in the language.',
          blanks: ['five', 'fluent'],
          audio: 'She has been studying English for five years and is now fluent in the language.',
          level: 'B1'
        },
        {
          template: 'The {unprecedented} economic challenges have forced governments worldwide to {reconsider} their fiscal policies.',
          blanks: ['unprecedented', 'reconsider'],
          audio: 'The unprecedented economic challenges have forced governments worldwide to reconsider their fiscal policies.',
          level: 'C1'
        },
        {
          template: 'Learning a new {language} requires {consistent} practice and {dedication}.',
          blanks: ['language', 'consistent', 'dedication'],
          audio: 'Learning a new language requires consistent practice and dedication.',
          level: 'B1'
        },
        {
          template: '{Sustainability} is no longer just a {buzzword}; it has become a {fundamental} business {imperative}.',
          blanks: ['Sustainability', 'buzzword', 'fundamental', 'imperative'],
          audio: 'Sustainability is no longer just a buzzword; it has become a fundamental business imperative.',
          level: 'C1'
        },
      ],
      zh: [
        {
          template: '我每天都{学习}汉语，觉得{很有意思}。',
          blanks: ['学习', '很有意思'],
          audio: '我每天都学习汉语，觉得很有意思。',
          level: 'A2'
        },
        {
          template: '他不仅{聪明}，而且{努力}，所以成绩非常好。',
          blanks: ['聪明', '努力'],
          audio: '他不仅聪明，而且努力，所以成绩非常好。',
          level: 'B1'
        },
        {
          template: '只要你{坚持}练习，你的{普通话}水平一定会{提高}。',
          blanks: ['坚持', '普通话', '提高'],
          audio: '只要你坚持练习，你的普通话水平一定会提高。',
          level: 'B1'
        },
      ],
    },
    dictation: {
      en: [
        { text: 'Practice makes perfect.', level: 'A1', trans: 'Luyện tập tạo nên sự hoàn hảo.' },
        { text: 'The early bird catches the worm.', level: 'A2', trans: 'Chim sớm bắt được giun.' },
        { text: 'Knowledge is power, but enthusiasm pulls the switch.', level: 'B1', trans: 'Kiến thức là sức mạnh, nhưng nhiệt tình mới bật công tắc.' },
        { text: 'The greatest glory in living lies not in never falling, but in rising every time we fall.', level: 'B2', trans: 'Vinh quang lớn nhất trong cuộc sống không phải là không bao giờ ngã, mà là đứng dậy mỗi lần vấp ngã.' },
        { text: 'Innovation distinguishes between a leader and a follower.', level: 'C1', trans: 'Đổi mới phân biệt giữa người lãnh đạo và người đi theo.' },
      ],
      zh: [
        { text: '学而时习之，不亦乐乎。', level: 'B1', trans: 'Học và thường xuyên ôn tập, há chẳng vui sao.' },
        { text: '千里之行，始于足下。', level: 'B1', trans: 'Hành trình nghìn dặm bắt đầu từ một bước chân.' },
        { text: '不经历风雨，怎能见彩虹。', level: 'B2', trans: 'Không trải qua mưa gió, sao thấy được cầu vồng.' },
      ],
    },
    mcq: {
      en: [
        {
          audio: 'What is the capital city of Australia?',
          question: 'What is being asked?',
          options: ['A city in the USA', 'The capital of Australia', 'A famous landmark', 'A country in Asia'],
          correct: 1,
          explanation: 'The question asks about the capital city of Australia, which is Canberra.',
          level: 'A2'
        },
        {
          audio: 'Despite facing numerous setbacks throughout his career, he remained determined and eventually achieved remarkable success in his field.',
          question: 'What best describes the person in the passage?',
          options: ['He gave up after facing difficulties', 'He was successful from the beginning', 'He persevered despite challenges', 'He changed his career path'],
          correct: 2,
          explanation: '"Remained determined" và "eventually achieved success" cho thấy ông ấy kiên trì dù gặp khó khăn.',
          level: 'B2'
        },
      ],
      zh: [
        {
          audio: '他因为工作太忙，所以没有时间学习中文。',
          question: '他为什么没有学习中文？',
          options: ['因为他不喜欢中文', '因为他工作太忙', '因为他没有老师', '因为中文太难'],
          correct: 1,
          explanation: '"因为工作太忙" = vì công việc quá bận.',
          level: 'A2'
        },
      ],
    }
  };

  // ══════════════════════════════════════════════════
  //  READING ARTICLES
  // ══════════════════════════════════════════════════
  const readingArticles = {
    en: {
      news: {
        B1: [
          {
            title: 'The Rise of Artificial Intelligence in Education',
            meta: 'Technology | 5 min read | Level B1',
            body: `Artificial intelligence is rapidly transforming the landscape of education around the world. Schools and universities are increasingly adopting AI-powered tools to personalize learning experiences for students of all ages.

These intelligent systems can analyze a student's learning patterns and adapt the curriculum accordingly, providing customized exercises and feedback in real time. Unlike traditional classroom settings where a single teacher must address the needs of thirty or more students, AI tutors can offer one-on-one attention at scale.

However, educators and researchers raise important questions about the role of human teachers in an AI-driven educational environment. Many argue that while technology can enhance learning efficiency, it cannot replace the emotional intelligence and mentorship that human teachers provide.

Furthermore, the implementation of AI in education comes with significant challenges, including data privacy concerns, the digital divide between affluent and underprivileged schools, and the need for substantial teacher training.

Despite these challenges, the potential of artificial intelligence to democratize education and make high-quality learning accessible to students worldwide is undeniable. The key lies in finding the right balance between technological innovation and human-centered teaching approaches.`,
            questions: [
              { q: 'What is the main advantage of AI tutors over traditional teaching?', options: ['They are cheaper', 'They can provide personalized, one-on-one attention at scale', 'They know more than human teachers', 'They can teach multiple languages'], correct: 1 },
              { q: 'What do many educators argue about human teachers?', options: ['They should be replaced by AI', 'Their emotional intelligence and mentorship cannot be replaced', 'They need less training', 'They are less effective than AI'], correct: 1 },
              { q: 'What is the "digital divide" mentioned in the article?', options: ['The gap between digital and analog devices', 'The difference between rich and poor schools\' access to technology', 'The divide between students and teachers', 'The gap between AI and human intelligence'], correct: 1 },
            ]
          }
        ],
        C1: [
          {
            title: 'The Paradox of Choice in the Digital Age',
            meta: 'Psychology | 7 min read | Level C1',
            body: `In an era characterized by unprecedented abundance of options, consumers paradoxically report lower levels of satisfaction and higher degrees of anxiety. This phenomenon, extensively documented by psychologist Barry Schwartz in his seminal work "The Paradox of Choice," suggests that having too many alternatives can be debilitating rather than liberating.

The proliferation of digital platforms has exponentially amplified this effect. A typical streaming service offers thousands of films and series, yet users frequently experience decision fatigue, often settling for rewatching familiar content rather than committing to something new. This behavioral pattern reflects a deeper psychological mechanism: the fear of making suboptimal choices.

Neurological research reveals that decision-making activates the prefrontal cortex—the region associated with planning and rational thought—while simultaneously triggering limbic responses linked to anxiety and stress. When the number of options exceeds our cognitive bandwidth, the quality of our decisions deteriorates paradoxically.

Minimalism and intentional choice architecture have emerged as antidotes to this contemporary malaise. Companies like Apple built their early success partly on the principle of radical simplification, offering fewer products but ensuring each one represented an exceptional execution of its intended purpose.

The philosophical implications extend beyond consumer behavior. If maximum freedom of choice does not correlate with maximum well-being, then perhaps the Enlightenment ideal of unbounded individual autonomy requires critical reexamination in the context of twenty-first century cognitive science.`,
            questions: [
              { q: 'What does "decision fatigue" mean in the context of the article?', options: ['Feeling tired after exercising', 'The deterioration in decision quality due to too many choices', 'A medical condition', 'Being unable to use digital devices'], correct: 1 },
              { q: 'What paradox does the article describe?', options: ['More choice leads to more happiness', 'More choice can lead to less satisfaction', 'Technology always helps decision-making', 'Minimalism is always better'], correct: 1 },
              { q: 'What philosophical ideal does the author suggest needs reexamination?', options: ['Scientific rationalism', 'Unbounded individual autonomy from the Enlightenment', 'The concept of minimalism', 'Neurological research methods'], correct: 1 },
            ]
          }
        ]
      },
    },
    zh: {
      culture: {
        B1: [
          {
            title: '中国茶文化的历史与传承',
            meta: '文化 | 4分钟阅读 | HSK 4级',
            body: `中国是茶的故乡，有着五千多年的饮茶历史。相传，茶是在公元前约2737年由神农氏发现的。这位古代帝王在树下休息时，一片树叶飘落到他的热水中，由此产生了第一杯茶。

茶在中国文化中扮演着重要的角色。它不仅仅是一种饮品，更是一种生活哲学和社交礼仪的体现。在中国，人们用喝茶来表示尊重、建立友谊和促进商业谈判。

不同地区有不同的茶文化。广东人喜欢"早茶"，在茶馆里享用点心和各种茶饮。福建省以乌龙茶闻名，当地人有独特的工夫茶道。云南省出产普洱茶，这种茶可以陈放多年，价值极高。

现代社会虽然生活节奏加快，但茶文化并没有消失。越来越多的年轻人开始重新关注传统茶道，将它与现代生活方式相结合。新式茶饮品牌也不断涌现，将传统茶与现代饮品理念融合，深受年轻消费者喜爱。`,
            questions: [
              { q: '根据文章，茶是什么时候被发现的？', options: ['公元前5000年', '公元前2737年', '唐朝时期', '宋朝时期'], correct: 1 },
              { q: '茶在中国文化中有什么作用？', options: ['只是一种普通饮品', '表示尊重、建立友谊的方式', '主要用于医疗', '只在特殊场合使用'], correct: 1 },
              { q: '哪个省以普洱茶著名？', options: ['广东', '福建', '云南', '四川'], correct: 2 },
            ]
          }
        ]
      }
    }
  };

  // ══════════════════════════════════════════════════
  //  WRITING PROMPTS
  // ══════════════════════════════════════════════════
  const writingPrompts = {
    en: {
      daily: {
        A1: ['Describe your typical day in 5 sentences.', 'Write about your favorite food.', 'Describe your family.'],
        B1: [
          'Write about a memorable experience that changed your perspective. (150-200 words)',
          'Describe the advantages and disadvantages of working from home. (150-200 words)',
          'Write a letter to your future self about your language learning journey. (150-200 words)',
        ],
        B2: [
          'Discuss the impact of social media on modern relationships. Provide specific examples and your opinion. (200-250 words)',
          'Compare and contrast traditional and online education, discussing which you prefer and why. (200-250 words)',
        ],
        IELTS: [
          'Some people believe that unpaid community service should be a compulsory part of high school programmes. To what extent do you agree or disagree? (250 words)',
          'The increase in global air travel is one of the biggest contributors to climate change. What solutions can be adopted to address this problem? (250 words)',
        ],
      },
      technology: {
        B2: [
          'To what extent has technology improved our quality of life? Discuss both positive and negative aspects. (200 words)',
          'Artificial Intelligence will soon replace most human jobs. Do you agree? Discuss with examples. (200 words)',
        ],
      }
    },
    zh: {
      daily: {
        HSK3: [
          '请介绍一下你的家乡。(请写150字左右)',
          '描述你最喜欢的中国节日，并解释为什么你喜欢它。(150字)',
        ],
        HSK4: [
          '请谈谈互联网对现代生活的影响，包括积极和消极两个方面。(200字)',
          '你认为保护传统文化重要吗？请说明你的理由。(200字)',
        ],
        HSK5: [
          '请分析科技发展对人际关系的影响，并提出你的解决方案。(250字)',
        ],
      },
    }
  };

  function getWritingPrompt(lang, topic, level) {
    const db = writingPrompts[lang] || writingPrompts.en;
    const topicDb = db[topic] || db.daily;
    const levelPrompts = topicDb[level] || topicDb.B1 || Object.values(topicDb)[0];
    if (!levelPrompts) return 'Write about any topic you like! (150-200 words)';
    return levelPrompts[Math.floor(Math.random() * levelPrompts.length)];
  }

  function getModelAnswer(prompt, lang) {
    // Model answers for specific prompts
    const models = {
      en: {
        'memorable experience': `One experience that truly changed my perspective was volunteering at a local orphanage during my university years. At first, I was uncertain about what impact I could make, but within weeks, I realized that even small gestures — reading a story, playing a game — could bring immense joy to the children.

This experience taught me the profound difference between giving time and giving money. While financial donations are valuable, the personal connection and emotional support that comes from direct engagement is irreplaceable. I learned that true fulfillment comes not from accumulating possessions, but from meaningful human connections.

Since then, I have made volunteering a regular part of my life and have encouraged friends and colleagues to do the same.`,
      }
    };
    // Return null to indicate no model answer (will show button but no content)
    return null;
  }

  // ══════════════════════════════════════════════════
  //  SCORE WRITING
  // ══════════════════════════════════════════════════
  function scoreWriting(text, lang, level) {
    if (!text || text.trim().length < 20) {
      return { score: 0, feedback: [], suggestion: 'Hãy viết ít nhất 30 từ để nhận nhận xét.' };
    }

    const words = text.trim().split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 3);
    let score = 50; // Base score
    const feedback = [];

    if (lang === 'en') {
      // Word count scoring
      const minWords = { A1: 30, A2: 50, B1: 100, B2: 150, C1: 200, IELTS: 220, TOEIC: 150 };
      const min = minWords[level] || 100;
      if (words >= min) { score += 10; feedback.push({ type: 'positive', text: `✅ Độ dài tốt: ${words} từ` }); }
      else { feedback.push({ type: 'warning', text: `⚠️ Quá ngắn: ${words}/${min} từ yêu cầu` }); score -= 10; }

      // Grammar check
      const grammarResult = AITutor.checkGrammar(text, 'en');
      const errCount = grammarResult.errors.length;
      if (errCount === 0) {
        score += 20;
        feedback.push({ type: 'positive', text: '✅ Không phát hiện lỗi ngữ pháp cơ bản!' });
      } else {
        score -= Math.min(errCount * 5, 20);
        grammarResult.errors.slice(0, 5).forEach(e => {
          feedback.push({
            type: 'error',
            original: e.original,
            correction: e.correction,
            explain: e.desc
          });
        });
      }

      // Sentence variety
      if (sentences.length >= 3) {
        const avgLen = words / sentences.length;
        if (avgLen > 8 && avgLen < 30) { score += 10; feedback.push({ type: 'positive', text: '✅ Độ dài câu đa dạng' }); }
      }

      // Vocabulary check (advanced words)
      const advancedWords = ['however', 'furthermore', 'nevertheless', 'consequently', 'although', 'therefore', 'moreover', 'nonetheless', 'ultimately', 'significantly'];
      const hasAdvanced = advancedWords.filter(w => text.toLowerCase().includes(w));
      if (hasAdvanced.length >= 2) {
        score += 10;
        feedback.push({ type: 'positive', text: `✅ Từ vựng phong phú: ${hasAdvanced.slice(0, 3).join(', ')}` });
      } else {
        feedback.push({ type: 'tip', text: `💡 Thử dùng từ liên kết: however, furthermore, therefore, consequently...` });
      }

      // Paragraph structure
      if (text.includes('\n') || sentences.length >= 5) {
        score += 5;
        feedback.push({ type: 'positive', text: '✅ Có cấu trúc đoạn văn' });
      }
    } else {
      // Chinese scoring
      const charCount = text.replace(/\s/g, '').length;
      if (charCount >= 100) { score += 20; feedback.push({ type: 'positive', text: `✅ Số ký tự: ${charCount}` }); }
      else { feedback.push({ type: 'warning', text: `⚠️ Cần viết dài hơn: ${charCount} ký tự` }); }

      const grammarResult = AITutor.checkGrammar(text, 'zh');
      if (grammarResult.errors.length === 0) {
        score += 15;
        feedback.push({ type: 'positive', text: '✅ Cấu trúc cơ bản đúng' });
      }

      // Check for connectors
      const connectors = ['因为', '所以', '虽然', '但是', '而且', '不仅', '首先', '其次'];
      const usedConn = connectors.filter(c => text.includes(c));
      if (usedConn.length >= 2) {
        score += 10;
        feedback.push({ type: 'positive', text: `✅ Dùng tốt các từ kết nối: ${usedConn.join('、')}` });
      } else {
        feedback.push({ type: 'tip', text: '💡 Thử dùng: 因为、所以、虽然、但是、不仅...而且...' });
      }
    }

    score = Math.max(10, Math.min(100, score));

    let grade, suggestion;
    if (score >= 85) { grade = 'Xuất sắc'; suggestion = 'Bài viết rất tốt! Tiếp tục phát huy phong cách viết này.'; }
    else if (score >= 70) { grade = 'Tốt'; suggestion = 'Bài viết khá tốt. Hãy chú ý thêm về độ đa dạng của từ vựng.'; }
    else if (score >= 55) { grade = 'Khá'; suggestion = 'Cần cải thiện thêm về ngữ pháp và cấu trúc câu.'; }
    else { grade = 'Cần cải thiện'; suggestion = 'Hãy chú ý sửa các lỗi ngữ pháp và viết thêm nhiều câu phức hợp hơn.'; }

    return { score, grade, feedback, suggestion };
  }

  // ══════════════════════════════════════════════════
  //  MODULE INIT FUNCTIONS
  // ══════════════════════════════════════════════════

  function loadNewPhrase(lang, topic, level) {
    const phrase = getPhrase(lang, topic, level);
    if (!phrase) return;

    const mainEl = document.getElementById('speak-phrase-main');
    const subEl = document.getElementById('speak-phrase-sub');
    const transEl = document.getElementById('speak-phrase-trans');
    const ipaEl = document.getElementById('speak-ipa');
    const scorePanel = document.getElementById('score-panel');

    if (mainEl) mainEl.textContent = phrase.text;
    if (subEl) subEl.textContent = phrase.pinyin || '';
    if (transEl) transEl.textContent = phrase.trans || '';
    if (ipaEl) ipaEl.textContent = phrase.ipa || '';
    if (scorePanel) scorePanel.style.display = 'none';
  }

  function loadListeningExercise(type, lang, onLoad) {
    const db = listeningExercises[type];
    if (!db) return;
    const langDb = db[lang] || db.en;
    if (!langDb) return;
    const exercise = langDb[Math.floor(Math.random() * langDb.length)];
    if (onLoad) onLoad(exercise, type);
    return exercise;
  }

  function loadReadingArticle(lang, topic, level) {
    const db = readingArticles[lang] || readingArticles.en;
    const topicDb = db[topic] || db.news || Object.values(db)[0];
    if (!topicDb) return null;
    const levelArticles = topicDb[level] || topicDb.B1 || Object.values(topicDb)[0];
    if (!levelArticles || !levelArticles.length) return null;
    return levelArticles[Math.floor(Math.random() * levelArticles.length)];
  }

  return {
    getPhrase,
    loadNewPhrase,
    loadListeningExercise,
    loadReadingArticle,
    getWritingPrompt,
    scoreWriting,
    getModelAnswer,
    speakingPhrases,
    listeningExercises,
    readingArticles,
  };
})();
