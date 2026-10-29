
 
     
     
    let pendingDeleteCompletedWorkoutId=null;
     



     
    function fallbackNameDate(iso) {
      const d = new Date(String(iso || '') + 'T12:00:00');
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    function deleteCompletedWorkoutLanding(){
      return returnRouteKey(state.workoutDetailReturn)===ROUTES.DETAIL_RETURN.HISTORY?'history':'workout';
    }
    $('#cancelDeleteCompletedWorkout')?.addEventListener('click',()=>$('#deleteCompletedWorkoutDialog').close());
    $('#keepCompletedWorkout')?.addEventListener('click',()=>$('#deleteCompletedWorkoutDialog').close());
    $('#confirmDeleteCompletedWorkout')?.addEventListener('click',()=>{
      $('#deleteCompletedWorkoutDialog').close();
      if(pendingDeleteCompletedWorkoutId){
         

        if(typeof noteTombstone==='function')noteTombstone('completed',pendingDeleteCompletedWorkoutId);
        workoutState.completed=workoutState.completed.filter(w=>w.id!==pendingDeleteCompletedWorkoutId);
        schedulePersist();
        $('#workoutComplete').hidden=true;
         

        if(deleteCompletedWorkoutLanding()==='history'){state.workoutHistoryOpen=true;renderWorkoutScreen();}
        else showWorkouts(false);
        renderDashboard();
         


      }
      pendingDeleteCompletedWorkoutId=null;
    });
     


    function invalidSetsIn(draft){
      const rows=[];
      (draft?.exercises||[]).forEach(item=>{
        const ex=resolveExercise(item.exerciseId);
         
        const tracking=exerciseTracking(item,ex), weightOptional=exerciseWeightOptional(ex)||tracking==='time';  
        if(!item.sets.length){rows.push({item,set:null});return;}
        item.sets.forEach(set=>{
           






          const perf=set[setPerfField(item,ex)];
           







          const wBlank=set.w===''||set.w==null||set.w===0;
          const bad=(!weightOptional&&wBlank)||perf===''||!Number.isFinite(Number(set.w||0))||Number(set.w||0)<0||!Number.isFinite(Number(perf))||Number(perf)<1|| (set.rpe!==''&&set.rpe!=null&&(!Number.isFinite(Number(set.rpe))||Number(set.rpe)<0||Number(set.rpe)>10));
          if(bad)rows.push({item,set});
        });
      });
      return rows;
    }
     



    function isEmptySet(set){
       




      const blank=v=>v===''||v==null;
      return set&&blank(set.w)&&blank(set.r)&&blank(set.seconds)&&blank(set.distance)&&blank(set.rpe)&&!(set.tags?.length)&&!(typeof isFixedSet==='function'&&isFixedSet(set))&&!(typeof isAmrapSet==='function'&&isAmrapSet(set));
    }
     




    function unmarkedSetsWithData(draft){
      const bad=new Set(invalidSetsIn(draft).map(row=>row.set).filter(Boolean));
      const rows=[];
      (draft?.exercises||[]).forEach((item,exerciseIndex)=>{
        (item.sets||[]).forEach((set,index)=>{
          if(!set.complete&&!bad.has(set))rows.push({item,set,index,exerciseIndex});
        });
      });
      return rows;
    }
     

    function unmarkedSetSummary(row){
      const {item,set}=row;
      const ex=resolveExercise(item.exerciseId);
      const tracking=exerciseTracking(item,ex);
      const rpe=(set.rpe===''||set.rpe==null)?'':` @ ${set.rpe}`;
      if(tracking==='time')return `${set.seconds} sec${rpe}`;
      if(exerciseWeightOptional(ex)){
        const w=Number(set.w)||0;
        return w>0?`+${displayWeight(set.w)} ${weightUnit()} × ${set.r}${rpe}`:`${set.r} reps${rpe}`;
      }
       


      return `${dbDisplayWeight(set.w,item.exerciseId,item,pairImplementExercise(ex))} ${weightUnit()} × ${set.r}${rpe}`;
    }
     



    function reviewSetsListHtml(rows){
      return rows.map(row=>{
        const ex=resolveExercise(row.item.exerciseId);
        const label=`${ex?.name||'Exercise'} (Set ${row.index+1})`;
        return `<li><button type="button" class="review-set-row" data-exercise-uid="${escapeHtml(row.item.uid||'')}" data-set-uid="${escapeHtml(row.set.uid||'')}" data-exercise-index="${row.exerciseIndex}" data-set-index="${row.index}" aria-pressed="${!!row.set.complete}" aria-label="Mark ${escapeHtml(label)} complete"><span class="review-set-check" aria-hidden="true"><svg viewBox="0 0 24 24"><rect class="box" x="3.2" y="3.2" width="17.6" height="17.6" rx="5.5"/><path class="tick" d="m8 12.4 2.6 2.6 5.6-6.2"/></svg></span><span class="review-set-text"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(unmarkedSetSummary(row))}</span></span></button></li>`;
      }).join('');
    }
     


    function serializeCompletedSet(set){
       



       


       



       




      return {w:sanitizeSetValue('w',set.w), r:sanitizeSetValue('r',set.r), seconds:sanitizeSetValue('seconds',set.seconds), distance:sanitizeSetValue('distance',set.distance), rpe:sanitizeSetValue('rpe',set.rpe), tags:[...set.tags], complete:!!set.complete, ...(setSide(set)?{side:setSide(set)}:{}), ...((typeof isFixedSet==='function'&&isFixedSet(set))?{fixed:true}:{}), ...((typeof isAmrapSet==='function'&&isAmrapSet(set))?{amrap:true}:{})};
    }
     









    function reviewFinishCounts(draft){
      const allSets=draft.exercises.flatMap(item=>item.sets);
      return {
        loggedAsEntered:allSets.filter(set=>!set.complete&&!isEmptySet(set)).length,
        empty:allSets.filter(isEmptySet).length,
      };
    }
     





    function dropEmptySets(draft){
      if(!draft||!Array.isArray(draft.exercises))return 0;
      let dropped=0;
      draft.exercises.forEach(item=>{const before=(item.sets||[]).length;item.sets=(item.sets||[]).filter(set=>!isEmptySet(set));dropped+=before-item.sets.length;});
      draft.exercises=draft.exercises.filter(item=>(item.sets||[]).length);
      return dropped;
    }
     

    function reviewSetsCopy(draft){
      const {loggedAsEntered,empty}=reviewFinishCounts(draft);
      const parts=[];
      if(loggedAsEntered)parts.push(`${loggedAsEntered} set${loggedAsEntered===1?'':'s'} will be logged as entered`);
      if(empty)parts.push(`${empty} empty set${empty===1?'':'s'} dropped`);
      return parts.length?parts.join(' – '):'All sets are marked complete.';
    }
     
    function showReviewSetsDialog(draft){
      $('#reviewSetsCopy').textContent=reviewSetsCopy(draft);
       


      const rows=unmarkedSetsWithData(draft);
      const listEl=$('#reviewSetsList');
      const labelEl=$('#reviewSetsListLabel');
      listEl.hidden=!rows.length;
      if(labelEl)labelEl.hidden=!rows.length;
      listEl.innerHTML=reviewSetsListHtml(rows);
       



      $('#reviewSetsCancel').className='secondary-button review-keep-editing';
       

      if(!$('#reviewSetsDialog').open)$('#reviewSetsDialog').showModal();
    }
     





     








     



    function finishAnywayForFinish(draft,optsFinishedAnyway){
      const prior=draft&&draft.editingId?workoutState.completed.find(x=>x.id===draft.editingId):null;
      return !!optsFinishedAnyway||!!(prior&&prior.finishedAnyway);
    }
     
    function finishWorkout(skipReview,opts={}) {
      const draft = workoutState.draft;
       


      if (!draft) return;
       



      const explicitAnyway=!!opts.finishedAnyway;
      if (!draft.exercises.length && !explicitAnyway) { showToast('Add at least one exercise before finishing.','error'); return; }
       







      const needsReview=draft.exercises.some(item=>item.sets.some(set=>!set.complete))||invalidSetsIn(draft).length>0;
      if (!skipReview && needsReview) {
        showReviewSetsDialog(draft);
        return;
      }
       

      const workoutDateIso = $('#workoutDate').value || localIsoDate();
       

      draft.name = clampNameLength($('#workoutName').value.trim()) || ('Workout \u2013 ' + fallbackNameDate(workoutDateIso)); draft.date = workoutDateIso;
       


      const priorCompleted=draft.editingId?workoutState.completed.find(x=>x.id===draft.editingId):null;
       

      const finishedAnyway=finishAnywayForFinish(draft,opts.finishedAnyway);
       




       









      const deloadStamp=draft.editingId
        ?(priorCompleted&&typeof priorCompleted.deloadPerformed==='boolean'?{deloadPerformed:priorCompleted.deloadPerformed}:{})
        :(draft.programId&&typeof forkDeloadSessionScale==='function'
          ?{deloadPerformed:forkDeloadSessionScale(draft)!=null}
          :{});
      const completed = { id:draft.editingId || newWorkoutId(), name:draft.name, date:draft.date, completedAt:priorCompleted?.completedAt||new Date().toISOString(), programId:draft.programId||null, programWorkoutUid:draft.programWorkoutUid||null, finishedAnyway, ...deloadStamp, ...(priorCompleted?.startedAt?{startedAt:priorCompleted.startedAt}:(draft.startedAt?{startedAt:draft.startedAt}:{})), focusPreset:draft.focusPreset||null,   focusCustomRange:draft.focusCustomRange?{min:+draft.focusCustomRange.min,max:draft.focusCustomRange.max==null?null:+draft.focusCustomRange.max}:null,   progression:draft.progression?{...draft.progression}:null, exercises:draft.exercises.map(item => ({exerciseId:item.exerciseId, tracking:exerciseTracking(item,resolveExercise(item.exerciseId)), note:item.note||'', exerciseTags:[...(item.exerciseTags||[])], supersetId:item.supersetId||null, progression:item.progression?{...item.progression}:null, sets:item.sets.map(serializeCompletedSet)})) };
      if (draft.editingId) {
         


        if (workoutState.completed.some(x => x.id === draft.editingId)) {
          workoutState.completed = workoutState.completed.map(x => x.id === draft.editingId ? completed : x);
        } else {
          completed.id = newWorkoutId();
          workoutState.completed.unshift(completed);
          showToast('The workout you were editing was deleted elsewhere, so it was saved as a new workout.');
        }
      } else workoutState.completed.unshift(completed);
      workoutState.draft = null; state.shareReturn=null;    
       


       




      if(!draft.editingId&&typeof forkRecordProgramFinish==='function')forkRecordProgramFinish(completed);
      if(!draft.editingId)state.workoutDetailReturn=draft.programId?ROUTES.DETAIL_RETURN.PROGRAM:ROUTES.DETAIL_RETURN.WORKOUT; persistNow(); renderCompletedWorkout(completed); renderProgram(); renderLibrary(); renderDashboard(); renderStats();
       


      updateTopBar('workout');
       
      window.scrollTo({top:0, behavior:'auto'});
       


       










      try{if(typeof Sync!=='undefined'&&Sync&&typeof Sync.maybeShowSigninNudge==='function')Sync.maybeShowSigninNudge({inline:true});}catch(_){}
    }
     
    function editCompletedWorkout(id) {
      const workout=workoutState.completed.find(x=>x.id===id); if(!workout) return;
       


      if(workoutState.draft&&workoutState.draft.editingId!==id){
        requestStartWithConflict(workout.name,()=>openCompletedForEdit(workout),'Editing');
        return;
      }
      openCompletedForEdit(workout);
    }
     
    function openCompletedForEdit(workout){
       

      state.workoutHistoryOpen=false;
       

      workoutState.draft={name:workout.name,date:workout.date,programId:workout.programId||null,programWorkoutUid:workout.programWorkoutUid||null,editingId:workout.id,focusPreset:REP_PRESETS[workout.focusPreset]?workout.focusPreset:null, focusCustomRange:workout.focusCustomRange?{min:+workout.focusCustomRange.min,max:workout.focusCustomRange.max==null?null:+workout.focusCustomRange.max}:null, progression:workout.progression?{...workout.progression}:null,exercises:workout.exercises.map(item=>cloneExerciseItem(item,'forEdit',{noteOpen:!!item.note}))};
       


      state.workoutEditorOpen=true;
      $('#workoutComplete').hidden=true; schedulePersist(); renderWorkoutScreen();
    }
     

    function workoutSummary(workout) {
      const sets=workout.exercises.flatMap(item=>item.sets);
       






      const completedSets=sets.filter(set=>set.complete!==false).length;
       
      const exFor=item=>resolveExercise(item.exerciseId);
      const volume=workout.exercises.reduce((total,item)=>total+item.sets.reduce((t,set)=>t+setVolume(set,exFor(item)),0),0);
      const muscles=[...new Set(workout.exercises.flatMap(item=>{const ex=exFor(item);return [...(ex?.primary||[]),...(ex?.secondary||[])];}))];
       

      const totalSeconds=sets.reduce((total,set)=>total+(Number(set.seconds)||0),0);
      const timedOnly=sets.length>0&&sets.every(set=>Number(set.seconds)>0);
      const totalDistance=sets.reduce((total,set)=>total+(Number(set.distance)||0),0);
      const distanceOnly=sets.length>0&&!timedOnly&&sets.every(set=>Number(set.distance)>0);
       






      const mixedTimedDistance=sets.length>0&&!timedOnly&&!distanceOnly
        &&sets.some(set=>Number(set.seconds)>0)&&sets.some(set=>Number(set.distance)>0)
        &&sets.every(set=>Number(set.seconds)>0||Number(set.distance)>0);
      return {sets:sets.length,completedSets,volume,muscles,totalSeconds,timedOnly,totalDistance,distanceOnly,mixedTimedDistance};
    }
     














    function workoutPRs(workout) {
      const prs=[];
      const logged=sets=>(sets||[]).filter(set=>set&&set.complete!==false);
      workout.exercises.forEach(item=>{
        const ex=resolveExercise(item.exerciseId);
        if(!ex)return;
        const currentLogged=logged(item.sets);
        const priorLogged=logged(priorSetsForPR(workout,item.exerciseId));
         
        if((item.tracking||'reps')==='time'){
          if(sessionPRKinds(currentLogged,priorLogged,'time').includes('timed')){const best=Math.max(...currentLogged.map(s=>Number(s.seconds)||0));prs.push({name:ex.name,kind:'longest hold PR',value:`${Math.round(best)} sec`});}
          return;
        }
         

        if((typeof setPerfField==='function'?setPerfField(item,ex):'r')==='distance'){
          if(sessionPRKinds(currentLogged,priorLogged,'distance').includes('distance')){const best=Math.max(...currentLogged.map(s=>Number(s.distance)||0));prs.push({name:ex.name,kind:'longest distance PR',value:`${best} m`});}
          return;
        }
         


         



        const kinds=sessionPRKinds(currentLogged,priorLogged,'reps');
         

        if(kinds.includes('bw')){const currentBW=currentLogged.filter(set=>!(Number(set.w)>0)&&Number(set.r)>0);const best=Math.max(...currentBW.map(s=>Number(s.r)||0));prs.push({name:ex.name,kind:'best rep set PR',value:`${best} reps`});}
        const currentWeighted=currentLogged.filter(set=>Number(set.w)>0&&Number(set.r)>0);
         




        const priorWeighted=priorLogged.filter(set=>Number(set.w)>0&&Number(set.r)>0);
        const repPRs=repCountPRs(currentWeighted,priorWeighted);
        if(!kinds.includes('e1rm')&&!kinds.includes('heaviest')){
          for(const rc of repPRs)prs.push({name:ex.name,kind:`${rc.reps}-rep PR`,value:`${dbDisplayWeight(rc.weight,item.exerciseId,null,pairImplementExercise(ex))} ${weightUnit()}`});
          return;
        }
         

         


        if(kinds.includes('e1rm')){const currentEst=Math.max(...currentWeighted.map(estimate1RM));prs.push({name:ex.name,kind:'estimated 1RM PR',value:`${Math.round(dbDisplayWeight(currentEst,item.exerciseId,null,pairImplementExercise(ex)))} ${weightUnit()}`});}
        if(kinds.includes('heaviest')){const currentWeight=Math.max(...currentWeighted.map(set=>Number(set.w)||0));prs.push({name:ex.name,kind:'heaviest set PR',value:`${dbDisplayWeight(currentWeight,item.exerciseId,null,pairImplementExercise(ex))} ${weightUnit()}`});}
         
        for(const rc of repPRs)prs.push({name:ex.name,kind:`${rc.reps}-rep PR`,value:`${dbDisplayWeight(rc.weight,item.exerciseId,null,pairImplementExercise(ex))} ${weightUnit()}`});
      });
      return prs;
    }
     



    function completedSetSummary(item){
      const sets=item?.sets||[];
      if(!sets.length)return 'no sets';
      const tracking=item.tracking||'reps';
      if(tracking==='time'){
        const secs=sets.map(s=>Number(s.seconds)||0);
        if(secs[0]>0&&secs.every(v=>v===secs[0]))return `${sets.length} × ${secs[0]} sec`;
        return `${sets.length} sets (${secs.reduce((t,v)=>t+v,0)} sec)`;
      }
      const same=(a)=>a.every(v=>String(v??'')===String(a[0]??''));
      const ws=sets.map(s=>s.w), rs=sets.map(s=>s.r);
      if(same(rs)&&rs[0]!==''&&rs[0]!=null&&same(ws)&&Number(ws[0])>0)return `${sets.length} × ${rs[0]} (${dbDisplayWeight(ws[0],item.exerciseId,null,pairImplementExercise(resolveExercise(item.exerciseId)))} ${weightUnit()})`;
      if(same(rs)&&rs[0]!==''&&rs[0]!=null)return `${sets.length} × ${rs[0]}`;
      const dist=sets.reduce((t,s)=>t+(Number(s.distance)||0),0);
      if(dist>0)return `${sets.length} sets (${dist} m)`;
      return `${sets.length} set${sets.length===1?'':'s'}`;
    }
     
    function workoutPRRows(workout){
      return workoutPRs(workout).map(pr=>{
        const p=typeof pr==='string'?{name:pr,kind:'',value:''}:pr;
        return {name:p.name||'',kind:p.kind||'',value:p.value||''};
      });
    }
     




    function buildCompletedWorkoutShare(workout){
      if(!workout||!Array.isArray(workout.exercises)||!workout.exercises.length)return null;
      const summary=workoutSummary(workout);
      const totals={volume:summary.volume,sets:summary.sets};
      if(summary.timedOnly)totals.seconds=summary.totalSeconds;
      if(summary.distanceOnly)totals.distance=summary.totalDistance;
      const w={name:workout.name||'Workout',date:workout.date||'',totals,
        prs:workoutPRRows(workout),
        exercises:workout.exercises.map(item=>({
          exerciseId:item.exerciseId,
          name:resolveExercise(item.exerciseId)?.name||'Exercise',
          tracking:item.tracking,note:item.note||'',
          exerciseTags:[...(item.exerciseTags||[])],supersetId:item.supersetId||null,
          sets:(item.sets||[]).map(s=>({w:s.w,r:s.r,seconds:s.seconds,distance:s.distance,
            rpe:s.rpe,tags:[...(s.tags||[])],complete:s.complete!==false,
             



            ...((typeof setSide==='function'&&setSide(s))?{side:setSide(s)}:{}),
             


            ...((typeof isAmrapSet==='function'&&isAmrapSet(s))?{amrap:true}:{}),
             


            ...((typeof isFixedSet==='function'&&isFixedSet(s))?{fixed:true}:{})}))}))};
      if(Number.isFinite(Number(workout.durationSec))&&Number(workout.durationSec)>0)w.durationSec=Math.round(Number(workout.durationSec));
      return {v:SHARE_VERSION,kind:'workout',name:w.name,workout:w,
        customExercises:shareCustomExercises(workout.exercises)};
    }
     






     





    function completedExerciseMarkup(item, workoutId, opts={}) {
      const ex=opts.ex||resolveExercise(item.exerciseId),isBodyweight=ex?.equipment==='body only',tracking=item.tracking||'reps';
       
      const perfField=(typeof setPerfField==='function')?setPerfField(item,ex):(tracking==='time'?'seconds':'r');
      const volume=item.sets.reduce((total,set)=>total+setVolume(set,ex),0);
      const weightLabel=isBodyweight?'ADDED':'WEIGHT', perfLabel=perfField==='distance'?'DIST (M)':tracking==='time'?'SECONDS':'REPS';
       





      const headSummary=perfField==='distance'
        ? `${item.sets.reduce((n,set)=>n+(Number(set.distance)||0),0)} m total`
        : tracking==='time'
          ? `${item.sets.reduce((n,set)=>n+(Number(set.seconds)||0),0)} sec total`
          : `${formatVolume(volume)}${isBodyweight&&!volume?' (bodyweight)':''}`;
      const displayName=opts.name||ex?.name||'Exercise';
       



      const rirLens=typeof effortMode==='function'&&effortMode()==='rir'&&typeof rpeToRir==='function';
      const headName=opts.plainHead
        ?`<strong class="completed-exercise-title">${escapeHtml(displayName)}</strong>`
        :`<button class="completed-exercise-link" type="button" data-id="${escapeHtml(item.exerciseId)}" data-return-workout="${escapeHtml(workoutId||'')}">${escapeHtml(displayName)}</button>`;
      return `<section class="completed-exercise-detail"><div class="completed-exercise-detail-head">${headName}<span>${headSummary}</span></div>${item.exerciseTags?.length?`<div class="exercise-tag-row">${item.exerciseTags.map(tag=>`<span class="exercise-tag-chip ${workoutState.exerciseTagPresets.includes(tag)?'preset':''}">${escapeHtml(tag)}</span>`).join('')}</div>`:''}<div class="done-labels" aria-hidden="true"><span>SET</span><span>${weightLabel}</span><span>${perfLabel}</span><span>${rirLens?'RIR':'RPE'}</span></div><div class="done-sets">${item.sets.map((set,index)=>{
         






        const isDb=pairImplementExercise(ex);
        const dbReadout=isDb&&typeof dbTotalReadout==='function'?dbTotalReadout(set.w,item.exerciseId,null):'';
         




        const load=tracking==='time'?'—':isBodyweight?(Number(set.w)>0?`+${displayWeight(set.w)} ${weightUnit()}`:'—'):(set.w==null||set.w===''?`—`:`${dbDisplayWeight(set.w,item.exerciseId,null,isDb)} ${weightUnit()}`);
        const loadReadout=(tracking!=='time'&&!isBodyweight&&set.w!=null&&set.w!==''&&dbReadout)?`<span class="db-total-readout">${escapeHtml(dbReadout)}</span>`:'';
        const perf=perfField==='distance'?(set.distance==null||set.distance===''?`—`:`${set.distance} m`):tracking==='time'?(set.seconds==null||set.seconds===''?`—`:`${set.seconds} sec`):(set.r==null||set.r===''?`—`:`${set.r}`);
        return `<div class="done-set${set.complete===false?' is-unmarked':''}"><span class="done-num">${index+1}${setSide(set)?`<span class="set-side-badge ${setSide(set)}">${setSide(set)}</span>`:''}</span><span class="done-val">${escapeHtml(load)}${loadReadout}</span><span class="done-val">${escapeHtml(perf)}</span><span class="done-val">${set.rpe==null?'—':escapeHtml(String(rirLens?rpeToRir(set.rpe):set.rpe))}</span>${set.complete===false?'<span class="done-set-unmarked">not marked complete</span>':''}${(set.tags?.length||(typeof isAmrapSet==='function'&&isAmrapSet(set)))?`<span class="done-set-tags">${(set.tags||[]).map(tag=>`<span class="set-tag-chip">${escapeHtml(setTagLabel(tag))}</span>`).join('')}${(typeof isAmrapSet==='function'&&isAmrapSet(set))?'<span class="set-tag-chip">AMRAP</span>':''}</span>`:''}</div>`;}).join('')}</div>${item.note?`<p class="completed-note"><strong>Notes:</strong> ${escapeHtml(item.note)}</p>`:''}</section>`;
    }
     
     




    const PR_KIND_DISPLAY={'heaviest set PR':'Heaviest set PR','estimated 1RM PR':'Est. 1RM PR','best rep set PR':'Best rep set PR','longest distance PR':'Longest distance PR','longest hold PR':'Longest hold PR'};
    function prKindDisplay(kind){if(!kind)return '';return PR_KIND_DISPLAY[kind]||(kind.charAt(0).toUpperCase()+kind.slice(1));}
    function renderCompletedWorkout(workout, opts = {}) {
      updateLiveWorkoutIndicator();
      if(!workout)return;
      const summary=workoutSummary(workout),prs=workoutPRs(workout);
       


      const existingTemplate=workoutState.templates.find(t=>t.sourceLogId===workout.id);
       

      $('#workoutEditor').hidden = true; $('#workoutStart').hidden = true; $('#workoutHistory').hidden = true; $('#workoutComplete').hidden = false;
       


      $('#savedWorkout').hidden = true; $('#savedBuilder').hidden = true;
      noteWorkoutSubScreen('complete');
       

      if(state.activeView==='workout')setActiveNav('workout', null);
       

      if (opts.push) history.pushState({view:'workout', sub:'complete', completedId: workout.id, returnTo: returnRouteKey(state.workoutDetailReturn)||ROUTES.DETAIL_RETURN.HISTORY}, '', '#log-' + workout.id);
       








       
















      const completedProgram=(workout.programId&&typeof findProgramById==='function')?findProgramById(workout.programId):null;
      const completedProgramIsActive=!!(completedProgram&&workoutState.activeProgram&&workoutState.activeProgram.id===completedProgram.id);
       








      const completedProgramNext=(workout.programId&&completedProgramIsActive&&typeof suggestedProgramWorkout==='function')?suggestedProgramWorkout(completedProgram):null;
      const programPillHtml=completedProgram?`<div class="meta-chips" role="list" aria-label="Program">${completedProgramIsActive?`<button type="button" class="tag" id="completedProgramPill">${escapeHtml(completedProgram.name)}</button>`:`<span class="tag" role="listitem">${escapeHtml(completedProgram.name)}</span>`}</div>`:'';
       

      const programUpdateOffer=(()=>{try{const t=programTemplateUpdateTarget(workout);return !!(t&&programTemplateUpdatePlan(t.programWorkout.template?.exercises,workout.exercises).changed);}catch(_){return false;}})();
      $('#workoutComplete').innerHTML = `<div class="completed-card"><span class="continue-kicker">Completed workout</span><div class="detail-title-row"><h2>${escapeHtml(workout.name)}</h2><div class="detail-title-actions"><button class="icon-button" id="shareCompletedTemplateBtn" type="button" aria-label="Share ${escapeHtml(existingTemplate?existingTemplate.name:workout.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.5v-11"/><path d="M7.6 7.4L12 3l4.4 4.4"/><path d="M6 11.5V19a1.6 1.6 0 0 0 1.6 1.6h8.8A1.6 1.6 0 0 0 18 19v-7.5"/></svg></button><button class="primary-button" id="repeatCompletedWorkoutTop" type="button">Repeat</button></div></div><p class="completed-meta">Completed ${escapeHtml(formatLogDate(workout.date))}</p>${programPillHtml}${workout.finishedAnyway?'<p class="section-note">Finished with unlogged sets.</p>':''}<div class="workout-detail-metrics"><div class="stats-panel"><strong>${workout.exercises.length}</strong><span>Exercise${workout.exercises.length===1?'':'s'}</span></div>${ ''}${typeof statValuePanel==='function'?statValuePanel(summary.completedSets,SETS_TIERS,summary.completedSets===1?'Set':'Sets'):`<div class="stats-panel"><strong>${summary.completedSets}</strong><span>${summary.completedSets===1?'Set':'Sets'}</span></div>`}${summary.timedOnly||summary.distanceOnly||summary.mixedTimedDistance?`<div class="stats-panel"><strong>${summary.timedOnly?`${summary.totalSeconds} sec`:summary.distanceOnly?`${summary.totalDistance} m`:`${summary.totalSeconds} sec (${summary.totalDistance} m)`}</strong><span>${summary.timedOnly?'Total time':summary.distanceOnly?'Total distance':'Total time – distance'}</span></div>`:typeof statValuePanel==='function'?statValuePanel(displayVolume(summary.volume),VOLUME_TIERS,`Volume (${weightUnit()})`):`<div class="stats-panel"><strong>${formatVolume(summary.volume)}</strong><span>Total volume</span></div>`}</div><div class="section-head"><h3>Muscles worked</h3></div>${summary.muscles.length?(typeof workedMuscleMapBlockHtml==='function'?workedMuscleMapBlockHtml(workoutBodyMapMarkup(summary.muscles),muscleSetCounts([workout]),workedMuscles([workout]),{blindSpots:false}):workoutBodyMapMarkup(summary.muscles)):'<span class="section-note">No muscle data</span>'}${prs.length?`<div class="section-head"><h3>PRs hit</h3></div><div class="workout-prs">${prs.map(pr=>{const p=typeof pr==='string'?{name:pr,kind:'',value:''}:pr;const kind=prKindDisplay(p.kind);return `<div class="action-row pr-row"><span><strong>${escapeHtml(p.name)}</strong>${kind?`<span>${escapeHtml(kind)}</span>`:''}</span>${p.value?`<span class="pr-row-value">${escapeHtml(p.value)}</span>`:''}<span class="pr-row-date">${escapeHtml(formatLogDate(workout.date))}</span></div>`;}).join('')}</div>`:''}<div class="completed-exercise-details">${workout.exercises.map(item=>completedExerciseMarkup(item,workout.id)).join('')}</div><div id="completionSigninNudge"></div><div class="detail-action-buttons">${completedProgramNext?`<button class="primary-button detail-action-primary" id="saveCompletedWorkoutTop" type="button">Next: ${escapeHtml(completedProgramNext.name||'Workout')}</button>`:(workout.programId&&completedProgram)?'':`<button class="primary-button detail-action-primary" id="saveCompletedWorkoutTop" type="button">${existingTemplate?'Start':'Save to library'}</button>`}${programUpdateOffer?'<button class="text-link" id="updateProgramWorkoutBtn" type="button">Update program workout</button>':''}<div class="detail-action-row"><button class="secondary-button" id="editCompletedWorkout" type="button">Edit workout</button><button class="secondary-button danger-button" id="deleteCompletedWorkout" type="button">Delete workout</button></div></div><p class="status-note" id="completedSaveStatus" role="status"></p></div>`;
      document.querySelectorAll('.completed-exercise-link').forEach(button => button.addEventListener('click', () => openExercise(button.dataset.id, true, button.dataset.returnWorkout ? {view:'completed-workout', workoutId:button.dataset.returnWorkout} : undefined)));
      $('#editCompletedWorkout').addEventListener('click',()=>editCompletedWorkout(workout.id));
       


      $('#completedProgramPill')?.addEventListener('click',()=>{if(typeof showProgram==='function')showProgram();});
       










      $('#repeatCompletedWorkoutTop').addEventListener('click',()=>repeatWorkout(workout));
       
      $('#updateProgramWorkoutBtn')?.addEventListener('click',()=>{wireProgramTemplateUpdateDialog();openProgramTemplateUpdate(workout);});
       




      const saveCompletedTopBtn=$('#saveCompletedWorkoutTop');
      if(saveCompletedTopBtn){
        if(completedProgramNext)saveCompletedTopBtn.addEventListener('click',()=>requestStartWithConflict(completedProgramNext.name||'Workout',()=>startProgramWorkout(completedProgram,completedProgramNext)));
        else saveCompletedTopBtn.addEventListener('click',()=>existingTemplate?requestStartWithConflict(existingTemplate.name,()=>startWorkoutFromTemplate(existingTemplate.id)):saveCompletedAsTemplate(workout,$('#completedSaveStatus')));
      }
       





      $('#shareCompletedTemplateBtn')?.addEventListener('click',()=>deliverShareLink(buildCompletedWorkoutShare(workout)));
      $('#deleteCompletedWorkout').addEventListener('click',()=>{
        pendingDeleteCompletedWorkoutId=workout.id;
        $('#deleteCompletedWorkoutDesc').textContent=`Delete "${workout.name}" from ${formatLogDate(workout.date)}? This cannot be undone.`;
        showModalPinned($('#deleteCompletedWorkoutDialog'));
      });
       



       
      hydrateBodyMaps();
    }

    
     

















    function programTemplateRounds(sets){
      return (sets||[]).filter(s=>s&&setSide(s)!=='R').length;
    }
    function programTemplateEntryMatches(entry,exerciseId){
      if(!entry||!exerciseId)return false;
      if(entry.exerciseId===exerciseId)return true;
      const map=entry.weekVariants;
      return !!(map&&typeof map==='object'&&!Array.isArray(map)&&Object.values(map).some(v=>v&&v.exerciseId===exerciseId));
    }
     




    function programTemplateNewProgression(prog){
      if(!prog||typeof prog!=='object')return null;
      const out={};
      for(const k of ['mode','singleSide','singleDb','dbEntry','incrementType','incrementValue'])if(prog[k]!==undefined)out[k]=prog[k];
      if(prog.custom&&prog.min!=null){for(const k of ['custom','min','max','openTop','amrap','preset'])if(prog[k]!==undefined)out[k]=prog[k];}
      return Object.keys(out).length?out:null;
    }
    function programTemplateResizeSets(tSets,logItem){
      tSets=Array.isArray(tSets)?tSets:[];
      const tSided=tSets.some(s=>setSide(s));
      const logRows=cloneExerciseItem(logItem,'forTemplate').sets||[];
      const shape=tSided?logRows:logRows.filter(s=>setSide(s)!=='R').map(s=>{const c={...s};delete c.side;return c;});
      if(shape.length===tSets.length)return tSets;
      const last=tSets[tSets.length-1];
      return shape.map((s,i)=>{
        if(i<tSets.length)return tSets[i];
        const add={...s};
        if(last&&last.pct!=null&&add.pct==null)add.pct=last.pct;
        return add;
      });
    }
     

    function programTemplateUpdatePlan(templateExercises,logExercises){
      const tmpl=Array.isArray(templateExercises)?templateExercises:[];
      const log=(Array.isArray(logExercises)?logExercises:[]).filter(x=>x&&x.exerciseId);
      const nameOf=id=>(typeof resolveExercise==='function'?resolveExercise(id)?.name:null)||'Exercise';
      const used=new Set(),changes=[],out=[],order=[];
      const groupCounts={};
      log.forEach(x=>{if(x.supersetId)groupCounts[x.supersetId]=(groupCounts[x.supersetId]||0)+1;});
      log.forEach(item=>{
        const j=tmpl.findIndex((e,i)=>!used.has(i)&&programTemplateEntryMatches(e,item.exerciseId));
        const supersetId=item.supersetId&&groupCounts[item.supersetId]>1?item.supersetId:null;
        if(j<0){
          const built=cloneExerciseItem(item,'forSaveTemplate',{noteOpen:false,supersetId,progression:programTemplateNewProgression(item.progression)});
          out.push(built);
          changes.push(`Adds ${nameOf(item.exerciseId)} (${programTemplateRounds(built.sets)} set${programTemplateRounds(built.sets)===1?'':'s'})`);
          return;
        }
        used.add(j);order.push(j);
        const entry=tmpl[j];
        const sets=programTemplateResizeSets(entry.sets,item);
        const before=programTemplateRounds(entry.sets),after=programTemplateRounds(sets);
        if(before!==after)changes.push(`${nameOf(entry.exerciseId)}: ${before} → ${after} sets`);
        out.push({...entry,sets,supersetId});
      });
      tmpl.forEach((e,i)=>{if(!used.has(i)&&e&&e.exerciseId)changes.push(`Removes ${nameOf(e.exerciseId)}`);});
      if(order.some((j,k)=>k>0&&j<order[k-1]))changes.push('Reorders the exercises to match this session');
      return {exercises:out,changes,changed:changes.length>0};
    }
     
    function programTemplateUpdateTarget(workout){
      const prog=typeof workoutState!=='undefined'?workoutState.activeProgram:null;
      if(!workout||!workout.programId||!workout.programWorkoutUid||!prog||prog.id!==workout.programId)return null;
      const pw=(prog.workouts||[]).find(w=>w&&w.uid===workout.programWorkoutUid);
      return pw?{program:prog,programWorkout:pw}:null;
    }
    let pendingProgramTemplateUpdate=null;
    function openProgramTemplateUpdate(workout){
      const target=programTemplateUpdateTarget(workout);
      const dialog=$('#updateProgramWorkoutDialog');
      if(!target||!dialog)return;
      const plan=programTemplateUpdatePlan(target.programWorkout.template?.exercises,workout.exercises);
      if(!plan.changed)return;
      pendingProgramTemplateUpdate={workoutId:workout.id,programId:target.program.id,uid:target.programWorkout.uid};
      const title=$('#updateProgramWorkoutTitle');if(title)title.textContent=`Update “${target.programWorkout.name||'Workout'}”?`;
      const list=$('#updateProgramWorkoutChanges');
      if(list)list.innerHTML=plan.changes.map(c=>`<li>${escapeHtml(c)}</li>`).join('');
      if(typeof showModalPinned==='function')showModalPinned(dialog);else dialog.showModal();
    }
    function confirmProgramTemplateUpdate(){
      const p=pendingProgramTemplateUpdate;pendingProgramTemplateUpdate=null;
      $('#updateProgramWorkoutDialog')?.close();
      if(!p)return;
      const workout=(workoutState.completed||[]).find(w=>w.id===p.workoutId);
      const target=programTemplateUpdateTarget(workout);
      if(!target||target.program.id!==p.programId||target.programWorkout.uid!==p.uid)return;
      const pw=target.programWorkout;
      const plan=programTemplateUpdatePlan(pw.template?.exercises,workout.exercises);
      if(!plan.changed)return;
      pw.template={...(pw.template||{}),name:(pw.template&&pw.template.name)||pw.name,exercises:plan.exercises};
      if(typeof touchProgram==='function')touchProgram(target.program);
      schedulePersist();
      const status=$('#completedSaveStatus');
      if(status)status.textContent=`Updated “${pw.name||'Workout'}” in your program.`;
      $('#updateProgramWorkoutBtn')?.remove();
    }
    function wireProgramTemplateUpdateDialog(){
      const dialog=$('#updateProgramWorkoutDialog');
      if(!dialog||dialog.dataset.wired)return;
      dialog.dataset.wired='1';
      const cancel=()=>{pendingProgramTemplateUpdate=null;dialog.close();};
      $('#cancelUpdateProgramWorkout')?.addEventListener('click',cancel);
      $('#keepProgramWorkoutTemplate')?.addEventListener('click',cancel);
      $('#confirmUpdateProgramWorkout')?.addEventListener('click',confirmProgramTemplateUpdate);
    }
//# sourceMappingURL=workout-history.js.map
