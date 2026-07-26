class LocalPredictor {
  constructor() {
    this.unigrams = new Map();
    this.bigrams = new Map();
    this.trigrams = new Map();
    this.phrases = new Map();
    this.recentWords = [];
    this.maxRecent = 500;
    this.loaded = false;
  }

  async init() {
    if (this.loaded) return;
    await this.loadFromStorage();
    this.seedCommonPhrases();
    this.loaded = true;
  }

  seedCommonPhrases() {
    const commonPhrases = {
      'de': {
        'mit freundlichen': 'Grüßen',
        'mit freundlichen grüßen': '',
        'sehr geehrte': 'Damen und Herren,',
        'sehr geehrter': 'Herr',
        'vielen dank': 'für Ihre Nachricht.',
        'ich würde': 'mich freuen,',
        'könnten sie': 'mir bitte',
        'ich habe': 'eine Frage',
        'im anhang': 'finden Sie',
        'im voraus': 'vielen Dank.',
        'ich bin': 'der Meinung,',
        'es wäre': 'schön, wenn',
        'ich möchte': 'mich erkundigen',
        'bezüglich': 'Ihrer Anfrage',
        'wie besprochen': 'sende ich Ihnen',
        'ich freue': 'mich auf Ihre Rückmeldung.',
        'bitte lassen': 'Sie mich wissen,',
        'bei fragen': 'stehen wir Ihnen gerne zur Verfügung.',
        'ich wollte': 'fragen, ob',
        'wir haben': 'Ihre Anfrage erhalten.',
        'vielen dank für': 'Ihre schnelle Antwort.',
        'ich komme': 'gerne auf Ihr Angebot zurück.',
        'anbei finden': 'Sie die gewünschten Unterlagen.',
        'hallo zusammen': ',',
        'guten morgen': ',',
        'guten tag': ',',
        'liebe grüße': '',
        'viele grüße': '',
        'schönen tag': 'noch!',
        'schönes wochenende': '!',
        'bis dann': '!',
        'bis morgen': '!',
        'alles gute': '!',
        'danke schön': '!',
        'kein problem': '!',
        'ich denke': ', dass',
        'ich glaube': ', dass',
        'es gibt': 'keine',
        'auf jeden': 'Fall',
        'zum beispiel': '',
        'das heißt': ',',
        'das bedeutet': ',',
        'in ordnung': '!',
        'ich verstehe': '.',
        'können wir': 'uns treffen?',
        'wann hast': 'du Zeit?',
        'ich schicke': 'dir das gleich.',
        'lass uns': 'das besprechen.',
      },
      'en': {
        'thank you': 'for your',
        'thank you for': 'your message.',
        'i would': 'like to',
        'i would like': 'to',
        'could you': 'please',
        'please let': 'me know',
        'please let me': 'know if you have any questions.',
        'i am': 'writing to',
        'i have': 'a question',
        'looking forward': 'to hearing from you.',
        'best regards': '',
        'kind regards': '',
        'as discussed': ', I am sending you',
        'please find': 'attached',
        'i wanted': 'to follow up',
        'let me know': 'if you need anything else.',
        'hope this': 'helps!',
        'sounds good': '!',
        'no problem': '!',
        'i think': 'that',
        'i believe': 'that',
        'for example': ',',
        'in addition': ',',
        'on the other': 'hand,',
        'as soon as': 'possible',
        'by the way': ',',
        'how are': 'you?',
        'nice to': 'meet you.',
        'see you': 'later!',
        'have a': 'great day!',
        'take care': '!',
      }
    };

    for (const [lang, phrases] of Object.entries(commonPhrases)) {
      for (const [prefix, completion] of Object.entries(phrases)) {
        const key = prefix.toLowerCase();
        if (!this.phrases.has(key)) {
          this.phrases.set(key, []);
        }
        this.phrases.get(key).push({ completion, score: 100, lang });
      }
    }
  }

  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get(['predictor_unigrams', 'predictor_bigrams', 'predictor_trigrams']);
      if (data.predictor_unigrams) {
        this.unigrams = new Map(Object.entries(data.predictor_unigrams));
      }
      if (data.predictor_bigrams) {
        this.bigrams = new Map(Object.entries(data.predictor_bigrams));
      }
      if (data.predictor_trigrams) {
        this.trigrams = new Map(Object.entries(data.predictor_trigrams));
      }
    } catch (e) {
      // Fresh start
    }
  }

  async saveToStorage() {
    try {
      await chrome.storage.local.set({
        predictor_unigrams: Object.fromEntries(this.unigrams),
        predictor_bigrams: Object.fromEntries(this.bigrams),
        predictor_trigrams: Object.fromEntries(this.trigrams),
      });
    } catch (e) {
      // Storage full or unavailable
    }
  }

  tokenize(text) {
    return text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  }

  learn(text) {
    const words = this.tokenize(text);
    if (words.length === 0) return;

    for (const word of words) {
      this.unigrams.set(word, (this.unigrams.get(word) || 0) + 1);
      this.recentWords.push(word);
    }

    for (let i = 0; i < words.length - 1; i++) {
      const key = words[i];
      if (!this.bigrams.has(key)) this.bigrams.set(key, new Map());
      const followers = this.bigrams.get(key);
      followers.set(words[i + 1], (followers.get(words[i + 1]) || 0) + 1);
    }

    for (let i = 0; i < words.length - 2; i++) {
      const key = `${words[i]} ${words[i + 1]}`;
      if (!this.trigrams.has(key)) this.trigrams.set(key, new Map());
      const followers = this.trigrams.get(key);
      followers.set(words[i + 2], (followers.get(words[i + 2]) || 0) + 1);
    }

    while (this.recentWords.length > this.maxRecent) {
      this.recentWords.shift();
    }

    this.debouncedSave();
  }

  debouncedSave() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this.saveToStorage(), 5000);
  }

  predict(text, maxResults = 3) {
    const words = this.tokenize(text);
    if (words.length === 0) return [];

    const results = [];

    const phraseResult = this.predictPhrase(text);
    if (phraseResult) {
      results.push(...phraseResult);
    }

    const lastWord = words[words.length - 1];
    const isPartialWord = !text.endsWith(' ');

    if (isPartialWord && words.length >= 1) {
      const completions = this.completeWord(lastWord);
      for (const comp of completions) {
        results.push({ text: comp.word.slice(lastWord.length), score: comp.score * 0.8, type: 'word' });
      }
    }

    if (text.endsWith(' ') || !isPartialWord) {
      const nextWords = this.predictNextWord(words);
      for (const nw of nextWords) {
        results.push({ text: nw.word, score: nw.score, type: 'next' });
      }
    }

    if (words.length >= 2 && text.endsWith(' ')) {
      const trigramPreds = this.predictFromTrigrams(words);
      for (const tp of trigramPreds) {
        results.push({ text: tp.word, score: tp.score * 1.2, type: 'trigram' });
      }
    }

    results.sort((a, b) => b.score - a.score);

    const seen = new Set();
    const unique = [];
    for (const r of results) {
      const key = r.text.toLowerCase().trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(r);
      }
    }

    return unique.slice(0, maxResults);
  }

  predictPhrase(text) {
    const lower = text.toLowerCase().trim();
    const results = [];

    for (const [prefix, completions] of this.phrases) {
      if (lower.endsWith(prefix)) {
        for (const comp of completions) {
          if (comp.completion) {
            const needsSpace = !text.endsWith(' ') && !comp.completion.startsWith(',') && !comp.completion.startsWith('!') && !comp.completion.startsWith('.');
            results.push({
              text: (needsSpace ? ' ' : '') + comp.completion,
              score: comp.score * 1.5,
              type: 'phrase'
            });
          }
        }
      }
    }

    return results.length > 0 ? results : null;
  }

  completeWord(prefix) {
    const results = [];
    const lower = prefix.toLowerCase();

    for (const [word, count] of this.unigrams) {
      if (word.startsWith(lower) && word !== lower && word.length > lower.length) {
        results.push({ word, score: count });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  predictNextWord(words) {
    const results = [];
    const lastWord = words[words.length - 1].toLowerCase();

    if (this.bigrams.has(lastWord)) {
      const followers = this.bigrams.get(lastWord);
      for (const [word, count] of followers) {
        results.push({ word, score: count * 2 });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  predictFromTrigrams(words) {
    const results = [];
    const key = `${words[words.length - 2]} ${words[words.length - 1]}`.toLowerCase();

    if (this.trigrams.has(key)) {
      const followers = this.trigrams.get(key);
      for (const [word, count] of followers) {
        results.push({ word, score: count * 3 });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 3);
  }
}

const localPredictor = new LocalPredictor();
