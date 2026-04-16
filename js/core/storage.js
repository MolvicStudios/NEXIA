/**
 * NEXIA Storage — Abstracción localStorage con namespace
 * Prefijo "nexia_" en todas las claves para evitar colisiones
 */
const Storage = (() => {
  const NS = 'nexia_';
  const QUOTA_WARN_KB = 3072; // Avisar al usuario a partir de 3MB

  return {

    /**
     * Lee un valor. Devuelve fallback si no existe o hay error de parseo.
     */
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(NS + key);
        if (raw === null) return fallback;
        return JSON.parse(raw);
      } catch (e) {
        console.warn('[Storage] Error leyendo', key, e.message);
        return fallback;
      }
    },

    /**
     * Escribe un valor. Devuelve true si OK, false si falla.
     * Dispara evento 'storage:quota' si QuotaExceededError.
     */
    set(key, value) {
      try {
        localStorage.setItem(NS + key, JSON.stringify(value));
        return true;
      } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
          document.dispatchEvent(new CustomEvent('storage:quota', {
            detail: { key, usageKB: this.usage() }
          }));
        }
        console.error('[Storage] Error escribiendo', key, e.message);
        return false;
      }
    },

    /**
     * Elimina una clave.
     */
    delete(key) {
      localStorage.removeItem(NS + key);
    },

    /**
     * Comprueba si una clave existe.
     */
    has(key) {
      return localStorage.getItem(NS + key) !== null;
    },

    /**
     * Devuelve todas las claves del namespace (sin el prefijo).
     */
    keys() {
      return Object.keys(localStorage)
        .filter(k => k.startsWith(NS))
        .map(k => k.slice(NS.length));
    },

    /**
     * Elimina TODAS las claves del namespace nexia_.
     * Usar solo en "Borrar todos los datos" en Ajustes.
     */
    clearAll() {
      this.keys().forEach(key => this.delete(key));
      document.dispatchEvent(new CustomEvent('storage:cleared'));
    },

    /**
     * Calcula el uso estimado en KB de las claves nexia_.
     */
    usage() {
      let bytes = 0;
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith(NS)) {
          bytes += (key.length + (localStorage.getItem(key) || '').length) * 2;
        }
      }
      return Math.round(bytes / 1024);
    },

    /**
     * Devuelve true si el uso supera el umbral de aviso.
     */
    isNearQuota() {
      return this.usage() >= QUOTA_WARN_KB;
    },

    /**
     * Versión del esquema — para migraciones futuras.
     */
    SCHEMA_VERSION: 1,

    /**
     * Ejecutar al arranque de la app.
     * Compara versión almacenada con SCHEMA_VERSION y migra si es necesario.
     */
    initSchema() {
      const stored = this.get('schema_version', 0);
      if (stored < this.SCHEMA_VERSION) {
        this._runMigrations(stored, this.SCHEMA_VERSION);
        this.set('schema_version', this.SCHEMA_VERSION);
      }
    },

    /**
     * Migraciones de esquema.
     * Añadir casos aquí cuando se incrementa SCHEMA_VERSION.
     */
    _runMigrations(from, to) {
      console.warn(`[Storage] Migrando esquema de v${from} a v${to}`);
      // v0 → v1: primer arranque, nada que migrar
      // v1 → v2: añadir aquí cuando llegue
    }
  };
})();

window.Storage = Storage;
