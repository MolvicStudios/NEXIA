/**
 * NEXIA Settings — Gestión de proveedores, idioma y datos
 */
const Settings = (() => {
  'use strict';

  // ── Helpers de render ─────────────────────────────────────────────────────

  function renderActiveProvider() {
    const el = document.getElementById('settings-active-provider-info');
    if (!el) return;

    if (!Providers.hasAnyKey()) {
      el.innerHTML = `
        <div style="font-size:var(--text-sm);color:var(--text-muted)">
          ${I18n.t('settings.noKeyConfigured')}
        </div>`;

      // Ocultar selector de modelos si no hay proveedor
      const modelGroup = document.getElementById('settings-model-select');
      if (modelGroup) modelGroup.parentElement.style.display = 'none';
      return;
    }

    const { provider, model } = Providers.getActive();

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:24px">${provider.free ? '🆓' : '💳'}</div>
        <div>
          <div style="font-size:var(--text-base);font-weight:500;
                      color:var(--text-primary)">
            ${Utils.escapeHtml(provider.name)}
          </div>
          <div style="font-size:var(--text-xs);color:var(--text-muted)">
            ${Utils.escapeHtml(Providers.maskKey(provider.id) || '')}
          </div>
        </div>
      </div>`;

    // Mostrar y rellenar selector de modelos
    const modelSelectContainer = document.getElementById('settings-model-select');
    if (modelSelectContainer) {
      const container = modelSelectContainer.closest('.input-group');
      if (container) container.style.display = '';

      modelSelectContainer.innerHTML = (provider.models || []).map(m =>
        `<option value="${Utils.escapeHtml(m.id)}"
                 ${m.id === model ? 'selected' : ''}>
           ${Utils.escapeHtml(m.label)}
         </option>`
      ).join('');

      // Evitar duplicar el listener
      modelSelectContainer.onchange = () => {
        Providers.setActive(provider.id, modelSelectContainer.value);
        Utils.showSnackbar(I18n.t('settings.modelSaved'));
      };
    }
  }

  function renderKeysList() {
    const container = document.getElementById('settings-keys-list');
    if (!container) return;

    const catalog    = Providers.getCatalog();
    const configured = Object.keys(catalog).filter(id => Providers.hasKey(id));

    if (configured.length === 0) {
      container.innerHTML = `
        <div style="font-size:var(--text-sm);color:var(--text-muted);
                    padding:var(--space-sm) 0">
          ${I18n.t('settings.noKeyConfigured')}
        </div>`;
      return;
    }

    const activeId = Providers.getActive().provider.id;

    container.innerHTML = configured.map(id => {
      const provider = catalog[id];
      const isActive = id === activeId;
      return `
        <div class="list-item" style="padding:var(--space-sm) 0">
          <div class="list-info">
            <div class="list-title" style="display:flex;align-items:center;gap:6px">
              ${Utils.escapeHtml(provider.name)}
              ${isActive
                ? `<span class="badge badge-purple">${I18n.t('settings.providerActive')}</span>`
                : ''}
            </div>
            <div class="list-subtitle">
              ${Utils.escapeHtml(Providers.maskKey(id) || '')}
            </div>
          </div>
          <div style="display:flex;gap:6px">
            ${!isActive ? `
              <button class="btn btn-secondary settings-set-active-btn"
                      data-provider="${Utils.escapeHtml(id)}"
                      style="font-size:10px;padding:4px 8px;min-height:32px">
                ${I18n.t('settings.switchProvider')}
              </button>` : ''}
            <button class="btn settings-delete-key-btn"
                    data-provider="${Utils.escapeHtml(id)}"
                    style="background:var(--red-bg);color:var(--red);
                           font-size:10px;padding:4px 8px;min-height:32px">
              ✕
            </button>
          </div>
        </div>`;
    }).join('');

    // Listener: activar proveedor
    container.querySelectorAll('.settings-set-active-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid      = btn.dataset.provider;
        const provider = catalog[pid];
        if (!provider) return;
        const model = (provider.models || []).find(m => m.recommended)?.id
          || (provider.models && provider.models[0]?.id)
          || '';
        Providers.setActive(pid, model);
        renderActiveProvider();
        renderKeysList();
        Utils.showSnackbar(`${provider.name} — ${I18n.t('settings.providerActive')}`);
        Utils.haptic('light');
      });
    });

    // Listener: eliminar key
    container.querySelectorAll('.settings-delete-key-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const pid      = btn.dataset.provider;
        const provider = catalog[pid];
        if (!provider) return;
        Providers.removeKey(pid);
        renderActiveProvider();
        renderKeysList();
        Utils.showSnackbar(
          `${provider.name} — ${I18n.t('settings.keyDeleted')}`,
          { duration: 3000 }
        );
        Utils.haptic('medium');
      });
    });
  }

  // ── Sheets ────────────────────────────────────────────────────────────────

  function openAddProviderSheet() {
    const catalog = Providers.getCatalog();

    const html = `
      <div class="sheet-title">${I18n.t('settings.addProvider')}</div>
      ${Object.values(catalog).map(p => {
        const hasKey = Providers.hasKey(p.id);
        return `
          <div class="list-item card-tap ripple settings-add-provider-item"
               data-provider="${Utils.escapeHtml(p.id)}"
               style="${hasKey ? 'opacity:0.5;pointer-events:none' : ''}">
            <div class="list-info">
              <div class="list-title" style="display:flex;align-items:center;gap:6px">
                ${Utils.escapeHtml(p.name)}
                ${hasKey ? '<span class="badge badge-green">✓</span>' : ''}
              </div>
              <div class="list-subtitle">${Utils.escapeHtml(p.description)}</div>
            </div>
            <span class="badge ${p.free ? 'badge-green' : 'badge-gray'}">
              ${p.free
                ? I18n.t('onboarding.freeOption')
                : I18n.t('onboarding.paidProvider')}
            </span>
          </div>`;
      }).join('')}
    `;

    Utils.openSheet(html);

    setTimeout(() => {
      document.querySelectorAll('.settings-add-provider-item').forEach(el => {
        el.addEventListener('click', () => {
          const pid = el.dataset.provider;
          if (!pid) return;
          Utils.closeSheet();
          setTimeout(() => openKeyInputSheet(pid), 300);
        });
      });
    }, 50);
  }

  function openKeyInputSheet(providerId) {
    const provider = Providers.getProvider(providerId);
    if (!provider) return;

    const lang  = I18n.getLang();
    const steps = (provider.setupSteps && (provider.setupSteps[lang] || provider.setupSteps.es)) || [];

    // Solo URLs HTTPS para prevenir inyección de esquemas
    const consoleUrl = (provider.setupUrl && String(provider.setupUrl).startsWith('https://'))
      ? provider.setupUrl
      : '#';

    const html = `
      <div class="sheet-title">${Utils.escapeHtml(provider.name)}</div>

      <a href="${Utils.escapeHtml(consoleUrl)}" target="_blank" rel="noopener noreferrer"
         class="btn btn-secondary btn-full" style="margin-bottom:var(--space-md)">
        ${I18n.t('onboarding.openConsole')} ↗
      </a>

      <div class="card" style="margin-bottom:var(--space-md)">
        ${steps.map((s, i) => `
          <div style="display:flex;gap:8px;padding:5px 0;
                      ${i < steps.length - 1 ? 'border-bottom:1px solid var(--border-subtle)' : ''}">
            <span style="color:var(--purple-light);font-size:11px;font-weight:700;
                         min-width:16px;margin-top:1px">${i + 1}.</span>
            <span style="font-size:var(--text-sm);color:var(--text-secondary)">
              ${Utils.escapeHtml(s)}
            </span>
          </div>`).join('')}
      </div>

      <div class="input-group">
        <label class="input-label">${I18n.t('onboarding.enterKey')}</label>
        <input class="input" id="settings-new-key-input" type="password"
               autocomplete="off" autocorrect="off" autocapitalize="off"
               spellcheck="false"
               placeholder="${Utils.escapeHtml(provider.keyPrefix ? provider.keyPrefix + '...' : '')}" />
        <div id="settings-new-key-error"
             style="font-size:var(--text-xs);color:var(--red);
                    margin-top:4px;display:none"></div>
      </div>

      <button class="btn btn-primary btn-full" id="settings-save-new-key"
              style="margin-top:8px">
        ${I18n.t('common.save')}
      </button>
    `;

    Utils.openSheet(html);

    setTimeout(() => {
      const saveBtn = document.getElementById('settings-save-new-key');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const keyInput  = document.getElementById('settings-new-key-input');
          const key       = (keyInput ? keyInput.value : '').trim();
          const result    = Providers.saveKey(providerId, key);

          if (result.ok) {
            Utils.closeSheet();
            renderActiveProvider();
            renderKeysList();
            Utils.showSnackbar(`${provider.name} — ${I18n.t('settings.keyConfigured')}`);
            Utils.haptic('success');
          } else {
            const errEl = document.getElementById('settings-new-key-error');
            if (errEl) {
              errEl.textContent = Providers.keyErrorMessage(result.error, I18n.getLang());
              errEl.style.display = 'block';
            }
            Utils.haptic('error');
          }
        });
      }

      // Enter en el input
      const keyInput2 = document.getElementById('settings-new-key-input');
      if (keyInput2) {
        keyInput2.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            const saveBtn2 = document.getElementById('settings-save-new-key');
            if (saveBtn2) saveBtn2.click();
          }
        });
      }
    }, 50);
  }

  function handleClearData() {
    const lang        = I18n.getLang();
    const confirmWord = lang === 'en'
      ? I18n.t('settings.clearDataWordEn')
      : I18n.t('settings.clearDataWord');

    const html = `
      <div class="sheet-title" style="color:var(--red)">
        ⚠ ${I18n.t('settings.clearData')}
      </div>
      <div style="font-size:var(--text-sm);color:var(--text-secondary);
                  margin-bottom:var(--space-md);line-height:1.6">
        ${I18n.t('settings.clearDataWarning')}
      </div>
      <div class="input-group">
        <label class="input-label">
          ${I18n.t('settings.clearDataConfirm')}:
          <strong>${Utils.escapeHtml(confirmWord)}</strong>
        </label>
        <input class="input" id="clear-data-confirm-input"
               placeholder="${Utils.escapeHtml(confirmWord)}"
               autocomplete="off" autocorrect="off" autocapitalize="off" />
      </div>
      <button class="btn btn-full" id="clear-data-confirm-btn"
              style="background:var(--red-bg);border:1px solid #4A1010;
                     color:var(--red);margin-top:8px" disabled>
        ${I18n.t('settings.clearData')}
      </button>
      <button class="btn btn-secondary btn-full" id="clear-data-cancel-btn"
              style="margin-top:8px">
        ${I18n.t('common.cancel')}
      </button>
    `;

    Utils.openSheet(html);

    setTimeout(() => {
      const confirmInput = document.getElementById('clear-data-confirm-input');
      const confirmBtn   = document.getElementById('clear-data-confirm-btn');
      const cancelBtn    = document.getElementById('clear-data-cancel-btn');

      if (confirmInput && confirmBtn) {
        confirmInput.addEventListener('input', () => {
          const val    = confirmInput.value.trim().toUpperCase();
          const target = confirmWord.toUpperCase();
          confirmBtn.disabled = (val !== target);
        });
      }

      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          Storage.clearAll();
          Utils.closeSheet();
          Utils.showSnackbar(I18n.t('settings.dataCleared'));
          Utils.haptic('medium');
          // Reinicializar skills por defecto
          Skills.init();
          // Volver al onboarding
          setTimeout(() => Router.navigate('onboarding'), 500);
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => Utils.closeSheet());
      }
    }, 50);
  }

  // ── API pública ───────────────────────────────────────────────────────────

  return {
    init(viewEl) {
      renderActiveProvider();
      renderKeysList();

      // ── Idioma de la app ──
      const langSelect = document.getElementById('settings-lang-select');
      if (langSelect) {
        langSelect.value = I18n.getLang();
        langSelect.addEventListener('change', async () => {
          await I18n.setLang(langSelect.value);
        });
      }

      // ── Idioma IA ──
      const aiLangSelect = document.getElementById('settings-ai-lang-select');
      if (aiLangSelect) {
        aiLangSelect.value = Providers.getAILang();
        aiLangSelect.addEventListener('change', () => {
          Providers.setAILang(aiLangSelect.value);
          Utils.showSnackbar(I18n.t('settings.modelSaved'));
        });
      }

      // ── Storage usage ──
      const storageEl = document.getElementById('settings-storage-usage');
      if (storageEl) {
        storageEl.textContent = `${Storage.usage()} KB`;
      }

      // ── Añadir proveedor ──
      const addProviderBtn = document.getElementById('settings-add-provider');
      if (addProviderBtn) {
        addProviderBtn.addEventListener('click', () => openAddProviderSheet());
      }

      // ── Cambiar proveedor activo ──
      const changeProviderBtn = document.getElementById('settings-change-provider');
      if (changeProviderBtn) {
        changeProviderBtn.addEventListener('click', () => openAddProviderSheet());
      }

      // ── Borrar datos ──
      const clearDataBtn = document.getElementById('settings-clear-data');
      if (clearDataBtn) {
        clearDataBtn.addEventListener('click', () => handleClearData());
      }

      // ── Privacidad — URL fija, no depende de input del usuario ──
      const privacyBtn = document.getElementById('settings-privacy-btn');
      if (privacyBtn) {
        privacyBtn.addEventListener('click', () => {
          window.open('https://molvicstudios.pro/nexia/privacy', '_blank', 'noopener,noreferrer');
        });
      }

      // ── Re-render si cambia el proveedor ──
      document.addEventListener('providers:changed', () => {
        renderActiveProvider();
        renderKeysList();
      });

      if (viewEl) I18n.applyToView(viewEl);
    }
  };
})();

window.Settings = Settings;
