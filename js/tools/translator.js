/**
 * NEXIA Traductor IA — traducción contextual entre ES/EN/DE/FR/ZH
 */
const TranslatorTool = (() => {
  'use strict';

  const TOOL_ID = 'translator';
  let _lastTranslation = '';

  const LANG_NAMES = {
    es: 'Spanish',
    en: 'English',
    de: 'German',
    fr: 'French',
    zh: 'Chinese'
  };

  async function translate() {
    const fromLang = document.getElementById('trans-from')?.value || 'es';
    const toLang   = document.getElementById('trans-to')?.value   || 'en';
    const domain   = document.getElementById('trans-domain')?.value || 'general';
    const text     = (document.getElementById('trans-input')?.value || '').trim();

    if (!text) return;

    if (fromLang === toLang) {
      Utils.showSnackbar(I18n.t('translator.from') + ' = ' + I18n.t('translator.to'));
      return;
    }

    const progress = document.getElementById('trans-progress');
    const btn      = document.getElementById('trans-btn');
    const result   = document.getElementById('trans-result');

    if (progress) progress.classList.add('active');
    if (btn)      btn.disabled = true;
    if (result)   result.style.display = 'none';

    try {
      const fromName = LANG_NAMES[fromLang] || fromLang;
      const toName   = LANG_NAMES[toLang]   || toLang;

      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        `You are a professional translator specialized in intercultural communication.\nYou translate from ${fromName} to ${toName}.\nDomain: ${domain}. Maintain the tone and register of the original.\nRespond ONLY with the translated text, no explanations or notes.`);

      const res = await AIClient.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: `Translate the following text:\n\n${text}` }
        ],
        { maxTokens: 2048, temperature: 0.3 }
      );

      if (!res.ok) {
        Utils.showSnackbar(res.message || I18n.t('errors.networkError'));
        return;
      }

      _lastTranslation = res.text.trim();
      const outEl = document.getElementById('trans-output');
      if (outEl) outEl.innerHTML = Utils.nl2br(_lastTranslation);
      if (result) result.style.display = 'block';
      Utils.haptic('success');

    } finally {
      if (progress) progress.classList.remove('active');
      if (btn)      btn.disabled = false;
    }
  }

  return {
    init(viewEl) {
      const chipEl = document.getElementById('translator-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      // Char counter — inicia en 0 y se actualiza al escribir
      const inputEl = document.getElementById('trans-input');
      if (inputEl) {
        const counterEl = document.getElementById('trans-char-count');
        if (counterEl) counterEl.textContent = `${inputEl.value.length}/3000`;
        inputEl.addEventListener('input', function () {
          if (counterEl) counterEl.textContent = `${this.value.length}/3000`;
        });
      }

      // Swap idiomas
      document.getElementById('trans-swap-btn')?.addEventListener('click', () => {
        const from = document.getElementById('trans-from');
        const to   = document.getElementById('trans-to');
        if (!from || !to) return;
        const tmp  = from.value;
        from.value = to.value;
        to.value   = tmp;
        Utils.haptic('light');
      });

      document.getElementById('trans-btn')?.addEventListener('click', translate);
      document.getElementById('trans-regen-btn')?.addEventListener('click', translate);

      document.getElementById('trans-copy-btn')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastTranslation);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('trans-share-btn')?.addEventListener('click', async () => {
        await Utils.shareText(_lastTranslation, I18n.t('translator.title'));
      });

      I18n.applyToView(viewEl);
    }
  };
})();

window.TranslatorTool = TranslatorTool;
