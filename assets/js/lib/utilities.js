
 
     






















     

     





    function setIsFrozen(set){return !!set&&set.complete===true;}
    const $ = (s) => document.querySelector(s);
     



    function clamp(v,lo,hi){return Math.min(hi,Math.max(lo,v));}
     
    const SECONDS_PER_DAY=86400, DAY_MS=86400000;
    const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const tokenize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
     




    const searchSynonyms = {
      'knee extension':['leg extension'], 'knee extensions':['leg extension'], 'quad extension':['leg extension'],
      'smith bench':['smith machine bench press'], 'smith press':['smith machine bench press'],
      'ohp':['overhead press','military press','shoulder press'], 'overhead press':['overhead press','military press','shoulder press'],
      'rdl':['romanian deadlift'], 'lat pull down':['lat pulldown'],
       


      'b-stance':['kickstand'], 'b stance':['kickstand'], 'staggered stance':['kickstand'], 'staggered-stance':['kickstand'],
      'b-stance rdl':['kickstand romanian deadlift'], 'b stance rdl':['kickstand romanian deadlift'],
      'b-stance romanian deadlift':['kickstand romanian deadlift'], 'b stance romanian deadlift':['kickstand romanian deadlift'],
      'staggered stance rdl':['kickstand romanian deadlift'],
      'pull up':['pullup','chinup'], 'rear delt':['reverse fly','posterior deltoid'], 'calf raise':['calf raise']
    };
     
    function levenshtein(a,b){const m=a.length,n=b.length,row=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i+=1){let prev=row[0];row[0]=i;for(let j=1;j<=n;j+=1){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));prev=old;}}return row[n];}
     




     



    const EXTRA_MUSCLES=['upper back','rhomboids','front delts','side delts','rear delts'];
     






    const LEGACY_MUSCLE_RENAMES={'shoulders':'front delts'};
     
    function normalizeMuscleName(m){
      if(typeof m!=='string')return m;
      return LEGACY_MUSCLE_RENAMES[m.toLowerCase()]||m;
    }
     


    function normalizeExerciseMuscles(ex){
      if(!ex)return ex;
      const mapList=list=>[...new Set(list.map(normalizeMuscleName))];
      const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
      const hasP=Array.isArray(ex.primary), hasS=Array.isArray(ex.secondary);
      if(!hasP&&!hasS)return ex;
      const primary=hasP?mapList(ex.primary):ex.primary;
      let secondary=hasS?mapList(ex.secondary):ex.secondary;
      if(hasP&&hasS)secondary=secondary.filter(m=>!primary.includes(m));
      if((!hasP||same(primary,ex.primary))&&(!hasS||same(secondary,ex.secondary)))return ex;
      const out={...ex};
      if(hasP)out.primary=primary;
      if(hasS)out.secondary=secondary;
      return out;
    }
     
    function allMuscleOptions(){
       
      return [...new Set([...exercises.filter(x=>!exerciseDeleted(x)).flatMap(x=>[...(x.primary||[]),...(x.secondary||[])]),...EXTRA_MUSCLES].map(normalizeMuscleName))].filter(Boolean).sort();
    }
     
    function phraseScore(ex,phrase){
      const qTokens=tokenize(phrase), normQ=normalize(phrase);
      const name=ex.name.toLowerCase(), normName=normalize(ex.name);
      const haystack=[ex.name,ex.id,...ex.primary,...ex.secondary,ex.equipment].join(' ').toLowerCase();
       


      const pluralExact=normQ.length>2&&normName.length>2&&(normName===normQ+'s'||normQ===normName+'s');
      if(normQ&&(normName===normQ||pluralExact))return 100;
      if(name===phrase)return 100;
       
      if(normQ&&normName.startsWith(normQ))return 85;
      if(phrase&&name.includes(phrase))return 80;
      if(phrase&&haystack.includes(phrase))return 75;
      const words=tokenize(haystack); let score=0,matched=0;
      qTokens.forEach(token=>{
         
        const singular=token.length>3&&token.endsWith('s')?token.slice(0,-1):null;
        const fullHit=words.some(word=>word===token||word===singular||(token.length>3&&word===token+'s'));
        if(fullHit){score+=15;matched++;}
         

        else if(token.length>=3&&words.some(word=>word.length>=3&&(word.includes(token)||token.includes(word)))){score+=9;matched++;}
        else{const best=Math.min(...words.map(word=>levenshtein(token,word)));if(best<=Math.max(1,Math.floor(token.length*.34))){score+=5;matched++;}}
      });
       

      if(!matched||matched<qTokens.length)return 0;
      if(qTokens.length===1&&score<15)return 0;
      return score;
    }
     
    function exerciseSearchScore(ex,query){
      const raw=(query||'').toLowerCase().trim(); if(!raw)return 1;
      const keys=Object.keys(searchSynonyms);
      if(searchSynonyms[raw])return Math.max(...searchSynonyms[raw].map(phrase=>phraseScore(ex,phrase)));
      const alias=keys.map(key=>({key,distance:levenshtein(raw,key)})).sort((a,b)=>a.distance-b.distance)[0];
      if(alias&&alias.distance<=Math.max(1,Math.floor(raw.length*.18)))return Math.max(...searchSynonyms[alias.key].map(phrase=>phraseScore(ex,phrase)));
      return phraseScore(ex,raw);
    }
     


    function exerciseDeleted(ex){return !!ex?.deletedAt;}
     










    function catalogExerciseCount(){
      if(typeof exercises==='undefined'||!Array.isArray(exercises))return 0;
      return exercises.filter(x=>x&&!x.aliasOf&&!exerciseDeleted(x)).length;
    }
     
    function catalogExerciseCountLabel(){
      return `${catalogExerciseCount()} exercises`;
    }
     
    function rankedExerciseMatches(query,limit=80){
      if(!query)return exercises.slice(0,limit);
      const raw=(query||'').toLowerCase().trim(), phrases=searchSynonyms[raw]||[raw];
       


      const extraChars=name=>{const nn=normalize(name);let best=Infinity;phrases.forEach(p=>{const nq=normalize(p);if(nq&&nn.includes(nq))best=Math.min(best,nn.length-nq.length);});return best;};
       


      const tier=score=>score>=100?0:score>=85?1:score>=75?2:3;
      const notFav=id=>state.favorites.has(id)?0:1;
       






      const STANDARD_EQUIPMENT=new Set(['barbell','dumbbell','bodyonly']);
      const notStandard=ex=>STANDARD_EQUIPMENT.has(normalize(ex.equipment))?0:1;
       







      const canonicalLift=name=>{const nn=normalize(name);return phrases.some(p=>{const nq=normalize(p);if(!nq)return false;return nn===nq||nn==='barbell'+nq||nn==='dumbbell'+nq;});};
      const notCanonical=ex=>canonicalLift(ex.name)?0:1;
       









      const PLAIN_VARIANT_EQUIPMENT=new Set(['barbell','dumbbell']);
      const wordsOf=s=>String(s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const plainVariant=ex=>{
        if(!PLAIN_VARIANT_EQUIPMENT.has(normalize(ex.equipment)))return false;
        const words=wordsOf(ex.name);
        return phrases.some(p=>{const pw=wordsOf(p);if(!pw.length)return false;
          if(words.some((_,i)=>pw.every((w,j)=>words[i+j]===w)))return true;
           









          const eqWord=pw.find(w=>PLAIN_VARIANT_EQUIPMENT.has(w));
          if(!eqWord||normalize(ex.equipment)!==eqWord)return false;
          let k=0,first=-1,last=-1;
          words.forEach((w,i)=>{if(k<pw.length&&w===pw[k]){if(first<0)first=i;last=i;k++;}});
          if(k<pw.length)return false;
           



          return (last-first+1)-pw.length<=1;
        });
      };
      const notPlainVariant=ex=>plainVariant(ex)?0:1;
       




      const plainExtraWords=name=>{
        const words=wordsOf(name);
        const pwLen=Math.max(0,...phrases.map(p=>wordsOf(p).length));
        const lead=(words[0]==='barbell'||words[0]==='dumbbell')?1:0;
        return words.length-pwLen-lead;
      };
       



















      const loggedIds=new Set();
      const completedList=(typeof workoutState!=='undefined'&&workoutState&&Array.isArray(workoutState.completed))?workoutState.completed:[];
      for(const w of completedList){
        if(!w||!Array.isArray(w.exercises))continue;
        for(const item of w.exercises){
          if(item&&item.exerciseId)loggedIds.add((typeof canonicalExerciseId==='function')?canonicalExerciseId(item.exerciseId):item.exerciseId);
        }
      }
      const notLogged=ex=>loggedIds.has(ex.id)?0:1;
       






      const liftPhrases=new Map();
      for(const e of exercises){
        if(!e||exerciseDeleted(e)||e.aliasOf)continue;
        const w=wordsOf(e.name);
        const lead=(w[0]==='barbell'||w[0]==='dumbbell')?1:0;
        const phrase=w.slice(lead).join(' ');
        if(!phrase)continue;
        const rec=liftPhrases.get(phrase);
        if(rec)rec.count+=1;else liftPhrases.set(phrase,{count:1,owner:e.id});
      }
      const phraseExtensions=phrases.map(p=>wordsOf(p)).filter(pw=>pw.length).map(pw=>{
        const out=[];
        for(const [phrase,rec] of liftPhrases){
          const words=phrase.split(' ');
          if(words.length>pw.length&&pw.every((w,j)=>words[j]===w))out.push({phrase,count:rec.count,owner:rec.owner});
        }
        return out;
      });
      const wholePhrase=ex=>{
        const padded=` ${wordsOf(ex.name).join(' ')} `;
        for(const exts of phraseExtensions){
          for(const {phrase,count,owner} of exts){
            if((count>=2||owner!==ex.id)&&padded.includes(` ${phrase} `))return 0;
          }
        }
        return 1;
      };
      const plainOrder=(a,b)=>{
        if(notPlainVariant(a.ex)!==0||notPlainVariant(b.ex)!==0)return 0;
        return (notFav(a.ex.id)-notFav(b.ex.id))||(a.logged-b.logged)||(a.phrase-b.phrase)||(plainExtraWords(a.ex.name)-plainExtraWords(b.ex.name))||(a.extra-b.extra);
      };
      return exercises.map(ex=>({ex,score:exerciseSearchScore(ex,query),extra:extraChars(ex.name),phrase:wholePhrase(ex),logged:notLogged(ex)})).filter(row=>row.score>0&&!exerciseDeleted(row.ex)&&!row.ex.aliasOf).sort((a,b)=>notCanonical(a.ex)-notCanonical(b.ex)||notPlainVariant(a.ex)-notPlainVariant(b.ex)||plainOrder(a,b)||tier(a.score)-tier(b.score)||notFav(a.ex.id)-notFav(b.ex.id)||(a.logged-b.logged)||notStandard(a.ex)-notStandard(b.ex)||b.score-a.score||(a.phrase-b.phrase)||a.extra-b.extra||a.ex.name.localeCompare(b.ex.name)).slice(0,limit).map(row=>row.ex);
    }
    const titleCase = (s) => s ? s.replace(/\b\w/g, c => c.toUpperCase()) : '—';
     


    const ID_KIND={set:'set',exercise:'exercise',workout:'workout',template:'template',program:'program',programWorkout:'program-workout',superset:'superset',custom:'custom'};
     

    function randomCore(){
      if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==='x'?r:(r&0x3|0x8)).toString(16);});
    }
     

    function uid(kind){return `${kind}-${randomCore()}`;}
     
    function newSetId(){return uid(ID_KIND.set);}
     
    function newExerciseUid(){return uid(ID_KIND.exercise);}
     
    function newWorkoutId(){return uid(ID_KIND.workout);}
     
    function newTemplateId(){return uid(ID_KIND.template);}
     
    function newProgramId(){return uid(ID_KIND.program);}
     
    function newProgramWorkoutUid(){return uid(ID_KIND.programWorkout);}
     
    function newSupersetGroupId(){return uid(ID_KIND.superset);}
     


    function newCustomExerciseId(name){return `${ID_KIND.custom}-${normalize(name)||'exercise'}-${randomCore().slice(0,8)}`;}
     





    function contentHash53(str){
      let h1=0xdeadbeef,h2=0x41c6ce57;
      for(let i=0;i<str.length;i++){
        const ch=str.charCodeAt(i);
        h1=Math.imul(h1^ch,2654435761);h2=Math.imul(h2^ch,1597334677);
      }
      h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
      h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
      return (h2>>>0).toString(16).padStart(8,'0')+(h1>>>0).toString(16).padStart(8,'0');
    }
     
    function stableImportUid(kind,key){return `${kind}-import-${contentHash53(String(key))}`;}
     
    function stableTemplateId(key){return stableImportUid(ID_KIND.template,key);}
     
    function stableProgramId(key){return stableImportUid(ID_KIND.program,key);}
     

    function uniqueSuffixedName(base,existingNames,numbered){
      if(!existingNames.includes(base))return base;
       


      let n=1,candidate;
      if(numbered){
        candidate=`${base} (2)`;
        while(existingNames.includes(candidate)){n++;candidate=`${base} (${n+1})`;}
      }else{
        candidate=`${base} (shared)`;
        while(existingNames.includes(candidate)){n++;candidate=`${base} (shared ${n})`;}
      }
      return candidate;
    }
     

    function localIsoDate(date) {
      const now = date || new Date();
      const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0,10);
    }
     



     





    function sortByRecencyDesc(a,b){
      const key=w=>(w&&w.completedAt)||(w&&(w.isoDate||w.date))||'';
      const x=key(a),y=key(b);
      return y<x?-1:y>x?1:0;
    }
     





    function sortByWorkoutDateDesc(a,b){
       



      const da=(a&&(a.isoDate||a.date))||'',db=(b&&(b.isoDate||b.date))||'';
      if(da!==db)return db<da?-1:1;
      const ca=(a&&a.completedAt)||'',cb=(b&&b.completedAt)||'';
      return cb<ca?-1:cb>ca?1:0;
    }
     


    const LOG_DATE_FMT=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'});
    const PRETTY_DATE_FMT=new Intl.DateTimeFormat('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});
     
    function formatLogDate(value) {
      if (!value) return '';
       


      const d=new Date(`${value}T12:00:00`);
      if (isNaN(d.getTime())) return '';
      return LOG_DATE_FMT.format(d);
    }
     
    function formatPrettyDate(value) {
      if (!value) return '';
      return PRETTY_DATE_FMT.format(new Date(`${value}T12:00:00`));
    }
     



    const PRETTY_DATE_MAIN_FMT=new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric'});
    const PRETTY_WEEKDAY_FMT=new Intl.DateTimeFormat('en-US',{weekday:'long'});
    function formatPrettyDateParts(value) {
      if (!value) return {date:'',weekday:''};
      const d=new Date(`${value}T12:00:00`);
      if (!Number.isFinite(d.getTime())) return {date:'',weekday:''};
      return {date:PRETTY_DATE_MAIN_FMT.format(d),weekday:PRETTY_WEEKDAY_FMT.format(d)};
    }
     
     


    function equipmentLabel(ex){return (ex&&ex.equipment)||'No equipment';}
     















    const GYM_STEP_EQUIPMENT=['barbell','e-z curl bar','machine','cable'];
    const GYM_LIST_EQUIPMENT={dumbbell:'dumbbells',kettlebells:'kettlebells',kettlebell:'kettlebells'};
    function gymCleanWeights(arr){
      return [...new Set((Array.isArray(arr)?arr:[]).map(Number).filter(n=>Number.isFinite(n)&&n>0&&n<2000).map(n=>Math.round(n*1000)/1000))].sort((a,b)=>a-b);
    }
    function gymProfilesState(){
      const raw=(typeof progressionSetup!=='undefined'&&progressionSetup&&progressionSetup.gymProfiles)||null;
      const list=(raw&&Array.isArray(raw.list)?raw.list:[]).filter(x=>x&&typeof x.id==='string'&&x.id).map(x=>{
        const steps={};
        const src=(x.steps&&typeof x.steps==='object')?x.steps:{};
        GYM_STEP_EQUIPMENT.forEach(eq=>{const v=Number(src[eq]);if(Number.isFinite(v)&&v>0&&v<500)steps[eq]=Math.round(v*1000)/1000;});
        const maxes={},msrc=(x.maxes&&typeof x.maxes==='object')?x.maxes:{};
        GYM_STEP_EQUIPMENT.forEach(eq=>{const v=Number(msrc[eq]);if(Number.isFinite(v)&&v>0&&v<5000)maxes[eq]=Math.round(v*1000)/1000;});
        return {id:x.id,name:String(x.name||'').trim()||'Gym',steps,maxes,dumbbells:gymCleanWeights(x.dumbbells),kettlebells:gymCleanWeights(x.kettlebells)};
      });
      const activeId=raw&&list.some(x=>x.id===raw.activeId)?raw.activeId:null;
      return {activeId,list};
    }
    function saveGymProfilesState(next){
      if(typeof progressionSetup==='undefined'||!progressionSetup)return;
      progressionSetup.gymProfiles={activeId:next.activeId||null,list:(next.list||[]).map(x=>({id:x.id,name:x.name,steps:{...(x.steps||{})},maxes:{...(x.maxes||{})},dumbbells:gymCleanWeights(x.dumbbells),kettlebells:gymCleanWeights(x.kettlebells)}))};
      if(typeof schedulePersist==='function')schedulePersist();
    }
    function activeGymProfile(){
      const st=gymProfilesState();
      return st.activeId?st.list.find(x=>x.id===st.activeId)||null:null;
    }
     




    function exerciseHasOwnLoadStep(prof){
      if(!prof||prof.incrementValue==null||prof.incrementValue==='')return false;
      if(prof.incrementExplicit===true)return true;
      if(prof.incrementExplicit===false)return false;
      const settings=(typeof progressionSetup!=='undefined'&&progressionSetup)?progressionSetup:{};
      return Number(prof.incrementValue)!==Number(settings.incrementValue??5)||(prof.incrementType||'lb')!==(settings.incrementType||'lb');
    }
     





    function gymLoadRule(exerciseId,prof,gym){
      gym=gym===undefined?activeGymProfile():gym;
      if(!gym||!exerciseId)return null;
      if(exerciseHasOwnLoadStep(prof))return null;
      const ex=typeof resolveExercise==='function'?resolveExercise(exerciseId):null;
      const eq=ex&&ex.equipment;
      if(!eq)return null;
       

      if(GYM_STEP_EQUIPMENT.includes(eq)){
        const st=Number(gym.steps&&gym.steps[eq]),mx=Number(gym.maxes&&gym.maxes[eq]);
        if(!(st>0)&&!(mx>0))return null;
        return {kind:'step',stepLb:st>0?st:null,maxLb:mx>0?mx:null};
      }
      const key=GYM_LIST_EQUIPMENT[eq];
      if(!key)return null;
      const list=gymCleanWeights(gym[key]);
      if(!list.length)return null;
      const pair=typeof pairImplementExercise==='function'&&pairImplementExercise(ex);
      const single=typeof dbSingleDumbbell==='function'&&dbSingleDumbbell(exerciseId,prof?{progression:prof}:null);
      const mult=pair&&!single?2:1;
      return {kind:'list',weightsLb:list.map(w=>Math.round(w*mult*1000)/1000)};
    }
     

    function gymStepDisplay(stepLb){
      return (typeof isMetric==='function'&&isMetric())?Math.round(stepLb*LB_TO_KG*100)/100:stepLb;
    }
     



    const WEIGHT_OPTIONAL_EQUIPMENT=['body only','bands','exercise ball','foam roll','foam roller','other'];
     



    function exerciseWeightOptional(ex){return !!ex&&(!ex.equipment||WEIGHT_OPTIONAL_EQUIPMENT.includes(ex.equipment));}
     
     
     
     
     





     







    let _priorCache={list:null,len:-1,rows:new Map(),sets:new Map()};
     
    function priorCacheFor(list){
      if(_priorCache.list!==list||_priorCache.len!==(list?list.length:0)){
        _priorCache={list,len:list?list.length:0,rows:new Map(),sets:new Map()};
      }
      return _priorCache;
    }
     
    function priorRowsForWorkout(workout){
      const ordered=workoutState.completed||[],cache=priorCacheFor(ordered);
      let rows=cache.rows.get(workout.id);
      if(!rows){
        const selfIdx=ordered.findIndex(row=>row.id===workout.id);
        const stamp=row=>row&&row.completedAt?Date.parse(row.completedAt):NaN;
        const selfStamp=stamp(workout);
        rows=ordered.filter((row,i)=>{
          if(row.id===workout.id)return false;
          if(row.date<workout.date)return true;
          if(row.date>workout.date)return false;
           


          const rowStamp=stamp(row);
          if(!isNaN(selfStamp)&&!isNaN(rowStamp))return rowStamp<selfStamp;
          return selfIdx>=0&&i>selfIdx;
        });
        cache.rows.set(workout.id,rows);
      }
      return rows;
    }
     
    function priorSetsForPR(workout,exerciseId){
      const ordered=workoutState.completed||[],cache=priorCacheFor(ordered);
       

      const cid=(typeof canonicalExerciseId==='function')?canonicalExerciseId(exerciseId):exerciseId;
      const key=workout.id+'::'+cid;
      let sets=cache.sets.get(key);
      if(!sets){
        sets=priorRowsForWorkout(workout)
          .flatMap(row=>row.exercises.filter(entry=>((typeof canonicalExerciseId==='function')?canonicalExerciseId(entry.exerciseId):entry.exerciseId)===cid).flatMap(entry=>entry.sets));
        cache.sets.set(key,sets);
      }
      return sets;
    }
     
     






     
















    function pairImplementExercise(ex){
      return !!(ex&&(ex.equipment==='dumbbell'||ex.equipment==='cable'||ex.equipment==='kettlebells'||ex.equipment==='kettlebell'));
    }
    function dbEntryMode(exerciseId,item){
      const prof=item&&item.progression;
      if(prof&&(prof.dbEntry==='per'||prof.dbEntry==='total'))return prof.dbEntry;
      const prefs=(typeof progressionSetup!=='undefined'&&progressionSetup.dbEntryPrefs)||{};
      if(exerciseId&&(prefs[exerciseId]==='per'||prefs[exerciseId]==='total'))return prefs[exerciseId];
       



      const rec=exerciseId&&typeof resolveExercise==='function'?resolveExercise(exerciseId):null;
      if(rec&&(rec.dbEntryDefault==='per'||rec.dbEntryDefault==='total'))return rec.dbEntryDefault;
      return (typeof progressionSetup!=='undefined'&&progressionSetup.dbEntry==='total')?'total':'per';
    }
     

















    function exerciseSingleDumbbellDefault(exerciseId){
      if(!exerciseId||typeof resolveExercise!=='function')return false;
       





      const exact=typeof catalogEntryById==='function'?catalogEntryById(exerciseId):null;
       






      if(exact&&exact.custom===true&&typeof exact.singleDumbbell==='boolean')return exact.singleDumbbell;
      if(exact?.singleDumbbell||exact?.singleStack)return true;
      const resolved=resolveExercise(exerciseId);
      if(resolved?.singleDumbbell||resolved?.singleStack)return true;
       














      if(exact?.equipment==='kettlebells'||exact?.equipment==='kettlebell'||resolved?.equipment==='kettlebells'||resolved?.equipment==='kettlebell')return true;
      return false;
    }
    function dbSingleDumbbell(exerciseId,item){
      const prof=item&&item.progression;
      if(prof&&typeof prof.singleDb==='boolean')return prof.singleDb;
      const prefs=(typeof progressionSetup!=='undefined'&&progressionSetup.singleDbPrefs)||{};
      if(exerciseId&&typeof prefs[exerciseId]==='boolean')return prefs[exerciseId];
      if(exerciseSingleDumbbellDefault(exerciseId))return true;
       










      if(typeof singleSideEnabled==='function'&&singleSideEnabled(exerciseId,item))return true;
      return false;
    }
     











    function forkDbSetupState(exerciseId,item){
      if(dbSingleDumbbell(exerciseId,item))return 'one';
      return dbEntryMode(exerciseId,item)==='total'?'pair-total':'pair-per';
    }
     














    function forkApplyDbSetup(item,state){
      if(!item||(state!=='one'&&state!=='pair-per'&&state!=='pair-total'))return false;
      const mode=state==='pair-total'?'total':'per';
      const next=state==='one';
      const p=item.progression||(item.progression={});
      p.dbEntry=mode;
      p.singleDb=next;
      if(typeof progressionSetup!=='undefined'){
        progressionSetup.dbEntryPrefs=progressionSetup.dbEntryPrefs||{};
        if(item.exerciseId)progressionSetup.dbEntryPrefs[item.exerciseId]=mode;
        progressionSetup.singleDbPrefs=progressionSetup.singleDbPrefs||{};
        if(item.exerciseId)progressionSetup.singleDbPrefs[item.exerciseId]=next;
      }
      return true;
    }
     




    function dbDisplayWeight(canonicalW,exerciseId,item,isDb){
      if(!isDb)return displayWeight(canonicalW);
      const n=Number(canonicalW);
      if(!isFinite(n)||n<=0)return displayWeight(canonicalW);
      const single=dbSingleDumbbell(exerciseId,item);
      return displayWeight(dbEntryMode(exerciseId,item)==='per'&&!single?n/2:canonicalW);
    }
     



    function dbStorageWeight(displayVal,exerciseId,item,isDb){
      const canonical=storageWeight(displayVal);
      if(!isDb)return canonical;
      const n=Number(canonical);
      if(!isFinite(n)||n<=0)return canonical;
      const single=dbSingleDumbbell(exerciseId,item);
      return dbEntryMode(exerciseId,item)==='per'&&!single?String(n*2):canonical;
    }
     




















    function parseWeightEntry(raw){
      const text=String(raw??'').trim();
      const unit=typeof weightUnit==='function'?weightUnit():'lb';
      if(text==='')return {ok:true,value:''};
      if(/^[+-]?(\d+\.?\d*|\.\d+)$/.test(text))return {ok:true,value:text};
      const pct=/^([+-]?(?:\d+\.?\d*|\.\d+))\s*%$/.exec(text);
      if(pct)return {ok:false,kind:'percent',text,pct:Number(pct[1]),
        message:`"${text}" is a percentage, not a weight — nothing was stored (it is not ${pct[1]} ${unit}). Enter a weight in ${unit}; percentages belong to the %1RM scheme in Exercise options, where they resolve against the training max.`};
      if(text.includes(','))return {ok:false,kind:'list',text,
        message:`"${text}" lists more than one weight — a set's weight field holds one weight, so nothing was stored and no extra sets were added. Add a set for each weight instead.`};
      return {ok:false,kind:'junk',text,
        message:`"${text}" is not a weight — nothing was stored. Enter a weight in ${unit}.`};
    }
     



    function flagFieldInput(input,message){
      if(!input)return;
      let already=false;
      try{ already=!!(input.dataset&&input.dataset.cgInvalid); }catch(_){}
      try{
        if(input.setAttribute)input.setAttribute('aria-invalid','true');
        if(input.classList&&input.classList.add)input.classList.add('input-invalid');
        if(input.dataset)input.dataset.cgInvalid='1';
      }catch(_){}
      if(!already&&message&&typeof showToast==='function')showToast(message,'error');
    }
     
    function clearFieldInputFlag(input){
      if(!input)return;
      try{
        if(input.removeAttribute)input.removeAttribute('aria-invalid');
        if(input.classList&&input.classList.remove)input.classList.remove('input-invalid');
        if(input.dataset)delete input.dataset.cgInvalid;
      }catch(_){}
    }
     





























    const SET_ENTRY_MAX_WEIGHT=1500, SET_ENTRY_MAX_REPS=1000, SET_ENTRY_MAX_DISTANCE=100000;
    function validateSetEntry(field,raw,opts={}){
      const text=String(raw??'').trim();
      if(text==='')return {ok:true,value:''};
      const n=Number(text);
      const unit=typeof weightUnit==='function'?weightUnit():'lb';
      if(field==='w'){
        if(!Number.isFinite(n))return {ok:false,message:`"${text}" is not a weight — nothing was stored. Enter a weight in ${unit}.`};
        if(n<0)return {ok:false,message:`A weight can't be negative — nothing was stored. Enter a weight in ${unit}, or clear the field.`};
        if(n===0&&!opts.zeroWeightOk)return {ok:false,message:`0 ${unit} is not a weight for this exercise — nothing was stored. Enter the weight you lifted.`};
        if(n>SET_ENTRY_MAX_WEIGHT)return {ok:false,message:`${text} ${unit} is beyond any lift that can be logged — nothing was stored. Check the number and enter the weight in ${unit}.`};
        return {ok:true,value:text};
      }
      if(field==='r'){
        if(!Number.isFinite(n)||!Number.isInteger(n))return {ok:false,message:`Reps are a whole number — "${text}" was not stored. Enter how many reps you did.`};
        if(n<1)return {ok:false,message:`0 reps is not a set — nothing was stored. Enter the reps you did, or delete the set.`};
        if(n>SET_ENTRY_MAX_REPS)return {ok:false,message:`${text} reps is beyond a single set — nothing was stored. Check the number.`};
        return {ok:true,value:text};
      }
      if(field==='seconds'){
        if(!Number.isFinite(n))return {ok:false,message:`"${text}" is not a time — nothing was stored. Enter seconds.`};
        if(n<1)return {ok:false,message:`0 seconds is not a set — nothing was stored. Enter the seconds you held, or delete the set.`};
        if(n>SECONDS_PER_DAY)return {ok:false,message:`${text} seconds is longer than a day — nothing was stored. Check the number.`};
        return {ok:true,value:text};
      }
      if(field==='distance'){
        if(!Number.isFinite(n))return {ok:false,message:`"${text}" is not a distance — nothing was stored. Enter metres.`};
        if(n<1)return {ok:false,message:`0 m is not a set — nothing was stored. Enter the distance you covered, or delete the set.`};
        if(n>SET_ENTRY_MAX_DISTANCE)return {ok:false,message:`${text} m is beyond a single set — nothing was stored. Check the number.`};
        return {ok:true,value:text};
      }
      if(field==='rpe'){
        if(!Number.isFinite(n)||n<0||n>10)return {ok:false,message:`Effort runs 0 to 10 — "${text}" was not stored.`};
        return {ok:true,value:text};
      }
      return {ok:true,value:text};
    }
     






















     
    function setSide(set){return set&&(set.side==='L'||set.side==='R')?set.side:null;}
     
    function sideLabel(side){return side==='L'?'Left':side==='R'?'Right':'';}
     
    function exerciseUnilateral(exerciseId){
      if(!exerciseId||typeof resolveExercise!=='function')return false;
      return !!resolveExercise(exerciseId)?.unilateral;
    }
     




    function singleSideEnabled(exerciseId,item){
      const prof=item&&item.progression;
      if(prof&&typeof prof.singleSide==='boolean')return prof.singleSide;
      const prefs=(typeof progressionSetup!=='undefined'&&progressionSetup.singleSidePrefs)||{};
      if(exerciseId&&typeof prefs[exerciseId]==='boolean')return prefs[exerciseId];
      return exerciseUnilateral(exerciseId);
    }
     


    function hasSidedSets(sets){return (sets||[]).some(set=>!!setSide(set));}
     

    function setsForSide(sets,side){
      return (sets||[]).filter(set=>{const sd=setSide(set);return sd===null||sd===side;});
    }
     











     








    function applySingleSideToSets(item,on){
      if(!item||!Array.isArray(item.sets))return item;
       





      if(!on){
        const blank=set=>!set.complete&&['w','r','seconds','distance','rpe'].every(k=>set[k]==null||set[k]==='');
        const out=[],sides=item.sets.map(setSide);
        item.sets.forEach((set,i)=>{
          if(!set)return;
          if(sides[i]==='R'&&sides[i-1]==='L'&&blank(set))return;
          delete set.side;out.push(set);
        });
        item.sets=out;
        return item;
      }
      const out=[];
      for(const set of item.sets){
        if(!set||isWarmupSet(set)||setSide(set)){out.push(set);continue;}
        set.side='L';
        out.push(set);
        const twin=(typeof newSet==='function')?newSet():{uid:newSetId(),w:'',r:'',seconds:'',distance:'',rpe:'',targetRpe:'',tags:[],complete:false};
        twin.targetRpe=set.targetRpe||'';
        twin.tags=[...(set.tags||[])];
        twin.side='R';
         




        twin.prefillHint=set.prefillHint?{...set.prefillHint}:{w:set.w??'',r:set.r??'',seconds:set.seconds??'',distance:set.distance??''};
        out.push(twin);
      }
      item.sets=out;
      return item;
    }
     




    function cleanTargetRpe(v){
      if(v==null||String(v).trim()==='')return '';
      const n=Number(v); if(!Number.isFinite(n)||n<1||n>10)return '';
      return String(v).trim();
    }
     






    function escapeHtml(text) {
      return String(text)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
        .replace(/'/g,'&#39;');
    }
     
     

    function emptyStatePrimary(id, label) {
      return `<button class="primary-button" id="${escapeHtml(id)}" type="button">${escapeHtml(label)}</button>`;
    }
     
    function emptyStateSecondary(id, label) {
      return `<button class="text-link" id="${escapeHtml(id)}" type="button">${escapeHtml(label)}</button>`;
    }
     


    function musclePill(name,suffix=''){
      return `<span class="tag primary">${escapeHtml(name)}${suffix}</span>`;
    }
     


    const TIME_STEP_PRESETS=[5,10,15,30];
     
    function timeStepPillsHTML(){
      return TIME_STEP_PRESETS.map(n=>`<button type="button" data-step="${n}" aria-pressed="false">${n}s</button>`).join('');
    }
     
    function syncTimeStepPills(root,value){
      if(!root)return;
      const n=Number(value);
      root.querySelectorAll('[data-step]').forEach(btn=>{
        btn.setAttribute('aria-pressed',String(Number(btn.dataset.step)===n));
      });
    }
     
    function wireTimeStepPills(root,get,set){
      if(!root)return;
      root.innerHTML=timeStepPillsHTML();
      syncTimeStepPills(root,get());
      root.addEventListener('click',e=>{
        const btn=e.target.closest('[data-step]');
        if(!btn||!root.contains(btn))return;
        set(Number(btn.dataset.step));
        syncTimeStepPills(root,get());
      });
    }
     








    let toastTimer=null,toastFadeTimer=null;
     




    function toastTopLayerHost(){
      const open=document.querySelectorAll('dialog[open]');
      return open.length?open[open.length-1]:document.body;
    }
     












    let forkToastQueue=[],forkToastFlushing=false;
    function forkSheetOpen(){
      return !!(typeof document!=='undefined'&&document.querySelector&&document.querySelector('dialog.fork-sheet[open]'));
    }
    function flushForkToastQueue(){
      if(forkToastFlushing||!forkToastQueue.length||forkSheetOpen())return;
      forkToastFlushing=true;
      const next=forkToastQueue.shift();
       


      toastService(next.message,{kind:next.kind,durationMs:2400});
      setTimeout(()=>{forkToastFlushing=false;flushForkToastQueue();},2650);
    }
    if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
       
      document.addEventListener('close',()=>{setTimeout(flushForkToastQueue,60);},true);
    }
     
    function toastService(message,opts={}){
      const el=document.getElementById('appToast');
      if(!el){if(typeof opts.onAbsent==='function')opts.onAbsent();return;}
      try{
        if(opts.kind!=='error'&&forkSheetOpen()){
          if(forkToastQueue.length>=4)forkToastQueue.shift();
          forkToastQueue.push({message,kind:opts.kind||''});
          return;
        }
        const host=toastTopLayerHost();
        if(el.parentNode!==host)host.appendChild(el);
        el.textContent=message;
        el.className=`app-toast ${opts.kind||''}`.trim();
        el.hidden=false;
         


        clearTimeout(toastTimer);clearTimeout(toastFadeTimer);
        requestAnimationFrame(()=>requestAnimationFrame(()=>el.classList.add('show')));
        toastTimer=setTimeout(()=>{
          el.classList.remove('show');
           
          toastFadeTimer=setTimeout(()=>{
            if(!el.classList.contains('show')){
              el.hidden=true;
              if(!document.querySelector('dialog[open]')&&el.parentNode!==document.body)document.body.appendChild(el);
            }
          },120);
        },opts.durationMs||3600);
      }catch(_){}
    }
     

















    function showToast(message,kind='',durationMs=3600){
      toastService(message,{kind,durationMs});
    }
     





    function formatVolume(value) {
      const n=displayVolume(value), unit=weightUnit(), rounded=Math.round(n);
      return rounded>=1000?`${(rounded/1000).toFixed(rounded>=10000?0:1)}k ${unit}`:`${rounded.toLocaleString()} ${unit}`;
    }
     






    function replaceProgramConsequence(){
      return 'Your current program moves to your saved programs. Nothing is deleted.';
    }
     




     



     









    function caretToEnd(input){
      if(!input||!input.value)return;
      try{input.setSelectionRange(input.value.length,input.value.length);}catch(_){}
    }
    if(typeof document!=='undefined'&&typeof document.addEventListener==='function'){
    document.addEventListener('focusin',e=>{
      const t=e.target;
      if(t&&t.matches&&t.matches('input[type="number"]')){
        caretToEnd(t);
        setTimeout(()=>caretToEnd(t),0);
      }
    });
    }
     







    function workoutScrollKey() {
      if (workoutState.draft) return 'workout:editor';
      const complete = document.querySelector('#workoutComplete');
      if (complete && !complete.hidden) return 'workout:complete';
       


      if (state.workoutHistoryOpen) return 'workout:history';
      return 'workout:start';
    }
     
    function scrollKeyFor(view) { return view === 'workout' ? workoutScrollKey() : view; }
     
    function rememberScroll() { state.scroll[scrollKeyFor(state.activeView)] = window.scrollY; }
     
    function restoreScroll(view) {
       




      const doc=document.scrollingElement||document.documentElement;
      const max=Math.max(0,(doc?doc.scrollHeight:0)-window.innerHeight);
      const want=state.scroll[scrollKeyFor(view)]||0;
      window.scrollTo({top:clamp(want,0,max),behavior:'auto'});
    }
     

    function setActiveNav(view, highlight) {
      if (highlight === undefined) highlight = view;
      [['dashboard',$('#dashboardNav')],['library',$('#libraryNav')],['workout',$('#workoutsNav')],['program',$('#programNav')],['stats',$('#statsNav')]].forEach(([key,button]) => {
        const active = key === highlight;
        button.classList.toggle('active', active);
        if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
      });
       


      document.querySelectorAll('#desktopHeader .desktop-tab').forEach(tab => {
        const active = tab.dataset.view === highlight;
        tab.classList.toggle('active', active);
        if (active) tab.setAttribute('aria-current','page'); else tab.removeAttribute('aria-current');
      });
      updateTopBar(view);
    }
     

    const TOP_BAR_TITLES = { dashboard: 'Home', library: 'Exercises', workout: 'Workout', program: 'Program', stats: 'Stats', settings: 'Settings' };
     


    function setTopBarTitle(el, html){
      const dot=$('#liveTitleDot');
      el.innerHTML=html;
      if(dot)el.appendChild(dot);
    }
     
    function updateTopBar(view, customTitle) {
      const titleEl = $('#topBarTitle'); if (!titleEl) return;
       

      const titleText = $('#topBarTitleText') || titleEl;
      const back = $('#topBarBack'); const gear = $('#topBarSettings');
       



      const workoutSub = view === 'workout' && state.workoutSubScreen && state.workoutSubScreen !== 'start';
      const programSub = view === 'program' && ($('#createProgram')?.dataset.editing === 'true' || !!state.programWorkoutUid || !!state.savedProgramPreviewId);
      if (back) {
        back.hidden = !(view === 'settings' || view === 'detail' || workoutSub || programSub);
        if (workoutSub || programSub) back.setAttribute('aria-label', 'Back');
      }
       


      if (gear) gear.classList.remove('active');
       
      const desktopGear = $('#desktopSettings');
      if (desktopGear) desktopGear.classList.remove('active');
      if (view === 'detail') {
         







        setTopBarTitle(titleText, escapeHtml(TOP_BAR_TITLES.library));
      } else if (view === 'settings') {
        
        setTopBarTitle(titleText, 'Settings');
      } else if (view === 'workout' && (state.workoutSubScreen === 'history' || state.workoutSubScreen === 'complete')) {
         




        const logLabel = customTitle || 'Logs';
        setTopBarTitle(titleText, `<button type="button" class="title-tap" id="topBarTitleTap" aria-label="View all workout logs">${escapeHtml(logLabel)}</button>`);
        const titleTap = $('#topBarTitleTap');
        if (titleTap) titleTap.addEventListener('click', () => {
           
          if (state.workoutSubScreen === 'history') { window.scrollTo({top:0,behavior:'auto'}); return; }
          showWorkoutHistory();
        });
      } else {
        setTopBarTitle(titleText, escapeHtml(customTitle || TOP_BAR_TITLES[view] || ''));
      }
    }

         



     



     



    const REP_PRESETS={strength:{label:'Strength',min:1,max:5},hypertrophy:{label:'Hypertrophy',min:6,max:12},endurance:{label:'Endurance',min:12,max:20},amrap:{label:'AMRAP',min:1,max:null,amrap:true},
       

      open:{label:'15+',min:15,max:null,openTop:true,legacy:true}};
     

    const VISIBLE_REP_PRESETS=['strength','hypertrophy','endurance','amrap'];
     


    function defaultExerciseProgression(overrides={}) {
      return {
        mode: overrides.mode || 'reps',
        min: overrides.min ?? null,
        max: overrides.max ?? null,
        openTop: !!overrides.openTop,
        amrap: !!overrides.amrap,
        timeMin: overrides.timeMin ?? 30,
        timeMax: overrides.timeMax ?? 60,
        timeStep: overrides.timeStep ?? progressionSetup.timeStep ?? 5,
        incrementType: overrides.incrementType || progressionSetup.incrementType || 'lb',
        incrementValue: overrides.incrementValue ?? progressionSetup.incrementValue ?? 5,
        repsOnly: !!overrides.repsOnly,
        custom: !!overrides.custom,
         

        ...(overrides.scheme?{scheme:overrides.scheme}:{}),
         





        ...(overrides.percentOf1RM!=null?{percentOf1RM:overrides.percentOf1RM}:{}),
        ...(overrides.trainingMax!=null?{trainingMax:overrides.trainingMax}:{}),
        ...(overrides.tmSource?{tmSource:overrides.tmSource}:{}),
         



        dbEntry: (overrides.dbEntry==='per'||overrides.dbEntry==='total')?overrides.dbEntry:null,
        singleDb: typeof overrides.singleDb==='boolean'?overrides.singleDb:null,
         

        singleSide: typeof overrides.singleSide==='boolean'?overrides.singleSide:null
      };
    }
     



































    function cloneSetFields(set,mode){
      const s=set||{};
       



      const sidePart=setSide(s)?{side:setSide(s)}:{};
       




      const fixedPart=(typeof isFixedSet==='function'&&isFixedSet(s))?{fixed:true}:{};
       





      const amrapPart=(typeof isAmrapSet==='function'&&isAmrapSet(s))?{amrap:true}:{};
       




      const pctPart=(()=>{const n=Number(s.pct);return Number.isFinite(n)&&n>0?{pct:n}:{}})();
       




      const ghostPart=(hint)=>{
        const clean={w:hint.w??'',r:hint.r??'',seconds:hint.seconds??'',distance:hint.distance??''};
        if(clean.w===''&&clean.r===''&&clean.seconds===''&&clean.distance==='')return {};
        const part={prefillHint:{w:clean.w==null?'':String(clean.w),r:clean.r==null?'':String(clean.r),seconds:clean.seconds==null?'':String(clean.seconds),distance:clean.distance==null?'':String(clean.distance)}};
        if(typeof isWarmupSet==='function'&&isWarmupSet(s)){
          part.warmupHint={w:part.prefillHint.w,perf:part.prefillHint.r||part.prefillHint.seconds||part.prefillHint.distance||''};
        }
        return part;
      };
      switch(mode){
         


















        case 'forNewSession':return {w:'',r:'',seconds:'',distance:'',rpe:'',targetRpe:cleanTargetRpe(s.targetRpe),tags:[...(s.tags||[])],...sidePart,...fixedPart,...amrapPart,...pctPart,...ghostPart({w:s.w??s.prefillHint?.w??'',r:s.r??s.prefillHint?.r??'',seconds:s.seconds??s.prefillHint?.seconds??'',distance:s.distance??s.prefillHint?.distance??''})};
        case 'forTemplate':return {w:s.w==null?'':String(s.w),r:s.r==null?'':String(s.r),seconds:s.seconds==null?'':String(s.seconds),distance:s.distance==null?'':String(s.distance),rpe:'',targetRpe:cleanTargetRpe(s.rpe),tags:[...(s.tags||[])],...sidePart,...fixedPart,...amrapPart,...pctPart};
         



        case 'fromTemplate':return {w:'',r:'',seconds:'',distance:'',rpe:'',targetRpe:cleanTargetRpe(s.targetRpe??s.rpe),tags:[...(s.tags||[])],...sidePart,...fixedPart,...amrapPart,...pctPart,...ghostPart({w:s.w??s.prefillHint?.w??'',r:s.r??s.prefillHint?.r??'',seconds:s.seconds??s.prefillHint?.seconds??'',distance:s.distance??s.prefillHint?.distance??''})};
        case 'fromProgram':return {w:'',r:'',seconds:'',distance:'',rpe:'',targetRpe:cleanTargetRpe(s.targetRpe??s.rpe),tags:[...(s.tags||[])],...sidePart,...fixedPart,...amrapPart,...pctPart};
         


        case 'forEdit':return {w:s.w==null?'':String(s.w),r:s.r==null?'':String(s.r),seconds:s.seconds==null?'':String(s.seconds),distance:s.distance==null?'':String(s.distance),rpe:s.rpe==null?'':String(s.rpe),targetRpe:'',tags:[...(s.tags||[])],complete:!!s.complete,...sidePart,...fixedPart,...amrapPart,...pctPart};
         





        case 'forSaveTemplate':return {w:s.w==null?'':String(s.w),r:s.r??'',seconds:s.seconds??'',distance:s.distance??'',rpe:'',targetRpe:'',tags:[...(s.tags||[])],...sidePart,...fixedPart,...amrapPart,...pctPart};
        default:return {w:'',r:'',seconds:'',distance:'',rpe:'',targetRpe:'',tags:[],...sidePart,...fixedPart,...amrapPart,...pctPart};
      }
    }
     

    function cloneExerciseSets(sets,mode,opts={}){
      const rows=(sets&&sets.length)?sets:(opts.emptyDefault?[{w:'',r:'',seconds:'',rpe:'',tags:[]}]:[]);
      return rows.map(set=>Object.assign(newSet(),cloneSetFields(set,mode)));
    }
     






    function cloneWeekVariants(map,mode,opts){
      if(!map||typeof map!=='object'||Array.isArray(map))return undefined;
      const out={};
      for(const k of Object.keys(map)){
        const wk=Math.floor(Number(k));
        if(!Number.isInteger(wk)||wk<1||wk>52)continue;
        const v=map[k];
        if(!v||typeof v!=='object'||!v.exerciseId)continue;
        out[String(wk)]=cloneExerciseItem({...v,weekVariants:undefined},mode,{emptyDefault:!!(opts&&opts.emptyDefault)});
      }
      return Object.keys(out).length?out:undefined;
    }
     
    function cloneExerciseItem(item,mode,opts={}){
      const src=item||{};
      const tracking=opts.tracking||(mode==='fromTemplate'
        ? src.tracking||src.progression?.mode||('trackingFallback' in opts?opts.trackingFallback:'reps')
        : src.tracking||'reps');
      const built=newExerciseItem({
        exerciseId:'exerciseId' in opts?opts.exerciseId:src.exerciseId,
        tracking,
        metrics:'metrics' in opts?opts.metrics:(Array.isArray(src.metrics)?[...src.metrics]:null),
        note:'note' in opts?opts.note:(src.note||''),
        noteOpen:!!opts.noteOpen,
        exerciseTags:'exerciseTags' in opts?opts.exerciseTags:src.exerciseTags,
        supersetId:'supersetId' in opts?opts.supersetId:src.supersetId,
        progression:'progression' in opts?opts.progression:src.progression,
        sets:'sets' in opts?opts.sets:cloneExerciseSets(src.sets,mode,opts)
      });
       











      if(['fromProgram','fromTemplate','forNewSession','forTemplate','forSaveTemplate','fromShare'].includes(mode)
        &&typeof singleSideEnabled==='function'&&typeof applySingleSideToSets==='function'
        &&built&&Array.isArray(built.sets)&&built.sets.length
        &&singleSideEnabled(built.exerciseId,built)
        &&built.sets.some(set=>set&&!setSide(set)&&!isWarmupSet(set))){
        applySingleSideToSets(built,true);
      }
       







      if(['fromTemplate','forTemplate','forSaveTemplate'].includes(mode)){
        const wv=cloneWeekVariants(src.weekVariants,mode,opts);
        if(wv)built.weekVariants=wv;
      }
      return built;
    }
     


    function cloneExerciseItemFromShare(sitem,decodeProgression){
      const cols=a=>Array.isArray(a)?a:[];
       



      const built=cloneExerciseItem(null,'fromShare',{
        exerciseId:sitem.i,
        tracking:sitem.k||'reps',
        metrics:Array.isArray(sitem.m)?sitem.m:undefined,
        note:sitem.o||'',
        exerciseTags:Array.isArray(sitem.g)?[...sitem.g]:[],
        supersetId:sitem.u||null,
        progression:decodeProgression(sitem.p),
        sets:(sitem.e||[]).map(a=>{const c=cols(a);return Object.assign(newSet(),{w:c[0]??'',r:c[1]??'',seconds:c[2]??'',rpe:c[3]??'',tags:[...cols(c[4])],targetRpe:cleanTargetRpe(c[5]),distance:c[6]??'',...(c[7]==='L'||c[7]==='R'?{side:c[7]}:{}),...(Number.isFinite(Number(c[8]))&&Number(c[8])>0?{pct:Number(c[8])}:{}),...(c[9]===1?{amrap:true}:{}),...((c[10]===1||c[10]===true)?{fixed:true}:{})});})
      });
       




      if(sitem.z&&typeof sitem.z==='object'&&!Array.isArray(sitem.z)){
        const wv={};
        for(const k of Object.keys(sitem.z)){
          const wk=Math.floor(Number(k));
          if(!Number.isInteger(wk)||wk<1||wk>52)continue;
          const sv=sitem.z[k];
          if(!sv||typeof sv!=='object'||!sv.i)continue;
          wv[String(wk)]=cloneExerciseItemFromShare({...sv,z:undefined},decodeProgression);
        }
        if(Object.keys(wv).length)built.weekVariants=wv;
      }
      return built;
    }
     



     







    function sessionSetCount(item){
      const sets=(item&&item.sets)||[];
      if(!item||typeof singleSideEnabled!=='function'||!singleSideEnabled(item.exerciseId,item))return sets.length;
      return sets.reduce((n,set)=>n+((set&&!setSide(set)&&!isWarmupSet(set))?2:1),0);
    }
     






    function authoredRepsSummary(item){
      const sets=(item&&item.sets)||[];
      if(!sets.length)return null;
      const reps=[];
      for(const s of sets){
        const v=s?s.r:null;
        if(v===''||v==null)return null;
        const n=Number(v);
        if(!Number.isFinite(n))return null;
        reps.push(n);
      }
      if(reps.every(v=>v===reps[0]))return `${reps[0]} reps`;
      if(reps.length<=8)return `${reps.join('/')} reps`;
      return `${Math.min(...reps)}–${Math.max(...reps)} reps`;
    }
     




    function workoutNamesMeta(exercises){
      const names=(exercises||[]).map(item=>resolveExercise(item?.exerciseId)?.name||'').filter(Boolean);
      if(!names.length)return '';
      const shown=names.slice(0,3).join(', ');
      return names.length>3?`${shown} +${names.length-3} more`:shown;
    }
    function exerciseTargetSummary(item,name,focusRange){
      const n=sessionSetCount(item),p=item.progression||{};
      let target='';
      if((item.tracking||p.mode)==='time'){
        const tMin=p.timeMin??30,tMax=p.timeMax??60;
        target=`${forkRangePairText(tMin,tMax)} sec`;
      }
       











      else{
        const rp=(focusRange&&typeof forkEffectiveRangeProfile==='function')?(forkEffectiveRangeProfile(item,focusRange)||{}):p;
         



        const authored=rp.amrap?null:authoredRepsSummary(item);
        if(authored)target=authored;
        else if(rp.amrap)target=rp.min>1?`AMRAP from ${rp.min} reps`:'AMRAP';
        else if(rp.openTop&&rp.min!=null)target=`${rp.min}+ reps`;
        else if(rp.min!=null&&rp.max!=null)target=forkRangeLabel(rp.min,rp.max,'reps');
         


        else if(rp.min!=null)target=`${rp.min}+ reps`;
        else if(rp.max!=null)target=`up to ${rp.max} reps`;
        else{const rs=[...new Set((item.sets||[]).map(s=>s.r).filter(v=>v!==''&&v!=null))];if(rs.length)target=`${rs.join('/')} reps`;}
      }
      return {name,meta:`<span class="m-ink">${n} set${n===1?'':'s'}</span>${target?`<span class="fact">${target}</span>`:''}`};
    }
     






     



    function matchingRangePresetKey(profile){
      const p=profile||{};
      const found=Object.entries(REP_PRESETS).find(([,v])=>
        Number(p.min)===v.min&&(v.max==null?p.max==null:Number(p.max)===v.max)&&!!p.openTop===!!v.openTop&&!!p.amrap===!!v.amrap);
      return found?found[0]:'';
    }
     




    function exerciseHasOwnRange(item){
      const p=item?.progression||{};
      if(!p.custom)return false;
      const stamped=p.preset;
      if(stamped&&REP_PRESETS[stamped]&&matchingRangePresetKey(p)===stamped)return false;
      return true;
    }
     










    function forkRangePairText(min,max){
      if(min!=null&&max!=null&&Number(min)===Number(max))return String(min);
      return `${min}–${max}`;
    }
     






    function forkRangeLabel(min,max,unit){
      return `${forkRangePairText(min,max)} ${unit}`;
    }
    function forkCountText(n,word){
      return `${n} ${word}${Number(n)===1?'':'s'}`;
    }
     


    function rangeTextForDisplay(profile){
      const p=profile||{};
      if(p.amrap)return p.min>1?`AMRAP from ${p.min} reps`:'AMRAP';
      if(p.openTop&&p.min!=null)return `${p.min}+ reps`;
      if(p.min!=null&&p.max!=null)return forkRangeLabel(p.min,p.max,'reps');
       




      if(p.min!=null)return `${p.min}+ reps`;
      if(p.max!=null)return `up to ${p.max} reps`;
      return 'Per-set targets';
    }
     

    function rangeBoundsDifferFromFocus(profile,focusRange){
      const p=profile||{},f=focusRange||{};
      const boundEq=(a,b)=>(a==null&&b==null)||(a!=null&&b!=null&&Number(a)===Number(b));
      return !boundEq(p.min,f.min)||!boundEq(p.max,f.max)||!!p.openTop!==!!f.openTop||!!p.amrap!==!!f.amrap;
    }
     





    function effectiveRangeOf(item,focusRange){
      const p=item?.progression;
      if(p){
        const hasSignal=p.min!=null||p.max!=null||!!p.amrap||!!p.openTop;
        if(hasSignal)return {profile:p,source:(exerciseHasOwnRange(item)||rangeBoundsDifferFromFocus(p,focusRange))?'own':'focus'};
        if(p.custom)return {profile:p,source:'own'};
      }
      return {profile:focusRange,source:'focus'};
    }
     
















    function forkEffectiveRangeProfile(item,focusRange){
      if(!item||!focusRange)return item?.progression||null;
      if(typeof exerciseTracking==='function'&&typeof resolveExercise==='function'
        &&exerciseTracking(item,resolveExercise(item.exerciseId))==='time')return item.progression||null;
      const eff=effectiveRangeOf(item,focusRange);
      if(eff.source!=='focus')return item.progression||null;
      return {...(item.progression||{}),min:focusRange.min??null,max:focusRange.max??null,openTop:!!focusRange.openTop,amrap:!!focusRange.amrap};
    }
     












    function workoutRangeMix(exercises,focusRange){
      const rows=[];const ownKeys=new Set();let ownCount=0,focusCount=0,ownProfile=null;
      for(const item of exercises||[]){
        const ex=(typeof resolveExercise==='function')?resolveExercise(item?.exerciseId):undefined;
        if(exerciseTracking(item,ex)==='time')continue;
        const eff=effectiveRangeOf(item,focusRange);
        rows.push({name:ex?.name||'Exercise',rangeText:rangeTextForDisplay(eff.profile),source:eff.source});
        if(eff.source==='own'){ownCount++;const rp=eff.profile||{};ownKeys.add(`${rp.min}|${rp.max}|${rp.openTop}|${rp.amrap}`);if(!ownProfile)ownProfile=eff.profile;}
        else focusCount++;
      }
      const unanimousOwnProfile=(ownCount>=1&&focusCount===0&&ownKeys.size===1&&ownProfile&&(ownProfile.min!=null||ownProfile.max!=null||!!ownProfile.amrap||!!ownProfile.openTop))?ownProfile:null;
      return {mixed:(ownCount>=1&&focusCount>=1)||ownKeys.size>=2,rows,unanimousOwnProfile};
    }
     



    function splitFocusApply(exercises,preset){
      const apply=[],skip=[];
      for(const item of exercises||[]){
        const ex=(typeof resolveExercise==='function')?resolveExercise(item?.exerciseId):undefined;
        if(exerciseTracking(item,ex)==='time'||exerciseHasOwnRange(item))skip.push(item);
        else apply.push(item);
      }
      return {apply,skip};
    }
     


    function openRangeMixDialog(exercises,focusRange,focusText){
      let dialog=null,list=null,focusLine=null;
      try{
        if(typeof document==='undefined'||!document||typeof document.querySelector!=='function')return;
        dialog=document.querySelector('#rangeMixDialog');
        if(!dialog)return;
        list=document.querySelector('#rangeMixList');
        focusLine=document.querySelector('#rangeMixFocusLine');
      }catch(_){return;}
       

      if(list)list.innerHTML=forkFocusMixRows(exercises,focusRange).html;
      if(focusLine)focusLine.textContent=focusText?`Focus: ${focusText}`:'';
      try{
        if(typeof showModalPinned==='function')showModalPinned(dialog);
        else if(typeof dialog.showModal==='function')dialog.showModal();
      }catch(_){}
    }
     





    function forkFocusRangeDescription(range){
      if(!range)return '';
      const label=range.label||(range.preset&&REP_PRESETS[range.preset]?REP_PRESETS[range.preset].label:'');
      const rt=rangeTextForDisplay(range);
      if(!label)return rt==='Per-set targets'?'':rt;
      if(rt==='Per-set targets')return label;
      if(rt.startsWith(label))return rt;
      return `${label} (${rt})`;
    }
     



















    function forkFocusStageSelection(ownPreset,ownCustom,effectiveRange){
      const r=effectiveRange||{};
      const bounded=r.min!=null&&r.max!=null&&Number.isFinite(+r.min)&&Number.isFinite(+r.max);
      const fillMin=bounded?+r.min:null, fillMax=bounded?+r.max:null;
       





      const ownOpenMax=!ownCustom?undefined:(ownCustom.max==null||ownCustom.max===''?null:(Number.isFinite(+ownCustom.max)?+ownCustom.max:undefined));
      if(ownCustom&&Number.isFinite(+ownCustom.min)&&ownOpenMax!==undefined)return {mode:'custom',preset:null,min:+ownCustom.min,max:ownOpenMax,inherited:false,fillMin:+ownCustom.min,fillMax:ownOpenMax};
      if(ownPreset&&REP_PRESETS[ownPreset])return {mode:'preset',preset:ownPreset,min:null,max:null,inherited:false,fillMin,fillMax};
      const key=matchingRangePresetKey(r);
      if(key&&VISIBLE_REP_PRESETS.includes(key))return {mode:'preset',preset:key,min:null,max:null,inherited:true,fillMin,fillMax};
      if(bounded)return {mode:'custom',preset:null,min:+r.min,max:+r.max,inherited:true,fillMin,fillMax};
       



      if(r.min!=null&&Number.isFinite(+r.min)&&r.max==null&&!r.openTop&&!r.amrap)return {mode:'custom',preset:null,min:+r.min,max:null,inherited:true,fillMin:+r.min,fillMax:null};
      return {mode:'none',preset:null,min:null,max:null,inherited:true,fillMin:null,fillMax:null};
    }
     



    function forkFocusSelectionSignature(mode,preset,min,max){
      if(mode==='preset')return `preset:${preset||''}`;
      if(mode==='custom'){
        const norm=v=>(v==null||v==='')?'':String(Math.round(Number(v)));
        return `custom:${norm(min)}|${norm(max)}`;
      }
      return 'none';
    }
     










































    function forkRepRangePickerTileSub(range){
      if(!range)return '';
      if(range.amrap)return 'as many as possible';
      if(range.max==null)return `${range.min}+ reps`;
      return forkRangeLabel(range.min,range.max,'reps');
    }
    function forkRepRangePickerHtml(opts){
      const o=opts||{};
      const tileAttr=o.tileAttr||'data-fork-target-preset';
      const tiles=VISIBLE_REP_PRESETS.map(key=>{
        const r=REP_PRESETS[key]; if(!r)return '';
        const a11y=r.amrap?' title="As many reps as possible" aria-label="AMRAP: as many reps as possible"':'';
        return `<button class="rep-preset fork-focus-choice" type="button" ${tileAttr}="${key}"${a11y}><span class="fork-tile-name">${r.label}</span><span class="fork-tile-sub">${forkRepRangePickerTileSub(r)}</span></button>`;
      }).join('');
      const custom=`<button class="rep-preset fork-focus-choice" type="button" data-fork-range-custom><span class="fork-tile-name">Custom</span><span class="fork-tile-sub">set below</span></button>`;
      return `<div class="fork-range-picker"><div class="fork-focus-grid"${o.gridId?` id="${o.gridId}"`:''} role="group" aria-label="${o.ariaLabel||'Rep range presets'}">${tiles}${custom}</div><div class="fork-range-fields"><div class="settings-pair"><label class="rule-field"><span>Min reps</span><input type="number" id="${o.minId}" min="1" step="1" inputmode="numeric"></label><label class="rule-field"><span>Max reps</span><input type="number" id="${o.maxId}" min="1" step="1" inputmode="numeric"></label></div></div></div>`;
    }
     



    function forkRepRangePickerPaint(root,sel){
      if(!root||!sel||typeof root.querySelectorAll!=='function')return;
      root.querySelectorAll('[data-workout-focus],[data-fork-target-preset]').forEach(b=>{
        const key=b.dataset?(b.dataset.workoutFocus||b.dataset.forkTargetPreset):null;
        b.setAttribute('aria-pressed',String(!!sel.preset&&key===sel.preset));
      });
      root.querySelectorAll('[data-fork-range-custom]').forEach(b=>b.setAttribute('aria-pressed',String(!!sel.custom)));
    }
    function forkRepRangePickerFillFields(root,minId,maxId,range){
      if(!root||!range||typeof root.querySelector!=='function')return;
      const mn=root.querySelector('#'+minId),mx=root.querySelector('#'+maxId);
      if(mn)mn.value=range.min==null?'':String(range.min);
      if(mx)mx.value=range.max==null?'':String(range.max);
    }
     






    function forkRepRangePickerRoute(root,event,adapter){
      if(!root||!event||!adapter||!event.target||typeof event.target.closest!=='function')return false;
      const inRoot=el=>!!el&&(typeof root.contains!=='function'||root.contains(el));
      const paint=()=>{
        const sel=typeof adapter.selection==='function'?adapter.selection():null;
        if(sel)forkRepRangePickerPaint(root,sel);
        if(typeof adapter.onAfter==='function')adapter.onAfter();
      };
      if(event.type==='input'||event.type==='change'){
        if(event.target.id!==adapter.minId&&event.target.id!==adapter.maxId)return false;
        const fn=event.type==='input'?adapter.onFieldInput:adapter.onFieldChange;
        if(typeof fn==='function')fn();
        paint();
        return true;
      }
       


      const customBtn=event.target.closest('[data-fork-range-custom]');
      if(inRoot(customBtn)){
        if(typeof adapter.onCustom==='function')adapter.onCustom();
        paint();
        return true;
      }
      const tile=adapter.tileAttr?event.target.closest('['+adapter.tileAttr+']'):null;
      if(inRoot(tile)){
         


        const prop=adapter.tileAttr.replace(/^data-/,'').replace(/-([a-z])/g,(m,c)=>c.toUpperCase());
        const key=(tile.dataset&&tile.dataset[prop])||(typeof tile.getAttribute==='function'?tile.getAttribute(adapter.tileAttr):null);
        const res=key&&typeof adapter.onPreset==='function'?adapter.onPreset(key):undefined;
        if(res==='selected'){
          const r=(typeof REP_PRESETS!=='undefined')?REP_PRESETS[key]:null;
          if(r)forkRepRangePickerFillFields(root,adapter.minId,adapter.maxId,r);
        }
        paint();
        return true;
      }
      return false;
    }
     





    function forkFocusMixRows(exercises,focusRange){
      const mix=workoutRangeMix(exercises||[],focusRange);
      return {mixed:!!mix.mixed,html:mix.rows.map(row=>`<div class="range-mix-row"><span class="range-mix-name">${escapeHtml(row.name)}</span><span class="range-mix-detail"><span class="range-mix-range">${escapeHtml(row.rangeText)}</span><span class="range-mix-source">${row.source==='own'?'Own range':'Focus default'}</span></span></div>`).join('')};
    }
     

    function supersetGroupNumber(exercises,supersetId){
      const seen=[];
      for(const row of exercises){
        if(row.supersetId&&!seen.includes(row.supersetId))seen.push(row.supersetId);
      }
      return seen.indexOf(supersetId)+1;
    }
     



    function exerciseTracking(item, ex) {
      const t=item?.tracking || item?.progression?.mode || ex?.tracking || (ex?.force === 'static' ? 'time' : 'reps');
      return t==='seconds'?'time':t;
    }
     




    function rangePlaceholder(profile,time){
      profile=profile||{};
      if(time){
        const min=profile.timeMin,max=profile.timeMax;
        if(min&&max&&min!==max)return {text:`${min}–${max} sec`,value:String(min)};
        if(min)return {text:`${min} sec`,value:String(min)};
        return {text:'',value:''};
      }
      if(profile.amrap)return {text:profile.min>1?`AMRAP from ${profile.min}`:'AMRAP',value:''};
      const min=profile.min,max=profile.max;
      if(profile.openTop&&min)return {text:`${min}+`,value:String(min)};
      if(min&&max)return min===max?{text:String(min),value:String(min)}:{text:`${min}–${max}`,value:String(min)};
       


      if(min)return {text:`${min}+`,value:String(min)};
      return {text:'',value:''};
    }
     



    function resolvedExerciseScheme(item){
      const prof = item?.progression || {};
      if(prof.scheme) return prof.scheme;
      const d = workoutState.draft;
      if(d?.programId && workoutState.activeProgram?.id === d.programId){
        const s = workoutState.activeProgram.progression?.scheme;
        if(s) return s;
      }
      const b = state.savedBuilder;
      if(b?.editTarget?.kind === 'program'){
        const s = workoutState.activeProgram?.progression?.scheme;
        if(s) return s;
      }
      return progressionSetup.scheme || 'linear';
    }
     








    function resolvedExerciseSchemeWithSource(item){
      const prof=item?.progression||{};
      const own=['linear','rpe','onerm'].includes(prof.scheme)?prof.scheme:null;
      const d=workoutState.draft;
      if(d?.programId&&workoutState.activeProgram?.id===d.programId){
        const s=workoutState.activeProgram.progression?.scheme;
        if(s)return {own,inherited:s,inheritedFrom:'program'};
      }
      const b=state.savedBuilder;
      if(b?.editTarget?.kind==='program'){
        const s=workoutState.activeProgram?.progression?.scheme;
        if(s)return {own,inherited:s,inheritedFrom:'program'};
      }
      return {own,inherited:progressionSetup.scheme||'linear',inheritedFrom:'default'};
    }
     

    function forkSchemeLabel(scheme){return scheme==='onerm'?'%1RM':scheme==='linear'?'Linear':'RPE-based';}
     



    const SCHEME_DESCRIPTIONS={
      rpe:'Adds reps first, then weight, when your top set is at or under the trigger.',  
      linear:'Linear adds the increment every session, no RPE needed.',
      onerm:'%1RM prescribes each exercise\'s load as a percentage of its training max (or estimated 1RM when no training max is set).'
    };
     
    function schemeDescription(scheme){return SCHEME_DESCRIPTIONS[scheme]||SCHEME_DESCRIPTIONS.linear;}
     
     








    function onermProgramContext(){
      const d=workoutState.draft;
      if(d&&!d.editingId&&d.programId&&typeof findProgramById==='function'){
        const p=findProgramById(d.programId);
        if(p)return {config:p.progression||{},week:(typeof programWeek==='function')?programWeek(p):1};
      }
      const b=(typeof state!=='undefined')?state.savedBuilder:null;
      if(b?.editTarget?.kind==='program'&&typeof findProgramById==='function'){
        const p=findProgramById(b.editTarget.uid);
        if(p)return {config:p.progression||{},week:(typeof programWeek==='function')?programWeek(p):1};
      }
      return null;
    }
    function onermDisplayPct(prof){
      const rawPct=Number(prof.percentOf1RM);
      if(Number.isFinite(rawPct)&&rawPct>0)return clampPct1RM(rawPct);
      const prog=onermProgramContext();
      if(prog&&typeof programPctForWeek==='function'){
        return programPctForWeek(prog.config,prog.week)||Number(prog.config?.percentOf1RM)||75;
      }
      return 75;
    }
    function progressionSummaryForOptions(item) {
      
      
      const prof = item.progression || {};
      const scheme = resolvedExerciseScheme(item);
      const schemeLabel = scheme === 'onerm' ? '%1RM' : scheme === 'linear' ? 'Linear' : 'RPE-based';
      const time = prof.mode === 'time' || exerciseTracking(item, resolveExercise(item.exerciseId)) === 'time';
       








      const rangeProf=(!time&&!(prof.min!=null||prof.max!=null||prof.amrap||prof.openTop)&&typeof progressionProfileForDraftItem==='function')
        ?(progressionProfileForDraftItem(item)||prof):prof;
      let target;
      if (time) {
        target = `${forkRangePairText(prof.timeMin || 30, prof.timeMax || 60)} sec`;
      } else if (rangeProf.amrap) {
        target = `AMRAP from ${rangeProf.min || 1} reps`;
      } else if (rangeProf.openTop) {
        target = `${rangeProf.min || 5}+ reps`;
      } else if (rangeProf.max==null&&rangeProf.min!=null) {
         



        target = `${rangeProf.min}+ reps`;
      } else {
        target = forkRangeLabel(rangeProf.min || 5, rangeProf.max || 8, 'reps');
      }
      
      const sugg = (workoutState.draft?.progressionSuggestions || []).find(x => x.exerciseId === item.exerciseId);
       




      const dbIsDb=(typeof exercises!=='undefined')&&pairImplementExercise(resolveExercise(item.exerciseId));
      let detail = '';
      let onermInputs = '';
      if(scheme === 'onerm'){
        
        
        
        
        
        const pctEff = sugg?.pct ?? onermDisplayPct(prof);
        const tm = Number(prof.trainingMax ?? prof.manual1RM) || 0;
        if(sugg && sugg.kind === 'onerm'){
          detail = sugg.tmSource === 'manual'
            ? `${sugg.pct}% of TM ${dbDisplayWeight(sugg.estimated1RM,item.exerciseId,item,dbIsDb)} ${weightUnit()} (you set)`
            : `${sugg.pct}% of auto TM ~ ${Math.round(dbDisplayWeight(sugg.estimated1RM,item.exerciseId,item,dbIsDb))} ${weightUnit()} from e1RM`;
        }else if(tm > 0){
          detail = `${pctEff}% of TM ${dbDisplayWeight(tm,item.exerciseId,item,dbIsDb)} ${weightUnit()} (you set)`;
        }else{
          detail = `${pctEff}% of estimated 1RM`;
        }
        onermInputs = `<div class="prog-onerm-fields"><label class="prog-onerm-field"><span>% of 1RM</span><span class="prog-onerm-input"><input type="number" inputmode="decimal" min="1" max="100" step="0.5" value="${prof.percentOf1RM ?? ''}" placeholder="${pctEff}" data-onerm-pct="${escapeHtml(item.uid)}" aria-label="Percent of 1RM override, blank for program default"><em class="unit">%</em></span></label><label class="prog-onerm-field"><span>Training max</span><span class="prog-onerm-input"><input type="number" inputmode="decimal" min="1" step="0.5" value="${tm > 0 ? dbDisplayWeight(tm,item.exerciseId,item,dbIsDb) : ''}" placeholder="Auto" data-onerm-tm="${escapeHtml(item.uid)}" aria-label="Training max, blank for automatic"><em class="unit">${weightUnit()}</em></span></label></div>`;
      }else{
        const incType = prof.incrementType || 'lb';
        const incVal = prof.incrementValue ?? 5;
        detail = prof.repsOnly ? 'reps only, no load progression' : `+${incVal} ${incType === 'percent' ? '%' : weightUnit()} per jump`;
      }
      let basis = sugg?.reason ? `<span class="prog-basis">${escapeHtml(sugg.reason)}</span>` : '';
      if(!basis && !workoutState.draft?.editingId){
         






        const logs=getExerciseLogs(item.exerciseId);
        const hasHistory=logs.length>0;
        let why;
        if(!hasHistory){
          why='No completed history for this exercise yet.';
        }else{
           





          const prof0=item.progression||{};
          const latest=logs.slice().sort(sortByWorkoutDateDesc)[0];  
          const basisSets=latest?.sets?.filter(s=>!isWarmupSet(s))||[];
          const top=basisSets.reduce((best,s)=>Number(s.w||0)>Number(best?.w||0)?s:best,null);
           


          const basisRange=(prof0.min!=null||prof0.max!=null||prof0.amrap||prof0.openTop)?prof0:rangeProf;
          const rangeLabel=basisRange.openTop?`${basisRange.min||15}+ reps`:basisRange.amrap?'AMRAP':`${forkRangePairText(basisRange.min||1,basisRange.max||5)} reps`;  
          const topRpe=top?.rpe==null||String(top.rpe).trim()==='' ? null : Number(top.rpe);
          const threshold=(()=>{const prof0=item.progression||{};
            if(prof0.threshold==='completion')return 8;
            if(Number.isFinite(Number(prof0.threshold)))return Number(prof0.threshold);
            const d=workoutState.draft;
            if(d?.programId&&workoutState.activeProgram?.id===d.programId)return Number(workoutState.activeProgram.progression?.threshold??8);
            const b=(typeof state!=='undefined')?state.savedBuilder:null;
            if(b?.editTarget?.kind==='program')return Number(workoutState.activeProgram?.progression?.threshold??8);
            return Number(progressionSetup.threshold??8);})();
          const fmt=(typeof fmtRpe==='function')?fmtRpe:(r=>String(Math.round(Number(r)*10)/10));
          const rpeHold=scheme==='rpe'&&topRpe!=null&&topRpe>threshold;
          if(rpeHold)
            why=`Latest top set was RPE ${fmt(topRpe)}, above your RPE ${threshold} trigger, so the app holds.`;
          else if(scheme==='rpe'&&topRpe==null&&top)
            why='No RPE on the latest top set, so the app holds. Log an RPE to get a suggestion.';
          else if(prof0.repsOnly&&top&&!prof0.openTop&&!prof0.amrap&&!(typeof isAmrapSet==='function'&&isAmrapSet(top))&&Number(top.r)>(Number(prof0.max)||Infinity))  
            why=`Increase reps only is on. Past the top of ${rangeLabel}, the app holds your ${dbDisplayWeight(Number(top.w),item.exerciseId,item,dbIsDb)} ${weightUnit()} top set.`;
          else
            why='History exists, but there is not enough valid data for a suggestion.';
        }
        basis=`<span class="prog-basis">${why}</span>`;
      }
       
















       


      const dbSetupState=dbIsDb?forkDbSetupState(item.exerciseId,item):null;
      const dbSetupUid=escapeHtml(item.uid||'');
       










       



      const dbFamilyCable=dbIsDb&&resolveExercise(item.exerciseId)?.equipment==='cable';
      const dbFamilyKb=dbIsDb&&(resolveExercise(item.exerciseId)?.equipment==='kettlebells'||resolveExercise(item.exerciseId)?.equipment==='kettlebell');
      const dbToggle=dbIsDb?`<div class="prog-db-setup-row"><span class="prog-db-entry-label">${dbFamilyCable?'Cables':dbFamilyKb?'Kettlebells':'Dumbbells'}</span><div class="period-tabs" role="group" aria-label="${dbFamilyCable?'Cable setup':dbFamilyKb?'Kettlebell setup':'Dumbbell setup'}"><button type="button" class="period-tab" data-db-setup="one" data-db-setup-uid="${dbSetupUid}" aria-pressed="${dbSetupState==='one'}">One</button><button type="button" class="period-tab" data-db-setup="pair-per" data-db-setup-uid="${dbSetupUid}" aria-pressed="${dbSetupState==='pair-per'}">${dbFamilyCable?'Pair (per stack)':dbFamilyKb?'Pair (per kettlebell)':'Pair (per dumbbell)'}</button><button type="button" class="period-tab" data-db-setup="pair-total" data-db-setup-uid="${dbSetupUid}" aria-pressed="${dbSetupState==='pair-total'}">Pair (total)</button></div></div>`:'';
       




      const ssOn=singleSideEnabled(item.exerciseId,item);
      const ssHasOverride=typeof prof.singleSide==='boolean'||typeof ((typeof progressionSetup!=='undefined'&&progressionSetup.singleSidePrefs)||{})[item.exerciseId]==='boolean';
      const ssAuto=exerciseUnilateral(item.exerciseId)&&!ssHasOverride;
       









      const ssUid=escapeHtml(item.uid||'');
       





      const singleSideRow=`<div class="prog-single-side-row"><span class="prog-db-entry-label">Single side${ssAuto?' <span class="single-side-auto">Auto-detected</span>':''}</span><div class="period-tabs" role="group" aria-label="Sides tracked"><button type="button" class="period-tab" data-single-side-mode="both" data-single-side-uid="${ssUid}" aria-pressed="${!ssOn}">Both sides</button><button type="button" class="period-tab" data-single-side-mode="single" data-single-side-uid="${ssUid}" aria-pressed="${ssOn}">Single side</button></div></div>`;
       





       





      const exThreshold = prof.threshold !== undefined ? prof.threshold : null;
       




      const effThreshold = exThreshold !== null ? exThreshold : (()=>{
        try{
          const d=(typeof workoutState!=='undefined')?workoutState.draft:null;
          if(d&&d.programId&&workoutState.activeProgram&&workoutState.activeProgram.id===d.programId){
            const t=workoutState.activeProgram.progression&&workoutState.activeProgram.progression.threshold;
            if(t!==undefined)return t;
          }
          const b=(typeof state!=='undefined')?state.savedBuilder:null;
          if(b&&b.editTarget&&b.editTarget.kind==='program'){
            const t=workoutState.activeProgram&&workoutState.activeProgram.progression&&workoutState.activeProgram.progression.threshold;
            if(t!==undefined)return t;
          }
          const g=(typeof progressionSetup!=='undefined')?progressionSetup.threshold:undefined;
          return g===undefined?8:g;
        }catch(_){return 8;}
      })();
      const thresholdPills = (scheme === 'rpe') ? `<div class="prog-threshold-row"><span class="prog-threshold-label">RPE trigger</span><div class="period-tabs" role="group" aria-label="RPE trigger threshold"><button type="button" class="period-tab" data-ex-threshold="7" data-ex-threshold-uid="${escapeHtml(item.uid||'')}" aria-pressed="${String(effThreshold)==='7'}">7</button><button type="button" class="period-tab" data-ex-threshold="8" data-ex-threshold-uid="${escapeHtml(item.uid||'')}" aria-pressed="${String(effThreshold)==='8'}">8</button><button type="button" class="period-tab" data-ex-threshold="9" data-ex-threshold-uid="${escapeHtml(item.uid||'')}" aria-pressed="${String(effThreshold)==='9'}">9</button><button type="button" class="period-tab" data-ex-threshold="completion" data-ex-threshold-uid="${escapeHtml(item.uid||'')}" aria-pressed="${String(effThreshold)==='completion'}">Off</button></div></div><p class="prog-note">The next suggestion comes when a top set lands at or below the chosen effort. Off means finishing the sets is enough.</p>` : '';
       






       





      const incRow = (scheme !== 'onerm' && !time) ? `<div class="prog-increment-row"><span class="prog-db-entry-label">Load step<span class="single-side-sub">Added per jump. Set it to your dumbbell or stack step. Blank uses the program step.</span></span><span class="fork-step-input"><input type="number" inputmode="decimal" min="0" step="0.5" value="${prof.incrementValue ?? ''}" placeholder="${(typeof progressionSetup!=='undefined'&&progressionSetup.incrementValue) ?? 5}" data-fork-increment="${escapeHtml(item.uid||'')}" aria-label="Load step for this exercise, blank to use the program step"><em class="unit">${weightUnit()}</em></span></div>` : '';
       




       





      return `<div class="progression-section"><div class="progression-section-head"><span class="prog-card-title">Progression</span><span class="prog-scheme">${escapeHtml(schemeLabel)}</span><span class="prog-sep" aria-hidden="true"> (</span><span class="prog-target">${escapeHtml(target)}</span><span class="prog-sep" aria-hidden="true">)</span></div><div class="progression-card-body"><div class="prog-summary"><span class="prog-detail">${escapeHtml(detail)}</span>${onermInputs}${basis}</div>${thresholdPills}${incRow}${(!time&&scheme!=='onerm')?`<div class="prog-reps-only-row"><button class="reps-only-toggle" type="button" data-reps-only-toggle="${escapeHtml(item.uid||'')}" aria-pressed="${!!prof.repsOnly}">Increase reps only</button></div>`:''}${dbToggle}${singleSideRow}</div></div>`;
    }
     











     
    function wireExerciseInfoButtons(scope){
      scope.querySelectorAll('[data-exercise-info]').forEach(btn=>btn.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openExercise(btn.dataset.exerciseInfo);}));
    }
     

    function dataKeyOf(attr){return attr.replace(/^data-/,'').replace(/-([a-z])/g,(_,c)=>c.toUpperCase());}
     
    function wireExerciseTagButtons(scope,attr,mode){
      const key=dataKeyOf(attr);
      scope.querySelectorAll('['+attr+']').forEach(btn=>btn.addEventListener('click',()=>openExerciseTagDialog({mode:mode,exerciseUid:btn.dataset[key]})));
    }
     


    function wireAddNoteButtons(scope,btnAttr,noteKey,findItem,onInput,onOpen){
      const key=dataKeyOf(btnAttr);
      scope.querySelectorAll('['+btnAttr+']').forEach(btn=>btn.addEventListener('click',()=>{
        const item=findItem(btn.dataset[key]);if(!item)return;
        item.noteOpen=true;
        if(onOpen)onOpen(item);
        const ta=document.createElement('textarea');ta.id=`note-${item.uid}`;ta.dataset[noteKey]=item.uid;
        ta.setAttribute('aria-label','Exercise notes');ta.placeholder='Cues, setup, pain, or anything to remember';ta.value=item.note||'';
        ta.addEventListener('input',()=>{item.note=ta.value;if(onInput)onInput(item);});
        btn.replaceWith(ta);ta.focus({preventScroll:true});
      }));
    }
     
    function wireExerciseNoteInputs(scope,attr,findItem,onInput){
      const key=dataKeyOf(attr);
      scope.querySelectorAll('['+attr+']').forEach(ta=>ta.addEventListener('input',()=>{const item=findItem(ta.dataset[key]);if(item){item.note=ta.value;if(onInput)onInput(item);}}));
    }
     




     























































    function exerciseCardMenuHtml(item,ex,host){
      const uid=escapeHtml(item?.uid||'');
      const name=escapeHtml(ex?.name||'exercise');
      const swapAttr=host==='builder'?`data-builder-swap-ex="${uid}"`:`data-swap-exercise="${uid}"`;
      const removeAttr=host==='builder'?`data-builder-del-ex="${uid}"`:`data-uid="${uid}"`;
       






      const progressionItem=host==='builder'?'':`<button type="button" role="menuitem" data-menu-progression="${uid}">Progression</button>`;
      return `<span class="exercise-menu-wrap"><button class="exercise-info-button" type="button" data-exercise-menu="${uid}" aria-haspopup="menu" aria-expanded="false" aria-label="Actions for ${name}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg></button><span class="exercise-menu" role="menu" hidden><button type="button" role="menuitem" data-menu-options="${uid}">Exercise options</button>${progressionItem}<button type="button" role="menuitem" data-exercise-info="${escapeHtml(item?.exerciseId||'')}">About ${name}</button><button type="button" role="menuitem" ${swapAttr}>Swap exercise</button><span class="exercise-menu-divider" aria-hidden="true"></span><button type="button" role="menuitem" class="exercise-menu-danger remove-workout-exercise" ${removeAttr}>Remove exercise</button></span></span>`;
    }
     




    function closeAllExerciseMenus(doc){
      (doc||document).querySelectorAll('.exercise-menu:not([hidden])').forEach(m=>{m.hidden=true;});
      (doc||document).querySelectorAll('[data-exercise-menu][aria-expanded="true"]').forEach(b=>b.setAttribute('aria-expanded','false'));
    }
    let exerciseMenuDismissInstalled=false;
    function installExerciseMenuDismiss(){
      if(exerciseMenuDismissInstalled||typeof document==='undefined'||typeof document.addEventListener!=='function')return;
      exerciseMenuDismissInstalled=true;
      document.addEventListener('click',e=>{if(!e.target||typeof e.target.closest!=='function'||!e.target.closest('.exercise-menu-wrap'))closeAllExerciseMenus(document);});
      document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAllExerciseMenus(document);});
    }
    function wireExerciseCardMenus(scope,onSuperset,onOptions,onProgression){
      if(!scope||typeof scope.querySelectorAll!=='function')return;
      installExerciseMenuDismiss();
      scope.querySelectorAll('[data-exercise-menu]').forEach(btn=>{
        if(btn.dataset.menuWired)return;btn.dataset.menuWired='1';
        btn.addEventListener('click',event=>{
          event.preventDefault();event.stopPropagation();
          const wrap=typeof btn.closest==='function'?btn.closest('.exercise-menu-wrap'):null;
          const menu=wrap&&typeof wrap.querySelector==='function'?wrap.querySelector('.exercise-menu'):null;
          if(!menu)return;
          const willOpen=!!menu.hidden;
          closeAllExerciseMenus(btn.ownerDocument||document);
          if(willOpen){menu.hidden=false;btn.setAttribute('aria-expanded','true');}
        });
      });
      scope.querySelectorAll('.exercise-menu').forEach(menu=>{
        if(menu.dataset.menuCloseWired)return;menu.dataset.menuCloseWired='1';
        menu.addEventListener('click',()=>{menu.hidden=true;const b=menu.parentElement&&menu.parentElement.querySelector('[data-exercise-menu]');if(b)b.setAttribute('aria-expanded','false');});
      });
       



       






      scope.querySelectorAll('[data-menu-options]').forEach(btn=>{
        if(btn.dataset.menuOptionsWired)return;btn.dataset.menuOptionsWired='1';
        btn.addEventListener('click',()=>{if(typeof onOptions==='function')onOptions(btn.dataset.menuOptions);});
      });
       







      scope.querySelectorAll('[data-menu-progression]').forEach(btn=>{
        if(btn.dataset.menuProgressionWired)return;btn.dataset.menuProgressionWired='1';
        btn.addEventListener('click',()=>{if(typeof onProgression==='function')onProgression(btn.dataset.menuProgression);});
      });
    }
     



















    const forkProgressionHosts={};
    function registerForkProgressionHost(host,adapter){ if(host&&adapter)forkProgressionHosts[host]=adapter; }
    function forkProgressionDialogEl(){ return typeof document!=='undefined'?document.querySelector('#forkProgressionDialog'):null; }
    let forkProgressionState=null;
    let forkProgressionWired=false;
    function wireForkProgressionDialog(dialog){
      if(forkProgressionWired||!dialog)return; forkProgressionWired=true;
      const closeBtn=dialog.querySelector('#forkProgressionClose');
      if(closeBtn)closeBtn.addEventListener('click',()=>{ if(typeof dialog.close==='function')dialog.close(); });
      const applyBtn=dialog.querySelector('#forkProgressionApply');
      if(applyBtn)applyBtn.addEventListener('click',()=>forkProgressionApplyOption(0));
      dialog.addEventListener('click',e=>{
        const btn=e.target&&typeof e.target.closest==='function'?e.target.closest('[data-fork-prog-apply]'):null;
        if(btn)forkProgressionApplyOption(Number(btn.dataset.forkProgApply||0));
      });
    }
    function forkProgressionApplyOption(optionIndex){
      const st=forkProgressionState; if(!st)return;
      const adapter=forkProgressionHosts[st.host]; if(!adapter||typeof adapter.apply!=='function')return;
      const item=typeof adapter.resolve==='function'?adapter.resolve(st.uid):null; if(!item)return;
      const suggestion=typeof adapter.suggestion==='function'?adapter.suggestion(item):null; if(!suggestion)return;
      if(adapter.apply(item,suggestion,optionIndex)){
        const dialog=forkProgressionDialogEl();
        if(dialog&&typeof dialog.close==='function')dialog.close();
      }
    }
    function openForkProgressionModal(uid,host){
      const adapter=forkProgressionHosts[host]; if(!adapter)return;
      const item=typeof adapter.resolve==='function'?adapter.resolve(uid):null; if(!item)return;
      const dialog=forkProgressionDialogEl(); if(!dialog)return;
      const suggestion=typeof adapter.suggestion==='function'?adapter.suggestion(item):null;
      forkProgressionState={host,uid};
      const nameEl=dialog.querySelector('#forkProgressionExercise');
      if(nameEl)nameEl.textContent=(typeof resolveExercise==='function'?resolveExercise(item.exerciseId)?.name:null)||'Exercise';
      const canApply=typeof adapter.apply==='function';
      const body=dialog.querySelector('#forkProgressionBody');
      if(body){
         





        const rx=typeof adapter.prescription==='function'?adapter.prescription(item):null;
        const rxHtml=rx&&typeof forkPrescriptionDetailHtml==='function'?forkPrescriptionDetailHtml(item,rx):'';
        if(suggestion&&typeof forkProgressionDetailHtml==='function')body.innerHTML=forkProgressionDetailHtml(item,suggestion,{applyButtons:canApply});
        else if(rxHtml)body.innerHTML=rxHtml;
        else if(typeof adapter.hasHistory==='function'&&adapter.hasHistory(item))body.innerHTML='<p class="fork-prog-empty">No suggestion for the next session.</p>';
        else body.innerHTML='<p class="fork-prog-empty">No history yet. Log a session and a suggestion will follow.</p>';
      }
      const applyBtn=dialog.querySelector('#forkProgressionApply');
      if(applyBtn)applyBtn.hidden=!(canApply&&suggestion&&typeof forkSuggestionActionable==='function'&&forkSuggestionActionable(suggestion));
      wireForkProgressionDialog(dialog);
      if(typeof dialog.showModal==='function')dialog.showModal(); else dialog.setAttribute('open','');
    }
     















    const forkTargetsHosts={};
    function registerForkTargetsHost(host,adapter){ if(host&&adapter)forkTargetsHosts[host]=adapter; }
    function forkTargetsSheetEl(){ return typeof document!=='undefined'?document.querySelector('#forkTargetsSheet'):null; }
     








    const FORK_SHEET_SECTIONS_KEY='fork:sheet-sections';
    function forkSheetSectionsStored(){
      try{
        const raw=typeof localStorage!=='undefined'?localStorage.getItem(FORK_SHEET_SECTIONS_KEY):null;
        const parsed=raw?JSON.parse(raw):null;
        return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
      }catch{ return {}; }
    }
    function forkSheetSectionOpen(name){
       






      if(name==='progression')return false;
      const stored=forkSheetSectionsStored();
      if(typeof stored[name]==='boolean')return stored[name];
       




      return name==='targets'||name==='tracking';
    }
    function forkSaveSheetSectionOpen(name,open){
      if(!name||name==='progression')return;  
      const stored=forkSheetSectionsStored();
      stored[name]=!!open;
      try{ if(typeof localStorage!=='undefined')localStorage.setItem(FORK_SHEET_SECTIONS_KEY,JSON.stringify(stored)); }catch{   }
    }
     



     



     












    function forkTargetsSelectedState(p,time){
      const prof=p||{};
      if(time){
        const staged=prof.timeMin!=null||prof.timeMax!=null;
        return {presetKey:'',customSelected:staged};
      }
      const presetKey=(typeof matchingRangePresetKey==='function')?matchingRangePresetKey(prof):'';
      const staged=prof.min!=null||prof.max!=null||!!prof.amrap||!!prof.openTop;
      return {presetKey,customSelected:staged&&!presetKey};
    }
     







    function forkSheetTagOptions(item){
      const presets=(typeof workoutState!=='undefined'&&Array.isArray(workoutState.exerciseTagPresets))?workoutState.exerciseTagPresets:[];
       




      const reserved=(typeof DONT_PROGRESS_TAG!=='undefined')?[DONT_PROGRESS_TAG]:[];
      return [...new Set([...reserved,...presets,...(Array.isArray(item?.exerciseTags)?item.exerciseTags:[])])];
    }
    function forkToggleExerciseTag(tags,tag){
      const list=Array.isArray(tags)?tags:[];
      return list.includes(tag)?list.filter(t=>t!==tag):[...list,tag];
    }
    function forkAddExerciseTag(tags,raw){
      const list=Array.isArray(tags)?tags:[];
      const tag=String(raw||'').trim(); if(!tag)return list;
      const existing=forkSheetTagOptions({exerciseTags:list}).find(v=>v.toLowerCase()===tag.toLowerCase());
      const selected=existing||tag;
      return list.includes(selected)?list:[...list,selected];
    }
    function syncForkTargetsSheet(item){
      const sheet=forkTargetsSheetEl(); if(!sheet)return;
       



      forkTargetsRangeError(sheet,'');
      const p=item?.progression||{};
       


      const ex0=typeof resolveExercise==='function'?resolveExercise(item?.exerciseId):null;
      const sel=forkTargetsSelectedState(p,exerciseTracking(item,ex0)==='time');
      const key=sel.presetKey;
       





      const pickerRoot=sheet.querySelector('.fork-range-picker');
      if(pickerRoot)forkRepRangePickerPaint(pickerRoot,forkTargetsPickerCustomPick?{preset:null,custom:true}:{preset:key||null,custom:sel.customSelected});
       

       



      const ex=typeof resolveExercise==='function'?resolveExercise(item?.exerciseId):null;
      const tracking=exerciseTracking(item,ex);
      const time=tracking==='time';
      const presets=sheet.querySelector('#forkTargetsPresets'); if(presets)presets.hidden=time;
      const rangeLabel=sheet.querySelector('#forkTargetsRangeLabel'); if(rangeLabel)rangeLabel.textContent=time?'Time range':'Rep range';
      const mn=sheet.querySelector('#forkTargetsMin'),mx=sheet.querySelector('#forkTargetsMax');
      if(mn){mn.value=time?(p.timeMin??''):(p.min??'');const lab=mn.closest('label')?.querySelector('span');if(lab)lab.textContent=time?'Min sec':'Min reps';}
      if(mx){mx.value=time?(p.timeMax??''):(p.max??'');const lab=mx.closest('label')?.querySelector('span');if(lab)lab.textContent=time?'Max sec':'Max reps';}
       




       





      const trackSec=sheet.querySelector('#forkTargetsTracking');
      const trackExtra=sheet.querySelector('#forkSheetTrackingExtra');
      if(trackSec)trackSec.hidden=tracking==='distance'&&!!trackExtra&&!trackExtra.children.length;
      const trackSeg=sheet.querySelector('#forkTargetsTrackingSeg'); if(trackSeg)trackSeg.hidden=tracking==='distance';
      sheet.querySelectorAll('[data-fork-tracking]').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.forkTracking==='seconds')===time)));
       





      const onBtn=sheet.querySelector('[data-fork-prog-on]'); if(onBtn){onBtn.setAttribute('aria-pressed',String(p.scheme!=='off'));onBtn.setAttribute('aria-label',`Progression suggestions for this exercise ${p.scheme!=='off'?'on':'off'}`);}
      const roBtn=sheet.querySelector('[data-fork-prog-repsonly]'); if(roBtn){roBtn.setAttribute('aria-pressed',String(!!p.repsOnly));roBtn.setAttribute('aria-label',`Reps-only progression ${p.repsOnly?'on':'off'}`);}
       



      const sch=resolvedExerciseSchemeWithSource(item);
      sheet.querySelectorAll('[data-fork-prog-exscheme]').forEach(b=>{
        const v=b.dataset.forkProgExscheme;
        b.setAttribute('aria-pressed',String(sch.own?v===sch.own:v==='inherit'));
      });
      const schNote=sheet.querySelector('#forkProgSchemeNote');
      if(schNote)schNote.textContent=sch.own
        ?`This exercise overrides the ${sch.inheritedFrom==='program'?'program':'app default'} scheme (${forkSchemeLabel(sch.inherited)}).`
        :`Using the ${sch.inheritedFrom==='program'?'program':'app default'} scheme (${forkSchemeLabel(sch.inherited)}). Pick a scheme to override it for this exercise only.`;
      forkSyncSheetTags(item);
    }
     












    function forkSyncSheetTags(item){
      const sheet=forkTargetsSheetEl(); if(!sheet)return;
      const tagsEl=sheet.querySelector('#forkTargetsTags'); if(!tagsEl)return;
      const selected=item?.exerciseTags||[]; const options=forkSheetTagOptions(item);
      tagsEl.innerHTML=options.length?options.map(t=>`<button class="exercise-tag-chip fork-tag-toggle" type="button" data-fork-sheet-tag="${escapeHtml(t)}" aria-pressed="${selected.includes(t)}">${escapeHtml(t)}</button>`).join(''):'<span class="fork-sheet-notags">No tags yet</span>';
    }
     


































    let forkSheetSession=null;  
     









    let forkTargetsPickerCustomPick=false;
     




    function forkTargetsRangeError(sheet,msg){
      const err=sheet?sheet.querySelector('#forkTargetsRangeError'):null;
      if(!err)return;
      err.textContent=msg||'';
      err.hidden=!msg;
    }
     

















    function forkTargetsPickerAdapter(sheet){
      const resolveItem=()=>{
        const a=forkTargetsHosts[sheet.dataset.host];
        return a&&typeof a.resolve==='function'?a.resolve(sheet.dataset.uid):null;
      };
      const timeOf=item=>exerciseTracking(item,typeof resolveExercise==='function'?resolveExercise(item.exerciseId):null)==='time';
      return {
        tileAttr:'data-fork-target-preset',minId:'forkTargetsMin',maxId:'forkTargetsMax',
        selection(){
          const item=resolveItem(); if(!item)return {preset:null,custom:false};
          if(forkTargetsPickerCustomPick)return {preset:null,custom:true};
          const sel=forkTargetsSelectedState(item.progression||{},timeOf(item));
          return {preset:sel.presetKey||null,custom:sel.customSelected};
        },
        onPreset(key){
          const item=resolveItem(); if(!item)return undefined;
          forkTargetsPickerCustomPick=false;
          const msg=forkApplyTargets(item,{preset:key,time:timeOf(item)});
          if(!msg)return undefined;
          syncForkTargetsSheet(item);
          forkSheetApplied(item,'range');
          return 'selected';
        },
        onCustom(){ forkTargetsPickerCustomPick=true; },
        onFieldInput(){ forkTargetsPickerCustomPick=true; },
        onFieldChange(){
          const item=resolveItem(); if(!item)return;
          const mnEl=sheet.querySelector('#forkTargetsMin'),mxEl=sheet.querySelector('#forkTargetsMax');
           




          if(mnEl&&mxEl&&mnEl.value!==''&&mxEl.value!==''){
            const lo=Number(mnEl.value),hi=Number(mxEl.value);
            if(Number.isFinite(lo)&&Number.isFinite(hi)&&hi<lo)mxEl.value=String(Math.round(lo));
          }
          const msg=forkApplyTargets(item,{min:mnEl?.value,max:mxEl?.value,time:timeOf(item)});
          if(msg){ syncForkTargetsSheet(item); forkSheetApplied(item,'range'); return; }
           



          forkTargetsRangeError(sheet,'Custom range needs a minimum of 1 and a maximum at or above it.');
        },
      };
    }
     



    function forkSheetLiveItem(){
      if(!forkSheetSession)return null;
      const adapter=forkTargetsHosts[forkSheetSession.host];
      return adapter&&typeof adapter.resolve==='function'?adapter.resolve(forkSheetSession.uid):null;
    }
     




    function forkSheetApplied(item,kind){
      if(!item||!forkSheetSession)return;
      const adapter=forkTargetsHosts[forkSheetSession.host];
      if(adapter&&typeof adapter.afterChange==='function')adapter.afterChange(item,null,kind||'');
    }
     
































    function forkSheetProgressionHidden(host){
      return true;
    }
     


















     





    function forkSheetTargetsHidden(host){
      return false;
    }
    function openForkTargetsSheet(uid,host,item,exName){
      const sheet=forkTargetsSheetEl(); if(!sheet||!item)return;
      wireForkTargetsSheetOnce();
      sheet.dataset.uid=uid; sheet.dataset.host=host;
      const nameEl=sheet.querySelector('#forkTargetsName'); if(nameEl)nameEl.textContent=exName||'Exercise';
       





      forkSheetSession={uid,host};
      forkTargetsPickerCustomPick=false;  
      syncForkTargetsSheet(item);
      forkRenderSheetAdvanced(item,host);
       






       



      sheet.querySelectorAll('[data-fork-sheet-section]').forEach(sec=>{sec.open=forkSheetSectionOpen(sec.dataset.forkSheetSection);});
       





















      const progSec=sheet.querySelector('[data-fork-sheet-section="progression"]');
      if(progSec){
        progSec.hidden=false;
        progSec.querySelectorAll?.('[data-fork-prog-rest]')?.forEach(el=>{el.hidden=forkSheetProgressionHidden(host);});
      }
      const tpHidden=forkSheetTargetsHidden(host);
      ['targets'].forEach(name=>{const sec=sheet.querySelector(`[data-fork-sheet-section="${name}"]`);if(sec)sec.hidden=tpHidden;});
      sheet.showModal();
       




    }
     

















    function forkRenderSheetAdvanced(item,host){
      const sheet=forkTargetsSheetEl(); if(!sheet)return;
      const adv=sheet.querySelector('#forkSheetAdvanced');
      if(!adv||typeof progressionSummaryForOptions!=='function')return;
      adv.innerHTML=progressionSummaryForOptions(item);
       














      adv.querySelectorAll('.prog-reps-only-row').forEach(el=>el.remove());
      const settled=()=>{forkSheetApplied(item,'progression');forkRenderSheetAdvanced(item,host);};
      const settledTracking=()=>{forkSheetApplied(item,'tracking');forkRenderSheetAdvanced(item,host);};
      if(typeof wireOnermOptionInputs==='function')wireOnermOptionInputs(adv,()=>item,settled);
      if(typeof wireExerciseThresholdPills==='function')wireExerciseThresholdPills(adv,()=>item,settled);
      if(typeof wireForkIncrementInputs==='function')wireForkIncrementInputs(adv,()=>item,settled);
       















      const trackHost=forkSheetTrackingExtraHost(sheet);
      if(trackHost){
        trackHost.innerHTML='';
        forkMoveSheetRow(adv,trackHost,'.prog-single-side-row');
         

        forkMoveSheetRow(adv,trackHost,'.prog-db-setup-row');
        if(typeof wireDbSetupToggle==='function')wireDbSetupToggle(trackHost,()=>item,settledTracking);
        if(typeof wireSingleSideToggle==='function')wireSingleSideToggle(trackHost,()=>item,settledTracking);
      }else{
        if(typeof wireDbSetupToggle==='function')wireDbSetupToggle(adv,()=>item,settledTracking);
        if(typeof wireSingleSideToggle==='function')wireSingleSideToggle(adv,()=>item,settledTracking);
      }
    }
     





    function forkSheetTrackingExtraHost(sheet){
      const body=sheet?sheet.querySelector('[data-fork-sheet-section="tracking"] .fork-sheet-section-body'):null;
      if(!body)return null;
      let host=body.querySelector('#forkSheetTrackingExtra');
      if(!host){
        if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
        host=document.createElement('div');
        host.id='forkSheetTrackingExtra';
        body.appendChild(host);
      }
      return host;
    }
     







    function forkMoveSheetRow(from,to,rowSel){
      const row=from.querySelector(rowSel); if(!row||!to)return;
      const next=row.nextElementSibling;
      const note=next&&next.classList.contains('prog-note')?next:null;
      to.appendChild(row);
      if(note)to.appendChild(note);
    }
     





    function forkApplyTargets(item,choice){
      if(!item||!choice)return '';
      const p={...(item.progression||{})};
       



      if(choice.time){
        if(choice.preset)return '';
        if(choice.min!=null||choice.max!=null){
          const lo=Math.round(Number(choice.min)),hi=Math.round(Number(choice.max));
          if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo<1||hi<lo)return '';
          p.timeMin=lo;p.timeMax=hi;p.custom=true;delete p.preset;delete p.rangeSource;
          item.progression=p;
          return `Targets set to ${forkRangePairText(lo,hi)} seconds`;
        }
        return '';
      }
      if(choice.preset&&typeof REP_PRESETS!=='undefined'&&REP_PRESETS[choice.preset]){
        const r=REP_PRESETS[choice.preset];
        p.min=r.min;p.max=r.max;p.openTop=!!r.openTop;p.amrap=!!r.amrap;p.custom=true;delete p.preset;delete p.rangeSource;
        item.progression=p;
        return `Targets set to ${r.label} (${r.amrap?'as many as possible':r.max==null?`${r.min}+ reps`:forkRangeLabel(r.min,r.max,'reps')})`;
      }
      if(choice.min!=null||choice.max!=null){
         



        const blankMax=choice.max==null||choice.max==='';
        const lo=Math.round(Number(choice.min));
        let hi=blankMax?lo:Math.round(Number(choice.max));
        if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo<1||hi<lo)return '';
        if(blankMax)hi=null;
        p.min=lo;p.max=hi;p.openTop=false;p.amrap=false;p.custom=true;delete p.preset;delete p.rangeSource;
        item.progression=p;
        return `Targets set to ${hi==null?`${lo}+ reps`:forkRangeLabel(lo,hi,'reps')}`;
      }
      return '';
    }
     



    function forkApplyProgressionFlags(item,flags){
      if(!item||!flags)return '';
      const p={...(item.progression||{})};
      const msgs=[];
      if('on' in flags){
        if(flags.on===false&&p.scheme!=='off'){p.scheme='off';msgs.push('Progression off for this exercise');}
        else if(flags.on===true&&p.scheme==='off'){delete p.scheme;msgs.push('Progression on for this exercise');}
      }
      if('repsOnly' in flags&&!!p.repsOnly!==!!flags.repsOnly){
        p.repsOnly=!!flags.repsOnly;
        msgs.push(flags.repsOnly?'Reps only: reps climb, weight stays put':'Reps and weight progression');
      }
       







      if('scheme' in flags){
        const want=flags.scheme;
        if(want==='inherit'){
          if(['linear','rpe','onerm'].includes(p.scheme)){delete p.scheme;msgs.push('Progression scheme follows the program');}
        }else if(['linear','rpe','onerm'].includes(want)&&p.scheme!==want){
          p.scheme=want;
          msgs.push(`Progression scheme: ${forkSchemeLabel(want)} for this exercise`);
        }
      }
      if(!msgs.length)return '';
      item.progression=p;
      return msgs.join(' – ');
    }
     











    const FORK_PROG_FIELDS=['scheme','threshold','incrementType','incrementValue','percentOf1RM','advanceOnCompletion'];
     

    function forkResolveProgValues(own,program){
      const d=(typeof progressionSetup!=='undefined'&&progressionSetup)||{};
      const pick=k=>own&&own[k]!=null?own[k]:(program&&program[k]!=null?program[k]:d[k]);
      return {
        scheme:pick('scheme')||'linear',
        threshold:pick('threshold')??8,
        incrementType:pick('incrementType')||'lb',
        incrementValue:pick('incrementValue')??5,
        percentOf1RM:pick('percentOf1RM')??75,
      };
    }
     




    function forkProgressionSummaryText(values){
      const v=values||{};
      const inc=v.incrementType==='percent'?`+${v.incrementValue??5}%`:`+${v.incrementValue??5} ${typeof weightUnit==='function'?weightUnit():'lb'}`;
      if(v.scheme==='onerm')return `%1RM (${v.percentOf1RM??75}%)`;
      if(v.scheme==='rpe')return v.threshold==='completion'?`RPE (advances on completion, ${inc})`:`RPE (top set ≤ ${v.threshold??8}, ${inc})`;
      return `Linear (${inc})`;
    }
     


    function forkProgValuesDiffer(a,b){
      if(!a||!b)return false;
      return String(a.scheme)!==String(b.scheme)||String(a.incrementType)!==String(b.incrementType)
        ||String(a.threshold)!==String(b.threshold)
        ||Number(a.incrementValue)!==Number(b.incrementValue)||Number(a.percentOf1RM)!==Number(b.percentOf1RM);
    }
     



    function forkSanitizeWorkoutProgression(own){
      if(!own||typeof own!=='object')return null;
      const out={};
      if(['rpe','linear','onerm'].includes(own.scheme))out.scheme=own.scheme;
      if(own.threshold==='completion')out.threshold='completion';
      else if(Number.isFinite(Number(own.threshold))&&Number(own.threshold)>=1&&Number(own.threshold)<=10)out.threshold=Number(own.threshold);
      if(own.incrementType==='lb'||own.incrementType==='percent')out.incrementType=own.incrementType;
      if(Number.isFinite(Number(own.incrementValue))&&Number(own.incrementValue)>0)out.incrementValue=Number(own.incrementValue);
      if(own.percentOf1RM!=null&&typeof clampPct1RM==='function')out.percentOf1RM=clampPct1RM(own.percentOf1RM);
      if(own.advanceOnCompletion!=null)out.advanceOnCompletion=!!own.advanceOnCompletion;
      return Object.keys(out).length?out:null;
    }
     







     


    function forkFocusProgSet(stage,key,value){
      if(!stage)return;
      if(!stage.prog)stage.prog={};
      stage.prog[key]=value;
    }
     






    function forkSyncFocusProgControls(stage,program){
      const sheet=typeof document!=='undefined'?document.querySelector('#forkFocusSheet'):null;
      if(!sheet||!stage)return;
      const programProg=program?.progression||null;
      const own=stage.prog||null;
      const values=forkResolveProgValues(own,programProg);
      sheet.querySelectorAll('[data-fork-prog-scheme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.forkProgScheme===values.scheme)));
      sheet.querySelectorAll('[data-fork-prog-threshold]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.forkProgThreshold===String(values.threshold))));
      const desc=sheet.querySelector('#forkFocusProgSchemeDesc');
      if(desc&&typeof schemeDescription==='function')desc.textContent=schemeDescription(values.scheme);
      const trig=sheet.querySelector('#forkFocusProgTriggerRow'); if(trig)trig.hidden=values.scheme!=='rpe';
      const incPair=sheet.querySelector('#forkFocusProgIncPair'); if(incPair)incPair.hidden=values.scheme==='onerm';
      const pctRow=sheet.querySelector('#forkFocusProgPctRow'); if(pctRow)pctRow.hidden=values.scheme!=='onerm';
      const doc=typeof document!=='undefined'?document:null;
      const it=sheet.querySelector('#forkFocusProgIncType'); if(it&&doc&&doc.activeElement!==it)it.value=values.incrementType;
      const iv=sheet.querySelector('#forkFocusProgIncValue'); if(iv&&doc&&doc.activeElement!==iv)iv.value=values.incrementValue;
      const pc=sheet.querySelector('#forkFocusProgPct'); if(pc&&doc&&doc.activeElement!==pc)pc.value=values.percentOf1RM;
      const src=sheet.querySelector('#forkFocusProgSource');
      if(src)src.textContent=own?'This workout has its own progression settings.':(program?'Using the program\'s progression settings.':'Using the app default progression settings.');
      const clear=sheet.querySelector('#forkFocusProgClear');
      if(clear){clear.hidden=!own;clear.textContent=program?'Use program settings':'Use app defaults';}
      const gov=sheet.querySelector('#forkFocusProgGovern');
      if(gov){
        const progValues=forkResolveProgValues(programProg,null);
        const show=!!(program&&own&&forkProgValuesDiffer(values,progValues));
        gov.hidden=!show;
        if(show)gov.textContent=`Program settings apply: ${forkProgressionSummaryText(progValues)}. This workout's own: ${forkProgressionSummaryText(values)}.`;
      }
    }
    let forkTargetsSheetWired=false;
     



















    const FORK_SHEET_SECTION_ORDER=['tracking','targets','tags','progression'];
    function forkReorderSheetSections(sheet){
      if(!sheet||typeof sheet.querySelector!=='function')return;
      const scroll=sheet.querySelector('.fork-sheet-scroll');
      if(!scroll||typeof scroll.appendChild!=='function')return;
      const byName={};
      sheet.querySelectorAll('[data-fork-sheet-section]').forEach(sec=>{byName[sec.dataset.forkSheetSection]=sec;});
      FORK_SHEET_SECTION_ORDER.forEach(name=>{ if(byName[name])scroll.appendChild(byName[name]); });
       



      const progBody=sheet.querySelector('[data-fork-sheet-section="progression"] .fork-sheet-section-body');
      if(progBody&&typeof document!=='undefined'&&typeof document.createElement==='function'&&!progBody.querySelector('.fork-prog-override-note')){
        const note=document.createElement('p');
        note.className='field-help fork-prog-override-note';
        note.textContent='Per-exercise override of the program default.';
        progBody.insertBefore(note,progBody.firstChild);
      }
    }
    function wireForkTargetsSheetOnce(){
      if(forkTargetsSheetWired||typeof document==='undefined'||!document.addEventListener)return;
      forkTargetsSheetWired=true;
      const sheet0=forkTargetsSheetEl();
      forkReorderSheetSections(sheet0);
       




      const pickerHost=sheet0?.querySelector('#forkTargetsPickerHost');
      if(pickerHost&&!pickerHost.dataset.forkPickerReady){
        pickerHost.innerHTML=forkRepRangePickerHtml({tileAttr:'data-fork-target-preset',gridId:'forkTargetsPresets',minId:'forkTargetsMin',maxId:'forkTargetsMax',ariaLabel:'Target range presets'});
        pickerHost.dataset.forkPickerReady='1';
      }
       




      if(sheet0&&typeof sheet0.addEventListener==='function')sheet0.addEventListener('toggle',event=>{
        const sec=event.target;
        if(sec&&sec.dataset&&sec.dataset.forkSheetSection)forkSaveSheetSectionOpen(sec.dataset.forkSheetSection,!!sec.open);
      },true);
      if(sheet0&&typeof sheet0.addEventListener==='function')sheet0.addEventListener('close',()=>{
         






        forkSheetSession=null;
        forkTargetsPickerCustomPick=false;  
      });
       


      if(sheet0&&typeof sheet0.addEventListener==='function')sheet0.addEventListener('keydown',event=>{
        if(event.key!=='Enter'||event.target?.id!=='forkTargetsNewTag')return;
        event.preventDefault();
        sheet0.querySelector('#forkTargetsAddTag')?.click();
      });
      document.addEventListener('click',event=>{
        const sheet=forkTargetsSheetEl(); if(!sheet||!sheet.open)return;
         




        if(event.target===sheet){sheet.close();return;}
        if(event.target?.closest?.('#forkTargetsClose')){sheet.close();return;}
         












        const tagChip=event.target?.closest?.('[data-fork-sheet-tag]');
        const tagAddBtn=event.target?.closest?.('#forkTargetsAddTag');
        if(tagChip||tagAddBtn){
          const tagAdapter=forkTargetsHosts[sheet.dataset.host];
          const tagItem=tagAdapter?tagAdapter.resolve(sheet.dataset.uid):null;
          if(!tagItem)return;
          if(tagChip){
            const tag=tagChip.dataset.forkSheetTag;
            tagItem.exerciseTags=forkToggleExerciseTag(tagItem.exerciseTags,tag);
            tagChip.setAttribute('aria-pressed',String(tagItem.exerciseTags.includes(tag)));
          }else{
            const input=sheet.querySelector('#forkTargetsNewTag');
            const current=tagItem.exerciseTags||[];
            const next=forkAddExerciseTag(current,input?input.value:'');
            if(next===current)return;  
            tagItem.exerciseTags=next;
            if(input)input.value='';
            forkSyncSheetTags(tagItem);
          }
          forkSheetApplied(tagItem,'tags');
          return;
        }
         





        if(event.target?.closest?.('[data-fork-target-preset]')||event.target?.closest?.('[data-fork-range-custom]')){
          const pickerRoot=sheet.querySelector('.fork-range-picker');
          if(pickerRoot&&forkTargetsHosts[sheet.dataset.host])forkRepRangePickerRoute(pickerRoot,event,forkTargetsPickerAdapter(sheet));
          return;
        }
        const trackingBtn=event.target?.closest?.('[data-fork-tracking]');
        const progOnBtn=event.target?.closest?.('[data-fork-prog-on]');
        const repsOnlyBtn=event.target?.closest?.('[data-fork-prog-repsonly]');
        const schemeBtn=event.target?.closest?.('[data-fork-prog-exscheme]');
        if(!trackingBtn&&!progOnBtn&&!repsOnlyBtn&&!schemeBtn)return;
        const adapter=forkTargetsHosts[sheet.dataset.host];
        if(!adapter)return;
         



        const item=adapter.resolve(sheet.dataset.uid); if(!item)return;
        const time=exerciseTracking(item,typeof resolveExercise==='function'?resolveExercise(item.exerciseId):null)==='time';
        let msg='',kind='';
        if(trackingBtn){
           



          const mode=trackingBtn.dataset.forkTracking;
          if(!setExerciseTracking(item,mode,{resetCompletion:sheet.dataset.host==='live'}))return;
          msg=mode==='seconds'?'Now tracking seconds. Entered values are kept':'Now tracking reps. Entered values are kept';
          kind='tracking';
        }
        else if(progOnBtn){ msg=forkApplyProgressionFlags(item,{on:progOnBtn.getAttribute('aria-pressed')!=='true'}); kind='progression'; }
        else if(repsOnlyBtn){ msg=forkApplyProgressionFlags(item,{repsOnly:repsOnlyBtn.getAttribute('aria-pressed')!=='true'}); kind='progression'; }
        else if(schemeBtn){ msg=forkApplyProgressionFlags(item,{scheme:schemeBtn.dataset.forkProgExscheme}); kind='progression'; }
        if(msg){
          syncForkTargetsSheet(item);
           





          forkSheetApplied(item,kind);
        }
      });
       





      ['input','change'].forEach(type=>document.addEventListener(type,event=>{
        const sheet=forkTargetsSheetEl(); if(!sheet||!sheet.open)return;
        if(event.target?.id!=='forkTargetsMin'&&event.target?.id!=='forkTargetsMax')return;
        const pickerRoot=sheet.querySelector('.fork-range-picker');
        if(pickerRoot&&forkTargetsHosts[sheet.dataset.host])forkRepRangePickerRoute(pickerRoot,event,forkTargetsPickerAdapter(sheet));
      }));
    }
     





     



    function wireOnermOptionInputs(scope, findItem, afterChange){
      if(!scope || typeof findItem !== 'function') return;
      scope.querySelectorAll('[data-onerm-pct]').forEach(input => input.addEventListener('change', () => {
        const item = findItem(input.dataset.onermPct); if(!item) return;
        const p = item.progression || (item.progression = {});
        const v = Number(input.value);
        if(input.value.trim() === '' || !Number.isFinite(v) || v <= 0) delete p.percentOf1RM;
        else p.percentOf1RM = clampPct1RM(v);
        if(afterChange) afterChange(item);
        schedulePersist();
      }));
      scope.querySelectorAll('[data-onerm-tm]').forEach(input => input.addEventListener('change', () => {
        const item = findItem(input.dataset.onermTm); if(!item) return;
        const p = item.progression || (item.progression = {});
        const v = Number(input.value);
        if(input.value.trim() === '' || !Number.isFinite(v) || v <= 0){ delete p.trainingMax; delete p.tmSource; }
         


        else{ p.trainingMax = Math.max(1, Math.round(Number(dbStorageWeight(input.value,item.exerciseId,item,pairImplementExercise(typeof resolveExercise==='function'?resolveExercise(item.exerciseId):null))) * 10) / 10); p.tmSource = 'manual'; }
        if(afterChange) afterChange(item);
        schedulePersist();
      }));
    }
     














    function wireDbSetupToggle(scope, findItem, afterChange){
      if(!scope || typeof findItem !== 'function') return;
      scope.querySelectorAll('[data-db-setup]').forEach(btn => btn.addEventListener('click', () => {
        const state=btn.dataset.dbSetup; if(state!=='one'&&state!=='pair-per'&&state!=='pair-total')return;
        const item = findItem(btn.dataset.dbSetupUid); if(!item) return;
        if(forkDbSetupState(item.exerciseId,item)===state)return;
        if(!forkApplyDbSetup(item,state))return;
        if(afterChange) afterChange(item);
        schedulePersist();
      }));
    }
     





    function wireDbSingleToggle(scope, findItem, afterChange){
      wireDbSetupToggle(scope, findItem, afterChange);
    }
     
















    function wireSingleSideToggle(scope, findItem, afterChange){
      if(!scope || typeof findItem !== 'function') return;
      scope.querySelectorAll('[data-single-side-mode]').forEach(btn => btn.addEventListener('click', () => {
        const mode=btn.dataset.singleSideMode; if(mode!=='both'&&mode!=='single')return;
        const item = findItem(btn.dataset.singleSideUid); if(!item) return;
        const next=mode==='single';
        if(singleSideEnabled(item.exerciseId,item)===next)return;
        const p = item.progression || (item.progression = {});
        p.singleSide = next;
        if(typeof progressionSetup!=='undefined'){
          progressionSetup.singleSidePrefs=progressionSetup.singleSidePrefs||{};
          if(item.exerciseId)progressionSetup.singleSidePrefs[item.exerciseId]=next;
        }
        applySingleSideToSets(item,next);
        if(afterChange) afterChange(item);
        schedulePersist();
      }));
    }
     


    function wireRepsOnlyToggle(scope, findItem, afterChange){
      if(!scope || typeof findItem !== 'function') return;
      scope.querySelectorAll('[data-reps-only-toggle]').forEach(btn => btn.addEventListener('click', () => {
        const item = findItem(btn.dataset.repsOnlyToggle); if(!item) return;
        const p = item.progression || (item.progression = {});
        p.repsOnly = !p.repsOnly;
        if(afterChange) afterChange(item);
        schedulePersist();
      }));
    }
     




     



    function wireForkIncrementInputs(scope, findItem, afterChange){
      if(!scope || typeof findItem !== 'function') return;
      scope.querySelectorAll('[data-fork-increment]').forEach(input => input.addEventListener('change', () => {
        const item = findItem(input.dataset.forkIncrement); if(!item) return;
        const p = { ...(item.progression || {}) };
        const v = Number(input.value);
         
        if (input.value !== '' && Number.isFinite(v) && v > 0) { p.incrementValue = v; p.incrementExplicit = true; } else { delete p.incrementValue; p.incrementExplicit = false; }
        item.progression = p;
        if(afterChange) afterChange(item);
      }));
    }
     



    function wireExerciseThresholdPills(scope, findItem, afterChange){
      if(!scope || typeof findItem !== 'function') return;
      scope.querySelectorAll('[data-ex-threshold]').forEach(btn => btn.addEventListener('click', () => {
        const item = findItem(btn.dataset.exThresholdUid); if(!item) return;
        const v = btn.dataset.exThreshold;
        const p = item.progression || (item.progression = {});
        p.threshold = v === 'completion' ? 'completion' : Number(v);
        if(afterChange) afterChange(item);
        schedulePersist();
      }));
    }
     








    function wireDbEntryToggle(scope, findItem, afterChange){
      wireDbSetupToggle(scope, findItem, afterChange);
    }
     



    function setExerciseTracking(item, next, {resetCompletion=false}={}){
      const mode=next==='seconds'?'time':'reps';
      const ex=resolveExercise(item.exerciseId);
      if(exerciseTracking(item,ex)===mode)return false;
      item.tracking=mode;
      item.progression={...progressionProfileForDraftItem(item),mode};
      if(resetCompletion)item.sets.forEach(set=>{set.complete=false;});
      return true;
    }
     




    function sanitizeSetValue(field, raw){
      if(raw==null||raw==='')return null;
      const n=Number(raw);
      if(!Number.isFinite(n))return null;
      switch(field){
        case 'w': return clamp(n,0,5000);
        case 'r': return clamp(Math.round(n),0,100000);
        case 'seconds': return clamp(n,0,SECONDS_PER_DAY);
        case 'distance': return clamp(n,0,1000000);
        case 'rpe': return clamp(n,0,10);
        default: return n;
      }
    }

     




    function clampSetTargetValue(field, raw){
      if(raw==null)return '';
      const v=String(raw).trim();
      if(v==='')return '';
      const n=sanitizeSetValue(field, v);
      return n==null?'':String(n);
    }
     









    const NAME_MAX_LENGTH=80;
    function clampNameLength(name){
      return String(name==null?'':name).slice(0,NAME_MAX_LENGTH);
    }

     


    function safeDecodeHash(){
      try{return decodeURIComponent((location.hash||'').slice(1));}
      catch(_){return (location.hash||'').slice(1);}
    }
//# sourceMappingURL=utilities.js.map
