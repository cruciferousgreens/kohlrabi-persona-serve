 
     







      
 







    var Sync = window.Sync = window.Sync || {};
    (function(){
      'use strict';
      const SUPABASE_URL='https://kbiikscyyiedgzijamnu.supabase.co';
      const SUPABASE_PUBLISHABLE_KEY='sb_publishable_OcWd1Wt0WKMtMpI3jBIGUg_kJ4kJ3wn';

      let supabaseClient=null, supabasePromise=null, supabaseUnavailable=false;
       




      let supabaseFailureKind=null;

       





      async function getSupabase(){
        if(supabaseClient)return supabaseClient;
        if(supabaseUnavailable)return null;
        if(supabasePromise)return supabasePromise;
        supabasePromise=(async()=>{
          try{
            const mod=await import('https://esm.sh/@supabase/supabase-js@2');
            supabaseClient=mod.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
            supabaseFailureKind=null;
            return supabaseClient;
          }catch(err){supabaseUnavailable=true;supabaseFailureKind='load';return null;}
          finally{supabasePromise=null;}
        })();
        return supabasePromise;
      }
       
      function resetSupabaseUnavailable(){supabaseUnavailable=false;supabaseFailureKind=null;}
       


      function supabaseFailure(){return supabaseFailureKind;}
       
      async function signedInUser(){
        const sb=await getSupabase();
        if(!sb)return null;
        try{const {data}=await sb.auth.getSession();return data&&data.session&&data.session.user?data.session.user:null;}
        catch(_){return null;}
      }
       


      function isNetworkError(err){
        if(typeof navigator!=='undefined'&&navigator&&navigator.onLine===false)return true;
        const m=String((err&&(err.message||err))||'').toLowerCase();
        return /load failed|failed to fetch|network error|network request failed|fetch failed|econn|etimedout|enotfound|socket/.test(m);
      }

      Sync.getSupabase=getSupabase;
      Sync.resetSupabaseUnavailable=resetSupabaseUnavailable;
      Sync.supabaseFailure=supabaseFailure;
      Sync.signedInUser=signedInUser;
      Sync.isNetworkError=isNetworkError;
    })();
     


//# sourceMappingURL=sync-adapter.js.map
