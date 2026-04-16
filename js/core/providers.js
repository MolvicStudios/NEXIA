/**
 * NEXIA Providers — Gestión de 10 proveedores de IA
 *
 * El frontend SIEMPRE envía formato OpenAI estándar al Worker.
 * El Worker adapta el formato según provider.apiFormat.
 *
 * Storage keys:
 *   nexia_providers_config → { activeProvider, activeModel, keys: { groq: '...', openai: '...' } }
 */
const Providers = (() => {

  // ── Catálogo de proveedores ──────────────────────────────────────────────
  const CATALOG = {
    groq: {
      id:          'groq',
      name:        'Groq',
      description: 'Ultrarrápido · Tier gratuito generoso',
      free:        true,
      apiFormat:   'openai',
      keyPrefix:   'gsk_',
      keyMinLen:   50,
      setupUrl:    'https://console.groq.com/keys',
      setupSteps: {
        es: ['Ve a console.groq.com', 'Crea una cuenta gratuita', 'En "API Keys" pulsa "Create API Key"', 'Copia la clave y pégala aquí'],
        en: ['Go to console.groq.com', 'Create a free account', 'In "API Keys" click "Create API Key"', 'Copy the key and paste it here']
      },
      models: [
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B',        recommended: true  },
        { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B (rápido)', recommended: false },
        { id: 'gemma2-9b-it',            label: 'Gemma 2 9B',            recommended: false }
      ]
    },

    gemini: {
      id:          'gemini',
      name:        'Google Gemini',
      description: '1M tokens/día gratis · Muy capaz',
      free:        true,
      apiFormat:   'openai',
      keyPrefix:   'AIza',
      keyMinLen:   35,
      setupUrl:    'https://aistudio.google.com/app/apikey',
      setupSteps: {
        es: ['Ve a aistudio.google.com', 'Inicia sesión con tu cuenta Google', 'Pulsa "Get API key" → "Create API key"', 'Copia la clave y pégala aquí'],
        en: ['Go to aistudio.google.com', 'Sign in with your Google account', 'Click "Get API key" → "Create API key"', 'Copy the key and paste it here']
      },
      models: [
        { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash', recommended: true  },
        { id: 'gemini-1.5-flash',     label: 'Gemini 1.5 Flash', recommended: false },
        { id: 'gemini-1.5-pro',       label: 'Gemini 1.5 Pro',   recommended: false }
      ]
    },

    openrouter: {
      id:          'openrouter',
      name:        'OpenRouter',
      description: 'Modelos gratuitos de Llama, Mistral y más',
      free:        true,
      apiFormat:   'openai',
      keyPrefix:   'sk-or-',
      keyMinLen:   40,
      setupUrl:    'https://openrouter.ai/keys',
      setupSteps: {
        es: ['Ve a openrouter.ai', 'Crea una cuenta gratuita', 'En "Keys" crea una nueva clave', 'Copia la clave y pégala aquí'],
        en: ['Go to openrouter.ai', 'Create a free account', 'In "Keys" create a new key', 'Copy the key and paste it here']
      },
      models: [
        { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (gratis)', recommended: true  },
        { id: 'google/gemma-2-9b-it:free',             label: 'Gemma 2 9B (gratis)',   recommended: false },
        { id: 'mistralai/mistral-7b-instruct:free',    label: 'Mistral 7B (gratis)',   recommended: false }
      ]
    },

    openai: {
      id:          'openai',
      name:        'OpenAI',
      description: 'GPT-4o · El más conocido del mercado',
      free:        false,
      apiFormat:   'openai',
      keyPrefix:   'sk-',
      keyMinLen:   40,
      setupUrl:    'https://platform.openai.com/api-keys',
      setupSteps: {
        es: ['Ve a platform.openai.com', 'Crea una cuenta y añade créditos', 'En "API keys" crea una nueva clave', 'Copia la clave y pégala aquí'],
        en: ['Go to platform.openai.com', 'Create an account and add credits', 'In "API keys" create a new key', 'Copy the key and paste it here']
      },
      models: [
        { id: 'gpt-4o',        label: 'GPT-4o',        recommended: false },
        { id: 'gpt-4o-mini',   label: 'GPT-4o Mini',   recommended: true  },
        { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', recommended: false }
      ]
    },

    anthropic: {
      id:          'anthropic',
      name:        'Anthropic Claude',
      description: 'Claude 3.5 · Excelente en escritura y análisis',
      free:        false,
      apiFormat:   'anthropic',
      keyPrefix:   'sk-ant-',
      keyMinLen:   80,
      setupUrl:    'https://console.anthropic.com/settings/keys',
      setupSteps: {
        es: ['Ve a console.anthropic.com', 'Crea una cuenta y añade créditos', 'En "API Keys" crea una nueva clave', 'Copia la clave y pégala aquí'],
        en: ['Go to console.anthropic.com', 'Create an account and add credits', 'In "API Keys" create a new key', 'Copy the key and paste it here']
      },
      models: [
        { id: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', recommended: true  },
        { id: 'claude-3-5-haiku-20241022',  label: 'Claude 3.5 Haiku',  recommended: false }
      ]
    },

    mistral: {
      id:          'mistral',
      name:        'Mistral AI',
      description: 'Modelos europeos · RGPD nativo',
      free:        false,
      apiFormat:   'openai',
      keyPrefix:   '',
      keyMinLen:   30,
      setupUrl:    'https://console.mistral.ai/api-keys',
      setupSteps: {
        es: ['Ve a console.mistral.ai', 'Crea una cuenta', 'En "API Keys" crea una nueva clave', 'Copia la clave y pégala aquí'],
        en: ['Go to console.mistral.ai', 'Create an account', 'In "API Keys" create a new key', 'Copy the key and paste it here']
      },
      models: [
        { id: 'mistral-large-latest', label: 'Mistral Large', recommended: false },
        { id: 'mistral-small-latest', label: 'Mistral Small', recommended: true  }
      ]
    },

    deepseek: {
      id:          'deepseek',
      name:        'DeepSeek',
      description: 'Muy económico · Rendimiento de GPT-4',
      free:        false,
      apiFormat:   'openai',
      keyPrefix:   'sk-',
      keyMinLen:   30,
      setupUrl:    'https://platform.deepseek.com/api_keys',
      setupSteps: {
        es: ['Ve a platform.deepseek.com', 'Crea una cuenta y añade créditos', 'En "API Keys" crea una nueva clave', 'Copia la clave y pégala aquí'],
        en: ['Go to platform.deepseek.com', 'Create an account and add credits', 'In "API Keys" create a new key', 'Copy the key and paste it here']
      },
      models: [
        { id: 'deepseek-chat',     label: 'DeepSeek Chat',     recommended: true  },
        { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', recommended: false }
      ]
    },

    xai: {
      id:          'xai',
      name:        'xAI Grok',
      description: 'Grok-2 · API compatible con OpenAI',
      free:        false,
      apiFormat:   'openai',
      keyPrefix:   'xai-',
      keyMinLen:   60,
      setupUrl:    'https://console.x.ai',
      setupSteps: {
        es: ['Ve a console.x.ai', 'Crea una cuenta', 'Genera una API key', 'Copia la clave y pégala aquí'],
        en: ['Go to console.x.ai', 'Create an account', 'Generate an API key', 'Copy the key and paste it here']
      },
      models: [
        { id: 'grok-2',    label: 'Grok-2',   recommended: true  },
        { id: 'grok-beta', label: 'Grok Beta', recommended: false }
      ]
    },

    cohere: {
      id:          'cohere',
      name:        'Cohere',
      description: 'Trial gratuito generoso · Fuerte en análisis',
      free:        false,
      apiFormat:   'cohere',
      keyPrefix:   '',
      keyMinLen:   30,
      setupUrl:    'https://dashboard.cohere.com/api-keys',
      setupSteps: {
        es: ['Ve a dashboard.cohere.com', 'Crea una cuenta (trial gratis)', 'Copia la trial API key', 'Pégala aquí'],
        en: ['Go to dashboard.cohere.com', 'Create an account (free trial)', 'Copy the trial API key', 'Paste it here']
      },
      models: [
        { id: 'command-r-plus', label: 'Command R+', recommended: true  },
        { id: 'command-r',      label: 'Command R',  recommended: false }
      ]
    },

    together: {
      id:          'together',
      name:        'Together AI',
      description: 'Open source a bajo coste · Llama, Mixtral',
      free:        false,
      apiFormat:   'openai',
      keyPrefix:   '',
      keyMinLen:   30,
      setupUrl:    'https://api.together.ai/settings/api-keys',
      setupSteps: {
        es: ['Ve a api.together.ai', 'Crea una cuenta', 'Copia tu API key', 'Pégala aquí'],
        en: ['Go to api.together.ai', 'Create an account', 'Copy your API key', 'Paste it here']
      },
      models: [
        { id: 'meta-llama/Llama-3-70b-chat-hf', label: 'Llama 3 70B',  recommended: true  },
        { id: 'mistralai/Mixtral-8x7B-v0.1',    label: 'Mixtral 8x7B', recommended: false }
      ]
    }
  };

  // ── Storage key ────────────────────────────────────────────────────────
  const STORAGE_KEY = 'providers_config';

  // ── Config por defecto ─────────────────────────────────────────────────
  const DEFAULT_CONFIG = {
    activeProvider: 'groq',
    activeModel:    'llama-3.3-70b-versatile',
    aiResponseLang: 'es',  // idioma en que responde la IA (independiente de la UI)
    keys:           {}     // { groq: 'gsk_...', openai: 'sk-...' }
  };

  // ── Helpers internos ───────────────────────────────────────────────────

  function loadConfig() {
    return Storage.get(STORAGE_KEY, { ...DEFAULT_CONFIG });
  }

  function saveConfig(config) {
    return Storage.set(STORAGE_KEY, config);
  }

  // ── API pública ────────────────────────────────────────────────────────
  return {

    /** Devuelve el catálogo completo */
    getCatalog() {
      return CATALOG;
    },

    /** Devuelve un proveedor por id */
    getProvider(id) {
      return CATALOG[id] || null;
    },

    /** Devuelve solo los proveedores gratuitos */
    getFreeProviders() {
      return Object.values(CATALOG).filter(p => p.free);
    },

    /** Devuelve la config activa */
    getConfig() {
      return loadConfig();
    },

    /** Devuelve el proveedor activo */
    getActive() {
      const config = loadConfig();
      return {
        provider: CATALOG[config.activeProvider] || CATALOG.groq,
        model:    config.activeModel || 'llama-3.3-70b-versatile'
      };
    },

    /** Cambia el proveedor y modelo activo */
    setActive(providerId, modelId) {
      const provider = CATALOG[providerId];
      if (!provider) {
        console.error('[Providers] Proveedor desconocido:', providerId);
        return false;
      }
      const model = provider.models.find(m => m.id === modelId);
      if (!model) {
        console.error('[Providers] Modelo desconocido:', modelId);
        return false;
      }
      const config = loadConfig();
      config.activeProvider = providerId;
      config.activeModel    = modelId;
      saveConfig(config);
      document.dispatchEvent(new CustomEvent('providers:changed', {
        detail: { providerId, modelId }
      }));
      return true;
    },

    /**
     * Valida y guarda una API key para un proveedor.
     * No loguea la key nunca.
     */
    saveKey(providerId, apiKey) {
      const provider = CATALOG[providerId];
      if (!provider) return { ok: false, error: 'UNKNOWN_PROVIDER' };

      const key = (apiKey || '').trim();

      // Validación de longitud mínima
      if (key.length < provider.keyMinLen) {
        return { ok: false, error: 'KEY_TOO_SHORT' };
      }

      // Validación de prefijo (solo si el proveedor tiene prefijo definido)
      if (provider.keyPrefix && !key.startsWith(provider.keyPrefix)) {
        return { ok: false, error: 'KEY_WRONG_PREFIX' };
      }

      const config = loadConfig();
      if (!config.keys) config.keys = {};
      config.keys[providerId] = key;

      // Si no hay proveedor activo con key, activar este
      if (!config.keys[config.activeProvider]) {
        config.activeProvider = providerId;
        config.activeModel    = provider.models.find(m => m.recommended)?.id
                                || provider.models[0].id;
      }

      saveConfig(config);
      document.dispatchEvent(new CustomEvent('providers:key-saved', {
        detail: { providerId }
      }));
      return { ok: true };
    },

    /** Elimina la API key de un proveedor */
    removeKey(providerId) {
      const config = loadConfig();
      if (config.keys) delete config.keys[providerId];

      // Si era el activo, cambiar al primer proveedor con key
      if (config.activeProvider === providerId) {
        const next = Object.keys(config.keys || {})
          .find(id => config.keys[id]);
        config.activeProvider = next || 'groq';
        config.activeModel    = CATALOG[config.activeProvider]
          ?.models.find(m => m.recommended)?.id
          || CATALOG.groq.models[0].id;
      }

      saveConfig(config);
      document.dispatchEvent(new CustomEvent('providers:key-removed', {
        detail: { providerId }
      }));
    },

    /** Devuelve la key de un proveedor (para enviar al Worker) */
    getKey(providerId) {
      const config = loadConfig();
      return (config.keys || {})[providerId] || null;
    },

    /** Devuelve la key del proveedor activo */
    getActiveKey() {
      const config = loadConfig();
      return this.getKey(config.activeProvider);
    },

    /** Devuelve true si hay al menos una key configurada */
    hasAnyKey() {
      const config = loadConfig();
      return Object.values(config.keys || {}).some(k => !!k);
    },

    /** Devuelve true si el proveedor indicado tiene key */
    hasKey(providerId) {
      return !!this.getKey(providerId);
    },

    /**
     * Devuelve la key enmascarada para mostrar en UI.
     * Ej: "gsk_****AbCd"
     */
    maskKey(providerId) {
      const key = this.getKey(providerId);
      if (!key) return null;
      const provider = CATALOG[providerId];
      const prefix = provider?.keyPrefix || '';
      const suffix = key.slice(-4);
      return `${prefix}****${suffix}`;
    },

    /** Idioma de respuesta de la IA */
    getAILang() {
      return loadConfig().aiResponseLang || 'es';
    },

    setAILang(lang) {
      if (!['es', 'en', 'auto'].includes(lang)) return;
      const config = loadConfig();
      config.aiResponseLang = lang;
      saveConfig(config);
    },

    /**
     * Devuelve el system prompt de idioma para anteponer a todos los prompts.
     * Se inyecta en ai-client.js (MP4).
     */
    getLangInstruction() {
      const lang = this.getAILang();
      if (lang === 'auto') return 'Respond in the same language the user writes in.';
      const names = { es: 'Spanish', en: 'English' };
      return `Always respond in ${names[lang] || 'Spanish'}. Do not switch language under any circumstances.`;
    },

    /**
     * Devuelve los modelos del proveedor activo
     */
    getActiveModels() {
      const { provider } = this.getActive();
      return provider.models;
    },

    /**
     * Mapeo de errores de key para mostrar en UI
     */
    keyErrorMessage(code, lang = 'es') {
      const messages = {
        es: {
          KEY_TOO_SHORT:    'La clave es demasiado corta',
          KEY_WRONG_PREFIX: 'La clave no tiene el formato correcto',
          UNKNOWN_PROVIDER: 'Proveedor desconocido'
        },
        en: {
          KEY_TOO_SHORT:    'Key is too short',
          KEY_WRONG_PREFIX: 'Key format is incorrect',
          UNKNOWN_PROVIDER: 'Unknown provider'
        }
      };
      return (messages[lang] || messages.es)[code] || code;
    }
  };
})();

window.Providers = Providers;
