/**
 * NEXIA AIClient — Cliente unificado para llamadas al Worker de IA
 *
 * Envía mensajes en formato OpenAI al Worker, que adapta el formato
 * al proveedor activo.
 *
 * Uso:
 *   const res = await AIClient.complete(messages, { maxTokens: 1024, temperature: 0.7 });
 *   if (res.ok) { console.log(res.text); }
 *   else        { Utils.showSnackbar(res.message); }
 */
const AIClient = (() => {
  'use strict';

  const WORKER_URL = 'https://nexia-api.josemmolera.workers.dev';

  /**
   * Envía una conversación al Worker y devuelve el texto generado.
   *
   * @param {Array<{role:string, content:string}>} messages  - Conversación OpenAI
   * @param {object} [opts]
   * @param {number} [opts.maxTokens=1024]
   * @param {number} [opts.temperature=0.7]
   * @returns {Promise<{ok:boolean, text:string, message?:string}>}
   */
  async function complete(messages, opts = {}) {
    const { maxTokens = 1024, temperature = 0.7 } = opts;

    // Obtener proveedor y clave activos
    const active = Providers.getActive();
    if (!active || !active.provider || !active.model) {
      return { ok: false, text: '', message: I18n.t('errors.noApiKey') };
    }

    const apiKey = Providers.getKey(active.provider);
    if (!apiKey) {
      return { ok: false, text: '', message: I18n.t('errors.noApiKey') };
    }

    try {
      const res = await fetch(`${WORKER_URL}/api/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key':    apiKey,
          'X-Provider':   active.provider
        },
        body: JSON.stringify({
          model:       active.model,
          messages,
          max_tokens:  maxTokens,
          temperature
        })
      });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          return { ok: false, text: '', message: I18n.t('errors.keyInvalid') };
        }
        if (res.status === 429) {
          return { ok: false, text: '', message: I18n.t('errors.rateLimited') };
        }
        const errBody = await res.text().catch(() => '');
        return { ok: false, text: '', message: errBody || I18n.t('errors.networkError') };
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      return { ok: true, text };

    } catch (err) {
      if (err && err.name === 'TypeError') {
        return { ok: false, text: '', message: I18n.t('errors.networkError') };
      }
      return { ok: false, text: '', message: I18n.t('errors.timeout') };
    }
  }

  return { complete };
})();

window.AIClient = AIClient;
