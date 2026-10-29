 
 

 

 













const EMAIL_SYNC_WORKER_URL='https://kohlrabi.us/api/email/subscribe';
const EMAIL_SYNC_DEBOUNCE_MS=2000;
const EO_TAG_FOR_KEY={appUpdates:'app-updates',marketing:'newsletter',tips:'app-tips'};
let emailSyncTimer=0;
 
function emailSyncTagMap(){
  const map={};
  try{
    SUBSCRIPTION_KEYS.forEach(k=>{map[EO_TAG_FOR_KEY[k]]=subscriptionOn(k);});
  }catch(_){ }
  return map;
}
 
function emailSyncHashFor(email,tags){
  return String(email)+'|'+SUBSCRIPTION_KEYS.map(k=>tags[EO_TAG_FOR_KEY[k]]?'1':'0').join('');
}
 
function queueEmailSync(){
  try{if(emailSyncTimer)clearTimeout(emailSyncTimer);}catch(_){}
  emailSyncTimer=setTimeout(()=>{
    emailSyncTimer=0;
    try{syncEmailSubscriptions().catch(()=>{});}catch(_){}
  },EMAIL_SYNC_DEBOUNCE_MS);
}
 
async function syncEmailSubscriptions(){
  let email='';
  try{email=(typeof Sync!=='undefined'&&Sync&&Sync.lastAuthEmail)||'';}catch(_){}
  email=String(email).trim();
  if(!email||email.indexOf('@')<0)return{ok:false,reason:'signed-out'};
  const tags=emailSyncTagMap();
  let prev='';
  try{prev=(typeof state!=='undefined'&&state&&state.emailSyncHash)||'';}catch(_){}
  const hash=emailSyncHashFor(email,tags);
  if(hash===prev)return{ok:true,reason:'unchanged'};
  const anyOn=Object.keys(tags).some(t=>tags[t]===true);
   
  if(!anyOn&&!prev)return{ok:true,reason:'nothing-to-sync'};
  let res=null;
  try{
    res=await fetch(EMAIL_SYNC_WORKER_URL,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({email:email,tags:tags}),
    });
  }catch(_){return{ok:false,reason:'network'};}
  if(!res||!res.ok)return{ok:false,reason:'worker-'+((res&&res.status)||'error')};
  let data=null;
  try{data=await res.json();}catch(_){}
  if(!data||data.ok!==true)return{ok:false,reason:'worker-error'};
  try{
    state.emailSyncHash=hash;
    if(typeof schedulePersist==='function')schedulePersist();
  }catch(_){}
  return{ok:true,reason:'synced'};
}
 
try{
  if(typeof window!=='undefined'&&window&&typeof window.addEventListener==='function'){
    window.addEventListener('online',()=>{try{queueEmailSync();}catch(_){}});
  }
}catch(_){}
//# sourceMappingURL=email-sync.js.map
