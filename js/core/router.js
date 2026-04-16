/**
 * NEXIA Router — Hash SPA Router
 *
 * Navegación basada en window.location.hash
 * Las vistas se cargan con fetch() desde views/
 *
 * Rutas registradas en app.js:
 *   home, settings, onboarding
 *   chat, editor, email, translator, code       (MP7-9)
 *   generator, repurpose, summarizer, brief,
 *   naming                                       (MP10-13)
 *   prompts, prospectly, proposals,
 *   contracts, cv                                (MP14-18)
 */
const Router = (() => {

  // Mapa de ruta → función handler (registrados con Router.on)
  const _routes = {};

  // Config de cada ruta (título, subtítulo, showBack)
  const _config = {};

  // Ruta por defecto si el hash está vacío
  const DEFAULT_ROUTE = 'home';

  // ── Helpers internos ────────────────────────────────────────────────────

  /**
   * Carga el HTML de una vista desde views/
   * Devuelve el string HTML o null si falla.
   */
  async function loadView(route) {
    // Rutas raíz
    const rootRoutes = ['home', 'settings', 'onboarding'];
    const path = rootRoutes.includes(route)
      ? `views/${route}.html`
      : `views/tools/${route}.html`;

    try {
      const res = await fetch(path);
      if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`);
      return await res.text();
    } catch (e) {
      console.error('[Router] Vista no encontrada:', path, e.message);
      return null;
    }
  }

  /**
   * Actualiza el header de la app según la ruta.
   */
  function updateHeader(route) {
    const config     = _config[route] || {};
    const titleEl    = document.getElementById('header-title');
    const subtitleEl = document.getElementById('header-subtitle');
    const backBtn    = document.getElementById('btn-back');

    if (titleEl)    titleEl.textContent    = config.title    || 'NEXIA';
    if (subtitleEl) subtitleEl.textContent = config.subtitle || '';

    // Mostrar back button si no estamos en una ruta raíz del nav
    const navRoutes = ['home', 'chat', 'generator', 'prospectly', 'settings'];
    const showBack  = config.showBack !== undefined
      ? config.showBack
      : !navRoutes.includes(route);

    if (backBtn) {
      backBtn.classList.toggle('visible', showBack);
    }
  }

  /**
   * Actualiza el tab activo en el bottom nav.
   */
  function updateNav(route) {
    // Mapa de ruta a tab del nav
    const tabMap = {
      home:       'home',
      // Tab Escribir
      chat:       'chat',
      editor:     'chat',
      email:      'chat',
      translator: 'chat',
      code:       'chat',
      // Tab Crear
      generator:  'generator',
      repurpose:  'generator',
      summarizer: 'generator',
      brief:      'generator',
      naming:     'generator',
      // Tab Pro
      prospectly: 'prospectly',
      proposals:  'prospectly',
      contracts:  'prospectly',
      cv:         'prospectly',
      prompts:    'prospectly',
      // Tab Más
      settings:   'settings',
      onboarding: 'settings'
    };

    const activeTab = tabMap[route] || route;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === activeTab);
    });
  }

  // ── API pública ──────────────────────────────────────────────────────────
  return {

    /**
     * Registra el handler de una ruta.
     * El handler recibe el elemento del view-container como argumento.
     *
     * Router.on('chat', (viewEl) => ChatTool.init(viewEl))
     */
    on(route, handler) {
      _routes[route] = handler;
    },

    /**
     * Configura los metadatos de una ruta.
     * Router.config('chat', { title: 'Chat IA', subtitle: '', showBack: false })
     */
    config(route, options) {
      _config[route] = options;
    },

    /**
     * Navega a una ruta.
     * params: objeto opcional pasado al handler.
     */
    async navigate(route, params = {}) {
      // Cerrar bottom sheet si está abierto
      Utils.closeSheet();

      // Actualizar hash
      window.location.hash = route;

      // Actualizar estado
      State.setRoute(route);
      State.setActiveTool(route);

      // Cargar HTML de la vista
      const container = document.getElementById('view-container');
      if (!container) return;

      // Skeleton mientras carga
      container.innerHTML = `
        <div class="view">
          <div class="skeleton skeleton-text skeleton-text-mid"></div>
          <div class="skeleton skeleton-text skeleton-text-full" style="margin-top:8px"></div>
          <div class="skeleton skeleton-text skeleton-text-short" style="margin-top:8px"></div>
        </div>`;

      const html = await loadView(route);

      if (!html) {
        // Vista no encontrada — mostrar error
        container.innerHTML = `
          <div class="view">
            <div class="empty-state">
              <div class="empty-state-icon">&#9888;</div>
              <div class="empty-state-title">${I18n.t('errors.viewNotFound') || 'Vista no encontrada'}</div>
              <div class="empty-state-desc">${Utils.escapeHtml(route)}</div>
            </div>
          </div>`;
        return;
      }

      // Inyectar HTML
      container.innerHTML = html;

      // Hacer scroll al top
      container.scrollTop = 0;

      // Aplicar traducciones a la vista recién cargada
      I18n.applyToView(container);

      // Actualizar UI de navegación
      updateHeader(route);
      updateNav(route);

      // Ejecutar handler del tool si está registrado
      if (_routes[route]) {
        try {
          await _routes[route](container, params);
        } catch (e) {
          console.error('[Router] Error en handler de', route, e.message, e.stack);
        }
      }
    },

    /**
     * Navega hacia atrás.
     * Usa el historial del State.
     */
    async back() {
      const prev = State.popRoute();
      if (prev && prev !== State.get('currentRoute')) {
        await this.navigate(prev);
      } else {
        // Sin historial — ir a home
        await this.navigate(DEFAULT_ROUTE);
      }
    },

    /**
     * Inicializa el router.
     * Lee el hash actual y navega, o va a la ruta por defecto.
     * Registra listener de hashchange.
     * Llamar desde app.js.
     */
    async init(defaultRoute = DEFAULT_ROUTE) {
      // Escuchar cambios de hash (navegación con botones del navegador web)
      window.addEventListener('hashchange', async () => {
        const route = window.location.hash.slice(1) || defaultRoute;
        // Solo re-renderizar si es una ruta distinta a la actual
        // (evitar re-render cuando navigate() ya setea el hash)
        if (route !== State.get('currentRoute')) {
          await this.navigate(route);
        }
      });

      // Navegar a la ruta inicial
      const initialRoute = window.location.hash.slice(1) || defaultRoute;
      await this.navigate(initialRoute);
    },

    /**
     * Devuelve la ruta actual.
     */
    current() {
      return State.get('currentRoute');
    }
  };
})();

window.Router = Router;
