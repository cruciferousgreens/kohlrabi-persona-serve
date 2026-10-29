 
     












     
     





    const PR_E1RM_TOLERANCE=0.5;

    function detectExercisePRs(currentSets,priorSets){
      const current=currentSets||[],prior=priorSets||[];
      if(!current.length||!prior.length)return '';
      const best=Math.max(...current.map(estimate1RM)),priorBest=Math.max(...prior.map(estimate1RM));
      if(best>priorBest+PR_E1RM_TOLERANCE)return 'e1rm';
      const weight=Math.max(...current.map(set=>Number(set.w)||0)),priorWeight=Math.max(...prior.map(set=>Number(set.w)||0));
      if(weight>priorWeight)return 'heaviest';
      return '';
    }

     


























    function sessionPRKinds(currentSets,priorSets,cls){
      const current=currentSets||[],prior=priorSets||[];
      if(cls==='time')return detectTimedPRs(current,prior)?['timed']:[];
      if(cls==='distance')return (typeof detectDistancePRs==='function'&&detectDistancePRs(current,prior))?['distance']:[];
      const kinds=[];
      const curW=current.filter(set=>Number(set.w)>0&&Number(set.r)>0);
      const priW=prior.filter(set=>Number(set.w)>0&&Number(set.r)>0);
      if(curW.length&&priW.length){
        if(Math.max(...curW.map(estimate1RM))>Math.max(...priW.map(estimate1RM))+PR_E1RM_TOLERANCE)kinds.push('e1rm');
        if(Math.max(...curW.map(set=>Number(set.w)||0))>Math.max(...priW.map(set=>Number(set.w)||0)))kinds.push('heaviest');
      }
      if(detectBodyweightPRs(current,prior))kinds.push('bw');
      return kinds;
    }

     














    function repCountPRs(currentSets,priorSets){
      const cur=(currentSets||[]).filter(s=>Number(s.w)>0&&Number(s.r)>0);
      const pri=(priorSets||[]).filter(s=>Number(s.w)>0&&Number(s.r)>0);
      if(!cur.length||!pri.length)return [];
      const priorBestAt=new Map();
      for(const s of pri){const r=Number(s.r),w=Number(s.w);if(!priorBestAt.has(r)||w>priorBestAt.get(r))priorBestAt.set(r,w);}
      const work=new Map();
      for(const s of cur){const r=Number(s.r);if(!work.has(r))work.set(r,[]);work.get(r).push(Number(s.w));}
      const priorMax=Math.max(...pri.map(s=>Number(s.w))),curMax=Math.max(...cur.map(s=>Number(s.w)));
      if(curMax>priorMax){
        const topSet=cur.find(s=>Number(s.w)===curMax);
        const arr=work.get(Number(topSet.r));
        arr.splice(arr.indexOf(curMax),1);
        if(!arr.length)work.delete(Number(topSet.r));
      }
      const out=[];
      for(const [r,ws] of work){
        if(!priorBestAt.has(r))continue;
        const best=Math.max(...ws);
        if(best>priorBestAt.get(r))out.push({reps:r,weight:best});
      }
      out.sort((a,b)=>a.reps-b.reps);
      return out;
    }

     




    function detectTimedPRs(currentSets,priorSets){
      const current=(currentSets||[]).filter(s=>Number(s.seconds)>0),prior=(priorSets||[]).filter(s=>Number(s.seconds)>0);
      if(!current.length||!prior.length)return false;
      const load=s=>Number(s.w)||0;
      const bestAt=target=>{const pool=prior.filter(s=>load(s)===target);return pool.length?Math.max(...pool.map(s=>Number(s.seconds))):-Infinity;};
      return current.some(s=>Number(s.seconds)>bestAt(load(s)));
    }

     























    function detectBodyweightPRs(currentSets,priorSets){
      const unweighted=sets=>(sets||[]).filter(s=>!(Number(s.w)>0)&&Number(s.r)>0);
      const current=unweighted(currentSets),prior=unweighted(priorSets);
      if(!current.length||!prior.length)return false;
      return Math.max(...current.map(s=>Number(s.r)))>Math.max(...prior.map(s=>Number(s.r)));
    }
//# sourceMappingURL=prs.js.map
