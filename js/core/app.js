/**
 * NEXIA App — Punto de entrada y orquestador
 *
 * Orden de inicialización:
 * 1. Storage.initSchema()
 * 2. Skills.init()
 * 3. I18n.init()
 * 4. I18n.applyToDOM()
 * 5. setupGlobalListeners()
 * 6. setupCapacitor()
 * 7. registerRoutes()
 * 8. Router.init(startRoute)
 * 9. State.setReady()
 */
const App = (() => {

  // ── Configuración de rutas ───────────────────────────────────────────────

  function registerRoutes() {
    // ── Rutas base (disponibles desde MP3) ──
    Router.config('home', {
      title:    'NEXIA',
      subtitle: I18n.t('app.tagline'),
      showBack: false
    });
    Router.config('settings', {
      title:    I18n.t('common.settings'),
      subtitle: '',
      showBack: false
    });
    Router.config('onboarding', {
      title:    '',
      subtitle: '',
      showBack: false
    });

    // ── Rutas de tools — se configuran aquí, handlers se añaden en cada MP ──
    const toolConfigs = [
      { route: 'chat',       title: 'Chat IA',    subtitle: '' },
      { route: 'editor',     title: 'Editor IA',  subtitle: '' },
      { route: 'email',      title: 'Correo IA',  subtitle: '' },
      { route: 'translator', title: 'Traductor',  subtitle: '' },
      { route: 'code',       title: 'Código IA',  subtitle: '' },
      { route: 'generator',  title: 'Generador',  subtitle: '' },
      { route: 'repurpose',  title: 'Repurpose',  subtitle: '' },
      { route: 'summarizer', title: 'Resumir',    subtitle: '' },
      { route: 'brief',      title: 'Brief Gen',  subtitle: '' },
      { route: 'naming',     title: 'Naming IA',  subtitle: '' },
      { route: 'prompts',    title: 'Prompts',    subtitle: '' },
      { route: 'prospectly', title: 'Prospectly', subtitle: '' },
      { route: 'proposals',  title: 'Propuestas', subtitle: '' },
      { route: 'contracts',  title: 'Contratos',  subtitle: '' },
      { route: 'cv',         title: 'CV Builder', subtitle: '' }
    ];

    toolConfigs.forEach(({ route, title, subtitle }) => {
      Router.config(route, { title, subtitle, showBack: true });
      // Handler temporal hasta que el MP correspondiente lo registre
      Router.on(route, (_viewEl) => {
        // La vista placeholder del MP1 se muestra tal cual
        // Los tools reales reemplazan este handler en sus respectivos MPs
      });
    });
  }

  // ── Event listeners globales ─────────────────────────────────────────────

  function setupGlobalListeners() {

    // ── Online / Offline ──
    window.addEventListener('online', () => {
      State.setOnline(true);
      Utils.showSnackbar(I18n.t('errors.backOnline') || 'Conexión restaurada');
    });
    window.addEventListener('offline', () => {
      State.setOnline(false);
      Utils.showSnackbar(I18n.t('errors.noConnection') || 'Sin conexión a internet', {
        duration: 5000
      });
    });

    // ── Storage quota warning ──
    document.addEventListener('storage:quota', (e) => {
      const usage = (e.detail && e.detail.usageKB) || Storage.usage();
      Utils.showSnackbar(
        `${I18n.t('errors.storageWarning') || 'Almacenamiento casi lleno'} (${usage}KB)`,
        {
          action:   I18n.t('common.settings') || 'Ajustes',
          onAction: () => Router.navigate('settings'),
          duration: 6000
        }
      );
    });

    // ── Provider cambiado ──
    document.addEventListener('providers:changed', (e) => {
      const { providerId } = e.detail;
      const provider = Providers.getProvider(providerId);
      if (provider) {
        Utils.showSnackbar(`${provider.name} activado`);
      }
    });

    // ── Bottom nav — tap en tabs ──
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const route = item.dataset.route;
        if (route && route !== Router.current()) {
          Utils.haptic('light');
          Router.navigate(route);
        }
      });
    });

    // ── Header back button ──
    const backBtn = document.getElementById('btn-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        Utils.haptic('light');
        Router.back();
      });
    }

    // ── i18n cambiado — re-aplicar a la vista actual ──
    document.addEventListener('i18n:changed', () => {
      I18n.applyToDOM();
      // Re-registrar configs de rutas con nuevas traducciones
      registerRoutes();
    });
  }

  // ── Capacitor: back button Android ──────────────────────────────────────

  async function setupCapacitor() {
    // Solo en dispositivo nativo
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) return;

    try {
      const { App: CapApp } = await import('@capacitor/app');

      CapApp.addListener('backButton', async () => {
        const current = Router.current();

        // En home u onboarding: confirmar salida
        if (current === 'home' || current === 'onboarding') {
          // Mostrar confirmación de salida
          Utils.openSheet(`
            <div class="sheet-title" data-i18n="app.exitTitle">${I18n.t('app.exitTitle')}</div>
            <div style="display:flex;gap:8px;margin-top:8px">
              <button class="btn btn-secondary btn-full" id="btn-cancel-exit">
                ${I18n.t('common.cancel')}
              </button>
              <button class="btn btn-primary btn-full" id="btn-confirm-exit">
                ${I18n.t('app.exit') || 'Salir'}
              </button>
            </div>
          `);

          // Listeners de los botones del sheet
          setTimeout(() => {
            const cancelBtn  = document.getElementById('btn-cancel-exit');
            const confirmBtn = document.getElementById('btn-confirm-exit');
            if (cancelBtn)  cancelBtn.addEventListener('click',  () => Utils.closeSheet());
            if (confirmBtn) confirmBtn.addEventListener('click', async () => {
              Utils.closeSheet();
              await CapApp.exitApp();
            });
          }, 50);

        } else {
          // En cualquier otra ruta: navegar atrás
          Utils.haptic('light');
          await Router.back();
        }
      });

      // Estado de la app (foreground/background)
      CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // App vuelve a foreground — sin acción por ahora
        }
      });

    } catch (e) {
      console.warn('[App] Capacitor App plugin no disponible:', e.message);
    }
  }

  // ── Determinar ruta de arranque ──────────────────────────────────────────

  function getStartRoute() {
    // Si no hay ningún proveedor configurado → onboarding
    if (!Providers.hasAnyKey()) return 'onboarding';

    // Si hay hash en la URL → respetar
    const hash = window.location.hash.slice(1);
    if (hash && hash !== 'onboarding') return hash;

    return 'home';
  }

  // ── Init principal ───────────────────────────────────────────────────────

  return {

    async init() {
      try {
        // 1. Migración de esquema de datos
        Storage.initSchema();

        // 2. Inicializar skills por defecto
        Skills.init();

        // 3. Cargar idioma guardado
        await I18n.init();

        // 4. Aplicar traducciones al shell estático (nav, header)
        I18n.applyToDOM();

        // 5. Registrar listeners globales
        setupGlobalListeners();

        // 6. Inicializar Capacitor (back button, app state)
        await setupCapacitor();

        // 7. Registrar rutas y configs
        registerRoutes();

        // 8. Navegar a la ruta de arranque
        const startRoute = getStartRoute();
        await Router.init(startRoute);

        // 9. App lista
        State.setReady();

        console.log('[App] NEXIA iniciada — ruta:', startRoute);

      } catch (e) {
        console.error('[App] Error en init:', e.message, e.stack);
        // Mostrar error crítico en pantalla
        const container = document.getElementById('view-container');
        if (container) {
          container.innerHTML = `
            <div class="view">
              <div class="empty-state">
                <div class="empty-state-icon">&#9888;</div>
                <div class="empty-state-title">Error de arranque</div>
                <div class="empty-state-desc">${Utils.escapeHtml(e.message)}</div>
              </div>
            </div>`;
        }
      }
    }
  };
})();

window.App = App;

// ── Arranque automático cuando el DOM esté listo ──────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
