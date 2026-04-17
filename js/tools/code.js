/**
 * NEXIA Código IA — 5 modos: explicar, generar, depurar, refactorizar, documentar
 */
const CodeTool = (() => {
  'use strict';

  const TOOL_ID = 'code';
  let _lastOutput = '';

  const MODE_PROMPTS = {
    explain:   (code, lang) => `Explica qué hace este código ${lang} de forma clara y concisa. Usa lenguaje natural, no código.\n\nCódigo:\n\`\`\`${lang}\n${code}\n\`\`\``,
    generate:  (desc, lang) => `Escribe código ${lang} para: ${desc}\nResponde SOLO con el código, sin explicaciones. Incluye comentarios breves donde sea necesario.`,
    debug:     (code, lang) => `Encuentra el bug o problema en este código ${lang} y explica cómo corregirlo. Muestra el código corregido.\n\nCódigo:\n\`\`\`${lang}\n${code}\n\`\`\``,
    refactor:  (code, lang) => `Refactoriza este código ${lang} para mejorarlo: más legible, eficiente y mantenible. Explica brevemente los cambios.\n\nCódigo:\n\`\`\`${lang}\n${code}\n\`\`\``,
    document:  (code, lang) => `Añade comentarios y documentación completa (JSDoc/docstrings según el lenguaje) a este código ${lang}. Responde SOLO con el código documentado.\n\nCódigo:\n\`\`\`${lang}\n${code}\n\`\`\``
  };

  async function run() {
    const mode  = document.getElementById('code-mode')?.value || 'explain';
    const lang  = document.getElementById('code-lang')?.value || 'JavaScript';
    const input = (document.getElementById('code-input')?.value || '').trim();

    if (!input) { Utils.showSnackbar(I18n.t('code.noCode')); return; }

    const progress = document.getElementById('code-progress');
    const btn      = document.getElementById('code-run-btn');
    const result   = document.getElementById('code-result');

    if (progress) progress.classList.add('active');
    if (btn)      btn.disabled = true;
    if (result)   result.style.display = 'none';

    try {
      const promptFn     = MODE_PROMPTS[mode];
      const userPrompt   = promptFn(input, lang);
      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        `Eres un desarrollador senior experto en ${lang}. Respondes en ${I18n.getLang() === 'en' ? 'English' : 'español'}.`);

      const res = await AIClient.complete(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { maxTokens: 2048, temperature: 0.3 }
      );

      if (!res.ok) { Utils.showSnackbar(res.message || I18n.t('errors.networkError')); return; }

      // Limpiar bloques de código markdown si los hay
      // Solo elimina las líneas de apertura/cierre de bloque, no el contenido
      _lastOutput = res.text
        .replace(/^```[\w]*\n?/gm, '')
        .replace(/^```\s*$/gm, '')
        .trim();

      const outEl = document.getElementById('code-output');
      // Usar textContent — el código no debe interpretarse como HTML
      if (outEl) outEl.textContent = _lastOutput;
      if (result) result.style.display = 'block';
      Utils.haptic('success');

    } finally {
      if (progress) progress.classList.remove('active');
      if (btn)      btn.disabled = false;
    }
  }

  return {
    init(viewEl) {
      const chipEl = document.getElementById('code-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      // Cambiar placeholder según modo
      const modeSelect = document.getElementById('code-mode');
      const codeInput  = document.getElementById('code-input');
      modeSelect?.addEventListener('change', () => {
        const isGenerate = modeSelect.value === 'generate';
        if (codeInput) {
          codeInput.placeholder = isGenerate
            ? I18n.t('code.generatePlaceholder')
            : I18n.t('code.inputPlaceholder');
          codeInput.style.fontFamily = isGenerate ? 'var(--font-sans)' : 'var(--font-mono)';
        }
      });

      document.getElementById('code-run-btn')?.addEventListener('click', run);
      document.getElementById('code-regen-btn')?.addEventListener('click', run);

      document.getElementById('code-copy-btn')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastOutput);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('code-share-btn')?.addEventListener('click', async () => {
        await Utils.shareText(_lastOutput, I18n.t('code.title'));
      });

      I18n.applyToView(viewEl);
    }
  };
})();

window.CodeTool = CodeTool;
