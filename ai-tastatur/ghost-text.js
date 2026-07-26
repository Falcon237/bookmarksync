class GhostText {
  constructor() {
    this.activeElement = null;
    this.overlayContainer = null;
    this.currentPrediction = '';
    this.suggestionBar = null;
    this.alternatives = [];
    this.selectedIndex = 0;
  }

  attach(element) {
    this.detach();
    this.activeElement = element;

    if (element.tagName === 'TEXTAREA') {
      this.createTextareaOverlay(element);
    } else if (element.tagName === 'INPUT') {
      this.createInputOverlay(element);
    } else if (element.isContentEditable) {
      this.createContentEditableOverlay(element);
    }

    this.createSuggestionBar(element);
  }

  detach() {
    if (this.overlayContainer) {
      this.overlayContainer.remove();
      this.overlayContainer = null;
    }
    if (this.suggestionBar) {
      this.suggestionBar.remove();
      this.suggestionBar = null;
    }
    this.activeElement = null;
    this.currentPrediction = '';
    this.alternatives = [];
    this.selectedIndex = 0;
  }

  createTextareaOverlay(textarea) {
    const container = document.createElement('div');
    container.className = 'ait-ghost-container';

    const overlay = document.createElement('div');
    overlay.className = 'ait-ghost-overlay';

    container.appendChild(overlay);
    textarea.parentElement.style.position = textarea.parentElement.style.position || 'relative';
    textarea.parentElement.insertBefore(container, textarea.nextSibling);

    this.overlayContainer = container;
    this.syncOverlayPosition(textarea, container, overlay);

    this._resizeObserver = new ResizeObserver(() => {
      this.syncOverlayPosition(textarea, container, overlay);
    });
    this._resizeObserver.observe(textarea);

    textarea.addEventListener('scroll', () => {
      overlay.scrollTop = textarea.scrollTop;
      overlay.scrollLeft = textarea.scrollLeft;
    });
  }

  syncOverlayPosition(textarea, container, overlay) {
    const computed = window.getComputedStyle(textarea);
    const rect = textarea.getBoundingClientRect();

    container.style.cssText = `
      position: absolute;
      top: ${textarea.offsetTop}px;
      left: ${textarea.offsetLeft}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      pointer-events: none;
      overflow: hidden;
      z-index: 1;
    `;

    overlay.style.cssText = `
      font-family: ${computed.fontFamily};
      font-size: ${computed.fontSize};
      font-weight: ${computed.fontWeight};
      line-height: ${computed.lineHeight};
      letter-spacing: ${computed.letterSpacing};
      word-spacing: ${computed.wordSpacing};
      padding: ${computed.padding};
      border: ${computed.borderWidth} solid transparent;
      white-space: pre-wrap;
      word-wrap: break-word;
      overflow-wrap: break-word;
      width: 100%;
      height: 100%;
      overflow: hidden;
      color: transparent;
      box-sizing: border-box;
    `;
  }

  createInputOverlay(input) {
    const container = document.createElement('div');
    container.className = 'ait-ghost-container ait-ghost-input';
    input.parentElement.style.position = input.parentElement.style.position || 'relative';
    input.parentElement.insertBefore(container, input.nextSibling);
    this.overlayContainer = container;
  }

  createContentEditableOverlay(element) {
    this.overlayContainer = document.createElement('span');
    this.overlayContainer.className = 'ait-ghost-inline';
    this.overlayContainer = this.overlayContainer;
  }

  createSuggestionBar(element) {
    const bar = document.createElement('div');
    bar.className = 'ait-suggestion-bar';
    bar.style.display = 'none';
    document.body.appendChild(bar);
    this.suggestionBar = bar;
  }

  show(prediction, alternatives = []) {
    if (!this.activeElement || !prediction) {
      this.hide();
      return;
    }

    this.currentPrediction = prediction;
    this.alternatives = alternatives;
    this.selectedIndex = 0;

    if (this.activeElement.tagName === 'TEXTAREA') {
      this.showTextareaGhost(prediction);
    } else if (this.activeElement.tagName === 'INPUT') {
      this.showInputGhost(prediction);
    }

    if (alternatives.length > 0 || prediction) {
      this.showSuggestionBar(prediction, alternatives);
    }
  }

  showTextareaGhost(prediction) {
    if (!this.overlayContainer) return;
    const overlay = this.overlayContainer.querySelector('.ait-ghost-overlay');
    if (!overlay) return;

    const textarea = this.activeElement;
    const text = textarea.value;
    const cursorPos = textarea.selectionStart;

    const beforeCursor = text.substring(0, cursorPos);
    const afterCursor = text.substring(cursorPos);

    const beforeSpan = document.createElement('span');
    beforeSpan.style.color = 'transparent';
    beforeSpan.textContent = beforeCursor;

    const ghostSpan = document.createElement('span');
    ghostSpan.className = 'ait-ghost-text';
    ghostSpan.textContent = prediction;

    const afterSpan = document.createElement('span');
    afterSpan.style.color = 'transparent';
    afterSpan.textContent = afterCursor;

    overlay.innerHTML = '';
    overlay.appendChild(beforeSpan);
    overlay.appendChild(ghostSpan);
    overlay.appendChild(afterSpan);

    overlay.scrollTop = textarea.scrollTop;
  }

  showInputGhost(prediction) {
    if (!this.overlayContainer) return;

    const input = this.activeElement;
    const rect = input.getBoundingClientRect();
    const computed = window.getComputedStyle(input);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    const textWidth = ctx.measureText(input.value).width;
    const paddingLeft = parseFloat(computed.paddingLeft);

    this.overlayContainer.style.cssText = `
      position: absolute;
      top: ${input.offsetTop}px;
      left: ${input.offsetLeft + paddingLeft + textWidth}px;
      height: ${rect.height}px;
      line-height: ${rect.height}px;
      font-family: ${computed.fontFamily};
      font-size: ${computed.fontSize};
      font-weight: ${computed.fontWeight};
      letter-spacing: ${computed.letterSpacing};
      pointer-events: none;
      z-index: 1;
    `;

    this.overlayContainer.textContent = prediction;
  }

  showSuggestionBar(mainPrediction, alternatives) {
    if (!this.suggestionBar || !this.activeElement) return;

    const rect = this.activeElement.getBoundingClientRect();
    const caretPos = this.getCaretCoordinates();

    this.suggestionBar.style.cssText = `
      position: fixed;
      top: ${caretPos.top + caretPos.height + 4}px;
      left: ${caretPos.left}px;
      z-index: 2147483647;
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      max-width: 500px;
    `;

    this.suggestionBar.innerHTML = '';

    const allSuggestions = [mainPrediction, ...alternatives.map(a => a.text)].filter(Boolean);
    const seen = new Set();

    allSuggestions.forEach((text, idx) => {
      const trimmed = text.trim();
      if (!trimmed || seen.has(trimmed.toLowerCase())) return;
      seen.add(trimmed.toLowerCase());

      const chip = document.createElement('div');
      chip.className = 'ait-suggestion-chip' + (idx === this.selectedIndex ? ' ait-selected' : '');
      chip.textContent = trimmed.length > 40 ? trimmed.substring(0, 40) + '...' : trimmed;

      if (idx === 0) {
        const hint = document.createElement('span');
        hint.className = 'ait-hint';
        hint.textContent = 'Tab';
        chip.appendChild(hint);
      }

      this.suggestionBar.appendChild(chip);
    });
  }

  getCaretCoordinates() {
    const el = this.activeElement;
    if (!el) return { top: 0, left: 0, height: 20 };

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);

      if (el.tagName === 'INPUT') {
        return {
          top: rect.top,
          left: rect.left + this.getTextWidth(el),
          height: rect.height
        };
      }

      const mirror = document.createElement('div');
      mirror.style.cssText = `
        position: fixed;
        top: -9999px;
        left: -9999px;
        font-family: ${computed.fontFamily};
        font-size: ${computed.fontSize};
        font-weight: ${computed.fontWeight};
        line-height: ${computed.lineHeight};
        letter-spacing: ${computed.letterSpacing};
        word-spacing: ${computed.wordSpacing};
        padding: ${computed.padding};
        border: ${computed.border};
        white-space: pre-wrap;
        word-wrap: break-word;
        width: ${rect.width}px;
        box-sizing: border-box;
      `;

      const text = el.value.substring(0, el.selectionStart);
      mirror.textContent = text;

      const marker = document.createElement('span');
      marker.textContent = '|';
      mirror.appendChild(marker);

      document.body.appendChild(mirror);
      const markerRect = marker.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();
      document.body.removeChild(mirror);

      const relativeTop = markerRect.top - mirrorRect.top;
      const relativeLeft = markerRect.left - mirrorRect.left;

      return {
        top: rect.top + relativeTop - el.scrollTop + parseFloat(computed.borderTopWidth),
        left: rect.left + relativeLeft - el.scrollLeft + parseFloat(computed.borderLeftWidth),
        height: parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2
      };
    }

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rects = range.getClientRects();
      if (rects.length > 0) {
        const r = rects[rects.length - 1];
        return { top: r.top, left: r.right, height: r.height };
      }
    }

    const r = el.getBoundingClientRect();
    return { top: r.bottom, left: r.left, height: 20 };
  }

  getTextWidth(input) {
    const computed = window.getComputedStyle(input);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    return ctx.measureText(input.value.substring(0, input.selectionStart)).width + parseFloat(computed.paddingLeft);
  }

  hide() {
    if (this.overlayContainer) {
      const overlay = this.overlayContainer.querySelector('.ait-ghost-overlay');
      if (overlay) overlay.innerHTML = '';
      if (this.overlayContainer.classList.contains('ait-ghost-input')) {
        this.overlayContainer.textContent = '';
      }
    }
    if (this.suggestionBar) {
      this.suggestionBar.style.display = 'none';
    }
    this.currentPrediction = '';
    this.alternatives = [];
  }

  acceptFull() {
    if (!this.activeElement || !this.currentPrediction) return false;

    const el = this.activeElement;
    const prediction = this.currentPrediction;

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const start = el.selectionStart;
      const before = el.value.substring(0, start);
      const after = el.value.substring(start);
      el.value = before + prediction + after;
      el.selectionStart = el.selectionEnd = start + prediction.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el.isContentEditable) {
      document.execCommand('insertText', false, prediction);
    }

    this.hide();
    return true;
  }

  acceptWord() {
    if (!this.activeElement || !this.currentPrediction) return false;

    const prediction = this.currentPrediction;
    const spaceIdx = prediction.indexOf(' ', 1);
    const word = spaceIdx > 0 ? prediction.substring(0, spaceIdx + 1) : prediction;

    const el = this.activeElement;

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const start = el.selectionStart;
      const before = el.value.substring(0, start);
      const after = el.value.substring(start);
      el.value = before + word + after;
      el.selectionStart = el.selectionEnd = start + word.length;
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else if (el.isContentEditable) {
      document.execCommand('insertText', false, word);
    }

    this.currentPrediction = prediction.substring(word.length);
    if (this.currentPrediction.trim()) {
      this.show(this.currentPrediction, this.alternatives);
    } else {
      this.hide();
    }

    return true;
  }

  selectNext() {
    if (this.alternatives.length === 0) return;
    this.selectedIndex = (this.selectedIndex + 1) % (this.alternatives.length + 1);
    if (this.selectedIndex === 0) {
      this.show(this.currentPrediction, this.alternatives);
    } else {
      const alt = this.alternatives[this.selectedIndex - 1];
      this.show(alt.text, this.alternatives);
    }
  }
}

const ghostText = new GhostText();
