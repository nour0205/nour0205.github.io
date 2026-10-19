(() => {
  const root = document.documentElement;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  let lang = store.get('lang') || (/^fr\b/i.test(navigator.language || 'fr') ? 'fr' : 'en');

  function applyLang() {
    root.dataset.lang = lang;
    root.lang = lang;
    document.querySelectorAll('[data-cv]').forEach(a => {
      a.href = `assets/cv/Nour_Kouider_CV_${lang === 'fr' ? 'FR' : 'EN'}.pdf`;
    });
    document.title = lang === 'fr' ? 'Nour Kouider · IA générative & agents' : 'Nour Kouider · Generative AI & agents';
  }

  document.querySelector('.lang-toggle').addEventListener('click', () => {
    lang = lang === 'fr' ? 'en' : 'fr';
    store.set('lang', lang);
    applyLang();
  });

  applyLang();
})();
