 
 














function forkSettingsMatches(text, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return true;
  return String(text || '').toLowerCase().includes(q);
}
if (typeof document !== 'undefined' && document.addEventListener) {
  let forkSearchSavedOpen = null;
  document.addEventListener('input', (event) => {
    if (event.target?.id !== 'forkSettingsSearch') return;
    const q = event.target.value;
    const sections = [...document.querySelectorAll('#settingsView [data-section]')];
    if (q.trim() && !forkSearchSavedOpen) {
      forkSearchSavedOpen = sections.map(s => s.tagName === 'DETAILS' ? s.open : null);
    }
    let anyMatch = false;
    sections.forEach((s, i) => {
       


      if (s.hasAttribute('data-auth-hidden')) { s.hidden = true; return; }
      const match = forkSettingsMatches(s.textContent, q);
      s.hidden = !match;
      if (match) anyMatch = true;
      if (s.tagName === 'DETAILS') {
        if (q.trim()) s.open = match;
        else if (forkSearchSavedOpen) s.open = !!forkSearchSavedOpen[i];
      }
    });
    if (!q.trim()) forkSearchSavedOpen = null;
    const none = document.querySelector('#forkSettingsNoMatch');
    if (none) none.hidden = anyMatch || !q.trim();
  });
}
//# sourceMappingURL=settings-search.js.map
