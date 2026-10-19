(() => {
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const css = name => getComputedStyle(root).getPropertyValue(name).trim();
  const dark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => (root.dataset.theme ? root.dataset.theme === 'dark' : dark.matches);

  /* ---------- language ---------- */
  let lang = store.get('lang') || (/^fr\b/i.test(navigator.language || 'fr') ? 'fr' : 'en');
  const t = (fr, en) => (lang === 'fr' ? fr : en);
  function applyLang() {
    root.dataset.lang = lang;
    root.lang = lang;
    $$('[data-cv]').forEach(a => { a.href = `assets/cv/Nour_Kouider_CV_${lang === 'fr' ? 'FR' : 'EN'}.pdf`; });
    document.title = t('Nour Kouider · IA générative & agents', 'Nour Kouider · Generative AI & agents');
  }
  $('.lang-toggle').addEventListener('click', () => {
    lang = lang === 'fr' ? 'en' : 'fr';
    store.set('lang', lang);
    applyLang();
    renderAll();
  });

  /* ---------- mermaid ---------- */
  function initMermaid() {
    if (!window.mermaid) return;
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: 'Inter, system-ui, sans-serif',
      themeVariables: {
        darkMode: isDark(),
        background: css('--surface'),
        primaryColor: css('--surface'),
        primaryTextColor: css('--ink'),
        primaryBorderColor: css('--muted'),
        lineColor: css('--muted'),
        secondaryColor: css('--panel'),
        tertiaryColor: css('--panel'),
        clusterBkg: css('--panel'),
        clusterBorder: css('--muted'),
        fontSize: '13px',
      },
      flowchart: { htmlLabels: true, curve: 'basis' },
    });
  }
  let renderSeq = 0;
  async function draw(el, code) {
    if (!el) return;
    if (!window.mermaid) { el.textContent = code; return; }
    try {
      const { svg } = await window.mermaid.render(`m${++renderSeq}`, code);
      el.innerHTML = svg;
    } catch (err) {
      el.textContent = t('Diagramme indisponible.', 'Diagram unavailable.');
    }
  }

  /* inheritDir demo */
  const inheritToggle = $('#inheritToggle');
  function inheritSource(on) {
    return [
      '---',
      'config:',
      '  flowchart:',
      `    inheritDir: ${on}`,
      '---',
      'flowchart LR',
      '  Q[Question] --> R',
      `  subgraph R[${t('Recherche', 'Retrieval')}]`,
      `    V[${t('Vectorielle', 'Vector')}] --> B[BM25] --> F[RRF]`,
      '  end',
      `  R --> A[${t('Réponse', 'Answer')}]`,
    ].join('\n');
  }
  function renderInherit() {
    const on = inheritToggle.checked;
    $('#inheritValue').textContent = String(on);
    const src = inheritSource(on);
    $('#mermaidSource').innerHTML = src
      .split('\n')
      .map(l => {
        const safe = l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return l.includes('inheritDir') ? `<span class="hl">${safe}</span>` : safe;
      })
      .join('\n');
    return draw($('#mermaidOut'), src);
  }
  inheritToggle.addEventListener('change', renderInherit);

  /* BPMN agent demo */
  const steps = $$('#agentSteps li');
  let cur = 0;
  let decision = null; // 'approved' | 'rejected'
  const status = [
    () => t('Lecture du BPMN : 4 activités, 1 lane, 0 erreur de structure.', 'Reading the BPMN: 4 activities, 1 lane, 0 structural errors.'),
    () => t('Qwen3-8B renvoie une interprétation conforme au schéma.', 'Qwen3-8B returns a schema-valid interpretation.'),
    () => t("A3 → « Rédiger le cahier des charges » : correspondance unique, pas d'ambiguïté.", 'A3 → "Rédiger le cahier des charges": unique match, no ambiguity.'),
    () => t('Plan : insert_task_before · checksum source 9f3c…e1 · prêt pour revue.', 'Plan: insert_task_before · source checksum 9f3c…e1 · ready for review.'),
    () => t('En attente de votre décision. Rien ne sera modifié sans elle.', 'Waiting for your decision. Nothing changes without it.'),
    () => t('Tâche insérée, flux de séquence reconnectés, forme BPMN-DI ajoutée.', 'Task inserted, sequence flows reconnected, BPMN-DI shape added.'),
    () => t('Validation : 0 erreur. Un seul BPMN final écrit dans generated/.', 'Validation: 0 errors. One final BPMN written to generated/.'),
  ];
  function bpmnCode(withNew) {
    const lines = ['flowchart TB', '  S((" ")) --> T1[Saisir la demande]'];
    if (withNew) lines.push('  T1 --> N[Valider la demande]:::new', '  N --> T2[Rédiger le cahier des charges]');
    else lines.push('  T1 --> T2[Rédiger le cahier des charges]');
    lines.push(
      '  T2 --> T3[Publier le dossier] --> E(((" ")))',
      `  classDef new fill:${css('--good-soft')},stroke:${css('--good')},stroke-width:2px,color:${css('--ink')}`,
    );
    if (cur === 2 || cur === 3 || (cur === 4 && !decision)) lines.push(`  style T2 stroke:${css('--warn')},stroke-width:2px`);
    return lines.join('\n');
  }
  function renderAgent() {
    steps.forEach((li, i) => {
      const finished = i === 6 && decision === 'approved' && cur === 6;
      li.classList.toggle('done', i < cur || finished);
      li.classList.toggle('current', i === cur && !finished);
      li.classList.toggle('rejected', i === 4 && decision === 'rejected');
      if (i === 4 && decision === 'rejected') li.classList.remove('current', 'done');
    });
    $('#agentStatus').textContent = decision === 'rejected'
      ? t('Plan rejeté : le modèle reste inchangé. Reformulez la demande ou recommencez.', 'Plan rejected: the model is unchanged. Rephrase the request or restart.')
      : `› ${status[cur]()}`;
    $('#agentNext').disabled = (cur === 4 && !decision) || decision === 'rejected' || cur === 6;
    return draw($('#bpmnOut'), bpmnCode(decision === 'approved' && cur >= 5));
  }
  $('#agentNext').addEventListener('click', () => { if (cur < 6) { cur++; renderAgent(); } });
  $('#agentReset').addEventListener('click', () => { cur = 0; decision = null; renderAgent(); });
  $('#approveBtn').addEventListener('click', () => { decision = 'approved'; cur = 5; renderAgent(); });
  $('#rejectBtn').addEventListener('click', () => { decision = 'rejected'; renderAgent(); });

  /* prompt comparison */
  const prompts = {
    baseline: { g: [5, 19], c: [16, 16], cc: [3, 17], u: [14, 19],
      note: () => t('Couvre tout, mais 14 réponses sur 19 ajoutent des affirmations absentes des notes, souvent avec une citation.', "Covers everything, but 14 of 19 answers add claims the notes don't support, often with a citation attached.") },
    strict1: { g: [19, 19], c: [13.5, 16], cc: [15, 15], u: [0, 19],
      note: () => t('Le plus fidèle, mais il répond trop peu et a refusé une question à laquelle il pouvait répondre.', 'The most grounded, but it under-answers and once refused a question it could answer.') },
    balanced2: { g: [15, 19], c: [15.5, 16], cc: [12, 16], u: [4, 19],
      note: () => t('Retrouve la complétude, mais réintroduit des affirmations non sourcées.', 'Recovers completeness, but reintroduces unsupported claims.') },
    strict2: { g: [18, 19], c: [14.5, 16], cc: [15, 16], u: [1, 19],
      note: () => t("Version en production : le meilleur équilibre mesuré sur ce benchmark, au prix d'un peu de complétude.", 'The version in production: the best measured balance on this benchmark, at a small cost in completeness.') },
  };
  let currentPrompt = 'strict2';
  function renderBars() {
    const p = prompts[currentPrompt];
    const rows = [
      [t('Réponses entièrement sourcées', 'Fully grounded answers'), p.g, false],
      [t('Points requis couverts', 'Required points covered'), p.c, false],
      [t('Citations correctes', 'Correct citations'), p.cc, false],
      [t('Ajouts non sourcés (plus bas = mieux)', 'Unsupported claims (lower is better)'), p.u, true],
    ];
    const host = $('#promptBars');
    if (!host.children.length) {
      host.innerHTML = rows.map(() => '<div class="bar-row"><span class="bar-name"></span><div class="bar-track"><div class="bar-fill"></div></div><span class="bar-val"></span></div>').join('');
    }
    rows.forEach(([name, [a, b], inv], i) => {
      const row = host.children[i];
      const pct = Math.round((a / b) * 100);
      row.querySelector('.bar-name').textContent = name;
      const fill = row.querySelector('.bar-fill');
      fill.classList.toggle('inverse', inv);
      requestAnimationFrame(() => { fill.style.width = `${pct}%`; });
      row.querySelector('.bar-val').textContent = `${pct} %`;
      row.title = `${String(a).replace('.', lang === 'fr' ? ',' : '.')} / ${b}`;
    });
    $('#promptNote').textContent = p.note();
  }
  $$('#promptTabs button').forEach(b => b.addEventListener('click', () => {
    currentPrompt = b.dataset.p;
    $$('#promptTabs button').forEach(x => x.classList.toggle('on', x === b));
    renderBars();
  }));

  /* emotion timeline (illustrative) */
  const EMO = { neutral: '#6b7378', happy: '#a8741a', sad: '#2f5d8a', angry: '#9a3b34' };
  const timeline = [
    ['neutral', 0, 2.5, 0.81], ['happy', 2.5, 6, 0.88], ['neutral', 6, 7.5, 0.72],
    ['sad', 7.5, 10.5, 0.84], ['angry', 10.5, 12.5, 0.79], ['happy', 12.5, 15, 0.9],
  ];
  const TOTAL = 15;
  const track = $('#emoTrack');
  track.innerHTML = timeline.map(([e, s, en]) =>
    `<div class="emo-seg" style="flex:${en - s};background:${EMO[e]}">${e}</div>`).join('') + '<div class="emo-head" id="emoHead"></div>';
  const head = $('#emoHead');
  const now = $('#emoNow');
  function setTime(sec) {
    const seg = timeline.find(([, s, e]) => sec >= s && sec < e) || timeline[timeline.length - 1];
    const [emo, , , conf] = seg;
    head.style.left = `calc(${(sec / TOTAL) * 100}% - 1px)`;
    now.textContent = `${sec.toFixed(1)} s · ${emo} · ${t('confiance', 'confidence')} ${Math.round(conf * 100)} %`;
  }
  let raf = null;
  $('#emoPlay').addEventListener('click', () => {
    if (raf) cancelAnimationFrame(raf);
    const start = performance.now();
    const speed = 2; // 15 s of audio in 7.5 s
    const tick = nowT => {
      const sec = Math.min(TOTAL - 0.01, ((nowT - start) / 1000) * speed);
      setTime(sec);
      raf = sec < TOTAL - 0.01 ? requestAnimationFrame(tick) : null;
    };
    raf = requestAnimationFrame(tick);
  });
  track.addEventListener('click', ev => {
    const r = track.getBoundingClientRect();
    setTime(Math.max(0, Math.min(TOTAL - 0.01, ((ev.clientX - r.left) / r.width) * TOTAL)));
  });

  /* ---------- render ---------- */
  async function renderAll() {
    initMermaid();
    renderBars();
    setTime(0);
    await renderInherit();
    await renderAgent();
  }
  dark.addEventListener?.('change', renderAll);
  applyLang();
  renderAll();
})();
