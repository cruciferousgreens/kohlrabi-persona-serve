
 
     


     
     


    const pickerFilters={muscles:new Set(),equipment:'',onlyFavorites:false,onlyCustom:false};
     
    function resetPickerFilters(){pickerFilters.muscles.clear();pickerFilters.equipment='';pickerFilters.onlyFavorites=false;pickerFilters.onlyCustom=false;}
     
    function pickerFilterMatch(x){
       
      if(exerciseDeleted(x))return false;
       
      if(x.aliasOf)return false;
      const allMuscles=[...(x.primary||[]),...(x.secondary||[])];
      const muscleMatch=!pickerFilters.muscles.size||[...pickerFilters.muscles].every(m=>allMuscles.includes(m));
      const favMatch=!pickerFilters.onlyFavorites||state.favorites.has(x.id);
      const customMatch=!pickerFilters.onlyCustom||x.custom;
      return muscleMatch&&favMatch&&customMatch&&(!pickerFilters.equipment||x.equipment===pickerFilters.equipment);
    }
     
    function pickerFilterActive(){return pickerFilters.muscles.size>0||!!pickerFilters.equipment||pickerFilters.onlyFavorites||pickerFilters.onlyCustom;}
     


    let pickerSessionAdded=new Set();
     



    let pickerStaged=new Set();
     
    function resetPickerSession(){pickerSessionAdded=new Set();pickerStaged=new Set();workoutState.pickerSwapUid=null;workoutState.pickerVariantTarget=null;}
     




    function strengthLikeMinSets(profile){
      if(!profile||profile.mode==='time')return 1;
      if(profile.amrap||profile.openTop)return 1;
      const max=Number(profile.max);
      if(!Number.isFinite(max))return 1;
      return max<=5?2:1;
    }
     





     

    function pickerRuleRangeValue(raw){
      const v=String(raw==null?'':raw).trim();
      if(v==='')return null;
      const n=sanitizeSetValue('r',v);
      return n==null?1:Math.max(1,n);
    }
     
    function pickerRuleSecondsValue(raw){
      const n=sanitizeSetValue('seconds',raw);
      return Math.max(1,n==null?1:n);
    }
     

    function pickerRuleIncrementValue(raw,fallback){
      const n=sanitizeSetValue('w',raw);
      return n==null?(fallback==null?5:fallback):n;
    }
     



    function exercisePickerCloseScrollY(){return workoutState.pickerScrollY||0;}
     









    let pickerLockY=null;
     
    function lockPickerBackground(){
      if(pickerLockY!==null)return;
      pickerLockY=window.scrollY||0;
      workoutState.pickerScrollY=pickerLockY;
      const body=document.body;
      body.style.position='fixed';
      body.style.top=`-${pickerLockY}px`;
      body.style.left='0';
      body.style.right='0';
      body.style.width='100%';
      body.style.overscrollBehavior='none';
    }
     
    function unlockPickerBackground(){
      if(pickerLockY===null)return;
      const y=pickerLockY;pickerLockY=null;
      const body=document.body;
      body.style.position='';body.style.top='';body.style.left='';
      body.style.right='';body.style.width='';body.style.overscrollBehavior='';
      window.scrollTo(0,y);
    }
     
    function populatePickerFilters(){
      const muscles=allMuscleOptions();
      const equipment=[...new Set(exercises.map(x=>x.equipment).filter(Boolean))].sort();
      $('#pickerMuscleOptions').innerHTML=muscles.map(x=>`<button class="muscle-option" type="button" data-picker-muscle="${x}" aria-pressed="false"><span class="muscle-option-label" data-label="${titleCase(x)}">${titleCase(x)}</span></button>`).join('');
      $('#pickerEquipmentFilter').innerHTML='<option value="">All equipment</option>'+equipment.map(x=>`<option value="${x}">${titleCase(x)}</option>`).join('');
      renderPickerFilterState();
    }
     
    function renderPickerFilterState(){
      document.querySelectorAll('#pickerMuscleOptions .muscle-option').forEach(b=>b.setAttribute('aria-pressed',String(pickerFilters.muscles.has(b.dataset.pickerMuscle))));
      $('#pickerFavoritesToggle')?.setAttribute('aria-pressed',String(pickerFilters.onlyFavorites));
      $('#pickerCustomToggle')?.setAttribute('aria-pressed',String(pickerFilters.onlyCustom));
      $('#pickerEquipmentFilter').value=pickerFilters.equipment;
       





      $('#pickerClearAllFilters').hidden=!pickerFilterActive();
    }
     
    function preparePickerFilters(){
      resetPickerFilters();
      populatePickerFilters();
      const panel=$('#pickerFilterPanel');panel.classList.remove('open');
      $('#pickerFilterToggle').setAttribute('aria-expanded','false');
    }
     











    function cloneTemplateExercises(rows){return (rows||[]).map(item=>{
      const copy=cloneExerciseItem(item,'fromTemplate',{trackingFallback:null,emptyDefault:true});
      const unwrapGhosts=holder=>{
        (holder.sets||[]).forEach(set=>{
          if(!set.prefillHint)return;
          if(set.prefillHint.r!=='')set.r=set.prefillHint.r;
          if(set.prefillHint.w!=='')set.w=set.prefillHint.w;
          if(set.prefillHint.seconds!=='')set.seconds=set.prefillHint.seconds;
          if(set.prefillHint.distance!=='')set.distance=set.prefillHint.distance;
          delete set.prefillHint;
          delete set.warmupHint;
        });
      };
      unwrapGhosts(copy);
       




      if(copy.weekVariants)Object.values(copy.weekVariants).forEach(unwrapGhosts);
      return copy;
    });}
     

    function pickerTemplate(){
       

      if(state.savedBuilder&&workoutState.templateEditTarget===state.savedBuilder.id)return state.savedBuilder;
      return workoutState.templates.find(row=>row.id===workoutState.templateEditTarget)||null;
    }
     
    function openTemplateBuilder(template){
      workoutState.pickerMode='template';workoutState.templateEditTarget=template.id;
      $('#exercisePickerTitle').textContent=`Edit ${template.name||'New saved workout'}`;
      $('#exercisePickerSearch').value='';preparePickerFilters();resetPickerSession();renderExercisePicker();lockPickerBackground();$('#exercisePickerDialog').showModal();
      requestAnimationFrame(()=>$('#exercisePickerSearch').focus());
    }
     
    function pickerCollection(){const mode=workoutState.pickerMode;if(mode==='template')return pickerTemplate()?.exercises||[];return workoutState.draft?.exercises||[];}
     




    function startExerciseSwap(uid,mode){
      workoutState.pickerMode=mode;
      if(mode==='template'&&state.savedBuilder)workoutState.templateEditTarget=state.savedBuilder.id;
      const item=pickerCollection().find(x=>x.uid===uid);if(!item)return;
      $('#exercisePickerTitle').textContent='Swap exercise';
      $('#exercisePickerSearch').value='';preparePickerFilters();resetPickerSession();
      workoutState.pickerSwapUid=uid;
      renderExercisePicker();lockPickerBackground();$('#exercisePickerDialog').showModal();
      requestAnimationFrame(()=>$('#exercisePickerSearch').focus());
    }
     






    function forkSwapScopeText(mode,editKind){
      if(mode==='template'){
        return editKind==='program'
          ? 'Tap an exercise to swap it in. This changes the program, so future sessions use the new exercise.'
          : 'Tap an exercise to swap it in. This changes the saved workout.';
      }
      return "Tap an exercise to swap it in. Today's workout only; the saved workout and program keep the original.";
    }
     


    function swapCarryoverReset(item){item.note='';item.noteOpen=false;item.exerciseTags=[];return item;}
     







    function retargetExerciseItem(item,newExerciseId,templateMode){
      const ex=resolveExercise(newExerciseId);
      if(!item||!ex)return false;
      const range=templateMode?builderPickerDefaultRange():forkLiveDraftFocusRange();  
      item.exerciseId=newExerciseId;
      swapCarryoverReset(item);
       


      item.tracking=ex.tracking||'reps';
       

      item.metrics=(typeof exerciseMetrics==='function')?exerciseMetrics(ex):item.metrics;
      item.progression=Object.assign(defaultExerciseProgression({mode:ex.tracking||'reps',min:range.min,max:range.max,openTop:range.openTop,amrap:range.amrap,custom:range.custom}),range.preset?{preset:range.preset}:null);
      item.suggestedTarget=null;
       




      if(typeof singleSideEnabled==='function'&&singleSideEnabled(newExerciseId,item)
        &&(item.sets||[]).some(s=>s&&!setSide(s)&&!isWarmupSet(s)))applySingleSideToSets(item,true);
      return true;
    }
     

    function performExerciseSwap(newExerciseId){
      const uid=workoutState.pickerSwapUid;workoutState.pickerSwapUid=null;
      const templateMode=workoutState.pickerMode==='template';
      const item=pickerCollection().find(x=>x.uid===uid);
      const ex=resolveExercise(newExerciseId);
      let swapped=false;
      if(item&&ex&&item.exerciseId!==newExerciseId){
        retargetExerciseItem(item,newExerciseId,templateMode);
        if(templateMode)schedulePersist();
        else{
          prepareDraftProgression(workoutState.draft, workoutState.activeProgram?.id===workoutState.draft.programId?workoutState.activeProgram.progression:freeformProgressionConfig());
          markDraftSaved();
        }
        swapped=true;
      }
      $('#exercisePickerDialog').close();
      if(templateMode){renderPickerRules();
         




        if(typeof refreshTemplateViews==='function')refreshTemplateViews();
        if(state.savedBuilder&&typeof renderSavedBuilder==='function')renderSavedBuilder();}
      else{renderWorkoutExercises();renderWorkoutProgression();}
       



    }
     






    function startWeekVariantPick(uid,week){
      workoutState.pickerMode='template';
      if(state.savedBuilder)workoutState.templateEditTarget=state.savedBuilder.id;
      const item=pickerCollection().find(x=>x.uid===uid);if(!item)return;
      $('#exercisePickerTitle').textContent=`Week ${week} variant`;
      $('#exercisePickerSearch').value='';preparePickerFilters();resetPickerSession();
      workoutState.pickerVariantTarget={uid,week:String(week)};
      renderExercisePicker();lockPickerBackground();$('#exercisePickerDialog').showModal();
      requestAnimationFrame(()=>$('#exercisePickerSearch').focus());
    }
     










    function performWeekVariantPick(newExerciseId){
      const target=workoutState.pickerVariantTarget;workoutState.pickerVariantTarget=null;
      const item=target?pickerCollection().find(x=>x.uid===target.uid):null;
      let picked=false;
      if(item){
        const variant=cloneExerciseItem(item,'forTemplate',{emptyDefault:true});
        delete variant.weekVariants;  
        if(newExerciseId===item.exerciseId||retargetExerciseItem(variant,newExerciseId,true)){
          if(!item.weekVariants||typeof item.weekVariants!=='object'||Array.isArray(item.weekVariants))item.weekVariants={};
          item.weekVariants[String(target.week)]=variant;
          picked=true;
        }
      }
      $('#exercisePickerDialog').close();
      if(picked)schedulePersist();
       


      if(typeof refreshTemplateViews==='function')refreshTemplateViews();
      if(state.savedBuilder&&typeof renderSavedBuilder==='function')renderSavedBuilder();
    }
     


     




    function focusPresetRange(focusKey){
      const preset=focusKey?REP_PRESETS[focusKey]:null;
      if(!preset)return null;
      return {preset:focusKey,min:preset.min,max:preset.max,openTop:!!preset.openTop,amrap:!!preset.amrap,custom:true};
    }
     

    function builderPickerDefaultRange(){
      const b=state.savedBuilder;
      if(b?.editTarget?.kind==='program'&&workoutState.activeProgram){
         





        const pw=(workoutState.activeProgram.workouts||[]).find(w=>w.uid===b.editTarget.uid);
        if(pw&&typeof programWorkoutFocusRange==='function')return programWorkoutFocusRange(workoutState.activeProgram,pw,programWeek(workoutState.activeProgram));
        return programRangeForWeek(workoutState.activeProgram,programWeek(workoutState.activeProgram));
      }
       




       

       
      if(b?.focusCustom)return {preset:'custom',min:+b.focusCustom.min,max:b.focusCustom.max==null?null:+b.focusCustom.max,openTop:false,amrap:false,custom:true,rangeSource:'workoutCustom'};
      return focusPresetRange(b?.focusKey||'')||progressionSetup.defaultRange;
    }
     




















    function renderPickerRules() {
      const box=$('#pickerTemplateOptions');
      if(box){box.hidden=true;box.innerHTML='';}
    }
    
    
    
     


    function pickerCustomBadge(ex){return ex&&ex.custom?'<span class="picker-custom-label">Custom</span>':'';}  
     








    function pickerSingleSideBadge(ex){
      if(!ex||typeof singleSideEnabled!=='function')return '';
      return singleSideEnabled(ex.id,null)?'<span class="tag side">Single side</span>':'';
    }
    function pickerSingleSideMeta(ex){
      return pickerSingleSideBadge(ex)?', L/R rounds':'';
    }
     
    function renderPickerList() {
       

      $('#clearPickerSearch')?.classList.toggle('visible', !!$('#exercisePickerSearch').value);
      const list=$('#exercisePickerList'),prevScroll=list?list.scrollTop:0;      const templateMode=workoutState.pickerMode==='template',editTemplate=pickerTemplate();
      const q=normalize($('#exercisePickerSearch').value);
      const collection=pickerCollection();
       

      const canonId=(id)=>(typeof canonicalExerciseId==='function')?canonicalExerciseId(id):id;
      const chosen=new Set(collection.map(item=>canonId(item.exerciseId)));
       
      const swapMode=!!workoutState.pickerSwapUid;
      const swapFromId=swapMode?canonId((collection.find(x=>x.uid===workoutState.pickerSwapUid)||{}).exerciseId||null):null;
      const matches = q ? rankedExerciseMatches($('#exercisePickerSearch').value,exercises.length).filter(pickerFilterMatch).slice(0,80) : exercises.filter(pickerFilterMatch).slice(0,80);
       







      const swapFromEx = swapMode ? resolveExercise(swapFromId) : null;
      let similarRows = [];
      if (swapMode && !q && swapFromEx && typeof similarity==='function') {
         

        similarRows = exercises.filter(pickerFilterMatch).filter(ex=>ex.id!==swapFromId)
          .map(ex=>({ex,score:similarity(swapFromEx,ex)}))
          .filter(r=>r.score>0)
          .sort((a,b)=>b.score-a.score||a.ex.name.localeCompare(b.ex.name))
          .slice(0,8).map(r=>r.ex);
      }
      const similarSet = new Set(similarRows.map(ex=>ex.id));
       




      const favRows = (q||swapMode) ? [] : matches.filter(ex => state.favorites.has(ex.id));
      const favSet = new Set(favRows.map(ex => ex.id));
      const recentIds = (q||pickerFilterActive()) ? [] : recentExerciseIds().filter(id => !favSet.has(id) && !similarSet.has(id) && matches.some(ex => ex.id === id)).slice(0,5);
      const recentSet = new Set(recentIds);
      const rows = [...similarRows, ...favRows, ...recentIds.map(id => matches.find(ex => ex.id === id)), ...matches.filter(ex => !similarSet.has(ex.id) && !favSet.has(ex.id) && !recentSet.has(ex.id))].filter(Boolean);
      const clockIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
       



      const starIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>';
      const sectionBreaks = [];
      if (similarRows.length) sectionBreaks.push([0, '<span>SIMILAR – SAME MUSCLES FIRST</span>']);  
      if (favRows.length) sectionBreaks.push([similarRows.length, '<span>FAVORITES</span>']);  
      if (recentIds.length) sectionBreaks.push([similarRows.length+favRows.length, '<span>RECENT</span>']);
      if ((similarRows.length||favRows.length||recentIds.length) && rows.length > similarRows.length+favRows.length+recentIds.length) sectionBreaks.push([similarRows.length+favRows.length+recentIds.length, '<span>ALL EXERCISES</span>']);
      list.innerHTML = rows.length ? rows.map((ex,index) => {const brk = sectionBreaks.find(([at]) => at === index);
         


        const selected=swapMode?ex.id===swapFromId:(templateMode?chosen.has(ex.id):(chosen.has(ex.id)||pickerStaged.has(ex.id)));
        return `${brk ? `<div class="picker-section-label">${brk[1]}</div>` : ''}<button class="picker-item" type="button" data-id="${escapeHtml(ex.id)}" aria-pressed="${String(selected)}"><span><strong>${escapeHtml(ex.name)}</strong><span class="picker-sub">${pickerCustomBadge(ex)}${pickerSingleSideBadge(ex)}<span class="picker-meta">${escapeHtml(ex.primary.join(', ') || 'Unspecified muscle')} (${escapeHtml(equipmentLabel(ex))}${pickerSingleSideMeta(ex)})</span></span></span><span class="picker-state">${swapMode?(ex.id===swapFromId?'✓':'→'):(selected ? '✓' : '+')}</span></button>`;}).join('') : '<div class="dialog-empty">No matching exercises.</div>';
       




      const createCustomBtn=$('#pickerCreateCustom');
      if(createCustomBtn)createCustomBtn.hidden=!(q&&rows.length===0);
      if(list)list.scrollTop=prevScroll;
      updatePickerHint();
      document.querySelectorAll('#exercisePickerList .picker-item').forEach(button => button.addEventListener('click', () => {
         
        if(workoutState.pickerVariantTarget){performWeekVariantPick(button.dataset.id);return;}
         
        if(workoutState.pickerSwapUid){performExerciseSwap(button.dataset.id);return;}
        let nowChosen;
        if(templateMode){
           
          if(!editTemplate)return;
          const existing=editTemplate.exercises.find(item=>item.exerciseId===button.dataset.id);
          nowChosen=!existing;
          if(existing){editTemplate.exercises=editTemplate.exercises.filter(item=>item.exerciseId!==button.dataset.id);pickerSessionAdded.delete(button.dataset.id);}
          else{const ex=resolveExercise(button.dataset.id),range=builderPickerDefaultRange();const progression=Object.assign(defaultExerciseProgression({mode:ex?.tracking||'reps',min:range.min,max:range.max,openTop:range.openTop,amrap:range.amrap,custom:range.custom}),range.preset?{preset:range.preset}:null); const newItem=newExerciseItem({exerciseId:button.dataset.id,tracking:ex?.tracking||'reps',progression,sets:Array.from({length:defaultSetCount()},()=>newSet())}); if(typeof singleSideEnabled==='function'&&singleSideEnabled(button.dataset.id,newItem))applySingleSideToSets(newItem,true); 
          editTemplate.exercises.push(newItem);
          pickerSessionAdded.add(button.dataset.id);}
          schedulePersist();
        }else{
           





           




          const id=button.dataset.id;
          const existing=workoutState.draft.exercises.find(item=>item.exerciseId===id);
          if(existing){
            pickerStaged.delete(id);
            nowChosen=true;
          }else if(pickerStaged.has(id)){pickerStaged.delete(id);nowChosen=false;}
          else{pickerStaged.add(id);nowChosen=true;}
        }
        
        
        
        button.setAttribute('aria-pressed',String(nowChosen));
        const stateEl=button.querySelector('.picker-state');if(stateEl)stateEl.textContent=nowChosen?'✓':'+';
        updatePickerHint();
         








        const list=$('#exercisePickerList');
        const anchorTop=list?button.getBoundingClientRect().top:0;
        renderPickerRules();
        if(list){list.scrollTop+=button.getBoundingClientRect().top-anchorTop;}
      }));
    }
     
    function renderExercisePicker(){renderPickerRules();renderPickerList();}
     




    function commitCreatedCustomExercise(id){
      const search=$('#exercisePickerSearch');
      if(search)search.value='';
      renderPickerList();
      const row=document.querySelector('#exercisePickerList .picker-item[data-id="'+CSS.escape(id)+'"]');
      if(row){row.click();row.scrollIntoView({block:'nearest'});return;}
      if(!workoutState.pickerSwapUid&&workoutState.pickerMode!=='template'){pickerStaged.add(id);updatePickerHint();}
    }
     


    function updatePickerHint(){
      const hint=$('#exercisePickerHint');
      const doneBtn=$('#doneExercisePicker');
       

      if(workoutState.pickerVariantTarget){if(hint){hint.hidden=false;hint.textContent=`Tap an exercise to use it in week ${workoutState.pickerVariantTarget.week} only. Every other week keeps the exercise above.`;}if(doneBtn){doneBtn.textContent='Done';doneBtn.disabled=false;}return;}
      if(workoutState.pickerSwapUid){if(hint){hint.hidden=false;hint.textContent=forkSwapScopeText(workoutState.pickerMode,state.savedBuilder?.editTarget?.kind);}if(doneBtn){doneBtn.textContent='Done';doneBtn.disabled=false;}return;}
       


      if(hint){hint.hidden=true;hint.textContent='';}
      if(!doneBtn)return;
      if(workoutState.pickerMode==='template'){doneBtn.textContent='Done';doneBtn.disabled=false;return;}
       

      const n=pickerStaged.size;
      doneBtn.textContent=n?`Add ${n} exercise${n===1?'':'s'}`:'Add exercises';
      doneBtn.disabled=!n;
    }
     










    function forkLiveDraftFocusRange(){
      const draft=workoutState.draft;
      const presetRange=focusPresetRange(draft?.focusPreset);
      if(presetRange)return presetRange;
      const cf=draft?.focusCustomRange;
       


      if(cf&&Number.isFinite(+cf.min)&&(cf.max==null||Number.isFinite(+cf.max)))return {preset:'custom',min:+cf.min,max:cf.max==null?null:+cf.max,openTop:false,amrap:false,custom:true};
      return progressionSetup.defaultRange;
    }
     



    function stageExerciseItem(exerciseId){
      const ex=resolveExercise(exerciseId),range=forkLiveDraftFocusRange();
      const progression=Object.assign(defaultExerciseProgression({mode:ex?.tracking||'reps',min:range.min,max:range.max,openTop:range.openTop,amrap:range.amrap,custom:range.custom}),range.preset?{preset:range.preset}:null);
       



      const item=newExerciseItem({exerciseId,tracking:ex?.tracking||'reps',sets:Array.from({length:defaultSetCount()},()=>newSet()),progression});
       

      if(typeof singleSideEnabled==='function'&&singleSideEnabled(exerciseId,item))applySingleSideToSets(item,true);
      return item;
    }
     


    function commitPickerStaged(){
      const draft=workoutState.draft;
      if(!draft||!pickerStaged.size)return 0;
      let added=0;
      [...pickerStaged].forEach(id=>{
        if(draft.exercises.some(item=>item.exerciseId===id))return;
         


        const item=stageExerciseItem(id);
        draft.exercises.push(item);
        pickerSessionAdded.add(id);added++;
      });
      pickerStaged.clear();
      if(added){
        prepareDraftProgression(draft, workoutState.activeProgram?.id===draft.programId?workoutState.activeProgram.progression:freeformProgressionConfig());
        renderWorkoutExercises();renderWorkoutProgression();markDraftSaved();
      }
      updatePickerHint();
      return added;
    }

    
//# sourceMappingURL=workout-builder.js.map
