 
 















     
const DEFAULT_SET_TAGS=['Warmup','Dropset','Full ROM','Slow and controlled','Cheat set','Paused','Assisted','Failure'];  
 



const WARMUP_TAG='Warmup';
 


function setTagLabel(tag){return tag===WARMUP_TAG?'Warm-up':tag;}
 
function isWarmupSet(set){return !!set&&(set.tags||[]).includes(WARMUP_TAG);}
 






function isFixedSet(set){return !!set&&set.fixed===true;}
 









const DONT_PROGRESS_TAG="Don't progress";
 
function exerciseDontProgress(item){return !!item&&(item.exerciseTags||[]).includes(DONT_PROGRESS_TAG);}
 









function isAmrapSet(set){return !!set&&set.amrap===true;}
const DEFAULT_EXERCISE_TAG_PRESETS=['Main lift','Accessory','Unilateral','Straight sets','Tempo','Technique','Rehab','To failure'];
 
function freshLibraryState(){return {query:'',muscles:new Set(),equipment:'',favorites:new Set(),favoriteStamps:{},onlyFavorites:false,onlyCustom:false,selected:null,customExercises:[]};}
 

function freshNavState(){return {activeView:'dashboard',workoutDetailReturn:'workout',workoutHistoryOpen:false,workoutEditorOpen:false,exerciseDetailReturn:null,workoutDetailExerciseId:undefined,workoutDetailExerciseReturn:undefined,dashboardPeriod:'week',statsPeriod:'week',logPeriod:'all',statsMetric:'volume',selectedDashboardDate:null,calendarWeekOffset:0,workoutSubScreen:null,programWorkoutUid:null,programSegment:'train',savedProgramPreviewId:null,returnTo:undefined,settingsPushed:undefined,settingsReturn:undefined,builderReturn:null,sharePreview:null,shareReturn:null,homeHydrated:false,scroll:{dashboard:0,library:0,'workout:start':0,'workout:editor':0,'workout:complete':0,'workout:history':0,program:0,stats:0,settings:0,detail:0},
   





  settingsSections:{},
   






  subscriptions:{}};}
 
function freshBuilderState(){return {builderOpen:undefined,savedBuilder:undefined,savedBuilderStash:undefined,savedWorkoutId:undefined,savedFilter:undefined};}
 







const state=Object.assign(freshLibraryState(),freshNavState(),freshBuilderState());
 







const SUBSCRIPTION_KEYS=['appUpdates','marketing','tips'];
 
function subscriptionOn(key){
  try{
    const s=state.subscriptions;
    if(!s||typeof s!=='object')return true;
    return s[key]!==false;
  }catch(_){return true;}
}
 
function setSubscription(key,on){
  if(SUBSCRIPTION_KEYS.indexOf(key)===-1)return false;
  try{
    if(!state.subscriptions||typeof state.subscriptions!=='object')state.subscriptions={};
    state.subscriptions[key]=!!on;
    if(typeof schedulePersist==='function')schedulePersist();
     


    if(typeof queueEmailSync==='function')queueEmailSync();
    return true;
  }catch(_){return false;}
}
 
function setAllSubscriptions(on){
  SUBSCRIPTION_KEYS.forEach(k=>setSubscription(k,!!on));
}
const customDraft = { primary:new Set(), secondary:new Set(), equipment:'', force:'', mechanic:'', tracking:'reps', sides:'both', dbSetup:'pair-per' };  
 
function freshWorkoutData(){return {
  draft:null,
  completed:[],
  templates:[],  



  tags:[...DEFAULT_SET_TAGS],
  exerciseTagPresets:[...DEFAULT_EXERCISE_TAG_PRESETS],
  tagTarget:null,
  exerciseTagTarget:null,
  supersetTarget:null,
  pickerMode:'draft',
  programWorkoutTarget:null,
  activeProgram:null,
  archivedPrograms:[],
   

  savedPrograms:[],
   




  pickerSwapUid:undefined,
   






  pickerVariantTarget:undefined,
   


  templateEditTarget:undefined
};}
const workoutState=freshWorkoutData();
 


 














const DEFAULT_PROGRESSION_SETUP={threshold:8,incrementType:'lb',incrementValue:5,timeStep:5,scheme:'linear',percentOf1RM:75,deloadPct:60,pctWave:false,weeklyPcts:[],weeklyDeloads:[],defaultRange:{preset:'hypertrophy',min:6,max:12,openTop:false,amrap:false},undulating:false,cycleLength:0,weeklyRanges:[],units:'imperial',statsDefaultMetric:'volume',warmupRungs:2,warmupLadder:[{pct:40,reps:5},{pct:60,reps:3},{pct:80,reps:2}],dbEntry:'per',dbEntryPrefs:{},singleDbPrefs:{},singleSidePrefs:{},defaultSetCount:3,trainingDays:3,progressionOff:false,effortMode:'rpe'};
 
function freshProgressionSetup(){return JSON.parse(JSON.stringify(DEFAULT_PROGRESSION_SETUP));}
 




function normalizeProgression(p){
  if(p&&typeof p==='object'){
    delete p.autoDeload;
    delete p.deloadEvery;
  }
   

  if(p&&typeof p==='object'&&typeof p.progressionOff!=='boolean'){
    p.progressionOff=!!p.progressionOff;
  }
   

  if(p&&typeof p==='object'&&'progressAllSets' in p){
    delete p.progressAllSets;
  }
   




  if(p&&typeof p==='object'){
    if(p.advanceOnCompletion===true)p.threshold='completion';
    delete p.advanceOnCompletion;
    const t=p.threshold;
    p.threshold=(t==='completion'||t===7||t===8||t===9)?t:(Number(t)===7||Number(t)===9?Number(t):8);
  }
   


  if(p&&typeof p==='object'){
    delete p.basisCapWeeks;
  }
   


  if(p&&typeof p==='object'){
    p.effortMode=p.effortMode==='rir'?'rir':'rpe';
  }
   





  if(p&&typeof p==='object'){
    const n=Number(p.cycleLength);
    if(n!==4&&n!==6&&n!==8&&n!==12){
      const legacyLen=Array.isArray(p.weeklyRanges)?p.weeklyRanges.length:0;
      p.cycleLength=p.undulating?(legacyLen===4||legacyLen===6||legacyLen===8||legacyLen===12?legacyLen:8):0;
    }
    p.undulating=p.cycleLength>0;
  }
   





  if(p&&typeof p==='object'){
    if(p.dbEntry!=='per'&&p.dbEntry!=='total')p.dbEntry='per';
    if(!p.dbEntryPrefs||typeof p.dbEntryPrefs!=='object'||Array.isArray(p.dbEntryPrefs))p.dbEntryPrefs={};
    if(!p.singleDbPrefs||typeof p.singleDbPrefs!=='object'||Array.isArray(p.singleDbPrefs))p.singleDbPrefs={};
     


    if(!p.singleSidePrefs||typeof p.singleSidePrefs!=='object'||Array.isArray(p.singleSidePrefs))p.singleSidePrefs={};
  }
   

  if(p&&typeof p==='object'){
    p.trainingDays=clamp(Math.round(Number(p.trainingDays)||3),1,7);
  }
   
  if(p&&typeof p==='object'){
    const clean=Array.isArray(p.warmupLadder)?p.warmupLadder:[];
    p.warmupLadder=[0,1,2].map(i=>{
      const src=clean[i]||{},dflt=DEFAULT_PROGRESSION_SETUP.warmupLadder[i];
      return {
        pct:clamp(Math.round(Number(src.pct)||dflt.pct),1,100),
        reps:Math.max(1,Math.round(Number(src.reps)||dflt.reps))
      };
    });
    p.warmupRungs=clamp(Math.round(Number(p.warmupRungs)||2),1,3);
  }
  return p;
}
 
function resetProgressionSetup(){
  const fresh=freshProgressionSetup();
  Object.keys(progressionSetup).forEach(k=>delete progressionSetup[k]);
  Object.assign(progressionSetup,fresh);
}
const progressionSetup = freshProgressionSetup();
//# sourceMappingURL=state.js.map
