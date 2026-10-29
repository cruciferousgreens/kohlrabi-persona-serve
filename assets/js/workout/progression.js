 
     





     






     
     
     
     

     




     





     

    const _repWord=n=>Number(n)===1?'rep':'reps';
    const _setWord=n=>Number(n)===1?'set':'sets';
    function actualStepLabel(newW,baseW,incrementType,perDbInc){
      const d=newW-baseW;
      if(!(d>0)||!(baseW>0))return null;
      if(incrementType==='percent')return `${Math.round(d/baseW*100)}%`;
       


      return `${displayWeight(perDbInc?d/2:d)} ${weightUnit()}`;
    }
     




    function distanceSuggestionFrom(ctx,latestLog){
      const sets=(latestLog?.sets||[]).filter(st=>!isWarmupSet(st)&&Number(st.distance)>0);
      if(!sets.length)return null;
      const top=sets.reduce((a,b)=>Number(b.distance)>Number(a.distance)?b:a);
      const dist=Number(top.distance),weight=Number(top.w)||0;
       




      const rpe=blankRpeToNull(top.rpe);
      const distGateRpe=ctx.advanceOnCompletion?ctx.threshold:rpe;
      const incrementType=ctx.profile?.incrementType || ctx.programConfig.incrementType || 'lb';
       




      const _incrementRaw=Number(ctx.profile?.incrementValue ?? ctx.programConfig.incrementValue ?? 5);
      const incrementValue=(_incrementRaw>0&&Number.isFinite(_incrementRaw))?_incrementRaw:5;
      const incrementValueLb=incrementType==='percent'?incrementValue:(isMetric()?incrementValue/LB_TO_KG:incrementValue);
      const incrementLabel=incrementType==='percent'?`${incrementValue}%`:`${incrementValue} ${weightUnit()}`;
      const repsOnly=!!ctx.profile?.repsOnly;
      let nextWeight=weight,kind='hold',reason='Top-set RPE is above the progression trigger.';
       



       


      const distanceDeload=(!!ctx.week&&typeof isDeloadWeek==='function'&&isDeloadWeek(ctx.programConfig,ctx.week))||!!ctx.forkDeload;
      if(distanceDeload){
        reason='Deload week: hold the distance target steady.';
      }else if(ctx.scheme==='linear'||(distGateRpe!=null&&distGateRpe<=ctx.threshold)){
         


        const distCompletionDrove=ctx.advanceOnCompletion&&!(rpe!=null&&rpe<=ctx.threshold);
        if(repsOnly){reason=`Load progression is off, so hold ${(ctx.fmtW?ctx.fmtW(weight):displayWeight(weight))||0} ${weightUnit()} × ${dist} m.`;}
        else{nextWeight=roundedIncrement(weight,incrementType,incrementValueLb);kind='load';reason=`Top set was at or below RPE ${ctx.threshold}; add ${actualStepLabel(nextWeight,weight,incrementType,ctx._perDbInc)||incrementLabel} at ${dist} m.${distCompletionDrove?' Advancing on completion. RPE isn\u2019t gating this suggestion.':''}`;}
      }else if(rpe==null){reason='No RPE on the latest top set, so the engine holds the target.';}
       

      if(typeof isFixedSet==='function'&&isFixedSet(top))return null;
       
      if(Math.abs(nextWeight-weight)<0.001)return null;  
       






      const latest={weight,reps:0,seconds:0,performance:0,distance:dist,rpe,mode:'reps',index:sets.indexOf(top)};
       


      const distWarmupTargets=[];
      (latestLog?.sets||[]).forEach((st,overall)=>{
        if(!(typeof isWarmupSet==='function'&&isWarmupSet(st)))return;
        const bw=Number(st.w)||0;
        const fixed=typeof isFixedSet==='function'&&isFixedSet(st);
        let t={index:overall,warmup:true,fixed,w:bw,r:Number(st.r)||0,seconds:Number(st.seconds)||0,kind:'hold',changed:false,oldW:bw,oldR:Number(st.r)||0,oldSeconds:Number(st.seconds)||0};
        if(!fixed&&bw>0&&weight>0&&Math.abs(nextWeight-weight)>0.001){
          const nw=snapToIncrement(bw/weight*nextWeight,incrementType,incrementValueLb);
          if(Math.abs(nw-bw)>0.001)t={...t,w:nw,kind:'load',changed:true};
        }
        distWarmupTargets.push(t);
      });
      return {exerciseId:ctx.exerciseId,latest,mode:ctx.profile?.mode||'reps',isDistance:true,
        warmupTargets:distWarmupTargets.length?distWarmupTargets:null,
        nextWeight,nextReps:0,nextSeconds:0,nextDistance:dist,kind,reason,notice:null,estimated1RM:0,
        sourceDate:latestLog?.isoDate,sourceWorkout:latestLog?.name,range:[dist,dist],timeStep:0,
        repsOnly,freeform:!!ctx.config?.freeform,scheme:ctx.scheme,amrap:false,pct:null,tmSource:null,
        setTargets:null,topIndex:0,
        basisSets:sets.map(st=>({w:Number(st.w)||0,r:0,seconds:0,distance:Number(st.distance)||0}))};
    }
     

























     
















    function forkEffectiveProgressionConfig(config,exerciseId){
      const resolved=config||workoutState.activeProgram?.progression||progressionSetup;
      const draft=workoutState.draft;
      if(!draft||draft.editingId||!Array.isArray(draft.exercises))return resolved;
      if(typeof state!=='undefined'&&state&&state.savedBuilder)return resolved;
      if(!draft.exercises.some(row=>row&&row.exerciseId===exerciseId))return resolved;
      const wk=draft.progression;
      if(!wk||typeof wk!=='object')return resolved;
      const fields=(typeof FORK_PROG_FIELDS!=='undefined'&&FORK_PROG_FIELDS)||['scheme','threshold','incrementType','incrementValue','percentOf1RM','advanceOnCompletion'];
      const inProgram=!!(draft.programId&&workoutState.activeProgram&&workoutState.activeProgram.id===draft.programId);
      let out=null;
      for(const k of fields){
        if(wk[k]==null)continue;
        if(inProgram&&resolved[k]!=null)continue;
        if(resolved[k]===wk[k])continue;
        if(!out)out={...resolved};
        out[k]=wk[k];
      }
      return out||resolved;
    }
     








     






    function progressionForExercise(exerciseId, profile, config=null, hasStoredZone=false, opts=null) {
      const gym=(typeof gymLoadRule==='function')?gymLoadRule(exerciseId,profile):null;
      if(!gym)return progressionForExerciseCore(exerciseId,profile,config,hasStoredZone,opts);
      if(gym.kind==='step'){
         





        const progLb=(()=>{const c=config||{};const raw=Number((profile&&profile.incrementValue)??c.incrementValue??5);return (typeof isMetric==='function'&&isMetric())?raw/LB_TO_KG:raw;})();
        const stepLb=gym.stepLb||((config&&config.incrementType==='percent')?5:progLb)||5;
        const stepProfile=gym.stepLb?{...(profile||{}),incrementType:'lb',incrementValue:gymStepDisplay(gym.stepLb)}:profile;
        const anchor=forkGymAnchorLb(exerciseId);
        const off=anchor>0?Math.round((anchor%stepLb)*1000)/1000:0;
        const offset=(off>1e-6&&stepLb-off>1e-6)?off:0;
        if(!offset&&!gym.maxLb)return progressionForExerciseCore(exerciseId,stepProfile,config,hasStoredZone,opts);
        const top=gym.maxLb||2000,lattice=[];
        for(let w=offset||stepLb;w<=top+1e-6;w+=stepLb)lattice.push(Math.round(w*1000)/1000);
        if(!lattice.length)lattice.push(top);
        const rule={kind:'list',weightsLb:lattice};
        return gymNameHeaviestHold(withGymSnap(rule,()=>progressionForExerciseCore(exerciseId,stepProfile,config,hasStoredZone,opts)),rule);
      }
      return gymNameHeaviestHold(withGymSnap(gym,()=>progressionForExerciseCore(exerciseId,profile,config,hasStoredZone,opts)),gym);
    }
     






    function gymNameHeaviestHold(out,rule){
      if(!out||!rule||!rule.topHit||typeof out.reason!=='string'||!out.reason)return out;
      const top=rule.weightsLb&&rule.weightsLb[rule.weightsLb.length-1];
      if(!(top>0)||Math.abs(Number(out.nextWeight)-top)>1e-6)return out;
      if(/gym’s heaviest/.test(out.reason))return out;
      const r=out.reason.replace(/\s+$/,'');
      return {...out,reason:(/[.!?]$/.test(r)?r:r+'.')+' At this gym’s heaviest.'};
    }
     


    function forkGymAnchorLb(exerciseId){
      const canon=id=>(typeof canonicalExerciseId==='function')?canonicalExerciseId(id):id;
      const want=canon(exerciseId);
      const logs=[...((typeof workoutState!=='undefined'&&workoutState.completed)||[])].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.completedAt||'').localeCompare(String(a.completedAt||'')));
      for(const w of logs)for(const it of (w.exercises||[])){
        if(!it||canon(it.exerciseId)!==want)continue;
        for(const set of (it.sets||[])){const n=Number(set&&set.w);if(n>0&&!(typeof isWarmupSet==='function'&&isWarmupSet(set)))return n;}
      }
      return 0;
    }
    function progressionForExerciseCore(exerciseId, profile, config=null, hasStoredZone=false, opts=null) {
       



      const programConfig=forkEffectiveProgressionConfig(config,exerciseId);
       





      const advanceOnCompletion=profile?.threshold==='completion'||programConfig.threshold==='completion'||!!programConfig.advanceOnCompletion;
       





      if(progressionSetup.progressionOff||programConfig?.progressionOff||profile?.scheme==='off')return null;
       



      const week=Number(programConfig.currentWeek)||null;
       

















      const forkGateDraft=workoutState.draft;
      const forkGateProgram=(!forkGateDraft||forkGateDraft.editingId||!forkGateDraft.programId||!workoutState.activeProgram||workoutState.activeProgram.id!==forkGateDraft.programId)?null:workoutState.activeProgram;
      let forkDeloadSession=false;
      if(forkGateProgram){
        const forkSessDate=typeof forkGateDraft.date==='string'&&forkGateDraft.date?forkGateDraft.date:localIsoDate();
        const forkSessWeek=typeof forkEffectiveProgramWeek==='function'?forkEffectiveProgramWeek(forkGateProgram,forkSessDate):null;
        forkDeloadSession=!!(forkSessWeek&&typeof forkIsDeloadWeek==='function'&&forkIsDeloadWeek(forkGateProgram,forkSessWeek));
      }
      
      
      
      
      
      const scheme=profile?.scheme||programConfig?.scheme||'linear';
       








      const _perDbEx=resolveExercise(exerciseId);
      const _perDbItem=workoutState.draft?.exercises?.find(row=>row.exerciseId===exerciseId);
      const _perDbInc=pairImplementExercise(_perDbEx)&&dbEntryMode(exerciseId,_perDbItem)==='per'&&!dbSingleDumbbell(exerciseId,_perDbItem);
       






      const _dbFmtW=w=>dbDisplayWeight(w,exerciseId,_perDbItem,pairImplementExercise(_perDbEx));
       



       






       






       















      const _basisToday=localIsoDate();
      const _basisDateKey=log=>{
        const d=(log&&(log.isoDate||log.date))||'';
        if(d&&d>_basisToday){
          const ca=(log&&log.completedAt)||'';
          return ca?String(ca).slice(0,10):_basisToday;
        }
        return d;
      };
      const sortByBasisRecencyDesc=(a,b)=>{
        const ka=_basisDateKey(a),kb=_basisDateKey(b);
        if(ka!==kb)return kb<ka?-1:1;
        const ca=(a&&a.completedAt)||'',cb=(b&&b.completedAt)||'';
        return cb<ca?-1:cb>ca?1:0;
      };
      let logs=(opts&&Array.isArray(opts.logs)?[...opts.logs]:getExerciseLogs(exerciseId)).sort(sortByBasisRecencyDesc);  
       





      
      
      
      const trainingMax=Number(profile?.trainingMax ?? profile?.manual1RM)||0;
      if(!logs.length&&!(scheme==='onerm'&&trainingMax>0))return null;
      const targetMode=profile?.mode || 'reps';
       


      const _distEx=(typeof exercises!=='undefined'?exercises:[]).find(x=>x.id===exerciseId);
      const isDistanceExercise=(typeof setPerfField==='function')&&setPerfField(null,_distEx)==='distance';
       


      let threshold=Number(profile?.threshold ?? programConfig.threshold ?? 8);
      if(!(threshold>=1&&threshold<=10))threshold=8;
      
      
      
      const normMin=p=>p?.amrap?(Number(p?.min)||1):Number(p?.min ?? 5);
       








      const normMax=p=>p?.amrap?null:(p?.max==null&&p?.min!=null&&!p?.openTop?null:Number(p?.max ?? 8));
      const min0=normMin(profile), max0=normMax(profile);
      let min=min0, max=max0;
       




      const profOpen=!!profile?.openTop||(profile!=null&&profile.min!=null&&profile.max==null&&!profile.amrap);
      let timeMin=Number(profile?.timeMin ?? 30), timeMax=Number(profile?.timeMax ?? 60);
      const timeStep=Number(profile?.timeStep)||5;
      
      
      
      
      
      
      
      
      
      
      const inStoredZone=log=>{
        const p=log.progression; if(!p)return false;
        if((p.mode||'reps')!==targetMode)return false;
        if(targetMode==='time'){if(!(Number(p.timeMin)===timeMin&&Number(p.timeMax)===timeMax))return false;}
        
        
        
        
        
        else if(!((profile?.amrap?normMin(p)===min:Number(p.min)===min)&&(profile?.amrap||normMax(p)===max)&&!!p.amrap===!!profile?.amrap&&!!p.openTop===!!profile?.openTop))return false;
        
        
        
        
        
        const top=topSetForSession(log); if(!top)return false;
        if(targetMode==='time')return top.mode==='time'&&top.seconds>=timeMin&&top.seconds<=timeMax;
        return top.mode==='reps'&&top.reps>=min&&(profOpen||profile?.amrap||top.amrap||top.reps<=max);  
      };
      const inLoggedZone=log=>{
        const top=topSetForSession(log); if(!top)return false;
        if(targetMode==='time')return top.mode==='time'&&top.seconds>=timeMin&&top.seconds<=timeMax;
        return top.mode==='reps'&&top.reps>=min&&(profOpen||profile?.amrap||top.amrap||top.reps<=max);  
      };
       

























      const isDeloadPerformedBasis=log=>!!log&&log.deloadPerformed===true;
      const basisLogs=logs.some(isDeloadPerformedBasis)
        ?[...logs.filter(l=>!isDeloadPerformedBasis(l)),...logs.filter(isDeloadPerformedBasis)]
        :logs;
      const zoneLog=basisLogs.find(inStoredZone)||basisLogs.find(inLoggedZone);
       







      const basisCapDays=SUGGESTION_BASIS_WEEKS*7;
      const basisAgeDays=log=>{
        const d=(log&&(log.isoDate||log.date))||'';
        const ms=Date.parse(d);
        if(!Number.isFinite(ms))return Infinity;
        return (Date.parse(localIsoDate())-ms)/DAY_MS;
      };
      const isFreshBasis=log=>!!log&&basisAgeDays(log)<=basisCapDays;
      const freshZoneLog=isFreshBasis(zoneLog)?zoneLog:null;
      const freshLatest=isFreshBasis(basisLogs[0])?basisLogs[0]:null;
       




















       


























      const performedRangeOf=log=>{
        const p=log&&log.progression;
        if(p&&(p.mode||'reps')!==targetMode)return null;
        if(p&&targetMode==='time')
          return (Number(p.timeMin)===timeMin&&Number(p.timeMax)===timeMax)?{timeMin,timeMax}:null;
        if(p&&(p.min!=null||p.max!=null||p.amrap||p.openTop))
          return {min:normMin(p),max:normMax(p),amrap:!!p.amrap,
            open:!!p.openTop||(p.min!=null&&p.max==null&&!p.amrap)};
        if(targetMode==='reps'&&log){
          const fc=log.focusCustomRange;
          if(fc&&(fc.min!=null||fc.max!=null))
            return {min:Number(fc.min),max:fc.max==null?null:Number(fc.max),amrap:false,open:fc.max==null};
          const preset=(typeof REP_PRESETS!=='undefined'&&log.focusPreset)?REP_PRESETS[log.focusPreset]:null;
          if(preset)return {min:preset.min,max:preset.max,amrap:!!preset.amrap,open:!!preset.openTop};
        }
        return null;
      };
      const samePerformedRange=log=>{
        if(!log)return false;
        const pr=performedRangeOf(log);
        if(pr){
          if(targetMode==='time')return true;  
          return pr.min===min&&pr.max===max&&pr.amrap===!!profile?.amrap&&pr.open===profOpen;
        }
         



        if(log.progression||log.focusPreset||log.focusCustomRange)return false;
        return inLoggedZone(log);
      };
      const rangeLog=basisLogs.find(samePerformedRange);
      const freshRangeLog=isFreshBasis(rangeLog)?rangeLog:null;
       










      const performedRangeDiffers=log=>{
        if(!log)return false;
        const p=log.progression;
        if(p){
          if((p.mode||'reps')!==targetMode)return false;
          return !samePerformedRange(log);
        }
        return !!performedRangeOf(log)&&!samePerformedRange(log);
      };
      const bases=(freshRangeLog&&freshLatest&&freshRangeLog!==freshLatest&&performedRangeDiffers(freshLatest))
        ?[freshRangeLog,freshLatest]
        :(freshZoneLog&&freshLatest&&freshZoneLog!==freshLatest)?[freshLatest,freshZoneLog]:[freshZoneLog||freshLatest];
       





      const rawFreshLatest=isFreshBasis(logs[0])?logs[0]:null;
      if(rawFreshLatest&&rawFreshLatest!==freshLatest&&isDeloadPerformedBasis(rawFreshLatest)&&!bases.includes(rawFreshLatest))bases.push(rawFreshLatest);
       





















      const forkDecline=(()=>{
        if(targetMode!=='reps'||typeof forkDeclineState!=='function')return null;
        const series=[];
        for(const log of logs){
          if(!isFreshBasis(log))break;
          const top=topSetForSession(log);
          if(!top||top.mode!=='reps'||!(top.weight>0))continue;
          if(top.rpe!=null&&Number(top.rpe)<7)continue;
          const e=estimate1RM({w:top.weight,r:top.reps,rpe:top.rpe});
          if(e>0)series.push(e);
        }
        const st=forkDeclineState(series);
        return st.declining?st:null;
      })();
       



















      const forkStallCount=(()=>{
        if(targetMode!=='reps'||profile?.amrap)return 0;
        let count=0,stallWeight=null;
        for(const log of logs){
          if(!isFreshBasis(log))break;
          const top=topSetForSession(log); if(!top||top.mode!=='reps'||!(top.weight>0))break;
          if(stallWeight==null)stallWeight=top.weight;
          else if(Math.abs(top.weight-stallWeight)>0.001)break;
          const missed=(log.sets||[]).some(s=>!isWarmupSet(s)&&Number(s.r)>0&&Number(s.r)<min);
          const stalled=(top.rpe!=null&&Number(top.rpe)>threshold)||missed;
          if(!stalled)break;
          count++;
        }
        return count;
      })();
      const forkApplyStallLayer=suggestion=>{
         

         








        if(forkDecline)return suggestion;
        if(!suggestion||suggestion.kind!=='hold'||forkStallCount<1||suggestion.isDistance)return suggestion;
        const latest=suggestion.latest; if(!latest||!(latest.weight>0))return suggestion;
        const fixedTarget=min===max&&Number.isFinite(min);
         


        const incType=profile?.incrementType||programConfig.incrementType||'lb';
        const incRaw=Number(profile?.incrementValue ?? programConfig.incrementValue ?? 5);
        const incVal=incRaw>0&&Number.isFinite(incRaw)?incRaw:5;
        const incLb=incType==='percent'?incVal:(isMetric()?incVal/LB_TO_KG:incVal)*(_perDbInc?2:1);
        const scaleTargets=(wFn,rFn,kindName)=>{
          if(!suggestion.setTargets)return;
          suggestion.setTargets=suggestion.setTargets.map(t=>{
            if(!t)return t;
             

            if(t.fixed)return t;
            const w=wFn(t),r=rFn(t);
            return {...t,w,r,kind:kindName,changed:Math.abs(w-(t.oldW||0))>0.001||r!==(t.oldR||0)};
          });
           

          if(Array.isArray(suggestion.fullSetTargets)){
            let wp=0;
            suggestion.fullSetTargets=suggestion.fullSetTargets.map(ft=>{
              if(!ft||ft.warmup)return ft;
              const nt=suggestion.setTargets[wp++]; return nt?{...nt,index:ft.index,warmup:false}:ft;
            });
          }
        };
         



        if(fixedTarget&&scheme==='rpe'&&min>1){
          suggestion.kind='stage'; suggestion.notice=null;
          suggestion.nextReps=min-1;
          suggestion.reason=`Stalled at ${_dbFmtW(latest.weight)} ${weightUnit()} × ${min}. GZCLP-style stage step: same load, ${min-1} ${_repWord(min-1)} per set next stage. Hit every set to move on.`;
          scaleTargets(t=>t.oldW||0,()=>min-1,'stage');
          return suggestion;
        }
        if(fixedTarget&&scheme==='rpe'&&min===1&&forkStallCount>=2){
          suggestion.kind='deload'; suggestion.notice=null;
          suggestion.nextWeight=snapToIncrement(latest.weight*0.9,incType,incLb);
          suggestion.nextReps=3;
          suggestion.reason=`Final-stage stall at ${_dbFmtW(latest.weight)} ${weightUnit()}. Reset to 90% (${_dbFmtW(suggestion.nextWeight)} ${weightUnit()}) and rebuild from a 3-rep stage, the GZCLP reset rule.`;
          scaleTargets(t=>snapToIncrement((t.oldW||0)*0.9,incType,incLb),()=>3,'deload');
          return suggestion;
        }
        if(forkStallCount>=3&&!(fixedTarget&&scheme==='rpe')){
          suggestion.kind='deload'; suggestion.notice=null;
          suggestion.nextWeight=snapToIncrement(latest.weight*0.9,incType,incLb);
          suggestion.reason=`Three stalls in a row at ${_dbFmtW(latest.weight)} ${weightUnit()}. Suggesting a 90% deload (${_dbFmtW(suggestion.nextWeight)} ${weightUnit()}) to rebuild from. This is a suggestion, not an automatic change.`;
          scaleTargets(t=>snapToIncrement((t.oldW||0)*0.9,incType,incLb),t=>t.oldR||0,'deload');
          return suggestion;
        }
        if(forkStallCount===2&&!(fixedTarget&&scheme==='rpe')&&suggestion.notice){
           


          suggestion.notice={title:'Second stall',
            body:`Two sessions in a row have stalled at this load. Repeat it once more; a third stall will suggest a 90% deload.`};
          suggestion.stallCount=forkStallCount;
        }
        return suggestion;
      };
       

















      const forkAttachAlternates=(suggestion,basisLog)=>{
        if(!suggestion||suggestion.applied||suggestion.notice||suggestion.isDistance)return;
        if(suggestion.kind!=='reps'&&suggestion.kind!=='time')return;
        if(suggestion.scheme!=='rpe'||suggestion.amrap||suggestion.latest?.amrap||suggestion.repsOnly)return;  
        if(profile?.openTop||profile?.amrap)return;
        if(!(Number(suggestion.latest?.weight)>0))return;
        const alt=computeFromBasis(basisLog,'load');
        if(!alt||alt.kind!=='load'||alt.notice)return;
         

        if(Math.abs(alt.nextWeight-suggestion.nextWeight)<0.001&&alt.nextReps===suggestion.nextReps&&alt.nextSeconds===suggestion.nextSeconds)return;
        suggestion.alternates=[alt];
      };
      let holdNotice=null;
      for(const basisLog of bases){
        const suggestion=forkApplyStallLayer(computeFromBasis(basisLog));
        if(suggestion){
           






          if(suggestion.kind==='hold'&&suggestion.notice&&suggestion.latest&&suggestion.latest.rpe!=null&&Number(suggestion.latest.rpe)>threshold){holdNotice=suggestion;continue;}
           




          forkAttachAlternates(suggestion,basisLog);
          return suggestion;
        }
      }
      return holdNotice;
       


       






       





      function computeFromBasis(latestLog,preferKind,suppressDeload){
      if(isDistanceExercise)return distanceSuggestionFrom({exerciseId,profile,config,programConfig,scheme,week,threshold,advanceOnCompletion,_perDbInc,fmtW:_dbFmtW,forkDeload:forkDeloadSession},latestLog);
      const latest=latestLog?topSetForSession(latestLog):null;
       



      const basisSets=(latestLog&&latestLog.sets?latestLog.sets:[]).filter(s=>!isWarmupSet(s));
       

















      const _candidateSets=(typeof isDropSet==='function'&&basisSets.some(s=>!isDropSet(s)))?basisSets.filter(s=>!isDropSet(s)):basisSets;
      const _winningSet=latest?_candidateSets[latest.index]:null;
      const basisTopIndex=_winningSet?basisSets.indexOf(_winningSet):(latest?(latest.index||0):0);
      const latestForBasis=latest?{...latest,index:basisTopIndex}:latest;
       




      const _isAmrapSet=st=>typeof isAmrapSet==='function'&&isAmrapSet(st);
       


      const gateRpe=(latest&&latest.rpe!=null&&isFinite(Number(latest.rpe)))?Number(latest.rpe):null;
       

      const gateRpeEff=advanceOnCompletion?threshold:gateRpe;
       

      const fatigue=fatigueForBasis(basisSets,latestForBasis);  
      const fatigueClause='';
       




       



       


      let forkWarmupTargets=null,forkFullSetTargets=null,forkBasisSetsFull=null;
      const mode=profile?.mode || latest?.mode || 'reps';
      
      
      
      
      
      
      
      
      
      
      
      
      
      const followLifter=!!config?.freeform&&!profile?.custom&&!hasStoredZone;
      if(latest&&followLifter&&!profile?.amrap&&!profile?.openTop&&latest.mode===mode){
        if(mode==='time'){timeMin=Math.max(1,latest.seconds);timeMax=Math.max(1,latest.seconds);}
        else{min=Math.max(1,latest.reps);max=Math.max(1,latest.reps);}
      }
       









      const fixedReps=(profile&&Number.isFinite(Number(profile.fixedReps))&&Number(profile.fixedReps)>=1)?Math.round(Number(profile.fixedReps)):null;
      const jumpReps=fixedReps!=null?fixedReps:min;
      const incrementType=profile?.incrementType || programConfig.incrementType || 'lb';
       




      const _incrementRaw=Number(profile?.incrementValue ?? programConfig.incrementValue ?? 5);
      const incrementValue=(_incrementRaw>0&&Number.isFinite(_incrementRaw))?_incrementRaw:5;
       



      const _incrementBaseLb=incrementType==='percent'?incrementValue:(isMetric()?incrementValue/LB_TO_KG:incrementValue);
      const incrementValueLb=incrementType==='percent'?_incrementBaseLb:_incrementBaseLb*(_perDbInc?2:1);
      const incrementLabel=incrementType==='percent'?`${incrementValue}%`:`${incrementValue} ${weightUnit()}`;
      const repsOnly=!!profile?.repsOnly;
      
      
      
      
      const previousProfile=latestLog?.progression;
      const previousMin=normMin(previousProfile),previousMax=normMax(previousProfile);
      const hasStoredRange=Number.isFinite(Number(previousProfile?.min))&&(!!previousProfile?.amrap||Number.isFinite(Number(previousProfile?.max))),outsideNewRange=!!latest&&(latest.reps<min||(!profOpen&&!profile?.amrap&&!latest.amrap&&latest.reps>max));  
      const repRangeChanged=!!latest&&mode==='reps'&&previousProfile?.mode!=='time'&&((hasStoredRange&&(previousMin!==min||previousMax!==max))||(!hasStoredRange&&outsideNewRange));
       




      const latestInNewZone=!!latest&&latest.reps>=min&&(profOpen||profile?.amrap||latest.amrap||latest.reps<=max);  
      let nextWeight=latest?.weight??0,nextReps=latest?.reps??min,nextSeconds=latest?.seconds??timeMin,kind='hold',reason='Top-set RPE is above the progression trigger.',estimated1RM=0;
       



      let amrapHeadlineRaw=null;
       




      let notice=null;
      let repJumpUsed=0;  
       


      const bestZoneE1RM=()=>{
        let best=0;
        for(const log of logs){
          if(!(inStoredZone(log)||inLoggedZone(log)))continue;
          const top=topSetForSession(log);
          if(!top||!(top.weight>0)||!(top.reps>0))continue;
          const e=estimate1RM({w:top.weight,r:top.reps,rpe:top.rpe});
          if(e>best)best=e;
        }
        return best;
      };
       





       

      const onermRx=()=>{
        if(mode==='time')return null;
        const pct=clampPct1RM(Number(profile?.percentOf1RM)||programPctForWeek(programConfig,week)||Number(programConfig?.percentOf1RM)||75);
        let basis=0,basisNote='',tmSource=null;
        if(trainingMax>0){
          basis=trainingMax;tmSource='manual';
          basisNote=`your training max of ${_dbFmtW(trainingMax)} ${weightUnit()}`;
        }else{
          const auto=bestZoneE1RM();
          if(auto>0){basis=auto;tmSource='auto';basisNote=`an auto training max of ≈${Math.round(_dbFmtW(auto))} ${weightUnit()} from your best same-zone top set`;}
           









          if(forkDecline&&basis>forkDecline.capacity){
            basis=forkDecline.capacity;
            basisNote=`an auto training max of ≈${Math.round(_dbFmtW(basis))} ${weightUnit()} from your recent sessions. Rebuilding: your best earlier sessions estimated ≈${Math.round(_dbFmtW(forkDecline.peak))} ${weightUnit()}, and suggestions follow your current form while you rebuild`;
          }
        }
        if(basis<=0)return null;
         

        return {weight:snapToIncrement(basis*(pct/100),incrementType,incrementValueLb),pct,basis,basisNote,tmSource};
      };
       





       

       







      const deloadPct=forkDeloadSession?60:clampDeloadPct(Number(programConfig.deloadPct ?? progressionSetup.deloadPct ?? 60));
      const deloadWeek=(!!week&&isDeloadWeek(programConfig,week))||forkDeloadSession;
      let onermInfo=null;
       



      const rx=(scheme==='onerm'&&mode!=='time')?onermRx():null;
      if(scheme==='onerm'&&mode!=='time'&&!rx)return null;
      if(deloadWeek&&!suppressDeload&&(latest||rx)){
        if(latest&&!(latest.weight>0)&&!rx){
           






          nextWeight=0;
          if(mode==='time'){
            nextSeconds=latest.seconds;
            kind='deload';
             






            reason=forkDeloadSession
              ?`Deload week – bodyweight timed work holds steady at ${latest.seconds} seconds.`
              :`Week ${week} is a scheduled deload. Bodyweight timed work holds steady at ${latest.seconds} seconds.`;
          }else{
            nextReps=Math.max(min,Math.round(latest.reps*(deloadPct/100)));
            kind='deload';
            reason=forkDeloadSession
              ?`Deload week – ${deloadPct}% of your latest bodyweight top set (${latest.reps} ${_repWord(latest.reps)}); suggesting the reduced target.`
              :`Week ${week} is a scheduled deload: ${deloadPct}% of your latest bodyweight top set (${latest.reps} ${_repWord(latest.reps)}), suggesting the reduced target.`;
          }
        }else{
          let normal=0,normalNote='';
          if(rx){onermInfo=rx;normal=rx.weight;normalNote=`the ${rx.pct}% prescription`;}
          else if(repRangeChanged&&latest.weight>0&&!followLifter){
             

            const e1=estimate1RM({w:latest.weight,r:latest.reps,rpe:latest.rpe});
            const targetReps=fixedReps!=null?fixedReps:(profile?.openTop?min:Math.max(min,max));  
             



            const _rebaseRpe1=latest.rpe==null||latest.rpe===''?NaN:Number(latest.rpe);
            const _rebaseRir1=Number.isFinite(_rebaseRpe1)?Math.max(0,10-Math.min(10,Math.max(0,_rebaseRpe1))):0;
            normal=Math.max(0,Math.round(epleyLoadForReps(e1,targetReps,_rebaseRir1)*10)/10);normalNote='the rebased prescription';estimated1RM=e1;
          }
          else{
             














            const _normalSugg=computeFromBasis(latestLog,preferKind,true);
            normal=(_normalSugg&&Number(_normalSugg.nextWeight)>0)?Number(_normalSugg.nextWeight):latest.weight;
            normalNote='your normal prescription';
          }
           
          nextWeight=snapToIncrement(normal*(deloadPct/100),incrementType,incrementValueLb);
          if(rx)nextReps=latest?(max==null?latest.reps:clamp(latest.reps,min,max)):min;   
          kind='deload';
           





          reason=forkDeloadSession
            ?`Deload week – ${deloadPct}% of ${normalNote}; suggesting ${_dbFmtW(nextWeight)} ${weightUnit()}.`
            :`Week ${week} is a scheduled deload: ${deloadPct}% of ${normalNote}, suggesting ${_dbFmtW(nextWeight)} ${weightUnit()}.`;
        }
      }
       


      else if(rx){
         



        if(repsOnly){
          if(!latest)return null;
          nextWeight=latest.weight;nextReps=latest.reps;kind='hold';
          reason='Reps-only progression is on for this exercise, so the %1RM load prescription holds your latest top set instead of prescribing a new load.';
        }else{
          onermInfo=rx;
          nextWeight=rx.weight;
           


          nextReps=latest?(max==null?latest.reps:clamp(latest.reps,min,max)):min;  
          kind='onerm';estimated1RM=rx.basis;
          reason=`${rx.pct}% of ${rx.basisNote}; suggesting ${_dbFmtW(nextWeight)} ${weightUnit()}${profile?.amrap?' at AMRAP':` at ${nextReps} rep${nextReps===1?'':'s'}`}.`;
        }
      }
      
      else if(!latest)return null;
      else if(scheme==='linear'){
        
        
        
        
        
        
        
        
        if(repsOnly){reason='Linear progression is on, but load progression is off for this exercise.';}
         









        else if(mode!=='time'&&!(latest.weight>0))return null;
         



        else if(mode!=='time'&&!profile?.amrap&&!profOpen&&latest.reps<min){
           






           


          const bir=backIntoRange(latest.weight,latest.reps,latest.rpe,min,max,incrementType,incrementValueLb);
          nextWeight=bir.nextWeight;nextReps=bir.nextReps;kind=bir.kind;
          if(bir.kind==='reps'){
             



            reason=latest.rpe!=null
              ?`Below the ${min}–${max} range, but at RPE ${latest.rpe} the ${_dbFmtW(latest.weight)} ${weightUnit()} load is right for it. Holding the load and building from ${latest.reps} toward ${max} ${_repWord(max)}.`
              :`Below the ${min}–${max} range, but the ${_dbFmtW(latest.weight)} ${weightUnit()} load is right for it. Holding the load and building from ${latest.reps} toward ${max} ${_repWord(max)}.`;
          }else{
            const deficit=min-latest.reps;
            estimated1RM=bir.estimated1RM;
            reason=`Back into range: your ${_dbFmtW(latest.weight)} ${weightUnit()} × ${latest.reps} top set is ${deficit} rep${deficit===1?'':'s'} short of the ${min}–${max} range. Suggesting ${_dbFmtW(bir.nextWeight)} ${weightUnit()} × ${bir.nextReps} from your estimated 1RM of ${Math.round(_dbFmtW(bir.estimated1RM))} ${weightUnit()} so the next session works the middle of the range at the same effort.`;
          }
        }
         











        else if(mode!=='time'&&!profile?.amrap&&!profOpen&&basisSets.some(set=>Number(set.r)>0&&Number(set.r)<min)){  
          kind='hold';
          reason=`Linear progression holds: a set in the last session missed the ${min}-rep target, so the load repeats until every set hits it.`;
           





           



          notice={title:'Sets missed',
            body:'Sets missed last time. Repeat the load.'};
        }
        else{
          nextWeight=roundedIncrement(latest.weight,incrementType,incrementValueLb);kind='load';
          let clampedNote='';
          if(mode==='time'){
            const c=clamp(nextSeconds,timeMin,timeMax);
            if(c!==nextSeconds)clampedNote=` Seconds pulled into the ${timeMin}–${timeMax}s range.`;
            nextSeconds=c;
          }else{
            const c=(max==null||profile?.amrap||latest.amrap)?nextReps:clamp(nextReps,min,max);  
            if(c!==nextReps)clampedNote=` Reps pulled into the ${min}–${max} range.`;
            nextReps=c;
             






















            const amrapCap=profile?.amrap&&profile.max!=null&&Number.isFinite(Number(profile.max))?Number(profile.max):null;
            const hasPlainWorkSet=basisSets.some((s,i)=>i!==(basisTopIndex||0)&&!_isAmrapSet(s));
            if(amrapCap!=null&&nextReps>amrapCap&&hasPlainWorkSet){amrapHeadlineRaw=nextReps;nextReps=clamp(nextReps,min,amrapCap);}
          }
          reason=`Linear progression: add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} every session.${clampedNote}`;
        }
      }
      
      
       



      else if(repRangeChanged&&latest.weight>0&&!followLifter&&!latestInNewZone){
         


        const rangeNotice=()=>({title:'New rep range',
          body:`Your ${_dbFmtW(latest.weight)} ${weightUnit()} × ${latest.reps} top set doesn't map onto the new ${programRangeLabel(profile)} range yet. Log a session in the new range to get a suggestion.`});
         














         




        if(latest.rpe!=null&&gateRpe!=null&&gateRpe>threshold){
          kind='hold';reason='Top-set RPE is above the progression trigger.';
        }else if(repsOnly){
           


          kind='hold';reason='Reps-only progression is on for this exercise, so the range change holds the top-set load instead of re-basing it.';
          notice=rangeNotice();
        }else{
        estimated1RM=estimate1RM({w:latest.weight,r:latest.reps,rpe:latest.rpe});
         





        const _rebaseRpe=latest.rpe==null||latest.rpe===''?NaN:Number(latest.rpe);
        const _rebaseRir=Number.isFinite(_rebaseRpe)?Math.max(0,10-Math.min(10,Math.max(0,_rebaseRpe))):0;
        const targetReps=fixedReps!=null?fixedReps:(profile?.openTop?min:Math.max(min,max)),rawTarget=epleyLoadForReps(estimated1RM,targetReps,_rebaseRir);  
         







        const snappedLoad=snapToIncrement(rawTarget,incrementType,incrementValueLb);
        nextWeight=Math.max(0,snappedLoad<latest.weight?snapUpToIncrement(rawTarget,incrementType,incrementValueLb):snappedLoad);
         





         
        if(_perDbInc&&incrementType!=='percent'&&incrementValueLb>0&&!(typeof gymSnapRule!=='undefined'&&gymSnapRule)){
          nextWeight=Math.round(nextWeight/incrementValueLb)*incrementValueLb;
        }
         



        nextReps=targetReps;kind='range';
        const weekPrefix=config?.freeform?'This session is ':week?`Week ${week} is `:'This block is ';
        reason=`${weekPrefix}${programRangeLabel(profile)}; suggesting ${_dbFmtW(nextWeight)} ${weightUnit()} from your estimated 1RM of ${Math.round(_dbFmtW(estimated1RM))} ${weightUnit()} so the new rep target starts at a sensible load.`;
         







        if(nextWeight<latest.weight||(nextWeight===latest.weight&&nextReps<latest.reps)){
          nextWeight=latest.weight;nextReps=latest.reps;kind='hold';
          reason=`${weekPrefix}${programRangeLabel(profile)}, but the rebased target would regress your ${_dbFmtW(latest.weight)} ${weightUnit()} × ${latest.reps} top set. Holding steady.`;
          notice=rangeNotice();
        }
        }
       





      } else if(gateRpeEff!=null && gateRpeEff<=threshold){
         

















        const completionDrove=advanceOnCompletion&&!(gateRpe!=null&&gateRpe<=threshold)&&scheme!=='linear';
        const repJump=rpeRepJump(advanceOnCompletion||gateRpe<=0?threshold:gateRpe);repJumpUsed=repJump;
         








        const loadHeadroom=Math.max(0,threshold-(advanceOnCompletion||gateRpe==null||Number(gateRpe)<=0?threshold:Number(gateRpe)));
        const loadMult=Math.min(2,1+loadHeadroom/2);
         

        const scaledJumpLine=nextW=>loadMult>1?` Top set was ${fmtRpe(loadHeadroom)} under the RPE trigger, so the jump is ${loadMult===2?'doubled':String(Math.round(loadMult*100)/100)+'×'} to ${actualStepLabel(nextW,latest.weight,incrementType,_perDbInc)||incrementLabel}.`:'';
        if(mode==='time'){
           

          const secJump=Math.round(timeStep*repJump);
          if(latest.seconds<timeMax&&preferKind!=='load'){nextSeconds=clamp(Math.round(latest.seconds+secJump),timeMin,timeMax);kind='time';reason=`Top set was at or below RPE ${threshold}; add ${secJump} seconds inside the ${timeMin}–${timeMax}s range.${fatigueClause}`;}
          else if(repsOnly){kind='hold';reason=`Time ceiling reached. Load progression is off, so hold ${timeMax} seconds.`;}
           




          else if((Number(latest.weight)||0)>0){nextWeight=scaledLoadIncrement(latest.weight,incrementType,incrementValueLb,loadMult);nextSeconds=timeMin;kind='load';reason=latest.seconds>=timeMax?`Time ceiling reached at RPE ${latest.rpe}; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} and reset to ${timeMin} seconds.${scaledJumpLine(nextWeight)}${fatigueClause}`:`Top set was at or below RPE ${threshold}; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} and reset to ${timeMin} seconds. The weight step now instead of more time.${scaledJumpLine(nextWeight)}${fatigueClause}`;}
          else{kind='hold';reason=`Time ceiling reached at ${timeMax} seconds. Holding steady.`;}
        } else if(profile?.amrap){nextReps=Math.max(min,latest.reps);kind='hold';reason=`AMRAP target: keep the load and take the set to the effort target (top-set RPE ${threshold} or below).${fatigueClause}`;}
        else if(profOpen){nextReps=Math.max(min,latest.reps+repJump);kind='reps';reason=`Open-ended range: add ${repJump} ${_repWord(repJump)} while the top set stays at or below RPE ${threshold}.${fatigueClause}`;}  
         









        else if(latest.amrap){nextReps=Math.max(min,latest.reps+repJump);kind='reps';reason=`AMRAP top set: the ${latest.reps} ${_repWord(latest.reps)} were the set's purpose, not a range overshoot. Add ${repJump} ${_repWord(repJump)} at the same load while the top set stays at or below RPE ${threshold}.${fatigueClause}`;}
        else if(latest.reps+repJump<=max&&preferKind!=='load'){nextReps=Math.max(min,latest.reps+repJump);kind='reps';reason=`Top set was at or below RPE ${threshold}; add ${repJump} ${_repWord(repJump)} inside the ${min}–${max} range.${fatigueClause}`;}
        else if(repsOnly){kind='hold';reason=`Rep range topped out. Adding ${repJump} ${_repWord(repJump)} would exceed the ${min}–${max} range and load progression is off, so hold ${_dbFmtW(latest.weight)||0} ${weightUnit()}.`;}
        
        
         





        else if((Number(latest.weight)||0)<=0){kind='hold';reason=`Rep ceiling reached at bodyweight. There's no load to add, so holding ${latest.reps} ${_repWord(latest.reps)}.`;}
        else{nextWeight=scaledLoadIncrement(latest.weight,incrementType,incrementValueLb,loadMult);nextReps=jumpReps;kind='load';reason=preferKind==='load'?(fixedReps!=null?`Top set was at or below RPE ${threshold}; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} at ${jumpReps} ${_repWord(jumpReps)}. The weight step now instead of more reps.${scaledJumpLine(nextWeight)}${fatigueClause}`:`Top set was at or below RPE ${threshold}; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} and reset to ${min} ${_repWord(min)}. The weight step now instead of more reps.${scaledJumpLine(nextWeight)}${fatigueClause}`):(min===max||fixedReps!=null)?`Top set was at or below RPE ${threshold}; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} at ${jumpReps} ${_repWord(jumpReps)}.${scaledJumpLine(nextWeight)}${fatigueClause}`:(latest.reps<max?(fixedReps!=null?`Top set was at or below RPE ${threshold}, but ${repJump} more ${_repWord(repJump)} would exceed the ${min}–${max} range; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} at ${jumpReps} ${_repWord(jumpReps)}.${scaledJumpLine(nextWeight)}${fatigueClause}`:`Top set was at or below RPE ${threshold}, but ${repJump} more ${_repWord(repJump)} would exceed the ${min}–${max} range; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} and reset to ${min} ${_repWord(min)}.${scaledJumpLine(nextWeight)}${fatigueClause}`):(fixedReps!=null?`Rep ceiling reached at RPE ${latest.rpe}; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} at ${jumpReps} ${_repWord(jumpReps)}.${scaledJumpLine(nextWeight)}${fatigueClause}`:`Rep ceiling reached at RPE ${latest.rpe}; add ${actualStepLabel(nextWeight,latest.weight,incrementType,_perDbInc)||incrementLabel} and reset to ${min} ${_repWord(min)}.${scaledJumpLine(nextWeight)}${fatigueClause}`));}  
         

        if(completionDrove&&(kind==='reps'||kind==='load'||kind==='time'))reason+=' Advancing on completion. RPE isn\u2019t gating this suggestion.';
      } else if(latest.rpe==null){
         











        reason='No RPE on the latest top set, so the engine holds the target.';
      }
       





      if(!notice&&kind==='hold'&&latest&&latest.rpe!=null&&Number(latest.rpe)>threshold){
        notice={title:`Held at RPE ${latest.rpe}`,
          body:`The top set hit RPE ${latest.rpe}, above the RPE ${threshold} trigger. The target holds here; hit the reps with gas left to progress.`};
      }
       







       







       







       





      let setTargets=null,topIndex=0;
       

      if(latest){
        topIndex=basisSets.length?clamp(basisTopIndex||0,0,basisSets.length-1):0;  
        const topProgressed=kind==='reps'||kind==='load'||kind==='time';
        const basisTopW=Number((basisSets[topIndex]||{}).w)||0;  
        const targets=[];let anyChange=false;
        const isChange=(t,bw,bp)=>!(Math.abs((t.w||0)-(bw||0))<0.001&&(mode==='time'?t.seconds===bp:t.r===bp));
        for(let i=0;i<basisSets.length;i++){
          const base=basisSets[i]||{};
          const bw=Number(base.w)||0,br=Number(base.r)||0,bs=Number(base.seconds)||0;
          const brpe=blankRpeToNull(base.rpe);
           

          if(!(bw>0||br>0||bs>0)){targets.push(null);continue;}
          let t=null;
          if(i===topIndex){
             


            t={w:nextWeight,r:(amrapHeadlineRaw!=null&&_isAmrapSet(base))?amrapHeadlineRaw:nextReps,seconds:nextSeconds,kind};
          }else if(kind==='deload'){
             

            if(bw>0)t={w:snapToIncrement(bw*(deloadPct/100),incrementType,incrementValueLb),r:br,seconds:0,kind:'deload'};
            else if(mode==='time')t={w:0,r:0,seconds:bs,kind:'deload'};
            else t={w:0,r:Math.max(min,Math.round(br*(deloadPct/100))),seconds:0,kind:'deload'};
          }else if(topProgressed){
             



            if(scheme==='linear'&&kind==='load'&&bw>0)t={w:Math.min(roundedIncrement(bw,incrementType,incrementValueLb),nextWeight),r:mode==='time'?0:(max==null||_isAmrapSet(base)?br:clamp(br,min,max)),seconds:mode==='time'?clamp(bs,timeMin,timeMax):0,kind:'load'};      
            else if(brpe!=null&&(brpe>threshold||Number(brpe)<=0))t=null;
            else if(kind==='reps'&&mode==='reps'&&max!=null&&!profOpen&&!_isAmrapSet(base)&&bw>0&&basisTopW>0&&Math.abs(bw-basisTopW)<0.001&&br<min){
               













              const _slRir=brpe!=null?Math.max(0,10-Number(brpe)):(latest.rpe!=null?Math.max(0,10-Number(latest.rpe)):0);
              const _slTarget=Math.min(max,Math.floor(br+_slRir));
              t=_slTarget>br?{w:bw,r:_slTarget,seconds:0,kind:'reps'}:{w:bw,r:br,seconds:0,kind:'hold'};
            }
            else if(kind==='reps')t={w:bw,r:(profOpen||_isAmrapSet(base))?br+repJumpUsed:Math.min(max,br+repJumpUsed),seconds:0,kind:'reps'};    
            else if(kind==='time')t={w:bw,r:0,seconds:clamp(Math.round(bs+timeStep*repJumpUsed),timeMin,timeMax),kind:'time'};
            else if(kind==='load'&&bw>0){
               



              t={w:Math.min(roundedIncrement(bw,incrementType,incrementValueLb),nextWeight),r:jumpReps,seconds:0,kind:'load'};
            }
          }else if(kind==='backrange'&&mode==='reps'&&bw>0&&br>0&&br<min){
             




















            const b2=backIntoRange(bw,br,brpe,min,max,incrementType,incrementValueLb);
            if(b2&&b2.nextWeight>=bw-0.001)t={w:b2.nextWeight,r:b2.nextReps,seconds:0,kind:b2.kind};
          }else if(!profile?.amrap&&kind!=='range'&&kind!=='backrange'&&kind!=='onerm'&&brpe!=null&&Number(brpe)>0&&brpe<=threshold){
             




            const jr=rpeRepJump(brpe);
            if(mode==='time'){
              if(bs<timeMax)t={w:bw,r:0,seconds:Math.min(timeMax,Math.round(bs+timeStep*jr)),kind:'time'};
              else if(!repsOnly&&bw>0)t={w:Math.min(roundedIncrement(bw,incrementType,incrementValueLb),nextWeight),r:0,seconds:timeMin,kind:'load'};
            }else if(profOpen||_isAmrapSet(base)||br+jr<=max)t={w:bw,r:Math.max(min,br+jr),seconds:0,kind:'reps'};    
            else if(!repsOnly&&bw>0)t={w:Math.min(roundedIncrement(bw,incrementType,incrementValueLb),nextWeight),r:jumpReps,seconds:0,kind:'load'};  
          }
           
          if(!t)t={w:bw,r:mode==='time'?0:br,seconds:mode==='time'?bs:0,kind:'hold'};
           

          if(i!==topIndex&&t.w>nextWeight)t.w=Math.max(nextWeight,bw);
          const moved=isChange(t,bw,mode==='time'?bs:br);
          if(moved)anyChange=true;
          targets.push({index:i,w:t.w,r:t.r,seconds:t.seconds,kind:t.kind,changed:moved,oldW:bw,oldR:br,oldSeconds:bs});
        }
         




         




















        const _fr143IsFixed=(typeof isFixedSet==='function')?isFixedSet:(()=>false);
        for(let i=0;i<targets.length;i++){
          const t=targets[i]; if(!t)continue;
          if(_fr143IsFixed(basisSets[i])){
            targets[i]={...t,w:t.oldW,r:t.oldR,seconds:t.oldSeconds,kind:'hold',changed:false,fixed:true};
          }
        }
        const _anchorOld=Number(latest.weight)||0;
        const _wuList=[];
        (latestLog&&latestLog.sets?latestLog.sets:[]).forEach((s,overall)=>{
          if(!(typeof isWarmupSet==='function'&&isWarmupSet(s)))return;
          const bw=Number(s.w)||0,br=Number(s.r)||0,bs=Number(s.seconds)||0;
          const fixed=_fr143IsFixed(s);
          let t={index:overall,warmup:true,fixed,w:bw,r:br,seconds:bs,kind:'hold',changed:false,oldW:bw,oldR:br,oldSeconds:bs};
          if(!fixed&&bw>0&&_anchorOld>0&&Number(nextWeight)>0&&Math.abs(Number(nextWeight)-_anchorOld)>0.001){
            const nw=snapToIncrement(bw/_anchorOld*Number(nextWeight),incrementType,incrementValueLb);
            if(Math.abs(nw-bw)>0.001)t={...t,w:nw,kind:kind==='deload'?'deload':'load',changed:true};
          }else if(!fixed&&mode==='time'&&bs>0&&kind==='time'&&Number(nextSeconds)!==Number(latest.seconds||0)){
            const ns=clamp(Math.round(bs+(Number(nextSeconds)-Number(latest.seconds||0))),timeMin,timeMax);
            if(ns!==bs)t={...t,seconds:ns,kind:'time',changed:true};
          }
          _wuList.push(t);
        });
        forkWarmupTargets=_wuList.length?_wuList:null;
        anyChange=targets.some(t=>t&&t.changed)||_wuList.some(t=>t.changed);
         

        forkBasisSetsFull=(latestLog&&latestLog.sets?latestLog.sets:[]).map(s=>({w:Number(s.w)||0,r:Number(s.r)||0,seconds:Number(s.seconds)||0,distance:Number(s.distance)||0,warmup:!!(typeof isWarmupSet==='function'&&isWarmupSet(s)),fixed:_fr143IsFixed(s)}));
        { let wp=0, wu=0; forkFullSetTargets=forkBasisSetsFull.map((b,overall)=>{
            if(b.warmup){ const t=_wuList[wu++]; return t?{...t,index:overall}:null; }
            const t=targets[wp++]; return t?{...t,index:overall,warmup:false}:null;
          }); }
         





        if(!anyChange&&!notice)return null;
        setTargets=targets;
      }
       




       






      if(!setTargets&&latest){
        const weightSame=Math.abs((nextWeight||0)-(latest.weight||0))<0.001;  
        const noChange=mode==='time'
          ? weightSame&&nextSeconds===latest.seconds
          : profile?.amrap ? weightSame : weightSame&&nextReps===latest.reps;
         


        if(noChange&&!notice)return null;
      }
       





      const _suggIsDb=typeof exercises!=='undefined'&&pairImplementExercise(resolveExercise(exerciseId));
      const _suggDbItem=workoutState.draft&&workoutState.draft.exercises?workoutState.draft.exercises.find(row=>row.exerciseId===exerciseId):null;
       

      if(_suggIsDb&&dbEntryMode(exerciseId,_suggDbItem)==='per'&&!dbSingleDumbbell(exerciseId,_suggDbItem)){
        const _evenTotal=w=>w>0?Math.round(w/2)*2:w;
        if(kind!=='hold')nextWeight=_evenTotal(nextWeight);
        if(setTargets)setTargets.forEach(t=>{if(t&&t.changed&&t.kind!=='hold'&&t.w>0)t.w=_evenTotal(t.w);});
         

        if(forkWarmupTargets)forkWarmupTargets.forEach(t=>{if(t&&t.changed&&t.kind!=='hold'&&t.w>0)t.w=_evenTotal(t.w);});
        if(forkFullSetTargets)forkFullSetTargets.forEach(t=>{if(t&&t.changed&&t.kind!=='hold'&&t.w>0)t.w=_evenTotal(t.w);});
      }
       


      const basisSetData=basisSets.map(s=>({w:Number(s.w)||0,r:Number(s.r)||0,seconds:Number(s.seconds)||0}));
      return {exerciseId,latest,mode,nextWeight,nextReps,nextSeconds,kind,reason,notice,estimated1RM,sourceDate:latestLog?.isoDate,sourceWorkout:latestLog?.name, sourceRange:previousProfile&&Number.isFinite(Number(previousProfile.min))?{min:Number(previousProfile.min),max:previousProfile.max==null?null:Number(previousProfile.max)}:null,range:mode==='time'?[timeMin,timeMax]:[min,max],timeStep,repsOnly,freeform:!!config?.freeform,scheme,amrap:!!profile?.amrap,pct:onermInfo?.pct??null,tmSource:onermInfo?.tmSource??null,setTargets,topIndex,basisSets:basisSetData, basisSetsFull:forkBasisSetsFull,warmupTargets:forkWarmupTargets,fullSetTargets:forkFullSetTargets,fatigue:{penalty:fatigue.penalty,effectiveRpe:fatigue.effectiveRpe,workSets:fatigue.workSets},decline:forkDecline?{dropPct:Math.round(forkDecline.dropPct),peak:forkDecline.peak,recent:forkDecline.recentBest,via:forkDecline.via}:null,forkGate:forkDeloadSession?'deload':null};
      }  
    }

     
    function suggestionCardMarkup(suggestion,index,interactive=true) {
      const ex=resolveExercise(suggestion.exerciseId);
       



      const isDb=pairImplementExercise(ex);
      const draftItem=workoutState.draft?.exercises?.find(row=>row.exerciseId===suggestion.exerciseId);
      const dbW=w=>dbDisplayWeight(w,suggestion.exerciseId,draftItem,isDb);
       
       
      const isDist=!!suggestion.isDistance;
      const formatTarget=(weight,performance)=>`${weight ? `${dbW(weight)} ${weightUnit()} × ` : ''}${performance} ${isDist?'m':suggestion.mode==='time'?'sec':Number(performance)===1?'rep':'reps'}`;
       


      const oldPerf=isDist?(suggestion.latest&&suggestion.latest.distance>0?suggestion.latest.distance:null):suggestion.mode==='time'?(suggestion.latest.seconds>0?suggestion.latest.seconds:null):suggestion.latest.reps;
      const oldTarget=suggestion.latest?(oldPerf==null?(suggestion.latest.weight?`${dbW(suggestion.latest.weight)} ${weightUnit()}`:'—'):formatTarget(suggestion.latest.weight,oldPerf)):`1RM ${dbW(suggestion.estimated1RM)} ${weightUnit()}`;
      const nextTarget=suggestion.amrap&&suggestion.mode!=='time'?`${suggestion.nextWeight?`${dbW(suggestion.nextWeight)} ${weightUnit()} × `:''}AMRAP`:formatTarget(suggestion.nextWeight,suggestion.mode==='time'?suggestion.nextSeconds:isDist?suggestion.nextDistance:suggestion.nextReps);
       



       


      const rangeLabel=(suggestion.nextWeight||0)>(suggestion.latest?.weight||0)?'Add weight':'New range';
      const kindLabel=k=>k==='hold'?'Hold':k==='load'?'Add weight':k==='onerm'?'%1RM':k==='deload'?'Deload':k==='stage'?'Next stage':k==='range'?rangeLabel:k==='backrange'?'Back into range':k==='time'?'Add time':'Add reps';
      let label,changeHtml;
      if(suggestion.setTargets){
         


        const topIdx=suggestion.topIndex||0;
        const topT=suggestion.setTargets[topIdx];
        const topKind=topT?.kind||suggestion.kind;
        const othersMove=suggestion.setTargets.some((t,i)=>t&&t.changed&&i!==topIdx);
        label=suggestion.applied?'Applied ✓':(topKind==='hold'&&othersMove?'Sets +':kindLabel(topKind));
         



        const lines=[];
         





        if(Array.isArray(suggestion.fullSetTargets)&&suggestion.fullSetTargets.length){
          let wp=0;
          for(const t of suggestion.fullSetTargets){
            if(!t)continue;
            const isTopWork=!t.warmup&&(wp++===topIdx);
            const oldPerfF=suggestion.mode==='time'?(t.oldSeconds>0?t.oldSeconds:null):t.oldR;
            const oldSF=oldPerfF==null?(t.oldW?(dbW(t.oldW)+' '+weightUnit()):'—'):formatTarget(t.oldW,oldPerfF);
            if(t.fixed){lines.push({idx:t.index,html:'<div class="suggestion-set-line is-hold"><span>Set '+(t.index+1)+'</span><span>Don\'t progress</span></div>'});continue;}
            if(isTopWork&&!t.changed){lines.push({idx:t.index,html:'<div class="suggestion-set-line is-hold"><span>Set '+(t.index+1)+'</span><span>Hold</span></div>'});continue;}
            if(!t.changed)continue;
            const newPerfF=suggestion.mode==='time'?t.seconds:t.r;
            lines.push({idx:t.index,html:'<div class="suggestion-set-line"><span>Set '+(t.index+1)+'</span><span>'+oldSF+'</span><span>→</span><strong>'+formatTarget(t.w,newPerfF)+'</strong></div>'});
          }
           

          if(topKind==='hold'&&suggestion.fullSetTargets.some(t=>t&&t.changed))label=suggestion.applied?'Applied ✓':'Sets +';
        }else{
          if(topT&&!topT.changed)lines.push({idx:topIdx,html:'<div class="suggestion-set-line is-hold"><span>Set '+(topIdx+1)+'</span><span>Hold</span></div>'});
          for(const t of suggestion.setTargets){
            if(!t||!t.changed)continue;
            if(t.fixed)continue;
            const oldPerf=suggestion.mode==='time'?(t.oldSeconds>0?t.oldSeconds:null):t.oldR;
            const newPerf=suggestion.mode==='time'?t.seconds:t.r;
            const oldS=oldPerf==null?(t.oldW?(dbW(t.oldW)+' '+weightUnit()):'—'):formatTarget(t.oldW,oldPerf);
            lines.push({idx:t.index,html:'<div class="suggestion-set-line"><span>Set '+(t.index+1)+'</span><span>'+oldS+'</span><span>→</span><strong>'+formatTarget(t.w,newPerf)+'</strong></div>'});
          }
        }
        lines.sort((a,b)=>a.idx-b.idx);
        changeHtml='<div class="suggestion-sets">'+lines.map(l=>l.html).join('')+'</div>';
      }else{
        label=suggestion.applied?'Applied ✓':kindLabel(suggestion.kind);
         





        const cardBasis=(suggestion.basisSets||[]).filter(b=>b&&((b.w||0)>0||(b.r||0)>0||(b.seconds||0)>0||(b.distance||0)>0));
        if(cardBasis.length>1){
           



          changeHtml='<div class="suggestion-sets">'+cardBasis.map((b,i)=>{
            const oldPerfB=isDist?(b.distance>0?b.distance:null):suggestion.mode==='time'?(b.seconds>0?b.seconds:null):b.r;
            const oldSB=oldPerfB==null?(b.w?dbW(b.w)+' '+weightUnit():'—'):formatTarget(b.w,oldPerfB);
             

            let num=i+1;
            if(Array.isArray(suggestion.basisSetsFull)&&suggestion.basisSetsFull.length){
              let workSeen=-1;
              for(let k=0;k<suggestion.basisSetsFull.length;k++){ if(!suggestion.basisSetsFull[k].warmup){ workSeen++; if(workSeen===i){num=k+1;break;} } }
            }
            return '<div class="suggestion-set-line"><span>Set '+num+'</span><span>'+oldSB+'</span><span>→</span><strong>'+nextTarget+'</strong></div>';
          }).join('')+'</div>';
        }else{
          changeHtml='<div class="suggestion-change"><span>'+oldTarget+'</span><span>→</span><strong>'+nextTarget+'</strong></div>';
        }
      }
      
      
      return `<${interactive?'button':'div'} class="suggestion-card ${suggestion.applied?'applied':''}" ${interactive?`type="button" data-demo-suggestion="${index}"`:''}><div class="suggestion-name"><span class="suggestion-exercise">${escapeHtml(ex?.name||'Exercise')}</span><span>${label}</span></div>${changeHtml}</${interactive?'button':'div'}>`;
    }

     


     


     

    function forkSuggestionKindLabel(k){
      return k==='hold'?'Hold':k==='load'?'Add weight':k==='onerm'?'%1RM':k==='deload'?'Deload':k==='stage'?'Next stage':k==='range'?'New range':k==='backrange'?'Back into range':k==='time'?'Add time':'Add reps';
    }
     
    function forkSuggestionFormatter(item,suggestion){
      const ex=resolveExercise(suggestion.exerciseId);
      const isDb=pairImplementExercise(ex);
      const dbW=w=>dbDisplayWeight(w,suggestion.exerciseId,item,isDb);
       







      const formatTarget=(weight,performance)=>suggestion.isDistance
        ?`${weight?`${dbW(weight)} ${weightUnit()} × `:''}${performance} m`
        :`${weight?`${dbW(weight)} ${weightUnit()} × `:''}${performance} ${suggestion.mode==='time'?'sec':Number(performance)===1?'rep':'reps'}`;
      return {dbW,formatTarget};
    }
     

    function forkSuggestionTargetText(item,suggestion,s){
      const {dbW,formatTarget}=forkSuggestionFormatter(item,suggestion);
      const t=s||suggestion;
      return t.amrap&&t.mode!=='time'
        ?`${t.nextWeight?`${dbW(t.nextWeight)} ${weightUnit()} × `:''}AMRAP`
        :formatTarget(t.nextWeight,t.isDistance?t.nextDistance:t.mode==='time'?t.nextSeconds:t.nextReps);
    }
     












    function forkSuggestionBasis(item,suggestion,full){
      const {dbW}=forkSuggestionFormatter(item,suggestion);
      const basisBits=[];
      if(suggestion.latest){
        const lw=suggestion.latest.weight;
         


         



        const basisMode=suggestion.latest.mode||suggestion.mode;
        const lp=suggestion.isDistance?suggestion.latest.distance:(basisMode==='time'?suggestion.latest.seconds:suggestion.latest.reps);
        const lpUnit=suggestion.isDistance?' m':(basisMode==='time'?' sec':(Number(lp)===1?' rep':' reps'));  
        basisBits.push(`${lw?`${dbW(lw)} ${weightUnit()} × `:''}${lp==null||lp===''?'—':lp}${lpUnit}${suggestion.latest.rpe!=null?` @ RPE ${suggestion.latest.rpe}`:''}`);
      }
      let dateBit='';
      if(suggestion.sourceDate){dateBit=formatLogDate(suggestion.sourceDate);basisBits.push(dateBit);}
       





      if(suggestion.forkSlotStream)basisBits.push(suggestion.forkSlotStream);
       






       


       









       




       





      if(suggestion.decline){basisBits.push('rebuilding');if(!full)basisBits.push('suggestions follow your recent sessions');}
       







      if(!full&&suggestion.forkGate==='deload')basisBits.push('Deload week');
       










       








      const storedProg=suggestion.sourceRange;
      const storedRangeDiffers=suggestion.mode!=='time'&&Array.isArray(suggestion.range)&&suggestion.range[0]!=null
        &&!!storedProg&&Number.isFinite(Number(storedProg.min))
        &&(Number(storedProg.min)!==Number(suggestion.range[0])
          ||((storedProg.max==null)!==(suggestion.range[1]==null))
          ||(storedProg.max!=null&&suggestion.range[1]!=null&&Number(storedProg.max)!==Number(suggestion.range[1])));
      const rangeLead=(suggestion.kind==='range'||suggestion.kind==='backrange'||storedRangeDiffers)
        &&Array.isArray(suggestion.range)&&suggestion.range[0]!=null
        ?`${suggestion.kind==='backrange'?'Back into range':'New range'} ${suggestion.range[1]==null?`${suggestion.range[0]}+`:`${suggestion.range[0]}–${suggestion.range[1]}`}`
        :'';
       




      if(!basisBits.length)return rangeLead;
       










      const segments=rangeLead?[rangeLead,...basisBits]:basisBits;
      const kept=segments.slice(0,3);
       


      const bodySegs=rangeLead?kept.slice(1):kept;
      let body='';
      bodySegs.forEach((seg,i)=>{
        const rendered=dateBit&&seg===dateBit?`(${seg})`:seg;
        body+=i===0?rendered:(rendered.startsWith('(')?` ${rendered}`:` – ${rendered}`);
      });
      return rangeLead?`${rangeLead} – from ${body}`:`from ${body}`;
    }
     




    function forkSuggestionOptions(suggestion){
      return (Array.isArray(suggestion.alternates)&&suggestion.alternates.length)?[suggestion,...suggestion.alternates]:[suggestion];
    }
     



    function forkSuggestionActionable(s){
      if(!s||s.notice||s.applied)return false;
      if(s.kind!=='hold')return true;
      return Array.isArray(s.setTargets)&&s.setTargets.some(t=>t&&t.changed);
    }
     





























    function forkSuggestionSetLines(item,suggestion,s){
      const {formatTarget}=forkSuggestionFormatter(item,suggestion);
       






      const _setsHead=`<div class="suggestion-sets-head">${suggestion.applied?'Applied from last session':'Last session'}</div>`;
      if(!Array.isArray(s.setTargets)||!s.setTargets.length)return '';
      let targets=s.setTargets;
      const itemSets=(item&&Array.isArray(item.sets)?item.sets:[])
        .filter(st=>st&&!(typeof isWarmupSet==='function'&&isWarmupSet(st)));
       


      const actionable=forkSuggestionActionable(s);
      const headline=forkSuggestionTargetText(item,suggestion,s);
      const _isWU=st=>typeof isWarmupSet==='function'&&isWarmupSet(st);
      const _isFX=st=>typeof isFixedSet==='function'&&isFixedSet(st);
      const _valOf=(w,p)=>(Number(w)>0||Number(p)>0)?formatTarget(w,p):'—';
      const _perfOf=t=>s.mode==='time'?t.oldSeconds:t.oldR;
       








      const _loggedOf=row=>{
        if(!row||!row.complete)return null;
        const w=Number(row.w)||0;
        const p=s.isDistance?(Number(row.distance)||0):s.mode==='time'?(Number(row.seconds)||0):(Number(row.r)||0);
        return (w>0||p>0)?{w,p}:null;
      };
      const allRows=(item&&Array.isArray(item.sets)?item.sets:[]).filter(Boolean);
       


      if(allRows.length){
        const lines=[];
        let wp=0, wo=0;
        allRows.forEach((row,overall)=>{
          const label=`Set ${overall+1}`;
          if(_isWU(row)){
            const t=(Array.isArray(s.warmupTargets)?s.warmupTargets:[])[wo++]||null;
            const logged=_loggedOf(row);
            if(_isFX(row)||(t&&t.fixed)){
              const v=logged?_valOf(logged.w,logged.p):t?_valOf(t.oldW,_perfOf(t)):_valOf(Number(row.w)||0,s.mode==='time'?(Number(row.seconds)||0):(Number(row.r)||0));
              lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${v}</span><span>Don't progress</span></div>`);
              return;
            }
            if(logged){
              lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${_valOf(logged.w,logged.p)}</span><span>No change</span></div>`);
              return;
            }
            if(t&&t.changed){
              lines.push(`<div class="suggestion-set-line"><span>${label}</span><span>${formatTarget(t.oldW,_perfOf(t))}</span><span>→</span><strong>${formatTarget(t.w,s.mode==='time'?t.seconds:t.r)}</strong></div>`);
              return;
            }
            if(t){
              lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${_valOf(t.oldW,_perfOf(t))}</span><span>No change</span></div>`);
              return;
            }
            const cw=Number(row.w)||(row.warmupHint?Number(row.warmupHint.w)||0:0);
            const cp=s.mode==='time'?(Number(row.seconds)||0):(Number(row.r)||(row.warmupHint?Number(row.warmupHint.perf)||0:0));
            lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${_valOf(cw,cp)}</span><span>No change</span></div>`);
            return;
          }
          const t=targets[wp++]||null;
          const logged=_loggedOf(row);
          if(_isFX(row)||(t&&t.fixed)){
            const v=logged?_valOf(logged.w,logged.p):t?_valOf(t.oldW,_perfOf(t)):_valOf(Number(row.w)||0,s.mode==='time'?(Number(row.seconds)||0):(Number(row.r)||0));
            lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${v}</span><span>Don't progress</span></div>`);
            return;
          }
          if(logged){
            lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${_valOf(logged.w,logged.p)}</span><span>No change</span></div>`);
            return;
          }
          if(t&&t.changed){
            const oldP=_perfOf(t), newP=s.mode==='time'?t.seconds:t.r;
            lines.push(`<div class="suggestion-set-line"><span>${label}</span><span>${formatTarget(t.oldW,oldP)}</span><span>→</span><strong>${formatTarget(t.w,newP)}</strong></div>`);
            return;
          }
          if(t){
            lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${_valOf(t.oldW,_perfOf(t))}</span><span>No change</span></div>`);
            return;
          }
          const cw=Number(row.w)||0, cp=s.mode==='time'?(Number(row.seconds)||0):(Number(row.r)||0);
          const cur=_valOf(cw,cp);
          const nw=Number(s.nextWeight)||0, np=s.mode==='time'?(Number(s.nextSeconds)||0):(Number(s.nextReps)||0);
          if(!actionable||(!s.amrap&&cw===nw&&cp===np)){
            lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${cur}</span><span>No change</span></div>`);
          }else{
            lines.push(`<div class="suggestion-set-line"><span>${label}</span><span>${cur}</span><span>→</span><strong>${escapeHtml(headline)}</strong></div>`);
          }
        });
        return lines.length?`<div class="suggestion-sets">${_setsHead}${lines.join('')}</div>`:'';
      }
       

      if(Array.isArray(s.fullSetTargets)&&s.fullSetTargets.length){
        const lines=[];
        for(const t of s.fullSetTargets){
          const label=`Set ${(t?t.index:lines.length)+1}`;
          if(!t){lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>—</span><span>No change</span></div>`);continue;}
          if(t.fixed){lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${_valOf(t.oldW,_perfOf(t))}</span><span>Don't progress</span></div>`);continue;}
          if(t.changed){lines.push(`<div class="suggestion-set-line"><span>${label}</span><span>${formatTarget(t.oldW,_perfOf(t))}</span><span>→</span><strong>${formatTarget(t.w,s.mode==='time'?t.seconds:t.r)}</strong></div>`);continue;}
          lines.push(`<div class="suggestion-set-line is-unchanged"><span>${label}</span><span>${_valOf(t.oldW,_perfOf(t))}</span><span>No change</span></div>`);
        }
        return lines.length?`<div class="suggestion-sets">${_setsHead}${lines.join('')}</div>`:'';
      }
      const count=itemSets.length?itemSets.length:targets.length;
      const lines=[];
      for(let i=0;i<count;i++){
        const t=targets[i]||null;
        if(t&&t.fixed){
          lines.push(`<div class="suggestion-set-line is-unchanged"><span>Set ${i+1}</span><span>${_valOf(t.oldW,_perfOf(t))}</span><span>Don't progress</span></div>`);
          continue;
        }
        if(t&&t.changed){
          const oldP=s.mode==='time'?t.oldSeconds:t.oldR, newP=s.mode==='time'?t.seconds:t.r;
          lines.push(`<div class="suggestion-set-line"><span>Set ${i+1}</span><span>${formatTarget(t.oldW,oldP)}</span><span>→</span><strong>${formatTarget(t.w,newP)}</strong></div>`);
          continue;
        }
        if(t){
          const p=s.mode==='time'?t.oldSeconds:t.oldR;
          const val=(Number(t.oldW)>0||Number(p)>0)?formatTarget(t.oldW,p):'—';
          lines.push(`<div class="suggestion-set-line is-unchanged"><span>Set ${i+1}</span><span>${val}</span><span>No change</span></div>`);
          continue;
        }
        const st=itemSets[i]||{};
        const cw=Number(st.w)||0, cp=s.mode==='time'?(Number(st.seconds)||0):(Number(st.r)||0);
        const cur=(cw>0||cp>0)?formatTarget(cw,cp):'—';
        const nw=Number(s.nextWeight)||0, np=s.mode==='time'?(Number(s.nextSeconds)||0):(Number(s.nextReps)||0);
        if(!actionable||(!s.amrap&&cw===nw&&cp===np)){
          lines.push(`<div class="suggestion-set-line is-unchanged"><span>Set ${i+1}</span><span>${cur}</span><span>No change</span></div>`);
        }else{
          lines.push(`<div class="suggestion-set-line"><span>Set ${i+1}</span><span>${cur}</span><span>→</span><strong>${escapeHtml(headline)}</strong></div>`);
        }
      }
      return lines.length?`<div class="suggestion-sets">${_setsHead}${lines.join('')}</div>`:'';
    }
     


     
    function forkSuggestionSchemeText(item,suggestion){
      const profile=(typeof progressionProfileForDraftItem==='function')?progressionProfileForDraftItem(item):null;
      const bits=[suggestion.scheme==='linear'?'Linear':suggestion.scheme==='onerm'?'%1RM':'RPE'];
       



      if(Array.isArray(suggestion.range)&&suggestion.range[0]!=null){
        const rangeText=suggestion.range[1]==null?`${suggestion.range[0]}+`:`${suggestion.range[0]}–${suggestion.range[1]}`;
        bits.push(suggestion.mode==='time'?`range ${rangeText} sec`:`range ${rangeText}`);
      }
      if(suggestion.scheme==='onerm'&&suggestion.pct!=null)bits.push(`${suggestion.pct}% of a training max`);
      else if(suggestion.repsOnly||profile?.repsOnly)bits.push('reps only');
      else if(suggestion.mode==='time'){ if(suggestion.timeStep)bits.push(`+${suggestion.timeStep} sec`); }
      else{
         






        const cfg=(typeof forkEffectiveProgressionConfig==='function')?forkEffectiveProgressionConfig(null,item?.exerciseId):((typeof workoutState!=='undefined'&&workoutState.activeProgram?.progression)||progressionSetup);
        if(cfg&&Number(cfg.incrementValue)>0)bits.push(cfg.incrementType==='percent'?`+${cfg.incrementValue}%`:`+${cfg.incrementValue} ${weightUnit()}`);
      }
      return bits.length>1?`${bits[0]} (${bits.slice(1).join(', ')})`:bits[0];
    }
     




     
























     









    function forkProgressionHistoryHtml(item,suggestion){
      if(!item||typeof getExerciseLogs!=='function'||typeof topSetForSession!=='function')return '';
      const logs=getExerciseLogs(item.exerciseId)||[];
      if(!logs.length)return '';
      const {dbW}=forkSuggestionFormatter(item,suggestion);
      const unit=weightUnit();
       
      const entries=[]; const seen=new Map();
      for(const log of logs){
        const top=topSetForSession(log);
        if(!top)continue;
        let main;
        if(top.mode==='time')main=`${top.seconds} sec`;
        else if(suggestion.isDistance){
          const dist=Math.max(0,...(log.sets||[]).map(s=>Number(s.distance)||0));
          main=Number(top.weight)>0?`${dbW(top.weight)} ${unit} × ${dist} m`:`${dist} m`;
        }
        else if(Number(top.weight)>0)main=`${dbW(top.weight)} ${unit} × ${top.reps}`;
        else main=`${top.reps} ${_repWord(top.reps)}`;
        const key=[log.date||log.isoDate||'',main,top.rpe==null?'':String(top.rpe)].join('|');
        const isBasis=!!(suggestion.sourceDate&&log.isoDate&&log.isoDate===suggestion.sourceDate);
        if(seen.has(key)){ if(isBasis)entries[seen.get(key)].isBasis=true; continue; }
        if(entries.length>=5)continue;
        seen.set(key,entries.length);
        entries.push({date:log.date||'',main,rpe:top.rpe,isBasis});
      }
      if(!entries.length)return '';
      const rows=entries.map(e=>{
         

        const rpeHtml=e.rpe!=null?` &nbsp;<span class="sub">RPE ${escapeHtml(String(e.rpe))}</span>`:'';
        return `<div class="fork-prog-history-row"><span><span class="sub">${escapeHtml(e.date)}</span> &nbsp;${escapeHtml(e.main)}${rpeHtml}</span>${e.isBasis?'<span class="fork-prog-history-basis">basis</span>':''}</div>`;
      });
      return `<div class="fork-prog-history"><p class="fork-prog-history-title">History</p>${rows.join('')}</div>`;
    }
    function forkProgressionDetailHtml(item,suggestion,opts={}){
      const options=forkSuggestionOptions(suggestion);
      const sectionFor=(s,idx)=>{
        const kindLabel=forkSuggestionKindLabel(s.kind);
        const kindText=kindLabel;
        const target=forkSuggestionTargetText(item,suggestion,s);
        const notice=s.notice&&!s.stallCount?`<div class="fork-prog-notice"><span class="fork-prog-notice-title">${escapeHtml(s.notice.title)}</span><p>${escapeHtml(s.notice.body)}</p></div>`:'';  
        const reasonText=s.reason||'';
         


        const gateHtml=s.forkGate==='deload'&&reasonText
          ?`<p class="fork-prog-gate">${escapeHtml(reasonText)}</p>`
          :'';
        const reason=reasonText&&s.forkGate!=='deload'?`<p class="fork-prog-reason">${escapeHtml(reasonText)}</p>`:'';
         
        const lines=forkSuggestionSetLines(item,suggestion,s);
        const applyBtn=opts.applyButtons&&idx>0&&forkSuggestionActionable(s)?`<button class="small-button fork-prog-apply-option" type="button" data-fork-prog-apply="${idx}">Apply this option</button>`:'';
        return `<div class="fork-prog-option"><div class="fork-prog-verdict"><span class="suggestion-chip${s.kind==='hold'?' is-hold':''}">${escapeHtml(kindText)}</span><strong class="fork-prog-target">${escapeHtml(target)}</strong></div>${gateHtml}${reason}${notice}${lines}${applyBtn}</div>`;
      };
      return options.map(sectionFor).join('')+forkProgressionHistoryHtml(item,suggestion);
    }

     








    function forkPrescriptionDetailHtml(item,rx){
      const sets=(rx&&Array.isArray(rx.sets)?rx.sets:[]).filter(Boolean);
      if(!item||!sets.length)return '';
      const ex=resolveExercise(item.exerciseId);
      const mode=(typeof exerciseTracking==='function'?exerciseTracking(item,ex):item.tracking)||'reps';
      const pseudo={exerciseId:item.exerciseId,mode};
      const {dbW,formatTarget}=forkSuggestionFormatter(item,pseudo);
      const isDistance=mode==='distance'||sets.some(s=>Number(s.distance)>0&&!(Number(s.r)>0));
      const targetOf=s=>isDistance
        ?`${Number(s.w)?`${dbW(Number(s.w))} ${weightUnit()} × `:''}${typeof formatDistance==='function'?formatDistance(s.distance):String(s.distance??'')}`
        :formatTarget(Number(s.w)||0,Number(mode==='time'?s.seconds:s.r)||0);
      const top=!isDistance&&typeof topSetForSession==='function'?topSetForSession({tracking:mode,sets}):null;
      let target=top?formatTarget(top.weight,mode==='time'?top.seconds:top.reps):targetOf(sets.reduce((b,s)=>(!b||Number(s.w)>Number(b.w))?s:b,null));
       




      const workSets=sets.filter(s=>!(typeof isWarmupSet==='function'&&isWarmupSet(s)));
      const keyOf=s=>`${Number(s.w)||0}|${Number(mode==='time'?s.seconds:s.r)||0}|${Number(s.distance)||0}`;
      const uniform=workSets.length>0&&workSets.every(s=>keyOf(s)===keyOf(workSets[0]));
      if(uniform&&workSets.length>1)target+=` (${workSets.length} ${_setWord(workSets.length)})`;
       


      const lines=!uniform&&sets.length>1?`<div class="suggestion-sets">${sets.map((s,i)=>`<div class="suggestion-set-line"><span>Set ${i+1}</span><span>${escapeHtml(targetOf(s))}</span>${(typeof isFixedSet==='function'&&isFixedSet(s))?'<span>Don\'t progress</span>':''}</div>`).join('')}</div>`:'';
      const profile=(typeof progressionProfileForDraftItem==='function')?progressionProfileForDraftItem(item):null;
      const scheme=forkSuggestionSchemeText(item,{exerciseId:item.exerciseId,mode,scheme:profile?.scheme,range:[profile?.min,profile?.max],repsOnly:profile?.repsOnly,timeStep:profile?.timeStep});
      return `<div class="fork-prog-option"><div class="fork-prog-verdict"><span class="suggestion-chip">Starting point</span><strong class="fork-prog-target">${escapeHtml(target)}</strong></div><p class="fork-prog-basis">from Program prescription</p>${scheme?`<div class="fork-prog-scheme">${escapeHtml(scheme)}</div>`:''}<p class="fork-prog-reason">No sessions logged for this slot yet, so the program's prescription is the starting point.</p>${lines}</div>`;
    }

     





















    function cardSuggestionHtml(item,suggestion){
      const ex=resolveExercise(suggestion.exerciseId);
       



      const kindLabelOf=forkSuggestionKindLabel;
      const kindLabel=kindLabelOf(suggestion.kind);
       



      if(suggestion.notice&&!suggestion.stallCount){  
        return `<div class="suggestion-card is-notice"><span class="suggestion-card-notice-title">${escapeHtml(suggestion.notice.title)}</span><span class="suggestion-card-basis">${escapeHtml(suggestion.notice.body)}</span></div>`;
      }
      const nextTarget=forkSuggestionTargetText(item,suggestion,suggestion);
       


      const options=forkSuggestionOptions(suggestion);
      const multiOptions=options.length>1?options:null;
       




      const basis=forkSuggestionBasis(item,suggestion,false);
       






      if(suggestion.applied){
        return `<div class="suggestion-card applied" data-card-suggestion-applied tabindex="-1"><div class="suggestion-card-head"><span class="suggestion-chip">Applied ✓</span>${nextTarget?`<strong class="suggestion-card-target">${escapeHtml(nextTarget)}</strong>`:''}</div>${basis?`<span class="suggestion-card-basis">${escapeHtml(basis)}</span>`:''}</div>`;
      }
       








      if(suggestion.kind==='hold'&&!multiOptions&&!forkSuggestionActionable(suggestion))return '';
       



       



      const kindText=kindLabel;
      const targetText=nextTarget;
       





      const cardFor=(s,optIdx,single)=>{
        const kind=single?kindText:kindLabelOf(s.kind);
        const target=single?targetText:forkSuggestionTargetText(item,suggestion,s);
        const aria=single
          ?`Apply suggestion ${escapeHtml(nextTarget)} to ${escapeHtml(ex?.name||'exercise')}`
          :`Apply suggestion ${escapeHtml(forkSuggestionTargetText(item,suggestion,s))} (${escapeHtml(kindLabelOf(s.kind))}) to ${escapeHtml(ex?.name||'exercise')}`;
        return `<button class="suggestion-card" type="button" data-card-suggestion="${escapeHtml(item.uid)}"${optIdx?` data-suggestion-option="${optIdx}"`:''} aria-label="${aria}"><span class="suggestion-card-head"><span class="suggestion-chip${s.kind==='hold'?' is-hold':''}">${escapeHtml(kind)}</span><strong class="suggestion-card-target">${escapeHtml(target)}</strong></span>${basis?`<span class="suggestion-card-basis">${escapeHtml(basis)}</span>`:''}</button>`;
      };
      if(multiOptions){
        return `<div class="suggestion-block">${multiOptions.map((s,idx)=>cardFor(s,idx,false)).join('')}</div>`;
      }
      return `<div class="suggestion-block">${cardFor(suggestion,0,true)}</div>`;
    }

     









    function forkPreviewTrajectory(input){
      const {scheme,weight,reps,min,max,incrementType,incrementValue}=input||{};
      const w=Number(weight), r=(reps==null||reps==='')?NaN:Number(reps);
      const step=()=>incrementType==='pct'?Math.round(w*(Number(incrementValue)||0)/100*2)/2:(Number(incrementValue)||0);
      if(scheme==='linear'){
        if(!(w>0))return null;
        const inc=incrementType==='pct'?null:step();
        let cur=w; const out=[];
        for(let i=0;i<3;i++){ cur=incrementType==='pct'?Math.round(cur*(1+(Number(incrementValue)||0)/100)*2)/2:cur+inc; out.push({weight:cur,reps:Number.isFinite(r)?r:null}); }
        return out;
      }
      if(scheme==='rpe'||!scheme){
         



        const lo=Number(min), hi=max===null?Infinity:Number(max);
        if(!Number.isFinite(r)||!Number.isFinite(lo)||hi<lo)return null;
        let cw=w>0?w:0, cr=r; const out=[];
        for(let i=0;i<3;i++){
          if(cr<hi){cr+=1;}
          else{ const inc=incrementType==='pct'?(cw>0?Math.round(cw*(Number(incrementValue)||0)/100*2)/2:0):(Number(incrementValue)||0); cw=cw>0?cw+inc:0; cr=lo; }
          out.push({weight:cw||null,reps:cr});
        }
        return out;
      }
      return null;
    }
     

    function progressionProfileForDraftItem(item) {
      const ex=resolveExercise(item.exerciseId),mode=exerciseTracking(item,ex);
       




      const config=forkEffectiveProgressionConfig(null,item?.exerciseId),range=config.defaultRange||progressionSetup.defaultRange;
       



















      let focusRange=null;
      const draft=(typeof workoutState!=='undefined'&&workoutState)?workoutState.draft:null;
      if(mode==='reps'&&draft&&!draft.editingId&&Array.isArray(draft.exercises)
        &&draft.exercises.some(row=>row&&(row===item||(item&&item.uid&&row.uid===item.uid)||row.exerciseId===item?.exerciseId))){
        if(draft.focusPreset&&typeof REP_PRESETS!=='undefined'&&REP_PRESETS[draft.focusPreset])focusRange=REP_PRESETS[draft.focusPreset];
         



        else if(draft.focusCustomRange&&Number.isFinite(+draft.focusCustomRange.min)&&(draft.focusCustomRange.max==null||Number.isFinite(+draft.focusCustomRange.max)))focusRange={label:'Custom',min:+draft.focusCustomRange.min,max:draft.focusCustomRange.max==null?null:+draft.focusCustomRange.max};
      }
      const effRange=focusRange||range;
      if(!item.progression){
         
        return defaultExerciseProgression({mode,min:effRange.min,max:effRange.max,openTop:effRange.openTop,amrap:effRange.amrap,timeStep:config.timeStep||5,incrementType:config.incrementType||'lb',incrementValue:config.incrementValue||5});
      }
      if(focusRange){
        const p=item.progression;
        const hasSignal=p.min!=null||p.max!=null||!!p.amrap||!!p.openTop;
        if(!hasSignal&&!p.custom)return {...p,min:focusRange.min??null,max:focusRange.max??null,openTop:!!focusRange.openTop,amrap:!!focusRange.amrap};
      }
      return item.progression;
    }

     




























    function forkItemFixedReps(item,draft){
      if(!item)return null;
      const ex=(typeof resolveExercise==='function')?resolveExercise(item.exerciseId):null;
      const mode=(typeof exerciseTracking==='function')?exerciseTracking(item,ex):item.tracking;
      if(mode!=='reps')return null;
      const readSets=sets=>{
        let fixed=null,seen=false;
        for(const s of (sets||[])){
          if(!s)continue;
          if(typeof isWarmupSet==='function'&&isWarmupSet(s))continue;
          const r=Number(s.r);
          if(!Number.isFinite(r)||r<1)continue;
          seen=true;
          if(fixed==null)fixed=r;
          else if(r!==fixed)return null;
        }
        return seen?fixed:null;
      };
      if(draft&&draft.programId&&draft.programWorkoutUid&&typeof workoutState!=='undefined'&&workoutState){
        const programs=[workoutState.activeProgram,...(Array.isArray(workoutState.savedPrograms)?workoutState.savedPrograms:[]),...(Array.isArray(workoutState.archivedPrograms)?workoutState.archivedPrograms:[])].filter(Boolean);
        const program=programs.find(p=>p&&p.id===draft.programId);
        const workout=program?(program.workouts||[]).find(w=>w&&w.uid===draft.programWorkoutUid):null;
        const entries=workout&&workout.template&&Array.isArray(workout.template.exercises)?workout.template.exercises:null;
        if(entries){
          const week=(typeof forkEffectiveProgramWeek==='function'&&draft.date)?forkEffectiveProgramWeek(program,draft.date):(typeof programWeek==='function'?programWeek(program):null);
          const entry=entries
            .map(x=>(typeof programExerciseForWeek==='function'&&week!=null)?programExerciseForWeek(x,program,week):x)
            .find(e=>e&&e.exerciseId===item.exerciseId);
          if(entry){
            const ep=entry.progression;
            if(ep&&ep.custom&&ep.min!=null)return null;
            return readSets(entry.sets);
          }
        }
      }
      const p=item.progression;
      if(p&&(p.min!=null||p.max!=null||!!p.amrap||!!p.openTop))return null;
      const rows=(typeof forkPrescribedSets==='function')?forkPrescribedSets(item):null;
      if(!rows||!rows.length)return null;
      return readSets(rows);
    }

     







    function forkEngineProfileForItem(item,draft){
      const prof=progressionProfileForDraftItem(item);
      if(!prof)return prof;
      const fx=forkItemFixedReps(item,draft);
      return fx!=null?{...prof,fixedReps:fx}:prof;
    }

     
    function freeformProgressionConfig() {
      
      
      
      return {...progressionSetup,freeform:true};
    }

     










     



    function forkSlotLogs(exerciseId,programId,workoutUid){
      if(!programId||!workoutUid||typeof getExerciseLogs!=='function')return [];
      return getExerciseLogs(exerciseId).filter(log=>log&&log.programId===programId&&log.programWorkoutUid===workoutUid);
    }
     



    function forkSlotLabel(programId,workoutUid){
      const programs=[workoutState.activeProgram,...(Array.isArray(workoutState.savedPrograms)?workoutState.savedPrograms:[]),...(Array.isArray(workoutState.archivedPrograms)?workoutState.archivedPrograms:[])].filter(Boolean);
      const program=programs.find(p=>p.id===programId);
      if(!program)return '';
      const workout=(program.workouts||[]).find(w=>w.uid===workoutUid);
      const pn=String(program.name||'').trim(),wn=String(workout?.name||'').trim();
      return pn&&wn?`${pn} – ${wn}`:'';
    }
     


    function forkDraftSlot(draft){
      if(!draft||draft.editingId||!draft.programId||!draft.programWorkoutUid)return null;
      return {programId:draft.programId,workoutUid:draft.programWorkoutUid,label:forkSlotLabel(draft.programId,draft.programWorkoutUid)};
    }
     




    function forkSlotEngineInput(draft,item){
      const slot=forkDraftSlot(draft);
      if(!slot)return {opts:undefined,stamp:()=>{}};
      const logs=forkSlotLogs(item.exerciseId,slot.programId,slot.workoutUid);
      return {opts:{logs},stamp:s=>{if(s&&s.latest&&slot.label)s.forkSlotStream=slot.label;}};
    }
     




























    function forkPrescribedSets(item,opts){
      const rows=(item&&Array.isArray(item.sets)?item.sets:[]).filter(Boolean);
      const valued=s=>(Number(s.w)>0||Number(s.r)>0||Number(s.seconds)>0||Number(s.distance)>0);
      if(!(opts&&opts.fillBlankWork)){const kept=rows.filter(valued);return kept.length?kept:null;}
      const prof=(item&&item.progression)||null;
      const ex=(typeof resolveExercise==='function'&&item)?resolveExercise(item.exerciseId):null;
      const mode=(typeof exerciseTracking==='function'&&item)?exerciseTracking(item,ex):(item&&item.tracking);
      const floor=prof?(mode==='time'?Number(prof.timeMin):mode==='reps'?Number(prof.min):null):null;
      const canFill=Number.isFinite(floor)&&floor>0;
      const out=[];
      for(const s of rows){
        if(valued(s)){out.push(s);continue;}
        if(typeof isWarmupSet==='function'&&isWarmupSet(s))continue;
        if(!canFill)continue;
        out.push(mode==='time'?{...s,seconds:String(floor)}:{...s,r:String(floor)});
      }
      return out.length?out:null;
    }

     

    function prepareDraftProgression(draft,programConfig) {
      if(!draft)return;
       


      if(draft.editingId){draft.progressionSuggestions=[];draft.exercises.forEach(item=>{delete item.suggestedTarget;delete item.suggestedTargets;});draft.suggestionVersion=suggestionEngineVersion();return;}
       

      const effectiveConfig=programConfig||workoutState.activeProgram?.progression||progressionSetup;
      if(progressionSetup.progressionOff||effectiveConfig?.progressionOff){draft.progressionSuggestions=[];draft.suggestionVersion=suggestionEngineVersion();return;}
      draft.progressionSuggestions=draft.exercises.map(item=>{
         


        if(typeof exerciseDontProgress==='function'&&exerciseDontProgress(item))return null;
        
        
        
        const p=item.progression,hasStoredZone=!!(p&&(p.min!=null||p.max!=null||p.amrap||p.openTop));
         


        const slotIn=forkSlotEngineInput(draft,item);
        const suggestion=progressionForExercise(item.exerciseId,forkEngineProfileForItem(item,draft),programConfig,hasStoredZone,slotIn.opts);
        slotIn.stamp(suggestion);
        return suggestion;
      }).filter(Boolean);
      draft.suggestionVersion=suggestionEngineVersion();
    }
     






    function suggestionEngineVersion(){
      try{
        const w=(typeof window!=='undefined'&&window)?window:globalThis;
        return String((w.BUILD_INFO&&w.BUILD_INFO.appVersion)||'');
      }catch(e){return '';}
    }
     









    function maybeRefreshDraftSuggestions(){
      const draft=workoutState.draft;
      if(!draft||draft.editingId)return false;
      if(typeof state==='undefined'||!state.workoutEditorOpen)return false;
       











      const ver=suggestionEngineVersion();
      const stale=!!ver&&draft.suggestionVersion!==ver;
      const empty=!(draft.progressionSuggestions||[]).length;
      if(!stale&&!empty)return false;
      if(draft.suggestionsRefreshedFor===ver&&ver)return false;
      if((draft.exercises||[]).some(item=>{const t=item.suggestedTarget||{};return !!(t.w||t.r||t.seconds||t.distance);}))return false;
       


      const hasHistory=(draft.exercises||[]).some(item=>getExerciseLogs(item.exerciseId).length>0);
      if(!hasHistory)return false;
      draft.suggestionsRefreshedFor=ver;
      const config=(draft.programId&&workoutState.activeProgram&&workoutState.activeProgram.id===draft.programId)
        ?{...workoutState.activeProgram.progression,currentWeek:programWeek(workoutState.activeProgram)}
        :freeformProgressionConfig();
      prepareDraftProgression(draft,config);
       

      renderWorkoutProgression();
      renderWorkoutExercises();
      markDraftSaved();
      return true;
    }

     





    function refreshSuggestionForExercise(draft,item){
      if(!draft||!item)return null;
      const list=draft.progressionSuggestions||[];
      const idx=list.findIndex(s=>s&&s.exerciseId===item.exerciseId);
       

      if(typeof exerciseDontProgress==='function'&&exerciseDontProgress(item)){
        if(idx>=0){list.splice(idx,1);renderWorkoutProgression();}
        return null;
      }
      if(idx<0)return null; 
      const config=(draft.programId&&workoutState.activeProgram&&workoutState.activeProgram.id===draft.programId)
        ?{...workoutState.activeProgram.progression,currentWeek:programWeek(workoutState.activeProgram)}
        :freeformProgressionConfig();
      const p=item.progression,hasStoredZone=!!(p&&(p.min!=null||p.max!=null||p.amrap||p.openTop));
       


      const slotIn=forkSlotEngineInput(draft,item);
      const fresh=progressionForExercise(item.exerciseId,forkEngineProfileForItem(item,draft),config,hasStoredZone,slotIn.opts);
      slotIn.stamp(fresh);
      if(fresh)list[idx]=fresh; else list.splice(idx,1);
      renderWorkoutProgression();
      return fresh||null;
    }

     

    function applyProgressionSuggestion(draft,suggestion,rerender=true) {
      const item=draft?.exercises.find(row=>row.exerciseId===suggestion.exerciseId); if(!item)return;
       






      if(suggestion.mode&&item.tracking&&suggestion.mode!==item.tracking){
        const fresh=refreshSuggestionForExercise(draft,item);
        if(fresh&&fresh!==suggestion&&fresh.mode===item.tracking)return applyProgressionSuggestion(draft,fresh,rerender);
        return;
      }
      item.tracking=suggestion.mode;
       


      
      
      
      item.suggestedTarget={w:suggestion.nextWeight?String(suggestion.nextWeight):'',r:suggestion.mode==='time'?'':suggestion.isDistance?'':(suggestion.amrap?'':String(suggestion.nextReps)),seconds:suggestion.mode==='time'?String(suggestion.nextSeconds):'',distance:suggestion.isDistance?String(suggestion.nextDistance):''};
       












      if(suggestion.setTargets){
         



        const _chgW=Number(suggestion.nextWeight||0)!==Number(suggestion.latest?.weight||0);
        const _chgPerf=suggestion.isDistance
          ? Number(suggestion.nextDistance||0)!==Number(suggestion.latest?.distance||0)
          : suggestion.mode==='time'
            ? Number(suggestion.nextSeconds||0)!==Number(suggestion.latest?.seconds||0)
            : Number(suggestion.nextReps||0)!==Number(suggestion.latest?.reps||0);
        item.suggestedTargets=suggestion.setTargets.map(t=>t?{
          w:t.w?String(t.w):(_chgW?item.suggestedTarget.w:''),
           


          r:suggestion.mode==='time'?'':(t.r?String(t.r):(_chgPerf?item.suggestedTarget.r:'')),
          seconds:suggestion.mode==='time'?(t.seconds?String(t.seconds):(_chgPerf?item.suggestedTarget.seconds:'')):'',
          distance:suggestion.isDistance?(_chgPerf?item.suggestedTarget.distance:''):'',
        }:null);
         



         










        const _draftPositions=(item.sets||[]).filter(s=>!isWarmupSet(s)).length;
        for(let i=0;i<_draftPositions;i++){
          if(!item.suggestedTargets[i])item.suggestedTargets[i]={...item.suggestedTarget};
        }
      }else delete item.suggestedTargets;
       









       




      const _warmupRows=(item.sets||[]).filter(isWarmupSet);
      if(_warmupRows.length&&Number(suggestion.nextWeight)>0){
         











        if(Array.isArray(suggestion.warmupTargets)&&suggestion.warmupTargets.length){
          _warmupRows.forEach((s,i)=>{
            if(typeof isFixedSet==='function'&&isFixedSet(s))return;
            const t=suggestion.warmupTargets[i];
            if(t&&t.changed)s.warmupHint={...(s.warmupHint||{}),w:t.w?String(t.w):''};
          });
        }else{
          const _wuEx=resolveExercise(item.exerciseId);
          const _wuTracking=exerciseTracking(item,_wuEx);
          const _wuEvenTotal=pairImplementExercise(_wuEx)&&dbEntryMode(item.exerciseId,item)==='per'&&!dbSingleDumbbell(item.exerciseId,item);
          const _wuLadder=warmupLadderRows(suggestion.nextWeight,_wuTracking,_wuEvenTotal);
          _warmupRows.forEach((s,i)=>{ if(typeof isFixedSet==='function'&&isFixedSet(s))return; if(_wuLadder[i]) s.warmupHint={...(s.warmupHint||{}),w:_wuLadder[i].w||''}; });
        }
      }
       








      if(Array.isArray(item.suggestedTargets)){
        let _wp=0;
        for(const row of (item.sets||[])){
          if(typeof isWarmupSet==='function'&&isWarmupSet(row))continue;
          const p=_wp++;
          if(typeof isFixedSet==='function'&&isFixedSet(row)&&item.suggestedTargets[p])item.suggestedTargets[p]={w:'',r:'',seconds:'',distance:''};
        }
      }
      suggestion.applied=true;
       


      if(draft&&Array.isArray(draft.progressionSuggestions)){
        const host=draft.progressionSuggestions.find(s=>s&&s!==suggestion&&Array.isArray(s.alternates)&&s.alternates.includes(suggestion));
        if(host)host.applied=true;
      }
      if(rerender){renderWorkoutExercises();renderWorkoutProgression();markDraftSaved();}
    }

     
    function renderWorkoutProgression() {
      const draft=workoutState.draft, box=$('#workoutProgression'), context=$('#workoutContext');
       
      if(draft?.editingId){box.hidden=true;return;}
      const program=workoutState.activeProgram && draft?.programId===workoutState.activeProgram.id?workoutState.activeProgram:null;
       



      let contextText='';
      if(program){
        contextText=`${program.name} – Week ${programWeek(program)}`;
        const scheduled=program.workouts.find(w=>w.uid===draft.programWorkoutUid);
        const scheduledName=(scheduled?.name||'').trim(), draftName=(draft.name||'').trim();
        if(scheduledName&&draftName&&scheduledName.toLowerCase()!==draftName.toLowerCase())contextText+=`, ${scheduledName}`;
         



        if(typeof forkDeloadSessionScale==='function'&&forkDeloadSessionScale(draft)!=null)contextText+=' – Deload week';
      }
      context.hidden=!program; context.textContent=contextText;
       



      box.hidden=true;
    }

    
//# sourceMappingURL=progression.js.map
