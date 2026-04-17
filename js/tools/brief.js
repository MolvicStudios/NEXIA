/**
 * NEXIA Brief Gen — genera briefs creativos/estratégicos estructurados
 */
const BriefTool = (() => {
  'use strict';

  const TOOL_ID = 'brief';
  let _lastOutput = '';

  const SECTION_TEMPLATES = {
    creative:  ['Resumen ejecutivo', 'Contexto y antecedentes', 'Objetivo de comunicación', 'Público objetivo', 'Mensajes clave', 'Tono y estilo', 'Entregables', 'Restricciones y consideraciones', 'Cronograma', 'Presupuesto'],
    strategic: ['Resumen ejecutivo', 'Situación actual', 'Objetivos estratégicos', 'KPIs y métricas de éxito', 'Público objetivo', 'Propuesta de valor', 'Estrategia y acciones', 'Recursos necesarios', 'Cronograma', 'Presupuesto'],
    content:   ['Propósito del contenido', 'Audiencia', 'Tono y voz de marca', 'Tipos de contenido', 'Frecuencia y canales', 'Temas y pilares', 'SEO y palabras clave', 'Métricas de éxito', 'Flujo de aprobación', 'Recursos'],
    project:   ['Descripción del proyecto', 'Objetivos y alcance', 'Entregables', 'Requisitos técnicos', 'Partes implicadas', 'Metodología de trabajo', 'Hitos y cronograma', 'Gestión de riesgos', 'Presupuesto', 'Criterios de aceptación']
  };

  async function generateBrief() {
    const type      = document.getElementById('brief-type')?.value      || 'creative';
    const client    = (document.getElementById('brief-client')?.value    || '').trim();
    const project   = (document.getElementById('brief-project')?.value   || '').trim();
    const objective = (document.getElementById('brief-objective')?.value || '').trim();
    const audience  = (document.getElementById('brief-audience')?.value  || '').trim();
    const budget    = (document.getElementById('brief-budget')?.value    || '').trim();
    const deadline  = (document.getElementById('brief-deadline')?.value  || '').trim();
    const notes     = (document.getElementById('brief-notes')?.value     || '').trim();

    if (!project || !objective || !audience) {
      Utils.showSnackbar(I18n.t('brief.noInput'));
      return;
    }

    const progress = document.getElementById('brief-progress');
    const btn      = document.getElementById('brief-btn');
    const result   = document.getElementById('brief-result');

    if (progress) progress.classList.add('active');
    if (btn)      btn.disabled = true;
    if (result)   result.style.display = 'none';

    try {
      const sections  = SECTION_TEMPLATES[type].join(', ');
      const inputData = [
        `Tipo de brief: ${type}`,
        `Cliente/Empresa: ${client || 'No especificado'}`,
        `Proyecto: ${project}`,
        `Objetivo principal: ${objective}`,
        `Audiencia objetivo: ${audience}`,
        budget   ? `Presupuesto: ${budget}`         : '',
        deadline ? `Fecha límite: ${deadline}`       : '',
        notes    ? `Notas adicionales: ${notes}`     : ''
      ].filter(Boolean).join('\n');

      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        `Eres un consultor estratégico experto en redacción de briefs profesionales. Respondes en ${I18n.getLang() === 'en' ? 'English' : 'español'}.`);
      const userPrompt = `Genera un brief profesional completo con las siguientes secciones: ${sections}.\n\nDatos del proyecto:\n${inputData}\n\nResponde SOLO con el brief estructurado en secciones con sus respectivos títulos en negrita.`;

      const res = await AIClient.complete(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { maxTokens: 2048, temperature: 0.6 }
      );

      if (!res.ok) { Utils.showSnackbar(res.message || I18n.t('errors.networkError')); return; }

      _lastOutput = res.text.trim();
      const outEl = document.getElementById('brief-output');
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
      const chipEl = document.getElementById('brief-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      document.getElementById('brief-btn')?.addEventListener('click', generateBrief);

      document.getElementById('brief-copy-btn')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastOutput);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('brief-share-btn')?.addEventListener('click', async () => {
        await Utils.shareText(_lastOutput, I18n.t('brief.title'));
      });

      I18n.applyToView(viewEl);
    }
  };
})();

window.BriefTool = BriefTool;
