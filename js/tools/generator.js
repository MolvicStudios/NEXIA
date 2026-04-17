/**
 * NEXIA Generador de Contenido — crea contenido desde cero con parámetros
 */
const GeneratorTool = (() => {
  'use strict';

  const TOOL_ID = 'generator';
  let _lastOutput = '';

  const TYPE_PROMPTS = {
    social_post: (topic, tone, platform, keywords) =>
      `Escribe un post para ${platform} sobre: ${topic}.\nTono: ${tone}.\n${keywords ? 'Incluye estas palabras clave: ' + keywords + '.' : ''}\nResponde SOLO con el post listo para publicar.`,
    article: (topic, tone, _platform, keywords) =>
      `Escribe un artículo de blog sobre: ${topic}.\nTono: ${tone}. Estructura: título, introducción, 3-4 secciones con subtítulos, conclusión.\n${keywords ? 'Palabras clave SEO: ' + keywords : ''}\nResponde SOLO con el artículo.`,
    ad_copy: (topic, tone) =>
      `Escribe un copy publicitario para: ${topic}.\nTono: ${tone}. Incluye: titular impactante, propuesta de valor, beneficios y CTA.\nResponde SOLO con el copy.`,
    product_desc: (topic, tone) =>
      `Escribe una descripción de producto para: ${topic}.\nTono: ${tone}. Destaca beneficios, características clave y llama a la acción.\nResponde SOLO con la descripción.`,
    video_script: (topic, tone) =>
      `Escribe un guión de vídeo (3-5 minutos) sobre: ${topic}.\nTono: ${tone}. Incluye: gancho inicial, desarrollo y llamada a la acción.\nResponde SOLO con el guión.`,
    newsletter: (topic, tone) =>
      `Escribe una newsletter sobre: ${topic}.\nTono: ${tone}. Incluye: asunto atractivo, intro, cuerpo con valor real, y cierre con CTA.\nResponde SOLO con la newsletter.`
  };

  async function generate() {
    const type     = document.getElementById('gen-type')?.value     || 'social_post';
    const platform = document.getElementById('gen-platform')?.value || 'twitter';
    const tone     = document.getElementById('gen-tone')?.value     || 'informative';
    const topic    = (document.getElementById('gen-topic')?.value    || '').trim();
    const keywords = (document.getElementById('gen-keywords')?.value || '').trim();

    if (!topic) { Utils.showSnackbar(I18n.t('generator.noTopic')); return; }

    const progress = document.getElementById('gen-progress');
    const btn      = document.getElementById('gen-btn');
    const result   = document.getElementById('gen-result');

    if (progress) progress.classList.add('active');
    if (btn)      btn.disabled = true;
    if (result)   result.style.display = 'none';

    try {
      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        `Eres un experto en creación de contenido digital para el mercado hispanohablante. Respondes en ${I18n.getLang() === 'en' ? 'English' : 'español'}.`);
      const userPrompt = TYPE_PROMPTS[type](topic, tone, platform, keywords);

      const res = await AIClient.complete(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { maxTokens: 2048, temperature: 0.8 }
      );

      if (!res.ok) { Utils.showSnackbar(res.message || I18n.t('errors.networkError')); return; }

      _lastOutput = res.text.trim();
      const outEl = document.getElementById('gen-output');
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
      const chipEl = document.getElementById('gen-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      // Mostrar/ocultar plataforma según tipo
      const typeSelect = document.getElementById('gen-type');
      const platGroup  = document.getElementById('gen-platform-group');
      typeSelect?.addEventListener('change', () => {
        if (platGroup) {
          platGroup.style.display = typeSelect.value === 'social_post' ? '' : 'none';
        }
      });

      document.getElementById('gen-btn')?.addEventListener('click', generate);
      document.getElementById('gen-regen-btn')?.addEventListener('click', generate);

      document.getElementById('gen-copy-btn')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastOutput);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('gen-share-btn')?.addEventListener('click', async () => {
        await Utils.shareText(_lastOutput, I18n.t('generator.title'));
      });

      I18n.applyToView(viewEl);
    }
  };
})();

window.GeneratorTool = GeneratorTool;
