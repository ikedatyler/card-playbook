/* Card Playbook (public): getting-started flow and card picker, then starts the app. */
(function(){
  var LS='cardplaybook-pub-v1';
  var DB=[]; try{ DB=JSON.parse(document.getElementById('carddb').textContent).cards||[]; }catch(e){}
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function topRates(x){
    var lab={dining:'dining',grocery:'groceries',gas:'gas',flights:'flights',hotels:'hotels',cars:'car rentals',streaming:'streaming',phone:'phone',drugstore:'drugstores',superstore:'Target/Walmart',costco:'Costco',abroad:'abroad',other:'everything'};
    var unit=x.currency==='cash'?'%':'x';
    var r=Object.keys(x.rates||{}).map(function(k){ return [k,x.rates[k]]; }).sort(function(a,b){ return b[1]-a[1]; });
    var seen={}, out=[]; r.forEach(function(p){ if(out.length<3 && !seen[p[1]+p[0]]){ seen[p[1]+p[0]]=1; out.push(p[1]+unit+' '+lab[p[0]]); } });
    return out.join(' · ')||'See card notes';
  }
  function chip(x){ return '<span class="pk-dot" style="background:'+x.face[0]+'"></span>'; }
  // Picker overlay: opts {selected:[ids], title, cta, onDone(ids), single}
  window.CPPicker=function(opts){
    var sel={}; (opts.selected||[]).forEach(function(id){ sel[id]=1; });
    var ov=document.createElement('div'); ov.className='pk-ov';
    ov.innerHTML='<div class="pk"><div class="pk-h"><b>'+esc(opts.title||'Add your cards')+'</b>'+(opts.cancel!==false?'<button class="mini x" data-pk="x">Close</button>':'')+'</div>'+
      '<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="pkq" type="search" placeholder="Search cards or banks" autocomplete="off"></div>'+
      '<div class="pk-sel" id="pksel"></div><div class="pk-list" id="pklist"></div>'+
      '<button class="btn wide" id="pkgo"></button></div>';
    document.body.appendChild(ov); document.body.classList.add('pk-open');
    var q=ov.querySelector('#pkq');
    function draw(){
      var t=q.value.trim().toLowerCase();
      var list=DB.filter(function(x){ return !t || (x.name+' '+x.issuer).toLowerCase().indexOf(t)>=0; });
      if(!t) list=list.slice().sort(function(a,b){ return (b.popular||0)-(a.popular||0) || a.issuer.localeCompare(b.issuer); });
      var groups={}; if(t) groups={'Results':list}; else list.forEach(function(x){ var g=x.popular?'Popular':x.issuer; (groups[g]=groups[g]||[]).push(x); });
      var h=''; Object.keys(groups).forEach(function(g){ h+='<div class="pk-g">'+esc(g)+'</div>'+groups[g].map(function(x){ return '<button class="pk-row'+(sel[x.id]?' on':'')+'" data-pkid="'+x.id+'">'+chip(x)+'<span class="pk-m"><b>'+esc(x.name)+'</b><small>'+esc(x.issuer)+' · '+(x.fee?'$'+x.fee+'/yr':'No annual fee')+' · '+esc(topRates(x))+'</small></span><span class="pk-ck"></span></button>'; }).join(''); });
      if(!list.length) h='<p class="hint" style="padding:12px 4px">No match. You can add any card by hand later under Wallet → Add a card.</p>';
      ov.querySelector('#pklist').innerHTML=h;
      var ids=Object.keys(sel);
      ov.querySelector('#pksel').innerHTML=ids.map(function(id){ var x=DB.filter(function(c){return c.id===id;})[0]; return x?'<button class="chip on" data-pkid="'+id+'" style="--k:'+x.tint+'">'+esc(x.name)+' ×</button>':''; }).join('');
      var go=ov.querySelector('#pkgo'); go.textContent=ids.length?(opts.cta||'Continue')+' ('+ids.length+')':'Pick at least one card'; go.disabled=!ids.length;
    }
    ov.addEventListener('click',function(e){
      var r=e.target.closest('[data-pkid]'); if(r){ var id=r.dataset.pkid; if(sel[id]) delete sel[id]; else sel[id]=1; var y=ov.querySelector('#pklist').scrollTop; draw(); ov.querySelector('#pklist').scrollTop=y; return; }
      if(e.target.closest('[data-pk="x"]')){ close(); return; }
      if(e.target.id==='pkgo' && Object.keys(sel).length){ var ids=Object.keys(sel); close(); opts.onDone(ids); }
    });
    q.addEventListener('input',draw);
    function close(){ ov.remove(); document.body.classList.remove('pk-open'); }
    draw();
  };
  window.CPCardFromDB=function(id){
    var x=DB.filter(function(c){return c.id===id;})[0]; if(!x) return null;
    var c={id:x.id, name:x.name, currency:x.currency, network:x.network, rates:JSON.parse(JSON.stringify(x.rates||{})), caps:JSON.parse(JSON.stringify(x.caps||{})), notes:JSON.parse(JSON.stringify(x.notes||{})), db:1};
    if(x.rent) c.rent=true;
    return c;
  };
  function run(){ var src=document.getElementById('main'); var s=document.createElement('script'); s.textContent=src.textContent; document.body.appendChild(s); }
  function start(ids, rent){
    var Y=new Date().getFullYear(), d=new Date(Date.now()-30*864e5);
    var since=d.getFullYear()===Y?d.toISOString().slice(0,10):Y+'-01-01';
    var cpp={amex:1.3,chase:1.3,c1:1.3,bilt:1.3,citi:1.3,cash:1,other:1};
    var cards=ids.map(window.CPCardFromDB).filter(Boolean);
    cards.forEach(function(c){ var x=DB.filter(function(k){return k.id===c.id;})[0]; if(x&&x.cpp&&cpp[c.currency]==null) cpp[c.currency]=x.cpp; });
    var st={v:2, rent:rent||0, year:Y, cards:cards, cpp:cpp, spent:{}, bilt:{spend:0,txns:0}, credits:{}, balances:{}, programs:[], offers:[], txns:[], txnSince:since, theme:'emerald', navPos:'bottom', onboarded:new Date().toISOString().slice(0,10)};
    try{ localStorage.setItem(LS, JSON.stringify(st)); }catch(e){}
    document.getElementById('state').textContent=JSON.stringify(st);
    document.getElementById('app').innerHTML='';
    run();
  }
  var STANDALONE=window.navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
  var IOS=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  var MOBILE=IOS||/android|mobile/i.test(navigator.userAgent);
  var SHARE_SVG='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-4px"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg>';
  var ADD_SVG='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="vertical-align:-4px"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/></svg>';
  function steps(n,total,label){ return '<div class="gs-steps"><span>Step '+n+' of '+total+'</span><b>'+label+'</b><div class="gs-dots">'+Array.apply(null,{length:total}).map(function(_,i){ return '<i class="'+(i<n?'on':'')+'"></i>'; }).join('')+'</div></div>'; }
  function installScreen(){
    var app=document.getElementById('app');
    var ios=IOS?
      '<ol class="gs-ol"><li>Tap '+SHARE_SVG+' <b>Share</b> in Safari\'s toolbar (on newer iPhones, tap <b>•••</b> first).</li><li>Scroll down and tap '+ADD_SVG+' <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Close Safari and open <b>Card Playbook</b> from your Home Screen.</li></ol>':
      '<ol class="gs-ol"><li>Open your browser\'s menu <b>⋮</b>.</li><li>Tap <b>Install app</b> or <b>Add to Home screen</b>.</li><li>Open <b>Card Playbook</b> from your Home Screen.</li></ol>';
    app.innerHTML='<header><div><div class="eyebrow">Welcome</div><h1>Card Playbook</h1></div></header>'+
      '<div class="card hero">'+steps(1,3,'Install the app')+'<p class="why" style="margin:0 0 12px;color:var(--ink)">Know which card to use for every purchase. First, add it to your Home Screen so it works like a real app. Your cards are saved inside the installed app, so do this before setting anything up.</p>'+ios+
      '<p class="hint">It opens full screen, with tabs at the bottom. Nothing to download from the App Store, and no account.</p></div>'+
      '<button class="gs-skip" id="gs-skip">'+(MOBILE?'Skip and use it in the browser instead':'On a computer? Continue here')+'</button>';
    document.getElementById('gs-skip').onclick=function(){ try{ sessionStorage.setItem('cp-skip-install','1'); }catch(e){} welcome(); };
  }
  function welcome(){
    var app=document.getElementById('app'), total=MOBILE?3:2, off=MOBILE?1:0;
    app.innerHTML='<header><div><div class="eyebrow">'+(STANDALONE?'Installed ✓':'Welcome')+'</div><h1>Card Playbook</h1></div></header>'+
      '<div class="card hero">'+steps(1+off,total,'Add your cards')+'<p class="why" style="margin:0 0 6px;font-size:15px;color:var(--ink)">Pick the cards in your wallet.</p>'+
      '<p class="why" style="margin:0 0 14px">The app loads each card\'s earning rates, credits and protections, then ranks your cards for dining, gas, flights, rental cars and more. Takes about a minute.</p>'+
      '<button class="btn wide" id="gs-go">Choose my cards</button>'+
      '<p class="hint">Everything stays on this phone. Nothing is uploaded, and there\'s no account to make.</p></div>'+
      '<div class="card"><h2>What you get</h2>'+
      ['Best card for each purchase, counting multipliers and benefits like primary rental car coverage','Credits checklist so you use every statement credit','Your Amex, Chase and Capital One offers with one tap of a bookmark (guide in the Offers tab)','Optional Gmail sync to log purchases from your card alert emails'].map(function(t){ return '<div class="fcb tipline"><p>'+t+'</p></div>'; }).join('')+'</div>';
    document.getElementById('gs-go').onclick=function(){
      window.CPPicker({title:'Which cards do you have?', cta:'Continue', cancel:true, onDone:function(ids){
        var rentish=ids.some(function(id){ var x=DB.filter(function(c){return c.id===id;})[0]; return x&&x.rent; });
        if(!rentish){ start(ids,0); return; }
        app.innerHTML='<header><div><div class="eyebrow">Almost done</div><h1>Card Playbook</h1></div></header><div class="card hero">'+steps(total,total,'Rent or mortgage')+'<p class="why" style="margin:0 0 12px">Your Bilt card earns on housing payments. Enter your monthly amount to see Bilt\'s rent tiers, or skip it.</p><div class="row" style="margin:0"><input id="gs-rent" type="number" inputmode="decimal" placeholder="e.g. 2400"><button class="btn" id="gs-done">Finish</button></div><button class="gs-skip" id="gs-norent">Skip</button></div>';
        document.getElementById('gs-done').onclick=function(){ start(ids, Math.max(0,parseFloat(document.getElementById('gs-rent').value)||0)); };
        document.getElementById('gs-norent').onclick=function(){ start(ids,0); };
      }});
    };
  }
  function firstScreen(){ var skip=false; try{ skip=sessionStorage.getItem('cp-skip-install')==='1'; }catch(e){} if(MOBILE&&!STANDALONE&&!skip) installScreen(); else welcome(); }
  var saved=null; try{ saved=localStorage.getItem(LS); }catch(e){}
  if(saved){ document.getElementById('state').textContent=saved; run(); }
  else firstScreen();
})();
