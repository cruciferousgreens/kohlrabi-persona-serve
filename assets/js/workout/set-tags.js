
 
     



     
     






    let pendingLiveTagRender=false;
    let pendingLiveExerciseTagRender=false;
    let pendingBuilderTagRender=false;
    let pendingBuilderExerciseTagRender=false;
     
    function exerciseTagTargetItem() {
      const target=workoutState.exerciseTagTarget;
      if(!target)return null;
      if(target.mode==='template')return pickerTemplate()?.exercises.find(item=>item.exerciseId===target.exerciseId)||null;
       
      if(target.mode==='builder')return state.savedBuilder?.exercises.find(item=>item.uid===target.exerciseUid)||null;
      return workoutState.draft?.exercises.find(item=>item.uid===target.exerciseUid)||null;
    }
     
    function openExerciseTagDialog(target) {
      workoutState.exerciseTagTarget=target;
      $('#newExerciseTagInput').value='';
      renderExerciseTagDialog();
      $('#exerciseTagsDialog').showModal();
    }
     





    function blurTagDialogFocus(){
      const focused=document.activeElement;
      if(focused&&focused!==document.body&&focused.closest&&focused.closest('#setTagsDialog,#exerciseTagsDialog'))focused.blur();
    }
     
    function renderExerciseTagDialog() {
      const item=exerciseTagTargetItem(); if(!item)return;
      item.exerciseTags=item.exerciseTags||[];
       



      const options=[...new Set([...((typeof DONT_PROGRESS_TAG!=='undefined')?[DONT_PROGRESS_TAG]:[]),...workoutState.exerciseTagPresets,...item.exerciseTags])];
      $('#exerciseTagPickerOptions').innerHTML=options.map(tag=>`<button class="form-pill" type="button" data-exercise-tag="${escapeHtml(tag)}" aria-pressed="${item.exerciseTags.includes(tag)}">${escapeHtml(tag)}</button>`).join('');
       
      document.querySelectorAll('#exerciseTagPickerOptions [data-exercise-tag]').forEach(button=>button.addEventListener('click',()=>{
        const tag=button.dataset.exerciseTag;
        item.exerciseTags=item.exerciseTags.includes(tag)?item.exerciseTags.filter(value=>value!==tag):[...item.exerciseTags,tag];
         


        button.setAttribute('aria-pressed',String(item.exerciseTags.includes(tag)));
         



        if(workoutState.exerciseTagTarget?.mode==='template'){schedulePersist();renderPickerRules();}
        else if(workoutState.exerciseTagTarget?.mode==='builder'){schedulePersist();pendingBuilderExerciseTagRender=true;}
        else{markDraftSaved();pendingLiveExerciseTagRender=true;}
      }));
    }
     
    function addExerciseTag() {
      const tag=$('#newExerciseTagInput').value.trim(),item=exerciseTagTargetItem();
      if(!tag||!item)return;
      item.exerciseTags=item.exerciseTags||[];
      const existing=[...((typeof DONT_PROGRESS_TAG!=='undefined')?[DONT_PROGRESS_TAG]:[]),...workoutState.exerciseTagPresets,...item.exerciseTags].find(value=>value.toLowerCase()===tag.toLowerCase());
      const selected=existing||tag;
      if(!item.exerciseTags.includes(selected))item.exerciseTags.push(selected);
      $('#newExerciseTagInput').value='';
      renderExerciseTagDialog();
      if(workoutState.exerciseTagTarget?.mode==='template'){schedulePersist();renderPickerRules();}
      else if(workoutState.exerciseTagTarget?.mode==='builder'){schedulePersist();pendingBuilderExerciseTagRender=true;}
      else{markDraftSaved();pendingLiveExerciseTagRender=true;}
    }

     
    function findDraftSet(exerciseUid, setUid) {
      return workoutState.draft?.exercises.find(item => item.uid === exerciseUid)?.sets.find(set => set.uid === setUid);
    }

     


    function findTagSet(exerciseUid, setUid) {
      if (workoutState.tagTarget?.mode === 'builder')
        return state.savedBuilder?.exercises.find(item => item.uid === exerciseUid)?.sets.find(set => set.uid === setUid);
      return findDraftSet(exerciseUid, setUid);
    }

     



    function afterTagChange() {
      if (workoutState.tagTarget?.mode === 'builder') { schedulePersist(); pendingBuilderTagRender=true; }
      else { markDraftSaved(); pendingLiveTagRender=true; }
    }

     
    function openTagDialog(exerciseUid, setUid, mode) {
      workoutState.tagTarget = {exerciseUid, setUid, mode};
       



      if (!mode && setIsFrozen(findDraftSet(exerciseUid, setUid))) { workoutState.tagTarget = null; return; }
      $('#newTagInput').value = '';
      renderTagDialog();
      $('#setTagsDialog').showModal();
    }

     
    function renderTagDialog() {
      const target = workoutState.tagTarget;
      const set = target ? findTagSet(target.exerciseUid, target.setUid) : null;
      if (!set) return;
       




      $('#tagPickerOptions').innerHTML = workoutState.tags.map(tag => `<button class="form-pill" type="button" data-tag="${escapeHtml(tag)}" aria-pressed="${set.tags.includes(tag)}">${escapeHtml(setTagLabel(tag))}</button>`).join('')
        + `<button class="form-pill" type="button" data-fixed-tag="1" aria-pressed="${typeof isFixedSet==='function'&&isFixedSet(set)}">Don't progress</button>`
         




        + `<button class="form-pill" type="button" data-amrap-tag="1" aria-pressed="${typeof isAmrapSet==='function'&&isAmrapSet(set)}">AMRAP</button>`;
      document.querySelectorAll('#tagPickerOptions [data-fixed-tag]').forEach(button => button.addEventListener('click', () => {
        if (typeof isFixedSet==='function'&&isFixedSet(set)) delete set.fixed; else set.fixed = true;
        button.setAttribute('aria-pressed', String(typeof isFixedSet==='function'&&isFixedSet(set)));
        afterTagChange();
      }));
      document.querySelectorAll('#tagPickerOptions [data-amrap-tag]').forEach(button => button.addEventListener('click', () => {
        if (typeof isAmrapSet==='function'&&isAmrapSet(set)) delete set.amrap; else set.amrap = true;
        button.setAttribute('aria-pressed', String(typeof isAmrapSet==='function'&&isAmrapSet(set)));
        afterTagChange();
      }));
      $('#editableTagList').innerHTML = workoutState.tags.map(tag => `<span class="tag-list-item">${escapeHtml(setTagLabel(tag))}<button type="button" data-delete-tag="${escapeHtml(tag)}" aria-label="Remove ${escapeHtml(setTagLabel(tag))} from tag list">×</button></span>`).join('');
       



      document.querySelectorAll('#tagPickerOptions [data-tag]').forEach(button => button.addEventListener('click', () => {
        const tag = button.dataset.tag;
        set.tags = set.tags.includes(tag) ? set.tags.filter(item => item !== tag) : [...set.tags, tag];
         

        button.setAttribute('aria-pressed', String(set.tags.includes(tag)));
        afterTagChange();
      }));
       

      document.querySelectorAll('#editableTagList [data-delete-tag]').forEach(button => button.addEventListener('click', () => {
        const tag = button.dataset.deleteTag;
        workoutState.tags = workoutState.tags.filter(item => item !== tag);
        workoutState.draft?.exercises.forEach(item => item.sets.forEach(row => { row.tags = row.tags.filter(value => value !== tag); }));
         

        state.savedBuilder?.exercises.forEach(item => item.sets.forEach(row => { row.tags = (row.tags || []).filter(value => value !== tag); }));
         

        blurTagDialogFocus();
        renderTagDialog();
        afterTagChange();
      }));
    }

     
    function addTag() {
      const tag = $('#newTagInput').value.trim();
      if (!tag) return;
       

       


      if (tag.toLowerCase() === "don't progress") {
        const target0 = workoutState.tagTarget;
        const set0 = target0 ? findTagSet(target0.exerciseUid, target0.setUid) : null;
        if (set0) set0.fixed = true;
        $('#newTagInput').value = '';
        renderTagDialog();
        afterTagChange();
        return;
      }
      if (tag.toLowerCase() === 'fixed') {
        const target0 = workoutState.tagTarget;
        const set0 = target0 ? findTagSet(target0.exerciseUid, target0.setUid) : null;
        if (set0) set0.fixed = true;
        $('#newTagInput').value = '';
        renderTagDialog();
        afterTagChange();
        return;
      }
       


      if (tag.toLowerCase() === 'amrap') {
        const target0 = workoutState.tagTarget;
        const set0 = target0 ? findTagSet(target0.exerciseUid, target0.setUid) : null;
        if (set0) set0.amrap = true;
        $('#newTagInput').value = '';
        renderTagDialog();
        afterTagChange();
        return;
      }
      const existing = workoutState.tags.find(item => item.toLowerCase() === tag.toLowerCase());
      if (!existing) workoutState.tags.push(tag);
      const target = workoutState.tagTarget;
      const set = target ? findTagSet(target.exerciseUid, target.setUid) : null;
      const selected = existing || tag;
      if (set) { set.tags = set.tags || []; if (!set.tags.includes(selected)) set.tags.push(selected); }
      $('#newTagInput').value = '';
      renderTagDialog();
      afterTagChange();
    }

     









    function renderAfterTagDialog(render){
      const y=window.scrollY;
      const focused=document.activeElement;
      if(focused&&focused!==document.body)focused.blur();
      render();
      requestAnimationFrame(()=>window.scrollTo(0,y));
    }
     




    function syncLiveSetTagRow(target){
      if(!target||target.mode==='builder')return;
      const set=findDraftSet(target.exerciseUid,target.setUid);
      const row=document.querySelector(`.log-set[data-set-uid="${CSS.escape(target.setUid)}"]`);
      if(!row)return;
      const tags=set?.tags||[];
       
      const fixedNow=typeof isFixedSet==='function'&&isFixedSet(set);
       
      const amrapNow=typeof isAmrapSet==='function'&&isAmrapSet(set);
      const numBtn=row.querySelector('.log-set-number');
      if(numBtn)numBtn.classList.toggle('has-tags',tags.length>0||fixedNow||amrapNow);
      const chips=row.querySelector('.selected-set-tags');
      if(chips)chips.innerHTML=tags.map(tag=>`<span class="set-tag-chip">${escapeHtml(setTagLabel(tag))}</span>`).join('')+(fixedNow?`<span class="set-tag-chip">Don't progress</span>`:'')+(amrapNow?'<span class="set-tag-chip">AMRAP</span>':'');
    }
    $('#setTagsDialog')?.addEventListener('close',()=>{
      if(pendingLiveTagRender){pendingLiveTagRender=false;syncLiveSetTagRow(workoutState.tagTarget);}
      else if(pendingBuilderTagRender){pendingBuilderTagRender=false;renderAfterTagDialog(renderSavedBuilder);}
    });
    $('#exerciseTagsDialog')?.addEventListener('close',()=>{
      if(pendingLiveExerciseTagRender){pendingLiveExerciseTagRender=false;renderAfterTagDialog(renderWorkoutExercises);}
      else if(pendingBuilderExerciseTagRender){pendingBuilderExerciseTagRender=false;renderAfterTagDialog(renderSavedBuilder);}
    });

    
//# sourceMappingURL=set-tags.js.map
