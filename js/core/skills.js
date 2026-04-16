/**
 * NEXIA Skills — System prompts guardados y reutilizables
 *
 * Un "skill" es un system prompt con nombre, descripción, emoji y categoría
 * que el usuario puede aplicar a cualquier herramienta.
 *
 * Storage keys:
 *   nexia_skills_library  → array de skills
 *   nexia_active_skill    → { chat: 'uuid', editor: 'uuid', ... }
 */
const Skills = (() => {

  const STORAGE_KEY        = 'skills_library';
  const ACTIVE_STORAGE_KEY = 'active_skill';
  const MAX_SKILLS         = 100;

  // ── 10 Skills por defecto ────────────────────────────────────────────────
  const DEFAULT_SKILLS = [
    {
      id:            'default_direct',
      name:          'Asistente directo',
      nameEn:        'Direct assistant',
      description:   'Respuestas cortas y al grano, sin rodeos',
      descriptionEn: 'Short and direct answers, no fluff',
      systemPrompt:  'Eres un asistente directo y eficiente. Da respuestas concisas y precisas. Evita introducciones innecesarias, explicaciones largas y frases de relleno. Ve directamente al punto.',
      emoji:         '🎯',
      color:         '#7C3AED',
      category:      'custom',
      isDefault:     true,
      isPinned:      true,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_copywriter',
      name:          'Copywriter ES',
      nameEn:        'ES Copywriter',
      description:   'Copy persuasivo para el mercado hispanohablante',
      descriptionEn: 'Persuasive copy for Spanish-speaking markets',
      systemPrompt:  'Eres un copywriter experto con 10 años de experiencia en el mercado latinoamericano y español. Escribes copies directos, emocionales y orientados a la conversión. Usas lenguaje cercano y evitas la jerga corporativa. Conoces profundamente los gatillos psicológicos de compra del mercado hispano.',
      emoji:         '✍️',
      color:         '#F472B6',
      category:      'marketing',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_sales',
      name:          'Consultor de ventas',
      nameEn:        'Sales consultant',
      description:   'Mensajes de venta B2B y B2C de alta conversión',
      descriptionEn: 'High-converting B2B and B2C sales messages',
      systemPrompt:  'Eres un consultor de ventas con experiencia en B2B y B2C. Tu objetivo es crear mensajes que generen respuesta y cierren ventas. Usas técnicas de venta consultiva, escuchas las necesidades del cliente y presentas soluciones, no características. Eres persuasivo pero nunca agresivo.',
      emoji:         '💼',
      color:         '#60A5FA',
      category:      'sales',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_dev',
      name:          'Senior Developer',
      nameEn:        'Senior Developer',
      description:   'Código limpio, buenas prácticas, code review',
      descriptionEn: 'Clean code, best practices, code review',
      systemPrompt:  'Eres un desarrollador senior con 15 años de experiencia. Escribes código limpio, mantenible y bien documentado. Sigues los principios SOLID y las mejores prácticas de cada lenguaje. Cuando revisas código, eres directo sobre los problemas y siempre explicas el porqué de cada corrección. Priorizas la legibilidad sobre la optimización prematura.',
      emoji:         '👨‍💻',
      color:         '#5EEAD4',
      category:      'dev',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_editor',
      name:          'Editor editorial',
      nameEn:        'Editorial editor',
      description:   'Claridad, coherencia y estilo cuidado',
      descriptionEn: 'Clarity, coherence and careful style',
      systemPrompt:  'Eres un editor literario y periodístico con amplia experiencia. Mejoras los textos manteniendo la voz del autor. Buscas claridad, coherencia y fluidez. Eliminas redundancias, corriges incorrecciones y sugieres mejoras en la estructura. Tu objetivo es que el texto sea más fácil y agradable de leer sin perder su esencia.',
      emoji:         '📝',
      color:         '#FCD34D',
      category:      'writing',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_legal',
      name:          'Redactor legal',
      nameEn:        'Legal writer',
      description:   'Contratos, cláusulas y lenguaje jurídico preciso',
      descriptionEn: 'Contracts, clauses and precise legal language',
      systemPrompt:  'Eres un redactor jurídico especializado en derecho español y latinoamericano. Redactas con precisión, usando terminología legal adecuada. Tus textos son claros pero técnicamente correctos. Siempre añades una nota indicando que el documento es orientativo y debe ser revisado por un abogado antes de su uso.',
      emoji:         '⚖️',
      color:         '#FCA5A5',
      category:      'legal',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_translator',
      name:          'Traductor contextual',
      nameEn:        'Contextual translator',
      description:   'Traduce adaptando el contexto cultural',
      descriptionEn: 'Translates adapting cultural context',
      systemPrompt:  'Eres un traductor profesional con especialización en comunicación intercultural. No traduces literalmente — adaptas el texto al contexto cultural del idioma de destino. Mantienes el tono, registro y nivel de formalidad del original. Cuando hay expresiones idiomáticas, buscas el equivalente cultural más adecuado.',
      emoji:         '🌍',
      color:         '#34D399',
      category:      'writing',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_analyst',
      name:          'Analista de negocio',
      nameEn:        'Business analyst',
      description:   'Análisis estratégico, briefs y propuestas',
      descriptionEn: 'Strategic analysis, briefs and proposals',
      systemPrompt:  'Eres un consultor de estrategia empresarial con experiencia en startups y empresas establecidas. Analizas situaciones de negocio con pensamiento crítico y estructurado. Tus análisis son concisos, basados en datos cuando los hay, y siempre orientados a la acción. Identificas riesgos, oportunidades y recomiendas pasos concretos.',
      emoji:         '📊',
      color:         '#818CF8',
      category:      'sales',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_creative',
      name:          'Creativo digital',
      nameEn:        'Digital creative',
      description:   'Naming, conceptos e ideas disruptivas',
      descriptionEn: 'Naming, concepts and disruptive ideas',
      systemPrompt:  'Eres un director creativo digital con experiencia en branding y marketing. Piensas de forma no convencional y generas ideas originales. Para el naming, propones opciones variadas: descriptivas, evocadoras, inventadas y combinadas. Siempre justificas brevemente cada concepto y piensas en su potencial de marca y disponibilidad digital.',
      emoji:         '🎨',
      color:         '#FB923C',
      category:      'marketing',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    },
    {
      id:            'default_coach',
      name:          'Coach de comunicación',
      nameEn:        'Communication coach',
      description:   'Mensajes empáticos y asertivos',
      descriptionEn: 'Empathetic and assertive messages',
      systemPrompt:  'Eres un coach de comunicación y relaciones interpersonales. Ayudas a expresar ideas con claridad, empatía y asertividad. Tus mensajes construyen relaciones, no las deterioran. Adaptas el tono al contexto: profesional, personal, delicado. Cuando la situación lo requiere, ayudas a decir cosas difíciles de forma constructiva.',
      emoji:         '🤝',
      color:         '#C4B5FD',
      category:      'custom',
      isDefault:     true,
      isPinned:      false,
      usageCount:    0,
      createdAt:     0
    }
  ];

  // ── Helpers internos ────────────────────────────────────────────────────

  function loadLibrary() {
    return Storage.get(STORAGE_KEY, null);
  }

  function saveLibrary(library) {
    return Storage.set(STORAGE_KEY, library);
  }

  function loadActiveSkills() {
    return Storage.get(ACTIVE_STORAGE_KEY, {});
  }

  function saveActiveSkills(active) {
    return Storage.set(ACTIVE_STORAGE_KEY, active);
  }

  // ── API pública ─────────────────────────────────────────────────────────
  return {

    /**
     * Inicializa la biblioteca.
     * Si no existe, carga los 10 skills por defecto.
     * Llamar en app.js al arranque.
     */
    init() {
      const existing = loadLibrary();
      if (!existing) {
        const now = Date.now();
        const defaults = DEFAULT_SKILLS.map(s => ({ ...s, createdAt: now }));
        saveLibrary(defaults);
      }
    },

    /** Devuelve todos los skills ordenados: pinned primero, luego por uso desc */
    getAll() {
      const library = loadLibrary() || [];
      return [...library].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.usageCount || 0) - (a.usageCount || 0);
      });
    },

    /** Devuelve skills filtrados por categoría */
    getByCategory(category) {
      return this.getAll().filter(s => s.category === category);
    },

    /** Devuelve un skill por id */
    getById(id) {
      const library = loadLibrary() || [];
      return library.find(s => s.id === id) || null;
    },

    /** Crea un skill nuevo */
    create(data) {
      const library = loadLibrary() || [];
      if (library.length >= MAX_SKILLS) {
        return { ok: false, error: 'MAX_SKILLS_REACHED' };
      }

      if (!data.name?.trim())         return { ok: false, error: 'NAME_REQUIRED' };
      if (!data.systemPrompt?.trim()) return { ok: false, error: 'PROMPT_REQUIRED' };
      if (data.name.length > 30)      return { ok: false, error: 'NAME_TOO_LONG' };

      const skill = {
        id:            Utils.uuid(),
        name:          data.name.trim(),
        nameEn:        data.nameEn?.trim() || data.name.trim(),
        description:   data.description?.trim() || '',
        descriptionEn: data.descriptionEn?.trim() || data.description?.trim() || '',
        systemPrompt:  data.systemPrompt.trim(),
        emoji:         data.emoji || '⚡',
        color:         data.color || '#7C3AED',
        category:      data.category || 'custom',
        isDefault:     false,
        isPinned:      false,
        usageCount:    0,
        createdAt:     Date.now()
      };

      library.push(skill);
      saveLibrary(library);
      document.dispatchEvent(new CustomEvent('skills:created', { detail: { id: skill.id } }));
      return { ok: true, skill };
    },

    /** Actualiza un skill existente (no modifica isDefault) */
    update(id, data) {
      const library = loadLibrary() || [];
      const idx = library.findIndex(s => s.id === id);
      if (idx === -1) return { ok: false, error: 'NOT_FOUND' };

      if (data.name !== undefined && !data.name.trim()) return { ok: false, error: 'NAME_REQUIRED' };
      if (data.name?.length > 30) return { ok: false, error: 'NAME_TOO_LONG' };

      const updated = {
        ...library[idx],
        ...data,
        id:        id,
        isDefault: library[idx].isDefault
      };

      library[idx] = updated;
      saveLibrary(library);
      document.dispatchEvent(new CustomEvent('skills:updated', { detail: { id } }));
      return { ok: true, skill: updated };
    },

    /**
     * Elimina un skill.
     * Los skills con isDefault: true NO son eliminables.
     */
    delete(id) {
      const library = loadLibrary() || [];
      const skill = library.find(s => s.id === id);

      if (!skill)          return { ok: false, error: 'NOT_FOUND' };
      if (skill.isDefault) return { ok: false, error: 'CANNOT_DELETE_DEFAULT' };

      const filtered = library.filter(s => s.id !== id);
      saveLibrary(filtered);

      // Limpiar referencias en active_skill
      const active = loadActiveSkills();
      Object.keys(active).forEach(toolId => {
        if (active[toolId] === id) delete active[toolId];
      });
      saveActiveSkills(active);

      document.dispatchEvent(new CustomEvent('skills:deleted', { detail: { id } }));
      return { ok: true };
    },

    /** Fija/desfija un skill */
    togglePin(id) {
      const library = loadLibrary() || [];
      const idx = library.findIndex(s => s.id === id);
      if (idx === -1) return false;
      library[idx].isPinned = !library[idx].isPinned;
      saveLibrary(library);
      return library[idx].isPinned;
    },

    /**
     * Devuelve el skill activo para un tool concreto.
     * toolId: 'chat' | 'editor' | 'generator' | etc.
     */
    getActive(toolId) {
      const active = loadActiveSkills();
      const skillId = active[toolId];
      if (!skillId) return null;
      return this.getById(skillId);
    },

    /**
     * Establece el skill activo para un tool.
     * skillId = null → sin skill (comportamiento base del tool).
     */
    setActive(toolId, skillId) {
      const active = loadActiveSkills();
      if (skillId === null) {
        delete active[toolId];
      } else {
        const skill = this.getById(skillId);
        if (!skill) return false;
        active[toolId] = skillId;
        this._incrementUsage(skillId);
      }
      saveActiveSkills(active);
      document.dispatchEvent(new CustomEvent('skills:active-changed', {
        detail: { toolId, skillId }
      }));
      return true;
    },

    /**
     * Devuelve el system prompt para inyectar en un tool.
     * Incluye siempre la instrucción de idioma + skill activo + base prompt.
     */
    buildSystemPrompt(toolId, basePrompt) {
      const skill = this.getActive(toolId);
      const langInstruction = Providers.getLangInstruction();
      const parts = [langInstruction];

      if (skill && skill.systemPrompt) {
        parts.push(skill.systemPrompt);
      }

      if (basePrompt) {
        parts.push(basePrompt);
      }

      return parts.join('\n\n');
    },

    /** Incrementa el contador de uso de un skill */
    _incrementUsage(id) {
      const library = loadLibrary() || [];
      const idx = library.findIndex(s => s.id === id);
      if (idx !== -1) {
        library[idx].usageCount = (library[idx].usageCount || 0) + 1;
        saveLibrary(library);
      }
    },

    /** Devuelve categorías disponibles */
    getCategories() {
      return [
        { id: 'custom',    label: 'General',    labelEn: 'General'     },
        { id: 'marketing', label: 'Marketing',  labelEn: 'Marketing'   },
        { id: 'sales',     label: 'Ventas',     labelEn: 'Sales'       },
        { id: 'writing',   label: 'Escritura',  labelEn: 'Writing'     },
        { id: 'dev',       label: 'Desarrollo', labelEn: 'Development' },
        { id: 'legal',     label: 'Legal',      labelEn: 'Legal'       }
      ];
    }
  };
})();

window.Skills = Skills;
