 
     





      
     
    var Sync = window.Sync = window.Sync || {};
    (function(){
      'use strict';
       
      function setAccountStatus(msg,isError){
        const el=$('#accountStatus');
        if(el){el.textContent=msg||'';el.classList.toggle('is-error',!!isError);}
         
        if(!isError){const retry=$('#retrySyncButton');if(retry)retry.hidden=true;}
      }
       



      function syncErrorText(err){
        if(Sync.isNetworkError(err))return 'Sync failed: could not reach the network. Check your connection and try again.';
        return 'Sync failed: '+((err&&err.message)||'please try again.');
      }
      let syncRetryTimer=null;
       
      function showSyncError(err){
        setAccountStatus(syncErrorText(err),true);
        const retry=$('#retrySyncButton');if(retry)retry.hidden=false;
        if(Sync.isNetworkError(err)){
          clearTimeout(syncRetryTimer);
          syncRetryTimer=setTimeout(()=>{Sync.syncCycle().catch(()=>{});},15000);
        }
      }
       

       



      function syncToast(msg){
        toastService(msg,{onAbsent:()=>setAccountStatus(msg)});
      }
       
      function renderAccount(){
        Sync.ensureSyncMeta();
        const signedIn=!!Sync.lastAuthUid;
        const outEl=$('#accountSignedOut'),inEl=$('#accountSignedIn');
        if(!outEl||!inEl)return;
        outEl.hidden=signedIn;inEl.hidden=!signedIn;
         

         


        const nudgeRow=$('#signinNudgeRow');
        if(nudgeRow)nudgeRow.hidden=signedIn;
         

        const settingsDelBtn=$('#settingsDeleteAccountButton');
        if(settingsDelBtn)settingsDelBtn.hidden=!signedIn;
         

        const mktSec=$('#settingsView details[data-section="marketing"]');
        if(mktSec)mktSec.hidden=!signedIn;
        if(signedIn){
          const rowEmail=$('#accountRowEmail');
          if(rowEmail)rowEmail.textContent=Sync.lastAuthEmail||'';
          const dlgEmail=$('#accountDialogEmail');
          if(dlgEmail)dlgEmail.textContent=Sync.lastAuthEmail||'';
          const profile=Sync.lastAuthProfile||{display_name:'',account_type:'free'};
          const nameEl=$('#accountDialogName');
          if(nameEl)nameEl.textContent=profile.display_name||'—';
          const planEl=$('#accountDialogPlan');
          if(planEl)planEl.textContent=profile.account_type==='free'?'Free plan':String(profile.account_type||'Free plan');
          const syncEl=$('#accountDialogSync');
          if(syncEl)syncEl.textContent=Sync.getSyncMeta().lastSyncAt?new Date(Sync.getSyncMeta().lastSyncAt).toLocaleString():'Not synced yet';
        }
      }
       
      const MAGIC_LINK_COOLDOWN_MS=120000;
      const MAGIC_LINK_COOLDOWN_KEY='workout-magiclink-cooldown';
       







      const MAGIC_LINK_COOLDOWN_SESSION='workout-magiclink-cooldown-session';
       
      function magicLinkCooldownOwnsFlow(){
        try{return sessionStorage.getItem(MAGIC_LINK_COOLDOWN_SESSION)==='1';}catch(_){return false;}
      }
      let magicLinkCooldownTimer=null;
       
      function magicLinkCooldownRemaining(){
        let ts=0;
        try{ts=parseInt(localStorage.getItem(MAGIC_LINK_COOLDOWN_KEY)||'0',10)||0;}catch(_){}
        return Math.max(0,ts+MAGIC_LINK_COOLDOWN_MS-Date.now());
      }
       
      function fmtCooldown(ms){
        const s=Math.ceil(ms/1000),m=Math.floor(s/60);
        return m+':'+String(s%60).padStart(2,'0');
      }
       
      function tickMagicLinkCooldown(){
        const btn=$('#sendMagicLinkButton');
        const left=magicLinkCooldownRemaining();
         

        if(left<=0||!magicLinkCooldownOwnsFlow()){
          if(magicLinkCooldownTimer){clearInterval(magicLinkCooldownTimer);magicLinkCooldownTimer=null;}
          if(btn){btn.disabled=false;btn.textContent='Email me a code';}
          try{localStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);}catch(_){}
          try{sessionStorage.removeItem(MAGIC_LINK_COOLDOWN_SESSION);}catch(_){}
          return;
        }
        if(btn){btn.disabled=true;btn.textContent='Resend in '+fmtCooldown(left);}
      }
       
      function startMagicLinkCooldown(){
        try{localStorage.setItem(MAGIC_LINK_COOLDOWN_KEY,String(Date.now()));}catch(_){}
        try{sessionStorage.setItem(MAGIC_LINK_COOLDOWN_SESSION,'1');}catch(_){}
        tickMagicLinkCooldown();
        if(magicLinkCooldownTimer)clearInterval(magicLinkCooldownTimer);
        magicLinkCooldownTimer=setInterval(tickMagicLinkCooldown,1000);
      }
       


      function clearMagicLinkCooldown(){
        if(magicLinkCooldownTimer){clearInterval(magicLinkCooldownTimer);magicLinkCooldownTimer=null;}
        try{localStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);}catch(_){}
        try{sessionStorage.removeItem(MAGIC_LINK_COOLDOWN_SESSION);}catch(_){}
        const btn=$('#sendMagicLinkButton');
        if(btn){btn.disabled=false;btn.textContent='Email me a code';}
      }
       


      function authCallbackErrorText(){
        const hash=location.hash||'';
        if(!hash.includes('error='))return null;
        const params=new URLSearchParams(hash.slice(1));
        const desc=(params.get('error_description')||'').toLowerCase();
        const code=(params.get('error')||'').toLowerCase();
        let msg='That sign-in link didn\u2019t work.';
        if(typeof navigator!=='undefined'&&navigator&&navigator.onLine===false)msg='No network connection when that link was opened. Reconnect and try again.';
        else if(desc.includes('expired')||code.includes('expired'))msg='That sign-in link expired.';
        else if(desc.includes('already')||desc.includes('used')||code.includes('invalid'))msg='That sign-in link was already used or is invalid.';
        return msg;
      }
       
      function showAuthRecovery(msg){
        const s=$('#otpStep');
        if(s)s.hidden=false;
        clearMagicLinkCooldown();
         
        try{
          const u=new URL(location.href);
          u.searchParams.delete('code');
          u.hash='';
          history.replaceState(null,'',u.pathname+u.search+u.hash);
        }catch(_){}
        setAccountStatus(msg,true);
      }
       
       




      const SIGNIN_NUDGE_DISMISSED_KEY='workout-signin-nudge-dismissed';
       
      function signinNudgeDismissed(){try{return localStorage.getItem(SIGNIN_NUDGE_DISMISSED_KEY)==='1';}catch(_){return false;}}
       
      function setSigninNudgeDismissed(){try{localStorage.setItem(SIGNIN_NUDGE_DISMISSED_KEY,'1');}catch(_){}}
       

      function clearSigninNudgeDismissed(){try{localStorage.removeItem(SIGNIN_NUDGE_DISMISSED_KEY);}catch(_){}}
       
      function maybeShowSigninNudge(opts){
        try{if(Sync&&Sync.lastAuthUid)return;}catch(_){}  
        if(signinNudgeDismissed())return;
         









        if(opts&&opts.inline){
          const host=$('#completionSigninNudge');
          if(host){
            try{Sync.nudgeJustFinishedWorkoutId=workoutState.completed&&workoutState.completed[0]&&workoutState.completed[0].id?workoutState.completed[0].id:null;}catch(_){Sync.nudgeJustFinishedWorkoutId=null;}
            host.innerHTML=`<div class="completion-nudge"><div><strong>Back up this workout</strong><p>You&rsquo;re signed out, so this workout lives only on this device. Sign in to sync it across your devices and keep it safe.</p></div><div class="completion-nudge-actions"><button class="primary-button" type="button" id="completionNudgeSignIn">Sign in</button><button class="secondary-button" type="button" id="completionNudgeDismiss">Dismiss</button></div><label class="nudge-dont-show"><input type="checkbox" id="completionNudgeDontShow"> Don&rsquo;t show again</label></div>`;
            const signInBtn=$('#completionNudgeSignIn'),dismissBtn=$('#completionNudgeDismiss');
            if(signInBtn)signInBtn.addEventListener('click',()=>{const dontShow=!!($('#completionNudgeDontShow')?.checked);host.innerHTML='';maybeShowSigninNudge({keepWorkout:true});if(dontShow){const cb2=$('#signinNudgeDontShow');if(cb2)cb2.checked=true;}});
            if(dismissBtn)dismissBtn.addEventListener('click',()=>{if($('#completionNudgeDontShow')?.checked)setSigninNudgeDismissed();host.innerHTML='';});
            return;
          }
        }
         

        const d=$('#signinNudgeDialog');if(!d)return;
        const cb=$('#signinNudgeDontShow');if(cb)cb.checked=false;
         




        const keepEnabled=!(opts&&opts.keepWorkout===false);
        try{Sync.nudgeJustFinishedWorkoutId=keepEnabled&&workoutState.completed&&workoutState.completed[0]&&workoutState.completed[0].id?workoutState.completed[0].id:null;}catch(_){Sync.nudgeJustFinishedWorkoutId=null;}
        const keep=$('#signinNudgeKeepWorkout');if(keep){keep.checked=!!Sync.nudgeJustFinishedWorkoutId;try{const lbl=keep.closest('label');if(lbl)lbl.hidden=!keepEnabled;}catch(_){}}
        showNudgeStep(1);
        setNudgeResendVisible(false);  
         





        const showNudge=()=>{try{if(d&&!d.open)d.showModal();}catch(_){}};
        if(d.open){showNudgeStep(1);}
        else{
          showNudge();
          if(!d.open){
            if(typeof requestAnimationFrame==='function')requestAnimationFrame(showNudge);
            else setTimeout(showNudge,50);
          }
        }
      }
       


      let nudgeSignInCooldownTimer=null;
       
      function setNudgeSignInStatus(msg,isError){
        const el=$('#nudgeSignInStatus');
        if(el){el.textContent=msg||'';el.classList.toggle('is-error',!!isError);}
      }
       
      function setNudgeResendVisible(visible){
        try{const b=$('#nudgeResendCode');if(b)b.hidden=!visible;}catch(_){}
      }
       
      function nudgeSignInTickCooldown(){
        const btn=$('#nudgeSignInSendCode');if(!btn)return;
        let left=0;
        try{left=(typeof Sync!=='undefined'&&Sync&&typeof Sync.magicLinkCooldownRemaining==='function')?Sync.magicLinkCooldownRemaining():0;}catch(_){}
         

        if(left>0&&!magicLinkCooldownOwnsFlow()){try{localStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);}catch(_){}left=0;}
        if(left<=0){btn.disabled=false;btn.textContent='Email me a code';}
        else{btn.disabled=true;const s=Math.ceil(left/1000);btn.textContent='Resend in '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
      }
       
      function showNudgeStep(which){
        const s1=$('#signinNudgeStep1'),s2=$('#signinNudgeStep2');
        if(s1)s1.hidden=which!==1;
        if(s2)s2.hidden=which!==2;
      }
       
      function wireSigninNudge(){
        const closeNudge=()=>{
          if($('#signinNudgeDontShow')?.checked)setSigninNudgeDismissed();
          if(nudgeSignInCooldownTimer){clearInterval(nudgeSignInCooldownTimer);nudgeSignInCooldownTimer=null;}
          $('#signinNudgeDialog')?.close();
        };
        $('#closeSigninNudge')?.addEventListener('click',closeNudge);
        $('#closeSigninNudgeStep2')?.addEventListener('click',closeNudge);
        $('#signinNudgeDismiss')?.addEventListener('click',closeNudge);
        $('#signinNudgeSignIn')?.addEventListener('click',()=>{
          if($('#signinNudgeDontShow')?.checked)setSigninNudgeDismissed();
           
          setNudgeSignInStatus('');
          const otpStep=$('#nudgeSignInOtpStep');if(otpStep)otpStep.hidden=true;
          const otp=$('#nudgeSignInOtp');if(otp)otp.value='';
          showNudgeStep(2);
          nudgeSignInTickCooldown();
          if(nudgeSignInCooldownTimer)clearInterval(nudgeSignInCooldownTimer);
          nudgeSignInCooldownTimer=setInterval(nudgeSignInTickCooldown,1000);
          try{$('#nudgeSignInEmail')?.focus({preventScroll:true});}catch(_){}
        });
        $('#nudgeSignInBack')?.addEventListener('click',()=>{showNudgeStep(1);});
         
        async function nudgeSendCode(){
          const email=(($('#nudgeSignInEmail')||{}).value||'');
          setNudgeResendVisible(false);
          if(typeof Sync.requestSignInCode!=='function'){setNudgeSignInStatus('Sign-in is unavailable right now.',true);setNudgeResendVisible(true);return;}
          const ok=await Sync.requestSignInCode({email:email,setStatus:setNudgeSignInStatus});
          if(!ok){setNudgeResendVisible(true);return;}
          const otpStep=$('#nudgeSignInOtpStep');if(otpStep)otpStep.hidden=false;
          setNudgeSignInStatus('Code sent, enter it above.');
          nudgeSignInTickCooldown();
          try{$('#nudgeSignInOtp')?.focus({preventScroll:true});}catch(_){}
        }
        $('#nudgeSignInSendCode')?.addEventListener('click',()=>{nudgeSendCode().catch(()=>{});});
        $('#nudgeResendCode')?.addEventListener('click',()=>{nudgeSendCode().catch(()=>{});});
        $('#nudgeSignInVerify')?.addEventListener('click',async()=>{
          const email=(($('#nudgeSignInEmail')||{}).value||'');
          const otpEl=$('#nudgeSignInOtp');
          const token=(otpEl&&otpEl.value)||'';
          setNudgeResendVisible(false);
          if(typeof Sync.confirmSignInCode!=='function'){setNudgeSignInStatus('Sign-in is unavailable right now.',true);setNudgeResendVisible(true);return;}
           

          try{Sync.pendingKeepWorkoutId=(($('#signinNudgeKeepWorkout')||{}).checked)?(Sync.nudgeJustFinishedWorkoutId||null):null;}catch(_){try{Sync.pendingKeepWorkoutId=null;}catch(_){}}
          const ok=await Sync.confirmSignInCode({email:email,token:token,setStatus:setNudgeSignInStatus});
          if(!ok){try{Sync.pendingKeepWorkoutId=null;}catch(_){}setNudgeResendVisible(true);return;}
          if(otpEl)otpEl.value='';
           


          const t0=Date.now();
          while(!(Sync&&Sync.lastAuthUid)&&Date.now()-t0<8000){
            await new Promise(r=>setTimeout(r,100));
          }
          const dlg=$('#signinNudgeDialog');
          if(!dlg||!dlg.open)return;  
          if(!(Sync&&Sync.lastAuthUid)){setNudgeSignInStatus('Signed in, but the session didn\u2019t arrive \u2014 try again.',true);try{Sync.pendingKeepWorkoutId=null;}catch(_){}return;}
          closeNudge();
        });
      }
       



      let heroSignInCooldownTimer=null;
       
      function setHeroSignInStatus(msg,isError){
        const el=$('#heroSignInStatus');
        if(el){el.textContent=msg||'';el.classList.toggle('is-error',!!isError);}
      }
       
      function setHeroResendVisible(visible){
        try{const b=$('#heroResendCode');if(b)b.hidden=!visible;}catch(_){}
      }
       
      function heroSignInTickCooldown(){
        const btn=$('#heroSignInSendCode');if(!btn)return;
        let left=0;
        try{left=(typeof Sync!=='undefined'&&Sync&&typeof Sync.magicLinkCooldownRemaining==='function')?Sync.magicLinkCooldownRemaining():0;}catch(_){}
         

        if(left>0&&!magicLinkCooldownOwnsFlow()){try{localStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);}catch(_){}left=0;}
        if(left<=0){btn.disabled=false;btn.textContent='Email me a code';}
        else{btn.disabled=true;const s=Math.ceil(left/1000);btn.textContent='Resend in '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
      }
       
      function openHeroSignIn(){
        setHeroSignInStatus('');setHeroResendVisible(false);
        const otpStep=$('#heroSignInOtpStep');if(otpStep)otpStep.hidden=true;
        const otp=$('#heroSignInOtp');if(otp)otp.value='';
        heroSignInTickCooldown();
        if(heroSignInCooldownTimer)clearInterval(heroSignInCooldownTimer);
        heroSignInCooldownTimer=setInterval(heroSignInTickCooldown,1000);
        const dlg=$('#heroSignInDialog');
        if(dlg&&!dlg.open)dlg.showModal();
        try{$('#heroSignInEmail')?.focus({preventScroll:true});}catch(_){}
      }
       
      function wireHeroSignIn(){
        $('#closeHeroSignIn')?.addEventListener('click',()=>{
          if(heroSignInCooldownTimer){clearInterval(heroSignInCooldownTimer);heroSignInCooldownTimer=null;}
          $('#heroSignInDialog')?.close();
        });
         
        async function heroSendCode(){
          const email=(($('#heroSignInEmail')||{}).value||'');
          setHeroResendVisible(false);
          if(typeof Sync.requestSignInCode!=='function'){setHeroSignInStatus('Sign-in is unavailable right now.',true);setHeroResendVisible(true);return;}
          const ok=await Sync.requestSignInCode({email:email,setStatus:setHeroSignInStatus});
          if(!ok){setHeroResendVisible(true);return;}
          const otpStep=$('#heroSignInOtpStep');if(otpStep)otpStep.hidden=false;
          setHeroSignInStatus('Code sent, enter it above.');
          heroSignInTickCooldown();
          try{$('#heroSignInOtp')?.focus({preventScroll:true});}catch(_){}
        }
        $('#heroSignInSendCode')?.addEventListener('click',()=>{heroSendCode().catch(()=>{});});
        $('#heroResendCode')?.addEventListener('click',()=>{heroSendCode().catch(()=>{});});
        $('#heroSignInVerify')?.addEventListener('click',async()=>{
          const email=(($('#heroSignInEmail')||{}).value||'');
          const otpEl=$('#heroSignInOtp');
          const token=(otpEl&&otpEl.value)||'';
          setHeroResendVisible(false);
          if(typeof Sync.confirmSignInCode!=='function'){setHeroSignInStatus('Sign-in is unavailable right now.',true);setHeroResendVisible(true);return;}
          const ok=await Sync.confirmSignInCode({email:email,token:token,setStatus:setHeroSignInStatus});
          if(!ok){setHeroResendVisible(true);return;}
          if(otpEl)otpEl.value='';
           






          const t0=Date.now();
          while(!(Sync&&Sync.lastAuthUid)&&Date.now()-t0<8000){
            await new Promise(r=>setTimeout(r,100));
          }
          const dlg=$('#heroSignInDialog');
          if(!dlg||!dlg.open)return;  
          if(!(Sync&&Sync.lastAuthUid)){setHeroSignInStatus('Signed in, but the session didn\u2019t arrive \u2014 try again.',true);return;}
          if(typeof Sync.waitForLoginSettled==='function'&&Sync.lastAuthUid){
            setHeroSignInStatus('Loading your account\u2026',false);
            await Sync.waitForLoginSettled(Sync.lastAuthUid,10000);
          }
          if(!dlg.open)return;  
          if(heroSignInCooldownTimer){clearInterval(heroSignInCooldownTimer);heroSignInCooldownTimer=null;}
          dlg.close();
           


          if(typeof Sync.rerenderCurrentView==='function')Sync.rerenderCurrentView();
          else if(typeof renderDashEmptyHero==='function')renderDashEmptyHero();
        });
      }
      Sync.openHeroSignIn=openHeroSignIn;
      Sync.maybeShowSigninNudge=maybeShowSigninNudge;
       
      function wireAccountUI(){
        wireSigninNudge();  
        wireHeroSignIn();  
         

        const send=$('#sendMagicLinkButton');
        if(send)send.addEventListener('click',()=>{Sync.sendSignInLink().catch(()=>{});});
         
        const resend=$('#resendCodeButton');
        if(resend)resend.addEventListener('click',()=>{try{resend.hidden=true;}catch(_){}Sync.sendSignInLink().catch(()=>{});});
        const verify=$('#verifyOtpButton');
        if(verify)verify.addEventListener('click',()=>{Sync.verifySignInCode().catch(()=>{});});
        const otp=$('#accountOtp');
        if(otp)otp.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();Sync.verifySignInCode().catch(()=>{});}});
        const row=$('#accountRowButton');
        if(row)row.addEventListener('click',()=>{renderAccount();const d=$('#accountDialog');if(d)d.showModal();});
         

        const retry=$('#retrySyncButton');
        if(retry)retry.addEventListener('click',()=>{retry.hidden=true;setAccountStatus('Syncing…');Sync.syncCycle().catch(()=>{});});
        const closeDlg=$('#closeAccountDialog');
        if(closeDlg)closeDlg.addEventListener('click',()=>{const d=$('#accountDialog');if(d)d.close();});
        const out=$('#accountDialogSignOut');
         


        if(out)out.addEventListener('click',()=>{const d=$('#accountDialog');if(d)d.close();const sd=$('#signOutDialog');if(sd)sd.showModal();});
        const closeOut=$('#closeSignOut');
        if(closeOut)closeOut.addEventListener('click',()=>{const sd=$('#signOutDialog');if(sd)sd.close();});
        const cancelOut=$('#cancelSignOut');
        if(cancelOut)cancelOut.addEventListener('click',()=>{const sd=$('#signOutDialog');if(sd)sd.close();});
        const confirmOut=$('#confirmSignOut');
        if(confirmOut)confirmOut.addEventListener('click',()=>{const sd=$('#signOutDialog');if(sd)sd.close();Sync.signOutAccount().catch(()=>{});});
         
        const del=$('#accountDialogDelete');
        if(del)del.addEventListener('click',()=>{const d=$('#accountDialog');if(d)d.close();const cd=$('#deleteAccountDialog');if(cd)cd.showModal();});
         

        const settingsDel=$('#settingsDeleteAccountButton');
        if(settingsDel)settingsDel.addEventListener('click',()=>{const cd=$('#deleteAccountDialog');if(cd)cd.showModal();});
        const closeDel=$('#closeDeleteAccount');
        if(closeDel)closeDel.addEventListener('click',()=>$('#deleteAccountDialog').close());
        const cancelDel=$('#cancelDeleteAccount');
        if(cancelDel)cancelDel.addEventListener('click',()=>$('#deleteAccountDialog').close());
        const confirmDel=$('#confirmDeleteAccount');
        if(confirmDel)confirmDel.addEventListener('click',async()=>{
          $('#deleteAccountDialog').close();
           









          await Sync.wipeRemoteData();
           




          try{await wipeLocalUserData({removeSyncKeys:true});}catch(_){}
          Sync.resetSyncMeta();  
           



          try{
            const sb=await Sync.getSupabase();
            if(sb)await sb.functions.invoke('delete-account');
          }catch(_){}
          await Sync.signOutAccount();
          setAccountStatus('Account deleted and all data erased.',true);
          setTimeout(()=>location.reload(),1500);
        });
        const now=$('#accountDialogSyncNow');
        if(now)now.addEventListener('click',()=>{Sync.syncNowManual().catch(()=>{});});
        const edit=$('#accountDialogEditName');
        if(edit)edit.addEventListener('click',()=>{const input=$('#editNameInput');if(input)input.value=(Sync.lastAuthProfile&&Sync.lastAuthProfile.display_name)||'';const d=$('#editNameDialog');if(d)d.showModal();});
        const cancelEdit=$('#cancelEditName');
        if(cancelEdit)cancelEdit.addEventListener('click',()=>$('#editNameDialog').close());
        const dismissEdit=$('#dismissEditName');
        if(dismissEdit)dismissEdit.addEventListener('click',()=>$('#editNameDialog').close());
        const saveName=$('#saveNameButton');
        if(saveName)saveName.addEventListener('click',()=>{Sync.saveDisplayName().catch(()=>{});});
         


        const editEmail=$('#accountDialogEditEmail');
        if(editEmail)editEmail.addEventListener('click',()=>{const input=$('#editEmailInput');if(input)input.value=Sync.lastAuthEmail||'';const d=$('#editEmailDialog');if(d)d.showModal();});
        const cancelEditEmail=$('#cancelEditEmail');
        if(cancelEditEmail)cancelEditEmail.addEventListener('click',()=>$('#editEmailDialog').close());
        const dismissEditEmail=$('#dismissEditEmail');
        if(dismissEditEmail)dismissEditEmail.addEventListener('click',()=>$('#editEmailDialog').close());
        const saveEmail=$('#saveEmailButton');
        if(saveEmail)saveEmail.addEventListener('click',()=>{Sync.saveAccountEmail().catch(()=>{});});
         


        if(magicLinkCooldownRemaining()>0&&magicLinkCooldownOwnsFlow()){startMagicLinkCooldown(); const s=$('#otpStep');if(s)s.hidden=false;}
        else if(magicLinkCooldownRemaining()>0){try{localStorage.removeItem(MAGIC_LINK_COOLDOWN_KEY);}catch(_){}}
      }

      Sync.setAccountStatus=setAccountStatus;
      Sync.showSyncError=showSyncError;
      Sync.syncToast=syncToast;
      Sync.renderAccount=renderAccount;
      Sync.magicLinkCooldownRemaining=magicLinkCooldownRemaining;
      Sync.startMagicLinkCooldown=startMagicLinkCooldown;
      Sync.clearMagicLinkCooldown=clearMagicLinkCooldown;
      Sync.tickMagicLinkCooldown=tickMagicLinkCooldown;  
      Sync.authCallbackErrorText=authCallbackErrorText;
      Sync.showAuthRecovery=showAuthRecovery;
      Sync.wireAccountUI=wireAccountUI;
      Sync.clearSigninNudgeDismissed=clearSigninNudgeDismissed;  
      Sync.signinNudgeDismissed=signinNudgeDismissed;
    })();
//# sourceMappingURL=sync-account-ui.js.map
