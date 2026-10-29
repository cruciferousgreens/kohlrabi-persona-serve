
 
     



      
    function exerciseListContext() {
       

      if (state.builderOpen && state.savedBuilder) return 'builder';
      return 'draft';
    }
     
    function contextExercises() {
      if (exerciseListContext() === 'builder') return state.savedBuilder.exercises;
      return workoutState.draft ? workoutState.draft.exercises : null;
    }
     
    function contextRerender() {
      if (exerciseListContext() === 'builder') { renderSavedBuilder(); return; }
      renderWorkoutExercises(); renderWorkoutProgression();
    }
     
    function contextSaved() {
      if (exerciseListContext() === 'builder') schedulePersist();
      else markDraftSaved();
    }
     
    function normalizeSupersets() {
      const list = contextExercises();
      if (!list) return;
      const counts = list.reduce((all, item) => {
        if (item.supersetId) all[item.supersetId] = (all[item.supersetId] || 0) + 1;
        return all;
      }, {});
      list.forEach(item => { if (item.supersetId && counts[item.supersetId] < 2) item.supersetId = null; });
    }
     




    function supersetVisualBlocks(list){
      const counts={};
      list.forEach(item=>{if(item.supersetId)counts[item.supersetId]=(counts[item.supersetId]||0)+1;});
      const blocks=[];let i=0;
      while(i<list.length){
        const item=list[i];
        if(item.supersetId&&counts[item.supersetId]>1){
          const run=[item];let j=i+1;
          while(j<list.length&&list[j].supersetId===item.supersetId){run.push(list[j]);j++;}
          blocks.push({group:true,supersetId:item.supersetId,items:run});
          i=j;
        }else{
          blocks.push({group:false,items:[item]});
          i++;
        }
      }
      return blocks;
    }
     



    function moveBlockAt(list,index,dir){
      const blocks=supersetVisualBlocks(list);
      let bi=-1,acc=0;
      for(let k=0;k<blocks.length;k++){if(index<acc+blocks[k].items.length){bi=k;break;}acc+=blocks[k].items.length;}
      if(bi<0)return null;
      const j=dir==='up'?bi-1:bi+1;
      if(j<0||j>=blocks.length)return null;
      const moved=blocks.splice(bi,1)[0];
      blocks.splice(j,0,moved);
      return blocks.flatMap(b=>b.items);
    }
     





    function supersetGroupHeadHtml(list,supersetId,editAttr){
      const n=supersetGroupNumber(list,supersetId);
      return `<div class="superset-group-head"><span class="superset-group-label">Superset ${n}</span><button class="superset-group-edit" type="button" ${editAttr} aria-label="Edit superset ${n}">Edit superset</button></div>`;
    }
//# sourceMappingURL=supersets.js.map
