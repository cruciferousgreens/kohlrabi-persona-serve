 
     















        









    const SHARE_SHORT_ORIGIN='https://kohlrabi.us';
    const SHARE_SLUG_ALPHABET='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const SHARE_SLUG_LENGTH=8;
    const SHARE_SHORT_MAX_ATTEMPTS=5;
     


    const SHARE_SHORT_INSERT_RETRIES=2;
    const SHARE_SHORT_RETRY_DELAY_MS=800;
     

    function isTransientShortLinkError(msg){
      return /load failed|failed to fetch|networkerror|network request failed|timed?\s?out|abort/i.test(String(msg||''));
    }
     


    const SPA_REDIRECT_KEY='cg-spa-redirect';

     
     



    const SHARE_SLUG_REJECT_AT=248;
    function shareSlugFromBytes(bytes){
      let s='';
      for(let i=0;i<bytes.length;i++){
        if(bytes[i]>=SHARE_SLUG_REJECT_AT)continue;
        s+=SHARE_SLUG_ALPHABET[bytes[i]%SHARE_SLUG_ALPHABET.length];
      }
      return s;
    }
     
    function isValidShareSlug(s){
      return typeof s==='string'&&/^[A-Za-z0-9]{8}$/.test(s);
    }
     
    function newShareSlug(){
      const g=(typeof globalThis!=='undefined')?globalThis:{};
      const c=g.crypto;
      if(!c||typeof c.getRandomValues!=='function')throw new Error('no secure RNG for share slug');
       

      let s='';
      while(s.length<SHARE_SLUG_LENGTH){
        const bytes=new Uint8Array(SHARE_SLUG_LENGTH-s.length);
        c.getRandomValues(bytes);
        s+=shareSlugFromBytes(bytes);
      }
      return s;
    }
     
    function buildShortShareUrl(slug){
      return SHARE_SHORT_ORIGIN+'/s/'+slug;
    }

     
    function shortLinksSignedIn(){
       

      if(typeof shareSignedIn==='function'){try{return !!shareSignedIn();}catch(_){}}
      try{if(typeof lastAuthUid!=='undefined'&&lastAuthUid)return true;}catch(_){}
      try{return !!((typeof Sync!=='undefined'&&Sync&&Sync.lastAuthUid)||(typeof window!=='undefined'&&window.Sync&&window.Sync.lastAuthUid));}catch(_){return false;}
    }
     
    function shortLinksSupabase(){
      try{
        if(typeof Sync!=='undefined'&&Sync&&typeof Sync.getSupabase==='function')return Sync.getSupabase();
      }catch(_){}
      return Promise.resolve(null);
    }

     








    let lastShortLinkFailure='';
     

    function lastShortLinkFailureReason(){return lastShortLinkFailure;}
    function noteShortLinkFailure(reason){
      lastShortLinkFailure=reason||'';
      try{if(reason&&typeof console!=='undefined'&&console.warn)console.warn('[share] short link failed:',reason);}catch(_){}
    }

     








    const SHARE_SLUG_MEMO_KEY='kohlrabi-share-slugs';
    const SHARE_SLUG_MEMO_MAX=200;
    function readShareSlugMemo(){
      try{const raw=localStorage.getItem(SHARE_SLUG_MEMO_KEY);const m=raw?JSON.parse(raw):null;return (m&&typeof m==='object'&&!Array.isArray(m))?m:{};}catch(_){return {};}
    }
    function writeShareSlugMemo(key,slug){
      try{
        const m=readShareSlugMemo();
        delete m[key];
        if(slug)m[key]=slug;
        const keys=Object.keys(m);
        for(let i=0;i<keys.length-SHARE_SLUG_MEMO_MAX;i++)delete m[keys[i]];
        localStorage.setItem(SHARE_SLUG_MEMO_KEY,JSON.stringify(m));
      }catch(_){}
    }
    function shareSlugMemoKey(userId,kind,code){
      return String(userId)+':'+kind+':'+(typeof cyrb53==='function'?cyrb53(code):code.length+':'+code.slice(0,64));
    }
    function clearShareSlugMemo(){try{localStorage.removeItem(SHARE_SLUG_MEMO_KEY);}catch(_){}}

     
    async function tryShortShareLink(payload,code){
       




      lastShortLinkFailure='';
      try{
        if(!shortLinksSignedIn()){noteShortLinkFailure('signed-out');return null;}
        if(!code||typeof code!=='string'){noteShortLinkFailure('no-code');return null;}
        const sb=await shortLinksSupabase();
        if(!sb){noteShortLinkFailure('no-client');return null;}
         




        let sessionUser=null;
        try{
          const r1=await sb.auth.getSession();
          sessionUser=r1&&r1.data&&r1.data.session&&r1.data.session.user?r1.data.session.user:null;
          if(!sessionUser){
            await new Promise(r=>setTimeout(r,600));
            const r2=await sb.auth.getSession();
            sessionUser=r2&&r2.data&&r2.data.session&&r2.data.session.user?r2.data.session.user:null;
          }
        }catch(_){sessionUser=null;}
        if(!sessionUser){noteShortLinkFailure('no-session');return null;}
        const kind=(payload&&payload.kind==='program')?'program':'workout';
        const memoKey=shareSlugMemoKey(sessionUser.id,kind,code);
        const known=readShareSlugMemo()[memoKey];
        if(known&&isValidShareSlug(known)){
          try{
            const res=await sb.from('share_links').select('slug').eq('slug',known).maybeSingle();
            if(res&&!res.error&&res.data)return buildShortShareUrl(known);
            if(res&&!res.error&&!res.data)writeShareSlugMemo(memoKey,null);  
            else return buildShortShareUrl(known);  
          }catch(_){return buildShortShareUrl(known);}
        }
        for(let attempt=0;attempt<SHARE_SHORT_MAX_ATTEMPTS;attempt++){
          let slug;
          try{slug=newShareSlug();}catch(_){noteShortLinkFailure('rng');return null;}
           

          let retryOutcome=null;
          for(let ins=0;ins<=SHARE_SHORT_INSERT_RETRIES;ins++){
            if(ins>0)await new Promise(r=>setTimeout(r,SHARE_SHORT_RETRY_DELAY_MS));
            try{
              const res=await sb.from('share_links').insert({slug,kind,payload:code});
              const err=res&&res.error;
              if(!err){writeShareSlugMemo(memoKey,slug);return buildShortShareUrl(slug);}
               
              if(err.code==='23505'){retryOutcome='collision';break;}
              const msg=String((err&&err.message)||'');
              if(isTransientShortLinkError(msg)){
                retryOutcome={kind:'transient',msg};
                if(ins<SHARE_SHORT_INSERT_RETRIES)continue;
                break;  
              }
              noteShortLinkFailure('insert:'+(err.code||'?')+(msg?':'+msg.slice(0,80):''));
              return null;
            }catch(ex){
              const m=String((ex&&ex.message)||ex||'');
              if(isTransientShortLinkError(m)){
                retryOutcome={kind:'transient',msg:m};
                if(ins<SHARE_SHORT_INSERT_RETRIES)continue;
                break;  
              }
              noteShortLinkFailure('insert-threw:'+m.slice(0,80));
              return null;
            }
          }
          if(retryOutcome==='collision')continue;  
          if(retryOutcome&&retryOutcome.kind==='transient'){
            noteShortLinkFailure('insert-retry:'+String(retryOutcome.msg||'').slice(0,80));
            return null;
          }
        }
        noteShortLinkFailure('collisions');
        return null;  
      }catch(_){noteShortLinkFailure('unexpected');return null;}
    }

     
    const SHORT_SHARE_PATH_RE=/(?:^|\/)s\/([A-Za-z0-9]{8})\/?$/;
     
    function shortSlugFromPath(pathname){
      const m=SHORT_SHARE_PATH_RE.exec(pathname||'');
      return m?m[1]:null;
    }
     




    const SHORT_SHARE_ATTEMPT_RE=/(?:^|\/)s\/([^\/]+)\/?$/;
     
    function shortLinkAttemptFromPath(pathname){
      const m=SHORT_SHARE_ATTEMPT_RE.exec(pathname||'');
      return m?m[1]:null;
    }
     
    async function resolveShortShareLink(slug){
       







      try{
        if(!isValidShareSlug(slug))return null;
        const sb=await shortLinksSupabase();
        if(!sb)return null;
        let res=null;
        for(let attempt=0;attempt<2;attempt++){
          try{
            res=await sb.from('share_links').select('payload').eq('slug',slug).maybeSingle();
            break;
          }catch(_){
            res=null;
            if(attempt===0)await new Promise(r=>setTimeout(r,700));
          }
        }
        const data=res&&res.data, error=res&&res.error;
        if(error||!data||typeof data.payload!=='string')return null;
        const payload=await shareDecodeAny(data.payload);
        if(!validSharePayload(payload))return null;
        return payload;
      }catch(_){return null;}
    }
     
    function clearShortSharePath(){
       



      try{
        if(typeof location==='undefined'||!location)return;
        if(!shortLinkAttemptFromPath(location.pathname))return;
        let base=location.pathname.replace(/(?:^|\/)s\/[^\/]+\/?$/,'');
        if(!base)base='/';
        else if(base[base.length-1]!=='/')base+='/';
        history.replaceState(null,'',base+location.search);
      }catch(_){}
    }
     
    function restoreShortSharePath(slug){
       







      try{
        if(typeof location==='undefined'||!location||!slug)return;
        if(shortLinkAttemptFromPath(location.pathname)===slug)return;
        const base=spaBaseForPath(location.pathname);
        history.replaceState(history.state||null,'',base+'s/'+slug+location.search);
      }catch(_){}
    }

     
    function spaBaseForPath(pathname){
       


      return (pathname||'').indexOf('/workout-app-accounts/')===0?'/workout-app-accounts/':'/';
    }
     
    function takeSpaRedirectSlug(){
       




      try{
        if(typeof sessionStorage==='undefined')return null;
        const saved=sessionStorage.getItem(SPA_REDIRECT_KEY);
        if(saved!=null)sessionStorage.removeItem(SPA_REDIRECT_KEY);
        if(!saved)return null;
        const m=/^([^?#]*)/.exec(saved);
        return m?shortLinkAttemptFromPath(m[1]):null;
      }catch(_){return null;}
    }
//# sourceMappingURL=share-shortlinks.js.map
