
 
     



     
    function customOptions() {
      return {
        muscles:allMuscleOptions(),
        equipment:[...new Set(exercises.map(x => x.equipment).filter(Boolean))].sort(),
        force:['push','pull','static'],
        mechanic:['compound','isolation'],
        tracking:['reps','time','distance']
      };
    }

     
    function pillMarkup(values, selected) {
      return values.map(value => `<button class="form-pill" type="button" data-value="${escapeHtml(value)}" aria-pressed="${selected instanceof Set ? selected.has(value) : selected === value}">${escapeHtml(titleCase(value))}</button>`).join('');
    }

     
    function renderCustomPills() {
      const options = customOptions();
      $('#customPrimaryOptions').innerHTML = pillMarkup(options.muscles, customDraft.primary);
      $('#customSecondaryOptions').innerHTML = pillMarkup(options.muscles, customDraft.secondary);
      $('#customEquipmentOptions').innerHTML = pillMarkup(options.equipment, customDraft.equipment);
      $('#customForceOptions').innerHTML = pillMarkup(options.force, customDraft.force);
      $('#customMechanicOptions').innerHTML = pillMarkup(options.mechanic, customDraft.mechanic);
      $('#customTrackingOptions').innerHTML = pillMarkup(options.tracking, customDraft.tracking);
       










      const setupPills=(pairs,selected)=>pairs.map(([value,label]) => `<button class="form-pill" type="button" data-value="${value}" aria-pressed="${selected === value}">${label}</button>`).join('');
      $('#customSidesOptions').innerHTML = setupPills([['both','Both sides'],['single','Single side']], customDraft.sides);
      const dbFamilyCable = customDraft.equipment === 'cable';
      const dbFamilyKb = customDraft.equipment === 'kettlebells' || customDraft.equipment === 'kettlebell';
      $('#customDbOptions').innerHTML = setupPills([['one','One'],['pair-per',dbFamilyCable?'Pair (per stack)':dbFamilyKb?'Pair (per kettlebell)':'Pair (per dumbbell)'],['pair-total','Pair (total)']], customDraft.dbSetup);
      $('#customDbFieldset').hidden = !(customDraft.equipment === 'dumbbell' || dbFamilyCable || dbFamilyKb);
      const dbLegend = $('#customDbFieldset').querySelector('legend');
      if (dbLegend) dbLegend.textContent = dbFamilyCable ? 'CABLES' : dbFamilyKb ? 'KETTLEBELLS' : 'DUMBBELLS';
      $('#customDbOptions').setAttribute('aria-label', dbFamilyCable ? 'Cable setup' : dbFamilyKb ? 'Kettlebell setup' : 'Dumbbell setup');
      $('#customSidesOptions').querySelectorAll('.form-pill').forEach(button => button.addEventListener('click', () => { customDraft.sides = button.dataset.value; renderCustomPills(); }));
      $('#customDbOptions').querySelectorAll('.form-pill').forEach(button => button.addEventListener('click', () => { customDraft.dbSetup = button.dataset.value; renderCustomPills(); }));

      $('#customPrimaryOptions').querySelectorAll('.form-pill').forEach(button => button.addEventListener('click', () => {
        const value = button.dataset.value;
        if (customDraft.primary.has(value)) customDraft.primary.delete(value);
        else { customDraft.primary.add(value); customDraft.secondary.delete(value); }
        renderCustomPills();
      }));
      $('#customSecondaryOptions').querySelectorAll('.form-pill').forEach(button => button.addEventListener('click', () => {
        const value = button.dataset.value;
        if (customDraft.secondary.has(value)) customDraft.secondary.delete(value);
        else { customDraft.secondary.add(value); customDraft.primary.delete(value); }
        renderCustomPills();
      }));
      [['#customEquipmentOptions','equipment'],['#customForceOptions','force'],['#customMechanicOptions','mechanic'],['#customTrackingOptions','tracking']].forEach(([selector,key]) => {
        $(selector).querySelectorAll('.form-pill').forEach(button => button.addEventListener('click', () => {
          customDraft[key] = customDraft[key] === button.dataset.value ? '' : button.dataset.value;
          renderCustomPills();
        }));
      });
    }

     




    let customAfterSave = null;
    function openCustomDialog(ex = null, afterSave = null) {
      $('#customExerciseForm').reset();
      $('#customFormError').textContent = '';
      $('#customExerciseId').value = ex?.id || '';
      customAfterSave = typeof afterSave === 'function' ? afterSave : null;
      $('#customExerciseTitle').textContent = ex ? 'Edit custom exercise' : 'Custom exercise';
      $('#customExerciseForm .primary-button[type="submit"]').textContent = ex ? 'Save changes' : 'Add exercise';
      customDraft.primary = new Set(ex?.primary || []);
      customDraft.secondary = new Set(ex?.secondary || []);
      customDraft.equipment = ex?.equipment || '';
      customDraft.force = ex?.force || '';
      customDraft.mechanic = ex?.mechanic || '';
      customDraft.tracking = ex?.tracking || 'reps';
       






      customDraft.sides = ex?.unilateral ? 'single' : 'both';
      customDraft.dbSetup = ex?.singleDumbbell === true ? 'one' : (ex?.dbEntryDefault === 'total' ? 'pair-total' : (ex?.singleDumbbell === false ? 'pair-per' : ((ex?.equipment === 'kettlebells' || ex?.equipment === 'kettlebell') ? 'one' : 'pair-per')));
      if (ex) {
        $('#customName').value = ex.name;
        $('#customInstructions').value = ex.instructions.join('\n');
      }
      renderCustomPills();
      $('#customExerciseDialog').showModal();
      requestAnimationFrame(() => $('#customName').focus());
    }

     
    function closeCustomDialog() {
      $('#customExerciseDialog').close();
    }

     
    function refreshFilters() {
      populateFilters();
      renderMuscleSelection();
      $('#equipmentFilter').value = state.equipment;
    }

     



    function deleteCustomExercise(id) {
      const stamp = Date.now();
      [exercises, state.customExercises].forEach(list => {
        const ex = list.find(x => x.id === id);
        if (ex) ex.deletedAt = stamp;
      });
      schedulePersist();
      refreshFilters();
      renderLibrary();
      showLibrary(false);
       


    }

     

    let pendingDeleteCustomId = null;
     
    function requestDeleteCustomExercise(id) {
      const ex = resolveExercise(id);
      $('#deleteCustomDesc').textContent = `Delete “${ex?.name || 'this exercise'}”? It will be hidden from the exercise library, but your workout history, stats, and PRs are kept.`;
      pendingDeleteCustomId = id;
      showModalPinned($('#deleteCustomDialog'));
    }
     
    function wireCustomDeleteDialog() {
      $('#cancelDeleteCustom')?.addEventListener('click', () => $('#deleteCustomDialog').close());
      $('#keepCustom')?.addEventListener('click', () => $('#deleteCustomDialog').close());
      $('#confirmDeleteCustom')?.addEventListener('click', () => {
        $('#deleteCustomDialog').close();
        if (pendingDeleteCustomId) deleteCustomExercise(pendingDeleteCustomId);
        pendingDeleteCustomId = null;
      });
    }

    
//# sourceMappingURL=custom-exercises.js.map
