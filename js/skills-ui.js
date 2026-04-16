/**
 * NEXIA SkillsUI — Interfaz de gestión de skills
 *
 * Componentes:
 *   SkillsUI.renderChip(toolId)       → chip en tools
 *   SkillsUI.openSelector(toolId)     → bottom sheet selector
 *   SkillsUI.openForm(skillId, toolId)→ bottom sheet crear/editar
 *   SkillsUI.openLibrary()            → vista biblioteca completa
 */
const SkillsUI = (() => {

  // Emojis disponibles para el picker (sin librerías externas)
  const EMOJI_OPTIONS = [
    '⚡','🎯','✍️','💼','👨‍💻','📝','⚖️','🌍','📊','🎨','🤝','🚀',
    '💡','🔥','⭐','🎭','🧠','📣','🛠️','🎪','🌟','💎','🏆','🎲',
    '📱','🖊️','📋','🗂️','💬','🔑','🎓','🧩','🎵','🌈','🦁','🐺'
  ];

  // Colores disponibles para el chip del skill
  const COLOR_OPTIONS = [
    '#7C3AED','#F472B6','#60A5FA','#34D399','#FCD34D',
    '#FB923C','#FCA5A5','#5EEAD4','#818CF8','#C4B5FD'
  ];

  // ── Helpers internos ──────────────────────────────────────────────────────

  /**
   * Genera el HTML de la card de un skill para la lista.
   */
  function skillCardHTML(skill, toolId, mode) {
    const active     = toolId ? Skills.getActive(toolId) : null;
    const isActive   = active && active.id === skill.id;
    const usageText  = skill.usageCount > 0
      ? I18n.t('skills.usedTimes', { count: skill.usageCount })
      : '';

    const activeIndicator = isActive
      ? '<span class="badge badge-purple" style="font-size:9px">✓</span>'
      : '';

    const actionBtn = (!skill.isDefault && mode === 'library')
      ? `<button class="btn btn-icon btn-ghost skill-options-btn"
                 data-skill-id="${Utils.escapeHtml(skill.id)}"
                 aria-label="Opciones">⋯</button>`
      : '<span class="list-chevron">›</span>';

    return `
      <div class="list-item skill-item card-tap ripple"
           data-skill-id="${Utils.escapeHtml(skill.id)}"
           data-tool-id="${Utils.escapeHtml(toolId || '')}">
        <div class="list-icon"
             style="background:${Utils.escapeHtml(skill.color)}22;
                    color:${Utils.escapeHtml(skill.color)};font-size:18px">
          ${Utils.escapeHtml(skill.emoji)}
        </div>
        <div class="list-info">
          <div class="list-title">${Utils.escapeHtml(skill.name)}</div>
          <div class="list-subtitle">${Utils.escapeHtml(skill.description)}${usageText ? ' · ' + usageText : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          ${activeIndicator}
          ${actionBtn}
        </div>
      </div>`;
  }

  /**
   * Genera el HTML del formulario crear/editar.
   */
  function formHTML(skill) {
    const isEdit     = !!skill;
    const title      = isEdit ? I18n.t('skills.editSkill') : I18n.t('skills.createSkill');
    const categories = Skills.getCategories();
    const lang       = I18n.getLang();

    const categoryOptions = categories.map(cat => {
      const label = lang === 'en' ? cat.labelEn : cat.label;
      const sel   = ((skill && skill.category) || 'custom') === cat.id ? 'selected' : '';
      return `<option value="${Utils.escapeHtml(cat.id)}" ${sel}>${Utils.escapeHtml(label)}</option>`;
    }).join('');

    // Emoji picker
    const currentEmoji = (skill && skill.emoji) || '⚡';
    const emojiGrid = EMOJI_OPTIONS.map(emoji => {
      const sel = currentEmoji === emoji ? 'selected' : '';
      return `<button class="emoji-option ${sel}" data-emoji="${emoji}" type="button">${emoji}</button>`;
    }).join('');

    // Color picker
    const currentColor = (skill && skill.color) || '#7C3AED';
    const colorGrid = COLOR_OPTIONS.map(color => {
      const sel = currentColor === color ? 'selected' : '';
      return `<button class="color-option ${sel}" data-color="${Utils.escapeHtml(color)}"
              type="button" style="background:${Utils.escapeHtml(color)}"
              aria-label="${Utils.escapeHtml(color)}"></button>`;
    }).join('');

    const nameVal   = skill ? Utils.escapeHtml(skill.name)         : '';
    const descVal   = skill ? Utils.escapeHtml(skill.description)  : '';
    const promptVal = skill ? Utils.escapeHtml(skill.systemPrompt) : '';
    const emojiVal  = Utils.escapeHtml(currentEmoji);
    const colorVal  = Utils.escapeHtml(currentColor);
    const nameLen   = skill ? skill.name.length         : 0;
    const promptLen = skill ? skill.systemPrompt.length : 0;

    return `
      <div class="sheet-title">${title}</div>

      <div class="input-group">
        <label class="input-label">${I18n.t('skills.skillName')}</label>
        <input class="input" id="skill-name-input"
               placeholder="${I18n.t('skills.skillNamePlaceholder')}"
               maxlength="30"
               value="${nameVal}" />
        <div class="char-count" id="skill-name-count">${nameLen}/30</div>
      </div>

      <div class="input-group">
        <label class="input-label">${I18n.t('skills.skillEmoji')}</label>
        <div class="emoji-picker" id="emoji-picker">${emojiGrid}</div>
      </div>

      <div class="input-group">
        <label class="input-label">${I18n.t('skills.skillCategory')}</label>
        <select class="input" id="skill-category-select">${categoryOptions}</select>
      </div>

      <div class="input-group">
        <label class="input-label">${I18n.t('skills.skillDesc')}</label>
        <input class="input" id="skill-desc-input"
               placeholder="${I18n.t('skills.skillDescPlaceholder')}"
               maxlength="80"
               value="${descVal}" />
      </div>

      <div class="input-group">
        <label class="input-label">${I18n.t('skills.skillPrompt')}</label>
        <textarea class="input textarea" id="skill-prompt-input"
                  placeholder="${I18n.t('skills.skillPromptPlaceholder')}"
                  rows="5"
                  maxlength="2000"
                  style="min-height:120px">${promptVal}</textarea>
        <div class="char-count" id="skill-prompt-count">${promptLen}/2000</div>
      </div>

      <div class="input-group">
        <label class="input-label">Color</label>
        <div class="color-picker" id="color-picker">${colorGrid}</div>
      </div>

      <input type="hidden" id="skill-emoji-value" value="${emojiVal}" />
      <input type="hidden" id="skill-color-value" value="${colorVal}" />
      ${isEdit ? `<input type="hidden" id="skill-edit-id" value="${Utils.escapeHtml(skill.id)}" />` : ''}

      <button class="btn btn-primary btn-full" id="skill-save-btn" style="margin-top:8px">
        ${I18n.t('skills.saveSkill')}
      </button>
    `;
  }

  /**
   * Inicializa los event listeners del formulario
   * (llamar justo después de inyectar el HTML en el DOM).
   */
  function initFormListeners(toolId) {
    // Contador de caracteres — nombre
    const nameInput = document.getElementById('skill-name-input');
    const nameCount = document.getElementById('skill-name-count');
    if (nameInput && nameCount) {
      nameInput.addEventListener('input', () => {
        const len = nameInput.value.length;
        nameCount.textContent = `${len}/30`;
        nameCount.className = 'char-count' +
          (len >= 30 ? ' danger' : len >= 28 ? ' warning' : '');
      });
    }

    // Contador de caracteres — prompt
    const promptInput = document.getElementById('skill-prompt-input');
    const promptCount = document.getElementById('skill-prompt-count');
    if (promptInput && promptCount) {
      promptInput.addEventListener('input', () => {
        const len = promptInput.value.length;
        promptCount.textContent = `${len}/2000`;
        promptCount.className = 'char-count' +
          (len >= 2000 ? ' danger' : len >= 1800 ? ' warning' : '');
      });
    }

    // Emoji picker — selección
    document.querySelectorAll('.emoji-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.emoji-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const emojiVal = document.getElementById('skill-emoji-value');
        if (emojiVal) emojiVal.value = btn.dataset.emoji;
        Utils.haptic('light');
      });
    });

    // Color picker — selección
    document.querySelectorAll('.color-option').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        const colorVal = document.getElementById('skill-color-value');
        if (colorVal) colorVal.value = btn.dataset.color;
        Utils.haptic('light');
      });
    });

    // Guardar skill
    const saveBtn = document.getElementById('skill-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const name         = (document.getElementById('skill-name-input')   && document.getElementById('skill-name-input').value.trim())   || '';
        const description  = (document.getElementById('skill-desc-input')   && document.getElementById('skill-desc-input').value.trim())   || '';
        const systemPrompt = (document.getElementById('skill-prompt-input') && document.getElementById('skill-prompt-input').value.trim()) || '';
        const category     = (document.getElementById('skill-category-select') && document.getElementById('skill-category-select').value)  || 'custom';
        const emoji        = (document.getElementById('skill-emoji-value')  && document.getElementById('skill-emoji-value').value)         || '⚡';
        const color        = (document.getElementById('skill-color-value')  && document.getElementById('skill-color-value').value)         || '#7C3AED';
        const editId       = document.getElementById('skill-edit-id')       ? document.getElementById('skill-edit-id').value               : null;

        // Validaciones UI
        if (!name) {
          Utils.showSnackbar(I18n.t('skills.nameRequired'));
          return;
        }
        if (!systemPrompt) {
          Utils.showSnackbar(I18n.t('skills.promptRequired'));
          return;
        }

        saveBtn.disabled    = true;
        saveBtn.textContent = '...';

        let result;
        if (editId) {
          result = Skills.update(editId, { name, description, systemPrompt, category, emoji, color });
        } else {
          result = Skills.create({ name, description, systemPrompt, category, emoji, color });
        }

        if (result.ok) {
          await Utils.haptic('success');
          Utils.closeSheet();
          Utils.showSnackbar(I18n.t('skills.skillSaved'));
          // Si hay toolId activo, volver al selector
          if (toolId) {
            setTimeout(() => SkillsUI.openSelector(toolId), 300);
          }
        } else {
          saveBtn.disabled    = false;
          saveBtn.textContent = I18n.t('skills.saveSkill');
          const errMsg = result.error || 'Error desconocido';
          // Intentar traducir el error como clave i18n
          const translated = I18n.t('skills.' + errMsg.toLowerCase());
          Utils.showSnackbar(translated !== ('skills.' + errMsg.toLowerCase()) ? translated : errMsg);
          await Utils.haptic('error');
        }
      });
    }
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {

    /**
     * Renderiza el chip de skill activo para un tool.
     * Llama a este método desde cada tool para mostrar el selector.
     *
     * Uso en un tool:
     *   const chipEl = SkillsUI.renderChip('chat');
     *   chipEl.setAttribute('data-skill-chip-tool', 'chat');
     *   toolHeader.appendChild(chipEl);
     */
    renderChip(toolId) {
      const active = Skills.getActive(toolId);
      const chip   = document.createElement('div');

      chip.className    = 'chip' + (active ? ' active' : '') + ' ripple no-select';
      chip.style.cursor = 'pointer';

      if (active) {
        chip.innerHTML =
          `<span style="font-size:14px">${Utils.escapeHtml(active.emoji)}</span>` +
          `<span>${Utils.escapeHtml(Utils.truncate(active.name, 20))}</span>` +
          `<span style="opacity:.5;font-size:10px">&#9660;</span>`;
      } else {
        chip.innerHTML =
          `<span style="opacity:.5">&#9881;</span>` +
          `<span data-i18n="skills.noSkill">${I18n.t('skills.noSkill')}</span>` +
          `<span style="opacity:.5;font-size:10px">&#9660;</span>`;
      }

      chip.addEventListener('click', () => {
        Utils.haptic('light');
        this.openSelector(toolId);
      });

      return chip;
    },

    /**
     * Abre el bottom sheet selector de skills para un tool.
     */
    openSelector(toolId) {
      const skills  = Skills.getAll();
      const active  = Skills.getActive(toolId);

      const skillsHTML = skills.map(s => skillCardHTML(s, toolId, 'selector')).join('');

      const noSkillCheck = !active ? '<span class="badge badge-purple">✓</span>' : '';

      const html =
        `<div class="sheet-title">${I18n.t('skills.chooseSkill')}</div>` +

        `<div class="list-item card-tap ripple no-select" id="skill-none-option">
          <div class="list-icon"
               style="background:var(--bg-elevated);color:var(--text-muted);font-size:18px">&#8854;</div>
          <div class="list-info">
            <div class="list-title">${I18n.t('skills.noSkill')}</div>
            <div class="list-subtitle">${I18n.t('app.tagline')}</div>
          </div>
          <div>${noSkillCheck}</div>
        </div>` +

        `<div class="divider"></div>` +

        `<div id="skills-list">${
          skillsHTML ||
          '<div class="empty-state" style="padding:1rem 0"><div class="empty-state-desc">No hay skills</div></div>'
        }</div>` +

        `<div class="divider"></div>` +

        `<button class="btn btn-secondary btn-full" id="btn-create-skill">
          + ${I18n.t('skills.createSkill')}
        </button>`;

      Utils.openSheet(html);

      setTimeout(() => {
        // Listener: quitar skill (opción "Sin skill")
        const noneOpt = document.getElementById('skill-none-option');
        if (noneOpt) {
          noneOpt.addEventListener('click', () => {
            Skills.setActive(toolId, null);
            Utils.closeSheet();
            Utils.showSnackbar(I18n.t('skills.skillRemoved'));
            this._refreshChip(toolId);
          });
        }

        // Listener: seleccionar skill
        document.querySelectorAll('.skill-item').forEach(item => {
          item.addEventListener('click', () => {
            const skillId = item.dataset.skillId;
            if (!skillId) return;
            Skills.setActive(toolId, skillId);
            Utils.haptic('light');
            Utils.closeSheet();
            const skill = Skills.getById(skillId);
            Utils.showSnackbar(
              `${skill ? skill.emoji : ''} ${skill ? skill.name : ''} — ${I18n.t('skills.skillApplied')}`
            );
            this._refreshChip(toolId);
          });
        });

        // Listener: abrir formulario crear
        const createBtn = document.getElementById('btn-create-skill');
        if (createBtn) {
          createBtn.addEventListener('click', () => {
            Utils.closeSheet();
            setTimeout(() => this.openForm(null, toolId), 300);
          });
        }
      }, 50);
    },

    /**
     * Abre el bottom sheet formulario crear/editar skill.
     * skillId = null → crear nuevo
     * skillId = 'uuid' → editar existente
     */
    openForm(skillId, toolId) {
      const skill = skillId ? Skills.getById(skillId) : null;

      if (skillId && !skill) {
        Utils.showSnackbar('Skill no encontrado');
        return;
      }

      // Los skills por defecto no son editables
      if (skill && skill.isDefault) {
        Utils.showSnackbar(I18n.t('skills.cannotDeleteDefault'));
        return;
      }

      Utils.openSheet(formHTML(skill));

      setTimeout(() => initFormListeners(toolId), 50);
    },

    /**
     * Abre la vista biblioteca completa de skills.
     * Se llama desde la vista Home o desde el tab Más.
     */
    openLibrary() {
      const skills     = Skills.getAll();
      const categories = Skills.getCategories();
      const lang       = I18n.getLang();

      // Agrupar por categoría
      const grouped = {};
      skills.forEach(s => {
        if (!grouped[s.category]) grouped[s.category] = [];
        grouped[s.category].push(s);
      });

      let sectionsHTML = '';
      categories.forEach(cat => {
        const list = grouped[cat.id];
        if (!list || list.length === 0) return;
        const label = lang === 'en' ? cat.labelEn : cat.label;
        sectionsHTML +=
          `<div class="section-label">${Utils.escapeHtml(label)}</div>` +
          list.map(s => skillCardHTML(s, null, 'library')).join('');
      });

      const html =
        `<div class="sheet-title">${I18n.t('skills.title')}` +
        `<span style="color:var(--text-muted);font-size:12px;margin-left:8px">${skills.length}/100</span>` +
        `</div>` +

        `<div id="skills-library-list">${
          sectionsHTML ||
          `<div class="empty-state">
            <div class="empty-state-icon">&#9889;</div>
            <div class="empty-state-title">${I18n.t('skills.title')}</div>
           </div>`
        }</div>` +

        `<div class="divider"></div>` +

        `<button class="btn btn-primary btn-full" id="btn-library-create">
          + ${I18n.t('skills.createSkill')}
        </button>`;

      Utils.openSheet(html);

      setTimeout(() => {
        // Listener: tap en skill → opciones
        document.querySelectorAll('.skill-item').forEach(item => {
          item.addEventListener('click', (e) => {
            // Ignorar tap en el botón de opciones (tiene su propio listener)
            if (e.target.closest && e.target.closest('.skill-options-btn')) return;
            const skillId = item.dataset.skillId;
            if (skillId) this._showSkillOptions(skillId);
          });
        });

        // Listener: botón opciones ⋯
        document.querySelectorAll('.skill-options-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const skillId = btn.dataset.skillId;
            if (skillId) this._showSkillOptions(skillId);
          });
        });

        // Listener: crear nuevo
        const createBtn = document.getElementById('btn-library-create');
        if (createBtn) {
          createBtn.addEventListener('click', () => {
            Utils.closeSheet();
            setTimeout(() => this.openForm(null, null), 300);
          });
        }
      }, 50);
    },

    /**
     * Muestra el bottom sheet de opciones para un skill concreto.
     * (Usar / Editar / Eliminar / Cancelar)
     */
    _showSkillOptions(skillId) {
      const skill = Skills.getById(skillId);
      if (!skill) return;

      const canEdit   = !skill.isDefault;
      const canDelete = !skill.isDefault;

      let html =
        `<div class="sheet-title">` +
        `<span style="margin-right:8px">${Utils.escapeHtml(skill.emoji)}</span>` +
        `${Utils.escapeHtml(skill.name)}` +
        `</div>` +

        `<div class="list-item card-tap ripple" id="opt-use">
          <div class="list-icon" style="background:var(--purple-bg);color:var(--purple-light)">&#9654;</div>
          <div class="list-info">
            <div class="list-title">${I18n.t('skills.applySkill')}</div>
          </div>
        </div>`;

      if (canEdit) {
        html +=
          `<div class="list-item card-tap ripple" id="opt-edit">
            <div class="list-icon" style="background:var(--bg-elevated);color:var(--text-secondary)">&#9998;</div>
            <div class="list-info">
              <div class="list-title">${I18n.t('skills.editSkill')}</div>
            </div>
          </div>`;
      }

      if (canDelete) {
        html +=
          `<div class="list-item card-tap ripple" id="opt-delete">
            <div class="list-icon" style="background:var(--bg-elevated);color:var(--text-muted)">&#10005;</div>
            <div class="list-info">
              <div class="list-title" style="color:var(--red,#F87171)">${I18n.t('skills.deleteSkill')}</div>
            </div>
          </div>`;
      }

      html +=
        `<button class="btn btn-secondary btn-full" style="margin-top:8px" id="opt-cancel">
          ${I18n.t('common.cancel')}
        </button>`;

      Utils.openSheet(html);

      setTimeout(() => {
        // Aplicar — selecciona para el tool activo actual
        const useBtn = document.getElementById('opt-use');
        if (useBtn) {
          useBtn.addEventListener('click', () => {
            const currentTool = State.get('activeToolId');
            if (currentTool && currentTool !== 'home' && currentTool !== 'settings') {
              Skills.setActive(currentTool, skillId);
              Utils.showSnackbar(`${skill.emoji} ${skill.name} — ${I18n.t('skills.skillApplied')}`);
              this._refreshChip(currentTool);
            } else {
              Utils.showSnackbar(I18n.t('skills.skillApplied'));
            }
            Utils.closeSheet();
          });
        }

        // Editar
        const editBtn = document.getElementById('opt-edit');
        if (editBtn) {
          editBtn.addEventListener('click', () => {
            Utils.closeSheet();
            setTimeout(() => this.openForm(skillId, null), 300);
          });
        }

        // Eliminar
        const deleteBtn = document.getElementById('opt-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => {
            // Snapshot del skill antes de borrarlo para el undo
            const snapshot = {
              name:         skill.name,
              description:  skill.description,
              systemPrompt: skill.systemPrompt,
              emoji:        skill.emoji,
              color:        skill.color,
              category:     skill.category
            };
            const result = Skills.delete(skillId);
            if (result.ok) {
              Utils.haptic('medium');
              Utils.closeSheet();
              Utils.showSnackbar(
                I18n.t('skills.skillDeleted'),
                {
                  action:   I18n.t('common.cancel'),
                  duration: 4000,
                  onAction: () => {
                    Skills.create(snapshot);
                  }
                }
              );
            } else {
              Utils.showSnackbar(I18n.t('skills.cannotDeleteDefault'));
            }
          });
        }

        // Cancelar
        const cancelBtn = document.getElementById('opt-cancel');
        if (cancelBtn) {
          cancelBtn.addEventListener('click', () => Utils.closeSheet());
        }
      }, 50);
    },

    /**
     * Refresca el chip de un tool específico si está en el DOM.
     * Los tools llaman a esto tras skills:active-changed.
     */
    _refreshChip(toolId) {
      const existingChip = document.querySelector(
        `[data-skill-chip-tool="${CSS.escape ? CSS.escape(toolId) : toolId}"]`
      );
      if (existingChip) {
        const parent  = existingChip.parentNode;
        const newChip = this.renderChip(toolId);
        newChip.setAttribute('data-skill-chip-tool', toolId);
        parent.replaceChild(newChip, existingChip);
      }
    },

    /**
     * Inicializa el módulo.
     * Registra listeners globales para actualizar chips cuando cambia el skill activo.
     * Llamar desde app.js después de Skills.init()
     */
    init() {
      // Escuchar cambios de skill activo para refrescar chips en el DOM
      document.addEventListener('skills:active-changed', (e) => {
        const toolId = e.detail && e.detail.toolId;
        if (toolId) this._refreshChip(toolId);
      });

      // Escuchar cambio de idioma para cerrar cualquier sheet de skills abierto
      document.addEventListener('i18n:changed', () => {
        Utils.closeSheet();
      });
    }
  };
})();

window.SkillsUI = SkillsUI;
