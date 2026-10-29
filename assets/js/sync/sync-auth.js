 
     















      
     
    var Sync = window.Sync = window.Sync || {};
    (function(){
      'use strict';
       




      const ADOPTED_UID_KEY='workout-app:adopted-uid';
       
      function getAdoptedUid(){try{return localStorage.getItem(ADOPTED_UID_KEY)||null;}catch(_){return null;}}
       
      function setAdoptedUid(uid){try{localStorage.setItem(ADOPTED_UID_KEY,uid);}catch(_){}}
       
      function clearAdoptedUid(){try{localStorage.removeItem(ADOPTED_UID_KEY);}catch(_){}}
       





      async function waitForLoginSettled(uid,timeoutMs){
        if(!uid)return false;
        const budget=typeof timeoutMs==='number'&&timeoutMs>0?timeoutMs:10000;
        const t0=Date.now();
        while(Date.now()-t0<budget){
          if(getAdoptedUid()===uid)return true;
          await new Promise(r=>setTimeout(r,150));
        }
        return getAdoptedUid()===uid;
      }
      let syncInitialized=false, authListenerAttached=false;

       


      Sync.lastAuthUid=Sync.lastAuthUid||null;
      Sync.lastAuthEmail=Sync.lastAuthEmail||'';
       
      try{if(window.lastAuthUid===undefined)window.lastAuthUid=null;}catch(_){}
       

      Sync.lastAuthProfile=Sync.lastAuthProfile||{display_name:'',account_type:'free'};
       
      function setAuthIdentity(uid,email){
        Sync.lastAuthUid=uid;
        Sync.lastAuthEmail=email||'';
        try{window.lastAuthUid=uid;}catch(_){}  
      }
       



      async function requestSignInCode(opts){
        const email=(opts&&opts.email||'').trim();
        const setStatus=(opts&&opts.setStatus)||Sync.setAccountStatus;
        if(!email||email.indexOf('@')<0){setStatus('Enter a valid email address.',true);return false;}
        const left=Sync.magicLinkCooldownRemaining();
        if(left>0){setStatus('Wait '+Math.ceil(left/1000)+'s before requesting another link.',true);return false;}
         



        try{if(Sync.resetSupabaseUnavailable)Sync.resetSupabaseUnavailable();}catch(_){}
        const sb=await Sync.getSupabase();
        if(!sb){setStatus('Can\u2019t reach the network \u2014 try again when you\u2019re online.',true);return false;}
        setStatus('Sending code\u2026');
        try{
          const {error}=await sb.auth.signInWithOtp({email:email,options:{emailRedirectTo:location.origin+location.pathname}});
           




          if(!authNetworkError(error))Sync.startMagicLinkCooldown();
          if(error){setStatus(sendLinkErrorText(error),true);return false;}
          return true;
        }catch(err){setStatus(requestErrorText(err,'Could not send the code.'),true);return false;}
      }
       
      function setResendVisible(visible){
        try{const b=$('#resendCodeButton');if(b)b.hidden=!visible;}catch(_){}
      }
       
      async function sendSignInLink(){
         
        setResendVisible(false);
        const input=$('#accountEmail');
        const email=(input&&input.value||'').trim();
        const ok=await requestSignInCode({email,setStatus:Sync.setAccountStatus});
         


        if(!ok){if(email&&email.indexOf('@')>=0)setResendVisible(true);return;}
         
        const otpStep=$('#otpStep');
        if(otpStep)otpStep.hidden=false;
         


        Sync.setAccountStatus('Code sent, enter it above.');
      }
       



      async function confirmSignInCode(opts){
        const email=(opts&&opts.email||'').trim();
        const token=(opts&&opts.token||'').trim().replace(/[\s-]+/g,'');
        const setStatus=(opts&&opts.setStatus)||Sync.setAccountStatus;
        if(!email||email.indexOf('@')<0){setStatus('Enter your email address above first.',true);return false;}
        if(!token){setStatus('Enter the code from the email.',true);return false;}
         

        try{if(Sync.resetSupabaseUnavailable)Sync.resetSupabaseUnavailable();}catch(_){}
        const sb=await Sync.getSupabase();
        if(!sb){setStatus('Can\u2019t reach the network \u2014 try again when you\u2019re online.',true);return false;}
        setStatus('Verifying code\u2026');
        try{
          const {error}=await sb.auth.verifyOtp({email:email,token:token,type:'email'});
          if(error){setStatus(otpErrorText(error),true);return false;}
           

          setStatus('');
          return true;
        }catch(err){setStatus(requestErrorText(err,'Could not verify the code.'),true);return false;}
      }
       
      async function verifySignInCode(){
         
        setResendVisible(false);
        const emailInput=$('#accountEmail');
        const input=$('#accountOtp');
        const ok=await confirmSignInCode({email:(emailInput&&emailInput.value||''),token:(input&&input.value||''),setStatus:Sync.setAccountStatus});
        if(!ok){setResendVisible(true);return;}
        if(ok&&input)input.value='';
      }
       




      function authNetworkError(err){
        try{if(Sync.isNetworkError&&Sync.isNetworkError(err))return true;}catch(_){}
        const m=String((err&&(err.message||err))||'').toLowerCase();
        return /load failed|failed to fetch|network error|network request failed|fetch failed|econn|etimedout|enotfound|socket|offline/.test(m);
      }
      const AUTH_NETWORK_MSG='Can\u2019t reach the network \u2014 check your connection and try again.';
       
      function sendLinkErrorText(error){
        if(authNetworkError(error))return AUTH_NETWORK_MSG;
        const msg=String((error&&error.message)||'');
        const low=msg.toLowerCase();
        if(low.indexOf('rate limit')>=0||low.indexOf('too many')>=0||/after \d+ second/.test(low))
          return 'Too many requests \u2014 wait a moment, then tap \u2018Email me a code\u2019 again.';
        if(low.indexOf('error sending')>=0||low.indexOf('could not send')>=0)
          return 'Couldn\u2019t send the email \u2014 double-check the address and try again.';
        return msg||'Could not send the code.';
      }
       
      function otpErrorText(error){
        if(authNetworkError(error))return AUTH_NETWORK_MSG;
        const msg=String((error&&error.message)||'');
        const low=msg.toLowerCase();
        if(low.indexOf('expired')>=0)return 'That code expired \u2014 tap \u2018Send a code\u2019 for a fresh one.';  
        if(low.indexOf('invalid')>=0||low.indexOf('used')>=0||low.indexOf('token')>=0)return 'That code didn\u2019t work \u2014 double-check it against the email and try again.';
        return msg||'Could not verify the code.';
      }
       
      function requestErrorText(err,fallback){
        if(authNetworkError(err))return AUTH_NETWORK_MSG;
        return (err&&err.message)||fallback;
      }
       
      async function saveDisplayName(){
        const sb=await Sync.getSupabase();
        if(!sb){Sync.setAccountStatus('Can\u2019t reach the network \u2014 try again when you\u2019re online.',true);return;}
        const value=(($('#editNameInput')&&$('#editNameInput').value)||'').trim().slice(0,60);
        try{
          const {error}=await sb.auth.updateUser({data:{display_name:value}});
          if(error){Sync.setAccountStatus(error.message,true);return;}
        }catch(err){Sync.setAccountStatus((err&&err.message)||'Could not save the name.',true);return;}
        Sync.lastAuthProfile.display_name=value;
        const d=$('#editNameDialog');if(d)d.close();
        Sync.setAccountStatus('');
        Sync.renderAccount();
      }
       




      function isValidEmailAddress(v){return typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
       
      async function saveAccountEmail(){
        const sb=await Sync.getSupabase();
        if(!sb){Sync.setAccountStatus('Can\u2019t reach the network \u2014 try again when you\u2019re online.',true);return;}
        const value=(($('#editEmailInput')&&$('#editEmailInput').value)||'').trim();
        if(!isValidEmailAddress(value)){Sync.setAccountStatus('Enter a valid email address.',true);return;}
        if(value.toLowerCase()===(Sync.lastAuthEmail||'').toLowerCase()){Sync.setAccountStatus('That\u2019s already your sign-in email.',true);return;}
        try{
          const {error}=await sb.auth.updateUser({email:value});
          if(error){Sync.setAccountStatus(error.message,true);return;}
        }catch(err){Sync.setAccountStatus((err&&err.message)||'Could not change the email.',true);return;}
        const d=$('#editEmailDialog');if(d)d.close();
        Sync.renderAccount();
        Sync.setAccountStatus('Confirmation sent to '+value+' \u2014 tap the link there to complete the change.');
      }
       
      async function signOutAccount(){
         





        try{
          if(typeof Sync.pushDirtyKeys==='function'){
            await Promise.race([
              Sync.pushDirtyKeys(),
              new Promise(function(res){setTimeout(res,8000);})
            ]);
          }
        }catch(_){}
        const sb=await Sync.getSupabase();
         






        try{if(sb)await sb.auth.signOut({scope:'local'});}catch(_){}
        setAuthIdentity(null,'');
        Sync.lastAuthProfile={display_name:'',account_type:'free'};
         


        if(typeof Sync.clearMagicLinkCooldown==='function')Sync.clearMagicLinkCooldown();
         

        clearAdoptedUid();
         




        if(typeof wipeLocalUserData==='function'){try{await wipeLocalUserData({removeSyncKeys:true});}catch(_){}}
        if(Sync.resetSyncMeta)Sync.resetSyncMeta();
        Sync.setAccountStatus('Signed out.');
        Sync.renderAccount();
         

        if(typeof noteShareAuthChanged==='function'){try{noteShareAuthChanged();}catch(_){}}
         
        setTimeout(()=>location.reload(),1200);
      }
       
      async function syncNowManual(){
        Sync.setAccountStatus('Syncing\u2026');
        const ok=await Sync.syncCycle({manual:true});  
        if(ok){
          Sync.setAccountStatus('');
           

          const r=Sync.lastMergeReport?Sync.lastMergeReport():null;
          const total=r?(r.added||0)+(r.updated||0)+(r.removed||0):0;
          if(!total)Sync.syncToast('Up to date.');
        }
        else Sync.setAccountStatus('Sync unavailable \u2014 sign in and check your connection.',true);
        Sync.renderAccount();
      }
       
       





      let signInChoiceResolver=null,signInChoiceWired=false;
       


      Sync.pendingKeepWorkoutId=null;
       
      function wireSignInChoice(){
        if(signInChoiceWired)return;signInChoiceWired=true;
        const done=choice=>{
          try{$('#signInChoiceDialog').close();}catch(_){}
          const r=signInChoiceResolver;signInChoiceResolver=null;
          if(r)r(choice);
        };
        document.querySelectorAll('[data-signin-choice]').forEach(b=>b.addEventListener('click',()=>done(b.dataset.signinChoice)));
         



        $('#signInChoiceDeviceBtn')?.addEventListener('click',()=>{
          $('#signInChoiceMain').hidden=true;
          $('#signInChoiceConfirm').hidden=false;
        });
        $('#signInChoiceBack')?.addEventListener('click',()=>{
          $('#signInChoiceConfirm').hidden=true;
          $('#signInChoiceMain').hidden=false;
        });
         
        $('#signInChoiceDialog')?.addEventListener('cancel',e=>{e.preventDefault();});
        $('#signInChoiceDialog')?.addEventListener('close',()=>{if(signInChoiceResolver)done(null);});
      }
       







      const ACCOUNT_MINIMAL_THRESHOLD=5;
       

      function accountSubstance(byKey){
        const val=k=>{try{const r=byKey[k];return (r&&'value' in r)?r.value:null;}catch(_){return null;}};
        const arr=k=>{const v=val(k);return Array.isArray(v)?v:[];};
        const logs=arr('completed').length;
         
        const saved=arr('templates').filter(t=>t&&!t.builtIn).length;
        const ap=val('activeProgram');
        const programs=((ap&&typeof ap==='object'&&Object.keys(ap).length)?1:0)
          +arr('savedPrograms').length+arr('archivedPrograms').length;
        const customs=arr('customExercises').length;
        return {logs,saved,programs,customs,total:logs+saved+programs+customs};
      }
       

      let signInChoiceSubstance=null;
       


      function recommendSignInChoice(substance){
        const s=substance||{saved:1,total:ACCOUNT_MINIMAL_THRESHOLD};
        if(s.saved===0)return 'both';  
        return s.total>=ACCOUNT_MINIMAL_THRESHOLD?'cloud':'both';
      }
       
      function renderSignInChoiceForSubstance(){
        const substance=signInChoiceSubstance||{saved:1,total:ACCOUNT_MINIMAL_THRESHOLD};
        const hideCloud=substance.saved===0;
        const targetKey=recommendSignInChoice(substance);
        ['#signInChoiceMain','#signInChoiceConfirm'].forEach(viewSel=>{
          const view=document.querySelector(viewSel);if(!view)return;
          view.querySelectorAll('.choice-option').forEach(opt=>{
            opt.classList.remove('choice-recommended');
            const badge=opt.querySelector('.recommended-badge');
            if(badge)badge.remove();
            if(opt.dataset&&opt.dataset.signinChoice==='cloud')opt.hidden=hideCloud;
            if(opt.dataset&&opt.dataset.signinChoice===targetKey){
              opt.classList.add('choice-recommended');
              const strong=opt.querySelector('strong');
              if(strong&&!strong.querySelector('.recommended-badge')){
                const b=document.createElement('span');
                b.className='recommended-badge';b.textContent='Recommended';b.style.setProperty('color','#fff','important');
                strong.appendChild(b);
              }
            }
          });
           
          view.querySelectorAll('.choice-or').forEach(el=>{el.hidden=hideCloud;});
        });
      }
       
      function askSignInChoice(){
        wireSignInChoice();
        return new Promise(resolve=>{
          signInChoiceResolver=resolve;
          const dlg=$('#signInChoiceDialog');
           

          try{$('#signInChoiceMain').hidden=false;$('#signInChoiceConfirm').hidden=true;}catch(_){}
          renderSignInChoiceForSubstance();
          if(dlg&&typeof dlg.showModal==='function'){try{dlg.showModal();}catch(_){resolve(null);}}
          else resolve(null);
        });
      }
       






      function signInValueHasUserData(key,value){
        if(Sync.isEmptySyncValue(key,value))return false;
        if(Array.isArray(value)){
          if(key==='tags'&&typeof DEFAULT_SET_TAGS!=='undefined')
            return value.some(t=>!DEFAULT_SET_TAGS.includes(t));
          if(key==='exerciseTagPresets'&&typeof DEFAULT_EXERCISE_TAG_PRESETS!=='undefined')
            return value.some(t=>!DEFAULT_EXERCISE_TAG_PRESETS.includes(t));
        }
        return true;
      }
       
      function signInLocalHasData(dataKeys){
        return dataKeys.some(k=>{try{return signInValueHasUserData(k,getSyncableValue(k));}catch(_){return false;}});
      }
       








      async function adoptOrUploadOnSignIn(user){
        Sync.ensureSyncMeta();
        const sb=await Sync.getSupabase();
        if(!sb||!navigator.onLine)return false;
         





        let accountFresh=false;
        try{
          const createdMs=Date.parse(user&&user.created_at);
          accountFresh=Number.isFinite(createdMs)&&(Date.now()-createdMs)<60*1000;
        }catch(_){accountFresh=false;}
        if(accountFresh){
          const ok=await Sync.syncCycle();
          if(ok)Sync.setAccountStatus('Signed in \u2014 your data was saved to your account.');
          return ok;
        }
        let rows;
        try{
          const res=await sb.from('user_data').select('key,value,updated_at').eq('user_id',user.id);
          if(res.error){Sync.showSyncError(res.error);return false;}
          rows=res.data;
        }catch(err){Sync.showSyncError(err);return false;}
        const byKey={};
        (rows||[]).forEach(r=>{if(r&&typeof r.key==='string')byKey[r.key]=r;});
         

        const substance=accountSubstance(byKey);
         

        const dataKeys=(typeof DATA_SYNC_KEYS!=='undefined')?DATA_SYNC_KEYS:SYNCABLE_KEYS;
        const remoteHasData=dataKeys.some(k=>byKey[k]&&!Sync.isEmptySyncValue(k,byKey[k].value));
         


        if(!remoteHasData||substance.total===0){
           

          const ok=await Sync.syncCycle();
          if(ok)Sync.setAccountStatus('Signed in \u2014 your data was saved to your account.');
          return ok;
        }
         



        const localHasData=signInLocalHasData(dataKeys);
        if(localHasData){
           

           


          const cloudOpt=document.querySelector('#signInChoiceDialog [data-signin-choice="cloud"] .choice-desc');
          const origCloudCopy=cloudOpt?cloudOpt.textContent:null;
          if(Sync.pendingKeepWorkoutId&&cloudOpt)cloudOpt.textContent+=' The workout you just finished is kept regardless.';
          signInChoiceSubstance=substance;
          const choice=await askSignInChoice();
          signInChoiceSubstance=null;
          if(cloudOpt&&origCloudCopy!==null)cloudOpt.textContent=origCloudCopy;
          if(choice==='both'){
            const ok=await Sync.syncCycle();
            if(ok)Sync.setAccountStatus('Signed in \u2014 merged this device with your account.');
            return ok;
          }
          if(choice==='device'){
             




















            const nowMs=Date.now(), nowIso=new Date(nowMs).toISOString();
            for(const key of dataKeys){
              const local=getSyncableValue(key);
              if(Array.isArray(local))for(const it of local){
                if(it&&typeof it==='object'&&it.id!=null&&!Sync.isTombstoned(it)){try{it.updatedAt=nowMs;}catch(_){}}
              }
            }
            for(const key of dataKeys){
              const remote=byKey[key], local=getSyncableValue(key);
              if(!remote||!Array.isArray(remote.value)||!Array.isArray(local))continue;
              const localIds=new Set();
              for(const it of local)if(it&&typeof it==='object'&&it.id!=null)localIds.add(String(it.id));
              let stubbed=false;
              for(const rItem of remote.value){
                if(!rItem||typeof rItem!=='object'||rItem.id==null||Sync.isTombstoned(rItem))continue;
                if(localIds.has(String(rItem.id)))continue;
                Sync.noteTombstone(key,rItem.id);
                if(key==='customExercises'){local.push({id:rItem.id,deletedAt:nowMs});stubbed=true;}
              }
              if(stubbed)setSyncableValue(key,local);
            }
            Sync.markSyncDirty();
            const meta=Sync.getSyncMeta();
            for(const key of dataKeys){
              const m=meta.keys[key];
              if(m){
                m.updatedAt=nowIso;m.dirty=true;m.possessed=true;
                 





                if((key==='activeProgram'||key==='favoriteStamps')&&Sync.isEmptySyncValue(key,getSyncableValue(key)))m.deliberateEmpty=true;
              }
            }
            Sync.saveSyncMeta();
            persistNow();
            const ok=await Sync.syncCycle();
            if(ok)Sync.setAccountStatus('Signed in \u2014 your device\u2019s data was saved to your account.');
            return ok;
          }
           


          if(choice!=='cloud')return false;
        }
         



        Sync.clearTombstoneRegistry();
         

        let keepWorkout=null;
        if(Sync.pendingKeepWorkoutId){
           
          try{
            const local=getSyncableValue('completed');
            if(Array.isArray(local))keepWorkout=local.find(w=>w&&w.id===Sync.pendingKeepWorkoutId)||null;
          }catch(_){keepWorkout=null;}
        }
        const meta=Sync.getSyncMeta();
        for(const key of SYNCABLE_KEYS){
          const remote=byKey[key];
          if(remote)Sync.applyRemoteKey(key,remote);
          else{
            Sync.clearSyncableKey(key);
            meta.keys[key]={updatedAt:new Date(0).toISOString(),snapshot:Sync.snapshotOf(key),dirty:false};
          }
        }
        if(typeof mergeCustomExercises==='function'){try{mergeCustomExercises();}catch(_){}}
        Sync.saveSyncMeta();
        persistNow();
        if(keepWorkout){
           

          const arr=getSyncableValue('completed');
          if(Array.isArray(arr)&&!arr.some(w=>w&&w.id===keepWorkout.id)){
            arr.unshift(keepWorkout);
            setSyncableValue('completed',arr);
            Sync.markSyncDirty();
            persistNow();
          }
        }
        Sync.pendingKeepWorkoutId=null;
         



        try{
          const ids=new Set((workoutState.templates||[]).map(t=>t&&t.id));
          if(state.savedWorkoutId&&!ids.has(state.savedWorkoutId))state.savedWorkoutId=null;
        }catch(_){}
        Sync.rerenderCurrentView();
        meta.everSynced=true;
        Sync.saveSyncMeta();
        Sync.setAccountStatus(keepWorkout?'Signed in \u2014 loaded your account data. The workout you just finished was kept and will sync up.':'Signed in \u2014 loaded your account data. Anything previously on this device was replaced.');
        return true;
      }
       

      async function handleAuthChange(session){
        const user=session&&session.user?session.user:null;
        const uid=user?user.id:null;
        const meta=(user&&user.user_metadata)||{};
         


        Sync.lastAuthProfile={display_name:meta.display_name||'',account_type:meta.account_type||'free'};
         

        if(user&&!meta.account_type){
          try{const sb=await Sync.getSupabase();if(sb)await sb.auth.updateUser({data:{account_type:'free'}});}catch(_){}
        }
        if(uid===Sync.lastAuthUid&&syncInitialized){Sync.renderAccount();return;}
        setAuthIdentity(uid,user?(user.email||''):'');
         

        if(typeof noteShareAuthChanged==='function'){try{noteShareAuthChanged();}catch(_){}}
        if(!user){clearAdoptedUid();syncInitialized=false;Sync.renderAccount();return;}
         


        const SYNCING_TEXT='Syncing\u2026';
        Sync.setAccountStatus(SYNCING_TEXT);
        try{
          if(getAdoptedUid()===uid){await Sync.syncCycle();Sync.setAccountStatus('');syncInitialized=true;}
          else{
            const settled=await adoptOrUploadOnSignIn(user);
            if(settled){setAdoptedUid(uid);syncInitialized=true;}
             


            const statusEl=$('#accountStatus');
            if(statusEl&&statusEl.textContent===SYNCING_TEXT)Sync.setAccountStatus('');
             





          }
           



          try{if(typeof queueEmailSync==='function')queueEmailSync();}catch(_){}
           





          try{Sync.rerenderCurrentView();}catch(_){}
        }catch(err){Sync.showSyncError(err);}
        Sync.renderAccount();
      }
       
      async function resumeSync(){
         




        const hadAuthCode=/[?&]code=/.test(location.search);
        const hashErr=Sync.authCallbackErrorText();
        const sb=await Sync.getSupabase();
        if(!sb){
          if(hashErr||hadAuthCode)Sync.showAuthRecovery((hashErr||'That sign-in link didn\u2019t work.')+' No network connection \u2014 reconnect and try again.');
           





          else if(typeof navigator!=='undefined'&&navigator&&navigator.onLine===false)Sync.setAccountStatus('Sync unavailable offline \u2014 your data stays on this device.',true);
          else if(typeof Sync.supabaseFailure==='function'&&Sync.supabaseFailure()==='load')Sync.setAccountStatus('Sync unavailable \u2014 couldn\u2019t load the sync library. Your data stays on this device.',true);
          else Sync.setAccountStatus('Sync unavailable \u2014 your data stays on this device.',true);
          return;
        }
        let sessionUser=null;
        try{
          if(!authListenerAttached){
            authListenerAttached=true;
            sb.auth.onAuthStateChange((_event,s)=>{handleAuthChange(s).catch(()=>{});});
          }
          const {data}=await sb.auth.getSession();
          const session=data&&data.session?data.session:null;
          sessionUser=session?session.user:null;
          await handleAuthChange(session);
          if(!session&&(hadAuthCode||hashErr)){
            Sync.showAuthRecovery((hashErr||'That sign-in link didn\u2019t work \u2014 it may have expired, already been used, or been opened in a different browser.')+' Enter the code from the email below, or tap \u2018Email me a code\u2019 for a fresh one.');
          }
           

          if(session&&syncInitialized){
            Sync.setAccountStatus('Syncing\u2026');
            await Sync.syncCycle();
            Sync.setAccountStatus('');
          }
        }catch(_){ }
         





        try{
          let freshAccount=false;
          try{
             



            const createdAt=Date.parse(sessionUser&&sessionUser.created_at);
            freshAccount=Number.isFinite(createdAt)&&(Date.now()-createdAt)<60*1000;
          }catch(_){ }
          if(freshAccount&&typeof maybeStartPostSignupOnboarding==='function'){
            await maybeStartPostSignupOnboarding(true);
          }
        }catch(_){ }
        Sync.renderAccount();
      }
       
      function initSync(){
        Sync.wireAccountUI();
        Sync.renderAccount();
         
        window.addEventListener('online',()=>{Sync.resetSupabaseUnavailable();resumeSync().catch(()=>{});});
         




        document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(typeof navigator==='undefined'||!navigator||navigator.onLine!==false)Sync.resetSupabaseUnavailable();resumeSync().catch(()=>{});}});
        resumeSync().catch(()=>{});
      }

      Sync.waitForLoginSettled=waitForLoginSettled;
      Sync.sendSignInLink=sendSignInLink;
      Sync.verifySignInCode=verifySignInCode;
      Sync.requestSignInCode=requestSignInCode;
      Sync.confirmSignInCode=confirmSignInCode;
      Sync.saveDisplayName=saveDisplayName;
      Sync.saveAccountEmail=saveAccountEmail;  
      Sync.isValidEmailAddress=isValidEmailAddress;  
      Sync.accountSubstance=accountSubstance;  
      Sync.recommendSignInChoice=recommendSignInChoice;  
      Sync.signInValueHasUserData=signInValueHasUserData;  
      Sync.signInLocalHasData=signInLocalHasData;  
      Sync.signOutAccount=signOutAccount;
      Sync.syncNowManual=syncNowManual;
      Sync.handleAuthChange=handleAuthChange;
      Sync.initSync=initSync;
    })();
     


//# sourceMappingURL=sync-auth.js.map
