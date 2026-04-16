/**
 * NEXIA State — Estado global reactivo de la app
 *
 * Estado centralizado para datos que necesitan varios módulos.
 * Patrón pub/sub con eventos del DOM para notificar cambios.
 *
 * Estado inicial:
 *   isReady:       false → true cuando app.js termina el init
 *   isOnline:      true/false según navigator.onLine
 *   currentRoute:  'home'
 *   routeHistory:  []
 *   isGenerating:  false — true mientras hay llamada IA en curso
 *   activeToolId:  null — id del tool abierto actualmente
 */
const State = (() => {

  let _state = {
    isReady:      false,
    isOnline:     navigator.onLine,
    currentRoute: 'home',
    routeHistory: [],
    isGenerating: false,
    activeToolId: null
  };

  // Listeners por clave
  const _listeners = {};

  // ── API pública ──────────────────────────────────────────────────────────
  return {

    /**
     * Lee un valor del estado.
     * State.get('isOnline') → true/false
     */
    get(key) {
      return _state[key];
    },

    /**
     * Escribe un valor y notifica a los listeners de esa clave.
     * State.set('isGenerating', true)
     */
    set(key, value) {
      const prev = _state[key];
      _state[key] = value;

      // Solo disparar si el valor cambió
      if (prev !== value) {
        // Evento específico de la clave
        document.dispatchEvent(new CustomEvent(`state:${key}`, {
          detail: { value, prev }
        }));
        // Evento genérico
        document.dispatchEvent(new CustomEvent('state:changed', {
          detail: { key, value, prev }
        }));
      }
    },

    /**
     * Suscribirse a cambios de una clave específica.
     * Devuelve función para desuscribirse.
     *
     * const unsub = State.on('isGenerating', (val) => updateUI(val));
     * unsub(); // cuando ya no se necesita
     */
    on(key, callback) {
      const handler = (e) => callback(e.detail.value, e.detail.prev);
      document.addEventListener(`state:${key}`, handler);
      if (!_listeners[key]) _listeners[key] = [];
      _listeners[key].push({ callback, handler });
      return () => {
        document.removeEventListener(`state:${key}`, handler);
        _listeners[key] = (_listeners[key] || []).filter(l => l.callback !== callback);
      };
    },

    /**
     * Devuelve una copia completa del estado (para debug).
     */
    snapshot() {
      return { ..._state };
    },

    // ── Helpers de estado específicos ─────────────────────────────────────

    /**
     * Marca la app como lista para interacción.
     */
    setReady() {
      this.set('isReady', true);
    },

    /**
     * Actualiza el estado online/offline.
     * Llamar desde app.js con los listeners de red.
     */
    setOnline(value) {
      this.set('isOnline', value);
    },

    /**
     * Actualiza la ruta actual y el historial.
     * Llamar desde Router.navigate.
     */
    setRoute(route) {
      const history = [...(_state.routeHistory || [])];
      // Evitar duplicados consecutivos
      if (history[history.length - 1] !== route) {
        history.push(route);
        // Limitar historial a 20 entradas
        if (history.length > 20) history.shift();
      }
      _state.routeHistory = history;
      this.set('currentRoute', route);
    },

    /**
     * Elimina la última entrada del historial (para back navigation).
     * Devuelve la ruta anterior o null si no hay historial.
     */
    popRoute() {
      const history = [...(_state.routeHistory || [])];
      history.pop(); // quitar la actual
      const prev = history[history.length - 1] || null;
      _state.routeHistory = history;
      return prev;
    },

    /**
     * Inicia/para el estado de generación IA.
     */
    setGenerating(value) {
      this.set('isGenerating', value);
    },

    /**
     * Establece el tool activo actual.
     */
    setActiveTool(toolId) {
      this.set('activeToolId', toolId);
    }
  };
})();

window.State = State;
