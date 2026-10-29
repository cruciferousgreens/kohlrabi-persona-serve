 
     







        
     




    let pendingRepeatWorkout=null;
     
    function repeatWorkout(workout,confirmed=false){
      if(!workout)return;
      if(workoutState.draft&&!confirmed){pendingRepeatWorkout=workout; const dlg=$('#replaceDraftDialog');if(dlg&&!dlg.open){if(typeof showModalPinned==='function')showModalPinned(dlg);else dlg.showModal();}return;}
      showWorkouts();
       
      state.workoutHistoryOpen=false;
      workoutState.draft={
        name:workout.name, date:localIsoDate(),
         




        programId:workout.programId||null, programWorkoutUid:workout.programWorkoutUid||null, editingId:null,
        startedAt:new Date().toISOString(),  
         

        focusPreset:REP_PRESETS[workout.focusPreset]?workout.focusPreset:null,
         



        focusCustomRange:workout.focusCustomRange?{min:+workout.focusCustomRange.min,max:workout.focusCustomRange.max==null?null:+workout.focusCustomRange.max}:null,
         



        progression:workout.progression?{...workout.progression}:null,
         

        exercises:workout.exercises.map(item=>cloneExerciseItem(item,'forNewSession'))
      };
      prepareDraftProgression(workoutState.draft,freeformProgressionConfig());
      schedulePersist();
      state.workoutEditorOpen = true;  
      renderWorkoutScreen();
    }
     


    function templateExercisesFromCompleted(workout) {
      return workout.exercises.map(item=>cloneExerciseItem(item,'forTemplate'));
    }
     
    function saveCompletedAsTemplate(workout,statusEl) {
      if(!workout?.exercises?.length)return;
      const template={id:newTemplateId(),name:workout.name||'Saved workout',exercises:templateExercisesFromCompleted(workout)};
       


      template.sourceLogId=workout.id;
      workoutState.templates.unshift(template); schedulePersist();
      const message=`Saved “${template.name}” as a saved workout.`;
       

      if(statusEl)statusEl.textContent=message;
       

      try{if(typeof Sync!=='undefined'&&Sync&&typeof Sync.maybeShowSigninNudge==='function')Sync.maybeShowSigninNudge({keepWorkout:false});}catch(_){}
       


      const btn=document.getElementById('saveCompletedWorkoutTop');
      if(btn){
        const start=document.createElement('button');
        start.type='button';start.id='saveCompletedWorkoutTop';start.className=btn.className;start.textContent='Start';
         

        start.addEventListener('click',()=>requestStartWithConflict(template.name,()=>startWorkoutFromTemplate(template.id)));
        btn.replaceWith(start);
         





        const shareBtn=document.getElementById('shareCompletedTemplateBtn')?null:document.createElement('button');
        if(shareBtn){
        shareBtn.type='button';shareBtn.id='shareCompletedTemplateBtn';shareBtn.className='icon-button';
        shareBtn.setAttribute('aria-label',`Share ${template.name}`);
        shareBtn.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.5v-11"/><path d="M7.6 7.4L12 3l4.4 4.4"/><path d="M6 11.5V19a1.6 1.6 0 0 0 1.6 1.6h8.8A1.6 1.6 0 0 0 18 19v-7.5"/></svg>';
         


        shareBtn.addEventListener('click',()=>deliverShareLink(buildCompletedWorkoutShare(workout)));
        start.before(shareBtn);
        }
      }
    }
     










    function startWorkoutFromTemplate(id) {
      try{ startWorkoutFromTemplateInner(id); }
      catch(err){
        console.error('startWorkoutFromTemplate failed',err);
        if(typeof showToast==='function')showToast('Something went wrong starting that workout.');
        if(workoutState.draft)state.workoutEditorOpen=true;
        if(typeof renderWorkoutScreen==='function')renderWorkoutScreen();
      }
    }
    function startWorkoutFromTemplateInner(id) {
      const t=workoutState.templates.find(x=>x.id===id);if(!t)return;
      state.workoutHistoryOpen=false;state.savedWorkoutId=null;
      workoutState.draft={
        name:t.name, date:localIsoDate(), programId:null, programWorkoutUid:null, editingId:null,
        startedAt:new Date().toISOString(),  
         
        focusPreset:REP_PRESETS[t.focusKey]?t.focusKey:null,
         









        focusCustomRange:t.focusCustom?{min:+t.focusCustom.min,max:t.focusCustom.max==null?null:+t.focusCustom.max}:null,
         



        progression:t.progression?{...t.progression}:null,
         

        exercises:t.exercises.map(x=>cloneExerciseItem(x,'fromTemplate',{noteOpen:!!x.note}))
      };
      prepareDraftProgression(workoutState.draft,freeformProgressionConfig());schedulePersist();
      state.workoutEditorOpen = true;  
      renderWorkoutScreen();
    }
     




     


    function templateProgramNames(templateId){
      const names=[];
       




      [workoutState.activeProgram,...(workoutState.savedPrograms||[]),...(workoutState.archivedPrograms||[])].filter(Boolean).forEach(p=>{
        (p.workouts||[]).forEach(w=>{if(w.sourceTemplateId===templateId&&!names.includes(p.name))names.push(p.name);});
      });
      return names;
    }
     




    function programShellCoveredByTemplate(workout,liveTemplateIds){
      return !!(workout&&workout.sourceTemplateId&&liveTemplateIds.has(workout.sourceTemplateId));
    }
     





    function builderParkedDraftKeys(){
      const stash=state.savedBuilderStash&&typeof state.savedBuilderStash==='object'&&!Array.isArray(state.savedBuilderStash)?state.savedBuilderStash:{};
      return Object.keys(stash).filter(k=>stash[k]&&typeof stash[k]==='object');
    }
     


    function builderContinueDraftsVisible(){
      return !state.builderOpen&&(!!state.savedBuilder||builderParkedDraftKeys().length>0);
    }
     









    function savedWorkoutListCompare(a,b){
      const ap=a&&a.kind==='program',bp=b&&b.kind==='program';
      if(ap&&bp){
        const po=(a.programOrder??0)-(b.programOrder??0);
        if(po)return po;
        return (a.rotation??0)-(b.rotation??0);
      }
      if(ap!==bp)return ap?-1:1;
      return String(a?.name||'').localeCompare(String(b?.name||''));
    }
     
    function renderWorkoutTemplateList() {
      const host=$('#savedWorkoutList');if(!host)return;
       



      const items=[];
      (workoutState.templates||[]).filter(t=>!t.archivedAt).forEach(t=>{
        items.push({kind:'template',id:t.id,name:t.name||'Untitled',builtIn:!!t.builtIn,
          shared:!!t.shared,
          exercises:t.exercises||[],programNames:templateProgramNames(t.id)});
      });
      const liveTemplateIds=new Set((workoutState.templates||[]).filter(t=>!t.archivedAt).map(t=>t.id));
       










      const listedPrograms=[];
      const seenProgramIds=new Set();
      [workoutState.activeProgram,...(workoutState.savedPrograms||[]),...(workoutState.archivedPrograms||[])].filter(Boolean).forEach(p=>{
        if(p.id!=null){if(seenProgramIds.has(p.id))return;seenProgramIds.add(p.id);}
        listedPrograms.push(p);
      });
      const seenProgramWorkoutUids=new Set();
      listedPrograms.forEach((program,programOrder)=>{
      const programActive=!!(workoutState.activeProgram&&program.id!=null&&program.id===workoutState.activeProgram.id);
      (program?.workouts||[]).forEach((w,rotation)=>{
         
        if(programShellCoveredByTemplate(w,liveTemplateIds))return;
        if(!w||w.uid==null||seenProgramWorkoutUids.has(w.uid))return;
        seenProgramWorkoutUids.add(w.uid);
        items.push({kind:'program',programId:program.id??null,programActive,programOrder,rotation,uid:w.uid,name:w.name||'Untitled',
          exercises:w.template?.exercises||[],programNames:[program.name]});
      });
      });
      const shown=items.sort(savedWorkoutListCompare);
      const card=item=>{
         








        const chips=`${item.kind==='template'&&item.builtIn?'<span class="built-in-label">Built-in</span>':''}${item.kind==='template'&&item.shared?'<span class="built-in-label">Shared</span>':''}`;
         















        const programEyebrow=item.programNames.length?`<span class="saved-program-eyebrow">${item.programNames.map(n=>escapeHtml(n)).join(' – ')}</span>`:'';
        const count=item.exercises.length;
         







         









        const muscleChips=(typeof forkProgramRowMuscleChipsHtml==='function')?forkProgramRowMuscleChipsHtml({template:{exercises:item.exercises}}):'';
        const body=`<span>${programEyebrow}<strong>${escapeHtml(item.name)}</strong><span class="picker-sub row-meta"><span class="m-ink">${count} exercise${count===1?'':'s'}</span>${chips}</span>${muscleChips?`<span class="muscle-chips">${muscleChips}</span>`:''}</span>`;
         





        const swipeOn=typeof swipeDeleteSetsEnabled==='function'?swipeDeleteSetsEnabled():true;
        if(item.kind!=='template'){
           

















          const rail=swipeOn?`<button aria-hidden="true" class="swipe-delete-action delete-program-workout" type="button" data-uid="${escapeHtml(item.uid)}" data-program-id="${escapeHtml(item.programId??'')}" aria-label="Delete ${escapeHtml(item.name)}" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg></button>`:'';
          const inlineDel=!swipeOn?`<button class="program-workout-del" type="button" data-del-program-workout="${escapeHtml(item.uid)}" data-program-id="${escapeHtml(item.programId??'')}" aria-label="Delete ${escapeHtml(item.name)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`:'';
          return `<div class="swipe-item program-swipe">${rail}<div class="picker-item saved-workout-card swipe-content program-workout-row"><button class="program-workout-open" type="button" data-program-workout="${escapeHtml(item.uid)}" data-program-id="${escapeHtml(item.programId??'')}" aria-label="Open ${escapeHtml(item.name)}">${body}</button>${inlineDel}</div></div>`;
        }
         



        const rail=swipeOn&&!item.builtIn?`<button aria-hidden="true" class="swipe-delete-action delete-saved-row" type="button" data-saved-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)}" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg></button>`:'';
         

        const inlineDel=!swipeOn&&!item.builtIn?`<button class="saved-workout-del" type="button" data-del-saved-id="${escapeHtml(item.id)}" aria-label="Delete ${escapeHtml(item.name)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`:'';
        return `<div class="swipe-item saved-swipe">${rail}<div class="picker-item saved-workout-card swipe-content saved-workout-row"><button class="saved-workout-open" type="button" data-saved-id="${escapeHtml(item.id)}" aria-label="Open ${escapeHtml(item.name)}">${body}</button>${inlineDel}</div></div>`;
      };
      const archived=(workoutState.templates||[]).filter(t=>t.archivedAt);
      const archivedCard=t=>card({kind:'template',id:t.id,name:t.name||'Untitled',builtIn:!!t.builtIn,exercises:t.exercises||[],programNames:[]});
      host.innerHTML=(shown.length?`<div class="saved-workout-cards">${shown.map(card).join('')}</div>`
         






        :builderContinueDraftsVisible()?''
        :'<div class="dialog-empty"><strong>No saved workouts yet.</strong><br>Tap + Add saved workout below to build one, or choose Save to library on a finished log.</div>')
        +(archived.length?`<details class="archived-saved-disclosure"><summary>Archived (${archived.length})</summary><div class="saved-workout-cards">${archived.map(archivedCard).join('')}</div></details>`:'')
        +`<button class="new-template-button" id="addSavedWorkoutButton" type="button">+ Add saved workout</button>`;
      host.querySelectorAll('.saved-workout-open[data-saved-id]').forEach(b=>b.addEventListener('click',()=>openSavedWorkoutEditor(b.dataset.savedId)));
       


      host.querySelectorAll('[data-program-workout]').forEach(b=>b.addEventListener('click',()=>openProgramWorkoutFromSavedList(b.dataset.programId,b.dataset.programWorkout)));
       


      const confirmDeleteSaved=id=>{
        const t=workoutState.templates.find(x=>x.id===id);if(!t||t.builtIn)return;
        pendingDeleteTemplateId=t.id;
        $('#deleteTemplateDesc').textContent=`Delete "${t.name}"? This cannot be undone.`;
        showModalPinned($('#deleteTemplateDialog'));
      };
      host.querySelectorAll('.delete-saved-row').forEach(b=>b.addEventListener('click',()=>confirmDeleteSaved(b.dataset.savedId)));
      host.querySelectorAll('[data-del-saved-id]').forEach(b=>b.addEventListener('click',()=>confirmDeleteSaved(b.dataset.delSavedId)));
       




      host.querySelectorAll('.delete-program-workout').forEach(b=>b.addEventListener('click',()=>confirmDeleteProgramWorkout(b.dataset.uid,b.dataset.programId)));
      host.querySelectorAll('[data-del-program-workout]').forEach(b=>b.addEventListener('click',()=>confirmDeleteProgramWorkout(b.dataset.delProgramWorkout,b.dataset.programId)));
      attachSwipeDelete(host);
      $('#addSavedWorkoutButton')?.addEventListener('click',()=>startSavedBuilder());
    }
     


    function openSavedWorkoutEditor(id){
      if(!workoutState.templates.some(t=>t.id===id))return;
       


      if(state.activeView!=='workout')showWorkouts(false);
      state.savedWorkoutId=id;state.workoutEditorOpen=false;state.builderOpen=false;renderWorkoutScreen();
    }
     



    function savedExerciseSummary(item,focusRange){
      const ex=resolveExercise(item.exerciseId);
      return exerciseTargetSummary(item,ex?.name||'Exercise',focusRange);
    }
     
    function renderSavedWorkoutEditor(){
      const host=$('#savedWorkoutBody');if(!host)return;
      const t=workoutState.templates.find(x=>x.id===state.savedWorkoutId);
      if(!t){host.innerHTML='<div class="dialog-empty">Saved workout not found.</div>';return;}
       
       
      let focusLabel=t.focusCustom?(t.focusCustom.max==null?`Custom (${t.focusCustom.min}+ reps)`:`Custom (${forkRangePairText(t.focusCustom.min,t.focusCustom.max)} reps)`):(t.focusKey&&REP_PRESETS[t.focusKey]?(()=>{const p=REP_PRESETS[t.focusKey];
        if(p.amrap)return `${p.label} (from ${p.min} rep)`;
        if(p.openTop)return `${p.label} (${p.min}+ reps)`;
        return `${p.label} (${forkRangeLabel(p.min,p.max,'reps')})`;})():'');
      const muscles=[...new Set((t.exercises||[]).flatMap(item=>{const ex=resolveExercise(item.exerciseId);return [...(ex?.primary||[]),...(ex?.secondary||[])];}))];
      const totalSets=(t.exercises||[]).reduce((n,item)=>n+(typeof sessionSetCount==='function'?sessionSetCount(item):(item.sets||[]).length),0);  
       






       
      const focusRangeForTemplate=t.focusCustom?{label:'Custom',min:+t.focusCustom.min,max:t.focusCustom.max==null?null:+t.focusCustom.max,preset:'custom'}:(t.focusKey&&REP_PRESETS[t.focusKey]?REP_PRESETS[t.focusKey]:progressionSetup.defaultRange);
      const rows=(t.exercises||[]).map(item=>{const s=savedExerciseSummary(item,focusRangeForTemplate);return `<button class="picker-item saved-editor-row" type="button" data-saved-exercise="${escapeHtml(item.exerciseId)}" aria-label="Open ${escapeHtml(s.name)} details"><span><strong>${escapeHtml(s.name)}</strong><span class="row-meta">${s.meta}</span></span></button>`;}).join('');  
      const templateMix=typeof workoutRangeMix==='function'?workoutRangeMix(t.exercises||[],focusRangeForTemplate):null;
      const templateMixed=!!(templateMix&&templateMix.mixed);
       



      if(templateMix&&!templateMixed&&templateMix.unanimousOwnProfile){
        const up=templateMix.unanimousOwnProfile;
        const upName=up.label||(up.preset&&REP_PRESETS[up.preset]?REP_PRESETS[up.preset].label:'');
        if(up.amrap)focusLabel=upName?`${upName} (from ${up.min||1} rep)`:'AMRAP';
        else if(up.openTop||(up.min!=null&&up.max==null))focusLabel=upName?`${upName} (${up.min}+ reps)`:`${up.min}+ reps`;
        else if(up.min==null&&up.max!=null)focusLabel=upName?`${upName} (up to ${up.max} reps)`:`up to ${up.max} reps`;
        else focusLabel=upName?`${upName} (${forkRangePairText(up.min,up.max)} reps)`:`${forkRangePairText(up.min,up.max)} reps`;
      }
       




       
      const badges=`${t.builtIn?'<span class="built-in-label">Built-in</span>':''}${t.shared?' <span class="built-in-label">Shared</span>':''}${t.archivedAt?' <span class="built-in-label">Archived</span>':''}`;
      host.innerHTML=`<div class="completed-card"><span class="continue-kicker">Saved workout</span><div class="detail-title-row"><h2>${escapeHtml(t.name)} ${badges}</h2><span class="title-actions"><button class="icon-button" id="shareSavedWorkoutBtn" type="button" aria-label="Share ${escapeHtml(t.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.5v-11"/><path d="M7.6 7.4L12 3l4.4 4.4"/><path d="M6 11.5V19a1.6 1.6 0 0 0 1.6 1.6h8.8A1.6 1.6 0 0 0 18 19v-7.5"/></svg></button><button class="primary-button" id="startSavedWorkoutBtn" type="button">Start</button></span></div><div class="meta-chips" role="list" aria-label="Workout summary"><span class="tag" role="listitem">${t.exercises.length} exercise${t.exercises.length===1?'':'s'}</span><span class="tag" role="listitem">${totalSets} set${totalSets===1?'':'s'}</span>${focusLabel?(templateMixed?`<button type="button" class="tag mixed-chip" id="savedMixedChip">Focus: ${escapeHtml(focusLabel)} (Mixed)</button>`:`<span class="tag" role="listitem">Focus: ${escapeHtml(focusLabel)}</span>`):''}</div>
      ${muscles.length?`<div class="section-head"><h3>Muscles worked</h3></div>${workedMuscleMapBlockHtml(workoutBodyMapMarkup(muscles),templateMuscleSetCounts(t.exercises||[]),null,{blindSpots:false})}`:''}
      <div class="section-head"><h3>Exercises</h3></div>${rows||'<p class="section-note">No exercises yet. Add some below.</p>'}
      <div class="detail-action-buttons"><div class="detail-action-row"><button class="secondary-button" id="editSavedWorkoutBtn" type="button" ${t.builtIn?'disabled aria-disabled="true" title="Built-in workouts can\'t be edited — duplicate one to customize it"':''}>Edit</button><button class="secondary-button" id="duplicateSavedWorkoutBtn" type="button">Duplicate</button></div>
      ${t.builtIn?'':`<button class="new-template-button neutral" id="archiveSavedWorkoutBtn" type="button">${t.archivedAt?'Restore':'Archive'}</button>
      <button class="template-delete-text" id="deleteSavedWorkoutBtn" type="button">delete saved workout</button>`}</div></div>`;
      hydrateBodyMaps();
      $('#startSavedWorkoutBtn').addEventListener('click',()=>requestStartSavedWorkout(t.id));
       
      $('#savedMixedChip')?.addEventListener('click',()=>{
        if(typeof openRangeMixDialog!=='function')return;
        openRangeMixDialog(t.exercises||[],focusRangeForTemplate,builderFocusText(focusRangeForTemplate));
      });
      if(!t.builtIn)$('#editSavedWorkoutBtn')?.addEventListener('click',()=>startSavedBuilder({templateId:t.id}));
      $('#duplicateSavedWorkoutBtn')?.addEventListener('click',()=>duplicateSavedWorkout(t.id));
       

      document.querySelectorAll('[data-saved-exercise]').forEach(b=>b.addEventListener('click',()=>openExercise(b.dataset.savedExercise,true,makeReturnRoute(ROUTES.VIEW.WORKOUT,{sub:ROUTES.WORKOUT_SUB.SAVED,savedWorkoutId:t.id}))));
      $('#shareSavedWorkoutBtn')?.addEventListener('click',()=>shareTemplate(t.id));
      if(!t.builtIn){
        $('#archiveSavedWorkoutBtn')?.addEventListener('click',()=>{
           

          if(t.archivedAt){delete t.archivedAt;}
          else{t.archivedAt=new Date().toISOString();}
          schedulePersist();refreshTemplateViews();
        });
        $('#deleteSavedWorkoutBtn')?.addEventListener('click',()=>{
          pendingDeleteTemplateId=t.id;
          $('#deleteTemplateDesc').textContent=`Delete "${t.name}"? This cannot be undone.`;
          showModalPinned($('#deleteTemplateDialog'));
        });
      }
    }
     

    function duplicateSavedWorkout(id){
      const t=workoutState.templates.find(x=>x.id===id);if(!t)return;
      const copy={id:newTemplateId(),name:`${t.name} copy`,focusKey:t.focusKey||null, progression:t.progression?{...t.progression}:null,createdAt:Date.now(),exercises:cloneTemplateExercises(t.exercises||[])};
      workoutState.templates.unshift(copy);
      schedulePersist();
       

      openSavedWorkoutEditor(copy.id);
    }
     






    let pendingConflictStart=null;
    function requestStartWithConflict(name,startFn,verb){
      if(workoutState.draft){
        pendingConflictStart=startFn;
        const action=verb||'Starting';
        $('#startSavedConflictDesc').textContent=`You have a workout in progress. ${action} “${name}” will replace it.`;
        $('#switchToSavedWorkout').textContent=verb==='Editing'?'Edit anyway':'Switch workout';
         










        const dialog=$('#startSavedConflictDialog');
        const openConflictDialog=()=>{
          if(typeof showModalPinned==='function')showModalPinned(dialog);
          else dialog.showModal();
        };
        if(dialog&&!dialog.open)openConflictDialog();
        else if(dialog&&dialog.classList&&dialog.classList.contains('is-closing')){
          dialog.addEventListener('close',()=>{if(pendingConflictStart===startFn&&!dialog.open)openConflictDialog();},{once:true});
        }
        return;
      }
      startFn();
    }
     
    function requestStartSavedWorkout(id){
      const t=workoutState.templates.find(x=>x.id===id);if(!t)return;
      requestStartWithConflict(t.name,()=>startWorkoutFromTemplate(id));
    }
     








    let pendingBuilderSource=null;
     





    let pendingBuilderDiscard=null;
     







    let pendingBuilderCardKey=null;
     


    function clearBuilderDraft(){
       


      const b=state.savedBuilder;
      if(b?.isNewProgramShell&&b.editTarget?.kind==='program'){
        const program=workoutState.activeProgram;
        const idx=program?.workouts.findIndex(w=>w.uid===b.editTarget.uid)??-1;
        if(idx>=0){program.workouts.splice(idx,1);if(typeof touchProgram==='function')touchProgram(program);}
      }
      state.savedBuilder=null;
      state.builderReturn=null;
      schedulePersist();
    }
     





    function closeBuilderToReturn(clearDraft){
       

      exitBuilderVariantEdit();
      const ret=state.builderReturn;
      state.builderOpen=false;
      if(clearDraft)clearBuilderDraft();else schedulePersist();
      const uid=ret&&ret.view==='program'?ret.programWorkoutUid:null;
      const stillThere=uid&&workoutState.activeProgram&&workoutState.activeProgram.workouts.some(w=>w.uid===uid);
      if(ret&&ret.view==='program'){
         

        state.programWorkoutUid=stillThere?uid:null;
        showProgram(false);
      }else{
        renderWorkoutScreen();
      }
      window.scrollTo({top:0});
    }
     















     























































    function builderDraftKeyOfDraft(b){
      if(!b||typeof b!=='object')return null;
      if(b.editTarget?.kind==='template'&&b.editTarget.id)return `template:${b.editTarget.id}`;
      if(b.editTarget?.kind==='program'&&b.editTarget.uid)return `program:${b.editTarget.uid}`;
      if(!b.editTarget&&b.id)return `new:${b.id}`;
      return null;
    }
    function builderDraftKeyOfSource(source){
      if(source?.templateId)return `template:${source.templateId}`;
      if(source?.programUid)return `program:${source.programUid}`;
      return null;
    }
    function builderDraftStash(){
      if(!state.savedBuilderStash||typeof state.savedBuilderStash!=='object'||Array.isArray(state.savedBuilderStash))state.savedBuilderStash={};
      return state.savedBuilderStash;
    }
     
    function stashBuilderDraft(){
      const b=state.savedBuilder;if(!b)return;
      const key=builderDraftKeyOfDraft(b);
      if(key)builderDraftStash()[key]=b;
      state.savedBuilder=null;
    }
     
    function takeStashedBuilderDraft(key){
      const stash=builderDraftStash();
      const draft=stash[key]||null;
      if(draft)delete stash[key];
      return draft;
    }
     



















    function findOpenUnsavedBuilderDraft(kind){
      const matches=b=>{
        if(!b||typeof b!=='object')return false;
        if(kind==='shell')return !!b.isNewProgramShell&&b.editTarget?.kind==='program'
          &&!!workoutState.activeProgram?.workouts.some(w=>w.uid===b.editTarget.uid);
        return !b.editTarget;
      };
      if(matches(state.savedBuilder))return {key:null};
      const stash=builderDraftStash();
      for(const key of Object.keys(stash)){if(matches(stash[key]))return {key};}
      return null;
    }
     


    function builderDraftDisplayName(b){
      const programShell=b?.editTarget?.kind==='program'?workoutState.activeProgram?.workouts.find(w=>w.uid===b.editTarget.uid):null;
      return (b?.name||'').trim()||programShell?.name||'New saved workout';
    }
     











    function syncDiscardDraftDialog(builderContext){
      const title=$('#discardDraftTitle'),desc=$('#discardDraftDesc');
      if(!title||!desc)return;
      const isBuilder=typeof builderContext==='boolean'?builderContext:discardingBuilder;
      if(isBuilder&&state.savedBuilder){
        const b=state.savedBuilder,name=builderDraftDisplayName(b);
        title.textContent=`Discard draft of “${name}”?`;
         






        desc.textContent=b.isNewProgramShell
          ?`This permanently deletes “${name}”. It was never saved, so discarding cannot be undone — the empty workout is removed from the program.`
          :b.editTarget
          ?`This permanently deletes the unsaved draft of “${name}”. The saved workout itself is not deleted.`
          :`This permanently deletes “${name}”. It was never saved, so discarding cannot be undone.`;
      }else{
        title.textContent='Discard workout?';
        desc.textContent='This permanently deletes the in-progress workout.';
      }
    }
     

    function syncBuilderDraftExistsDialog(b){
      const name=builderDraftDisplayName(b);
      const title=$('#builderDraftExistsTitle');if(title)title.textContent=`Draft of “${name}” in progress`;
      const desc=$('#builderDraftExistsDesc');if(desc)desc.textContent=`You have an unfinished draft of “${name}”. Resume it to keep editing, or discard it and edit the saved copy instead.`;
    }
     




    function syncBuilderDraftConflictDialog(b,targetPhrase){
      const name=builderDraftDisplayName(b);
      const title=$('#builderDraftExistsTitle');if(title)title.textContent=`Draft of “${name}” in progress`;
      const desc=$('#builderDraftExistsDesc');if(desc)desc.textContent=targetPhrase
        ?`You have an unfinished draft of “${name}”. Resume it to keep editing, or discard it and open ${targetPhrase} instead.`
        :`You have an unfinished draft of “${name}”. Resume it to keep editing, or discard it and start fresh.`;
    }
     

    function builderSourceTargetLabel(source){
      if(!source)return 'a new saved workout';
      if(source.templateId){const t=workoutState.templates.find(x=>x.id===source.templateId);return t?`“${t.name}”`:'the saved workout';}
      if(source.programUid){const w=workoutState.activeProgram?.workouts.find(x=>x.uid===source.programUid);return w?`“${w.name}”`:'the program workout';}
      if(source.newProgramWorkout)return 'a new program workout';
      return 'a new saved workout';
    }
     


    function resumeBuilderDraft(){
       




      if(pendingBuilderDiscard&&pendingBuilderDiscard!=='active'){
        const key=pendingBuilderDiscard;
        pendingBuilderSource=null;pendingBuilderDiscard=null;pendingBuilderCardKey=null;
        openStashedBuilderDraft(key);
        return;
      }
       


      pendingBuilderSource=null;pendingBuilderDiscard=null;pendingBuilderCardKey=null;
      if(!state.savedBuilder)return;
      if(state.activeView!=='workout')showWorkouts(false);
      state.builderOpen=true;state.savedWorkoutId=null;state.workoutEditorOpen=false;
      schedulePersist();renderWorkoutScreen();window.scrollTo({top:0});
    }
     











    function discardPendingBuilderDraft(){
      const src=pendingBuilderSource;
      const discard=pendingBuilderDiscard;
      const cardKey=pendingBuilderCardKey;
      pendingBuilderSource=null;pendingBuilderDiscard=null;pendingBuilderCardKey=null;
      if(discard&&discard!=='active'){
        const stash=builderDraftStash();
        const draft=stash[discard];
        if(draft){
          delete stash[discard];
          if(draft.isNewProgramShell&&draft.editTarget?.kind==='program'){
            const program=workoutState.activeProgram;
            const idx=program?.workouts.findIndex(w=>w.uid===draft.editTarget.uid)??-1;
            if(idx>=0){program.workouts.splice(idx,1);if(typeof touchProgram==='function')touchProgram(program);}
          }
          schedulePersist();
        }
      }else{
        clearBuilderDraft();
      }
       

      if(cardKey){openStashedBuilderDraft(cardKey);return;}
      openSavedBuilder(src);
    }
     






    function openStashedBuilderDraft(key){
       







      const parkedDraft=builderDraftStash()[key];
      if(state.savedBuilder&&parkedDraft){
        pendingBuilderSource=null;
        pendingBuilderDiscard='active';
        pendingBuilderCardKey=key;
        syncBuilderDraftConflictDialog(state.savedBuilder,`“${builderDraftDisplayName(parkedDraft)}”`);
        showModalPinned($('#builderDraftExistsDialog'));
        return;
      }
      if(state.savedBuilder)stashBuilderDraft();
      const draft=takeStashedBuilderDraft(key);
      if(!draft){renderWorkoutScreen();return;}
      state.savedBuilder=draft;
      state.builderReturn=draft.editTarget?.kind==='program'?{view:'program',programWorkoutUid:draft.editTarget.uid}:null;
      if(state.activeView!=='workout')showWorkouts(false);
      state.builderOpen=true;state.savedWorkoutId=null;state.workoutEditorOpen=false;
      schedulePersist();renderWorkoutScreen();window.scrollTo({top:0});
    }
     





    function startSavedBuilder(source){
       


      pendingBuilderCardKey=null;
      const b=state.savedBuilder;
      const key=builderDraftKeyOfSource(source);
       
      if(b&&key&&key===builderDraftKeyOfDraft(b)){
        pendingBuilderSource=source||null;
        pendingBuilderDiscard='active';
        syncBuilderDraftExistsDialog(b);
        showModalPinned($('#builderDraftExistsDialog'));
        return;
      }
      const unsavedKind=!source?'new':(source.newProgramWorkout&&!source.programUid?'shell':null);
      if(unsavedKind){
        const open=findOpenUnsavedBuilderDraft(unsavedKind);
         


        if(open&&!open.key){
          pendingBuilderSource=source||null;
          pendingBuilderDiscard='active';
          syncBuilderDraftConflictDialog(b,null);
          showModalPinned($('#builderDraftExistsDialog'));
          return;
        }
         






        if(open&&open.key&&!b){
          pendingBuilderSource=source||null;
          pendingBuilderDiscard=open.key;
          syncBuilderDraftConflictDialog(builderDraftStash()[open.key],null);
          showModalPinned($('#builderDraftExistsDialog'));
          return;
        }
      }
       




      if(b){
        pendingBuilderSource=source||null;
        pendingBuilderDiscard='active';
        syncBuilderDraftConflictDialog(b,builderSourceTargetLabel(source));
        showModalPinned($('#builderDraftExistsDialog'));
        return;
      }
      openSavedBuilder(source||null);
    }
     



    function resolveProgramWorkoutSource(source){
      if(source?.programUid||!source?.newProgramWorkout)return source;
      const program=workoutState.activeProgram;
      if(!program)return null;
       









       




      const shellName=`Workout ${program.workouts.length+1}`;
      const shell={uid:newProgramWorkoutUid(),name:shellName,sourceWorkoutId:null,sourceTemplateId:null,template:{name:shellName,exercises:[],focusKey:null,focusCustom:null}};
      program.workouts.push(shell);
       












      if(typeof touchProgram==='function')touchProgram(program);
      schedulePersist();
      return {programUid:shell.uid};
    }
     






    function defaultBuilderFocusKey({isNewProgramShell,programWorkout,template,base}){
      if(base?.focusKey)return base.focusKey;
      const settingsPreset=()=>{
        const preset=progressionSetup.defaultRange&&progressionSetup.defaultRange.preset;
        return preset&&REP_PRESETS[preset]?preset:null;
      };
      const programPreset=()=>{
         

        if(!workoutState.activeProgram)return null;
        if(typeof programRangeForWeek==='function'&&typeof programWeek==='function'){
          const wk=programRangeForWeek(workoutState.activeProgram,programWeek(workoutState.activeProgram));
          if(wk&&wk.preset&&REP_PRESETS[wk.preset])return wk.preset;
        }
        const dp=workoutState.activeProgram.progression&&workoutState.activeProgram.progression.defaultRange&&workoutState.activeProgram.progression.defaultRange.preset;
        return dp&&REP_PRESETS[dp]?dp:null;
      };
       






      if(programWorkout)return programPreset();
      return settingsPreset();
    }
     
    function openSavedBuilder(source){
      pendingBuilderSource=null;
       


      if(state.activeView!=='workout')showWorkouts(false);
       



      const isNewProgramShell=!!source?.newProgramWorkout&&!source?.programUid;
      source=resolveProgramWorkoutSource(source);
       





      const parkedKey=builderDraftKeyOfSource(source);
      const parked=parkedKey?takeStashedBuilderDraft(parkedKey):null;
      if(parked){
        state.savedBuilder=parked;
        state.builderReturn=parked.editTarget?.kind==='program'?{view:'program',programWorkoutUid:parked.editTarget.uid}:null;
        state.builderOpen=true;state.savedWorkoutId=null;state.workoutEditorOpen=false;
        schedulePersist();renderWorkoutScreen();window.scrollTo({top:0});
        return;
      }
      const programWorkout=source?.programUid?workoutState.activeProgram?.workouts.find(w=>w.uid===source.programUid):null;
      const template=source?.templateId?workoutState.templates.find(t=>t.id===source.templateId):null;
      const base=programWorkout?.template||template;
       
      state.savedBuilder={
        id:template?template.id:newTemplateId(),
        name:programWorkout?(isNewProgramShell?'':programWorkout.name):(template?template.name:''),
        focusKey:defaultBuilderFocusKey({isNewProgramShell,programWorkout,template,base}),
         


        focusCustom:base?.focusCustom?{min:+base.focusCustom.min,max:base.focusCustom.max==null?null:+base.focusCustom.max}:null,
         




        progression:base?.progression?(typeof forkSanitizeWorkoutProgression==='function'?forkSanitizeWorkoutProgression(base.progression):{...base.progression}):null,
        exercises:cloneTemplateExercises(base?.exercises||[]),
        editTarget:programWorkout?{kind:'program',uid:programWorkout.uid}:template?{kind:'template',id:template.id}:null,
        isNewProgramShell:isNewProgramShell&&!!programWorkout
      };
       












      if(programWorkout||template){
        (state.savedBuilder.exercises||[]).forEach(it=>{it.cardOpen=false;});
      }
       

      state.builderReturn=programWorkout?{view:'program',programWorkoutUid:programWorkout.uid}:null;
      state.builderOpen=true;state.savedWorkoutId=null;state.workoutEditorOpen=false;
      schedulePersist();renderWorkoutScreen();window.scrollTo({top:0});
    }
     




    function builderExerciseCard(item,list){
      const ex=resolveExercise(item.exerciseId);
      const time=exerciseTracking(item,ex)==='time';
      const unit=time?'sec':'reps';
      const uidAttr=escapeHtml(item.uid||'');
       











      const cardFocusRange=(()=>{const b=state.savedBuilder;if(!b)return null;
        if(b.editTarget?.kind==='program'&&typeof programWorkoutFocusRange==='function'&&workoutState.activeProgram&&typeof programWeek==='function'){
          const pw=(workoutState.activeProgram.workouts||[]).find(w=>w.uid===b.editTarget.uid);
          if(pw)return programWorkoutFocusRange(workoutState.activeProgram,pw,programWeek(workoutState.activeProgram));
        }
        return typeof builderFocusRange==='function'?builderFocusRange(b):null;})();
      const effProfile=(!time&&typeof forkEffectiveRangeProfile==='function'&&cardFocusRange)
        ?forkEffectiveRangeProfile(item,cardFocusRange):null;
      const rp=rangePlaceholder(effProfile||item.progression,time);
      const rangeSummary=rp.text||'';
       



      const authoredHeader=(!time&&typeof authoredRepsSummary==='function')?authoredRepsSummary(item):null;
       










      const pctMode=(()=>{const b=state.savedBuilder;
        if(!b||b.editTarget?.kind!=='program')return false;
        if(exerciseTracking(item,ex)!=='reps')return false;
        return typeof resolvedExerciseScheme==='function'&&resolvedExerciseScheme(item)==='onerm';})();
       


      const pctGhostFor=(set)=>{
        if(set.pct!=null&&set.pct!=='')return '';
        const program=workoutState.activeProgram;
        if(!program||typeof resolveSetPct!=='function')return '';
        const wk=typeof programWeek==='function'?programWeek(program):1;
        return String(resolveSetPct(set,item.progression||{},program.progression||{},wk));
      };
       









      const variantsHtml=(()=>{const b=state.savedBuilder;
        if(!b||b.editTarget?.kind!=='program'||!workoutState.activeProgram||typeof programVariantWeekCount!=='function')return '';
         

        if(b.variantEdit&&b.variantEdit.variantUid===item.uid)return '';
        const total=programVariantWeekCount(workoutState.activeProgram);
        if(total<2)return '';
        const map=(item.weekVariants&&typeof item.weekVariants==='object'&&!Array.isArray(item.weekVariants))?item.weekVariants:{};
        const weeks=Object.keys(map).map(Number).filter(w=>Number.isInteger(w)&&w>=1&&w<=total).sort((a,c)=>a-c);
        const rowsHtml=weeks.map(w=>{const v=map[String(w)];if(!v||!v.exerciseId)return '';
          const s=exerciseTargetSummary(v,resolveExercise(v.exerciseId)?.name||'Exercise');
          return `<div class="builder-variant-row"><span class="builder-variant-week">Week ${w}</span><span class="builder-variant-main"><strong>${escapeHtml(s.name)}</strong><span class="row-meta">${s.meta}</span></span><button class="builder-variant-edit" type="button" data-builder-variant-edit="${uidAttr}" data-variant-week="${w}">Edit</button><button class="builder-x" type="button" data-builder-variant-remove="${uidAttr}" data-variant-week="${w}" aria-label="Remove the week ${w} variant">×</button></div>`;}).join('');
        const free=[];for(let w=1;w<=total;w++)if(!map[String(w)])free.push(w);
        const addHtml=free.length?`<div class="builder-variant-add"><select data-builder-variant-week="${uidAttr}" aria-label="Week for the new variant">${free.map(w=>`<option value="${w}">Week ${w}</option>`).join('')}</select><button class="add-set builder-variant-add-btn" type="button" data-builder-variant-add="${uidAttr}">+ Add variant</button></div>`:'';
        if(!rowsHtml&&!addHtml)return '';
         






        if(!rowsHtml)return addHtml;
        return `<div class="builder-variants"><div class="builder-variants-head">Week variants</div>${rowsHtml}${addHtml}</div>`;
      })();
      const tmRow=(()=>{if(!pctMode)return '';
        const prof=item.progression||{};
        const tmRaw=Number(prof.trainingMax ?? prof.manual1RM)||0;
        const dbIsDb=(typeof exercises!=='undefined')&&pairImplementExercise(ex);
        const tmVal=tmRaw>0&&typeof dbDisplayWeight==='function'?dbDisplayWeight(tmRaw,item.exerciseId,item,dbIsDb):'';
        return `<div class="builder-tm-row"><label class="prog-onerm-field"><span>Training max</span><span class="prog-onerm-input"><input type="number" inputmode="decimal" min="1" step="0.5" value="${tmVal}" placeholder="Not set" data-onerm-tm="${uidAttr}" aria-label="Training max for ${escapeHtml(ex?.name||'exercise')}"><em class="unit">${escapeHtml(weightUnit())}</em></span></label></div>`;
      })();
      const setRows=(item.sets||[]).map((set,i)=>{
        const val=time?(set.seconds??''):(set.r??'');
         






        const ghost=(!val&&set.prefillHint)?String((time?set.prefillHint.seconds:set.prefillHint.r)||''):'';
         




        const wVal=(set.w!=null&&set.w!==''&&typeof dbDisplayWeight==='function')?String(dbDisplayWeight(set.w,item.exerciseId,item,pairImplementExercise(ex))):'';
        const wGhost=(!wVal&&set.prefillHint&&set.prefillHint.w!=null&&set.prefillHint.w!==''&&typeof dbDisplayWeight==='function')?String(dbDisplayWeight(set.prefillHint.w,item.exerciseId,item,pairImplementExercise(ex))):'';
        const setTags=set.tags||[];
         



         



        const fixedChip=(typeof isFixedSet==='function'&&isFixedSet(set))?`<span class="set-tag-chip">Don't progress</span>`:'';
         

        const amrapChip=(typeof isAmrapSet==='function'&&isAmrapSet(set))?'<span class="set-tag-chip">AMRAP</span>':'';
        const tagChips=(setTags.length||fixedChip||amrapChip)?`<div class="builder-set-tags">${setTags.map(t=>`<span class="set-tag-chip">${escapeHtml(setTagLabel(t))}</span>`).join('')}${fixedChip}${amrapChip}</div>`:'';
        return `<div class="swipe-item set-swipe" data-builder-set-swipe="${escapeHtml(set.uid||('s'+i))}"><button aria-hidden="true" class="swipe-delete-action delete-builder-set-swipe" type="button" data-builder-uid="${uidAttr}" data-builder-set="${i}" aria-label="Remove set ${i+1}" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg></button><div class="swipe-content"><div class="builder-set-row${pctMode?' has-pct':''} has-weight"><button class="builder-set-num log-set-number ${setTags.length||fixedChip||amrapChip?'has-tags':''}" type="button" data-builder-tag-set="${escapeHtml(set.uid||'')}" data-builder-tag-exercise="${uidAttr}" aria-label="Choose tags for set ${i+1}" aria-haspopup="dialog">${i+1}${setSide(set)?`<span class="set-side-badge ${setSide(set)}" aria-label="${setSide(set)==='L'?'Left':'Right'} side">${setSide(set)}</span>`:''}</button><input class="log-input builder-set-weight" type="number" inputmode="decimal" min="0" step="any" value="${escapeHtml(wVal)}" placeholder="${escapeHtml(wGhost||'Weight')}" data-builder-set-weight="${i}" data-builder-uid="${uidAttr}" aria-label="Set ${i+1} weight"><input class="log-input" type="number" inputmode="numeric" min="1" value="${escapeHtml(String(val))}" placeholder="${escapeHtml(ghost||rangeSummary||'Target')}" data-builder-set="${i}" data-builder-uid="${uidAttr}" aria-label="Set ${i+1} target ${unit}">${pctMode?`<input class="log-input builder-set-pct" type="number" inputmode="decimal" min="0" max="100" step="any" value="${set.pct!=null&&set.pct!==''?escapeHtml(String(set.pct)):''}" placeholder="${escapeHtml(pctGhostFor(set))}" data-builder-set-pct="${i}" data-builder-uid="${uidAttr}" aria-label="Set ${i+1} percent of training max">`:''}<button class="builder-x" type="button" data-builder-del-set="${i}" data-builder-uid="${uidAttr}" aria-label="Remove set ${i+1}">\u00d7</button></div>${tagChips}</div></div>`;
      }).join('');
       







      const hasWarmups=(item.sets||[]).some(isWarmupSet);
      const warmupControl=hasWarmups
        ? ''
        : `<button class="warmup-corner" type="button" data-builder-warmup="${uidAttr}">Warm-up</button>`;
       


















      return `<details class="exercise-accordion workout-exercise" data-builder-exercise="${uidAttr}" ${item.cardOpen===false?'':'open'}>
            <summary class="exercise-accordion-head"><span class="exercise-accordion-title"><strong>${escapeHtml(ex?.name||'Exercise')}</strong>${(rangeSummary||authoredHeader)?`<small><span class="m-ink">${forkCountText((item.sets||[]).length,'set')}</span><span class="fact">target ${escapeHtml(authoredHeader||rangeSummary)}${!authoredHeader&&!time&&/^\d/.test(rangeSummary)?' reps':''}</span></small>`:''}</span></summary>
            <div class="exercise-accordion-body">
            ${ 



''}
            <div class="builder-card-actions">${ ''}${warmupControl}${exerciseCardMenuHtml(item,ex,'builder')}</div>
            ${ 
''}
            ${tmRow}
            <div class="log-labels builder-labels${pctMode?' has-pct':''} has-weight"><span>SET</span><span>WEIGHT</span><span>${time?'SECONDS':'REPS'}</span>${pctMode?`<span>% TM</span><span></span>`:`<span></span>`}</div>
            <div class="log-sets">${setRows||'<div class="history-empty">No sets yet.</div>'}</div>
            <div class="set-utility-row"><button class="add-set" type="button" data-builder-add-set="${uidAttr}">+ Add set</button></div>
            <div class="exercise-note">${item.noteOpen||item.note?`<textarea id="note-${uidAttr}" data-builder-note="${uidAttr}" aria-label="Exercise notes" placeholder="Cues, setup, pain, or anything to remember">${escapeHtml(item.note||'')}</textarea>`:`<button class="add-note-toggle" type="button" data-builder-add-note="${uidAttr}">Add notes</button>`}</div>
            ${variantsHtml}
            ${ 
























''}
            </div>
          </details>`;
    }     



     







    let builderNameEdit={builder:null,open:false};
    function savedBuilderPageHtml(b){
       


      const cards=supersetVisualBlocks(b.exercises||[]).map(block=>
        block.group
          ? `<div class="superset-group" data-superset-group="${escapeHtml(block.supersetId)}">${supersetGroupHeadHtml(b.exercises,block.supersetId,`data-builder-superset="${escapeHtml(block.items[0].uid)}"`)}${block.items.map(item=>builderExerciseCard(item,b.exercises)).join('')}</div>`
          : builderExerciseCard(block.items[0],b.exercises)
      ).join('');
       



      const focusRange=builderFocusRange(b);
       


      const bFocusLabel=focusRange?.label||(focusRange?.preset&&REP_PRESETS[focusRange.preset]?REP_PRESETS[focusRange.preset].label:'');
      const bFocusRangeText=(!focusRange||focusRange.amrap||focusRange.min==null)?'':((focusRange.openTop||focusRange.max==null)?`${focusRange.min}+`:forkRangePairText(focusRange.min,focusRange.max));  
      const bFocusName=focusRange?.amrap?(bFocusLabel||'AMRAP'):(bFocusLabel||bFocusRangeText||'Focus');
      const focusAriaLabel=escapeHtml(`Focus: ${bFocusName}${bFocusLabel&&bFocusRangeText?`, ${bFocusRangeText.replace(/–/g,' to ')}`:''}`);
      const mix=typeof workoutRangeMix==='function'?workoutRangeMix(b.exercises||[],focusRange):null;
      const mixedMarker=mix&&mix.mixed?'<button type="button" class="mixed-marker" data-builder-mixed>Mixed</button>':'';
       




      const nameEditing=builderNameEdit.builder===b&&builderNameEdit.open;
      return `<div class="workout-meta fork-header">
      ${ 



































''}
      ${(b.editTarget?.kind==='program'&&workoutState.activeProgram)?`<div class="workout-context fork-header-eyebrow">${escapeHtml(workoutState.activeProgram.name)}${typeof programWeek==='function'?` – Week ${programWeek(workoutState.activeProgram)}`:''}</div>`:''}
      <div class="fork-name-display" id="builderNameDisplay" role="button" tabindex="0" aria-label="Rename workout"${nameEditing?' hidden':''}>${escapeHtml(b.name||'Workout')}</div>
      <input id="builderName" class="fork-title-input" type="text" value="${escapeHtml(b.name||'')}" placeholder="Workout" autocomplete="off" maxlength="80" aria-label="Workout name"${nameEditing?'':' hidden'}>
      <div class="fork-header-meta">
      <div class="fork-header-stack workout-focus-summary fork-focus-value" id="builderFocusValue" role="button" tabindex="0" aria-haspopup="dialog" aria-label="${focusAriaLabel}"><span class="fork-header-label" aria-hidden="true">Focus</span><span class="fork-focus-parts" id="builderFocusValueText">${builderFocusPartsHtml(focusRange)}</span>${mixedMarker}</div>
      </div>
      </div>
      ${b.variantEdit?`<div class="builder-variant-edit-banner" role="status"><span>Editing Week ${escapeHtml(String(b.variantEdit.week))} variant of ${escapeHtml(resolveExercise(b.variantEdit.baseItem?.exerciseId)?.name||'exercise')}</span><button class="button secondary" type="button" id="builderVariantEditDone">Done</button></div>`:''}
      <div class="workout-toolbar"><h2>Exercises</h2><div class="workout-toolbar-actions">${ ''}<button class="exercise-info-button plain-glyph" id="builderReorderExercises" type="button" aria-label="Reorder exercises"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><button class="exercise-info-button plain-glyph" id="builderAddExerciseFromToolbar" type="button" aria-label="Add exercise"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div></div>
      <div class="workout-exercises">${cards||'<div class="history-empty">No exercises yet. Add your first movement above.</div>'}</div>
      <button class="secondary-button add-exercise-bottom" id="builderAddExerciseBottom" type="button">+ Add exercise</button>
      <div class="workout-footer"><div class="workout-actions"><button class="secondary-button" id="discardBuilderBtn" type="button">Discard</button><button class="primary-button" id="saveBuilderBtn" type="button"${b.exercises.length?'':' disabled'}>Save workout</button></div></div>`;
    }
     
    function wireBuilderName(b){
       


      $('#builderName')?.addEventListener('input',e=>{b.name=clampNameLength(e.target.value);schedulePersist();});
       




      $('#builderNameDisplay')?.addEventListener('click',()=>forkOpenBuilderNameEdit(b));
      $('#builderNameDisplay')?.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();forkOpenBuilderNameEdit(b);}});
      $('#builderName')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();e.target.blur();}});
      $('#builderName')?.addEventListener('blur',()=>forkCloseBuilderNameEdit(b));
    }
     

    function forkSyncBuilderNameDisplay(b){
      const display=$('#builderNameDisplay');if(!display)return;
      display.textContent=b?.name||'Workout';
    }
     



    function forkOpenBuilderNameEdit(b){
      const display=$('#builderNameDisplay'),input=$('#builderName');
      if(!display||!input||!input.hidden)return;
      builderNameEdit={builder:b,open:true};
      input.value=b?.name||'';
      display.hidden=true;input.hidden=false;
      const placeCaretAtEnd=()=>{const len=input.value.length;try{input.setSelectionRange(len,len);}catch(_){}};
       








      const onFocusIn=()=>{input.removeEventListener('focusin',onFocusIn);placeIfOpen();if(typeof setTimeout==='function')setTimeout(placeIfOpen,0);};
      input.addEventListener?.('focusin',onFocusIn);
      input.focus();
      placeCaretAtEnd();
      requestAnimationFrame(()=>{if(!input.hidden&&document.activeElement===input)placeCaretAtEnd();});
      if(typeof setTimeout==='function')setTimeout(placeIfOpen,0);
      function placeIfOpen(){if(!input.hidden&&document.activeElement===input)placeCaretAtEnd();}
    }
     

    function forkCloseBuilderNameEdit(b){
      builderNameEdit={builder:b,open:false};
      const display=$('#builderNameDisplay'),input=$('#builderName');
      if(!display||!input||input.hidden)return;
      input.hidden=true;display.hidden=false;
      forkSyncBuilderNameDisplay(b);
    }
     

    function builderFocusRange(b){
       


       



      if(b&&b.focusCustom&&Number.isFinite(+b.focusCustom.min)&&(b.focusCustom.max==null||Number.isFinite(+b.focusCustom.max)))return {label:'Custom',min:+b.focusCustom.min,max:b.focusCustom.max==null?null:+b.focusCustom.max,preset:'custom'};
      return b?.focusKey&&REP_PRESETS[b.focusKey]?REP_PRESETS[b.focusKey]:progressionSetup.defaultRange;
    }
     




    function builderRangeIsOwnRange(item){
      return builderExerciseHasCustomRange(item)&&item?.progression?.rangeSource!=='workoutCustom';
    }
     



    function builderFocusText(range){
      if(!range)return '';
      if(range.amrap)return 'AMRAP';
      const label=range.label||(range.preset&&REP_PRESETS[range.preset]?REP_PRESETS[range.preset].label:'');
      if(range.min==null)return label;
      if(range.openTop||range.max==null)return label?`${label} (${range.min}+)`:`${range.min}+`;
      return label?`${label} (${range.min}–${range.max})`:`${range.min}–${range.max}`;
    }
     




    function builderFocusPartsHtml(range){
      if(!range)return '';
      const label=range.label||(range.preset&&REP_PRESETS[range.preset]?REP_PRESETS[range.preset].label:'');
      if(range.amrap)return `<span class="fork-focus-name">${escapeHtml(label||'AMRAP')}</span>`;
      if(range.min==null)return `<span class="fork-focus-name">${escapeHtml(label)}</span>`;
      const rangeText=(range.openTop||range.max==null)?`${range.min}+`:forkRangePairText(range.min,range.max);  
      if(!label)return `<span class="fork-focus-name">${escapeHtml(rangeText)}</span>`;
      return `<span class="fork-focus-name">${escapeHtml(label)}</span><span class="fork-focus-range">${escapeHtml(rangeText)}</span>`;
    }
     






    function wireBuilderFocusRow(host,b){
      wireForkFocusSheetRouterOnce();
      const valueEl=host.querySelector('#builderFocusValue');
      valueEl?.addEventListener('click',event=>{
        if(event.target?.closest?.('[data-builder-mixed]'))return;
        const sheet=$('#forkFocusSheet');if(!sheet)return;
        sheet.dataset.host='builder';
         






        builderFocusStageFromDraft(b);
         



        sheet.showModal();
      });
      valueEl?.addEventListener('keydown',event=>{
        if(event.key==='Enter'||event.key===' '){event.preventDefault();valueEl.click();}
      });
       

      host.querySelector('[data-builder-mixed]')?.addEventListener('click',()=>{
        if(!b||typeof openRangeMixDialog!=='function')return;
        const focusRange=builderFocusRange(b);
        openRangeMixDialog(b.exercises,focusRange,builderFocusText(focusRange));
      });
    }
     





    let builderFocusStage={mode:'none',preset:null};
    function syncBuilderFocusStageTiles(sheet){
       




      const el=sheet||$('#forkFocusSheet');
      if(el)forkRepRangePickerPaint(el,{preset:builderFocusStage.mode==='preset'?builderFocusStage.preset:null,custom:builderFocusStage.mode==='custom'});
      syncBuilderFocusCurrentLine();
    }
     





    const builderFocusPickerAdapter={
      tileAttr:'data-workout-focus',minId:'forkFocusMin',maxId:'forkFocusMax',
      selection:()=>({preset:builderFocusStage.mode==='preset'?builderFocusStage.preset:null,custom:builderFocusStage.mode==='custom'}),
      onPreset(key){
        if(builderFocusStage.mode==='preset'&&builderFocusStage.preset===key){builderFocusStage={...builderFocusStage,mode:'none',preset:null};return 'cleared';}
        builderFocusStage={...builderFocusStage,mode:'preset',preset:key};
        return 'selected';
      },
      onCustom(){ builderFocusStage={...builderFocusStage,mode:'custom',preset:null}; },
      onFieldInput(){ if(builderFocusStage.mode!=='custom')builderFocusStage={...builderFocusStage,mode:'custom',preset:null}; },
      onAfter(){ syncBuilderFocusStageTiles(); },
    };
     




    function builderFocusCurrentSignature(){
      if(builderFocusStage.mode==='preset')return forkFocusSelectionSignature('preset',builderFocusStage.preset);
      if(builderFocusStage.mode==='custom')return forkFocusSelectionSignature('custom',null,$('#forkFocusMin')?.value,$('#forkFocusMax')?.value);
      return 'none';
    }
    function builderFocusStagedDescription(){
      if(builderFocusStage.mode==='preset'&&builderFocusStage.preset)return forkFocusRangeDescription(REP_PRESETS[builderFocusStage.preset]);
      if(builderFocusStage.mode==='custom'){
        const mn=$('#forkFocusMin')?.value,mx=$('#forkFocusMax')?.value;
         

        if(mn!==''&&mn!=null&&Number.isFinite(Number(mn))&&(mx===''||mx==null||Number.isFinite(Number(mx))))return forkFocusRangeDescription({label:'Custom',min:Number(mn),max:mx===''||mx==null?null:Number(mx)});
        return 'a custom range';
      }
      return '';
    }
    function syncBuilderFocusCurrentLine(){
      const line=$('#forkFocusCurrentLine'); if(!line)return;
      const b=state.savedBuilder;
      const ownSig=!b?'none':b.focusCustom?forkFocusSelectionSignature('custom',null,b.focusCustom.min,b.focusCustom.max):(b.focusKey?forkFocusSelectionSignature('preset',b.focusKey):'none');
      if(builderFocusStage.mode==='none'){
        if(ownSig!=='none'){line.textContent='On Save, this workout\u2019s own focus clears and the default range applies again.';return;}
        const effDesc=b?forkFocusRangeDescription(builderFocusRange(b)):'';
        line.textContent=effDesc?`Settings default: ${effDesc}. Pick a range above to set this workout\u2019s own.`:'Pick a range above to set this workout\u2019s focus.';
        return;
      }
      const desc=builderFocusStagedDescription();
      const cur=builderFocusCurrentSignature();
      if(ownSig!=='none'&&cur===ownSig){line.textContent=`This workout\u2019s focus: ${desc}.`;return;}
      if(builderFocusStage.inherited&&cur===builderFocusStage.openSignature){
        line.textContent=`Settings default: ${desc}. Pick a different range to set this workout\u2019s own.`;
        return;
      }
      line.textContent=`On Save, this workout\u2019s focus becomes ${desc}.`;
    }
     


    function syncBuilderFocusMixSection(b){
      const wrap=$('#forkFocusMix'),list=$('#forkFocusMixList'); if(!wrap||!list||!b)return;
      const mix=forkFocusMixRows(b.exercises||[],builderFocusRange(b));
      wrap.hidden=!mix.mixed;
      if(mix.mixed)list.innerHTML=mix.html;
    }
     





    function builderProgContext(){
      const b=state.savedBuilder;
      return (b?.editTarget?.kind==='program'&&workoutState.activeProgram)?workoutState.activeProgram:null;
    }
    function syncBuilderFocusProgControls(){
      forkSyncFocusProgControls(builderFocusStage,builderProgContext());
    }
    function builderFocusStageFromDraft(b){
       







      const sel=forkFocusStageSelection(b?.focusKey||null,b?.focusCustom||null,builderFocusRange(b));
      builderFocusStage={mode:sel.mode,preset:sel.preset||null};
      builderFocusStage.inherited=!!sel.inherited;
      builderFocusStage.openSignature=forkFocusSelectionSignature(sel.mode,sel.preset,sel.min,sel.max);
      const mnF=$('#forkFocusMin'),mxF=$('#forkFocusMax');
      if(mnF)mnF.value=sel.fillMin??'';
      if(mxF)mxF.value=sel.fillMax??'';
      builderFocusStage.prog=b?.progression?(typeof forkSanitizeWorkoutProgression==='function'?forkSanitizeWorkoutProgression(b.progression):{...b.progression}):null;
      syncBuilderFocusStageTiles();
      syncBuilderFocusProgControls();
      syncBuilderFocusMixSection(b);
    }
     





    function commitBuilderSheetExtras(){
      const b=state.savedBuilder;if(!b)return;
      let changed=false;
      const progSec=$('#forkFocusProgression');
      if(progSec&&!progSec.hidden){
        const staged=typeof forkSanitizeWorkoutProgression==='function'?forkSanitizeWorkoutProgression(builderFocusStage.prog):builderFocusStage.prog;
        const current=b.progression?(typeof forkSanitizeWorkoutProgression==='function'?forkSanitizeWorkoutProgression(b.progression):b.progression):null;
        if(JSON.stringify(staged)!==JSON.stringify(current)){
          if(staged)b.progression=staged; else delete b.progression;
          changed=true;
        }
      }
      if(changed)schedulePersist();
    }
    function commitBuilderFocusStage(sheet){
      const b=state.savedBuilder;if(!b){sheet.close();return;}
       



      if(builderFocusStage.inherited&&builderFocusCurrentSignature()===(builderFocusStage.openSignature||'')){commitBuilderSheetExtras();sheet.close();return;}
      if(builderFocusStage.mode==='custom'){
        const lo=$('#forkFocusMin')?.value,mx=$('#forkFocusMax')?.value;
        applyBuilderCustomRange(lo,mx);
         



        const wantMax=(mx==null||String(mx).trim()==='')?null:Math.round(Number(mx));
        if(b.focusCustom&&b.focusCustom.min===Math.round(Number(lo))&&b.focusCustom.max===wantMax){commitBuilderSheetExtras();sheet.close();}
        return;
      }
      if(builderFocusStage.mode==='preset'){
        if(builderFocusStage.preset!==(b.focusKey||null))applyBuilderFocus(builderFocusStage.preset);
        commitBuilderSheetExtras();
        sheet.close();
        return;
      }
       

      if(b.focusKey)applyBuilderFocus(b.focusKey);  
      else if(b.focusCustom){b.focusCustom=null;schedulePersist();renderSavedBuilder();}
      commitBuilderSheetExtras();
      sheet.close();
    }
     








    let forkFocusSheetRouterWired=false;
    function wireForkFocusSheetRouterOnce(){
      if(forkFocusSheetRouterWired)return;forkFocusSheetRouterWired=true;
      document.addEventListener('click',event=>{
        const sheet=$('#forkFocusSheet');
        if(!sheet||sheet.dataset.host!=='builder')return;
         





        const choice=event.target?.closest?.('#forkFocusSheet [data-workout-focus], #forkFocusSheet [data-fork-range-custom]');
        if(choice){
          event.preventDefault();event.stopPropagation();
          forkRepRangePickerRoute(sheet,event,builderFocusPickerAdapter);
          return;
        }
         




        const schemeBtn=event.target?.closest?.('#forkFocusSheet [data-fork-prog-scheme]');
        if(schemeBtn){
          event.preventDefault();event.stopPropagation();
          forkFocusProgSet(builderFocusStage,'scheme',schemeBtn.dataset.forkProgScheme);
          syncBuilderFocusProgControls();
          return;
        }
        const thresholdBtn=event.target?.closest?.('#forkFocusSheet [data-fork-prog-threshold]');
        if(thresholdBtn){
          event.preventDefault();event.stopPropagation();
          const raw=thresholdBtn.dataset.forkProgThreshold;
          forkFocusProgSet(builderFocusStage,'threshold',raw==='completion'?'completion':Number(raw));
          syncBuilderFocusProgControls();
          return;
        }
        if(event.target?.closest?.('#forkFocusProgClear')){
          event.preventDefault();event.stopPropagation();
          builderFocusStage.prog=null;
          syncBuilderFocusProgControls();
          return;
        }
        if(event.target?.closest?.('#forkFocusSave')){
          event.preventDefault();event.stopPropagation();
          commitBuilderFocusStage(sheet);
        }
      },true);
      document.addEventListener('input',event=>{
        const sheet=$('#forkFocusSheet');
        if(!sheet||sheet.dataset.host!=='builder')return;
        if(event.target?.id==='forkFocusMin'||event.target?.id==='forkFocusMax'){
           


          forkRepRangePickerRoute(sheet,event,builderFocusPickerAdapter);
          return;
        }
         

        if(event.target?.id==='forkFocusProgIncValue'||event.target?.id==='forkFocusProgPct'){
          const key=event.target.id==='forkFocusProgIncValue'?'incrementValue':'percentOf1RM';
          const v=event.target.value;
          if(v===''){if(builderFocusStage.prog)delete builderFocusStage.prog[key];}
          else forkFocusProgSet(builderFocusStage,key,Number(v));
          syncBuilderFocusProgControls();
        }
      },true);
      document.addEventListener('change',event=>{
        const sheet=$('#forkFocusSheet');
        if(!sheet||sheet.dataset.host!=='builder')return;
        if(event.target?.id==='forkFocusProgIncType'){
          event.stopPropagation();
          forkFocusProgSet(builderFocusStage,'incrementType',event.target.value);
          syncBuilderFocusProgControls();
        }
      },true);
    }
     
    function wireBuilderAddButtons(host,b){
       






      $('#builderAddExerciseFromToolbar')?.addEventListener('click',()=>openTemplateBuilder(b));
      $('#builderAddExerciseBottom')?.addEventListener('click',()=>openTemplateBuilder(b));
    }
     

    function wireBuilderExerciseInfo(host){
      wireExerciseInfoButtons(host);
    }
     
    function wireBuilderCardToggles(host,findItem){
      host.querySelectorAll('[data-builder-exercise]').forEach(card=>card.addEventListener('toggle',()=>{const item=findItem(card.dataset.builderExercise);if(item){item.cardOpen=card.open;schedulePersist();}}));
    }
     





     


     




    function openBuilderTargetsSheet(uid){
      const b=state.savedBuilder; if(!b)return;
      const item=(b.exercises||[]).find(x=>x.uid===uid); if(!item)return;
      registerForkTargetsHost('builder',{
        resolve:id=>(state.savedBuilder?.exercises||[]).find(x=>x.uid===id)||null,
        afterChange:(changed,msg)=>{schedulePersist();renderSavedBuilder();if(msg&&typeof showToast==='function')showToast(msg);},  
      });
      openForkTargetsSheet(uid,'builder',item,resolveExercise(item.exerciseId)?.name||'Exercise');
    }
     








     







    function wireBuilderExerciseMenus(host){
       







      wireExerciseCardMenus(host,()=>{document.querySelector('#builderReorderExercises')?.click();},openBuilderTargetsSheet);
    }
     
    function wireBuilderDeleteExercise(host,b){
      host.querySelectorAll('[data-builder-del-ex]').forEach(btn=>btn.addEventListener('click',()=>{
         

        if(b.variantEdit&&b.variantEdit.variantUid===btn.dataset.builderDelEx){const ve=b.variantEdit;b.variantEdit=null;const idx=b.exercises.findIndex(x=>x.uid===ve.variantUid);if(idx>=0)b.exercises[idx]=ve.baseItem;else b.exercises.push(ve.baseItem);normalizeSupersets();schedulePersist();renderSavedBuilder();return;}
        b.exercises=b.exercises.filter(x=>x.uid!==btn.dataset.builderDelEx); normalizeSupersets();schedulePersist();renderSavedBuilder();
         

      }));
       
      host.querySelectorAll('[data-builder-swap-ex]').forEach(btn=>btn.addEventListener('click',()=>startExerciseSwap(btn.dataset.builderSwapEx,'template')));
    }
     




    function builderInheritedTarget(item,time){
      const sets=item?.sets||[];
      const last=sets[sets.length-1];
      if(!last)return '';
      const v=time?last.seconds:last.r;
      return v==null?'':String(v);
    }
     
    function wireBuilderAddSet(host,findItem){
      host.querySelectorAll('[data-builder-add-set]').forEach(btn=>btn.addEventListener('click',()=>{
        const item=findItem(btn.dataset.builderAddSet);if(!item)return;
        const ex=resolveExercise(item.exerciseId),time=exerciseTracking(item,ex)==='time';
        const inherited=builderInheritedTarget(item,time);
        const mkSet=side=>{const s=Object.assign(newSet(),time?{seconds:inherited}:{r:inherited});if(side)s.side=side;return s;};
         
        item.sets=singleSideEnabled(item.exerciseId,item)
          ? [...(item.sets||[]),mkSet('L'),mkSet('R')]
          : [...(item.sets||[]),mkSet(null)];
        schedulePersist();renderSavedBuilder();
      }));
    }
     






    function exitBuilderVariantEdit(){
      const b=state.savedBuilder;if(!b||!b.variantEdit)return false;
      const ve=b.variantEdit;b.variantEdit=null;
      const idx=(b.exercises||[]).findIndex(x=>x.uid===ve.variantUid);
      const edited=idx>=0?b.exercises[idx]:null;
      if(edited&&ve.baseItem){ve.baseItem.weekVariants=(ve.baseItem.weekVariants&&typeof ve.baseItem.weekVariants==='object'&&!Array.isArray(ve.baseItem.weekVariants))?ve.baseItem.weekVariants:{};ve.baseItem.weekVariants[String(ve.week)]=edited;}
      if(idx>=0)b.exercises[idx]=ve.baseItem;
      else if(ve.baseItem&&(b.exercises||[]).every(x=>x.uid!==ve.baseUid))b.exercises.push(ve.baseItem);
      return true;
    }
     



    function wireBuilderWeekVariants(host,findItem){
      host.querySelectorAll('[data-builder-variant-add]').forEach(btn=>btn.addEventListener('click',()=>{
        const item=findItem(btn.dataset.builderVariantAdd);if(!item)return;
        const sel=[...host.querySelectorAll('select[data-builder-variant-week]')].find(s=>s.dataset.builderVariantWeek===item.uid);
        const week=Number(sel?.value);
        if(Number.isInteger(week)&&week>=1&&typeof startWeekVariantPick==='function')startWeekVariantPick(item.uid,week);
      }));
      host.querySelectorAll('[data-builder-variant-remove]').forEach(btn=>btn.addEventListener('click',()=>{
        const item=findItem(btn.dataset.builderVariantRemove);if(!item||!item.weekVariants)return;
        delete item.weekVariants[btn.dataset.variantWeek];
        if(!Object.keys(item.weekVariants).length)delete item.weekVariants;
        schedulePersist();renderSavedBuilder();
      }));
       



      host.querySelectorAll('[data-builder-variant-edit]').forEach(btn=>btn.addEventListener('click',()=>{
        const b=state.savedBuilder;if(!b)return;
        exitBuilderVariantEdit();
        const base=(b.exercises||[]).find(x=>x.uid===btn.dataset.builderVariantEdit);if(!base||!base.weekVariants)return;
        const week=String(btn.dataset.variantWeek);
        const variant=base.weekVariants[week];if(!variant)return;
        const idx=b.exercises.indexOf(base);
        b.variantEdit={baseUid:base.uid,week,variantUid:variant.uid,baseItem:base};
        b.exercises[idx]=variant;
        schedulePersist();renderSavedBuilder();
      }));
      host.querySelector('#builderVariantEditDone')?.addEventListener('click',()=>{
        if(exitBuilderVariantEdit()){schedulePersist();renderSavedBuilder();}
      });
    }
     
    function wireBuilderWarmup(host,findItem){
      host.querySelectorAll('[data-builder-warmup]').forEach(btn=>btn.addEventListener('click',()=>{
        const item=findItem(btn.dataset.builderWarmup);if(!item||(item.sets||[]).some(isWarmupSet))return;
        const ex=resolveExercise(item.exerciseId),time=exerciseTracking(item,ex)==='time';
        const rows=warmupLadderRows(0,time?'time':'reps').map(row=>{
          const set=newSet();set.tags=[WARMUP_TAG];
          if(time)set.seconds=row.seconds;else set.r=row.reps;
          return set;
        });
        item.sets=[...rows,...(item.sets||[])];
        schedulePersist();renderSavedBuilder();
      }));
    }
     
    function wireBuilderDeleteSet(host,findItem){
       
      const removeSet=(uid,idx)=>{
        const item=findItem(uid);if(!item)return;
        item.sets=(item.sets||[]).filter((_,i)=>i!==Number(idx));
        schedulePersist();renderSavedBuilder();
         

      };
      host.querySelectorAll('[data-builder-del-set]').forEach(btn=>btn.addEventListener('click',()=>removeSet(btn.dataset.builderUid,btn.dataset.builderDelSet)));
      host.querySelectorAll('.delete-builder-set-swipe').forEach(btn=>btn.addEventListener('click',()=>removeSet(btn.dataset.builderUid,btn.dataset.builderSet)));
    }
     






















    function forkBuilderCopyDownFromSet(item,set,field){
      if(typeof forkCopyDownFromSet!=='function')return [];
      return forkCopyDownFromSet(item,set,field);
    }
     





    function forkSyncBuilderCopyDownGhosts(inputEl,item,updated,field){
      try{
        if(!inputEl||typeof inputEl.closest!=='function'||!updated.length)return;
        const card=inputEl.closest('.workout-exercise');
        if(!card||typeof card.querySelectorAll!=='function')return;
        const weight=field==='w';
        const inputs=[...card.querySelectorAll(weight?'input[data-builder-set-weight]':'input[data-builder-set]')];
        const syncEx=weight?resolveExercise(item.exerciseId):null;
        const syncIsDb=pairImplementExercise(syncEx);
        updated.forEach(later=>{
          const idx=item.sets.indexOf(later);
          const target=inputs.find(el=>el.dataset&&Number(weight?el.dataset.builderSetWeight:el.dataset.builderSet)===idx);
          if(!target)return;
           


          target.placeholder=weight
            ?String(typeof dbDisplayWeight==='function'?dbDisplayWeight(later.prefillHint.w,item.exerciseId,item,syncIsDb):later.prefillHint.w)
            :String(later.prefillHint[field]);
        });
      }catch(_){}
    }
     









    function forkBuilderUnwrapCopyDownGhosts(b){
      (b?.exercises||[]).forEach(item=>{
        (item.sets||[]).forEach(set=>{
          if(!set.prefillHint)return;
          ['r','w','seconds','distance'].forEach(f=>{
            if((set[f]===''||set[f]==null)&&set.prefillHint[f]!==''&&set.prefillHint[f]!=null){
               



              const landed=typeof clampSetTargetValue==='function'?clampSetTargetValue(f,set.prefillHint[f]):String(set.prefillHint[f]);
              if(landed!=='')set[f]=landed;
            }
          });
          delete set.prefillHint;
        });
      });
    }
     
    function wireBuilderSetInputs(host,findItem){
       




      host.querySelectorAll('[data-builder-set]').forEach(input=>{
        input.addEventListener('input',()=>{
          const item=findItem(input.dataset.builderUid);if(!item)return;
          const set=(item.sets||[])[Number(input.dataset.builderSet)];if(!set)return;
          const ex=resolveExercise(item.exerciseId),time=exerciseTracking(item,ex)==='time';
          const v=input.value.trim();
          if(time)set.seconds=v;else set.r=v;
          schedulePersist();
           





          if(v!==''){
            const field=time?'seconds':'r';
            const _cd=forkBuilderCopyDownFromSet(item,set,field);
            if(_cd.length)forkSyncBuilderCopyDownGhosts(input,item,_cd,field);
          }
        });
         







        input.addEventListener('change',()=>{
          const item=findItem(input.dataset.builderUid);if(!item)return;
          const set=(item.sets||[])[Number(input.dataset.builderSet)];if(!set)return;
          const ex=resolveExercise(item.exerciseId),time=exerciseTracking(item,ex)==='time';
          const field=time?'seconds':'r';
          const clamped=clampSetTargetValue(field,set[field]);
          if(clamped!==String(set[field]??'')){set[field]=clamped;schedulePersist();}
          if(input.value!==clamped)input.value=clamped;
           





          if(clamped!==''){
            const _cd=forkBuilderCopyDownFromSet(item,set,field);
            if(_cd.length)forkSyncBuilderCopyDownGhosts(input,item,_cd,field);
          }
        });
      });
       







      host.querySelectorAll('[data-builder-set-pct]').forEach(input=>{
        input.addEventListener('input',()=>{
          const item=findItem(input.dataset.builderUid);if(!item)return;
          const set=(item.sets||[])[Number(input.dataset.builderSetPct)];if(!set)return;
          const v=input.value.trim();
          if(v==='')delete set.pct;else set.pct=v;
          schedulePersist();
        });
        input.addEventListener('change',()=>{
          const item=findItem(input.dataset.builderUid);if(!item)return;
          const set=(item.sets||[])[Number(input.dataset.builderSetPct)];if(!set)return;
          const valid=(typeof pctValueOrNull==='function')?pctValueOrNull(input.value):null;
          if(valid==null){delete set.pct;input.value='';}
          else{set.pct=valid;input.value=String(valid);}
          schedulePersist();
        });
      });
       













      host.querySelectorAll('[data-builder-set-weight]').forEach(input=>{
        input.addEventListener('input',()=>{
          const item=findItem(input.dataset.builderUid);if(!item)return;
          const set=(item.sets||[])[Number(input.dataset.builderSetWeight)];if(!set)return;
          const ex=resolveExercise(item.exerciseId);
          const v=input.value.trim();
          set.w=v===''?'' : dbStorageWeight(v,item.exerciseId,item,pairImplementExercise(ex));
          schedulePersist();
          if(v!==''){
            const _cd=forkBuilderCopyDownFromSet(item,set,'w');
            if(_cd.length)forkSyncBuilderCopyDownGhosts(input,item,_cd,'w');
          }
        });
        input.addEventListener('change',()=>{
          const item=findItem(input.dataset.builderUid);if(!item)return;
          const set=(item.sets||[])[Number(input.dataset.builderSetWeight)];if(!set)return;
          const ex=resolveExercise(item.exerciseId);
          const n=Number(set.w);
          if(set.w===''||set.w==null||!Number.isFinite(n)||n<0){set.w='';input.value='';schedulePersist();return;}
          input.value=String(dbDisplayWeight(set.w,item.exerciseId,item,pairImplementExercise(ex)));
           


          const _cd=forkBuilderCopyDownFromSet(item,set,'w');
          if(_cd.length)forkSyncBuilderCopyDownGhosts(input,item,_cd,'w');
        });
      });
    }
     
    function wireBuilderTracking(host,findItem){
      host.querySelectorAll('[data-builder-tracking]').forEach(btn=>btn.addEventListener('click',()=>{
        const item=findItem(btn.dataset.builderUid);if(!item)return;
         


        if(!setExerciseTracking(item, btn.dataset.builderTracking))return;
        schedulePersist();renderSavedBuilder();
      }));
    }
     


     

    function wireBuilderAddNote(host,findItem){
      wireAddNoteButtons(host,'data-builder-add-note','builderNote',findItem,()=>schedulePersist(),item=>{item.note=item.note||'';schedulePersist();});
    }
     

    function wireBuilderNoteInputs(host,findItem){
      wireExerciseNoteInputs(host,'data-builder-note',findItem,()=>schedulePersist());
    }
     


     
    function wireBuilderSuperset(host){
       

      host.querySelectorAll('[data-builder-superset]').forEach(btn=>btn.addEventListener('click',openReorderDialog));
    }
     

    function wireBuilderExerciseTags(host){
      wireExerciseTagButtons(host,'data-builder-exercise-tags','builder');
    }
     

    function wireBuilderSetTags(host){
      host.querySelectorAll('[data-builder-tag-set]').forEach(btn=>btn.addEventListener('click',()=>openTagDialog(btn.dataset.builderTagExercise,btn.dataset.builderTagSet,'builder')));
    }
     
    function wireBuilderReorder(host,b){
      const reorderBtn=$('#builderReorderExercises');
      if(reorderBtn){reorderBtn.style.display=b.exercises.length>=2?'':'none';reorderBtn.addEventListener('click',openReorderDialog);}
    }
     
    function wireBuilderFooter(b){
      $('#discardBuilderBtn')?.addEventListener('click',()=>{discardingBuilder=true;syncDiscardDraftDialog(true);showModalPinned($('#discardDraftDialog'));});
      $('#saveBuilderBtn')?.addEventListener('click',saveBuilderWorkout);
    }
     


    function builderCssEscape(value){
      if(typeof CSS!=='undefined'&&CSS&&typeof CSS.escape==='function')return CSS.escape(String(value));
      return String(value).replace(/\\/g,'\\\\').replace(/"/g,'\\"');
    }
     









    function builderFocusSelector(el){
      if(!el||!el.tagName)return null;
      if(el.id)return '#'+builderCssEscape(el.id);
      const attrs=[];
      const raw=el.attributes?Array.from(el.attributes):[];
      raw.forEach(a=>{if(a&&a.name&&a.name.startsWith('data-'))attrs.push(a);});
      if(attrs.length)return el.tagName.toLowerCase()+attrs.map(a=>`[${a.name}="${builderCssEscape(a.value)}"]`).join('');
      if(el.tagName==='SUMMARY'&&typeof el.closest==='function'){
        const card=el.closest('[data-builder-exercise]');
        if(card)return `[data-builder-exercise="${builderCssEscape(card.dataset.builderExercise)}"] > summary`;
      }
      return null;
    }
     



    function captureBuilderFocus(host){
      const el=(typeof document!=='undefined')?document.activeElement:null;
      if(!el||!host||typeof host.contains!=='function'||!host.contains(el))return null;
      const selector=builderFocusSelector(el);
      if(!selector)return null;
      let selectionStart=null,selectionEnd=null;
      try{
        if(typeof el.selectionStart==='number'){selectionStart=el.selectionStart;selectionEnd=el.selectionEnd;}
      }catch(_){ }
      return {selector,selectionStart,selectionEnd};
    }
     


    function restoreBuilderFocus(host,captured){
      if(!host||!captured||!captured.selector||typeof host.querySelector!=='function')return false;
      let el=null;
      try{el=host.querySelector(captured.selector);}catch(_){return false;}
      if(!el||typeof el.focus!=='function')return false;
      el.focus({preventScroll:true});
      if(captured.selectionStart!=null&&typeof el.setSelectionRange==='function'){
        try{el.setSelectionRange(captured.selectionStart,captured.selectionEnd==null?captured.selectionStart:captured.selectionEnd);}catch(_){ }
      }
      return true;
    }
     
    function renderSavedBuilder(){
      const host=$('#savedBuilderBody');if(!host)return;
      const b=state.savedBuilder;
      if(!b){host.innerHTML='';return;}
       


      const scrollY=window.scrollY;
       



      const focusCapture=captureBuilderFocus(host);
      host.innerHTML=savedBuilderPageHtml(b);
      if(scrollY)window.scrollTo(0,scrollY);
      const findItem=uid=>b.exercises.find(x=>x.uid===uid);
      wireBuilderName(b);
      wireBuilderFocusRow(host,b);
      wireBuilderAddButtons(host,b);
      wireBuilderExerciseInfo(host);
      wireBuilderExerciseMenus(host);
      wireBuilderCardToggles(host,findItem);
      wireBuilderDeleteExercise(host,b);
      wireBuilderAddSet(host,findItem);
      wireBuilderWeekVariants(host,findItem);
      wireBuilderWarmup(host,findItem);
      wireBuilderDeleteSet(host,findItem);
      wireBuilderSetInputs(host,findItem);
      wireBuilderTracking(host,findItem);
      wireBuilderAddNote(host,findItem);
      wireBuilderNoteInputs(host,findItem);
       
      wireOnermOptionInputs(host, findItem, () => { schedulePersist(); renderSavedBuilder(); });
       
      wireRepsOnlyToggle(host, findItem, () => { schedulePersist(); renderSavedBuilder(); });
       

       

      wireExerciseThresholdPills(host, findItem, () => { schedulePersist(); renderSavedBuilder(); });
       
      wireDbEntryToggle(host, findItem, () => { schedulePersist(); renderSavedBuilder(); });
       
      wireDbSingleToggle(host, findItem, () => { schedulePersist(); renderSavedBuilder(); });
       
      wireSingleSideToggle(host, findItem, () => { schedulePersist(); renderSavedBuilder(); });
      wireBuilderSuperset(host);
      wireBuilderExerciseTags(host);
      wireBuilderSetTags(host);
      wireBuilderReorder(host,b);
      wireBuilderFooter(b);
      attachSwipeDelete(host);  
      syncBuilderFocusPills();
       

      restoreBuilderFocus(host,focusCapture);
    }
     












    function applyBuilderFocus(key){
      const b=state.savedBuilder;if(!b)return {applied:0,skipped:0};
       

      if((key||'')===(b.focusKey||'')){b.focusKey=null;schedulePersist();renderSavedBuilder();return {applied:0,skipped:0};}
      b.focusKey=key||null;
      b.focusCustom=null;  
      const preset=REP_PRESETS[key];
      let applied=0,skipped=0;
      if(preset){
        b.exercises.forEach(item=>{
          const ex=resolveExercise(item.exerciseId);
          if(exerciseTracking(item,ex)==='time')return;
          if(builderRangeIsOwnRange(item)){skipped++;return;}
          item.progression={...(item.progression||{}),preset:key,min:preset.min,max:preset.max,openTop:!!preset.openTop,amrap:!!preset.amrap,custom:true,rangeSource:null};
          applied++;
        });
         



      }
      schedulePersist();renderSavedBuilder();
      return {applied,skipped};
    }
     






    function applyBuilderCustomRange(min,max){
      const b=state.savedBuilder;if(!b)return {applied:0,skipped:0};
       



      const blankMax=max==null||String(max).trim()==='';
      const lo=Math.round(Number(min));
      let hi=blankMax?lo:Math.round(Number(max));
      if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo<1||hi<lo){showToast('Custom range needs a minimum of 1 and a maximum at or above it.','error');return {applied:0,skipped:0};}
      if(blankMax)hi=null;
      b.focusCustom={min:lo,max:hi};
      b.focusKey=null;  
      let applied=0,skipped=0;
      b.exercises.forEach(item=>{
        const ex=resolveExercise(item.exerciseId);
        if(exerciseTracking(item,ex)==='time')return;
        if(builderRangeIsOwnRange(item)){skipped++;return;}
        item.progression={...(item.progression||{}),preset:'custom',min:lo,max:hi,openTop:false,amrap:false,custom:true,rangeSource:'workoutCustom'};
        applied++;
      });
       



      schedulePersist();renderSavedBuilder();
      return {applied,skipped};
    }
     
    function syncBuilderFocusPills(){
      const key=state.savedBuilder?.focusKey||'';
      document.querySelectorAll('[data-builder-focus]').forEach(button=>button.setAttribute('aria-pressed',String((button.dataset.builderFocus||'')===key)));
    }
     





    function builderRangePresetKey(item){
      const p=item?.progression||{};
      const found=Object.entries(REP_PRESETS).find(([,v])=>
        Number(p.min)===v.min&&(v.max==null?p.max==null:Number(p.max)===v.max)&&!!p.openTop===!!v.openTop&&!!p.amrap===!!v.amrap);
      return found?found[0]:'';
    }
     







    function builderExerciseHasCustomRange(item){
       


      if(typeof exerciseHasOwnRange==='function')return exerciseHasOwnRange(item);
      const p=item?.progression||{};
      if(!p.custom)return false;
      const stamped=p.preset;
      if(stamped&&REP_PRESETS[stamped]&&builderRangePresetKey(item)===stamped)return false;
      return true;
    }
     








    function applyBuilderRangePreset(item,key){
      const p={...(item.progression||{}),custom:true};
      const preset=REP_PRESETS[key];
      if(preset&&key!==builderRangePresetKey(item)){
        p.preset=key;p.min=preset.min;p.max=preset.max;p.openTop=!!preset.openTop;p.amrap=!!preset.amrap;
      }else{
         



        p.preset=null;p.min=null;p.max=null;p.openTop=false;p.amrap=false;
      }
      item.progression=p;
      return p;
    }
     









     












     
    function saveBuilderWorkout(){
      const b=state.savedBuilder;if(!b)return;
       


      exitBuilderVariantEdit();
      if(!b.exercises.length){showToast('Add at least one exercise first.','error');return;}
       


      forkBuilderUnwrapCopyDownGhosts(b);
       


      const programWorkout=b.editTarget?.kind==='program'?workoutState.activeProgram?.workouts.find(w=>w.uid===b.editTarget.uid):null;
       

       


      const name=clampNameLength((b.name||'').trim())||(programWorkout?programWorkout.name:'New saved workout');
       

      const counts={};
      b.exercises.forEach(item=>{if(item.supersetId)counts[item.supersetId]=(counts[item.supersetId]||0)+1;});
      const template={
        id:b.id||newTemplateId(),
        name,
        focusKey:b.focusKey||null,
         



        focusCustom:b.focusCustom?{min:+b.focusCustom.min,max:b.focusCustom.max==null?null:+b.focusCustom.max}:null,
         




        progression:b.progression?(typeof forkSanitizeWorkoutProgression==='function'?forkSanitizeWorkoutProgression(b.progression):{...b.progression}):null,
        createdAt:b.createdAt||Date.now(),
        exercises:b.exercises.map(item=>cloneExerciseItem(item,'forSaveTemplate',{
          noteOpen:!!item.note,
           

          supersetId:item.supersetId&&counts[item.supersetId]>1?item.supersetId:null,
          progression:{...(item.progression||{})}
        }))
      };
      const idx=workoutState.templates.findIndex(t=>t.id===template.id);
      if(programWorkout){
        programWorkout.name=name;
        programWorkout.template={name,focusKey:template.focusKey,focusCustom:template.focusCustom,progression:template.progression,exercises:template.exercises};
         



        if(typeof touchProgram==='function'&&workoutState.activeProgram)touchProgram(workoutState.activeProgram);
        state.savedBuilder=null;state.builderOpen=false;state.builderReturn=null;
        schedulePersist();
         

        state.programWorkoutUid=programWorkout.uid;
        showProgram(false);
        window.scrollTo({top:0});
        return;
      }
      if(idx>=0)workoutState.templates[idx]=template;else workoutState.templates.unshift(template);
      state.savedBuilder=null;state.builderOpen=false;state.builderReturn=null;
      schedulePersist();
       

       

      try{if(typeof Sync!=='undefined'&&Sync&&typeof Sync.maybeShowSigninNudge==='function')Sync.maybeShowSigninNudge({keepWorkout:false});}catch(_){}
      openSavedWorkoutEditor(template.id);
    }
     
    function renderBuilderContinue(){
      const wrap=$('#builderContinueWrap');if(!wrap)return;
      const b=state.savedBuilder;
       




      const stash=state.savedBuilderStash&&typeof state.savedBuilderStash==='object'&&!Array.isArray(state.savedBuilderStash)?state.savedBuilderStash:{};
       




      const parkedKeys=builderParkedDraftKeys();
      if(state.builderOpen||(!b&&!parkedKeys.length)){wrap.hidden=true;wrap.innerHTML='';return;}
      wrap.hidden=false;
      const cardHtml=(draft,key)=>{
        const n=(draft.exercises||[]).length;
         

        const programShell=draft.editTarget?.kind==='program'?workoutState.activeProgram?.workouts.find(w=>w.uid===draft.editTarget.uid):null;
        const draftName=(draft.name||'').trim()||programShell?.name||'New saved workout';
         









        return `<button class="continue-workout-card is-draft" ${key?`data-builder-draft-key="${escapeHtml(key)}"`:'id="continueBuilderCard"'} type="button"><span><span class="continue-kicker">Draft</span><strong>${escapeHtml(draftName)}</strong><small class="row-meta">${n} exercise${n===1?'':'s'} added</small></span></button>`;
      };
      wrap.innerHTML=(b?cardHtml(b,null):'')+parkedKeys.map(k=>cardHtml(stash[k],k)).join('');
      $('#continueBuilderCard')?.addEventListener('click',()=>{state.builderOpen=true;renderWorkoutScreen();window.scrollTo({top:0});});
      wrap.querySelectorAll('[data-builder-draft-key]').forEach(btn=>btn.addEventListener('click',()=>openStashedBuilderDraft(btn.getAttribute('data-builder-draft-key'))));
    }
     
    function refreshTemplateViews(){
      renderWorkoutTemplateList();
      if(state.savedWorkoutId)renderSavedWorkoutEditor();
    }
     
    let pendingDeleteTemplateId=null;
     

    let discardingBuilder=false;
     


    function savedDeleteReturnsToList(deletedId,openEditorId){
      return !!deletedId&&deletedId===openEditorId;
    }
    $('#cancelDeleteTemplate')?.addEventListener('click',()=>$('#deleteTemplateDialog').close());
    $('#keepTemplate')?.addEventListener('click',()=>$('#deleteTemplateDialog').close());
    $('#confirmDeleteTemplate')?.addEventListener('click',()=>{
      $('#deleteTemplateDialog').close();
      if(pendingDeleteTemplateId){
         

        if(typeof noteTombstone==='function')noteTombstone('templates',pendingDeleteTemplateId);
        workoutState.templates=workoutState.templates.filter(x=>x.id!==pendingDeleteTemplateId);
         
        const backToList=savedDeleteReturnsToList(pendingDeleteTemplateId,state.savedWorkoutId);
        if(state.savedWorkoutId===pendingDeleteTemplateId)state.savedWorkoutId=null;
         



        schedulePersist();
         


        const _scrollY=window.scrollY;
         
        renderWorkoutScreen();
        if(backToList){
           

          const sec=$('#savedWorkoutList')?.closest('section');
          if(sec)sec.scrollIntoView({block:'start'});
        }else{
          requestAnimationFrame(()=>{const max=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);window.scrollTo(0,clamp(_scrollY,0,max));});
        }
      }
      pendingDeleteTemplateId=null;
    });
//# sourceMappingURL=saved-workouts.js.map
