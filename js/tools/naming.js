/**
 * NEXIA Naming IA — genera nombres creativos para proyectos y marcas
 */
const NamingTool = (() => {
  'use strict';

  const TOOL_ID   = 'naming';
  const FAVS_KEY  = 'naming_favorites';
  const MAX_FAVS  = 50;

  // ── Favorites ──────────────────────────────────────────────────────────────

  function _loadFavs() {
    try { return JSON.parse(Storage.get(FAVS_KEY) || '[]'); }
    catch { return []; }
  }

  function _saveFavs(favs) {
    Storage.set(FAVS_KEY, JSON.stringify(favs));
  }

  function toggleFavorite(name) {
    const favs = _loadFavs();
    const idx  = favs.indexOf(name);
    if (idx >= 0) {
      favs.splice(idx, 1);
      _saveFavs(favs);
      return false;
    }
    if (favs.length >= MAX_FAVS) {
      Utils.showSnackbar(I18n.t('naming.favsLimitReached') || 'Límite de favoritos alcanzado');
      return false;
    }
    favs.push(name);
    _saveFavs(favs);
    return true;
  }

  // ── Response parser ────────────────────────────────────────────────────────

  function parseNamingResponse(text) {
    const cleaned = text.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/,      '')
      .replace(/\s*```$/,      '');

    // Attempt JSON
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch (_) { /* fall through to line parsing */ }

    // Line-by-line fallback: each numbered line like "1. **Name** — description"
    const lines  = text.split('\n').filter(l => l.trim());
    const result = [];
    for (const line of lines) {
      const match = line.match(/^\d+[\.\)]\s+\*{0,2}([^*\n—–-]+)\*{0,2}\s*[—–-]?\s*(.*)?$/);
      if (match) {
        result.push({ name: match[1].trim(), description: (match[2] || '').trim() });
      }
    }
    return result.length ? result : [{ name: text.trim(), description: '' }];
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  function renderResults(parsed) {
    const listEl = document.getElementById('naming-list');
    if (!listEl) return;
    listEl.innerHTML = '';

    const favs = _loadFavs();

    parsed.forEach(item => {
      const safeName = Utils.escapeHtml(item.name        || '');
      const safeDesc = Utils.escapeHtml(item.description || '');
      const isFav    = favs.includes(item.name);

      const card = document.createElement('div');
      card.className = 'naming-card';
      card.innerHTML = `
        <div class="naming-card-header">
          <span class="naming-card-name">${safeName}</span>
          <div class="naming-card-actions">
            <button class="icon-btn naming-copy-btn" data-name="${safeName}" aria-label="${I18n.t('common.copy')}">&#128203;</button>
            <button class="icon-btn naming-fav-btn ${isFav ? 'active' : ''}" data-name="${item.name}" aria-label="${I18n.t('naming.favorite')}">&#9733;</button>
          </div>
        </div>
        ${safeDesc ? `<p class="naming-card-desc">${safeDesc}</p>` : ''}
      `;

      card.querySelector('.naming-copy-btn')?.addEventListener('click', async () => {
        await Utils.copyToClipboard(item.name);
        Utils.showSnackbar(I18n.t('common.copied'));
      });

      card.querySelector('.naming-fav-btn')?.addEventListener('click', (e) => {
        const added = toggleFavorite(item.name);
        e.currentTarget.classList.toggle('active', added);
        Utils.showSnackbar(added ? I18n.t('naming.favoriteSaved') : I18n.t('naming.favoriteRemoved'));
        Utils.haptic(added ? 'success' : 'light');
      });

      listEl.appendChild(card);
    });
  }

  // ── Core generate ──────────────────────────────────────────────────────────

  async function generate() {
    const desc    = (document.getElementById('naming-desc')?.value     || '').trim();
    const industry = document.getElementById('naming-industry')?.value || 'technology';
    const style    = document.getElementById('naming-style')?.value    || 'modern';
    const langPref = document.getElementById('naming-lang-pref')?.value || 'es';

    if (!desc) {
      Utils.showSnackbar(I18n.t('naming.noDesc'));
      return;
    }

    const progress = document.getElementById('naming-progress');
    const btn      = document.getElementById('naming-btn');
    const regenBtn = document.getElementById('naming-regen-btn');
    const results  = document.getElementById('naming-results');

    if (progress) progress.classList.add('active');
    if (btn)      btn.disabled = true;
    if (regenBtn) regenBtn.disabled = true;
    if (results)  results.style.display = 'none';

    try {
      const langMap = { es: 'español', en: 'English', mixed: 'neutro/mezclado', invented: 'inventado/neologismo' };
      const langLabel = langMap[langPref] || 'español';

      const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
        'Eres un experto en branding, naming y estrategia de marca. Generas nombres creativos, memorables y únicos.');
      const userPrompt = `Genera 8 propuestas de nombres para el siguiente proyecto o negocio. Responde ÚNICAMENTE con un array JSON (sin texto adicional) con objetos que tengan las propiedades: "name" (string) y "description" (string, máx 15 palabras explicando el concepto detrás del nombre).

Proyecto: ${desc}
Industria/sector: ${industry}
Estilo de nombre deseado: ${style}
Preferencia de idioma: ${langLabel}

Ejemplo de formato: [{"name":"Nexora","description":"Fusión de nexo y aura, evoca conexión y presencia"},...]`;

      const res = await AIClient.complete(
        [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        { maxTokens: 1024, temperature: 0.85 }
      );

      if (!res.ok) { Utils.showSnackbar(res.message || I18n.t('errors.networkError')); return; }

      const parsed = parseNamingResponse(res.text);
      renderResults(parsed);
      if (results) results.style.display = 'block';
      Utils.haptic('success');

    } finally {
      if (progress) progress.classList.remove('active');
      if (btn)      btn.disabled = false;
      if (regenBtn) regenBtn.disabled = false;
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  return {
    init(viewEl) {
      const chipEl = document.getElementById('naming-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      document.getElementById('naming-btn')?.addEventListener('click',       generate);
      document.getElementById('naming-regen-btn')?.addEventListener('click', generate);

      I18n.applyToView(viewEl);
    }
  };
})();

window.NamingTool = NamingTool;
