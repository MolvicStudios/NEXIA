/**
 * NEXIA Home — Grid de 15 herramientas + estado API
 */
const Home = (() => {
  'use strict';

  const TOOLS = [
    { id: 'chat',       name: 'Chat IA',     nameEn: 'AI Chat',      emoji: '💬', color: '#C4B5FD', bg: '#2E0A5E' },
    { id: 'editor',     name: 'Editor IA',   nameEn: 'AI Editor',    emoji: '📝', color: '#34D399', bg: '#064E3B' },
    { id: 'email',      name: 'Correo IA',   nameEn: 'AI Email',     emoji: '✉️', color: '#60A5FA', bg: '#0A1840' },
    { id: 'translator', name: 'Traductor',   nameEn: 'Translator',   emoji: '🌍', color: '#A78BFA', bg: '#1E0A4E' },
    { id: 'code',       name: 'Código IA',   nameEn: 'AI Code',      emoji: '⌨️', color: '#5EEAD4', bg: '#042A28' },
    { id: 'generator',  name: 'Generador',   nameEn: 'Generator',    emoji: '✦',  color: '#F472B6', bg: '#4A0A28' },
    { id: 'repurpose',  name: 'Repurpose',   nameEn: 'Repurpose',    emoji: '♻️', color: '#93C5FD', bg: '#0A1840' },
    { id: 'summarizer', name: 'Resumir',     nameEn: 'Summarize',    emoji: '📋', color: '#FB923C', bg: '#2E1200' },
    { id: 'brief',      name: 'Brief Gen',   nameEn: 'Brief Gen',    emoji: '📊', color: '#86EFAC', bg: '#0A2010' },
    { id: 'naming',     name: 'Naming IA',   nameEn: 'AI Naming',    emoji: '🏷️', color: '#FDE68A', bg: '#1A1A00' },
    { id: 'prospectly', name: 'Prospectly',  nameEn: 'Prospectly',   emoji: '🎯', color: '#60A5FA', bg: '#0A1840' },
    { id: 'proposals',  name: 'Propuestas',  nameEn: 'Proposals',    emoji: '📄', color: '#818CF8', bg: '#1E1040' },
    { id: 'contracts',  name: 'Contratos',   nameEn: 'Contracts',    emoji: '⚖️', color: '#FCA5A5', bg: '#2A0A0A' },
    { id: 'cv',         name: 'CV Builder',  nameEn: 'CV Builder',   emoji: '👤', color: '#5EEAD4', bg: '#042A28' },
    { id: 'prompts',    name: 'Prompts',     nameEn: 'Prompts',      emoji: '⚡', color: '#FCD34D', bg: '#4A2000' }
  ];

  function getToolName(tool) {
    return I18n.getLang() === 'en' ? tool.nameEn : tool.name;
  }

  function renderGrid() {
    const grid = document.getElementById('tools-grid');
    if (!grid) return;

    grid.innerHTML = TOOLS.map(tool => `
      <div class="card card-tap ripple tool-card no-select"
           data-route="${Utils.escapeHtml(tool.id)}"
           style="padding:var(--space-md);min-height:80px;
                  display:flex;flex-direction:column;gap:8px">
        <div style="width:34px;height:34px;border-radius:9px;
                    background:${Utils.escapeHtml(tool.bg)};
                    display:flex;align-items:center;justify-content:center;
                    font-size:18px">
          ${Utils.escapeHtml(tool.emoji)}
        </div>
        <div style="font-size:var(--text-sm);font-weight:500;
                    color:var(--text-primary);line-height:1.2">
          ${Utils.escapeHtml(getToolName(tool))}
        </div>
      </div>`).join('');

    // Listeners de navegación
    grid.querySelectorAll('.tool-card').forEach(card => {
      card.addEventListener('click', () => {
        const route = card.dataset.route;
        if (route) {
          Utils.haptic('light');
          Router.navigate(route);
        }
      });
    });
  }

  function updateApiStatus() {
    const dot    = document.getElementById('home-api-dot');
    const text   = document.getElementById('home-api-text');
    const action = document.getElementById('home-api-action');

    if (!dot || !text) return;

    if (Providers.hasAnyKey()) {
      const { provider } = Providers.getActive();
      dot.className    = 'api-dot active';
      text.textContent = `${provider.name} · ${Providers.maskKey(provider.id) || ''}`;
      if (action) action.style.display = 'none';
    } else {
      dot.className    = 'api-dot warning';
      text.textContent = I18n.t('home.apiInactive');
      if (action) action.style.display = '';
    }
  }

  function updateSkillsCount() {
    const countEl = document.getElementById('home-skills-count');
    if (!countEl) return;
    const all    = Skills.getAll();
    const custom = all.filter(s => !s.isDefault);
    const lang   = I18n.getLang();
    countEl.textContent = custom.length > 0
      ? `${all.length} skills · ${custom.length} ${lang === 'en' ? 'custom' : 'propios'}`
      : `${all.length} skills`;
  }

  // Event listener handles — stored so they can be removed on re-init
  let _onProvidersChanged = null;
  let _onI18nChanged      = null;

  return {
    init(viewEl) {
      // Remove stale listeners from a previous init
      if (_onProvidersChanged) {
        document.removeEventListener('providers:changed', _onProvidersChanged);
      }
      if (_onI18nChanged) {
        document.removeEventListener('i18n:changed', _onI18nChanged);
      }

      updateApiStatus();
      updateSkillsCount();
      renderGrid();

      // Skills button
      const skillsBtn = document.getElementById('home-skills-btn');
      if (skillsBtn) {
        skillsBtn.addEventListener('click', () => {
          if (window.SkillsUI) SkillsUI.openLibrary();
        });
      }

      // API action button
      const apiAction = document.getElementById('home-api-action');
      if (apiAction) {
        apiAction.addEventListener('click', () => Router.navigate('settings'));
      }

      // Re-render si cambia el proveedor
      _onProvidersChanged = () => updateApiStatus();
      document.addEventListener('providers:changed', _onProvidersChanged);

      // Re-render si cambia el idioma
      _onI18nChanged = () => {
        renderGrid();
        updateSkillsCount();
        if (viewEl) I18n.applyToView(viewEl);
      };
      document.addEventListener('i18n:changed', _onI18nChanged);

      if (viewEl) I18n.applyToView(viewEl);
    }
  };
})();

window.Home = Home;
