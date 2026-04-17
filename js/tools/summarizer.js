/**
 * NEXIA Resumir — extrae puntos clave de textos largos en 4 modos
 */
const SummarizerTool = (() => {
  'use strict';

  const TOOL_ID = 'summarizer';
  let _lastOutput = '';

  const MODE_PROMPTS = {
    bullets: (text, level) => {
      const count = level === 'high' ? '10-15' : level === 'medium' ? '5-8' : '3-5';
      return `Extrae los ${count} puntos más importantes de este texto en formato de lista con viñetas.\nResponde SOLO con los puntos, cada uno en una línea comenzando con "• ".\n\nTexto:\n${text}`;
    },
    executive: (text, level) => {
      const words = level === 'high' ? '200-250' : level === 'medium' ? '100-150' : '50-80';
      return `Escribe un resumen ejecutivo de ${words} palabras de este texto, destacando lo más importante.\nResponde SOLO con el resumen.\n\nTexto:\n${text}`;
    },
    concepts: (text, level) => {
      const count = level === 'high' ? '8-10' : level === 'medium' ? '4-6' : '2-3';
      return `Extrae los ${count} conceptos clave de este texto. Para cada concepto: nombre en negrita, definición breve (1 frase).\nFormato: **Concepto**: definición\n\nTexto:\n${text}`;
    },
    swot: (text) =>
      `Realiza un análisis DAFO (Debilidades, Amenazas, Fortalezas, Oportunidades) basado en este texto.\nUsa el formato:\n**Fortalezas:**\n• ...\n**Debilidades:**\n• ...\n**Oportunidades:**\n• ...\n**Amenazas:**\n• ...\n\nTexto:\n${text}`
  };

  async function summarize() {
    const text  = (document.getElementById('sum-input')?.value || '').trim();
    const mode  = document.getElementById('sum-mode')?.value  || 'bullets';
    const level = document.getElementById('sum-level')?.value || 'medium';

    if (!text) { Utils.showSnackbar(I18n.t('summarizer.noText')); return; }

    const progress = document.getElementById('sum-progress');
    const btn      = document.getElementById('sum-btn');
    const result   = document.getElementById('sum-result');

    if (progress) progress.classList.add('active');
    if (btn)      btn.disabled = true;
    if (result)   result.style.display = 'none';

    try {
      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        `Eres un experto en análisis y síntesis de información. Respondes en ${I18n.getLang() === 'en' ? 'English' : 'español'}.`);

      const res = await AIClient.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: MODE_PROMPTS[mode](text, level) }
        ],
        { maxTokens: 1024, temperature: 0.4 }
      );

      if (!res.ok) { Utils.showSnackbar(res.message || I18n.t('errors.networkError')); return; }

      _lastOutput = res.text.trim();
      const outEl = document.getElementById('sum-output');
      if (outEl) outEl.innerHTML = Utils.nl2br(_lastOutput);
      if (result) result.style.display = 'block';
      Utils.haptic('success');

    } finally {
      if (progress) progress.classList.remove('active');
      if (btn)      btn.disabled = false;
    }
  }

  return {
    init(viewEl) {
      const chipEl = document.getElementById('sum-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      const inputEl   = document.getElementById('sum-input');
      const counterEl = document.getElementById('sum-char-count');
      if (inputEl && counterEl) {
        counterEl.textContent = `${inputEl.value.length}/8000`;
        inputEl.addEventListener('input', function () {
          counterEl.textContent = `${this.value.length}/8000`;
        });
      }

      document.getElementById('sum-btn')?.addEventListener('click', summarize);
      document.getElementById('sum-regen-btn')?.addEventListener('click', summarize);

      document.getElementById('sum-copy-btn')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastOutput);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('sum-share-btn')?.addEventListener('click', async () => {
        await Utils.shareText(_lastOutput, I18n.t('summarizer.title'));
      });

      I18n.applyToView(viewEl);
    }
  };
})();

window.SummarizerTool = SummarizerTool;
