/**
 * NEXIA Correo IA — generador de emails profesionales
 */
const EmailTool = (() => {
  'use strict';

  const TOOL_ID = 'email';
  let _lastResult = { subject: '', body: '' };

  async function generate() {
    const type      = document.getElementById('email-type')?.value || 'cold';
    const tone      = document.getElementById('email-tone')?.value || 'professional';
    const recipient = (document.getElementById('email-recipient')?.value || '').trim();
    const objective = (document.getElementById('email-objective')?.value || '').trim();

    if (!objective) {
      Utils.showSnackbar(I18n.t('email.objectivePlaceholder'));
      return;
    }

    const progress = document.getElementById('email-progress');
    const genBtn   = document.getElementById('email-generate-btn');
    const result   = document.getElementById('email-result');

    if (progress) progress.classList.add('active');
    if (genBtn)   genBtn.disabled = true;
    if (result)   result.style.display = 'none';

    try {
      const lang = Providers.getAILang() === 'auto' ? I18n.getLang() : Providers.getAILang();

      const typeMap = {
        es: { cold: 'contacto en frío', followup: 'seguimiento', formal: 'formal/profesional', newsletter: 'newsletter', complaint: 'reclamación' },
        en: { cold: 'cold outreach',    followup: 'follow-up',   formal: 'formal/professional', newsletter: 'newsletter', complaint: 'complaint'  }
      };
      const toneMap = {
        es: { professional: 'profesional', friendly: 'amigable', urgent: 'urgente' },
        en: { professional: 'professional', friendly: 'friendly', urgent: 'urgent' }
      };

      const typeLbl      = (typeMap[lang] || typeMap.es)[type] || type;
      const toneLbl      = (toneMap[lang] || toneMap.es)[tone] || tone;
      const recipientPart = recipient ? ` para ${Utils.escapeHtml(recipient)}` : '';

      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        `Eres un experto en comunicación y redacción de emails. Respondes en ${lang === 'en' ? 'English' : 'español'}.`);
      const userPrompt = `Escribe un email de tipo "${typeLbl}"${recipientPart} con tono "${toneLbl}".\nObjetivo del email: ${objective}\nFormato de respuesta (obligatorio):\nASUNTO: [asunto del email aquí]\n---\n[cuerpo del email aquí]`;

      const res = await AIClient.complete(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { maxTokens: 1024, temperature: 0.7 }
      );

      if (!res.ok) {
        Utils.showSnackbar(res.message || I18n.t('errors.networkError'));
        return;
      }

      // Parsear asunto y cuerpo — fallback si la IA no incluye el separador ---
      const parts      = res.text.split('---');
      const subjectRaw = parts[0] || '';
      const bodyRaw    = parts.length > 1 ? parts[1] : res.text;
      const subject    = subjectRaw.replace(/^ASUNTO:\s*/i, '').trim();
      const body       = bodyRaw.trim();

      _lastResult = { subject, body };

      const subEl = document.getElementById('email-subject-output');
      const bodEl = document.getElementById('email-body-output');
      if (subEl) subEl.textContent = subject;
      if (bodEl) bodEl.innerHTML   = Utils.nl2br(body);
      if (result) result.style.display = 'block';

      Utils.haptic('success');

    } finally {
      if (progress) progress.classList.remove('active');
      if (genBtn)   genBtn.disabled = false;
    }
  }

  return {
    init(viewEl) {
      const chipEl = document.getElementById('email-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      document.getElementById('email-generate-btn')?.addEventListener('click', generate);
      document.getElementById('email-regen-btn')?.addEventListener('click', generate);

      document.getElementById('email-copy-subject')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastResult.subject);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('email-copy-body')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(_lastResult.body);
        Utils.showSnackbar(I18n.t('common.copied'));
      });
      document.getElementById('email-copy-all')?.addEventListener('click', async () => {
        const all = `${I18n.t('email.subjectLabel')}: ${_lastResult.subject}\n\n${_lastResult.body}`;
        await Utils.copyToClipboard(all);
        Utils.showSnackbar(I18n.t('common.copied'));
      });

      I18n.applyToView(viewEl);
    }
  };
})();

window.EmailTool = EmailTool;
