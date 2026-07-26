class LocalPredictor {
  constructor() {
    this.unigrams = new Map();
    this.bigrams = new Map();
    this.trigrams = new Map();
    this.phrases = new Map();
    this.loaded = false;
  }

  async init() {
    if (this.loaded) return;
    await this.loadFromStorage();
    this.seedCommonPhrases();
    this.seedCommonWords();
    this.loaded = true;
  }

  seedCommonWords() {
    const commonDE = {
      'ich': 50, 'du': 40, 'er': 35, 'sie': 45, 'es': 40, 'wir': 35, 'ihr': 30,
      'der': 50, 'die': 55, 'das': 50, 'ein': 45, 'eine': 45, 'einer': 30,
      'und': 55, 'oder': 40, 'aber': 35, 'denn': 25, 'weil': 30, 'dass': 35,
      'ist': 50, 'sind': 40, 'war': 35, 'wird': 35, 'wurde': 30, 'haben': 40, 'hat': 45,
      'nicht': 45, 'auch': 35, 'noch': 30, 'schon': 25, 'sehr': 30, 'ganz': 25,
      'kann': 35, 'muss': 30, 'soll': 25, 'will': 30, 'darf': 20, 'möchte': 30,
      'mit': 45, 'von': 40, 'für': 40, 'auf': 40, 'in': 50, 'an': 35, 'zu': 45,
      'über': 30, 'unter': 25, 'nach': 30, 'vor': 30, 'bei': 30, 'aus': 30,
      'habe': 35, 'hast': 25, 'hatte': 25, 'hätte': 25, 'wäre': 25, 'könnte': 25,
      'gehen': 20, 'kommen': 20, 'machen': 25, 'sagen': 20, 'geben': 20,
      'heute': 25, 'morgen': 25, 'gestern': 20, 'immer': 20, 'nie': 15,
      'danke': 30, 'bitte': 35, 'ja': 30, 'nein': 25, 'okay': 20,
      'gut': 30, 'schlecht': 15, 'neu': 20, 'alt': 15, 'groß': 20, 'klein': 15,
      'freundlichen': 25, 'grüßen': 20, 'geehrte': 20, 'geehrter': 20,
      'anhang': 15, 'unterlagen': 15, 'nachricht': 20, 'antwort': 20,
      'frage': 20, 'problem': 20, 'lösung': 15, 'termin': 15, 'zeit': 20,
      'vielen': 25, 'dank': 30, 'herzlichen': 15, 'liebe': 20, 'viele': 20,
      'wann': 20, 'warum': 15, 'wie': 35, 'was': 35, 'wer': 20, 'wo': 25,
      'wenn': 30, 'dann': 25, 'also': 25, 'doch': 25, 'mal': 25, 'nur': 30,
    };

    const commonEN = {
      'the': 55, 'a': 50, 'an': 40, 'is': 50, 'are': 45, 'was': 40, 'were': 30,
      'i': 50, 'you': 45, 'he': 35, 'she': 35, 'it': 40, 'we': 35, 'they': 35,
      'have': 45, 'has': 40, 'had': 30, 'will': 35, 'would': 35, 'could': 30,
      'should': 25, 'can': 35, 'may': 20, 'might': 20, 'must': 25,
      'and': 55, 'or': 40, 'but': 35, 'not': 40, 'with': 40, 'for': 40,
      'this': 40, 'that': 40, 'these': 25, 'those': 20,
      'thank': 30, 'thanks': 25, 'please': 30, 'sorry': 20,
      'hello': 25, 'hi': 25, 'hey': 20, 'dear': 20,
      'regards': 20, 'sincerely': 15, 'best': 25,
      'good': 30, 'great': 25, 'nice': 20, 'new': 25,
      'today': 25, 'tomorrow': 20, 'yesterday': 15,
      'think': 25, 'know': 25, 'want': 25, 'need': 25, 'like': 30,
      'just': 25, 'also': 20, 'very': 25, 'really': 20, 'actually': 15,
    };

    for (const [word, score] of Object.entries(commonDE)) {
      if (!this.unigrams.has(word)) this.unigrams.set(word, score);
    }
    for (const [word, score] of Object.entries(commonEN)) {
      if (!this.unigrams.has(word)) this.unigrams.set(word, score);
    }

    const commonBigrams = {
      'ich': { 'habe': 30, 'bin': 25, 'werde': 15, 'kann': 15, 'möchte': 20, 'würde': 20, 'denke': 10, 'glaube': 10, 'komme': 10, 'gehe': 10, 'freue': 10, 'schicke': 8, 'wollte': 12, 'verstehe': 8 },
      'wir': { 'haben': 25, 'sind': 20, 'werden': 15, 'können': 15, 'müssen': 10, 'sollten': 10 },
      'sie': { 'haben': 20, 'sind': 20, 'können': 15, 'werden': 15, 'mir': 10 },
      'es': { 'ist': 30, 'gibt': 25, 'war': 15, 'wäre': 15, 'wird': 10, 'hat': 10 },
      'das': { 'ist': 30, 'war': 15, 'wäre': 10, 'heißt': 10, 'bedeutet': 8 },
      'mit': { 'freundlichen': 25, 'dem': 15, 'der': 15, 'einem': 10, 'Ihnen': 10 },
      'in': { 'der': 15, 'dem': 10, 'den': 10, 'Ordnung': 10 },
      'vielen': { 'Dank': 35, 'Grüßen': 10 },
      'sehr': { 'geehrte': 25, 'geehrter': 20, 'gut': 15, 'gerne': 10, 'schön': 8 },
      'auf': { 'jeden': 15, 'der': 10, 'dem': 10, 'Ihre': 10, 'Wiedersehen': 8 },
      'zu': { 'Ihnen': 10, 'uns': 10, 'diesem': 8, 'der': 8 },
      'können': { 'Sie': 20, 'wir': 15, 'mir': 10 },
      'könnten': { 'Sie': 20, 'wir': 10 },
      'bitte': { 'lassen': 10, 'senden': 10, 'schicken': 10 },
      'im': { 'Anhang': 15, 'Voraus': 10 },
      'bei': { 'Fragen': 15, 'uns': 10, 'Ihnen': 8 },
      'i': { 'have': 25, 'am': 20, 'would': 20, 'think': 15, 'want': 15, 'need': 10, 'can': 10, 'will': 15, 'just': 10 },
      'thank': { 'you': 35 },
      'please': { 'let': 15, 'find': 10, 'send': 10 },
      'looking': { 'forward': 25 },
      'let': { 'me': 20, 'us': 10 },
      'would': { 'like': 25, 'be': 15, 'you': 10 },
      'could': { 'you': 20, 'we': 10 },
    };

    for (const [word, followers] of Object.entries(commonBigrams)) {
      const key = word.toLowerCase();
      if (!this.bigrams.has(key)) this.bigrams.set(key, new Map());
      const map = this.bigrams.get(key);
      for (const [next, score] of Object.entries(followers)) {
        const nextLower = next.toLowerCase();
        if (!map.has(nextLower)) map.set(nextLower, score);
      }
    }
  }

  seedCommonPhrases() {
    const phrases = {
      'mit freundlichen': 'Grüßen',
      'sehr geehrte': 'Damen und Herren,',
      'sehr geehrter': 'Herr',
      'vielen dank': 'für Ihre Nachricht.',
      'ich würde': 'mich freuen,',
      'könnten sie': 'mir bitte',
      'ich habe': 'eine Frage bezüglich',
      'im anhang': 'finden Sie',
      'im voraus': 'vielen Dank.',
      'ich bin': 'der Meinung, dass',
      'es wäre': 'schön, wenn',
      'ich möchte': 'mich erkundigen,',
      'wie besprochen': 'sende ich Ihnen',
      'ich freue': 'mich auf Ihre Rückmeldung.',
      'bitte lassen': 'Sie mich wissen,',
      'bei fragen': 'stehen wir Ihnen gerne zur Verfügung.',
      'ich wollte': 'fragen, ob',
      'wir haben': 'Ihre Anfrage erhalten.',
      'vielen dank für': 'Ihre schnelle Antwort.',
      'anbei finden': 'Sie die gewünschten Unterlagen.',
      'hallo zusammen': ',',
      'guten morgen': ',',
      'guten tag': ',',
      'liebe grüße': '',
      'viele grüße': '',
      'schönen tag': 'noch!',
      'schönes wochenende': '!',
      'kein problem': '!',
      'ich denke': ', dass',
      'ich glaube': ', dass',
      'es gibt': 'verschiedene Möglichkeiten.',
      'auf jeden': 'Fall!',
      'zum beispiel': '',
      'in ordnung': '!',
      'können wir': 'uns treffen?',
      'wann hast': 'du Zeit?',
      'lass uns': 'das besprechen.',
      'thank you': 'for your message.',
      'thank you for': 'your quick response.',
      'i would': 'like to',
      'i would like': 'to follow up on',
      'could you': 'please',
      'please let': 'me know if you have any questions.',
      'please let me': 'know if you need anything else.',
      'looking forward': 'to hearing from you.',
      'best regards': '',
      'kind regards': '',
      'as discussed': ', I am sending you',
      'please find': 'attached the requested documents.',
      'i wanted': 'to follow up on',
      'let me know': 'if you need anything else.',
      'hope this': 'helps!',
      'sounds good': '!',
      'no problem': '!',
      'i think': 'that',
      'on the other': 'hand,',
      'as soon as': 'possible.',
      'how are': 'you doing?',
      'nice to': 'meet you!',
      'have a': 'great day!',
    };

    for (const [prefix, completion] of Object.entries(phrases)) {
      this.phrases.set(prefix.toLowerCase(), completion);
    }
  }

  async loadFromStorage() {
    try {
      const data = await chrome.storage.local.get(['predictor_unigrams', 'predictor_bigrams', 'predictor_trigrams']);
      if (data.predictor_unigrams) {
        for (const [k, v] of Object.entries(data.predictor_unigrams)) {
          this.unigrams.set(k, v);
        }
      }
      if (data.predictor_bigrams) {
        for (const [k, v] of Object.entries(data.predictor_bigrams)) {
          this.bigrams.set(k, new Map(Object.entries(v)));
        }
      }
      if (data.predictor_trigrams) {
        for (const [k, v] of Object.entries(data.predictor_trigrams)) {
          this.trigrams.set(k, new Map(Object.entries(v)));
        }
      }
    } catch (e) {
      // Fresh start
    }
  }

  async saveToStorage() {
    try {
      const bigrams = {};
      for (const [k, v] of this.bigrams) {
        bigrams[k] = Object.fromEntries(v);
      }
      const trigrams = {};
      for (const [k, v] of this.trigrams) {
        trigrams[k] = Object.fromEntries(v);
      }
      await chrome.storage.local.set({
        predictor_unigrams: Object.fromEntries(this.unigrams),
        predictor_bigrams: bigrams,
        predictor_trigrams: trigrams,
      });
    } catch (e) {
      // Storage unavailable
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

    this.debouncedSave();
  }

  debouncedSave() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this.saveToStorage(), 5000);
  }

  predict(text, maxResults = 5) {
    if (!text || text.trim().length < 2) return [];

    const results = [];
    const words = this.tokenize(text);
    if (words.length === 0) return [];

    const phraseResults = this.predictPhrase(text);
    results.push(...phraseResults);

    const lastWord = words[words.length - 1];
    const endsWithSpace = /\s$/.test(text);

    if (!endsWithSpace) {
      const completions = this.completeWord(lastWord);
      for (const comp of completions) {
        const suffix = comp.word.slice(lastWord.length);
        if (suffix) {
          results.push({ text: suffix, score: comp.score * 0.8, type: 'word-completion' });
        }
      }
    }

    if (endsWithSpace && words.length >= 1) {
      const nextWords = this.predictNextWord(words);
      for (const nw of nextWords) {
        results.push({ text: nw.word, score: nw.score, type: 'next-word' });
      }
    }

    if (endsWithSpace && words.length >= 2) {
      const trigramPreds = this.predictFromTrigrams(words);
      for (const tp of trigramPreds) {
        results.push({ text: tp.word, score: tp.score * 1.5, type: 'trigram' });
      }
    }

    if (!endsWithSpace && words.length >= 2) {
      const prevWord = words[words.length - 2];
      const nextAfterPrev = this.getFollowers(prevWord);
      for (const [word, score] of nextAfterPrev) {
        if (word.startsWith(lastWord) && word !== lastWord) {
          const suffix = word.slice(lastWord.length);
          results.push({ text: suffix, score: score * 1.2, type: 'bigram-completion' });
        }
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
    const lower = text.toLowerCase().trimStart();
    const results = [];

    for (const [prefix, completion] of this.phrases) {
      if (!completion) continue;

      if (lower.endsWith(prefix) || lower.endsWith(prefix + ' ')) {
        const needsSpace = !lower.endsWith(' ') && !/^[,!.\?;:]/.test(completion);
        results.push({
          text: (needsSpace ? ' ' : '') + completion,
          score: 200 + prefix.length * 10,
          type: 'phrase'
        });
      }

      const words = prefix.split(' ');
      if (words.length > 1) {
        const lastPhraseWord = words[words.length - 1];
        const textWords = lower.split(/\s+/);
        const lastTextWord = textWords[textWords.length - 1];

        if (lastPhraseWord.startsWith(lastTextWord) && lastPhraseWord !== lastTextWord) {
          const prevWordsMatch = words.slice(0, -1).every((w, i) => {
            const idx = textWords.length - 1 - (words.length - 1 - i);
            return idx >= 0 && textWords[idx] === w;
          });

          if (prevWordsMatch) {
            const wordSuffix = lastPhraseWord.slice(lastTextWord.length);
            const fullCompletion = wordSuffix + (completion ? ' ' + completion : '');
            results.push({
              text: fullCompletion,
              score: 180 + prefix.length * 8,
              type: 'phrase-partial'
            });
          }
        }
      }
    }

    return results;
  }

  completeWord(prefix) {
    const results = [];
    const lower = prefix.toLowerCase();
    if (lower.length < 2) return results;

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
    const lastWord = words[words.length - 1];

    const followers = this.getFollowers(lastWord);
    for (const [word, count] of followers) {
      results.push({ word, score: count * 2 });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 5);
  }

  getFollowers(word) {
    const key = word.toLowerCase();
    return this.bigrams.has(key) ? this.bigrams.get(key) : new Map();
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
