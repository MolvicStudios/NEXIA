/**
 * NEXIA Editor IA — editor de texto con acciones IA inline
 *
 * Gestión de documentos local (max 30), auto-save debounced 2s,
 * acciones IA sobre selección de texto.
 */
const EditorTool = (() => {
  'use strict';

  const TOOL_ID  = 'editor';
  const DOCS_KEY = 'editor_documents';
  const MAX_DOCS = 30;

  let _activeDoc = null;
  let _saveTimer = null;

  const ACTION_PROMPTS = {
    improve:    (text) => `Mejora este texto manteniendo su esencia y tono original. Responde SOLO con el texto mejorado, sin explicaciones.\n\nTexto:\n${text}`,
    shorten:    (text) => `Acorta este texto a la mitad aproximadamente, conservando los puntos clave. Responde SOLO con el texto acortado.\n\nTexto:\n${text}`,
    expand:     (text) => `Amplía este texto añadiendo más detalle y contexto. Responde SOLO con el texto ampliado.\n\nTexto:\n${text}`,
    fix:        (text) => `Corrige todos los errores gramaticales y ortográficos de este texto. Responde SOLO con el texto corregido.\n\nTexto:\n${text}`,
    simplify:   (text) => `Simplifica este texto para que sea más fácil de entender. Usa frases cortas y vocabulario sencillo. Responde SOLO con el texto simplificado.\n\nTexto:\n${text}`,
    continue:   (text) => `Continúa este texto de forma natural y coherente. Escribe 2-3 párrafos adicionales. Responde SOLO con la continuación.\n\nTexto:\n${text}`,
    toneFormal:       (text) => `Reescribe este texto con un tono formal y profesional. Responde SOLO con el texto.\n\nTexto:\n${text}`,
    toneCasual:       (text) => `Reescribe este texto con un tono cercano y casual. Responde SOLO con el texto.\n\nTexto:\n${text}`,
    tonePersuasive:   (text) => `Reescribe este texto con un tono persuasivo orientado a convencer al lector. Responde SOLO con el texto.\n\nTexto:\n${text}`,
    toneProfessional: (text) => `Reescribe este texto con un tono profesional de negocios. Responde SOLO con el texto.\n\nTexto:\n${text}`
  };

  // ── Documentos ───────────────────────────────────────────────────────────

  function loadDocs() { return Storage.get(DOCS_KEY, []); }
  function saveDocs(docs) { Storage.set(DOCS_KEY, docs); }

  function createDoc() {
    return {
      id:        Utils.uuid(),
      title:     I18n.t('editor.untitled'),
      content:   '',
      wordCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function saveActiveDoc() {
    if (!_activeDoc) return;
    const ta = document.getElementById('editor-textarea');
    if (!ta) return;
    _activeDoc.content   = ta.value;
    _activeDoc.wordCount = _activeDoc.content.trim()
      ? _activeDoc.content.trim().split(/\s+/).length : 0;
    _activeDoc.title     = _activeDoc.content.trim()
      ? Utils.truncate(_activeDoc.content.trim().split('\n')[0], 40)
      : I18n.t('editor.untitled');
    _activeDoc.updatedAt = Date.now();

    const docs = loadDocs();
    const idx  = docs.findIndex(d => d.id === _activeDoc.id);
    if (idx !== -1) docs[idx] = _activeDoc; else docs.unshift(_activeDoc);
    if (docs.length > MAX_DOCS) docs.splice(MAX_DOCS);
    saveDocs(docs);
    updateStatus(I18n.t('editor.docSaved'));
  }

  function updateStatus(text) {
    const el = document.getElementById('editor-status');
    if (el) el.textContent = text;
  }

  function updateWordCount() {
    const ta = document.getElementById('editor-textarea');
    const el = document.getElementById('editor-wordcount');
    if (!ta || !el) return;
    const words = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
    el.textContent = I18n.t('editor.wordCount', { count: words });
  }

  // ── Acciones IA ──────────────────────────────────────────────────────────

  function getSelection() {
    const ta = document.getElementById('editor-textarea');
    if (!ta) return null;
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    if (start === end) return null;
    return { text: ta.value.slice(start, end), start, end };
  }

  async function applyAction(action) {
    const sel = getSelection();
    const ta  = document.getElementById('editor-textarea');
    if (!sel || !ta) return;

    hideActionBar();
    updateStatus(I18n.t('editor.generating'));

    const promptFn = ACTION_PROMPTS[action];
    if (!promptFn) return;

    const systemPrompt = Skills.buildSystemPrompt(TOOL_ID,
      'Eres un editor de textos experto. Sigues las instrucciones al pie de la letra. Responde SOLO con el texto resultante, sin explicaciones ni comillas.');
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: promptFn(sel.text) }
    ];

    const result = await AIClient.complete(messages, { maxTokens: 2048, temperature: 0.5 });

    if (!result.ok) {
      Utils.showSnackbar(result.message || I18n.t('errors.networkError'));
      updateStatus('');
      return;
    }

    showResultSheet(result.text, sel, ta);
  }

  async function applyToneAction(toneAction) {
    const sel = getSelection();
    const ta  = document.getElementById('editor-textarea');
    if (!sel || !ta) return;

    hideActionBar();
    updateStatus(I18n.t('editor.generating'));

    const promptFn = ACTION_PROMPTS[toneAction];
    if (!promptFn) { updateStatus(''); return; }

    const messages = [
      { role: 'system', content: 'Eres un editor experto. Responde SOLO con el texto resultante.' },
      { role: 'user',   content: promptFn(sel.text) }
    ];
    const result = await AIClient.complete(messages, { maxTokens: 2048, temperature: 0.5 });

    if (!result.ok) {
      Utils.showSnackbar(result.message || I18n.t('errors.networkError'));
      updateStatus('');
      return;
    }
    showResultSheet(result.text, sel, ta);
  }

  function showResultSheet(generatedText, sel, ta) {
    updateStatus('');
    const html = `
      <div class="sheet-title" data-i18n="editor.aiActions">${I18n.t('editor.aiActions')}</div>
      <div class="output-box selectable" style="margin-bottom:var(--space-md);max-height:200px;overflow-y:auto">
        ${Utils.nl2br(generatedText)}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary btn-full" id="editor-replace-btn">
          ${Utils.escapeHtml(I18n.t('editor.replaceSelection'))}
        </button>
        <button class="btn btn-secondary btn-full" id="editor-insert-btn">
          ${Utils.escapeHtml(I18n.t('editor.insertBelow'))}
        </button>
        <button class="btn btn-ghost btn-full" id="editor-discard-btn">
          ${Utils.escapeHtml(I18n.t('editor.discard'))}
        </button>
      </div>`;
    Utils.openSheet(html);
    setTimeout(() => {
      document.getElementById('editor-replace-btn')?.addEventListener('click', () => {
        ta.value = ta.value.slice(0, sel.start) + generatedText + ta.value.slice(sel.end);
        Utils.closeSheet();
        triggerAutoSave();
        updateWordCount();
      });
      document.getElementById('editor-insert-btn')?.addEventListener('click', () => {
        ta.value = ta.value.slice(0, sel.end) + '\n\n' + generatedText + ta.value.slice(sel.end);
        Utils.closeSheet();
        triggerAutoSave();
        updateWordCount();
      });
      document.getElementById('editor-discard-btn')?.addEventListener('click', () => {
        Utils.closeSheet();
      });
    }, 50);
  }

  function showToneSheet() {
    const tones = [
      { key: 'toneFormal',       label: I18n.t('editor.toneFormal') },
      { key: 'toneCasual',       label: I18n.t('editor.toneCasual') },
      { key: 'tonePersuasive',   label: I18n.t('editor.tonePersuasive') },
      { key: 'toneProfessional', label: I18n.t('editor.toneProfessional') }
    ];
    const html = `
      <div class="sheet-title">${Utils.escapeHtml(I18n.t('editor.toneTitle'))}</div>
      ${tones.map(t => `
        <div class="list-item card-tap ripple tone-opt" data-tone="${Utils.escapeHtml(t.key)}">
          <div class="list-info"><div class="list-title">${Utils.escapeHtml(t.label)}</div></div>
          <span class="list-chevron">›</span>
        </div>`).join('')}`;
    Utils.openSheet(html);
    setTimeout(() => {
      document.querySelectorAll('.tone-opt').forEach(el => {
        el.addEventListener('click', () => {
          const tone = el.dataset.tone;
          Utils.closeSheet();
          setTimeout(() => applyToneAction(tone), 300);
        });
      });
    }, 50);
  }

  // ── Action bar ───────────────────────────────────────────────────────────

  function showActionBar() {
    const bar = document.getElementById('ai-action-bar');
    if (bar) bar.classList.add('visible');
  }

  function hideActionBar() {
    const bar = document.getElementById('ai-action-bar');
    if (bar) bar.classList.remove('visible');
  }

  // ── Panel de documentos ──────────────────────────────────────────────────

  function showDocsPanel() {
    const docs = loadDocs();
    const html = `
      <div class="sheet-title">${Utils.escapeHtml(I18n.t('editor.myDocs'))}</div>
      <button class="btn btn-secondary btn-full" id="docs-new-btn" style="margin-bottom:8px">
        + ${Utils.escapeHtml(I18n.t('editor.newDoc'))}
      </button>
      ${docs.length === 0
        ? `<div style="color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-md) 0">
             ${Utils.escapeHtml(I18n.t('editor.noDocsYet'))}</div>`
        : docs.map(d => `
            <div class="list-item card-tap ripple doc-item"
                 data-doc-id="${Utils.escapeHtml(d.id)}">
              <div class="list-info">
                <div class="list-title">${Utils.escapeHtml(d.title)}</div>
                <div class="list-subtitle">
                  ${Utils.escapeHtml(Utils.timeAgo(d.updatedAt, I18n.getLang()))} ·
                  ${Utils.escapeHtml(I18n.t('editor.wordCount', { count: d.wordCount }))}
                </div>
              </div>
              <button class="btn btn-icon btn-ghost doc-delete-btn"
                      data-doc-id="${Utils.escapeHtml(d.id)}"
                      style="color:var(--text-disabled);font-size:12px">✕</button>
            </div>`).join('')}`;
    Utils.openSheet(html);
    setTimeout(() => {
      document.getElementById('docs-new-btn')?.addEventListener('click', () => {
        _activeDoc = createDoc();
        const docs2 = loadDocs();
        docs2.unshift(_activeDoc);
        saveDocs(docs2);
        const ta = document.getElementById('editor-textarea');
        if (ta) ta.value = '';
        updateWordCount();
        Utils.closeSheet();
      });
      document.querySelectorAll('.doc-item').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.doc-delete-btn')) return;
          const docId = el.dataset.docId;
          const doc   = loadDocs().find(d => d.id === docId);
          if (!doc) return;
          _activeDoc = doc;
          const ta = document.getElementById('editor-textarea');
          if (ta) ta.value = doc.content;
          updateWordCount();
          Utils.closeSheet();
        });
      });
      document.querySelectorAll('.doc-delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const docId = btn.dataset.docId;
          const docs2 = loadDocs().filter(d => d.id !== docId);
          saveDocs(docs2);
          Utils.showSnackbar(I18n.t('editor.docDeleted'));
          if (_activeDoc && _activeDoc.id === docId) {
            _activeDoc = docs2[0] || createDoc();
            const ta = document.getElementById('editor-textarea');
            if (ta) ta.value = _activeDoc.content;
          }
          Utils.closeSheet();
          setTimeout(() => showDocsPanel(), 300);
        });
      });
    }, 50);
  }

  // ── Auto-save ────────────────────────────────────────────────────────────

  function triggerAutoSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(saveActiveDoc, 2000);
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  return {
    init(viewEl) {
      // Cargar o crear doc activo
      const docs = loadDocs();
      _activeDoc = docs[0] || createDoc();
      if (docs.length === 0) { saveDocs([_activeDoc]); }

      const ta = document.getElementById('editor-textarea');
      if (ta) {
        ta.value = _activeDoc.content;
        ta.addEventListener('input', () => {
          updateWordCount();
          triggerAutoSave();
          hideActionBar();
        });
        ta.addEventListener('select', () => {
          if (ta.selectionStart !== ta.selectionEnd) showActionBar();
          else hideActionBar();
        });
        ta.addEventListener('mouseup', () => {
          if (ta.selectionStart !== ta.selectionEnd) showActionBar();
        });
        ta.addEventListener('touchend', () => {
          setTimeout(() => {
            if (ta.selectionStart !== ta.selectionEnd) showActionBar();
          }, 100);
        });
      }

      updateWordCount();

      // Skill chip
      const chipEl = document.getElementById('editor-skill-chip');
      if (chipEl && window.SkillsUI) {
        const chip = SkillsUI.renderChip(TOOL_ID);
        chip.setAttribute('data-skill-chip-tool', TOOL_ID);
        chipEl.appendChild(chip);
      }

      // Action bar buttons
      document.querySelectorAll('.ai-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          if (action === 'tone') showToneSheet();
          else applyAction(action);
        });
      });

      document.getElementById('editor-docs-btn')
        ?.addEventListener('click', showDocsPanel);

      document.getElementById('editor-copy-btn')
        ?.addEventListener('click', async () => {
          const ta2 = document.getElementById('editor-textarea');
          if (ta2 && ta2.value) {
            await Utils.copyToClipboard(ta2.value);
            Utils.showSnackbar(I18n.t('common.copied'));
          }
        });

      document.getElementById('editor-share-btn')
        ?.addEventListener('click', async () => {
          const ta2 = document.getElementById('editor-textarea');
          if (ta2 && ta2.value) {
            await Utils.shareText(ta2.value, I18n.t('editor.title'));
          }
        });

      I18n.applyToView(viewEl);
      setTimeout(() => ta && ta.focus(), 300);
    }
  };
})();

window.EditorTool = EditorTool;
