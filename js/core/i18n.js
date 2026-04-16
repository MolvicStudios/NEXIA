/**
 * NEXIA I18n — Sistema de traducción ES/EN
 *
 * Dos idiomas independientes:
 *   1. Idioma UI (nexia_config_lang):    etiquetas, botones, mensajes
 *   2. Idioma IA (nexia_config_ai_lang): idioma en que responde la IA
 *
 * Uso:
 *   I18n.t('nav.home')              → 'Inicio' (es) | 'Home' (en)
 *   I18n.t('greeting', {name:'Ana'})→ 'Hola, Ana'
 *   I18n.applyToDOM()               → traduce todos los [data-i18n]
 */
const I18n = (() => {

  const SUPPORTED    = ['es', 'en'];
  const DEFAULT_LANG = 'es';
  const STORAGE_KEY  = 'config_lang';

  let _lang    = DEFAULT_LANG;
  let _strings = {};

  // ── Helpers internos ────────────────────────────────────────────────────

  async function loadStrings(lang) {
    try {
      const res = await fetch(`i18n/${lang}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('[I18n] Error cargando', lang, e.message);
      return null;
    }
  }

  // ── API pública ──────────────────────────────────────────────────────────
  return {

    /**
     * Inicializa el sistema. Carga el idioma guardado.
     * Llamar en app.js antes de renderizar cualquier vista.
     */
    async init() {
      const saved   = Storage.get(STORAGE_KEY, DEFAULT_LANG);
      const lang    = SUPPORTED.includes(saved) ? saved : DEFAULT_LANG;
      const strings = await loadStrings(lang);
      if (strings) {
        _strings = strings;
        _lang    = lang;
        document.documentElement.lang = lang;
      } else {
        // Fallback: intentar con es
        const fallback = await loadStrings(DEFAULT_LANG);
        if (fallback) {
          _strings = fallback;
          _lang    = DEFAULT_LANG;
        }
      }
    },

    /**
     * Cambia el idioma de la UI.
     * Recarga los strings y re-aplica al DOM.
     */
    async setLang(lang) {
      if (!SUPPORTED.includes(lang)) return false;
      const strings = await loadStrings(lang);
      if (!strings) return false;
      _strings = strings;
      _lang    = lang;
      Storage.set(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
      this.applyToDOM();
      document.dispatchEvent(new CustomEvent('i18n:changed', { detail: { lang } }));
      return true;
    },

    /** Devuelve el idioma actual de la UI */
    getLang() {
      return _lang;
    },

    /** Devuelve los idiomas soportados */
    getSupported() {
      return SUPPORTED;
    },

    /**
     * Traduce una clave con interpolación de variables.
     *
     * I18n.t('nav.home')                 → 'Inicio'
     * I18n.t('greeting', { name: 'Ana' }) → 'Hola, Ana' (si el string es 'Hola, {{name}}')
     * Si la clave no existe, devuelve la propia clave como fallback.
     */
    t(key, vars = {}) {
      // Recorrer el objeto anidado con dot notation: 'nav.home' → _strings.nav.home
      const parts = key.split('.');
      let value = parts.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : null), _strings);

      if (value === null || value === undefined) {
        // Fallback: devolver la clave para detectar traducciones faltantes
        console.warn('[I18n] Clave no encontrada:', key);
        return key;
      }

      // Interpolación de variables: '{{name}}' → vars.name
      if (Object.keys(vars).length > 0) {
        value = value.replace(/\{\{(\w+)\}\}/g, (_, k) =>
          vars[k] !== undefined ? vars[k] : `{{${k}}}`
        );
      }

      return value;
    },

    /**
     * Aplica las traducciones a todos los elementos [data-i18n] del DOM.
     * Busca solo dentro de #app para limitar el scope.
     *
     * Uso en HTML:
     *   <span data-i18n="nav.home">Inicio</span>
     *   <input data-i18n-placeholder="common.search">
     *   <button data-i18n-aria="common.close" aria-label="Cerrar">
     */
    applyToDOM(root = document.getElementById('app') || document.body) {
      // Texto interno
      root.querySelectorAll('[data-i18n]').forEach(el => {
        const key        = el.getAttribute('data-i18n');
        const translated = this.t(key);
        if (translated !== key) el.textContent = translated;
      });

      // Placeholders de inputs
      root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key        = el.getAttribute('data-i18n-placeholder');
        const translated = this.t(key);
        if (translated !== key) el.placeholder = translated;
      });

      // Aria-labels
      root.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const key        = el.getAttribute('data-i18n-aria');
        const translated = this.t(key);
        if (translated !== key) el.setAttribute('aria-label', translated);
      });
    },

    /**
     * Aplica traducciones solo a un fragmento DOM recién cargado.
     * Llamar desde el router después de inyectar una vista.
     */
    applyToView(viewEl) {
      if (viewEl) this.applyToDOM(viewEl);
    }
  };
})();

window.I18n = I18n;
