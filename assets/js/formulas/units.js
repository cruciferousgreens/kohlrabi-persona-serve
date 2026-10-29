 
     









     

    const LB_TO_KG=0.45359237;

     
    function isMetric(){return progressionSetup.units==='metric';}

     
    function weightUnit(){return isMetric()?'kg':'lb';}

     
    function displayWeight(lb){
      if(lb==null||String(lb).trim()==='')return '';
      const n=Number(lb); if(!isFinite(n))return '';
      return isMetric()?String(Math.round(n*LB_TO_KG*10)/10):String(n);
    }

     
    function storageWeight(val){
      if(val==null||String(val).trim()==='')return '';
      const n=Number(val); if(!isFinite(n))return '';
      return isMetric()?String(Math.round(n/LB_TO_KG*10)/10):String(val);
    }
//# sourceMappingURL=units.js.map
