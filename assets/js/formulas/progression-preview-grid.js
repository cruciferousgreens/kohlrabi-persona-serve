 
 





































































































































 
const FORK_PREVIEW_GRID_DEFAULTS = {
  scheme: 'linear', min: 6, max: 12, incrementType: 'lb', incrementValue: 5,
};

 

function forkPreviewGridNum(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

 
function forkPreviewGridField(sources, key) {
  for (const src of sources) {
    if (src && typeof src === 'object') {
      const v = src[key];
      if (v !== undefined && v !== null && v !== '') return v;
    }
  }
  return undefined;
}

 

function forkPreviewGridFmt(n) {
  return String(Math.round(Number(n) * 1000) / 1000);
}

 
function forkPreviewGridLabel(weight, reps) {
  if (weight != null && weight > 0 && reps != null) {
    return forkPreviewGridFmt(weight) + ' × ' + forkPreviewGridFmt(reps);
  }
  if (weight != null && weight > 0) return forkPreviewGridFmt(weight);
  if (reps != null) return forkPreviewGridFmt(reps) + ' reps';
  return '—';
}

 



function forkPreviewGridAssumptions(sessionsPerWeek) {
  const schedule = sessionsPerWeek === 1
    ? 'Each program workout occurs once per week, in the order listed in the program.'
    : 'Each program workout occurs ' + sessionsPerWeek + ' times per week, in the order listed in the program; each weekly cell shows that week\'s last session target.';
  return [
    schedule,
     




    'Week-by-week changes (waves, deload weeks) follow the calendar week a session happens in, not its place in the rotation.',
     



    'Targets start from the most recent top set supplied in histories; week 1 is the next session after that top set.',
    'Linear targets add the increment every session; RPE targets add a rep until the top of the range, then add the increment and reset reps to the bottom of the range.',
    'Cells that cannot be stated exactly — no usable history, or %1RM work with no Training Max set — show a status instead of a target, never a guessed number.',
  ];
}

 

function forkPreviewGridProfile(entry, program, config) {
  const defaults = (config && (config.defaults || config.defaultProgression || config.progression)) || null;
  const sources = [
    entry && entry.progression,
    program && program.progression,
    defaults,
  ];
  const schemeRaw = forkPreviewGridField(sources, 'scheme');
  const scheme = (typeof schemeRaw === 'string' && schemeRaw.trim())
    ? schemeRaw.trim().toLowerCase().replace(/\s+/g, '')
    : FORK_PREVIEW_GRID_DEFAULTS.scheme;
  const minNum = forkPreviewGridNum(forkPreviewGridField(sources, 'min'));
  const maxRaw = forkPreviewGridField(sources, 'max');
  const maxNum = forkPreviewGridNum(maxRaw);
  const openTop = forkPreviewGridField(sources, 'openTop') === true;
   






  let explicitOpenMax = false;
  for (const src of sources) {
    if (src && typeof src === 'object' && src.max !== undefined && src.max !== '') {
      explicitOpenMax = src.max === null && src.amrap !== true;
      break;
    }
  }
   
  const max = ((openTop && maxRaw === undefined) || (explicitOpenMax && minNum != null))
    ? Infinity
    : (maxNum != null ? maxNum : FORK_PREVIEW_GRID_DEFAULTS.max);
  const incTypeRaw = forkPreviewGridField(sources, 'incrementType');
  const incValNum = forkPreviewGridNum(forkPreviewGridField(sources, 'incrementValue'));
  const modeRaw = (entry && (entry.tracking || entry.mode))
    || forkPreviewGridField(sources, 'mode');
   








  const entryProg = (entry && entry.progression) || null;
  const programProg = (program && program.progression) || null;
  const tmNum = forkPreviewGridNum(forkPreviewGridField([entryProg], 'trainingMax'))
    ?? forkPreviewGridNum(forkPreviewGridField([entryProg], 'manual1RM'));
  let topPct = null, topReps = null;
  const entrySets = (entry && Array.isArray(entry.sets)) ? entry.sets : [];
  for (const s of entrySets) {
    if (!s || typeof s !== 'object') continue;
    const tags = Array.isArray(s.tags) ? s.tags : [];
    if (tags.some(t => String(t).toLowerCase() === 'warmup')) continue;
    const p = forkPreviewGridPctOrNull(s.pct);
    if (p != null && (topPct == null || p > topPct)) {
      topPct = p;
      const r = forkPreviewGridNum(s.r != null ? s.r : s.reps);
      topReps = r != null && r > 0 ? r : null;
    }
  }
  return {
    scheme,
    min: minNum != null ? minNum : FORK_PREVIEW_GRID_DEFAULTS.min,
    max,
    incrementType: (typeof incTypeRaw === 'string' && incTypeRaw) ? incTypeRaw : FORK_PREVIEW_GRID_DEFAULTS.incrementType,
    incrementValue: incValNum != null ? incValNum : FORK_PREVIEW_GRID_DEFAULTS.incrementValue,
    repsOnly: forkPreviewGridField(sources, 'repsOnly') === true,
    mode: (typeof modeRaw === 'string' && modeRaw) ? modeRaw.trim().toLowerCase() : null,
    trainingMax: tmNum != null && tmNum > 0 ? tmNum : null,
    itemPercentOf1RM: forkPreviewGridPctOrNull(entryProg && entryProg.percentOf1RM),
    programPercentOf1RM: forkPreviewGridPctOrNull(forkPreviewGridField([programProg, defaults], 'percentOf1RM')),
    pctWave: forkPreviewGridField([programProg, defaults], 'pctWave') === true,
    weeklyPcts: forkPreviewGridField([programProg, defaults], 'weeklyPcts'),
    weeklyDeloads: forkPreviewGridField([programProg, defaults], 'weeklyDeloads'),
    deloadPct: (() => {
      const d = forkPreviewGridNum(forkPreviewGridField([programProg, defaults], 'deloadPct'));
      return d != null && d > 0 ? Math.min(80, Math.max(40, Math.round(d * 100) / 100)) : 60;
    })(),
    topPct,
    topReps,
  };
}

 


function forkPreviewGridPctOrNull(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(100, Math.max(1, Math.round(n * 100) / 100)) : null;
}

 


function forkPreviewGridWeekPct(profile, week) {
  if (!profile.pctWave) return null;
  const arr = profile.weeklyPcts;
  if (!Array.isArray(arr) || !arr.length) return null;
  const w = Math.max(1, Number(week) || 1);
  return forkPreviewGridPctOrNull(arr[(w - 1) % arr.length]);
}

 

function forkPreviewGridIsDeloadWeek(profile, week) {
  if (!profile.pctWave) return false;
  const flags = profile.weeklyDeloads;
  const w = Math.max(1, Number(week) || 0);
  return Array.isArray(flags) && flags.length > 0 && !!flags[(w - 1) % flags.length];
}

 





function forkPreviewGridSnapPct(raw, profile) {
  if (!(raw > 0)) return 0;
  if (profile.incrementType === 'pct' || profile.incrementType === 'percent') {
    return Math.round(raw / 5) * 5;
  }
  const v = profile.incrementValue;
  if (!(v > 0)) return Math.round(raw);
  return Math.round(raw / v) * v;
}

 



function forkPreviewGridResolvePct(profile, week) {
  return profile.topPct
    ?? profile.itemPercentOf1RM
    ?? forkPreviewGridWeekPct(profile, week)
    ?? profile.programPercentOf1RM
    ?? 75;
}

 
function forkPreviewGridHistory(histories, exerciseId) {
  if (exerciseId == null || histories == null) return undefined;
  if (typeof Map !== 'undefined' && histories instanceof Map) return histories.get(exerciseId);
  if (Array.isArray(histories)) {
    return histories.find(h => h && (h.exerciseId === exerciseId || h.id === exerciseId));
  }
  if (typeof histories === 'object') return histories[exerciseId];
  return undefined;
}

 







function forkPreviewGridCells(profile, history, weeks, sessionsPerWeek) {
   






  const hWeight = history && typeof history === 'object'
    ? forkPreviewGridNum(history.weight != null ? history.weight : history.w)
    : null;
  const hRepsRaw = history && typeof history === 'object'
    ? forkPreviewGridNum(history.reps != null ? history.reps : history.r)
    : null;
  const hReps = hRepsRaw != null && hRepsRaw > 0 ? hRepsRaw : null;
  const fromPrescription = !!(history && typeof history === 'object' && history.prescription === true);

   







  const rxCell = fromPrescription && (hWeight > 0 || hReps != null)
    ? { week: 1, status: 'ok', weight: hWeight > 0 ? hWeight : null, reps: hReps,
        label: forkPreviewGridLabel(hWeight > 0 ? hWeight : null, hReps) }
    : null;

  const statusCells = (status, label, reason) => {
    const cells = [];
    for (let week = 1; week <= weeks; week++) {
      if (rxCell && week === 1) { cells.push(rxCell); continue; }
      const cell = { week, status, weight: null, reps: null, label };
      if (reason) cell.reason = reason;
      cells.push(cell);
    }
    return cells;
  };

   










  if ((profile.scheme === 'onerm' || profile.scheme === '%1rm' || profile.scheme === 'percent' || profile.scheme === 'percentage')
      && profile.mode !== 'time' && profile.mode !== 'seconds'
      && profile.trainingMax != null && profile.trainingMax > 0) {
    const reps = profile.topReps != null
      ? profile.topReps
      : (hReps != null
        ? Math.min(Number.isFinite(profile.max) ? profile.max : hReps, Math.max(profile.min, hReps))
        : profile.min);
    const cells = [];
    for (let week = 1; week <= weeks; week++) {
      const pct = forkPreviewGridResolvePct(profile, week);
      let w = forkPreviewGridSnapPct(profile.trainingMax * pct / 100, profile);
      if (forkPreviewGridIsDeloadWeek(profile, week)) {
        w = forkPreviewGridSnapPct(w * profile.deloadPct / 100, profile);
      }
      cells.push({
        week,
        status: 'ok',
        weight: w > 0 ? w : null,
        reps,
        label: forkPreviewGridLabel(w > 0 ? w : null, reps),
      });
    }
    return cells;
  }

  if (!history || typeof history !== 'object' || !(hWeight > 0 || hReps != null)) {
    return statusCells('no-history', 'No history yet');
  }

   
  const scheme = profile.scheme;
  if (profile.mode === 'time' || profile.mode === 'seconds' || scheme === 'time') {
    return statusCells('unstated', 'Not previewable', 'time');
  }
  if (scheme === 'onerm' || scheme === '%1rm' || scheme === 'percent' || scheme === 'percentage') {
    return statusCells('unstated', 'Not previewable', 'onerm');
  }
  if (scheme === 'off') return statusCells('unstated', 'Not previewable', 'off');
  if (scheme === 'holds' || scheme === 'hold') return statusCells('unstated', 'Not previewable', 'holds');
  if (scheme !== 'linear' && scheme !== 'rpe' && scheme !== 'bodyweight') {
    return statusCells('unstated', 'Not previewable', scheme || 'unknown-scheme');
  }
  if (scheme === 'linear' && !profile.repsOnly && !(hWeight > 0)) {
     
    return statusCells('unstated', 'Not previewable', 'no-load');
  }
  if (scheme !== 'linear' || profile.repsOnly) {
     

    if (hReps == null) return statusCells('unstated', 'Not previewable', 'missing-reps');
    if (!profile.repsOnly && profile.max < profile.min) {
      return statusCells('unstated', 'Not previewable', 'invalid-range');
    }
  }

  const isPct = profile.incrementType === 'pct';
  const incValue = profile.incrementValue;
  let curWeight = hWeight > 0 ? hWeight : 0;
  let curReps = hReps;
   












  if (!fromPrescription && scheme === 'linear' && !profile.repsOnly
      && Number.isFinite(profile.max) && curReps != null && curReps > profile.max) {
    curReps = profile.max;
  }
   























  let seedFirst = false;
  if (!fromPrescription && scheme === 'linear' && !profile.repsOnly
      && Number.isFinite(profile.max) && curReps != null && curReps < profile.min
      && curWeight > 0) {
    const hRpe = forkPreviewGridNum(history.rpe);
    const rir = hRpe == null ? 0 : Math.max(0, 10 - hRpe);
    if (curReps + rir >= profile.min) {
      curReps = Math.min(profile.max, curReps + rir);  
    } else {
      const e1 = curWeight * (1 + Math.min(curReps + rir, 15) / 30);
      const targetReps = Math.round((profile.min + profile.max) / 2);
      const raw = e1 / (1 + (targetReps + rir) / 30);
      const snap = (up) => isPct
        ? (up ? Math.ceil(raw / 5) : Math.round(raw / 5)) * 5
        : (incValue > 0
          ? (up ? Math.ceil(raw / incValue) : Math.round(raw / incValue)) * incValue
          : (up ? Math.ceil(raw) : Math.round(raw)));
      let seeded = snap(false);
      if (seeded < curWeight) seeded = snap(true);
      curWeight = Math.max(0, seeded);
      curReps = targetReps;
    }
    seedFirst = true;
  }
   





  const totalSessions = weeks * sessionsPerWeek;
  const steps = [];
  for (let i = 0; i < totalSessions; i++) {
    if ((fromPrescription || seedFirst) && i === 0) {
      steps.push({ weight: scheme === 'bodyweight' ? null : (curWeight > 0 ? curWeight : null), reps: curReps });
    } else if (profile.repsOnly) {
      curReps += 1;
      steps.push({ weight: curWeight > 0 ? curWeight : null, reps: curReps });
    } else if (scheme === 'linear') {
      curWeight = isPct
        ? Math.round(curWeight * (1 + incValue / 100) * 2) / 2
        : curWeight + incValue;
      steps.push({ weight: curWeight, reps: curReps });
    } else {
       
      if (curReps < profile.max) {
        curReps += 1;
      } else {
        if (scheme !== 'bodyweight') {
          const inc = isPct
            ? (curWeight > 0 ? Math.round(curWeight * incValue / 100 * 2) / 2 : 0)
            : incValue;
          curWeight = curWeight > 0 ? curWeight + inc : 0;
        }
        curReps = profile.min;
      }
      steps.push({ weight: scheme === 'bodyweight' ? null : (curWeight || null), reps: curReps });
    }
  }

   
  const cells = [];
  for (let week = 1; week <= weeks; week++) {
    const step = steps[week * sessionsPerWeek - 1];
    cells.push({
      week,
      status: 'ok',
      weight: step.weight,
      reps: step.reps,
      label: forkPreviewGridLabel(step.weight, step.reps),
    });
  }
  return cells;
}

 

function forkProgramPreviewGrid(program, histories, config) {
  const cfg = (config && typeof config === 'object') ? config : {};
  const weeksNum = forkPreviewGridNum(cfg.weeks);
  const weeks = weeksNum != null ? Math.min(12, Math.max(1, Math.trunc(weeksNum))) : 4;
  const sppRaw = cfg.sessionsPerWeekPerWorkout != null
    ? cfg.sessionsPerWeekPerWorkout
    : cfg.sessionsPerWeek;
  const sppNum = forkPreviewGridNum(sppRaw);
  const sessionsPerWeek = sppNum != null ? Math.min(7, Math.max(1, Math.trunc(sppNum))) : 1;

  const result = {
    programName: (program && typeof program.name === 'string') ? program.name : '',
    weeks,
    sessionsPerWeekPerWorkout: sessionsPerWeek,
    assumptions: forkPreviewGridAssumptions(sessionsPerWeek),
    rows: [],
  };

  const workouts = (program && Array.isArray(program.workouts)) ? program.workouts : [];
  workouts.forEach((workout, workoutIndex) => {
    if (!workout || typeof workout !== 'object') return;
    const listings = Array.isArray(workout.exercises)
      ? workout.exercises
      : (workout.template && Array.isArray(workout.template.exercises) ? workout.template.exercises : []);
    const workoutName = typeof workout.name === 'string' ? workout.name : '';
    for (const entry of listings) {
      const item = (entry && typeof entry === 'object') ? entry : {};
      const exerciseId = item.exerciseId != null ? item.exerciseId : (item.id != null ? item.id : null);
      const profile = forkPreviewGridProfile(item, program, cfg);
       


      const history = (item.history && typeof item.history === 'object')
        ? item.history
        : forkPreviewGridHistory(histories, exerciseId);
      result.rows.push({
        exerciseId,
        name: (typeof item.name === 'string' && item.name) ? item.name
          : (exerciseId != null ? String(exerciseId) : 'Exercise'),
        workoutName,
        workoutIndex,
        scheme: profile.scheme,
        min: profile.min,
        max: profile.max === Infinity ? null : profile.max,
        incrementType: profile.incrementType,
        incrementValue: profile.incrementValue,
        cells: forkPreviewGridCells(profile, history, weeks, sessionsPerWeek),
      });
    }
  });
  return result;
}
//# sourceMappingURL=progression-preview-grid.js.map
