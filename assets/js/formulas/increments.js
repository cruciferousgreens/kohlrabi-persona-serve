 
     





















     

     



     















    var gymSnapRule=null;  
    function withGymSnap(rule,fn){
      const prev=gymSnapRule;
      gymSnapRule=(rule&&rule.kind==='list'&&Array.isArray(rule.weightsLb)&&rule.weightsLb.length)?rule:null;
      try{return fn();}finally{gymSnapRule=prev;}
    }
    function gymListNearest(raw){
      const L=gymSnapRule.weightsLb;let best=L[0];
      if(raw>L[L.length-1]+1e-6)gymSnapRule.topHit=true;
      for(const w of L){if(Math.abs(w-raw)<Math.abs(best-raw)-1e-9||(Math.abs(Math.abs(w-raw)-Math.abs(best-raw))<1e-9&&w>best))best=w;}
      return best;
    }
    function gymListAbove(w){
      for(const x of gymSnapRule.weightsLb)if(x>w+1e-6)return x;
      return null;
    }
    function gymListStepUp(weight,raw){
      const near=gymListNearest(raw);
      if(near>weight+1e-6)return near;
      const up=gymListAbove(weight);
      if(up==null)gymSnapRule.topHit=true;  
      return up!=null?up:gymListNearest(weight);
    }

    function roundedIncrement(weight,type,value) {
      if(gymSnapRule&&weight>0)return gymListStepUp(weight,type==='percent'?weight*(1+Number(value)/100):weight+Number(value));
      if(type==='percent') return snapToIncrement(weight*(1+Number(value)/100),type,value);
      return snapToIncrement(weight+Number(value),type,value);
    }

     






    function scaledLoadIncrement(weight,type,valueLb,multiplier){
      if(gymSnapRule&&weight>0)return gymListStepUp(weight,type==='percent'?weight*(1+Number(valueLb)*Math.max(1,multiplier||1)/100):weight+Number(valueLb)*Math.max(1,multiplier||1));
      if(!(multiplier>1))return roundedIncrement(weight,type,valueLb);
      if(type==='percent')return snapToIncrement(weight*(1+Number(valueLb)*multiplier/100),'percent',valueLb);
      return snapToIncrement(weight+Number(valueLb)*multiplier,type,valueLb);
    }


     






    function snapToIncrement(rawLb,type,valueLb){
      if(!(rawLb>0))return 0;
      if(gymSnapRule)return gymListNearest(rawLb);
       




      if(type==='percent'){const grid=isMetric()?2.5/LB_TO_KG:5;return Math.round(rawLb/grid)*grid;}
      if(!(valueLb>0))return Math.round(rawLb);
      return Math.round(rawLb/valueLb)*valueLb;
    }

     

    function snapUpToIncrement(rawLb,type,valueLb){
      if(!(rawLb>0))return 0;
      if(gymSnapRule){const L=gymSnapRule.weightsLb;if(rawLb>L[L.length-1]+1e-6)gymSnapRule.topHit=true;for(const x of L)if(x>=rawLb-1e-6)return x;return L[L.length-1];}
      if(type==='percent'){const grid=isMetric()?2.5/LB_TO_KG:5;return Math.ceil(rawLb/grid)*grid;}
      if(!(valueLb>0))return Math.ceil(rawLb);
      return Math.ceil(rawLb/valueLb)*valueLb;
    }

     










    function warmupLadderRows(anchorLb,tracking,evenTotal){
      const n=clamp(Math.round(Number(progressionSetup.warmupRungs)||2),1,3);
      const ladder=(progressionSetup.warmupLadder||[]).slice(0,n);
      const time=tracking==='time';
      return ladder.map(rung=>{
        const pct=Number(rung.pct)||0;
        let w='';
        if(anchorLb>0&&pct>0){
           

          let snapped=snapToIncrement(anchorLb*pct/100,'percent',0);
          if(evenTotal)snapped=Math.round(snapped/2)*2;
          if(snapped>0)w=String(snapped);
        }
        const perf=time
          ? String(Math.max(5,Math.round(Number(rung.reps)/5)*5))
          : String(Math.max(1,Math.round(Number(rung.reps))));
        return {pct,w,reps:time?null:perf,seconds:time?perf:null};
      });
    }

     






    function warmupAnchorLb(item){
      let best=0;
      (item.sets||[]).forEach(s=>{if(isWarmupSet(s))return;const w=Number(s.w)||0;if(w>best)best=w;});
      if(best>0)return best;
      const target=Number(item.suggestedTarget?.w)||0;
      if(target>0)return target;
      return 0;
    }
//# sourceMappingURL=increments.js.map
