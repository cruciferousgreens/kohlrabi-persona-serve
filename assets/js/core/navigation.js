
 
     




     

    function hideAllViews() {
       


      noteCardFlightNav();
       




      const focused=document.activeElement;
      if(focused&&focused!==document.body)focused.blur();
      $('#dashboardView').classList.remove('active');
      $('#libraryView').classList.add('hidden');
      $('#detailView').classList.remove('active');
      $('#workoutView').classList.remove('active');
      $('#programView').classList.remove('active');
      $('#statsView').classList.remove('active');
      $('#settingsView').classList.remove('active');
    }
     
    function showDashboard(push = true) {
      rememberScroll(); state.activeView = 'dashboard'; hideAllViews();
      $('#dashboardView').classList.add('active'); setActiveNav('dashboard'); renderDashboard(); restoreScroll('dashboard');
      if (push) history.pushState({view:'dashboard'}, '', '#dashboard');
    }
     
    function showLibrary(push = true) {
      rememberScroll(); state.selected = null; state.activeView = 'library'; hideAllViews();
      $('#libraryView').classList.remove('hidden'); setActiveNav('library'); restoreScroll('library');
      if (push) history.pushState({view:'library'}, '', '#library');
    }
     
    function showWorkouts(push = true, keepSub = false) {
      rememberScroll(); state.selected = null; state.activeView = 'workout'; hideAllViews();
       



      if (!keepSub) {
        state.workoutEditorOpen = false; state.savedWorkoutId = null;
        state.sharePreview = null;
         

        state.builderOpen = false;
         


        state.workoutHistoryOpen = false;
        $('#workoutComplete').hidden = true;
      }
      $('#workoutView').classList.add('active');
       
      setActiveNav('workout', state.workoutHistoryOpen ? null : 'workout');
      renderWorkoutScreen(); restoreScroll('workout');
      if (push) history.pushState({view:'workout'}, '', '#workout');
    }
     
    function showProgram(push = true) {
       



      if(push&&typeof suppressNextProgramDeepLinkOffer==='function')suppressNextProgramDeepLinkOffer();
       



       


      rememberScroll(); state.selected = null; state.activeView = 'program'; state.programSegment = 'train'; hideAllViews();
      $('#programView').classList.add('active'); setActiveNav('program'); renderProgram(); restoreScroll('program');
      if (push) history.pushState({view:'program'}, '', '#program');
    }
     
    function showStats(push = true) {
      rememberScroll(); state.selected = null; state.activeView = 'stats'; hideAllViews();
      $('#statsView').classList.add('active'); setActiveNav('stats');
       




      if(!statsHydrated){
        paintStatsSkeleton();
        const hydrateStats=()=>{try{renderStats();restoreScroll('stats');}catch(err){console.error(err);}};
        if(typeof requestAnimationFrame==='function')requestAnimationFrame(()=>requestAnimationFrame(hydrateStats));
        else hydrateStats();
      }else{
        renderStats();restoreScroll('stats');
      }
      if (push) history.pushState({view:'stats'}, '', '#stats');
    }
     
    function showSettings(push = true) {
      let from = state.activeView;
      if (from === 'detail') {
        const ret = state.exerciseDetailReturn && state.exerciseDetailReturn.view;
        from = { library: 'library', workout: 'workout', program: 'program', dashboard: 'dashboard', stats: 'stats', 'completed-workout': 'workout' }[ret] || 'dashboard';
      }
      rememberScroll(); state.selected = null; state.activeView = 'settings'; hideAllViews();
      if (from !== 'settings' && TOP_BAR_TITLES[from]) state.settingsReturn = from;
       


      state.settingsPushed = !!push;
       

      if (typeof closeGymEquipmentPage==='function') closeGymEquipmentPage(true);
      $('#settingsView').classList.add('active'); setActiveNav('settings'); renderSettings(); applySettingsSectionsState(); restoreScroll('settings');
      updateLiveWorkoutIndicator();
      if (push) history.pushState({view:'settings'}, '', '#settings');
    }
     


    function backFromSettings() {
      if (state.settingsPushed) { history.back(); return; }
      const show = { dashboard: showDashboard, library: showLibrary, workout: showWorkouts, program: showProgram, stats: showStats }[state.settingsReturn];
      if (show) show(false); else showDashboard(false);
    }
 




    function goTab(show) {
       

      state.scroll = {};
      show();
      window.scrollTo({top:0, behavior:'auto'});
       

      updateLiveWorkoutIndicator();
    }
     



     



    function collapseWorkoutSubScreen(toHome){
       

      if(state.sharePreview){state.sharePreview=null;clearShareHash();renderWorkoutScreen();window.scrollTo({top:0});return true;}
      if(state.workoutEditorOpen&&workoutState.draft){
        const finishCollapse=()=>{
          state.workoutEditorOpen=false;
           


          if(state.shareReturn){
            if(toHome)state.shareReturn=null;
            else{state.sharePreview=state.shareReturn;state.shareReturn=null;}
          }
          renderWorkoutScreen();window.scrollTo({top:0});
        };
         




        if(!state.shareReturn&&flyWorkoutHeaderToStartCard(finishCollapse))return true;
        finishCollapse();return true;
      }
      if(state.builderOpen){closeBuilderToReturn(false);return true;}
      if(state.savedWorkoutId){state.savedWorkoutId=null;renderWorkoutScreen();window.scrollTo({top:0});return true;}
      if(state.workoutHistoryOpen){hideWorkoutHistory();return true;}
      if(!$('#workoutComplete').hidden){$('#workoutComplete').hidden=true;renderWorkoutScreen();window.scrollTo({top:0});return true;}
      return false;
    }
     


    function collapseWorkoutToStart(){
       

      if(!workoutState.draft&&!$('#workoutComplete').hidden){$('#workoutComplete').hidden=true;renderWorkoutScreen();window.scrollTo({top:0});return;}
       


      if(state.builderOpen){state.builderOpen=false;renderWorkoutScreen();window.scrollTo({top:0});return;}
       

      if(collapseWorkoutSubScreen(true))return;
       
      state.scroll[scrollKeyFor('workout')]=0;window.scrollTo({top:0});
    }
     



    function showProgramHome(){
      state.programWorkoutUid=null;
      state.savedProgramPreviewId=null;  
      if($('#createProgram')?.dataset.editing==='true'){requestCancelProgramEdit();return;}
      goTab(showProgram);
    }
     






    const ROUTES=Object.freeze({
      VIEW:Object.freeze({DASHBOARD:'dashboard',LIBRARY:'library',WORKOUT:'workout',PROGRAM:'program',STATS:'stats',SETTINGS:'settings',DETAIL:'detail'}),
      WORKOUT_SUB:Object.freeze({HISTORY:'history',COMPLETE:'complete',BUILDER:'builder',EDITOR:'editor',SAVED:'saved'}),
      DETAIL_RETURN:Object.freeze({DASHBOARD:'dashboard',PROGRAM:'program',LIBRARY:'library',HISTORY:'history',EXERCISE_DETAIL:'exercise-detail',WORKOUT:'workout'})
    });
     




    function makeReturnRoute(view,extra={}){return Object.assign({view},extra);}
     
    function returnRouteKey(route){
      if(typeof route==='string')return route;
      if(route&&typeof route.view==='string')return route.view;
      return undefined;
    }
     


    const WORKOUT_DETAIL_RETURNS={
      [ROUTES.DETAIL_RETURN.DASHBOARD]:()=>showDashboard(false),
      [ROUTES.DETAIL_RETURN.PROGRAM]:()=>showProgram(false),
      [ROUTES.DETAIL_RETURN.LIBRARY]:()=>showLibrary(false),
      [ROUTES.DETAIL_RETURN.HISTORY]:()=>{state.workoutHistoryOpen=true;$('#workoutComplete').hidden=true;renderWorkoutScreen();},
      [ROUTES.DETAIL_RETURN.EXERCISE_DETAIL]:()=>{
        if(state.workoutDetailExerciseId)openExercise(state.workoutDetailExerciseId,false,state.workoutDetailExerciseReturn||makeReturnRoute(ROUTES.VIEW.LIBRARY));
        else WORKOUT_DETAIL_RETURNS[ROUTES.DETAIL_RETURN.WORKOUT]();
      },
      [ROUTES.DETAIL_RETURN.WORKOUT]:()=>{$('#workoutComplete').hidden=true;renderWorkoutScreen();},
    };
     
    function backFromWorkoutDetail(){
      const target=returnRouteKey(state.workoutDetailReturn)||ROUTES.DETAIL_RETURN.WORKOUT;
      (WORKOUT_DETAIL_RETURNS[target]||WORKOUT_DETAIL_RETURNS[ROUTES.DETAIL_RETURN.WORKOUT])();
    }
     




    function updateLiveWorkoutIndicator() {
      const nav = $('#workoutsNav'); if (!nav) return;
      const live = !!workoutState.draft;
      nav.setAttribute('aria-label', live ? 'Workout: session in progress' : 'Workout');
       



      const chip = $('#liveWorkoutChip');
      if (chip) chip.hidden = !live || (state.activeView === 'workout' && state.workoutEditorOpen && !state.workoutHistoryOpen);
       

      const titleDot = $('#liveTitleDot');
      if (titleDot) titleDot.hidden = !live || !(state.activeView === 'workout' && state.workoutEditorOpen && !state.workoutHistoryOpen);
    }

     







































    const CARD_FLIGHT_MS = 380;
    const CARD_FLIGHT_FADE_MS = 110;  
    const CARD_FLIGHT_EASE = 'cubic-bezier(0, 0, 0.2, 1)';       
    const CARD_FLIGHT_EXIT_EASE = 'cubic-bezier(0.4, 0, 1, 1)';  
    const CARD_FLIGHT_STD_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';   
     










    const CARD_FLIGHT_FOLD_MS = 150;
    const CARD_FLIGHT_UNFOLD_MS = 190;
    const CARD_FLIGHT_CTA_SEL = '.fork-continue-actions';
    let cardFlightBusy = false;
    let cardFlightGen = 0;
     

    function noteCardFlightNav() { cardFlightGen++; }
    function cardFlightReducedMotion() {
      return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
     

    function cardFlightRectOf(el) {
      if (!el || typeof el.getBoundingClientRect !== 'function') return null;
      const r = el.getBoundingClientRect();
      if (!r || !(r.width > 0) || !(r.height > 0)) return null;
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }
     



    function cardFlightFace(el, rect) {
      const face = document.createElement('div');
      face.className = 'card-flight-face';
      face.style.width = rect.width + 'px'; face.style.height = rect.height + 'px';
      const clone = el.cloneNode(true);
      clone.removeAttribute('id');
      clone.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      clone.querySelectorAll('input,button,select,textarea,a,[tabindex]').forEach(n => { n.tabIndex = -1; });
      clone.setAttribute('aria-hidden', 'true');
      clone.style.margin = '0';
      clone.style.width = rect.width + 'px'; clone.style.height = rect.height + 'px';
       


      clone.style.overflow = 'hidden';
      clone.style.boxSizing = 'border-box';
      clone.style.minHeight = '0px';  
      face.appendChild(clone);
      return face;
    }
     


    function cardFlightZeroShadow(shadow) {
      if (!shadow || shadow === 'none') return null;
      return shadow.replace(/rgba?\([^)]+\)/g, 'rgba(0, 0, 0, 0)').replace(/-?\d+(\.\d+)?px/g, '0px');
    }
     



    function cardFlightFoldHeight(card) {
      if (!card || typeof card.querySelector !== 'function') return null;
      const act = card.querySelector(CARD_FLIGHT_CTA_SEL);
      const cr = cardFlightRectOf(card), ar = cardFlightRectOf(act);
      if (!cr || !ar) return null;
      const cs = getComputedStyle(card);
      const h = (ar.top - cr.top) - (parseFloat(cs.rowGap) || 0) + (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
      if (!(h > 0) || h >= cr.height - 4) return null;
      return Math.round(h);
    }
     



















    function runCardFlight(opts) {
      if (cardFlightBusy || cardFlightReducedMotion()) return false;
      if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') return false;
      const fromEl = opts.fromEl;
      if (!fromEl || typeof fromEl.animate !== 'function') return false;
      const from = cardFlightRectOf(fromEl);
      if (!from) return false;
      let dest = null;
      try { dest = opts.measure(); } catch (_) { dest = null; }
      if (!dest || !dest.rect || !dest.face) return false;
      const to = dest.rect;
      let box = null;
      try {
        box = document.createElement('div');
        box.className = 'card-flight';
        box.setAttribute('aria-hidden', 'true');
        box.style.left = from.left + 'px'; box.style.top = from.top + 'px';
        box.style.width = from.width + 'px'; box.style.height = from.height + 'px';
        const fromCs = getComputedStyle(fromEl);
        const fromRadius = fromCs.borderRadius || '0px';
        box.style.borderRadius = fromRadius;
        const srcFace = cardFlightFace(fromEl, from);
        box.appendChild(srcFace);
        box.appendChild(dest.face);
        document.body.appendChild(box);
        fromEl.style.visibility = 'hidden';
        cardFlightBusy = true;
        const genAtStart = cardFlightGen;
        let swapped = false, boxDone = false, arriveSettled = true, finishStarted = false;
        let hiddenDest = null;
        const anims = [];
        const track = (a) => { if (a) anims.push(a); };
         



        const travelTo = { left: to.left, top: to.top, width: to.width, height: to.height };
        let lead = 0, tail = 0, srcFoldH = null, destFoldH = null;
        if (opts.fold === 'out') {
          srcFoldH = cardFlightFoldHeight(fromEl);
          if (srcFoldH && srcFace.querySelector(CARD_FLIGHT_CTA_SEL)) lead = CARD_FLIGHT_FOLD_MS;
        } else if (opts.fold === 'in') {
          destFoldH = dest.foldHeight;
          if (destFoldH && destFoldH < to.height && dest.face.querySelector(CARD_FLIGHT_CTA_SEL)) { tail = CARD_FLIGHT_UNFOLD_MS; travelTo.height = destFoldH; }
        }
        const total = lead + CARD_FLIGHT_MS + tail;
        const landAt = lead + CARD_FLIGHT_MS;  
        const startH = lead ? srcFoldH : from.height;
         





        const k = (x, y, w, h, r) => ({ transform: `translate(${x}px, ${y}px)`, width: w + 'px', height: h + 'px', borderRadius: r });
        const toRadius = dest.radius || '0px';
        const boxFrames = [];
        if (lead) boxFrames.push(Object.assign(k(0, 0, from.width, from.height, fromRadius), { offset: 0, easing: CARD_FLIGHT_STD_EASE }));
        boxFrames.push(Object.assign(k(0, 0, from.width, startH, fromRadius), { offset: lead / total, easing: CARD_FLIGHT_EASE }));
        boxFrames.push(Object.assign(k(travelTo.left - from.left, travelTo.top - from.top, travelTo.width, travelTo.height, toRadius), { offset: landAt / total, easing: CARD_FLIGHT_STD_EASE }));
        if (tail) boxFrames.push(Object.assign(k(to.left - from.left, to.top - from.top, to.width, to.height, toRadius), { offset: 1 }));
        const fromShadow = fromCs.boxShadow, toShadow = dest.shadow;
        const shadowFrom = (fromShadow && fromShadow !== 'none') ? fromShadow : cardFlightZeroShadow(toShadow);
        const shadowTo = (toShadow && toShadow !== 'none') ? toShadow : cardFlightZeroShadow(fromShadow);
        if (shadowFrom && shadowTo) {
          boxFrames.forEach(f => { f.boxShadow = (f.offset < landAt / total) ? shadowFrom : shadowTo; });
        }
        const boxAnim = box.animate(boxFrames, { duration: total, easing: 'linear', fill: 'both' });
        track(boxAnim);
         






        const hFrames = boxFrames.map(f => { const o = { height: f.height, offset: f.offset }; if (f.easing) o.easing = f.easing; return o; });
        [srcFace, dest.face].forEach(face => {
          const clone = face.firstElementChild;
          if (clone && typeof clone.animate === 'function') track(clone.animate(hFrames, { duration: total, easing: 'linear', fill: 'both' }));
        });
         


        if (lead) {
          const cta = srcFace.querySelector(CARD_FLIGHT_CTA_SEL);
          track(cta.animate([{ opacity: 1, transform: 'translateY(0px)' }, { opacity: 0, transform: 'translateY(-6px)' }], { duration: Math.round(lead * 0.55), easing: CARD_FLIGHT_EXIT_EASE, fill: 'both' }));
        }
        if (tail) {
          const cta = dest.face.querySelector(CARD_FLIGHT_CTA_SEL);
          track(cta.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'translateY(0px)' }], { duration: tail - 40, delay: landAt + 40, easing: CARD_FLIGHT_EASE, fill: 'both' }));
        }
         









        dest.face.style.opacity = '0';
        track(srcFace.animate([{ opacity: 1 }, { opacity: 0 }], { duration: CARD_FLIGHT_FADE_MS, delay: landAt - CARD_FLIGHT_FADE_MS, easing: 'linear', fill: 'both' }));
        track(dest.face.animate([{ opacity: 0 }, { opacity: 1 }], { duration: CARD_FLIGHT_FADE_MS, delay: landAt - CARD_FLIGHT_FADE_MS, easing: 'linear', fill: 'both' }));
        if (opts.depart) { try { opts.depart(track, lead); } catch (_) {} }
        const maybeFinish = () => { if (boxDone && swapped && arriveSettled) finish(); };
        const doSwap = () => {
          if (finishStarted || swapped) return;
          swapped = true;
          if (cardFlightGen !== genAtStart) { maybeFinish(); return; }  
          try { opts.swap(); } catch (_) {}
          try { hiddenDest = opts.destEl ? opts.destEl() : null; } catch (_) { hiddenDest = null; }
          if (hiddenDest) hiddenDest.style.visibility = 'hidden';
          if (opts.arrive) {
            let ap = null;
            try { ap = opts.arrive(track, lead); } catch (_) {}
            if (ap && typeof ap.then === 'function') { arriveSettled = false; ap.then(() => { arriveSettled = true; maybeFinish(); }, () => { arriveSettled = true; maybeFinish(); }); }
          }
          maybeFinish();
        };
        const swapTimer = setTimeout(doSwap, opts.swapAt + lead);
        const safetyTimer = setTimeout(() => finish(), total + 900);
        boxAnim.finished.then(() => { boxDone = true; maybeFinish(); }, () => { boxDone = true; maybeFinish(); });
        function finish() {
          if (finishStarted) return;
          finishStarted = true;
          clearTimeout(swapTimer); clearTimeout(safetyTimer);
          if (!swapped) {
            swapped = true;
            if (cardFlightGen === genAtStart) {
              try { opts.swap(); } catch (_) {}
              try { hiddenDest = opts.destEl ? opts.destEl() : null; } catch (_) { hiddenDest = null; }
            }
          }
          anims.forEach(a => { try { a.cancel(); } catch (_) {} });
          if (hiddenDest) hiddenDest.style.visibility = '';
          try { fromEl.style.visibility = ''; } catch (_) {}
          if (box) box.remove();
          cardFlightBusy = false;
        }
        return true;
      } catch (_) {
        if (box) { try { box.remove(); } catch (_) {} }
        try { fromEl.style.visibility = ''; } catch (_) {}
        cardFlightBusy = false;
        return false;
      }
    }
     
    function cardFlightHeaderEl() {
      const ed = $('#workoutEditor');
      return ed ? ed.querySelector('.fork-header') : null;
    }
     



    function cardFlightEditorChildren(track, frames, timing) {
      const ed = $('#workoutEditor');
      if (!ed) return null;
      const jobs = [];
      Array.prototype.forEach.call(ed.children, (el, i) => {
        if (el.classList.contains('fork-header')) return;
        if (!cardFlightRectOf(el)) return;
        const t = Object.assign({}, timing);
        if (t.stagger) { t.delay = (t.delay || 0) + i * t.stagger; delete t.stagger; }
        const a = el.animate(frames, t);
        track(a); jobs.push(a.finished.catch(() => {}));
      });
      return Promise.all(jobs);
    }
     









    const CARD_FLIGHT_ENABLED = true;
     


    function flyCardToWorkoutHeader(cardEl, navigate) {
      if (!CARD_FLIGHT_ENABLED) return false;
      return runCardFlight({
        fromEl: cardEl,
        fold: 'out',
        swapAt: 200,
        measure() {
          const view = $('#workoutView'), dash = $('#dashboardView'), editor = $('#workoutEditor');
          if (!view || !editor) return null;
          const dashActive = dash && dash.classList.contains('active');
          const viewActive = view.classList.contains('active');
          const prevEditorOpen = state.workoutEditorOpen;
          const prevScrollY = window.scrollY || 0;
          if (dashActive) dash.classList.remove('active');
          view.classList.add('active');
          state.workoutEditorOpen = true;
          renderWorkoutScreen();
          window.scrollTo({ top: 0, behavior: 'auto' });
          const header = editor.querySelector('.fork-header');
          const rect = cardFlightRectOf(header);
          let out = null;
          if (rect) { const cs = getComputedStyle(header); out = { rect, face: cardFlightFace(header, rect), radius: cs.borderRadius, shadow: cs.boxShadow }; }
          state.workoutEditorOpen = prevEditorOpen;
          renderWorkoutScreen();
          if (!viewActive) view.classList.remove('active');
          if (dashActive) dash.classList.add('active');
          window.scrollTo({ top: prevScrollY, behavior: 'auto' });
          return out;
        },
        swap: navigate,
        destEl() { return cardFlightHeaderEl(); },
        depart(track, lead) {
          lead = lead || 0;
          const view = $('#dashboardView');
          if (!view) return;
           

          const knock = (el, delay) => {
            if (!cardFlightRectOf(el)) return;
            track(el.animate([
              { transform: 'translateY(0px)', opacity: 1, offset: 0 },
              { transform: 'translateY(3px)', opacity: 1, offset: 0.16 },
              { transform: 'translateY(-36px)', opacity: 0, offset: 1 }
            ], { duration: 210, delay, easing: CARD_FLIGHT_EXIT_EASE, fill: 'both' }));
          };
          knock(view.querySelector('.calendar-toolbar'), lead + 35);
          knock($('#weekStrip'), lead + 50);
           

          Array.prototype.forEach.call(view.children, (el) => {
            if (el === cardEl || el.classList.contains('calendar-toolbar') || el.id === 'weekStrip') return;
            if (!cardFlightRectOf(el)) return;
            track(el.animate([
              { opacity: 1, transform: 'translateY(0px)' },
              { opacity: 0, transform: 'translateY(14px)' }
            ], { duration: 180, delay: lead + 25, easing: CARD_FLIGHT_EXIT_EASE, fill: 'both' }));
          });
        },
        arrive(track) {
          return cardFlightEditorChildren(track,
            [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'translateY(0px)' }],
            { duration: 230, stagger: 30, easing: CARD_FLIGHT_EASE, fill: 'both' });
        }
      });
    }
     

    function flyWorkoutHeaderToStartCard(navigate) {
      if (!CARD_FLIGHT_ENABLED) return false;
      const header = cardFlightHeaderEl();
      const hr = cardFlightRectOf(header);
       

      if (!hr || hr.top < 0) return false;
      return runCardFlight({
        fromEl: header,
        fold: 'in',
        swapAt: 160,
        measure() {
          const prevScrollY = window.scrollY || 0;
          state.workoutEditorOpen = false;
          renderWorkoutScreen();
          window.scrollTo({ top: 0, behavior: 'auto' });
          const wrap = $('#continueWorkoutWrap');
          const card = wrap ? wrap.querySelector('.continue-workout-card') : null;
          const rect = cardFlightRectOf(card);
          let out = null;
          if (rect) { const cs = getComputedStyle(card); out = { rect, face: cardFlightFace(card, rect), radius: cs.borderRadius, shadow: cs.boxShadow, foldHeight: cardFlightFoldHeight(card) }; }
          state.workoutEditorOpen = true;
          renderWorkoutScreen();
          window.scrollTo({ top: prevScrollY, behavior: 'auto' });
          return out;
        },
        swap: navigate,
        destEl() { const wrap = $('#continueWorkoutWrap'); return wrap ? wrap.querySelector('.continue-workout-card') : null; },
        depart(track) {
          cardFlightEditorChildren(track,
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 160, easing: CARD_FLIGHT_EXIT_EASE, fill: 'both' });
        },
         



        arrive(track) {
          const wrap = $('#continueWorkoutWrap');
          const card = wrap ? wrap.querySelector('.continue-workout-card') : null;
          const jobs = [];
          for (let el = card; el && el.parentElement && el.id !== 'workoutView'; el = el.parentElement) {
            Array.prototype.forEach.call(el.parentElement.children, (sib) => {
              if (sib === el || !cardFlightRectOf(sib)) return;
              const a = sib.animate([
                { opacity: 0, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'translateY(0px)' }
              ], { duration: 220, delay: 30, easing: CARD_FLIGHT_EASE, fill: 'both' });
              track(a); jobs.push(a.finished.catch(() => {}));
            });
          }
          return Promise.all(jobs);
        }
      });
    }
     


    function cardFlightHomeCardEl() {
      const top = $('#workoutInProgressCard');
      if (top && !top.hidden && cardFlightRectOf(top)) return top;
      const hero = $('#heroWorkoutInProgress');
      if (hero && cardFlightRectOf(hero)) return hero;
      return null;
    }
     



    function flyWorkoutHeaderToHomeCard(navigate) {
      if (!CARD_FLIGHT_ENABLED) return false;
      const header = cardFlightHeaderEl();
      const hr = cardFlightRectOf(header);
      if (!hr || hr.top < 0) return false;
      return runCardFlight({
        fromEl: header,
        fold: 'in',
        swapAt: 160,
        measure() {
          const view = $('#dashboardView'), wv = $('#workoutView');
          if (!view) return null;
          const wvActive = wv && wv.classList.contains('active');
          const prevScrollY = window.scrollY || 0;
          if (wvActive) wv.classList.remove('active');
          view.classList.add('active');
           


          if (typeof renderDashboard === 'function') { try { renderDashboard(); } catch (_) {} }
          window.scrollTo({ top: 0, behavior: 'auto' });
          const card = cardFlightHomeCardEl();
          const rect = cardFlightRectOf(card);
          let out = null;
          if (rect) { const cs = getComputedStyle(card); out = { rect, face: cardFlightFace(card, rect), radius: cs.borderRadius, shadow: cs.boxShadow, foldHeight: cardFlightFoldHeight(card) }; }
          view.classList.remove('active');
          if (wvActive) wv.classList.add('active');
          window.scrollTo({ top: prevScrollY, behavior: 'auto' });
          return out;
        },
        swap: navigate,
        destEl() { return cardFlightHomeCardEl(); },
        depart(track) {
          cardFlightEditorChildren(track,
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 160, easing: CARD_FLIGHT_EXIT_EASE, fill: 'both' });
        },
        arrive(track) {
          const view = $('#dashboardView');
          if (!view) return null;
          const jobs = [];
          const rise = (el, delay) => {
            if (!cardFlightRectOf(el)) return;
            const a = el.animate([
              { transform: 'translateY(-24px)', opacity: 0 },
              { transform: 'translateY(0px)', opacity: 1 }
            ], { duration: 220, delay, easing: CARD_FLIGHT_EASE, fill: 'both' });
            track(a); jobs.push(a.finished.catch(() => {}));
          };
          rise(view.querySelector('.calendar-toolbar'), 0);
          rise($('#weekStrip'), 30);
          const grid = view.querySelector('.dashboard-grid');
          if (cardFlightRectOf(grid)) {
            const a = grid.animate([
              { opacity: 0, transform: 'translateY(10px)' },
              { opacity: 1, transform: 'translateY(0px)' }
            ], { duration: 220, delay: 30, easing: CARD_FLIGHT_EASE, fill: 'both' });
            track(a); jobs.push(a.finished.catch(() => {}));
          }
          return Promise.all(jobs);
        }
      });
    }

    
//# sourceMappingURL=navigation.js.map
