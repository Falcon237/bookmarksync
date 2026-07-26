(() => {
  let isEnabled = true;
  let cloudEnabled = true;
  let localDebounceMs = 50;
  let cloudDebounceMs = 400;
  let localTimer = null;
  let cloudTimer = null;
  let lastText = '';
  let isAccepting = false;

  async function init() {
    await localPredictor.init();

    const settings = await chrome.storage.sync.get({
      enabled: true,
      cloudEnabled: true,
      localDebounceMs: 50,
      cloudDebounceMs: 400,
    });

    isEnabled = settings.enabled;
    cloudEnabled = settings.cloudEnabled;
    localDebounceMs = settings.localDebounceMs;
    cloudDebounceMs = settings.cloudDebounceMs;

    observeTextFields();
    setupGlobalListeners();
  }

  function isTextInput(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA') return true;
    if (el.tagName === 'INPUT') {
      const type = (el.type || '').toLowerCase();
      return ['text', 'search', 'email', 'url', ''].includes(type);
    }
    if (el.isContentEditable) return true;
    return false;
  }

  function observeTextFields() {
    document.addEventListener('focusin', (e) => {
      if (!isEnabled) return;
      if (isTextInput(e.target)) {
        ghostText.attach(e.target);
      }
    });

    document.addEventListener('focusout', (e) => {
      setTimeout(() => {
        if (!isTextInput(document.activeElement)) {
          ghostText.detach();
        }
      }, 100);
    });
  }

  function setupGlobalListeners() {
    document.addEventListener('input', handleInput, true);
    document.addEventListener('keydown', handleKeydown, true);

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) isEnabled = changes.enabled.newValue;
      if (changes.cloudEnabled) cloudEnabled = changes.cloudEnabled.newValue;
      if (changes.localDebounceMs) localDebounceMs = changes.localDebounceMs.newValue;
      if (changes.cloudDebounceMs) cloudDebounceMs = changes.cloudDebounceMs.newValue;
    });
  }

  function handleInput(e) {
    if (!isEnabled || isAccepting) return;
    const el = e.target;
    if (!isTextInput(el)) return;

    const text = getTextContent(el);
    if (text === lastText) return;

    const oldText = lastText;
    lastText = text;

    if (text.length < oldText.length || text.length < 2) {
      ghostText.hide();
      return;
    }

    if (localTimer) clearTimeout(localTimer);
    if (cloudTimer) clearTimeout(cloudTimer);

    localTimer = setTimeout(() => {
      const predictions = localPredictor.predict(text);
      if (predictions.length > 0) {
        const best = predictions[0];
        ghostText.show(best.text, predictions.slice(1));
      }
    }, localDebounceMs);

    if (cloudEnabled && text.length > 10) {
      cloudTimer = setTimeout(() => {
        requestCloudPrediction(text);
      }, cloudDebounceMs);
    }
  }

  function handleKeydown(e) {
    if (!isEnabled) return;
    if (!ghostText.currentPrediction) return;

    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      isAccepting = true;

      const accepted = ghostText.currentPrediction;
      ghostText.acceptFull();

      const el = e.target;
      const fullText = getTextContent(el);
      localPredictor.learn(fullText);

      lastText = fullText;
      isAccepting = false;
      return;
    }

    if (e.key === 'ArrowRight' && !e.shiftKey && !e.ctrlKey) {
      const el = e.target;
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        if (el.selectionStart === el.value.length) {
          e.preventDefault();
          e.stopPropagation();
          isAccepting = true;
          ghostText.acceptWord();
          lastText = getTextContent(el);
          isAccepting = false;
          return;
        }
      }
    }

    if (e.key === 'Escape') {
      ghostText.hide();
      return;
    }

    if (e.key === 'ArrowDown' && ghostText.alternatives.length > 0) {
      e.preventDefault();
      ghostText.selectNext();
      return;
    }
  }

  function getTextContent(el) {
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      return el.value.substring(0, el.selectionStart);
    }
    if (el.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = document.createRange();
        range.setStart(el, 0);
        range.setEnd(selection.anchorNode, selection.anchorOffset);
        return range.toString();
      }
      return el.textContent;
    }
    return '';
  }

  async function requestCloudPrediction(text) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'predict',
        text: text,
        context: getPageContext()
      });

      if (response && response.prediction) {
        const currentText = getTextContent(document.activeElement);
        if (currentText === text || currentText.startsWith(text)) {
          ghostText.show(response.prediction, response.alternatives || []);
        }
      }
    } catch (e) {
      // Cloud unavailable
    }
  }

  function getPageContext() {
    const title = document.title;
    const url = window.location.hostname;
    const activeEl = document.activeElement;

    let fieldType = 'text';
    if (activeEl) {
      const placeholder = activeEl.getAttribute('placeholder') || '';
      const ariaLabel = activeEl.getAttribute('aria-label') || '';
      const name = activeEl.getAttribute('name') || '';

      if (/email|mail|nachricht|message/i.test(placeholder + ariaLabel + name)) {
        fieldType = 'email';
      } else if (/search|suche/i.test(placeholder + ariaLabel + name)) {
        fieldType = 'search';
      } else if (/comment|kommentar/i.test(placeholder + ariaLabel + name)) {
        fieldType = 'comment';
      } else if (/chat|message/i.test(placeholder + ariaLabel + name)) {
        fieldType = 'chat';
      }
    }

    return { title, url, fieldType };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
