/**
 * NEXIA API Worker — Proxy multi-proveedor
 *
 * Recibe requests del frontend en formato OpenAI estándar.
 * Adapta y reenvía al proveedor indicado en X-Provider header.
 * Soporta: groq, gemini, openrouter, openai, anthropic,
 *           mistral, deepseek, xai, cohere, together
 */

// ── Configuración de proveedores ────────────────────────────────────────────

const PROVIDERS = {
  groq: {
    baseUrl:      'https://api.groq.com/openai/v1/chat/completions',
    format:       'openai',
    keyPrefix:    'gsk_',
    keyMinLen:    50,
    defaultModel: 'llama-3.3-70b-versatile'
  },
  gemini: {
    // Google expone endpoint compatible con OpenAI
    baseUrl:      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    format:       'openai',
    keyPrefix:    'AIza',
    keyMinLen:    35,
    defaultModel: 'gemini-2.0-flash-exp'
  },
  openrouter: {
    baseUrl:      'https://openrouter.ai/api/v1/chat/completions',
    format:       'openai',
    keyPrefix:    'sk-or-',
    keyMinLen:    40,
    defaultModel: 'meta-llama/llama-3.2-3b-instruct:free'
  },
  openai: {
    baseUrl:      'https://api.openai.com/v1/chat/completions',
    format:       'openai',
    keyPrefix:    'sk-',
    keyMinLen:    40,
    defaultModel: 'gpt-4o-mini'
  },
  anthropic: {
    baseUrl:      'https://api.anthropic.com/v1/messages',
    format:       'anthropic',
    keyPrefix:    'sk-ant-',
    keyMinLen:    80,
    defaultModel: 'claude-3-5-haiku-20241022',
    apiVersion:   '2023-06-01'
  },
  mistral: {
    baseUrl:      'https://api.mistral.ai/v1/chat/completions',
    format:       'openai',
    keyPrefix:    '',
    keyMinLen:    30,
    defaultModel: 'mistral-small-latest'
  },
  deepseek: {
    baseUrl:      'https://api.deepseek.com/v1/chat/completions',
    format:       'openai',
    keyPrefix:    'sk-',
    keyMinLen:    30,
    defaultModel: 'deepseek-chat'
  },
  xai: {
    baseUrl:      'https://api.x.ai/v1/chat/completions',
    format:       'openai',
    keyPrefix:    'xai-',
    keyMinLen:    60,
    defaultModel: 'grok-2'
  },
  cohere: {
    baseUrl:      'https://api.cohere.com/v2/chat',
    format:       'cohere',
    keyPrefix:    '',
    keyMinLen:    30,
    defaultModel: 'command-r-plus'
  },
  together: {
    baseUrl:      'https://api.together.xyz/v1/chat/completions',
    format:       'openai',
    keyPrefix:    '',
    keyMinLen:    30,
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf'
  }
};

const MAX_TOKENS_HARD_LIMIT = 4096;

// ── CORS ────────────────────────────────────────────────────────────────────

function isAllowedOrigin(origin) {
  if (!origin) return true; // Sin origin = request directo (curl, test)
  if (origin === 'capacitor://localhost') return true;
  if (origin === 'http://localhost') return true;
  if (origin.startsWith('http://localhost:')) return true;
  // Redes locales típicas para livereload
  if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  if (/^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) return true;
  return false;
}

function corsHeaders(origin) {
  const allowedOrigin = isAllowedOrigin(origin) ? (origin || '*') : 'null';
  return {
    'Access-Control-Allow-Origin':  allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, X-Provider',
    'Access-Control-Max-Age':       '86400'
  };
}

function jsonResponse(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin)
    }
  });
}

function errorResponse(code, message, status, origin) {
  return jsonResponse({ error: { code, message } }, status, origin);
}

// ── Validación ───────────────────────────────────────────────────────────────

function validateRequest(providerId, apiKey, body) {
  // Proveedor válido
  const provider = PROVIDERS[providerId];
  if (!provider) {
    return { ok: false, code: 'UNKNOWN_PROVIDER', status: 400,
             message: `Unknown provider: ${providerId}` };
  }

  // API key presente
  if (!apiKey || typeof apiKey !== 'string') {
    return { ok: false, code: 'MISSING_API_KEY', status: 401,
             message: 'X-API-Key header required' };
  }

  // Longitud mínima
  if (apiKey.length < provider.keyMinLen) {
    return { ok: false, code: 'KEY_TOO_SHORT', status: 401,
             message: `API key too short for provider ${providerId}` };
  }

  // Prefijo (solo si el proveedor tiene prefijo definido)
  if (provider.keyPrefix && !apiKey.startsWith(provider.keyPrefix)) {
    return { ok: false, code: 'KEY_WRONG_FORMAT', status: 401,
             message: `API key format invalid for provider ${providerId}` };
  }

  // Body válido
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return { ok: false, code: 'INVALID_BODY', status: 400,
             message: 'messages array required' };
  }

  return { ok: true, provider };
}

// ── Preparación del payload ──────────────────────────────────────────────────

function prepareOpenAIPayload(body, provider, isStream) {
  return {
    model:       body.model || provider.defaultModel,
    messages:    body.messages,
    max_tokens:  Math.min(body.max_tokens || 2048, MAX_TOKENS_HARD_LIMIT),
    temperature: body.temperature !== undefined ? body.temperature : 0.7,
    stream:      isStream
  };
}

function prepareAnthropicPayload(body, provider, isStream) {
  // Separar system message de los mensajes de usuario/asistente
  const systemMsg = body.messages.find(m => m.role === 'system');
  const otherMsgs = body.messages.filter(m => m.role !== 'system');

  const payload = {
    model:      body.model || provider.defaultModel,
    messages:   otherMsgs,
    max_tokens: Math.min(body.max_tokens || 2048, MAX_TOKENS_HARD_LIMIT),
    stream:     isStream
  };

  if (systemMsg) {
    payload.system = systemMsg.content;
  }

  return payload;
}

function prepareCoherePayload(body, provider) {
  // Cohere v2 tiene formato propio
  const systemMsg    = body.messages.find(m => m.role === 'system');
  const otherMsgs    = body.messages.filter(m => m.role !== 'system');
  const chatHistory  = [];

  // El último mensaje es el del usuario actual
  const lastMsg      = otherMsgs[otherMsgs.length - 1];
  const historyMsgs  = otherMsgs.slice(0, -1);

  // Convertir historial a formato Cohere (role: USER | CHATBOT)
  historyMsgs.forEach(m => {
    chatHistory.push({
      role:    m.role === 'user' ? 'USER' : 'CHATBOT',
      message: m.content
    });
  });

  const payload = {
    model:        body.model || provider.defaultModel,
    message:      lastMsg ? lastMsg.content : '',
    chat_history: chatHistory,
    max_tokens:   Math.min(body.max_tokens || 2048, MAX_TOKENS_HARD_LIMIT),
    temperature:  body.temperature !== undefined ? body.temperature : 0.7
    // Cohere v2 no soporta streaming en este endpoint por ahora
  };

  if (systemMsg) {
    payload.preamble = systemMsg.content;
  }

  return payload;
}

// ── Llamadas a proveedores ──────────────────────────────────────────────────

async function callOpenAIFormat(provider, payload, apiKey) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  // OpenRouter requiere headers adicionales
  if (provider === PROVIDERS.openrouter) {
    headers['HTTP-Referer'] = 'https://nexia-api.molvicstudios.workers.dev';
    headers['X-Title']      = 'NEXIA';
  }

  return fetch(provider.baseUrl, {
    method:  'POST',
    headers,
    body:    JSON.stringify(payload)
  });
}

async function callAnthropicFormat(provider, payload, apiKey) {
  return fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         apiKey,
      'anthropic-version': provider.apiVersion
    },
    body: JSON.stringify(payload)
  });
}

async function callCohereFormat(provider, payload, apiKey) {
  return fetch(provider.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });
}

/**
 * Adapta la respuesta de Anthropic al formato OpenAI
 * para que el frontend no necesite saber qué proveedor usó.
 */
async function normalizeAnthropicResponse(res) {
  if (!res.ok) return res;
  const data = await res.json();

  // Anthropic devuelve: { content: [{ type: 'text', text: '...' }] }
  const text = (data.content && data.content.find(c => c.type === 'text')
    ? data.content.find(c => c.type === 'text').text
    : '');

  const normalized = {
    id:      data.id,
    object:  'chat.completion',
    model:   data.model,
    choices: [{
      index:         0,
      message:       { role: 'assistant', content: text },
      finish_reason: data.stop_reason || 'stop'
    }],
    usage: {
      prompt_tokens:     (data.usage && data.usage.input_tokens)  || 0,
      completion_tokens: (data.usage && data.usage.output_tokens) || 0,
      total_tokens:      ((data.usage && data.usage.input_tokens) || 0) +
                         ((data.usage && data.usage.output_tokens) || 0)
    }
  };

  return new Response(JSON.stringify(normalized), {
    status:  200,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Adapta la respuesta de Cohere al formato OpenAI.
 */
async function normalizeCohereResponse(res) {
  if (!res.ok) return res;
  const data = await res.json();

  const text = (data.message && data.message.content && data.message.content[0]
    ? data.message.content[0].text
    : (data.text || ''));

  const normalized = {
    id:      data.id || ('cohere-' + Date.now()),
    object:  'chat.completion',
    model:   data.model || 'command',
    choices: [{
      index:         0,
      message:       { role: 'assistant', content: text },
      finish_reason: data.finish_reason || 'stop'
    }],
    usage: {
      prompt_tokens:     (data.meta && data.meta.billed_units && data.meta.billed_units.input_tokens)  || 0,
      completion_tokens: (data.meta && data.meta.billed_units && data.meta.billed_units.output_tokens) || 0,
      total_tokens:      0
    }
  };

  return new Response(JSON.stringify(normalized), {
    status:  200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ── Handlers principales ────────────────────────────────────────────────────

async function handleComplete(request, origin) {
  const apiKey     = request.headers.get('X-API-Key') || '';
  const providerId = (request.headers.get('X-Provider') || 'groq').toLowerCase();

  let body;
  try {
    body = await request.json();
  } catch (_e) {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400, origin);
  }

  const validation = validateRequest(providerId, apiKey, body);
  if (!validation.ok) {
    return errorResponse(validation.code, validation.message, validation.status, origin);
  }

  const { provider } = validation;

  try {
    let providerRes;

    if (provider.format === 'anthropic') {
      const payload = prepareAnthropicPayload(body, provider, false);
      providerRes = await callAnthropicFormat(provider, payload, apiKey);
      providerRes = await normalizeAnthropicResponse(providerRes);
    } else if (provider.format === 'cohere') {
      const payload = prepareCoherePayload(body, provider);
      providerRes = await callCohereFormat(provider, payload, apiKey);
      providerRes = await normalizeCohereResponse(providerRes);
    } else {
      // openai format (groq, gemini, openrouter, openai, mistral, deepseek, xai, together)
      const payload = prepareOpenAIPayload(body, provider, false);
      providerRes = await callOpenAIFormat(provider, payload, apiKey);
    }

    // Error del proveedor — devolver con info pero sin exponer detalles internos
    if (!providerRes.ok) {
      const errBody = await providerRes.json().catch(() => ({}));
      const errCode = (errBody.error && (errBody.error.code || errBody.error.type))
        || ('HTTP_' + providerRes.status);
      const errMsg  = (errBody.error && errBody.error.message) || 'Provider error';

      console.error(`[nexia-api] Provider ${providerId} error: ${providerRes.status} ${errCode}`);

      return errorResponse(errCode, errMsg, providerRes.status, origin);
    }

    const data = await providerRes.json();
    return jsonResponse(data, 200, origin);

  } catch (e) {
    console.error(`[nexia-api] handleComplete error: ${e.message}`);
    return errorResponse('INTERNAL_ERROR', 'Internal worker error', 500, origin);
  }
}

async function handleStream(request, origin) {
  const apiKey     = request.headers.get('X-API-Key') || '';
  const providerId = (request.headers.get('X-Provider') || 'groq').toLowerCase();

  let body;
  try {
    body = await request.json();
  } catch (_e) {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400, origin);
  }

  const validation = validateRequest(providerId, apiKey, body);
  if (!validation.ok) {
    return errorResponse(validation.code, validation.message, validation.status, origin);
  }

  const { provider } = validation;

  // Cohere no soporta streaming en v2 — fallback a complete
  if (provider.format === 'cohere') {
    const payload    = prepareCoherePayload(body, provider);
    const providerRes = await callCohereFormat(provider, payload, apiKey);
    const normalized  = await normalizeCohereResponse(providerRes);
    if (!normalized.ok) {
      const errBody = await normalized.json().catch(() => ({}));
      const errCode = (errBody.error && (errBody.error.code || errBody.error.type))
        || ('HTTP_' + normalized.status);
      const errMsg  = (errBody.error && errBody.error.message) || 'Provider error';
      return errorResponse(errCode, errMsg, normalized.status, origin);
    }
    const data = await normalized.json();
    return jsonResponse(data, 200, origin);
  }

  try {
    let providerRes;

    if (provider.format === 'anthropic') {
      const payload = prepareAnthropicPayload(body, provider, true);
      providerRes = await callAnthropicFormat(provider, payload, apiKey);
    } else {
      const payload = prepareOpenAIPayload(body, provider, true);
      providerRes = await callOpenAIFormat(provider, payload, apiKey);
    }

    if (!providerRes.ok) {
      const errBody = await providerRes.json().catch(() => ({}));
      const errCode = (errBody.error && (errBody.error.code || errBody.error.type))
        || ('HTTP_' + providerRes.status);
      const errMsg  = (errBody.error && errBody.error.message) || 'Provider error';
      console.error(`[nexia-api] Stream provider ${providerId} error: ${providerRes.status}`);
      return errorResponse(errCode, errMsg, providerRes.status, origin);
    }

    // Para Anthropic streaming necesitamos adaptar el formato SSE
    if (provider.format === 'anthropic') {
      return adaptAnthropicStream(providerRes, origin);
    }

    // openai format: pasar stream directamente con CORS headers
    return new Response(providerRes.body, {
      status: 200,
      headers: {
        'Content-Type':      'text/event-stream',
        'Cache-Control':     'no-cache',
        'Connection':        'keep-alive',
        'X-Accel-Buffering': 'no',
        ...corsHeaders(origin)
      }
    });

  } catch (e) {
    console.error(`[nexia-api] handleStream error: ${e.message}`);
    return errorResponse('INTERNAL_ERROR', 'Internal worker error', 500, origin);
  }
}

/**
 * Adapta el stream de Anthropic (formato propio) al formato SSE de OpenAI
 * para que el cliente no necesite diferenciar.
 *
 * Anthropic SSE: data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"..."}}
 * OpenAI SSE:    data: {"choices":[{"delta":{"content":"..."}}]}
 */
function adaptAnthropicStream(anthropicRes, origin) {
  const { readable, writable } = new TransformStream();
  const writer  = writable.getWriter();
  const encoder = new TextEncoder();

  // Procesar el stream de Anthropic en background
  (async () => {
    try {
      const reader  = anthropicRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]' || payload === '') continue;

          try {
            const event = JSON.parse(payload);

            if (event.type === 'content_block_delta' &&
                event.delta && event.delta.type === 'text_delta') {
              const openAIChunk = {
                choices: [{ delta: { content: event.delta.text }, index: 0 }]
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(openAIChunk)}\n\n`));
            }

            if (event.type === 'message_stop') {
              await writer.write(encoder.encode('data: [DONE]\n\n'));
            }
          } catch (_parseErr) {
            // Ignorar líneas no parseables
          }
        }
      }

      // Asegurar [DONE] al final
      await writer.write(encoder.encode('data: [DONE]\n\n'));
    } catch (e) {
      console.error('[nexia-api] adaptAnthropicStream error:', e.message);
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type':      'text/event-stream',
      'Cache-Control':     'no-cache',
      'Connection':        'keep-alive',
      'X-Accel-Buffering': 'no',
      ...corsHeaders(origin)
    }
  });
}

// ── Health check ─────────────────────────────────────────────────────────────

function handleHealth(origin) {
  return jsonResponse({
    status:    'ok',
    worker:    'nexia-api',
    version:   '1.0.0',
    providers: Object.keys(PROVIDERS),
    timestamp: new Date().toISOString()
  }, 200, origin);
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default {
  async fetch(request, _env, _ctx) {
    const origin = request.headers.get('Origin') || '';
    const url    = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status:  204,
        headers: corsHeaders(origin)
      });
    }

    // Health check (GET, sin auth)
    if (request.method === 'GET' && url.pathname === '/api/health') {
      return handleHealth(origin);
    }

    // Solo POST para los endpoints de IA
    if (request.method !== 'POST') {
      return errorResponse('METHOD_NOT_ALLOWED', 'Only POST allowed', 405, origin);
    }

    // Router de endpoints
    try {
      if (url.pathname === '/api/complete') {
        return await handleComplete(request, origin);
      }
      if (url.pathname === '/api/stream') {
        return await handleStream(request, origin);
      }
      return errorResponse('NOT_FOUND', `Unknown endpoint: ${url.pathname}`, 404, origin);
    } catch (e) {
      console.error('[nexia-api] Unhandled error:', e.message, e.stack);
      return errorResponse('INTERNAL_ERROR', 'Unexpected error', 500, origin);
    }
  }
};
