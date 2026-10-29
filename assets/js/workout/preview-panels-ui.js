 
 


























































 

function forkPanelEscapeHtml(text) {
  return String(text == null ? '' : text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

 
function forkPanelEsc(text) {
  return typeof escapeHtml === 'function' ? escapeHtml(text) : forkPanelEscapeHtml(text);
}

 

function forkPanelNum(value) {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function forkPanelUnit(opts) {
  if (opts && typeof opts.unit === 'string' && opts.unit) return opts.unit;
  return typeof weightUnit === 'function' ? weightUnit() : 'lb';
}

 



function forkPanelFormatWeight(value, opts) {
  const n = forkPanelNum(value);
  if (n == null) return '';
  if (opts && typeof opts.formatWeight === 'function') return String(opts.formatWeight(n));
  if (typeof displayWeight === 'function') return displayWeight(n);
  return String(Math.round(n * 1000) / 1000);
}

 

function forkPanelFormatE1RM(value, opts) {
  const n = forkPanelNum(value);
  if (n == null) return '';
  if (opts && typeof opts.formatE1RM === 'function') return String(opts.formatE1RM(n));
  return forkPanelFormatWeight(Math.round(n), opts);
}

function forkPanelFormatDate(value, opts) {
  if (value == null || value === '') return '';
  if (opts && typeof opts.formatDate === 'function') return String(opts.formatDate(value) || '');
  return String(value);
}

 





























function forkRepMaxCardHtml(rows, opts) {
  const esc = forkPanelEsc;
  const unit = forkPanelUnit(opts);
  const list = (Array.isArray(rows) ? rows : [])
    .filter(r => r && forkPanelNum(r.reps) > 0 && forkPanelNum(r.bestWeight) > 0)
    .slice()
    .sort((a, b) => forkPanelNum(a.reps) - forkPanelNum(b.reps));
  const title = opts && typeof opts.title === 'string' && opts.title ? opts.title : 'Rep maxes';
  const aria = opts && typeof opts.exerciseName === 'string' && opts.exerciseName
    ? title + ' for ' + opts.exerciseName : title;
  const cur = forkPanelNum(opts && opts.currentEst);
  const best = forkPanelNum(opts && opts.projected);
   







  const currentLine = (list.length && cur != null && cur > 0 && best != null && Math.round(cur) !== Math.round(best))
    ? '<p class="fork-repmax-current">Current est. 1RM <strong>' + esc(forkPanelFormatE1RM(cur, opts)) + ' ' + esc(unit) + '</strong> (from your latest session)</p>'
    : '';
  const body = !list.length
    ? '<p class="section-note fork-repmax-empty">No weighted sets logged for this exercise yet. Rep maxes appear here after the first weighted session.</p>'
    : '<div class="fork-repmax-table" role="table" aria-label="' + esc(aria) + '">'
      + '<div class="fork-repmax-head"><span>Reps</span><span>Best weight</span><span>Est. 1RM</span><span>Date</span></div>'
      + list.map(r => {
        const e1 = forkPanelNum(r.bestE1RM);
        const date = forkPanelFormatDate(r.date, opts);
        return '<div class="fork-repmax-row">'
          + '<span class="fork-repmax-reps">' + esc(String(forkPanelNum(r.reps))) + '</span>'
          + '<span class="fork-repmax-num fork-repmax-weight">' + esc(forkPanelFormatWeight(r.bestWeight, opts)) + ' ' + esc(unit) + '</span>'
          + '<span class="fork-repmax-num fork-repmax-e1rm">' + (e1 != null && e1 > 0 ? esc(forkPanelFormatE1RM(r.bestE1RM, opts)) + ' ' + esc(unit) : '') + '</span>'
          + '<span class="fork-repmax-date">' + (date ? esc(date) : '') + '</span>'
          + '</div>';
      }).join('')
      + '</div>';
   






  const capped = list.some(r => { const w = forkPanelNum(r.bestWeight), e = forkPanelNum(r.bestE1RM); return w > 0 && e > 0 && Math.abs(e / w - 1.5) < 1e-6; });
  const capNote = capped ? '<p class="fork-repmax-capnote">High-rep estimates count at most 15 reps, including reps left in reserve.</p>' : '';
  return '<section class="dashboard-card fork-repmax-card" aria-label="' + esc(aria) + '">'
    + '<div class="section-head"><div><h2>' + esc(title) + '</h2></div></div>'
     










    + currentLine + body + capNote + '</section>';
}

 

function forkPanelMount(host, html) {
  if (!host || typeof host !== 'object') return false;
  host.innerHTML = html;
  return true;
}

 


function forkRenderRepMaxCard(host, rows, opts) {
  return forkPanelMount(host, forkRepMaxCardHtml(rows, opts));
}

 







function forkMountRepMaxCard(host, logs, opts) {
  if (typeof forkRepMaxTable !== 'function') return false;
  return forkRenderRepMaxCard(host, forkRepMaxTable(logs), opts);
}
//# sourceMappingURL=preview-panels-ui.js.map
