
 
     








     

        
    function findDraftExercise(uid){
      return workoutState.draft?.exercises.find(item=>item.uid===uid);
    }
     


    function effortMode(){ return progressionSetup.effortMode==='rir' ? 'rir' : 'rpe'; }
     
     
    function effortDisplayPlaceholder(){
       


      return effortMode()==='rir'?'RIR':'RPE';
    }
     
     


    let startNewAfterDiscard=false;
     





    let pendingBlankStartDate=null;
    let pendingRemoveExerciseUid=null;
     
    function doRemoveExercise(){
      const draft=workoutState.draft; if(!draft||!pendingRemoveExerciseUid)return;
      draft.exercises=draft.exercises.filter(item=>item.uid!==pendingRemoveExerciseUid);
       


      normalizeSupersets();
      prepareDraftProgression(draft, workoutState.activeProgram?.id===draft.programId?workoutState.activeProgram.progression:freeformProgressionConfig());
      renderWorkoutExercises(); renderWorkoutProgression(); markDraftSaved();
      pendingRemoveExerciseUid=null;
       


    }
    $('#cancelRemoveExercise')?.addEventListener('click',()=>$('#removeExerciseDialog').close());
    $('#keepExercise')?.addEventListener('click',()=>$('#removeExerciseDialog').close());
    $('#confirmRemoveExercise')?.addEventListener('click',()=>{ $('#removeExerciseDialog').close(); doRemoveExercise(); });
     



    let reorderConfirmingDelete=false;
    const reorderSelectedUids=new Set();
     
    function openReorderDialog(){
       

      const list=contextExercises(); if(!list||list.length<2)return;
      reorderConfirmingDelete=false; reorderSelectedUids.clear();
      renderReorderDialog();
      $('#reorderExercisesDialog').showModal();
    }
     

    function renderReorderDialog(){
      const list=contextExercises(); if(!list)return;
      const title=$('#reorderExercisesTitle');
      const sub=$('#reorderExercisesSub');
      if(reorderConfirmingDelete){
        const n=reorderSelectedUids.size;
        if(title)title.textContent=`Delete ${n} exercise${n===1?'':'s'}?`;
        if(sub)sub.textContent='';
      }else{
        if(title)title.textContent='Reorder exercises';
        if(sub)sub.textContent='Tick boxes to group or delete – arrows reorder.';  
      }
      renderReorderList();
      renderReorderFoot();
    }
     


    function renderReorderList(){
      const list=contextExercises(); if(!list)return;
      const listEl=$('#reorderExercisesList'); if(!listEl)return;
       
      if(reorderConfirmingDelete){ listEl.innerHTML=reorderDeleteConfirmHtml(list); return; }
       



      const blocks=(typeof supersetVisualBlocks==='function')
        ?supersetVisualBlocks(list)
        :list.map(item=>({group:false,items:[item]}));
      const upSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>';
      const downSvg='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
      listEl.innerHTML=blocks.map((block,bi)=>{
        const names=block.items.map(item=>{
          const ex=resolveExercise(item.exerciseId);
          return ex?ex.name:'Exercise';
        });
        const groupNum=block.group?supersetGroupNumber(list,block.supersetId):0;
        const nameHtml=block.group
          ?`<span class="reorder-superset-tag">Superset ${groupNum}</span><span class="reorder-members">${names.map(n=>escapeHtml(n)).join(' – ')}</span>`
          :escapeHtml(names[0]);
        const label=block.group?`superset ${groupNum}`:names[0];
        const checked=block.items.some(item=>reorderSelectedUids.has(item.uid));
        return `<div class="reorder-row" data-reorder-block="${bi}">
          <button class="reorder-check" type="button" data-check-block="${bi}" aria-pressed="${checked}" aria-label="Select ${escapeHtml(label)}"><span class="select-check${checked?' on':''}" aria-hidden="true">${checked?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>':''}</span></button>
          <span class="reorder-name">${nameHtml}</span>
          <span class="reorder-arrows">
            <button class="reorder-arrow" type="button" data-move="up" data-block="${bi}" ${bi===0?'disabled':''} aria-label="Move ${escapeHtml(label)} up">${upSvg}</button>
            <button class="reorder-arrow" type="button" data-move="down" data-block="${bi}" ${bi===blocks.length-1?'disabled':''} aria-label="Move ${escapeHtml(label)} down">${downSvg}</button>
          </span>
        </div>`;
      }).join('');
      listEl.querySelectorAll('[data-check-block]').forEach(btn=>btn.addEventListener('click',()=>{
        const list2=contextExercises(); if(!list2)return;
        const blocks2=(typeof supersetVisualBlocks==='function')
          ?supersetVisualBlocks(list2)
          :list2.map(item=>({group:false,items:[item]}));
        const block=blocks2[Number(btn.dataset.checkBlock)]; if(!block)return;
        const anyOn=block.items.some(item=>reorderSelectedUids.has(item.uid));
        block.items.forEach(item=>{ if(anyOn)reorderSelectedUids.delete(item.uid); else reorderSelectedUids.add(item.uid); });
        renderReorderDialog();
         

        listEl.querySelector(`[data-check-block="${CSS.escape(btn.dataset.checkBlock)}"]`)?.focus({preventScroll:true});
      }));
      listEl.querySelectorAll('.reorder-arrow').forEach(btn=>btn.addEventListener('click',()=>{
        const list2=contextExercises(); if(!list2)return;
        const move=btn.dataset.move, bi=Number(btn.dataset.block);
         


        const blocks2=(typeof supersetVisualBlocks==='function')
          ?supersetVisualBlocks(list2)
          :list2.map(item=>({group:false,items:[item]}));
        const block=blocks2[bi]; if(!block||!block.items.length)return;
        const i=list2.findIndex(x=>x.uid===block.items[0].uid); if(i<0)return;
        const moved=moveBlockAt(list2,i,move); if(!moved)return;
        list2.length=0; list2.push(...moved);
        contextSaved();
        renderReorderList();
         


        const newBi=move==='up'?bi-1:bi+1;
        listEl.querySelector(`.reorder-arrow[data-block="${newBi}"][data-move="${move}"]`)?.focus({preventScroll:true});
      }));
    }
     
    function reorderDeleteConfirmHtml(list){
      const names=list.filter(item=>reorderSelectedUids.has(item.uid))
        .map(item=>{const ex=resolveExercise(item.exerciseId);return ex?ex.name:'Exercise';});
      let who;
      if(names.length===1)who=`<b>${escapeHtml(names[0])}</b>`;
      else if(names.length===2)who=`<b>${escapeHtml(names[0])}</b> and <b>${escapeHtml(names[1])}</b>`;
      else who=`<b>${escapeHtml(names[0])}</b>, <b>${escapeHtml(names[1])}</b>, and ${names.length-2} other${names.length-2===1?'':'s'}`;
      return `<p class="reorder-confirm-body">${who} will be removed from this workout, along with ${names.length===1?'its':'their'} sets. This can't be undone.</p>`;
    }
     

    function renderReorderFoot(){
      const foot=$('#reorderExercisesFoot'); if(!foot)return;
      if(reorderConfirmingDelete){
        foot.innerHTML=`<button class="secondary-button" id="backReorderSelect" type="button">Cancel</button>`
          +`<button class="primary-button danger-button" id="confirmReorderDelete" type="button">Delete</button>`;
        $('#backReorderSelect')?.addEventListener('click',()=>{reorderConfirmingDelete=false;renderReorderDialog();});
        $('#confirmReorderDelete')?.addEventListener('click',confirmReorderDelete);
        return;
      }
      if(reorderSelectedUids.size){
        const list=contextExercises()||[];
        const selectedBlocks=(typeof supersetVisualBlocks==='function'
          ?supersetVisualBlocks(list)
          :list.map(item=>({group:false,items:[item]})))
          .filter(block=>block.items.some(item=>reorderSelectedUids.has(item.uid)));
        const n=reorderSelectedUids.size;
         


        const action=(selectedBlocks.length===1&&selectedBlocks[0].group)
          ?`<button class="primary-button" id="ungroupReorderSelection" type="button">Ungroup</button>`
          :`<button class="primary-button" id="groupReorderSelection" type="button" ${selectedBlocks.length<2?'disabled':''}>Group as superset (${n})</button>`;
        foot.innerHTML=`<div class="reorder-select-foot"><div class="reorder-select-actions">`
          +action
          +`<button class="primary-button danger-button" id="deleteReorderSelection" type="button">Delete</button></div></div>`;
        $('#groupReorderSelection')?.addEventListener('click',groupReorderSelection);
        $('#ungroupReorderSelection')?.addEventListener('click',ungroupReorderSelection);
        $('#deleteReorderSelection')?.addEventListener('click',()=>{reorderConfirmingDelete=true;renderReorderDialog();});
        return;
      }
      foot.innerHTML=`<button class="primary-button" id="doneReorderExercises" type="button">Done</button>`;
      $('#doneReorderExercises')?.addEventListener('click',()=>{ $('#reorderExercisesDialog').close(); contextRerender(); });
    }
     

    function groupReorderSelection(){
      const list=contextExercises(); if(!list)return;
      if(reorderSelectedUids.size<2)return;
      const gid=newSupersetGroupId();
      list.forEach(item=>{if(reorderSelectedUids.has(item.uid))item.supersetId=gid;});
      normalizeSupersets();
      contextSaved();
      reorderSelectedUids.clear();
      renderReorderDialog(); contextRerender();
    }
     
    function ungroupReorderSelection(){
      const list=contextExercises(); if(!list)return;
      list.forEach(item=>{if(reorderSelectedUids.has(item.uid))item.supersetId=null;});
      normalizeSupersets();
      contextSaved();
      reorderSelectedUids.clear();
      renderReorderDialog(); contextRerender();
    }
     


    function confirmReorderDelete(){
      const list=contextExercises(); if(!list)return;
      const kept=list.filter(item=>!reorderSelectedUids.has(item.uid));
      list.length=0; list.push(...kept);
      normalizeSupersets();
      if(exerciseListContext()==='draft'&&workoutState.draft){
         

        const activeProg=workoutState.activeProgram;
        const progConfig=(activeProg&&activeProg.id===workoutState.draft.programId)
          ?activeProg.progression:freeformProgressionConfig();
        prepareDraftProgression(workoutState.draft,progConfig);
      }
      contextSaved();
      reorderSelectedUids.clear(); reorderConfirmingDelete=false;
       

      if(list.length<2){ $('#reorderExercisesDialog').close(); contextRerender(); return; }
      renderReorderDialog(); contextRerender();
    }
    $('#reorderWorkoutExercises')?.addEventListener('click',openReorderDialog);
    $('#cancelReorderExercises')?.addEventListener('click',()=>$('#reorderExercisesDialog').close());
     


















    (()=>{
      const reorderBtn=$('#reorderWorkoutExercises');
      const actions=reorderBtn?.closest?.('.workout-toolbar-actions');
      if(!reorderBtn||!actions||$('#addExerciseFromToolbar'))return;
      const btn=document.createElement('button');
      btn.className='exercise-info-button plain-glyph toolbar-icon-btn';
      btn.id='addExerciseFromToolbar';
      btn.type='button';
      btn.setAttribute('aria-label','Add exercise');
      btn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
      btn.addEventListener('click',()=>{ if(typeof window.openDraftExercisePicker==='function')window.openDraftExercisePicker(); });
       


      actions.insertBefore(btn,reorderBtn.nextSibling);
    })();
     
    $('#historySearch')?.addEventListener('input',()=>renderWorkoutHistoryList());
     
    function newSet() { return {uid:newSetId(), w:'', r:'', seconds:'', distance:'', rpe:'', targetRpe:'', tags:[], complete:false}; }
     




    function newExerciseItem(opts={}) {
      const ex=opts.exerciseId&&typeof exercises!=='undefined'?resolveExercise(opts.exerciseId):null;
       

      const metrics=Array.isArray(opts.metrics)?[...opts.metrics]:(typeof exerciseMetrics==='function'?exerciseMetrics(ex):null);
      return {
        uid: newExerciseUid(),
        exerciseId: opts.exerciseId,
        tracking: opts.tracking || 'reps',
        metrics,
        note: opts.note || '',
        noteOpen: !!opts.noteOpen,
        exerciseTags: [...(opts.exerciseTags || [])],
        supersetId: opts.supersetId || null,
        progression: opts.progression ? {...opts.progression} : null,
        sets: opts.sets || []
      };
    }
     








    function lastUsedWeight(exerciseId) {
      const seedFrom = logs => {
        const sorted = logs.slice().sort(sortByWorkoutDateDesc);  
        for (const log of sorted) {
          const work = log.sets.filter(set => Number(set.w) > 0 && set.complete !== false && !isWarmupSet(set));
          if (work.length) return String(work[work.length - 1].w);
        }
        return '';
      };
       









      const draft = workoutState.draft;
      const slot = (draft && typeof forkDraftSlot === 'function') ? forkDraftSlot(draft) : null;
      if (slot && typeof forkSlotLogs === 'function') {
        const seeded = seedFrom(forkSlotLogs(exerciseId, slot.programId, slot.workoutUid));
        if (seeded) return seeded;
      }
      return seedFrom(getExerciseLogs(exerciseId));
    }
     












    function lastUsedGhost(item) {
       





      const ghostEx=item&&typeof resolveExercise==='function'?resolveExercise(item.exerciseId):null;
      if(ghostEx&&(ghostEx.equipment==='body only'||(typeof exerciseTracking==='function'&&exerciseTracking(item,ghostEx)==='time'))){
        return {value:'',scaled:false};
      }
      const rawSeed=lastUsedWeight(item.exerciseId);
      if(!rawSeed)return {value:'',scaled:false};
       







      const gymRule=(typeof gymLoadRule==='function')?gymLoadRule(item.exerciseId,(typeof forkEngineProfileForItem==='function'&&typeof workoutState!=='undefined')?forkEngineProfileForItem(item,workoutState.draft):((item&&item.progression)||null)):null;
      let raw=rawSeed;
      if(gymRule){
        const seedN=Number(rawSeed);
        if(seedN>0){
          if(gymRule.kind==='list'&&typeof withGymSnap==='function'){
            const w=withGymSnap(gymRule,()=>snapToIncrement(seedN,'lb',5));
            if(w>0)raw=String(w);
          }else if(gymRule.maxLb&&seedN>gymRule.maxLb)raw=String(gymRule.maxLb);
        }
      }
      const scale=(typeof forkDeloadSessionScale==='function')?forkDeloadSessionScale(workoutState.draft):null;
      if(scale==null)return {value:raw,scaled:false};
      const n=Number(raw);if(!(n>0))return {value:raw,scaled:false};
      const prog=(item&&item.progression)||{};
      const program=(workoutState.activeProgram&&workoutState.draft&&workoutState.draft.programId===workoutState.activeProgram.id)?workoutState.activeProgram:null;
      const aprog=(program&&program.progression)||{};
      const incType=prog.incrementType||aprog.incrementType||(typeof progressionSetup!=='undefined'?progressionSetup.incrementType:undefined)||'lb';
      const incRaw=Number(prog.incrementValue ?? aprog.incrementValue ?? (typeof progressionSetup!=='undefined'?progressionSetup.incrementValue:undefined) ?? 5);
      const incValueLb=incType==='percent'?incRaw:((typeof isMetric==='function'&&isMetric())?incRaw/LB_TO_KG:incRaw);
       

      const snapGhost=v=>{const w=(gymRule&&typeof withGymSnap==='function')?withGymSnap(gymRule,()=>snapToIncrement(v,incType,incValueLb)):snapToIncrement(v,incType,incValueLb);const mx=gymRule&&gymRule.maxLb;return mx&&w>mx?mx:w;};
      const scaled=snapGhost(n*scale/100);
      return scaled>0?{value:String(scaled),scaled:true}:{value:raw,scaled:false};
    }
     





     






    function latestTopSetPerf(exerciseId, perf, isAmrap) {
      if (isAmrap) return '';
      const logs = getExerciseLogs(exerciseId).slice().sort(sortByWorkoutDateDesc);  
      const latest = logs[0];
      if (!latest?.sets?.length) return '';
       
      if (perf==='distance') {
        const best=Math.max(0,...latest.sets.map(s=>Number(s.distance)||0));
        return best>0?String(best):'';
      }
      const top = latest.sets.slice().sort((a,b) => estimate1RM(b) - estimate1RM(a))[0];
      const v = perf === 'seconds' ? top.seconds : top.r;
      return v == null || v === '' ? '' : String(v);
    }
     


     
























    function livePRKinds(item,set) {
      if(!item||!set)return [];
      const ex=resolveExercise(item.exerciseId);
      const tracking=exerciseTracking(item,ex);
      const name=ex?.name||'Exercise';
      const draft=(typeof workoutState!=='undefined'&&workoutState)?workoutState.draft:null;
      const prior=[];
      getExerciseLogs(item.exerciseId).forEach(log=>{
        if(draft){
          if(draft.editingId&&log.workoutId===draft.editingId)return;
          if(draft.date&&log.isoDate&&log.isoDate>draft.date)return;
        }
        (log.sets||[]).forEach(s=>{if(s&&s.complete!==false)prior.push(s);});
      });
      let current;
      if(Array.isArray(item.sets)&&item.sets.length){
        current=item.sets.filter(s=>s&&(s.complete||s===set));
        if(!current.includes(set))current.push(set);
      }else current=[set];
       

      if(tracking==='time'){
        return sessionPRKinds(current,prior,'time').includes('timed')
          ?[{kind:'timed',label:`${name} (new longest hold PR)`}]:[];
      }
       

      if(setPerfField(item,ex)==='distance'){
        return sessionPRKinds(current,prior,'distance').includes('distance')
          ?[{kind:'distance',label:`${name} (new distance PR)`}]:[];
      }
      if(tracking!=='reps')return [];
       


      const labels={e1rm:'new estimated 1RM PR',heaviest:'new heaviest set PR',bw:'new rep PR'};
      return sessionPRKinds(current,prior,'reps')
        .map(kind=>({kind,label:`${name} (${labels[kind]})`}));
    }
     


    function livePRLabel(item,set) {
      const kinds=livePRKinds(item,set);
      return kinds.length?kinds[0].label:'';
    }

     


     

    function markDraftSaved() {
      schedulePersist();
    }

     
    function startBlankWorkout(name = '', programId = null, programWorkoutUid = null) {
       

      const defaultFocus = progressionSetup.defaultRange?.preset || null;
       

      state.workoutHistoryOpen=false;
       



      workoutState.draft = {name, date:localIsoDate(), exercises:[], programId, programWorkoutUid, editingId:null, focusPreset:defaultFocus, startedAt:new Date().toISOString()};
      $('#workoutComplete').hidden = true;
      state.workoutEditorOpen = true;  
      renderWorkoutScreen();
       








    }

     


     

    function findProgramById(id){
      if(!id)return null;
      return (workoutState.activeProgram?.id===id?workoutState.activeProgram:null)
        ||(workoutState.archivedPrograms||[]).find(p=>p.id===id)
        ||null;
    }
     



    function draftProgramLine(draft){
      if(!draft?.programId)return '';
      const program=findProgramById(draft.programId);
      if(!program)return '';
      const pw=(program.workouts||[]).find(w=>w.uid===draft.programWorkoutUid);
      return `${escapeHtml(program.name)}${pw?` – ${escapeHtml(pw.name)}`:''}`;
    }
     























    function programNameChip(workout){
      if(!workout?.programId)return '';
      const program=findProgramById(workout.programId);
      return program?`<span class="program-eyebrow">${escapeHtml(program.name)}</span>`:'';
    }
     

    function recentWorkoutButton(workout, dataAttr, smallText, opts = {}) {
       

       

























      const s=workoutSummary(workout);
       







      const hasPR=!opts.plain&&(typeof workoutPRs==='function')?workoutPRs(workout).length>0:false;
      const summary = smallText || (()=>{const vol=s.timedOnly?`${s.totalSeconds} sec`:formatVolume(s.volume);const exCount=(workout.exercises||[]).length;return `<span class="m-ink">${escapeHtml(formatLogDate(workout.date))}.</span><span class="fact">${exCount} exercise${exCount===1?'':'s'}</span><span class="fact">${s.sets} set${s.sets===1?'':'s'}</span><span class="fact">${escapeHtml(vol)}</span>`;})();
       



      return `<button class="recent-workout${hasPR?' has-pr':''}" type="button" ${dataAttr}="${escapeHtml(workout.id)}"><span>${programNameChip(workout)}<strong class="rw-title-row"><span class="rw-name">${escapeHtml(workout.name)}</span>${hasPR?'<span class="pr-tag">PR</span>':''}</strong><small class="row-meta">${summary}</small></span></button>`;
    }
     
















    function historyWorkoutButton(workout){
      const s=workoutSummary(workout);
      const vol=s.timedOnly?`${s.totalSeconds} sec`:formatVolume(s.volume);
      const exCount=(workout.exercises||[]).length;
      const summary=`<span class="m-ink">${escapeHtml(formatLogDate(workout.date))}.</span><span class="fact">${exCount} exercise${exCount===1?'':'s'}</span><span class="fact">${s.sets} set${s.sets===1?'':'s'}</span><span class="fact">${escapeHtml(vol)}</span>`;
       



      return `<button class="recent-workout log-row" type="button" data-history-workout="${escapeHtml(workout.id)}"><span>${programNameChip(workout)}<strong class="rw-title-row"><span class="rw-name">${escapeHtml(workout.name)}</span></strong><small class="row-meta">${summary}</small></span></button>`;
    }
     
    function showWorkoutHistory(){
      state.workoutHistoryOpen=true;
      const s=$('#historySearch'); if(s)s.value='';
      renderWorkoutScreen();
       


      setActiveNav('workout', null);
      window.scrollTo({top:0,behavior:'auto'});
      history.pushState({view:'workout', sub:'history'}, '', '#workout');
    }
     
    function hideWorkoutHistory(){
      state.workoutHistoryOpen=false;
      renderWorkoutScreen();
      window.scrollTo({top:0,behavior:'auto'});
    }
     



    function exerciseNamesForSearch(workout){
      return (workout.exercises||[]).map(item=>{
        const ex=resolveExercise(item.exerciseId);
        return ex?ex.name:'';
      });
    }
     
    function renderWorkoutHistoryList(){
      const host=$('#workoutHistoryList'); if(!host)return;
       
      const tabsHost=$('#logPeriodTabs');
      if(tabsHost){
        tabsHost.innerHTML=periodTabs('data-log-period',state.logPeriod||'all');
        tabsHost.querySelectorAll('[data-log-period]').forEach(button=>button.addEventListener('click',()=>{
          if(state.logPeriod===button.dataset.logPeriod)return;
          state.logPeriod=button.dataset.logPeriod;schedulePersist();
           

          const scrollY=window.scrollY;
          renderWorkoutHistoryList();
          requestAnimationFrame(()=>{if(window.scrollY!==scrollY)window.scrollTo(0,scrollY);});
        }));
      }
      const searchEl=$('#historySearch');
      const query=(searchEl&&searchEl.value||'').trim().toLowerCase();
      let list=workoutsForPeriod(state.logPeriod||'all').slice().sort(sortByWorkoutDateDesc);  
      if(query) list=list.filter(w=>(w.name||'').toLowerCase().includes(query)||exerciseNamesForSearch(w).some(name=>name.toLowerCase().includes(query)));
       




      if(searchEl)searchEl.placeholder=`Search ${list.length} workout${list.length===1?'':'s'}`;
      if(!list.length){
         


        const hasAnyData=(workoutState.completed||[]).length>0;
        if(!hasAnyData){
           



          host.innerHTML=`<div class="fork-empty-state">${emptyStateHtml({
            title:'No logs yet',
            description:'Finished workouts land here with every set, rep, and PR.',
            primaryHtml:emptyStatePrimary('logsEmptyStart','Start a workout'),
            secondaryHtml:emptyStateSecondary('logsEmptyImport','Import past workouts')
          })}</div>`;
          $('#logsEmptyStart')?.addEventListener('click',()=>{state.workoutHistoryOpen=false;startBlankWorkout();});
          $('#logsEmptyImport')?.addEventListener('click',()=>{if(typeof openCsvImport==='function')openCsvImport();});
          return;
        }
        host.innerHTML=query
          ?`<p class="section-note">No workouts match your search. <button class="text-link" id="logsClearSearch" type="button">Clear search</button></p>`
          :`<p class="section-note">No logs in this period. <button class="text-link" id="logsViewAll" type="button">View all time</button></p>`;
        $('#logsClearSearch')?.addEventListener('click',()=>{const el=$('#historySearch');if(el)el.value='';renderWorkoutHistoryList();});
        $('#logsViewAll')?.addEventListener('click',()=>{state.logPeriod='all';schedulePersist();renderWorkoutHistoryList();});
        return;
      }
       


      host.innerHTML=`<div class="dashboard-card history-card"><div class="recent-workouts">${list.map(workout=>historyWorkoutButton(workout)).join('')}</div></div>`;
      host.querySelectorAll('[data-history-workout]').forEach(button=>button.addEventListener('click',()=>{state.workoutHistoryOpen=false;state.workoutDetailReturn=ROUTES.DETAIL_RETURN.HISTORY;renderCompletedWorkout(workoutState.completed.find(workout=>workout.id===button.dataset.historyWorkout),{push:true});}));
    }
     



    function workoutHomeLayout({hasProgram, hasLastWorkout}) {
      return {
        showNextInProgram: hasProgram,
        blankAsHero: !hasProgram,
        showRepeatLast: hasLastWorkout,
      };
    }
     
    function renderWorkoutProgramSuggestion(homeLayout) {
      const host=$('#programStartSuggestion'),program=workoutState.activeProgram;
      if(!host)return;
       


















      const layout=homeLayout||workoutHomeLayout({hasProgram:!!program,hasLastWorkout:true});
      const options=host.closest('.workout-start-options');
      if(layout.blankAsHero){
        host.innerHTML='';
        options?.querySelector('#createProgramCard')?.remove();
        return;
      }
       



      options?.querySelector('#createProgramCard')?.remove();
      const ready=(program.workouts||[]).filter(workout=>workout.template?.exercises?.length);
      const next=suggestedProgramWorkout(program),week=programWeek(program),range=programRangeForWeek(program,week);
      if(!next){host.innerHTML=`<div class="program-next-wrap"><div class="program-next-main"><span><span class="program-next-kicker">ACTIVE PROGRAM &nbsp;<span class="sub">${escapeHtml(program.name)}</span></span><strong>Set up your first workout</strong><small>Week ${week}, ${escapeHtml(programRangeLabel(range))}</small></span></div></div>`;host.querySelector('.program-next-main').addEventListener('click',()=>showProgram());return;}
       



      const flexHtml=ready.length>1?`<div class="program-next-flexibility"><button class="program-next-flex-toggle" type="button" data-fork-flex-toggle aria-expanded="false">Choose a different program workout</button><div class="program-next-alternatives" hidden>${ready.filter(workout=>workout.uid!==next.uid).map(workout=>`<button type="button" data-start-program-alternative="${escapeHtml(workout.uid)}">${escapeHtml(workout.name)}</button>`).join('')}</div></div>`:'';
       











      const draft=workoutState.draft;
      const liveDuplicate=!!(draft&&draft.programId&&draft.programWorkoutUid&&draft.programId===program.id&&draft.programWorkoutUid===next.uid);
      if(liveDuplicate){
        host.innerHTML=flexHtml?`<div class="program-next-wrap">${flexHtml}</div>`:'';
      }else{
        host.innerHTML=`<div class="program-next-wrap"><button class="program-next-main" id="startSuggestedProgramWorkout" type="button"><span><span class="program-next-kicker">CONTINUE PROGRAM &nbsp;<span class="sub">${escapeHtml(program.name)}</span></span><strong>${escapeHtml(next.name)}</strong><small>Week ${week}, ${next.template.exercises.length} exercise${next.template.exercises.length===1?'':'s'}, ${escapeHtml(programWorkoutRangeLabel(program,next,week))}</small></span></button>${flexHtml}</div>`;
        $('#startSuggestedProgramWorkout').addEventListener('click',()=>startProgramWorkout(program,next));
      }
      host.querySelector('[data-fork-flex-toggle]')?.addEventListener('click',event=>{const btn=event.currentTarget;const list=btn.parentElement?.querySelector('.program-next-alternatives');if(!list)return;list.hidden=!list.hidden;btn.setAttribute('aria-expanded',String(!list.hidden));});
      document.querySelectorAll('[data-start-program-alternative]').forEach(button=>button.addEventListener('click',()=>{const workout=ready.find(row=>row.uid===button.dataset.startProgramAlternative);if(workout)startProgramWorkout(program,workout);}));
    }
     









    function noteWorkoutSubScreen(sub) {
      if (state.workoutSubScreen === sub) return false;
      state.workoutSubScreen = sub;
      state.scroll['workout:' + sub] = 0;
      if (state.activeView === 'workout') window.scrollTo({top: 0, behavior: 'auto'});
      return true;
    }
     





    function workoutPaneSelection({hasDraft, editorRequested, historyOpen, completeVisible, shareOpen, savedOpen, builderOpen}) {
       


      const editorOpen = hasDraft && editorRequested && !historyOpen && !shareOpen;
      const viewingComplete = !hasDraft && completeVisible;
       




      const viewingHistory = !viewingComplete && !shareOpen && historyOpen;
      const viewingShare = !editorOpen && shareOpen;
      const viewingSaved = !editorOpen && !viewingShare && savedOpen;
      const viewingBuilder = !editorOpen && !viewingShare && builderOpen;
      const showingStart = !editorOpen && !viewingComplete && !viewingHistory && !viewingSaved && !viewingBuilder && !viewingShare;
      return {editorOpen, viewingComplete, viewingHistory, viewingShare, viewingSaved, viewingBuilder, showingStart};
    }
     

    function renderWorkoutScreen() {
       

      try{if(typeof renderGymPickers==='function')renderGymPickers();}catch(_){}
       






      if(typeof maybeRefreshDraftSuggestions==='function'){try{maybeRefreshDraftSuggestions();}catch(_){}}
      const hasDraft = !!workoutState.draft;
       


      
      if (hasDraft) { $('#workoutComplete').hidden = true; }
      const {editorOpen, viewingComplete, viewingHistory, viewingShare, viewingSaved, viewingBuilder, showingStart} = workoutPaneSelection({
        hasDraft,
        editorRequested: state.workoutEditorOpen,
        historyOpen: state.workoutHistoryOpen,
        completeVisible: !$('#workoutComplete').hidden,
        shareOpen: !!state.sharePreview,
        savedOpen: !!state.savedWorkoutId,
        builderOpen: !!state.savedBuilder && state.builderOpen,
      });
       





      noteWorkoutSubScreen(editorOpen ? 'editor' : (viewingShare ? 'share' : (viewingBuilder ? 'builder' : (viewingComplete ? 'complete' : (viewingHistory ? 'history' : (viewingSaved ? 'saved' : 'start'))))));
       

      if (state.activeView === 'workout') updateTopBar('workout');
      $('#workoutStart').hidden = !showingStart;
      $('#workoutEditor').hidden = !editorOpen;
       





      $('#workoutHistory').hidden = !viewingHistory;
      $('#savedWorkout').hidden = !viewingSaved;
      $('#savedBuilder').hidden = !viewingBuilder;
      $('#sharePreview').hidden = !viewingShare;
      updateLiveWorkoutIndicator();
      if (showingStart) {
        renderContinueWorkout();
        renderBuilderContinue();
         


        $('#workoutStart')?.classList.toggle('draft-live', hasDraft);
        const latestReal=workoutState.completed.slice().sort(sortByRecencyDesc)[0];  
         

        const homeLayout=workoutHomeLayout({hasProgram:!!workoutState.activeProgram,hasLastWorkout:!!latestReal});
         









        renderWorkoutProgramSuggestion(homeLayout);
        if (!hasDraft) {
          const repeatLink=$('#repeatLastHero');
           




          if(repeatLink)repeatLink.hidden=!homeLayout.showRepeatLast;
        }
        renderWorkoutTemplateList();
      }
      if (viewingHistory) renderWorkoutHistoryList();
      if (viewingShare) renderSharePreview();
      if (viewingSaved) renderSavedWorkoutEditor();
      if (viewingBuilder) renderSavedBuilder();
      if (!editorOpen) return;
       







      const headerNameInput=$('#workoutName');
      if (headerNameInput && (headerNameInput.hidden || typeof document === 'undefined' || document.activeElement !== headerNameInput)) headerNameInput.value = workoutState.draft.name || '';
       

      if(typeof forkSyncHeaderNameDisplay==='function')forkSyncHeaderNameDisplay();
      $('#workoutDate').value = workoutState.draft.date;
      renderWorkoutDateDisplay();
      renderWorkoutExercises();
      renderWorkoutProgression();
      syncWorkoutFocusPills();
    }
     



























    function renderContinueWorkout() {
      const wrap = $('#continueWorkoutWrap');
      if (!wrap) return;
      const draft = workoutState.draft;
       













      if (!draft) { wrap.hidden = true; wrap.innerHTML = ''; return; }
      wrap.hidden = false;
       


























      wrap.innerHTML = `<section class="continue-workout-card fork-continue-card">${forkInProgressCardHtml(draft)}</section>`;
      forkWireInProgressCard(wrap, () => { state.workoutEditorOpen = true; renderWorkoutScreen(); });
    }

     
    function swipeGestureShouldLock(ax, ay) {
      ax = Math.abs(ax); ay = Math.abs(ay);
      if (ax < 7 && ay < 7) return false;                 
      if (ay > ax && (ay >= 12 || ax < 7)) return false;  
      return true;                                       
    }
     

     


    let swipeOutsideCloserInstalled = false;
     
    function setSwipeOpen(item, open) {
       





      item.classList.toggle('is-open', open);
      item.classList.remove('is-swiping');  
      const action = item.querySelector(':scope > .swipe-delete-action');
      if (action) action.tabIndex = open ? 0 : -1;
       




      if (action) action.setAttribute('aria-hidden', open ? 'false' : 'true');
       









      const content = item.querySelector(':scope > .swipe-content');
      if (content) { content.style.transition = ''; content.style.transform = ''; }
    }
     
    function installSwipeOutsideCloser() {
      if (swipeOutsideCloserInstalled) return;
      swipeOutsideCloserInstalled = true;
       


      document.addEventListener('pointerdown', event => {
        const inside = event.target && event.target.closest ? event.target.closest('.swipe-item.is-open') : null;
        document.querySelectorAll('.swipe-item.is-open').forEach(open => { if (open !== inside) setSwipeOpen(open, false); });
      }, true);
    }

     
    function attachSwipeDelete(scope = document) {
      installSwipeOutsideCloser();
      scope.querySelectorAll('.swipe-item').forEach(item => {
        const content = item.querySelector(':scope > .swipe-content');
        if (!content || content.dataset.swipeReady) return;
        content.dataset.swipeReady = 'true';
         



        const isSetSwipe = item.classList.contains('set-swipe');
        let startX = 0, startY = 0, deltaX = 0, tracking = false, horizontal = false, startedOpen = false, pointerId = null, suppressClick = false, interactiveStart = false, startedOnCheckbox = false;
        content.addEventListener('pointerdown', event => {
          suppressClick = false;
          if (event.pointerType === 'mouse' && event.button !== 0) return;
           


          if (isSetSwipe && (typeof swipeDeleteSetsEnabled!=='function' || !swipeDeleteSetsEnabled())) return;
           

          if (isSetSwipe && content.classList.contains('is-complete')) return;
           

          startX = event.clientX; startY = event.clientY; deltaX = 0; tracking = true; horizontal = false;
           

          startedOnCheckbox = isSetSwipe && !!event.target.closest('.complete-set');
          startedOpen = item.classList.contains('is-open'); pointerId = event.pointerId;
           


           






          const rowBodyStart = !isSetSwipe && !!event.target.closest('.program-workout-open,.saved-workout-open,.open-saved-program');
          interactiveStart = isSetSwipe
            ? false
            : (!rowBodyStart && !!event.target.closest('input, button, textarea, select, a, summary'));
           




        });
        content.addEventListener('pointermove', event => {
          if (!tracking || event.pointerId !== pointerId || interactiveStart || startedOnCheckbox) return;
           







          if (isSetSwipe && content.classList.contains('is-complete')) return;
          const dx = event.clientX - startX, dy = event.clientY - startY;
          const ax = Math.abs(dx), ay = Math.abs(dy);
           





          if (!horizontal && ax < 7 && ay < 7) return;
          if (!horizontal && !swipeGestureShouldLock(ax, ay)) { tracking = false; return; }
           





          horizontal = true;
          event.preventDefault();
          const base = startedOpen ? -72 : 0;
          deltaX = clamp(base + dx, -72, 0);
          content.style.transition = 'none';
          content.style.transform = `translateX(${deltaX}px)`;
           

          item.classList.toggle('is-swiping', deltaX < 0);
        });
         
















        const claimSwipeTouch = event => {
          if (!tracking || horizontal || interactiveStart || startedOnCheckbox) return;
          if (isSetSwipe && content.classList.contains('is-complete')) return;
          if (event.touches.length !== 1) return;  
          const t = event.changedTouches[0];
          if (swipeGestureShouldLock(Math.abs(t.clientX - startX), Math.abs(t.clientY - startY))) {
            event.preventDefault();
          }
        };
        const holdSwipeTouch = event => {
           
          if (!tracking || !horizontal) return;
          if (event.touches.length !== 1) return;
          event.preventDefault();
        };
        content.addEventListener('touchmove', claimSwipeTouch, { passive: false });
        content.addEventListener('touchmove', holdSwipeTouch, { passive: false });
        const finish = event => {
          if (event.pointerId !== pointerId) return;
          tracking = false;
           




          const resetDrag = () => { content.style.transition = ''; content.style.transform = ''; horizontal = false; pointerId = null; item.classList.remove('is-swiping'); };
           


          if (startedOnCheckbox) { resetDrag(); return; }
          if (isSetSwipe && content.classList.contains('is-complete')) { resetDrag(); return; }
           


          if (horizontal && Math.abs(deltaX - (startedOpen ? -72 : 0)) >= 24) {
            event.preventDefault();
            const willOpen = deltaX < -36;
            setSwipeOpen(item, willOpen);
            item.classList.remove('is-swiping');  
            suppressClick = true;
          } else {
            resetDrag();
          }
          horizontal = false; pointerId = null;
        };
        content.addEventListener('pointerup', finish);
        content.addEventListener('pointercancel', finish);
         




        content.addEventListener('click', event => {
          if (!suppressClick) return;
          event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
        }, true);
         



        content.addEventListener('click', () => {
          if (!suppressClick && item.classList.contains('is-open')) setSwipeOpen(item, false);
        });
         








        const delBtn = item.querySelector(':scope > .swipe-delete-action');
        if (delBtn) {
          delBtn.addEventListener('pointerdown', () => { suppressClick = false; });
          delBtn.addEventListener('click', event => {
            if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; }
          }, true);
        }
      });
    }


     





    function backfillDraftUids(draft){
       



      draft.exercises.forEach(item=>{
        if(!item.uid)item.uid=newExerciseUid();
        (item.sets||[]).forEach(set=>{if(!set.uid)set.uid=newSetId();});
      });
    }
     





    function dbTotalReadout(canonicalW,exerciseId,item){
      const t=Number(canonicalW); if(!(t>0))return '';
      if(dbSingleDumbbell(exerciseId,item))return '';
      return `2 \u00d7 ${displayWeight(t/2)} = ${displayWeight(t)} ${weightUnit()} total`;
    }
     




    function emptyExerciseStateHtml(item,ex){
      return `<div class="empty-exercise-state"><p class="section-note">No sets. Add some to keep ${escapeHtml(ex?.name||'this exercise')} in this workout, or remove it.</p><button class="remove-workout-exercise text-danger-button" type="button" data-uid="${escapeHtml(item.uid)}" aria-label="Remove ${escapeHtml(ex?.name||'this exercise')} from this workout">Remove exercise</button></div>`;
    }
     














    function forkSetRowPerfHints(item,set){
        if(!item||!set||isWarmupSet(set))return null;
        const ex=resolveExercise(item.exerciseId); if(!ex)return null;
        const tracking=exerciseTracking(item,ex);
        const perf=setPerfField(item,ex);
        const setPos=item.sets.filter(s=>!isWarmupSet(s)).indexOf(set);
        const _perSetTarget=(item.suggestedTargets&&setPos>=0)?item.suggestedTargets[setPos]:null;
        const target=_perSetTarget||(item.suggestedTarget||{});
        const preHint=set.prefillHint||null;
        const preP=(preHint&&preHint[perf]!==''&&preHint[perf]!=null)?preHint[perf]:'';
         



        const rpProfile=(typeof progressionProfileForDraftItem==='function')?progressionProfileForDraftItem(item):null;
        const rp=perf==='distance'?{text:'',value:''}:rangePlaceholder(rpProfile||item.progression,tracking==='time');
        const holdPerf=(!target.r&&!target.seconds&&!target.distance)?latestTopSetPerf(item.exerciseId,perf,!!item.progression?.amrap):'';
        const text=perf==='seconds'?(target.seconds||preP||rp.text):perf==='distance'?(target.distance||preP||holdPerf||rp.text):(target.r||preP||rp.text);
        const value=perf==='seconds'?(target.seconds||preP||rp.value):perf==='distance'?(target.distance||preP||holdPerf||rp.value):(target.r||preP||rp.value);
        return {perf,text,value};
    }
     






    function liveSetRowHtml(item,set,index){
        const ex = resolveExercise(item.exerciseId); if (!ex) return '';
        const isBodyweight = ex.equipment === 'body only';
        const weightOptionalEx = exerciseWeightOptional(ex);  
        const isDumbbell = pairImplementExercise(ex);
        const tracking = exerciseTracking(item, ex);
         

        const perf = setPerfField(item, ex);
         


        const lastGhost = lastUsedGhost(item);
        const lastWeight = lastGhost.value;
         



        const setPos=item.sets.filter(s=>!isWarmupSet(s)).indexOf(set);
         




        const _perSetTarget=(item.suggestedTargets&&setPos>=0)?item.suggestedTargets[setPos]:null;
        const target=_perSetTarget||(item.suggestedTarget||{});
         





        const isWarmupRow = isWarmupSet(set);
        const warmHint = isWarmupRow ? (set.warmupHint||{}) : null;
         









        const _amrapProfile=(typeof progressionProfileForDraftItem==='function')?progressionProfileForDraftItem(item):item.progression;
        const isAmrapRow=!isWarmupRow&&perf==='r'&&!!(_amrapProfile&&_amrapProfile.amrap);
         



        const preHint=(!isWarmupRow&&set.prefillHint)?set.prefillHint:null;
        const preW=(preHint&&preHint.w!==''&&preHint.w!=null)?preHint.w:'';
        const weightHint = warmHint ? (warmHint.w||'') : (target.w || preW || lastWeight || '');
        const weightHintNote = !weightHint ? '' : warmHint ? `; warm-up ${escapeHtml(dbDisplayWeight(weightHint,item.exerciseId,item,isDumbbell))}` : target.w ? `; suggested ${escapeHtml(dbDisplayWeight(weightHint,item.exerciseId,item,isDumbbell))}` : preW ? `; previous set ${escapeHtml(dbDisplayWeight(weightHint,item.exerciseId,item,isDumbbell))}` : `; last used ${escapeHtml(dbDisplayWeight(weightHint,item.exerciseId,item,isDumbbell))}${lastGhost.scaled?' (deload week)':''}`;
        const warmPerf = warmHint ? (warmHint.perf||'') : '';
         







        const _rowHints = warmHint ? null : forkSetRowPerfHints(item,set);
        const perfHint = warmHint ? warmPerf : (_rowHints ? _rowHints.text : '');
         

        const perfFallback = warmHint ? warmPerf : (_rowHints ? _rowHints.value : '');
         





        return `
              <div class="swipe-item set-swipe" data-set-swipe="${escapeHtml(set.uid)}">
                <button class="swipe-delete-action delete-set-swipe" type="button" aria-hidden="true" data-exercise-uid="${escapeHtml(item.uid)}" data-set-uid="${escapeHtml(set.uid)}" aria-label="Delete set ${index + 1}" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg></button>
              <div class="log-set swipe-content ${set.complete ? 'is-complete' : ''}" data-set-uid="${escapeHtml(set.uid)}"${setSide(set)?` data-set-side="${setSide(set)}"`:''}>
                <button class="log-set-number ${set.tags.length||(typeof isFixedSet==='function'&&isFixedSet(set))||(typeof isAmrapSet==='function'&&isAmrapSet(set)) ? 'has-tags' : ''}" type="button" data-tag-exercise-uid="${escapeHtml(item.uid)}" data-tag-set-uid="${escapeHtml(set.uid)}"${setIsFrozen(set)?' data-uncomplete="1"':''} aria-label="${setIsFrozen(set)?`Mark set ${index + 1} incomplete`:`Choose tags for set ${index + 1}`}" aria-haspopup="dialog">${index + 1}${setSide(set)?`<span class="set-side-badge ${setSide(set)}" aria-label="${setSide(set)==='L'?'Left':'Right'} side">${setSide(set)}</span>`:''}</button>
                <!-- #317: this wrapper was a <label> until v1.040 (the
                     label-activation theory didn't pan out — the span stays
                     because it's harmless and the input's aria-label already
                     names it). -->
                <span class="weight-entry"><input class="log-input weight-input" data-field="w"${setIsFrozen(set)?' readonly aria-disabled="true"':''} data-placeholder-weight="${escapeHtml(weightHint)}" type="text" inputmode="decimal" autocomplete="off" value="${escapeHtml(dbDisplayWeight(set.w,item.exerciseId,item,isDumbbell))}" placeholder="${weightHint?escapeHtml(dbDisplayWeight(weightHint,item.exerciseId,item,isDumbbell)):((weightOptionalEx||tracking==='time')?'Optional':'Weight')}" aria-label="Set ${index + 1} ${isBodyweight ? 'optional added weight' : isDumbbell ? (dbEntryMode(item.exerciseId,item)==='per'?'per-dumbbell weight':'total dumbbell weight') : 'weight'} in ${isMetric()?'kilograms':'pounds'}${weightHintNote}" />${isDumbbell?`<span class="db-total-readout" data-db-readout${dbTotalReadout(set.w,item.exerciseId,item)?'':' hidden'}>${escapeHtml(dbTotalReadout(set.w,item.exerciseId,item))}</span>`:""}</span>
                <input class="log-input reps-input" data-field="${perf}"${setIsFrozen(set)?' readonly aria-disabled="true"':''} data-placeholder-perf="${escapeHtml(perfFallback)}" type="number" min="1" step="1" inputmode="numeric" value="${escapeHtml(set[perf] ?? '')}" placeholder="${perfHint || (perf === 'seconds' ? 'Seconds' : perf === 'distance' ? 'Distance (m)' : 'Reps')}" aria-label="Set ${index + 1} ${perf === 'seconds' ? 'seconds' : perf === 'distance' ? 'distance in meters' : 'reps'}${perfHint ? `; target ${escapeHtml(perfHint)}` : ''}" />
                <input class="log-input rpe-input" data-field="rpe"${setIsFrozen(set)?' readonly aria-disabled="true"':''} type="number" min="0" max="10" step="0.5" inputmode="decimal" value="${escapeHtml(effortMode()==='rir'?rpeToRir(set.rpe):set.rpe)}" placeholder="${effortDisplayPlaceholder()}" aria-label="Set ${index + 1} optional ${effortMode()==='rir'?'RIR':'RPE'}" />
                <div class="set-actions">
                  <button class="complete-set" type="button" data-exercise-uid="${escapeHtml(item.uid)}" data-set-uid="${escapeHtml(set.uid)}" aria-pressed="${set.complete}" aria-label="${set.complete ? 'Mark set incomplete' : 'Mark set complete'}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect class="box" x="3.2" y="3.2" width="17.6" height="17.6" rx="5.5"/><path class="tick" d="m8 12.4 2.6 2.6 5.6-6.2"/></svg></button>
                  <button class="delete-set delete-set-inline" type="button" data-exercise-uid="${escapeHtml(item.uid)}" data-set-uid="${escapeHtml(set.uid)}" aria-label="Delete set ${index + 1}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
                </div>
                <div class="selected-set-tags" aria-label="Selected tags">${set.tags.map(tag => `<span class="set-tag-chip">${escapeHtml(setTagLabel(tag))}</span>`).join('')}${isAmrapRow||(typeof isAmrapSet==='function'&&isAmrapSet(set))?'<span class="set-tag-chip">AMRAP</span>':''}${ ''}${(typeof isFixedSet==='function'&&isFixedSet(set))?`<span class="set-tag-chip">Don't progress</span>`:''}</div>
              </div>
              </div>`;
    }
     




     
    function liveExerciseCardHtml(item,draft){
        const ex = resolveExercise(item.exerciseId); if (!ex) return '';
        const isDumbbell = pairImplementExercise(ex);
        const tracking = exerciseTracking(item, ex);
        const perf = setPerfField(item, ex);  
        const lastWeight = lastUsedGhost(item).value;  
        const target = item.suggestedTarget || {};
        const weightHint = target.w || lastWeight || '';
         

        const rpProfile2=(typeof progressionProfileForDraftItem==='function')?progressionProfileForDraftItem(item):null;
        const rp = perf==='distance' ? {text:'',value:''} : rangePlaceholder(rpProfile2||item.progression,tracking==='time');
         





        const holdPerf = (!target.r && !target.seconds && !target.distance) ? latestTopSetPerf(item.exerciseId, perf, !!item.progression?.amrap) : '';
        const perfHint = perf === 'seconds' ? (target.seconds || rp.text) : perf === 'distance' ? (target.distance || holdPerf || rp.text) : (target.r || rp.text);
        const perfFallback = perf === 'seconds' ? (target.seconds || rp.value) : perf === 'distance' ? (target.distance || holdPerf || rp.value) : (target.r || rp.value);
         




        const cardSuggestion=(draft?.editingId||forkSuggestionDismissed(item.uid))?null:(draft.progressionSuggestions||[]).find(s=>s&&s.exerciseId===item.exerciseId);
         




         











        const hasWarmups=item.sets.some(isWarmupSet);
        const warmupControl=hasWarmups
          ? ''
          : `<button class="warmup-corner" type="button" data-warmup-uid="${escapeHtml(item.uid)}">Warm-up</button>`;
         



        return `<div class="workout-exercise" data-workout-exercise="${escapeHtml(item.uid)}">
            <div class="exercise-card-head"><div class="exercise-card-head-row"><span class="exercise-card-title"><strong>${escapeHtml(ex.name)}</strong></span>${warmupControl}${ ''}${exerciseCardMenuHtml(item,ex,'live')}</div>${ ''}</div>
            <div class="exercise-card-body">
            ${ 

''}
            ${cardSuggestion?cardSuggestionHtml(item,cardSuggestion):''}
            <div class="log-labels"><span>SET</span><span>WEIGHT</span><span>${perf === 'seconds' ? 'SECONDS' : perf === 'distance' ? 'DIST (M)' : 'REPS'}</span><span>${effortMode()==='rir'?'RIR':'RPE'}</span><span></span></div>
            <div class="log-sets">${item.sets.length?item.sets.map((set,index)=>liveSetRowHtml(item,set,index)).join(''):emptyExerciseStateHtml(item,ex)}</div>
            <div class="set-utility-row"><button class="add-set" type="button" data-uid="${escapeHtml(item.uid)}">+ Add set</button>${ ''}</div>
            ${ ''}
            <div class="exercise-note">${item.noteOpen || item.note ? `<textarea id="note-${escapeHtml(item.uid)}" data-exercise-note="${escapeHtml(item.uid)}" aria-label="Exercise notes" placeholder="Cues, setup, pain, or anything to remember">${escapeHtml(item.note || '')}</textarea>` : `<button class="add-note-toggle" type="button" data-add-note="${escapeHtml(item.uid)}">Add notes</button>`}</div>
            ${ 













''}
            </div>
          </div>`;
    }
     





    function setDeleteScrollTarget(rowTop,rowHeight,scrollY){
      if(rowTop<scrollY)return Math.max(0,scrollY-rowHeight);
      return null;
    }
     







     



    function renumberWorkoutSetRows(card){
      card.querySelectorAll('.log-set').forEach((setRow,i)=>{
        const n=String(i+1);
        const numBtn=setRow.querySelector('.log-set-number');
        if(numBtn){
           

          const sideBadge=typeof numBtn.querySelector==='function'?numBtn.querySelector('.set-side-badge'):null;
          numBtn.textContent=n;
          if(sideBadge)numBtn.appendChild(sideBadge);
           

          numBtn.setAttribute('aria-label',numBtn.hasAttribute('data-uncomplete')?`Mark set ${n} incomplete`:`Choose tags for set ${n}`);
        }
         

        setRow.querySelectorAll('input[aria-label]').forEach(input=>{
          const label=input.getAttribute('aria-label');
          if(label)input.setAttribute('aria-label',label.replace(/^Set \d+ /,`Set ${n} `));
        });
        const inlineBtn=setRow.querySelector('.delete-set-inline');
        if(inlineBtn)inlineBtn.setAttribute('aria-label',`Delete set ${n}`);
        const swipeWrap=setRow.closest('.set-swipe');
        const swipeBtn=swipeWrap?swipeWrap.querySelector('.delete-set-swipe'):null;
        if(swipeBtn)swipeBtn.setAttribute('aria-label',`Delete set ${n}`);
      });
    }
     

    function deleteWorkoutSet(exerciseUid,setUid){
      const draft=workoutState.draft;if(!draft)return;
      const item=findDraftExercise(exerciseUid);if(!item)return;
       


      const fullRender=()=>{renderWorkoutExercises();renderWorkoutProgression();markDraftSaved();};
      const host=$('#workoutExercises');
      const row=host?host.querySelector(`[data-set-swipe="${setUid}"]`):null;
      const card=row?row.closest('[data-workout-exercise]'):null;
      if(!row||!card){  
        item.sets=item.sets.filter(set=>set.uid!==setUid);
         

        fullRender();
        return;
      }
      const removedTop=row.getBoundingClientRect().top+window.scrollY;
      const removedH=row.offsetHeight||row.getBoundingClientRect().height;
      const scrollY=window.scrollY;
      item.sets=item.sets.filter(set=>set.uid!==setUid);
      row.remove();
      const target=setDeleteScrollTarget(removedTop,removedH,scrollY);
      if(target!==null)window.scrollTo(0,target);
      if(!item.sets.length){
         

        const listEl=card.querySelector('.log-sets');
        if(listEl){
          const ex=resolveExercise(item.exerciseId);
          listEl.innerHTML=emptyExerciseStateHtml(item,ex);
          wireLiveRemoveExercise(listEl);
        }
      }else{
        renumberWorkoutSetRows(card);
         


        if(card.querySelectorAll('[data-set-swipe]').length!==item.sets.length){fullRender();return;}
      }
      markDraftSaved();
    }
     
    function wireLiveRemoveExercise(scope=document){

       
      scope.querySelectorAll('[data-swap-exercise]').forEach(button => button.addEventListener('click', () => startExerciseSwap(button.dataset.swapExercise,'draft')));
      scope.querySelectorAll('.remove-workout-exercise').forEach(button => button.addEventListener('click', () => {
        const draft=workoutState.draft;
        const item = draft?.exercises.find(row => row.uid === button.dataset.uid);
        const ex = item ? resolveExercise(item.exerciseId) : null;
        pendingRemoveExerciseUid = button.dataset.uid;
        $('#removeExerciseDesc').textContent = ex ? `Remove "${ex.name}" from this workout? This cannot be undone.` : 'Remove this exercise from the workout? This cannot be undone.';
        showModalPinned($('#removeExerciseDialog'));
      }));
    }
     





    function addWorkoutSet(exerciseUid){
      const draft=workoutState.draft;if(!draft)return;
      const item=findDraftExercise(exerciseUid);if(!item)return;
       





      const prev=[...item.sets].reverse().find(s=>!isWarmupSet(s));
      const hintFrom=s=>{if(s)return {w:s.w??'',r:s.r??'',seconds:s.seconds??'',distance:s.distance??''};return null;};
       




      const sided=singleSideEnabled(item.exerciseId,item);
      const newSets=[];
      if(sided){
        const prevL=[...item.sets].reverse().find(s=>setSide(s)==='L')||prev;
        const prevR=[...item.sets].reverse().find(s=>setSide(s)==='R')||prev;
        const lSet=newSet();lSet.side='L';const lh=hintFrom(prevL);if(lh)lSet.prefillHint=lh;
        const rSet=newSet();rSet.side='R';const rh=hintFrom(prevR);if(rh)rSet.prefillHint=rh;
        newSets.push(lSet,rSet);
      }else{
        const set=newSet();
        const hint=hintFrom(prev);if(hint)set.prefillHint=hint;
        newSets.push(set);
      }
      const firstIndex=item.sets.length;
      item.sets.push(...newSets);
      const host=$('#workoutExercises');
      const card=host?host.querySelector(`[data-workout-exercise="${CSS.escape(exerciseUid)}"]`):null;
      const list=card?card.querySelector('.log-sets'):null;
      if(!list){renderWorkoutExercises();markDraftSaved();return;}
       
      list.querySelector('.empty-exercise-state')?.remove();
      newSets.forEach((set,i)=>{
        list.insertAdjacentHTML('beforeend',liveSetRowHtml(item,set,firstIndex+i));
        const rowEl=list.lastElementChild;
        wireLiveSetTags(rowEl);wireLiveSetInputs(rowEl);wireLiveCompleteSet(rowEl);wireLiveDeleteSet(rowEl);
      });
      attachSwipeDelete(list);  
      markDraftSaved();
    }
     
    function wireLiveAddSet(scope=document){
      scope.querySelectorAll('.add-set').forEach(button => button.addEventListener('click', () => addWorkoutSet(button.dataset.uid)));
    }
     







    const REDUCED_MOTION=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
     




    function animateWarmupRowsIn(rows){
      if(REDUCED_MOTION||!rows.length)return;
      rows.forEach((row,i)=>{
        const h=row.offsetHeight;
        row.animate(
          [{height:'0px',opacity:'0'},{height:h+'px',opacity:'1'}],
          {duration:180,delay:i*40,easing:'cubic-bezier(0, 0, 0.2, 1)',fill:'backwards'}  
        );
      });
    }
     
    function addWarmupSets(exerciseUid){
      const draft=workoutState.draft;if(!draft)return;
      const item=findDraftExercise(exerciseUid);if(!item||!item.sets)return;
      if(item.sets.some(isWarmupSet))return;
      const ex=resolveExercise(item.exerciseId);
      const tracking=exerciseTracking(item,ex);
      const perf=setPerfField(item,ex);  
      const anchorLb=warmupAnchorLb(item);
       

       



      const evenTotal=pairImplementExercise(ex)&&dbEntryMode(item.exerciseId,item)==='per'&&!dbSingleDumbbell(item.exerciseId,item);
      const rows=warmupLadderRows(anchorLb,tracking,evenTotal).map(row=>{
        const set=newSet();set.tags=[WARMUP_TAG];
         
        set.warmupHint={w:row.w||'',perf:perf==='distance'?(row.distance||''):tracking==='time'?(row.seconds||''):(row.reps||'')};
        return set;
      });
      item.sets=[...rows,...item.sets];
      const newUids=new Set(rows.map(s=>s.uid));
       


      const newCard=swapExerciseCard(item);
      if(newCard){
        const newRows=[...newCard.querySelectorAll('[data-set-swipe]')].filter(el=>newUids.has(el.dataset.setSwipe));
        animateWarmupRowsIn(newRows);
      }else{
        renderWorkoutExercises();
      }
      markDraftSaved();
    }
     
    function wireLiveWarmup(scope=document){
       

      scope.querySelectorAll('[data-warmup-uid]').forEach(button => button.addEventListener('click', (e) => {e.preventDefault();e.stopPropagation();addWarmupSets(button.dataset.warmupUid);}));
    }
     


    let pendingDeleteSet=null;
     
    function requestDeleteSet(exerciseUid,setUid){
      pendingDeleteSet={exerciseUid,setUid};
      showModalPinned($('#removeSetDialog'));
    }
    $('#cancelRemoveSet')?.addEventListener('click',()=>$('#removeSetDialog').close());
    $('#keepSet')?.addEventListener('click',()=>$('#removeSetDialog').close());
    $('#confirmRemoveSet')?.addEventListener('click',()=>{ $('#removeSetDialog').close(); if(pendingDeleteSet)deleteWorkoutSet(pendingDeleteSet.exerciseUid,pendingDeleteSet.setUid); pendingDeleteSet=null; });
     
    function wireLiveDeleteSet(scope=document){
      scope.querySelectorAll('.delete-set-swipe').forEach(button => button.addEventListener('click', () => deleteWorkoutSet(button.dataset.exerciseUid,button.dataset.setUid)));
      scope.querySelectorAll('.delete-set-inline').forEach(button => button.addEventListener('click', () => requestDeleteSet(button.dataset.exerciseUid,button.dataset.setUid)));
    }
     





























    function forkCopyDownEligible(item,set){
      if(!item||!set||!Array.isArray(item.sets))return false;
      if(typeof isWarmupSet==='function'&&isWarmupSet(set))return false;
      return true;
    }
     


    function forkSetHasSuggestionGhost(item,set,field){
      const pos=item.sets.filter(s=>!(typeof isWarmupSet==='function'&&isWarmupSet(s))).indexOf(set);
      const perSet=(item.suggestedTargets&&pos>=0)?item.suggestedTargets[pos]:null;
      const target=perSet||item.suggestedTarget||null;
      return !!(target&&target[field]!==''&&target[field]!=null);
    }
     

    function forkCopyDownFromSet(item,set,field){
      if(field!=='w'&&field!=='r'&&field!=='seconds'&&field!=='distance')return [];
      if(!forkCopyDownEligible(item,set))return [];
      const value=set[field];
      if(value===''||value==null)return [];
      const start=item.sets.indexOf(set);
      if(start<0)return [];
       



      const sourceSide=typeof setSide==='function'?setSide(set):null;
      const updated=[];
      item.sets.forEach((later,i)=>{
        if(i<=start||later.complete)return;
        if(typeof isWarmupSet==='function'&&isWarmupSet(later))return;
        if(typeof setSide==='function'&&setSide(later)!==sourceSide)return;
        if(later[field]!==''&&later[field]!=null)return;
        if(forkSetHasSuggestionGhost(item,later,field))return;
        later.prefillHint={...(later.prefillHint||{}),[field]:value};
        updated.push(later);
      });
      return updated;
    }
     


    function forkSyncCopyDownGhosts(rowEl,item,updated,field){
      try{
        if(!rowEl||typeof rowEl.closest!=='function'||!updated.length)return;
        const card=rowEl.closest('.workout-exercise');
        if(!card||typeof card.querySelectorAll!=='function')return;
        const rows=[...card.querySelectorAll('.log-set')];
        const ex=resolveExercise(item.exerciseId);
        const isDb=pairImplementExercise(ex);
        updated.forEach(later=>{
          const targetRow=rows.find(r=>r.dataset&&r.dataset.setUid===later.uid);
          if(!targetRow||typeof targetRow.querySelector!=='function')return;
          const input=targetRow.querySelector(field==='w'?'.weight-input':'.reps-input');
          if(!input)return;
          if(field==='w'){
            input.dataset.placeholderWeight=later.prefillHint.w;
            input.placeholder=String(dbDisplayWeight(later.prefillHint.w,item.exerciseId,item,isDb));
          }else{
            input.dataset.placeholderPerf=later.prefillHint[field];
            input.placeholder=String(later.prefillHint[field]);
          }
        });
      }catch(_){}
    }
     


     


    function wireLiveSetInputs(scope=document){
       




      scope.querySelectorAll('.log-input').forEach(input => input.addEventListener('keydown', (event) => {
        if(event.key!=='Enter')return;
        event.preventDefault();
        const row=input.closest('.log-set'); if(!row)return;
        if(input.dataset.field==='w'){ row.querySelector('.reps-input')?.focus(); return; }
        if(input.dataset.field==='rpe')return;
        const completeBtn=row.querySelector('.complete-set');
        if(completeBtn&&completeBtn.getAttribute('aria-pressed')!=='true')completeBtn.click();
        const card=input.closest('.workout-exercise');
        const rows=card?[...card.querySelectorAll('.log-set')]:[];
        const next=rows[rows.indexOf(row)+1];
        next?.querySelector('.weight-input')?.focus();
      }));
      scope.querySelectorAll('.log-input').forEach(input => input.addEventListener('input', () => { const row=input.closest('.log-set'); const exerciseUid = input.closest('.workout-exercise').dataset.workoutExercise; const setUid = row.dataset.setUid; const item=findDraftExercise(exerciseUid); const set = item?.sets.find(itemSet => itemSet.uid === setUid);   const ex=item?resolveExercise(item.exerciseId):null; const isDumbbell=pairImplementExercise(ex); if (set) { if(input.dataset.field==='w'){   const _pw=parseWeightEntry(input.value); if(!_pw.ok){ flagFieldInput(input,_pw.message); } else {   const _vw=validateSetEntry('w',_pw.value,{zeroWeightOk:!!(ex&&(((typeof exerciseWeightOptional==='function')&&exerciseWeightOptional(ex))||((typeof exerciseTracking==='function')&&exerciseTracking(item,ex)==='time')))}); if(!_vw.ok){ flagFieldInput(input,_vw.message); } else { clearFieldInputFlag(input); set.w=dbStorageWeight(_pw.value,item?.exerciseId,item,isDumbbell); } } } else {   const _ve=validateSetEntry(input.dataset.field,input.value); if(!_ve.ok){ flagFieldInput(input,_ve.message); } else { clearFieldInputFlag(input); set[input.dataset.field] = (input.dataset.field==='rpe'&&effortMode()==='rir' ? (input.value===''?'':rirToRpe(input.value)) : input.value); } } }   if (set && item && !(input.dataset&&input.dataset.cgInvalid) && input.value!=='') { const _cd=forkCopyDownFromSet(item,set,input.dataset.field); if(_cd.length)forkSyncCopyDownGhosts(row,item,_cd,input.dataset.field); }   if (set && (input.dataset.field==='r'||input.dataset.field==='seconds'||input.dataset.field==='distance')) { if (input.value==='') set.perfCleared=true; else delete set.perfCleared; }   if (set && input.dataset.field==='w' && !(input.dataset&&input.dataset.cgInvalid)) { if (input.value==='') set.weightCleared=true; else delete set.weightCleared; }   if(input.dataset.field==='w'&&!(input.dataset&&input.dataset.cgInvalid)){const readout=row.querySelector('[data-db-readout]');if(readout){const txt=dbTotalReadout(dbStorageWeight(input.value,item?.exerciseId,item,isDumbbell),item?.exerciseId,item);readout.hidden=!txt;readout.textContent=txt;}}   if(!(input.dataset&&input.dataset.cgInvalid))$('#workoutError').textContent = ''; markDraftSaved(); }));
    }
     






    function syncFrozenSetRow(setRow,set,setNumber){
      const frozen=setIsFrozen(set);
      const checkbox=setRow.querySelector('.complete-set');
      if(checkbox){
        checkbox.setAttribute('aria-pressed',String(set.complete));
        checkbox.setAttribute('aria-label',set.complete?'Mark set incomplete':'Mark set complete');
      }
      setRow.classList.toggle('is-complete',set.complete);
      setRow.querySelectorAll('.log-input').forEach(input=>{if(frozen){input.setAttribute('readonly','');input.setAttribute('aria-disabled','true');}else{input.removeAttribute('readonly');input.removeAttribute('aria-disabled');}});
      const tagBtn=setRow.querySelector('.log-set-number');
      if(tagBtn){
        if(frozen){tagBtn.setAttribute('data-uncomplete','1');tagBtn.setAttribute('aria-label',`Mark set ${setNumber} incomplete`);}
        else{tagBtn.removeAttribute('data-uncomplete');tagBtn.setAttribute('aria-label',`Choose tags for set ${setNumber}`);}
      }
    }
     

    function uncompleteDraftSet(exerciseUid,setUid,setRow){
      const set=findDraftSet(exerciseUid,setUid);
      if(!set||!set.complete||!setRow)return;
      set.complete=false;
      const tagBtn=setRow.querySelector('.log-set-number');
      syncFrozenSetRow(setRow,set,tagBtn?tagBtn.textContent.trim():'?');
      markDraftSaved();
    }
     

    function validLoggedRpe(rpe){
      if(rpe===''||rpe==null)return true;
      const n=Number(rpe);
      return Number.isFinite(n)&&n>=0&&n<=10;
    }
     
    function wireLiveCompleteSet(scope=document){
      scope.querySelectorAll('.complete-set').forEach(button => button.addEventListener('click', () => {
         




        const swipeItem = button.closest('.swipe-item');
        if (swipeItem) setSwipeOpen(swipeItem, false);
        const set = findDraftSet(button.dataset.exerciseUid, button.dataset.setUid);
        const item=findDraftExercise(button.dataset.exerciseUid);
        const ex=resolveExercise(item?.exerciseId);
        const tracking=exerciseTracking(item,ex), weightOptional=exerciseWeightOptional(ex)||tracking==='time';  
        if (!set) return;
        const setRow=button.closest('.log-set');
        const weightInput=setRow.querySelector('.weight-input');
        const perfInput=setRow.querySelector('.reps-input');
        const perfField=setPerfField(item,ex);  
         


        if (!set.complete && set.w === '' && !set.weightCleared && weightInput?.dataset.placeholderWeight) {
          set.w=weightInput.dataset.placeholderWeight;
           



          weightInput.value=dbDisplayWeight(set.w,item?.exerciseId,item,pairImplementExercise(ex));
        }
         




        if (!set.complete && (set[perfField]==null||set[perfField]==='') && !set.perfCleared && perfInput?.dataset.placeholderPerf) {
          set[perfField]=perfInput.dataset.placeholderPerf;
          perfInput.value=set[perfField];
        }
         


         



        if(!set.complete){
          const rawW=set.w, rawRpe=set.rpe;
          const wNum=Number(rawW);
          const wBad=rawW!==''&&rawW!=null&&(!Number.isFinite(wNum)||wNum<0||wNum>5000);
          const rpeBad=rawRpe!==''&&rawRpe!=null&&!validLoggedRpe(rawRpe);
          if(wBad||rpeBad){
            const effortWord=effortMode()==='rir'?'RIR':'RPE';
            showToast(wBad?'Enter a weight between 0 and 5000.':`${effortWord} must be between 0 and 10 (or left blank).`);
            setRow.querySelector(wBad?'.weight-input':'.rpe-input')?.focus();
            return;
          }
        }
         




        if(!set.complete){
          for(const f of ['w','r','seconds','distance','rpe']){
            const v=sanitizeSetValue(f,set[f]);
            set[f]=v==null?'':v;
          }
        }
        const performanceValue=set[perfField];
         

        if (!set.complete && ((!weightOptional && set.w === '') || performanceValue === '' || !Number.isFinite(Number(set.w||0)) || Number(set.w||0) < 0 || !Number.isFinite(Number(performanceValue)) || Number(performanceValue) < 1 || (set.rpe !== '' && !validLoggedRpe(set.rpe)))) {
          const perfWord = perfField==='seconds'?'seconds':perfField==='distance'?'distance (m)':'reps';
          showToast(weightOptional ? `Enter ${perfWord} to complete the set.` : `Enter weight and ${perfWord} to complete this set. RPE is optional.`);
          setRow.querySelector((!weightOptional&&set.w==='')?'.weight-input':'.reps-input')?.focus(); return;
        }
         






        set.complete = !set.complete;   {const numBtn=setRow.querySelector('.log-set-number');syncFrozenSetRow(setRow,set,numBtn?numBtn.textContent.trim():'?');} $('#workoutError').textContent = ''; markDraftSaved();
         
        if(set.complete&&typeof forkSupersetAdvance==='function')forkSupersetAdvance(item,set);
      }));
    }
     


     


     




    function openLiveTargetsSheet(uid){
      const item=findDraftExercise(uid); if(!item)return;
      registerForkTargetsHost('live',{
        resolve:id=>findDraftExercise(id),
        afterChange:(changed,msg,kind)=>{
           


          if(kind==='tracking'&&typeof renderWorkoutExercises==='function')renderWorkoutExercises();
          if(workoutState.draft&&typeof prepareDraftProgression==='function')prepareDraftProgression(workoutState.draft,freeformProgressionConfig());
          if(typeof refreshCardSuggestionRows==='function')refreshCardSuggestionRows();
          if(typeof renderWorkoutProgression==='function')renderWorkoutProgression();
          if(typeof markDraftSaved==='function')markDraftSaved();
          if(msg&&typeof showToast==='function')showToast(msg);  
        },
      });
      openForkTargetsSheet(uid,'live',item,resolveExercise(item.exerciseId)?.name||'Exercise');
    }
     







    function openLiveProgressionModal(uid){
      const item=findDraftExercise(uid); if(!item)return;
      registerForkProgressionHost('live',{
        resolve:id=>findDraftExercise(id),
        suggestion:liveItem=>{
          const draft=workoutState.draft;
          if(!draft||draft.editingId)return null;
          return (draft.progressionSuggestions||[]).find(s=>s&&s.exerciseId===liveItem.exerciseId)||null;
        },
        hasHistory:liveItem=>typeof getExerciseLogs==='function'&&getExerciseLogs(liveItem.exerciseId).length>0,
         





        prescription:liveItem=>{
          const draft=workoutState.draft;
          if(!draft||draft.editingId||typeof forkDraftSlot!=='function')return null;
          const slot=forkDraftSlot(draft); if(!slot)return null;
          if(typeof forkSlotLogs==='function'&&forkSlotLogs(liveItem.exerciseId,slot.programId,slot.workoutUid).length)return null;
          const programs=[workoutState.activeProgram,...(Array.isArray(workoutState.savedPrograms)?workoutState.savedPrograms:[]),...(Array.isArray(workoutState.archivedPrograms)?workoutState.archivedPrograms:[])].filter(Boolean);
          const program=programs.find(p=>p.id===slot.programId); if(!program)return null;
          const workout=(program.workouts||[]).find(w=>w.uid===slot.workoutUid); if(!workout)return null;
          const cid=typeof canonicalExerciseId==='function'?canonicalExerciseId(liveItem.exerciseId):liveItem.exerciseId;
          const tItem=(workout.template?.exercises||[]).find(x=>((typeof canonicalExerciseId==='function'?canonicalExerciseId(x.exerciseId):x.exerciseId)===cid)); if(!tItem)return null;
           


          const sets=typeof forkPrescribedSets==='function'?forkPrescribedSets(tItem,{fillBlankWork:true}):null;
          return sets?{sets}:null;
        },
        apply:(liveItem,suggestion,optionIndex)=>{
          const draft=workoutState.draft; if(!draft)return false;
          const optIdx=Number(optionIndex||0);
          const chosen=optIdx>0?(suggestion.alternates||[])[optIdx-1]:suggestion;
          if(!chosen||chosen.applied)return false;
          applyProgressionSuggestion(draft,chosen,false);
          const newCard=swapExerciseCard(liveItem);
          if(newCard){
            newCard.querySelector('[data-card-suggestion-applied]')?.focus({preventScroll:true});
            markDraftSaved();
            return true;
          }
          renderWorkoutExercises();renderWorkoutProgression();markDraftSaved();
          return true;
        },
      });
      openForkProgressionModal(uid,'live');
    }
    function wireLiveExerciseMenus(scope=document){
       


      wireExerciseCardMenus(scope,()=>openReorderDialog(),openLiveTargetsSheet,openLiveProgressionModal);
    }
     



     
    function wireLiveSetTags(scope=document){
       

      scope.querySelectorAll('[data-tag-set-uid]').forEach(button => button.addEventListener('click', () => {
        if(button.hasAttribute('data-uncomplete')){
          const row=button.closest('.log-set');
          uncompleteDraftSet(button.dataset.tagExerciseUid, button.dataset.tagSetUid, row);
          return;
        }
        openTagDialog(button.dataset.tagExerciseUid, button.dataset.tagSetUid);
      }));
    }
     

    function wireLiveExerciseTags(scope=document){
      wireExerciseTagButtons(scope,'data-draft-exercise-tags','draft');
    }
     

    function wireLiveExerciseInfo(scope=document){
      wireExerciseInfoButtons(scope);
    }
     



    function wireLiveFrozenInputHint(scope){
      scope.querySelectorAll('.log-input[readonly]').forEach(input=>input.addEventListener('click',()=>{
        showToast('That set is complete. Tap its number to edit it.');
      }));
    }
     


    function wireLiveAddNote(scope=document){
      wireAddNoteButtons(scope,'data-add-note','exerciseNote',uid=>findDraftExercise(uid),()=>markDraftSaved(),null);
    }
     









    const forkDismissedSuggestionUids=new Set();
    function forkSuggestionDismissed(uid){
      return forkDismissedSuggestionUids.has(uid);
    }
     








    function attachSuggestionSwipeDismiss(card){
      if(!card||card.dataset.swipeDismissReady)return;
      card.dataset.swipeDismissReady='true';
      card.classList.add('swipe-dismiss-ready');
      const uid=card.dataset.cardSuggestion;
      let startX=0,startY=0,deltaX=0,tracking=false,horizontal=false,pointerId=null,suppressClick=false;
      card.addEventListener('pointerdown',event=>{
        suppressClick=false;
        if(event.pointerType==='mouse'&&event.button!==0)return;
        startX=event.clientX;startY=event.clientY;deltaX=0;tracking=true;horizontal=false;pointerId=event.pointerId;
      });
      card.addEventListener('pointermove',event=>{
        if(!tracking||event.pointerId!==pointerId)return;
        const dx=event.clientX-startX,dy=event.clientY-startY,ax=Math.abs(dx),ay=Math.abs(dy);
        if(!horizontal&&ax<7&&ay<7)return;
        if(!horizontal&&!swipeGestureShouldLock(ax,ay)){tracking=false;return;}
        horizontal=true;
        event.preventDefault();
        deltaX=Math.min(0,dx);
        card.style.transition='none';
        card.style.transform=`translateX(${deltaX}px)`;
        card.style.opacity=String(Math.max(.25,1+deltaX/240));
      });
      const claimSwipeTouch=event=>{
        if(!tracking||horizontal)return;
        if(event.touches.length!==1)return;
        const t=event.changedTouches[0];
        if(swipeGestureShouldLock(Math.abs(t.clientX-startX),Math.abs(t.clientY-startY)))event.preventDefault();
      };
      const holdSwipeTouch=event=>{
        if(!tracking||!horizontal)return;
        if(event.touches.length!==1)return;
        event.preventDefault();
      };
      card.addEventListener('touchmove',claimSwipeTouch,{passive:false});
      card.addEventListener('touchmove',holdSwipeTouch,{passive:false});
      const finish=event=>{
        if(event.pointerId!==pointerId)return;
        tracking=false;
        if(horizontal&&deltaX<=-72){
          event.preventDefault();
          suppressClick=true;
          forkDismissedSuggestionUids.add(uid);
          card.style.transition='transform .18s ease, opacity .18s ease';
          card.style.transform='translateX(-110%)';
          card.style.opacity='0';
          setTimeout(()=>{
            const item=findDraftExercise(uid);
            if(item&&!swapExerciseCard(item))renderWorkoutExercises();
          },190);
        }else{
          if(horizontal)suppressClick=true;
          card.style.transition='transform .18s ease, opacity .18s ease';
          card.style.transform='';
          card.style.opacity='';
        }
        horizontal=false;pointerId=null;
      };
      card.addEventListener('pointerup',finish);
      card.addEventListener('pointercancel',finish);
      card.addEventListener('click',event=>{
        if(!suppressClick)return;
        event.preventDefault();event.stopImmediatePropagation();suppressClick=false;
      },true);
    }
     






    function wireLiveCardSuggestions(scope=document){
       



      scope.querySelectorAll('[data-card-suggestion]').forEach(button=>{
       


      attachSuggestionSwipeDismiss(button);
      button.addEventListener('click',()=>{
        const uid=button.dataset.cardSuggestion;
        const draft=workoutState.draft;if(!draft)return;
        const item=findDraftExercise(uid);if(!item)return;
        const suggestion=(draft.progressionSuggestions||[]).find(s=>s&&s.exerciseId===item.exerciseId);
        if(!suggestion||suggestion.applied)return;
         



        const optIdx=Number(button.dataset.suggestionOption||0);
        const chosen=optIdx>0?(suggestion.alternates||[])[optIdx-1]:suggestion;
        if(!chosen)return;
        applyProgressionSuggestion(draft,chosen,false);
        const newCard=swapExerciseCard(item);
        if(newCard){
          newCard.querySelector('[data-card-suggestion-applied]')?.focus({preventScroll:true});
          markDraftSaved();
          return;
        }
        renderWorkoutExercises();renderWorkoutProgression();markDraftSaved();
      });
      });
    }
     

    function wireLiveNoteInputs(scope=document){
      wireExerciseNoteInputs(scope,'data-exercise-note',uid=>findDraftExercise(uid),()=>markDraftSaved());
    }
     





     

    const cssEsc=s=>(typeof CSS!=='undefined'&&CSS.escape)?CSS.escape(String(s)):String(s);
     


    function refreshProgressionAfterOptionChange(){
      const draft=workoutState.draft;
      const program=draft?.programId&&workoutState.activeProgram?.id===draft.programId?workoutState.activeProgram:null;
      prepareDraftProgression(draft,program?{...program.progression,currentWeek:programWeek(program)}:freeformProgressionConfig());
      renderWorkoutExercises();renderWorkoutProgression();
    }
     






    function repsOnlyAfterChange(item){
      const draft=workoutState.draft;
      const program=draft?.programId&&workoutState.activeProgram?.id===draft.programId?workoutState.activeProgram:null;
      prepareDraftProgression(draft,program?{...program.progression,currentWeek:programWeek(program)}:freeformProgressionConfig());
      const newCard=swapExerciseCard(item);
      if(newCard){
        newCard.querySelector(`[data-reps-only-toggle="${cssEsc(item.uid)}"]`)?.focus({preventScroll:true});
        return;
      }
      renderWorkoutExercises();renderWorkoutProgression();
    }
     

    function swapExerciseCard(item){
      const draft=workoutState.draft;if(!draft||!item)return null;
      if(typeof document==='undefined'||typeof document.querySelector!=='function')return null;
      const card=document.querySelector(`[data-workout-exercise="${cssEsc(item.uid)}"]`);
      if(!card)return null;
      const tmp=document.createElement('div');
      tmp.innerHTML=liveExerciseCardHtml(item,draft);
      const newCard=tmp.firstElementChild;
       

      if(!newCard||typeof card.getBoundingClientRect!=='function'||typeof card.replaceWith!=='function')return null;
      const top=card.getBoundingClientRect().top;
      card.replaceWith(newCard);
      wireLiveRemoveExercise(newCard);wireLiveAddSet(newCard);wireLiveWarmup(newCard);
      wireLiveDeleteSet(newCard);wireLiveSetInputs(newCard);wireLiveCompleteSet(newCard);
      wireLiveSetTags(newCard);
      wireLiveExerciseTags(newCard);wireLiveExerciseInfo(newCard);wireLiveExerciseMenus(newCard);wireLiveAddNote(newCard);
      wireLiveNoteInputs(newCard);wireLiveTracking(newCard);wireLiveSuperset(newCard);
      wireLiveCardSuggestions(newCard);  
       


      attachSwipeDelete(newCard);
       


      wireOnermOptionInputs(newCard,findDraftExercise,refreshProgressionAfterOptionChange);
      wireRepsOnlyToggle(newCard,findDraftExercise,repsOnlyAfterChange);
       

       

      wireExerciseThresholdPills(newCard,findDraftExercise,repsOnlyAfterChange);
       
      wireDbEntryToggle(newCard,findDraftExercise,repsOnlyAfterChange);
       
      wireDbSingleToggle(newCard,findDraftExercise,repsOnlyAfterChange);
       
      wireSingleSideToggle(newCard,findDraftExercise,repsOnlyAfterChange);
      renderWorkoutProgression();
      const top2=newCard.getBoundingClientRect().top;
      if(top2!==top)window.scrollBy(0,top2-top);
      return newCard;
    }
     







    function refreshCardSuggestionRows(){
      const draft=workoutState.draft;
      if(!draft||typeof document==='undefined'||typeof document.querySelector!=='function')return 0;
      let refreshed=0;
      (draft.exercises||[]).forEach(item=>{
        const card=document.querySelector(`[data-workout-exercise="${cssEsc(item.uid)}"]`);
        if(!card)return;
        const suggestion=forkSuggestionDismissed(item.uid)?null:(draft.progressionSuggestions||[]).find(s=>s&&s.exerciseId===item.exerciseId);
         















        const oldRows=[...card.querySelectorAll(':scope > .exercise-card-body > .suggestion-card, :scope > .exercise-card-body > .suggestion-block')];
        if(!suggestion){oldRows.forEach(row=>row.remove());return;}
        const tmp=document.createElement('div');
        tmp.innerHTML=cardSuggestionHtml(item,suggestion);
         



        const newRows=[];
        if(tmp.children&&tmp.children.length)for(const n of tmp.children)newRows.push(n);
        else{let n=tmp.firstElementChild;while(n){newRows.push(n);n=n.nextElementSibling;}}
        if(!newRows.length)return;
        if(oldRows.length){
          oldRows[0].replaceWith(...newRows);
          oldRows.slice(1).forEach(row=>row.remove());
        }
        else{
           



          const anchor=card.querySelector(':scope .log-labels');
          if(anchor)anchor.before(...newRows);
          else{const host=card.querySelector(':scope .exercise-card-body');if(host)newRows.forEach(row=>host.appendChild(row));}
        }
        wireLiveCardSuggestions(card);
        refreshed++;
      });
      return refreshed;
    }
     
    function wireLiveTracking(scope=document){
      scope.querySelectorAll('[data-tracking-uid]').forEach(button => button.addEventListener('click', () => {
        const item = findDraftExercise(button.dataset.trackingUid); if (!item) return;
         


        const mode=button.dataset.trackingMode||'reps';
        if(!setExerciseTracking(item, mode, {resetCompletion:true}))return;
         



        refreshSuggestionForExercise(workoutState.draft, item);
         





        const newCard=swapExerciseCard(item);
        if(newCard){
          newCard.querySelector(`[data-tracking-uid="${cssEsc(item.uid)}"][data-tracking-mode="${cssEsc(mode)}"]`)?.focus({preventScroll:true});
          markDraftSaved();
          return;
        }
        renderWorkoutExercises(); renderWorkoutProgression(); markDraftSaved();
      }));
    }
     
    function wireLiveSuperset(scope=document){
       

      scope.querySelectorAll('[data-superset-uid]').forEach(button => button.addEventListener('click', openReorderDialog));
    }
     
     


    function renderWorkoutExercises() {
      const draft = workoutState.draft;
      if (!draft) return;
       
      const reorderBtn = $('#reorderWorkoutExercises');
      if (reorderBtn) reorderBtn.style.display = draft.exercises.length >= 2 ? '' : 'none';
       






      const finishBtn = $('#finishWorkout');
      if (finishBtn) finishBtn.disabled = !draft.exercises.length;
       
      const _scrollY=window.scrollY;
      backfillDraftUids(draft);
       


      $('#workoutExercises').innerHTML = draft.exercises.length ? supersetVisualBlocks(draft.exercises).map(block=>
        block.group
          ? `<div class="superset-group" data-superset-group="${escapeHtml(block.supersetId)}">${supersetGroupHeadHtml(draft.exercises,block.supersetId,`data-superset-uid="${escapeHtml(block.items[0].uid)}"`)}${block.items.map(item=>liveExerciseCardHtml(item,draft)).join('')}</div>`
          : liveExerciseCardHtml(block.items[0],draft)
      ).join('') : '<div class="history-empty">No exercises yet. Add your first movement to begin logging.</div>';
      wireLiveRemoveExercise();
      wireLiveAddSet();
      wireLiveWarmup();
      wireLiveDeleteSet();
      wireLiveSetInputs();
      wireLiveFrozenInputHint($('#workoutExercises'));
      wireLiveCompleteSet();
      wireLiveSetTags();
      wireLiveExerciseTags();
      wireLiveExerciseInfo();
      wireLiveExerciseMenus();
      wireLiveAddNote();
      wireLiveNoteInputs();
      wireLiveTracking();
      wireLiveSuperset();
      wireLiveCardSuggestions();  
       


      wireOnermOptionInputs(document, findDraftExercise, refreshProgressionAfterOptionChange);
       
      wireRepsOnlyToggle(document, findDraftExercise, repsOnlyAfterChange);
       

       

      wireExerciseThresholdPills(document, findDraftExercise, repsOnlyAfterChange);
       
      wireDbEntryToggle(document, findDraftExercise, repsOnlyAfterChange);
       
      wireDbSingleToggle(document, findDraftExercise, repsOnlyAfterChange);
       
      wireSingleSideToggle(document, findDraftExercise, repsOnlyAfterChange);
      attachSwipeDelete($('#workoutExercises'));
      window.scrollTo(0,_scrollY);
    }

    
//# sourceMappingURL=workout-editor.js.map
