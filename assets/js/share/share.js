
 
     













        
    async function parseShareHash(){
      const m=/^#share=(.+)$/.exec(location.hash||'');
      if(!m)return null;
      try{
        const payload=await shareDecodeAny(m[1]);
        if(!validSharePayload(payload))return null;
        return payload;
      }catch(e){return null;}
    }

     
    async function shareCode(payload){
       


      let code=null;
      if(typeof CompressionStream!=='undefined'){
        try{code=await shareEncodeV2(payload);}catch(e){code=null;}
      }
      if(!code)code=shareEncodeV1({...payload,v:1});  



      return code;
    }
     





     





    function setShareLinkMintState(building){
      const field=$('#shareLinkField');
      if(field){
        field.classList?.toggle('is-building',!!building);
        if(building){field.value='';field.setAttribute?.('aria-busy','true');}
        else field.removeAttribute?.('aria-busy');
      }
      const copyBtn=$('#copyShareLinkBtn');if(copyBtn)copyBtn.disabled=!!building;
      const sysBtn=$('#nativeShareLinkBtn');if(sysBtn)sysBtn.disabled=!!building;
      if(building){const note=$('#shareLinkNote');if(note){note.hidden=false;note.textContent='Preparing your link…';}}
    }
     
    function setShareSignInMintState(building){
      const field=$('#shareSignInLinkField');
      if(field){
        field.classList?.toggle('is-building',!!building);
        if(building){field.value='';field.setAttribute?.('aria-busy','true');}
        else field.removeAttribute?.('aria-busy');
      }
      const copyBtn=$('#shareSignInCopyBtn');if(copyBtn)copyBtn.disabled=!!building;
      const sysBtn=$('#shareSignInNativeBtn');if(sysBtn)sysBtn.disabled=!!building;
      if(building){const note=$('#shareSignInLinkNote');if(note){note.hidden=false;note.textContent='Preparing your link…';}}
    }
    async function deliverShareLink(payload){
       


      if(!shareSignedIn()){openShareSignInPrompt(payload);return;}
      const field=$('#shareLinkField');
      const dlg=$('#shareLinkDialog');
      if(dlg&&!dlg.open)dlg.showModal();
      setShareLinkMintState(true);
      try{
        const code=await shareCode(payload);
         


        const short=(typeof tryShortShareLink==='function')?await tryShortShareLink(payload,code):null;
        const failReason=(typeof lastShortLinkFailureReason==='function')?lastShortLinkFailureReason():'';
         


        if(!short&&failReason==='no-session'){
          setShareLinkMintState(false);
          if(dlg?.open)dlg.close();
          openShareSignInPrompt(payload);
          goShareSignInInline();
          setShareSignInStatus('Your session expired. Sign in again to share.',true);
          return;
        }
        setShareLinkMintState(false);
         

        if(!dlg||dlg.open)openShareLinkDialog(short||(location.origin+location.pathname+'#share='+code),short?null:failReason);
      }catch(e){
        setShareLinkMintState(false);
        if(field){field.value='';}
        showToast('Could not build a share link for this workout.','error');
        dlg?.close();
      }
    }
     


    function setShareLinkFallbackNote(sel,reason){
      const note=$(sel);
      if(!note)return;
      if(reason){note.hidden=false;note.textContent='Full link. Short link unavailable ('+reason+').';}
      else{note.hidden=true;note.textContent='';}
    }
     
    function openShareLinkDialog(url,fallbackReason){
      const field=$('#shareLinkField');
      if(field){field.value=url;}
      setShareLinkFallbackNote('#shareLinkNote',fallbackReason);
      const sysBtn=$('#nativeShareLinkBtn');
      if(sysBtn)sysBtn.hidden=!navigator.share;
      const dlg=$('#shareLinkDialog');
      if(dlg&&!dlg.open)dlg.showModal();
    }
     
    async function shareTemplate(templateId){
      const payload=buildTemplateShare(templateId);
      if(!payload){showToast('Could not build a share link for this workout.','error');return;}
      await deliverShareLink(payload);
    }
     
    async function shareTemplateLike(name,exerciseRows){
      const payload=buildTemplateLikeShare(name,exerciseRows);
      if(!payload){showToast('Could not build a share link for this workout.','error');return;}
      await deliverShareLink(payload);
    }
     
    async function shareActiveProgram(){
      const payload=buildProgramShare();
      if(!payload){showToast('No active program to share.');return;}
      await deliverShareLink(payload);
    }
     



    async function shareSavedProgram(programId){
      const program=(workoutState.savedPrograms||[]).find(p=>p.id===programId);
      const payload=program?buildProgramShareFrom(program):null;
      if(!payload){showToast('No saved program to share.');return;}
      await deliverShareLink(payload);
    }
     









     
    function clearShareHash(){
       

      history.replaceState(null,'',location.pathname+location.search);
    }
     
    function shareSignedIn(){
       

      try{if(typeof lastAuthUid!=='undefined'&&lastAuthUid)return true;}catch(_){}
      try{return !!((typeof Sync!=='undefined'&&Sync&&Sync.lastAuthUid)||(typeof window!=='undefined'&&window.Sync&&window.Sync.lastAuthUid));}catch(_){return false;}
    }
     



    let pendingSharePayload=null;
    let shareSignInCooldownTimer=null;
     
    function shareSignInShowStep(n){
      for(let i=1;i<=3;i++){const el=$('#shareSignInStep'+i);if(el)el.hidden=(i!==n);}
    }
     




    function setShareSignInCopy(signedIn){
      const title=$('#shareSignInTitle');
      const desc=$('#shareSignInDesc');
       

      const noun=pendingSharePayload?.kind==='program'?'program':'workout';
      if(title)title.textContent=signedIn?'Share link':'Sign in to share';
      if(desc)desc.textContent=signedIn?`Send this shared ${noun} with the link below.`:'Sharing needs an account. It\u2019s free to sign up.';
    }
     
    function setShareSignInStatus(msg,isError){
      const el=$('#shareSignInStatus');
      if(el){el.textContent=msg||'';el.classList.toggle('is-error',!!isError);}
    }
     
    function openShareSignInPrompt(payload){
      pendingSharePayload=payload||null;
      const otp=$('#shareSignInOtp');
      if(otp)otp.value='';
      const otpStep=$('#shareSignInOtpStep');
      if(otpStep)otpStep.hidden=true;
      setShareSignInStatus('');
      shareSignInShowStep(1);
      setShareSignInCopy(false);
      const dlg=$('#shareSignInDialog');
      if(dlg&&!dlg.open)dlg.showModal();
      else showToast('Sign in to share workouts.');
    }
     

    function goShareSignInInline(){
      setShareSignInStatus('');
      shareSignInShowStep(2);
      if(shareSignInCooldownTimer)clearInterval(shareSignInCooldownTimer);
      shareSignInTickCooldown();
      shareSignInCooldownTimer=setInterval(shareSignInTickCooldown,1000);
      const email=$('#shareSignInEmail');
      if(email&&typeof email.focus==='function')email.focus();
    }
     

    function shareSignInTickCooldown(){
      const btn=$('#shareSignInSendCode');if(!btn)return;
      let left=0;
      try{left=(typeof Sync!=='undefined'&&Sync&&typeof Sync.magicLinkCooldownRemaining==='function')?Sync.magicLinkCooldownRemaining():0;}catch(_){}
      if(left<=0){btn.disabled=false;btn.textContent='Email me a code';}
      else{btn.disabled=true;const s=Math.ceil(left/1000);btn.textContent='Resend in '+Math.floor(s/60)+':'+String(s%60).padStart(2,'0');}
    }
     
    function stopShareSignInCooldown(){
      if(shareSignInCooldownTimer){clearInterval(shareSignInCooldownTimer);shareSignInCooldownTimer=null;}
    }
     
    async function shareSignInSendCode(){
      const syncNS=(typeof Sync!=='undefined')?Sync:null;
      const email=(($('#shareSignInEmail')||{}).value||'');
      if(!syncNS||typeof syncNS.requestSignInCode!=='function'){setShareSignInStatus('Sign-in is unavailable right now.',true);return;}
      const ok=await syncNS.requestSignInCode({email:email,setStatus:setShareSignInStatus});
      if(!ok)return;
      const otpStep=$('#shareSignInOtpStep');
      if(otpStep)otpStep.hidden=false;
      setShareSignInStatus('Code sent, enter it above.');
      shareSignInTickCooldown();
      const otp=$('#shareSignInOtp');
      if(otp&&typeof otp.focus==='function')otp.focus();
    }
     
    async function shareSignInVerifyCode(){
      const syncNS=(typeof Sync!=='undefined')?Sync:null;
      const email=(($('#shareSignInEmail')||{}).value||'');
      const otpEl=$('#shareSignInOtp');
      const token=((otpEl&&otpEl.value)||'');
      if(!syncNS||typeof syncNS.confirmSignInCode!=='function'){setShareSignInStatus('Sign-in is unavailable right now.',true);return;}
      const ok=await syncNS.confirmSignInCode({email:email,token:token,setStatus:setShareSignInStatus});
      if(!ok)return;
      if(otpEl)otpEl.value='';
       

      const t0=Date.now();
      while(!shareSignedIn()&&Date.now()-t0<8000){
        await new Promise(r=>setTimeout(r,100));
      }
      const dlg=$('#shareSignInDialog');
      if(!dlg||!dlg.open)return;  
      if(!shareSignedIn()){setShareSignInStatus('Signed in, but the session didn\u2019t arrive \u2014 try again.',true);return;}
      await shareSignInMintShare();
    }
     
    async function shareSignInMintShare(){
       


      const field=$('#shareSignInLinkField');
      shareSignInShowStep(3);
      setShareSignInCopy(true);
      setShareLinkFallbackNote('#shareSignInLinkNote',null);
      setShareSignInMintState(true);
      try{
        const code=await shareCode(pendingSharePayload);
        const short=(typeof tryShortShareLink==='function')?await tryShortShareLink(pendingSharePayload,code):null;
        const failReason=(typeof lastShortLinkFailureReason==='function')?lastShortLinkFailureReason():'';
        const url=short||(location.origin+location.pathname+'#share='+code);
        setShareSignInMintState(false);
        if(field)field.value=url;
        setShareLinkFallbackNote('#shareSignInLinkNote',short?null:failReason);
        const sysBtn=$('#shareSignInNativeBtn');
        if(sysBtn)sysBtn.hidden=!(typeof navigator!=='undefined'&&navigator&&navigator.share);
      }catch(e){
        setShareSignInMintState(false);
        if(field)field.value='';
        showToast('Could not build a share link for this workout.','error');
      }
    }
     









    function openSharePreview(payload,opts={}){
      state.sharePreview=payload;
       



      $('#workoutComplete').hidden=true;
      showWorkouts(false,true);
       




      if(opts.push!==false){
        try{if(!history.state||history.state.sub!=='share')history.pushState({view:'workout',sub:'share'},'',location.href);}catch(_){}
      }
      window.scrollTo(0,0);
    }
     




    function openSharePreviewLoading(){
       


      try{document.documentElement.classList.remove('share-boot');}catch(_){}
      state.sharePreview={loading:true};
       

      $('#workoutComplete').hidden=true;
      showWorkouts(false,true);
       


      try{if(!history.state||history.state.sub!=='share')history.pushState({view:'workout',sub:'share'},'',location.href);}catch(_){}
      window.scrollTo(0,0);
    }
     
    function dismissSharePreview(){
      state.sharePreview=null;
      clearShareHash();
       
      try{if(typeof clearShortSharePath==='function')clearShortSharePath();}catch(_){}
    }
     




    function backOutOfSharePreview(){
       




      if(state.sharePreview&&state.sharePreview._drillParent){
        state.sharePreview=state.sharePreview._drillParent;
        renderSharePreview();
        window.scrollTo(0,0);
        return 'drill';
      }
      if(!state.sharePreview)return false;
      state.sharePreview=null;
      try{
        if(/^#share=/.test(location.hash||''))history.replaceState(null,'',location.pathname+location.search);
        if(typeof clearShortSharePath==='function')clearShortSharePath();
      }catch(_){}
      return true;
    }
     

    function shareExerciseName(item,payload){
      const custom=(payload.customExercises||[]).find(e=>e.id===item.exerciseId);
      if(custom)return custom.name||'Custom exercise';
      return resolveExercise(item.exerciseId)?.name||'Exercise';
    }
     
    function shareExerciseSummary(item,payload){
      return exerciseTargetSummary(item,shareExerciseName(item,payload));
    }
     
    function shareMuscles(exerciseRows,payload){
      return [...new Set((exerciseRows||[]).flatMap(item=>{
        const custom=(payload.customExercises||[]).find(e=>e.id===item.exerciseId);
        const ex=custom||resolveExercise(item.exerciseId);
        return [...(ex?.primary||[]),...(ex?.secondary||[])];
      }))];
    }
     








     



    function startSharedCompletedWorkout(){
      const payload=state.sharePreview;if(!payload||payload.kind!=='workout')return;
      const converted=workoutShareToTemplatePayload(payload);if(!converted)return;
      state.sharePreview=converted;
      startSharedWorkout();
    }
     
    function saveSharedCompletedWorkout(){
      const payload=state.sharePreview;if(!payload||payload.kind!=='workout')return;
      const converted=workoutShareToTemplatePayload(payload);if(!converted)return;
      state.sharePreview=converted;
      saveSharedWorkout();
    }
     





    function sharePreviewWorkoutHtml(payload){
      const w=payload.workout||{};
      const rows=w.exercises||[];
      const totals=w.totals||{};
      const signedIn=shareSignedIn();
      const muscles=shareMuscles(rows,payload);
      const chips=[];
      if(w.date)chips.push(formatLogDate(w.date));
      chips.push(`${rows.length} exercise${rows.length===1?'':'s'}`);
      if(totals.sets!=null)chips.push(`${totals.sets} set${totals.sets===1?'':'s'}`);
      if(totals.seconds!=null)chips.push(`${totals.seconds} sec total`);
      else if(totals.distance!=null)chips.push(`${totals.distance} m total`);
      else if(totals.volume)chips.push(`${formatVolume(totals.volume)} total`);
       





       








      const body=rows.length?`<div class="completed-exercise-details">${rows.map(item=>{
        const custom=(payload.customExercises||[]).find(e=>e.id===item.exerciseId);
        return completedExerciseMarkup(item,'',{name:item.name||shareExerciseName(item,payload),ex:custom||resolveExercise(item.exerciseId),plainHead:true});
      }).join('')}</div>`:'<p class="section-note">No exercises in this workout.</p>';
      const bookmarkBtn=`<button class="share-icon-button" data-share-act="add" type="button" aria-label="Add to my library"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg></button>`;
      const dismissBtn=signedIn?'<button class="dialog-close" data-share-act="dismiss" type="button" aria-label="Dismiss"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>':'';
      const primaryBtn=signedIn
        ?`<button class="primary-button" data-share-act="add" type="button">Add to my library</button><button class="share-alt-action" data-share-act="start" type="button">or start the workout</button>`
        :`<button class="primary-button" data-share-act="start" type="button">Start workout</button><button class="share-alt-action" data-share-act="add" type="button">or just save it to my library</button>`;
      const prs=w.prs||[];
      return `<div class="completed-card"><span class="continue-kicker">Completed workout</span><div class="detail-title-row"><h2>${escapeHtml(payload.name||'Shared workout')}</h2><div class="share-header-actions">${signedIn?bookmarkBtn:''}${dismissBtn}</div></div><p class="share-context">You opened a shared completed workout.</p><div class="meta-chips" role="list" aria-label="Workout summary">${chips.map(c=>`<span class="tag" role="listitem">${escapeHtml(c)}</span>`).join('')}</div>
      <div class="share-top-actions"><div class="share-actions">${primaryBtn}</div></div>
      ${prs.length?`<div class="section-head"><h3>PRs hit</h3></div><div class="workout-prs">${prs.map(pr=>{return `<span class="workout-pr"><strong>${escapeHtml(pr.name||'')}</strong>${pr.kind||pr.value?`<span>${pr.kind?`<span class="sub">${escapeHtml(pr.kind)}</span>`:''}${pr.kind&&pr.value?' ':''}${pr.value?`<strong>${escapeHtml(pr.value)}</strong>`:''}</span>`:''}</span>`;}).join('')}</div>`:''}
      ${muscles.length?`<div class="section-head"><h3>Muscles worked</h3></div>${workoutBodyMapMarkup(muscles)}<div class="workout-muscles">${muscles.map(m=>musclePill(m)).join('')}</div>`:''}
      <div class="section-head"><h3>Exercises</h3></div>${body}</div>`;
    }
    function sharePreviewCardHtml(payload){
      if(payload.kind==='workout')return sharePreviewWorkoutHtml(payload);
      const isTemplate=payload.kind==='template';
       


      const isDrill=!!payload._drillParent;
      const rows=isTemplate?(payload.template?.exercises||[]):[];
      const programRows=isTemplate?[]:(payload.program?.workouts||[]).flatMap(w=>w.template?.exercises||[]);
      const muscles=shareMuscles(isTemplate?rows:programRows,payload);
      const totalSets=rows.reduce((n,item)=>n+(typeof sessionSetCount==='function'?sessionSetCount(item):(item.sets||[]).length),0);  
      const customCount=(payload.customExercises||[]).length;
       

      const workoutCount=(payload.program?.workouts||[]).length;
      const metaChips=isTemplate
        ?[`${rows.length} exercise${rows.length===1?'':'s'}`,`${totalSets} set${totalSets===1?'':'s'}`]
        :[`${workoutCount} workout${workoutCount===1?'':'s'}`];
      if(customCount)metaChips.push(`includes ${customCount} custom exercise${customCount===1?'':'s'}`);
      const body=isTemplate
        ?(rows.map(item=>{const s=shareExerciseSummary(item,payload);return `<div class="picker-item saved-editor-row"><span><strong>${escapeHtml(s.name)}</strong><span>${s.meta}</span></span></div>`;}).join('')||'<p class="section-note">No exercises in this workout.</p>')
        :((payload.program?.workouts||[]).map((w,i)=>{const n=(w.template?.exercises||[]).length;return `<div class="picker-item saved-editor-row program-workout-row"><button class="program-workout-open" type="button" data-share-act="openProgramWorkout" data-workout-idx="${i}" aria-label="Open ${escapeHtml(w.name||'Workout')}"><span><strong>${escapeHtml(w.name||'Workout')}</strong><span>${n} exercise${n===1?'':'s'}</span></span></button></div>`;}).join('')||'<p class="section-note">No workouts in this program.</p>');
       


      const signedIn=shareSignedIn();
       


      const bookmarkBtn=`<button class="share-icon-button" data-share-act="add" type="button" aria-label="Add to my library"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg></button>`;
       




       


       





      const shareProgramBtn=`<button class="icon-button" data-share-act="shareProgram" type="button" aria-label="Share this program"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 14.5v-11"/><path d="M7.6 7.4L12 3l4.4 4.4"/><path d="M6 11.5V19a1.6 1.6 0 0 0 1.6 1.6h8.8A1.6 1.6 0 0 0 18 19v-7.5"/></svg></button>`;
      const programStartBtn=`<button class="primary-button share-start-btn" data-share-act="startProgram" type="button">Start</button>`;
      const headerBtns=isTemplate
        ?(signedIn?bookmarkBtn:'')
        :(shareProgramBtn+programStartBtn);
      const dismissBtn=signedIn?'<button class="dialog-close" data-share-act="dismiss" type="button" aria-label="Dismiss"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>':'';
       

      const backBtn=`<button class="share-back-btn" data-share-act="backToProgram" type="button" aria-label="Back to program"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button>`;
      const drillDismissBtn=isDrill?'':dismissBtn;
      const primaryBtn=isTemplate
        ?(signedIn
          ?`<button class="primary-button" data-share-act="add" type="button">Add to my library</button><button class="share-alt-action" data-share-act="start" type="button">or start the workout</button>`
          :`<button class="primary-button" data-share-act="start" type="button">Start workout</button><button class="share-alt-action" data-share-act="add" type="button">or just save it to my library</button>`)
        :`<button class="primary-button" data-share-act="add" type="button">Add to my library</button>`;
      const actions=`<div class="share-actions">${primaryBtn}</div>`;
       



      const note=isTemplate
        ?''
        :'<p class="section-note">Programs save to your library. Open one of its workouts to train it.</p>';
       




      const topActions=`<div class="share-top-actions">${actions}${note}</div>`;
      const footerActions=`<div class="share-footer-actions">${actions}${note}</div>`;
      const context=`You opened a shared ${isTemplate?'workout':'program'} link.`;  
      return `<div class="completed-card"><span class="continue-kicker">${isTemplate?'Shared workout':'Shared program'}</span><div class="detail-title-row">${isDrill?backBtn:''}<h2>${escapeHtml(payload.name||'Shared')}</h2><div class="share-header-actions">${headerBtns}${drillDismissBtn}</div></div><p class="share-context">${context}</p><div class="meta-chips" role="list" aria-label="${isTemplate?'Workout':'Program'} summary">${metaChips.map(c=>`<span class="tag" role="listitem">${c}</span>`).join('')}</div>
      ${isTemplate?topActions:''}
      ${muscles.length?`<div class="section-head"><h3>Muscles worked</h3></div>${workoutBodyMapMarkup(muscles)}<div class="workout-muscles">${muscles.map(m=>musclePill(m)).join('')}</div>`:''}
      <div class="section-head"><h3>${isTemplate?'Exercises':'Workouts'}</h3></div>${body}
      ${isTemplate?'':footerActions}</div>`;
    }
     
    function wireSharePreviewButtons(root,payload,onDismiss){
      const isTemplate=payload.kind==='template';
      const isWorkout=payload.kind==='workout';
       
      root.querySelectorAll('[data-share-act="dismiss"]').forEach(b=>b.addEventListener('click',onDismiss));
      root.querySelectorAll('[data-share-act="start"]').forEach(b=>b.addEventListener('click',isWorkout?startSharedCompletedWorkout:startSharedWorkout));
      root.querySelectorAll('[data-share-act="add"]').forEach(b=>b.addEventListener('click',()=>{isWorkout?saveSharedCompletedWorkout():(isTemplate?saveSharedWorkout():saveSharedProgram());}));
       
      root.querySelectorAll('[data-share-act="shareProgram"]').forEach(b=>b.addEventListener('click',shareSharedProgram));
      root.querySelectorAll('[data-share-act="startProgram"]').forEach(b=>b.addEventListener('click',startSharedProgram));
       

      root.querySelectorAll('[data-share-act="openProgramWorkout"]').forEach(b=>b.addEventListener('click',()=>openSharedProgramWorkout(Number(b.dataset.workoutIdx))));
      root.querySelectorAll('[data-share-act="backToProgram"]').forEach(b=>b.addEventListener('click',backToSharedProgram));
    }
     






    function sharePreviewSkeletonHtml(){
      const signedIn=shareSignedIn();
      const headerBtns=signedIn
        ?'<span class="skel skel-circle"></span>'
        :'';
      return `<div class="completed-card" aria-busy="true" aria-label="Loading shared link"><span class="continue-kicker">Shared link</span><div class="detail-title-row"><span class="skel skel-title"></span><div class="share-header-actions">${headerBtns}</div></div><p class="share-context"><span class="skel skel-line" style="width:55%"></span></p><div class="meta-chips"><span class="skel skel-pill"></span><span class="skel skel-pill"></span></div>
      <div class="share-top-actions"><div class="share-actions"><span class="skel skel-btn"></span><span class="skel skel-line" style="width:150px;margin-top:8px"></span></div><p class="section-note"><span class="skel skel-line" style="width:60%;margin:0 auto"></span></p></div>
      <div class="section-head"><span class="skel skel-line" style="width:130px"></span></div><div class="skel skel-map"></div><div class="workout-muscles"><span class="skel skel-pill"></span><span class="skel skel-pill"></span><span class="skel skel-pill"></span><span class="skel skel-pill"></span></div>
      <div class="section-head"><span class="skel skel-line" style="width:100px"></span></div><div class="skel skel-row" style="margin-bottom:8px"></div><div class="skel skel-row" style="margin-bottom:8px"></div><div class="skel skel-row"></div>
      </div>`;
    }
     
    function renderSharePreview(){
      const host=$('#sharePreviewBody');if(!host)return;
      const payload=state.sharePreview;
      if(!payload){host.innerHTML='';return;}
      if(payload.loading){
        host.innerHTML=sharePreviewSkeletonHtml();
        return;
      }
      host.innerHTML=sharePreviewCardHtml(payload);
      hydrateBodyMaps();
      wireSharePreviewButtons(host,payload,()=>{collapseWorkoutSubScreen();});
    }
     
    function importShareCustomExercises(payload){
      let importedCustom=0;
      (payload.customExercises||[]).forEach(ex=>{
        if(!ex?.id||exercises.some(e=>e.id===ex.id))return;
         


        const norm=typeof normalizeExerciseMuscles==='function'?normalizeExerciseMuscles:(e=>e);
        const copy={...norm(ex),custom:true};
        state.customExercises.push(copy);
        exercises.unshift(copy);
        importedCustom++;
      });
       


      if(importedCustom&&typeof invalidateExerciseMap==='function')invalidateExerciseMap();
      return importedCustom;
    }
     
    function addSharedTemplateToLibrary(payload){
      const importedCustom=importShareCustomExercises(payload);
      const src=payload.template||{};
       


      const name=uniqueSuffixedName(src.name||'Shared workout',(workoutState.templates||[]).map(t=>t.name),true);
       



      const stableId=stableTemplateId(JSON.stringify({k:payload.kind,n:payload.name,t:src,c:payload.customExercises||[]}));
      const id=(workoutState.templates||[]).some(t=>t.id===stableId)?newTemplateId():stableId;
      const template={id:id,name,shared:true,
        exercises:JSON.parse(JSON.stringify(src.exercises||[]))};
      workoutState.templates.unshift(template);
      schedulePersist();refreshTemplateViews();
      return {template,importedCustom};
    }
     
    function addSharedProgramToLibrary(payload){
      const importedCustom=importShareCustomExercises(payload);
      const src=payload.program||{};
       
      const existing=[workoutState.activeProgram,...(workoutState.archivedPrograms||[]),...(workoutState.savedPrograms||[])].filter(Boolean);
      const name=uniqueSuffixedName(src.name||'Shared program',existing.map(p=>p.name));
       


      const stableId=stableProgramId(JSON.stringify({k:payload.kind,n:payload.name,p:src,c:payload.customExercises||[]}));
      const id=existing.some(p=>p.id===stableId)?newProgramId():stableId;
       


      const program={id:id,name,length:src.length||4,startWeek:src.startWeek||1,shared:true,
        focus:src.focus||'',schedule:src.schedule||'',startedAt:localIsoDate(),savedAt:localIsoDate(),
         





        progression:src.progression?normalizeProgression(JSON.parse(JSON.stringify(src.progression))):null,
        workouts:(src.workouts||[]).map(w=>({uid:newProgramWorkoutUid(),name:w.name,
          template:{name:w.template?.name,exercises:JSON.parse(JSON.stringify(w.template?.exercises||[]))}}))};
      (workoutState.savedPrograms||(workoutState.savedPrograms=[])).unshift(program);
      schedulePersist();renderProgram();renderDashboard();
      return {program,importedCustom};
    }
     
    function customNoteFor(n){
      return n?` (+${n} custom exercise${n===1?'':'s'})`:'';
    }
     


    function startSharedWorkout(){
      const payload=state.sharePreview;if(!payload||payload.kind!=='template')return;
      const name=payload.template?.name||payload.name||'Shared workout';
      requestStartWithConflict(name,()=>{
        const {template}=addSharedTemplateToLibrary(payload);
        dismissSharePreview();
         


        state.shareReturn=payload;
         


        try{history.replaceState({view:'workout',sub:'share'},'',location.href);}catch(_){}
        startWorkoutFromTemplate(template.id);
      });
    }
     
    function saveSharedWorkout(){
      const payload=state.sharePreview;if(!payload||payload.kind!=='template')return;
      const {template,importedCustom}=addSharedTemplateToLibrary(payload);
      dismissSharePreview();
      openSavedWorkoutEditor(template.id);
       




    }
     
    function saveSharedProgram(){
      const payload=state.sharePreview;if(!payload||payload.kind!=='program')return;
      const {program,importedCustom}=addSharedProgramToLibrary(payload);
      dismissSharePreview();
      showProgram(false);
      showToast(`Added "${program.name}" to your programs${customNoteFor(importedCustom)}.`);  
    }
     





    let pendingSharedProgramPayload=null;     
    let pendingConfirmProgramPayload=null;    
    function sharedProgramReSharePayload(){
      const payload=state.sharePreview;if(!payload||payload.kind!=='program')return null;
       



      const program=JSON.parse(JSON.stringify(payload.program||{}));
      return {kind:'program',name:payload.name||'Shared program',
        program,customExercises:payload.customExercises||[]};
    }
     
    function shareSharedProgram(){
      const repayload=sharedProgramReSharePayload();
      if(!repayload)return;
      deliverShareLink(repayload);
    }
     

    function activateSharedProgram(program){
       






      const saved=workoutState.savedPrograms||[];
      const idx=saved.findIndex(p=>p.id===program.id);
      if(idx>=0)saved.splice(idx,1);
      if(workoutState.activeProgram&&workoutState.activeProgram.id!==program.id){
        const outgoing=workoutState.activeProgram;
        delete outgoing.archivedAt;
        outgoing.savedAt=localIsoDate();
        const lib=workoutState.savedPrograms||(workoutState.savedPrograms=[]);
        const existing=lib.findIndex(p=>p.id===outgoing.id);
        if(existing>=0)lib.splice(existing,1);
        lib.unshift(outgoing);
      }
      workoutState.activeProgram=program;
      if(typeof touchProgram==='function')touchProgram(program);
      delete workoutState.activeProgram.archivedAt;
      delete workoutState.activeProgram.savedAt;
      schedulePersist();renderProgram();renderDashboard();
    }
     
    function activateSharedProgramPayload(payload){
      const {program}=addSharedProgramToLibrary(payload);
      activateSharedProgram(program);
      dismissSharePreview();
      showProgram(false);
       

    }
     
    function startSharedProgram(){
      const payload=state.sharePreview;if(!payload||payload.kind!=='program')return;
      if(!workoutState.activeProgram){activateSharedProgramPayload(payload);return;}
      pendingSharedProgramPayload=payload;
      showModalPinned($('#sharedProgramStartDialog'));
    }
     





    function openSharedProgramWorkout(idx){
      const payload=state.sharePreview;if(!payload||payload.kind!=='program')return;
      const w=(payload.program?.workouts||[])[idx];if(!w||!w.template)return;
      state.sharePreview={kind:'template',name:w.name||'Workout',template:w.template,
        customExercises:payload.customExercises||[],_drillParent:payload};
      try{if(!history.state||history.state.sub!=='share-drill')history.pushState({view:'workout',sub:'share-drill'},'',location.href);}catch(_){}
      window.scrollTo(0,0);
      renderSharePreview();
    }
     
    function backToSharedProgram(){
       

      try{history.back();}catch(_){backOutOfSharePreview();}
    }
     

    function wireShareProgramStartDialogs(){
      const closeChoice=()=>{$('#sharedProgramStartDialog').close();};
      const closeConfirm=()=>{$('#confirmSetSharedProgramActiveDialog').close();};
      $('#closeSharedProgramStart')?.addEventListener('click',closeChoice);
      $('#sharedProgramStartDialog')?.addEventListener('close',()=>{pendingSharedProgramPayload=null;});
      $('#confirmSetSharedProgramActiveDialog')?.addEventListener('close',()=>{pendingConfirmProgramPayload=null;});
      $('#saveSharedProgramToLibrary')?.addEventListener('click',()=>{closeChoice();saveSharedProgram();});
      $('#setSharedProgramActive')?.addEventListener('click',()=>{
         

        pendingConfirmProgramPayload=pendingSharedProgramPayload;
        closeChoice();
        const csd=$('#confirmSetSharedProgramActiveDesc');if(csd)csd.textContent=replaceProgramConsequence();  
        showModalPinned($('#confirmSetSharedProgramActiveDialog'));
      });
      $('#closeConfirmSetSharedProgramActive')?.addEventListener('click',closeConfirm);
      $('#cancelSetSharedProgramActive')?.addEventListener('click',closeConfirm);
      $('#confirmSetSharedProgramActive')?.addEventListener('click',()=>{
        const payload=pendingConfirmProgramPayload;
        pendingConfirmProgramPayload=null;
        closeConfirm();
        if(payload)activateSharedProgramPayload(payload);
      });
    }
     

    function noteShareAuthChanged(){
      if(!state.sharePreview)return;
      renderSharePreview();
    }
     
    (function wireShareLink(){
      const closeShareDlg=()=>$('#shareLinkDialog').close();
      $('#closeShareLinkDialog')?.addEventListener('click',closeShareDlg);
      $('#copyShareLinkBtn')?.addEventListener('click',async()=>{
        const field=$('#shareLinkField');
        try{await navigator.clipboard.writeText(field?field.value:'');showToast('Share link copied.');}
        catch(e){field?.select?.();showToast('Copy the link above.');}
      });
       

      $('#nativeShareLinkBtn')?.addEventListener('click',async()=>{
        const url=$('#shareLinkField')?.value||'';
        if(!url||!navigator.share)return;
        try{await navigator.share({url});}
        catch(e){ }
      });
       



      const closeSignInPrompt=()=>{stopShareSignInCooldown();const d=$('#shareSignInDialog');if(d)d.close();};
      $('#closeShareSignInDialog')?.addEventListener('click',closeSignInPrompt);
      $('#cancelShareSignIn')?.addEventListener('click',closeSignInPrompt);
      $('#cancelShareSignIn2')?.addEventListener('click',closeSignInPrompt);
      $('#goShareSignIn')?.addEventListener('click',goShareSignInInline);
      $('#shareSignInSendCode')?.addEventListener('click',()=>{shareSignInSendCode().catch(()=>{});});
      $('#shareSignInVerify')?.addEventListener('click',()=>{shareSignInVerifyCode().catch(()=>{});});
       


      $('#shareSignInDialog')?.addEventListener('close',stopShareSignInCooldown);
      $('#shareSignInCopyBtn')?.addEventListener('click',async()=>{
        const field=$('#shareSignInLinkField');
        try{await navigator.clipboard.writeText(field?field.value:'');showToast('Share link copied.');}
        catch(e){field?.select?.();showToast('Copy the link above.');}
      });
       

      $('#shareSignInNativeBtn')?.addEventListener('click',async()=>{
        const url=$('#shareSignInLinkField')?.value||'';
        if(!url||!navigator.share)return;
        try{await navigator.share({url});}
        catch(e){ }
      });
       
      $('#shareSignInEmail')?.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();shareSignInSendCode().catch(()=>{});}});
      $('#shareSignInOtp')?.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();shareSignInVerifyCode().catch(()=>{});}});
       

      wireShareProgramStartDialogs();
    })();
//# sourceMappingURL=share.js.map
