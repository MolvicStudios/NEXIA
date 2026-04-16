/**
 * NEXIA Utils — Utilidades globales
 */
const Utils = (() => {

  return {

    // ── Identificadores ──────────────────────────────────────────────────

    /**
     * Genera un UUID v4 simple (sin dependencias externas).
     */
    uuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    },

    // ── Timing ───────────────────────────────────────────────────────────

    /**
     * Debounce: retrasa la ejecución hasta que paren las llamadas.
     * Uso: const debouncedSave = Utils.debounce(save, 500)
     */
    debounce(fn, delay) {
      let timer;
      return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    /**
     * Throttle: ejecuta máximo una vez por intervalo.
     */
    throttle(fn, interval) {
      let lastTime = 0;
      return function(...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
          lastTime = now;
          fn.apply(this, args);
        }
      };
    },

    /**
     * Sleep async.
     * Uso: await Utils.sleep(1000)
     */
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    // ── Texto ────────────────────────────────────────────────────────────

    /**
     * Trunca un string a maxLen caracteres añadiendo '…'
     */
    truncate(str, maxLen = 60) {
      if (!str) return '';
      if (str.length <= maxLen) return str;
      return str.slice(0, maxLen).trimEnd() + '…';
    },

    /**
     * Cuenta palabras en un string.
     */
    wordCount(str) {
      if (!str?.trim()) return 0;
      return str.trim().split(/\s+/).length;
    },

    /**
     * Cuenta caracteres excluyendo espacios.
     */
    charCount(str) {
      return (str || '').replace(/\s/g, '').length;
    },

    /**
     * Capitaliza la primera letra.
     */
    capitalize(str) {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Escapa HTML para evitar XSS al insertar en innerHTML.
     * Usar siempre que se muestre contenido del usuario como HTML.
     */
    escapeHtml(str) {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return (str || '').replace(/[&<>"']/g, c => map[c]);
    },

    /**
     * Convierte saltos de línea en <br> para mostrar texto plano como HTML.
     * Siempre usar junto a escapeHtml.
     */
    nl2br(str) {
      return this.escapeHtml(str).replace(/\n/g, '<br>');
    },

    // ── Fechas ───────────────────────────────────────────────────────────

    /**
     * Formatea un timestamp como fecha legible según el idioma actual.
     * Ej: "12 ene 2024" (es) o "Jan 12, 2024" (en)
     */
    formatDate(timestamp, lang = 'es') {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
        day:   'numeric',
        month: 'short',
        year:  'numeric'
      });
    },

    /**
     * Formatea un timestamp como tiempo relativo.
     * Ej: "hace 3 minutos", "ayer", "hace 2 semanas"
     */
    timeAgo(timestamp, lang = 'es') {
      if (!timestamp) return '';
      const diff  = Date.now() - timestamp;
      const mins  = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days  = Math.floor(diff / 86400000);

      if (lang === 'es') {
        if (mins  < 1)   return 'ahora mismo';
        if (mins  < 60)  return `hace ${mins} min`;
        if (hours < 24)  return `hace ${hours}h`;
        if (days  === 1) return 'ayer';
        if (days  < 7)   return `hace ${days} días`;
        if (days  < 30)  return `hace ${Math.floor(days / 7)} sem`;
        return this.formatDate(timestamp, lang);
      } else {
        if (mins  < 1)   return 'just now';
        if (mins  < 60)  return `${mins}m ago`;
        if (hours < 24)  return `${hours}h ago`;
        if (days  === 1) return 'yesterday';
        if (days  < 7)   return `${days}d ago`;
        if (days  < 30)  return `${Math.floor(days / 7)}w ago`;
        return this.formatDate(timestamp, lang);
      }
    },

    // ── Portapapeles y Share ─────────────────────────────────────────────

    /**
     * Copia texto al portapapeles.
     * Usa Capacitor Clipboard si está disponible, fallback a API web.
     * Devuelve Promise<boolean>.
     */
    async copyToClipboard(text) {
      try {
        if (window.Capacitor?.isNativePlatform()) {
          const { Clipboard } = await import('@capacitor/clipboard');
          await Clipboard.write({ string: text });
          return true;
        }
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          return true;
        }
        // Fallback legacy
        const el = document.createElement('textarea');
        el.value = text;
        el.style.cssText = 'position:absolute;left:-9999px;top:-9999px';
        document.body.appendChild(el);
        el.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return ok;
      } catch (e) {
        console.error('[Utils] Error copiando al portapapeles:', e.message);
        return false;
      }
    },

    /**
     * Comparte texto usando Capacitor Share.
     * Devuelve Promise<boolean>.
     */
    async shareText(text, title = 'NEXIA') {
      try {
        if (window.Capacitor?.isNativePlatform()) {
          const { Share } = await import('@capacitor/share');
          await Share.share({ title, text, dialogTitle: title });
          return true;
        }
        if (navigator.share) {
          await navigator.share({ title, text });
          return true;
        }
        return this.copyToClipboard(text);
      } catch (e) {
        if (e.name !== 'AbortError') {
          console.error('[Utils] Error compartiendo:', e.message);
        }
        return false;
      }
    },

    // ── UI Helpers ───────────────────────────────────────────────────────

    /**
     * Muestra el snackbar global con un mensaje y acción opcional.
     * @param {string} message — texto a mostrar
     * @param {object} options — { action: 'Deshacer', onAction: fn, duration: 3000 }
     */
    showSnackbar(message, options = {}) {
      const snackbar = document.getElementById('snackbar');
      const msgEl    = document.getElementById('snackbar-message');
      const actEl    = document.getElementById('snackbar-action');

      if (!snackbar || !msgEl) return;

      msgEl.textContent = message;

      if (options.action && options.onAction) {
        actEl.textContent = options.action;
        actEl.style.display = 'flex';
        actEl.onclick = () => {
          options.onAction();
          this.hideSnackbar();
        };
      } else {
        actEl.style.display = 'none';
      }

      snackbar.classList.add('visible');

      clearTimeout(snackbar._timer);
      snackbar._timer = setTimeout(() => {
        this.hideSnackbar();
      }, options.duration || 3000);
    },

    hideSnackbar() {
      const snackbar = document.getElementById('snackbar');
      if (snackbar) snackbar.classList.remove('visible');
    },

    /**
     * Abre el bottom sheet con contenido HTML dado.
     */
    openSheet(htmlContent) {
      const overlay = document.getElementById('modal-overlay');
      const content = document.getElementById('sheet-content');
      if (!overlay || !content) return;
      content.innerHTML = htmlContent;
      overlay.classList.add('visible');

      overlay.onclick = (e) => {
        if (e.target === overlay) this.closeSheet();
      };
    },

    closeSheet() {
      const overlay = document.getElementById('modal-overlay');
      if (overlay) {
        overlay.classList.remove('visible');
        overlay.onclick = null;
        setTimeout(() => {
          const content = document.getElementById('sheet-content');
          if (content) content.innerHTML = '';
        }, 300);
      }
    },

    /**
     * Feedback háptico.
     * type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'
     */
    async haptic(type = 'light') {
      try {
        if (!window.Capacitor?.isNativePlatform()) return;
        const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
        if (type === 'success') {
          await Haptics.notification({ type: NotificationType.Success });
        } else if (type === 'warning') {
          await Haptics.notification({ type: NotificationType.Warning });
        } else if (type === 'error') {
          await Haptics.notification({ type: NotificationType.Error });
        } else {
          const styleMap = {
            light:  ImpactStyle.Light,
            medium: ImpactStyle.Medium,
            heavy:  ImpactStyle.Heavy
          };
          await Haptics.impact({ style: styleMap[type] || ImpactStyle.Light });
        }
      } catch (e) {
        // Haptics no disponible en web — silencioso
      }
    },

    // ── Validaciones ─────────────────────────────────────────────────────

    /**
     * Valida que un string no está vacío.
     */
    isNonEmpty(str) {
      return typeof str === 'string' && str.trim().length > 0;
    },

    /**
     * Clamp: limita un número entre min y max.
     */
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  };
})();

window.Utils = Utils;
