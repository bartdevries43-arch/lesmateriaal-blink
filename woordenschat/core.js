const goals = [...RAW_GOALS, ...(window.EXTRA_GOALS || [])].map((goal, goalIndex) => ({
  ...goal,
  id: `goal-${goalIndex}`,
  words: goal.words.map(([word, meaning, example], wordIndex) => ({
    id: `goal-${goalIndex}-word-${wordIndex}`,
    word,
    meaning,
    example
  }))
}));

let exercises = [...RAW_EXERCISES].map((exercise, exerciseIndex) => ({
  ...exercise,
  id: `exercise-${exerciseIndex}`,
  questions: exercise.questions.map((question, questionIndex) => ({
    ...question,
    id: `exercise-${exerciseIndex}-question-${questionIndex}`
  }))
}));

function createMeaningExercises() {
  const sections = [...new Map(goals.map((goal) => [`${goal.block}|${goal.group}`, { block: goal.block, group: goal.group }])).values()];
  return sections.map(({ block, group }, sectionIndex) => {
    const words = goals
      .filter((goal) => goal.block === block && goal.group === group)
      .flatMap((goal) => goal.words);

    return {
      block,
      group,
      title: "Begrippenquiz",
      code: "4 keuzes · eerst oefenen",
      type: "meaning",
      id: `meaning-exercise-${sectionIndex}`,
      questions: words.map((item, questionIndex) => {
        const distractors = words
          .filter((word) => word.id !== item.id)
          .slice(questionIndex + 1)
          .concat(words.filter((word) => word.id !== item.id).slice(0, questionIndex + 1))
          .slice(0, 3)
          .map((word) => word.meaning);

        return {
          id: `meaning-exercise-${sectionIndex}-question-${questionIndex}`,
          prompt: `Wat betekent: ${item.word}?`,
          options: [item.meaning, ...distractors],
          answer: item.meaning,
          explain: `${item.word} betekent: ${item.meaning}`,
          hint: item.example
        };
      })
    };
  });
}

function createPracticeTests() {
  const sections = [...new Map(goals.map((goal) => [`${goal.block}|${goal.group}`, { block: goal.block, group: goal.group }])).values()];
  return sections.map(({ block, group }, sectionIndex) => {
    const words = goals
      .filter((goal) => goal.block === block && goal.group === group)
      .flatMap((goal) => goal.words);

    return {
      block,
      group,
      title: "Oefentoets",
      code: "6 keuzes · moeilijker",
      type: "practice-test",
      id: `practice-test-${sectionIndex}`,
      questions: words.map((item, questionIndex) => {
        const otherMeanings = words
          .filter((word) => word.id !== item.id)
          .slice(questionIndex + 2)
          .concat(words.filter((word) => word.id !== item.id).slice(0, questionIndex + 2))
          .slice(0, 5)
          .map((word) => word.meaning);

        return {
          id: `practice-test-${sectionIndex}-question-${questionIndex}`,
          prompt: `Wat betekent: ${item.word}?`,
          options: [item.meaning, ...otherMeanings],
          answer: item.meaning,
          explain: `${item.word} betekent: ${item.meaning}`,
          hint: item.example
        };
      })
    };
  });
}

function createSentenceExercises() {
  const sections = [...new Map(goals.map((goal) => [`${goal.block}|${goal.group}`, { block: goal.block, group: goal.group }])).values()];
  return sections.map(({ block, group }, sectionIndex) => {
    const words = goals
      .filter((goal) => goal.block === block && goal.group === group)
      .flatMap((goal) => goal.words);

    return {
      block,
      group,
      title: "Zinnen aanvullen",
      code: "verdieping in context",
      type: "sentence",
      id: `sentence-exercise-${sectionIndex}`,
      questions: words.map((item, questionIndex) => {
        const otherWords = words
          .filter((word) => word.id !== item.id)
          .slice(questionIndex + 1)
          .concat(words.filter((word) => word.id !== item.id).slice(0, questionIndex + 1))
          .slice(0, 3)
          .map((word) => word.word);
        const escapedWord = item.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const blankedExample = item.example.replace(new RegExp(escapedWord, "i"), "_____");

        return {
          id: `sentence-exercise-${sectionIndex}-question-${questionIndex}`,
          prompt: blankedExample.includes("_____")
            ? `Welk woord past in de zin? ${blankedExample}`
            : `Welk woord past bij deze uitleg? ${item.meaning}`,
          options: [item.word, ...otherWords],
          answer: item.word,
          explain: `Het woord is: ${item.word}. ${item.example}`,
          hint: `Denk aan: ${item.meaning}`
        };
      })
    };
  });
}

function sortedBlocksForSetup() {
  return [...new Set(goals.map((goal) => goal.block))]
    .sort((a, b) => Number(a.match(/\d+/)?.[0] || 0) - Number(b.match(/\d+/)?.[0] || 0));
}

function createFinalTests() {
  const groups = [...new Set(goals.map((goal) => goal.group))];
  const blocks = sortedBlocksForSetup();
  return groups.map((group, groupIndex) => {
    const groupGoals = goals.filter((goal) => goal.group === group);
    const blockWords = blocks.flatMap((block) => {
      const words = groupGoals
        .filter((goal) => goal.block === block)
        .flatMap((goal) => goal.words);
      return words.slice(0, 3);
    });
    const allWords = groupGoals.flatMap((goal) => goal.words);
    const extraWords = allWords.filter((word) => !blockWords.some((item) => item.id === word.id)).slice(0, 30 - blockWords.length);
    const selectedWords = [...blockWords, ...extraWords].slice(0, 30);

    return {
      block: "Alle blokken",
      group,
      title: "Eindtoets",
      code: "30 vragen · blok 1 t/m 9",
      type: "final-test",
      id: `final-test-${groupIndex}`,
      questions: selectedWords.map((item, questionIndex) => {
        const offset = questionIndex + 4;
        const otherMeanings = allWords
          .filter((word) => word.id !== item.id)
          .slice(offset)
          .concat(allWords.filter((word) => word.id !== item.id).slice(0, offset))
          .slice(0, 5)
          .map((word) => word.meaning);

        return {
          id: `final-test-${groupIndex}-question-${questionIndex}`,
          prompt: `Wat betekent: ${item.word}?`,
          options: [item.meaning, ...otherMeanings],
          answer: item.meaning,
          explain: `${item.word} betekent: ${item.meaning}`,
          hint: item.example,
          word: item.word
        };
      })
    };
  });
}

function createReviewRounds() {
  const groups = [...new Set(goals.map((goal) => goal.group))];
  const blocks = sortedBlocksForSetup();
  return groups.map((group, groupIndex) => {
    const groupGoals = goals.filter((goal) => goal.group === group);
    const allWords = groupGoals.flatMap((goal) => goal.words);
    const selectedWords = blocks.flatMap((block) => {
      const words = groupGoals
        .filter((goal) => goal.block === block)
        .flatMap((goal) => goal.words);
      return words.slice(3, 5);
    }).slice(0, 18);

    return {
      block: "Alle blokken",
      group,
      title: "Herhaling",
      code: "18 vragen · rustig mixen",
      type: "review",
      id: `review-round-${groupIndex}`,
      questions: selectedWords.map((item, questionIndex) => {
        const offset = questionIndex + 2;
        const otherMeanings = allWords
          .filter((word) => word.id !== item.id)
          .slice(offset)
          .concat(allWords.filter((word) => word.id !== item.id).slice(0, offset))
          .slice(0, 3)
          .map((word) => word.meaning);

        return {
          id: `review-round-${groupIndex}-question-${questionIndex}`,
          prompt: `Wat betekent: ${item.word}?`,
          options: [item.meaning, ...otherMeanings],
          answer: item.meaning,
          explain: `${item.word} betekent: ${item.meaning}`,
          hint: item.example,
          word: item.word
        };
      })
    };
  });
}

exercises = [...exercises, ...createMeaningExercises(), ...createPracticeTests(), ...createSentenceExercises(), ...createFinalTests(), ...createReviewRounds()];

const storeKey = "woordenschat-blok-7-progress";
const profileKey = "woordenschat-blok-7-profile";
const profileRegistryKey = "woordenschat-blok-7-profile-registry";
const routeKey = "woordenschat-blok-7-route";
const feedbackKey = "woordenschat-blok-7-teacher-feedback";
const quizStatsKey = "woordenschat-blok-7-quiz-stats";
const reflectionKey = "woordenschat-blok-7-reflection";
const practiceLogKey = "woordenschat-blok-7-practice-log";
const masteryKey = "woordenschat-blok-7-mastery";
const groupFilterKey = "woordenschat-blok-7-group-filter";
const studentAvatars = ["🌟", "🚀", "🎧", "📚", "🧠", "🍀", "🎨", "⚽", "🎮", "🎵", "💎", "🔥", "🌈", "🛹", "🧩", "🏆", "🎯", "🪐", "🧭"];
const teacherTestAvatar = "🧪";
const avatars = [...studentAvatars, teacherTestAvatar];
const feedbackTemplates = [
  "Je oefent rustig en precies. Blijf vooral de lastige woorden herhalen.",
  "Mooi dat je doorzet. Kies straks 'Nog oefenen' voor de woorden die nog wiebelen.",
  "Je kent al veel woorden. Probeer nu ook de betekenis andersom te oefenen.",
  "Let extra op de voorbeeldzinnen; die helpen om het woord in context te begrijpen."
];
const learningRoutes = {
  calm: {
    label: "Rustig oefenen",
    intro: "Met hints en extra uitleg."
  },
  normal: {
    label: "Gewoon oefenen",
    intro: "Met normale feedback."
  },
  challenge: {
    label: "Uitdaging",
    intro: "Minder hulp en moeilijker toetsen."
  }
};

function readStoredJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function scopedKey(baseKey, avatar) {
  return `${baseKey}-${encodeURIComponent(avatar || teacherTestAvatar)}`;
}

function readProfileData(baseKey, avatar) {
  return readStoredJson(scopedKey(baseKey, avatar), {});
}

function normalizeProfile(profile) {
  const avatar = avatars.includes(profile.avatar) ? profile.avatar : teacherTestAvatar;
  return {
    avatar,
    name: typeof profile.name === "string" ? profile.name : "",
    role: avatar === teacherTestAvatar ? "teacher" : "student"
  };
}

const initialProfile = normalizeProfile(readStoredJson(profileKey, {
  avatar: teacherTestAvatar,
  name: "Leerkracht test",
  role: "teacher"
}));

const state = {
  selectedGoal: null,
  selectedExercise: null,
  deck: [],
  quizQueue: [],
  index: 0,
  helperLives: 3,
  wordListOpen: false,
  helperMessage: "",
  quizIndex: 0,
  flipped: false,
  mode: "word",
  quizAnswers: {},
  quizOptions: {},
  quizOptionOffset: 0,
  hintVisible: false,
  learningRoute: localStorage.getItem(routeKey) || "normal",
  menuOpenBlocks: {},
  activeMenuBlock: latestBlock(),
  selectedGroupFilter: goals.some((goal) => goal.group === localStorage.getItem(groupFilterKey)) ? localStorage.getItem(groupFilterKey) : "Groep 7",
  menuStages: {},
  profile: initialProfile,
  profileRegistry: readStoredJson(profileRegistryKey, {}),
  teacherSelectedAvatar: initialProfile.avatar,
  progress: readProfileData(storeKey, initialProfile.avatar),
  quizStats: readProfileData(quizStatsKey, initialProfile.avatar),
  mastery: readProfileData(masteryKey, initialProfile.avatar),
  teacherFeedback: readStoredJson(feedbackKey, {}),
  reflections: readProfileData(reflectionKey, initialProfile.avatar),
  practiceLog: readProfileData(practiceLogKey, initialProfile.avatar)
};

if (!state.profileRegistry[teacherTestAvatar]) {
  state.profileRegistry[teacherTestAvatar] = {
    name: "Leerkracht test",
    role: "teacher"
  };
}

const elements = {
  menuView: document.querySelector("#menuView"),
  stepStrip: document.querySelector("#stepStrip"),
  groupMenu: document.querySelector("#groupMenu"),
  studyView: document.querySelector("#studyView"),
  quizView: document.querySelector("#quizView"),
  teacherView: document.querySelector("#teacherView"),
  backButton: document.querySelector("#backButton"),
  resetButton: document.querySelector("#resetButton"),
  avatarLabel: document.querySelector("#avatarLabel"),
  heroAvatar: document.querySelector("#heroAvatar"),
  heroProfileName: document.querySelector("#heroProfileName"),
  heroProfileHint: document.querySelector("#heroProfileHint"),
  avatarRow: document.querySelector("#avatarRow"),
  studentNameInput: document.querySelector("#studentNameInput"),
  profileStatus: document.querySelector("#profileStatus"),
  routeLabel: document.querySelector("#routeLabel"),
  routeRow: document.querySelector("#routeRow"),
  teacherButton: document.querySelector("#teacherButton"),
  teacherNote: document.querySelector("#teacherNote"),
  studyGroup: document.querySelector("#studyGroup"),
  studyTitle: document.querySelector("#studyTitle"),
  progressPill: document.querySelector("#progressPill"),
  flashcard: document.querySelector("#flashcard"),
  cardCount: document.querySelector("#cardCount"),
  backCount: document.querySelector("#backCount"),
  frontLabel: document.querySelector("#frontLabel"),
  frontText: document.querySelector("#frontText"),
  backLabel: document.querySelector("#backLabel"),
  backText: document.querySelector("#backText"),
  exampleText: document.querySelector("#exampleText"),
  prevButton: document.querySelector("#prevButton"),
  nextButton: document.querySelector("#nextButton"),
  hardButton: document.querySelector("#hardButton"),
  knownButton: document.querySelector("#knownButton"),
  shuffleButton: document.querySelector("#shuffleButton"),
  practiceButton: document.querySelector("#practiceButton"),
  modeWord: document.querySelector("#modeWord"),
  modeMeaning: document.querySelector("#modeMeaning"),
  wordList: document.querySelector("#wordList"),
  searchInput: document.querySelector("#searchInput"),
  helperLives: document.querySelector("#helperLives"),
  helperMessage: document.querySelector("#helperMessage"),
  toggleWordListButton: document.querySelector("#toggleWordListButton"),
  quizGroup: document.querySelector("#quizGroup"),
  quizTitle: document.querySelector("#quizTitle"),
  quizScore: document.querySelector("#quizScore"),
  scoreBar: document.querySelector("#scoreBar"),
  scorePercent: document.querySelector("#scorePercent"),
  scoreFill: document.querySelector("#scoreFill"),
  quizCount: document.querySelector("#quizCount"),
  quizVisual: document.querySelector("#quizVisual"),
  quizPrompt: document.querySelector("#quizPrompt"),
  answerGrid: document.querySelector("#answerGrid"),
  hintButton: document.querySelector("#hintButton"),
  hintText: document.querySelector("#hintText"),
  quizFeedback: document.querySelector("#quizFeedback"),
  quizPrevButton: document.querySelector("#quizPrevButton"),
  quizNextButton: document.querySelector("#quizNextButton"),
  quizRestartButton: document.querySelector("#quizRestartButton"),
  resultCard: document.querySelector("#resultCard"),
  resultTitle: document.querySelector("#resultTitle"),
  resultText: document.querySelector("#resultText"),
  resultRestartButton: document.querySelector("#resultRestartButton"),
  resultDifficultButton: document.querySelector("#resultDifficultButton"),
  resultMenuButton: document.querySelector("#resultMenuButton"),
  reflectionCard: document.querySelector("#reflectionCard"),
  reflectionGrid: document.querySelector("#reflectionGrid"),
  reflectionText: document.querySelector("#reflectionText"),
  teacherAvatar: document.querySelector("#teacherAvatar"),
  teacherOverview: document.querySelector("#teacherOverview"),
  teacherFeedbackInput: document.querySelector("#teacherFeedback"),
  feedbackTemplates: document.querySelector("#feedbackTemplates"),
  saveFeedbackButton: document.querySelector("#saveFeedbackButton"),
  clearFeedbackButton: document.querySelector("#clearFeedbackButton"),
  deleteProfileButton: document.querySelector("#deleteProfileButton")
};

function saveProgress() {
  localStorage.setItem(scopedKey(storeKey, state.profile.avatar), JSON.stringify(state.progress));
}

function saveProfile() {
  localStorage.setItem(profileKey, JSON.stringify(state.profile));
}

function saveProfileRegistry() {
  localStorage.setItem(profileRegistryKey, JSON.stringify(state.profileRegistry));
}

function saveLearningRoute() {
  localStorage.setItem(routeKey, state.learningRoute);
}

function saveGroupFilter() {
  localStorage.setItem(groupFilterKey, state.selectedGroupFilter);
}

function saveQuizStats() {
  localStorage.setItem(scopedKey(quizStatsKey, state.profile.avatar), JSON.stringify(state.quizStats));
}

function saveMastery() {
  localStorage.setItem(scopedKey(masteryKey, state.profile.avatar), JSON.stringify(state.mastery));
}

function saveTeacherFeedback() {
  localStorage.setItem(feedbackKey, JSON.stringify(state.teacherFeedback));
}

function saveReflections() {
  localStorage.setItem(scopedKey(reflectionKey, state.profile.avatar), JSON.stringify(state.reflections));
}

function savePracticeLog() {
  localStorage.setItem(scopedKey(practiceLogKey, state.profile.avatar), JSON.stringify(state.practiceLog));
}

function loadProfileProgress(avatar) {
  state.progress = readProfileData(storeKey, avatar);
  state.quizStats = readProfileData(quizStatsKey, avatar);
  state.mastery = readProfileData(masteryKey, avatar);
  state.reflections = readProfileData(reflectionKey, avatar);
  state.practiceLog = readProfileData(practiceLogKey, avatar);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function goalStatsForProgress(goal, progress) {
  const known = goal.words.filter((item) => progress[item.id] === "known").length;
  const hard = goal.words.filter((item) => progress[item.id] === "hard").length;
  return { known, hard, total: goal.words.length };
}

function blockStatsForProgress(block, progress) {
  const blockGoals = goals.filter((goal) => goal.block === block);
  const words = blockGoals.flatMap((goal) => goal.words);
  const known = words.filter((word) => progress[word.id] === "known").length;
  const hard = words.filter((word) => progress[word.id] === "hard").length;
  return { known, hard, total: words.length };
}

function wordsForGroup(block, group) {
  return goals
    .filter((goal) => goal.block === block && goal.group === group)
    .flatMap((goal) => goal.words);
}

function hardWordsForProgress(progress, block = "", group = "") {
  return goals
    .filter((goal) => (!block || goal.block === block) && (!group || goal.group === group))
    .flatMap((goal) => goal.words)
    .filter((word) => progress[word.id] === "hard");
}

function quizDifficultAnswers(quizStats, block = "", group = "") {
  return exercises
    .filter((exercise) => (!block || exercise.block === block) && (!group || exercise.group === group))
    .flatMap((exercise) => exercise.questions)
    .filter((question) => (quizStats[question.id]?.wrong || 0) > (quizStats[question.id]?.correct || 0))
    .map((question) => question.answer);
}

function uniqueList(items) {
  return [...new Set(items.filter(Boolean))];
}

function blockNumber(block) {
  return Number(block.match(/\d+/)?.[0] || 0);
}

function sortedBlocks() {
  return [...new Set(goals.map((goal) => goal.block))]
    .sort((a, b) => blockNumber(a) - blockNumber(b));
}

function questionsFromWords(words, block, group, title, type, limit = words.length) {
  const selectedWords = [...words].slice(0, limit);
  return {
    id: `dynamic-${type}-${block}-${group}-${Date.now()}`.replace(/\s+/g, "-").toLowerCase(),
    block,
    group,
    title,
    code: type === "daily" ? "korte ronde · vandaag" : "persoonlijk · extra oefenen",
    type,
    questions: selectedWords.map((item, questionIndex) => {
      const distractors = words
        .filter((word) => word.id !== item.id)
        .slice(questionIndex + 1)
        .concat(words.filter((word) => word.id !== item.id).slice(0, questionIndex + 1))
        .slice(0, type === "daily" ? 3 : 5)
        .map((word) => word.meaning);

      return {
        id: `${type}-${item.id}-${questionIndex}`,
        prompt: `Wat betekent: ${item.word}?`,
        options: [item.meaning, ...distractors],
        answer: item.meaning,
        explain: `${item.word} betekent: ${item.meaning}`,
        hint: item.example,
        word: item.word
      };
    })
  };
}

function createDailyExercise(block, group) {
  const words = wordsForGroup(block, group);
  const hardWords = hardWordsForProgress(state.progress, block, group);
  const mixedWords = uniqueWords([...hardWords, ...words]).slice(0, 10);
  return questionsFromWords(mixedWords.length ? mixedWords : words, block, group, "Vandaag oefenen", "daily", 10);
}

function createHardWordsExercise(block, group) {
  const words = wordsForGroup(block, group);
  const hardWords = hardWordsForProgress(state.progress, block, group);
  const quizHard = uniqueList(quizDifficultAnswers(state.quizStats, block, group));
  const quizHardWords = words.filter((word) => quizHard.includes(word.word) || quizHard.includes(word.meaning));
  const selectedWords = uniqueWords([...hardWords, ...quizHardWords]);
  return questionsFromWords(selectedWords.length ? selectedWords : words.slice(0, 8), block, group, "Mijn lastige woorden", "hard-words", selectedWords.length ? selectedWords.length : 8);
}

function uniqueWords(words) {
  const seen = new Set();
  return words.filter((word) => {
    if (!word || seen.has(word.id)) return false;
    seen.add(word.id);
    return true;
  });
}

function logPracticeMoment(type, item) {
  const now = new Date().toISOString();
  const entry = {
    type,
    id: item.id,
    title: item.title,
    block: item.block,
    group: item.group,
    at: now
  };
  const entries = Array.isArray(state.practiceLog.entries) ? state.practiceLog.entries : [];
  state.practiceLog.entries = [entry, ...entries].slice(0, 80);
  savePracticeLog();
}

function practiceEntriesFor(log, block = "", group = "") {
  const entries = Array.isArray(log.entries) ? log.entries : [];
  return entries.filter((entry) => (!block || entry.block === block) && (!group || entry.group === group));
}

function profileSummary(avatar) {
  const progress = readProfileData(storeKey, avatar);
  const quizStats = readProfileData(quizStatsKey, avatar);
  const reflections = readProfileData(reflectionKey, avatar);
  const practiceLog = readProfileData(practiceLogKey, avatar);
  const wordTotal = goals.reduce((total, goal) => total + goal.words.length, 0);
  const knownWords = goals.reduce((total, goal) => total + goalStatsForProgress(goal, progress).known, 0);
  const hardWords = goals
    .flatMap((goal) => goal.words)
    .filter((word) => progress[word.id] === "hard")
    .map((word) => word.word);
  const quizHardWords = quizDifficultAnswers(quizStats);
  const quizAnswers = Object.values(quizStats).reduce((total, item) => total + (item.correct || 0) + (item.wrong || 0), 0);
  const wrongAnswers = Object.values(quizStats).reduce((total, item) => total + (item.wrong || 0), 0);
  const reflectionCount = Object.keys(reflections).length;
  const practiceCount = practiceEntriesFor(practiceLog).length;

  return {
    progress,
    quizStats,
    reflections,
    practiceLog,
    wordTotal,
    knownWords,
    hardWords,
    quizHardWords,
    quizAnswers,
    wrongAnswers,
    reflectionCount,
    practiceCount
  };
}

function teacherAdvice(summary) {
  const blocks = sortedBlocks().map((block) => {
    const stats = blockStatsForProgress(block, summary.progress);
    const percentage = stats.total === 0 ? 0 : Math.round((stats.known / stats.total) * 100);
    return { block, ...stats, percentage };
  });
  const startedBlocks = blocks.filter((block) => block.known > 0 || block.hard > 0);
  const bestBlock = [...startedBlocks].sort((a, b) => b.percentage - a.percentage)[0];
  const attentionBlock = [...blocks].sort((a, b) => {
    if (b.hard !== a.hard) return b.hard - a.hard;
    return a.percentage - b.percentage;
  })[0];
  const difficultWords = summary.hardWords.slice(0, 6).join(", ") || "nog geen";
  const quizWords = uniqueList(summary.quizHardWords).slice(0, 6).join(", ") || "nog geen";

  return {
    bestBlock: bestBlock ? `${bestBlock.block} (${bestBlock.percentage}%)` : "nog niet gestart",
    attentionBlock: attentionBlock ? `${attentionBlock.block} (${attentionBlock.hard} lastig)` : "nog niet gestart",
    difficultWords,
    quizWords
  };
}

function blockQuizAccuracy(block, group, quizStats) {
  const blockQuestions = exercises
    .filter((exercise) => exercise.block === block && (!group || exercise.group === group))
    .flatMap((exercise) => exercise.questions);
  const totals = blockQuestions.reduce((acc, question) => {
    const stats = quizStats[question.id] || {};
    acc.correct += stats.correct || 0;
    acc.wrong += stats.wrong || 0;
    return acc;
  }, { correct: 0, wrong: 0 });
  const attempts = totals.correct + totals.wrong;
  const percentage = attempts === 0 ? 0 : Math.round((totals.correct / attempts) * 100);
  return { ...totals, attempts, percentage };
}

function teacherBlockAdvice(stats, accuracy, practiced) {
  if (practiced === 0 && stats.known === 0) return "nog starten";
  if (stats.hard >= 5 || (accuracy.attempts > 0 && accuracy.percentage < 50)) return "verlengde instructie";
  if (accuracy.percentage >= 80 && stats.hard <= 2) return "verdieping";
  return "kort herhalen";
}

function goalStats(goal) {
  const known = goal.words.filter((item) => state.progress[item.id] === "known").length;
  const hard = goal.words.filter((item) => state.progress[item.id] === "hard").length;
  return { known, hard, total: goal.words.length };
}

function blockStats(block, group = "") {
  const blockGoals = goals.filter((goal) => goal.block === block && (!group || goal.group === group));
  const words = blockGoals.flatMap((goal) => goal.words);
  const known = words.filter((word) => state.progress[word.id] === "known").length;
  const hard = words.filter((word) => state.progress[word.id] === "hard").length;
  return { known, hard, total: words.length };
}

function latestBlock() {
  return [...sortedBlocks()].reverse()[0] || "Blok 1";
}

function menuStageKey(block, group) {
  return `${block}|${group}`;
}

function renderProfile() {
  const currentName = state.profile.name || state.profileRegistry[state.profile.avatar]?.name || "";
  elements.avatarLabel.textContent = currentName
    ? `${state.profile.avatar} ${currentName}`
    : "Typ je naam en kies een vrije avatar";
  elements.heroAvatar.textContent = state.profile.avatar || "✨";
  elements.heroProfileName.textContent = currentName || "Kies je avatar";
  elements.heroProfileHint.textContent = currentName
    ? `${state.profile.avatar} is jouw oefenprofiel.`
    : "Typ je naam en kies daarna je avatar.";
  elements.studentNameInput.value = state.profile.avatar === teacherTestAvatar ? "" : currentName;
  elements.avatarRow.innerHTML = avatars.map((avatar) => `
    <button class="avatar-button ${avatarButtonClasses(avatar)}" type="button" data-avatar="${avatar}" ${avatarIsLocked(avatar) ? "disabled" : ""} aria-label="${avatarLabel(avatar)}">
      ${avatar}
    </button>
  `).join("");

  const feedback = state.teacherFeedback[state.profile.avatar];
  elements.teacherNote.classList.toggle("hidden", !feedback);
  elements.teacherNote.textContent = feedback ? `${state.profile.avatar} Bericht van de leerkracht: ${feedback}` : "";
  elements.profileStatus.textContent = profileStatusText();
  renderLearningRoute();
}

function avatarIsLocked(avatar) {
  if (avatar === teacherTestAvatar) return false;
  return Boolean(state.profileRegistry[avatar] && avatar !== state.profile.avatar);
}

function avatarButtonClasses(avatar) {
  return [
    avatar === state.profile.avatar ? "active" : "",
    avatarIsLocked(avatar) ? "locked" : "",
    avatar === teacherTestAvatar ? "test-avatar" : ""
  ].filter(Boolean).join(" ");
}

function avatarLabel(avatar) {
  if (avatar === teacherTestAvatar) return "Testavatar voor leerkracht";
  if (avatarIsLocked(avatar)) return `Avatar ${avatar} is al gekozen`;
  return `Kies avatar ${avatar}`;
}

function profileStatusText() {
  if (state.profile.avatar === teacherTestAvatar) {
    return "Testprofiel voor de leerkracht. Deze avatar blijft vrij om te proberen.";
  }
  const name = state.profile.name || state.profileRegistry[state.profile.avatar]?.name;
  return name
    ? `${name}, jouw avatar is gereserveerd. Je kunt later met deze avatar verder oefenen.`
    : "Typ eerst je naam en kies daarna een vrije avatar.";
}

function renderLearningRoute() {
  const route = learningRoutes[state.learningRoute] || learningRoutes.normal;
  elements.routeLabel.textContent = `${route.label} · ${route.intro}`;
  elements.routeRow.querySelectorAll("[data-route]").forEach((button) => {
    button.classList.toggle("active", button.dataset.route === state.learningRoute);
  });
}

function renderFinalTestPanel() {
  const finalTests = exercises.filter((exercise) => exercise.type === "final-test" && exercise.group === state.selectedGroupFilter);
  const reviewRounds = exercises.filter((exercise) => exercise.type === "review" && exercise.group === state.selectedGroupFilter);
  return `
    <section class="dashboard-panel" aria-label="Startdashboard">
      <div class="group-switch" role="group" aria-label="Kies je groep">
        ${[...new Set(goals.map((goal) => goal.group))].sort().map((group) => `
          <button class="${state.selectedGroupFilter === group ? "active" : ""}" type="button" data-group-filter="${group}">
            ${group}
          </button>
        `).join("")}
      </div>
      <div class="dashboard-copy">
        <p class="kicker">Snel starten</p>
        <h3>${state.selectedGroupFilter}</h3>
        <p>Kies een korte herhaling, maak de eindtoets of oefen hieronder per blok.</p>
      </div>
      <div class="dashboard-actions">
        ${reviewRounds.map((exercise) => `
          <button class="dashboard-button review" type="button" data-review-round="${exercise.id}">
            <strong>Herhaling</strong>
            <span>${exercise.questions.length} vragen · alle blokken</span>
          </button>
        `).join("")}
        ${finalTests.map((exercise) => `
          <button class="dashboard-button final" type="button" data-final-test="${exercise.id}">
            <strong>Eindtoets</strong>
            <span>${exercise.questions.length} vragen · 6 keuzes</span>
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function renderMenu() {
  const blocks = sortedBlocks().filter((block) => goals.some((goal) => goal.block === block && goal.group === state.selectedGroupFilter));
  const defaultOpenBlock = [...blocks].reverse()[0] || latestBlock();
  blocks.forEach((block) => {
    if (state.menuOpenBlocks[block] === undefined) {
      state.menuOpenBlocks[block] = block === defaultOpenBlock;
    }
  });
  if (!blocks.includes(state.activeMenuBlock)) state.activeMenuBlock = defaultOpenBlock;
  renderProfile();
  const blockTabs = `
    <nav class="block-tabs" aria-label="Kies blok">
      ${blocks.map((block) => {
        const stats = blockStats(block, state.selectedGroupFilter);
        const percentage = stats.total === 0 ? 0 : Math.round((stats.known / stats.total) * 100);
        return `
          <button class="${state.activeMenuBlock === block ? "active" : ""}" type="button" data-block-select="${block}">
            <strong>${block}</strong>
            <small>${percentage}%</small>
          </button>
        `;
      }).join("")}
    </nav>
  `;
  const block = state.activeMenuBlock;
  elements.groupMenu.innerHTML = blockTabs + renderFinalTestPanel() + (() => {
    const isOpen = true;
    const stats = blockStats(block, state.selectedGroupFilter);
    const percentage = stats.total === 0 ? 0 : Math.round((stats.known / stats.total) * 100);
    const groups = [state.selectedGroupFilter].filter((group) => goals.some((goal) => goal.block === block && goal.group === group));
    const groupPanels = groups.map((group) => {
      const stageKey = menuStageKey(block, group);
      const activeStage = state.menuStages[stageKey] || "learn";
      const groupStats = blockStats(block, group);
      const groupGoals = goals.filter((goal) => goal.block === block && goal.group === group);
      const allGroupWords = wordsForGroup(block, group);
      const hardWords = hardWordsForProgress(state.progress, block, group);
      const quizHard = uniqueList(quizDifficultAnswers(state.quizStats, block, group));
      const practiceCount = practiceEntriesFor(state.practiceLog, block, group).length;
      const groupPercentage = groupStats.total === 0 ? 0 : Math.round((groupStats.known / groupStats.total) * 100);
      const allHardLabels = uniqueList([...hardWords.map((word) => word.word), ...quizHard]).slice(0, 6);
      const hardPanel = allHardLabels.length
        ? `<div class="hard-word-panel">
            <strong>Mijn lastige woorden</strong>
            <p>${allHardLabels.map(escapeHtml).join(" · ")}</p>
          </div>`
        : `<div class="hard-word-panel is-empty">
            <strong>Mijn lastige woorden</strong>
            <p>Nog geen lastige woorden. Lekker bezig.</p>
          </div>`;
      const groupExercises = exercises.filter((exercise) => exercise.block === block && exercise.group === group && !["meaning", "practice-test", "sentence", "final-test"].includes(exercise.type));
      const meaningExercises = exercises.filter((exercise) => exercise.block === block && exercise.group === group && exercise.type === "meaning");
      const practiceTests = exercises.filter((exercise) => exercise.block === block && exercise.group === group && exercise.type === "practice-test");
      const sentenceExercises = exercises.filter((exercise) => exercise.block === block && exercise.group === group && exercise.type === "sentence");
      const goalButtons = groupGoals.map((goal) => {
        const stats = goalStats(goal);
        const medalSummary = medalSummaryFor(goal.words);
        return `
          <button class="goal-card" type="button" data-goal-id="${goal.id}">
            <span>
              <strong>${goal.title}</strong>
              <small>${goal.code} · ${goal.words.length} woorden · ${stats.hard} nog lastig</small>
              ${medalSummary ? `<small class="goal-medals" aria-label="Groei: ${medalSummary}">${medalSummary}</small>` : ""}
            </span>
            <span class="goal-meter">${stats.known}/${stats.total}</span>
          </button>
        `;
      }).join("");
      const exerciseButtons = groupExercises.map((exercise) => `
        <button class="exercise-card" type="button" data-exercise-id="${exercise.id}">
          <span>
            <strong>${exercise.title}</strong>
            <small>${exercise.code} · ${exercise.questions.length} vragen</small>
          </span>
          <span class="exercise-meter">quiz</span>
        </button>
      `).join("");
      const meaningButtons = meaningExercises.map((exercise) => `
        <button class="exercise-card" type="button" data-exercise-id="${exercise.id}">
          <span>
            <strong>${exercise.title}</strong>
            <small>${exercise.code} · ${exercise.questions.length} vragen</small>
          </span>
          <span class="exercise-meter">4 keuzes</span>
        </button>
      `).join("");
      const sentenceButtons = sentenceExercises.map((exercise) => `
        <button class="exercise-card sentence-card" type="button" data-exercise-id="${exercise.id}">
          <span>
            <strong>${exercise.title}</strong>
            <small>${exercise.code} · ${exercise.questions.length} vragen</small>
          </span>
          <span class="exercise-meter">verdieping</span>
        </button>
      `).join("");
      const practiceButtons = practiceTests.map((exercise) => `
        <button class="exercise-card test-card" type="button" data-exercise-id="${exercise.id}">
          <span>
            <strong><span class="test-check" aria-hidden="true">✓</span>${exercise.title}</strong>
            <small>${exercise.code} · ${exercise.questions.length} vragen</small>
          </span>
          <span class="exercise-meter">moeilijker</span>
        </button>
      `).join("");

      return `
        <section class="group-panel">
          <p class="kicker">Oefenen</p>
          <div class="group-heading">
            <h3>${group}</h3>
            <span>${groupStats.known}/${groupStats.total} bekend</span>
          </div>
          <div class="group-quick-stats" aria-label="Overzicht voor ${group}">
            <span>${groupPercentage}% klaar</span>
            <span>${groupGoals.length} doelen</span>
            <span>${allGroupWords.length} woorden</span>
            <span>${practiceCount} keer geoefend</span>
          </div>
          ${hardPanel}
          <div class="quick-actions" aria-label="Snelle oefeningen voor ${group}">
            <button class="quick-action primary" type="button" data-daily-practice="${block}|${group}">
              <strong>Vandaag oefenen</strong>
              <span>korte mixronde</span>
            </button>
            <button class="quick-action" type="button" data-hard-practice="${block}|${group}">
              <strong>Mijn lastige woorden</strong>
              <span>persoonlijk oefenen</span>
            </button>
          </div>
          <div class="stage-tabs" role="group" aria-label="Kies oefenfase">
            <button class="${activeStage === "learn" ? "active" : ""}" type="button" data-menu-stage="${stageKey}" data-stage="learn">📚 Leren</button>
            <button class="${activeStage === "practice" ? "active" : ""}" type="button" data-menu-stage="${stageKey}" data-stage="practice">✍️ Oefenen</button>
            <button class="${activeStage === "test" ? "active" : ""}" type="button" data-menu-stage="${stageKey}" data-stage="test">✓ Toetsen</button>
          </div>
          <div class="menu-stage ${activeStage === "learn" ? "" : "hidden"}">
            <div class="stage-heading">
              <strong>1. Leren</strong>
              <span>Flashcards en woorden herhalen</span>
            </div>
            <div class="goal-list compact-list">${goalButtons}</div>
          </div>
          <div class="menu-stage ${activeStage === "practice" ? "" : "hidden"}">
            <div class="stage-heading">
              <strong>2. Oefenen</strong>
              <span>Meerkeuze, begrippen en zinnen</span>
            </div>
            <div class="exercise-list compact-list">${exerciseButtons}${meaningButtons}${sentenceButtons}</div>
          </div>
          <div class="menu-stage test-stage ${activeStage === "test" ? "" : "hidden"}">
            <div class="stage-heading">
              <strong>3. Toetsen</strong>
              <span>Oefentoets met 6 keuzes</span>
            </div>
            <div class="exercise-list compact-list">${practiceButtons}</div>
          </div>
        </section>
      `;
    }).join("");

    return `
      <section class="block-panel ${isOpen ? "is-open" : ""}">
        <button class="block-heading" type="button" data-block-toggle="${block}" aria-expanded="${isOpen}">
          <span>
            <p class="kicker">Woordenschat</p>
            <h3>${block}</h3>
          </span>
          <span class="block-progress">
            <strong>${stats.known}/${stats.total}</strong>
            <small>${percentage}% bekend · ${stats.hard} lastig</small>
          </span>
          <span class="block-chevron" aria-hidden="true">${isOpen ? "−" : "+"}</span>
        </button>
        <div class="block-grid ${isOpen ? "" : "hidden"}">${groupPanels}</div>
      </section>
    `;
  })();
}

function openGoal(goalId) {
  const goal = goals.find((item) => item.id === goalId);
  state.selectedGoal = goal;
  logPracticeMoment("flashcards", goal);
  state.deck = [...goal.words];
  applyAdaptiveDeck();
  state.index = 0;
  state.helperLives = 3;
  state.wordListOpen = false;
  state.helperMessage = "Je hebt 3 hartjes voor hulp bij deze oefenronde.";
  state.flipped = false;
  elements.searchInput.value = "";
  elements.menuView.classList.add("hidden");
  elements.stepStrip.classList.add("hidden");
  elements.groupMenu.classList.add("hidden");
  elements.studyView.classList.remove("hidden");
  elements.quizView.classList.add("hidden");
  elements.teacherView.classList.add("hidden");
  elements.backButton.classList.remove("hidden");
  renderStudy();
}

function openExercise(exerciseId) {
  const exercise = exercises.find((item) => item.id === exerciseId);
  openExerciseObject(exercise);
}

function openExerciseObject(exercise) {
  state.selectedExercise = exercise;
  logPracticeMoment(exercise.type || "quiz", exercise);
  state.quizQueue = buildAdaptiveQuizQueue(exercise);
  state.quizIndex = 0;
  state.quizAnswers = {};
  state.quizOptions = {};
  state.quizOptionOffset = Math.floor(Math.random() * 4);
  state.hintVisible = false;
  elements.menuView.classList.add("hidden");
  elements.stepStrip.classList.add("hidden");
  elements.groupMenu.classList.add("hidden");
  elements.studyView.classList.add("hidden");
  elements.quizView.classList.remove("hidden");
  elements.teacherView.classList.add("hidden");
  elements.backButton.classList.remove("hidden");
  renderQuiz();
}

function startDailyPractice(block, group) {
  openExerciseObject(createDailyExercise(block, group));
}

function startHardPractice(block, group) {
  openExerciseObject(createHardWordsExercise(block, group));
}

function openTeacherView() {
  elements.menuView.classList.add("hidden");
  elements.stepStrip.classList.add("hidden");
  elements.groupMenu.classList.add("hidden");
  elements.studyView.classList.add("hidden");
  elements.quizView.classList.add("hidden");
  elements.teacherView.classList.remove("hidden");
  elements.backButton.classList.remove("hidden");
  renderTeacherView();
}

function applyAdaptiveDeck() {
  const hardWords = state.selectedGoal.words.filter((item) => state.progress[item.id] === "hard");
  if (hardWords.length === 0) return;
  const deck = [...state.deck];
  hardWords.forEach((word, repeatIndex) => {
    const insertAt = Math.min(deck.length, 3 + repeatIndex * 4);
    deck.splice(insertAt, 0, word);
  });
  state.deck = deck;
}

function buildAdaptiveQuizQueue(exercise) {
  if (exercise.type === "final-test") return [...exercise.questions];
  const queue = [...exercise.questions];
  const missed = exercise.questions
    .filter((question) => (state.quizStats[question.id]?.wrong || 0) > (state.quizStats[question.id]?.correct || 0))
    .slice(0, 2);
  missed.forEach((question, repeatIndex) => {
    const insertAt = Math.min(queue.length, 3 + repeatIndex * 3);
    queue.splice(insertAt, 0, question);
  });
  return queue;
}

function isTestExercise(exercise) {
  return ["practice-test", "final-test"].includes(exercise.type);
}

// Aantal antwoordkeuzes per leerroute (differentiatie).
const ROUTE_OPTION_COUNT = { calm: 3, normal: 4, challenge: 6 };

// Sets met alle woorden en alle betekenissen, om het antwoordtype te bepalen.
let WORD_SET = null;
let MEANING_SET = null;
function buildAnswerSets() {
  WORD_SET = new Set();
  MEANING_SET = new Set();
  goals.flatMap((goal) => goal.words).forEach((w) => {
    if (w.word) WORD_SET.add(w.word);
    if (w.meaning) MEANING_SET.add(w.meaning);
  });
}

// Verzamel afleiders van hetzelfde type als het juiste antwoord (woord óf betekenis).
function distractorPool(question) {
  if (!WORD_SET) buildAnswerSets();
  const wordAnswer = WORD_SET.has(question.answer)
    || (!MEANING_SET.has(question.answer) && question.answer.split(" ").length <= 3);
  return [...(wordAnswer ? WORD_SET : MEANING_SET)];
}

function optionCountForRoute(exercise, question) {
  // Toetsen houden hun eigen (moeilijke) aantal; oefenen volgt de leerroute.
  if (isTestExercise(exercise)) return question.options.length;
  return ROUTE_OPTION_COUNT[state.learningRoute] || 4;
}

function shuffledOptions(exercise, question) {
  const cacheKey = `${question.id}@${state.learningRoute}`;
  if (!state.quizOptions[cacheKey]) {
    const count = optionCountForRoute(exercise, question);
    let distractors = question.options.filter((option) => option !== question.answer);
    // Bij Uitdaging (6 keuzes) vullen we aan met extra afleiders uit alle woorden.
    if (distractors.length < count - 1) {
      const extra = distractorPool(question)
        .filter((option) => option !== question.answer && !distractors.includes(option))
        .sort(() => Math.random() - 0.5);
      distractors = distractors.concat(extra);
    }
    distractors = distractors.sort(() => Math.random() - 0.5).slice(0, Math.max(1, count - 1));
    const questionNumber = Number(question.id.split("-").pop());
    const answerPosition = (questionNumber + state.quizOptionOffset + 1) % (distractors.length + 1);
    const options = [...distractors];
    options.splice(answerPosition, 0, question.answer);
    state.quizOptions[cacheKey] = options;
  }
  return state.quizOptions[cacheKey];
}

// ===== Groeimeter per woord (brons/zilver/goud) =====
// Bepaal welk woord bij een quizvraag hoort (voor het bijhouden van groei).
function questionWord(question) {
  if (!question) return null;
  if (question.word) return question.word;
  const match = question.prompt && question.prompt.match(/Wat betekent:\s*(.+?)\?/);
  if (match) return match[1].trim();
  if (!WORD_SET) buildAnswerSets();
  if (WORD_SET.has(question.answer)) return question.answer;
  return null;
}

const MASTERY_TIERS = [
  { min: 5, level: 3, medal: "🥇", label: "goud" },
  { min: 3, level: 2, medal: "🥈", label: "zilver" },
  { min: 1, level: 1, medal: "🥉", label: "brons" }
];

function masteryCount(word) {
  return (word && state.mastery[word]) || 0;
}

function masteryInfo(word) {
  const count = masteryCount(word);
  const tier = MASTERY_TIERS.find((t) => count >= t.min);
  return tier ? { count, ...tier } : { count, level: 0, medal: "", label: "nieuw" };
}

// Compacte medaille-samenvatting voor een set woorden, bijv. "🥇2 🥈1 🥉3".
function medalSummaryFor(words) {
  const tally = { 3: 0, 2: 0, 1: 0 };
  words.forEach((w) => {
    const level = masteryInfo(w.word).level;
    if (level) tally[level] += 1;
  });
  return [
    tally[3] ? `🥇${tally[3]}` : "",
    tally[2] ? `🥈${tally[2]}` : "",
    tally[1] ? `🥉${tally[1]}` : ""
  ].filter(Boolean).join(" ");
}

// Een goed antwoord telt mee voor de groei van dat woord.
function bumpMastery(word) {
  if (!word) return;
  const beforeLevel = masteryInfo(word).level;
  state.mastery[word] = masteryCount(word) + 1;
  saveMastery();
  const afterLevel = masteryInfo(word).level;
  // Nieuw medaille-niveau gehaald? Vier het met een toast + confetti.
  if (afterLevel > beforeLevel && afterLevel > 0 && typeof window.WoordVier === "function") {
    const tier = MASTERY_TIERS.find((t) => t.level === afterLevel);
    const naam = tier.label.charAt(0).toUpperCase() + tier.label.slice(1);
    window.WoordVier(`${tier.medal} ${naam}! "${word}"`);
  }
}

function currentCard() {
  return state.deck[state.index] || state.selectedGoal.words[0];
}

function renderStudy() {
  const goal = state.selectedGoal;
  const card = currentCard();
  const stats = goalStats(goal);
  const countText = `${state.index + 1} / ${state.deck.length}`;
  const askingMeaning = state.mode === "word";

  const goldCount = goal.words.filter((w) => masteryInfo(w.word).level === 3).length;
  const cardMedal = masteryInfo(card.word).medal;
  const countWithMedal = cardMedal ? `${cardMedal} ${countText}` : countText;

  elements.studyGroup.textContent = `${goal.block} · ${goal.group} · ${goal.code}`;
  elements.studyTitle.textContent = goal.title;
  elements.progressPill.textContent = `${stats.known} bekend · ${stats.hard} nog oefenen${goldCount ? ` · ${goldCount}🥇` : ""}`;
  elements.flashcard.classList.toggle("is-flipped", state.flipped);
  elements.cardCount.textContent = countWithMedal;
  elements.backCount.textContent = countWithMedal;
  elements.frontLabel.textContent = askingMeaning ? "Wat betekent dit woord?" : "Welk woord hoort hierbij?";
  elements.frontText.textContent = askingMeaning ? card.word : card.meaning;
  elements.backLabel.textContent = askingMeaning ? "Betekenis" : "Woord";
  elements.backText.textContent = askingMeaning ? card.meaning : card.word;
  elements.exampleText.textContent = card.example;
  elements.modeWord.classList.toggle("active", state.mode === "word");
  elements.modeMeaning.classList.toggle("active", state.mode === "meaning");
  renderHelperState();

  renderWordList();
  renderMenu();
}

function renderHelperState() {
  const hearts = "❤".repeat(state.helperLives) + "♡".repeat(3 - state.helperLives);
  elements.helperLives.textContent = `${hearts} hartjes over`;
  elements.helperMessage.textContent = state.helperMessage;
  elements.toggleWordListButton.textContent = state.wordListOpen ? "Woordenlijst sluiten" : "Woordenlijst openen";
  elements.toggleWordListButton.classList.toggle("is-disabled", state.helperLives <= 0 && !state.wordListOpen);
  elements.searchInput.classList.toggle("hidden", !state.wordListOpen);
  elements.wordList.classList.toggle("is-locked", !state.wordListOpen);
}

function currentQuestion() {
  return state.quizQueue[state.quizIndex] || state.selectedExercise.questions[0];
}

function quizAnswerKey() {
  return `${currentQuestion().id}-slot-${state.quizIndex}`;
}

function renderWordList() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const rows = state.selectedGoal.words
    .filter((item) => `${item.word} ${item.meaning}`.toLowerCase().includes(query))
    .map((item) => {
      const status = state.progress[item.id] || "";
      const m = masteryInfo(item.word);
      const medal = m.medal
        ? ` <span class="mastery-medal" title="Groei: ${m.label} (${m.count}× goed)">${m.medal}</span>`
        : "";
      return `
        <button class="word-row" type="button" data-word-id="${item.id}">
          <strong>${item.word}${medal}</strong>
          <p>${item.meaning}</p>
          <span class="status-dot ${status}" aria-label="${status || "niet geoefend"}"></span>
        </button>
      `;
    })
    .join("");
  elements.wordList.innerHTML = rows || `<p>Geen woorden gevonden.</p>`;
}

function goTo(offset) {
  state.index = (state.index + offset + state.deck.length) % state.deck.length;
  state.flipped = false;
  if (state.wordListOpen) {
    state.wordListOpen = false;
    state.helperMessage = "De woordenlijst is weer dicht. Probeer deze kaart eerst zelf.";
  }
  renderStudy();
}

function setStatus(status) {
  state.progress[currentCard().id] = status;
  if (status === "known") bumpMastery(currentCard().word);
  saveProgress();
  if (state.index < state.deck.length - 1) {
    goTo(1);
  } else {
    renderStudy();
  }
}

function shuffleDeck() {
  state.deck = [...state.deck].sort(() => Math.random() - 0.5);
  state.index = 0;
  state.flipped = false;
  renderStudy();
}

function practiceHardWords() {
  const hardWords = state.selectedGoal.words.filter((item) => state.progress[item.id] === "hard");
  state.deck = hardWords.length ? hardWords : [...state.selectedGoal.words];
  state.index = 0;
  state.flipped = false;
  renderStudy();
}

function closeStudy() {
  elements.studyView.classList.add("hidden");
  elements.quizView.classList.add("hidden");
  elements.teacherView.classList.add("hidden");
  elements.backButton.classList.add("hidden");
  elements.menuView.classList.remove("hidden");
  elements.stepStrip.classList.remove("hidden");
  elements.groupMenu.classList.remove("hidden");
  state.selectedGoal = null;
  state.selectedExercise = null;
  renderMenu();
}

elements.groupMenu.addEventListener("click", (event) => {
  const groupFilterButton = event.target.closest("[data-group-filter]");
  if (groupFilterButton) {
    state.selectedGroupFilter = groupFilterButton.dataset.groupFilter;
    saveGroupFilter();
    renderMenu();
    return;
  }

  const reviewButton = event.target.closest("[data-review-round]");
  if (reviewButton) {
    openExercise(reviewButton.dataset.reviewRound);
    return;
  }

  const finalTestButton = event.target.closest("[data-final-test]");
  if (finalTestButton) {
    openExercise(finalTestButton.dataset.finalTest);
    return;
  }

  const blockSelect = event.target.closest("[data-block-select]");
  if (blockSelect) {
    state.activeMenuBlock = blockSelect.dataset.blockSelect;
    state.menuOpenBlocks[state.activeMenuBlock] = true;
    renderMenu();
    return;
  }

  const blockButton = event.target.closest("[data-block-toggle]");
  if (blockButton) {
    const block = blockButton.dataset.blockToggle;
    state.menuOpenBlocks[block] = !state.menuOpenBlocks[block];
    renderMenu();
    return;
  }

  const stageButton = event.target.closest("[data-menu-stage]");
  if (stageButton) {
    state.menuStages[stageButton.dataset.menuStage] = stageButton.dataset.stage;
    renderMenu();
    return;
  }

  const dailyButton = event.target.closest("[data-daily-practice]");
  if (dailyButton) {
    const [block, group] = dailyButton.dataset.dailyPractice.split("|");
    startDailyPractice(block, group);
    return;
  }

  const hardPracticeButton = event.target.closest("[data-hard-practice]");
  if (hardPracticeButton) {
    const [block, group] = hardPracticeButton.dataset.hardPractice.split("|");
    startHardPractice(block, group);
    return;
  }

  const button = event.target.closest("[data-goal-id]");
  if (button) {
    openGoal(button.dataset.goalId);
    return;
  }

  const exerciseButton = event.target.closest("[data-exercise-id]");
  if (exerciseButton) openExercise(exerciseButton.dataset.exerciseId);
});

elements.flashcard.addEventListener("click", () => {
  state.flipped = !state.flipped;
  renderStudy();
});

elements.flashcard.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    state.flipped = !state.flipped;
    renderStudy();
  }
});

elements.prevButton.addEventListener("click", () => goTo(-1));
elements.nextButton.addEventListener("click", () => goTo(1));
elements.hardButton.addEventListener("click", () => setStatus("hard"));
elements.knownButton.addEventListener("click", () => setStatus("known"));
elements.shuffleButton.addEventListener("click", shuffleDeck);
elements.practiceButton.addEventListener("click", practiceHardWords);
elements.backButton.addEventListener("click", closeStudy);

elements.modeWord.addEventListener("click", () => {
  state.mode = "word";
  state.flipped = false;
  renderStudy();
});

elements.modeMeaning.addEventListener("click", () => {
  state.mode = "meaning";
  state.flipped = false;
  renderStudy();
});

elements.wordList.addEventListener("click", (event) => {
  const row = event.target.closest("[data-word-id]");
  if (!row) return;
  const deckIndex = state.deck.findIndex((item) => item.id === row.dataset.wordId);
  if (deckIndex >= 0) {
    state.index = deckIndex;
  } else {
    state.deck = [...state.selectedGoal.words];
    state.index = state.deck.findIndex((item) => item.id === row.dataset.wordId);
  }
  state.flipped = false;
  renderStudy();
});

elements.searchInput.addEventListener("input", renderWordList);

elements.toggleWordListButton.addEventListener("click", () => {
  if (state.wordListOpen) {
    state.wordListOpen = false;
    state.helperMessage = "Goed zo, probeer de kaart nu weer zonder lijst.";
    renderStudy();
    return;
  }

  if (state.helperLives <= 0) {
    state.helperMessage = "Nu zonder hulp proberen 💪 Je kunt meer dan je denkt.";
    renderStudy();
    return;
  }

  state.helperLives -= 1;
  state.wordListOpen = true;
  state.helperMessage = state.helperLives > 0
    ? "Je gebruikt een hartje voor hulp. Kijk kort en probeer daarna zelf verder."
    : "Laatste hartje gebruikt. Daarna ga je zonder woordenlijst verder 💪";
  renderStudy();
});

function renderQuiz() {
  const exercise = state.selectedExercise;
  const question = currentQuestion();
  const selected = state.quizAnswers[quizAnswerKey()];
  const score = quizScoreDetails();
  const allCoreAnswered = exercise.questions.every((item) => score.answeredKeys.some((key) => key.startsWith(`${item.id}-slot-`)));
  const allQueueAnswered = score.answeredCount === state.quizQueue.length;

  elements.quizGroup.textContent = `${exercise.block} · ${exercise.group} · ${exercise.code}`;
  elements.quizTitle.textContent = exercise.title;
  elements.quizView.classList.toggle("test-mode", isTestExercise(exercise));
  elements.quizScore.textContent = `${score.correctCount}/${state.quizQueue.length} goed`;
  renderScoreBar(exercise, score);
  elements.quizCount.textContent = `${state.quizIndex + 1} / ${state.quizQueue.length}`;
  elements.quizPrompt.textContent = question.prompt;
  renderQuizVisual(exercise, question);
  renderHint(exercise, question);
  elements.quizFeedback.textContent = quizFeedbackText(exercise, question, selected);

  elements.answerGrid.innerHTML = shuffledOptions(exercise, question).map((option) => {
    const status = answerStatus(exercise, question, selected, option);
    return `<button class="answer-button ${status}" type="button" data-answer="${option}">${option}</button>`;
  }).join("");
  renderResultCard(allQueueAnswered, score);
  renderReflection(allCoreAnswered);
}

function renderHint(exercise, question) {
  // Hint beschikbaar op alle leerroutes (Rustig, Gewoon én Uitdaging),
  // alleen niet tijdens een echte toets.
  const canShowHint = !isTestExercise(exercise);
  // Rustig = extra uitleg: de voorbeeldzin staat standaard aan (geen knop nodig).
  const alwaysOn = canShowHint && state.learningRoute === "calm";
  const showText = canShowHint && (state.hintVisible || alwaysOn);
  elements.hintButton.classList.toggle("hidden", !canShowHint || alwaysOn);
  elements.hintText.classList.toggle("hidden", !showText);
  elements.hintButton.textContent = state.hintVisible ? "Hint verbergen" : "Hint tonen";
  elements.hintText.textContent = question.hint || question.explain || "Kijk goed naar de voorbeeldzin.";
}

function renderScoreBar(exercise, score) {
  const show = isTestExercise(exercise);
  elements.scoreBar.classList.toggle("hidden", !show);
  if (!show) return;

  const percentage = score.answeredCount === 0
    ? 0
    : Math.round((score.correctCount / score.answeredCount) * 100);
  elements.scorePercent.textContent = `${percentage}%`;
  elements.scoreFill.style.width = `${percentage}%`;
  elements.scoreFill.classList.toggle("is-passing", percentage >= 50);
}

function quizScoreDetails() {
  const answeredKeys = [];
  let correctCount = 0;
  let answeredCount = 0;
  const difficultQuestions = [];

  state.quizQueue.forEach((question, index) => {
    const key = `${question.id}-slot-${index}`;
    const answer = state.quizAnswers[key];
    if (!answer) return;
    answeredKeys.push(key);
    answeredCount += 1;
    if (answer === question.answer) {
      correctCount += 1;
    } else if (!difficultQuestions.some((item) => item.id === question.id)) {
      difficultQuestions.push(question);
    }
  });

  return { answeredCount, answeredKeys, correctCount, difficultQuestions };
}

function renderResultCard(show, score) {
  elements.resultCard.classList.toggle("hidden", !show);
  if (!show) return;

  const total = state.quizQueue.length;
  const percentage = Math.round((score.correctCount / total) * 100);
  const badge = percentage >= 90
    ? "🏆 Woordtopper"
    : percentage >= 75
      ? "⭐ Sterk geoefend"
      : percentage >= 50
        ? "💪 Goed bezig"
        : "🌱 Nog even groeien";
  const sticker = rewardSticker(state.selectedExercise, percentage);
  const difficultList = score.difficultQuestions
    .slice(0, 5)
    .map((question) => question.answer)
    .join(", ");
  elements.resultTitle.textContent = `${badge} · ${sticker} · ${score.correctCount}/${total}`;
  elements.resultText.textContent = difficultList
    ? `Je verdient de sticker ${sticker}. Herhaal nog even: ${difficultList}.`
    : percentage >= 80
      ? `Je verdient de sticker ${sticker}. Knap gedaan, je kent al veel begrippen.`
      : `Je verdient de sticker ${sticker}. Herhaal de woorden nog een keer voor extra zekerheid.`;
  elements.resultDifficultButton.classList.toggle("hidden", score.difficultQuestions.length === 0);
}

function rewardSticker(exercise, percentage) {
  if (percentage < 50) return "Doorzetter";
  if (exercise.type === "final-test") return "Eindtoetskanjer";
  if (exercise.title.includes("Media")) return "Media-speurder";
  if (exercise.title.includes("milieu") || exercise.title.includes("Omgeving")) return "Milieu-expert";
  if (exercise.title.includes("Wereld")) return "Werelddenker";
  if (exercise.title.includes("beroepen")) return "Werkwoordheld";
  if (exercise.type === "practice-test") return "Toetskanjer";
  return "Woordheld";
}

function quizFeedbackText(exercise, question, selected) {
  if (!selected) {
    return isTestExercise(exercise)
      ? "Kies 1 van de 6 antwoorden."
      : "Kies het antwoord dat het best past.";
  }

  if (selected !== question.answer) {
    if (isTestExercise(exercise)) {
      return `Bijna. ${feedbackTip(exercise, question)}`;
    }
    const hintNudge = state.learningRoute === "challenge"
      ? "Probeer het nog eens — gebruik de hint als je hem nodig hebt."
      : "Bekijk rustig de hint en probeer het opnieuw.";
    return `Helaas, dat is nog niet goed. ${hintNudge}`;
  }

  if (isTestExercise(exercise)) {
    return `Goed! ${shortExplain(question)}`;
  }

  return `Goed! ${question.explain}`;
}

function shortExplain(question) {
  return question.explain || "Je koos het best passende antwoord.";
}

function feedbackTip(exercise, question) {
  const word = question.word || question.prompt.match(/^Wat betekent: (.*)\?$/)?.[1] || question.answer;
  const hint = question.hint ? `Kijk nog eens naar de voorbeeldzin: ${question.hint}` : "";
  const topicTip = exercise.title.includes("Media")
    ? "Denk aan woorden die horen bij tekst, beeld of televisie."
    : exercise.title.includes("milieu") || exercise.title.includes("Omgeving")
      ? "Denk aan natuur, energie, landbouw of milieu."
      : exercise.title.includes("Wereld")
        ? "Denk aan landen, mensen en gebeurtenissen in de wereld."
        : exercise.title.includes("beroepen")
          ? "Denk aan werk, bedrijven of solliciteren."
          : "Lees de betekenis rustig opnieuw.";
  return hint || `${topicTip} Het woord waar je naar zoekt is: ${word}.`;
}

function answerStatus(exercise, question, selected, option) {
  if (!selected) return "";
  if (isTestExercise(exercise)) {
    if (selected === option && selected === question.answer) return "correct";
    if (selected === option) return "wrong";
    return "";
  }
  // Het juiste antwoord pas groen tonen als de leerling het zelf kiest.
  // Bij een fout antwoord verklappen we het goede antwoord NIET, zodat de
  // leerling rustig de hint kan gebruiken en zelf verder zoekt.
  if (selected === question.answer) {
    if (option === question.answer) return "correct";
    return "";
  }
  if (selected === option) return "wrong";
  return "";
}

function renderQuizVisual(exercise, question) {
  const match = question.prompt.match(/^Wat betekent: (.*)\?$/);
  const word = match ? match[1] : "";
  // Uitdaging = minder hulp: bij die route verbergen we de plaatjes altijd.
  const hideForChallenge = state.learningRoute === "challenge";
  const visual = !hideForChallenge && ["meaning", "practice-test", "daily", "hard-words", "review"].includes(exercise.type)
    ? (visualHints[word] || topicVisualHints(exercise.title))
    : "";
  elements.quizVisual.classList.toggle("hidden", !visual);
  const visuals = Array.isArray(visual) ? visual : [visual];
  elements.quizVisual.innerHTML = visual
    ? `<div class="visual-scene">${visuals.map((item) => `<span class="visual-emoji">${item}</span>`).join("")}</div>`
    : "";
}

function topicVisualHints(title) {
  if (title.includes("Media")) return ["📺", "📰", "🎥"];
  if (title.includes("milieu") || title.includes("Omgeving")) return ["🌍", "🌱", "⚡"];
  if (title.includes("Wereld")) return ["🌍", "🤝", "🗺️"];
  if (title.includes("beroepen")) return ["💼", "🏢", "🤝"];
  if (title.includes("Geld")) return ["💶", "🛒", "📊"];
  if (title.includes("Ruimte")) return ["🚀", "🔭", "🧪"];
  return ["📚", "💡", "✅"];
}

elements.answerGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-answer]");
  if (!button) return;
  const question = currentQuestion();
  const previous = state.quizAnswers[quizAnswerKey()];
  // Al goed beantwoord? Dan staat het antwoord vast en doen we niets meer.
  if (previous === question.answer) return;
  const answer = button.dataset.answer;
  // Dezelfde foute keuze nog eens aanklikken telt niet dubbel.
  if (answer === previous) return;
  state.quizAnswers[quizAnswerKey()] = answer;
  const stats = state.quizStats[question.id] || { correct: 0, wrong: 0 };
  if (answer === question.answer) {
    stats.correct += 1;
    bumpMastery(questionWord(question));
  } else {
    stats.wrong += 1;
    scheduleQuestionRepeat(question);
  }
  state.quizStats[question.id] = stats;
  saveQuizStats();
  renderQuiz();
});

elements.hintButton.addEventListener("click", () => {
  state.hintVisible = !state.hintVisible;
  renderQuiz();
});

function scheduleQuestionRepeat(question) {
  if (isTestExercise(state.selectedExercise)) return;
  if (state.quizQueue.length >= state.selectedExercise.questions.length + 3) return;
  const upcoming = state.quizQueue.slice(state.quizIndex + 1, state.quizIndex + 4);
  if (upcoming.some((item) => item.id === question.id)) return;
  const insertAt = Math.min(state.quizQueue.length, state.quizIndex + 3);
  state.quizQueue.splice(insertAt, 0, question);
}

elements.quizPrevButton.addEventListener("click", () => {
  state.quizIndex = (state.quizIndex - 1 + state.quizQueue.length) % state.quizQueue.length;
  state.hintVisible = false;
  renderQuiz();
});

elements.quizNextButton.addEventListener("click", () => {
  state.quizIndex = (state.quizIndex + 1) % state.quizQueue.length;
  state.hintVisible = false;
  renderQuiz();
});

elements.quizRestartButton.addEventListener("click", () => {
  state.quizQueue = buildAdaptiveQuizQueue(state.selectedExercise);
  state.quizIndex = 0;
  state.quizAnswers = {};
  state.quizOptions = {};
  state.quizOptionOffset = Math.floor(Math.random() * 4);
  state.hintVisible = false;
  renderQuiz();
});

function restartQuizRound(queue = buildAdaptiveQuizQueue(state.selectedExercise)) {
  state.quizQueue = queue;
  state.quizIndex = 0;
  state.quizAnswers = {};
  state.quizOptions = {};
  state.quizOptionOffset = Math.floor(Math.random() * 4);
  state.hintVisible = false;
  renderQuiz();
}

elements.resultRestartButton.addEventListener("click", () => restartQuizRound());

elements.resultDifficultButton.addEventListener("click", () => {
  const difficult = quizScoreDetails().difficultQuestions;
  restartQuizRound(difficult.length ? difficult : buildAdaptiveQuizQueue(state.selectedExercise));
});

elements.resultMenuButton.addEventListener("click", closeStudy);

function renderReflection(show) {
  elements.reflectionCard.classList.toggle("hidden", !show);
  if (!show) return;
  const exercise = state.selectedExercise;
  const saved = state.reflections[exercise.id] || "";
  const options = [
    ["super", "😄 Ik snap het"],
    ["bijna", "🙂 Bijna"],
    ["oefenen", "💪 Nog oefenen"]
  ];
  elements.reflectionGrid.innerHTML = options.map(([value, label]) => `
    <button class="reflection-button ${saved === value ? "active" : ""}" type="button" data-reflection="${value}">
      ${label}
    </button>
  `).join("");
  elements.reflectionText.textContent = saved
    ? "Fijn, je reflectie is bewaard. Kies straks nog een kaartenset of oefen de lastige woorden."
    : "Kies kort hoe het ging. Geen lang verhaal, alleen even nadenken.";
}

elements.reflectionGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reflection]");
  if (!button) return;
  state.reflections[state.selectedExercise.id] = button.dataset.reflection;
  saveReflections();
  renderQuiz();
});

function renderTeacherView() {
  const selectedAvatar = state.profileRegistry[state.teacherSelectedAvatar]
    ? state.teacherSelectedAvatar
    : state.profile.avatar;
  state.teacherSelectedAvatar = selectedAvatar;
  const selectedProfile = state.profileRegistry[selectedAvatar] || state.profile;
  const name = selectedProfile.name || "zonder naam";
  const selectedSummary = profileSummary(selectedAvatar);
  const advice = teacherAdvice(selectedSummary);
  elements.teacherAvatar.textContent = `${selectedAvatar} ${name}`;
  elements.teacherFeedbackInput.value = state.teacherFeedback[selectedAvatar] || "";
  elements.deleteProfileButton.disabled = selectedAvatar === teacherTestAvatar;
  elements.deleteProfileButton.classList.toggle("is-disabled", selectedAvatar === teacherTestAvatar);
  elements.feedbackTemplates.innerHTML = feedbackTemplates.map((text) => `
    <button class="template-button" type="button" data-template="${text}">${text.split(".")[0]}</button>
  `).join("");

  const dashboardCards = avatars.map((avatar) => {
    const profile = state.profileRegistry[avatar];
    const isTest = avatar === teacherTestAvatar;
    const isRegistered = Boolean(profile);
    const summary = profileSummary(avatar);
    const cardName = profile?.name || (isTest ? "Leerkracht test" : "Vrij");
    const hardLabel = summary.hardWords.length > 0
      ? `${summary.hardWords.slice(0, 3).join(", ")}${summary.hardWords.length > 3 ? "..." : ""}`
      : "geen";
    return `
      <button class="student-summary ${avatar === selectedAvatar ? "active" : ""} ${isRegistered ? "" : "empty"}" type="button" data-teacher-avatar="${avatar}">
        <span class="student-avatar">${avatar}</span>
        <span>
          <strong>${escapeHtml(cardName)}</strong>
          <small>${isRegistered ? `${summary.knownWords}/${summary.wordTotal} woorden · lastig: ${escapeHtml(hardLabel)}` : "Nog niet gekozen"}</small>
          <small>${isRegistered ? `${summary.practiceCount} oefenmomenten · ${summary.quizAnswers} antwoorden · ${summary.reflectionCount} reflecties` : "Beschikbaar voor leerling"}</small>
        </span>
      </button>
    `;
  }).join("");

  const blockRows = sortedBlocks().map((block) => {
    const stats = blockStatsForProgress(block, selectedSummary.progress);
    const percentage = stats.total === 0 ? 0 : Math.round((stats.known / stats.total) * 100);
    const practiced = practiceEntriesFor(selectedSummary.practiceLog, block).length;
    const accuracy = blockQuizAccuracy(block, "", selectedSummary.quizStats);
    const adviceLabel = teacherBlockAdvice(stats, accuracy, practiced);
    return `
      <div class="teacher-block-row">
        <span>
          <strong>${block}</strong>
          <small>${practiced} oefenmomenten · ${stats.hard} lastig · quiz ${accuracy.attempts ? `${accuracy.percentage}%` : "nog niet"}</small>
        </span>
        <span class="mini-progress" aria-label="${percentage}% bekend">
          <span style="width: ${percentage}%"></span>
        </span>
        <b>${percentage}% · ${adviceLabel}</b>
      </div>
    `;
  }).join("");

  const goalRows = goals.map((goal) => {
    const stats = goalStatsForProgress(goal, selectedSummary.progress);
    const hardWords = goal.words
      .filter((word) => selectedSummary.progress[word.id] === "hard")
      .map((word) => word.word)
      .join(", ");
    return `
      <div class="teacher-stat">
        <span>
          <strong>${goal.block} · ${goal.group} · ${goal.title}</strong>
          <small>${hardWords ? `Nog lastig: ${hardWords}` : "Geen lastige woorden gemarkeerd"}</small>
        </span>
        <span class="goal-meter">${stats.known}/${stats.total}</span>
      </div>
    `;
  }).join("");

  const quizRows = exercises.map((exercise) => {
    const difficult = exercise.questions
      .filter((question) => (selectedSummary.quizStats[question.id]?.wrong || 0) > (selectedSummary.quizStats[question.id]?.correct || 0))
      .map((question) => question.answer)
      .join(", ");
    const reflection = selectedSummary.reflections[exercise.id] || "nog geen reflectie";
    return `
      <div class="teacher-stat">
        <span>
          <strong>${exercise.block} · ${exercise.group} · ${exercise.title}</strong>
          <small>${difficult ? `Quiz extra oefenen: ${difficult}` : "Quiz gaat stabiel"} · Reflectie: ${reflection}</small>
        </span>
        <span class="exercise-meter">quiz</span>
      </div>
    `;
  }).join("");

  elements.teacherOverview.innerHTML = `
    <div class="student-dashboard">${dashboardCards}</div>
    <div class="teacher-detail">
      <h4>Details voor ${selectedAvatar} ${escapeHtml(name)}</h4>
      <div class="teacher-insights">
        <div>
          <small>Beste blok</small>
          <strong>${escapeHtml(advice.bestBlock)}</strong>
        </div>
        <div>
          <small>Aandacht</small>
          <strong>${escapeHtml(advice.attentionBlock)}</strong>
        </div>
        <div>
          <small>Extra oefenen</small>
          <strong>${escapeHtml(advice.difficultWords)}</strong>
        </div>
        <div>
          <small>Quizwoorden</small>
          <strong>${escapeHtml(advice.quizWords)}</strong>
        </div>
        <div>
          <small>Oefenmomenten</small>
          <strong>${selectedSummary.practiceCount}</strong>
        </div>
        <div>
          <small>Antwoorden fout</small>
          <strong>${selectedSummary.wrongAnswers}</strong>
        </div>
      </div>
      <h4>Blokken in beeld</h4>
      <div class="teacher-blocks">${blockRows}</div>
      <h4>Flashcards en woorden</h4>
      ${goalRows}
      <h4>Quizzen, toetsen en reflectie</h4>
      ${quizRows}
    </div>
  `;
}

elements.avatarRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-avatar]");
  if (!button) return;
  chooseAvatar(button.dataset.avatar);
});

elements.studentNameInput.addEventListener("change", () => {
  updateProfileName(elements.studentNameInput.value);
});

elements.studentNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    updateProfileName(elements.studentNameInput.value);
    elements.studentNameInput.blur();
  }
});

function chooseAvatar(avatar) {
  if (!avatars.includes(avatar)) return;

  const isTeacherTest = avatar === teacherTestAvatar;
  const name = isTeacherTest ? "Leerkracht test" : elements.studentNameInput.value.trim();

  if (!isTeacherTest && !name) {
    elements.profileStatus.textContent = "Typ eerst je naam. Daarna kun je een avatar reserveren.";
    elements.studentNameInput.focus();
    return;
  }

  if (avatarIsLocked(avatar)) {
    elements.profileStatus.textContent = "Deze avatar is al gekozen. Kies een andere vrije avatar.";
    return;
  }

  state.profile = {
    avatar,
    name,
    role: isTeacherTest ? "teacher" : "student"
  };
  state.profileRegistry[avatar] = {
    name,
    role: state.profile.role
  };
  loadProfileProgress(avatar);
  saveProfile();
  saveProfileRegistry();
  renderMenu();
}

function updateProfileName(value) {
  if (state.profile.avatar === teacherTestAvatar) return;
  const name = state.profile.avatar === teacherTestAvatar ? "Leerkracht test" : value.trim();
  state.profile.name = name;
  if (state.profile.avatar) {
    state.profileRegistry[state.profile.avatar] = {
      name,
      role: state.profile.role || "student"
    };
  }
  saveProfile();
  saveProfileRegistry();
  renderMenu();
}

elements.routeRow.addEventListener("click", (event) => {
  const button = event.target.closest("[data-route]");
  if (!button) return;
  state.learningRoute = button.dataset.route;
  saveLearningRoute();
  renderMenu();
});

elements.teacherButton.addEventListener("click", () => {
  const code = prompt("Typ de leerkrachtcode om verder te gaan.");
  if (code === "1234") {
    openTeacherView();
    return;
  }
  if (code !== null) {
    elements.profileStatus.textContent = "De code klopt niet. Vraag de leerkracht om hulp.";
  }
});

elements.feedbackTemplates.addEventListener("click", (event) => {
  const button = event.target.closest("[data-template]");
  if (!button) return;
  elements.teacherFeedbackInput.value = button.dataset.template;
});

elements.teacherOverview.addEventListener("click", (event) => {
  const button = event.target.closest("[data-teacher-avatar]");
  if (!button) return;
  state.teacherSelectedAvatar = button.dataset.teacherAvatar;
  renderTeacherView();
});

elements.saveFeedbackButton.addEventListener("click", () => {
  state.teacherFeedback[state.teacherSelectedAvatar] = elements.teacherFeedbackInput.value.trim();
  saveTeacherFeedback();
  renderTeacherView();
});

elements.clearFeedbackButton.addEventListener("click", () => {
  delete state.teacherFeedback[state.teacherSelectedAvatar];
  elements.teacherFeedbackInput.value = "";
  saveTeacherFeedback();
  renderTeacherView();
});

elements.deleteProfileButton.addEventListener("click", () => {
  const avatar = state.teacherSelectedAvatar;
  if (avatar === teacherTestAvatar) return;
  const name = state.profileRegistry[avatar]?.name || "deze leerling";
  if (!confirm(`Weet je zeker dat je het profiel van ${name} wilt wissen?`)) return;

  delete state.profileRegistry[avatar];
  delete state.teacherFeedback[avatar];
  localStorage.removeItem(scopedKey(storeKey, avatar));
  localStorage.removeItem(scopedKey(quizStatsKey, avatar));
  localStorage.removeItem(scopedKey(masteryKey, avatar));
  localStorage.removeItem(scopedKey(reflectionKey, avatar));
  localStorage.removeItem(scopedKey(practiceLogKey, avatar));

  if (state.profile.avatar === avatar) {
    state.profile = {
      avatar: teacherTestAvatar,
      name: "Leerkracht test",
      role: "teacher"
    };
    loadProfileProgress(teacherTestAvatar);
    saveProfile();
  }

  state.teacherSelectedAvatar = teacherTestAvatar;
  saveProfileRegistry();
  saveTeacherFeedback();
  renderMenu();
  renderTeacherView();
});

elements.resetButton.addEventListener("click", () => {
  if (!confirm("Weet je zeker dat je alle voortgang wilt wissen?")) return;
  state.progress = {};
  state.quizStats = {};
  state.mastery = {};
  state.reflections = {};
  state.practiceLog = {};
  saveProgress();
  saveQuizStats();
  saveMastery();
  saveReflections();
  savePracticeLog();
  if (state.selectedGoal) renderStudy();
  if (state.selectedExercise) renderQuiz();
  if (!elements.teacherView.classList.contains("hidden")) renderTeacherView();
  renderMenu();
});

document.addEventListener("keydown", (event) => {
  if (state.selectedGoal) {
    if (event.key === "ArrowLeft") goTo(-1);
    if (event.key === "ArrowRight") goTo(1);
  }
  if (state.selectedExercise) {
    if (event.key === "ArrowLeft") elements.quizPrevButton.click();
    if (event.key === "ArrowRight") elements.quizNextButton.click();
  }
});

saveProfileRegistry();
renderMenu();
