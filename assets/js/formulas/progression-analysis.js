 
     

















     


    const SUGGESTION_BASIS_WEEKS = 8;

     
     
     




    function isDropSet(set) {
      return !!set && Array.isArray(set.tags) && set.tags.includes('Dropset');
    }
    function topSetForSession(session) {
      if (!session?.sets?.length) return null;
      const mode=session.tracking==='time'||session.sets.some(set=>set.seconds!=null)?'time':'reps';
       



      const candidates0=session.sets.filter(set=>!isWarmupSet(set));
       







      const candidates=(typeof isDropSet==='function'&&candidates0.some(set=>!isDropSet(set)))
        ?candidates0.filter(set=>!isDropSet(set)):candidates0;
      if(!candidates.length)return null;
       





      const hasCompleted=candidates.some(set=>set.complete!==false);
      const top=candidates.reduce((best,set,index) => {
        if(hasCompleted&&set.complete===false)return best;
        const weight=Number(set.w)||0, reps=Number(set.r)||0, seconds=Number(set.seconds)||0;
        const performance=mode==='time'?seconds:reps;
        const rpe=blankRpeToNull(set.rpe);
         










        if(!best)return {weight,reps,seconds,performance,mode,rpe,index};
        if(weight>best.weight)return {weight,reps,seconds,performance,mode,rpe,index};
        if(weight===best.weight&&performance>best.performance)return {weight,reps,seconds,performance,mode,rpe,index};
        if(weight===best.weight&&performance===best.performance&&rpe!=null&&(best.rpe==null||rpe>best.rpe))return {weight,reps,seconds,performance,mode,rpe,index};
        return best;
      },null);
       




      if(!top||!Number.isFinite(top.weight)||top.weight<0)return null;
       





      top.amrap=(typeof isAmrapSet==='function')?isAmrapSet(candidates[top.index]):false;
      return top;
    }

     










    function fatigueForBasis(basisSets,top){
      const topRpe=top&&top.rpe!=null?Number(top.rpe):null;
      const none={penalty:0,effectiveRpe:topRpe,workSets:0};
       


      if(!(topRpe>0))return none;
      const sets=basisSets||[];
      const topIdx=clamp(Number(top&&top.index)||0,0,Math.max(0,sets.length-1));
      let load=0,workSets=0;
      sets.forEach((s,i)=>{
        if(!((Number(s.w)||0)>0||(Number(s.r)||0)>0||(Number(s.seconds)||0)>0))return;
        workSets++;
        if(i===topIdx)return;
        const rpe=blankRpeToNull(s.rpe);
        load+=0.25*((rpe!=null&&rpe>0?rpe:topRpe)/10);
      });
      if(workSets<=1)return {penalty:0,effectiveRpe:topRpe,workSets};
      const penalty=Math.min(1.5,Math.round(load*100)/100);
      return {penalty,effectiveRpe:Math.round((topRpe+penalty)*10)/10,workSets};
    }
//# sourceMappingURL=progression-analysis.js.map
