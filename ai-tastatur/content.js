(() => {
  let isEnabled = true;
  let cloudEnabled = true;
  let cloudDebounceMs = 400;
  let localTimer = null;
  let cloudTimer = null;
  let lastText = '';
  let isAccepting = false;
  let statsWordsAccepted = 0;

  async function init() {
    try {
      await localPredictor.init();
    } catch (e) {
      console.warn('[AI Tastatur] Predictor init failed:', e);
    }

    try {
      const settings = await chrome.storage.sync.get({
        enabled: true,
        cloudEnabled: true,
        cloudDebounceMs: 400,
      });
      isEnabled = settings.enabled;
      cloudEnabled = settings.cloudEnabled;
      cloudDebounceMs = settings.cloudDebounceMs;
    } catch (e) {
      // Use defaults
    }

    try {
      const s = await chrome.storage.local.get({ wordsAccepted: 0 });
      statsWordsAccepted = s.wordsAccepted;
    } catch (e) {
      // Use default
    }

    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('keydown', onKeydown, true);
    document.addEventListener('keyup', onKeyup, true);
    document.addEventListener('click', onClick, true);

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) isEnabled = changes.enabled.newValue;
      if (changes.cloudEnabled) cloudEnabled = changes.cloudEnabled.newValue;
      if (changes.cloudDebounceMs) cloudDebounceMs = changes.cloudDebounceMs.newValue;
    });

    if (isTextInput(document.activeElement)) {
      ghostText.attach(document.activeElement);
    }

    console.log('[AI Tastatur 2.0] Aktiv auf', window.location.hostname);
  }

  function isTextInput(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'TEXTAREA') return !el.readOnly && !el.disabled;
    if (el.tagName === 'INPUT') {
      const type = (el.type || 'text').toLowerCase();
      return ['text', 'search', 'email', 'url', 'tel', ''].includes(type) && !el.readOnly && !el.disabled;
    }
    if (el.isContentEditable && el.getAttribute('contenteditable') !== 'false') return true;
    return false;
  }

  function onFocusIn(e) {
    if (!isEnabled) return;
    const el = e.target;
    if (isTextInput(el)) {
      ghostText.attach(el);
      lastText = getTextBeforeCursor(el);
    }
  }

  function onFocusOut(e) {
    setTimeout(() => {
      const active = document.activeElement;
      if (!active || !isTextInput(active)) {
        ghostText.detach();
        lastText = '';
      }
    }, 150);
  }

  function onClick(e) {
    if (!isEnabled) return;
    if (ghostText.currentPrediction && e.target !== ghostText.suggestionBar) {
      ghostText.hide();
    }
  }

  function onInput(e) {
    if (!isEnabled || isAccepting) return;
    const el = e.target;
    if (!isTextInput(el)) return;
    schedulePrediction(el);
  }

  function onKeyup(e) {
    if (!isEnabled || isAccepting) return;
    const el = e.target;
    if (!isTextInput(el)) return;
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
      ghostText.hide();
    }
  }

  function schedulePrediction(el) {
    const text = getTextBeforeCursor(el);
    if (text === lastText) return;

    const oldText = lastText;
    lastText = text;

    if (text.length < oldText.length) {
      ghostText.hide();
      return;
    }

    if (text.trim().length < 2) {
      ghostText.hide();
      return;
    }

    if (localTimer) clearTimeout(localTimer);
    if (cloudTimer) clearTimeout(cloudTimer);

    localTimer = setTimeout(() => runLocalPrediction(text), 30);

    if (cloudEnabled && text.trim().length > 8) {
      cloudTimer = setTimeout(() => runCloudPrediction(text), cloudDebounceMs);
    }
  }

  function runLocalPrediction(text) {
    try {
      const predictions = localPredictor.predict(text);
      if (predictions.length > 0 && getTextBeforeCursor(document.activeElement) === text) {
        ghostText.show(predictions[0].text, predictions.slice(1));
      }
    } catch (e) {
      console.warn('[AI Tastatur] Local prediction error:', e);
    }
  }

  async function runCloudPrediction(text) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'predict',
        text: text,
        context: getPageContext()
      });

      if (response && response.prediction) {
        const current = getTextBeforeCursor(document.activeElement);
        if (current === text || current.startsWith(text)) {
          const alts = (response.alternatives || []).map(a =>
            typeof a === 'string' ? { text: a, score: 50 } : a
          );
          ghostText.show(response.prediction, alts);
        }
      }
    } catch (e) {
      // Cloud unavailable
    }
  }

  function onKeydown(e) {
    if (!isEnabled) return;
    if (!ghostText.currentPrediction) return;

    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      isAccepting = true;
      const prediction = ghostText.currentPrediction;
      ghostText.acceptFull();

      const wordCount = prediction.trim().split(/\s+/).length;
      statsWordsAccepted += wordCount;
      try {
        chrome.storage.local.set({
          wordsAccepted: statsWordsAccepted,
          predictionsAccepted: (statsWordsAccepted) // approximate
        });
      } catch (e) {}

      const el = document.activeElement;
      if (el) {
        localPredictor.learn(getTextBeforeCursor(el));
        lastText = getTextBeforeCursor(el);
      }

      isAccepting = false;
      return;
    }

    if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      const el = e.target;
      const atEnd = (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')
        ? el.selectionStart === el.value.length
        : false;

      if (atEnd) {
        e.preventDefault();
        e.stopPropagation();
        isAccepting = true;
        ghostText.acceptWord();
        if (el) lastText = getTextBeforeCursor(el);
        isAccepting = false;
        return;
      }
    }

    if (e.key === 'Escape') {
      e.stopPropagation();
      ghostText.hide();
      return;
    }

    if (e.key === 'ArrowDown' && ghostText.alternatives.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      ghostText.selectNext();
      return;
    }
  }

  function getTextBeforeCursor(el) {
    if (!el) return '';
    try {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        const pos = el.selectionStart;
        return pos != null ? el.value.substring(0, pos) : el.value;
      }
      if (el.isContentEditable) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = document.createRange();
          range.setStart(el, 0);
          range.setEnd(sel.anchorNode, sel.anchorOffset);
          return range.toString();
        }
        return el.textContent || '';
      }
    } catch (e) {
      return '';
    }
    return '';
  }

  function getPageContext() {
    const activeEl = document.activeElement;
    let fieldType = 'text';

    if (activeEl) {
      const hints = [
        activeEl.getAttribute('placeholder'),
        activeEl.getAttribute('aria-label'),
        activeEl.getAttribute('name'),
        activeEl.getAttribute('id'),
      ].filter(Boolean).join(' ').toLowerCase();

      if (/email|mail|nachricht|message|compose|reply/.test(hints)) fieldType = 'email';
      else if (/search|suche|query/.test(hints)) fieldType = 'search';
      else if (/comment|kommentar|review/.test(hints)) fieldType = 'comment';
      else if (/chat|message|msg/.test(hints)) fieldType = 'chat';
    }

    return {
      title: document.title.substring(0, 60),
      url: window.location.hostname,
      fieldType
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
