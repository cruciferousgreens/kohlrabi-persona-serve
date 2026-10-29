
 
     






         
     



    function showModalPinned(dialog){
      const x=window.scrollX,y=window.scrollY;
      dialog.showModal();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        if(window.scrollX!==x||window.scrollY!==y)window.scrollTo(x,y);
      }));
    }
     






    (function(){
      if(typeof HTMLDialogElement==='undefined'||!HTMLDialogElement.prototype)return;
      const proto=HTMLDialogElement.prototype;
      if(proto.__motionExitPatched)return;
      const nativeClose=proto.close;
      proto.close=function(...args){
        const reduce=typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
        if(reduce||!this.open||this.classList.contains('is-closing'))return nativeClose.apply(this,args);
        let ms=120;
        try{const v=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--motion-exit'));if(v>0)ms=v;}catch(_){}
        if(!(ms>0))return nativeClose.apply(this,args);
        this.classList.add('is-closing');
        const self=this;
        setTimeout(()=>{self.classList.remove('is-closing');nativeClose.apply(self,args);},ms);
      };
      proto.__motionExitPatched=true;
    })();
     
    function applyRepPreset(key,target=progressionSetup){
      const preset=REP_PRESETS[key]||REP_PRESETS.hypertrophy;
      target.defaultRange={preset:key,min:preset.min,max:preset.max,openTop:!!preset.openTop,amrap:!!preset.amrap};
       










    }
     




     






    function touchProgram(p){if(p&&typeof p==='object'){try{p.updatedAt=Date.now();p.revision=(Number(p.revision)||0)+1;}catch(_){}}return p;}
    let programDraftProgression=null;
    let pendingDeleteProgramWorkoutUid=null;
     



    let pendingDeleteProgramWorkoutProgramId=null;
    let pendingDeleteSavedProgramId=null;
     

    let pendingDeleteArchivedProgramId=null;
     

    let pendingSavedProgramActivationId=null;
     



    function forkAllPrograms(){
      return [workoutState.activeProgram,...(workoutState.savedPrograms||[]),...(workoutState.archivedPrograms||[])].filter(Boolean);
    }
     





    function forkProgramWorkoutOwner(uid,programId){
      const all=forkAllPrograms();
      if(programId!=null&&programId!==''){const byId=all.find(p=>p.id===programId);if(byId)return byId;}
      return all.find(p=>(p.workouts||[]).some(w=>w.uid===uid))||null;
    }
     





    function confirmDeleteProgramWorkout(uid,programId){
      const program=forkProgramWorkoutOwner(uid,programId)||workoutState.activeProgram;
      const workout=program?.workouts?.find(w=>w.uid===uid);
      pendingDeleteProgramWorkoutUid=uid;
      pendingDeleteProgramWorkoutProgramId=program?(program.id??null):null;
      $('#deleteProgramWorkoutDesc').textContent=workout?`Delete "${workout.name}" from your program? This cannot be undone.`:'Delete this workout from your program? This cannot be undone.';
      showModalPinned($('#deleteProgramWorkoutDialog'));
    }
     





    function confirmDeleteSavedProgram(id){
      const program=(workoutState.savedPrograms||[]).find(p=>p.id===id);if(!program)return;
      pendingDeleteSavedProgramId=program.id;
      $('#deleteSavedProgramDesc').textContent=`"${program.name||'This program'}" will be permanently deleted. This cannot be undone.`;
      showModalPinned($('#deleteSavedProgramDialog'));
    }
     


    function confirmDeleteArchivedProgram(id){
      const program=(workoutState.archivedPrograms||[]).find(p=>p.id===id);if(!program)return;
      pendingDeleteArchivedProgramId=program.id;
      $('#deleteArchivedProgramDesc').textContent=`"${program.name||'This program'}" will be permanently deleted. This cannot be undone.`;
      showModalPinned($('#deleteArchivedProgramDialog'));
    }
     






    function wireSavedProgramActivation(){
      $('#confirmSetSharedProgramActive')?.addEventListener('click',()=>{
        if(pendingSavedProgramActivationId){const id=pendingSavedProgramActivationId;pendingSavedProgramActivationId=null;activateSavedProgramById(id);}
      });
      $('#confirmSetSharedProgramActiveDialog')?.addEventListener('close',()=>{pendingSavedProgramActivationId=null;});
    }
     





    function parkActiveProgramToSaved(){
      const program=workoutState.activeProgram;if(!program)return;
      delete program.archivedAt;
      program.savedAt=localIsoDate();
      touchProgram(program);
      const saved=workoutState.savedPrograms||(workoutState.savedPrograms=[]);
      const existing=saved.findIndex(p=>p.id===program.id);
      if(existing>=0)saved.splice(existing,1);
      saved.unshift(program);
      workoutState.activeProgram=null;
    }
     












    function openProgramCreation(){
      if($('#createProgram')?.dataset.editing==='true'){
        $('#programSetup')?.scrollIntoView({behavior:'smooth',block:'start'});
        return;
      }
      if(workoutState.activeProgram){
        programDraftProgression=null;
        programEditSnapshot=null;
        $('#programName').value='';$('#programFocus').value='';
        delete $('#createProgram').dataset.editing;
        $('#createProgram').textContent='Create active program';
        $('#programSetupTitle').textContent='Create your active program.';
      }
      state.savedProgramPreviewId=null;state.programWorkoutUid=null;
      state.programSetupOpen=true;renderProgram();
      $('#programSetup')?.scrollIntoView({behavior:'smooth',block:'start'});
    }
     









    function wireProgramDeepLinkDialog(){
      const close=()=>$('#programDeepLinkDialog')?.close();
      $('#closeProgramDeepLink')?.addEventListener('click',close);
      $('#keepActiveProgram')?.addEventListener('click',close);
      $('#confirmStartNewProgram')?.addEventListener('click',()=>{
        close();
        openProgramCreation();
      });
    }
     


     





    function isReloadNavigation(){
      try{
        const nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];
        return !!(nav&&nav.type==='reload');
      }catch(_){return false;}
    }
     












    let programDeepLinkOfferSuppressed=false;
    let programDeepLinkSuppressToken=0;
    function suppressNextProgramDeepLinkOffer(){
      programDeepLinkOfferSuppressed=true;
      const token=++programDeepLinkSuppressToken;
      try{setTimeout(()=>{if(programDeepLinkSuppressToken===token)programDeepLinkOfferSuppressed=false;},1000);}catch(_){}
    }
     
    function maybeOfferNewProgramForDeepLink(options){
      const explicit=!!(options&&options.explicit);
      if(!explicit){
        if(programDeepLinkOfferSuppressed){programDeepLinkOfferSuppressed=false;programDeepLinkSuppressToken++;return;}
        if(isReloadNavigation())return;
      }
      const program=workoutState.activeProgram;
      const dlg=$('#programDeepLinkDialog');
      if(!program||!dlg)return;
       


      $('#programDeepLinkDesc').textContent=`You have an active program (“${program.name}”). Starting a new program opens the creation form; saving it as the active program replaces this one. ${replaceProgramConsequence()}`;  
      showModalPinned(dlg);
    }
    wireSavedProgramActivation();
     

    wireProgramDeepLinkDialog();
     
    $('#cancelDeleteProgramWorkout')?.addEventListener('click',()=>$('#deleteProgramWorkoutDialog').close());
    $('#keepProgramWorkout')?.addEventListener('click',()=>$('#deleteProgramWorkoutDialog').close());
     

    $('#cancelDeleteSavedProgram')?.addEventListener('click',()=>{$('#deleteSavedProgramDialog').close();pendingDeleteSavedProgramId=null;});
    $('#keepSavedProgram')?.addEventListener('click',()=>{$('#deleteSavedProgramDialog').close();pendingDeleteSavedProgramId=null;});
    $('#confirmDeleteSavedProgram')?.addEventListener('click',()=>{
      const sx=window.scrollX,sy=window.scrollY;
      $('#deleteSavedProgramDialog').close();
      if(pendingDeleteSavedProgramId){
         

        if(typeof noteTombstone==='function')noteTombstone('savedPrograms',pendingDeleteSavedProgramId);
        workoutState.savedPrograms=(workoutState.savedPrograms||[]).filter(p=>p.id!==pendingDeleteSavedProgramId);
        pendingDeleteSavedProgramId=null;
        schedulePersist();renderProgram();
        window.scrollTo(sx,sy);
         



      }
    });
     

    $('#cancelDeleteArchivedProgram')?.addEventListener('click',()=>{$('#deleteArchivedProgramDialog').close();pendingDeleteArchivedProgramId=null;});
    $('#keepArchivedProgram')?.addEventListener('click',()=>{$('#deleteArchivedProgramDialog').close();pendingDeleteArchivedProgramId=null;});
    $('#confirmDeleteArchivedProgram')?.addEventListener('click',()=>{
      const sx=window.scrollX,sy=window.scrollY;
      $('#deleteArchivedProgramDialog').close();
      if(pendingDeleteArchivedProgramId){
        const idx=(workoutState.archivedPrograms||[]).findIndex(p=>p.id===pendingDeleteArchivedProgramId);
        const removed=removeArchivedProgramAt(idx);
        pendingDeleteArchivedProgramId=null;
        schedulePersist();renderProgram();
        window.scrollTo(sx,sy);
         



      }
    });
    $('#confirmDeleteProgramWorkout')?.addEventListener('click',()=>{
       



      const wasOnWorkoutPage=!!state.programWorkoutUid&&state.programWorkoutUid===pendingDeleteProgramWorkoutUid;
      const sx=window.scrollX,sy=window.scrollY;
      $('#deleteProgramWorkoutDialog').close();
       



      const program=forkProgramWorkoutOwner(pendingDeleteProgramWorkoutUid,pendingDeleteProgramWorkoutProgramId)||workoutState.activeProgram;
      if(program&&pendingDeleteProgramWorkoutUid){
        program.workouts=program.workouts.filter(workout=>workout.uid!==pendingDeleteProgramWorkoutUid);
        if(typeof touchProgram==='function')touchProgram(program);  
        if(state.programWorkoutUid===pendingDeleteProgramWorkoutUid)state.programWorkoutUid=null;
        schedulePersist();renderProgram();
        if(typeof renderWorkoutTemplateList==='function')renderWorkoutTemplateList();
        if(!wasOnWorkoutPage)window.scrollTo(sx,sy);
         


      }
      pendingDeleteProgramWorkoutUid=null;
      pendingDeleteProgramWorkoutProgramId=null;  
    });
     
    let programEditSnapshot=null;
    $('#keepProgramChanges')?.addEventListener('click',()=>$('#discardProgramChangesDialog').close());
    $('#keepProgramChangesBtn')?.addEventListener('click',()=>$('#discardProgramChangesDialog').close());
     


    $('#saveProgramChangesDialog')?.addEventListener('click',()=>{$('#discardProgramChangesDialog').close();createProgram();});
    $('#confirmDiscardProgramChanges')?.addEventListener('click',()=>{$('#discardProgramChangesDialog').close();cancelProgramEdit();});
    $('#closeAddSavedToProgram')?.addEventListener('click',()=>$('#addSavedToProgramDialog').close());
     
    function cloneProgression(src){const base=src||{};return {...base,defaultRange:{...(base.defaultRange||{})},weeklyRanges:[...(base.weeklyRanges||[])],weeklyPcts:[...(base.weeklyPcts||[])],weeklyDeloads:[...(base.weeklyDeloads||[])] };}
     
    function programFormProgression(){if(!programDraftProgression)programDraftProgression=cloneProgression(progressionSetup);return programDraftProgression;}
     




    function syncPctRowForScheme(scheme){
      const pctRow=$('#progressionPctRow'); if(!pctRow)return;
      pctRow.hidden=scheme!=='onerm';
      const help=pctRow.nextElementSibling;
      if(help&&help.classList.contains('field-help'))help.hidden=pctRow.hidden;
    }
     
    function syncProgramForm(){
      const p=programFormProgression(), range=p.defaultRange||{};
       
       

      const poToggle=$('#programProgressionOffToggle');
      if(poToggle){const off=!!p.progressionOff;poToggle.setAttribute('aria-pressed',String(!off));poToggle.setAttribute('aria-label',`Progression for this program ${off?'off':'on'}`);}
      const ppSection=poToggle?.closest('section.program-progression');
      if(ppSection)ppSection.classList.toggle('progression-off',!!p.progressionOff);
       

      const thresholdPills=$('#programRpePills');
       
      if(thresholdPills)thresholdPills.querySelectorAll('[data-rpe-threshold]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.rpeThreshold===String(p.threshold??8))));
      const scheme=p.scheme||'linear';
      document.querySelectorAll('#programSchemePills [data-scheme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scheme===scheme)));
      
      
       



      const rpeTriggerRow=$('#programRpeTriggerRow'); if(rpeTriggerRow)rpeTriggerRow.hidden=scheme==='linear'||scheme==='onerm';
      const incType=$('#progressionIncrementType'); if(incType)incType.value=p.incrementType||'lb';
      
      const incPair=incType&&incType.closest('.settings-pair'); if(incPair)incPair.hidden=scheme==='onerm';
      syncPctRowForScheme(scheme);
       



      const schemeDescEl=$('#programSchemeDesc'); if(schemeDescEl)schemeDescEl.textContent=schemeDescription(scheme);
      const pctInput=$('#progressionPercentOf1RM'); if(pctInput)pctInput.value=clampPct1RM(Number(p.percentOf1RM)||75);
       

      const waveToggle=$('#pctWaveToggle');
      if(waveToggle){waveToggle.setAttribute('aria-pressed',String(!!p.pctWave));waveToggle.setAttribute('aria-label',`Vary percent of 1RM by week ${p.pctWave?'on':'off'}`);}
      const incVal=$('#progressionIncrementValue'); if(incVal)incVal.value=p.incrementValue??5;
      const repMin=$('#programRepMin'); if(repMin)repMin.value=range.min??'';
      const repMax=$('#programRepMax'); if(repMax)repMax.value=range.max??'';
       









      const pickerHost=$('#programRangePicker');
      if(pickerHost&&typeof forkRepRangePickerPaint==='function')forkRepRangePickerPaint(pickerHost,forkProgramRangePickerSelection());
       


      syncTimeStepPills($('#programTimeStepPills'),p.timeStep??5);
       


      syncProgramCycleUI(p);
       
      const pwp=$('#pctWavePanel');
      if(pwp)pwp.hidden=!p.pctWave;
      syncProgramIncrementUnit();
      renderWeekRanges(p);
      renderWeekPcts(p);
    }
     
    function seedProgramForm(fromProgram){
      programDraftProgression=cloneProgression(fromProgram?.progression||progressionSetup);
      syncProgramForm();
    }
     



































     



     








     




    function forkSetProgramFormRangePreset(key){
      const d=programFormProgression();
      if(key==='custom'){
        const r=d.defaultRange||(d.defaultRange={preset:'custom',min:6,max:12,openTop:false,amrap:false});
        r.preset='custom';
        if(r.min==null)r.min=6;
        syncProgramForm();
        return;
      }
      applyRepPreset(key,d);
      syncProgramForm();
    }
     





    function forkProgramRangePickerSelection(){
      const range=programFormProgression().defaultRange||{};
      if(range.preset==='custom')return {preset:null,custom:true};
      return {preset:range.preset||'hypertrophy',custom:false};
    }
     




    function forkNormalizeProgramRangePair(){
      const r=programFormProgression().defaultRange;
      if(r&&r.max!=null&&r.max<r.min)r.max=r.min;
      syncProgramForm();
    }
     















    const forkProgramRangePickerAdapter={
      tileAttr:'data-fork-target-preset',minId:'programRepMin',maxId:'programRepMax',
      selection:()=>forkProgramRangePickerSelection(),
      onPreset(key){forkSetProgramFormRangePreset(key);return 'selected';},
      onCustom(){forkSetProgramFormRangePreset('custom');},
      onFieldInput(){
        const d=programFormProgression(),r=d.defaultRange||(d.defaultRange={});
        const mn=$('#programRepMin'),mx=$('#programRepMax');
        if(mn){const v=parseInt(mn.value,10);r.min=Number.isFinite(v)?Math.max(1,v):1;}
        if(mx){const v=String(mx.value).trim();if(v==='')r.max=null;else{const n=parseInt(v,10);if(Number.isFinite(n))r.max=n;}}
        r.preset='custom';
      },
      onFieldChange(){forkNormalizeProgramRangePair();},
    };
     



     








    function renderProgramFormSections(){
      const program=workoutState.activeProgram;
      const editing=$('#createProgram')?.dataset.editing==='true'&&!!program;
      renderProgramFormDeload(editing?program:null);
    }
     





    function renderProgramFormDeload(program){
      const section=$('#programPageDeloadSection'),host=$('#forkPageDeloadHost');
      if(!section||!host)return;
      if(!program){section.hidden=true;host.innerHTML='';return;}
      section.hidden=false;
      const week=programWeek(program);
       








      const forkMarked=typeof forkIsDeloadWeek==='function'&&forkIsDeloadWeek(program,week);
      const scale=typeof forkDeloadScaleForWeek==='function'?forkDeloadScaleForWeek(program,week):(forkMarked?60:null);
      const waveOnly=!forkMarked&&scale!=null;
      const stateText=forkMarked?`Week ${week} (loads at 60%)`:waveOnly?`Week ${week} (loads at ${scale}%, set in the % wave panel)`:'Not this week';
      host.innerHTML=`<div class="fork-engine-deload"><span class="fork-engine-deload-copy"><span class="fork-engine-deload-label">Deload week</span><span class="fork-engine-deload-state">${stateText}</span></span>${forkMarked?`<button class="secondary-button" id="forkPageCancelDeloadBtn" type="button">Cancel deload</button>`:waveOnly?'':`<button class="secondary-button" id="forkPageDeloadBtn" type="button">Deload this week</button>`}</div>`;
      $('#forkPageDeloadBtn')?.addEventListener('click',forkDeloadActiveProgramWeek);
      $('#forkPageCancelDeloadBtn')?.addEventListener('click',forkCancelDeloadActiveProgramWeek);
    }
     
    function renderWeekRanges(target){
      target=target||programFormProgression();
      const panel=$('#undulatingPanel'),list=$('#weekRangeList'),length=clamp(Number($('#programLength').value)||8,1,52);
       


      const cycleLen=normalizeCycleLength(target);
      panel.hidden=cycleLen<=0;if(panel.hidden)return;
       
      ensureWeeklyRanges(target,cycleLen);
      list.innerHTML=target.weeklyRanges.map((preset,index)=>weekRangeRow(preset,index,'data-week-pill')).join('');
       
      document.querySelectorAll('[data-week-pill]').forEach(button=>button.addEventListener('click',()=>{const index=Number(button.dataset.weekPill);target.weeklyRanges[index]=button.dataset.preset;document.querySelectorAll(`[data-week-pill="${index}"]`).forEach(other=>other.setAttribute('aria-pressed',String(other===button))); renderWeekPcts(target);}));
    }
     

    function ensureWeeklyPcts(target,length){
      const flat=clampPct1RM(Number(target.percentOf1RM)||75);
      if(!Array.isArray(target.weeklyPcts))target.weeklyPcts=[];
      while(target.weeklyPcts.length<length)target.weeklyPcts.push(flat);
      target.weeklyPcts=target.weeklyPcts.slice(0,length);
      if(!Array.isArray(target.weeklyDeloads))target.weeklyDeloads=[];
      while(target.weeklyDeloads.length<length)target.weeklyDeloads.push(false);
      target.weeklyDeloads=target.weeklyDeloads.slice(0,length);
    }
     



    function weekPctRow(pct,deload,index,rangeLabel){
       



      return `<div class="week-pct-row"><span class="week-pct-id"><strong>Week ${index+1}</strong><span class="week-pct-range">${escapeHtml(rangeLabel)}</span></span><label class="week-pct-input"><input type="number" inputmode="decimal" min="1" max="100" step="0.5" value="${pct}" data-week-pct="${index}" aria-label="Week ${index+1} percent of 1RM"><span class="unit">%</span></label><button type="button" class="rep-preset" data-week-deload="${index}" aria-pressed="${deload?'true':'false'}">Deload</button></div>`;
    }
     
    function renderWeekPcts(target){
      target=target||programFormProgression();
      const panel=$('#pctWavePanel'),list=$('#weekPctList');
      if(!panel||!list)return;
      const length=clamp(Number($('#programLength').value)||8,1,52);
      panel.hidden=!target.pctWave;if(panel.hidden)return;
      ensureWeeklyPcts(target,length);
      list.innerHTML=target.weeklyPcts.map((pct,index)=>{
        const rangeLabel=programRangeLabel(programRangeForWeek({progression:target},index+1));
        return weekPctRow(clampPct1RM(Number(pct)||target.percentOf1RM||75),!!target.weeklyDeloads[index],index,rangeLabel);
      }).join('');
      list.querySelectorAll('[data-week-pct]').forEach(input=>input.addEventListener('change',()=>{
        const index=Number(input.dataset.weekPct);
        target.weeklyPcts[index]=clampPct1RM(Number(input.value)||target.percentOf1RM||75);
        input.value=target.weeklyPcts[index];
         
      }));
      list.querySelectorAll('[data-week-deload]').forEach(button=>button.addEventListener('click',()=>{
        const index=Number(button.dataset.weekDeload);
        target.weeklyDeloads[index]=!target.weeklyDeloads[index];
        button.setAttribute('aria-pressed',String(target.weeklyDeloads[index]));
         
      }));
    }
     




    const CYCLE_LENGTHS=[4,6,8,12];
     



    function normalizeCycleLength(p){
      const n=Number(p&&p.cycleLength);
      if(CYCLE_LENGTHS.includes(n))return n;
      return p&&p.undulating?8:0;
    }
     
    function cycleWeek(week,cycleLen){
      const len=CYCLE_LENGTHS.includes(Number(cycleLen))?Number(cycleLen):0;
      const w=Math.max(1,Math.floor(Number(week)||1));
      return len>0?((w-1)%len)+1:w;
    }
     













     
    function programVariantWeekKey(program,week){
      const len=normalizeCycleLength(program?.progression||{});
      if(len>0)return cycleWeek(week,len);
      const total=Math.max(1,Math.floor(Number(program?.length)||1));
      return Math.min(Math.max(1,Math.floor(Number(week)||1)),total);
    }
     


    function programVariantWeekCount(program){
      const len=normalizeCycleLength(program?.progression||{});
      if(len>0)return len;
      return Math.min(52,Math.max(1,Math.floor(Number(program?.length)||1)));
    }
     




    function programExerciseForWeek(item,program,week){
      const map=item?.weekVariants;
      if(!map||typeof map!=='object'||Array.isArray(map))return item;
      const v=map[String(programVariantWeekKey(program,week))];
      return (v&&typeof v==='object'&&v.exerciseId)?v:item;
    }
     



    function syncCyclePills(pillSelector,target){
      const len=normalizeCycleLength(target);
      document.querySelectorAll(pillSelector+' [data-cycle-length]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.cycleLength)===len)));
    }
     


    function syncProgramCycleUI(target){
      target=target||programFormProgression();
      const on=normalizeCycleLength(target)>0;
      const toggle=$('#varyRangesToggle');
      if(toggle){toggle.setAttribute('aria-pressed',String(on));toggle.setAttribute('aria-label',`Vary rep ranges by week ${on?'on':'off'}`);}
      const wrap=$('#programCycleWrap');if(wrap)wrap.hidden=!on;
      syncCyclePills('#programCyclePills',target);
    }
     
    function programRangeForWeek(program,week){const progression=program?.progression||progressionSetup;const cycleLen=normalizeCycleLength(progression);if(cycleLen<=0)return progression.defaultRange||progressionSetup.defaultRange;const key=progression.weeklyRanges?.[cycleWeek(week,cycleLen)-1]||progression.defaultRange?.preset||'hypertrophy';const preset=REP_PRESETS[key]||REP_PRESETS.hypertrophy;return {preset:key,min:preset.min,max:preset.max,openTop:!!preset.openTop,amrap:!!preset.amrap};}
     













    function programWorkoutFocusRange(program,workout,week){
      const progression=program?.progression||{};
      const cycleLen=normalizeCycleLength(progression);
      if(cycleLen>0){
        const key=progression.weeklyRanges?.[cycleWeek(week,cycleLen)-1];
        if(key&&REP_PRESETS[key]){const p=REP_PRESETS[key];return {preset:key,min:p.min,max:p.max,openTop:!!p.openTop,amrap:!!p.amrap,source:'week'};}
      }
      const t=workout?.template||{};
      if(t.focusKey&&REP_PRESETS[t.focusKey]){const p=REP_PRESETS[t.focusKey];return {preset:t.focusKey,min:p.min,max:p.max,openTop:!!p.openTop,amrap:!!p.amrap,source:'workout'};}
      const fc=t.focusCustom;
      if(fc&&fc.min!=null&&fc.min!==''&&Number.isFinite(Number(fc.min))){
        const min=Number(fc.min),max=(fc.max!=null&&fc.max!==''&&Number.isFinite(Number(fc.max)))?Number(fc.max):null;
        return {preset:null,custom:{min,max},min,max,openTop:false,amrap:false,source:'workout'};
      }
      return {...programRangeForWeek(program,week),source:'program'};
    }
     
     
     
     










    function programMuscles(program){const counts={};(program.workouts||[]).forEach(workout=>(workout.template?.exercises||[]).forEach(item=>{const ex=resolveExercise(item.exerciseId);if(!ex)return;const n=(item.sets||[]).length;if(!n)return;[...(ex?.primary||[]),...(ex?.secondary||[])].forEach(m=>counts[m]=(counts[m]||0)+n);}));return Object.entries(counts).sort((a,b)=>b[1]-a[1]);}
     









     
    function programMuscleHeatmapHtml(muscleRows,opts){
       

      const volumes={};muscleRows.forEach(([muscle,count])=>{volumes[muscle]=count;});
      const markup=muscleHeatmapMarkup(volumes,new Set(muscleRows.map(([muscle])=>String(muscle).toLowerCase())),false,true);
       



       






      return opts&&opts.blindSpots?markup.replace('class="anatomy-map"','class="anatomy-map program-anatomy-map" data-blindspots="1"'):markup;
    }
     







    function programBlindSpotNames(muscleRows){
       



      if(typeof exercises==='undefined'||typeof blindspotMuscles!=='function')return null;
      const volumes={};muscleRows.forEach(([muscle,count])=>{volumes[String(muscle).toLowerCase()]=count;});
      return blindspotMuscles(volumes,new Set(Object.keys(volumes))).map(m=>titleCase(m));
    }
     






    function programBlindSpotsHtml(muscleRows){
      if(!programBlindSpotNames(muscleRows))return '';
      if(typeof blindspotsHtml!=='function')return '';
      const volumes={};muscleRows.forEach(([muscle,count])=>{volumes[String(muscle).toLowerCase()]=count;});
      return blindspotsHtml(volumes,new Set(Object.keys(volumes)));
    }
     




















    function programMuscleMapDisclosureHtml(muscleRows){
      return `<details class="program-muscle-map-disclosure" open><summary class="program-muscle-map-summary"><span>Muscle map</span></summary><div class="program-muscle-map-body">${programMuscleHeatmapHtml(muscleRows,{blindSpots:true})}${programBlindSpotsHtml(muscleRows)}</div></details>`;
    }
     




    function programMuscleSectionHtml(muscleRows,muscleMax){
      if(!muscleRows.length)return `<section class=\"program-muscles\"><h3>Muscles in this program</h3><p class=\"section-note\">Add exercises to a program workout to see its muscle coverage.</p></section>`;
      return `<section class=\"program-muscles\"><h3>Muscles in this program</h3>${programMuscleMapDisclosureHtml(muscleRows)}</section>`;
    }
     















    function forkPassWeekAtDate(program,iso){
      if(!program||typeof forkQueueCompletedPasses!=='function'||typeof forkProgramQueueState!=='function')return 1;
      const q=forkProgramQueueState(program);
      if(!q||!q.order.length)return 1;
      const passes=forkQueueCompletedPasses(q,typeof forkProgramLogCompletions==='function'?forkProgramLogCompletions(program):[],iso);
      const length=Number(program.length)>0?Math.floor(Number(program.length)):1;
      return Math.min(1+passes,length);
    }
     
    function programWeekAtDate(program,date=new Date()) {
       











       








      const iso=typeof date==='string'?date:localIsoDate(date);
       




      const anchorIso=program&&typeof forkProgramWeekAnchorIso==='function'?forkProgramWeekAnchorIso(program):(program?program.startedAt:null);
      let week=null;
      if(program&&typeof forkEffectiveProgramWeek==='function'&&typeof anchorIso==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(anchorIso)){
        const w=forkEffectiveProgramWeek(program,iso);
        if(w!=null)week=w;
      }
      if(week==null){
         

        const dayNum=iso=>{
          const parts=String(iso).split('-');
          return Math.floor(Date.UTC(Number(parts[0]),Number(parts[1])-1,Number(parts[2]))/DAY_MS);
        };
        const startDay=dayNum(anchorIso||localIsoDate());
        const pointDay=dayNum(iso);
        const elapsed=Math.max(0,Math.floor((pointDay-startDay)/7));
         


        week=clamp(1+elapsed,1,program.length);
      }
      if(program){
        const passWeek=forkPassWeekAtDate(program,iso);
        if(passWeek>week)week=passWeek;
      }
      return week;
    }
     
    function programWeek(program) { return programWeekAtDate(program,new Date()); }
     
    function programRangeLabel(range) {
       


      const r=range||{min:6,max:12};
      if(r.amrap)return `AMRAP from ${r.min||1} reps`;
      if(r.openTop||r.max==null)return `${r.min||15}+ reps`;
      if(r.min&&r.min===r.max)return `${r.min} reps`;
      return `${r.min||1}–${r.max||r.min||1} reps`;
    }
     



    function programWorkoutRangeLabel(program,workout,week){
      const fallback=programRangeForWeek(program,week);
      const labels=[...new Set((workout?.template?.exercises||[]).map(x=>{
        const p=x.progression||{}, time=(x.tracking||p.mode)==='time';
        if(time){
          if(p.timeMin==null&&p.timeMax==null)return programRangeLabel(fallback);
          const min=p.timeMin,max=p.timeMax;
          return min&&max&&min!==max?`${min}–${max} sec`:`${min||max} sec`;
        }
        const hasOwn=p.min!=null||p.max!=null||p.openTop||p.amrap;
        return programRangeLabel(hasOwn?p:fallback);
      }).filter(Boolean))];
      if(!labels.length)return programRangeLabel(fallback);
      return labels.length===1?labels[0]:'Mixed ranges';
    }
     











    function suggestedProgramWorkout(program) {
       





      if(typeof forkProgramCompleted==='function'&&forkProgramCompleted(program))return null;
      const ready=(program?.workouts||[]).filter(workout=>workout.template?.exercises?.length);
      if(!ready.length)return null;
      if(typeof forkSessionQueueOn==='function'&&forkSessionQueueOn()&&typeof forkProgramPassState==='function'){
        const pass=forkProgramPassState(program);
        const passNext=pass&&(program.workouts||[]).find(workout=>workout.uid===pass.nextUid);
        if(passNext&&passNext.template?.exercises?.length)return passNext;
      }
      return ready.map((workout,index)=>{
        const logs=workoutState.completed.filter(row=>row.programId===program.id&&row.programWorkoutUid===workout.uid);
        const last=logs.reduce((latest,row)=>row.date>(latest||'')?row.date:latest,'');
        return {workout,index,last};
      }).sort((a,b)=>(a.last||'').localeCompare(b.last||'')||a.index-b.index)[0].workout;
    }
     





    function removeArchivedProgramAt(index){
      const archived=workoutState.archivedPrograms;
      if(index<0||index>=archived.length)return null;
      return archived.splice(index,1)[0];
    }
     
    function renderArchivedPrograms() {
      const archived=workoutState.archivedPrograms;$('#archivedPrograms').hidden=!archived.length;
       




      const swipeOn=typeof swipeDeleteSetsEnabled==='function'?swipeDeleteSetsEnabled():true;
      $('#archivedProgramList').innerHTML=archived.map(program=>{
        const logs=workoutState.completed.filter(workout=>workout.programId===program.id).sort(sortByRecencyDesc);  
         



        const rail=swipeOn?`<button aria-hidden="true" class="swipe-delete-action delete-archived-program" type="button" data-program-id="${escapeHtml(program.id)}" aria-label="Delete ${escapeHtml(program.name)}" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg></button>`:'';
        const inlineDel=!swipeOn?`<button class="saved-program-del" type="button" data-del-archived-program="${escapeHtml(program.id)}" aria-label="Delete ${escapeHtml(program.name)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`:'';
        return `<div class="archive-row-wrap"><div class="swipe-item archive-swipe">${rail}<div class="archive-row swipe-content"><div><strong>${escapeHtml(program.name)}</strong><br><span class="archive-meta row-meta"><span class="m-ink">${program.length} weeks</span><span class="fact">${logs.length} log${logs.length===1?'':'s'}</span></span><br><span class="archive-meta archive-date row-meta">Archived ${escapeHtml(formatLogDate(program.archivedAt))}</span></div><div class="archive-actions"><button class="archive-restore restore-program" type="button" data-program-id="${escapeHtml(program.id)}">Restore</button>${inlineDel}</div></div></div><details class="archive-history"><summary>View program history${logs.length?` (${logs.length} logs)`:''}</summary><div class="archive-history-list">${logs.length?logs.map(workout=>`<button class="archive-workout" type="button" data-archived-workout="${escapeHtml(workout.id)}"><strong>${escapeHtml(workout.name)}</strong><span><span class="m-ink">${escapeHtml(formatLogDate(workout.date))}</span><span class="fact">${workout.exercises.reduce((sum,item)=>sum+item.sets.length,0)} sets</span></span></button>`).join(''):'<p class="section-note">No logs are linked to this program.</p>'}</div></details></div>`;
      }).join('');
     















    function restoreArchivedProgramAt(index){
      const archived=workoutState.archivedPrograms;
      if(index<0||index>=archived.length)return;
      const restored=archived.splice(index,1)[0];
      const active=workoutState.activeProgram;
      const savedList=workoutState.savedPrograms||[];
      const alreadyListed=!!(active&&active.id===restored.id)||savedList.some(p=>p&&p.id===restored.id);
      if(!alreadyListed){
         




        delete restored.archivedAt;
        restored.savedAt=localIsoDate();
        if(!Array.isArray(workoutState.savedPrograms))workoutState.savedPrograms=[];
        workoutState.savedPrograms.unshift(restored);
      }
       


       


      if(typeof enforceProgramListingInvariant==='function')enforceProgramListingInvariant();
      schedulePersist();renderProgram();renderDashboard();
    }
      document.querySelectorAll('.restore-program').forEach(button=>button.addEventListener('click',()=>{restoreArchivedProgramAt(workoutState.archivedPrograms.findIndex(p=>p.id===button.dataset.programId));}));
       


      document.querySelectorAll('.delete-archived-program').forEach(button=>button.addEventListener('click',()=>confirmDeleteArchivedProgram(button.dataset.programId)));
      document.querySelectorAll('[data-del-archived-program]').forEach(button=>button.addEventListener('click',()=>confirmDeleteArchivedProgram(button.dataset.delArchivedProgram)));
      if(typeof attachSwipeDelete==='function')attachSwipeDelete($('#archivedProgramList'));
      document.querySelectorAll('[data-archived-workout]').forEach(button=>button.addEventListener('click',()=>{const workout=workoutState.completed.find(row=>row.id===button.dataset.archivedWorkout);if(!workout)return;state.workoutDetailReturn=ROUTES.DETAIL_RETURN.PROGRAM;showWorkouts(false);renderCompletedWorkout(workout,{push:true});}));
    }
     











    function renderSavedPrograms(){
       





      if(typeof enforceProgramListingInvariant==='function'&&enforceProgramListingInvariant()&&typeof schedulePersist==='function')schedulePersist();
      const saved=workoutState.savedPrograms||[];
       



      const swipeOn=typeof swipeDeleteSetsEnabled==='function'?swipeDeleteSetsEnabled():true;
       



      const showEmpty=!saved.length&&(workoutState.activeProgram||(workoutState.archivedPrograms||[]).length);
      $('#savedPrograms').hidden=!saved.length&&!showEmpty;
      $('#savedProgramList').innerHTML=showEmpty?emptyStateHtml({
        title:'No other saved programs',
        description:'Programs you create or open from a shared link stay here for later.',
        primaryHtml:emptyStatePrimary('savedEmptyCreate','Create a program')
      }):saved.map(program=>{
        const workoutCount=(program.workouts||[]).length;
         



        const sharedChip=program.shared?'<span class="built-in-label">Shared</span>':'';
         




        const isActiveProgram=!!(workoutState.activeProgram&&workoutState.activeProgram.id===program.id);
        const rail=swipeOn?`<button aria-hidden="true" class="swipe-delete-action delete-saved-program" type="button" data-program-id="${escapeHtml(program.id)}" aria-label="Delete ${escapeHtml(program.name)}" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg></button>`:'';
        const inlineDel=!swipeOn?`<button class="saved-program-del" type="button" data-del-saved-program="${escapeHtml(program.id)}" aria-label="Delete ${escapeHtml(program.name)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`:'';
        return `<div class="archive-row-wrap"><div class="swipe-item saved-program-swipe">${rail}<div class="archive-row swipe-content"><button class="open-saved-program" type="button" data-program-id="${escapeHtml(program.id)}" aria-label="Open ${escapeHtml(program.name)}"><strong>${escapeHtml(program.name)}</strong>${sharedChip?`<br>${sharedChip}`:''}<br><span class="archive-meta row-meta"><span class="m-ink">${program.length} weeks</span><span class="fact">${workoutCount} workout${workoutCount===1?'':'s'}</span></span></button>${isActiveProgram?`<span class="archive-restore is-active-state">Active</span>`:`<button class="archive-restore set-active-saved" type="button" data-program-id="${escapeHtml(program.id)}">Set active</button>`}${inlineDel}</div></div></div>`;
      }).join('')
       




      +`<button class="new-template-button" id="addProgramButton" type="button">+ Add program</button>`;
      if(showEmpty){
         




        $('#savedEmptyCreate')?.addEventListener('click',()=>{openProgramCreation();});
        return;
      }
       

      document.querySelectorAll('.open-saved-program').forEach(button=>button.addEventListener('click',()=>openSavedProgramPreview(button.dataset.programId)));
      document.querySelectorAll('.set-active-saved').forEach(button=>button.addEventListener('click',()=>requestActivateSavedProgram(button.dataset.programId)));
       


      document.querySelectorAll('.delete-saved-program').forEach(button=>button.addEventListener('click',()=>confirmDeleteSavedProgram(button.dataset.programId)));
      document.querySelectorAll('[data-del-saved-program]').forEach(button=>button.addEventListener('click',()=>confirmDeleteSavedProgram(button.dataset.delSavedProgram)));
      if(typeof attachSwipeDelete==='function')attachSwipeDelete($('#savedProgramList'));
       



      $('#addProgramButton')?.addEventListener('click',()=>{openProgramCreation();});
    }
     





    function requestActivateSavedProgram(id){
       

      if(workoutState.activeProgram&&workoutState.activeProgram.id===id)return;
      const saved=(workoutState.savedPrograms||[]).find(p=>p.id===id);if(!saved)return;
      if(workoutState.activeProgram&&workoutState.activeProgram.id!==saved.id){
        pendingSavedProgramActivationId=id;
        const csd=$('#confirmSetSharedProgramActiveDesc');if(csd)csd.textContent=replaceProgramConsequence();  
        showModalPinned($('#confirmSetSharedProgramActiveDialog'));
        return;
      }
      activateSavedProgramById(id);
    }
     






    function activateSavedProgramById(id){
      const saved=workoutState.savedPrograms||[];
      const index=saved.findIndex(p=>p.id===id);if(index<0)return false;
      const started=saved.splice(index,1)[0];
      if(workoutState.activeProgram&&workoutState.activeProgram.id!==started.id){
        const outgoing=workoutState.activeProgram;
        delete outgoing.archivedAt;
        outgoing.savedAt=localIsoDate();
        const existing=saved.findIndex(p=>p.id===outgoing.id);
        if(existing>=0)saved.splice(existing,1);
        saved.unshift(outgoing);
      }
      workoutState.activeProgram=started;
      touchProgram(started);
      delete workoutState.activeProgram.archivedAt;
      delete workoutState.activeProgram.savedAt;
       



      if(typeof enforceProgramListingInvariant==='function')enforceProgramListingInvariant();
      state.savedProgramPreviewId=null;state.programWorkoutUid=null;
      schedulePersist();renderProgram();renderDashboard();
       

      return true;
    }
     
    function openSavedProgramPreview(id){
       






      if(workoutState.activeProgram&&workoutState.activeProgram.id===id){
        state.savedProgramPreviewId=null;state.programWorkoutUid=null;
        renderProgram();window.scrollTo({top:0});return;
      }
      const program=(workoutState.savedPrograms||[]).find(p=>p.id===id);if(!program)return;
      state.savedProgramPreviewId=id;state.programWorkoutUid=null;
      renderProgram();window.scrollTo({top:0});
    }
     
    function savedProgramPreviewHtml(program){
      const workoutCount=(program.workouts||[]).length;
       

      const sharedChip=program.shared?'<span class="built-in-label">Shared</span>':'';
      const muscleRows=programMuscles(program),muscleMax=Math.max(1,...muscleRows.map(([,count])=>count));
      return `<div class="program-cover-head"><div class="program-cover-kicker">SAVED PROGRAM</div><h2>${escapeHtml(program.name)}</h2>${sharedChip}<p class="program-cover-meta"><span class="m-ink">${program.length} weeks</span><span class="fact">${workoutCount} workout${workoutCount===1?'':'s'}</span></p></div><div class="program-body">${programMuscleSectionHtml(muscleRows,muscleMax)}<div class="workout-toolbar"><h2>Workouts</h2></div><div class="program-workouts">${program.workouts.length?program.workouts.map(workout=>{const exerciseCount=workout.template?.exercises?.length||0;
        return `<div class="picker-item saved-workout-card program-workout-row"><button class="program-workout-open" type="button" data-program-workout="${escapeHtml(workout.uid)}" aria-label="Open ${escapeHtml(workout.name||'Workout')}"><span><strong>${escapeHtml(workout.name||'Workout')}</strong><span class="row-meta">${exerciseCount?`${exerciseCount} exercise${exerciseCount===1?'':'s'}`:'Empty shell'}</span></span></button></div>`;}).join(''):'<div class="history-empty">No workouts in this program.</div>'}</div><div class="program-actions">${ ''}${workoutState.activeProgram&&workoutState.activeProgram.id===program.id?`<span class="archive-restore is-active-state">Active</span>`:`<button class="primary-button" id="setSavedProgramActive" type="button">Set as active</button>`}<button class="secondary-button" id="shareSavedProgramBtn" type="button">Share</button><button class="secondary-button" id="deleteSavedProgramPreview" type="button">Delete</button></div>${workoutState.activeProgram&&workoutState.activeProgram.id===program.id?`<p class="session-note">This is your active program.</p>`:`<p class="session-note">Setting it active moves your current program to your saved programs. Nothing is deleted.</p>`}</div>`;
    }
     
    function renderSavedProgramPreview(program){
      const cover=$('#programCover');if(!cover)return;
      $('#programSetup').hidden=true;cover.hidden=false;
      cover.innerHTML=savedProgramPreviewHtml(program);
      document.querySelectorAll('[data-program-workout]').forEach(b=>b.addEventListener('click',()=>{state.programWorkoutUid=b.dataset.programWorkout;renderProgram();window.scrollTo({top:0});}));
      $('#setSavedProgramActive')?.addEventListener('click',()=>requestActivateSavedProgram(program.id));
       

      $('#shareSavedProgramBtn')?.addEventListener('click',()=>{if(typeof shareSavedProgram==='function')shareSavedProgram(program.id);});
      $('#deleteSavedProgramPreview')?.addEventListener('click',()=>confirmDeleteSavedProgram(program.id));
      hydrateBodyMaps();
      updateTopBar('program');
    }
     


















     


    function forkSessionQueueOn(){
      return true;
    }
     








    function forkBuilderShellUids(){
      const uids=new Set();
      const collect=b=>{ if(b&&b.isNewProgramShell&&b.editTarget&&b.editTarget.kind==='program'&&typeof b.editTarget.uid==='string')uids.add(b.editTarget.uid); };
      if(typeof state!=='undefined'&&state){
        collect(state.savedBuilder);
        const stash=state.savedBuilderStash;
        if(stash&&typeof stash==='object')for(const k of Object.keys(stash))collect(stash[k]);
      }
      return uids;
    }
     















    function forkProgramQueueState(program){
      if(!program||typeof forkQueueState!=='function'||typeof forkQueuePassState!=='function')return null;
      const q=forkQueueState(program);
      const completedUids=new Set(forkProgramLogCompletions(program).map(c=>c.uid));
      const shellUids=forkBuilderShellUids();
      const all=(program.workouts||[]).filter(w=>w&&typeof w.uid==='string'&&w.uid);
      const current=all
        .filter(w=>!shellUids.has(w.uid)||((w.template?.exercises?.length||0)>0||completedUids.has(w.uid)))
        .map(w=>w.uid);
       


      if(all.length)q.order=current;
      return q;
    }
     








    function forkProgramLogCompletions(program){
      if(!program)return[];
      const uids=new Set((program.workouts||[]).map(w=>w&&w.uid).filter(u=>typeof u==='string'&&u));
       



      const runFloor=typeof program.forkRunStart==='string'?program.forkRunStart:null;
      return (workoutState.completed||[])
        .filter(c=>c&&c.programId===program.id&&c.programWorkoutUid&&uids.has(c.programWorkoutUid)&&typeof c.date==='string'&&(!runFloor||c.date>=runFloor))
        .map(c=>({uid:c.programWorkoutUid,date:c.date}));
    }
     




    function forkProgramPassState(program){
      const q=forkProgramQueueState(program);if(!q)return null;
      return forkQueuePassState(q,forkProgramLogCompletions(program));
    }
     






    function forkRecordProgramFinish(completed){
      if(!completed||!completed.programId||!completed.programWorkoutUid)return false;
      if(!forkSessionQueueOn())return false;
      if(typeof forkQueueComplete!=='function'||typeof forkWithQueue!=='function')return false;
      const program=workoutState.activeProgram;
      if(!program||program.id!==completed.programId)return false;
      if(!(program.workouts||[]).some(w=>w.uid===completed.programWorkoutUid))return false;
      const q=forkProgramQueueState(program);
      if(!q)return false;
      const next=forkWithQueue(program,forkQueueComplete(q,completed.programWorkoutUid,completed.date));
      if(!next||next===program)return false;
      workoutState.activeProgram=next;
      touchProgram(next);
      return true;
    }
     
















    function forkProgramNextCardHtml(program){
      if(!forkSessionQueueOn())return '';
      const pass=forkProgramPassState(program);if(!pass)return '';
      const next=(program.workouts||[]).find(w=>w.uid===pass.nextUid);
      if(!next)return '';
       






      const hasExercises=(next.template?.exercises||[]).length>0;
      return `<section class="fork-next-session" aria-label="Next session"><div class="fork-next-kicker">Next session</div><h3>${escapeHtml(next.name||'Workout')}</h3>${hasExercises?'':`<p class="section-note">No exercises yet. Open the workout to build it.</p>`}<div class="fork-next-actions"><button class="primary-button fork-next-start" type="button" data-fork-next-start="${escapeHtml(next.uid)}">Start</button><button class="fork-skip-button" type="button" data-fork-queue-skip="${escapeHtml(next.uid)}">Skip</button></div></section>`;
    }
     
















     






    function forkProgramPassModel(program,week){
      if(!forkSessionQueueOn())return null;
       

      const pass=forkProgramPassState(program);if(!pass)return null;
       



      const runFloor=typeof program.forkRunStart==='string'?program.forkRunStart:null;
      const logs=workoutState.completed.filter(c=>c.programId===program.id&&(!runFloor||c.date>=runFloor)&&programWeekAtDate(program,c.date)===week);
      const doneUids=new Set(logs.map(c=>c.programWorkoutUid).filter(Boolean));
      return {pass,logs,doneUids};
    }
     




















    function forkProgramRowStateHtml(model,w){
      if(model.doneUids.has(w.uid)){
         








        return {
          head:`<span class="program-row-right row-meta"><span class="fact fork-week-state fork-week-done">Done ✓</span></span>`,
          sub:'',
          rail:''
        };
      }
      if(model.pass.resolved[w.uid]==='skipped'){
        return {
          head:`<span class="program-row-right fork-week-state fork-week-skipped">Skipped</span>`,
          sub:'',
          rail:`<button class="fork-week-undo" type="button" data-fork-queue-unskip="${escapeHtml(w.uid)}">Undo</button>`
        };
      }
      return null;
    }
     













    function forkProgramRowMuscles(w){
      const counts=new Map();
      for(const item of (w.template?.exercises||[])){
        const ex=(typeof resolveExercise==='function')?resolveExercise(item&&item.exerciseId):null;
        if(!ex)continue;
        const seen=new Set();
        for(const m of [...(ex.primary||[]),...(ex.secondary||[])]){
          if(!m||seen.has(m))continue;
          seen.add(m);
          counts.set(m,(counts.get(m)||0)+1);
        }
      }
       

      return [...counts.entries()].sort((a,b)=>b[1]-a[1]);
    }
    function forkProgramRowMuscleChipsHtml(w){
      const ranked=forkProgramRowMuscles(w);
      if(!ranked.length)return '';
      const shown=ranked.slice(0,5);
      const extra=ranked.length-shown.length;
      return shown.map(([m])=>musclePill(m)).join('')+(extra>0?`<span class="tag more">+${extra} more</span>`:'');
    }
     





    function forkProgramWeekCountHtml(program,week){
       


      if(forkProgramCompleted(program))return '<span class="fork-week-count">Completed</span>';
      const model=forkProgramPassModel(program,week);
      if(!model)return '';
      return `<span class="fork-week-count">${model.doneUids.size} of ${(program.workouts||[]).length} done</span>`;
    }
     



















    function forkProgramCompleted(program){
      if(!program||typeof forkQueueCompletedPasses!=='function')return null;
      const length=Number(program.length)>0?Math.floor(Number(program.length)):0;
      if(!length)return null;
      const q=forkProgramQueueState(program);
      if(!q||!q.order.length)return null;
      const completions=forkProgramLogCompletions(program);
      const today=localIsoDate();
      const passes=forkQueueCompletedPasses(q,completions,today);
      if(passes<length)return null;
      const workoutsCompleted=completions.filter(c=>c.date<=today).length;
      return {passes,length,workoutsCompleted};
    }
     










    function forkProgramCompleteCardHtml(program,completed){
      return `<section class="fork-complete-card" aria-label="Program complete"><div class="fork-next-kicker">Program complete</div><p class="fork-complete-line"><span class="m-ink">${completed.length} week${completed.length===1?'':'s'}</span><span class="fact">${completed.workoutsCompleted} workout${completed.workoutsCompleted===1?'':'s'} completed</span></p><div class="fork-complete-actions"><button class="primary-button" type="button" data-fork-restart-program>Restart program</button><button class="secondary-button" type="button" id="forkCompleteArchiveBtn">Archive program</button></div></section>`;
    }
     










    function forkProgramWorkoutsRowsHtml(program,week){
      if(!program.workouts.length)return '<div class="history-empty">No workouts yet. Tap + to add the first one.</div>';
      const model=forkProgramPassModel(program,week);
      return program.workouts.map((workout) => {const exerciseCount=workout.template?.exercises?.length||0;
         
        const swipeOn=typeof swipeDeleteSetsEnabled==='function'?swipeDeleteSetsEnabled():true;
         










        const chips=model?forkProgramRowMuscleChipsHtml(workout):'';
        const state=model?forkProgramRowStateHtml(model,workout):null;
        return `<div class="swipe-item program-swipe">${swipeOn?`<button aria-hidden="true" class="swipe-delete-action delete-program-workout" type="button" data-uid="${escapeHtml(workout.uid)}" aria-label="Remove ${escapeHtml(workout.name||'Workout')}" tabindex="-1"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/></svg></button>`:''}<div class="picker-item saved-workout-card swipe-content program-workout-row"><button class="program-workout-open" type="button" data-program-workout="${escapeHtml(workout.uid)}" aria-label="Open ${escapeHtml(workout.name||'Workout')}"><span><span class="program-row-head"><strong>${escapeHtml(workout.name||'Workout')}</strong>${state?state.head:''}</span>${(exerciseCount||(state&&state.sub))?`<span class="program-row-sub">${exerciseCount?`<span class="row-meta">${exerciseCount} exercise${exerciseCount===1?'':'s'}</span>`:''}${state?state.sub:''}</span>`:''}${chips?`<span class="muscle-chips">${chips}</span>`:''}</span></button>${state&&state.rail?`<span class="fork-week-undo-rail">${state.rail}</span>`:''}${swipeOn?'':`<button class="program-workout-del" type="button" data-del-program-workout="${escapeHtml(workout.uid)}" aria-label="Delete ${escapeHtml(workout.name||'Workout')}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`}</div></div>`;}).join('');
    }
     



     





    function forkProgramQueueCardsHtml(program,week){
      if(!forkSessionQueueOn())return '';
      return forkProgramNextCardHtml(program);
    }
     


























     

    function forkBlockDayNum(iso){
      const parts=String(iso||'').split('-');
      if(parts.length!==3)return null;
      const n=Math.floor(Date.UTC(Number(parts[0]),Number(parts[1])-1,Number(parts[2]))/86400000);
      return Number.isFinite(n)?n:null;
    }
     

    function forkProgramStatsModel(program,todayIso){
      if(!program||!Array.isArray(program.workouts))return null;
      const rotation=program.workouts.map(w=>w&&w.uid).filter(u=>typeof u==='string'&&u);
      if(!rotation.length)return null;
      const length=Math.max(1,Math.floor(Number(program.length)||1));
      const today=todayIso||localIsoDate();
       



      const anchorIso=typeof forkProgramWeekAnchorIso==='function'?forkProgramWeekAnchorIso(program):null;
      const startIso=(typeof anchorIso==='string'&&forkBlockDayNum(anchorIso)!=null)?anchorIso
        :(typeof program.startedAt==='string'&&forkBlockDayNum(program.startedAt)!=null)?program.startedAt:today;
      const startDay=forkBlockDayNum(startIso),todayDay=forkBlockDayNum(today);
      if(startDay==null||todayDay==null)return null;
      const blockDays=length*7;
      const elapsed=Math.max(0,todayDay-startDay);
      const blockIndex=Math.floor(elapsed/blockDays);
      const weekInBlock=Math.min(length,Math.floor((elapsed-blockIndex*blockDays)/7)+1);
      const uidSet=new Set(rotation);
       


      const logCompletions=forkProgramLogCompletions(program);
      const queue=forkProgramQueueState(program);
      const events=(queue&&typeof forkQueuePassEvents==='function')
        ? forkQueuePassEvents(queue,logCompletions)
        : logCompletions.map(c=>({uid:c.uid,action:'completed',date:c.date}));
      const completions=events
        .filter(e=>e&&e.action==='completed'&&e.uid&&uidSet.has(e.uid)&&forkBlockDayNum(e.date)!=null)
        .map(e=>({uid:e.uid,day:forkBlockDayNum(e.date)}));
      const blockOf=day=>Math.floor((day-startDay)/blockDays);
      const weekOf=day=>Math.floor(((day-startDay)%blockDays)/7)+1;
       
      const distinctSessions=blockIdx=>{
        const seen=new Set();
        completions.forEach(c=>{if(blockOf(c.day)===blockIdx)seen.add(weekOf(c.day)+'|'+c.uid);});
        return seen.size;
      };
      const weeks=[];
      for(let w=1;w<=weekInBlock;w++){
        const seen=new Set();
        completions.forEach(c=>{if(blockOf(c.day)===blockIndex&&weekOf(c.day)===w)seen.add(c.uid);});
        weeks.push({week:w,done:seen.size,scheduled:rotation.length});
      }
      const scheduledToDate=rotation.length*weekInBlock;
      const completedToDate=weeks.reduce((n,w)=>n+w.done,0);
      const adherence=scheduledToDate>0?Math.round(completedToDate/scheduledToDate*100):null;
       


      const totals=blockIdx=>{
        const fromDay=startDay+blockIdx*blockDays,toDay=fromDay+blockDays;
        let sets=0,volume=0;
        (workoutState.completed||[]).forEach(c=>{
          if(!c||c.programId!==program.id||!uidSet.has(c.programWorkoutUid))return;
          const d=forkBlockDayNum(c.date);
          if(d==null||d<fromDay||d>=toDay)return;
          (c.exercises||[]).forEach(item=>{
            const ex=typeof resolveExercise==='function'?resolveExercise(item&&item.exerciseId):null;
            ((item&&item.sets)||[]).forEach(set=>{
              if(!set||set.complete===false)return;
              sets++;
              volume+=typeof setVolume==='function'?setVolume(set,ex):0;
            });
          });
        });
        return {sessions:distinctSessions(blockIdx),sets,volume};
      };
      return {
        blockIndex,weekInBlock,weeks,scheduledToDate,completedToDate,adherence,
        current:totals(blockIndex),
        previous:blockIndex>0?totals(blockIndex-1):null,
      };
    }
     











    function forkProgramStatsHtml(program){
      const model=forkProgramStatsModel(program,localIsoDate());
      if(!model)return '';
       





      const tiles=`<div class="stats-panel fork-ps-adherence"><strong>${model.adherence==null?'—':model.adherence+'%'}</strong><span>Calendar adherence</span></div>${model.weeks.map(w=>`<div class="stats-panel"><strong>${w.done} of ${w.scheduled}</strong><span>Calendar week ${w.week}</span></div>`).join('')}`;
      let compare='';
      if(model.previous){
        const fmtCount=v=>Math.round(v).toLocaleString();
        const fmtVolume=v=>formatVolume(v);  
        const row=(label,cur,prev,fmt)=>{
          const d=cur-prev;
          const delta=d===0?'same':(d>0?`+${fmt(d)}`:`−${fmt(-d)}`);
          return `<div class="fork-ps-row"><span>${label}</span><strong>${fmt(cur)}</strong><span class="fork-ps-last">last block ${fmt(prev)} (${delta})</span></div>`;
        };
        compare=`<div class="fork-ps-compare">${row('Sessions',model.current.sessions,model.previous.sessions,fmtCount)}${row('Logged sets',model.current.sets,model.previous.sets,fmtCount)}${row('Volume',model.current.volume,model.previous.volume,fmtVolume)}</div>`;
      }
      return `<section class="fork-program-stats" aria-label="Program stats"><h3>Program stats</h3><div class="fork-ps-tiles">${tiles}</div>${compare}</section>`;
    }
     














    function forkProgramProgressionWalk(program,completed){
       











      const canonId=x=>(typeof canonicalExerciseId==='function')?canonicalExerciseId(x):x;
      const exIds=new Set();
      for(const w of (program?.workouts||[])) for(const e of (w?.template?.exercises||[])) if(e?.exerciseId) exIds.add(canonId(e.exerciseId));
      if(!exIds.size) return {events:[],summaries:[]};
       







      const sessions=(completed||[]).filter(w=>w&&w.programId===program.id)
        .map((w,i)=>({w,i})).sort((x,y)=>{
          const a=x.w,b=y.w;
          const byDate=String(a.date||'').localeCompare(String(b.date||''));
          if(byDate) return byDate;
          const key=s=>(s&&s.completedAt)||(s&&(s.isoDate||s.date))||'';
          const byStamp=String(key(a)).localeCompare(String(key(b)));
          if(byStamp) return byStamp;
          return y.i-x.i;
        }).map(entry=>entry.w);
      const best=new Map(); const events=[];
       



      const first=new Map(); const lastChange=new Map(); let changeSeq=0;
       



      const isWarm=s=>typeof isWarmupSet==='function'?isWarmupSet(s):!!(s&&(s.tags||[]).includes('Warmup'));
      for(const w of sessions){
        for(const item of (w.exercises||[])){
          const rawId=item?.exerciseId; if(!rawId) continue;
          const id=canonId(rawId); if(!exIds.has(id)) continue;
          const sets=typeof forkLoggedSets==='function'?forkLoggedSets(item):(item.sets||[]).filter(s=>s&&s.complete);
          let top=null;
          for(const s of sets){ if(isWarm(s)) continue; const wt=Number(s?.w),rp=Number(s?.r); if(!(wt>0)||!(rp>0)) continue;
            if(!top||wt>top.w||(wt===top.w&&rp>top.r)) top={w:wt,r:rp}; }
          if(!top) continue;
          const prev=best.get(id);
          if(prev&&top.w>prev.w){ events.push({exerciseId:id,date:w.date,completedAt:w.completedAt||'',kind:'weight',from:prev.w,to:top.w}); best.set(id,top); lastChange.set(id,{date:w.date,completedAt:w.completedAt||'',seq:changeSeq++}); }
          else if(prev&&top.w===prev.w&&top.r>prev.r){ events.push({exerciseId:id,date:w.date,completedAt:w.completedAt||'',kind:'reps',from:prev.r,to:top.r,weight:top.w}); best.set(id,top); lastChange.set(id,{date:w.date,completedAt:w.completedAt||'',seq:changeSeq++}); }
          else if(!prev){ best.set(id,top); first.set(id,top); }
        }
      }
       




      const summaries=[...lastChange.keys()].map(id=>{ const c=lastChange.get(id),f=first.get(id),b=best.get(id);
        return {exerciseId:id,date:c.date,completedAt:c.completedAt,seq:c.seq,from:{w:f.w,r:f.r},to:{w:b.w,r:b.r}}; })
        .sort((x,y)=>{
          const byDate=String(y.date||'').localeCompare(String(x.date||''));
          if(byDate) return byDate;
          const byStamp=String(y.completedAt||'').localeCompare(String(x.completedAt||''));
          if(byStamp) return byStamp;
          return y.seq-x.seq;
        }).slice(0,6)
        .map(s=>({exerciseId:s.exerciseId,date:s.date,completedAt:s.completedAt,from:s.from,to:s.to}));
       




      const sortedEvents=events.map((ev,i)=>({ev,i})).sort((x,y)=>{
        const a=x.ev,b=y.ev;
        const byDate=String(b.date||'').localeCompare(String(a.date||''));
        if(byDate) return byDate;
        const byStamp=String(b.completedAt||'').localeCompare(String(a.completedAt||''));
        if(byStamp) return byStamp;
        return y.i-x.i;
      }).map(entry=>entry.ev).slice(0,6);
      return {events:sortedEvents,summaries};
    }
     




    function forkProgramProgressionSummaries(program,completed){
      return forkProgramProgressionWalk(program,completed).summaries;
    }
    function forkProgressionHistoryHtml(program){
       








      const summaries=forkProgramProgressionSummaries(program,workoutState.completed||[]);
      const fmtW=(w,id)=>{ const ex=typeof resolveExercise==='function'?resolveExercise(id):null; const isDb=pairImplementExercise(ex);
        return `${isDb&&typeof dbDisplayWeight==='function'?dbDisplayWeight(w,id,ex,true):w} ${weightUnit()}`; };
      if(!summaries.length) return `<section class="fork-progression-history" aria-label="Progression history"><details class="fork-progression-history-disclosure" open><summary class="fork-progression-history-summary"><h3>Progression history</h3></summary><p class="section-note">No increases logged yet under this program.</p></details></section>`;
       









      const rows=summaries.map(s=>{ const name=(typeof resolveExercise==='function'?resolveExercise(s.exerciseId)?.name:null)||'Exercise';
        const detail=`Top set <span class="pr-nowrap">${escapeHtml(fmtW(s.from.w,s.exerciseId))} × ${s.from.r}</span> → <span class="pr-nowrap">${escapeHtml(fmtW(s.to.w,s.exerciseId))} × ${s.to.r}</span>`;
        return `<div class="action-row pr-row"><span><strong>${escapeHtml(name)}</strong><span>${detail}</span></span><span class="pr-row-date">${escapeHtml(formatLogDate(s.date))}</span></div>`; }).join('');
      return `<section class="fork-progression-history" aria-label="Progression history"><details class="fork-progression-history-disclosure" open><summary class="fork-progression-history-summary"><h3>Progression history</h3></summary><div class="action-list">${rows}</div></details></section>`;
    }
     












     
















    function forkRestartActiveProgram(){
      const program=workoutState.activeProgram;
      if(!program||typeof forkQueueInit!=='function'||typeof forkWithQueue!=='function')return;
      const today=localIsoDate();
      const next=forkWithQueue(program,forkQueueInit(program));
      if(!next)return;
      next.startedAt=today;
      next.forkRunStart=today;
      next.forkDeload={weeks:[]};
      workoutState.activeProgram=next;touchProgram(next);
      schedulePersist();renderProgram();renderDashboard();
       


    }
     


    function forkDeloadActiveProgramWeek(){
      const program=workoutState.activeProgram;
      if(!program||typeof forkMarkDeloadWeek!=='function')return;
      const week=programWeek(program);
      const next=forkMarkDeloadWeek(program,week);
      if(next){workoutState.activeProgram=next;touchProgram(next);}
      schedulePersist();renderProgram();renderDashboard();
       



    }
    function forkCancelDeloadActiveProgramWeek(){
      const program=workoutState.activeProgram;
      if(!program||typeof forkClearDeloadWeek!=='function')return;
      const week=programWeek(program);
      const next=forkClearDeloadWeek(program,week);
      if(next){workoutState.activeProgram=next;touchProgram(next);}
      schedulePersist();renderProgram();renderDashboard();
       


    }
     






    function forkQueueSkipFromCover(program,uid){
      const w=(program.workouts||[]).find(x=>x.uid===uid);if(!w)return;
      const q=forkProgramQueueState(program);if(!q)return;
      const before=q.entries.length;
       

      const next=forkQueueSkip(q,uid,localIsoDate(),forkProgramLogCompletions(program));
      if(next.entries.length===before)return;
      const updated=forkWithQueue(program,next);
      if(updated&&updated!==program){workoutState.activeProgram=updated;touchProgram(updated);}
      schedulePersist();renderProgram();
    }
     



    function forkQueueUnskipFromCover(program,uid){
      const w=(program.workouts||[]).find(x=>x.uid===uid);if(!w)return;
      const q=forkProgramQueueState(program);if(!q)return;
      const before=q.entries.length;
      const next=forkQueueUnskip(q,uid,localIsoDate(),forkProgramLogCompletions(program));
      if(next.entries.length===before)return;
      const updated=forkWithQueue(program,next);
      if(updated&&updated!==program){workoutState.activeProgram=updated;touchProgram(updated);}
      schedulePersist();renderProgram();
       

    }
     
    function startProgramWorkout(program, workout, week=null) {
      requestStartWithConflict(workout.name,()=>doStartProgramWorkout(program,workout,week));
    }
     












    function forkApplyPrescriptionSets(item,templateItem,program,startWeek){
      const src=(templateItem&&templateItem.sets)||[],dst=(item&&item.sets)||[];
       














      const deloadScale=(typeof forkDeloadScaleForWeek==='function'&&program)?forkDeloadScaleForWeek(program,startWeek):null;
      let scaleW=null;
      if(deloadScale!=null){
        const prog=(program&&program.progression)||{};
        const tProf=(templateItem&&templateItem.progression)||{};
        const incType=tProf.incrementType||prog.incrementType||'lb';
        const incRaw=Number(tProf.incrementValue ?? prog.incrementValue ?? (typeof progressionSetup!=='undefined'?progressionSetup.incrementValue:undefined) ?? 5);
        let incValueLb=incType==='percent'?incRaw:((typeof isMetric==='function'&&isMetric())?incRaw/LB_TO_KG:incRaw);
         
        const gymRule=(typeof gymLoadRule==='function')?gymLoadRule(item&&item.exerciseId,tProf):null;
        let incTypeG=incType;
        if(gymRule&&gymRule.kind==='step'&&gymRule.stepLb){incTypeG='lb';incValueLb=gymRule.stepLb;}
        const snapG=v=>{const w=(typeof withGymSnap==='function')?withGymSnap(gymRule,()=>snapToIncrement(v,incTypeG,incValueLb)):snapToIncrement(v,incTypeG,incValueLb);const mx=gymRule&&gymRule.maxLb;return mx&&w>mx?mx:w;};
        scaleW=w=>{const n=Number(w);if(!(n>0))return w;const s=snapG(n*deloadScale/100);return s>0?String(s):w;};
      }
       





      let di=0;
      src.forEach((s)=>{
        const t=dst[di];if(!s||!t)return;
        const copyTo=row=>{for(const k of ['w','r','seconds','distance']){
          if(s[k]!=null&&s[k]!=='')row[k]=(k==='w'&&scaleW)?scaleW(s[k]):String(s[k]);
        }};
        copyTo(t);
        const sSide=(typeof setSide==='function')?setSide(s):null;
        const tSide=(typeof setSide==='function')?setSide(t):null;
        if(!sSide&&tSide==='L'&&dst[di+1]&&(typeof setSide==='function'?setSide(dst[di+1]):null)==='R'){copyTo(dst[di+1]);di+=2;}
        else di+=1;
      });
    }
     































    function forkApplyPercentPrescription(item,templateItem,program,startWeek){
      const prog=(program&&program.progression)||{};
      if(prog.scheme!=='onerm')return;
      const tProf=(templateItem&&templateItem.progression)||{};
      const tm=Number(tProf.trainingMax ?? tProf.manual1RM)||0;
      if(!(tm>0))return;
      const ex=(typeof resolveExercise==='function')?resolveExercise(item.exerciseId):null;
      const tracking=(typeof exerciseTracking==='function')?exerciseTracking(item,ex):'reps';
      if(tracking==='time'||tracking==='distance')return;
      const incType=tProf.incrementType||prog.incrementType||'lb';
      const incRaw=Number(tProf.incrementValue ?? prog.incrementValue ?? (typeof progressionSetup!=='undefined'?progressionSetup.incrementValue:undefined) ?? 5);
      let incValueLb=incType==='percent'?incRaw:((typeof isMetric==='function'&&isMetric())?incRaw/LB_TO_KG:incRaw);
       

      const gymRule=(typeof gymLoadRule==='function')?gymLoadRule(item.exerciseId,tProf):null;
      let incTypeG=incType;
      if(gymRule&&gymRule.kind==='step'&&gymRule.stepLb){incTypeG='lb';incValueLb=gymRule.stepLb;}
       


      const deloadScale=(typeof forkDeloadScaleForWeek==='function')?forkDeloadScaleForWeek(program,startWeek):null;
      const src=(templateItem&&templateItem.sets)||[],dst=(item&&item.sets)||[];
       

      let di=0;
      src.forEach((s)=>{
        const t=dst[di];if(!s||!t)return;
        const stamp=row=>{
          if(row.w!=null&&row.w!=='')return;  
           




          if(s.w!=null&&s.w!=='')return;
          const ownPct=pctValueOrNull(s.pct);
          if(ownPct==null&&(typeof isWarmupSet==='function'&&isWarmupSet(s)))return;
          const pct=ownPct!=null?ownPct:resolveSetPct(s,tProf,prog,startWeek);
          const snapG=v=>{const w=(typeof withGymSnap==='function')?withGymSnap(gymRule,()=>snapToIncrement(v,incTypeG,incValueLb)):snapToIncrement(v,incTypeG,incValueLb);const mx=gymRule&&gymRule.maxLb;return mx&&w>mx?mx:w;};
          let w=snapG(tm*pct/100);
          if(deloadScale!=null)w=snapG(w*deloadScale/100);
          if(w>0)row.w=String(w);
        };
        stamp(t);
        const sSide=(typeof setSide==='function')?setSide(s):null;
        const tSide=(typeof setSide==='function')?setSide(t):null;
        if(!sSide&&tSide==='L'&&dst[di+1]&&(typeof setSide==='function'?setSide(dst[di+1]):null)==='R'){stamp(dst[di+1]);di+=2;}
        else di+=1;
      });
    }
     
    function doStartProgramWorkout(program, workout, week=null) {
       







      try{ doStartProgramWorkoutInner(program,workout,week); }
      catch(err){
        console.error('doStartProgramWorkout failed',err);
        if(typeof showToast==='function')showToast('Something went wrong starting that workout.');
        if(workoutState.draft)state.workoutEditorOpen=true;
        if(typeof renderWorkoutScreen==='function')renderWorkoutScreen();
      }
    }
    function doStartProgramWorkoutInner(program, workout, week=null) {
       



      const startWeek=Number(week)||programWeek(program);
       





      const inheritedRange=programWorkoutFocusRange(program,workout,startWeek);
       



      const focusPresetKey=REP_PRESETS[inheritedRange.preset]?inheritedRange.preset:null;
      showWorkouts();
      state.workoutHistoryOpen=false;
       











      const forkShellTemplate=workout.template||{};
       



      workoutState.draft={name:workout.name||'',date:localIsoDate(),programId:program.id,programWorkoutUid:workout.uid,editingId:null,focusPreset:focusPresetKey,focusCustomRange:inheritedRange.custom?{min:inheritedRange.custom.min,max:inheritedRange.custom.max}:null,startedAt:new Date().toISOString(), progression:forkShellTemplate.progression?{...forkShellTemplate.progression}:null,exercises:(forkShellTemplate.exercises||[]).map(x=>{
         





        x=programExerciseForWeek(x,program,startWeek);
        const base=x.progression||{};
         


         






         








        const forkCustomRange=!!(base.custom&&base.min!=null);
        const progression={
          ...base,
          mode:base.mode||x.tracking||'reps',
          min:forkCustomRange?base.min:inheritedRange.min,
          max:forkCustomRange?base.max:inheritedRange.max,
          openTop:forkCustomRange?!!base.openTop:!!inheritedRange.openTop,
          amrap:forkCustomRange?!!base.amrap:!!inheritedRange.amrap,
          preset:forkCustomRange?(base.preset||inheritedRange.preset):inheritedRange.preset,
          scheme:program.progression?.scheme||'linear'
        };
        const item=cloneExerciseItem(x,'fromProgram',{tracking:x.tracking||progression.mode||'reps',noteOpen:!!x.note,progression,emptyDefault:true});
         



















        const slotLogged=typeof forkSlotLogs==='function'&&!!forkSlotLogs(x.exerciseId,program.id,workout.uid).length;
        if(!slotLogged){forkApplyPrescriptionSets(item,x,program,startWeek);forkApplyPercentPrescription(item,x,program,startWeek);}
        else forkApplyPercentPrescription(item,x,program,startWeek);
        return item;
      })};
      const progressionContext={...program.progression,currentWeek:startWeek};
      prepareDraftProgression(workoutState.draft,progressionContext);
       


       





      schedulePersist();
      state.workoutEditorOpen = true;  
      renderWorkoutScreen();
    }
     







     
    function renderProgram() {
      const program = workoutState.activeProgram;
      const editing=$('#createProgram').dataset.editing==='true'&&!!program;
       

















      const forkArchiveRow=$('#programArchiveRow');if(forkArchiveRow)forkArchiveRow.hidden=true;
      $('#programSetup').hidden = !!program && !editing;
       


      const saveLibBtn=$('#saveProgramToLibrary');if(saveLibBtn)saveLibBtn.hidden=editing;
      $('#programCover').hidden = !program || editing;
       



      renderProgramFormSections();
      renderArchivedPrograms();
      renderSavedPrograms();
       



      const savedPreview=(workoutState.savedPrograms||[]).find(p=>p.id===state.savedProgramPreviewId);
      if(state.savedProgramPreviewId&&!savedPreview)state.savedProgramPreviewId=null;
      if (!program&&!savedPreview) {
        state.programWorkoutUid=null;
         



        const emptyHost=$('#programEmpty');
        if(state.programSetupOpen){
          const setup=$('#programSetup');
          if(emptyHost)emptyHost.hidden=true;
          setup.hidden=false;
           




          if(!programDraftProgression)seedProgramForm(null); else syncProgramForm();
          state.programSetupOpen=false;
          updateTopBar('program');return;
        }
        if(emptyHost){
          emptyHost.hidden=false;
          emptyHost.innerHTML=emptyStateHtml({
            title:'No active program',
            description:'A program lays out your workouts across weeks and shows what is next.',
            primaryHtml:emptyStatePrimary('programEmptyCreate','Create a program'),
            secondaryHtml:emptyStateSecondary('programEmptyGuide','How programs work')
          });
          $('#programEmptyCreate')?.addEventListener('click',()=>{
             


            state.programSetupOpen=true;renderProgram();
            $('#programSetup')?.scrollIntoView({behavior:'smooth',block:'start'});
          });
          $('#programEmptyGuide')?.addEventListener('click',()=>{
            window.open('https://cruciferousgreens.com/getting-started','_blank','noopener');
          });
        }
        $('#programSetup').hidden=true;
        if(!programDraftProgression)seedProgramForm(null); else syncProgramForm();
        updateTopBar('program');return;
      }
       


      const emptyHost=$('#programEmpty');if(emptyHost)emptyHost.hidden=true;
       





      if(state.programSetupOpen&&!editing){
        state.programSetupOpen=false;
        $('#programSetup').hidden=false;
        $('#programCover').hidden=true;
        if(!programDraftProgression)seedProgramForm(null); else syncProgramForm();
        updateTopBar('program');return;
      }
       


      if(state.programWorkoutUid){
        const owner=savedPreview||program;
        const pw=owner?.workouts.find(w=>w.uid===state.programWorkoutUid);
        if(pw){renderProgramWorkoutPage(owner,pw,{readOnly:!!savedPreview});return;}
        state.programWorkoutUid=null;
      }
      if(savedPreview){renderSavedProgramPreview(savedPreview);return;}
      const week=programWeek(program);
       













       










      const forkDeloadThisWeek=typeof forkIsDeloadWeek==='function'&&forkIsDeloadWeek(program,week);
       





      const forkProgCoverValues=(typeof forkResolveProgValues==='function')?forkResolveProgValues(program.progression||null,null):null;
      const forkAnyWorkoutProgDiffers=!!(forkProgCoverValues&&(program.workouts||[]).some(w=>{
        const wp=w?.template?.progression;
        if(!wp||!Object.keys(wp).length||typeof forkResolveProgValues!=='function'||typeof forkProgValuesDiffer!=='function')return false;
        return forkProgValuesDiffer(forkResolveProgValues(wp,program.progression||null),forkProgCoverValues);
      }));
      const forkProgramGovernHtml=forkAnyWorkoutProgDiffers?`<p class="fork-prog-govern">Program settings apply: ${escapeHtml(forkProgressionSummaryText(forkProgCoverValues))}. Some workouts in this program have their own progression settings, which differ.</p>`:'';
      const muscleRows=programMuscles(program),muscleMax=Math.max(1,...muscleRows.map(([,count])=>count));
       




      const forkCompleted=forkProgramCompleted(program);
       














      const forkCoverDeloadButtonHtml=`<div class="fork-deload-cta"><button class="primary-button fork-program-deload-btn${forkDeloadThisWeek?' is-on':''}" id="${forkDeloadThisWeek?'forkCancelDeloadBtn':'forkDeloadBtn'}" type="button" aria-pressed="${forkDeloadThisWeek}">${forkDeloadThisWeek?'Cancel deload':'Deload this week'}</button></div>`;  
       






















      const forkCoverSegment=(state.programSegment==='program'||state.programSegment==='muscles')?'program':'train';
      const forkSegmentButton=(id,label)=>`<button type="button" data-program-segment="${id}" aria-pressed="${String(forkCoverSegment===id)}">${label}</button>`;
      const forkSegmentsHtml=`<div class="mini-segmented program-segments" role="group" aria-label="Program sections">${forkSegmentButton('train','Train')}${forkSegmentButton('program','Program')}</div>`;
       



      const forkCoverActionsHtml=`<div class="program-cover-actions"><button class="secondary-button" data-cover-action="edit" type="button">Edit program</button><button class="secondary-button" data-cover-action="share" type="button">Share program</button></div><div class="program-segment-archive"><button class="program-archive-link" data-cover-action="archive" type="button">Archive program</button></div>`;
      const forkPanelOpen=id=>`<div class="program-segment-panel" data-program-panel="${id}"${forkCoverSegment===id?'':' hidden'}>`;
      $('#programCover').innerHTML = `<div class="program-cover-head fork-cover-head"><div class="fork-cover-head-row"><div class="program-cover-kicker">ACTIVE PROGRAM &nbsp;<span class="sub">WEEK ${week} OF ${program.length}</span></div>${ ''}</div><h2>${escapeHtml(program.name)}</h2>${program.schedule?`<p class="program-cover-meta">${escapeHtml(program.schedule)} (${program.workouts.length} session${program.workouts.length===1?'':'s'} per week)</p>`:''}</div><div class="program-body">${forkSegmentsHtml}${forkPanelOpen('train')}<div class="program-progress"><span>${program.workouts.length} workout${program.workouts.length === 1 ? '' : 's'} in rotation</span><span class="fork-progress-right">${forkProgramWeekCountHtml(program,week)}</span></div><div class="week-progress" style="--program-weeks:${program.length}" aria-label="${forkCompleted?`Program complete, ${program.length} of ${program.length} weeks`:`Week ${week} of ${program.length}`}">${Array.from({length:program.length},(_,i)=>`<span class="week-segment ${forkCompleted?'past':i+1<week?'past':i+1===week?'current':''}${isDeloadWeek(program,i+1)?' deload':''}"></span>`).join('')}</div>${ ''}${forkCompleted?forkProgramCompleteCardHtml(program,forkCompleted):forkProgramQueueCardsHtml(program,week)}${ ''}<hr class="fork-cover-rule"><div class="workout-toolbar"><h2>Workouts</h2><button class="exercise-info-button plain-glyph" id="addProgramWorkoutBtn" type="button" aria-label="Add workout"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div><div class="program-workouts" id="programWorkouts">${forkProgramWorkoutsRowsHtml(program,week)}</div><button class="new-template-button" id="addSavedToProgramBtn" type="button">+ Add saved workout</button>${ ''}<hr class="fork-cover-rule">${forkCoverActionsHtml}</div>${forkPanelOpen('program')}${ ''}<details class="program-progression-summary program-progression-disclosure" open><summary class="progression-disclosure-summary"><h3>Progression engine</h3></summary><div class="program-progression-meta">${(progressionSetup.progressionOff||program.progression?.progressionOff)?'<span class="tag">Progression off</span>':(`${(program.progression?.scheme||'linear')==='linear'?'<span class="tag">Linear progression</span>':program.progression?.scheme==='onerm'?'<span class="tag">%1RM-based</span>':`<span class="tag">Top set ≤ RPE ${escapeHtml(String(program.progression?.threshold??8))}</span>`}${program.progression?.scheme==='onerm'?'':`<span class="tag">${escapeHtml(program.progression?.incrementType==='percent'?(String(program.progression.incrementValue)+'%'):(String(program.progression?.incrementValue??5)+' '+weightUnit()))} ${(program.progression?.scheme||'linear')==='linear'?'every session':'default jump'}</span>`}<span class="tag">${escapeHtml(titleCase(program.progression?.defaultRange?.preset||'hypertrophy'))} (${escapeHtml(programRangeLabel(program.progression?.defaultRange))})</span>${normalizeCycleLength(program.progression)>0?'<span class="tag">Varies by week</span>':''}${program.progression?.pctWave&&program.progression?.weeklyPcts?.length?'<span class="tag">% varies by week</span>':''}`)}</div>${forkProgramGovernHtml}</details>${forkCoverDeloadButtonHtml}<hr class="fork-cover-rule">${forkProgramStatsHtml(program)}${forkProgressionHistoryHtml(program)}${programMuscleSectionHtml(muscleRows,muscleMax)}${ ''}${ ''}${forkCoverActionsHtml}</div></div>`;
       

















       





       




      document.querySelectorAll('#programCover [data-cover-action="edit"]').forEach(b=>b.addEventListener('click',editActiveProgram));
       


      document.querySelectorAll('#programCover [data-cover-action="share"]').forEach(b=>b.addEventListener('click',shareActiveProgram));
       




      document.querySelectorAll('[data-fork-next-start]').forEach(b=>b.addEventListener('click',()=>{const w=program.workouts.find(x=>x.uid===b.dataset.forkNextStart);if(w)startProgramWorkout(program,w);}));
       






      document.querySelectorAll('[data-fork-queue-skip]').forEach(b=>b.addEventListener('click',()=>forkQueueSkipFromCover(program,b.dataset.forkQueueSkip)));
      document.querySelectorAll('[data-fork-queue-unskip]').forEach(b=>b.addEventListener('click',()=>forkQueueUnskipFromCover(program,b.dataset.forkQueueUnskip)));
       




       















      $('#forkDeloadBtn')?.addEventListener('click',forkDeloadActiveProgramWeek);
      $('#forkCancelDeloadBtn')?.addEventListener('click',forkCancelDeloadActiveProgramWeek);
       



      document.querySelectorAll('[data-fork-restart-program]').forEach(b=>b.addEventListener('click',forkRestartActiveProgram));
       

      document.querySelectorAll('.delete-program-workout').forEach(button => button.addEventListener('click', () => confirmDeleteProgramWorkout(button.dataset.uid)));
      document.querySelectorAll('[data-del-program-workout]').forEach(button => button.addEventListener('click', () => confirmDeleteProgramWorkout(button.dataset.delProgramWorkout)));
      document.querySelectorAll('[data-program-workout]').forEach(b=>b.addEventListener('click',()=>openProgramWorkoutPage(b.dataset.programWorkout)));
      $('#addProgramWorkoutBtn').addEventListener('click', addProgramWorkout);
      $('#addSavedToProgramBtn')?.addEventListener('click', openAddSavedToProgram);
       



      document.querySelectorAll('#programCover [data-program-segment]').forEach(b=>b.addEventListener('click',()=>{
        state.programSegment=b.dataset.programSegment;
        document.querySelectorAll('#programCover [data-program-segment]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
        document.querySelectorAll('#programCover [data-program-panel]').forEach(pn=>{pn.hidden=pn.dataset.programPanel!==state.programSegment;});
      }));
       

      hydrateBodyMaps();
     




    function promoteProgramShellsToTemplates(program,templates){
      (program.workouts||[]).forEach(w=>{
        if(w.sourceTemplateId&&(templates||[]).some(t=>t.id===w.sourceTemplateId))return;
         


        const template={id:newTemplateId(),name:w.name||'Untitled',exercises:cloneTemplateExercises(w.template?.exercises||[]),focusKey:w.template?.focusKey||null,focusCustom:w.template?.focusCustom?{min:w.template.focusCustom.min,max:w.template.focusCustom.max}:null};
        templates.unshift(template);
        w.sourceTemplateId=template.id;
      });
    }
       



      const forkArchiveActiveProgram=() => {promoteProgramShellsToTemplates(program,workoutState.templates);program.archivedAt=localIsoDate();touchProgram(program);workoutState.archivedPrograms.unshift(program);workoutState.activeProgram=null;programDraftProgression=null;$('#programName').value='';$('#programFocus').value='';state.programSetupOpen=false;schedulePersist();renderProgram();renderDashboard();};
      document.querySelectorAll('#programCover [data-cover-action="archive"]').forEach(b=>b.addEventListener('click',forkArchiveActiveProgram));
      $('#forkCompleteArchiveBtn')?.addEventListener('click', forkArchiveActiveProgram);
       

      if(typeof swipeDeleteSetsEnabled==='function'?swipeDeleteSetsEnabled():true)attachSwipeDelete($('#programWorkouts'));
      updateTopBar('program');
    }

     





    function addProgramWorkout() {
      if (!workoutState.activeProgram) return;
      startSavedBuilder({newProgramWorkout:true});
    }

     













     
    function openProgramWorkoutPage(uid){
      const program=workoutState.activeProgram;
      if(!program?.workouts.some(w=>w.uid===uid))return;
      state.programWorkoutUid=uid;
       



      showProgram(false);
      window.scrollTo({top:0});
    }
     










    function openProgramWorkoutFromSavedList(programId,uid){
      const active=workoutState.activeProgram;
      if(active&&programId!=null&&active.id===programId){openProgramWorkoutPage(uid);return;}
      const saved=(workoutState.savedPrograms||[]).find(p=>p.id===programId);
      if(saved&&(saved.workouts||[]).some(w=>w.uid===uid)){
        state.savedProgramPreviewId=saved.id;state.programWorkoutUid=uid;
        showProgram(false);window.scrollTo({top:0});return;
      }
      showProgram(false);window.scrollTo({top:0});
    }
     
    function renderProgramWorkoutPage(program,workout,opts={}){
      const readOnly=!!opts.readOnly;  
      const cover=$('#programCover');if(!cover)return;
      $('#programSetup').hidden=true;cover.hidden=false;
      const rows=workout.template?.exercises||[];
      const muscles=[...new Set(rows.flatMap(item=>{const ex=resolveExercise(item.exerciseId);return [...(ex?.primary||[]),...(ex?.secondary||[])];}))];
      const totalSets=rows.reduce((n,item)=>n+(typeof sessionSetCount==='function'?sessionSetCount(item):(item.sets||[]).length),0);  
       




      const focus=rows.length?programWorkoutFocusRange(program,workout,programWeek(program)):null;
      const focusLabel=focus?programRangeLabel(focus):'';
      const rangeMix=focus&&typeof workoutRangeMix==='function'?workoutRangeMix(rows,focus):null;
       



      const chipLabel=rangeMix&&!rangeMix.mixed&&rangeMix.unanimousOwnProfile?programRangeLabel(rangeMix.unanimousOwnProfile):focusLabel;
      const focusChip=!focus?'':rangeMix?.mixed?`<button type="button" class="tag mixed-chip" id="programMixedChip">Focus: ${focusLabel} (Mixed)</button>`:`<span class="tag" role="listitem">Focus: ${chipLabel}</span>`;
      const listRows=rows.map(item=>{const s=savedExerciseSummary(item,focus);return `<button class="picker-item saved-editor-row" type="button" data-program-exercise="${escapeHtml(item.exerciseId)}" aria-label="Open ${escapeHtml(s.name)} details"><span><strong>${escapeHtml(s.name)}</strong><span class="row-meta">${s.meta}</span></span></button>`;}).join('');  
      cover.innerHTML=`<div class="completed-card"><span class="continue-kicker">Program workout</span><div class="detail-title-row"><h2>${escapeHtml(workout.name)}</h2><span class="title-actions"><button class="icon-button" id="shareProgramWorkoutBtn" type="button" aria-label="Share ${escapeHtml(workout.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.5v-11"/><path d="M7.6 7.4L12 3l4.4 4.4"/><path d="M6 11.5V19a1.6 1.6 0 0 0 1.6 1.6h8.8A1.6 1.6 0 0 0 18 19v-7.5"/></svg></button>${ ''}${readOnly?'':`<button class="primary-button" id="startProgramWorkoutBtn" type="button">Start</button>`}</span></div><div class="meta-chips" role="list" aria-label="Workout summary"><span class="tag" role="listitem">${rows.length} exercise${rows.length===1?'':'s'}</span><span class="tag" role="listitem">${totalSets} set${totalSets===1?'':'s'}</span>${focusChip}</div>

      ${muscles.length?`<div class="section-head"><h3>Muscles worked</h3></div>${workedMuscleMapBlockHtml(workoutBodyMapMarkup(muscles),templateMuscleSetCounts(rows),null,{blindSpots:false})}`:''}
      <div class="section-head"><h3>Exercises</h3></div>${listRows||`<p class="section-note">${readOnly?'No exercises in this workout.':'No exercises yet. Tap Edit to build this workout.'}</p>`}
      ${readOnly?'':`<div class="detail-action-buttons"><div class="detail-action-row"><button class="secondary-button" id="editProgramWorkoutBtn" type="button">Edit</button><button class="secondary-button" id="duplicateProgramWorkoutBtn" type="button">Duplicate</button></div>
      <button class="new-template-button neutral" id="archiveProgramWorkoutBtn" type="button">Archive</button>
      <button class="template-delete-text" id="deleteProgramWorkoutBtn" type="button">delete workout</button></div>`}</div>`;
      hydrateBodyMaps();
      $('#startProgramWorkoutBtn')?.addEventListener('click',()=>startProgramWorkout(program,workout));
      $('#programMixedChip')?.addEventListener('click',()=>{if(typeof openRangeMixDialog==='function')openRangeMixDialog(rows,focus,focusLabel);});
       

      document.querySelectorAll('[data-program-exercise]').forEach(b=>b.addEventListener('click',()=>openExercise(b.dataset.programExercise,true,makeReturnRoute(ROUTES.VIEW.PROGRAM))));
       

      $('#shareProgramWorkoutBtn')?.addEventListener('click',()=>shareTemplateLike(workout.name,workout.template?.exercises||[]));
      $('#editProgramWorkoutBtn')?.addEventListener('click',()=>{startSavedBuilder({programUid:workout.uid});});
       


      $('#duplicateProgramWorkoutBtn')?.addEventListener('click',()=>duplicateProgramWorkout(program,workout));
      $('#archiveProgramWorkoutBtn')?.addEventListener('click',()=>archiveProgramWorkout(program,workout));
      $('#deleteProgramWorkoutBtn')?.addEventListener('click',()=>{
        pendingDeleteProgramWorkoutUid=workout.uid;
        pendingDeleteProgramWorkoutProgramId=null;  
        $('#deleteProgramWorkoutDesc').textContent=`Delete "${workout.name}" from your program? This cannot be undone.`;
        showModalPinned($('#deleteProgramWorkoutDialog'));
      });
      updateTopBar('program');
    }
     






    function duplicateProgramWorkout(program,workout){
      if(!program||!workout)return;
      const copy={
        uid:newProgramWorkoutUid(),
        name:`${workout.name||'Untitled'} copy`,
        sourceWorkoutId:null,
        sourceTemplateId:null,
        template:{name:workout.template?.name||workout.name||'Untitled',
          exercises:cloneTemplateExercises(workout.template?.exercises||[]),
           



          focusKey:workout.template?.focusKey||null,
          focusCustom:workout.template?.focusCustom?{min:workout.template.focusCustom.min,max:workout.template.focusCustom.max}:null},
      };
      program.workouts.push(copy);
      if(typeof touchProgram==='function')touchProgram(program);  
      schedulePersist();
       

      renderProgramWorkoutPage(program,copy);
    }
     



    function archiveProgramWorkout(program,workout){
      if(!program||!workout)return;
      const liveTemplateIds=new Set((workoutState.templates||[]).filter(t=>!t.archivedAt).map(t=>t.id));
      if(!(workout.sourceTemplateId&&liveTemplateIds.has(workout.sourceTemplateId))){
        workoutState.templates.unshift({id:newTemplateId(),name:workout.name||'Untitled',
          exercises:cloneTemplateExercises(workout.template?.exercises||[]),
           

          focusKey:workout.template?.focusKey||null,
          focusCustom:workout.template?.focusCustom?{min:workout.template.focusCustom.min,max:workout.template.focusCustom.max}:null});
      }
      program.workouts=program.workouts.filter(w=>w.uid!==workout.uid);
      if(typeof touchProgram==='function')touchProgram(program);  
      if(state.programWorkoutUid===workout.uid)state.programWorkoutUid=null;
      schedulePersist();renderProgram();
      if(typeof renderWorkoutTemplateList==='function')renderWorkoutTemplateList();
      showToast(`Archived "${workout.name}" to saved workouts.`);
    }
     


     



    let addToProgramTab='saved';
     




    function openAddSavedToProgram(){
      const program=workoutState.activeProgram;if(!program)return;
      addToProgramTab='saved';
       








      const addSelection={saved:new Set(),past:new Set()};
       




      const shellFromSaved=t=>({uid:newProgramWorkoutUid(),name:t.name,sourceTemplateId:t.id,template:{name:t.name,exercises:cloneTemplateExercises(t.exercises||[]),focusKey:t.focusKey||null,focusCustom:t.focusCustom?{min:t.focusCustom.min,max:t.focusCustom.max}:null}});
       





      const shellFromPast=w=>({uid:newProgramWorkoutUid(),name:w.name||'Workout',sourceWorkoutId:w.id,template:{name:w.name||'Workout',exercises:templateExercisesFromCompleted(w),focusKey:(w.focusPreset&&REP_PRESETS[w.focusPreset])?w.focusPreset:null}});
      const addShellsToProgram=shells=>{
         




        const live=workoutState.activeProgram;
        if(!live){$('#addSavedToProgramDialog').close();showToast('No active program. The workout was not added.','error');return;}
        shells.forEach(shell=>live.workouts.push(shell));
        touchProgram(live);
        schedulePersist();
         


        const sx=window.scrollX,sy=window.scrollY;
        $('#addSavedToProgramDialog').close();
        state.programWorkoutUid=null;
        renderProgram();
        window.scrollTo(sx,sy);
         

      };
      const syncAddFooter=()=>{
        const n=addSelection.saved.size+addSelection.past.size;
        const footer=$('#addSavedToProgramFooter');if(footer)footer.hidden=n===0;
        const confirm=$('#confirmAddToProgram');if(confirm)confirm.textContent=`Add ${n} workout${n===1?'':'s'}`;
      };
       

      const toggleAddSelection=(tab,id,btn)=>{
        const set=addSelection[tab];
        if(set.has(id))set.delete(id);else set.add(id);
        const on=set.has(id);
        btn.setAttribute('aria-pressed',String(on));
        const stateEl=btn.querySelector('.picker-state');if(stateEl)stateEl.textContent=on?'✓':'+';
        syncAddFooter();
      };
      const renderList=()=>{
        const host=$('#addSavedToProgramList');if(!host)return;
        $('#addToProgramTabSaved')?.setAttribute('aria-pressed',String(addToProgramTab==='saved'));
        $('#addToProgramTabPast')?.setAttribute('aria-pressed',String(addToProgramTab==='past'));
        if(addToProgramTab==='past'){
          const past=(workoutState.completed||[]).slice().sort(sortByRecencyDesc);
          host.innerHTML=past.length?past.map(w=>{const n=(w.exercises||[]).length;const on=addSelection.past.has(w.id);return `<button class="picker-item" type="button" data-add-past="${escapeHtml(w.id)}" aria-pressed="${on}"><span><strong>${escapeHtml(w.name||'Workout')}</strong><span class="row-meta"><span class="m-ink">${escapeHtml(formatLogDate(w.date))}</span><span class="fact">${n} exercise${n===1?'':'s'}</span></span></span><span class="picker-state">${on?'✓':'+'}</span></button>`;}).join(''):'<div class="dialog-empty">No past workouts yet.</div>';
          host.querySelectorAll('[data-add-past]').forEach(b=>b.addEventListener('click',()=>toggleAddSelection('past',b.dataset.addPast,b)));
          return;
        }
        const live=(workoutState.templates||[]).filter(t=>!t.archivedAt);
        host.innerHTML=live.length?live.map(t=>{const on=addSelection.saved.has(t.id);return `<button class="picker-item" type="button" data-add-saved="${escapeHtml(t.id)}" aria-pressed="${on}"><span><strong>${escapeHtml(t.name)}</strong><span class="row-meta"><span class="m-ink">${t.exercises.length} exercise${t.exercises.length===1?'':'s'}</span>${workoutNamesMeta(t.exercises)?`<span class="fact">${escapeHtml(workoutNamesMeta(t.exercises))}</span>`:''}${t.builtIn?' <span class="built-in-label">Built-in</span>':''}</span></span><span class="picker-state">${on?'✓':'+'}</span></button>`;}).join(''):'<div class="dialog-empty">No saved workouts yet.</div>';  
        host.querySelectorAll('[data-add-saved]').forEach(b=>b.addEventListener('click',()=>toggleAddSelection('saved',b.dataset.addSaved,b)));
      };
      $('#confirmAddToProgram').onclick=()=>{
         


        const shells=[];
        (workoutState.templates||[]).filter(t=>!t.archivedAt).forEach(t=>{if(addSelection.saved.has(t.id))shells.push(shellFromSaved(t));});
        (workoutState.completed||[]).slice().sort(sortByRecencyDesc).forEach(w=>{if(addSelection.past.has(w.id))shells.push(shellFromPast(w));});
        if(!shells.length)return;
        addShellsToProgram(shells);
      };
      $('#clearAddToProgramSelection').onclick=()=>{addSelection.saved.clear();addSelection.past.clear();renderList();syncAddFooter();};
      $('#addToProgramTabSaved').onclick=()=>{addToProgramTab='saved';renderList();};
      $('#addToProgramTabPast').onclick=()=>{addToProgramTab='past';renderList();};
      renderList();
      syncAddFooter();
      $('#addSavedToProgramDialog').showModal();
    }

     


    function programFormValues(){
       


      const name = clampNameLength($('#programName').value.trim());
      const length = Number($('#programLength').value);
      if (!name || !Number.isInteger(length) || length < 1 || length > 52) {
        $('#programError').textContent = 'Add a program name and a length from 1 to 52 weeks.';
        return null;
      }
       

      return {name, length, startWeek:1, focus:$('#programFocus').value.trim(), progression:cloneProgression(programFormProgression())};
    }
     
    function createProgram() {
      const vals=programFormValues();if(!vals)return;
      const {name,length,startWeek,focus,progression}=vals;
      if($('#createProgram').dataset.editing==='true'&&workoutState.activeProgram){Object.assign(workoutState.activeProgram,{name,length,startWeek,focus,progression});touchProgram(workoutState.activeProgram);delete $('#createProgram').dataset.editing;$('#createProgram').textContent='Create active program';$('#programSetupTitle').textContent='Create your active program.';}
       











      else { if(workoutState.activeProgram)parkActiveProgramToSaved(); workoutState.activeProgram = touchProgram({id:newProgramId(), name, length, startWeek, focus, workouts:[], startedAt:localIsoDate(), progression}); }
      programDraftProgression=null;programEditSnapshot=null;
      $('#programError').textContent = '';
      schedulePersist(); renderProgram();renderDashboard();
    }
     












    function saveProgramToLibrary(){
      const vals=programFormValues();if(!vals)return;
      const {name,length,startWeek,focus,progression}=vals;
       


      const program=touchProgram({id:newProgramId(), name, length, startWeek, focus, workouts:[], startedAt:localIsoDate(), savedAt:localIsoDate(), progression});
      const saved=workoutState.savedPrograms||(workoutState.savedPrograms=[]);
      saved.unshift(program);
      programDraftProgression=null;programEditSnapshot=null;
      $('#programError').textContent = '';
      schedulePersist();renderProgram();renderDashboard();
    }
     
    function editActiveProgram(){
      const program=workoutState.activeProgram;if(!program)return;
      state.programWorkoutUid=null;
      $('#programName').value=program.name;$('#programLength').value=program.length;$('#programFocus').value=program.focus||'';
      seedProgramForm(program);
      $('#createProgram').dataset.editing='true';$('#createProgram').textContent='Save program changes';$('#programSetupTitle').textContent='Edit your active program.';$('#programSetup').hidden=false;$('#programCover').hidden=true;$('#programSetup').scrollIntoView({behavior:'smooth',block:'start'});
       

      programEditSnapshot=JSON.stringify({name:program.name,length:program.length,focus:program.focus||'',progression:programFormProgression()});
       


      renderProgramFormSections();
      updateTopBar('program');
    }
     
    function programFormDirty(){
      if($('#createProgram')?.dataset.editing!=='true'||!programEditSnapshot)return false;
      const cur={name:$('#programName').value,length:Number($('#programLength').value),focus:$('#programFocus').value,progression:programFormProgression()};
      return JSON.stringify(cur)!==programEditSnapshot;
    }
     
    function cancelProgramEdit(){
       



      programDraftProgression=null;
      programEditSnapshot=null;
      delete $('#createProgram').dataset.editing;$('#createProgram').textContent='Create active program';$('#programSetupTitle').textContent='Create your active program.';
      renderProgram();
    }
     
    function requestCancelProgramEdit(){
      if(programFormDirty())showModalPinned($('#discardProgramChangesDialog'));
      else cancelProgramEdit();
    }

    
//# sourceMappingURL=programs.js.map
