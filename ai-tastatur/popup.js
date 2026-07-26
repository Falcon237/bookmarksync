document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    enabled: document.getElementById('enabled'),
    cloudEnabled: document.getElementById('cloudEnabled'),
    apiKey: document.getElementById('apiKey'),
    toggleApiKey: document.getElementById('toggleApiKey'),
    language: document.getElementById('language'),
    cloudDelay: document.getElementById('cloudDelay'),
    cloudDelayValue: document.getElementById('cloudDelayValue'),
    wordsAccepted: document.getElementById('wordsAccepted'),
    timeSaved: document.getElementById('timeSaved'),
    accuracy: document.getElementById('accuracy'),
    resetData: document.getElementById('resetData'),
  };

  const settings = await chrome.storage.sync.get({
    enabled: true,
    cloudEnabled: true,
    apiKey: '',
    language: 'auto',
    cloudDebounceMs: 400,
  });

  const stats = await chrome.storage.local.get({
    wordsAccepted: 0,
    predictionsShown: 0,
    predictionsAccepted: 0,
  });

  elements.enabled.checked = settings.enabled;
  elements.cloudEnabled.checked = settings.cloudEnabled;
  elements.apiKey.value = settings.apiKey;
  elements.language.value = settings.language;
  elements.cloudDelay.value = settings.cloudDebounceMs;
  elements.cloudDelayValue.textContent = settings.cloudDebounceMs + 'ms';

  elements.wordsAccepted.textContent = stats.wordsAccepted;
  const seconds = Math.round(stats.wordsAccepted * 0.6);
  elements.timeSaved.textContent = seconds >= 60
    ? `${Math.floor(seconds / 60)}m ${seconds % 60}s`
    : `${seconds}s`;

  if (stats.predictionsShown > 0) {
    const rate = Math.round((stats.predictionsAccepted / stats.predictionsShown) * 100);
    elements.accuracy.textContent = rate + '%';
  }

  elements.enabled.addEventListener('change', () => {
    chrome.storage.sync.set({ enabled: elements.enabled.checked });
  });

  elements.cloudEnabled.addEventListener('change', () => {
    chrome.storage.sync.set({ cloudEnabled: elements.cloudEnabled.checked });
  });

  let apiKeyTimeout;
  elements.apiKey.addEventListener('input', () => {
    clearTimeout(apiKeyTimeout);
    apiKeyTimeout = setTimeout(() => {
      chrome.storage.sync.set({ apiKey: elements.apiKey.value });
    }, 500);
  });

  elements.toggleApiKey.addEventListener('click', () => {
    const type = elements.apiKey.type === 'password' ? 'text' : 'password';
    elements.apiKey.type = type;
  });

  elements.language.addEventListener('change', () => {
    chrome.storage.sync.set({ language: elements.language.value });
  });

  elements.cloudDelay.addEventListener('input', () => {
    const val = parseInt(elements.cloudDelay.value);
    elements.cloudDelayValue.textContent = val + 'ms';
    chrome.storage.sync.set({ cloudDebounceMs: val });
  });

  elements.resetData.addEventListener('click', async () => {
    if (confirm('Alle Lerndaten zurücksetzen? Die KI lernt deine Schreibgewohnheiten neu.')) {
      await chrome.storage.local.remove([
        'predictor_unigrams',
        'predictor_bigrams',
        'predictor_trigrams',
        'wordsAccepted',
        'predictionsShown',
        'predictionsAccepted',
      ]);
      elements.wordsAccepted.textContent = '0';
      elements.timeSaved.textContent = '0s';
      elements.accuracy.textContent = '-';
    }
  });
});
