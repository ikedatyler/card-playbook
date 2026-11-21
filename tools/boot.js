/* Card Playbook phone loader: pulls the encrypted nightly data, unlocks it with this phone's private key, then starts the app. */
(function(){
  var LS='cardplaybook-v1', SYNC='cardplaybook-sync', EXTRA='cardplaybook-extra';
  var subtle=window.crypto&&window.crypto.subtle;
  function b64u(buf){ var s='',b=new Uint8Array(buf); for(var i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
  function unb64(s){ s=s.replace(/-/g,'+').replace(/_/g,'/'); while(s.length%4) s+='='; var r=atob(s),b=new Uint8Array(r.length); for(var i=0;i<r.length;i++) b[i]=r.charCodeAt(i); return b; }
  function idb(){ return new Promise(function(res,rej){ var q=indexedDB.open('cardplaybook-keys',1); q.onupgradeneeded=function(){ q.result.createObjectStore('k'); }; q.onsuccess=function(){ res(q.result); }; q.onerror=function(){ rej(q.error); }; }); }
  function idbGet(db,k){ return new Promise(function(res,rej){ var r=db.transaction('k').objectStore('k').get(k); r.onsuccess=function(){ res(r.result); }; r.onerror=function(){ rej(r.error); }; }); }
  function idbPut(db,k,v){ return new Promise(function(res,rej){ var t=db.transaction('k','readwrite'); t.objectStore('k').put(v,k); t.oncomplete=function(){ res(); }; t.onerror=function(){ rej(t.error); }; }); }
  function keys(){
    return idb().then(function(db){
      return idbGet(db,'pair').then(function(p){
        if(p&&p.priv&&p.pub) return p;
        return subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},false,['decrypt','encrypt']).then(function(kp){
          return subtle.exportKey('jwk',kp.publicKey).then(function(j){ var p={priv:kp.privateKey,pub:{kty:'RSA',n:j.n,e:j.e},made:new Date().toISOString()}; return idbPut(db,'pair',p).then(function(){ return p; }); });
        });
      });
    });
  }
  function pubCode(p){ return 'CPK1.'+b64u(new TextEncoder().encode(JSON.stringify(p.pub))); }
  function decrypt(env,priv){
    return subtle.decrypt({name:'RSA-OAEP'},priv,unb64(env.key)).then(function(raw){
      return subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);
    }).then(function(k){ return subtle.decrypt({name:'AES-GCM',iv:unb64(env.iv)},k,unb64(env.ct)); })
    .then(function(pt){ return JSON.parse(new TextDecoder().decode(pt)); });
  }
  function setBlock(id,txt){ var el=document.getElementById(id); if(el&&txt) el.textContent=txt; }
  function toast(msg){ setTimeout(function(){ var t=document.getElementById('toast'); if(!t) return; t.textContent=msg; t.classList.add('show'); setTimeout(function(){ t.classList.remove('show'); },2600); },700); }
  var STUB="function viewSuggestions(){ return '<div class=\"card\"><p class=\"why\" style=\"margin:0\">Insights appear after your next nightly sync.</p></div>'; }";
  function run(){
    var src=document.getElementById('main'), ex={}; try{ ex=JSON.parse(localStorage.getItem(EXTRA)||'{}'); }catch(e){}
    var s=document.createElement('script'); s.textContent=src.textContent.replace('/*__PRIV__*/', function(){ return ex.priv||STUB; }); document.body.appendChild(s);
  }
  function pairScreen(p,note){
    var code=pubCode(p), standalone=window.navigator.standalone===true||matchMedia('(display-mode: standalone)').matches;
    var ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
    var app=document.getElementById('app');
    app.innerHTML='<header><div><div class="eyebrow">Phone setup</div><h1>Card Playbook</h1></div></header>'+
      (ios&&!standalone?'<div class="card"><h2>Step 1 · Add to Home Screen</h2><p class="why" style="margin:0">Tap <b>Share</b> → <b>Add to Home Screen</b>, then open Card Playbook from the new icon. Do the next step there (the icon keeps its own storage, separate from Safari).</p></div>':'')+
      '<div class="card hero"><h2>'+(ios&&!standalone?'Step 2 · ':'')+'Connect this phone</h2><p class="why" style="margin:0 0 12px">This phone made a private key that never leaves it. Copy the public half below and paste it to Claude in your Card Playbook chat. After the next sync, your data unlocks here automatically.</p>'+
      '<textarea id="cpk" readonly style="min-height:120px">'+code+'</textarea><button class="btn wide" id="cpkcopy" style="margin-top:10px">Copy key</button>'+
      (note?'<div class="note">'+note+'</div>':'')+'</div>';
    document.getElementById('cpkcopy').onclick=function(){ var ta=document.getElementById('cpk'); ta.select(); (navigator.clipboard?navigator.clipboard.writeText(code):Promise.reject()).catch(function(){ document.execCommand('copy'); }); this.textContent='Copied'; };
  }
  if(!subtle||!window.indexedDB){ run(); return; }
  keys().then(function(p){
    return fetch('data.enc.json?t='+Date.now(),{cache:'no-store'}).then(function(r){ return r.ok?r.json():null; }).catch(function(){ return null; }).then(function(env){
      if(!env) return {p:p,remote:null,why:'none'};
      return decrypt(env,p.priv).then(function(d){ return {p:p,remote:d}; }).catch(function(){ return {p:p,remote:null,why:'locked'}; });
    });
  }).then(function(o){
    var meta={}; try{ meta=JSON.parse(localStorage.getItem(SYNC)||'{}'); }catch(e){}
    var local=localStorage.getItem(LS), r=o.remote, synced=false;
    if(r&&r.state&&(!meta.at||r.at>meta.at)){
      var keep={}; try{ var l=JSON.parse(local||'null'); if(l){ ['theme','navPos'].forEach(function(k){ if(l[k]!=null) keep[k]=l[k]; }); } }catch(e){}
      var st=r.state; for(var k in keep) st[k]=keep[k];
      try{
        localStorage.setItem(LS,JSON.stringify(st));
        localStorage.setItem(EXTRA,JSON.stringify({transfers:r.transfers||null,inbox:r.inbox||null,emailoffers:r.emailoffers||null,priv:r.priv||''}));
        localStorage.setItem(SYNC,JSON.stringify({at:r.at}));
      }catch(e){}
      local=localStorage.getItem(LS); synced=!!meta.at;
    }
    if(!local){ pairScreen(o.p,o.why==='locked'?'The synced data is locked to a different key. Send Claude the key above to re-connect this phone.':''); return; }
    var ex={}; try{ ex=JSON.parse(localStorage.getItem(EXTRA)||'{}'); }catch(e){}
    setBlock('state',local);
    if(ex.transfers) setBlock('transfers',JSON.stringify(ex.transfers));
    if(ex.inbox) setBlock('inbox',JSON.stringify(ex.inbox));
    if(ex.emailoffers) setBlock('emailoffers',JSON.stringify(ex.emailoffers));
    run();
    if(synced) toast('Updated with your latest synced data');
  }).catch(function(){ if(localStorage.getItem(LS)){ setBlock('state',localStorage.getItem(LS)); run(); } else document.getElementById('app').innerHTML='<div class="card" style="margin-top:40px"><p class="why">Couldn\'t start. Close and reopen the app.</p></div>'; });
})();
