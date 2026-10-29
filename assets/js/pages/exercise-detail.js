
 
     
     

     
     











    function projected1rmSubLabel(bestEst,exerciseId=null,item=null,isDb=false){
      const perf=`${dbDisplayWeight(bestEst.w,exerciseId,item,isDb)} × ${bestEst.r}`;
      const rpeKnown=bestEst.rpe!=null&&bestEst.rpe!=='';
      return rpeKnown?`From heaviest set (RPE-adjusted) <strong>${perf} @ RPE ${bestEst.rpe}</strong>`:`From heaviest set (Epley estimate) <strong>${perf}</strong>`;
    }

     



















    function pickHeaviestSet(pool){
      if(!pool||!pool.length)return null;
      return pool.reduce((a,b)=>{
        const aw=Number(a.w)||0,bw=Number(b.w)||0;
        if(bw!==aw)return bw>aw?b:a;
        const ar=Number(a.r)||0,br=Number(b.r)||0;
        if(br!==ar)return br>ar?b:a;
        const aRpe=a.rpe==null||a.rpe===''?null:Number(a.rpe);
        const bRpe=b.rpe==null||b.rpe===''?null:Number(b.rpe);
        if(bRpe!=null&&(aRpe==null||bRpe>aRpe))return b;
        return a;
      });
    }

     


     





    const CHART_W=360, CHART_H=210, CHART_L=8, CHART_R=12, CHART_T=12, CHART_B=30;
     




    let progressMetric='heaviest';
     

    let volumeMetric='weight';
     

    function isProgressMetric(m){return m==='e1rm'||m==='heaviest';}
     







    function isVolumeMetric(m){return m==='weight'||m==='sets';}
     
    function flipProgressMetric(m){return m==='heaviest'?'e1rm':'heaviest';}
     


    function chartTicks(min,max,count=4){
      let lo=min,hi=max;
      if(!(hi>lo)){const pad=Math.abs(hi)*0.1||1;lo=hi-pad;hi=hi+pad;}
      const raw=(hi-lo)/Math.max(1,count-1),mag=Math.pow(10,Math.floor(Math.log10(raw)));
      const step=(raw/mag>=5?5:raw/mag>=2?2:1)*mag;
      const start=Math.floor(lo/step)*step,end=Math.ceil(hi/step)*step,ticks=[];
      for(let v=start;v<=end+step/2;v+=step)ticks.push(+v.toFixed(10));
      return ticks.length>1?ticks:[start,end];
    }
     







    function chartLabelIndices(n){
      if(n<=4)return Array.from({length:n},(_,i)=>i);
      return [...new Set([0,Math.round((n-1)/3),Math.round(2*(n-1)/3),n-1])];
    }
     
    function chartXLabels(coords){
      const n=coords.length,labeled=new Set(chartLabelIndices(n));
       




      return coords.map((p,i)=>labeled.has(i)?`<text class="chart-label" x="${p.x.toFixed(1)}" y="${CHART_H-9}" text-anchor="${n===1?'middle':i===0?'start':i===n-1?'end':'middle'}">${escapeHtml(p.shortLabel||p.label)}</text>`:'').join('');
    }
     
    function chartGrid(ticks,Y){
      return ticks.map(t=>{const y=Y(t).toFixed(1);return `<line class="chart-grid" x1="${CHART_L}" y1="${y}" x2="${CHART_W-CHART_R}" y2="${y}"/>`;}).join('');
    }
     
    function barChart(points, valueLabel = value => `${Math.round(value).toLocaleString()}`) {
      if (!points.length) return '<div class="chart-empty">Log workouts to start this chart.</div>';
      const plotW=CHART_W-CHART_L-CHART_R,plotH=CHART_H-CHART_T-CHART_B;
      const values=points.map(p=>Number(p.value)||0),max=Math.max(...values,1);
      const ticks=chartTicks(0,max,4),top=ticks[ticks.length-1];
      const Y=v=>CHART_T+(1-v/top)*plotH,base=Y(0);
      const n=points.length,slot=plotW/n,barW=clamp(slot*0.55,10,40);
      const coords=points.map((p,i)=>({x:CHART_L+i*slot+(slot-barW)/2+barW/2,...p}));
      const bars=points.map((p,i)=>{
        const h=(Number(p.value)||0)/top*plotH,x=CHART_L+i*slot+(slot-barW)/2,y=base-h;
        return `<rect class="chart-bar" data-i="${i}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(2,h).toFixed(1)}" rx="3"><title>${escapeHtml(p.label)}: ${escapeHtml(valueLabel(p.value))}</title></rect>`;
      }).join('');
       

      const hits=points.map((p,i)=>`<rect class="chart-hit" data-i="${i}" x="${(CHART_L+i*slot).toFixed(1)}" y="${CHART_T}" width="${slot.toFixed(1)}" height="${plotH}" fill="transparent"/>`).join('');
      const aria=points.map(p=>`${p.label}: ${valueLabel(p.value)}`).join(', ');
      return `<svg viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="${escapeHtml(aria)}">${chartGrid(ticks,Y)}${bars}${hits}${chartXLabels(coords)}</svg>`;
    }
     






    function annotateSessionOrdinals(logs){
      const counts={};
      logs.slice().sort((a,b)=>{
        if(a.isoDate!==b.isoDate)return a.isoDate<b.isoDate?-1:1;
        const x=a.completedAt||'',y=b.completedAt||'';
        return x<y?-1:x>y?1:0;
      }).forEach(s=>{s.dayOrdinal=(counts[s.isoDate]=(counts[s.isoDate]||0)+1);});
      return logs;
    }
     
    function ordinalDateLabel(session){
      return session.dayOrdinal>1?`${session.date} (${session.dayOrdinal})`:session.date;
    }
     








    function historySessionLabel(session){
      const date=ordinalDateLabel(session);
      const name=(session&&session.name||'').trim();
      return name?`${date} (${name})`:date;
    }
     

     



    function exerciseTrendData(exerciseId) {
       







      const logs=getExerciseLogs(exerciseId);  
      const ex=(typeof exercises!=='undefined'?exercises:[]).find(x=>x.id===exerciseId)||null;
      const byDay=new Map();
      logs.forEach(session=>{
        if(!byDay.has(session.isoDate))byDay.set(session.isoDate,[]);
        byDay.get(session.isoDate).push(session);
      });
       
      const daySets=[...byDay.keys()].sort().map(iso=>byDay.get(iso).flatMap(s=>s.sets));
      const daySession=[...byDay.keys()].sort().map(iso=>byDay.get(iso)[byDay.get(iso).length-1]);
       



      const dayDeload=[...byDay.keys()].sort().map(iso=>byDay.get(iso).some(s=>s.deloadPerformed===true));
      const e1rm=[], volume=[], heaviest=[], hold=[], timeVolume=[], dist=[], distVolume=[], setsPerDay=[];
      daySets.forEach((sets,i)=>{
        const session=daySession[i];
         

        const label=session.date, shortLabel=String(session.date).replace(/, \d{4}/,'');
        const loadedAll=sets.filter(s=>Number(s.w)>0&&Number(s.r)>0);
         



        const loaded=loadedAll;
        if(loaded.length){
          e1rm.push({label,shortLabel,value:Math.round(Math.max(...loaded.map(estimate1RM))),...(dayDeload[i]?{deload:true}:{})});
           

          heaviest.push({label,shortLabel,value:Math.max(...loaded.map(s=>Number(s.w))),...(dayDeload[i]?{deload:true}:{})});
        }
        const timed=sets.filter(s=>Number(s.seconds)>0);
        if(timed.length){
          hold.push({label,shortLabel,value:Math.max(...timed.map(s=>Number(s.seconds)))});
          timeVolume.push({label,shortLabel,value:timed.reduce((sum,s)=>sum+(Number(s.seconds)||0),0)});
        }
         

        const distanced=sets.filter(s=>Number(s.distance)>0);
        if(distanced.length){
          dist.push({label,shortLabel,value:Math.max(...distanced.map(s=>Number(s.distance)))});
          distVolume.push({label,shortLabel,value:distanced.reduce((sum,s)=>sum+(Number(s.distance)||0),0)});
        }
        const vol=sets.reduce((sum,s)=>sum+setVolume(s,ex),0);
        if(vol>0)volume.push({label,shortLabel,value:vol});
         
        const setCount=sets.filter(s=>!isWarmupSet(s)).length;
        if(setCount>0)setsPerDay.push({label,shortLabel,value:setCount});
      });
      return {e1rm,volume,heaviest,hold,timeVolume,dist,distVolume,setsPerDay};
    }
     


    function lineChart(points, valueLabel = value => `${Math.round(value).toLocaleString()}`) {
      if (!points.length) return '<div class="chart-empty">Log workouts to start this chart.</div>';
       


      if (points.length<2) return '';
      const plotW=CHART_W-CHART_L-CHART_R,plotH=CHART_H-CHART_T-CHART_B;
      const values=points.map(p=>Number(p.value)||0);
      const dMin=Math.min(...values),dMax=Math.max(...values);
       
      const pad=Math.max((dMax-dMin)*0.2,Math.abs(dMax)*0.05||1);
      const ticks=chartTicks(dMin-pad,dMax+pad,4),t0=ticks[0],span=Math.max(1e-9,ticks[ticks.length-1]-t0);
      const X=i=>CHART_L+(points.length===1?plotW/2:i*plotW/(points.length-1));
      const Y=v=>CHART_T+(1-(v-t0)/span)*plotH;
      const coords=points.map((p,i)=>({x:X(i),y:Y(Number(p.value)||0),...p}));
      const line=coords.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
      const base=(CHART_T+plotH).toFixed(1);
      const area=`${line} L ${coords[coords.length-1].x.toFixed(1)} ${base} L ${coords[0].x.toFixed(1)} ${base} Z`;
      const aria=points.map(p=>`${p.label}: ${valueLabel(p.value)}${p.deload?' (deload)':''}`).join(', ');
       


      const dots=coords.map((p,i)=>`<circle class="chart-dot${p.deload?' chart-dot-deload':''}" data-i="${i}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5"><title>${escapeHtml(p.label)}: ${escapeHtml(valueLabel(p.value))}${p.deload?' (deload)':''}</title></circle>`).join('');
       

      const hits=coords.map((p,i)=>`<circle class="chart-hit" data-i="${i}" cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="18" fill="transparent"/>`).join('');
      return `<svg viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="${escapeHtml(aria)}">${chartGrid(ticks,Y)}<path class="chart-area" d="${area}"/><path class="chart-line" d="${line}"/>${dots}${hits}${chartXLabels(coords)}</svg>`;
    }

     



    function chartBlock(kicker,svg,points,valueLabel){
      const latest=points[points.length-1];
      const val=escapeHtml(valueLabel(latest.value)),when=escapeHtml(latest.shortLabel||latest.label);
      return `<p class="chart-kicker">${escapeHtml(kicker)}</p><div class="chart-tappable"><p class="chart-headline"><strong>${val}</strong><span>${when}</span></p>${svg}</div>`;
    }
     
    function wireChartTaps(tappable,points,valueLabel){
      if(!tappable||!points.length)return;
      const svg=tappable.querySelector('svg');if(!svg)return;
      const strong=tappable.querySelector('.chart-headline strong'),when=tappable.querySelector('.chart-headline span');
      const latest=points.length-1;
      const show=i=>{const p=points[i];strong.textContent=valueLabel(p.value);when.textContent=p.shortLabel||p.label;};
      let selected=-1;
      svg.addEventListener('click',e=>{
         





        const hit=e.target.closest('.chart-hit');
        const i=hit?Number(hit.dataset.i):-1;
        selected=(i===selected)?-1:i;
        svg.querySelectorAll('[data-i]').forEach(el=>el.classList.toggle('is-selected',Number(el.dataset.i)===selected));
         
        show(selected<0?latest:selected);
      });
    }

     
    function allSets(logs) {
      return logs.flatMap(session => session.sets.map(set => ({...set, date:session.date})));
    }

     





    function statsFor(id) {
      const logs = getExerciseLogs(id);
      const validSets = allSets(logs).filter(set => Number(set.r) > 0 || Number(set.seconds) > 0 || Number(set.distance) > 0);
      if (!validSets.length) return null;
      const repSets = validSets.filter(set => Number(set.r) > 0);
      const timedSets = validSets.filter(set => Number(set.seconds) > 0);
      const distSets = validSets.filter(set => Number(set.distance) > 0);
       





      const loaded = repSets.filter(set => Number(set.w) > 0 && set.complete !== false);
       








      const sided = typeof hasSidedSets==='function' && hasSidedSets(validSets);
      const sideBest = side => {
        const pool = setsForSide(loaded, side);
        return pool.length ? {
          bestEst: pool.reduce((a,b) => estimate1RM(a) > estimate1RM(b) ? a : b),
           



          heaviest: pickHeaviestSet(pool)
        } : null;
      };
      const sideBests = sided ? {L:sideBest('L'), R:sideBest('R')} : null;
      const headlinePool = loaded;
      const bestEst = headlinePool.length ? headlinePool.reduce((a,b) => estimate1RM(a) > estimate1RM(b) ? a : b) : null;
      const heaviest = pickHeaviestSet(headlinePool);
       













      let currentEst=null;
      for(const session of logs){
         






        if(session.deloadPerformed===true)continue;
         



        const sessionLoaded=(session.sets||[]).filter(set=>Number(set.r)>0&&Number(set.w)>0&&set.complete!==false);
        const sessionPool=sessionLoaded;
        if(sessionPool.length){currentEst=Math.round(Math.max(...sessionPool.map(set=>estimate1RM(set))));break;}
      }
       







      const volumeEx=(typeof exercises!=='undefined'?exercises:[]).find(x=>x.id===id)||null;
      const volume=validSets.filter(set=>set.complete!==false).reduce((sum,set)=>sum+setVolume(set,volumeEx),0);
       













      const loggedRepSets=repSets.filter(set=>set.complete!==false);
      return {sessions:logs.length, sets:validSets.length, volume,
        bestRepSet:loggedRepSets.length?Math.max(...loggedRepSets.map(s => Number(s.r) || 0)):0,
        longestHold:timedSets.length?Math.max(...timedSets.map(s => Number(s.seconds) || 0)):0,
         
        bestDistance:distSets.length?Math.max(...distSets.map(s => Number(s.distance) || 0)):0,
        totalDistance:distSets.reduce((sum,s)=>sum+(Number(s.distance)||0),0),
        bestEst, heaviest,
         









        projected:heaviest ? Math.round(estimate1RM(heaviest)) : null, currentEst,
         





        ...(sided?{singleSide:true, sideBests}:{})};
    }

     
    function similarity(a, b) {
      const sharedPrimary = a.primary.filter(m => b.primary.includes(m)).length;
      const sharedSecondary = a.secondary.filter(m => b.secondary.includes(m)).length;
       





      const forceMatch = a.force && b.force && a.force === b.force ? 2 : 0;
      const categoryMatch = a.category && b.category && a.category === b.category ? 1 : 0;
      const equipA = a.equipment || 'body only', equipB = b.equipment || 'body only';
      return sharedPrimary * 3 + sharedSecondary + (equipA === equipB ? 2 : 0) + forceMatch + categoryMatch;
    }

     






     
    function similarTo(ex) {
       
       
      return exercises.filter(x => x.id !== ex.id && !exerciseDeleted(x) && !x.aliasOf).map(x => ({...x, score:similarity(ex,x)})).filter(x => x.score > 0).sort((a,b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0,4);
    }

     



    function sessionBestLabel(session,exerciseId=null,item=null,isDb=false){
       
      const distanced=(session.sets||[]).filter(s=>Number(s.distance)>0);
      if(distanced.length){
        const best=Math.max(...distanced.map(s=>Number(s.distance)));
        return `Longest distance ${best} m`;
      }
      if(session.tracking==='time'){
        const best=Math.max(0,...session.sets.map(s=>Number(s.seconds)||0));
        return best>0?`Longest hold ${best} sec`:'';
      }
       





      const repSets=session.sets.filter(set=>Number(set.r)>0);
      if(!repSets.length)return '';
      const top=Math.round(Math.max(0,...repSets.map(estimate1RM)));
      return top>0?`Best estimate ${dbDisplayWeight(top,exerciseId,item,isDb)} ${weightUnit()}`:'';
    }

     





     
    function historySetRowHtml(s,i,session,exerciseId,isDb){
       




      const distanced=Number(s.distance)>0;
      const main=distanced
        ? (Number(s.w)>0
          ? `<strong>${dbDisplayWeight(s.w,exerciseId,null,isDb)}</strong> ${weightUnit()} × <strong>${s.distance}</strong> m`
          : `<strong>${s.distance}</strong> m`)
        : session.tracking==='time'
        ? `<strong>${s.seconds ?? '—'}</strong> sec`
        : (s.r==null&&s.w==null?'—'
          : s.w==null?`<strong>${s.r}</strong> reps`
          : s.r==null?`<strong>${dbDisplayWeight(s.w,exerciseId,null,isDb)}</strong> ${weightUnit()}`
          : `<strong>${dbDisplayWeight(s.w,exerciseId,null,isDb)}</strong> ${weightUnit()} × <strong>${s.r}</strong>`);
      const metaBits=[];
       
      if(typeof setSide==='function'&&setSide(s))metaBits.push(`<span class="set-tag set-side-tag">${setSide(s)==='L'?'Left':'Right'}</span>`);
      if(s.rpe!=null)metaBits.push(`<span class="set-rpe">RPE <strong>${s.rpe}</strong></span>`);
      (s.tags||[]).forEach(t=>metaBits.push(`<span class="set-tag">${escapeHtml(t)}</span>`));
      return `<div class="set-row"><span class="set-num">${i+1}</span><span class="set-main">${main}</span><span class="set-meta">${metaBits.join(' ')}</span></div>`;
    }
     
    function historySessionHtml(session,exerciseId,isDb){
      const best=sessionBestLabel(session,exerciseId,null,isDb);
      const tags=session.exerciseTags?.length
        ? `<div class="exercise-tag-row">${session.exerciseTags.map(tag=>`<span class="exercise-tag-chip ${workoutState.exerciseTagPresets.includes(tag)?'preset':''}">${escapeHtml(tag)}</span>`).join('')}</div>`:'';
      return `<div class="history-session">`
        + `<div class="session-head"><span class="session-date">${escapeHtml(historySessionLabel(session))}</span>`
        + `<button class="filter-clear session-view" type="button" data-history-workout="${escapeHtml(session.workoutId)}">View workout</button></div>`
        + (best?`<div class="session-sub">${escapeHtml(best)}</div>`:'')
        + tags
        + `<div class="sets">${session.sets.map((s,i)=>historySetRowHtml(s,i,session,exerciseId,isDb)).join('')}</div>`
        + `</div>`;
    }

     
    function renderHistory(id) {
      const logs = annotateSessionOrdinals(getExerciseLogs(id));
       

      const isDb=(typeof exerciseById==='function')&&pairImplementExercise(exerciseById(id));
       

      const toggle=$('#historyToggle'),list=$('#historyList'),label=$('#historyToggleLabel');
       
      if(list)list.removeAttribute('aria-busy');
       

      if(toggle)toggle.hidden=!logs.length;
      if(label)label.textContent=logs.length?`Show all ${logs.length} session${logs.length===1?'':'s'} (latest ${ordinalDateLabel(logs[0])})`:'';
      if(toggle)toggle.setAttribute('aria-expanded','false');
      if(list)list.hidden=logs.length>0;
      if(toggle)toggle.onclick=()=>{
        const open=list.hidden;
        list.hidden=!open;
        toggle.setAttribute('aria-expanded',String(open));
        if(label)label.textContent=open?'Hide history':`Show all ${logs.length} session${logs.length===1?'':'s'} (latest ${ordinalDateLabel(logs[0])})`;
      };
      $('#historyList').classList.toggle('is-empty', !logs.length);
      $('#historyList').innerHTML = logs.length
        ? logs.map(session=>historySessionHtml(session,id,isDb)).join('')
        : `<div class="history-empty">No history for this exercise yet.</div>`;
       
      document.querySelectorAll('#detailView [data-history-workout]').forEach(button=>button.addEventListener('click',()=>{const workout=workoutState.completed.find(row=>row.id===button.dataset.historyWorkout);if(workout){state.workoutDetailReturn=ROUTES.DETAIL_RETURN.EXERCISE_DETAIL;state.workoutDetailExerciseId=id;state.workoutDetailExerciseReturn=state.exerciseDetailReturn;showWorkouts(false);renderCompletedWorkout(workout,{push:true});}}));
    }

     

    function openExercise(id, push = true, returnTo) {
       
      const ex = resolveExercise(id);
      if (!ex) return;
      id = ex.id;
      
      
      
      const fromDetail = state.activeView === 'detail';
      rememberScroll();
      state.selected = id;
      if (returnTo !== undefined) {
        state.exerciseDetailReturn = returnTo;
      } else if (state.activeView !== 'detail' && state.activeView !== 'settings') {
        
        
         


         
        state.exerciseDetailReturn = state.activeView === ROUTES.VIEW.WORKOUT
          ? makeReturnRoute(ROUTES.VIEW.WORKOUT,{sub:state.workoutSubScreen,savedWorkoutId:state.savedWorkoutId})
          : makeReturnRoute(state.activeView);
      }
      $('#detailTitle').textContent = ex.name;
      const detailFav = $('#detailFavToggle');
      if (detailFav) {
        const fav = state.favorites.has(id);
        detailFav.setAttribute('aria-pressed', String(fav));
        detailFav.setAttribute('aria-label', fav ? 'Remove from favorites' : 'Add to favorites');
      }
       

      $('#detailTags').innerHTML = [`<span class="tag">${escapeHtml(equipmentLabel(ex))}</span>`, ...(ex.unilateral ? ['<span class="tag side">Single side</span>'] : []), ...(ex.custom ? ['<span class="tag custom">Custom</span>'] : [])].join('');
       







      const detailSwitching=detailHydratedFor!==id;
      if(detailSwitching)paintDetailSkeletons();
      state.activeView = 'detail';
      hideAllViews();
      $('#detailView').classList.add('active');
      setActiveNav('library');
       


      if(typeof updateLiveWorkoutIndicator==='function')updateLiveWorkoutIndicator();
      updateTopBar('detail', ex.name);
      if (fromDetail) state.scroll['detail'] = 0;
      restoreScroll('detail');
      updateExerciseBackLabel();
       


      if (push) history.pushState({exercise:id, exReturn: state.exerciseDetailReturn || null}, '', `#${encodeURIComponent(id)}`);
      const hydrate=()=>{try{hydrateExerciseDetail(id,ex);detailHydratedFor=id;}catch(err){console.error(err);}};
      if(detailSwitching&&typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(hydrate));
      else hydrate();
    }
     


     



     




     





    function progressChartBlock(kicker,svg,points,valueLabel){
      const latest=points[points.length-1];
      const val=escapeHtml(valueLabel(latest.value)),when=escapeHtml(latest.shortLabel||latest.label);
      const seg=['e1rm','heaviest'].map(m=>`<button type="button" data-progress-metric="${m}" aria-pressed="${m===progressMetric}">${m==='e1rm'?'1RM':'Heaviest'}</button>`).join('');
       



      return `<div class="chart-tappable"><div class="chart-head-row"><div class="chart-head-text"><p class="chart-kicker">${escapeHtml(kicker)}</p><p class="chart-headline"><strong>${val}</strong><span>${when}</span></p></div><div class="mini-segmented progress-seg" role="group" aria-label="Progress metric">${seg}</div></div>${svg}</div>`;
    }
     

       









    function volumeChartBlock(kicker,svg,points,valueLabel,firstMetric='Weight'){
      const latest=points[points.length-1];
      const val=escapeHtml(valueLabel(latest.value)),when=escapeHtml(latest.shortLabel||latest.label);
      const seg=['weight','sets'].map(m=>`<button type="button" data-volume-metric="${m}" aria-pressed="${m===volumeMetric}">${m==='weight'?firstMetric:'Sets'}</button>`).join('');
      return `<div class="chart-tappable"><div class="chart-head-row"><div class="chart-head-text"><p class="chart-kicker">${escapeHtml(kicker)}</p><p class="chart-headline"><strong>${val}</strong><span>${when}</span></p></div><div class="mini-segmented progress-seg" role="group" aria-label="${escapeHtml(firstMetric)} or sets metric">${seg}</div></div>${svg}</div>`;
    }
    function paintProgressMetric(ctx){
      const heavy=progressMetric==='heaviest';
      const points=heavy?ctx.trendData.heaviest:ctx.trendData.e1rm;
      ctx.progressHost.innerHTML=progressChartBlock(heavy?'Heaviest weight':'Est. 1RM',lineChart(points,ctx.e1rmLabel),points,ctx.e1rmLabel);  
      wireChartTaps(ctx.progressHost.querySelector('.chart-tappable'),points,ctx.e1rmLabel);
      ctx.progressHost.querySelectorAll('[data-progress-metric]').forEach(btn=>{
        btn.onclick=()=>{const mode=btn.dataset.progressMetric;if(isProgressMetric(mode)&&mode!==progressMetric){progressMetric=mode;paintProgressMetric(ctx);}};
      });
      const head=ctx.progressHost.querySelector('.chart-headline');
      head.classList.add('metric-toggle');
      head.setAttribute('role','button');
      head.setAttribute('tabindex','0');
      head.setAttribute('aria-label',heavy?'Show estimated 1RM':'Show heaviest weight');
      const flip=()=>{progressMetric=flipProgressMetric(progressMetric);paintProgressMetric(ctx);};
      head.addEventListener('click',flip);
      head.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();flip();}});
       







      if(ctx.progressNote)ctx.progressNote.textContent=`${heavy?'Heaviest weight':'Est. 1RM'} and volume per day`;
    }

    function paintVolumeMetric(ctx){
      const showSets=volumeMetric==='sets'&&ctx.trendData.setsPerDay.length;
      const vPoints=showSets?ctx.trendData.setsPerDay:(ctx.volSeries?ctx.volSeries.points:[]);
      const vLabel=showSets?(v=>`${v} sets`):(ctx.volSeries?ctx.volSeries.label:ctx.volLabel);
      const vKicker=showSets?'Sets per day':(ctx.volSeries?ctx.volSeries.kicker:'Volume per day');
       


      const vMetric=ctx.volSeries&&ctx.volSeries.metric?ctx.volSeries.metric:'Weight';
      ctx.volumeHost.innerHTML=vPoints.length
        ? volumeChartBlock(vKicker,barChart(vPoints,vLabel),vPoints,vLabel,vMetric)
        : '';
      wireChartTaps(ctx.volumeHost.querySelector('.chart-tappable'),vPoints,vLabel);
      ctx.volumeHost.querySelectorAll('[data-volume-metric]').forEach(btn=>{
        btn.onclick=()=>{const mode=btn.dataset.volumeMetric;if(isVolumeMetric(mode)&&mode!==volumeMetric){volumeMetric=mode;paintVolumeMetric(ctx);}};
      });
    }

     










    function renderExerciseInstructions(ex){
      const host=$('#instructions');if(!host)return;
      const paint=()=>{host.innerHTML=ex.instructions.length?ex.instructions.map(x=>`<li>${escapeHtml(x)}</li>`).join(''):'<li>No instructions added.</li>';};
      if(ex.instructions&&ex.instructions.length){paint();return;}
      const isCatalogEntry=!ex.custom&&typeof catalogEntryById==='function'&&!!catalogEntryById(ex.id);
      if(!isCatalogEntry||typeof ensureExerciseInstructions!=='function'){paint();return;}
      host.innerHTML='<li>Loading instructions…</li>';
      ensureExerciseInstructions(ex.id).then(steps=>{
        if(state.selected!==ex.id)return;
        if(steps===null){host.innerHTML='<li>Instructions could not be loaded.</li>';return;}
        paint();
      }).catch(()=>{if(state.selected===ex.id)host.innerHTML='<li>Instructions could not be loaded.</li>';});
    }
    function hydrateExerciseDetail(id, ex){
      const realStats = statsFor(id);
      const st = realStats;
      const isBodyweight = ex.equipment === 'body only';
       


      const sessionsSub = `Across ${st?st.sessions:0} workout${st&&st.sessions===1?'':'s'}`;
       
      $('#stats').removeAttribute('aria-busy');
       

       




      const timedOnly = !!(st && st.longestHold>0 && !st.bestRepSet);
       

      const isDistExercise=typeof isNonVolumeExercise==='function'&&isNonVolumeExercise(ex);
      const distOnly = !!(st && isDistExercise && st.bestDistance>0);
       






      const sideBestsNote = st && st.singleSide && st.sideBests
        ? `Left best ${st.sideBests.L?Math.round(dbDisplayWeight(estimate1RM(st.sideBests.L.bestEst),id,null,pairImplementExercise(ex))):0} ${weightUnit()} – Right best ${st.sideBests.R?Math.round(dbDisplayWeight(estimate1RM(st.sideBests.R.bestEst),id,null,pairImplementExercise(ex))):0} ${weightUnit()} e1RM`
        : '';
      $('#stats').innerHTML = st && !isBodyweight && st.heaviest ? `
        <div class="stat"><span class="stat-label">EST. 1RM</span><span class="stat-value">${dbDisplayWeight(st.projected,id,null,pairImplementExercise(ex))} ${weightUnit()}</span><span class="stat-sub">${projected1rmSubLabel(st.heaviest,id,null,pairImplementExercise(ex))}</span></div>
        <div class="stat"><span class="stat-label">HEAVIEST SET</span><span class="stat-value">${dbDisplayWeight(st.heaviest.w,id,null,pairImplementExercise(ex))} ${weightUnit()}</span><span class="stat-sub">${st.heaviest.r} reps (${st.heaviest.date})${sideBestsNote?` – ${sideBestsNote}`:''}</span></div>
        <div class="stat"><span class="stat-label">VOLUME LOGGED</span><span class="stat-value">${formatVolume(st.volume)}</span><span class="stat-sub">${sessionsSub}</span></div>` : distOnly ? `
        <div class="stat"><span class="stat-label">BEST DISTANCE</span><span class="stat-value">${st.bestDistance} m</span><span class="stat-sub">${sessionsSub}</span></div>
        <div class="stat"><span class="stat-label">TOTAL DISTANCE</span><span class="stat-value">${st.totalDistance} m</span><span class="stat-sub">${st.sets} set${st.sets===1?'':'s'}</span></div>
        ` : timedOnly ? `
        <div class="stat"><span class="stat-label">LONGEST HOLD</span><span class="stat-value">${st.longestHold} sec</span><span class="stat-sub">${sessionsSub}</span></div>
        <div class="stat"><span class="stat-label">EST. 1RM</span><span class="stat-value">—</span><span class="stat-sub">Timed sets don't project a 1RM</span></div>
        ` : st && isBodyweight ? `
        <div class="stat"><span class="stat-label">BODYWEIGHT MOVEMENT</span><span class="stat-value">${st.sets} set${st.sets===1?'':'s'}</span><span class="stat-sub">Added weight is optional</span></div>
        <div class="stat"><span class="stat-label">BEST REP SET</span><span class="stat-value">${st.bestRepSet} reps</span><span class="stat-sub">${sessionsSub}</span></div>
        ` : st ? `
        <div class="stat"><span class="stat-label">EST. 1RM</span><span class="stat-value">—</span><span class="stat-sub">Complete a weighted set to calculate it</span></div>
        <div class="stat"><span class="stat-label">BEST REP SET</span><span class="stat-value">${st.bestRepSet} reps</span><span class="stat-sub">${sessionsSub}</span></div>
        ` : `
        <div class="stat"><span class="stat-label">EST. 1RM</span><span class="stat-value">—</span><span class="stat-sub">Complete a weighted set to calculate it</span></div>
        <div class="stat"><span class="stat-label">HEAVIEST SET</span><span class="stat-value">—</span><span class="stat-sub">No completed sets yet</span></div>
        <div class="stat"><span class="stat-label">VOLUME LOGGED</span><span class="stat-value">${formatVolume(0)}</span><span class="stat-sub">Nothing logged yet</span></div>`;  
       

       

      const trendData=exerciseTrendData(id);
       

      const e1rmLabel=value=>`${Math.round(dbDisplayWeight(value,id,null,pairImplementExercise(ex)))} ${weightUnit()}`;
      const volLabel=v=>`${Math.round(displayVolume(v)).toLocaleString()} ${weightUnit()}`;
      const progressHost=$('#exerciseProgressChart');
      const progressNote=$('#progressNote');
       

      const progressCtx={trendData,e1rmLabel,progressHost,progressNote};
       





     
       


      const timedTrend=!trendData.e1rm.length&&trendData.hold.length>0;
      const distTrend=!trendData.e1rm.length&&!trendData.hold.length&&trendData.dist.length>0;
      const secLabel=v=>`${Math.round(v)} sec`;
      const mLabel=v=>`${Math.round(v)} m`;
      if(distTrend){
        progressHost.innerHTML=chartBlock('Longest distance',lineChart(trendData.dist,mLabel),trendData.dist,mLabel);
        wireChartTaps(progressHost.querySelector('.chart-tappable'),trendData.dist,mLabel);
        if(progressNote)progressNote.textContent='Longest distance per day';
      }else if(timedTrend){
        progressHost.innerHTML=chartBlock('Longest hold',lineChart(trendData.hold,secLabel),trendData.hold,secLabel);
        wireChartTaps(progressHost.querySelector('.chart-tappable'),trendData.hold,secLabel);
        if(progressNote)progressNote.textContent='Longest hold per day';
      }else if(isBodyweight){
        progressHost.innerHTML='<div class="chart-empty">Bodyweight progress will use reps and added load from your workouts.</div>';
        if(progressNote)progressNote.textContent='Est. 1RM and volume per day';
      }else if(trendData.e1rm.length){
        paintProgressMetric(progressCtx);
         





        if(trendData.e1rm.length===1&&progressNote)progressNote.textContent='Log a session on another day to see your progress chart. Same-day sessions count as one.';
      }else{
        progressHost.innerHTML='<div class="chart-empty">Complete a workout to start this chart.</div>';
        if(progressNote)progressNote.textContent='Est. 1RM and volume per day';
      }
      const volumeHost=$('#exerciseVolumeChart');
       

       



      const volSeries=trendData.volume.length
        ? {points:trendData.volume,kicker:'Volume per day',label:volLabel,metric:'Weight'}
        : (timedTrend&&trendData.timeVolume.length
          ? {points:trendData.timeVolume,kicker:'Time under tension',label:secLabel,metric:'Time'}
          : (distTrend&&trendData.distVolume.length
            ? {points:trendData.distVolume,kicker:'Distance per day',label:mLabel,metric:'Distance'}
            : null));
       

      paintVolumeMetric({trendData,volSeries,volumeHost,volLabel});
      renderHistory(id);
       




      const forkRepMaxHost = $('#forkRepMaxHost');
      if (forkRepMaxHost && typeof forkMountRepMaxCard === 'function') {
        const repMaxLogs = getExerciseLogs(id).map(log => ({
          date: log.date,
          sets: (log.sets || [])
            .filter(s => s.complete !== false),
        }));
        const isDb = pairImplementExercise(ex);
        forkMountRepMaxCard(forkRepMaxHost, repMaxLogs, {
          exerciseName: ex.name,
          formatWeight: v => dbDisplayWeight(v, id, null, isDb),
          formatE1RM: v => String(Math.round(dbDisplayWeight(v, id, null, isDb))),
           









          currentEst: st ? st.currentEst : null,
          projected: st ? st.projected : null,
        });
      }
       


       


      $('#customToolsRow').innerHTML = ex.custom ? `<button class="custom-tool" id="editCustomExercise" type="button">Edit</button><button class="custom-tool danger custom-delete-btn" id="deleteCustomExercise" type="button">Delete exercise</button>` : '';
      $('#editCustomExercise')?.addEventListener('click', () => openCustomDialog(ex));
      $('#deleteCustomExercise')?.addEventListener('click', () => requestDeleteCustomExercise(ex.id));
       



      renderExerciseInstructions(ex);
      const forkSimilar = similarTo(ex);
      $('#similarGrid').innerHTML = `<div class="action-list">${forkSimilar.map(x => `<button class="action-row" type="button" data-id="${escapeHtml(x.id)}" aria-label="Open ${escapeHtml(x.name)}"><span><strong>${escapeHtml(x.name)}</strong><span>${escapeHtml(titleCase(x.primary[0] || 'Unspecified muscle'))} (${escapeHtml(titleCase(equipmentLabel(x)))})</span></span></button>`).join('')}</div>`;
      const forkSimilarCard = $('#similarCard'); if (forkSimilarCard) forkSimilarCard.hidden = !forkSimilar.length;  
      document.querySelectorAll('#similarGrid [data-id]').forEach(btn => btn.addEventListener('click', () => openExercise(btn.dataset.id)));
       
      $('#exerciseBodyMap').innerHTML = exerciseBodyMapMarkup(ex);
      hydrateBodyMaps();
    }

     




     


    let detailHydratedFor=null;
    function paintDetailSkeletons(){
      const statCard='<div class="stat" aria-hidden="true"><span class="skel skel-stat-label"></span><span class="skel skel-stat-value"></span><span class="skel skel-stat-sub"></span></div>';
      const chartSkel='<div class="skel skel-chart" role="presentation"></div>';
      const sessionSkel='<div class="history-session" aria-hidden="true"><div class="skel skel-line" style="width:45%"></div><div class="skel skel-line" style="width:70%"></div><div class="skel skel-row"></div></div>';
      const stats=$('#stats');if(stats){stats.innerHTML=statCard.repeat(3);stats.setAttribute('aria-busy','true');}
      const prog=$('#exerciseProgressChart');if(prog)prog.innerHTML=chartSkel;
      const vol=$('#exerciseVolumeChart');if(vol)vol.innerHTML=chartSkel;
      const note=$('#progressNote');if(note)note.textContent='';
      const toggle=$('#historyToggle'),list=$('#historyList'),label=$('#historyToggleLabel');
      if(toggle){toggle.hidden=true;toggle.onclick=null;toggle.setAttribute('aria-expanded','false');}
      if(label)label.textContent='Loading history\u2026';
      if(list){list.hidden=false;list.innerHTML=sessionSkel.repeat(2);list.setAttribute('aria-busy','true');list.classList.remove('is-empty');}
      const sim=$('#similarGrid');if(sim)sim.innerHTML='<div class="skel skel-row" role="presentation"></div>'.repeat(3);
      const tools=$('#customToolsRow');if(tools)tools.innerHTML='';
      const bodymap=$('#exerciseBodyMap');if(bodymap)bodymap.innerHTML='';
      const repMaxHost=$('#forkRepMaxHost');if(repMaxHost)repMaxHost.innerHTML='';
    }

     
    function updateExerciseBackLabel() {
      const topBack = $('#topBarBack'); if (!topBack) return;
      const names = {'completed-workout':'log', workout:'workout', stats:'stats', dashboard:'home', program:'program', library:'library'};
      const dest = names[state.exerciseDetailReturn?.view] || 'library';
      topBack.setAttribute('aria-label', `Back to ${dest}`);
    }

     



    function backFromExerciseDetail() {
       



      if (history.state?.exercise) { history.back(); return; }
      const ret = state.exerciseDetailReturn;
      if (ret && ret.view === 'completed-workout' && ret.workoutId) {
        const workout = workoutState.completed.find(w => w.id === ret.workoutId);
         






        if (workout) { state.workoutDetailReturn = ROUTES.DETAIL_RETURN.HISTORY; showWorkouts(false); renderCompletedWorkout(workout); return; }
        showWorkouts(false); return;
      }
      if (ret && ret.view === 'stats') { showStats(false); return; }
      if (ret && ret.view === 'dashboard') { showDashboard(false); return; }
      if (ret && ret.view === 'program') { showProgram(false); return; }
      if (ret && ret.view === 'workout') {
         


        state.workoutEditorOpen = ret.sub === 'editor' && !!workoutState.draft;
        state.builderOpen = ret.sub === 'builder' && !!state.savedBuilder;
        state.savedWorkoutId = ret.sub === 'saved' ? (ret.savedWorkoutId || null) : null;
        state.workoutHistoryOpen = ret.sub === 'history';
        showWorkouts(false, true);
        return;
      }
      showLibrary(false);
    }

//# sourceMappingURL=exercise-detail.js.map
