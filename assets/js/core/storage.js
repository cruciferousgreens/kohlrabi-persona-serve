
 
 








 

function cyrb53(str,seed){
  seed=seed||0;
  let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;
  for(let i=0,ch;i<str.length;i++){
    ch=str.charCodeAt(i);
    h1=Math.imul(h1^ch,2654435761);
    h2=Math.imul(h2^ch,1597334677);
  }
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);
  h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (h2>>>0).toString(36)+(h1>>>0).toString(36);
}
const IDB_DB_NAME='workout-app';
const IDB_STORE_NAME='kv';
let _idbDbPromise=null;
 

function _openIdb(){
  if(_idbDbPromise)return _idbDbPromise;
  _idbDbPromise=new Promise(function(resolve){
    let settled=false;
    const done=function(v){if(!settled){settled=true;resolve(v);}};
    setTimeout(function(){done(null);},3000);
    let req;
    try{
      if(typeof indexedDB==='undefined'){done(null);return;}
      req=indexedDB.open(IDB_DB_NAME,1);
    }catch(_){done(null);return;}
    req.onupgradeneeded=function(){try{req.result.createObjectStore(IDB_STORE_NAME);}catch(_){}};
    req.onsuccess=function(){let db=null;try{db=req.result;}catch(_){}
       





      if(db){try{db.onversionchange=function(){try{db.close();}catch(_){}_idbDbPromise=null;};db.onclose=function(){_idbDbPromise=null;};}catch(_){}}
      done(db);};
    req.onerror=function(){done(null);};
    req.onblocked=function(){done(null);};
  });
  return _idbDbPromise;
}
 
function _idbGet(key){
  return _openIdb().then(function(db){
    if(!db)return undefined;
    return new Promise(function(resolve){
      let req;
      try{req=db.transaction(IDB_STORE_NAME,'readonly').objectStore(IDB_STORE_NAME).get(key);}
      catch(_){resolve(undefined);return;}
      req.onsuccess=function(){let v;try{v=req.result;}catch(_){resolve(undefined);return;}resolve(v===undefined?null:v);};
      req.onerror=function(){resolve(undefined);};
    });
  });
}
 



function _idbSet(key,value){
  return _openIdb().then(function(db){
    if(!db)return false;
    return new Promise(function(resolve){
      let tx;
      try{
        tx=db.transaction(IDB_STORE_NAME,'readwrite');
        tx.objectStore(IDB_STORE_NAME).put(value,key);
      }catch(_){resolve(false);return;}
      tx.oncomplete=function(){resolve(true);};
      tx.onerror=function(){resolve(false);};
      tx.onabort=function(){resolve(false);};
    });
  });
}
 
function _idbDel(key){
  return _openIdb().then(function(db){
    if(!db)return false;
    return new Promise(function(resolve){
      let tx;
      try{
        tx=db.transaction(IDB_STORE_NAME,'readwrite');
        tx.objectStore(IDB_STORE_NAME).delete(key);
      }catch(_){resolve(false);return;}
      tx.oncomplete=function(){resolve(true);};
      tx.onerror=function(){resolve(false);};
      tx.onabort=function(){resolve(false);};
    });
  });
}
const Storage={
  backend:null,  
   

  async probe(){
    if(this.backend)return this.backend;
    try{
      const w=await _idbSet('__probe','1');
      if(w){
        const back=await _idbGet('__probe');
        await _idbDel('__probe');
        if(back==='1'){this.backend='idb';return 'idb';}
      }
    }catch(_){}
    this.backend='localStorage';
    return 'localStorage';
  },
   

  idbGet(key){return _idbGet(key);},
  idbSet(key,value){return _idbSet(key,value);},
  idbDel(key){return _idbDel(key);},
   






  lastReadFailed:false,
  async loadBlob(key){
    this.lastReadFailed=false;
    if(await this.probe()==='idb'){
      const v=await this.idbGet(key);
      if(v!==undefined)return v;
      this.lastReadFailed=true;
    }
    try{return localStorage.getItem(key);}catch(_){return null;}
  },
   


  async saveBlob(key,str){
    const s=String(str);
    if(await this.probe()==='idb'){
      if(await this.idbSet(key,s))return true;
       





      _idbDbPromise=null;
      if(await this.idbSet(key,s))return true;
      return false;
    }
    try{localStorage.setItem(key,s);return true;}catch(_){return false;}
  },
  async deleteBlob(key){
    if(await this.probe()==='idb')await this.idbDel(key);
    try{localStorage.removeItem(key);}catch(_){}
  },
   







  async deleteBlobDurable(key){
    for(let attempt=0;attempt<2;attempt++){
      try{await this.idbDel(key);}catch(_){ }
      let still='unknown';
      try{still=await this.idbGet(key);}catch(_){still='unknown';}
      if(still===null)return true;  
       

      if(still===undefined||still==='unknown')return false;
       
    }
    return false;
  },
};
//# sourceMappingURL=storage.js.map
