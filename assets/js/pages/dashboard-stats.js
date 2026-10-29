
 
     



     
     












    function homeCalendarEnabled(){
       

      return true;
    }
     
    function workoutsForPeriod(period) {
       


      const now=new Date(); now.setHours(12,0,0,0);
      const today=localIsoDate(now); let start=null;
      if(period==='today') start=today;
      if(period==='week'){const d=new Date(now);d.setDate(now.getDate()-((now.getDay()+6)%7));start=localIsoDate(d);}  
      if(period==='month') start=`${today.slice(0,7)}-01`;
      if(period==='year') start=`${today.slice(0,4)}-01-01`;
      return (Array.isArray(workoutState.completed)?workoutState.completed:[])
        .filter(w=>w&&(!start||w.date>=start)&&w.date<=today);  
    }
     











    function forkLoggedSets(item){
      return ((item&&item.sets)||[]).filter(set=>set&&set.complete!==false);
    }
     
    function comparisonPeriods(period) {
      const now=new Date(); now.setHours(12,0,0,0);
      let currentStart, currentEnd, previousStart, previousEnd, label;
      if(period==='today'){
        currentStart=new Date(now); currentEnd=new Date(now); currentEnd.setDate(now.getDate()+1);
        previousStart=new Date(now); previousStart.setDate(now.getDate()-1); previousEnd=new Date(now);
        label='today vs yesterday';
      }else if(period==='week'){
        currentStart=new Date(now); currentStart.setDate(now.getDate()-((now.getDay()+6)%7)); currentEnd=new Date(currentStart); currentEnd.setDate(currentStart.getDate()+7);
        previousStart=new Date(currentStart); previousStart.setDate(currentStart.getDate()-7); previousEnd=new Date(currentStart);
        label='this week vs last week';
      }else if(period==='month'){
        currentStart=new Date(now.getFullYear(),now.getMonth(),1,12); currentEnd=new Date(now.getFullYear(),now.getMonth()+1,1,12);
        previousStart=new Date(now.getFullYear(),now.getMonth()-1,1,12); previousEnd=new Date(currentStart);
        label='this month vs last month';
      }else if(period==='year'){
        currentStart=new Date(now.getFullYear(),0,1,12); currentEnd=new Date(now.getFullYear()+1,0,1,12);
        previousStart=new Date(now.getFullYear()-1,0,1,12); previousEnd=new Date(currentStart);
        label='this year vs last year';
      }else if(period==='all'){
         






        currentStart=new Date(2000,0,1,12); currentEnd=new Date(now); currentEnd.setDate(now.getDate()+1);
        previousStart=new Date(now); previousEnd=new Date(now);
        label='all time';
      }else{
        currentEnd=new Date(now); currentEnd.setDate(now.getDate()+1); currentStart=new Date(currentEnd); currentStart.setDate(currentEnd.getDate()-28);
        previousEnd=new Date(currentStart); previousStart=new Date(previousEnd); previousStart.setDate(previousEnd.getDate()-28);
        label='last 4 weeks vs prior 4 weeks';
      }
       

      const cs=localIsoDate(currentStart), ce=localIsoDate(currentEnd), ps=localIsoDate(previousStart), pe=localIsoDate(previousEnd);
      const inWindow=(workout,start,end)=>workout.date>=start&&workout.date<end;
      return {current:workoutState.completed.filter(workout=>inWindow(workout,cs,ce)),previous:workoutState.completed.filter(workout=>inWindow(workout,ps,pe)),label};
    }
     










    function forkAllTimeTrendHalves(bySets){
      const today=localIsoDate();
      const logs=(Array.isArray(workoutState.completed)?workoutState.completed:[])
        .filter(w=>w&&w.date&&w.date<=today);
      const samples={};
      for(const w of logs){
        const t=new Date(String(w.date)+'T12:00:00').getTime();
        if(!Number.isFinite(t))continue;
        const agg=aggregateMuscleStats([w]);
        const map=bySets?agg.setCounts:agg.volumes;
        for(const muscle of Object.keys(map)){
          const v=Number(map[muscle]||0);
          if(!(v>0))continue;
          (samples[muscle]||(samples[muscle]=[])).push({t,v});
        }
      }
      const halves={};
      for(const muscle of Object.keys(samples)){
        const list=samples[muscle].slice().sort((a,b)=>a.t-b.t);
        const first=list[0].t, last=list[list.length-1].t;
        let current=0, previous=0;
        if(first===last){
          current=list.reduce((sum,x)=>sum+x.v,0);
        }else{
          const mid=first+(last-first)/2;
          for(const x of list){ if(x.t<mid)previous+=x.v; else current+=x.v; }
        }
        halves[muscle]={current,previous};
      }
      return halves;
    }
     
    function recentPRRows(workouts) {
      const rows=[];
       








      const seenPRKeys=new Set();
      const pushPR=row=>{
        const key=`${row.exerciseId}|${row.kind}|${row.date}`;
        if(seenPRKeys.has(key))return;
        seenPRKeys.add(key);
        rows.push(row);
      };
       



      const ordered=workouts.slice().sort(sortByRecencyDesc);
      for(const workout of ordered){
         




        const priorByExercise=new Map();
        for(const row of priorRowsForWorkout(workout)){
          for(const entry of (row.exercises||[])){
             
            const ecid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(entry.exerciseId):entry.exerciseId;
            let arr=priorByExercise.get(ecid);
            if(!arr)priorByExercise.set(ecid,arr=[]);
             


            for(const set of forkLoggedSets(entry))arr.push(set);
          }
        }
        workout.exercises.forEach(item=>{
        const itemCid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(item.exerciseId):item.exerciseId;
        const prior=priorByExercise.get(itemCid)||[];
         

        const loggedSets=forkLoggedSets(item);
         



        if((item.tracking||'reps')==='time'){
          const current=loggedSets.filter(set=>Number(set.seconds)>0); if(!current.length)return;
          if(!sessionPRKinds(current,prior,'time').includes('timed'))return;
          const best=Math.max(...current.map(set=>Number(set.seconds)));
          pushPR({exerciseId:itemCid,date:workout.date,kind:'Longest hold PR',value:`${best} sec`});
          return;
        }
         


        if((typeof setPerfField==='function'?setPerfField(item,exerciseById(item.exerciseId)):'r')==='distance'){
          const current=loggedSets.filter(set=>Number(set.distance)>0); if(!current.length)return;
          if(!sessionPRKinds(current,prior,'distance').includes('distance'))return;
          const best=Math.max(...current.map(set=>Number(set.distance)));
          pushPR({exerciseId:itemCid,date:workout.date,kind:'Longest distance PR',value:`${best} m`});
          return;
        }
         



         



        const currentBW=loggedSets.filter(set=>!(Number(set.w)>0)&&Number(set.r)>0);
        if(currentBW.length&&detectBodyweightPRs(currentBW,prior)){
          const bestBW=Math.max(...currentBW.map(set=>Number(set.r)));
          pushPR({exerciseId:itemCid,date:workout.date,kind:'Best rep set PR',value:`${bestBW} reps`});
        }
        const currentAll=loggedSets.filter(set=>Number(set.w)>0&&Number(set.r)>0);
        const current=currentAll; if(!current.length)return;
         







        const priorWeighted=prior.filter(set=>Number(set.w)>0&&Number(set.r)>0);
        if(!priorWeighted.length)return;
        const kinds=sessionPRKinds(current,priorWeighted,'reps');
        const isDb=pairImplementExercise(exerciseById(item.exerciseId));
        if(kinds.includes('e1rm')){const best=Math.max(...current.map(estimate1RM));pushPR({exerciseId:itemCid,date:workout.date,kind:'Est. 1RM PR',value:`${Math.round(dbDisplayWeight(best,item.exerciseId,null,isDb))} ${weightUnit()}`});}
        if(kinds.includes('heaviest')){const weight=Math.max(...current.map(set=>Number(set.w)));pushPR({exerciseId:itemCid,date:workout.date,kind:'Heaviest set PR',value:`${dbDisplayWeight(weight,item.exerciseId,null,isDb)} ${weightUnit()}`});}
         


        for(const rc of repCountPRs(current,priorWeighted))pushPR({exerciseId:itemCid,date:workout.date,kind:`${rc.reps}-rep PR`,value:`${dbDisplayWeight(rc.weight,item.exerciseId,null,isDb)} ${weightUnit()}`});
        });
        if(rows.length>=6)break;
      }
      return rows.slice(0,6);
    }
     





     




     














    function statsMetricToggleHtml(){
      const bySets=state.statsMetric==='sets';
      return `<div class="mini-segmented stats-metric-toggle" role="group" aria-label="Stats metric"><button type="button" data-stats-metric="volume" aria-pressed="${!bySets}">Weight</button><button type="button" data-stats-metric="sets" aria-pressed="${bySets}">Sets</button></div>`;
    }
     







    function renderStatsMetricToggle(slotSelector){
      const slot=$(slotSelector);
      if(slot)slot.innerHTML=statsMetricToggleHtml();
    }
     




    function wireStatsMetricToggles(){
      document.querySelectorAll('#statsView [data-stats-metric]').forEach(btn=>{
        btn.setAttribute('aria-pressed',String(btn.dataset.statsMetric===(state.statsMetric==='sets'?'sets':'volume')));
        btn.onclick=()=>{const mode=btn.dataset.statsMetric;if(state.statsMetric===mode)return;const y=window.scrollY;state.statsMetric=mode;renderStats();window.scrollTo(0,y);};
      });
    }
    function renderMuscleBreakdown(workouts){
      const byMuscleSets=state.statsMetric==='sets';
       


      const breakdownVolumes=muscleVolumes(workouts), breakdownSets=muscleSetCounts(workouts);
      const rows=Object.keys(Object.assign({},breakdownVolumes,breakdownSets))
        .map(muscle=>({muscle,volume:breakdownVolumes[muscle]||0,sets:breakdownSets[muscle]||0}))
        .filter(r=>byMuscleSets?r.sets>0:(r.volume>0||r.sets>0))
        .sort((a,b)=>byMuscleSets?b.sets-a.sets:((b.volume-a.volume)||(b.sets-a.sets)));
      const max=Math.max(1,...rows.map(r=>byMuscleSets?r.sets:Math.max(r.volume,1)));
       




       



       


      $('#muscleVolumeBreakdown').innerHTML=(rows.length?rows.slice(0,10).map((row)=>{
        const muscle=row.muscle;
        const isOpen=expandedMuscle===muscle;
        const drivers=isOpen?exercisesForMuscle(muscle,workouts,byMuscleSets):[];
        const drill=drivers.length?`<div class="muscle-drilldown">${drivers.map(([id,entry])=>{const setsLabel=`${entry.sets} set${entry.sets===1?'':'s'}`;const volLabel=formatVolume(entry.volume); const bwNoLoadDrill=entry.bodyweight&&!(entry.volume>0);const valueLabel=byMuscleSets?`${setsLabel} (${volLabel})`:(bwNoLoadDrill?setsLabel:`${volLabel} (${setsLabel})`);return `<button class="drilldown-row" type="button" data-stat-exercise="${escapeHtml(id)}"><span>${escapeHtml(exerciseById(id)?.name||'Exercise')}</span><span class="drilldown-value">${valueLabel}</span></button>`;}).join('')}</div>`:'';
        const valueLabel=byMuscleSets?`${row.sets} set${row.sets===1?'':'s'}`:(row.volume>0?formatVolume(row.volume):`${row.sets} set${row.sets===1?'':'s'}`);
        return `<div class="muscle-volume-group"><button class="muscle-volume-row${isOpen?' is-open':''}" type="button" data-muscle-drill="${escapeHtml(muscle)}" aria-expanded="${isOpen}"><strong class="analysis-label">${escapeHtml(muscle)}</strong><span class="analysis-track"><i class="analysis-fill" style="width:${Math.max(3,((byMuscleSets?row.sets:Math.max(row.volume,1))/max)*100).toFixed(1)}%"></i></span><span class="analysis-value">${valueLabel}</span></button>${drill}</div>`;
      }).join(''):`<p class="section-note">${periodEmptyNote(byMuscleSets)}</p>`);
      document.querySelectorAll('[data-muscle-drill]').forEach(btn=>btn.addEventListener('click',()=>{
        const y=window.scrollY;
        expandedMuscle=expandedMuscle===btn.dataset.muscleDrill?null:btn.dataset.muscleDrill;
        renderStats();
        window.scrollTo(0,y);
      }));
    }
     
    function renderTopExercises(workouts){
       
      const exerciseStats={};workouts.forEach(workout=>workout.exercises.forEach(item=>{const _cid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(item.exerciseId):item.exerciseId;const entry=exerciseStats[_cid]||(exerciseStats[_cid]={volume:0,sets:0});const logged=forkLoggedSets(item);entry.volume+=logged.reduce((sum,set)=>sum+setVolume(set,exerciseById(item.exerciseId)),0);entry.sets+=logged.length;}));  
      const bySets=state.statsMetric==='sets';
       


      const isBodyweightExercise=id=>exerciseById(id)?.equipment==='body only';
      const bwNoLoad=(id,entry)=>isBodyweightExercise(id)&&!(entry.volume>0);
      const topMetric=(id,entry)=>(bySets||bwNoLoad(id,entry))?entry.sets:entry.volume;
      const top=Object.entries(exerciseStats).filter(([id,entry])=>topMetric(id,entry)>0).sort((a,b)=>topMetric(b[0],b[1])-topMetric(a[0],a[1])).slice(0,6);
       



      $('#topExercises').innerHTML=top.length?`<div class="action-list">${top.map(([id,entry])=>{const showSets=bySets||bwNoLoad(id,entry);return `<button class="action-row" type="button" data-stat-exercise="${escapeHtml(id)}"><span><strong>${escapeHtml(exerciseById(id)?.name||'Exercise')}</strong><span>Open history and trend</span></span><span class="action-row-value">${showSets?`${entry.sets} set${entry.sets===1?'':'s'}`:formatVolume(entry.volume)}</span></button>`;}).join('')}</div>`:`<p class="section-note">${periodEmptyNote(bySets)}</p>`;
    }
     
     




    function renderRecentPRs(workouts){
      let prs=recentPRRows(workouts);
       








      if(!prs.length){
        const all=(Array.isArray(workoutState.completed)?workoutState.completed:[]).filter(w=>w&&w.date<=localIsoDate());
        if(all.length>workouts.length)prs=recentPRRows(all);
      }
      $('#recentPRs').innerHTML=prs.length?`<div class="action-list">${prs.map(pr=>`<button class="action-row pr-row" type="button" data-stat-exercise="${escapeHtml(pr.exerciseId)}"><span><strong>${escapeHtml(exerciseById(pr.exerciseId)?.name||'Exercise')}</strong><span>${escapeHtml(pr.kind)}</span></span><span class="pr-row-value">${escapeHtml(pr.value)}</span><span class="pr-row-date">${escapeHtml(formatLogDate(pr.date))}</span></button>`).join('')}</div>`:'<p class="section-note">No PRs recorded yet.</p>';
    }
     






    function renderDashboardRecentPRs(){
      const host=$('#dashboardRecentPRs');if(!host)return;
      const all=(Array.isArray(workoutState.completed)?workoutState.completed:[]).filter(w=>w&&w.date<=localIsoDate());
       


      const prs=recentPRRows(all).slice(0,2);
      host.innerHTML=prs.length?`<div class="action-list">${prs.map(pr=>`<button class="action-row pr-row" type="button" data-home-pr-exercise="${escapeHtml(pr.exerciseId)}"><span><strong>${escapeHtml(exerciseById(pr.exerciseId)?.name||'Exercise')}</strong><span>${escapeHtml(pr.kind)}</span></span><span class="pr-row-value">${escapeHtml(pr.value)}</span><span class="pr-row-date">${escapeHtml(formatLogDate(pr.date))}</span></button>`).join('')}</div>`:'<p class="section-note">No PRs recorded yet.</p>';
      if(host.querySelectorAll)host.querySelectorAll('[data-home-pr-exercise]').forEach(button=>button.addEventListener('click',()=>openExercise(button.dataset.homePrExercise)));
    }
     
    function wireStatExerciseLinks(){
      document.querySelectorAll('[data-stat-exercise]').forEach(button=>button.addEventListener('click',()=>openExercise(button.dataset.statExercise)));
    }
     
    function renderMuscleTrends(period){
       







      const bySets=state.statsMetric==='sets';
      const comparison=comparisonPeriods(period);
       




      let current, previous;
      if(period==='all'){
        const halves=forkAllTimeTrendHalves(bySets);
        current={}; previous={};
        for(const muscle of Object.keys(halves)){ current[muscle]=halves[muscle].current; previous[muscle]=halves[muscle].previous; }
      }else{
        current=bySets?muscleSetCounts(comparison.current):muscleVolumes(comparison.current);
        previous=bySets?muscleSetCounts(comparison.previous):muscleVolumes(comparison.previous);
      }
      const trendValue=value=>bySets?`${value} set${value===1?'':'s'}`:formatVolume(value);
       



      const trendRows=[...new Set([...Object.keys(current),...Object.keys(previous)])].map(muscle=>({muscle,current:Number(current[muscle]||0),previous:Number(previous[muscle]||0)})).filter(row=>row.current>0||row.previous>0).sort((a,b)=>b.current-a.current).slice(0,10);
       





      $('#muscleTrendNote').textContent=titleCase(comparison.label).replace(/\bVs\b/g,'vs.');
       


       














      $('#muscleTrends').innerHTML=(trendRows.length?trendRows.map(row=>{let chip;const hasBaseline=row.previous>0&&(bySets||Math.round(displayVolume(row.previous))>0);if(hasBaseline){const change=Math.round((row.current-row.previous)/row.previous*100);const direction=change>0?'up':change<0?'down':'';chip=`<span class="trend-change ${direction}">${change>0?'+':''}${change}%</span>`;}else{chip='<span class="trend-change new">New</span>';}return `<div class="trend-row"><div><strong>${escapeHtml(row.muscle)}</strong><span>${trendValue(row.current)} now &nbsp;<span class="sub">${trendValue(row.previous)} before</span></span></div>${chip}</div>`;}).join(''):'<p class="section-note">No muscle trend is available for these periods.</p>');
    }
     
    function renderMuscleAnalysis(workouts,period) {
      renderMuscleBreakdown(workouts);
       
      renderTopExercises(workouts);
      renderRecentPRs(workouts);
      wireStatExerciseLinks();
      renderMuscleTrends(period);
    }
     





    let _exerciseByIdCache={list:null,len:-1,map:new Map()};
    function exerciseById(id){
      const list=(typeof exercises!=='undefined')?exercises:[];
       



      if(_exerciseByIdCache.list!==list||_exerciseByIdCache.len!==list.length){
        const map=new Map();
        for(const ex of list)if(ex&&ex.id!=null&&!map.has(ex.id))map.set(ex.id,ex);
        _exerciseByIdCache={list: list,len: list.length,map: map};
      }
       
      const cid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(id):id;
      return _exerciseByIdCache.map.get(cid);
    }
    let _muscleAggCache={list:null,len:-1,result:null};
     
    function aggregateMuscleStats(workouts){
      const list=workouts||[];
      if(_muscleAggCache.list!==list||_muscleAggCache.len!==list.length){
        const counts={},volumes={},setCounts={},worked=new Set();
        for(const w of list){
          const items=w.exercises||[];
          for(const item of items){
            const ex=exerciseById(item.exerciseId);if(!ex)continue;
            const logged=forkLoggedSets(item);  
            const n=logged.length;
            const volume=logged.reduce((total,set)=>total+setVolume(set,ex),0);  
            for(const m of (ex.primary||[])){
              counts[m]=(counts[m]||0)+n;
              volumes[m]=(volumes[m]||0)+volume;
              setCounts[m]=(setCounts[m]||0)+n;
              if(n)worked.add(String(m).toLowerCase());
            }
            for(const m of (ex.secondary||[])){
              volumes[m]=(volumes[m]||0)+(volume*SECONDARY_MUSCLE_WEIGHT);
              setCounts[m]=(setCounts[m]||0)+n;
              if(n)worked.add(String(m).toLowerCase());
            }
          }
        }
        _muscleAggCache={list,len:list.length,result:{counts,volumes,setCounts,worked}};
      }
      return _muscleAggCache.result;
    }
     

    function muscleCounts(workouts) { return aggregateMuscleStats(workouts).counts; }
    function muscleVolumes(workouts) { return aggregateMuscleStats(workouts).volumes; }
    function muscleSetCounts(workouts) { return aggregateMuscleStats(workouts).setCounts; }
     









    function forkMuscleFreshness(logs,now,byId){
      const lookup=typeof byId==='function'?byId:(typeof exerciseById==='function'?exerciseById:()=>null);
      const DAY=86400000;
      const today=new Date(now); today.setHours(12,0,0,0);
      const lastAge={},sets7={};
      for(const w of logs||[]){
        if(!w||!w.date)continue;
        const d=new Date(String(w.date)+'T12:00:00');
        if(Number.isNaN(d.getTime()))continue;
        const age=Math.floor((today-d)/DAY);
        if(age<0)continue;
        for(const item of w.exercises||[]){
          const ex=lookup(item.exerciseId); if(!ex)continue;
           


          const n=forkLoggedSets(item).length; if(!n)continue;
          for(const m of [...(ex.primary||[]),...(ex.secondary||[])]){
            const key=String(m).toLowerCase();
            if(lastAge[key]==null||age<lastAge[key])lastAge[key]=age;
            if(age<7)sets7[key]=(sets7[key]||0)+n;
          }
        }
      }
       

      const universe=new Set(Object.keys(lastAge));
      if(typeof exercises!=='undefined'&&Array.isArray(exercises))
        for(const ex of exercises) for(const m of [...(ex.primary||[]),...(ex.secondary||[])]) universe.add(String(m).toLowerCase());
      const rows=[...universe].map(key=>({muscle:key,days:lastAge[key]==null?null:lastAge[key],sets7:sets7[key]||0}));
      rows.sort((a,b)=>((b.days==null?Infinity:b.days)-(a.days==null?Infinity:a.days))||a.muscle.localeCompare(b.muscle));
      return rows;
    }
    function forkFreshnessLabel(days){
      if(days==null)return 'Not trained yet';
      if(days===0)return 'Today';
      if(days===1)return 'Yesterday';
      return `${days} days ago`;
    }
     


















    function forkFreshnessHeatLevel(days){
      if(days==null)return 0;           
      if(days>=21)return 5;
      if(days>=14)return 4;
      if(days>=7)return 3;
      if(days>=3)return 2;
      return 1;                         
    }
     







    function forkFreshnessBand(days){
      if(days==null)return 'never';
      if(days<=1)return '0';
      if(days<=3)return '1';
      if(days<=7)return '2';
      return '3';
    }
    function forkFreshnessListHtml(compact){
      if(typeof workoutState==='undefined')return null;
       



      const rows=forkMuscleFreshness(workoutState.completed||[],Date.now());
      if(!rows.some(r=>r.days!=null))return null;
       






      const shown=rows;
       




      return shown.map(r=>`<div class="heatmap-row freshness-row"><i class="heatmap-swatch heat-${forkFreshnessHeatLevel(r.days)}"></i><span>${escapeHtml(titleCase(r.muscle))}</span><span class="heatmap-recency freshness-pill fp-${forkFreshnessBand(r.days)}">${escapeHtml(forkFreshnessLabel(r.days))}</span></div>`).join('');
    }
     









    function forkFreshnessSectionHtml(){
      const list=forkFreshnessListHtml();
      if(list==null)return '';
      return `<details class="dashboard-card fork-freshness-section"><summary class="fork-freshness-summary"><h2>Muscle freshness</h2></summary><div class="heatmap-list">${list}</div></details>`;
    }
    function workedMuscles(workouts) { return aggregateMuscleStats(workouts).worked; }
     



     
    function heatLevel(value,max) {
      if(!value||!max)return 0;
      return clamp(Math.ceil(Math.sqrt(value/max)*5),1,5);
    }
     


     


     





    const bodyMapMuscleAliases={
      'upper-chest':['chest'],'lower-chest':['chest'],
       


      'front-delts':['front delts','front delt','front deltoid','anterior delts','anterior deltoid'],
      'rear-delts':['rear delts','rear delt','rear deltoid','posterior delts','posterior deltoid'],
      'side-delts':['side delts','side delt','lateral delts','lateral deltoid','middle delts'],
      'quads':['quadriceps','adductors'],'hamstrings':['hamstrings'],'glutes':['glutes','abductors'],'forearms':['forearms'],'abs':['abdominals'],
      'lats':['lats'],'lower-back':['lower back'],'traps':['traps','upper back','rhomboids','rhomboid','middle back','neck'],'triceps':['triceps'],'biceps':['biceps'],'calves':['calves'],'obliques':['abdominals']
    };
     
    function regionMuscleTotal(map,region){
      return (bodyMapMuscleAliases[region.dataset.muscle]||[]).reduce((sum,m)=>sum+Number(map[m]||0),0);
    }
    let bodyMapTemplatePromise;
     
    function loadBodyMapTemplate(){
      if(!bodyMapTemplatePromise)bodyMapTemplatePromise=fetch('data/sasha-male-body.svg').then(response=>{if(!response.ok)throw new Error('Body map unavailable');return response.text();}).catch(()=>null);
      return bodyMapTemplatePromise;
    }
     
    function paintBodyRegion(region,level,label){
      region.classList.add(`heat-${level}`);
      const title=document.createElementNS('http://www.w3.org/2000/svg','title');
      title.textContent=label;region.prepend(title);
    }
     
    function hydrateBodyMaps(){
       


      const volumeHosts=[...document.querySelectorAll('.anatomy-map[data-volumes]:not([data-hydrated])')];
       

      const exerciseHosts=[...document.querySelectorAll('.anatomy-map[data-primary]:not([data-hydrated])')];
       

      const workedHosts=[...document.querySelectorAll('.anatomy-map[data-worked]:not([data-hydrated])')];
      const hosts=volumeHosts.concat(exerciseHosts,workedHosts);
      if(!hosts.length)return Promise.resolve();
      return loadBodyMapTemplate().then(template=>{
        hosts.forEach(host=>{
           



          if(!template){host.innerHTML='<div class="chart-empty">Body map unavailable.</div>';host.setAttribute('data-hydrated','true');return;}
          host.setAttribute('aria-hidden','true');
          host.innerHTML=template;
          host.setAttribute('data-hydrated','true');
           




          host.querySelectorAll('svg').forEach(svgNode=>{svgNode.setAttribute('aria-hidden','true');svgNode.setAttribute('focusable','false');});
          const regions=[...host.querySelectorAll('[data-muscle]')];
           



          if(host.dataset.primary!==undefined){
            const primary=new Set(host.dataset.primary.split(',').filter(Boolean));
            const secondary=new Set(host.dataset.secondary.split(',').filter(Boolean));
            regions.forEach(region=>{
              const candidates=bodyMapMuscleAliases[region.dataset.muscle]||[];
              const kind=candidates.some(m=>primary.has(m))?'primary':candidates.some(m=>secondary.has(m))?'secondary':null;
              paintBodyRegion(region,kind==='primary'?5:kind==='secondary'?2:0,`${titleCase(candidates[0]||region.dataset.muscle)}${kind?` (${kind})`:' (not targeted)'}`);
            });
          }else if(host.dataset.volumes!==undefined){
            const volumes=JSON.parse(decodeURIComponent(host.dataset.volumes));
            const worked=new Set((host.dataset.worked||'').split(',').filter(Boolean));
            const bySets=host.dataset.metric==='sets';
            const regionValue=region=>regionMuscleTotal(volumes,region);
            const valueLabel=value=>bySets?`${value} set${value===1?'':'s'}`:formatVolume(value);
            const max=Math.max(1,...regions.map(regionValue));
             






            const blindSet=host.dataset.blindspots!==undefined&&typeof blindspotMuscles==='function'
              ?new Set(blindspotMuscles(volumes,new Set(Object.keys(volumes).filter(m=>Number(volumes[m])>0))))
              :null;
            regions.forEach(region=>{
              const value=regionValue(region);
              if(value>0){
                paintBodyRegion(region,heatLevel(value,max),`${titleCase((bodyMapMuscleAliases[region.dataset.muscle]||[])[0]||region.dataset.muscle)} (${valueLabel(value)})`);
              }else{
                const hit=(bodyMapMuscleAliases[region.dataset.muscle]||[]).find(m=>worked.has(m));
                if(hit){
                  region.classList.add('heat-worked');
                  const title=document.createElementNS('http://www.w3.org/2000/svg','title');
                  title.textContent=titleCase(hit);region.prepend(title);
                }else if(blindSet&&(bodyMapMuscleAliases[region.dataset.muscle]||[]).some(m=>blindSet.has(m))){
                  region.classList.add('heat-blind');
                  const title=document.createElementNS('http://www.w3.org/2000/svg','title');
                  title.textContent=`${titleCase((bodyMapMuscleAliases[region.dataset.muscle]||[])[0]||region.dataset.muscle)} (blind spot)`;region.prepend(title);
                }
              }
            });
          }else if(host.dataset.worked!==undefined){
            const worked=new Set(host.dataset.worked.split(',').filter(Boolean));
            regions.forEach(region=>{
              const hit=(bodyMapMuscleAliases[region.dataset.muscle]||[]).find(m=>worked.has(m));
              if(hit){
                region.classList.add('heat-worked');
                const title=document.createElementNS('http://www.w3.org/2000/svg','title');
                title.textContent=titleCase(hit);region.prepend(title);
              }
            });
          }
          host.dataset.hydrated='true';
        });
      });
    }
     









    function muscleHeatPillsHtml(volumes,bySets,cap=0){
      const rows=Object.entries(volumes).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
      const max=Math.max(1,...rows.map(([,v])=>v));
      const pillLabel=value=>bySets?`${value}`:formatVolume(value);
      const listRows=cap?rows.slice(0,cap):rows;
      const list=listRows.map(([muscle,value])=>`<span class="muscle-heat-pill heatp-${heatLevel(value,max)}">${escapeHtml(titleCase(muscle))} &nbsp;<span class="m-faint">${escapeHtml(pillLabel(value))}</span></span>`).join('');
      return list?`<div class="heatmap-pills">${list}</div>`:'';
    }
     





    function muscleHeatmapMarkup(volumes,worked,compact=false,bySets=false,withReset=false) {
       





      const rows=Object.entries(volumes).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
      const workedList=[...(worked||[])];
       


      const empty=!rows.length&&!workedList.length;
      const encoded=encodeURIComponent(JSON.stringify(volumes));
      const workedAttr=workedList.map(m=>String(m).toLowerCase()).join(',');
      const map=`<div class="anatomy-map" data-volumes="${encoded}" data-worked="${escapeHtml(workedAttr)}"${bySets?' data-metric="sets"':''}><div class="chart-empty">Loading anatomical map\u2026</div></div>`;
       
























      const list=compact?'':muscleHeatPillsHtml(volumes,bySets);
      const note=empty
        ?`<p class="section-note">${withReset?periodEmptyNote(bySets):(bySets?'No completed sets in this period.':'No weighted volume in this period.')}</p>`
        :((!rows.length&&!bySets)?'<p class="section-note">Bodyweight work only. No weighted volume this period.</p>':'');
       






      return `<div class="heatmap-shell">${map}<div>${list}${note}</div></div>`;
    }
     










    function workoutBodyMapMarkup(muscles){
      const worked=muscles.map(m=>String(m).toLowerCase()).join(',');
       





      return `<div class="anatomy-map workout-map" data-worked="${escapeHtml(worked)}"><div class="chart-empty">Loading anatomical map…</div></div>`;
    }
     



















    function workedMuscleMapBlockHtml(mapMarkup,counts,worked,opts){
      const blindSpots=!opts||opts.blindSpots!==false;
      const map=blindSpots?mapMarkup:String(mapMarkup).replace(/\s+data-blindspots(="[^"]*")?/g,'');
      const safeCounts=counts||{};
      if(!Object.values(safeCounts).some(v=>Number(v)>0))return map;
      const workedSet=worked||new Set(Object.keys(safeCounts).filter(k=>Number(safeCounts[k])>0).map(k=>String(k).toLowerCase()));
      return `${map}${muscleHeatPillsHtml(safeCounts,true)}${blindSpots?blindspotsHtml(safeCounts,workedSet):''}`;
    }
     




    function templateMuscleSetCounts(items){
      const counts={};
      (items||[]).forEach(item=>{
        const ex=typeof resolveExercise==='function'?resolveExercise(item.exerciseId):null;
        if(!ex)return;
        const n=typeof sessionSetCount==='function'?sessionSetCount(item):(item.sets||[]).length;
        if(!(n>0))return;
        [...(ex.primary||[]),...(ex.secondary||[])].forEach(m=>{counts[m]=(counts[m]||0)+n;});
      });
      return counts;
    }
     


    function exerciseBodyMapMarkup(ex){
      const primary=(ex.primary||[]).join(','),secondary=(ex.secondary||[]).join(',');
       

      const pill=(m,kind)=>`<span class="muscle-pill">${escapeHtml(titleCase(m))}</span>`;
      const pPills=(ex.primary||[]).map(m=>pill(m,'primary')).join('');
      const sPills=(ex.secondary||[]).map(m=>pill(m,'secondary')).join('');
      const legend=[pPills?`<span class="legend-row"><i class="heatmap-swatch heat-5"></i><span class="legend-kind">Primary</span>${pPills}</span>`:'',sPills?`<span class="legend-row"><i class="heatmap-swatch heat-2"></i><span class="legend-kind">Secondary</span>${sPills}</span>`:''].join('');
      return `<div class="anatomy-map exercise-map" data-primary="${escapeHtml(primary)}" data-secondary="${escapeHtml(secondary)}"><div class="chart-empty">Loading anatomical map\u2026</div></div><div class="exercise-map-legend">${legend}</div>`;
    }

     


    function upcomingProgramMarkup(selDate){
      const program=workoutState.activeProgram;
      if(!program)return '<p>Nothing logged for this date.</p>';
      const week=programWeekAtDate(program,selDate), next=suggestedProgramWorkout(program);
      const exerciseCount=next?.template?.exercises?.length||0;
       


       



      const startBtn=`<button class="primary-button" id="startUpcomingProgramWorkout" type="button" data-upcoming-week="${week}">Start this workout</button>`;
       


      return `<div class="upcoming-program"><p class="upcoming-kicker">Upcoming <span class="m-name">${escapeHtml(program.name)}</span></p>${next?`<p class="upcoming-name"><strong>${escapeHtml(next.name)}</strong></p><p class="section-note">Week ${week} of ${program.length}${exerciseCount?`<span class="fact">${exerciseCount} exercise${exerciseCount===1?'':'s'}</span>`:''}</p>${startBtn}`:`<p class="section-note">Week ${week} of ${program.length}. Add exercises to a program workout to get a suggestion here.</p>`}</div>`;
    }
     

    const PERIOD_LABELS={today:'Today',week:'Week',month:'Month',year:'Year',all:'All time'};
    function periodTabs(dataAttr, activePeriod) {
      return Object.entries(PERIOD_LABELS).map(([key,label])=>`<button class="period-tab" type="button" ${dataAttr}="${key}" aria-pressed="${activePeriod===key}">${label}</button>`).join('');
    }
     



    function periodEmptyNote(bySets){
      return `${bySets?'No completed sets in this period.':'No weighted volume in this period.'} <button class="text-link" type="button" data-period-reset>View all time</button>`;
    }
     
    function wirePeriodResets(){
      document.querySelectorAll('#statsView [data-period-reset]').forEach(button=>button.addEventListener('click',()=>{
        state.statsPeriod='all';schedulePersist();renderStats();window.scrollTo(0,0);
      }));
    }
     




    function compactStat(value,tiers){
      const v=Math.round(value);
      for(const [threshold,divisor,suffix] of tiers){
        if(v>=threshold) return {short:Math.floor(v/divisor)+suffix+'+',full:v.toLocaleString()};
      }
      return {short:v.toLocaleString(),full:null};
    }
     












    function statValuePanel(value,tiers,label,logsLink=false){
      const c=compactStat(value,tiers);
      if(logsLink){
        const full=c.full||c.short;
        return `<button type="button" class="stats-panel stats-panel-link" data-stats-logs-link aria-label="${escapeHtml(label)}: ${escapeHtml(full)}. View workout logs for this period."><strong>${escapeHtml(c.short)}</strong><span>${escapeHtml(label)}</span></button>`;
      }
      if(!c.full) return `<div class="stats-panel"><strong>${escapeHtml(c.short)}</strong><span>${escapeHtml(label)}</span></div>`;
      return `<button type="button" class="stats-panel stats-panel-link stat-toggle" data-short="${escapeHtml(c.short)}" data-full="${escapeHtml(c.full)}" aria-label="${escapeHtml(label)}: ${escapeHtml(c.full)}. Activate to show the exact total."><strong>${escapeHtml(c.short)}</strong><span>${escapeHtml(label)}</span></button>`;
    }
     




    function fitStatToggle(btn){
      const strong=btn.querySelector('strong');
      if(!strong)return;
      if(!strong.dataset.naturalH)strong.dataset.naturalH=strong.offsetHeight;
      strong.style.minHeight=strong.dataset.naturalH+'px';
      strong.style.fontSize='';
      let size=parseFloat(getComputedStyle(strong).fontSize)||14,guard=60;
      while(strong.scrollWidth>strong.clientWidth+1&&size>9&&guard--){
        size-=0.5;
        strong.style.fontSize=size+'px';
      }
    }
     
    function wireStatToggles(root){
      if(!root)return;
      root.querySelectorAll('.stat-toggle').forEach(btn=>{
        fitStatToggle(btn);
        btn.addEventListener('click',()=>{
          const show=btn.classList.toggle('show-full');
          btn.querySelector('strong').textContent=show?btn.dataset.full:btn.dataset.short;
          fitStatToggle(btn);
        });
      });
    }
    const VOLUME_TIERS=[[1e6,1e6,'M']], SETS_TIERS=[[1e4,1e3,'K']];     





    function dashboardWeekModel(now){
      const start=new Date(now);start.setHours(12,0,0,0);start.setDate(now.getDate()-((now.getDay()+6)%7)+(state.calendarWeekOffset*7));
      const end=new Date(start);end.setDate(start.getDate()+6);
      return {start,end};
    }
     




     





    const WEEK_STRIP_SWIPE_PX=45;
    function weekStripCaptureAt(dx){return Math.abs(dx)>WEEK_STRIP_SWIPE_PX;}
     
    function weekStripSwipeDirection(dx,dy){return (Math.abs(dx)>WEEK_STRIP_SWIPE_PX&&Math.abs(dx)>Math.abs(dy))?Math.sign(dx):0;}
     
    const DASH_MONTH_FMT=new Intl.DateTimeFormat('en-US',{month:'short'});
    const DASH_DAY_FMT=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric'});
    const DASH_DATE_FMT=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'});
    const DASH_ARIA_FMT=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'long',day:'numeric'});
    const DASH_WEEKDAY_FMT=new Intl.DateTimeFormat('en-US',{weekday:'short'});
     

    function dayChipHtml(opts){
      const cls='day-chip'+(opts.isToday?' today':'')+(opts.hasWorkout?' has-workout':'')+(opts.selected?' selected':'');
      return `<button type="button" class="${cls}" data-calendar-date="${opts.iso}" aria-pressed="${!!opts.selected}" aria-label="${DASH_ARIA_FMT.format(opts.date)}${opts.hasWorkout?' (Workout logged)':''}"><span>${DASH_WEEKDAY_FMT.format(opts.date)}</span><strong>${opts.date.getDate()}</strong><em aria-hidden="true">${opts.hasWorkout?'<i></i>':''}</em></button>`;
    }
     
    function renderDashboardCalendar(now,start,end){
      const strip=$('#weekStrip');
      const sameMonth=start.getMonth()===end.getMonth();
       


      const startIso=localIsoDate(start), endIso=localIsoDate(end);
      const daysWithWorkouts=new Set();
      for(const w of (workoutState.completed||[]))if(w.date>=startIso&&w.date<=endIso)daysWithWorkouts.add(w.date);
      $('#calendarWeekLabel').textContent=sameMonth?`${DASH_MONTH_FMT.format(start)} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`:`${DASH_DAY_FMT.format(start)} – ${DASH_DATE_FMT.format(end)}`;
      $('#nextWeek').disabled=state.calendarWeekOffset>=0;
      strip.innerHTML=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const iso=localIsoDate(d);return dayChipHtml({date:d,iso,isToday:d.toDateString()===now.toDateString(),hasWorkout:daysWithWorkouts.has(iso),selected:state.selectedDashboardDate===iso});}).join('');
      document.querySelectorAll('[data-calendar-date]').forEach(button=>button.addEventListener('click',()=>{const date=button.dataset.calendarDate;state.selectedDashboardDate=state.selectedDashboardDate===date?null:date;rerenderDashboardKeepingPlace('[data-calendar-date="'+date+'"]');}));
      $('#previousWeek').onclick=()=>{state.calendarWeekOffset-=1;state.selectedDashboardDate=null;rerenderDashboardKeepingPlace('#previousWeek');};
      $('#nextWeek').onclick=()=>{if(state.calendarWeekOffset<0){state.calendarWeekOffset+=1;state.selectedDashboardDate=null;rerenderDashboardKeepingPlace('#nextWeek');}};
      let weekSwipeStart=null;
      strip.onpointerdown=event=>{weekSwipeStart={x:event.clientX,y:event.clientY,id:event.pointerId};};
      strip.onpointermove=event=>{if(!weekSwipeStart||event.pointerId!==weekSwipeStart.id)return;if(weekStripCaptureAt(event.clientX-weekSwipeStart.x))strip.setPointerCapture?.(event.pointerId);};
      strip.onpointercancel=()=>{weekSwipeStart=null;};
      strip.onpointerup=event=>{if(!weekSwipeStart||event.pointerId!==weekSwipeStart.id)return;const dir=weekStripSwipeDirection(event.clientX-weekSwipeStart.x,event.clientY-weekSwipeStart.y);weekSwipeStart=null;if(dir>0)$('#previousWeek').click();else if(dir<0)$('#nextWeek').click();};
    }
     
     







    function renderDashboardSummary(selectedWorkouts,selectedIsFuture){
      if(state.selectedDashboardDate){const iso=state.selectedDashboardDate,label=formatLogDate(iso);const summaryText=selectedIsFuture?`Showing ${label} (Upcoming program)`:`Showing ${label} (${selectedWorkouts.length?`${selectedWorkouts.length} workout${selectedWorkouts.length===1?'':'s'}`:'No workouts'})`;$('#calendarSummary').innerHTML=`<span class="calendar-summary-state">${escapeHtml(summaryText)}</span> <button type="button" class="link-button" id="clearDashboardDate">Show recent</button>`;$('#clearDashboardDate')?.addEventListener('click',()=>{state.selectedDashboardDate=null;rerenderDashboardKeepingPlace(null);});$('#dashRecentTitle').textContent=selectedIsFuture?'Upcoming':label;}else{const summary=$('#calendarSummary');if(state.calendarWeekOffset===0){summary.textContent='';}else{summary.innerHTML='<button type="button" class="link-button" id="gotoThisWeek">Go to this week.</button>';const go=$('#gotoThisWeek');if(go)go.addEventListener('click',()=>{state.calendarWeekOffset=0;state.selectedDashboardDate=null;rerenderDashboardKeepingPlace(null);});}$('#dashRecentTitle').textContent='Recent workouts';}
    }
     












     


    function dashboardNextWorkout(){
      const p=workoutState.activeProgram;
       


      const next=(p&&!workoutState.draft)?suggestedProgramWorkout(p):null;
      return next?{p,next}:null;
    }
     
    function continueProgramCardHtml(p,next,btnId){
      const week=programWeek(p);
      const exCount=next?.template?.exercises?.length||0;
      return `<button class="program-next-main" id="${btnId}" type="button"><span><span class="program-next-kicker">Continue program</span><strong>${escapeHtml(next.name||'next workout')}</strong><small><span class="m-ink">Week ${week}</span><span class="fact">${exCount} exercise${exCount===1?'':'s'}</span><span class="fact">${escapeHtml(programWorkoutRangeLabel(p,next,week))}</span></small></span></button>`;
    }
     

































    function homeUpNextCardHtml(p,next){
      const week=(typeof programWeek==='function')?programWeek(p):null;
      const items=(next&&next.template&&next.template.exercises)||[];
      const exCount=items.length;
      const totalSets=items.reduce((sum,item)=>sum+((item&&item.sets)||[]).length,0);
      const kicker=`${escapeHtml((p&&p.name)||'Program')}${week?` &nbsp;<span class="sub">Week ${week}</span>`:''}`;
      const meta=exCount?`${exCount} exercise${exCount===1?'':'s'}, ${totalSets} set${totalSets===1?'':'s'}`:'No exercises yet';
      return `<span><span class="continue-kicker">${kicker}</span>`
        + `<strong>${escapeHtml((next&&next.name)||'Next workout')}</strong>`
        + `<small class="continue-meta">${escapeHtml(meta)}</small></span>`
        + `<div class="fork-continue-actions"><button class="primary-button fork-continue-go" type="button">Start workout</button><button class="text-link fork-start-blank" type="button">Start blank workout</button></div>`;
    }
     












    function renderDashboardContinueProgram(){
      const slot=$('#dashboardContinueProgram');
      if(slot){slot.innerHTML='';slot.hidden=true;}
      const card=$('#workoutInProgressCard');
      const topEmpty=$('#dashboardTopEmpty');
      if(workoutState.draft){if(topEmpty)topEmpty.hidden=true;return;}
      const hero=$('#dashEmptyHero');
      const heroOwns=!!(hero&&!hero.hidden);
      const found=dashboardNextWorkout();
      if(found&&!heroOwns){
        if(card){
          card.innerHTML=homeUpNextCardHtml(found.p,found.next);
          card.dataset.topMode='start';
           











          if(card.removeAttribute){card.removeAttribute('role');card.removeAttribute('tabindex');card.removeAttribute('aria-label');}
          card.hidden=false;
           


          if(typeof forkWireUpNextCard==='function')forkWireUpNextCard(card,found.p,found.next);
        }
        if(topEmpty)topEmpty.hidden=true;
        return;
      }
      if(card&&!heroOwns){card.hidden=true;card.dataset.topMode='';}
      if(topEmpty){
        if(!heroOwns&&(workoutState.completed||[]).length){
          topEmpty.hidden=false;
          topEmpty.innerHTML=`<section class="fork-empty-state"><h2>No workout in progress</h2><p>Start a blank workout whenever you are ready.</p><button class="primary-button" id="dashTopStartBlank" type="button">Start blank workout</button></section>`;
          const btn=$('#dashTopStartBlank');
          if(btn)btn.addEventListener('click',()=>{showWorkouts();startBlankWorkout();});
        }else{
          topEmpty.hidden=true;
          topEmpty.innerHTML='';
        }
      }
    }
     






    function rerenderDashboardKeepingPlace(refocusSel){
      const scrollY=window.scrollY;
      const focused=document.activeElement;
      if(focused&&focused!==document.body)focused.blur();
      const restoreScroll=()=>requestAnimationFrame(()=>window.scrollTo(0,scrollY));
      const hyd=renderDashboard();
      if(hyd&&hyd.then)hyd.then(restoreScroll,restoreScroll);else restoreScroll();
      if(refocusSel)document.querySelector(refocusSel)?.focus({preventScroll:true});
    }
     
    function wireDashboardPeriodTabs(){
      $('#dashPeriodTabs').innerHTML=periodTabs('data-dash-period',state.dashboardPeriod);
      document.querySelectorAll('[data-dash-period]').forEach(button=>button.addEventListener('click',()=>{
        if(state.dashboardPeriod===button.dataset.dashPeriod)return;
        state.dashboardPeriod=button.dataset.dashPeriod;schedulePersist();
        const scrollY=window.scrollY;
         


        const restoreScroll=()=>requestAnimationFrame(()=>window.scrollTo(0,scrollY));
        const hyd=renderDashboard();
        if(hyd&&hyd.then)hyd.then(restoreScroll,restoreScroll);else restoreScroll();
         

        document.querySelector('[data-dash-period="'+state.dashboardPeriod+'"]')?.focus({preventScroll:true});
      }));
    }
     

    function openLogsForDashboardPeriod(){
      state.logPeriod=state.dashboardPeriod||'week';
      schedulePersist();
      showWorkouts(false);showWorkoutHistory();
    }
     
    function renderDashboardStats(){
      const periodWorkouts=workoutsForPeriod(state.dashboardPeriod), periodSets=periodWorkouts.flatMap(w=>w.exercises.flatMap(e=>forkLoggedSets(e).map(set=>({set,ex:exerciseById(e.exerciseId)})))), volume=periodSets.reduce((n,{set,ex})=>n+setVolume(set,ex),0);  
      const periodLabel=PERIOD_LABELS[state.dashboardPeriod]||'';
      $('#dashboardStats').innerHTML=`<button class="stats-panel stats-panel-link" id="dashWorkoutsCard" type="button" aria-label="View workout logs for ${escapeHtml(periodLabel)}"><strong>${periodWorkouts.length}</strong><span>${periodWorkouts.length===1?'Workout':'Workouts'}</span></button>${statValuePanel(periodSets.length,SETS_TIERS,periodSets.length===1?'Set':'Sets')}${statValuePanel(displayVolume(volume),VOLUME_TIERS,`Volume (${weightUnit()})`)}`;
      $('#dashWorkoutsCard').onclick=openLogsForDashboardPeriod;
      wireStatToggles($('#dashboardStats'));
      const volumes=muscleVolumes(periodWorkouts);
       












      const dashPills=muscleHeatPillsHtml(muscleSetCounts(periodWorkouts),true,6);
       





      $('#dashboardMuscles').innerHTML=dashPills;
       













      $('#dashboardHeatmap').innerHTML=muscleHeatmapMarkup(muscleSetCounts(periodWorkouts),workedMuscles(periodWorkouts),true,true);
      const dashFreshnessHost=$('#dashboardFreshness');
      if(dashFreshnessHost)dashFreshnessHost.innerHTML=forkFreshnessSectionHtml();
      const dashHydration=hydrateBodyMaps();
      renderBlindspots(volumes,workedMuscles(periodWorkouts),'#dashBlindspots');
      return dashHydration;
    }
     






     




     







     





    function dashEmptyHeroHtml({signedIn,signInDeclined,starterCardHtml,continueCardHtml,programCardHtml}){
       


       








      const rows=[];
      if(programCardHtml)rows.push(programCardHtml);
      if(!signedIn&&!signInDeclined)rows.push(`<button class="start-option dash-empty-signin" id="emptySignIn" type="button"><strong>Sign in</strong><span>Save your data to the cloud and share workouts.</span></button>`);
      rows.push(`<a class="start-option dash-empty-guide" href="https://cruciferousgreens.com/getting-started" target="_blank" rel="noopener"><strong>See how it works</strong><span>The getting-started guide.</span></a>`);
      return `<section class="training-hero fork-empty-state"><h2>No workouts yet</h2>`
        +`<p>Your training week, program, and progress will live here.</p>`
        +(continueCardHtml||'')
        +`<div class="training-hero-actions">${starterCardHtml}</div>`
        +`<div class="workout-start-options dash-empty-actions">${rows.join('')}</div></section>`;
    }
     
    function renderDashEmptyHero(){
      const hero=$('#dashEmptyHero');if(!hero)return;
      const view=$('#dashboardView');
       


      if(workoutState.completed.length){
        hero.hidden=true;hero.innerHTML='';
        if(view)view.classList.remove('dash-is-empty');
        return;
      }
      if(view)view.classList.add('dash-is-empty');
      let signedIn=false;
      try{signedIn=!!(typeof Sync!=='undefined'&&Sync&&Sync.lastAuthUid);}catch(_){ }
      hero.hidden=false;
       


      const liveDraft=(workoutState.draft&&workoutState.draft.exercises)?workoutState.draft:null;
       



       







      const starterCard=liveDraft
        ?`<section class="continue-workout-card fork-continue-card" id="heroWorkoutInProgress">${forkInProgressCardHtml(liveDraft)}</section>`
        :`<button class="primary-button" id="startFirstWorkout" type="button">Start blank workout</button>`;
       



      const progNext=dashboardNextWorkout();
      const continueCardHtml=progNext?continueProgramCardHtml(progNext.p,progNext.next,'startHeroNext'):'';
       





      const programCardHtml=workoutState.activeProgram?'':`<button class="start-option" id="startHeroProgramSetup" type="button"><strong>Create a program</strong><span>Structure your training into a plan.</span></button>`;
       



      const signInDeclined=(typeof isHeroSignInDeclined==='function')?isHeroSignInDeclined():false;
      hero.innerHTML=dashEmptyHeroHtml({signedIn,signInDeclined,starterCardHtml:starterCard,continueCardHtml,programCardHtml});
       
      if(progNext)$('#startHeroNext')?.addEventListener('click',()=>startProgramWorkout(progNext.p,progNext.next));
       






      if(!workoutState.activeProgram)$('#startHeroProgramSetup')?.addEventListener('click',()=>{state.programSetupOpen=true;showProgram();});
       

      $('#emptySignIn')?.addEventListener('click',()=>{
        if(typeof Sync!=='undefined'&&Sync&&typeof Sync.openHeroSignIn==='function')Sync.openHeroSignIn();
        else showSettings();
      });
       
      $('#startFirstWorkout')?.addEventListener('click',()=>{showWorkouts();startBlankWorkout();});
       







      const heroWip=$('#heroWorkoutInProgress');
      if(heroWip)forkWireInProgressCard(heroWip,()=>{
        const go=()=>{showWorkouts();state.workoutEditorOpen=true;renderWorkoutScreen();window.scrollTo({top:0});};
        if(typeof flyCardToWorkoutHeader!=='function'||!flyCardToWorkoutHeader(heroWip,go))go();
      });
    }
     

     



















     

















    function continueWorkoutCardHtml(draft,programLine,opts){
       



















      const counts=continueWorkoutCountsLine(draft);
      const kicker=(opts&&typeof opts.kicker==='string')?opts.kicker:'';
       




      return `<span>${kicker?`<span class="continue-kicker">${kicker}</span>`:''}`
        + `<strong>${escapeHtml(draft.name||'Workout')}</strong>`
        + (programLine?`<small class="continue-meta continue-program">${programLine}</small>`:'')
        + `<small class="continue-meta">${escapeHtml(counts)}</small></span>`
        + ((opts&&opts.action)?`<span class="fork-home-top-action">${escapeHtml(opts.action)}</span>`:'');
    }
     


























    function forkInProgressCardHtml(draft){
      return continueWorkoutCardHtml(draft,'',{kicker:continueWorkoutKicker(draft)})
        +`<div class="fork-continue-actions"><button class="primary-button fork-continue-go" type="button">Continue workout</button><button class="text-link fork-start-blank" type="button">Start blank workout</button></div>`;
    }
     





    function forkStartBlankFromDraft(){
      startNewAfterDiscard=true;
      discardingBuilder=false;
      if(typeof syncDiscardDraftDialog==='function')syncDiscardDraftDialog(false);
      showModalPinned($('#discardDraftDialog'));
    }
     







    function forkWireInProgressCard(root,onContinue){
      if(!root||typeof root.querySelector!=='function')return;
      const go=root.querySelector('.fork-continue-go');
      if(go)go.addEventListener('click',onContinue);
      const blank=root.querySelector('.fork-start-blank');
      if(blank)blank.addEventListener('click',forkStartBlankFromDraft);
    }
     













    function forkWireUpNextCard(root,p,next){
      if(!root||typeof root.querySelector!=='function')return;
      const go=root.querySelector('.fork-continue-go');
      if(go)go.addEventListener('click',()=>startProgramWorkout(p,next));
      const blank=root.querySelector('.fork-start-blank');
      if(blank)blank.addEventListener('click',()=>{showWorkouts();startBlankWorkout();});
    }
     












     






    function continueWorkoutKicker(draft){
       















      const line=draftProgramLine(draft);
      const prog=(draft.programId&&typeof findProgramById==='function')?findProgramById(draft.programId):null;
      const progName=prog?prog.name:(line?line.split(' – ')[0]:'');
      const week=(prog&&typeof programWeek==='function')?programWeek(prog):null;
      return progName?`${escapeHtml(progName)}${week?` &nbsp;<span class="sub">Week ${week}</span>`:''}`:'';
    }
     












    function continueWorkoutCountsLine(draft){
      const exCount=(draft.exercises||[]).length;
      let totalSets=0,doneSets=0;
      (draft.exercises||[]).forEach(item=>{
        (item.sets||[]).forEach(set=>{
          totalSets++;
          if(set.complete)doneSets++;
        });
      });
      return exCount
        ? `${draft.date?`${formatLogDate(draft.date)}, `:''}${exCount} exercise${exCount===1?'':'s'}, ${doneSets} of ${totalSets} sets done`
        : 'Empty draft.';
    }
     
    function renderWorkoutInProgressCard(){
      const card=$('#workoutInProgressCard');if(!card)return;
      const draft=workoutState.draft;
       



      if(!draft||!draft.exercises||!(workoutState.completed||[]).length){
        card.hidden=true;
        card.dataset.topMode='';
        return;
      }
       




































      card.innerHTML=forkInProgressCardHtml(draft);
      card.dataset.topMode='resume';
      if(card.removeAttribute){card.removeAttribute('role');card.removeAttribute('tabindex');card.removeAttribute('aria-label');}
      card.hidden=false;
       









      forkWireInProgressCard(card,()=>{
        const go=()=>{showWorkouts();state.workoutEditorOpen=true;renderWorkoutScreen();window.scrollTo({top:0});};
        if(typeof flyCardToWorkoutHeader!=='function'||!flyCardToWorkoutHeader(card,go))go();
      });
    }
     







     





     
    function renderDashboardRecent(selectedWorkouts,selectedIsFuture){
      const selDate=state.selectedDashboardDate, todayIso=localIsoDate();
       

      const futureDateCopy=selectedIsFuture?upcomingProgramMarkup(selDate):'';
      const emptyDateCopy=futureDateCopy||(selDate===todayIso?'<p>No workout logged yet today. <button class="filter-clear" id="startSelectedDateWorkout" type="button">Start workout</button></p>':'<p>No workout logged for this date. <button class="filter-clear" id="startSelectedDateWorkout" type="button">Log a workout</button></p>');
       

      $('#dashboardRecent').innerHTML=selectedWorkouts.length?selectedWorkouts.map(w=>{const setCount=w.exercises.flatMap(e=>e.sets).length;const detail=state.selectedDashboardDate?`<span class="m-ink">${w.exercises.length} exercise${w.exercises.length===1?'':'s'}</span><span class="fact">${setCount} set${setCount===1?'':'s'}</span>`:null;return recentWorkoutButton(w,'data-workout-id',detail,{plain:true});}).join(''):state.selectedDashboardDate?emptyDateCopy:'<p>No logs yet.</p>';  
      document.querySelectorAll('[data-workout-id]').forEach(b=>b.addEventListener('click',()=>{state.workoutDetailReturn=ROUTES.DETAIL_RETURN.DASHBOARD;showWorkouts(false);renderCompletedWorkout(workoutState.completed.find(w=>w.id===b.dataset.workoutId),{push:true});}));
      $('#startSelectedDateWorkout')?.addEventListener('click',()=>{const date=state.selectedDashboardDate;
         




        if(workoutState.draft&&(workoutState.draft.exercises||[]).length){pendingBlankStartDate=date;forkStartBlankFromDraft();return;}
        showWorkouts();startBlankWorkout();workoutState.draft.date=date;renderWorkoutScreen();});
       


       

      $('#seeAllWorkouts').onclick=()=>{showWorkouts(false);showWorkoutHistory();};
       
       

      $('#startUpcomingProgramWorkout')?.addEventListener('click',(e)=>{const program=workoutState.activeProgram,next=program&&suggestedProgramWorkout(program);if(program&&next)startProgramWorkout(program,next,e.currentTarget?.dataset?.upcomingWeek);});
    }
     
    function renderDashboard() {
       



      if(!state.homeHydrated){paintHomeSkeleton();return null;}
       
      const viewEl=$('#dashboardView');
      if(viewEl){delete viewEl.dataset.homeSkel;viewEl.removeAttribute('aria-busy');}
      for(const id of ['dashEmptyHero','dashboardStats','dashboardRecent']){
        const el=document.getElementById(id);if(el)el.removeAttribute('aria-busy');
      }
      const now=new Date();
      const {start,end}=dashboardWeekModel(now);
       





      const calendarOn=homeCalendarEnabled();
      for(const sel of ['#dashboardView .calendar-toolbar','#weekStrip']){const el=document.querySelector(sel);if(el)el.hidden=!calendarOn;}
      if(calendarOn)renderDashboardCalendar(now,start,end);
       








      const selectedWorkouts=state.selectedDashboardDate?workoutState.completed.filter(w=>w.date===state.selectedDashboardDate):workoutState.completed.slice().sort(sortByWorkoutDateDesc).slice(0,3);
       
      const selectedIsFuture=!!state.selectedDashboardDate&&state.selectedDashboardDate>localIsoDate();
      renderDashboardSummary(selectedWorkouts,selectedIsFuture);
      renderDashboardRecentPRs();  
      wireDashboardPeriodTabs();
      const dashHydration=renderDashboardStats();
      wireStatsMetricToggles();  
      renderDashEmptyHero();
      renderWorkoutInProgressCard();
      renderDashboardContinueProgram();
      renderDashboardRecent(selectedWorkouts,selectedIsFuture);
      return dashHydration;
    }
     




     


    function blindspotMuscles(volumes,worked){
      const allMuscles=[...new Set(exercises.flatMap(ex=>[...(ex.primary||[]),...(ex.secondary||[])].map(m=>String(m).toLowerCase())))].sort();
      return allMuscles.filter(m=>!volumes[m]&&!(worked&&worked.has(m)));
    }
     




     



    function blindspotsHtml(volumes,worked){
      const missing=blindspotMuscles(volumes,worked);
      if(!missing.length)return '';
      return `<div class="blindspot-section"><hr class="blindspot-rule"><p class="blindspot-label">Blind spots</p><div class="tag-row blindspot-list">${missing.map(m=>musclePill(titleCase(m))).join('')}</div></div>`;
    }
    function renderBlindspots(volumes,worked,wrapSelector){
      const wrap=$(wrapSelector||'#blindspotWrap');if(!wrap)return;
      wrap.innerHTML=blindspotsHtml(volumes,worked);
    }
     




    function statsSkeletonHtml(){
      const statCard='<div class="stats-panel skel-stat-card" aria-hidden="true"><span class="skel skel-stat-num"></span><span class="skel skel-stat-label"></span></div>';
      const rows=n=>Array.from({length:n},()=>'<div class="skel skel-row" aria-hidden="true"></div>').join('');
      return {statsGrid:statCard.repeat(3),
        muscleHeatmap:'<div class="skel skel-map" aria-hidden="true"></div>',
        muscleStats:'<div class="skel skel-line" style="width:60%" aria-hidden="true"></div>',
        muscleVolumeBreakdown:rows(5), topExercises:rows(4), recentPRs:rows(4), muscleTrends:rows(5)};
    }
     


    let statsHydrated=false;
    function paintStatsSkeleton(){
      const skel=statsSkeletonHtml();
      for(const id of Object.keys(skel)){
        const el=document.getElementById(id);
        if(el){el.innerHTML=skel[id];el.setAttribute('aria-busy','true');}
      }
    }
     



    function paintHomeSkeleton(){
      const view=$('#dashboardView');if(!view||view.dataset.homeSkel==='1')return;
      view.dataset.homeSkel='1';
      const hero=$('#dashEmptyHero');
      if(hero){hero.hidden=false;hero.innerHTML='<div class="skel skel-title" aria-hidden="true"></div><div class="skel skel-line" style="width:75%;margin-top:10px" aria-hidden="true"></div><div class="skel skel-btn" style="margin-top:14px" aria-hidden="true"></div>';hero.setAttribute('aria-busy','true');}
      const stats=$('#dashboardStats');
      if(stats){stats.innerHTML='<div class="skel skel-stat-card" aria-hidden="true"><span class="skel skel-stat-num"></span><span class="skel skel-stat-label"></span></div>';stats.setAttribute('aria-busy','true');}
      const recent=$('#dashboardRecent');
      if(recent){recent.innerHTML='<div class="skel skel-row" aria-hidden="true"></div><div class="skel skel-row" style="margin-top:8px" aria-hidden="true"></div>';recent.setAttribute('aria-busy','true');}
      view.setAttribute('aria-busy','true');
    }
     
    function renderStats() {
       

      for(const id of ['statsGrid','muscleHeatmap','muscleStats','muscleVolumeBreakdown','topExercises','recentPRs','muscleTrends']){
        document.getElementById(id)?.removeAttribute('aria-busy');
      }
       









      document.querySelectorAll('details.fork-stats-card > summary').forEach(sum=>{
        if(sum.dataset.forkToggleGuard)return; sum.dataset.forkToggleGuard='1';
        sum.addEventListener('click',e=>{ if(e.target.closest('button, a, input, select, textarea, [role="button"]')) e.preventDefault(); });
      });
      $('#statsPeriodTabs').innerHTML=periodTabs('data-stats-period',state.statsPeriod);
      document.querySelectorAll('[data-stats-period]').forEach(button=>button.addEventListener('click',()=>{
        if(state.statsPeriod===button.dataset.statsPeriod)return;
        state.statsPeriod=button.dataset.statsPeriod;schedulePersist();renderStats();
         
        document.querySelector('[data-stats-period="'+state.statsPeriod+'"]')?.focus({preventScroll:true});
      }));
      const workouts=workoutsForPeriod(state.statsPeriod), sets=workouts.flatMap(w=>w.exercises.flatMap(e=>forkLoggedSets(e).map(set=>({set,ex:exerciseById(e.exerciseId)})))), volume=sets.reduce((n,{set,ex})=>n+setVolume(set,ex),0);  
       


      const hasAnyData=(workoutState.completed||[]).length>0;
      const statsEmptyHost=$('#statsEmpty');
       



      if(!hasAnyData){
        if(statsEmptyHost){
          statsEmptyHost.hidden=false;
          statsEmptyHost.innerHTML=emptyStateHtml({
            title:'No stats yet',
            description:'Charts, volume, and muscle maps appear after your first logged workout.',
            primaryHtml:emptyStatePrimary('statsEmptyStart','Log a workout'),
            secondaryHtml:emptyStateSecondary('statsEmptyBrowse','Browse exercises')
          });
          $('#statsEmptyStart')?.addEventListener('click',()=>{showWorkouts();startBlankWorkout();});
          $('#statsEmptyBrowse')?.addEventListener('click',()=>showLibrary());
        }
        $('#statsView')?.classList.add('stats-is-empty');
        statsHydrated=true;
        return;
      }
      $('#statsView')?.classList.remove('stats-is-empty');
      if(statsEmptyHost){statsEmptyHost.hidden=true;statsEmptyHost.innerHTML='';}
       

      $('#statsGrid').innerHTML=`<button class="stats-panel stats-panel-link" id="statsCompletedWorkouts" type="button"><strong>${workouts.length}</strong><span>${workouts.length===1?'Workout':'Workouts'}</span></button>${statValuePanel(sets.length,SETS_TIERS,sets.length===1?'Set':'Sets',true)}${statValuePanel(displayVolume(volume),VOLUME_TIERS,`Volume (${weightUnit()})`,true)}`;
      $('#statsCompletedWorkouts').onclick=()=>{
         


        state.logPeriod=state.statsPeriod||'week';
        schedulePersist();
        showWorkouts(false);showWorkoutHistory();
      };
       


      document.querySelectorAll('#statsGrid [data-stats-logs-link]').forEach(btn=>{
        btn.addEventListener('click',()=>{const w=$('#statsCompletedWorkouts');if(w)w.click();});
      });
      wireStatToggles($('#statsGrid'));
       


      const agg=aggregateMuscleStats(workouts), muscles=agg.counts, volumes=agg.volumes, worked=agg.worked;
       











      const statsBySets=state.statsMetric==='sets';
      const mapBySets=statsBySets;
      renderStatsMetricToggle('#muscleMapToggle');
      $('#muscleHeatmap').innerHTML=muscleHeatmapMarkup(mapBySets?agg.setCounts:volumes,worked,false,mapBySets,true);hydrateBodyMaps();
       

       



      $('#muscleStats').innerHTML=Object.keys(muscles).length?'':(workouts.length?'<p class="section-note">Complete a workout to start building muscle-level stats.</p>':'');
      renderBlindspots(volumes,worked);
       



      const statsFreshnessHost=$('#statsFreshness');
      if(statsFreshnessHost)statsFreshnessHost.innerHTML=forkFreshnessSectionHtml();
      renderMuscleAnalysis(workouts,state.statsPeriod);
       


      wireStatsMetricToggles();
       

      wirePeriodResets();
       
      statsHydrated=true;
    }
     

    function exercisesForMuscle(muscle, workouts, bySets=false) {
      const m=String(muscle).toLowerCase(), stats={};
      workouts.forEach(w=>w.exercises.forEach(item=>{
        const ex=exerciseById(item.exerciseId); if(!ex)return;
        const lower=a=>(a||[]).map(s=>String(s).toLowerCase());
        const isPrimary=lower(ex.primary).includes(m), isSecondary=lower(ex.secondary).includes(m);
        if(!isPrimary&&!isSecondary)return;
        const logged=forkLoggedSets(item);  
        const vol=logged.reduce((sum,s)=>sum+setVolume(s,ex),0)*(isPrimary?1:SECONDARY_MUSCLE_WEIGHT);  
         
        const cid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(item.exerciseId):item.exerciseId;
        const entry=stats[cid]||(stats[cid]={volume:0,sets:0,bodyweight:ex.equipment==='body only'});
        entry.volume+=vol; entry.sets+=logged.length;
      }));
       



      const drillMetric=e=>bySets?e.sets:((e.bodyweight&&!(e.volume>0))?e.sets:e.volume);
      return Object.entries(stats).filter(([,e])=>drillMetric(e)>0).sort((a,b)=>drillMetric(b[1])-drillMetric(a[1])).slice(0,4);
    }
     
    let expandedMuscle=null;
    
//# sourceMappingURL=dashboard-stats.js.map
