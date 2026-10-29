 

























(function(){
  'use strict';

   




  const NON_VOLUME_METRICS={
    'Sled_Push':['load','distance'],
    'Prowler_Sprint':['load','distance'],
    'Farmers_Walk':['load','distance'],
    'Yoke_Walk':['load','distance'],
    'Rickshaw_Carry':['load','distance'],
    'Bear_Crawl_Sled_Drags':['load','distance'],
    'Sled_Drag_-_Harness':['load','distance'],
    'Sled_Overhead_Backward_Walk':['load','distance'],
  };

   
  function exerciseMetrics(ex){
    if(!ex)return ['load','reps'];
    if(Array.isArray(ex.metrics)&&ex.metrics.length)return ex.metrics.slice();
    if(ex.tracking==='distance'||NON_VOLUME_METRICS[ex.id])return ['load','distance'];
    const t=ex.tracking||'reps';
    return (t==='time'||t==='seconds')?['load','time']:['load','reps'];
  }
   
  function exercisePerfField(ex){
    const metrics=exerciseMetrics(ex);
    if(metrics.includes('distance'))return 'distance';
    if(metrics.includes('time'))return 'seconds';
    return 'r';
  }
   

  function setPerfField(item, ex){
    const metrics=item&&item.metrics?item.metrics:exerciseMetrics(ex);
    if(metrics.includes('distance'))return 'distance';
    if(metrics.includes('time'))return 'seconds';
    const t=(item&&item.tracking)||(ex&&ex.tracking)||'reps';
    return (t==='time'||t==='seconds')?'seconds':'r';
  }
   
  function isNonVolumeExercise(ex){
    if(!ex)return false;
    if(ex.nonVolume)return true;
    return !!NON_VOLUME_METRICS[ex.id];
  }
   
  function formatDistance(m){
    if(m==null||m==='')return '—';
    const n=Number(m);
    if(!Number.isFinite(n))return '—';
    return `${n} m`;
  }
   


  function detectDistancePRs(currentSets, priorSets){
    const priorDistances=(priorSets||[]).map(s=>Number(s.distance)).filter(n=>n>0);
    const currentBest=Math.max(0,...(currentSets||[]).map(s=>Number(s.distance)).filter(n=>n>0));
    if(!currentBest||!priorDistances.length)return false;
    return currentBest>Math.max(...priorDistances);
  }

   
  function stampNonVolumeFlags(){
    if(typeof exercises==='undefined'||!Array.isArray(exercises))return;
    Object.keys(NON_VOLUME_METRICS).forEach(id=>{
      const ex=resolveExercise(id);
      if(ex)ex.nonVolume=true;
    });
  }
  stampNonVolumeFlags();

   
  const api={
    exerciseMetrics, exercisePerfField, setPerfField,
    isNonVolumeExercise, formatDistance, detectDistancePRs,
    NON_VOLUME_METRICS,
  };
  Object.keys(api).forEach(k=>{globalThis[k]=api[k];});
})();
//# sourceMappingURL=exercise-metrics.js.map
