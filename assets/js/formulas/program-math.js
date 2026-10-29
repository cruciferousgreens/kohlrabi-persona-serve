 
     












     



    function programPctForWeek(programOrConfig,week){
      const progression=programOrConfig?.progression||programOrConfig||progressionSetup;
       

      if(!progression.pctWave)return null;
      const arr=progression.weeklyPcts;
      if(!Array.isArray(arr)||!arr.length)return null;
      const w=Math.max(1,Number(week)||1);
      const v=Number(arr[(w-1)%arr.length]);
      return Number.isFinite(v)&&v>0?v:null;
    }

     






    function isDeloadWeek(programOrConfig,week){
      const progression=programOrConfig?.progression||programOrConfig||progressionSetup;
      const w=Math.max(1,Number(week)||0);
      if(!(w>0))return false;
      if(!progression.pctWave)return false;
      const flags=progression.weeklyDeloads;
      return Array.isArray(flags)&&flags.length>0&&!!flags[(w-1)%flags.length];
    }

     
     
     
     

     



     
     
     




    function clampPct1RM(v){const n=Number(v);return Number.isFinite(n)&&n>0?clamp(Math.round(n*100)/100,1,100):75;}

     

    function clampDeloadPct(v){const n=Number(v);return Number.isFinite(n)&&n>0?clamp(Math.round(n*100)/100,40,80):60;}

     



    function pctValueOrNull(v){
      if(v==null||v===''||typeof v==='boolean')return null;
      const n=Number(v);
      return Number.isFinite(n)&&n>0?clamp(Math.round(n*100)/100,1,100):null;
    }

     

















    function forkDeloadScaleForWeek(program,week){
      if(!program||typeof program!=='object')return null;
      if(typeof forkIsDeloadWeek==='function'&&forkIsDeloadWeek(program,week))return 60;
      if(isDeloadWeek(program,week)){
        const prog=program.progression||{};
        const raw=prog.deloadPct!=null?prog.deloadPct
          :(typeof progressionSetup!=='undefined'?progressionSetup.deloadPct:undefined);
        return clampDeloadPct(Number(raw??60));
      }
      return null;
    }

     






    function resolveSetPct(set,profile,programConfig,week){
      return pctValueOrNull(set&&set.pct)
        ?? pctValueOrNull(profile&&profile.percentOf1RM)
        ?? pctValueOrNull(programPctForWeek(programConfig,week))
        ?? pctValueOrNull(programConfig&&(programConfig.progression||programConfig).percentOf1RM)
        ?? 75;
    }
//# sourceMappingURL=program-math.js.map
