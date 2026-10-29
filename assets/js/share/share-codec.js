 
     















        
     













    const SHARE_VERSION=2, SHARE_LEGACY_VERSION=1;
     





    function shareEncodeV1(obj){
      return btoa(unescape(encodeURIComponent(JSON.stringify(obj))))
        .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    }
     
    function shareDecodeV1(str){
      return JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g,'+').replace(/_/g,'/')))));
    }
     




    function b64urlEncodeBytes(bytes){
      let bin='';const CH=0x8000;
      for(let i=0;i<bytes.length;i+=CH)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+CH));
      return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    }
     
    function b64urlDecodeToBytes(str){
      const bin=atob(str.replace(/-/g,'+').replace(/_/g,'/'));
      const bytes=new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
      return bytes;
    }
     



    async function deflateBytes(bytes){
      const rs=new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'));
      return new Uint8Array(await new Response(rs).arrayBuffer());
    }
     






    const SHARE_MAX_INFLATED_BYTES=16*1024*1024;
     
    async function inflateBytes(bytes){
      const rs=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
      const reader=rs.getReader();
      const chunks=[];let total=0;
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        total+=value.byteLength;
        if(total>SHARE_MAX_INFLATED_BYTES){try{await reader.cancel();}catch(_){}throw new Error('share payload exceeds the size cap');}
        chunks.push(value);
      }
      const out=new Uint8Array(total);
      let off=0;
      for(const c of chunks){out.set(c,off);off+=c.byteLength;}
      return out;
    }
     


































     

    function slimShareSet(s){
      const tr=cleanTargetRpe(s.targetRpe);
      const a=[(s.w!==''&&s.w!=null)?s.w:null,(s.r!==''&&s.r!=null)?s.r:null,
        (s.seconds!==''&&s.seconds!=null)?s.seconds:null,(s.rpe!==''&&s.rpe!=null)?s.rpe:null,
        (s.tags&&s.tags.length)?[...s.tags]:null,tr!==''?tr:null,
        (s.distance!==''&&s.distance!=null)?s.distance:null];
      while(a.length&&a[a.length-1]==null)a.pop();
      return a;
    }
     
    function slimShareProgression(p){
      if(!p)return undefined;
      const o={};
      if(p.mode&&p.mode!=='reps')o.d=p.mode;
      if(p.min!=null||p.max!=null)o.r=[p.min??null,p.max??null];
      if(p.openTop)o.o=1;
      if(p.amrap)o.a=1;
      if((p.timeMin??30)!==30||(p.timeMax??60)!==60)o.t=[p.timeMin??30,p.timeMax??60];
      if(p.timeStep!=null)o.s=p.timeStep;
      if(p.incrementType||p.incrementValue!=null)o.i=[p.incrementType??null,p.incrementValue??null];
      if(p.repsOnly)o.l=1;
      if(p.custom)o.c=1;
      if(p.scheme&&p.scheme!=='rpe')o.m=p.scheme;
      if(p.percentOf1RM!=null)o.p=p.percentOf1RM;
      if(p.trainingMax!=null)o.x=p.trainingMax;
      if(p.tmSource)o.u=p.tmSource;
       


      if(typeof p.singleSide==='boolean')o.y=p.singleSide?1:0;
      return o;
    }
     



    function slimShareExercise(item,slimmingVariant=false){
      const o={i:item.exerciseId};
      if(item.tracking&&item.tracking!=='reps')o.k=item.tracking;
       

      if(Array.isArray(item.metrics)&&item.metrics.includes('distance'))o.m=[...item.metrics];
      if(item.note)o.o=item.note;
      if(item.exerciseTags&&item.exerciseTags.length)o.g=[...item.exerciseTags];
      if(item.supersetId)o.u=item.supersetId;
      const p=slimShareProgression(item.progression);
      if(p&&Object.keys(p).length)o.p=p;
       



      o.e=(item.sets||[]).map(s=>{const a=slimShareSet(s);const sd=(typeof setSide==='function')?setSide(s):null;if(sd){while(a.length<7)a.push(null);a.push(sd);} const pv=Number(s&&s.pct);if(Number.isFinite(pv)&&pv>0){while(a.length<8)a.push(null);a.push(pv);} if(typeof isAmrapSet==='function'&&isAmrapSet(s)){while(a.length<9)a.push(null);a.push(1);} if(typeof isFixedSet==='function'&&isFixedSet(s)){while(a.length<10)a.push(null);a.push(1);}return a;});
       



      if(!slimmingVariant&&item.weekVariants&&typeof item.weekVariants==='object'&&!Array.isArray(item.weekVariants)){
        const z={};
        for(const k of Object.keys(item.weekVariants)){
          const wk=Math.floor(Number(k));
          const v=item.weekVariants[k];
          if(!Number.isInteger(wk)||wk<1||wk>52||!v||typeof v!=='object'||!v.exerciseId)continue;
          z[String(wk)]=slimShareExercise(v,true);
        }
        if(Object.keys(z).length)o.z=z;
      }
      return o;
    }
     



    function slimShareWorkoutSet(s){
      const a=slimShareSet(s);
      if(s&&s.complete===false){while(a.length<7)a.push(null);a.push(0);}
       

      const sd=(typeof setSide==='function')?setSide(s):null;
      if(sd){while(a.length<8)a.push(null);a.push(sd);}
       

      if(typeof isAmrapSet==='function'&&isAmrapSet(s)){while(a.length<9)a.push(null);a.push(1);}
       



      if(typeof isFixedSet==='function'&&isFixedSet(s)){while(a.length<10)a.push(null);a.push(1);}
      return a;
    }
     


    function slimShareWorkoutExercise(item){
      const o=slimShareExercise(item);
      o.e=(item.sets||[]).map(slimShareWorkoutSet);
      delete o.p;
       

      delete o.z;
      if(item.name)o.n=item.name;
      return o;
    }
     


    function slimSharePayload(payload){
      const slim={v:SHARE_VERSION,k:payload.kind==='template'?'t':payload.kind==='workout'?'w':'p',n:payload.name};
      if(payload.kind==='workout'){
        const src=payload.workout||{};
        const totals=src.totals||{};
        const w={d:src.date||'',v:totals.volume??0,s:totals.sets??0,
          e:(src.exercises||[]).map(slimShareWorkoutExercise)};
         





        if(totals.seconds!=null)w.t=totals.seconds;
        if(totals.distance!=null)w.x=totals.distance;
        if(src.prs&&src.prs.length)w.r=src.prs.map(pr=>[pr.name||'',pr.kind||'',pr.value||'']);
        slim.w=w;
      }else if(payload.kind==='template'){
        slim.e=(payload.template?.exercises||[]).map(slimShareExercise);
      }else{
        const src=payload.program||{};
        slim.p={n:src.name,l:src.length??null,s:src.startWeek??null,f:src.focus||null,
          g:src.progression||null,
          w:(src.workouts||[]).map(w=>{const wo={n:w.name,e:(w.template?.exercises||[]).map(slimShareExercise)};
            if(w.template?.name&&w.template.name!==w.name)wo.t=w.template.name;return wo;})};
         


        if(src.schedule)slim.p.d=src.schedule;
      }
      if(payload.customExercises&&payload.customExercises.length)slim.c=payload.customExercises;
      return slim;
    }
     
    function expandShareProgression(p){
      if(!p)return {};
      const o={};
      if(p.d)o.mode=p.d;
      if(p.r){o.min=p.r[0]??null;o.max=p.r[1]??null;}
      if(p.o)o.openTop=true;
      if(p.a)o.amrap=true;
      if(p.t){o.timeMin=p.t[0]??30;o.timeMax=p.t[1]??60;}
      if(p.s!=null)o.timeStep=p.s;
      if(p.i){o.incrementType=p.i[0]??null;o.incrementValue=p.i[1]??null;}
      if(p.l)o.repsOnly=true;
      if(p.c)o.custom=true;
      if(p.m)o.scheme=p.m;
      if(p.p!=null)o.percentOf1RM=p.p;
      if(p.x!=null)o.trainingMax=p.x;
      if(p.u)o.tmSource=p.u;
      if(p.y!=null)o.singleSide=!!p.y;
      return o;
    }
     


    function expandShareWorkoutSet(a){
      const arr=Array.isArray(a)?a:[];
      return {w:arr[0]??'',r:arr[1]??'',seconds:arr[2]??'',distance:arr[6]??'',
        rpe:arr[3]??'',tags:Array.isArray(arr[4])?[...arr[4]]:[],complete:arr[7]===0?false:true,
        ...(arr[8]==='L'||arr[8]==='R'?{side:arr[8]}:{}),...(arr[9]===1?{amrap:true}:{}),
         

        ...((arr[10]===1||arr[10]===true)?{fixed:true}:{})};
    }
     
    function expandShareWorkoutExercise(sitem){
      const o={exerciseId:sitem.i,name:sitem.n||'',sets:(sitem.e||[]).map(expandShareWorkoutSet)};
      if(sitem.k)o.tracking=sitem.k;
       





      if(Array.isArray(sitem.m)&&sitem.m.length&&sitem.m.every(m=>m==='load'||m==='reps'||m==='time'||m==='distance'))o.metrics=[...sitem.m];
      if(sitem.o)o.note=sitem.o;
      if(Array.isArray(sitem.g)&&sitem.g.length)o.exerciseTags=[...sitem.g];
      if(sitem.u)o.supersetId=sitem.u;
      return o;
    }
     


    function expandSharePayload(slim){
      const out={v:SHARE_VERSION,kind:slim.k==='p'?'program':slim.k==='w'?'workout':'template',name:slim.n,
        customExercises:slim.c?JSON.parse(JSON.stringify(slim.c)):[]};
       



      const expandEx=sitem=>cloneExerciseItemFromShare(sitem,p=>defaultExerciseProgression(expandShareProgression(p)));
      if(out.kind==='template'){
        out.template={name:slim.n,exercises:(slim.e||[]).map(expandEx)};
      }else if(out.kind==='workout'){
        const sw=slim.w||{};
        out.workout={name:slim.n,date:sw.d||'',durationSec:sw.u??null,
          totals:{volume:sw.v??0,sets:sw.s??0,
            ...(sw.t!=null?{seconds:sw.t}:{}),...(sw.x!=null?{distance:sw.x}:{})},
          prs:(Array.isArray(sw.r)?sw.r:[]).map(r=>({name:(r&&r[0])||'',kind:(r&&r[1])||'',value:(r&&r[2])||''})),
          exercises:(sw.e||[]).map(expandShareWorkoutExercise)};
      }else{
        const sp=slim.p||{};
        out.program={name:sp.n||slim.n,length:sp.l??4,startWeek:sp.s??1,
          focus:sp.f||'',schedule:sp.d||'',progression:sp.g||null,
          workouts:(sp.w||[]).map(w=>({name:w.n,
            template:{name:w.t||w.n,exercises:(w.e||[]).map(expandEx)}}))};
      }
      return out;
    }
     
    async function shareEncodeV2(payload){
      const bytes=await deflateBytes(new TextEncoder().encode(JSON.stringify(slimSharePayload(payload))));
      return b64urlEncodeBytes(bytes);
    }
     

    async function shareDecodeAny(str){
      try{
        const inflated=await inflateBytes(b64urlDecodeToBytes(str));
        const payload=JSON.parse(new TextDecoder().decode(inflated));
        if(payload&&payload.v===SHARE_VERSION)return expandSharePayload(payload);
      }catch(e){ }
      return shareDecodeV1(str);
    }
     
    function shareCustomExercises(exerciseRows){
      const ids=new Set();
       


      (exerciseRows||[]).forEach(row=>{
        if(!row)return;
        ids.add(row.exerciseId);
        if(row.weekVariants&&typeof row.weekVariants==='object')Object.values(row.weekVariants).forEach(v=>{if(v&&v.exerciseId)ids.add(v.exerciseId);});
      });
      return (state.customExercises||[]).filter(ex=>ids.has(ex.id)).map(ex=>({...ex}));
    }
     



    function buildTemplateLikeShare(name,exerciseRows){
      const rows=JSON.parse(JSON.stringify(exerciseRows||[]));
      return {v:SHARE_VERSION,kind:'template',name:name||'Shared workout',
        template:{name:name,exercises:rows},customExercises:shareCustomExercises(rows)};
    }
     

    function buildTemplateShare(templateId){
      const t=(workoutState.templates||[]).find(x=>x.id===templateId);
      if(!t)return null;
      return buildTemplateLikeShare(t.name,t.exercises||[]);
    }
     


    function buildProgramShareFrom(p){
      if(!p)return null;
       



      const program=JSON.parse(JSON.stringify({name:p.name,length:p.length,startWeek:p.startWeek,
        focus:p.focus||'',schedule:p.schedule||'',progression:p.progression||null,
        workouts:(p.workouts||[]).map(w=>({name:w.name,
          template:{name:w.template?.name,exercises:w.template?.exercises||[]}}))}));
      return {v:SHARE_VERSION,kind:'program',name:p.name||'Shared program',
        program,customExercises:shareCustomExercises(program.workouts.flatMap(w=>w.template.exercises))};
    }
     
    function buildProgramShare(){
      return buildProgramShareFrom(workoutState.activeProgram);
    }
     




    function workoutShareToTemplatePayload(payload){
      if(!payload||payload.kind!=='workout')return null;
      const w=payload.workout||{};
      const name=payload.name||w.name||'Shared workout';
      return {v:SHARE_VERSION,kind:'template',name,
        template:{name,exercises:(w.exercises||[]).map(item=>({
          exerciseId:item.exerciseId,tracking:item.tracking,note:item.note||'',
          exerciseTags:[...(item.exerciseTags||[])],supersetId:item.supersetId||null,progression:null,
          sets:(item.sets||[]).map(s=>({w:s.w??'',r:s.r??'',seconds:s.seconds??'',distance:s.distance??'',
            rpe:s.rpe??'',tags:[...(s.tags||[])],...((s.side==='L'||s.side==='R')?{side:s.side}:{}),
             


            ...((typeof isFixedSet==='function'&&isFixedSet(s))?{fixed:true}:{})}))}))},
        customExercises:payload.customExercises||[]};
    }
     
     




    const SHARE_MAX_EXERCISES=100, SHARE_MAX_SETS=100, SHARE_MAX_WORKOUTS=100,
      SHARE_MAX_NAME=200, SHARE_MAX_NOTE=2000, SHARE_MAX_ID=200,
      SHARE_MAX_TAGS=20, SHARE_MAX_TAG=50;
     
    function shareStrOk(v,max){return typeof v==='string'&&v.length<=max;}
     
    function shareNumOk(v){return v===''||v==null||Number.isFinite(Number(v));}
     
    function shareTagListOk(v){
      return v===undefined||v===null||(Array.isArray(v)&&v.length<=SHARE_MAX_TAGS&&v.every(t=>shareStrOk(t,SHARE_MAX_TAG)));
    }
     
    function validShareSet(s){
      if(!s||typeof s!=='object')return false;
      for(const k of ['w','r','seconds','distance']){
        const v=s[k];
        if(!shareNumOk(v))return false;
        if(v!==''&&v!=null&&Number(v)<0)return false;
      }
      for(const k of ['rpe','targetRpe']){
        const v=s[k];
        if(v!==''&&v!=null&&(!Number.isFinite(Number(v))||Number(v)<1||Number(v)>10))return false;
      }
       
      if(s.pct!==undefined&&s.pct!==null&&(!Number.isFinite(Number(s.pct))||Number(s.pct)<=0||Number(s.pct)>100))return false;
       

      if(s.fixed!==undefined&&s.fixed!==null&&typeof s.fixed!=='boolean')return false;
      return shareTagListOk(s.tags);
    }
     
    function validShareProgression(p){
      if(p==null)return true;
      if(typeof p!=='object')return false;
      for(const k of ['min','max','timeMin','timeMax','timeStep','incrementValue','percentOf1RM','trainingMax']){
        if(p[k]!==undefined&&p[k]!==null&&!Number.isFinite(Number(p[k])))return false;
      }
      if(p.mode!==undefined&&p.mode!==null&&p.mode!=='reps'&&p.mode!=='time')return false;
      if(p.scheme!==undefined&&p.scheme!==null&&p.scheme!=='rpe'&&p.scheme!=='linear'&&p.scheme!=='onerm')return false;
      if(p.tmSource!==undefined&&p.tmSource!==null&&p.tmSource!=='manual'&&p.tmSource!=='auto')return false;
      return true;
    }
     







    function validShareProgramProgression(p){
      if(p==null)return true;
      if(typeof p!=='object'||Array.isArray(p))return false;
      if(p.threshold!==undefined&&p.threshold!==null){
        const t=p.threshold;
        if(!(t==='completion'||Number(t)===7||Number(t)===8||Number(t)===9))return false;
      }
      for(const k of ['incrementValue','percentOf1RM','deloadPct','timeStep','cycleLength']){
        if(p[k]!==undefined&&p[k]!==null&&!Number.isFinite(Number(p[k])))return false;
      }
      if(p.scheme!==undefined&&p.scheme!==null&&p.scheme!=='rpe'&&p.scheme!=='linear'&&p.scheme!=='onerm')return false;
      if(p.incrementType!==undefined&&p.incrementType!==null&&p.incrementType!=='lb'&&p.incrementType!=='percent')return false;
      if(p.effortMode!==undefined&&p.effortMode!==null&&p.effortMode!=='rpe'&&p.effortMode!=='rir')return false;
      if(p.dbEntry!==undefined&&p.dbEntry!==null&&p.dbEntry!=='per'&&p.dbEntry!=='total')return false;
      const dr=p.defaultRange;
      if(dr!==undefined&&dr!==null){
        if(typeof dr!=='object'||Array.isArray(dr))return false;
        if(dr.preset!==undefined&&dr.preset!==null&&!shareStrOk(String(dr.preset),50))return false;
        for(const k of ['min','max']){
          if(dr[k]!==undefined&&dr[k]!==null&&!Number.isFinite(Number(dr[k])))return false;
        }
      }
      if(p.weeklyPcts!==undefined&&p.weeklyPcts!==null){
        if(!Array.isArray(p.weeklyPcts)||p.weeklyPcts.length>52)return false;
        if(!p.weeklyPcts.every(v=>Number.isFinite(Number(v))))return false;
      }
      if(p.weeklyRanges!==undefined&&p.weeklyRanges!==null){
        if(!Array.isArray(p.weeklyRanges)||p.weeklyRanges.length>12)return false;
        for(const r of p.weeklyRanges){
          if(!r||typeof r!=='object')return false;
          for(const k of ['min','max']){
            if(r[k]!==undefined&&r[k]!==null&&!Number.isFinite(Number(r[k])))return false;
          }
        }
      }
      if(p.warmupLadder!==undefined&&p.warmupLadder!==null){
        if(!Array.isArray(p.warmupLadder)||p.warmupLadder.length>3)return false;
        for(const rung of p.warmupLadder){
          if(!rung||typeof rung!=='object')return false;
          for(const k of ['pct','reps']){
            if(rung[k]!==undefined&&rung[k]!==null&&!Number.isFinite(Number(rung[k])))return false;
          }
        }
      }
      return true;
    }
     
    function validShareExercise(item){
      if(!item||typeof item!=='object')return false;
      if(!shareStrOk(item.exerciseId,SHARE_MAX_ID)||!item.exerciseId)return false;
      if(item.tracking!==undefined&&item.tracking!==null&&item.tracking!=='reps'&&item.tracking!=='time')return false;
       
      if(item.metrics!==undefined&&item.metrics!==null&&(!Array.isArray(item.metrics)||!item.metrics.length||!item.metrics.every(m=>m==='load'||m==='reps'||m==='time'||m==='distance')))return false;
      if(item.note!==undefined&&item.note!==null&&!shareStrOk(item.note,SHARE_MAX_NOTE))return false;
      if(!shareTagListOk(item.exerciseTags))return false;
      if(item.supersetId!==undefined&&item.supersetId!==null&&typeof item.supersetId!=='string')return false;
      if(!validShareProgression(item.progression))return false;
      if(!Array.isArray(item.sets)||item.sets.length>SHARE_MAX_SETS)return false;
      if(!item.sets.every(validShareSet))return false;
       



      if(item.weekVariants!==undefined&&item.weekVariants!==null){
        if(typeof item.weekVariants!=='object'||Array.isArray(item.weekVariants))return false;
        const keys=Object.keys(item.weekVariants);
        if(keys.length>52)return false;
        for(const k of keys){
          const wk=Number(k);
          if(!Number.isInteger(wk)||wk<1||wk>52)return false;
          const v=item.weekVariants[k];
          if(!v||typeof v!=='object'||v.weekVariants!==undefined)return false;
          if(!validShareExercise(v))return false;
        }
      }
      return true;
    }
     
    function validShareExerciseList(list){
      return Array.isArray(list)&&list.length<=SHARE_MAX_EXERCISES&&list.every(validShareExercise);
    }
     






    function validShareCustomExercises(list){
      if(list==null)return true;
      if(!Array.isArray(list)||list.length>SHARE_MAX_EXERCISES)return false;
      const strArrOk=(v,max)=>v===undefined||v===null||(Array.isArray(v)&&v.length<=max&&v.every(s=>shareStrOk(s,SHARE_MAX_TAG)));
      return list.every(ex=>ex&&typeof ex==='object'&&shareStrOk(ex.id,SHARE_MAX_ID)&&!!ex.id
        &&(ex.name===undefined||ex.name===null||(typeof ex.name==='string'&&shareStrOk(ex.name,SHARE_MAX_NAME)))
        &&(ex.equipment===undefined||ex.equipment===null||(typeof ex.equipment==='string'&&shareStrOk(ex.equipment,SHARE_MAX_NAME)))
        &&(ex.force===undefined||ex.force===null||(typeof ex.force==='string'&&shareStrOk(ex.force,SHARE_MAX_TAG)))
        &&(ex.mechanic===undefined||ex.mechanic===null||(typeof ex.mechanic==='string'&&shareStrOk(ex.mechanic,SHARE_MAX_TAG)))
        &&(ex.category===undefined||ex.category===null||(typeof ex.category==='string'&&shareStrOk(ex.category,SHARE_MAX_TAG)))
        &&(ex.tracking===undefined||ex.tracking===null||ex.tracking==='reps'||ex.tracking==='time'||ex.tracking==='distance')
        &&(ex.metrics===undefined||ex.metrics===null||(Array.isArray(ex.metrics)&&ex.metrics.length>0&&ex.metrics.every(m=>m==='load'||m==='reps'||m==='time'||m==='distance')))
        &&strArrOk(ex.primary,SHARE_MAX_TAGS)&&strArrOk(ex.secondary,SHARE_MAX_TAGS)
        &&(ex.instructions===undefined||ex.instructions===null||(Array.isArray(ex.instructions)&&ex.instructions.length<=50&&ex.instructions.every(s=>shareStrOk(s,500))))
        &&(ex.deletedAt===undefined||ex.deletedAt===null||Number.isFinite(Number(ex.deletedAt)))
         
        &&(ex.unilateral===undefined||ex.unilateral===null||typeof ex.unilateral==='boolean')
        &&(ex.singleDumbbell===undefined||ex.singleDumbbell===null||typeof ex.singleDumbbell==='boolean')
        &&(ex.dbEntryDefault===undefined||ex.dbEntryDefault===null||ex.dbEntryDefault==='per'||ex.dbEntryDefault==='total'));
    }
     

    function validShareWorkoutExercise(item){
      if(!validShareExercise(item))return false;
      if(item.name!==undefined&&item.name!==null&&!shareStrOk(String(item.name),SHARE_MAX_NAME))return false;
      return (item.sets||[]).every(s=>s&&(s.complete===undefined||typeof s.complete==='boolean'));
    }
     
    function validSharePayload(p){
      if(!p||typeof p!=='object')return false;
      if(p.v!==SHARE_VERSION&&p.v!==SHARE_LEGACY_VERSION)return false;
      if(p.kind!=='template'&&p.kind!=='program'&&p.kind!=='workout')return false;
      if(!shareStrOk(p.name,SHARE_MAX_NAME)||!p.name)return false;
      if(!validShareCustomExercises(p.customExercises))return false;
      if(p.kind==='template'){
        const t=p.template;
        if(!t||typeof t!=='object')return false;
        return validShareExerciseList(t.exercises);
      }
      if(p.kind==='workout'){
        const w=p.workout;
        if(!w||typeof w!=='object')return false;
        if(w.name!==undefined&&w.name!==null&&!shareStrOk(String(w.name),SHARE_MAX_NAME))return false;
        if(w.date!==undefined&&w.date!==null&&!shareStrOk(String(w.date),32))return false;
        if(w.durationSec!==undefined&&w.durationSec!==null&&(!Number.isFinite(Number(w.durationSec))||Number(w.durationSec)<0))return false;
        const t=w.totals;
        if(t!==undefined&&t!==null){
          if(typeof t!=='object')return false;
          for(const k of ['volume','sets','seconds','distance']){
            const v=t[k];
            if(v!==undefined&&v!==null&&(!Number.isFinite(Number(v))||Number(v)<0))return false;
          }
        }
        if(!Array.isArray(w.exercises)||w.exercises.length>SHARE_MAX_EXERCISES)return false;
        if(!w.exercises.every(validShareWorkoutExercise))return false;
        if(w.prs!==undefined&&w.prs!==null){
          if(!Array.isArray(w.prs)||w.prs.length>SHARE_MAX_EXERCISES)return false;
          for(const pr of w.prs){
            if(!pr||typeof pr!=='object')return false;
            if(!shareStrOk(String(pr.name??''),SHARE_MAX_NAME))return false;
            if(!shareStrOk(String(pr.kind??''),60))return false;
            if(!shareStrOk(String(pr.value??''),60))return false;
          }
        }
        return true;
      }
      const pr=p.program;
      if(!pr||typeof pr!=='object')return false;
      if(!Array.isArray(pr.workouts)||pr.workouts.length>SHARE_MAX_WORKOUTS)return false;
      for(const w of pr.workouts){
        if(!w||typeof w!=='object')return false;
        if(w.name!==undefined&&w.name!==null&&!shareStrOk(String(w.name),SHARE_MAX_NAME))return false;
        const t=w.template;
        if(!t||typeof t!=='object'||!validShareExerciseList(t.exercises))return false;
      }
       



      for(const k of ['length','startWeek']){
        const v=pr[k];
        if(v!==undefined&&v!==null&&(!Number.isInteger(Number(v))||Number(v)<1||Number(v)>52))return false;
      }
       

      if(pr.schedule!==undefined&&pr.schedule!==null&&!shareStrOk(pr.schedule,SHARE_MAX_NAME))return false;
       
      if(pr.focus!==undefined&&pr.focus!==null&&!shareStrOk(pr.focus,SHARE_MAX_NAME))return false;
       


      if(!validShareProgramProgression(pr.progression))return false;
      return true;
    }
//# sourceMappingURL=share-codec.js.map
