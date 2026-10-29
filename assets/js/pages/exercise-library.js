
 
     
     
     



    let filterTogglesBound = false;
    function populateFilters() {
      const muscles = allMuscleOptions();
       
      const equipment = [...new Set(exercises.filter(x=>!exerciseDeleted(x)).map(x => x.equipment).filter(Boolean))].sort();
      $('#muscleOptions').innerHTML = muscles.map(x => `<button class="muscle-option" type="button" data-muscle="${x}" aria-pressed="false"><span class="muscle-option-label" data-label="${titleCase(x)}">${titleCase(x)}</span></button>`).join('');
      $('#equipmentFilter').innerHTML = '<option value="">All equipment</option>' + equipment.map(x => `<option value="${x}">${titleCase(x)}</option>`).join('');
       


      document.querySelectorAll('.muscle-option[data-muscle]').forEach(button => button.addEventListener('click', () => {
        const muscle = button.dataset.muscle;
        if (state.muscles.has(muscle)) state.muscles.delete(muscle); else state.muscles.add(muscle);
        renderMuscleSelection();
        renderLibrary();
      }));
      if (!filterTogglesBound) {
        filterTogglesBound = true;
        $('#favoritesToggle')?.addEventListener('click', () => {
          state.onlyFavorites = !state.onlyFavorites;
          renderMuscleSelection();
          renderLibrary();
        });
         
        $('#customToggle')?.addEventListener('click', () => {
          state.onlyCustom = !state.onlyCustom;
          renderMuscleSelection();
          renderLibrary();
        });
      }
    }

     
    function renderMuscleSelection() {
      document.querySelectorAll('.muscle-option').forEach(button => button.setAttribute('aria-pressed', state.muscles.has(button.dataset.muscle)));
      const favToggle = $('#favoritesToggle');
      if (favToggle) favToggle.setAttribute('aria-pressed', String(state.onlyFavorites));
      const customToggle = $('#customToggle');
      if (customToggle) customToggle.setAttribute('aria-pressed', String(state.onlyCustom));
       

      $('#clearAllFilters').hidden = !libraryFilterActive();
    }
     
    function libraryFilterActive() {
      return state.muscles.size > 0 || state.onlyFavorites || state.onlyCustom || !!state.equipment;
    }
     





    function clearLibraryPanelFilters() {
      state.muscles.clear(); state.onlyFavorites = false; state.onlyCustom = false; state.equipment = '';
      const equipmentFilter = $('#equipmentFilter');
      if (equipmentFilter) equipmentFilter.value = '';
      renderMuscleSelection();
    }
     


    function clearLibraryFilters() {
      state.query='';state.muscles.clear();state.onlyFavorites=false;state.onlyCustom=false;state.equipment='';
      const searchInput=$('#searchInput');if(searchInput)searchInput.value='';
      const equipmentFilter=$('#equipmentFilter');if(equipmentFilter)equipmentFilter.value='';
      $('#clearSearch')?.classList.remove('visible');
      renderMuscleSelection();renderLibrary();
    }

     
    function filteredExercises() {
      const ranked = state.query ? rankedExerciseMatches(state.query, exercises.length) : exercises;
      return ranked.filter(x => {
         

        if (exerciseDeleted(x)) return false;
         
        if (x.aliasOf) return false;
        const allMuscles = [...x.primary, ...x.secondary];
        const muscleMatch = !state.muscles.size || [...state.muscles].every(muscle => allMuscles.includes(muscle));
        const favMatch = !state.onlyFavorites || state.favorites.has(x.id);
        const customMatch = !state.onlyCustom || x.custom;
        return muscleMatch && favMatch && customMatch && (!state.equipment || x.equipment === state.equipment);
      });
    }

    const STAR_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9z"/></svg>';
     
    function isFavorite(id) { return state.favorites.has(id); }
     
    function toggleFavorite(id) {
      if (!id) return;
      if (state.favorites.has(id)) state.favorites.delete(id); else state.favorites.add(id);
       
      if (!(state.favoriteStamps && typeof state.favoriteStamps === 'object')) state.favoriteStamps = {};
      const stampKey = (typeof canonicalExerciseId === 'function') ? canonicalExerciseId(id) : id;
      state.favoriteStamps[stampKey] = { fav: state.favorites.has(id) ? 1 : 0, ts: Date.now() };
      schedulePersist();
       
      const fav = state.favorites.has(id);
      document.querySelectorAll('.fav-toggle[data-id]').forEach(btn => {
        if (btn.dataset.id !== id) return;
        btn.setAttribute('aria-pressed', String(fav));
        btn.setAttribute('aria-label', fav ? 'Remove from favorites' : 'Add to favorites');
      });
      const detailFav = $('#detailFavToggle');
      if (detailFav && state.selected === id) {
        detailFav.setAttribute('aria-pressed', String(fav));
        detailFav.setAttribute('aria-label', fav ? 'Remove from favorites' : 'Add to favorites');
      }
       
      if (state.onlyFavorites) renderLibrary();
    }

     
    function exerciseCard(x) {
      const muscles = x.primary.length ? x.primary.map(muscle=>musclePill(muscle)).join('') : musclePill('Unspecified muscle');
      const fav = isFavorite(x.id);
      return `<div class="exercise-card" data-id="${escapeHtml(x.id)}">
        <button class="exercise-card-main" type="button" data-id="${escapeHtml(x.id)}" aria-label="Open ${escapeHtml(x.name)}">
          <h2>${escapeHtml(x.name)}</h2>
          <div class="tag-row">${muscles}<span class="tag">${escapeHtml(equipmentLabel(x))}</span>${x.unilateral ? '<span class="tag side">Single side</span>' : ''}${x.custom ? '<span class="tag custom">Custom</span>' : ''}</div>
        </button>
        <button class="fav-toggle" type="button" data-id="${escapeHtml(x.id)}" aria-pressed="${fav}" aria-label="${fav ? 'Remove from favorites' : 'Add to favorites'}">${STAR_SVG}</button>
      </div>`;
    }

     
     





    let _logsCache={raw:null,len:-1,byId:new Map()};
     




    function getExerciseLogs(id) {
       

      const cid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(id):id;
      const raw=workoutState.completed, rawList=Array.isArray(raw)?raw:[];
       






      if(_logsCache.raw!==raw||_logsCache.len!==rawList.length){
        _logsCache={raw,len:rawList.length,byId:new Map(),
          list:rawList.filter(w=>w&&Array.isArray(w.exercises))};
      }
      const completed=_logsCache.list;
      let logs=_logsCache.byId.get(cid);
      if(!logs){
        logs=completed.flatMap(workout => workout.exercises
          .filter(item => item&&((typeof canonicalExerciseId==='function')?canonicalExerciseId(item.exerciseId):item.exerciseId)===cid)
          .map(item => {
            const sets=Array.isArray(item.sets)?item.sets.filter(set=>set!=null):[];
             






            return {workoutId:workout.id,date: formatLogDate(workout.date), isoDate:workout.date, completedAt:workout.completedAt||null,   deloadPerformed:workout.deloadPerformed===true, tracking:item.tracking || (sets.some(set => set.seconds != null) ? 'time' : 'reps'), progression:item.progression?{...item.progression}:null,   focusPreset:workout.focusPreset||null, focusCustomRange:workout.focusCustomRange?{min:workout.focusCustomRange.min,max:workout.focusCustomRange.max}:null, exerciseTags:[...(item.exerciseTags||[])], sets:sets.map(set => ({w:set.w,r:set.r,seconds:set.seconds,distance:set.distance,rpe:set.rpe,...(set.complete!==undefined?{complete:set.complete}:{}),tags:[...(set.tags || [])],...(setSide(set)?{side:setSide(set)}:{}),...((typeof isFixedSet==='function'&&isFixedSet(set))?{fixed:true}:{}),...((typeof isAmrapSet==='function'&&isAmrapSet(set))?{amrap:true}:{})})), programId:workout.programId||null, programWorkoutUid:workout.programWorkoutUid||null, name:workout.name};
          }))
           


          .sort(sortByWorkoutDateDesc);
        _logsCache.byId.set(cid,logs);
      }
      return logs;
    }

     
    function recentExerciseIds() {
       


      const newest=new Map();
      (workoutState.completed||[]).forEach(workout=>{
        const key={isoDate:workout.date,date:workout.date,completedAt:workout.completedAt||null};
        (workout.exercises||[]).forEach(item=>{
           
          const cid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(item.exerciseId):item.exerciseId;
          const prev=newest.get(cid);
          if(!prev||sortByWorkoutDateDesc(key,prev)<0)newest.set(cid,key);
        });
      });
      return [...newest.keys()].sort((a,b)=>sortByWorkoutDateDesc(newest.get(a),newest.get(b)));
    }

     
    function renderLibrary() {
      const rows = filteredExercises();
       



      const sectioned = !state.query && !state.onlyFavorites;
      const favorites = sectioned ? [...state.favorites].map(id => rows.find(x => x.id === id)).filter(Boolean) : [];
      const favSet = new Set(favorites.map(x => x.id));
      const recentIds = recentExerciseIds();
      const recent = sectioned ? recentIds.filter(id => !favSet.has(id)).map(id => rows.find(x => x.id === id)).filter(Boolean) : [];
      const recentSet = new Set(recent.map(x => x.id));
      const rest = rows.filter(x => !favSet.has(x.id) && !recentSet.has(x.id));
      const exactQuery=normalize(state.query),hasLiteral=!state.query||rows.some(x=>normalize([x.name,x.id].join(' ')).includes(exactQuery));
       




      const visibleTotal=catalogExerciseCount();
       


      $('#resultCount').innerHTML = (state.query||libraryFilterActive()) ? `${rows.length} of ${visibleTotal} exercises${state.query ? ` ${hasLiteral?'matching':'closest to'} <span class="active-query">“${escapeHtml(state.query)}”</span>` : ''}` : `${visibleTotal} exercises`;
       


      const emptyMsg = state.onlyFavorites && !state.favorites.size
        ? `<div class="exercise-grid"><div class="empty"><strong>No favorites yet</strong>Tap the ☆ on any exercise to pin it here.</div></div>`
        : `<div class="exercise-grid"><div class="empty fork-empty-state">${emptyStateHtml({
            title:'No exercises found',
            description:'Nothing matches with the current search and filters.',
            primaryHtml:emptyStatePrimary('clearLibraryFiltersBtn','Clear search and filters'),
            secondaryHtml:emptyStateSecondary('addCustomFromEmptyBtn','+ Add it as a custom exercise')
          })}</div></div>`;
      $('#exerciseResults').innerHTML = rows.length ? `${favorites.length ? `<section class="library-section" aria-labelledby="favHeading"><div class="library-heading-row"><h2 class="library-heading" id="favHeading">Favorites</h2></div><div class="exercise-grid">${favorites.map(exerciseCard).join('')}</div></section><hr class="library-hairline">` : ''}${recent.length ? `<section class="library-section" aria-labelledby="recentHeading"><div class="library-heading-row"><h2 class="library-heading" id="recentHeading">Recent</h2></div><div class="exercise-grid">${recent.map(exerciseCard).join('')}</div></section>` : ''}<section class="library-section" aria-labelledby="allHeading"><div class="library-heading-row"><h2 class="library-heading" id="allHeading">All exercises</h2><button class="text-link" id="newExerciseLink" type="button">+ Custom exercise</button></div><div class="exercise-grid">${rest.map(exerciseCard).join('')}</div></section>` : emptyMsg;
      document.querySelectorAll('.exercise-card-main').forEach(btn => btn.addEventListener('click', () => openExercise(btn.dataset.id)));
      document.querySelectorAll('.exercise-card .fav-toggle').forEach(btn => btn.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(btn.dataset.id); }));
      $('#newExerciseLink')?.addEventListener('click', () => openCustomDialog());
       
      if(!rows.length && !(state.onlyFavorites && !state.favorites.size)){
        $('#clearLibraryFiltersBtn')?.addEventListener('click',clearLibraryFilters);
        $('#addCustomFromEmptyBtn')?.addEventListener('click',()=>{if(typeof openCustomDialog==='function')openCustomDialog();});
      }
    }

    
//# sourceMappingURL=exercise-library.js.map
