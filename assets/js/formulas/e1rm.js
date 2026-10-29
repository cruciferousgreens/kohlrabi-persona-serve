 
     































     
    function epley1RM(weight,reps,rir){
      const w=Number(weight);
      if(!Number.isFinite(w)||w<=0)return 0;
      return w*(1+(Number(reps)+Number(rir||0))/30);
    }
     
    function epleyLoadForReps(e1rm,reps,rir){
      return Number(e1rm)/(1+(Number(reps)+Number(rir||0))/30);
    }
     
    function estimate1RM(set) {
      
      const weight = Number(set.w);
      if (!Number.isFinite(weight) || weight <= 0) return 0;
       









      const reps = Number(set.r);
      if (!Number.isFinite(reps) || reps <= 0) return 0;
      const rpeNum = set.rpe == null || set.rpe === '' ? NaN : Number(set.rpe);
      const rir = Number.isFinite(rpeNum) ? Math.max(0, 10 - Math.min(10, Math.max(0, rpeNum))) : 0;
      return epley1RM(weight, Math.min(reps + rir, 15), 0);
    }

     





































     







    function backIntoRange(weight,reps,rpe,min,max,incrementType,incrementValueLb){
      if(!(reps<min))return null;
      const rir=rpe==null||rpe==='' ? 0 : Math.max(0,10-Number(rpe));
      const capacityReps=reps+rir;
      const targetReps=Math.round((min+max)/2);
      if(capacityReps>=min)
        return {kind:'reps',nextWeight:weight,nextReps:Math.min(max,capacityReps),estimated1RM:null};  
      const e1=estimate1RM({w:weight,r:reps,rpe});
      const rawTarget=epleyLoadForReps(e1,targetReps,rir);
      const snappedLoad=snapToIncrement(rawTarget,incrementType,incrementValueLb);
       






      let nextWeight=snappedLoad;
      if(snappedLoad<weight){
        const ceiling=snapUpToIncrement(rawTarget,incrementType,incrementValueLb);
        nextWeight=ceiling<=weight?ceiling:snappedLoad;
      }
      return {kind:'backrange',nextReps:targetReps,estimated1RM:e1,
        nextWeight:Math.max(0,nextWeight)};
    }
//# sourceMappingURL=e1rm.js.map
