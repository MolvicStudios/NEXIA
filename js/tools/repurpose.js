/**
 * NEXIA Repurpose — transforma contenido existente a otro formato
 */
const RepurposeTool = (() => {
  'use strict';

  const TOOL_ID = 'repurpose';
  let _lastOutput = '';

  const TARGET_PROMPTS = {
    tweet_thread:  (src) => `Transforma este contenido en un hilo de Twitter (5-8 tweets numerados). Cada tweet máx 280 caracteres. Responde SOLO con los tweets numerados.\n\nContenido:\n${src}`,
    linkedin_post: (src) => `Transforma este contenido en un post de LinkedIn profesional y atractivo. Incluye emojis moderados, párrafos cortos y un CTA al final. Responde SOLO con el post.\n\nContenido:\n${src}`,
    email:         (src) => `Transforma este contenido en una newsletter/email. Incluye: asunto sugerido, intro, cuerpo, y CTA. Responde SOLO con el email.\n\nContenido:\n${src}`,
    summary:       (src) => `Resume este contenido en un resumen ejecutivo de 100-150 palabras. Incluye los 3-5 puntos más importantes. Responde SOLO con el resumen.\n\nContenido:\n${src}`,
    blog_post:     (src) => `Transforma este contenido en un post de blog completo con: título SEO, intro, secciones con H2, y conclusión. Responde SOLO con el post.\n\nContenido:\n${src}`,
    video_script:  (src) => `Transforma este contenido en un guión de vídeo (2-4 minutos). Incluye: gancho inicial (primeros 15s), desarrollo y cierre con CTA. Responde SOLO con el guión.\n\nContenido:\n${src}`
  };

  async function repurpose() {
    const source = (document.getElementById('rep-source')?.value || '').trim();
    const target = document.getElementById('rep-target')?.value || 'tweet_thread';

    if (!source) { Utils.showSnackbar(I18n.t('repurpose.noSource')); return; }

    const progress = document.getElementById('rep-progress');
    const btn      = document.getElementById('rep-btn');
    const result   = document.getElementById('rep-result');

    if (progress) progress.classList.add('active');
    if (btn)      btn.disabled = true;
    if (result)   result.style.display = 'none';

    try {
      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        `Eres un experto en reutilización y adaptación de contenido digital. Adaptas manteniendo la esencia del mensaje original. Respondes en ${I18n.getLang() === 'en' ? 'English' : 'español'}.`);

      const res = await AIClient.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: TARGET_PROMPTS[target](source) }
        ],
        { maxTokens: 2048, temperature: 0.7 }
      );

      if (!res.ok) { Utils.showSnackbar(res.message || I18n.t('errors.networkError')); return; }

      _lastOutput = res.text.trim();
      const outEl = document.getElementById('rep-output');
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
      const chipEl = document.getElementById('rep-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      const sourceEl  = document.getElementById('rep-source');
      const counterEl = document.getElementById('rep-char-count');
      if (sourceEl && counterEl) {
        counterEl.textContent = `${sourceEl.value.length}/5000`;
        sourceEl.addEventListener('input', function () {
          counterEl.textContent = `${this.value.length}/5000`;
        });
      }

      document.getElementById('rep-btn')?.addEventListener('click', repurpose);
      document.getElementById('rep-regen-btn')?.addEventListener('click', repurpose);

      document.getElementById('rep-copy-btn')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastOutput);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('rep-share-btn')?.addEventListener('click', async () => {
        await Utils.shareText(_lastOutput, I18n.t('repurpose.title'));
      });

      I18n.applyToView(viewEl);
    }
  };
})();

window.RepurposeTool = RepurposeTool;
