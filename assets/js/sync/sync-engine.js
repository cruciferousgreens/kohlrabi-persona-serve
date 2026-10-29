 
     







































































      
     
    var Sync = window.Sync = window.Sync || {};
    (function(){
      'use strict';
      const SYNC_META_KEY='workout-sync:v1';
      const SYNC_PUSH_DEBOUNCE_MS=2500;
       


















      const LOCAL_ONLY_KEYS=new Set(['dashboardPeriod','statsPeriod','logPeriod','appearance','settingsSections','subscriptions']);
       
      function isLocalOnlyKey(key){return LOCAL_ONLY_KEYS.has(key);}

      let syncMeta=null;  
      let syncPushTimer=null;
      let syncBusy=false;
       










      let syncHold=false;
      let syncHoldSettled=false;
      let holdBootScalarSnaps={};
      const sessionHeldKeys=new Set();
       


      const HOLD_KEYS=['completed','templates','activeProgram','archivedPrograms','savedPrograms','customExercises','favorites','favoriteStamps'];

       
      function ensureSyncMeta(){
        if(syncMeta)return syncMeta;
        let parsed=null;
        try{const raw=localStorage.getItem(SYNC_META_KEY);if(raw)parsed=JSON.parse(raw);}catch(_){}
        syncMeta=(parsed&&typeof parsed==='object')?parsed:{};
        if(!syncMeta.keys||typeof syncMeta.keys!=='object')syncMeta.keys={};
        if(!syncMeta.tombstones||typeof syncMeta.tombstones!=='object')syncMeta.tombstones={};
         


        if(!syncMeta.itemMirror||typeof syncMeta.itemMirror!=='object')syncMeta.itemMirror={};
         



        if(syncMeta.wipeGenPushed===undefined){try{syncMeta.wipeGenPushed=currentWipeGen();}catch(_){syncMeta.wipeGenPushed=0;}}
        return syncMeta;
      }
       




      function resetSyncMeta(){syncMeta=null;resetSyncSession();}
       

      function resetSyncSession(){
        syncHold=false;
        syncHoldSettled=false;
        sessionHeldKeys.clear();
        holdBootScalarSnaps={};
      }
       
      function saveSyncMeta(){try{localStorage.setItem(SYNC_META_KEY,JSON.stringify(syncMeta));}catch(_){}}
       
      function getSyncMeta(){return ensureSyncMeta();}
       
      function snapshotOf(key){
         



        try{const s=JSON.stringify(getSyncableValue(key));return 'h:'+(typeof s==='string'?cyrb53(s):cyrb53('null'));}
        catch(_){return 'h:'+cyrb53('null');}
      }
       

      function isEmptySyncValue(key,value){
        if(value==null)return true;
        if(Array.isArray(value)){
          if(key==='templates')return !value.some(t=>t&&!t.builtIn);
          return value.length===0;
        }
        if(typeof value==='object')return Object.keys(value).length===0;
        return false;
      }
       
       






      const REVISIONED_KEYS=new Set(['completed','templates','archivedPrograms','customExercises','savedPrograms']);
       







       



      function itemHashesFor(key){
        const hashes={};
        try{
          const arr=getSyncableValue(key);
          if(Array.isArray(arr))for(const it of arr){
            if(it&&typeof it==='object'&&it.id!=null)hashes[String(it.id)]=cyrb53(JSON.stringify(it));
          }
        }catch(_){}
        return hashes;
      }
       
      function stampChangedItems(key,nowMs){
        const m=syncMeta.keys[key];
        let oldHashes=(m&&m.itemHashes)||null;
        if(!oldHashes){
           

          oldHashes={};
          try{
            const p=JSON.parse((m&&m.snapshot)||'null');
            if(Array.isArray(p))for(const it of p){
              if(it&&typeof it==='object'&&it.id!=null)oldHashes[String(it.id)]=cyrb53(JSON.stringify(it));
            }
          }catch(_){}
        }
        const arr=getSyncableValue(key);
        if(!Array.isArray(arr))return false;
        const newHashes={};
        let stamped=false;
        for(const it of arr){
          if(!it||typeof it!=='object'||it.id==null)continue;
          const sid=String(it.id);
          let h=null;
          try{h=cyrb53(JSON.stringify(it));}catch(_){continue;}
          newHashes[sid]=h;
          if(oldHashes[sid]!==h){
            try{it.updatedAt=nowMs;}catch(_){}
            try{newHashes[sid]=cyrb53(JSON.stringify(it));}catch(_){}
            stamped=true;
          }
        }
        if(m)m.itemHashes=newHashes;
        return stamped;
      }
       

      function itemRevisionMs(item){
        if(!item||typeof item!=='object')return null;
        const u=item.updatedAt;
        if(typeof u==='number'&&isFinite(u))return u;
        if(typeof u==='string'){const t=Date.parse(u);return isNaN(t)?null:t;}
        return null;
      }
       
       




       







      const REGISTRY_KEYS=new Set(['completed','templates','archivedPrograms','savedPrograms']);
       

      function isTombstoned(item){return !!(item&&typeof item==='object'&&item.deletedAt);}
       
      function liveItems(arr){return (Array.isArray(arr)?arr:[]).filter(item=>!isTombstoned(item));}
       



      const TOMBSTONE_MAX_AGE_MS=90*24*60*60*1000;
       
      function pruneOldTombstones(){
        ensureSyncMeta();
        const cutoff=Date.now()-TOMBSTONE_MAX_AGE_MS;
        let changed=false;
        for(const key of Object.keys(syncMeta.tombstones||{})){
          const raw=syncMeta.tombstones[key]||{};
          for(const id of Object.keys(raw)){
            if(!(Number(raw[id])>cutoff)){delete raw[id];changed=true;}
          }
          if(!Object.keys(raw).length)delete syncMeta.tombstones[key];
        }
        if(changed)saveSyncMeta();
      }
       
      function getTombstoneMap(key){
        ensureSyncMeta();
        pruneOldTombstones();
        const raw=(syncMeta.tombstones&&syncMeta.tombstones[key])||{};
        const map=new Map();
        for(const id of Object.keys(raw)){const ts=Number(raw[id]);if(ts>0)map.set(id,ts);}
        return map;
      }
       
      function setTombstoneMap(key,map){
        ensureSyncMeta();
        const obj={};
        for(const [id,ts] of map)if(ts>0)obj[id]=ts;
         

        const cur=(syncMeta.tombstones&&syncMeta.tombstones[key])||{};
        const curKeys=Object.keys(cur);
        let same=curKeys.length===map.size;
        if(same)for(const [id,ts] of map)if(Number(cur[id])!==ts){same=false;break;}
        if(same)return;
        if(map.size)syncMeta.tombstones[key]=obj;else delete syncMeta.tombstones[key];
        saveSyncMeta();
      }
       

      function clearTombstoneRegistry(){
        ensureSyncMeta();
        syncMeta.tombstones={};
         



        syncMeta.itemMirror={};
        saveSyncMeta();
      }
       




      function noteTombstone(key,id){
        if(id==null||!REGISTRY_KEYS.has(key))return;
        const map=getTombstoneMap(key), sid=String(id), now=Date.now();
        map.set(sid,Math.max(map.get(sid)||0,now));
        setTombstoneMap(key,map);
      }
       










      function tombstoneTsFresh(key,id){
        if(id==null||!REGISTRY_KEYS.has(key))return 0;
        try{
          const raw=localStorage.getItem(SYNC_META_KEY);
          const d=raw?JSON.parse(raw):null;
          const ts=d&&d.tombstones&&d.tombstones[key]?Number(d.tombstones[key][String(id)]):0;
          return ts>0?ts:0;
        }catch(_){return 0;}
      }
       



      function tombstoneAllForSync(){
        ensureSyncMeta();
        const now=Date.now();
        for(const key of REGISTRY_KEYS){
          const arr=getSyncableValue(key);
          if(!Array.isArray(arr))continue;
          const map=getTombstoneMap(key);
          for(const item of arr)if(item&&item.id!=null)map.set(String(item.id),now);
          setTombstoneMap(key,map);
        }
      }
       




      function tombstoneAllExceptForSync(keepByKey){
        ensureSyncMeta();
        const now=Date.now();
        for(const key of REGISTRY_KEYS){
          const arr=getSyncableValue(key);
          if(!Array.isArray(arr))continue;
          const keep=keepByKey&&keepByKey[key] instanceof Set?keepByKey[key]:null;
          const map=getTombstoneMap(key);
          for(const item of arr){
            if(!item||item.id==null)continue;
            if(keep&&keep.has(String(item.id)))continue;
            map.set(String(item.id),now);
          }
          setTombstoneMap(key,map);
        }
      }
       


      function injectTombstones(key,value){
        if(!REGISTRY_KEYS.has(key)||!Array.isArray(value))return value;
        const tombs=getTombstoneMap(key);
        if(!tombs.size)return value;
        const ids=new Set();
        for(const it of value)ids.add(it&&it.id!=null?String(it.id):null);
        const stubs=[];
        for(const [id,ts] of tombs)if(!ids.has(id))stubs.push({id:id,deletedAt:ts});
        return stubs.length?value.concat(stubs):value;
      }
       
      function adoptRemoteTombstones(key,arr){
        const map=getTombstoneMap(key);
        let changed=false;
        for(const item of (Array.isArray(arr)?arr:[])){
          if(isTombstoned(item)&&item.id!=null){
            const id=String(item.id), ts=Number(item.deletedAt)||0;
            if(ts>(map.get(id)||0)){map.set(id,ts);changed=true;}
          }
        }
        if(changed)setTombstoneMap(key,map);
      }
       
       


       






      function markSyncDirty(onlyKeys){
        ensureSyncMeta();
        const now=new Date().toISOString(), nowMs=Date.now();
        let any=false;
        for(const key of (Array.isArray(onlyKeys)?onlyKeys:SYNCABLE_KEYS)){
          if(isLocalOnlyKey(key)){
             


            if(syncMeta.keys[key])delete syncMeta.keys[key];
            continue;
          }
           




          if(!isEmptySyncValue(key,getSyncableValue(key))){
            noteSessionHeld(key);
            const heldMeta=syncMeta.keys[key];
            if(heldMeta&&heldMeta.deliberateEmpty)delete heldMeta.deliberateEmpty;
          }
          let snap=snapshotOf(key);
          const m=syncMeta.keys[key];
          if(!m){
             



            const empty=isEmptySyncValue(key,getSyncableValue(key));
            syncMeta.keys[key]={updatedAt:now,snapshot:snap,dirty:!empty,possessed:!empty,itemHashes:itemHashesFor(key)};
            if(!empty)any=true;
            continue;
          }
          if(m.snapshot!==snap){
             

            if(REVISIONED_KEYS.has(key)&&stampChangedItems(key,nowMs))snap=snapshotOf(key);
             









            const possessed=m.possessed||!isEmptySyncValue(key,getSyncableValue(key));
            syncMeta.keys[key]={updatedAt:now,snapshot:snap,dirty:true,pushedAt:m.pushedAt,possessed:possessed,itemHashes:m.itemHashes};
            any=true;
          }
        }
        if(any){saveSyncMeta();scheduleSyncPush();}
      }
       


      function syncKeyWasPossessed(key){
        const m=syncMeta.keys[key]||{};
        if(m.pushedAt)return true;
         

        if(typeof m.possessed==='boolean')return m.possessed;
        try{return !isEmptySyncValue(key,JSON.parse(m.snapshot||'null'));}
        catch(_){return false;}
      }
       
       



      function currentWipeGen(){
        let g=0;
        try{if(typeof wipeGeneration==='number'&&isFinite(wipeGeneration))g=wipeGeneration;}catch(_){}
        try{const v=parseInt(localStorage.getItem('workout-app:wipe-gen'),10);if(isFinite(v)&&v>g)g=v;}catch(_){}
        return g;
      }
       
      function noteSessionHeld(key){sessionHeldKeys.add(key);}
       










      function emptyDeleteEvidence(key){
        if(REGISTRY_KEYS.has(key)&&getTombstoneMap(key).size>0)return true;
        if(key==='customExercises'){
          const v=getSyncableValue(key);
          if(Array.isArray(v)&&v.some(item=>isTombstoned(item)))return true;
        }
        if(currentWipeGen()>((syncMeta&&syncMeta.wipeGenPushed)||0))return true;
        if(sessionHeldKeys.has(key))return true;
        const m=(syncMeta&&syncMeta.keys)?syncMeta.keys[key]:null;
        if(m&&m.deliberateEmpty)return true;
        return false;
      }
       













      function emptyDeleteEvidenceForAdopt(key,remoteValue){
        if(!REGISTRY_KEYS.has(key))return emptyDeleteEvidence(key);
        const map=getTombstoneMap(key);
        if(map.size&&Array.isArray(remoteValue)){
          for(const item of remoteValue){
            if(item&&!isTombstoned(item)&&item.id!=null&&map.has(String(item.id)))return true;
          }
        }
        if(currentWipeGen()>((syncMeta&&syncMeta.wipeGenPushed)||0))return true;
        if(sessionHeldKeys.has(key))return true;
        const m=(syncMeta&&syncMeta.keys)?syncMeta.keys[key]:null;
        if(m&&m.deliberateEmpty)return true;
        return false;
      }
       




      function noteSyncHold(){
        if(!syncHold){
          syncHold=true;
          holdBootScalarSnaps={};
          for(const key of SYNCABLE_KEYS){
            if(isLocalOnlyKey(key))continue;
            try{holdBootScalarSnaps[key]=snapshotOf(key);}catch(_){}
          }
        }
        syncHoldSettled=true;
      }
       








      function evaluateSyncHold(){
        if(syncHold||syncHoldSettled)return;
        ensureSyncMeta();
        let quarantined=false;
        try{quarantined=typeof corruptQuarantineKey!=='undefined'&&!!corruptQuarantineKey;}catch(_){}
        let anyHeld=false,anyUnexplainedDirty=false;
        for(const key of HOLD_KEYS){
          if(!isEmptySyncValue(key,getSyncableValue(key))){anyHeld=true;continue;}
          const m=syncMeta.keys[key];
          if(!m)continue;
          if((m.pushedAt||m.possessed)&&m.dirty&&!emptyDeleteEvidence(key))anyUnexplainedDirty=true;
        }
        if(anyHeld){syncHoldSettled=true;return;}
        if(quarantined||anyUnexplainedDirty){
          noteSyncHold();
          noteSyncError(new Error('Sync paused: this device loaded with empty data, so uploads are held until your cloud data is restored here. Nothing was sent to the cloud.'));
        }
      }
       



      function maybeLiftSyncHold(byKey){
        if(!syncHold)return;
        ensureSyncMeta();
        for(const key of HOLD_KEYS){
          const m=syncMeta.keys[key];
          if(!m||(!m.pushedAt&&!m.possessed))continue;
          if(!isEmptySyncValue(key,getSyncableValue(key)))continue;
          if(emptyDeleteEvidence(key))continue;
          const remote=byKey?byKey[key]:null;
          if(!remote||isEmptySyncValue(key,remote.value))continue;
          return;
        }
        syncHold=false;
        holdBootScalarSnaps={};
      }
       
      function scheduleSyncPush(){
        clearTimeout(syncPushTimer);
        syncPushTimer=setTimeout(()=>{syncCycle().catch(()=>{});},SYNC_PUSH_DEBOUNCE_MS);
      }
       
       


       

      const MIRROR_SCALAR_ID='_';
       







      function mirrorRowsFor(key,value){
        const nowIso=new Date().toISOString();
        if(value===null)return [{item_id:MIRROR_SCALAR_ID,payload:null,deleted:true,updated_at:nowIso}];
        if(!Array.isArray(value))return [{item_id:MIRROR_SCALAR_ID,payload:value===undefined?null:value,deleted:false,updated_at:nowIso}];
        const byId=new Map();
        for(const item of value){
          if(typeof item==='string'||typeof item==='number'){
            byId.set(String(item),{item_id:String(item),payload:item,deleted:false,updated_at:nowIso});
            continue;
          }
          if(!item||typeof item!=='object'||item.id==null)continue;
          const deleted=isTombstoned(item);
          const rev=itemRevisionMs(item);
          const stampMs=rev!=null?rev:(deleted?(Number(item.deletedAt)||null):null);
          byId.set(String(item.id),{item_id:String(item.id),payload:item,deleted:deleted,
            updated_at:stampMs!=null?new Date(stampMs).toISOString():nowIso});
        }
        return [...byId.values()];
      }
       

      function mirrorHashOf(row){
        try{return cyrb53(JSON.stringify([row.payload,row.deleted?1:0]));}catch(_){return cyrb53('null');}
      }
       
















      async function mirrorKeyItems(sb,user,key,value){
        try{
          ensureSyncMeta();
          if(!syncMeta.itemMirror||typeof syncMeta.itemMirror!=='object')syncMeta.itemMirror={};
          const desired=new Map();
          for(const r of mirrorRowsFor(key,value))desired.set(r.item_id,r);
          const desiredHashes={};
          for(const [id,r] of desired)desiredHashes[id]=mirrorHashOf(r);
          const prev=syncMeta.itemMirror[key]||{};
          const rows=[];
          for(const [id,r] of desired){
            if(prev[id]===desiredHashes[id])continue;
            rows.push({user_id:user.id,collection:key,item_id:id,payload:r.payload,deleted:r.deleted,updated_at:r.updated_at});
          }
          const nowIso=new Date().toISOString();
          for(const id of Object.keys(prev)){
            if(!desired.has(id))rows.push({user_id:user.id,collection:key,item_id:id,payload:null,deleted:true,updated_at:nowIso});
          }
          if(!rows.length){syncMeta.itemMirror[key]=desiredHashes;saveSyncMeta();return;}
          const {error}=await sb.from('user_items').upsert(rows,{onConflict:'user_id,collection,item_id'});
          if(error){noteSyncError(error);return;}
          syncMeta.itemMirror[key]=desiredHashes;
          saveSyncMeta();
        }catch(err){
          try{noteSyncError(err);}catch(_){}
        }
      }
       

      async function pushDirtyKeys(){
        ensureSyncMeta();
         


        evaluateSyncHold();
        if(syncHold)return false;
        const sb=await Sync.getSupabase();
        if(!sb||!navigator.onLine)return false;
        const user=await Sync.signedInUser();
        if(!user)return false;
         

        const dirty=SYNCABLE_KEYS.filter(key=>!isLocalOnlyKey(key)&&syncMeta.keys[key]&&syncMeta.keys[key].dirty);
        if(!dirty.length)return true;
        const blockedEmptyKeys=[];
        for(const key of dirty){
           





          const metaAtSend=syncMeta.keys[key];
          const rawVal=getSyncableValue(key);
          if(!isEmptySyncValue(key,rawVal))noteSessionHeld(key);
           
          const value=injectTombstones(key,rawVal);
           


          if(value===undefined)continue;
           







          if(value!==null&&isEmptySyncValue(key,rawVal)&&syncKeyWasPossessed(key)&&!emptyDeleteEvidence(key)){
            blockedEmptyKeys.push(key);
            continue;
          }
          if(value===null){
             






            if(!syncKeyWasPossessed(key)){if(syncMeta.keys[key]===metaAtSend)syncMeta.keys[key].dirty=false;continue;}
             


            if(!emptyDeleteEvidence(key)){blockedEmptyKeys.push(key);continue;}
            const {error:delError}=await sb.from('user_data').delete().eq('user_id',user.id).eq('key',key);
            if(delError){noteSyncError(delError);return false;}
            if(syncMeta.keys[key]===metaAtSend){
              syncMeta.keys[key].dirty=false;
               




              syncMeta.keys[key].pushedAt=new Date().toISOString();
              syncMeta.keys[key].pushedSnapshot=snapshotOf(key);
              delete syncMeta.keys[key].deliberateEmpty;
              delete syncMeta.keys[key].missingRowSeenAt;
              delete syncMeta.keys[key].remoteStamp;
              delete syncMeta.keys[key].remoteEmpty;
            }
             

            await mirrorKeyItems(sb,user,key,null);
            continue;
          }
          const row={user_id:user.id,key:key,value:value,updated_at:syncMeta.keys[key].updatedAt};
          const {error}=await sb.from('user_data').upsert(row,{onConflict:'user_id,key'});
          if(error){noteSyncError(error);return false;}
          if(syncMeta.keys[key]===metaAtSend){
            syncMeta.keys[key].dirty=false;
             





            syncMeta.keys[key].pushedAt=new Date().toISOString();
            syncMeta.keys[key].pushedSnapshot=snapshotOf(key);
            delete syncMeta.keys[key].deliberateEmpty;
            delete syncMeta.keys[key].missingRowSeenAt;
             



            syncMeta.keys[key].remoteStamp=row.updated_at;
            syncMeta.keys[key].remoteEmpty=isEmptySyncValue(key,value);
          }
           

          await mirrorKeyItems(sb,user,key,value);
        }
        if(blockedEmptyKeys.length){
           


          noteSyncError(new Error('Sync skipped emptied data with no delete on record — your cloud data was left untouched.'));
          saveSyncMeta();Sync.renderAccount();
          return false;
        }
         

        syncMeta.wipeGenPushed=Math.max(syncMeta.wipeGenPushed||0,currentWipeGen());
        syncMeta.lastSyncAt=new Date().toISOString();
        saveSyncMeta();Sync.renderAccount();
        return true;
      }
       



      function applyRemoteKey(key,remote){
         


        if(isLocalOnlyKey(key))return false;
        let dirty=false;
        if(REGISTRY_KEYS.has(key)&&Array.isArray(remote.value)){
          adoptRemoteTombstones(key,remote.value);
          if(getTombstoneMap(key).size){
             


            const res=mergeCollectionKey(key,getSyncableValue(key),remote.value);
            setTombstoneMap(key,res.tombstones);
            setSyncableValue(key,res.array);
            dirty=res.dirty;
          }else{
            setSyncableValue(key,remote.value.filter(item=>!isTombstoned(item)));
          }
        }else{
          setSyncableValue(key,remote.value);
        }
         






        const adoptedSnap=snapshotOf(key);
        syncMeta.keys[key]={updatedAt:remote.updated_at,snapshot:adoptedSnap,dirty:dirty,pushedAt:remote.updated_at,pushedSnapshot:adoptedSnap,itemHashes:itemHashesFor(key),remoteStamp:remote.updated_at,remoteEmpty:isEmptySyncValue(key,remote.value)};
        return dirty;
      }
       
       

      const MERGE_KEYS=new Set(['completed','templates','tags','exerciseTagPresets','archivedPrograms','savedPrograms','customExercises','favorites']);
       


      const ID_ITEM_KEYS=new Set(['completed','templates','archivedPrograms','savedPrograms','customExercises']);
       




      function hasUsableSyncId(item){
        if(item===null||typeof item!=='object')return false;
        const id=item.id;
        return (typeof id==='string'&&id!=='')||(typeof id==='number'&&isFinite(id));
      }
       



      function mergeStamp(key,item){
        if(item&&typeof item==='object'){
          if(item.id!=null)return 'id:'+String(item.id);
          return 'json:'+JSON.stringify(item);
        }
        const s=String(item);
        return (key==='tags'||key==='exerciseTagPresets')?'str:'+s.toLowerCase():'str:'+s;
      }
       

      function resolveLiveConflict(localItem,remoteItem){
        if(localItem===remoteItem)return {item:localItem,byRemote:false};
        const lj=JSON.stringify(localItem), rj=JSON.stringify(remoteItem);
        if(lj===rj)return {item:localItem,byRemote:false};
        if(!localItem||!remoteItem||typeof localItem!=='object'||typeof remoteItem!=='object'){
           







          if(typeof localItem!=='object'&&typeof remoteItem!=='object'
             &&localItem!=null&&remoteItem!=null
             &&String(remoteItem)<String(localItem))
            return {item:remoteItem,byRemote:false};
          return {item:localItem,byRemote:false};
        }
        const lRev=itemRevisionMs(localItem), rRev=itemRevisionMs(remoteItem);
        if(lRev!=null&&rRev!=null){
          if(rRev>lRev)return {item:remoteItem,byRemote:true};
          if(lRev>rRev)return {item:localItem,byRemote:false};
        }else if(lRev!=null){
           

          return {item:localItem,byRemote:false};
        }else if(rRev!=null){
          return {item:remoteItem,byRemote:true};
        }
         


        return lj<rj?{item:localItem,byRemote:false}:{item:remoteItem,byRemote:true};
      }
       




      function mergeCollectionKey(key,localArr,remoteArr){
        const stats={added:0,updated:0,removed:0};
        const useRegistry=REGISTRY_KEYS.has(key);
        const localList=Array.isArray(localArr)?localArr:[];
        let remoteList=Array.isArray(remoteArr)?remoteArr:[];
         



        if(ID_ITEM_KEYS.has(key)&&remoteList.length){
          const clean=remoteList.filter(hasUsableSyncId);
          if(clean.length!==remoteList.length){
            try{if(typeof console!=='undefined'&&console.warn)console.warn('[sync] dropped '+(remoteList.length-clean.length)+' malformed remote item(s) for key '+key);}catch(_){}
            remoteList=clean;
          }
        }
         




        const localTombs=new Map(), localRecs=new Map(), localLive=[];
        const remoteTombs=new Map(), remoteRecs=new Map(), remoteLive=[];
        const split=(list,tombs,recs,live)=>{
          for(const item of list){
            if(isTombstoned(item)&&item.id!=null){
              const id=String(item.id), ts=Number(item.deletedAt)||0;
              if(ts>(tombs.get(id)||0)){tombs.set(id,ts);recs.set(id,item);}
            }else live.push(item);
          }
        };
        split(localList,localTombs,localRecs,localLive);
        split(remoteList,remoteTombs,remoteRecs,remoteLive);
         

        const mergedTombs=new Map(useRegistry?getTombstoneMap(key):[]);
        const mergedRecs=new Map();
        const take=(tombs,recs)=>{
          for(const [id,ts] of tombs){
            if(ts>(mergedTombs.get(id)||0)){mergedTombs.set(id,ts);mergedRecs.set(id,recs.get(id));}
            else if(!mergedRecs.has(id)&&recs.has(id))mergedRecs.set(id,recs.get(id));
          }
        };
        take(localTombs,localRecs);take(remoteTombs,remoteRecs);
         



        const tombIds=new Set(mergedTombs.keys());
        const survives=(item,side)=>{
          const id=item&&item.id!=null?String(item.id):null;
          if(id==null||!tombIds.has(id))return true;
          const liveRev=itemRevisionMs(item), tombTs=mergedTombs.get(id)||0;
          if(liveRev!=null&&liveRev>tombTs){
            mergedTombs.delete(id);mergedRecs.delete(id);tombIds.delete(id);
            return true;
          }
          if(side==='local')stats.removed++;
          return false;
        };
        const lLive=localLive.filter(it=>survives(it,'local'));
        const rLive=remoteLive.filter(it=>survives(it,'remote'));
         

        const byStamp=new Map(), order=[];
        let remoteNeedsUpdate=false;
        for(const it of lLive){const s=mergeStamp(key,it);if(!byStamp.has(s)){byStamp.set(s,it);order.push(s);}}
        for(const it of rLive){
          const s=mergeStamp(key,it);
          if(!byStamp.has(s)){byStamp.set(s,it);order.push(s);stats.added++;}
          else{
            const cur=byStamp.get(s), w=resolveLiveConflict(cur,it);
            if(w.item!==cur){
              byStamp.set(s,w.item);
              if(w.byRemote)stats.updated++;
               


              else remoteNeedsUpdate=true;
            }else if(JSON.stringify(cur)!==JSON.stringify(it)){
               






              remoteNeedsUpdate=true;
            }
          }
        }
        const mergedLive=order.map(s=>byStamp.get(s));
         

        let array;
        if(useRegistry)array=mergedLive;
        else if(key==='customExercises'){
          const recs=[];
          for(const id of tombIds){const r=mergedRecs.get(id);if(r)recs.push(r);}
          array=mergedLive.concat(recs);
        }else array=mergedLive;
        const before=JSON.stringify(useRegistry?localLive:localList);
         




        let regDiffers=false;
        if(useRegistry){
          if(mergedTombs.size!==remoteTombs.size)regDiffers=true;
          else for(const [id,ts] of mergedTombs)if(remoteTombs.get(id)!==ts){regDiffers=true;break;}
        }
        return {array:array,tombstones:mergedTombs,stats:stats,dirty:before!==JSON.stringify(array)||regDiffers||remoteNeedsUpdate};
      }
       
      function mergeToastText(r){
        const parts=[];
        if(r.added)parts.push(r.added+' new item'+(r.added===1?'':'s')+' from your other device');
        if(r.updated)parts.push(r.updated+' updated to the newer version'+(r.updated===1?'':'s'));
        if(r.removed)parts.push(r.removed+' removed (deleted on another device)');
        return 'Synced with cloud: '+parts.join('; ')+'.';
      }
       





      let lastMergeToastAt=0, lastSyncErrorAt=0, syncCycleManual=false, syncCycleStart=0, lastPullReport=null;
       
      function noteSyncError(err){lastSyncErrorAt=Date.now();Sync.showSyncError(err);}
       
      function maybeMergeToast(report,ctx){
        if(workoutState.draft)return;
        const manual=ctx&&ctx.manual!==undefined?ctx.manual:syncCycleManual;
        const firstSync=ctx&&ctx.firstSync!==undefined?ctx.firstSync:(!syncMeta||!syncMeta.everSynced);
        const cycleStart=ctx&&ctx.cycleStart!==undefined?ctx.cycleStart:syncCycleStart;
        const errorAt=ctx&&ctx.errorAt!==undefined?ctx.errorAt:lastSyncErrorAt;
        const total=(report.added||0)+(report.updated||0)+(report.removed||0);
        const meaningful=(report.removed||0)>0||total>=4;
        const longRun=Date.now()-cycleStart>15000;  
         



        if(!manual&&!firstSync&&!longRun&&!meaningful)return;
        if(!manual&&Date.now()-errorAt<120000)return;
        if(!manual){
          const now=Date.now();
          if(now-lastMergeToastAt<60000)return;
          lastMergeToastAt=now;
        }
        Sync.syncToast(mergeToastText(report));
      }
       



      async function pullRemote(){
        ensureSyncMeta();
         

        evaluateSyncHold();
        lastPullReport=null;
        const sb=await Sync.getSupabase();
        if(!sb||!navigator.onLine)return false;
        const user=await Sync.signedInUser();
        if(!user)return false;
         





























        const byKey={};
        if(syncHold){
          const {data:rows,error}=await sb.from('user_data').select('key,value,updated_at').eq('user_id',user.id);
          if(error){noteSyncError(error);return false;}
          (rows||[]).forEach(r=>{if(r&&typeof r.key==='string')byKey[r.key]=r;});
        }else{
          const {data:idxRows,error}=await sb.from('user_data').select('key,updated_at').eq('user_id',user.id);
          if(error){noteSyncError(error);return false;}
          const idx={};
          (idxRows||[]).forEach(r=>{if(r&&typeof r.key==='string')idx[r.key]=r;});
          const needValue=[];
          for(const key of SYNCABLE_KEYS){
            if(isLocalOnlyKey(key))continue;
            const idxRow=idx[key];
            if(!idxRow)continue;
            const m=syncMeta.keys[key];
            if(!m||typeof m.remoteStamp!=='string'||m.remoteStamp!==idxRow.updated_at||typeof m.remoteEmpty!=='boolean'){needValue.push(key);continue;}
            const lv=getSyncableValue(key);
            if(isEmptySyncValue(key,lv)||snapshotOf(key)!==m.snapshot)needValue.push(key);
          }
          for(const key of needValue){
             

            const {data:vrows,error:vErr}=await sb.from('user_data').select('key,value,updated_at').eq('key',key);
            if(vErr){noteSyncError(vErr);return false;}
            (vrows||[]).forEach(r=>{if(r&&r.key===key)byKey[key]=r;});
          }
          for(const key of SYNCABLE_KEYS){
            if(isLocalOnlyKey(key))continue;
            if(idx[key]&&!byKey[key])byKey[key]={key:key,updated_at:idx[key].updated_at,selectiveSkip:true};
          }
        }
         







        let baseline=null;
        if(!syncMeta.everSynced){
          try{
            const raw=await Storage.loadBlob(PERSIST_KEY);
            const d=raw?JSON.parse(raw):null;
            if(d&&d.savedAt)baseline=new Date(d.savedAt).toISOString();
          }catch(_){}
        }
        let changed=false,customChanged=false;
        const report={added:0,updated:0,removed:0};
        for(const key of SYNCABLE_KEYS){
           

          if(isLocalOnlyKey(key))continue;
          let m=syncMeta.keys[key];
          const isNew=!m;
          if(!m)m=syncMeta.keys[key]={updatedAt:baseline||new Date(0).toISOString(),snapshot:snapshotOf(key),dirty:false};
          const remote=byKey[key];
          const localVal=getSyncableValue(key);
          const localEmpty=isEmptySyncValue(key,localVal);
           


          if(!localEmpty)noteSessionHeld(key);
          if(remote&&m.missingRowSeenAt)delete m.missingRowSeenAt;
           





          if(remote&&remote.selectiveSkip)continue;
           










          const scalarDirty=!MERGE_KEYS.has(key)&&(!!m.dirty||m.snapshot!==snapshotOf(key));
          if(!remote){
             



            if(m.remoteStamp!==undefined){delete m.remoteStamp;delete m.remoteEmpty;}
             








            if(!localEmpty&&(isNew||!m.pushedAt||!m.pushedSnapshot||m.snapshot!==snapshotOf(key))){m.updatedAt=new Date().toISOString();m.snapshot=snapshotOf(key);m.dirty=true;}
            else if(!localEmpty&&!m.dirty&&m.pushedSnapshot===snapshotOf(key)){
               

















              if(key==='activeProgram'){
                if(m.missingRowSeenAt){
                  clearSyncableKey(key);
                  syncMeta.keys[key]={updatedAt:new Date(0).toISOString(),snapshot:snapshotOf(key),dirty:false,pushedSnapshot:snapshotOf(key)};
                  changed=true;
                }else{
                  m.missingRowSeenAt=new Date().toISOString();
                }
              }else{
                m.updatedAt=new Date().toISOString();m.snapshot=snapshotOf(key);m.dirty=true;
              }
            }
             


            continue;
          }
          const remoteEmpty=isEmptySyncValue(key,remote.value);
           



          m.remoteStamp=remote.updated_at;
          m.remoteEmpty=remoteEmpty;
          if(remoteEmpty&&!localEmpty){
             











            if(!scalarDirty&&remote.updated_at>m.updatedAt){applyRemoteKey(key,remote);changed=true;if(key==='customExercises')customChanged=true;continue;}
            m.updatedAt=new Date().toISOString();m.snapshot=snapshotOf(key);m.dirty=true;continue;
          }
          if(!remoteEmpty&&localEmpty){
             















            if(syncHold||!emptyDeleteEvidenceForAdopt(key,remote.value)){applyRemoteKey(key,remote);changed=true;if(key==='customExercises')customChanged=true;}
            continue;
          }
          if(MERGE_KEYS.has(key)&&!remoteEmpty&&!localEmpty){
             



            const res=mergeCollectionKey(key,localVal,remote.value);
             



            if(REGISTRY_KEYS.has(key))setTombstoneMap(key,res.tombstones);
            if(res.dirty){
              setSyncableValue(key,res.array);
              m.updatedAt=new Date().toISOString();
              m.snapshot=snapshotOf(key);
              m.itemHashes=itemHashesFor(key);
              m.dirty=true;changed=true;
              if(key==='customExercises')customChanged=true;
              report.added+=res.stats.added;report.updated+=res.stats.updated;report.removed+=res.stats.removed;
            }
            continue;
          }
          if(syncHold&&!MERGE_KEYS.has(key)&&holdBootScalarSnaps[key]!==undefined&&holdBootScalarSnaps[key]===snapshotOf(key)){
             






            applyRemoteKey(key,remote);changed=true;if(key==='customExercises')customChanged=true;
          }else if(scalarDirty){
             


            m.dirty=true;
          }else if(remote.updated_at>m.updatedAt){
            applyRemoteKey(key,remote);changed=true;if(key==='customExercises')customChanged=true;
          }
        }
        saveSyncMeta();
         


        if(syncHold)maybeLiftSyncHold(byKey);
        if(customChanged&&typeof mergeCustomExercises==='function'){try{mergeCustomExercises();}catch(_){}}
        lastPullReport={added:report.added,updated:report.updated,removed:report.removed};
        if(report.added||report.updated||report.removed)maybeMergeToast(report);
        if(changed){
          persistNow();
          rerenderCurrentView(report);
        }
        syncMeta.lastSyncAt=new Date().toISOString();
        saveSyncMeta();
        return true;
      }
       

      function rerenderCurrentView(report){
        try{
          if(workoutState.draft){
             


            if(typeof maybeRefreshDraftSuggestions==='function'){try{maybeRefreshDraftSuggestions();}catch(_){}}
            return;
          }
          const v=state.activeView;
          if(v==='dashboard'&&typeof renderDashboard==='function')renderDashboard();
          else if(v==='library'&&typeof renderLibrary==='function')renderLibrary();
          else if(v==='workout'&&typeof renderWorkoutScreen==='function')renderWorkoutScreen();
          else if(v==='program'&&typeof renderProgram==='function')renderProgram();
          else if(v==='stats'&&typeof renderStats==='function'){
             


            if(report&&report.meaningful&&typeof paintStatsSkeleton==='function'&&typeof requestAnimationFrame==='function'){
              paintStatsSkeleton();
              requestAnimationFrame(()=>requestAnimationFrame(()=>{try{renderStats();}catch(_){}}));
            }else renderStats();
          }
          else if(v==='settings'&&typeof renderSettings==='function')renderSettings();
          if(typeof updateLiveWorkoutIndicator==='function')updateLiveWorkoutIndicator();
        }catch(_){}
      }
       
       



      async function wipeRemoteData(){
        const sb=await Sync.getSupabase();
        if(!sb||!navigator.onLine)return false;
        try{
          const {data}=await sb.auth.getSession();
          const user=data&&data.session&&data.session.user?data.session.user:null;
          if(!user)return false;
          const {error}=await sb.from('user_data').delete().eq('user_id',user.id);
          if(error)return false;
           


          try{await sb.from('share_links').delete().eq('created_by',user.id);}catch(_){}
          try{if(typeof clearShareSlugMemo==='function')clearShareSlugMemo();}catch(_){}  
           


          try{await sb.from('user_items').delete().eq('user_id',user.id);}catch(_){}
        }catch(_){return false;}
         
        ensureSyncMeta();
        const now=new Date().toISOString();
        for(const key of SYNCABLE_KEYS)syncMeta.keys[key]={updatedAt:now,snapshot:snapshotOf(key),dirty:false};
        if(syncMeta.tombstones)syncMeta.tombstones={};
        if(syncMeta.itemMirror)syncMeta.itemMirror={};
        saveSyncMeta();
        return true;
      }
       



      async function pushDeleteAllRemote(){
        ensureSyncMeta();
        const sb=await Sync.getSupabase();
        if(!sb||!navigator.onLine)return false;
        const user=await Sync.signedInUser();
        if(!user)return false;
        const ok=await pushDirtyKeys();
        if(ok){try{await pullRemote();}catch(_){}}
        return ok;
      }
       
      async function syncCycle(opts){
        if(syncBusy)return false;
        syncBusy=true;
        syncCycleManual=!!(opts&&opts.manual);  
        syncCycleStart=Date.now();
        try{
          ensureSyncMeta();
          const pulled=await pullRemote();
           

          if(pulled&&!syncHold)await pushDirtyKeys();
          if(pulled&&!syncMeta.everSynced){syncMeta.everSynced=true;saveSyncMeta();}
          return pulled;
        }finally{syncBusy=false;syncCycleManual=false;}
      }
       
       





      function clearSyncableKey(key){
        switch(key){
          case 'completed':workoutState.completed=[];break;
          case 'templates':workoutState.templates=[];break;
          case 'tags':workoutState.tags=mergeTagLists(DEFAULT_SET_TAGS,[]);break;
          case 'exerciseTagPresets':workoutState.exerciseTagPresets=mergeTagLists(DEFAULT_EXERCISE_TAG_PRESETS,[]);break;
          case 'activeProgram':workoutState.activeProgram=null;break;
          case 'archivedPrograms':workoutState.archivedPrograms=[];break;
           



          case 'savedPrograms':workoutState.savedPrograms=[];break;
          case 'customExercises':state.customExercises=[];exercises=exercises.filter(ex=>!ex.custom);break;
          case 'favorites':state.favorites=new Set();break;
          case 'progressionSetup':resetProgressionSetup();break;
        }
      }

      Sync.ensureSyncMeta=ensureSyncMeta;
      Sync.resetSyncMeta=resetSyncMeta;
      Sync.resetSyncSession=resetSyncSession;  
      Sync.noteSyncHold=noteSyncHold;  
      Sync.syncHoldActive=function(){return syncHold;};  
      Sync.saveSyncMeta=saveSyncMeta;
      Sync.getSyncMeta=getSyncMeta;
      Sync.snapshotOf=snapshotOf;
      Sync.isEmptySyncValue=isEmptySyncValue;
      Sync.markSyncDirty=markSyncDirty;
      Sync.pushDirtyKeys=pushDirtyKeys;
      Sync.mirrorKeyItems=mirrorKeyItems;  
      Sync.syncCycle=syncCycle;
      Sync.maybeMergeToast=maybeMergeToast;  
      Sync.lastMergeReport=function(){return lastPullReport;};
      Sync.applyRemoteKey=applyRemoteKey;
      Sync.mergeCollectionKey=mergeCollectionKey;  
      Sync.clearSyncableKey=clearSyncableKey;
      Sync.wipeRemoteData=wipeRemoteData;
      Sync.pushDeleteAllRemote=pushDeleteAllRemote;
      Sync.noteTombstone=noteTombstone;
      Sync.tombstoneTsFresh=tombstoneTsFresh;
      Sync.tombstoneAllForSync=tombstoneAllForSync;
      Sync.tombstoneAllExceptForSync=tombstoneAllExceptForSync;      Sync.clearTombstoneRegistry=clearTombstoneRegistry;
      Sync.rerenderCurrentView=rerenderCurrentView;
      Sync.isTombstoned=isTombstoned;
      Sync.liveItems=liveItems;
      Sync.MERGE_KEYS=MERGE_KEYS;
      Sync.LOCAL_ONLY_KEYS=LOCAL_ONLY_KEYS;  
      Sync.isLocalOnlyKey=isLocalOnlyKey;
    })();
     

    function markSyncDirty(onlyKeys){return Sync.markSyncDirty(onlyKeys);}
     



     
    function pushDeleteAllRemote(){return Sync.pushDeleteAllRemote();}
     
    function noteTombstone(key,id){return Sync.noteTombstone(key,id);}
     
    function tombstoneTsFresh(key,id){return Sync.tombstoneTsFresh(key,id);}
     
    function tombstoneAllForSync(){return Sync.tombstoneAllForSync();}
     
    function tombstoneAllExceptForSync(keepByKey){return Sync.tombstoneAllExceptForSync(keepByKey);}
     
    function isTombstoned(item){return Sync.isTombstoned(item);}
//# sourceMappingURL=sync-engine.js.map
