/**
 * NEXIA Onboarding — Flujo de primer arranque 3-path
 *
 * Pantallas:
 *   ob-screen-1      → Bienvenida + elección de path
 *   ob-screen-free   → Path A: Gratis (Groq, Gemini, OpenRouter)
 *   ob-screen-guided → Path B: Comparativa todos los proveedores
 *   ob-screen-key    → Pantalla compartida: introducir key + verificar
 */
const Onboarding = (() => {
  'use strict';

  // ⚠ URL real del Worker desplegado — no modificar
  const WORKER_URL = 'https://nexia-api.josemmolera.workers.dev';

  // Proveedor seleccionado en el flujo actual
  let _selectedProvider = null;

  // ── Helpers ──────────────────────────────────────────────────────────────

  function showScreen(screenId) {
    document.querySelectorAll('.ob-screen').forEach(s => {
      s.style.display = 'none';
    });
    const target = document.getElementById(screenId);
    if (target) target.style.display = 'block';
  }

  /**
   * Rellena la pantalla de key con info del proveedor seleccionado.
   */
  function populateKeyScreen(providerId) {
    const provider = Providers.getProvider(providerId);
    if (!provider) return;

    _selectedProvider = providerId;
    const lang = I18n.getLang();

    // Info del proveedor
    const infoEl = document.getElementById('ob-key-provider-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="width:44px;height:44px;border-radius:12px;
                    background:var(--purple-bg);display:flex;
                    align-items:center;justify-content:center;
                    font-size:20px;flex-shrink:0">
          ${provider.free ? '🆓' : '💳'}
        </div>
        <div>
          <div style="font-size:var(--text-base);font-weight:500;
                      color:var(--text-primary)">
            ${Utils.escapeHtml(provider.name)}
          </div>
          <div style="font-size:var(--text-xs);color:var(--text-muted)">
            ${Utils.escapeHtml(provider.description)}
          </div>
        </div>`;
    }

    // Pasos de configuración
    const stepsEl = document.getElementById('ob-key-steps');
    if (stepsEl && provider.setupSteps) {
      const steps = provider.setupSteps[lang] || provider.setupSteps.es || [];
      stepsEl.innerHTML = steps.map((step, i) => `
        <div style="display:flex;gap:10px;padding:6px 0;
                    ${i < steps.length - 1 ? 'border-bottom:1px solid var(--border-subtle)' : ''}">
          <div style="width:20px;height:20px;border-radius:50%;
                      background:var(--purple-bg);color:var(--purple-light);
                      display:flex;align-items:center;justify-content:center;
                      font-size:10px;font-weight:700;flex-shrink:0;margin-top:2px">
            ${i + 1}
          </div>
          <div style="font-size:var(--text-sm);color:var(--text-secondary)">
            ${Utils.escapeHtml(step)}
          </div>
        </div>`).join('');
    }

    // Link a la consola — solo URLs https permitidas
    const linkEl = document.getElementById('ob-key-console-link');
    if (linkEl && provider.setupUrl) {
      // Solo permitir URLs HTTPS para prevenir inyección de esquemas
      const url = String(provider.setupUrl);
      if (url.startsWith('https://')) {
        linkEl.href = url;
      } else {
        linkEl.href = '#';
      }
    }

    // Placeholder de la key
    const keyInput = document.getElementById('ob-key-input');
    if (keyInput) {
      keyInput.placeholder = provider.keyPrefix
        ? `${provider.keyPrefix}...`
        : I18n.t('onboarding.keyPlaceholder');
      keyInput.value = '';
    }

    // Error oculto
    const errorEl = document.getElementById('ob-key-error');
    if (errorEl) errorEl.style.display = 'none';

    // Selector de modelos
    const modelSelect = document.getElementById('ob-model-select');
    if (modelSelect && Array.isArray(provider.models)) {
      modelSelect.innerHTML = provider.models.map(m =>
        `<option value="${Utils.escapeHtml(m.id)}"
                 ${m.recommended ? 'selected' : ''}>
           ${Utils.escapeHtml(m.label)}${m.recommended ? ' ★' : ''}
         </option>`
      ).join('');
    }
  }

  /**
   * Verifica la key contra el Worker.
   * Hace una llamada real con un mensaje corto.
   * Devuelve Promise<{ok: boolean, error?: string}>
   */
  async function verifyKey(providerId, apiKey, modelId) {
    try {
      const res = await fetch(`${WORKER_URL}/api/complete`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key':    apiKey,
          'X-Provider':   providerId
        },
        body: JSON.stringify({
          model:       modelId,
          messages:    [{ role: 'user', content: 'Hi' }],
          max_tokens:  5,
          temperature: 0
        })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const code = (data && data.error && data.error.code) || `HTTP_${res.status}`;
        return { ok: false, error: code };
      }

      // Verificar que la respuesta tiene el formato esperado
      const hasContent = data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        data.choices[0].message.content;

      if (!hasContent) {
        return { ok: false, error: 'INVALID_RESPONSE' };
      }

      return { ok: true };
    } catch (e) {
      if (!navigator.onLine) return { ok: false, error: 'NETWORK_ERROR' };
      return { ok: false, error: 'CONNECTION_ERROR' };
    }
  }

  /**
   * Maneja el proceso de verificación y guardado de key.
   */
  async function handleVerify() {
    const keyInput    = document.getElementById('ob-key-input');
    const verifyBtn   = document.getElementById('ob-verify-btn');
    const verifyText  = document.getElementById('ob-verify-text');
    const errorEl     = document.getElementById('ob-key-error');
    const modelSelect = document.getElementById('ob-model-select');

    const apiKey  = (keyInput  ? keyInput.value  : '').trim();
    const modelId = (modelSelect ? modelSelect.value : '');

    // Ocultar error previo
    if (errorEl) errorEl.style.display = 'none';

    // Validación básica del cliente mediante providers.saveKey
    const saveResult = Providers.saveKey(_selectedProvider, apiKey);
    if (!saveResult.ok) {
      if (errorEl) {
        errorEl.textContent = Providers.keyErrorMessage(saveResult.error, I18n.getLang());
        errorEl.style.display = 'block';
      }
      Utils.haptic('error');
      return;
    }

    // UI de carga
    if (verifyBtn)  verifyBtn.disabled = true;
    if (verifyText) verifyText.textContent = I18n.t('onboarding.verifying');

    // Verificación real contra el Worker
    const result = await verifyKey(_selectedProvider, apiKey, modelId);

    if (result.ok) {
      // Guardar modelo seleccionado como activo
      Providers.setActive(_selectedProvider, modelId);

      if (verifyText) verifyText.textContent = I18n.t('onboarding.verifySuccess');
      Utils.haptic('success');

      // Esperar un momento para que el usuario vea el éxito
      setTimeout(() => {
        Router.navigate('home');
      }, 800);
    } else {
      // Revertir: eliminar la key guardada si la verificación falla
      Providers.removeKey(_selectedProvider);

      const isNetworkErr = result.error === 'NETWORK_ERROR' ||
                           result.error === 'CONNECTION_ERROR';
      const errMsg = isNetworkErr
        ? I18n.t('errors.networkError')
        : I18n.t('onboarding.verifyError');

      if (errorEl) {
        errorEl.textContent = errMsg;
        errorEl.style.display = 'block';
      }

      if (verifyBtn)  verifyBtn.disabled = false;
      if (verifyText) verifyText.textContent = I18n.t('onboarding.goToApp');
      Utils.haptic('error');
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {

    /**
     * Inicializa el onboarding.
     * Llamar desde Router cuando se navega a 'onboarding'.
     */
    init(viewEl) {
      _selectedProvider = null;

      // Mostrar pantalla 1
      showScreen('ob-screen-1');

      // ── Listeners path buttons ──
      const pathFreeBtn    = document.getElementById('ob-path-free');
      const pathGuidedBtn  = document.getElementById('ob-path-guided');
      const pathExpertBtn  = document.getElementById('ob-path-expert');

      if (pathFreeBtn) {
        pathFreeBtn.addEventListener('click', () => {
          Utils.haptic('light');
          showScreen('ob-screen-free');
        });
      }

      if (pathGuidedBtn) {
        pathGuidedBtn.addEventListener('click', () => {
          Utils.haptic('light');
          this._buildGuidedList();
          showScreen('ob-screen-guided');
        });
      }

      if (pathExpertBtn) {
        pathExpertBtn.addEventListener('click', () => {
          Utils.haptic('light');
          this._showProviderSelector();
        });
      }

      // ── Skip button ──
      const skipBtn = document.getElementById('ob-skip-btn');
      if (skipBtn) {
        skipBtn.addEventListener('click', () => {
          Utils.haptic('light');
          Router.navigate('home');
        });
      }

      // ── Back buttons ──
      document.getElementById('ob-back-free')?.addEventListener('click', () => {
        showScreen('ob-screen-1');
      });
      document.getElementById('ob-back-guided')?.addEventListener('click', () => {
        showScreen('ob-screen-1');
      });
      document.getElementById('ob-back-key')?.addEventListener('click', () => {
        showScreen('ob-screen-1');
      });

      // ── Providers gratuitos ──
      document.querySelectorAll('.ob-free-provider').forEach(el => {
        el.addEventListener('click', () => {
          const providerId = el.dataset.provider;
          if (!providerId) return;
          Utils.haptic('light');
          populateKeyScreen(providerId);
          showScreen('ob-screen-key');
        });
      });

      // ── Verify button ──
      const verifyBtn = document.getElementById('ob-verify-btn');
      if (verifyBtn) {
        verifyBtn.addEventListener('click', () => {
          handleVerify();
        });
      }

      // ── Enter en el input de key ──
      const keyInput = document.getElementById('ob-key-input');
      if (keyInput) {
        keyInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') handleVerify();
        });
      }

      // Aplicar traducciones a la vista
      if (viewEl) I18n.applyToView(viewEl);
    },

    /**
     * Construye la lista guiada con todos los proveedores.
     */
    _buildGuidedList() {
      const container = document.getElementById('ob-guided-list');
      if (!container) return;

      const catalog = Providers.getCatalog();

      container.innerHTML = Object.values(catalog).map(provider => {
        const freeLabel = provider.free
          ? `<span class="badge badge-green">${I18n.t('onboarding.freeOption')}</span>`
          : `<span class="badge badge-gray">${I18n.t('onboarding.paidProvider')}</span>`;

        return `
          <div class="list-item card-tap ripple ob-guided-provider"
               data-provider="${Utils.escapeHtml(provider.id)}"
               style="padding:var(--space-sm) 0">
            <div class="list-info">
              <div class="list-title">${Utils.escapeHtml(provider.name)}</div>
              <div class="list-subtitle">${Utils.escapeHtml(provider.description)}</div>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              ${freeLabel}
              <span class="list-chevron">›</span>
            </div>
          </div>`;
      }).join('');

      // Listeners
      container.querySelectorAll('.ob-guided-provider').forEach(el => {
        el.addEventListener('click', () => {
          const providerId = el.dataset.provider;
          if (!providerId) return;
          Utils.haptic('light');
          populateKeyScreen(providerId);
          showScreen('ob-screen-key');
        });
      });
    },

    /**
     * Path Experto: abre selector de proveedor como bottom sheet.
     */
    _showProviderSelector() {
      const catalog = Providers.getCatalog();

      const html = `
        <div class="sheet-title">${I18n.t('onboarding.chooseProvider')}</div>
        ${Object.values(catalog).map(p => `
          <div class="list-item card-tap ripple ob-expert-provider"
               data-provider="${Utils.escapeHtml(p.id)}">
            <div class="list-info">
              <div class="list-title">${Utils.escapeHtml(p.name)}</div>
              <div class="list-subtitle">${Utils.escapeHtml(p.description)}</div>
            </div>
            <span class="badge ${p.free ? 'badge-green' : 'badge-gray'}">
              ${p.free ? I18n.t('onboarding.freeOption') : I18n.t('onboarding.paidProvider')}
            </span>
          </div>`).join('')}
      `;

      Utils.openSheet(html);

      setTimeout(() => {
        document.querySelectorAll('.ob-expert-provider').forEach(el => {
          el.addEventListener('click', () => {
            const providerId = el.dataset.provider;
            if (!providerId) return;
            Utils.closeSheet();
            setTimeout(() => {
              populateKeyScreen(providerId);
              showScreen('ob-screen-key');
            }, 300);
          });
        });
      }, 50);
    }
  };
})();

window.Onboarding = Onboarding;
