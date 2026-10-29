 
     














    window.FREE_EXERCISE_INSTRUCTIONS = window.FREE_EXERCISE_INSTRUCTIONS || {};
    const _instructionShardLoads = new Map();
    const _instructionAppliedIds = new Set();
     

    function exerciseInstructionShardIndex(id){
      const bounds = Array.isArray(window.FREE_EXERCISE_INSTRUCTION_SHARDS) ? window.FREE_EXERCISE_INSTRUCTION_SHARDS : [];
      let idx = 0;
      for (let i = 0; i < bounds.length; i++) if (bounds[i] <= id) idx = i;
      return idx;
    }
     

    function applyLoadedExerciseInstructions(){
      const map = window.FREE_EXERCISE_INSTRUCTIONS || {};
      for (const id of Object.keys(map)) {
        if (_instructionAppliedIds.has(id)) continue;
        _instructionAppliedIds.add(id);
        const entry = typeof catalogEntryById === 'function' ? catalogEntryById(id) : undefined;
        if (entry) entry.instructions = map[id];
      }
    }
     

    function loadExerciseInstructionShard(index){
      if (_instructionShardLoads.has(index)) return _instructionShardLoads.get(index);
      const promise = new Promise((resolve) => {
        if (typeof document === 'undefined' || !document.createElement || !(document.head || document.documentElement)) { resolve(false); return; }
        const script = document.createElement('script');
        script.src = `data/exercise-instructions-${index}.js`;
        script.onload = () => { applyLoadedExerciseInstructions(); resolve(true); };
        script.onerror = () => resolve(false);
        (document.head || document.documentElement).appendChild(script);
      });
      _instructionShardLoads.set(index, promise);
      return promise;
    }
     


    function ensureExerciseInstructions(id){
      const entry = typeof catalogEntryById === 'function' ? catalogEntryById(id) : undefined;
      if (entry && entry.instructions && entry.instructions.length) return Promise.resolve(entry.instructions);
      if (!Array.isArray(window.FREE_EXERCISE_INSTRUCTION_SHARDS) || !window.FREE_EXERCISE_INSTRUCTION_SHARDS.length) return Promise.resolve(null);
      return loadExerciseInstructionShard(exerciseInstructionShardIndex(id)).then((ok) => {
        const fresh = typeof catalogEntryById === 'function' ? catalogEntryById(id) : undefined;
        if (fresh && fresh.instructions && fresh.instructions.length) return fresh.instructions;
        return ok ? [] : null;
      });
    }
//# sourceMappingURL=instruction-loader.js.map
