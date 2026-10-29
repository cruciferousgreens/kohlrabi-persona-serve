 
 





function forkSupersetPartner(item, exercises) {
  if (!item?.supersetId) return null;
  return (exercises || []).find(x => x.uid !== item.uid && x.supersetId === item.supersetId && (x.sets || []).some(s => !s.complete)) || null;
}

 





function forkSupersetSideTwin(item, set) {
  const side = typeof setSide === 'function' ? setSide(set) : null;
  if (!side || !item?.sets) return null;
  const i = item.sets.indexOf(set);
  if (i < 0) return null;
  const other = side === 'L' ? 'R' : 'L';
  for (const j of (side === 'L' ? [i + 1, i - 1] : [i - 1, i + 1])) {
    const s = item.sets[j];
    if (s && setSide(s) === other) return s;
  }
  return null;
}

 


function forkSupersetAdvance(item, set) {
  const twin = set ? forkSupersetSideTwin(item, set) : null;
  if (twin && !twin.complete) return;
  const draft = typeof workoutState !== 'undefined' ? workoutState.draft : null;
  const partner = forkSupersetPartner(item, draft?.exercises || []);
  if (!partner || typeof document === 'undefined') return;
  requestAnimationFrame(() => {
    const card = document.querySelector(`[data-workout-exercise="${CSS.escape(partner.uid)}"]`);
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.classList.add('fork-superset-flash');
    setTimeout(() => card.classList.remove('fork-superset-flash'), 1200);
  });
}
//# sourceMappingURL=superset-advance.js.map
