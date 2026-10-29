 
     













     







    function rpeToRir(rpe){ if(rpe==null||String(rpe).trim()==='') return ''; const n=Number(rpe); if(!Number.isFinite(n)) return ''; const c=Math.min(10,Math.max(0,n)); return String(Math.round((10-c)*2)/2); }

     




    function rirToRpe(rir){ if(rir==null||String(rir).trim()==='') return ''; const n=Number(rir); if(!Number.isFinite(n)) return ''; const c=Math.min(10,Math.max(0,n)); return String(Math.round((10-c)*2)/2); }


     






    function blankRpeToNull(rpe){
      if(rpe==null||String(rpe).trim()==='')return null;
      const n=Number(rpe);
      return Number.isFinite(n)?n:null;
    }

     






    function rpeRepJump(rpe){
       




      const n=Number(rpe);
      if(!Number.isFinite(n)||n<=0)return 2;
      return Math.max(2,Math.round(10-n));
    }

     
    function fmtRpe(r){return String(Math.round(Number(r)*10)/10);}
//# sourceMappingURL=rpe.js.map
