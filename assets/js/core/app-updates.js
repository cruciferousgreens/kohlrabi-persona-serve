 
     





         

    const AUTO_UPDATE_CHECK_MS = 10 * 60 * 1000;
    const UPDATE_ACTIVATION_TIMEOUT_MS = 20000;
    let lastAutoUpdateCheck = 0;
    let pendingUpdateWorker = null;
    let dismissedUpdateWorker = null;
     










    let trackedUpdateWorker = null;
     











    let serverUpdatePending = false;
    let lastProbedServerVersion = null;
    let dismissedServerVersion = null;
     


    async function probeServerVersion() {
      try {
        const res = await fetch('assets/js/build-info.js?cg-update-probe=' + Date.now(), { cache: 'no-store' });
        if (!res || !res.ok) return null;
        const text = await res.text();
        const m = /appVersion\s*:\s*"(\d+(?:\.\d+)*)"/.exec(text || '');
        return m ? m[1] : null;
      } catch (_) { return null; }
    }
     
    function versionIsNewer(serverVersion, runningVersion) {
      const a = String(serverVersion || '').split('.').map((n) => parseInt(n, 10));
      const b = String(runningVersion || '').split('.').map((n) => parseInt(n, 10));
      if (a.some(Number.isNaN) || b.some(Number.isNaN)) return false;
      for (let i = 0; i < Math.max(a.length, b.length); i++) {
        const d = (a[i] || 0) - (b[i] || 0);
        if (d > 0) return true;
        if (d < 0) return false;
      }
      return false;
    }
     





    function aboutUpdateAvailableText(runningVersion, serverVersion) {
      if (!serverVersion || !runningVersion) return null;
      return versionIsNewer(serverVersion, runningVersion) ? ('Update available: v' + serverVersion) : null;
    }
     





    function renderAboutUpdateLine() {
      const line = $('#updateAvailableLine');
      if (!line) return;
      const runningVersion = (typeof window !== 'undefined' && window.BUILD_INFO) ? window.BUILD_INFO.appVersion : null;
      let text = aboutUpdateAvailableText(runningVersion, lastProbedServerVersion);
      if (!text && (pendingUpdateWorker || serverUpdatePending)) text = 'Update available';
      if (text) {
        const span = $('#updateAvailableText');
        if (span) span.textContent = text;
      }
      line.hidden = !text;
    }
    const swApi = ('serviceWorker' in navigator) ? navigator.serviceWorker : null;
    const initialSWController = swApi ? swApi.controller : null;
     
    function draftIsLive() {
      return typeof workoutState !== 'undefined' && !!workoutState.draft;
    }
     





    function stashRouteForUpdateReload(){
      try{
        if(typeof state==='undefined')return;
        sessionStorage.setItem('cg-post-update-route',JSON.stringify({
          view:state.activeView||null,
          workoutEditorOpen:!!(state.workoutEditorOpen&&typeof workoutState!=='undefined'&&workoutState.draft),
          builderOpen:!!(state.builderOpen&&state.savedBuilder),
          savedWorkoutId:state.savedWorkoutId||null,
          workoutHistoryOpen:!!state.workoutHistoryOpen,
        }));
      }catch(_){}
    }
     



    function restoreRouteAfterUpdateReload(bootShareAttempt){
      try{
        const rawRoute=sessionStorage.getItem('cg-post-update-route');
        sessionStorage.removeItem('cg-post-update-route');
        const savedRoute=rawRoute?JSON.parse(rawRoute):null;
        if(savedRoute&&!bootShareAttempt&&savedRoute.view==='workout'){
          if(savedRoute.savedWorkoutId&&!workoutState.templates.some(t=>t.id===savedRoute.savedWorkoutId))savedRoute.savedWorkoutId=null;
          if(savedRoute.workoutEditorOpen||savedRoute.builderOpen||savedRoute.savedWorkoutId||savedRoute.workoutHistoryOpen){
            state.workoutEditorOpen=!!savedRoute.workoutEditorOpen;
            state.builderOpen=!!savedRoute.builderOpen;
            state.savedWorkoutId=savedRoute.savedWorkoutId;
            state.workoutHistoryOpen=!!savedRoute.workoutHistoryOpen;
            showWorkouts(false,true);
          }
        }
      }catch(_){}
    }
     
    function offerUpdateRefresh(worker) {
      if (worker) pendingUpdateWorker = worker;
      renderAboutUpdateLine();  
      if (dismissedUpdateWorker && worker && dismissedUpdateWorker === worker) return;  
      if (draftIsLive()) return;  
      const dlg = $('#updateAvailableDialog');
      if (dlg && !dlg.open) dlg.showModal();
    }
     
    function armUpdateWatch(reg) {
      if (!reg || reg._cgUpdateWatchArmed) return;
      reg._cgUpdateWatchArmed = true;
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;
        trackedUpdateWorker = worker;  
        worker.addEventListener('statechange', () => {
           










          if (worker.state === 'installed' && initialSWController) offerUpdateRefresh(worker);
          else if (worker.state === 'activated' && initialSWController) offerUpdateRefresh(worker);
          else if (worker.state === 'redundant' && trackedUpdateWorker === worker) trackedUpdateWorker = null;
        });
      });
    }
    if (swApi) {
       


      swApi.addEventListener('controllerchange', () => {
        const c = swApi.controller;
        if (initialSWController && c && c !== initialSWController) offerUpdateRefresh(c);
      });
    }

     

    function waitForWorkerState(worker, target, timeoutMs) {
      return new Promise((resolve) => {
        if (!worker || worker.state === target || worker.state === 'redundant') {
          resolve(worker ? worker.state : 'none');
          return;
        }
        const timer = setTimeout(() => {
          worker.removeEventListener('statechange', onChange);
          resolve(worker.state);
        }, timeoutMs);
         
        function onChange() {
          if (worker.state === target || worker.state === 'redundant') {
            clearTimeout(timer);
            worker.removeEventListener('statechange', onChange);
            resolve(worker.state);
          }
        }
        worker.addEventListener('statechange', onChange);
      });
    }

     
    async function checkForAppUpdate({ manual = false } = {}) {
      try {
        if (!('serviceWorker' in navigator)) {
          if (manual) showToast('Updates are handled by your browser.');
          return;
        }
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          if (manual) showToast("Couldn't check for updates. Try again in a moment.",'error');
          return;
        }
         


        armUpdateWatch(reg);
         



        if (manual) { dismissedUpdateWorker = null; dismissedServerVersion = null; }
         

        const serverVersion = await probeServerVersion();
        if (serverVersion) lastProbedServerVersion = serverVersion;
        const runningVersion = (typeof window !== 'undefined' && window.BUILD_INFO) ? window.BUILD_INFO.appVersion : null;
        const serverNewer = !!(serverVersion && runningVersion && versionIsNewer(serverVersion, runningVersion));
         

        const serverOfferable = serverNewer && (manual || serverVersion !== dismissedServerVersion);
        const beforeController = swApi ? swApi.controller : null;
        try { await reg.update(); } catch (_) {   }
        await new Promise((r) => setTimeout(r, 0));
         


        const afterController = swApi ? swApi.controller : null;
        if (beforeController && afterController && afterController !== beforeController) {
          serverUpdatePending = false;  
          offerUpdateRefresh(afterController);
          return;
        }
        const worker = reg.installing || reg.waiting ||
          ((trackedUpdateWorker && trackedUpdateWorker.state !== 'redundant' && trackedUpdateWorker.state !== 'activated') ? trackedUpdateWorker : null);
        if (!worker) {
           

          if (pendingUpdateWorker && !draftIsLive()) { offerUpdateRefresh(pendingUpdateWorker); return; }
           



          if (serverOfferable) { serverUpdatePending = true; offerUpdateRefresh(null); return; }
           



          if (serverVersion) renderAboutUpdateLine();
          if (manual) showToast("You're on the latest version.");
          return;
        }
         










        const state = (worker.state === 'installed' || worker.state === 'activated')
          ? worker.state
          : await waitForWorkerState(worker, beforeController ? 'installed' : 'activated', UPDATE_ACTIVATION_TIMEOUT_MS);
        if (state !== 'installed' && state !== 'activated') {
           


          if (serverOfferable) { serverUpdatePending = true; offerUpdateRefresh(worker); return; }
          if (manual) showToast(state === 'redundant'
            ? "Update found but couldn't download. Try again."
            : 'Still downloading the update. Try again in a moment.');
          return;
        }
        if (state === 'activated' && !beforeController) {
           

          if (manual) showToast("You're on the latest version.");
          return;
        }
        serverUpdatePending = false;
        offerUpdateRefresh(worker);
        return;
      } catch (_) {
        if (manual) showToast("Couldn't check for updates. You're offline?",'error');
      }
    }

     
    function maybeAutoUpdateCheck() {
       








      if (typeof workoutState !== 'undefined' && workoutState.draft) return;
      const now = Date.now();
      if (now - lastAutoUpdateCheck < AUTO_UPDATE_CHECK_MS) return;
      lastAutoUpdateCheck = now;
      checkForAppUpdate({ manual: false });
    }

    $('#checkUpdatesButton')?.addEventListener('click', () => checkForAppUpdate({ manual: true }));
     
















    const UPDATE_WAITING_RELOAD_KEY = 'cg-waiting-reload-at';
    async function applyPendingUpdate() {
      $('#updateAvailableDialog')?.close();
      stashRouteForUpdateReload();  
      if (serverUpdatePending) {
        serverUpdatePending = false;
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) await reg.unregister();
        } catch (_) {   }
        location.reload();
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const waiting = reg ? (reg.waiting ||
          ((pendingUpdateWorker && pendingUpdateWorker.state === 'installed') ? pendingUpdateWorker : null)) : null;
        if (waiting && swApi) {
          let lastAttempt = 0;
          try { lastAttempt = Number(sessionStorage.getItem(UPDATE_WAITING_RELOAD_KEY) || 0); } catch (_) {}
          if (lastAttempt && (Date.now() - lastAttempt) < 60000) {
            try { sessionStorage.removeItem(UPDATE_WAITING_RELOAD_KEY); } catch (_) {}
            try { await reg.unregister(); } catch (_) {   }
            location.reload();
            return;
          }
          try { sessionStorage.setItem(UPDATE_WAITING_RELOAD_KEY, String(Date.now())); } catch (_) {}
          await new Promise((resolve) => {
            let settled = false;
            const finish = () => { if (!settled) { settled = true; resolve(); } };
            const onControllerChange = () => { swApi.removeEventListener('controllerchange', onControllerChange); finish(); };
            swApi.addEventListener('controllerchange', onControllerChange);
            setTimeout(finish, 3000);
            try { waiting.postMessage({ type: 'SKIP_WAITING' }); } catch (_) { finish(); }
          });
        }
      } catch (_) {   }
      location.reload();
    }
    $('#updateRefreshNow')?.addEventListener('click', () => { applyPendingUpdate(); });
    $('#aboutUpdateRefresh')?.addEventListener('click', () => { applyPendingUpdate(); });
     












    $('#updateLater')?.addEventListener('click', () => {
      dismissedUpdateWorker = pendingUpdateWorker;
      if (serverUpdatePending) { dismissedServerVersion = lastProbedServerVersion; }
      $('#updateAvailableDialog')?.close();
    });
    $('#closeUpdateAvailable')?.addEventListener('click', () => {
      dismissedUpdateWorker = pendingUpdateWorker;
      if (serverUpdatePending) { dismissedServerVersion = lastProbedServerVersion; }
      $('#updateAvailableDialog')?.close();
    });
     




    $('#futureVersionReload')?.addEventListener('click', () => {
      $('#futureVersionDialog')?.close();
      stashRouteForUpdateReload();  
      location.reload();
    });
    $('#futureVersionLater')?.addEventListener('click', () => {
      $('#futureVersionDialog')?.close();
    });
    $('#closeFutureVersion')?.addEventListener('click', () => {
      $('#futureVersionDialog')?.close();
    });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) maybeAutoUpdateCheck(); });
    window.addEventListener('focus', () => maybeAutoUpdateCheck());
    window.addEventListener('online', () => maybeAutoUpdateCheck());
    window.addEventListener('load', () => setTimeout(maybeAutoUpdateCheck, 5000));
//# sourceMappingURL=app-updates.js.map
