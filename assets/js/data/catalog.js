 
     






         

     


    function defaultExerciseTracking(x){
      return x.force === 'static' || x.category === 'cardio' ? 'time' : 'reps';
    }
     


    let exercises = Array.isArray(window.FREE_EXERCISE_DB) ? window.FREE_EXERCISE_DB.map(x => ({
      id: x.id,
      name: x.name,
      force: x.force,
      level: x.level,
      mechanic: x.mechanic,
      equipment: x.equipment,
      primary: x.primaryMuscles || [],
      secondary: x.secondaryMuscles || [],
      category: x.category,
      tracking: defaultExerciseTracking(x),
       

      instructions: [],
       

      aliasOf: x.aliasOf || null,
       


      unilateral: !!x.unilateral,
       



      singleDumbbell: !!x.singleDumbbell,
       



      singleStack: !!x.singleStack
    })).filter(x => x.id && x.name) : coreExercises;

     





     







    let _exerciseMapFor=null,_exerciseMapCache=null;
     
    function _exerciseMap(){
      if(_exerciseMapFor!==exercises){
        _exerciseMapFor=exercises;
        _exerciseMapCache=new Map();
        if(Array.isArray(exercises))for(const x of exercises)if(x&&x.id!=null&&!_exerciseMapCache.has(x.id))_exerciseMapCache.set(x.id,x);
      }
      return _exerciseMapCache;
    }
     



    function invalidateExerciseMap(){_exerciseMapFor=null;_exerciseMapCache=null;}
     


     
    function canonicalExerciseId(id){
      if(!id||typeof exercises==='undefined'||!Array.isArray(exercises))return id;
      let cur=_exerciseMap().get(id);
      const seen=new Set();
      while(cur&&cur.aliasOf&&!seen.has(cur.id)){
        seen.add(cur.id);
        cur=_exerciseMap().get(cur.aliasOf);
      }
      return cur?cur.id:id;
    }
     
    function resolveExercise(id){
      if(typeof exercises==='undefined'||!Array.isArray(exercises))return undefined;
      return _exerciseMap().get(canonicalExerciseId(id));
    }
     



    function catalogEntryById(id){
      if(!id||typeof exercises==='undefined'||!Array.isArray(exercises))return undefined;
      return _exerciseMap().get(id);
    }
//# sourceMappingURL=catalog.js.map
