 
 



































 

const ONBOARDING_DONE_KEY='workout-app:onboarding-v2-done';
 









const ONBOARDING_PROGRESS_KEY='workout-app:onboarding-v2-progress';
const OF_SCREENS=['choice','options','import','signin'];
 
function ofReadProgress(){
  try{
    const raw=localStorage.getItem(ONBOARDING_PROGRESS_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    if(!parsed||!OF_SCREENS.includes(parsed.screen))return null;
    return parsed;
  }catch(_){return null;}
}
 
function ofWriteProgress(){
  try{
    localStorage.setItem(ONBOARDING_PROGRESS_KEY,JSON.stringify({screen:ofState.screen,state:{...ofState}}));
  }catch(_){ }
}
 
function ofClearProgress(){
  try{localStorage.removeItem(ONBOARDING_PROGRESS_KEY);}catch(_){}
}
 

 

function ofFreshState(){return {screen:'choice',setup:'defaults',units:'lb',rpe:'8',reps:'hypertrophy',days:'3',prog:'on',marketing:true,imp:'skipped',cameFromOptions:false,signinStep:'email',email:'',emailVerified:false,routeHash:'',returnTo:'',signedIn:false};}
const ofState=ofFreshState();
 
function ofResetState(){Object.assign(ofState,ofFreshState());}
 






let heroSignInDeclined=false;
function markHeroSignInDeclined(){heroSignInDeclined=true;}
function isHeroSignInDeclined(){return heroSignInDeclined;}
 


function ofEsc(s){return (typeof escapeHtml==='function')?escapeHtml(s):String(s==null?'':s);}
 
 


function shouldShowOnboarding(o){
  if(!o||typeof o!=='object')return false;
  if(o.done)return false;             
  if(o.shareBoot)return false;        
  if(o.authCallback)return false;    
   



  if(o.inProgress)return true;
  if(o.hasLocalData)return false;     
  if(o.hasSession)return false;       
  return true;
}
 


function isWipePlantRaw(raw){
  if(raw==null)return false;
  let data=null;
  try{data=JSON.parse(raw);}catch(_){return false;}
  return !!(data&&typeof data==='object'&&Number(data.wipedAt)>0);
}
 

async function ofGateInputs(){
  let done=false;
  try{done=localStorage.getItem(ONBOARDING_DONE_KEY)==='1';}catch(_){ }
   

  const inProgress=ofReadProgress();
  let shareBoot=false,authCallback=false,routeHash='';
  try{
    const hash=location.hash||'';
    shareBoot=/^#share=/.test(hash);
    routeHash=decodeURIComponent(hash.replace(/^#/,'')).trim();
  }catch(_){}
  try{authCallback=/[?&]code=/.test(location.search||'');}catch(_){}
  let hasLocalData=false;
   









  let capturedBootData=null;
  try{if(typeof bootHadPreexistingData==='function')capturedBootData=bootHadPreexistingData();}catch(_){capturedBootData=null;}
  if(typeof capturedBootData==='boolean')hasLocalData=capturedBootData;
  else try{
     

    const lsRaw=localStorage.getItem(PERSIST_KEY);
    if(lsRaw!=null&&!isWipePlantRaw(lsRaw))hasLocalData=true;
    else{
      const bkpRaw=localStorage.getItem(LS_BACKUP_KEY);
      if(bkpRaw!=null&&!isWipePlantRaw(bkpRaw))hasLocalData=true;
      else if(typeof Storage!=='undefined'&&Storage&&typeof Storage.loadBlob==='function'){
         
        const raw=await Storage.loadBlob(PERSIST_KEY);
        if(raw!=null&&!isWipePlantRaw(raw))hasLocalData=true;
      }
    }
  }catch(_){}
  let hasSession=false;
  try{
    if(typeof Sync!=='undefined'&&Sync&&typeof Sync.getSupabase==='function'){
      const sb=await Sync.getSupabase();
      if(sb&&sb.auth&&typeof sb.auth.getSession==='function'){
        const res=await sb.auth.getSession();
        const sess=res&&res.data&&res.data.session;
        hasSession=!!(sess&&sess.user);
      }
    }
  }catch(_){}
  return {done,shareBoot,authCallback,routeHash,hasLocalData,hasSession,inProgress};
}
 

async function maybeStartOnboardingV2(){
  let inputs=null;
  try{inputs=await ofGateInputs();}catch(_){return false;}
  if(!shouldShowOnboarding(inputs))return false;
   

  startOnboardingFlow(inputs.inProgress?{resume:inputs.inProgress}:undefined);
  return true;
}
 
 
function ofClampDays(d){return clamp(Math.round(Number(d)||3),1,7);}
 




function ofApplyBranchSettings(){
  if(ofState.setup==='custom'){
    progressionSetup.units=(ofState.units==='kg')?'metric':'imperial';
    const rpe=Number(ofState.rpe);
    progressionSetup.threshold=(rpe===7||rpe===9)?rpe:8;
    ofApplyRepRange(ofState.reps);
    progressionSetup.trainingDays=ofClampDays(ofState.days);
    progressionSetup.progressionOff=(ofState.prog!=='on');
  }else if(typeof resetProgressionSetup==='function'){
    try{resetProgressionSetup();}catch(_){}
  }else if(typeof freshProgressionSetup==='function'){
    try{Object.assign(progressionSetup,freshProgressionSetup());}catch(_){}
  }
  try{if(typeof schedulePersist==='function')schedulePersist();}catch(_){}
}
 
function ofApplyRepRange(key){
  const k=(typeof REP_PRESETS!=='undefined'&&REP_PRESETS[key])?key:'hypertrophy';
   

  if(typeof applyRepPreset==='function'){try{applyRepPreset(k,progressionSetup);return;}catch(_){}}
  const preset=REP_PRESETS[k];
  progressionSetup.defaultRange={preset:k,min:preset.min,max:preset.max??null,openTop:!!preset.openTop,amrap:!!preset.amrap};
}
 


 
 


function ofTopbar(target,title,screen){
  return '<div class="of-topbar">'
    +(target?`<button class="of-back" type="button" data-of-back="${target}" aria-label="Back">‹</button>`:'<span></span>')
    +`<span class="of-title">${title}</span>`
     

    +`<img class="of-mark" src="icon-192.png" alt="Kohlrabi">`
    +`</div>`
    +(screen?ofProgressHtml(screen):'');
}
 






function ofProgressSteps(){
  const steps=['choice'];
  if(ofState.setup==='custom')steps.push('options');
  steps.push('import');
  if(!ofState.signedIn)steps.push('signin');
  return steps;
}
function ofProgressHtml(screen){
  const steps=ofProgressSteps();
  const idx=steps.indexOf(screen);
  if(idx<0)return '';
  const n=idx+1,m=steps.length;
  return `<div class="of-progress" role="progressbar" aria-valuemin="1" aria-valuemax="${m}" aria-valuenow="${n}" aria-label="Step ${n} of ${m}"><span class="of-progress-label">Step ${n} of ${m}</span><span class="of-progress-track"><i style="width:${Math.round(n/m*100)}%"></i></span></div>`;
}
 

 
function ofSigninHtml(){
  const codeStep=ofState.signinStep==='code';
   



   

  const emailStep=`<div class="of-body">`
     
    +`<h1 class="of-h1">Want to sign in?</h1>`
    +`<p class="of-sub">Signing in saves your data to the cloud and lets you share workouts. Enter your email and we&rsquo;ll send you a code, no password needed.</p>`
    +`<div class="of-field"><label for="ofEmail">Email</label>`
    +`<input id="ofEmail" class="of-input" type="email" inputmode="email" placeholder="you@example.com" autocomplete="email" value="${ofEsc(ofState.email)}"></div>`
    +`<p class="of-status" id="ofSigninStatus" role="status"></p>`
    +`<div class="of-spacer of-tight"></div>`
    +`<button class="of-cta" type="button" id="ofSendCode">Send code</button>`
     



    +`<button class="of-cta of-secondary" type="button" data-of-skip>No thanks</button>`
    +`</div>`;
   

  const codeStepHtml=`<div class="of-body">`
    +`<div class="of-brand-sm">Kohlrabi</div>`
    +`<h1 class="of-h1">Check your email</h1>`
    +`<p class="of-sub">Enter the 8-digit code we just sent.</p>`
     


    +`<div class="of-codewrap">`
    +`<div class="of-codeboxes" aria-hidden="true">`
    +[0,1,2,3,4,5,6,7].map(()=>`<div class="of-codebox"></div>`).join('')
    +`</div>`
    +`<input id="ofCodeInput" class="of-codeinput" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="8-digit verification code">`
    +`</div>`
    +`<p class="of-status" id="ofSigninStatus" role="status"></p>`
    +`<div class="of-spacer of-tight"></div>`
    +`<button class="of-cta" type="button" id="ofVerifyCode">Verify code</button>`
    +`<button class="of-quiet" type="button" id="ofResendCode">Resend code</button>`
     



    +`<label class="of-checkrow"><input type="checkbox" id="ofMarketingOptIn"${ofState.marketing?' checked':''}><span><strong>Receive app update and training tip emails?</strong><small>(you can change this later)</small></span></label>`
    +`</div>`;
   
  return ofTopbar(codeStep?'signin-email':'import','Sign in','signin')+(codeStep?codeStepHtml:emailStep);
}
 
function ofChoiceHtml(){
   

  return ofTopbar(null,'Setup','choice')
    +`<div class="of-body">`
    +`<h1 class="of-h1">How do you want to set up?</h1>`
    +`<p class="of-sub">Pick a path. You can change everything later in Settings.</p>`
    +`<div class="of-cards">`
    +`<button class="of-card${ofState.setup==='defaults'?' of-card-sel':''}" type="button" data-of-setup="defaults" aria-pressed="${ofState.setup==='defaults'}"><strong>Give me the defaults <span class="of-tag">Recommended</span></strong><span>Sensible training defaults. Start lifting in seconds.</span></button>`
    +`<button class="of-card${ofState.setup==='custom'?' of-card-sel':''}" type="button" data-of-setup="custom" aria-pressed="${ofState.setup==='custom'}"><strong>I want more options</strong><span>Tune units, RPE, rep ranges, training days, and more.</span></button>`
    +`</div><div class="of-spacer of-tight"></div>`
    +`<button class="of-cta" type="button" id="ofChoiceNext">Next</button>`
    +`<button class="of-quiet" type="button" data-of-skip>Skip to the app</button>`
    +`</div>`;
}
 
function ofSegHtml(name,options){
  return `<div class="of-seg" data-of-seg role="group" aria-label="${name}">`+options.map(([v,label])=>
    `<button type="button" class="${ofState[name]===v?'of-seg-sel':''}" data-of-name="${name}" data-of-segval="${v}" aria-pressed="${ofState[name]===v}">${label}</button>`
  ).join('')+`</div>`;
}
 
function ofPillsHtml(name,options){
  return `<div class="of-pills" data-of-pills role="group" aria-label="${name}">`+options.map(([v,label])=>
    `<button type="button" class="of-pill${ofState[name]===v?' of-sel':''}" data-of-name="${name}" data-of-pillval="${v}" aria-pressed="${ofState[name]===v}">${label}</button>`
  ).join('')+`</div>`;
}
 
function ofOptionsHtml(){
  return ofTopbar('choice','Options','options')
    +`<div class="of-body">`
    +`<h1 class="of-h1">Tune your setup</h1>`
    +`<p class="of-sub">Set what matters, skip the rest.</p>`
     


    +`<div class="of-qgroup"><span>Units</span><small class="of-qsub">The weight unit used across the whole app</small>${ofSegHtml('units',[['lb','lb'],['kg','kg']])}</div>`
     

    +`<div class="of-qgroup"><span>RPE threshold</span><small class="of-qsub">How hard your top sets should feel, on a 1&ndash;10 scale</small>${ofPillsHtml('rpe',[['7','7'],['8','8'],['9','9']])}</div>`
    +`<div class="of-qgroup"><span>Rep range</span><small class="of-qsub">AMRAP = as many reps as possible</small>${ofPillsHtml('reps',[['strength','1–5'],['hypertrophy','6–12'],['endurance','12–20'],['amrap','AMRAP']])}</div>`
    +`<div class="of-qgroup"><span>Days per week</span>${ofPillsHtml('days',[['2','2'],['3','3'],['4','4'],['5','5'],['6','6']])}</div>`
    +`<div class="of-switchrow"><div><strong>Progression suggestions</strong><span>Suggest next targets after each workout</span></div>`
    +`<button class="of-switch${ofState.prog==='on'?' of-on':''}" type="button" data-of-switch="prog" role="switch" aria-checked="${ofState.prog==='on'}" aria-label="Progression suggestions"></button></div>`
    +`<div class="of-spacer"></div>`
    +`<button class="of-cta" type="button" id="ofOptionsContinue">Continue</button>`
    +`<button class="of-quiet" type="button" data-of-skip>Skip to the app</button>`
    +`</div>`;
}
 







function ofImportHtml(){
  const back=ofState.cameFromOptions?'options':'choice';
  return ofTopbar(back,'Import','import')
    +`<div class="of-body">`
    +`<h1 class="of-h1">Bring your training with you</h1>`
    +`<p class="of-sub">Past workouts become history and power your progression.</p>`
    +`<ul class="of-srclist">`
    +`<li>Hevy exports</li>`
    +`<li>Strong exports</li>`
    +`<li>MacroFactor history or program files</li>`
    +`<li>CSV files (one row per set)</li>`
    +`<li>Kohlrabi backups (.json)</li>`
    +`</ul>`
    +`<div class="of-spacer of-tight"></div>`
     


    +`<button class="of-cta" type="button" id="ofImportSkip">Skip for now</button>`
    +`<button class="of-cta of-secondary" type="button" id="ofImportNow">Import workouts</button>`
    +`<button class="of-quiet" type="button" data-of-skip>Skip to the app</button>`
    +`</div>`;
}
 




 
function ofScreenHtml(name){
  switch(name){
    case 'choice':return ofChoiceHtml();
    case 'options':return ofOptionsHtml();
    case 'import':return ofImportHtml();
    case 'signin':return ofSigninHtml();
    default:return ofChoiceHtml();
  }
}
 
 

function startOnboardingFlow(opts){
  ofResetState();
   



  const resume=(opts&&opts.resume&&OF_SCREENS.includes(opts.resume.screen))?opts.resume:null;
  if(resume){
    const saved=(resume.state&&typeof resume.state==='object')?resume.state:{};
    for(const k of Object.keys(ofState))if(k in saved)ofState[k]=saved[k];
    ofState.screen=resume.screen;
  }else{
    ofClearProgress();
  }
   


  if(opts&&opts.signedIn)ofState.signedIn=true;
   





  if(opts&&opts.returnTo)ofState.returnTo=String(opts.returnTo);
   


  if(!resume){
    try{
      ofState.routeHash=decodeURIComponent(String(location.hash||'').replace(/^#/,'')).trim();
    }catch(_){ofState.routeHash='';}
  }
   




  if(!resume){
    try{
      if(typeof subscriptionOn==='function'){
        ofState.marketing=subscriptionOn('appUpdates')&&subscriptionOn('marketing')&&subscriptionOn('tips');
      }
    }catch(_){}
  }
  let flow=null;
  try{flow=document.getElementById('onboardingFlow');}catch(_){}
  if(!flow){
    try{
      flow=document.createElement('div');
      flow.id='onboardingFlow';
      flow.setAttribute('role','dialog');
      flow.setAttribute('aria-label','Welcome to Kohlrabi');
      flow.innerHTML='<div class="of-phone"><div id="ofBody"></div></div>';
      document.body.appendChild(flow);
    }catch(_){return;}
  }
  try{
    flow.hidden=false;
    document.body.classList.add('of-active');
  }catch(_){}
  ofGo(resume?resume.screen:'choice');
}
 
function ofGo(name){
  ofState.screen=name;
   
  ofWriteProgress();
  let body=null;
  try{body=document.getElementById('ofBody');}catch(_){}
  if(body){body.innerHTML=ofScreenHtml(name);body.scrollTop=0;}
  ofWire();
  try{window.scrollTo(0,0);}catch(_){}
}
 

function ofResolveBack(target){
  if(target==='signin-email'){ofState.signinStep='email';return 'signin';}
  return target;
}
 

 
function ofWire(){
  let body=null;
  try{body=document.getElementById('ofBody');}catch(_){}
  if(!body)return;
  body.onclick=(e)=>{
    const t=e&&e.target;
    if(!t||!t.closest)return;
    const goEl=t.closest('[data-of-go]');
    if(goEl){
       



      let dest=goEl.getAttribute('data-of-go');
      if(dest==='signin'&&ofState.signedIn)dest='choice';
      ofGo(dest);return;
    }
    const backEl=t.closest('[data-of-back]');
    if(backEl){ofGo(ofResolveBack(backEl.getAttribute('data-of-back')));return;}
    const pick=t.closest('[data-of-segval],[data-of-pillval]');
    if(pick){ofPick(pick);return;}
    const sw=t.closest('[data-of-switch]');
    if(sw){ofToggleSwitch(sw);return;}
    const setupEl=t.closest('[data-of-setup]');
    if(setupEl){
      ofState.setup=setupEl.getAttribute('data-of-setup')==='custom'?'custom':'defaults';
       

      const cards=setupEl.closest('.of-cards');
      if(cards)cards.querySelectorAll('[data-of-setup]').forEach(c=>{
        const sel=c===setupEl;
        c.classList.toggle('of-card-sel',sel);
        c.setAttribute('aria-pressed',String(sel));
      });
      return;
    }
    const skipEl=t.closest('[data-of-skip]');
    if(skipEl){
       

      if(ofState.screen==='options')ofApplyOptions();
       


      if(ofState.screen==='signin')markHeroSignInDeclined();
      finishOnboarding();return;
    }
  };
  const on=(id,fn)=>{const el=body.querySelector('#'+id);if(el)el.addEventListener('click',fn);};
  if(ofState.screen==='signin')ofWireSignin(body);
   



  const mktBox=body.querySelector('#ofMarketingOptIn');
  if(mktBox)mktBox.addEventListener('change',()=>ofApplyMarketingOptIn(mktBox.checked));
  on('ofChoiceNext',()=>{
    if(ofState.setup==='custom'){ofState.cameFromOptions=true;ofGo('options');}
    else{ofState.cameFromOptions=false;ofApplyBranchSettings();ofGo('import');}
  });
  on('ofOptionsContinue',()=>{ofApplyOptions();ofGo('import');});
   



  on('ofImportNow',()=>{
    ofState.imp='done';
    try{if(typeof openCsvImport==='function')openCsvImport();}catch(_){}
  });
   


  on('ofImportSkip',()=>{ofState.imp='skipped';if(ofState.signedIn)finishOnboarding();else ofGo('signin');});
}
 

function ofApplyOptions(){
  ofState.cameFromOptions=(ofState.setup==='custom');
  ofApplyBranchSettings();
}
 



function ofApplyMarketingOptIn(checked){
  ofState.marketing=!!checked;
  try{if(typeof setAllSubscriptions==='function')setAllSubscriptions(!!checked);}catch(_){}
}
 
function ofPick(btn){
  const name=btn.getAttribute('data-of-name');
  const val=btn.getAttribute('data-of-segval')||btn.getAttribute('data-of-pillval');
  if(!name||val==null)return;
  ofState[name]=val;
  const isSeg=btn.hasAttribute('data-of-segval');
  const group=btn.closest('[data-of-seg],[data-of-pills]');
  const selClass=isSeg?'of-seg-sel':'of-sel';
  if(group)group.querySelectorAll('button').forEach(b=>{b.classList.remove('of-seg-sel','of-sel');b.setAttribute('aria-pressed','false');});
  btn.classList.add(selClass);
  btn.setAttribute('aria-pressed','true');
}
 

function ofToggleSwitch(sw){
  const on=sw.classList.toggle('of-on');
  sw.setAttribute('aria-checked',String(on));
  ofState.prog=on?'on':'off';
}
 

 
function ofSetStatus(msg,isErr){
  let el=null;
  try{el=document.getElementById('ofSigninStatus');}catch(_){}
  if(!el)return;
  el.textContent=msg||'';
  el.classList.toggle('of-error',!!isErr);
}
 
function ofSyncAvailable(){
  return (typeof Sync!=='undefined')&&!!Sync
    &&typeof Sync.requestSignInCode==='function'
    &&typeof Sync.confirmSignInCode==='function';
}
 
function ofWireSignin(body){
  const on=(id,fn)=>{const el=body.querySelector('#'+id);if(el)el.addEventListener('click',fn);};
  on('ofSendCode',()=>ofSendCode(false));
  on('ofResendCode',()=>ofSendCode(true));
  on('ofVerifyCode',ofVerifyCode);
  const codeInput=body.querySelector('#ofCodeInput');
  const digitBoxes=Array.from(body.querySelectorAll('.of-codebox'));
  if(codeInput&&digitBoxes.length){
     

    const renderCode=()=>{
      const v=(codeInput.value||'').replace(/\D/g,'').slice(0,8);
      if(codeInput.value!==v)codeInput.value=v;
      let nextMarked=false;
      digitBoxes.forEach((b,i)=>{
        const ch=v[i]||'';
        if(b.textContent!==ch)b.textContent=ch;
        b.classList.toggle('of-filled',!!ch);
        const isNext=!ch&&!nextMarked;
        b.classList.toggle('of-next',isNext);
        if(isNext)nextMarked=true;
      });
    };
    codeInput.addEventListener('input',renderCode);
    renderCode();
  }
  const email=body.querySelector('#ofEmail');
  if(email)email.addEventListener('keydown',(e)=>{if(e.key==='Enter'){e.preventDefault();ofSendCode(false);}});
}
 
async function ofSendCode(isResend){
  let input=null;
  try{input=document.getElementById('ofEmail');}catch(_){}
   


  const typed=((input&&input.value)||ofState.email||'').trim();
  if(!ofSyncAvailable()){ofSetStatus('Sign-in is unavailable right now.',true);return;}
  let ok=false;
  try{ok=await Sync.requestSignInCode({email:typed,setStatus:ofSetStatus});}catch(_){ok=false;}
  if(ok){
    ofState.email=typed;
    ofState.signinStep='code';
    ofGo('signin');
    ofSetStatus(isResend?'Code re-sent. Check your email.':'Code sent. Check your email.');
    let first=null;
    try{first=document.querySelector('#ofBody #ofCodeInput');}catch(_){}
    if(first&&first.focus)try{first.focus({preventScroll:true});}catch(_){try{first.focus();}catch(_){}}
  }
}
 






async function ofVerifyCode(){
  let input=null;
  try{input=document.getElementById('ofCodeInput');}catch(_){}
  const token=((input&&input.value)||'').replace(/\D/g,'').slice(0,8);
  if(!ofSyncAvailable()){ofSetStatus('Sign-in is unavailable right now.',true);return;}
  if(token.length!==8){ofSetStatus('Enter the 8-digit code from your email.',true);return;}
  let ok=false;
  try{ok=await Sync.confirmSignInCode({email:ofState.email,token:token,setStatus:ofSetStatus});}catch(_){ok=false;}
  if(ok){
    ofState.emailVerified=true;
    ofState.signinStep='email';
    finishOnboarding();
  }
}
 
 



function ofRouteDeepLink(){
  const id=ofState.routeHash||'';
  if(!id)return false;
  try{
    if(id==='library'){if(typeof showLibrary==='function')showLibrary(false);return true;}
    if(id==='workout'){if(typeof showWorkouts==='function')showWorkouts(false);return true;}
    if(id==='program'){
      try{if(typeof state!=='undefined'&&state&&typeof programSetupOpen==='function'){
        if(!state.activeProgram)programSetupOpen();
      }}catch(_){}
      if(typeof showProgram==='function')showProgram(false);
      try{if(typeof maybeOfferNewProgramForDeepLink==='function')maybeOfferNewProgramForDeepLink();}catch(_){}
      return true;
    }
    if(id==='stats'){if(typeof showStats==='function')showStats(false);return true;}
    if(id==='settings'){if(typeof showSettings==='function')showSettings(false);return true;}
    if(/^[a-zA-Z0-9_-]{3,}$/.test(id)&&typeof openExercise==='function'){
      try{openExercise(id,false);return true;}catch(_){return false;}
    }
  }catch(_){}
  return false;
}
 






async function maybeStartPostSignupOnboarding(isFreshAccount){
  if(!isFreshAccount)return false;
  try{if(typeof startOnboardingFlow!=='function')return false;}catch(_){return false;}
  let done=false,showing=false,hasData=false;
  try{done=localStorage.getItem(ONBOARDING_DONE_KEY)==='1';}catch(_){}
  try{showing=document.body.classList.contains('of-active');}catch(_){showing=true;}
  try{
    const pk=typeof PERSIST_KEY!=='undefined'?PERSIST_KEY:null;
    const bk=typeof LS_BACKUP_KEY!=='undefined'?LS_BACKUP_KEY:null;
     


    const pkRaw=pk?localStorage.getItem(pk):null;
    if(pkRaw!=null&&!isWipePlantRaw(pkRaw))hasData=true;
    else{
      const bkRaw=bk?localStorage.getItem(bk):null;
      if(bkRaw!=null&&!isWipePlantRaw(bkRaw))hasData=true;
    }
  }catch(_){}
  if(done||showing||hasData)return false;
  try{startOnboardingFlow({signedIn:true});}catch(_){return false;}
  return true;
}
 
function finishOnboarding(){
  try{localStorage.setItem(ONBOARDING_DONE_KEY,'1');}catch(_){}
   

  ofClearProgress();
  let flow=null;
  try{
    flow=document.getElementById('onboardingFlow');
    if(flow)flow.hidden=true;
    document.body.classList.remove('of-active');
  }catch(_){}
   


  let routed=false;
   

  if(ofState.returnTo==='settings'){
    try{if(typeof showSettings==='function'){showSettings(false);routed=true;}}catch(_){routed=false;}
  }
  if(!routed){try{routed=ofRouteDeepLink();}catch(_){routed=false;}}
  if(!routed){
    try{if(typeof showDashboard==='function')showDashboard(false);}catch(_){}
  }
}
 



function clearOnboardingDone(){
  try{localStorage.removeItem(ONBOARDING_DONE_KEY);}catch(_){}
   
  ofClearProgress();
}
 
 



function wireOnboardingReplay(){
  let btn=null,row=null;
  try{
    btn=document.getElementById('replayOnboardingButton');
    row=document.getElementById('qaOnboardingRow');
  }catch(_){return;}
  if(!btn||!row)return;
  let prod=true;
  try{
    const h=String(location.hostname||'').toLowerCase();
    prod=(h===''||h==='kohlrabi.us'||h==='www.kohlrabi.us'||h==='app.cruciferousgreens.com');
  }catch(_){prod=true;}
  if(prod)return;
  try{row.hidden=false;}catch(_){}
  btn.addEventListener('click',()=>{
    clearOnboardingDone();
     

    startOnboardingFlow({returnTo:'settings'});
  });
}
//# sourceMappingURL=onboarding.js.map
