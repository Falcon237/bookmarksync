class GhostText {
  constructor() {
    this.activeElement = null;
    this.suggestionBar = null;
    this.currentPrediction = '';
    this.alternatives = [];
    this.selectedIndex = 0;
  }

  attach(element) {
    if (this.activeElement === element) return;
    this.detach();
    this.activeElement = element;
    this.ensureSuggestionBar();
  }

  detach() {
    this.hide();
    this.activeElement = null;
    this.currentPrediction = '';
    this.alternatives = [];
    this.selectedIndex = 0;
  }

  ensureSuggestionBar() {
    if (this.suggestionBar && document.body.contains(this.suggestionBar)) return;

    const bar = document.createElement('div');
    bar.id = 'ait-suggestion-bar';
    bar.style.display = 'none';

    const shadow = bar.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = `
      :host {
        position: fixed;
        z-index: 2147483647;
        display: none;
        pointer-events: none;
      }
      .bar {
        display: flex;
        gap: 5px;
        flex-wrap: wrap;
        max-width: 550px;
        padding: 6px 8px;
        background: #1e1e2e;
        border: 1px solid #444;
        border-radius: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.4);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        animation: fadeIn 0.12s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-3px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 5px 12px;
        background: #2a2a3e;
        color: #d4d4d4;
        border: 1px solid #555;
        border-radius: 7px;
        font-size: 13.5px;
        line-height: 1.5;
        white-space: nowrap;
        max-width: 320px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .chip.selected {
        background: #1a3a5c;
        border-color: #5b9bd5;
        color: #fff;
      }
      .kbd {
        display: inline-block;
        padding: 1px 6px;
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 4px;
        font-size: 10px;
        color: #999;
        font-family: 'SF Mono', Monaco, Consolas, monospace;
        flex-shrink: 0;
      }
      @media (prefers-color-scheme: light) {
        .bar {
          background: #fff;
          border-color: #d0d0d0;
          box-shadow: 0 6px 24px rgba(0,0,0,0.12);
        }
        .chip {
          background: #f0f0f0;
          color: #333;
          border-color: #ccc;
        }
        .chip.selected {
          background: #d6eaff;
          border-color: #3b82f6;
          color: #1e40af;
        }
        .kbd {
          background: rgba(0,0,0,0.05);
          border-color: rgba(0,0,0,0.15);
          color: #888;
        }
      }
    `;
    shadow.appendChild(style);

    const inner = document.createElement('div');
    inner.className = 'bar';
    shadow.appendChild(inner);

    this._shadowInner = inner;
    this._shadowRoot = shadow;
    document.body.appendChild(bar);
    this.suggestionBar = bar;
  }

  show(prediction, alternatives = []) {
    if (!this.activeElement || !prediction || !prediction.trim()) {
      this.hide();
      return;
    }

    this.currentPrediction = prediction;
    this.alternatives = alternatives;
    this.selectedIndex = 0;

    this.ensureSuggestionBar();
    this.renderSuggestionBar(prediction, alternatives);
  }

  renderSuggestionBar(mainPrediction, alternatives) {
    if (!this.suggestionBar || !this.activeElement || !this._shadowInner) return;

    const pos = this.getCaretPixelPos();

    this.suggestionBar.style.cssText = `
      position: fixed;
      top: ${pos.top + pos.height + 6}px;
      left: ${Math.max(8, Math.min(pos.left, window.innerWidth - 400))}px;
      z-index: 2147483647;
      display: block;
      pointer-events: none;
    `;

    const inner = this._shadowInner;
    inner.innerHTML = '';

    const allSuggestions = [mainPrediction, ...alternatives.map(a => a.text || a)].filter(Boolean);
    const seen = new Set();

    allSuggestions.forEach((text, idx) => {
      const trimmed = typeof text === 'string' ? text.trim() : '';
      if (!trimmed || seen.has(trimmed.toLowerCase())) return;
      seen.add(trimmed.toLowerCase());

      const chip = document.createElement('span');
      chip.className = 'chip' + (idx === 0 ? ' selected' : '');

      const label = trimmed.length > 50 ? trimmed.substring(0, 50) + '…' : trimmed;
      chip.textContent = label;

      if (idx === 0) {
        const kbd = document.createElement('span');
        kbd.className = 'kbd';
        kbd.textContent = 'Tab';
        chip.appendChild(kbd);
      }

      inner.appendChild(chip);
    });
  }

  getCaretPixelPos() {
    const el = this.activeElement;
    if (!el) return { top: 100, left: 100, height: 20 };

    if (el.tagName === 'INPUT') {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);
      const textWidth = this.measureText(
        el.value.substring(0, el.selectionStart),
        computed
      );
      return {
        top: rect.top,
        left: rect.left + parseFloat(computed.paddingLeft) + parseFloat(computed.borderLeftWidth) + textWidth,
        height: rect.height
      };
    }

    if (el.tagName === 'TEXTAREA') {
      const rect = el.getBoundingClientRect();
      const computed = window.getComputedStyle(el);

      const mirror = document.createElement('div');
      const props = [
        'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
        'lineHeight', 'letterSpacing', 'wordSpacing',
        'textTransform', 'textIndent',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'boxSizing', 'whiteSpace', 'wordWrap', 'overflowWrap', 'wordBreak'
      ];
      for (const prop of props) {
        mirror.style[prop] = computed[prop];
      }
      mirror.style.position = 'fixed';
      mirror.style.top = '-9999px';
      mirror.style.left = '-9999px';
      mirror.style.visibility = 'hidden';
      mirror.style.whiteSpace = 'pre-wrap';
      mirror.style.wordWrap = 'break-word';
      mirror.style.width = rect.width + 'px';
      mirror.style.height = 'auto';
      mirror.style.overflow = 'hidden';

      const textBefore = el.value.substring(0, el.selectionStart);
      const textNode = document.createTextNode(textBefore);
      mirror.appendChild(textNode);

      const caret = document.createElement('span');
      caret.textContent = '​';
      mirror.appendChild(caret);

      document.body.appendChild(mirror);
      const caretRect = caret.getBoundingClientRect();
      const mirrorRect = mirror.getBoundingClientRect();
      document.body.removeChild(mirror);

      const borderTop = parseFloat(computed.borderTopWidth) || 0;
      const relTop = caretRect.top - mirrorRect.top;
      const relLeft = caretRect.left - mirrorRect.left;

      return {
        top: rect.top + borderTop + relTop - el.scrollTop,
        left: rect.left + relLeft - el.scrollLeft,
        height: parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.4
      };
    }

    if (el.isContentEditable) {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        const range = sel.getRangeAt(0).cloneRange();
        range.collapse(false);

        const span = document.createElement('span');
        span.textContent = '​';
        range.insertNode(span);
        const spanRect = span.getBoundingClientRect();
        span.parentNode.removeChild(span);

        if (spanRect.top !== 0 || spanRect.left !== 0) {
          return { top: spanRect.top, left: spanRect.left, height: spanRect.height || 20 };
        }
      }
    }

    const fallback = el.getBoundingClientRect();
    return { top: fallback.bottom, left: fallback.left + 10, height: 20 };
  }

  measureText(text, computed) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.font = `${computed.fontStyle} ${computed.fontWeight} ${computed.fontSize} ${computed.fontFamily}`;
    return ctx.measureText(text).width;
  }

  hide() {
    if (this.suggestionBar) {
      this.suggestionBar.style.display = 'none';
    }
    this.currentPrediction = '';
    this.alternatives = [];
  }

  acceptFull() {
    if (!this.activeElement || !this.currentPrediction) return false;
    return this.insertText(this.currentPrediction);
  }

  acceptWord() {
    if (!this.activeElement || !this.currentPrediction) return false;

    const prediction = this.currentPrediction;
    const match = prediction.match(/^(\S+\s?)/);
    const word = match ? match[1] : prediction;

    this.insertText(word);

    const remaining = prediction.slice(word.length);
    if (remaining.trim()) {
      this.currentPrediction = remaining;
      this.renderSuggestionBar(remaining, this.alternatives);
    } else {
      this.hide();
    }

    return true;
  }

  insertText(text) {
    const el = this.activeElement;
    if (!el) return false;

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const start = el.selectionStart;
      const before = el.value.substring(0, start);
      const after = el.value.substring(el.selectionEnd);

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
        'value'
      ).set;

      nativeInputValueSetter.call(el, before + text + after);
      el.selectionStart = el.selectionEnd = start + text.length;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (el.isContentEditable) {
      document.execCommand('insertText', false, text);
    }

    this.hide();
    return true;
  }

  selectNext() {
    const all = [this.currentPrediction, ...this.alternatives.map(a => a.text || a)].filter(Boolean);
    if (all.length <= 1) return;

    this.selectedIndex = (this.selectedIndex + 1) % all.length;
    const selected = all[this.selectedIndex];
    this.currentPrediction = selected;

    if (this._shadowInner) {
      const chips = this._shadowInner.querySelectorAll('.chip');
      chips.forEach((chip, i) => {
        chip.classList.toggle('selected', i === this.selectedIndex);
      });
    }
  }
}

const ghostText = new GhostText();
