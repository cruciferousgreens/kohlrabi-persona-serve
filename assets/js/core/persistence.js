 
 











 
const PERSIST_KEY='workout-app:v1';
 




const LS_BACKUP_KEY=PERSIST_KEY+'.ls-backup';
const PERSIST_SIGNAL_KEY=PERSIST_KEY+':sig';
 







const WIPE_GEN_KEY='workout-app:wipe-gen';
 


let lastWrittenHash=null;
 







let bootPreexistingData=null;
 
function bootHadPreexistingData(){return bootPreexistingData;}
 





 


function serializePayload(payload){
  const slices={};
  const keyHashes=[];
  try{
    for(const k in payload){
      if(k==='savedAt')continue;
      const s=JSON.stringify(payload[k]);
      slices[k]=s;
      keyHashes.push(k+':'+cyrb53(s===undefined?'':s));
    }
  }catch(_){return null;}
   


  return {slices:slices,hash:cyrb53(keyHashes.join('|'))};
}
 
function payloadHash(payload){
  const ser=serializePayload(payload);
  return ser?ser.hash:null;
}
 



function assembleBlob(payload,slices,savedAt){
  const parts=[];
  for(const k in payload){
    if(k==='savedAt'){parts.push('"savedAt":'+savedAt);continue;}
    const s=slices[k];
    if(s===undefined)continue;
    parts.push(JSON.stringify(k)+':'+s);
  }
  return '{'+parts.join(',')+'}';
}
 









let lastKeySlices=null;
 





let lastBlobString=null;
 

function changedSyncKeys(slices){
  if(!slices||!lastKeySlices)return undefined;
  const out=[];
  for(const k of SYNCABLE_KEYS){
    if(slices[k]!==lastKeySlices[k])out.push(k);
  }
  return out;
}
let persistTimer=null;
 


 
function collectPersistable(){
   


  if(workoutState.activeProgram!=null)activeProgramWasSet=true;
  const blob={
     

    version:SCHEMA_VERSION,
    savedAt:Date.now(),
    wipeGen:wipeGeneration,
    completed:workoutState.completed,
    templates:workoutState.templates,
    tags:workoutState.tags,
    exerciseTagPresets:workoutState.exerciseTagPresets,
    activeProgram:workoutState.activeProgram,
    activeProgramWasSet:activeProgramWasSet,
    archivedPrograms:workoutState.archivedPrograms,
    savedPrograms:workoutState.savedPrograms||[],
    draft:workoutState.draft,
     


    savedBuilder:state.savedBuilder,
     


    savedBuilderStash:state.savedBuilderStash||null,
    customExercises:state.customExercises,
    favorites:[...state.favorites],
    favoriteStamps:Object.assign({},state.favoriteStamps||{}),
     


    settingsSections:{...(state.settingsSections||{})},
     



    subscriptions:getSyncableValue('subscriptions'),
    progressionSetup:progressionSetup,
    dashboardPeriod:state.dashboardPeriod,
    statsPeriod:state.statsPeriod,
    logPeriod:state.logPeriod,
     


     

    savedFilter:{muscles:[...((state.savedFilter&&state.savedFilter.muscles)||[])],inProgram:!!(state.savedFilter&&state.savedFilter.inProgram)},
     


    emailSyncHash:typeof state.emailSyncHash==='string'?state.emailSyncHash:''
  };
   

  const scalarRevs=stampScalarRevs(blob);
  if(Object.keys(scalarRevs).length)blob.scalarRevs=scalarRevs;
  return blob;
}
 




















const SCALAR_REV_KEYS=['progressionSetup','dashboardPeriod','statsPeriod','logPeriod'];
const scalarRevState={revs:{},baseline:{}};
function stampScalarRevs(blob){
  const out={};
  for(const k of SCALAR_REV_KEYS){
    let json=null;
    try{json=JSON.stringify(blob[k]);}catch(_){json=null;}
    if(json==null)continue;
    if(scalarRevState.baseline[k]===undefined)scalarRevState.baseline[k]=json;
    else if(scalarRevState.baseline[k]!==json){scalarRevState.baseline[k]=json;scalarRevState.revs[k]=(scalarRevState.revs[k]||0)+1;}
    if(scalarRevState.revs[k])out[k]=scalarRevState.revs[k];
  }
  return out;
}
 




let persistFailStreak=0;
 












let lastSeenSavedAt=0;
 


let wipeGeneration=0;
 
function readWipeGen(){
  try{
    const v=parseInt(localStorage.getItem(WIPE_GEN_KEY),10);
    return (isFinite(v)&&v>0)?v:0;
  }catch(_){return 0;}
}
 
function writeWipeGen(g){
  try{localStorage.setItem(WIPE_GEN_KEY,String(g));}catch(_){}
}
 



function adoptWipeGeneration(gen){
  clearUserDataMemory();
  wipeGeneration=gen;
  writeWipeGen(gen);
  lastSeenSavedAt=Date.now();
}
 




let activeProgramWasSet=false;
let pendingExternalBlob=null;
 
function noteExternalBlob(blob){
  if(!blob||typeof blob!=='object')return;
  const at=Number(blob.savedAt)||0;
  if(at>lastSeenSavedAt&&blob.version===SCHEMA_VERSION)pendingExternalBlob=blob;
}
if(typeof window!=='undefined'&&typeof window.addEventListener==='function'){
  window.addEventListener('storage',function(e){
    if(!e||!e.key)return;
    if(e.key===PERSIST_KEY&&e.newValue){
       
      try{noteExternalBlob(JSON.parse(e.newValue));}catch(_){}
      return;
    }
    if(e.key===PERSIST_SIGNAL_KEY){
       

      pendingExternalCheck=true;
    }
  });
}
let pendingExternalCheck=false;
 



















 
















function enforceProgramListingInvariant(){
  if(typeof workoutState==='undefined'||!workoutState)return false;
  let changed=false;
  const activeId=workoutState.activeProgram&&workoutState.activeProgram.id;
  const saved=Array.isArray(workoutState.savedPrograms)?workoutState.savedPrograms:[];
  const savedIds=new Set(saved.map(p=>p&&p.id).filter(id=>id!=null));
  if(activeId!=null){
    if(savedIds.has(activeId)){
      workoutState.savedPrograms=saved.filter(p=>!p||p.id!==activeId);
      savedIds.delete(activeId);
      changed=true;
    }
  }
  if(Array.isArray(workoutState.archivedPrograms)){
    const kept=workoutState.archivedPrograms.filter(p=>{
      if(!p||p.id==null)return true;
      if(activeId!=null&&p.id===activeId)return false;
      if(savedIds.has(p.id))return false;
      return true;
    });
    if(kept.length!==workoutState.archivedPrograms.length){
      workoutState.archivedPrograms=kept;
      changed=true;
    }
  }
  return changed;
}
 






function mergeFavoriteStamps(incoming){
  if(!incoming||typeof incoming!=='object')return;
  if(!(state.favoriteStamps&&typeof state.favoriteStamps==='object'))state.favoriteStamps={};
  const stamps=state.favoriteStamps;
  const canon=id=>(typeof canonicalExerciseId==='function')?canonicalExerciseId(id):id;
  Object.keys(incoming).forEach(function(id){
    const inc=incoming[id];
    if(!inc||typeof inc!=='object')return;
    const key=canon(id),cur=stamps[key];
    if(!cur||(Number(inc.ts)||0)>=(Number(cur.ts)||0))stamps[key]={fav:inc.fav?1:0,ts:Number(inc.ts)||0};
  });
  if(!(state.favorites instanceof Set))state.favorites=new Set();
  Object.keys(stamps).forEach(function(id){
    if(stamps[id].fav)state.favorites.add(id);else state.favorites.delete(id);
  });
}
function mergeExternalBlob(blob){
  if(!blob||typeof blob!=='object'||blob.version!==SCHEMA_VERSION)return false;
   





  const eg=Number(blob.wipeGen)||0;
  if(eg>wipeGeneration){adoptWipeGeneration(eg);return true;}
  if(eg<wipeGeneration)return false;
  const tombTs=(typeof tombstoneTsFresh==='function')?tombstoneTsFresh:null;
  const tombstoned=typeof isTombstoned==='function'?isTombstoned:function(){return false;};
   
  const revMs=function(r){
    if(!r||typeof r!=='object')return null;
    const u=r.updatedAt;
    if(typeof u==='number'&&isFinite(u))return u;
    if(typeof u==='string'){const t=Date.parse(u);return isNaN(t)?null:t;}
    return null;
  };
   

  const deletedMs=function(r){
    if(!r||typeof r!=='object')return null;
    const d=r.deletedAt;
    if(typeof d==='number'&&isFinite(d))return d;
    if(typeof d==='string'){const t=Date.parse(d);return isNaN(t)?null:t;}
    return null;
  };
   

  const deletedStands=function(key,r){
    if(!tombTs||!(r&&r.id!=null))return false;
    const ts=tombTs(key,r.id);
    if(!ts)return false;
    const rev=revMs(r);
    return !(rev!=null&&rev>ts);
  };
   









  const unionById=function(key,local,incoming){
    let base=Array.isArray(local)?local:[];
     

    if(tombTs)base=base.filter(function(r){return !deletedStands(key,r);});
    if(!Array.isArray(incoming)||!incoming.length)return base;
    const localIds=new Set(base.map(function(r){return r&&r.id;}));
    const incomingById={};
    incoming.forEach(function(r){if(r&&r.id!=null)incomingById[r.id]=r;});
    const merged=base.map(function(r){
      if(!(r&&r.id!=null&&incomingById[r.id]))return r;
      const inc=incomingById[r.id];
       














      if(key==='customExercises'){
        const rTomb=tombstoned(r), incTomb=tombstoned(inc);
        if(rTomb&&incTomb){
          const rd=deletedMs(r), idd=deletedMs(inc);
          return (rd!=null&&idd!=null&&rd>idd)?r:inc;
        }
        if(rTomb!==incTomb){
          const tomb=rTomb?r:inc, live=rTomb?inc:r;
          const d=deletedMs(tomb), u=revMs(live);
          return (u!=null&&d!=null&&u>d)?live:tomb;
        }
         
      }
       







      const lr=revMs(r), ir=revMs(inc);
      if(lr!=null&&ir!=null&&lr!==ir)return lr>ir?r:inc;
      if(lr!=null&&ir==null)return r;
      if(lr==null&&ir!=null)return inc;
      const lj=JSON.stringify(r), ij=JSON.stringify(inc);
      if(lj===ij)return r;
      return lj<ij?r:inc;
    });
    incoming.forEach(function(r){
      if(!(r&&r.id!=null)||localIds.has(r.id))return;
       
      if(deletedStands(key,r))return;
      merged.push(r);
    });
    return merged;
  };
  workoutState.completed=unionById('completed',workoutState.completed,blob.completed);
  workoutState.templates=unionById('templates',workoutState.templates,blob.templates);
  workoutState.archivedPrograms=unionById('archivedPrograms',workoutState.archivedPrograms,blob.archivedPrograms);
   
  workoutState.savedPrograms=unionById('savedPrograms',workoutState.savedPrograms||[],blob.savedPrograms);
  state.customExercises=unionById('customExercises',state.customExercises,blob.customExercises);
   









  const programStamp=function(p){
    if(!p||typeof p!=='object')return null;
    const rev=Number(p.revision);
    const hasRev=isFinite(rev)&&rev>0;
    const upd=revMs(p);
    if(!hasRev&&upd==null)return null;
    return [hasRev?rev:0,upd||0];
  };
  if(blob.activeProgram&&typeof blob.activeProgram==='object'){
    const incStamp=programStamp(blob.activeProgram),locStamp=programStamp(workoutState.activeProgram);
     













    const locProg=workoutState.activeProgram;
    const crossProgram=!!(locProg&&typeof locProg==='object'&&blob.activeProgram.id!=null&&locProg.id!=null&&blob.activeProgram.id!==locProg.id);
    let refuse;
    if(crossProgram){
      const incUpd=incStamp?incStamp[1]:null,locUpd=locStamp?locStamp[1]:null;
      refuse=!(incUpd==null&&locUpd==null)&&!((incUpd||0)>(locUpd||0));
    }else{
      refuse=!!(locStamp&&!incStamp)||!!(incStamp&&locStamp&&(incStamp[0]<locStamp[0]||(incStamp[0]===locStamp[0]&&incStamp[1]<locStamp[1])));
    }
    if(!refuse)workoutState.activeProgram=blob.activeProgram;
  }
  else if(blob.activeProgram===null&&'activeProgram' in blob){
     






    if((Number(blob.savedAt)||0)>lastSeenSavedAt&&blob.activeProgramWasSet)workoutState.activeProgram=null;
  }
   


  if(blob.activeProgramWasSet)activeProgramWasSet=true;
  if(Array.isArray(blob.tags))workoutState.tags=mergeTagLists(workoutState.tags,blob.tags);
  if(Array.isArray(blob.exerciseTagPresets))workoutState.exerciseTagPresets=mergeTagLists(workoutState.exerciseTagPresets,blob.exerciseTagPresets);
  if(Array.isArray(blob.favorites)){
    const favs=state.favorites instanceof Set?state.favorites:new Set();
     
    const canon=id=>(typeof canonicalExerciseId==='function')?canonicalExerciseId(id):id;
    blob.favorites.forEach(function(f){if(typeof f==='string')favs.add(canon(f));});
    state.favorites=favs;
  }
  mergeFavoriteStamps(blob.favoriteStamps);
   







  const scalarAdopt=function(k){
    const incRev=Number(blob.scalarRevs&&blob.scalarRevs[k]);
    const incStamped=isFinite(incRev)&&incRev>0;
    const locRev=scalarRevState.revs[k]||0;
    if(incStamped&&locRev>0)return incRev>=locRev;
    if(incStamped)return true;
    if(locRev>0)return false;
    return true;
  };
  const scalarAdopted=function(k,value){
    const incRev=Number(blob.scalarRevs&&blob.scalarRevs[k]);
    if(isFinite(incRev)&&incRev>0)scalarRevState.revs[k]=incRev;
    try{scalarRevState.baseline[k]=JSON.stringify(value);}catch(_){}
  };
  if(blob.progressionSetup&&typeof blob.progressionSetup==='object'&&scalarAdopt('progressionSetup')){
    try{Object.assign(progressionSetup,blob.progressionSetup);}catch(_){}
     

    try{normalizeProgression(progressionSetup);}catch(_){}
    scalarAdopted('progressionSetup',progressionSetup);
  }
   

  try{
    if(workoutState.activeProgram&&workoutState.activeProgram.progression)normalizeProgression(workoutState.activeProgram.progression);
    (workoutState.archivedPrograms||[]).forEach(function(ap){if(ap&&ap.progression)normalizeProgression(ap.progression);});
    (workoutState.savedPrograms||[]).forEach(function(ap){if(ap&&ap.progression)normalizeProgression(ap.progression);});
  }catch(_){}
  ['dashboardPeriod','statsPeriod','logPeriod'].forEach(function(k){
    if(blob[k]!==undefined&&scalarAdopt(k)){state[k]=blob[k];scalarAdopted(k,state[k]);}
  });
  try{if(typeof mergeCustomExercises==='function')mergeCustomExercises();}catch(_){}
   


  enforceProgramListingInvariant();
  return true;
}
 






async function migrateBlobToIdb(){
  let existing;
  try{existing=await Storage.idbGet(PERSIST_KEY);}catch(_){return 'read-failed';}
  if(existing!==undefined&&existing!==null)return 'already';
  if(existing===undefined)return 'read-failed';
  let lsRaw=null;
  try{lsRaw=localStorage.getItem(PERSIST_KEY);}catch(_){}
  if(!lsRaw)return 'fresh';
  let wrote=false;
  try{wrote=await Storage.idbSet(PERSIST_KEY,lsRaw);}catch(_){}
  if(!wrote)return 'unavailable';
  let back;
  try{back=await Storage.idbGet(PERSIST_KEY);}catch(_){return 'unavailable';}
  if(back!==lsRaw)return 'unavailable';
  try{
    localStorage.setItem(LS_BACKUP_KEY,lsRaw);
    localStorage.removeItem(PERSIST_KEY);
  }catch(_){ }
  return 'migrated';
}
 
async function persistNow(){
   



  if(futureVersionHold)return false;
   














  pendingExternalCheck=false;
  let external=null;
   


  if(readFailureHold){
    let heldRaw=null;
    try{heldRaw=await Storage.loadBlob(PERSIST_KEY);}catch(_){return false;}
    if(Storage.lastReadFailed)return false;
    readFailureHold=false;
    try{
      const held=heldRaw?JSON.parse(heldRaw):null;
      if(held&&typeof held==='object'&&typeof held.version==='number'){
        if(held.version>SCHEMA_VERSION){await holdForFutureVersion(held.version);return false;}
        if(held.version<SCHEMA_VERSION)runBlobMigrations(held);
        mergeExternalBlob(held);
        lastSeenSavedAt=Math.max(lastSeenSavedAt,Number(held.savedAt)||0);
        bootPreexistingData=true;
      }
    }catch(_){}
  }
  try{
    let raw=await Storage.loadBlob(PERSIST_KEY);
     


    try{if(Storage.backend==='idb')raw=newerBlob(raw,localStorage.getItem(PERSIST_KEY));}catch(_){}
    if(raw&&raw!==lastBlobString){
      const current=JSON.parse(raw);
      lastBlobString=raw;
      if(current&&current.version===SCHEMA_VERSION&&(Number(current.savedAt)||0)>lastSeenSavedAt)external=current;
    }
  }catch(_){}
  if(!external&&pendingExternalBlob&&(Number(pendingExternalBlob.savedAt)||0)>lastSeenSavedAt)external=pendingExternalBlob;
  pendingExternalBlob=null;
   






  const lsGenNow=readWipeGen();
  if(lsGenNow>wipeGeneration){
    adoptWipeGeneration(lsGenNow);
    external=null;
  }
  if(external){
    mergeExternalBlob(external);
     

    lastSeenSavedAt=Math.max(lastSeenSavedAt,Number(external.savedAt)||0);
     

    if(typeof maybeRefreshDraftSuggestions==='function'){try{maybeRefreshDraftSuggestions();}catch(_){}}
  }
  const payload=collectPersistable();
   



  const ser=serializePayload(payload);
  const hash=ser?ser.hash:null;
  if(hash!==null&&hash===lastWrittenHash){
     

    if(ser)lastKeySlices=ser.slices;
    return true;
  }
  payload.savedAt=Date.now();
  const blobString=ser?assembleBlob(payload,ser.slices,payload.savedAt):JSON.stringify(payload);
  const ok=await Storage.saveBlob(PERSIST_KEY,blobString);
  if(ok){
    persistFailStreak=0;
    lastWrittenHash=hash;
    lastBlobString=blobString;
    lastSeenSavedAt=Math.max(lastSeenSavedAt,Number(payload.savedAt)||0);
     




    if(Storage.backend==='idb'){
      try{
        const lsRaw=localStorage.getItem(PERSIST_KEY);
        if(lsRaw&&savedAtOf(lsRaw)<=Number(payload.savedAt))localStorage.removeItem(PERSIST_KEY);
      }catch(_){}
    }
     


    try{localStorage.setItem(PERSIST_SIGNAL_KEY,String(Date.now()));}catch(_){}
     





    if(typeof markSyncDirty==='function'){try{markSyncDirty(changedSyncKeys(ser?ser.slices:null));}catch(_){}}
    if(ser)lastKeySlices=ser.slices;
  }else{
    persistFailStreak+=1;
     







    if(persistFailStreak===3||(persistFailStreak>3&&persistFailStreak%12===0)){
      if(typeof showToast==='function'){
        try{showToast(persistFailStreak<=3
          ?"Couldn't save. Storage is unavailable. Your changes are not being saved."
          :"Couldn't save. Your changes still aren't being saved.",'error');}catch(_){}
      }
    }
  }
  return ok;
}
 













function noteExternalDurableWrite(blobString){
  try{
    const d=JSON.parse(blobString);
    if(!d||typeof d!=='object')return;
    const h=payloadHash(d);
    if(h!==null)lastWrittenHash=h;
    lastBlobString=blobString;
    lastSeenSavedAt=Math.max(lastSeenSavedAt,Number(d.savedAt)||0);
    if(Storage.backend==='idb'){try{localStorage.removeItem(PERSIST_KEY);}catch(_){}}
  }catch(_){}
}
 

function schedulePersist(){
  persistMutationGen++;  
  clearTimeout(persistTimer);
  persistTimer=setTimeout(persistNow,250);
}
 









let persistMutationGen=0, lastTickGen=-1, lastFullTickAt=0;
async function persistTick(){
  if(futureVersionHold)return false;
  if(!pendingExternalCheck&&!pendingExternalBlob&&persistMutationGen===lastTickGen&&(Date.now()-lastFullTickAt)<60000)return true;
  const ok=await persistNow();
  if(ok){lastTickGen=persistMutationGen;lastFullTickAt=Date.now();}
  return ok;
}
 

function savedAtOf(raw){
  try{
    const d=JSON.parse(raw);
    return (d&&typeof d==='object'&&typeof d.version==='number')?(Number(d.savedAt)||0):-1;
  }catch(_){return -1;}
}
 
function newerBlob(a,b){
  if(!a)return b;
  if(!b)return a;
  return savedAtOf(b)>savedAtOf(a)?b:a;
}
 








function persistSyncForUnload(){
  if(futureVersionHold||readFailureHold)return;
  try{
     






    const lsGenNow=readWipeGen();
    if(lsGenNow>wipeGeneration)adoptWipeGeneration(lsGenNow);
    else{
      try{
        const raw=localStorage.getItem(PERSIST_KEY);
        if(raw){
          const current=JSON.parse(raw);
          if(current&&current.version===SCHEMA_VERSION&&(Number(current.savedAt)||0)>lastSeenSavedAt){
            mergeExternalBlob(current);
            lastSeenSavedAt=Math.max(lastSeenSavedAt,Number(current.savedAt)||0);
          }
        }
      }catch(_){}
    }
    const payload=collectPersistable();
    const hash=payloadHash(payload);
    if(hash!==null&&hash===lastWrittenHash)return;
    payload.savedAt=Date.now();
    localStorage.setItem(PERSIST_KEY,JSON.stringify(payload));
  }catch(_){ }
}
 



 



function clearUserDataMemory(){
  workoutState.completed=[];workoutState.templates=[];workoutState.tags=[];workoutState.exerciseTagPresets=[];workoutState.draft=null;workoutState.activeProgram=null;workoutState.archivedPrograms=[];workoutState.savedPrograms=[];
  workoutState.tagTarget=null;workoutState.exerciseTagTarget=null;workoutState.supersetTarget=null;workoutState.pickerMode='draft';workoutState.programWorkoutTarget=null;workoutState.pickerSwapUid=null;workoutState.pickerVariantTarget=null;
   

  state.savedBuilder=null;state.savedBuilderStash=null;state.builderReturn=null;state.builderOpen=false;
  state.sharePreview=null;state.shareReturn=null;  
  state.workoutEditorOpen=false;state.savedWorkoutId=null;state.workoutHistoryOpen=false;state.programWorkoutUid=null;
  state.customExercises=[];exercises=exercises.filter(ex=>!ex.custom);
   

  if(state.favorites&&typeof state.favorites.clear==='function')state.favorites.clear();
  state.favoriteStamps={};
   
  state.settingsSections={};
   
  state.subscriptions={};
  state.query='';state.muscles.clear();state.equipment='';state.onlyFavorites=false;state.onlyCustom=false;state.selected=null;
  resetProgressionSetup();
}
 
function wipeLocalUserData(opts){
  const removeSyncKeys=!!(opts&&opts.removeSyncKeys);  
   





  wipeGeneration=Math.max(wipeGeneration,readWipeGen())+1;
  writeWipeGen(wipeGeneration);
  clearUserDataMemory();
   











   













  try{
    const payload=collectPersistable();
    payload.savedAt=Date.now();
     



    payload.wipedAt=Date.now();
    localStorage.setItem(PERSIST_KEY,JSON.stringify(payload));
  }catch(_){ }
  let idbDelete=null;
  try{
    idbDelete=(async function(){
      const durable=await Storage.deleteBlobDurable(PERSIST_KEY);
       




      try{
        const payload=collectPersistable();
        payload.savedAt=Date.now();
        payload.wipedAt=Date.now();  
        localStorage.setItem(PERSIST_KEY,JSON.stringify(payload));
        try{lastWrittenHash=payloadHash(collectPersistable());}catch(_){lastWrittenHash=null;}
      }catch(_){ }
      return durable;
    })().catch(function(){});
  }catch(_){}
   

  try{localStorage.removeItem(LS_BACKUP_KEY);}catch(_){}
   



  try{if(typeof Storage!=='undefined'&&Storage&&typeof Storage.deleteBlob==='function')Storage.deleteBlob(PERSIST_KEY+':pre-restore');else localStorage.removeItem(PERSIST_KEY+':pre-restore');}catch(_){}
   




  if(typeof clearOnboardingDone==='function'){try{clearOnboardingDone();}catch(_){}}
   

   


  if(removeSyncKeys){
    try{localStorage.removeItem('workout-sync:v1');}catch(_){}
     



    try{localStorage.removeItem('workout-signin-nudge-dismissed');}catch(_){}
    if(typeof ADOPTED_UID_KEY!=='undefined'){try{localStorage.removeItem(ADOPTED_UID_KEY);}catch(_){}}
     




    try{
      const dead=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
         

        if(k&&/^sb-[^-]+-auth-token/.test(k))dead.push(k);
      }
      dead.forEach(k=>{try{localStorage.removeItem(k);}catch(_){}});
    }catch(_){}
  }
   


   

  try{lastWrittenHash=payloadHash(collectPersistable());}catch(_){lastWrittenHash=null;}
  return idbDelete;
}
 
function mergeCustomExercises(){
  if(!Array.isArray(state.customExercises)||!state.customExercises.length)return;
  const ids=new Set(state.customExercises.map(ex=>ex.id));
  exercises=exercises.filter(ex=>!ids.has(ex.id));
   



  const norm=typeof normalizeExerciseMuscles==='function'?normalizeExerciseMuscles:(ex=>ex);
  exercises=[...state.customExercises.map(norm),...exercises];
}
 
function mergeTagLists(defaults,saved){
  const seen=new Set(defaults.map(tag=>String(tag).toLowerCase()));
  const merged=[...defaults];
  (Array.isArray(saved)?saved:[]).forEach(tag=>{
    if(typeof tag!=='string'||!tag.trim()||seen.has(tag.toLowerCase()))return;
    seen.add(tag.toLowerCase());merged.push(tag);
  });
  return merged;
}
 






const SCHEMA_VERSION=1;
 



const MIGRATIONS=[
   

  {id:'normalize-saved-filter',from:1,migrate(data){
    if(data.savedFilter&&typeof data.savedFilter==='object'){
      data.savedFilter={
        muscles:Array.isArray(data.savedFilter.muscles)?data.savedFilter.muscles.filter(x=>typeof x==='string'):[],
        inProgram:!!data.savedFilter.inProgram
      };
    }
  }},
   


  {id:'shared-workout-chip',from:1,migrate(data){
     

    const templates=(data.templates||[]).filter(t=>t&&typeof t.name==='string');
    const taken=new Set(templates.map(t=>t.name));
    templates.forEach(t=>{
      const m=/^(.*) \(shared(?: (\d+))?\)$/.exec(t.name);
      if(!m)return;
      taken.delete(t.name);
      let name=m[1],n=2;
      while(taken.has(name))name=`${m[1]} (${n++})`;
      t.name=name;t.shared=true;taken.add(name);
    });
  }},
   



  {id:'set-tag-failure-rename',from:1,migrate(data){
    const rename=tags=>Array.isArray(tags)?[...new Set(tags.map(t=>t==='To failure'?'Failure':t))]:tags;
    if(Array.isArray(data.tags))data.tags=rename(data.tags);
    const walkSets=exercises=>{(exercises||[]).forEach(item=>{(item.sets||[]).forEach(set=>{set.tags=rename(set.tags);});});};
    (data.completed||[]).forEach(log=>walkSets(log.exercises));
    (data.templates||[]).forEach(t=>walkSets(t.exercises));
    if(data.draft)walkSets(data.draft.exercises);
    if(data.savedBuilder)walkSets(data.savedBuilder.exercises);
    [data.activeProgram].concat(data.archivedPrograms||[],data.savedPrograms||[]).forEach(program=>{
      (program?.workouts||[]).forEach(w=>walkSets(w.template?.exercises));
    });
  }},
   









  {id:'program-shell-template-link',from:1,migrate(data){
    const templates=(data.templates||[]).filter(t=>t&&!t.archivedAt);
    const programs=[data.activeProgram].concat(data.archivedPrograms||[]).filter(p=>p&&Array.isArray(p.workouts));
    const sig=rows=>(rows||[]).map(item=>`${item.exerciseId||''}:${(item.sets||[]).length}`).join('|');
    const byKey=new Map();
    templates.forEach(t=>{
      const key=`${t.name||''}\n${sig(t.exercises)}`;
      byKey.set(key,byKey.has(key)?null:t);  
    });
    programs.forEach(p=>p.workouts.forEach(w=>{
      if(!w||w.sourceTemplateId||w.sourceWorkoutId)return;
      const t=byKey.get(`${w.name||''}\n${sig(w.template&&w.template.exercises)}`);
      if(t)w.sourceTemplateId=t.id;
    }));
  }},
   



  {id:'dash-period-week-default',from:1,migrate(data){
    try{
      if(localStorage.getItem('workout-app:dash-week-default')==='1')return;
      if(data&&data.dashboardPeriod==='today')data.dashboardPeriod='week';
      localStorage.setItem('workout-app:dash-week-default','1');
    }catch(_){}
  }},
];
 
function runBlobMigrations(data){
  MIGRATIONS.forEach(m=>{try{m.migrate(data);}catch(_){}});
  return data;
}
 

const LOCAL_KEY_MIGRATIONS=[
   
  {id:'legacy-theme-names',migrate(){
    try{
      const n=localStorage.getItem('workout-theme-name');
      if(n==='latte')localStorage.setItem('workout-theme-name','rosepine');
      else if(n==='frappe')localStorage.setItem('workout-theme-name','macchiato');
    }catch(_){}
  }},
];
 
function runLocalKeyMigrations(){LOCAL_KEY_MIGRATIONS.forEach(m=>{try{m.migrate();}catch(_){}});}
 




let corruptQuarantineKey=null;
 

let futureVersionHold=false;
 




let readFailureHold=false;
 

async function quarantineCorruptBlob(raw){
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  corruptQuarantineKey=PERSIST_KEY+':corrupt-'+stamp;
  let ok=false;
  try{ok=await Storage.saveBlob(corruptQuarantineKey,raw);}catch(_){}
  if(!ok)corruptQuarantineKey=null;
  if(!corruptQuarantineKey)return;  
   




  try{if(typeof Sync!=='undefined'&&Sync&&typeof Sync.noteSyncHold==='function')Sync.noteSyncHold();}catch(_){}
   


  const dlg=typeof $==='function'?$('#corruptDataDialog'):null;
  if(dlg&&!dlg.open){try{dlg.showModal();}catch(_){}}
}
 







async function holdForFutureVersion(foundVersion){
  futureVersionHold=true;
   



  try{
    if(typeof navigator!=='undefined'&&'serviceWorker' in navigator){
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg&&typeof reg.update==='function'){try{await reg.update();}catch(_){}}
    }
  }catch(_){}
  const dlg=typeof $==='function'?$('#futureVersionDialog'):null;
  if(dlg&&!dlg.open){try{dlg.showModal();}catch(_){}}
}
 


async function restorePersisted(){
  await Storage.probe();
  let raw=null;
  if(Storage.backend==='idb'){
    try{
      const mig=await migrateBlobToIdb();
      if(mig==='read-failed')readFailureHold=true;
      else if(mig!=='unavailable'){
        raw=await Storage.loadBlob(PERSIST_KEY);
        if(Storage.lastReadFailed)readFailureHold=true;
      }
    }catch(_){readFailureHold=true;}
     





    if(readFailureHold){try{if(typeof Sync!=='undefined'&&Sync&&typeof Sync.noteSyncHold==='function')Sync.noteSyncHold();}catch(_){}}
    if(readFailureHold&&typeof showToast==='function'){
      try{showToast("Your saved workouts couldn't be read yet. Nothing will be overwritten; retrying.",'error');}catch(_){}
    }
     




    try{raw=newerBlob(raw,localStorage.getItem(PERSIST_KEY));}catch(_){}
  }else{
    try{raw=localStorage.getItem(PERSIST_KEY);}catch(_){}
  }
   


  if(!raw&&!readFailureHold){try{raw=localStorage.getItem(LS_BACKUP_KEY);}catch(_){}}
  if(!raw){
    bootPreexistingData=false;  
     

    wipeGeneration=Math.max(wipeGeneration,readWipeGen());
    return;
  }
  let data=null;
  try{data=JSON.parse(raw);}catch(_){bootPreexistingData=true;await quarantineCorruptBlob(raw);return;}
   





  if(!data||typeof data!=='object'||typeof data.version!=='number'){bootPreexistingData=true;await quarantineCorruptBlob(raw);return;}
   








  if(Number(data.wipedAt)>0)bootPreexistingData=false;
  else{
     



    wipeGeneration=Math.max(wipeGeneration,readWipeGen());
    let pristineHash=null;
    try{pristineHash=payloadHash(collectPersistable());}catch(_){pristineHash=null;}
    bootPreexistingData=!(pristineHash!==null&&payloadHash(data)===pristineHash);
  }
  if(data.version>SCHEMA_VERSION){await holdForFutureVersion(data.version);return;}
   




  const bootLsGen=readWipeGen();
  const blobGen=Number(data.wipeGen)||0;
  if(bootLsGen>blobGen){
    wipeGeneration=bootLsGen;
    try{lastWrittenHash=payloadHash(collectPersistable());}catch(_){lastWrittenHash=null;}
    return;
  }
  wipeGeneration=Math.max(wipeGeneration,blobGen,bootLsGen);
  lastSeenSavedAt=Number(data.savedAt)||0;  
   


  if(data.activeProgramWasSet||data.activeProgram!=null)activeProgramWasSet=true;
  runBlobMigrations(data);
  SYNCABLE_KEYS.forEach(key=>{if(key in data)setSyncableValue(key,data[key]);});
   



  try{
    scalarRevState.revs={};
    if(data.scalarRevs&&typeof data.scalarRevs==='object'){
      for(const k of SCALAR_REV_KEYS){const v=Number(data.scalarRevs[k]);if(isFinite(v)&&v>0)scalarRevState.revs[k]=v;}
    }
    scalarRevState.baseline={};
    scalarRevState.baseline.progressionSetup=JSON.stringify(progressionSetup);
    scalarRevState.baseline.dashboardPeriod=JSON.stringify(state.dashboardPeriod);
    scalarRevState.baseline.statsPeriod=JSON.stringify(state.statsPeriod);
    scalarRevState.baseline.logPeriod=JSON.stringify(state.logPeriod);
  }catch(_){}
  if(data.draft&&typeof data.draft==='object'&&data.draft!==null)workoutState.draft=data.draft;
  if(data.savedBuilder&&typeof data.savedBuilder==='object'&&data.savedBuilder!==null)state.savedBuilder=data.savedBuilder;
   

  if(data.savedBuilderStash&&typeof data.savedBuilderStash==='object'&&!Array.isArray(data.savedBuilderStash))state.savedBuilderStash=data.savedBuilderStash;
   

  if(data.savedFilter&&typeof data.savedFilter==='object'&&data.savedFilter!==null)state.savedFilter=data.savedFilter;
   
  if(typeof data.emailSyncHash==='string')state.emailSyncHash=data.emailSyncHash;
  mergeCustomExercises();
   
  try{lastWrittenHash=payloadHash(collectPersistable());}catch(_){lastWrittenHash=null;}
}
 
 













const SYNCABLE_KEYS=['completed','templates','tags','exerciseTagPresets','activeProgram','archivedPrograms','savedPrograms','customExercises','favorites','favoriteStamps','progressionSetup','dashboardPeriod','statsPeriod','logPeriod','appearance','settingsSections','subscriptions'];
 


const DATA_SYNC_KEYS=['completed','templates','tags','exerciseTagPresets','activeProgram','archivedPrograms','savedPrograms','customExercises','favorites','favoriteStamps'];
 
function getSyncableValue(key){
  switch(key){
    case 'completed':return workoutState.completed;
    case 'templates':return workoutState.templates;
    case 'tags':return workoutState.tags;
    case 'exerciseTagPresets':return workoutState.exerciseTagPresets;
    case 'activeProgram':return workoutState.activeProgram;
    case 'archivedPrograms':return workoutState.archivedPrograms;
    case 'savedPrograms':return workoutState.savedPrograms||[];
    case 'customExercises':return state.customExercises;
    case 'favorites':return state.favorites instanceof Set?[...state.favorites]:[];
    case 'favoriteStamps':return Object.assign({},state.favoriteStamps||{});
    case 'progressionSetup':return progressionSetup;
    case 'dashboardPeriod':return state.dashboardPeriod;
    case 'statsPeriod':return state.statsPeriod;
    case 'logPeriod':return state.logPeriod;
    case 'appearance':return (typeof getAppearanceState==='function')?getAppearanceState():undefined;
     
    case 'settingsSections':return {...(state.settingsSections||{})};
     



    case 'subscriptions':{
      const keys=(typeof SUBSCRIPTION_KEYS!=='undefined'&&Array.isArray(SUBSCRIPTION_KEYS))?SUBSCRIPTION_KEYS:['appUpdates','marketing','tips'];
      const on=(typeof subscriptionOn==='function')?subscriptionOn:(k)=>{
        try{const s=state.subscriptions;return !s||typeof s!=='object'||s[k]!==false;}catch(_){return true;}
      };
      const out={};
      for(const k of keys)out[k]=!!on(k);
      return out;
    }
    default:return undefined;
  }
}
 


function setSyncableValue(key,value){
  switch(key){
    case 'completed':if(Array.isArray(value))workoutState.completed=value;break;
    case 'templates':
       

      if(Array.isArray(value)){
        const savedUser=value.filter(t=>t&&!t.builtIn);
        const ids=new Set(savedUser.map(t=>t.id));
        workoutState.templates=[...savedUser];
      }
      break;
    case 'tags':if(Array.isArray(value))workoutState.tags=mergeTagLists(DEFAULT_SET_TAGS,value);break;
    case 'exerciseTagPresets':if(Array.isArray(value))workoutState.exerciseTagPresets=mergeTagLists(DEFAULT_EXERCISE_TAG_PRESETS,value);break;
    case 'activeProgram':if(value&&typeof value==='object')workoutState.activeProgram=value;break;
    case 'archivedPrograms':if(Array.isArray(value))workoutState.archivedPrograms=value;break;
    case 'savedPrograms':if(Array.isArray(value))workoutState.savedPrograms=value;break;
    case 'customExercises':if(Array.isArray(value))state.customExercises=value;break;
    case 'favorites':if(Array.isArray(value))state.favorites=new Set(value.filter(x=>typeof x==='string').map(x=>(typeof canonicalExerciseId==='function')?canonicalExerciseId(x):x));break;  
    case 'favoriteStamps':mergeFavoriteStamps(value);break;  
    case 'progressionSetup':
      if(value&&typeof value==='object'){
        const incoming=value;
        Object.assign(progressionSetup,incoming);
        if(incoming.defaultRange&&typeof incoming.defaultRange==='object')progressionSetup.defaultRange={...progressionSetup.defaultRange,...incoming.defaultRange};
        if(Array.isArray(incoming.weeklyRanges))progressionSetup.weeklyRanges=incoming.weeklyRanges;
      }
      break;
    case 'dashboardPeriod':if(typeof value==='string')state.dashboardPeriod=value;break;
    case 'statsPeriod':if(typeof value==='string')state.statsPeriod=value;break;
    case 'logPeriod':if(typeof value==='string')state.logPeriod=value;break;
    case 'appearance':if(value&&typeof value==='object'&&typeof setAppearanceState==='function')setAppearanceState(value);break;
     


    case 'settingsSections':{
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        const clean={};
        for(const [k,v] of Object.entries(value))if(typeof k==='string'&&v===true)clean[k]=true;
        state.settingsSections=clean;
      }
      break;
    }
     




    case 'subscriptions':{
      const keys=(typeof SUBSCRIPTION_KEYS!=='undefined'&&Array.isArray(SUBSCRIPTION_KEYS))?SUBSCRIPTION_KEYS:['appUpdates','marketing','tips'];
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        const clean={};
        for(const k of keys)clean[k]=value[k]!==false;
        state.subscriptions=clean;
      }
      break;
    }
  }
}
 
function exportWorkoutData(){
  return JSON.stringify(collectPersistable(),null,2);
}
 
function downloadWorkoutBackup(){
  const blob=new Blob([exportWorkoutData()],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  const stamp=new Date().toISOString().slice(0,10);
  link.href=url;link.download=`workout-app-backup-${stamp}.json`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
}
 



function corruptDataDownload(){
  if(!corruptQuarantineKey)return;
  Storage.loadBlob(corruptQuarantineKey).then(function(raw){
    const blob=new Blob([raw||''],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const link=document.createElement('a');
    link.href=url;link.download=`workout-app-corrupt-data-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }).catch(function(){});
}
$('#corruptDataExport')?.addEventListener('click',()=>{
  corruptDataDownload();
  if(typeof showToast==='function'){try{showToast('Damaged copy exported.');}catch(_){}}
   
});
$('#corruptDataDiscard')?.addEventListener('click',()=>{
  if(corruptQuarantineKey){Storage.deleteBlob(corruptQuarantineKey).catch(function(){});}
  corruptQuarantineKey=null;
  $('#corruptDataDialog')?.close();
  if(typeof showToast==='function'){try{showToast('Damaged copy discarded.');}catch(_){}}
});
$('#closeCorruptData')?.addEventListener('click',()=>$('#corruptDataDialog')?.close());
 
 
const PERSIST_TICK_MS=5000;
setInterval(persistTick,PERSIST_TICK_MS);
window.addEventListener('pagehide',persistSyncForUnload);
window.addEventListener('pagehide',persistNow);
//# sourceMappingURL=persistence.js.map
