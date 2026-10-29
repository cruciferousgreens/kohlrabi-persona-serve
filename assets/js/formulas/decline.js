 
 
























































const FORK_DECLINE_MIN_SESSIONS = 3;    
const FORK_DECLINE_RECENT_WINDOW = 3;  
const FORK_DECLINE_DROP_PCT = 5;       
const FORK_DECLINE_TREND_SESSIONS = 4; 
const FORK_DECLINE_TREND_DROP_PCT = 3; 

 











function forkDeclineState(series) {
  const s = (Array.isArray(series) ? series : [])
    .map(Number)
    .filter(v => Number.isFinite(v) && v > 0);
  const none = { declining: false, via: null, sessions: s.length, peak: 0, recentBest: 0, capacity: 0, dropPct: 0 };
  if (s.length < FORK_DECLINE_MIN_SESSIONS) return none;
  const peak = Math.max(...s);
  const recentBest = Math.max(...s.slice(0, FORK_DECLINE_RECENT_WINDOW));
  const dropPct = peak > 0 ? (peak - recentBest) / peak * 100 : 0;
  const out = { declining: false, via: null, sessions: s.length, peak, recentBest, capacity: recentBest, dropPct };
   
  if (dropPct >= FORK_DECLINE_DROP_PCT) { out.declining = true; out.via = 'recent'; return out; }
   


  if (s.length >= FORK_DECLINE_TREND_SESSIONS) {
    const w = s.slice(0, FORK_DECLINE_TREND_SESSIONS);
    let strict = true;
    for (let i = 0; i + 1 < w.length; i++) { if (!(w[i] < w[i + 1])) { strict = false; break; } }
    const slidePct = w[w.length - 1] > 0 ? (w[w.length - 1] - w[0]) / w[w.length - 1] * 100 : 0;
    if (strict && slidePct >= FORK_DECLINE_TREND_DROP_PCT) { out.declining = true; out.via = 'trend'; out.dropPct = Math.max(dropPct, slidePct); }
  }
  return out;
}
//# sourceMappingURL=decline.js.map
