 
 






























(function () {
  function repMaxE1RM(weight, reps, rpe) {
    const w = Number(weight) || 0, r = Number(reps) || 0;
    if (w <= 0 || r <= 0) return 0;
    const rpeNum = rpe == null || rpe === '' ? NaN : Number(rpe);
    const rir = Number.isFinite(rpeNum) ? Math.max(0, 10 - Math.min(10, Math.max(0, rpeNum))) : 0;
    return w * (1 + Math.min(r + rir, 15) / 30);
  }
  function forkRepMaxTable(logs) {
    const byReps = new Map();
    (Array.isArray(logs) ? logs : []).forEach(log => {
      (log && Array.isArray(log.sets) ? log.sets : []).forEach(set => {
        if (!set) return;  
        const reps = Math.floor(Number(set.r) || 0);
        const w = Number(set.w) || 0;
        if (reps <= 0 || w <= 0) return;
        const e = repMaxE1RM(w, reps, set.rpe);
        const cur = byReps.get(reps);
        if (!cur || w > cur.bestWeight) {
          byReps.set(reps, { reps, bestWeight: w, bestE1RM: Math.max(e, cur ? cur.bestE1RM : 0), date: log.date || null });
        } else if (e > cur.bestE1RM) {
          cur.bestE1RM = e;
        }
      });
    });
    return [...byReps.values()].sort((a, b) => a.reps - b.reps);
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { forkRepMaxTable, repMaxE1RM };
  if (typeof window !== 'undefined') { window.forkRepMaxTable = forkRepMaxTable; window.repMaxE1RM = repMaxE1RM; }
})();
//# sourceMappingURL=rep-max-table.js.map
