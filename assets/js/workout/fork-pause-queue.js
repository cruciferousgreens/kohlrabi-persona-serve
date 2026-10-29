 
 





































































































(function () {
  'use strict';

   

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

   
  function isIsoDate(value) {
    if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }

   

  function dayNum(iso) {
    if (!isIsoDate(iso)) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

   

  function forkDaysBetween(fromIso, toIso) {
    const a = dayNum(fromIso), b = dayNum(toIso);
    if (a === null || b === null) return null;
    return b - a;
  }

  function clampInt(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }

   


  function clone(value) {
    return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
  }

   













  function forkProgramWeekAnchorIso(program) {
    if (!program || typeof program !== 'object') return null;
    const runFloor = typeof program.forkRunStart === 'string' ? program.forkRunStart : null;
    let first = null;
    try {
      const completed = (typeof workoutState !== 'undefined' && workoutState && Array.isArray(workoutState.completed))
        ? workoutState.completed : [];
      for (const log of completed) {
        if (!log || log.programId !== program.id) continue;
        const d = typeof log.isoDate === 'string' ? log.isoDate : (typeof log.date === 'string' ? log.date : null);
        if (!isIsoDate(d)) continue;
        if (runFloor && d < runFloor) continue;
        if (first === null || d < first) first = d;
      }
    } catch (_) {   }
    if (first !== null) return first;
    return isIsoDate(program.startedAt) ? program.startedAt : null;
  }

   









  function forkEffectiveProgramWeek(program, dateIso) {
    if (!program || typeof program !== 'object') return null;
    const point = dayNum(dateIso);
    const start = dayNum(forkProgramWeekAnchorIso(program));
    if (point === null || start === null) return 1;
    const length = Number(program.length) > 0 ? Math.floor(Number(program.length)) : 1;
    const elapsedCalendar = Math.max(0, point - start);
    return clampInt(1 + Math.floor(elapsedCalendar / 7), 1, length);
  }

   














   

  function forkDeloadState(program) {
    if (!program || typeof program !== 'object') return { weeks: [] };
    const raw = program.forkDeload;
    const list = raw && Array.isArray(raw.weeks) ? raw.weeks : [];
    const weeks = [...new Set(list
      .map(w => Math.floor(Number(w)))
      .filter(w => Number.isFinite(w) && w >= 1))].sort((a, b) => a - b);
    return { weeks };
  }

   

  function forkIsDeloadWeek(program, week) {
    const w = Math.floor(Number(week));
    if (!Number.isFinite(w) || w < 1) return false;
    return forkDeloadState(program).weeks.includes(w);
  }

   


  function forkMarkDeloadWeek(program, week) {
    if (!program || typeof program !== 'object') return program;
    const next = clone(program);
    const state = forkDeloadState(next);
    const w = Math.floor(Number(week));
    if (Number.isFinite(w) && w >= 1 && !state.weeks.includes(w)) state.weeks.push(w);
    state.weeks.sort((a, b) => a - b);
    next.forkDeload = state;
    return next;
  }

   


  function forkClearDeloadWeek(program, week) {
    if (!program || typeof program !== 'object') return program;
    const next = clone(program);
    const state = forkDeloadState(next);
    const w = Math.floor(Number(week));
    next.forkDeload = { weeks: state.weeks.filter(x => x !== w) };
    return next;
  }

   










  function forkDeloadSessionScale(draft) {
    if (!draft || draft.editingId || !draft.programId) return null;
    const program = (typeof workoutState !== 'undefined' && workoutState) ? workoutState.activeProgram : null;
    if (!program || program.id !== draft.programId) return null;
    const dateStr = (typeof draft.date === 'string' && draft.date) ? draft.date
      : (typeof localIsoDate === 'function' ? localIsoDate() : null);
    const week = forkEffectiveProgramWeek(program, dateStr);
    if (!(week > 0)) return null;
    return (typeof forkDeloadScaleForWeek === 'function') ? forkDeloadScaleForWeek(program, week) : null;
  }

   

  const QUEUE_ACTIONS = ['completed', 'skipped', 'do-today', 'push-week', 'unskipped'];

  function sanitizeQueue(raw, fallbackOrder) {
    const order = (Array.isArray(raw && raw.order) ? raw.order : fallbackOrder || [])
      .filter(uid => typeof uid === 'string' && uid);
    const entries = (Array.isArray(raw && raw.entries) ? raw.entries : [])
      .filter(e => e && QUEUE_ACTIONS.includes(e.action) && isIsoDate(e.date))
      .map(e => ({ uid: typeof e.uid === 'string' ? e.uid : null, action: e.action, date: e.date }));
    const cursorRaw = Math.floor(Number(raw && raw.cursor) || 0);
    const pendingRaw = raw && raw.pending;
    const pending = pendingRaw && typeof pendingRaw.uid === 'string' && order.includes(pendingRaw.uid) && isIsoDate(pendingRaw.date)
      ? { uid: pendingRaw.uid, date: pendingRaw.date } : null;
    return {
      order,
      cursor: order.length ? ((cursorRaw % order.length) + order.length) % order.length : 0,
      entries,
      pushedWeeks: Math.max(0, Math.floor(Number(raw && raw.pushedWeeks) || 0)),
      pending,
    };
  }

   
  function forkQueueInit(program) {
    const order = (Array.isArray(program && program.workouts) ? program.workouts : [])
      .map(w => w && w.uid).filter(uid => typeof uid === 'string' && uid);
    return sanitizeQueue(null, order);
  }

   


  function forkQueueState(programOrQueue) {
    if (!programOrQueue || typeof programOrQueue !== 'object') return sanitizeQueue(null, []);
    if (Array.isArray(programOrQueue.workouts)) {
      return sanitizeQueue(programOrQueue.forkQueue, forkQueueInit(programOrQueue).order);
    }
    return sanitizeQueue(programOrQueue, []);
  }

   


  function forkWithQueue(program, queue) {
    if (!program || typeof program !== 'object') return program;
    const next = clone(program);
    next.forkQueue = forkQueueState(queue);
    return next;
  }

  function forkNextUpUid(queue) {
    const q = forkQueueState(queue);
    return q.order.length ? q.order[q.cursor] : null;
  }

  function forkQueuePending(queue) {
    const q = forkQueueState(queue);
    return q.pending ? { ...q.pending } : null;
  }

   
  function forkQueueScheduleOffsetDays(queue) {
    return forkQueueState(queue).pushedWeeks * 7;
  }

   














  function forkQueueSkip(queue, uid, dateIso, logCompletions) {
    const q = forkQueueState(queue);
    if (!q.order.length || !isIsoDate(dateIso) || uid !== forkQueuePassState(q, logCompletions).nextUid) return q;
    q.entries = [...q.entries, { uid, action: 'skipped', date: dateIso }];
    if (q.pending && q.pending.uid === uid) q.pending = null;
    q.cursor = (q.cursor + 1) % q.order.length;
    return q;
  }

   



  function forkQueueDoToday(queue, uid, dateIso) {
    const q = forkQueueState(queue);
    if (!q.order.length || !isIsoDate(dateIso) || uid !== q.order[q.cursor]) return q;
    q.entries = [...q.entries, { uid, action: 'do-today', date: dateIso }];
    q.pending = { uid, date: dateIso };
    return q;
  }

   


  function forkQueuePushWeek(queue, dateIso) {
    const q = forkQueueState(queue);
    if (!q.order.length || !isIsoDate(dateIso)) return q;
    q.pushedWeeks += 1;
    q.entries = [...q.entries, { uid: null, action: 'push-week', date: dateIso }];
    return q;
  }

   




  function forkQueueComplete(queue, uid, dateIso) {
    const q = forkQueueState(queue);
    if (!q.order.length || !isIsoDate(dateIso) || !q.order.includes(uid)) return q;
    q.entries = [...q.entries, { uid, action: 'completed', date: dateIso }];
    if (q.pending && q.pending.uid === uid) q.pending = null;
    if (uid === q.order[q.cursor]) q.cursor = (q.cursor + 1) % q.order.length;
    return q;
  }

   












  function forkQueuePassEvents(q, logCompletions) {
    const recorded = new Set(q.entries
      .filter(e => e.action === 'completed' && e.uid)
      .map(e => e.uid + '|' + e.date));
    const fromLogs = (Array.isArray(logCompletions) ? logCompletions : [])
      .filter(c => c && typeof c.uid === 'string' && q.order.includes(c.uid)
        && isIsoDate(c.date) && !recorded.has(c.uid + '|' + c.date))
      .map(c => ({ uid: c.uid, action: 'completed', date: c.date }));
    if (!fromLogs.length) return q.entries;
    return [...q.entries, ...fromLogs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

   

















   









   



























  function replayPassEvents(q, logCompletions, asOfIso) {
    const resolved = {};
    let passes = 0;
    let anchor = -1;
    const asOf = isIsoDate(asOfIso) ? asOfIso : null;
    for (const e of forkQueuePassEvents(q, logCompletions)) {
      if (asOf && e.date > asOf) continue;
      if (!e.uid || !q.order.includes(e.uid)) continue;
      const i = q.order.indexOf(e.uid);
      if (e.action === 'completed') {
        if (i > anchor) {
          for (let j = anchor + 1; j < i; j++) {
            if (!resolved[q.order[j]]) resolved[q.order[j]] = 'passed';
          }
          anchor = i;
        }
        resolved[e.uid] = 'completed';
      }
      else if (e.action === 'skipped') { if (resolved[e.uid] !== 'completed') resolved[e.uid] = 'skipped'; }
      else if (e.action === 'unskipped') { if (resolved[e.uid] === 'skipped') delete resolved[e.uid]; }
      if (q.order.length && q.order.every(u => resolved[u])) {
        passes++;
        for (const u of q.order) delete resolved[u];
        anchor = -1;
      }
    }
    return { resolved, passes, anchor };
  }

  function forkQueuePassState(queue, logCompletions) {
    const q = forkQueueState(queue);
    const { resolved, anchor } = replayPassEvents(q, logCompletions, null);
     




    const open = q.order.filter(u => !resolved[u]);
    const nextUid = open.find(u => q.order.indexOf(u) > anchor) || open[0] || null;
    const publicResolved = {};
    for (const u of q.order) {
      if (resolved[u] === 'completed' || resolved[u] === 'skipped') publicResolved[u] = resolved[u];
    }
    return { resolved: publicResolved, nextUid, cursor: nextUid ? q.order.indexOf(nextUid) : 0 };
  }

   








  function forkQueueCompletedPasses(queue, logCompletions, asOfIso) {
    const q = forkQueueState(queue);
    if (!q.order.length) return 0;
    return replayPassEvents(q, logCompletions, asOfIso || null).passes;
  }

   

  function forkQueueDeriveCursor(queue, logCompletions) {
    return forkQueuePassState(queue, logCompletions).cursor;
  }

   



  function forkQueueDerivedNextUid(queue, logCompletions) {
    return forkQueuePassState(queue, logCompletions).nextUid;
  }

   









  function forkQueueUnskip(queue, uid, dateIso, logCompletions) {
    const q = forkQueueState(queue);
    if (!q.order.length || !isIsoDate(dateIso) || !q.order.includes(uid)) return q;
     


    if (forkQueuePassState(q, logCompletions).resolved[uid] !== 'skipped') return q;
    q.entries = [...q.entries, { uid, action: 'unskipped', date: dateIso }];
    return q;
  }

   




  function forkQueueAdherence(queue) {
    const q = forkQueueState(queue);
    const count = action => q.entries.filter(e => e.action === action).length;
    const completed = count('completed');
    const skipped = count('skipped');
    return {
      completed,
      skipped,
      doToday: count('do-today'),
      weekPushes: q.pushedWeeks,
      resolved: completed + skipped,
      recorded: q.entries.length,
    };
  }

  const api = {
    forkDaysBetween,
    forkDeloadState,
    forkIsDeloadWeek,
    forkMarkDeloadWeek,
    forkClearDeloadWeek,
    forkDeloadSessionScale,
    forkEffectiveProgramWeek,
    forkProgramWeekAnchorIso,
    forkQueueInit,
    forkQueueState,
    forkWithQueue,
    forkNextUpUid,
    forkQueuePending,
    forkQueueScheduleOffsetDays,
    forkQueueSkip,
    forkQueueDoToday,
    forkQueuePushWeek,
    forkQueueComplete,
    forkQueuePassState,
    forkQueueCompletedPasses,
    forkQueueDeriveCursor,
    forkQueueDerivedNextUid,
    forkQueueUnskip,
    forkQueueAdherence,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  const root = typeof globalThis !== 'undefined' ? globalThis : null;
  if (root) for (const [name, value] of Object.entries(api)) root[name] = value;
  if (typeof window !== 'undefined') for (const [name, value] of Object.entries(api)) window[name] = value;
})();
//# sourceMappingURL=fork-pause-queue.js.map
