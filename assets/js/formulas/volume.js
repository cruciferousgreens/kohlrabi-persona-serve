 
     











     
     

     


     




    function setVolume(set, ex) {
      if(Number(set?.distance)>0)return 0;
      if(ex&&typeof isNonVolumeExercise==='function'&&isNonVolumeExercise(ex))return 0;
      const w=Number(set.w), r=Number(set.r);
      return (isFinite(w)?w:0) * (isFinite(r)?r:0);
    }

     

    const SECONDARY_MUSCLE_WEIGHT=0.45;

     
     
     
     
     
    function displayVolume(lbReps){
       


      const n=Number(lbReps), finite=isFinite(n)?n:0;
      return isMetric()?finite*LB_TO_KG:finite;
    }
//# sourceMappingURL=volume.js.map
