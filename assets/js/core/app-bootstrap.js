
 
     






     
     




    (function(){
      var touch=false;
      try{touch=!!(window.matchMedia&&window.matchMedia('(pointer: coarse)').matches);}catch(_){}
      if(!touch)return;
      document.documentElement.classList.add('is-touch');
       

      var standalone=false;
      try{standalone=(window.navigator&&window.navigator.standalone===true)||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);}catch(_){}
      if(standalone)document.documentElement.classList.add('is-standalone');
      var vp=document.querySelector('meta[name="viewport"]');
      if(vp)vp.setAttribute('content','width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
       


      document.addEventListener('gesturestart',function(e){e.preventDefault();},{passive:false});
    })();
     







    let swipeToDeleteSets=true;
     


    let desktopLayout=false;
     











    const themeState={name:'cruciferous',dark:false,darkFlavor:'mocha',lightName:'cruciferous',followSystem:true};
    const ROSEPINE='rosepine', DARK_FLAVORS=['macchiato','mocha'], LIGHT_THEMES=['cruciferous','rosepine'];
     

    function osPrefersDark(){
      try{return !!(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);}catch(_){return false;}
    }
     

    function themeEffectiveDark(){return themeState.followSystem?osPrefersDark():themeState.dark;}
     




    function themeEffectiveName(){
      const t=themeState;let name=t.name;
      if(t.followSystem){
        const dark=themeEffectiveDark();
        if(dark&&name==='cruciferous')name='macchiato';
        else if(dark&&name===ROSEPINE)name='mocha';
        else if(!dark&&name==='macchiato')name='cruciferous';
        else if(!dark&&name==='mocha')name=ROSEPINE;
      }
      return name;
    }
     



    function themeTakeExplicit(){
      const t=themeState;
      if(!t.followSystem)return;
      t.dark=themeEffectiveDark();t.name=themeEffectiveName();t.followSystem=false;
    }
     

    function syncThemeModePills(){
      const t=themeState;
      document.querySelectorAll('#themeModePills [data-theme-mode]').forEach(button=>{
        const mode=button.dataset.themeMode;
        const pressed=mode==='system'?t.followSystem:(mode==='dark'?!t.followSystem&&t.dark:!t.followSystem&&!t.dark);
        button.setAttribute('aria-pressed',String(pressed));
      });
    }
     


    function applyTheme(){
      const t=themeState, dark=themeEffectiveDark(), effName=themeEffectiveName(), eff=effName==='cruciferous'?(dark?'macchiato':'light'):effName;
      document.documentElement.dataset.theme=eff;
      const toggle=$('#darkModeToggle');
      if(toggle){toggle.setAttribute('aria-pressed',String(dark));toggle.setAttribute('aria-label',`Dark mode ${dark?'on':'off'}`);}
      document.querySelectorAll('#themePills [data-theme-name]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeName===t.name)));
      syncThemeModePills();
      const color=getComputedStyle(document.documentElement).getPropertyValue('--theme-color').trim();document.querySelector('meta[name="theme-color"]').setAttribute('content',color);document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]').setAttribute('content',dark?'black-translucent':'default');
       





      try{localStorage.setItem('workout-theme',dark?'dark':'light');localStorage.setItem('workout-theme-name',t.name);localStorage.setItem('workout-theme-light',t.lightName);localStorage.setItem('workout-theme-mode',t.followSystem?'system':'manual');}catch(_){}
       
      if(typeof schedulePersist==='function')schedulePersist();
    }
     




    function getAppearanceState(){return {themeName:themeState.name,darkMode:themeState.dark,ctpDark:themeState.darkFlavor,lightTheme:themeState.lightName,followSystem:themeState.followSystem,swipeToDeleteSets:swipeToDeleteSets,desktopLayout:desktopLayout};}
     
    function setAppearanceState(v){
      if(!v||typeof v!=='object')return;
      if(!['cruciferous','rosepine','macchiato','mocha'].includes(v.themeName))return;
      if(typeof v.darkMode!=='boolean')return;
      if(!DARK_FLAVORS.includes(v.ctpDark)||!LIGHT_THEMES.includes(v.lightTheme))return;
      themeState.name=v.themeName;themeState.dark=v.darkMode;themeState.darkFlavor=v.ctpDark;themeState.lightName=v.lightTheme;
       



      themeState.followSystem=typeof v.followSystem==='boolean'?v.followSystem:false;
      if(typeof v.swipeToDeleteSets==='boolean')swipeToDeleteSets=v.swipeToDeleteSets;
      if(typeof v.desktopLayout==='boolean')desktopLayout=v.desktopLayout;
      applyTheme();applySwipeSets();applyDesktopLayout();
    }
     


    function applySwipeSets(){
      document.documentElement.classList.toggle('swipe-sets',swipeToDeleteSets);
      const toggle=$('#swipeDeleteSetsToggle');
      if(toggle){toggle.setAttribute('aria-pressed',String(swipeToDeleteSets));toggle.setAttribute('aria-label',`Swipe to delete ${swipeToDeleteSets?'on':'off'}`);}
    }
     
    function swipeDeleteSetsEnabled(){return swipeToDeleteSets&&document.documentElement.classList.contains('is-touch');}
     







    const DESKTOP_MIN_WIDTH=900;
     
    function desktopViewport(){
      try{
        if(typeof window==='undefined'||!window.matchMedia)return true;
        return window.matchMedia('(min-width: '+DESKTOP_MIN_WIDTH+'px)').matches;
      }catch(_){return true;}
    }
     
    function applyDesktopLayout(){
      document.body.classList.toggle('desktop',desktopLayout&&desktopViewport());
      const toggle=$('#desktopLayoutToggle');
      if(toggle){toggle.setAttribute('aria-pressed',String(desktopLayout));toggle.setAttribute('aria-label',`Desktop layout ${desktopLayout?'on':'off'}`);}
      try{localStorage.setItem('workout-desktop-layout',desktopLayout?'1':'0');}catch(_){}
    }
     

    try{
      const desktopMq=typeof window!=='undefined'&&window.matchMedia?window.matchMedia('(min-width: '+DESKTOP_MIN_WIDTH+'px)'):null;
      if(desktopMq&&typeof desktopMq.addEventListener==='function')desktopMq.addEventListener('change',applyDesktopLayout);
      else if(desktopMq&&typeof desktopMq.addListener==='function')desktopMq.addListener(applyDesktopLayout);
    }catch(_){}
     
    function setThemeName(name){
      const t=themeState;t.followSystem=false;  
      t.name=name;
      if(name===ROSEPINE){t.dark=false;t.lightName=ROSEPINE;}
       


      else if(name==='cruciferous'){t.dark=false;t.lightName='cruciferous';}
      else{   t.dark=true;t.darkFlavor=name;}
      applyTheme();
    }
     




    function workoutFocusRangeAndText(){
      const draft=workoutState.draft;
      const key=draft?.focusPreset||null;
      if(key&&REP_PRESETS[key])return {focusRange:REP_PRESETS[key],focusText:focusPresetName(REP_PRESETS[key])};
       


       



      if(draft?.focusCustomRange&&Number.isFinite(+draft.focusCustomRange.min)&&(draft.focusCustomRange.max==null||Number.isFinite(+draft.focusCustomRange.max))){
        const r={label:'Custom',min:+draft.focusCustomRange.min,max:draft.focusCustomRange.max==null?null:+draft.focusCustomRange.max};
        return {focusRange:r,focusText:r.max==null?`Custom (${r.min}+)`:`Custom (${forkRangePairText(r.min,r.max)})`};  
      }
      const focusRange=((workoutState.activeProgram?.progression||progressionSetup).defaultRange||progressionSetup.defaultRange);
      const focusText=focusPresetName({label:focusRange?.label||REP_PRESETS[focusRange?.preset]?.label||'Custom',min:focusRange?.min,max:focusRange?.max,openTop:focusRange?.openTop,amrap:focusRange?.amrap});
      return {focusRange,focusText};
    }
     



    let workoutMixedMarkerWired=false;
    function wireWorkoutMixedMarkerOnce(){
      if(workoutMixedMarkerWired)return;
      const summaryEl=document.querySelector('.workout-focus-summary');
      if(!summaryEl)return;
      workoutMixedMarkerWired=true;
      summaryEl.addEventListener('click',event=>{
        const marker=event.target?.closest?.('#workoutMixedMarker');
        if(!marker)return;
        event.stopPropagation();event.preventDefault();
        const draft=workoutState.draft;if(!draft)return;
        const {focusRange,focusText}=workoutFocusRangeAndText();
        openRangeMixDialog(draft.exercises,focusRange,focusText);
      });
    }
     





    function syncWorkoutFocusPills(){
      const key=workoutState.draft?.focusPreset||null;
      document.querySelectorAll('[data-workout-focus]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.workoutFocus===key)));
      const summary=$('#workoutFocusSummaryChoice');
      if(summary){
         




        const parts=workoutState.draft?forkFocusParts(workoutFocusRangeAndText().focusRange):{name:'Focus',range:''};
        summary.replaceChildren();
        const nameEl=document.createElement('span');nameEl.className='fork-focus-name';nameEl.textContent=parts.name;summary.appendChild(nameEl);
        if(parts.range){const rangeEl=document.createElement('span');rangeEl.className='fork-focus-range';rangeEl.textContent=parts.range;summary.appendChild(rangeEl);}
      }
       



      wireWorkoutMixedMarkerOnce();
      const summaryEl=summary?.closest?.('.workout-focus-summary')||document.querySelector('.workout-focus-summary');
      if(summaryEl){
        const draft=workoutState.draft;
        const {focusRange}=workoutFocusRangeAndText();
         



        const labelParts=forkFocusParts(focusRange);
        const spokenRange=labelParts.range?labelParts.range.replace(/–/g,' to '):'';
        summaryEl.setAttribute('aria-label',`Focus: ${labelParts.name}${spokenRange?`, ${spokenRange}`:''}`);
        const mix=draft&&typeof workoutRangeMix==='function'?workoutRangeMix(draft.exercises||[],focusRange):{mixed:false};
        let marker=summaryEl.querySelector('#workoutMixedMarker');
        if(mix.mixed){
          if(!marker){
            marker=document.createElement('button');
            marker.type='button';marker.className='mixed-marker';marker.id='workoutMixedMarker';marker.textContent='Mixed';
            summaryEl.appendChild(marker);
          }
        }else if(marker){marker.remove();}
      }
    }
     
    function syncProgramIncrementUnit(){
      const unit=$('#programIncrementUnit');
      if(unit) unit.textContent = programFormProgression().incrementType==='percent' ? '%' : weightUnit();
    }
     
    function syncSettingsIncrementUnit(){
      const unit=$('#settingsIncrementUnit');
      if(unit) unit.textContent = progressionSetup.incrementType==='percent' ? '%' : weightUnit();
      const typeOpt=$('#settingsIncrementType option[value="lb"]');
       

      if(typeOpt) typeOpt.textContent = 'Weight (lb)';
    }
     
    function syncUnitPills(){
      document.querySelectorAll('#settingsUnitPills [data-units]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.units===(progressionSetup.units||'imperial'))));
    }
     

    function syncStatsDefaultPills(){
      const def=progressionSetup.statsDefaultMetric==='sets'?'sets':'volume';
      document.querySelectorAll('#settingsStatsDefaultPills [data-stats-default]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.statsDefault===def)));
    }
     


    function syncDbEntryPills(){
      const mode=progressionSetup.dbEntry==='total'?'total':'per';
      document.querySelectorAll('#settingsDbEntryPills [data-db-entry]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.dbEntry===mode)));
    }
     


    function syncEffortPills(){
      const mode=(typeof effortMode==='function'?effortMode():'rpe');
      document.querySelectorAll('#settingsEffortPills [data-effort]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.effort===mode)));
    }
     




    function defaultSetCount(){
      return clamp(Math.round(Number(progressionSetup.defaultSetCount)||3),1,10);
    }
     
    function syncSettingsScheme(){
      const scheme=progressionSetup.scheme||'linear';
      document.querySelectorAll('#settingsSchemePills [data-scheme]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scheme===scheme)));
       


      const schemeDesc=$('#settingsSchemeDesc');
      if(schemeDesc)schemeDesc.textContent=schemeDescription(scheme);
       

      const incPair=$('#settingsIncrementValue')?.closest('.settings-pair');
      if(incPair)incPair.hidden=scheme==='onerm';
      const pctRow=$('#settingsPctRow'); if(pctRow)pctRow.hidden=scheme!=='onerm';
      syncSettingsRpeTrigger();  
    }
     

    function syncSettingsRpeTrigger(){
      const scheme=progressionSetup.scheme||'linear';
      const row=$('#settingsRpeTriggerRow');
      if(row)row.hidden=scheme!=='rpe';
      const t=progressionSetup.threshold;
      document.querySelectorAll('#settingsRpePills [data-rpe-threshold]').forEach(button=>{
        button.setAttribute('aria-pressed',String(button.dataset.rpeThreshold===String(t)));
      });
    }
     
    function syncSigninNudgeToggle(){
      const t=$('#signinNudgeToggle');if(!t)return;
      const dismissed=typeof Sync!=='undefined'&&typeof Sync.signinNudgeDismissed==='function'?Sync.signinNudgeDismissed():false;
      t.setAttribute('aria-pressed',String(!dismissed));
      t.setAttribute('aria-label',`Post-workout sign-in reminder ${dismissed?'off':'on'}`);
    }
     



    function settingsSectionKey(sec){
      try{return sec&&sec.dataset&&typeof sec.dataset.section==='string'?sec.dataset.section:'';}catch(_){return '';}
    }
     
    function wireSettingsAccordion(){
      const sections=Array.from(document.querySelectorAll('#settingsView details.settings-section'));
      sections.forEach(sec=>sec.addEventListener('toggle',()=>{
        const key=settingsSectionKey(sec);
        if(!key)return;
        try{
          if(!state.settingsSections||typeof state.settingsSections!=='object')state.settingsSections={};
          if(sec.open)state.settingsSections[key]=true;
          else delete state.settingsSections[key];
          if(typeof schedulePersist==='function')schedulePersist();
        }catch(_){}
      }));
    }
     





    function applySettingsSectionsState(){
      let saved=null;
      try{saved=state.settingsSections;}catch(_){saved=null;}
       


      document.querySelectorAll('#settingsView details.settings-section').forEach(sec=>{
        const key=settingsSectionKey(sec);
        if(!key)return;
        try{sec.open=!!(saved&&saved[key]===true);}catch(_){}
      });
    }
    wireSettingsAccordion();
     





    function wirePrivacyToggles(){
      [['subAppUpdates','appUpdates'],['subMarketing','marketing'],['subTips','tips']].forEach(([id,key])=>{
        let box=null;
        try{box=document.getElementById(id);}catch(_){}
        if(!box||box._cgPrivacyWired)return;
        box._cgPrivacyWired=true;
        box.addEventListener('change',()=>{
          try{if(typeof setSubscription==='function')setSubscription(key,box.checked);}catch(_){}
        });
      });
    }
     
    function syncPrivacyToggles(){
      [['subAppUpdates','appUpdates'],['subMarketing','marketing'],['subTips','tips']].forEach(([id,key])=>{
        let box=null;
        try{box=document.getElementById(id);}catch(_){}
        if(!box||typeof subscriptionOn!=='function')return;
        try{box.checked=subscriptionOn(key);}catch(_){}
      });
    }
    wirePrivacyToggles();
     

    try{if(typeof wireOnboardingReplay==='function')wireOnboardingReplay();}catch(_){}
     

















    const GYM_STEP_LABELS={barbell:'Barbell','e-z curl bar':'EZ bar',machine:'Machine',cable:'Cable'};
    function gymToDisplay(lb){return (typeof isMetric==='function'&&isMetric())?Math.round(lb*LB_TO_KG*100)/100:Math.round(lb*1000)/1000;}
    function gymFromDisplay(v){return (typeof isMetric==='function'&&isMetric())?v/LB_TO_KG:v;}
     




    function gymRefreshLiveSuggestions(){
      try{if(workoutState.draft&&typeof refreshProgressionAfterOptionChange==='function')refreshProgressionAfterOptionChange();}catch(_){}
    }
     


    function renderGymPickers(){
      if(typeof gymProfilesState!=='function')return;
      const st=gymProfilesState(),active=st.list.find(x=>x.id===st.activeId)||null;
      const chip=(p)=>`<button class="rep-preset" type="button" data-gym-pick="${p?escapeHtml(p.id):''}" aria-pressed="${String(p?!!(active&&active.id===p.id):!active)}">${escapeHtml(p?p.name:'Anywhere')}</button>`;
      const html=`${chip(null)}${st.list.map(chip).join('')}<button class="rep-preset" type="button" data-gym-add>+ Add</button>`;
      document.querySelectorAll('[data-gym-pick-row]').forEach(row=>{row.innerHTML=html;});
      const help=$('#gymSettingsHelp');
      if(help)help.textContent=active?`Suggestions use ${active.name}'s weights. An exercise's own Load step still wins.`:'Add a profile for each place you train, with the weights it has. Suggestions then use the weights of the place you pick.';
      const startRow=$('#gymStartRow');
      if(startRow)startRow.hidden=!st.list.length;
      const pageHelp=$('#gymPageHelp');
      if(pageHelp)pageHelp.textContent=active?`Editing ${active.name} below. Suggestions use ${active.name}'s weights.`:'Pick a place above, or add one, to set its weights.';
    }
    function gymAddProfile(){
      const cur=gymProfilesState();
      const n=cur.list.length;
      const name=n===0?'Main gym':n===1?'Home':`Gym ${n+1}`;
      const id='gym-'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
       

      cur.list.push({id,name,steps:{},maxes:{},dumbbells:[],kettlebells:[]});cur.activeId=id;
      saveGymProfilesState(cur);
    }
    function isGymEquipmentPageOpen(){
      const v=$('#settingsView');return !!(v&&v.classList.contains('gym-page-open'));
    }
    function openGymEquipmentPage(push=true){
      const view=$('#settingsView'),page=$('#gymEquipmentPage');if(!view||!page)return;
      renderGymEquipmentPage();
      view.classList.add('gym-page-open');page.hidden=false;
      window.scrollTo({top:0,behavior:'auto'});
      if(push)history.pushState({view:'settings',sub:'gym'},'','#settings');
    }
     



    function closeGymEquipmentPage(immediate=false){
      const view=$('#settingsView'),page=$('#gymEquipmentPage');
      if(!view||!page||!view.classList.contains('gym-page-open'))return;
      if(!immediate&&typeof history!=='undefined'&&history.state&&history.state.sub==='gym'){history.back();return;}
      view.classList.remove('gym-page-open');page.hidden=true;
    }
    function gymWeightNote(key,msg){
      const note=document.querySelector(`[data-gym-weight-note="${key}"]`);
      if(note)note.textContent=msg||'';
    }
     



    function gymCommitWeightEdit(input){
      const key=input.dataset.gymWeight,old=Number(input.dataset.gymWeightValue);
      const cur=gymProfilesState(),p=cur.list.find(x=>x.id===cur.activeId);if(!p)return;
      const v=Number(input.value);
      if(input.value===''||!Number.isFinite(v)||!(v>0)){input.value=gymToDisplay(old);gymWeightNote(key,'Enter a weight above 0.');return;}
      const lb=gymFromDisplay(v);
      if(Math.abs(lb-old)>1e-9&&p[key].some(x=>Math.abs(x-lb)<1e-9)){input.value=gymToDisplay(old);gymWeightNote(key,'That weight is already listed.');return;}
      p[key]=p[key].map(x=>x===old?lb:x);
      saveGymProfilesState(cur);renderGymEquipmentPage();gymRefreshLiveSuggestions();
    }
    function gymCommitNewWeight(key,input){
      const cur=gymProfilesState(),p=cur.list.find(x=>x.id===cur.activeId);if(!p)return;
      const v=Number(input.value);
      if(input.value===''||!Number.isFinite(v)||!(v>0)){gymWeightNote(key,'Enter a weight above 0.');return;}
      const lb=gymFromDisplay(v);
      if(p[key].some(x=>Math.abs(x-lb)<1e-9)){gymWeightNote(key,'That weight is already listed.');return;}
      p[key]=[...p[key],lb];
      saveGymProfilesState(cur);renderGymEquipmentPage();gymRefreshLiveSuggestions();
      const next=document.querySelector(`[data-gym-weight-new="${key}"]`);
      if(next)next.focus();
    }
    function renderGymEquipmentPage(){
      renderGymPickers();
      const card=$('#gymEditorCard'),body=$('#gymEditorBody');
      if(!card||!body||typeof gymProfilesState!=='function')return;
      const st=gymProfilesState(),active=st.list.find(x=>x.id===st.activeId)||null;
      card.hidden=!active;
      if(!active){body.innerHTML='';return;}
      const unit=typeof weightUnit==='function'?weightUnit():'lb';
      const progStep=(typeof progressionSetup!=='undefined'&&progressionSetup&&progressionSetup.incrementValue)||5;
      const cell=(attr,val,ph)=>`<input type="number" inputmode="decimal" min="0" step="0.5" ${attr} value="${val?gymToDisplay(val):''}" placeholder="${escapeHtml(String(ph))}">`;
      const rowsHtml=(key,noun)=>active[key].map(w=>`<div class="gym-weight-row"><input type="number" inputmode="decimal" min="0" step="0.5" value="${gymToDisplay(w)}" data-gym-weight="${key}" data-gym-weight-value="${w}" aria-label="${noun} weight, ${escapeHtml(unit)}"><button class="small-button" type="button" data-gym-weight-remove="${key}" data-gym-weight-value="${w}">Remove</button></div>`).join('');
      const listBlock=(key,label,noun,help)=>`<div class="settings-subsection"><span class="settings-subhead">${label}</span><div class="gym-weight-rows">${rowsHtml(key,noun)}</div><div class="gym-weight-row"><input type="number" inputmode="decimal" min="0" step="0.5" placeholder="Add a weight" data-gym-weight-new="${key}" aria-label="Add a ${noun.toLowerCase()} weight, ${escapeHtml(unit)}"><button class="small-button" type="button" data-gym-weight-add="${key}">Add</button></div><p class="field-help gym-weight-note" data-gym-weight-note="${key}" role="status"></p><p class="field-help">${help}</p></div>`;
      body.innerHTML=`
       <div class="settings-subsection"><label class="rule-field"><span>Name</span><input id="gymProfileName" type="text" maxlength="40" value="${escapeHtml(active.name)}" autocomplete="off"></label></div>
       <div class="settings-subsection"><span class="settings-subhead">Load step and heaviest (${escapeHtml(unit)})</span><div class="gym-equip-grid" role="group" aria-label="Load step and heaviest weight, ${escapeHtml(unit)}"><span></span><span class="gym-equip-colhead">Step</span><span class="gym-equip-colhead">Max</span>${GYM_STEP_EQUIPMENT.map(eq=>`<span class="gym-equip-name">${escapeHtml(GYM_STEP_LABELS[eq]||eq)}</span>${cell(`data-gym-step="${escapeHtml(eq)}" aria-label="${escapeHtml(GYM_STEP_LABELS[eq]||eq)} step"`,active.steps[eq],progStep)}${cell(`data-gym-max="${escapeHtml(eq)}" aria-label="${escapeHtml(GYM_STEP_LABELS[eq]||eq)} heaviest"`,active.maxes[eq],'—')}`).join('')}</div><p class="field-help">Step is the jump between weights; Max is the heaviest you can load. Blank uses the program's step, with no cap.</p></div>
       ${listBlock('dumbbells',`Dumbbells (${escapeHtml(unit)} per hand)`,'Dumbbell','The heaviest pair is the cap. Blank uses the program\'s step.')}
       ${listBlock('kettlebells',`Kettlebells (${escapeHtml(unit)})`,'Kettlebell','The heaviest bell is the cap. Blank uses the program\'s step.')}
       <div class="settings-subsection"><button class="small-button danger" type="button" data-gym-delete>Delete ${escapeHtml(active.name)}</button></div>`;
    }
     

    document.addEventListener('click',e=>{
      const t=e.target&&e.target.closest?e.target.closest('button'):null;if(!t)return;
      if(t.hasAttribute('data-gym-pick')){
        const cur=gymProfilesState();cur.activeId=t.dataset.gymPick||null;
        saveGymProfilesState(cur);renderGymPickers();
        if(isGymEquipmentPageOpen())renderGymEquipmentPage();
        gymRefreshLiveSuggestions();
      }else if(t.hasAttribute('data-gym-add')){
        gymAddProfile();renderGymPickers();
        if(isGymEquipmentPageOpen())renderGymEquipmentPage();
        gymRefreshLiveSuggestions();
      }else if(t.id==='openGymEquipment'){
        openGymEquipmentPage();
      }else if(t.hasAttribute('data-gym-delete')){
        const cur=gymProfilesState();cur.list=cur.list.filter(x=>x.id!==cur.activeId);cur.activeId=null;
        saveGymProfilesState(cur);renderGymEquipmentPage();gymRefreshLiveSuggestions();
      }else if(t.hasAttribute('data-gym-weight-remove')){
        const cur=gymProfilesState(),p=cur.list.find(x=>x.id===cur.activeId);if(!p)return;
        const key=t.dataset.gymWeightRemove,w=Number(t.dataset.gymWeightValue);
        p[key]=p[key].filter(x=>x!==w);
        saveGymProfilesState(cur);renderGymEquipmentPage();gymRefreshLiveSuggestions();
      }else if(t.hasAttribute('data-gym-weight-add')){
        const key=t.dataset.gymWeightAdd;
        const input=document.querySelector(`[data-gym-weight-new="${key}"]`);
        if(input)gymCommitNewWeight(key,input);
      }
    });
    document.addEventListener('change',e=>{
      const t=e.target;if(!t||!t.hasAttribute)return;
      if(t.id==='gymProfileName'){
        const cur=gymProfilesState(),p=cur.list.find(x=>x.id===cur.activeId);if(!p)return;
        const name=String(t.value||'').trim();
        if(!name){t.value=p.name;return;}
        p.name=name.slice(0,40);
        saveGymProfilesState(cur);renderGymPickers();
        const del=document.querySelector('[data-gym-delete]');
        if(del)del.textContent=`Delete ${p.name}`;
        gymRefreshLiveSuggestions();
      }else if(t.hasAttribute('data-gym-step')||t.hasAttribute('data-gym-max')){
        const cur=gymProfilesState(),p=cur.list.find(x=>x.id===cur.activeId);if(!p)return;
        const isStep=t.hasAttribute('data-gym-step');
        const bag=isStep?p.steps:p.maxes,key=isStep?t.dataset.gymStep:t.dataset.gymMax;
        const v=Number(t.value);
        if(t.value===''||!(v>0))delete bag[key];else bag[key]=gymFromDisplay(v);
        saveGymProfilesState(cur);gymRefreshLiveSuggestions();
      }else if(t.hasAttribute('data-gym-weight')){
        gymCommitWeightEdit(t);
      }
    });
    document.addEventListener('keydown',e=>{
      const t=e.target;if(!t||!t.hasAttribute||!t.hasAttribute('data-gym-weight-new'))return;
      if(e.key!=='Enter')return;
      e.preventDefault();gymCommitNewWeight(t.dataset.gymWeightNew,t);
    });
     
    function renderSettings(){
      syncPrivacyToggles();  
      if(typeof renderUndoRestoreButton==='function'){try{renderUndoRestoreButton();}catch(_){}}
      try{renderGymPickers();}catch(_){}  
       

      try{const mktSec=$('#settingsView details[data-section="marketing"]');
      if(mktSec){let si=false;try{si=!!(typeof Sync!=='undefined'&&Sync&&Sync.lastAuthUid);}catch(_){ }mktSec.hidden=!si; if(si)mktSec.removeAttribute('data-auth-hidden');else mktSec.setAttribute('data-auth-hidden','');}}catch(_){}
      syncSigninNudgeToggle();
      const darkToggle=$('#darkModeToggle');
      if(darkToggle){const effDark=themeEffectiveDark();darkToggle.setAttribute('aria-pressed',String(effDark));darkToggle.setAttribute('aria-label',`Dark mode ${effDark?'on':'off'}`);}
      syncThemeModePills();  
      const swipeToggle=$('#swipeDeleteSetsToggle');
      if(swipeToggle){swipeToggle.setAttribute('aria-pressed',String(swipeToDeleteSets));swipeToggle.setAttribute('aria-label',`Swipe to delete ${swipeToDeleteSets?'on':'off'}`);}
      const desktopToggle=$('#desktopLayoutToggle');
      if(desktopToggle){desktopToggle.setAttribute('aria-pressed',String(desktopLayout));desktopToggle.setAttribute('aria-label',`Desktop layout ${desktopLayout?'on':'off'}`);}
      document.querySelectorAll('#themePills [data-theme-name]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeName===themeState.name)));
       

      const incType=$('#settingsIncrementType'); if(incType)incType.value=progressionSetup.incrementType;
      const incVal=$('#settingsIncrementValue'); if(incVal)incVal.value=progressionSetup.incrementValue;
      syncSettingsIncrementUnit();
      const repMin=$('#settingsRepMin'); if(repMin)repMin.value=progressionSetup.defaultRange.min;
      const repMax=$('#settingsRepMax'); if(repMax)repMax.value=progressionSetup.defaultRange.max;
       







      const settingsPickerHost=$('#settingsRangePicker');
      if(settingsPickerHost&&typeof forkRepRangePickerPaint==='function')forkRepRangePickerPaint(settingsPickerHost,forkSettingsRangePickerSelection());
      syncUnitPills();
      syncStatsDefaultPills();
       


      const progOffToggle=$('#progressionOffToggle');
      if(progOffToggle){const off=!!progressionSetup.progressionOff;progOffToggle.setAttribute('aria-pressed',String(!off));progOffToggle.setAttribute('aria-label',`Progression ${off?'off':'on'}`);}
      const progCard=$('#progressionDefaultsCard');
      if(progCard)progCard.classList.toggle('progression-off',!!progressionSetup.progressionOff);
      syncDbEntryPills();
      syncEffortPills();  
       
      const defSets=$('#settingsDefaultSetCount'); if(defSets)defSets.value=defaultSetCount();
      syncTimeStepPills($('#settingsTimeStepPills'),progressionSetup.timeStep);
      const pctDef=$('#settingsPercentOf1RM'); if(pctDef)pctDef.value=progressionSetup.percentOf1RM??75;
       

      const warmupRungsHost=$('#settingsWarmupRungs');
      const warmupN=clamp(Math.round(Number(progressionSetup.warmupRungs)||2),1,3);
      if(warmupRungsHost){
        warmupRungsHost.querySelectorAll('[data-warmup-rungs]').forEach(btn=>btn.setAttribute('aria-pressed',String(Number(btn.dataset.warmupRungs)===warmupN)));
      }
      renderSettingsWarmupRungs(warmupN);
      syncSettingsScheme();
    }
    window.addEventListener('load', () => {
      if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
         


        navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => {});
      }
    });

     
    function renderWorkoutDateDisplay() {
      const input=$('#workoutDate'),display=$('#workoutDateDisplay');
      if(!input||!display)return;
       





      const parts=formatPrettyDateParts(input.value||localIsoDate());
      display.replaceChildren();
      const main=document.createElement('span');main.className='fork-date-main';main.textContent=parts.date;
      const day=document.createElement('span');day.className='fork-date-weekday';day.textContent=parts.weekday;
      display.append(main,day);
       


      if(parts.date)input.setAttribute('aria-label',`Date: ${parts.date}, ${parts.weekday}`);
    }

    $('#customExerciseForm').addEventListener('submit', event => {
      event.preventDefault();
       


      const name = clampNameLength($('#customName').value.trim());
      const primary = [...customDraft.primary];
      if (!name || !primary.length) {
        $('#customFormError').textContent = 'Add a name and select at least one primary muscle.';
        return;
      }
      const existingId = $('#customExerciseId').value;
      const id = existingId || newCustomExerciseId(name);
      const tracking = customDraft.tracking || 'reps';
       

      const customExercise = {
        id,
        name,
        force: customDraft.force || null,
        level: null,
        mechanic: customDraft.mechanic || null,
        equipment: customDraft.equipment || null,
        tracking,
        metrics: tracking === 'distance' ? ['load','distance'] : null,
        primary,
        secondary: [...customDraft.secondary],
        category: null,
        instructions: $('#customInstructions').value.split('\n').map(step => step.trim()).filter(Boolean),
        custom: true
      };
       








      if (customDraft.sides === 'single') customExercise.unilateral = true;
      if (pairImplementExercise(customExercise)) {
        if (customDraft.dbSetup === 'one') customExercise.singleDumbbell = true;
        else if (customDraft.dbSetup === 'pair-total') customExercise.dbEntryDefault = 'total';
         




        if ((customExercise.equipment === 'kettlebells' || customExercise.equipment === 'kettlebell') && customDraft.dbSetup !== 'one') customExercise.singleDumbbell = false;
      }
      if (existingId) {
         

        const prev = state.customExercises.find(ex => ex.id === existingId);
        if (prev?.deletedAt) customExercise.deletedAt = prev.deletedAt;
        exercises = exercises.map(ex => ex.id === existingId ? customExercise : ex);
        state.customExercises = state.customExercises.map(ex => ex.id === existingId ? customExercise : ex);
      } else {
        exercises = [customExercise, ...exercises];
        state.customExercises.unshift(customExercise);
      }
      closeCustomDialog();
      refreshFilters();
      renderLibrary();
      schedulePersist();
       

      const afterSave = customAfterSave; customAfterSave = null;
      if (afterSave) afterSave(id); else openExercise(id);
    });

     


    $('#closeCustomDialog').addEventListener('click', closeCustomDialog);
    $('#cancelCustomExercise').addEventListener('click', closeCustomDialog);
    wireCustomDeleteDialog();  

     


    $('#darkModeToggle').addEventListener('click',()=>{
      const t=themeState;
       


      themeTakeExplicit();
      t.dark=!t.dark;
       

      if(t.dark){ if(t.name==='cruciferous')t.name='macchiato'; else if(t.name===ROSEPINE)t.name='mocha'; }
      else{ if(t.name==='macchiato')t.name='cruciferous'; else if(t.name==='mocha')t.name=ROSEPINE; }
      applyTheme();
    });
    $('#swipeDeleteSetsToggle').addEventListener('click',()=>{
      swipeToDeleteSets=!swipeToDeleteSets;
      applySwipeSets();
       
      if(typeof schedulePersist==='function')schedulePersist();
    });
     
    $('#desktopLayoutToggle').addEventListener('click',()=>{
      desktopLayout=!desktopLayout;
      applyDesktopLayout();
      if(typeof schedulePersist==='function')schedulePersist();
    });

    document.querySelectorAll('#themePills [data-theme-name]').forEach(button=>button.addEventListener('click',()=>{
      themeState.followSystem=false;  
      const name=button.dataset.themeName;
       


      if(name===themeState.name){ themeState.name='cruciferous';themeState.dark=false;themeState.lightName='cruciferous';applyTheme(); return; }
      setThemeName(name);
    }));
     




    document.querySelectorAll('#themeModePills [data-theme-mode]').forEach(button=>button.addEventListener('click',()=>{
      const mode=button.dataset.themeMode;const t=themeState;
      if(mode==='system'){ if(t.followSystem)return; t.followSystem=true; applyTheme(); return; }
      themeTakeExplicit();
      const wantDark=mode==='dark';
      if(t.dark!==wantDark){
        t.dark=wantDark;
         
        if(t.dark){ if(t.name==='cruciferous')t.name='macchiato'; else if(t.name===ROSEPINE)t.name='mocha'; }
        else{ if(t.name==='macchiato')t.name='cruciferous'; else if(t.name==='mocha')t.name=ROSEPINE; }
      }
      applyTheme();
    }));
     




    try{
      const mq=window.matchMedia('(prefers-color-scheme: dark)');
      const onOsThemeChange=()=>{if(themeState.followSystem)applyTheme();};
      if(mq.addEventListener)mq.addEventListener('change',onOsThemeChange);
      else if(mq.addListener)mq.addListener(onOsThemeChange);
    }catch(_){}
    document.querySelectorAll('#settingsUnitPills [data-units]').forEach(button=>button.addEventListener('click',()=>{
      progressionSetup.units=button.dataset.units; syncUnitPills(); syncSettingsIncrementUnit(); syncProgramIncrementUnit(); schedulePersist();
      renderDashboard(); renderStats(); renderWorkoutScreen(); renderWorkoutProgression();
    }));
    document.querySelectorAll('#settingsDbEntryPills [data-db-entry]').forEach(button=>button.addEventListener('click',()=>{
      const mode=button.dataset.dbEntry; if(progressionSetup.dbEntry===mode)return;
      progressionSetup.dbEntry=mode; syncDbEntryPills(); schedulePersist();
      renderDashboard(); renderStats(); renderWorkoutScreen(); renderWorkoutProgression();
    }));
    document.querySelectorAll('#settingsEffortPills [data-effort]').forEach(button=>button.addEventListener('click',()=>{
      const mode=button.dataset.effort; if(progressionSetup.effortMode===mode)return;
      progressionSetup.effortMode=mode; syncEffortPills(); schedulePersist();
      renderDashboard(); renderStats(); renderWorkoutScreen(); renderWorkoutProgression();
    }));
     

    $('#settingsDefaultSetCount')?.addEventListener('input',e=>{progressionSetup.defaultSetCount=clamp(Math.round(Number(e.target.value)||3),1,10);schedulePersist();});
    document.querySelectorAll('#settingsStatsDefaultPills [data-stats-default]').forEach(button=>button.addEventListener('click',()=>{
      const def=button.dataset.statsDefault; if(progressionSetup.statsDefaultMetric===def)return;
      progressionSetup.statsDefaultMetric=def; syncStatsDefaultPills(); schedulePersist();
       
      state.statsMetric=def; renderStats();
    }));
    $('#settingsIncrementType').addEventListener('change',e=>{progressionSetup.incrementType=e.target.value;syncSettingsIncrementUnit();schedulePersist();});
    $('#settingsIncrementValue').addEventListener('input',e=>{progressionSetup.incrementValue=Math.max(0,Number(e.target.value)||0);schedulePersist();});
     










     







    const forkNormalizeSettingsRangePair=()=>{const r=progressionSetup.defaultRange;if(r.max!=null&&r.max<r.min)r.max=r.min;const mn=$('#settingsRepMin'),mx=$('#settingsRepMax');if(mn)mn.value=r.min;if(mx)mx.value=r.max??'';schedulePersist();};
    const syncAllTimeStepPills=()=>{syncTimeStepPills($('#settingsTimeStepPills'),progressionSetup.timeStep);syncTimeStepPills($('#programTimeStepPills'),programFormProgression().timeStep);};
    wireTimeStepPills($('#settingsTimeStepPills'),()=>progressionSetup.timeStep,v=>{progressionSetup.timeStep=v;syncAllTimeStepPills();schedulePersist();});
    wireTimeStepPills($('#programTimeStepPills'),()=>programFormProgression().timeStep,v=>{programFormProgression().timeStep=v;syncAllTimeStepPills();});
    document.querySelectorAll('#settingsSchemePills [data-scheme]').forEach(button=>button.addEventListener('click',()=>{progressionSetup.scheme=button.dataset.scheme;syncSettingsScheme();schedulePersist();}));
     

    document.querySelectorAll('#settingsRpePills [data-rpe-threshold]').forEach(button=>button.addEventListener('click',()=>{
      const v=button.dataset.rpeThreshold;
      progressionSetup.threshold=v==='completion'?'completion':Number(v);
      syncSettingsRpeTrigger();schedulePersist();
    }));
    $('#settingsPercentOf1RM')?.addEventListener('input',e=>{progressionSetup.percentOf1RM=clampPct1RM(Number(e.target.value)||75);schedulePersist();});
     
     


    $('#settingsWarmupRungs')?.querySelectorAll('[data-warmup-rungs]').forEach(btn=>btn.addEventListener('click',()=>{
      progressionSetup.warmupRungs=clamp(Number(btn.dataset.warmupRungs)||2,1,3);
      normalizeProgression(progressionSetup);schedulePersist();renderSettings();
    }));
     



    function rungValuesSummary(rung){
      return `${rung.pct}% × ${rung.reps} rep${rung.reps===1?'':'s'}`;
    }
    function renderSettingsWarmupRungs(n){
      const list=$('#settingsWarmupRungList');if(!list)return;
      const ladder=(progressionSetup.warmupLadder||[]).slice(0,n);
      list.innerHTML=ladder.map((rung,i)=>`<div class="warmup-rung"><button class="warmup-rung-row" type="button" data-warmup-rung-edit="${i}" aria-expanded="false" aria-controls="warmupRungEditor${i}"><span class="warmup-rung-name">Set ${i+1}</span><span class="warmup-rung-values">${rungValuesSummary(rung)}</span></button><div class="warmup-rung-editor" id="warmupRungEditor${i}" hidden><label class="rule-field"><span>% of target</span><input type="number" inputmode="numeric" min="1" max="100" step="1" value="${rung.pct}" data-warmup-rung-pct="${i}" aria-label="Set ${i+1} percent of target"><em class="unit">%</em></label><label class="rule-field"><span>Reps</span><input type="number" inputmode="numeric" min="1" step="1" value="${rung.reps}" data-warmup-rung-reps="${i}" aria-label="Set ${i+1} reps"></label></div></div>`).join('');
      list.querySelectorAll('[data-warmup-rung-edit]').forEach(btn=>btn.addEventListener('click',()=>{
        const editor=list.querySelector(`#warmupRungEditor${btn.dataset.warmupRungEdit}`);
        const opening=!editor||editor.hidden;
        list.querySelectorAll('.warmup-rung-editor').forEach(ed=>{ed.hidden=true;});
        list.querySelectorAll('[data-warmup-rung-edit]').forEach(b=>{b.setAttribute('aria-expanded','false');b.classList.remove('is-open');});
        if(opening&&editor){editor.hidden=false;btn.setAttribute('aria-expanded','true');btn.classList.add('is-open');editor.querySelector('input')?.focus({preventScroll:true});}
      }));
      const syncSummary=i=>{const row=list.querySelector(`[data-warmup-rung-edit="${i}"] .warmup-rung-values`);const rung=(progressionSetup.warmupLadder||[])[i];if(row&&rung)row.textContent=rungValuesSummary(rung);};
      list.querySelectorAll('[data-warmup-rung-pct]').forEach(input=>input.addEventListener('input',e=>{
        const i=Number(input.dataset.warmupRungPct);const ladder=progressionSetup.warmupLadder||[];
        ladder[i]=ladder[i]||{pct:40,reps:5};
        ladder[i].pct=clamp(Math.round(Number(e.target.value)||ladder[i].pct),1,100);
        normalizeProgression(progressionSetup);schedulePersist();syncSummary(i);
      }));
      list.querySelectorAll('[data-warmup-rung-reps]').forEach(input=>input.addEventListener('input',e=>{
        const i=Number(input.dataset.warmupRungReps);const ladder=progressionSetup.warmupLadder||[];
        ladder[i]=ladder[i]||{pct:40,reps:5};
        ladder[i].reps=Math.max(1,Math.round(Number(e.target.value)||ladder[i].reps));
        normalizeProgression(progressionSetup);schedulePersist();syncSummary(i);
      }));
    }
     


     

     




    function ensureWeeklyRanges(target,cycleLen){
      if(!Array.isArray(target.weeklyRanges))target.weeklyRanges=[];
      const len=Number(cycleLen);
      if(!(len===4||len===6||len===8||len===12))return;
      while(target.weeklyRanges.length<len)target.weeklyRanges.push(target.weeklyRanges.length%3===0?'strength':target.weeklyRanges.length%3===1?'hypertrophy':'endurance');
      target.weeklyRanges=target.weeklyRanges.slice(0,len);
    }
     

    function weekRangePills(preset, pillAttr, index) {
       

       








      return VISIBLE_REP_PRESETS.map(key=>{const value=REP_PRESETS[key];
        const sub=value.amrap?'as many as possible':forkRangeLabel(value.min,value.max,'reps');
        return `<button type="button" class="rep-preset" ${pillAttr}="${index}" data-preset="${key}" aria-pressed="${key===preset}"><span class="fork-tile-name">${value.label}</span><span class="fork-tile-sub">${sub}</span></button>`;
      }).join('');
    }
     
    function weekRangeRow(preset, index, pillAttr) {
      return `<div class="week-range-row"><strong>Week ${index+1}</strong><div class="week-range-pills" role="group" aria-label="Week ${index+1} rep range">${weekRangePills(preset,pillAttr,index)}</div></div>`;
    }
     



     


    $('#progressionOffToggle')?.addEventListener('click',()=>{progressionSetup.progressionOff=!progressionSetup.progressionOff;const off=!!progressionSetup.progressionOff;const toggle=$('#progressionOffToggle');if(toggle){toggle.setAttribute('aria-pressed',String(!off));toggle.setAttribute('aria-label',`Progression ${off?'off':'on'}`);}const card=$('#progressionDefaultsCard');if(card)card.classList.toggle('progression-off',off);schedulePersist();});
     

    $('#exportDataButton').addEventListener('click',()=>{downloadWorkoutBackup();showToast('Backup downloaded.');});
     
    $('#undoRestoreButton')?.addEventListener('click',()=>{if(typeof obUndoLastRestore==='function')obUndoLastRestore();});
    $('#exportCsvButton')?.addEventListener('click',()=>{if(!(workoutState.completed||[]).length){showToast('No finished workouts to export yet.');return;}downloadWorkoutHistoryCsv();showToast('Workouts downloaded as CSV.');});
    $('#importCsvButton').addEventListener('click',()=>{if(typeof openCsvImport==='function')openCsvImport();});
    $('#deleteAllDataButton').addEventListener('click',()=>{showModalPinned($('#deleteAllDialog'));});
     

    $('#signinNudgeToggle')?.addEventListener('click',()=>{
      const dismissed=typeof Sync!=='undefined'&&typeof Sync.signinNudgeDismissed==='function'?Sync.signinNudgeDismissed():false;
      if(dismissed){if(typeof Sync.clearSigninNudgeDismissed==='function')Sync.clearSigninNudgeDismissed();}
      else{try{localStorage.setItem('workout-signin-nudge-dismissed','1');}catch(_){}}
      syncSigninNudgeToggle();
    });
    $('#cancelDeleteAll').addEventListener('click',()=>$('#deleteAllDialog').close());
    $('#keepDeleteAll').addEventListener('click',()=>$('#deleteAllDialog').close());
    $('#confirmDeleteAll').addEventListener('click',()=>{
      $('#deleteAllDialog').close();
       

       


      if(typeof tombstoneAllForSync==='function'){try{tombstoneAllForSync();}catch(_){}}
       

      const wipeDone=wipeLocalUserData();
       


      if(typeof markSyncDirty==='function'){try{markSyncDirty();}catch(_){}}
      const doReloadAfterDelete=()=>{try{Promise.resolve(wipeDone).then(()=>location.reload(),()=>location.reload());}catch(_){location.reload();}};
       



      const pushFn=typeof pushDeleteAllRemote==='function'?pushDeleteAllRemote:null;
      if(pushFn){
        let settled=false;
        const finish=()=>{if(!settled){settled=true;doReloadAfterDelete();}};
        setTimeout(finish,3000);
        try{pushFn().then(finish,finish);}catch(_){finish();}
      }else doReloadAfterDelete();
    });
     
    if(typeof runLocalKeyMigrations==='function'){try{runLocalKeyMigrations();}catch(_){}}
    try{
      themeState.dark=(localStorage.getItem('workout-theme')||'light')==='dark';
      themeState.name=localStorage.getItem('workout-theme-name')||'cruciferous';
      if(!['cruciferous','rosepine','macchiato','mocha'].includes(themeState.name))themeState.name='cruciferous';
      if(DARK_FLAVORS.includes(themeState.name))themeState.darkFlavor=themeState.name;
      try{const savedLight=localStorage.getItem('workout-theme-light');if(LIGHT_THEMES.includes(savedLight))themeState.lightName=savedLight;}catch(_){}
       





      try{
        const savedMode=localStorage.getItem('workout-theme-mode');
        if(savedMode==='system')themeState.followSystem=true;
        else if(savedMode==='manual')themeState.followSystem=false;
        else themeState.followSystem=!(localStorage.getItem('workout-theme')||localStorage.getItem('workout-theme-name'));
      }catch(_){}
      try{desktopLayout=localStorage.getItem('workout-desktop-layout')==='1';}catch(_){}
    }catch(_){}
    applyTheme();applySwipeSets();applyDesktopLayout();
    $('#closeReplaceDraft')?.addEventListener('click',()=>{pendingRepeatWorkout=null;$('#replaceDraftDialog').close();});  
    $('#keepCurrentDraft').addEventListener('click',()=>{pendingRepeatWorkout=null;$('#replaceDraftDialog').close();});
    $('#confirmReplaceDraft').addEventListener('click',()=>{const workout=pendingRepeatWorkout;pendingRepeatWorkout=null;$('#replaceDraftDialog').close();if(workout)repeatWorkout(workout,true);});
     


    $('#dashboardNav').addEventListener('click', () => {
       




      if (state.activeView === 'workout' && state.workoutEditorOpen && workoutState.draft
        && typeof flyWorkoutHeaderToHomeCard === 'function'
        && flyWorkoutHeaderToHomeCard(() => goTab(showDashboard))) return;
      goTab(showDashboard);
    });
    $('#workoutsNav').addEventListener('click', () => {
      
      
      if (state.activeView === 'workout') { collapseWorkoutToStart(); return; }
      goTab(showWorkouts);
    });
     

    $('#programNav').addEventListener('click', showProgramHome);
    $('#statsNav').addEventListener('click', () => goTab(showStats));
     




    const desktopNavTarget = { dashboard:'#dashboardNav', library:'#libraryNav', workout:'#workoutsNav', program:'#programNav', stats:'#statsNav' };
    document.querySelectorAll('#desktopHeader .desktop-tab').forEach(tab => {
      tab.addEventListener('click', () => { $(desktopNavTarget[tab.dataset.view])?.click(); });
    });
    $('#desktopBrand')?.addEventListener('click', e => { e.preventDefault(); $('#dashboardNav')?.click(); });
    $('#desktopSettings')?.addEventListener('click', () => { $('#topBarSettings')?.click(); });
     


    $('#topBarSettings').addEventListener('click', () => {
      if (state.activeView === 'settings') { window.scrollTo({top:0, behavior:'auto'}); return; }
      goTab(showSettings);
    });
    $('#detailFavToggle')?.addEventListener('click', () => toggleFavorite(state.selected));
     
    $('#closeStartSavedConflict')?.addEventListener('click',()=>{pendingConflictStart=null;$('#startSavedConflictDialog').close();});
    $('#backToLiveWorkout')?.addEventListener('click',()=>{pendingConflictStart=null;if(state.activeView!=='workout') showWorkouts();state.workoutEditorOpen=true;renderWorkoutScreen();window.scrollTo({top:0});$('#startSavedConflictDialog').close();});
     





    $('#switchToSavedWorkout')?.addEventListener('click',()=>{const fn=pendingConflictStart;pendingConflictStart=null;if(fn)fn();$('#startSavedConflictDialog').close();});
    $('#liveWorkoutChip')?.addEventListener('click', () => {
      if (!workoutState.draft) return;
       


      const chip = $('#liveWorkoutChip');
      const startRect = chip?.querySelector('.live-dot')?.getBoundingClientRect();
      showWorkouts();
      state.workoutEditorOpen = true;
      renderWorkoutScreen(); window.scrollTo({top:0});
      const titleDot = $('#liveTitleDot');
      const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (startRect && titleDot && !titleDot.hidden && !reduceMotion) {
        const endRect = titleDot.getBoundingClientRect();
        const fly = document.createElement('span');
        fly.className = 'live-dot live-dot-fly';
        fly.style.left = startRect.left + 'px';
        fly.style.top = startRect.top + 'px';
        fly.style.width = startRect.width + 'px';
        fly.style.height = startRect.height + 'px';
        document.body.appendChild(fly);
        const dx = (endRect.left + endRect.width / 2) - (startRect.left + startRect.width / 2);
        const dy = (endRect.top + endRect.height / 2) - (startRect.top + startRect.height / 2);
         



        titleDot.style.animation='none';
        titleDot.style.opacity = '0';
         


        fly.animate([
          { transform: 'translate(0,0)', opacity: 1 },
          { transform: `translate(${dx}px,${dy}px)`, opacity: 1 }
        ], { duration: 180, easing: 'cubic-bezier(0, 0, 0.2, 1)' }).onfinish = () => {
          fly.remove();
          titleDot.style.animation='';
          titleDot.style.opacity = '';
        };
      }
    });
     



    $('#topBarBack').addEventListener('click', () => {
       

      if (state.activeView === 'settings' && typeof isGymEquipmentPageOpen==='function' && isGymEquipmentPageOpen()) { closeGymEquipmentPage(); return; }
      if (state.activeView === 'detail') backFromExerciseDetail();
      else if (state.activeView === 'settings') backFromSettings();
      else if (state.activeView === 'program' && state.programWorkoutUid) { state.programWorkoutUid = null; renderProgram(); window.scrollTo({top:0}); }
       
      else if (state.activeView === 'program' && state.savedProgramPreviewId) { state.savedProgramPreviewId = null; renderProgram(); window.scrollTo({top:0}); }
      else if (state.activeView === 'program' && $('#createProgram')?.dataset.editing === 'true') requestCancelProgramEdit();
       



       


      else if (state.activeView === 'workout' && !$('#workoutComplete').hidden) {
        if (history.state?.sub === 'complete') history.back();
        else backFromWorkoutDetail();
      }
       

      else if (state.activeView === 'workout' && state.workoutHistoryOpen) {
        if (history.state?.sub === 'history') history.back();
        else hideWorkoutHistory();
      }
      else if (state.activeView === 'workout') { if (!collapseWorkoutSubScreen()) history.back(); }
      else history.back();
    });
     









    $('#closeBuilderDraftExists')?.addEventListener('click',()=>$('#builderDraftExistsDialog').close());
    $('#keepBuilderDraft')?.addEventListener('click',()=>$('#builderDraftExistsDialog').close());
    $('#deleteBuilderDraft')?.addEventListener('click',()=>{ discardPendingBuilderDraft(); $('#builderDraftExistsDialog').close(); });
    $('#resumeBuilderDraft')?.addEventListener('click',()=>{ resumeBuilderDraft(); $('#builderDraftExistsDialog').close(); });
     









     

    document.querySelectorAll('#programRpePills [data-rpe-threshold]').forEach(button=>button.addEventListener('click',()=>{const v=button.dataset.rpeThreshold;programFormProgression().threshold=v==='completion'?'completion':Number(v);document.querySelectorAll('#programRpePills [data-rpe-threshold]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));}));
    $('#progressionIncrementType').addEventListener('change',e=>{programFormProgression().incrementType=e.target.value;syncProgramIncrementUnit();});
    $('#progressionIncrementValue').addEventListener('input',e=>{programFormProgression().incrementValue=Number(e.target.value)||5;});
     


    $('#progressionPercentOf1RM').addEventListener('input',e=>{programFormProgression().percentOf1RM=clampPct1RM(Number(e.target.value)||75);});
     
    $('#programProgressionOffToggle')?.addEventListener('click',()=>{const d=programFormProgression();d.progressionOff=!d.progressionOff;syncProgramForm();schedulePersist();});
     











    const forkProgramRangePickerHost=$('#programRangePicker');
    if(forkProgramRangePickerHost){
      forkProgramRangePickerHost.addEventListener('click',event=>forkRepRangePickerRoute(forkProgramRangePickerHost,event,forkProgramRangePickerAdapter));
      forkProgramRangePickerHost.addEventListener('input',event=>forkRepRangePickerRoute(forkProgramRangePickerHost,event,forkProgramRangePickerAdapter));
      forkProgramRangePickerHost.addEventListener('change',event=>forkRepRangePickerRoute(forkProgramRangePickerHost,event,forkProgramRangePickerAdapter));
    }
     










    function forkSettingsRangePickerSelection(){
      const range=progressionSetup.defaultRange||{};
      if(range.preset==='custom')return {preset:null,custom:true};
      return {preset:range.preset||'hypertrophy',custom:false};
    }
    const forkSettingsRangePickerAdapter={
      tileAttr:'data-fork-target-preset',minId:'settingsRepMin',maxId:'settingsRepMax',
      selection:()=>forkSettingsRangePickerSelection(),
      onPreset(key){applyRepPreset(key);schedulePersist();return 'selected';},
      onCustom(){const r=progressionSetup.defaultRange;if(r)r.preset='custom';schedulePersist();},
      onFieldInput(){
        const r=progressionSetup.defaultRange;if(!r)return;
        const mn=$('#settingsRepMin'),mx=$('#settingsRepMax');
        if(mn){const v=parseInt(mn.value,10);r.min=Number.isFinite(v)?Math.max(1,v):1;}
        if(mx){const v=String(mx.value).trim();if(v==='')r.max=null;else{const n=parseInt(v,10);if(Number.isFinite(n))r.max=n;}}
        r.preset='custom';schedulePersist();
      },
      onFieldChange(){forkNormalizeSettingsRangePair();}
    };
    const forkSettingsRangePickerHost=$('#settingsRangePicker');
    if(forkSettingsRangePickerHost){
      forkSettingsRangePickerHost.addEventListener('click',event=>forkRepRangePickerRoute(forkSettingsRangePickerHost,event,forkSettingsRangePickerAdapter));
      forkSettingsRangePickerHost.addEventListener('input',event=>forkRepRangePickerRoute(forkSettingsRangePickerHost,event,forkSettingsRangePickerAdapter));
      forkSettingsRangePickerHost.addEventListener('change',event=>forkRepRangePickerRoute(forkSettingsRangePickerHost,event,forkSettingsRangePickerAdapter));
    }
     



    document.querySelectorAll('#programSchemePills [data-scheme]').forEach(button=>button.addEventListener('click',()=>{programFormProgression().scheme=button.dataset.scheme;syncProgramForm();}));
     



     


    document.querySelectorAll('#programCyclePills [data-cycle-length]').forEach(button=>button.addEventListener('click',()=>{const d=programFormProgression();d.cycleLength=Number(button.dataset.cycleLength);d.undulating=d.cycleLength>0;syncProgramCycleUI(d);renderWeekRanges(d);renderWeekPcts(d);}));
    $('#varyRangesToggle')?.addEventListener('click',()=>{const d=programFormProgression();const on=!(normalizeCycleLength(d)>0);d.cycleLength=on?(normalizeCycleLength(d)>0?normalizeCycleLength(d):4):0;d.undulating=on;syncProgramCycleUI(d);renderWeekRanges(d);renderWeekPcts(d);});
    $('#pctWaveToggle').addEventListener('click',()=>{const d=programFormProgression();d.pctWave=!d.pctWave;ensureWeeklyPcts(d,Number($('#programLength')?.value)||8);$('#pctWaveToggle').setAttribute('aria-pressed',String(d.pctWave));$('#pctWaveToggle').setAttribute('aria-label',`Vary percent of 1RM by week ${d.pctWave?'on':'off'}`);$('#pctWavePanel').hidden=!d.pctWave;renderWeekPcts(d);});
    $('#programLength').addEventListener('input',()=>{renderWeekRanges();renderWeekPcts();});
     

    $('#createProgram').addEventListener('click', createProgram);
     

    $('#saveProgramToLibrary').addEventListener('click', saveProgramToLibrary);
     





    $('#startBlankHero')?.addEventListener('click',()=>startBlankWorkout());
     






    $('#repeatLastHero').addEventListener('click',()=>repeatWorkout(workoutState.completed.slice().sort(sortByRecencyDesc)[0]));  
     







    const openDraftExercisePicker=() => {
      workoutState.pickerMode='draft';workoutState.programWorkoutTarget=null;
      $('#exercisePickerTitle').textContent='Add exercise';
      $('#exercisePickerSearch').value = '';
      preparePickerFilters();
      resetPickerSession();
       

      workoutState.pickerScrollY=window.scrollY;
      renderExercisePicker();
      lockPickerBackground();  
      $('#exercisePickerDialog').showModal();
      requestAnimationFrame(() => $('#exercisePickerSearch').focus());
    };
     





    window.openDraftExercisePicker=openDraftExercisePicker;
    $('#addWorkoutExercise')?.addEventListener('click', openDraftExercisePicker);
    
    
    $('#addWorkoutExerciseBottom')?.addEventListener('click', openDraftExercisePicker);
     





    const afterExercisePicker=()=>{if(workoutState.pickerMode==='template'){schedulePersist();if(typeof refreshTemplateViews==='function')refreshTemplateViews();}if(state.savedBuilder&&state.builderOpen&&typeof renderSavedBuilder==='function')renderSavedBuilder();
      if(workoutState.pickerMode!=='template'&&workoutState.draft&&typeof pickerSessionAdded!=='undefined'&&pickerSessionAdded.size){
        requestAnimationFrame(()=>{window.scrollTo({top:exercisePickerCloseScrollY(),behavior:'auto'});});
      }};
    $('#closeExercisePicker').addEventListener('click', () => {$('#exercisePickerDialog').close();afterExercisePicker();});
    $('#doneExercisePicker').addEventListener('click', () => {
       


      if(workoutState.pickerMode==='draft'&&!workoutState.pickerSwapUid&&typeof commitPickerStaged==='function')commitPickerStaged();
      $('#exercisePickerDialog').close();afterExercisePicker();
    });
     



    $('#exercisePickerDialog').addEventListener('close', unlockPickerBackground);
     


    $('#pickerCreateCustom')?.addEventListener('click', () => {
      if (typeof openCustomDialog === 'function') openCustomDialog(null, commitCreatedCustomExercise);
    });
     






     
    function focusPresetName(preset){
      if(preset.amrap||preset.openTop)return preset.label;
       


      if(preset.max==null&&preset.min!=null)return `${preset.label} (${preset.min}+)`;
      return `${preset.label} (${preset.min}–${preset.max})`;
    }
     




    function forkFocusParts(range){
      if(!range)return {name:'Focus',range:''};
      const name=range.label||(range.preset&&REP_PRESETS[range.preset]?REP_PRESETS[range.preset].label:'')||'Custom';
      if(range.amrap)return {name,range:''};
      if(range.openTop||range.max==null)return {name,range:range.min!=null?`${range.min}+ reps`:''};  
      if(range.min!=null&&range.max!=null)return {name,range:forkRangePairText(range.min,range.max)+' reps'};  
      return {name,range:''};
    }
     

    function applyWorkoutFocus(key){
      const preset=REP_PRESETS[key]; if(!preset||!workoutState.draft)return;
      workoutState.draft.focusPreset=key;
      workoutState.draft.focusCustomRange=null;  
      const {apply,skip}=splitFocusApply(workoutState.draft.exercises,preset);
      apply.forEach(item=>{
        item.progression={...(item.progression||{}),preset:key,min:preset.min,max:preset.max,openTop:!!preset.openTop,amrap:!!preset.amrap,custom:true};
         





        delete item.suggestedTarget; delete item.suggestedTargets;
      });
       




      prepareDraftProgression(workoutState.draft,freeformProgressionConfig());
       



      updateFocusPlaceholders();
       


      if(typeof refreshCardSuggestionRows==='function')refreshCardSuggestionRows();
      renderWorkoutProgression(); syncWorkoutFocusPills(); markDraftSaved();
    }
     






    function applyWorkoutFocusCustom(min,max){
      if(!workoutState.draft)return false;
       




      const blankMax=max==null||String(max).trim()==='';
      const lo=Math.round(Number(min));
      let hi=blankMax?lo:Math.round(Number(max));
      if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo<1||hi<lo){showToast('Custom range needs a minimum of 1 and a maximum at or above it.','error');return false;}
      if(blankMax)hi=null;
      workoutState.draft.focusPreset=null;
      workoutState.draft.focusCustomRange={min:lo,max:hi};
      const range={label:'Custom',min:lo,max:hi};
      const {apply,skip}=splitFocusApply(workoutState.draft.exercises,range);
      apply.forEach(item=>{
        item.progression={...(item.progression||{}),preset:'custom',min:lo,max:hi,openTop:false,amrap:false,custom:true};
         

        delete item.suggestedTarget; delete item.suggestedTargets;
      });
       


      prepareDraftProgression(workoutState.draft,freeformProgressionConfig());
      updateFocusPlaceholders();
      if(typeof refreshCardSuggestionRows==='function')refreshCardSuggestionRows();
      renderWorkoutProgression(); syncWorkoutFocusPills(); markDraftSaved();
      return true;
    }
     














    function updateFocusPlaceholders(){
      const draft=workoutState.draft; if(!draft)return;
      draft.exercises.forEach(item=>{
        const card=document.querySelector(`[data-workout-exercise="${CSS.escape(item.uid)}"]`);
        if(!card)return;
        const p=item.progression||{};
        
        if(p.mode==='time')return;
        const rows=card.querySelectorAll('.log-set');
        (item.sets||[]).forEach((set,i)=>{
          const row=rows[i]; if(!row)return;
          const input=row.querySelector('.reps-input'); if(!input)return;
          if(typeof isWarmupSet==='function'&&isWarmupSet(set))return;
          const hints=(typeof forkSetRowPerfHints==='function')?forkSetRowPerfHints(item,set):null;
          if(hints){
            input.placeholder=hints.text||(hints.perf==='seconds'?'Seconds':hints.perf==='distance'?'Distance (m)':'Reps');
            input.setAttribute('data-placeholder-perf',hints.value);
            const fieldWord=hints.perf==='seconds'?'seconds':hints.perf==='distance'?'distance in meters':'reps';
            input.setAttribute('aria-label',`Set ${i+1} ${fieldWord}${hints.text?`; target ${hints.text}`:''}`);
          }else{
             
            const text=rangePlaceholder(p,false).text;
            if(text)input.placeholder=text;
          }
        });
      });
    }
     














    let forkFocusStage={mode:'none',preset:null};
    function syncForkFocusStageTiles(){
       






      const sheet=$('#forkFocusSheet');
      if(sheet)forkRepRangePickerPaint(sheet,{preset:forkFocusStage.mode==='preset'?forkFocusStage.preset:null,custom:forkFocusStage.mode==='custom'});
      syncForkFocusCurrentLine();
    }
     







    function forkFocusProgContext(){
      const draft=workoutState.draft;
      return (draft&&draft.programId&&workoutState.activeProgram&&workoutState.activeProgram.id===draft.programId)?workoutState.activeProgram:null;
    }
    function syncForkFocusProgControls(){
      forkSyncFocusProgControls(forkFocusStage,forkFocusProgContext());
    }
    function forkFocusStageFromDraft(){
      const draft=workoutState.draft;
       









      const sel=forkFocusStageSelection(draft?.focusPreset||null,draft?.focusCustomRange||null,workoutFocusRangeAndText().focusRange);
      forkFocusStage={mode:sel.mode,preset:sel.preset||null};
      forkFocusStage.inherited=!!sel.inherited;
      forkFocusStage.openSignature=forkFocusSelectionSignature(sel.mode,sel.preset,sel.min,sel.max);
      const mn=$('#forkFocusMin'),mx=$('#forkFocusMax');
      if(mn)mn.value=sel.fillMin??'';
      if(mx)mx.value=sel.fillMax??'';
      forkFocusStage.prog=draft?.progression?forkSanitizeWorkoutProgression(draft.progression):null;
      syncForkFocusStageTiles();
      syncForkFocusProgControls();
      syncForkFocusMixSection();
    }
     

    function forkFocusCurrentSignature(){
      if(forkFocusStage.mode==='preset')return forkFocusSelectionSignature('preset',forkFocusStage.preset);
      if(forkFocusStage.mode==='custom')return forkFocusSelectionSignature('custom',null,$('#forkFocusMin')?.value,$('#forkFocusMax')?.value);
      return 'none';
    }
     

    function forkFocusStagedDescription(){
      if(forkFocusStage.mode==='preset'&&forkFocusStage.preset)return forkFocusRangeDescription(REP_PRESETS[forkFocusStage.preset]);
      if(forkFocusStage.mode==='custom'){
        const mn=$('#forkFocusMin')?.value,mx=$('#forkFocusMax')?.value;
         


        if(mn!==''&&mn!=null&&Number.isFinite(Number(mn))&&(mx===''||mx==null||Number.isFinite(Number(mx))))return forkFocusRangeDescription({label:'Custom',min:Number(mn),max:mx===''||mx==null?null:Number(mx)});
        return 'a custom range';
      }
      return '';
    }
     





    function syncForkFocusCurrentLine(){
      const line=$('#forkFocusCurrentLine'); if(!line)return;
      const draft=workoutState.draft;
      const ownSig=!draft?'none':draft.focusCustomRange?forkFocusSelectionSignature('custom',null,draft.focusCustomRange.min,draft.focusCustomRange.max):(draft.focusPreset?forkFocusSelectionSignature('preset',draft.focusPreset):'none');
      if(forkFocusStage.mode==='none'){
        if(ownSig!=='none'){line.textContent='On Save, this workout\u2019s own focus clears and the default range applies again.';return;}
        const effDesc=forkFocusRangeDescription(workoutFocusRangeAndText().focusRange);
        line.textContent=effDesc?`${forkFocusProgContext()?'From your program':'App default'}: ${effDesc}. Pick a range above to set this workout\u2019s own.`:'Pick a range above to set this workout\u2019s focus.';
        return;
      }
      const desc=forkFocusStagedDescription();
      const cur=forkFocusCurrentSignature();
      if(ownSig!=='none'&&cur===ownSig){line.textContent=`This workout\u2019s focus: ${desc}.`;return;}
      if(forkFocusStage.inherited&&cur===forkFocusStage.openSignature){
        line.textContent=`${forkFocusProgContext()?'From your program':'App default'}: ${desc}. Pick a different range to set this workout\u2019s own.`;
        return;
      }
      line.textContent=`On Save, this workout\u2019s focus becomes ${desc}.`;
    }
     





    function syncForkFocusMixSection(){
      const wrap=$('#forkFocusMix'),list=$('#forkFocusMixList'); if(!wrap||!list)return;
      const draft=workoutState.draft;
      const mix=draft?forkFocusMixRows(draft.exercises||[],workoutFocusRangeAndText().focusRange):{mixed:false,html:''};
      wrap.hidden=!mix.mixed;
      if(mix.mixed)list.innerHTML=mix.html;
    }
     












    const forkFocusPickerAdapter={
      tileAttr:'data-workout-focus',minId:'forkFocusMin',maxId:'forkFocusMax',
      selection:()=>({preset:forkFocusStage.mode==='preset'?forkFocusStage.preset:null,custom:forkFocusStage.mode==='custom'}),
      onPreset(key){
        if(forkFocusStage.mode==='preset'&&forkFocusStage.preset===key){forkFocusStage={...forkFocusStage,mode:'none',preset:null};return 'cleared';}
        forkFocusStage={...forkFocusStage,mode:'preset',preset:key};
        return 'selected';
      },
      onCustom(){ forkFocusStage={...forkFocusStage,mode:'custom',preset:null}; },
      onFieldInput(){ if(forkFocusStage.mode!=='custom')forkFocusStage={...forkFocusStage,mode:'custom',preset:null}; },
      onAfter(){ syncForkFocusStageTiles(); },
    };
    const forkFocusPickerHost=$('#forkFocusPickerHost');
    if(forkFocusPickerHost)forkFocusPickerHost.innerHTML=forkRepRangePickerHtml({tileAttr:'data-workout-focus',minId:'forkFocusMin',maxId:'forkFocusMax',ariaLabel:'Focus presets'});
    const forkFocusPickerSheet=$('#forkFocusSheet');
    if(forkFocusPickerSheet){
      forkFocusPickerSheet.addEventListener('click',event=>{
        if(forkFocusPickerSheet.dataset.host==='builder')return;
        forkRepRangePickerRoute(forkFocusPickerSheet,event,forkFocusPickerAdapter);
      });
      forkFocusPickerSheet.addEventListener('input',event=>{
        if(forkFocusPickerSheet.dataset.host==='builder')return;
        forkRepRangePickerRoute(forkFocusPickerSheet,event,forkFocusPickerAdapter);
      });
    }
     





    document.querySelectorAll('#forkFocusSheet [data-fork-prog-scheme]').forEach(button=>button.addEventListener('click',()=>{
      forkFocusProgSet(forkFocusStage,'scheme',button.dataset.forkProgScheme);
      syncForkFocusProgControls();
    }));
    document.querySelectorAll('#forkFocusSheet [data-fork-prog-threshold]').forEach(button=>button.addEventListener('click',()=>{
      const raw=button.dataset.forkProgThreshold;
      forkFocusProgSet(forkFocusStage,'threshold',raw==='completion'?'completion':Number(raw));
      syncForkFocusProgControls();
    }));
    $('#forkFocusProgIncType')?.addEventListener('change',event=>{
      forkFocusProgSet(forkFocusStage,'incrementType',event.target.value);
      syncForkFocusProgControls();
    });
    $('#forkFocusProgIncValue')?.addEventListener('input',event=>{
      const v=event.target.value;
      if(v===''){if(forkFocusStage.prog)delete forkFocusStage.prog.incrementValue;}
      else forkFocusProgSet(forkFocusStage,'incrementValue',Number(v));
      syncForkFocusProgControls();
    });
    $('#forkFocusProgPct')?.addEventListener('input',event=>{
      const v=event.target.value;
      if(v===''){if(forkFocusStage.prog)delete forkFocusStage.prog.percentOf1RM;}
      else forkFocusProgSet(forkFocusStage,'percentOf1RM',Number(v));
      syncForkFocusProgControls();
    });
    $('#forkFocusProgClear')?.addEventListener('click',()=>{
      forkFocusStage.prog=null;
      syncForkFocusProgControls();
    });
     



    const forkFocusSheetEl=$('#forkFocusSheet');
    function openForkFocusSheet(){
      if(!forkFocusSheetEl||!workoutState.draft)return;
      forkFocusSheetEl.dataset.host='live';
       




      syncWorkoutFocusPills();
       

      forkFocusStageFromDraft();
       



      forkFocusSheetEl.showModal();
    }
    $('#forkFocusValue')?.addEventListener('click',event=>{
      if(event.target?.closest?.('#workoutMixedMarker'))return;
      openForkFocusSheet();
    });
    $('#forkFocusValue')?.addEventListener('keydown',event=>{
      if(event.key==='Enter'||event.key===' '){event.preventDefault();openForkFocusSheet();}
    });
    $('#forkFocusClose')?.addEventListener('click',()=>forkFocusSheetEl?.close());
     


    $('#forkFocusDiscard')?.addEventListener('click',()=>forkFocusSheetEl?.close());
     






    $('#forkFocusSave')?.addEventListener('click',()=>{
      if(forkFocusSheetEl?.dataset.host==='builder')return;
      const draft=workoutState.draft;
      if(!draft){forkFocusSheetEl?.close();return;}
       







      if(forkFocusStage.inherited&&forkFocusCurrentSignature()===(forkFocusStage.openSignature||'')){
        forkCommitLiveSheetExtras(draft);
        forkFocusSheetEl?.close();
        return;
      }
      if(forkFocusStage.mode==='custom'){
         




        if(!applyWorkoutFocusCustom($('#forkFocusMin')?.value,$('#forkFocusMax')?.value))return;
        forkCommitLiveSheetExtras(draft);
        forkFocusSheetEl?.close();
        return;
      }
      if(forkFocusStage.mode==='preset'){
        if(forkFocusStage.preset!==(draft.focusPreset||null))applyWorkoutFocus(forkFocusStage.preset);
        forkCommitLiveSheetExtras(draft);
        forkFocusSheetEl?.close();
        return;
      }
       

      if(draft.focusPreset||draft.focusCustomRange){
        draft.focusPreset=null;draft.focusCustomRange=null;
        syncWorkoutFocusPills();markDraftSaved();
      }
      forkCommitLiveSheetExtras(draft);
      forkFocusSheetEl?.close();
    });
     








    function forkCommitLiveSheetExtras(draft){
      let changed=false;
      const progSec=$('#forkFocusProgression');
      if(progSec&&!progSec.hidden){
        const staged=forkSanitizeWorkoutProgression(forkFocusStage.prog);
        const current=draft.progression?forkSanitizeWorkoutProgression(draft.progression):null;
        if(JSON.stringify(staged)!==JSON.stringify(current)){
          if(staged)draft.progression=staged; else delete draft.progression;
          changed=true;
        }
      }
      if(!changed)return;
      const program=(draft.programId&&workoutState.activeProgram?.id===draft.programId)?workoutState.activeProgram:null;
      const config=program?{...program.progression,currentWeek:(typeof programWeek==='function'?programWeek(program):undefined)}:freeformProgressionConfig();
      prepareDraftProgression(draft,config);
      refreshCardSuggestionRows();
      markDraftSaved();
    }
    $('#closeRangeMix')?.addEventListener('click',()=>$('#rangeMixDialog')?.close());
    $('#rangeMixDone')?.addEventListener('click',()=>$('#rangeMixDialog')?.close());
    $('#exercisePickerSearch').addEventListener('input', renderPickerList);
     

    $('#exercisePickerSearch').addEventListener('input', e => {
      $('#clearPickerSearch').classList.toggle('visible', !!e.target.value);
    });
     






    $('#clearPickerSearch').addEventListener('pointerdown', e => { e.preventDefault(); });
    $('#clearPickerSearch').addEventListener('click', () => {
      $('#exercisePickerSearch').value = ''; $('#clearPickerSearch').classList.remove('visible'); renderPickerList();
    });
     

    $('#pickerFilterToggle').addEventListener('click',()=>{
      const panel=$('#pickerFilterPanel'),open=panel.classList.toggle('open');
      $('#pickerFilterToggle').setAttribute('aria-expanded',String(open));
    });
    $('#pickerMuscleOptions').addEventListener('click',event=>{
      const b=event.target.closest('[data-picker-muscle]');if(!b)return;
      const m=b.dataset.pickerMuscle;
      if(pickerFilters.muscles.has(m))pickerFilters.muscles.delete(m);else pickerFilters.muscles.add(m);
      renderPickerFilterState();renderPickerList();
    });
    $('#pickerFavoritesToggle').addEventListener('click',()=>{pickerFilters.onlyFavorites=!pickerFilters.onlyFavorites;renderPickerFilterState();renderPickerList();});
    $('#pickerCustomToggle').addEventListener('click',()=>{pickerFilters.onlyCustom=!pickerFilters.onlyCustom;renderPickerFilterState();renderPickerList();});
    $('#pickerEquipmentFilter').addEventListener('change',event=>{pickerFilters.equipment=event.target.value;renderPickerFilterState();renderPickerList();});
    $('#pickerClearAllFilters').addEventListener('click',()=>{resetPickerFilters();renderPickerFilterState();renderPickerList();});
     


    $('#workoutName').addEventListener('input', event => { if (workoutState.draft) { workoutState.draft.name = clampNameLength(event.target.value); markDraftSaved(); } });
     







    function forkSyncHeaderNameDisplay(){
      const display=$('#workoutNameDisplay');if(!display)return;
      const name=workoutState.draft?.name||'';
      display.textContent=name||'Workout';
       




      display.classList?.toggle('fork-name-placeholder',!name);
    }
    function forkOpenHeaderNameEdit(){
      const display=$('#workoutNameDisplay'),input=$('#workoutName');
      if(!display||!input||!input.hidden)return;
      input.value=workoutState.draft?.name||'';
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
    function forkCloseHeaderNameEdit(){
      const display=$('#workoutNameDisplay'),input=$('#workoutName');
      if(!display||!input||input.hidden)return;
      input.hidden=true;display.hidden=false;
      forkSyncHeaderNameDisplay();
    }
    $('#workoutNameDisplay')?.addEventListener('click',forkOpenHeaderNameEdit);
    $('#workoutNameDisplay')?.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();forkOpenHeaderNameEdit();}});
    $('#workoutName')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();event.target.blur();}});
    $('#workoutName')?.addEventListener('blur',forkCloseHeaderNameEdit);
     



    const workoutDateChanged=event=>{if(workoutState.draft&&event.target.value){workoutState.draft.date=event.target.value;markDraftSaved();}renderWorkoutDateDisplay();};
    $('#workoutDate').addEventListener('input',workoutDateChanged);
    $('#workoutDate').addEventListener('change',workoutDateChanged);
    $('#closeSetTags').addEventListener('click', () => $('#setTagsDialog').close());
    $('#doneSetTags').addEventListener('click', () => $('#setTagsDialog').close());
    $('#closeExerciseTags').addEventListener('click', () => $('#exerciseTagsDialog').close());
    $('#doneExerciseTags').addEventListener('click', () => $('#exerciseTagsDialog').close());
    $('#addExerciseTagButton').addEventListener('click', addExerciseTag);
    $('#newExerciseTagInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addExerciseTag(); } });
    $('#addTagButton').addEventListener('click', addTag);
    $('#newTagInput').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addTag(); } });
    $('#cancelWorkout').addEventListener('click', () => { discardingBuilder=false; if(typeof syncDiscardDraftDialog==='function')syncDiscardDraftDialog(false); showModalPinned($('#discardDraftDialog')); });
    const doDiscardDraft=() => {
       


      const editingId=workoutState.draft?.editingId||null;
      workoutState.draft = null;
      state.shareReturn=null;  
      $('#workoutComplete').hidden = true;
      $('#workoutError').textContent = '';
      persistNow();
      const prior=editingId?workoutState.completed.find(x=>x.id===editingId):null;
      if(prior&&typeof renderCompletedWorkout==='function'){renderCompletedWorkout(prior);return;}
      renderWorkoutScreen();
    };
    $('#closeDiscardDraft')?.addEventListener('click', () => {discardingBuilder=false;startNewAfterDiscard=false;$('#discardDraftDialog').close();});  
    $('#keepDraftButton').addEventListener('click', () => {discardingBuilder=false;startNewAfterDiscard=false;$('#discardDraftDialog').close();});
     



    $('#confirmDiscardDraft').addEventListener('click', () => { const startNew=startNewAfterDiscard; startNewAfterDiscard=false; $('#discardDraftDialog').close(); if(discardingBuilder){discardingBuilder=false;closeBuilderToReturn(true);} else { doDiscardDraft(); if(startNew){ if(state.activeView!=='workout') showWorkouts(); startBlankWorkout();   if(pendingBlankStartDate){workoutState.draft.date=pendingBlankStartDate;pendingBlankStartDate=null;renderWorkoutScreen();} } } });
     
    $('#discardDraftDialog').addEventListener('close', () => { startNewAfterDiscard=false; pendingBlankStartDate=null; });
    $('#finishWorkout').addEventListener('click', () => finishWorkout());
     




    $('#closeReviewSets')?.addEventListener('click',()=>$('#reviewSetsDialog').close());  
    $('#reviewSetsCancel').addEventListener('click',()=>$('#reviewSetsDialog').close());
     

    $('#reviewSetsFinish').addEventListener('click',()=>{
      $('#reviewSetsDialog').close();
      const draft=workoutState.draft;
      if(draft){
        dropEmptySets(draft);
        renderWorkoutExercises();renderWorkoutProgression();markDraftSaved();
         


      }
      finishWorkout(true);
    });
     



    $('#reviewSetsList').addEventListener('click',(e)=>{
      const btn=e.target.closest('.review-set-row');if(!btn)return;
      const draft=workoutState.draft;if(!draft)return;
      const item=draft.exercises.find(it=>it.uid===btn.dataset.exerciseUid)||draft.exercises[Number(btn.dataset.exerciseIndex)]||null;
      const set=item&&(item.sets.find(s=>s.uid===btn.dataset.setUid)||item.sets[Number(btn.dataset.setIndex)])||null;
      if(!set)return;
      set.complete=!set.complete;
      renderWorkoutExercises();markDraftSaved();
      $('#reviewSetsDialog').close();
       


      if(!unmarkedSetsWithData(draft).length){dropEmptySets(draft);finishWorkout(true);return;}
      showReviewSetsDialog(draft);
    });

    $('#searchInput').addEventListener('input', e => {
      state.query = e.target.value;
      $('#clearSearch').classList.toggle('visible', !!state.query);
      renderLibrary();
    });
     



    ['pointerdown','mousedown'].forEach(evt=>$('#clearSearch').addEventListener(evt, e => { e.preventDefault(); }));
    $('#clearSearch').addEventListener('click', () => {
      state.query = ''; $('#searchInput').value = ''; $('#clearSearch').classList.remove('visible'); renderLibrary();
    });
    $('#filterToggle').addEventListener('click', () => {
      const open = !$('#filterPanel').classList.contains('open');
      $('#filterPanel').classList.toggle('open', open);
      $('#filterToggle').setAttribute('aria-expanded', open);
    });
    $('#clearAllFilters').addEventListener('click', () => { clearLibraryPanelFilters(); renderLibrary(); });
    $('#equipmentFilter').addEventListener('change', e => { state.equipment = e.target.value; renderMuscleSelection(); renderLibrary(); });
    $('#libraryNav').addEventListener('click', () => goTab(showLibrary));
     




    window.addEventListener('popstate', e => {
       




      if(typeof suppressNextProgramDeepLinkOffer==='function')suppressNextProgramDeepLinkOffer();
       





      if(backOutOfSharePreview()==='drill')return;
       





      if(state.shareReturn&&e.state?.view==='workout'&&e.state?.sub==='share'){
        const exRet217=state.exerciseDetailReturn;
        if(exRet217&&exRet217.view==='workout'&&exRet217.sub&&exRet217.sub!=='start'){
          state.exerciseDetailReturn=null;
          state.workoutEditorOpen=exRet217.sub==='editor'&&!!workoutState.draft;
          state.builderOpen=exRet217.sub==='builder'&&!!state.savedBuilder;
          state.savedWorkoutId=exRet217.sub==='saved'?(exRet217.savedWorkoutId||null):null;
          state.workoutHistoryOpen=exRet217.sub==='history';
          showWorkouts(false,true);
        }else{
          state.sharePreview=state.shareReturn;state.shareReturn=null;
          state.workoutEditorOpen=false;
          showWorkouts(false,true);
        }
        window.scrollTo({top:0});return;
      }
       

      const hash = safeDecodeHash(); const id = e.state?.exercise || hash;
      if (hash === 'dashboard' || e.state?.view === 'dashboard' || !hash) showDashboard(false);
      else if (hash === 'library' || e.state?.view === 'library') showLibrary(false);
       


      else if (e.state?.view === 'workout' && e.state?.sub === 'history') {
        showWorkouts(false);
        state.workoutHistoryOpen = true;
        renderWorkoutScreen();
        setActiveNav('workout', null);
        window.scrollTo({top:0, behavior:'auto'});
      }
      else if (e.state?.view === 'workout' && e.state?.sub === 'complete' && e.state?.completedId) {
        const w = workoutState.completed.find(x => x.id === e.state.completedId);
         


        if (w) { state.workoutDetailReturn = returnRouteKey(e.state.returnTo)||ROUTES.DETAIL_RETURN.HISTORY; renderCompletedWorkout(w); window.scrollTo({top:0,behavior:'auto'}); }
        else showWorkouts(false);
      }
      else if (hash === 'workout' || e.state?.view === 'workout') {
         





        const exRet=state.exerciseDetailReturn;
        if(exRet&&exRet.view==='workout'&&exRet.sub&&exRet.sub!=='start'){
          state.exerciseDetailReturn=null;
          state.workoutEditorOpen=exRet.sub==='editor'&&!!workoutState.draft;
          state.builderOpen=exRet.sub==='builder'&&!!state.savedBuilder;
          state.savedWorkoutId=exRet.sub==='saved'?(exRet.savedWorkoutId||null):null;
          state.workoutHistoryOpen=exRet.sub==='history';
          showWorkouts(false,true);
        }
        else showWorkouts(false);
      }
      else if (hash === 'program' || e.state?.view === 'program') showProgram(false);
      else if (hash === 'stats' || e.state?.view === 'stats') showStats(false);
      else if (hash === 'settings' || e.state?.view === 'settings') showSettings(false);
      else if (id && exercises.some(x => x.id === id)) openExercise(id, false, e.state?.exReturn ?? undefined); else showDashboard(false);
    });
     






    try{history.scrollRestoration='manual';}catch(_){}

     






    try{
      const info=window.BUILD_INFO;
      if(info){
         


        const _avv=$('#appVersionValue');
        if(_avv)_avv.textContent=`v${info.appVersion}`;
        else{const _avl=$('#appVersionLink')||$('#appVersionLine');
        if(_avl)_avl.textContent=`Kohlrabi v${info.appVersion}`;}
        const built=new Date(info.builtAt);
        $('#buildUpdatedLine').textContent='Last updated: '+(isNaN(built)?info.build:built.toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'}));
      }
    }catch(_){}
     




    try{
      const _aec=$('#aboutExerciseCount');
      if(_aec&&typeof catalogExerciseCountLabel==='function')_aec.textContent=catalogExerciseCountLabel();
    }catch(_){}
     


    workoutState.templates=[];
     

     










    (async function(){
     


    try{if(typeof paintHomeSkeleton==='function')paintHomeSkeleton();}catch(_){}
    await restorePersisted();
     
    try{state.homeHydrated=true;}catch(_){}
     


    if(window.Sync&&typeof Sync.initSync==='function'){try{Sync.initSync();}catch(_){}}
     



    state.statsMetric=(progressionSetup.statsDefaultMetric==='sets'?'sets':'volume');
 


applySwipeSets();
updateLiveWorkoutIndicator();
populateFilters(); renderLibrary(); renderDashboard();
 




 



const bootShareAttempt=(()=>{
  try{
    if(/^#share=/.test(location.hash||''))return {type:'hash'};
    let slug=null;
    try{slug=typeof shortLinkAttemptFromPath==='function'?shortLinkAttemptFromPath(location.pathname):null;}catch(_){slug=null;}
    if(!slug){try{slug=typeof takeSpaRedirectSlug==='function'?takeSpaRedirectSlug():null;}catch(_){slug=null;}}
    if(slug)return {type:'short',slug};
  }catch(_){}
  return null;
})();
if(bootShareAttempt&&typeof openSharePreviewLoading==='function')openSharePreviewLoading();
 


let onboardingOwnsBoot=false;
if(!bootShareAttempt){
   


  try{onboardingOwnsBoot=await maybeStartOnboardingV2();}catch(_){onboardingOwnsBoot=false;}
}
 





try{document.documentElement.classList.remove('ob-pending');}catch(_){}
 



parseShareHash().then(sharePayload=>{
  if(sharePayload)openSharePreview(sharePayload);
   

  else if(bootShareAttempt&&bootShareAttempt.type==='hash'){dismissSharePreview();showToast('That share link didn\u2019t open \u2014 it may be broken or from an older version of the app.','error');showDashboard(false);}
  else if(/^#share=/.test(location.hash||''))showToast('That share link didn\u2019t open \u2014 it may be broken or from an older version of the app.','error');
});
 








(function(){
  try{
    if(typeof shortLinkAttemptFromPath!=='function'||typeof resolveShortShareLink!=='function')return;
    const INVALID_LINK_MSG='That share link didn\u2019t open \u2014 it may be broken or from an older version of the app.';
     

    let attempt=bootShareAttempt&&bootShareAttempt.type==='short'?bootShareAttempt.slug:null;
    if(!attempt){
      try{attempt=shortLinkAttemptFromPath(location.pathname);}catch(_){attempt=null;}
      if(!attempt&&typeof takeSpaRedirectSlug==='function')attempt=takeSpaRedirectSlug();
    }
    if(!attempt)return;  
     

    const shareFailed=()=>{if(bootShareAttempt&&bootShareAttempt.type==='short'){dismissSharePreview();showDashboard(false);}};
    if(typeof isValidShareSlug!=='function'||!isValidShareSlug(attempt)){shareFailed();showToast(INVALID_LINK_MSG);return;}
    resolveShortShareLink(attempt).then(payload=>{
      if(payload){openSharePreview(payload); try{if(typeof restoreShortSharePath==='function')restoreShortSharePath(attempt);}catch(_){}}
      else{shareFailed();showToast(INVALID_LINK_MSG);}
    }).catch(()=>{shareFailed();showToast(INVALID_LINK_MSG);});
  }catch(_){ }
})();

 


window.addEventListener('hashchange',()=>{
  if(/^#share=/.test(location.hash||'')){
    parseShareHash().then(payload=>{
       

      if(payload)openSharePreview(payload,{push:false});
      else showToast('That share link didn\u2019t open \u2014 it may be broken or from an older version of the app.','error');
    });
    return;
  }
   





  if(safeDecodeHash()==='program'){
     






     


    if(typeof state!=='undefined'&&!workoutState.activeProgram)state.programSetupOpen=true;
    showProgram(false);
    if(typeof maybeOfferNewProgramForDeepLink==='function')maybeOfferNewProgramForDeepLink();
  }
});
 


const initialId = safeDecodeHash();
 

if (bootShareAttempt) {   }
else if (onboardingOwnsBoot) {   }
else if (initialId === 'library') showLibrary(false); else if (initialId === 'workout') showWorkouts(false); else if (initialId === 'program') { if(!workoutState.activeProgram)state.programSetupOpen=true; showProgram(false); maybeOfferNewProgramForDeepLink(); } else if (initialId === 'stats') showStats(false); else if (initialId === 'settings') showSettings(false); else if (initialId && exercises.some(x => x.id === initialId)) openExercise(initialId, false); else showDashboard(false);
 

if(typeof restoreRouteAfterUpdateReload==='function')restoreRouteAfterUpdateReload(bootShareAttempt);
    })();  
  
//# sourceMappingURL=app-bootstrap.js.map
