// ===== Public build additions: card database, Gmail sync, card picker hooks =====
var CARD_DB={}, CFG={};
try{ CFG=JSON.parse((document.getElementById('cfg')||{}).textContent||'{}'); }catch(e){}
function applyCardDB(){
  try{ (JSON.parse(document.getElementById('carddb').textContent).cards||[]).forEach(function(x){ CARD_DB[x.id]=x; }); }catch(e){}
  cardDBHydrate();
}
function fcOn(){ return !!(S.fc || (S.subs||[]).some(function(s){ return s.id==='founderscard'; })); }
function navGroupOn(gr){ return gr.k!=='bilt' || !!rentCard(); }
// Card picker for "Add a card"
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-act="add"]'); if(!b || !window.CPPicker) return;
  e.preventDefault(); e.stopImmediatePropagation();
  window.CPPicker({title:'Add cards', cta:'Add', selected:[], onDone:function(ids){
    var n=0; ids.forEach(function(id){ if(cardById(id)) return; var c=window.CPCardFromDB(id); if(c){ S.cards.push(c); n++; } });
    applyCardDB(); changed(); render(); if(n) toast(n===1?'Card added':n+' cards added');
  }});
}, true);
// ---- Gmail sync (runs on this phone; reads purchase alert emails only) ----
var GM={tok:null, exp:0, busy:false, msg:'', lib:false, client:null};
S.gmail=S.gmail||{on:false, last:'', count:0};
function gmLoad(cb){
  if(GM.lib){ cb&&cb(); return; }
  var s=document.createElement('script'); s.src='https://accounts.google.com/gsi/client'; s.async=true;
  s.onload=function(){ GM.lib=true; cb&&cb(); }; s.onerror=function(){ GM.msg='Couldn\'t reach Google. Check your connection.'; render(); };
  document.head.appendChild(s);
}
function gmClient(){
  if(GM.client || !window.google || !google.accounts || !google.accounts.oauth2) return GM.client;
  GM.client=google.accounts.oauth2.initTokenClient({client_id:CFG.googleClientId, scope:'https://www.googleapis.com/auth/gmail.readonly', callback:function(r){
    if(r && r.access_token){ GM.tok=r.access_token; GM.exp=Date.now()+(r.expires_in||3600)*1000-60000; S.gmail.on=true; gmRun(); }
    else { GM.busy=false; GM.msg='Gmail access wasn\'t granted.'; render(); }
  }, error_callback:function(){ GM.busy=false; GM.msg='Sign-in was closed before finishing.'; render(); }});
  return GM.client;
}
function gmStart(){
  if(!CFG.googleClientId){ toast('Gmail sync isn\'t set up yet'); return; }
  if(GM.tok && Date.now()<GM.exp){ gmRun(); return; }
  var c=gmClient(); if(!c){ GM.msg='Loading Google sign-in… tap Sync again.'; gmLoad(function(){ render(); }); render(); return; }
  GM.busy=true; GM.msg=''; render();
  c.requestAccessToken({prompt: S.gmail.on?'':'consent'});
}
function gmApi(path){ return fetch('https://gmail.googleapis.com/gmail/v1/users/me/'+path,{headers:{Authorization:'Bearer '+GM.tok}}).then(function(r){ if(r.status===401){ GM.tok=null; throw new Error('auth'); } if(!r.ok) throw new Error('http '+r.status); return r.json(); }); }
var GM_ISS={'chase.com':'Chase','americanexpress.com':'American Express','aexp.com':'American Express','capitalone.com':'Capital One','citi.com':'Citi','citicards.com':'Citi','discover.com':'Discover','bilt.com':'Bilt','biltrewards.com':'Bilt','wellsfargo.com':'Wells Fargo','bankofamerica.com':'Bank of America','usbank.com':'U.S. Bank','robinhood.com':'Robinhood','apple.com':'Goldman Sachs','target.com':'Target','synchronybank.com':'Synchrony','paypal.com':'Synchrony'};
var GM_CAT=[
 ['costco',/costco/],['superstore',/walmart|wal-mart|target\b/],
 ['gas',/shell|chevron|exxon|mobil|arco|\b76\b|valero|circle k|speedway|sunoco|marathon|citgo|bp#|\bbp\b|texaco|quiktrip|wawa|sheetz|fuel|gas station|ev charg|tesla supercharg|electrify america/],
 ['grocery',/safeway|kroger|trader joe|whole foods|albertsons|publix|wegmans|sprouts|aldi|h-e-b|heb\b|vons|ralphs|food lion|stop & shop|giant|harris teeter|meijer|winco|smart & final|grocery|market\b|supermarket|instacart/],
 ['drugstore',/cvs|walgreens|rite aid|pharmacy/],
 ['streaming',/netflix|spotify|hulu|disney|youtube|hbo|max\.com|peacock|paramount|apple\.com\/bill|apple tv|apple music|audible|sirius/],
 ['phone',/verizon|at&t|att\*|t-mobile|tmobile|mint mobile|visible|cricket|xfinity mobile|google fi/],
 ['flights',/airline|airways|united\b|delta air|american air|southwest|alaska air|jetblue|frontier|spirit air|hawaiian|lufthansa|air canada|british a|emirates|qatar|ana\b|jal\b|klm|air france/],
 ['hotels',/hotel|marriott|hilton|hyatt|ihg|holiday inn|sheraton|westin|airbnb|vrbo|booking\.com|expedia|motel|inn\b|resort/],
 ['cars',/hertz|avis|enterprise rent|national car|budget rent|sixt|alamo|turo|thrifty|dollar rent/],
 ['dining',/restaurant|cafe|café|coffee|starbucks|dunkin|mcdonald|burger|pizza|taco|chipotle|subway|sushi|grill|kitchen|bar\b|tavern|bistro|diner|bakery|doordash|grubhub|uber eats|ubereats|postmates|panera|chick-fil|wendy|kfc|popeyes|shake shack|in-n-out|domino|eatery|brew|noodle|ramen|thai|deli/]];
function gmCat(m){ var s=String(m||'').toLowerCase(); for(var i=0;i<GM_CAT.length;i++) if(GM_CAT[i][1].test(s)) return GM_CAT[i][0]; return 'other'; }
function gmB64(s){ try{ s=s.replace(/-/g,'+').replace(/_/g,'/'); return decodeURIComponent(escape(atob(s))); }catch(e){ try{ return atob(s); }catch(x){ return ''; } } }
function gmText(p){
  var plain='', html='';
  (function walk(n){ if(!n) return; if(n.mimeType==='text/plain' && n.body && n.body.data) plain+=gmB64(n.body.data)+'\n'; else if(n.mimeType==='text/html' && n.body && n.body.data) html+=gmB64(n.body.data); (n.parts||[]).forEach(walk); })(p);
  if(!plain && html) plain=html.replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<br\s*\/?>|<\/(p|div|tr|td|li|h\d)>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;|&rsquo;/g,"'");
  return plain.replace(/[ \t]+/g,' ');
}
function gmParse(msg){
  var hd={}; ((msg.payload||{}).headers||[]).forEach(function(h){ hd[h.name.toLowerCase()]=h.value; });
  var from=(hd.from||'').toLowerCase(), subj=hd.subject||'', body=gmText(msg.payload||{}), all=subj+'\n'+body;
  if(/declin|refund|credit (has )?posted|\bpayment\b[^.\n]{0,40}\b(received|posted|scheduled|processed|due)|thank you for your payment|autopay|statement is ready|return(ed)? credit|reversal/i.test(all.slice(0,600))) return null;
  var dom=Object.keys(GM_ISS).filter(function(d){ return from.indexOf(d)>=0; })[0]; if(!dom) return null;
  var issuer=GM_ISS[dom];
  var am=(subj.match(/\$\s?([\d,]+\.\d{2})/)||body.match(/(?:amount|charge|transaction|purchase)[^$]{0,40}\$\s?([\d,]+\.\d{2})/i)||body.match(/\$\s?([\d,]+\.\d{2})/)); if(!am) return null;
  var amt=parseFloat(am[1].replace(/,/g,'')); if(!(amt>0)) return null;
  var mm=all.match(/merchant(?: name)?\s*[:\-]\s*([^\n]{2,60})/i)||subj.match(/(?:\bat|\bwith|\bto)\s+([A-Z0-9][^\n$]{1,50}?)(?:\s+(?:on|for|was|has|is)\b|[.!]|$)/)||body.match(/(?:\bat|\bwith)\s+([A-Z0-9][A-Za-z0-9&'.*#\- ]{1,40}?)(?:\s+(?:on|for|was|has)\b|[.,\n])/);
  var m=(mm?mm[1]:'Purchase').replace(/\s+/g,' ').trim().slice(0,40);
  var cand=S.cards.filter(function(c){ var x=CARD_DB[c.id]; return x && x.issuer===issuer; });
  if(!cand.length) return null;
  var low=all.toLowerCase(), card=cand.filter(function(c){ return c.name.toLowerCase().split(/\s+/).some(function(w){ return w.length>3 && !/card|rewards|visa|amex|chase|citi|capital/.test(w) && low.indexOf(w)>=0; }); })[0]||cand[0];
  var dt=new Date(+msg.internalDate||Date.parse(hd.date)||Date.now()); var ds=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
  return {id:'gm-'+msg.id, card:card.id, amt:amt, m:m, cat:gmCat(m), date:ds};
}
function gmRun(){
  GM.busy=true; GM.msg='Reading your card alert emails…'; render();
  var froms=Object.keys(GM_ISS).map(function(d){ return 'from:'+d; }).join(' OR ');
  var q='newer_than:60d ('+froms+') (subject:transaction OR subject:purchase OR subject:charge OR subject:spent OR subject:"you made" OR subject:alert) -subject:declined -subject:payment -subject:statement';
  gmApi('messages?maxResults=80&q='+encodeURIComponent(q)).then(function(r){
    var ids=(r.messages||[]).map(function(m){ return m.id; }).filter(function(id){ return !TX_IDS['gm-'+id]; });
    var out=[], i=0;
    function next(){ if(i>=ids.length) return Promise.resolve(); var batch=ids.slice(i,i+8); i+=8; return Promise.all(batch.map(function(id){ return gmApi('messages/'+id+'?format=full').then(function(m){ var t=gmParse(m); if(t) out.push(t); }).catch(function(){}); })).then(next); }
    return next().then(function(){ return out; });
  }).then(function(out){
    var before=TX_NEW; out.forEach(applyTxn); var n=TX_NEW-before;
    S.gmail.on=true; S.gmail.last=new Date().toISOString(); S.gmail.count=(S.gmail.count||0)+n;
    GM.busy=false; GM.msg=n?(n===1?'Added 1 purchase.':'Added '+n+' purchases.'):'No new purchase alerts found.'; changed(); render(); if(n) toast(GM.msg);
  }).catch(function(e){ GM.busy=false; GM.msg=e&&e.message==='auth'?'Google sign-in expired. Tap Sync again.':'Gmail sync failed. Try again in a moment.'; render(); });
}
function gmailCard(){
  var g=S.gmail||{}, set=!!CFG.googleClientId;
  var h='<div class="card"><h2>Gmail sync</h2>';
  if(!set) return h+'<p class="why" style="margin:0">Gmail sync isn\'t switched on for this copy of the app yet.</p></div>';
  h+='<p class="why" style="margin:0 0 10px">Reads only your card purchase alert emails, right on this phone, and logs each purchase to the right card and category. Nothing is sent anywhere else. Turn on alerts for every purchase in each card\'s app first.</p>';
  if(g.last) h+='<p class="hint" style="margin:0 0 10px">Last synced '+new Date(g.last).toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' · '+(g.count||0)+' purchases logged so far</p>';
  if(GM.msg) h+='<div class="note'+(/fail|expired|wasn|closed|Couldn/.test(GM.msg)?'':' ok')+'">'+esc(GM.msg)+'</div>';
  h+='<button class="btn wide" data-act="gsync" style="margin-top:10px"'+(GM.busy?' disabled':'')+'>'+(GM.busy?'Syncing…':g.on?'Sync Gmail now':'Connect Gmail')+'</button>';
  if(g.on) h+='<button class="btn ghost wide" data-act="gdisc" style="margin-top:8px">Disconnect Gmail</button>';
  h+='<p class="hint">Invite-only for now: your Google account has to be on the app\'s tester list, and Google will warn that the app isn\'t verified. Google asks you to sign in again about once a week.</p></div>';
  return h;
}
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-act="gsync"],[data-act="gdisc"]'); if(!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(b.dataset.act==='gsync') gmStart();
  else { if(GM.tok && window.google && google.accounts && google.accounts.oauth2) google.accounts.oauth2.revoke(GM.tok,function(){}); GM.tok=null; S.gmail.on=false; GM.msg='Disconnected. Purchases already logged stay.'; changed(); render(); }
}, true);
if(S.gmail && S.gmail.on && CFG.googleClientId) gmLoad(function(){ gmClient(); });
applyCardDB();
function offersTutorial(){
  var steps=[
    ['Install the Grab offers bookmark','One-time setup in Safari or Chrome. The guide walks you through it in about 2 minutes.'],
    ['Open your card\'s offers page','Use the bank\'s website, not its app: Amex Offers, Chase Offers or Capital One Offers. Pick the card first.'],
    ['Tap the bookmark','It scrolls through and reads every offer (20 to 40 seconds), then tap Copy for Card Playbook.'],
    ['Paste it here','Tap Paste offers from your bank below, check the card, and tap Import. Repeat for each card about once a week.']];
  return '<div class="optut"><p class="why" style="margin:0 0 6px">Bring in your card-linked offers (Amex Offers, Chase Offers, Capital One Offers) so you never miss cash back:</p>'+
    steps.map(function(s,i){ return '<div class="fcb num"><i>'+(i+1)+'</i><div><b>'+s[0]+'</b><p>'+s[1]+'</p></div></div>'; }).join('')+
    '<a class="btn ghost wide" href="'+GRAB_URL+'" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;text-decoration:none;margin-top:10px">Open the setup guide</a></div>';
}
// ===== Help: quick tour, how-to guide, setup checklist =====
function isStandalone(){ return window.navigator.standalone===true || (window.matchMedia&&matchMedia('(display-mode: standalone)').matches); }
var TOUR=[
  ['pick','Pay: which card to use','<p>Before you pay, tap what you\'re buying: Restaurants, Gas, Flights, Car rentals and more.</p><p>The top card is your best pick. It counts each card\'s multipliers <b>and</b> its benefits, like primary rental car insurance or no foreign transaction fees.</p><p>Tap <b>Details</b> on any card to see why it ranks where it does.</p>'],
  ['travel','Travel: plan a trip','<p>Enter where and when you\'re flying, your cabin, and nonstop or not.</p><p>It compares paying cash with your best card, booking through your card\'s travel site, and transferring points to an airline, then links you to book.</p><p>Fares and award prices are estimates. Always confirm the seat is available before moving points.</p>'],
  ['offers','Offers: never miss cash back','<p>Pull in every Amex, Chase and Capital One offer with the <b>Grab offers</b> bookmark. The Offers tab has a 2-minute setup guide.</p><p>Offers are ranked by value. Mark one <b>Used</b> once you\'ve bought.</p>'],
  ['wallet','Wallet: cards, credits, points','<p><b>Cards</b> shows what each card earned you and whether it\'s worth its annual fee. Tap <b>Edit</b> to fix rates or fees if yours differ.</p><p><b>Credits</b> is a checklist of every statement credit. Checks reset each month, quarter or year on their own.</p><p><b>Points</b> holds your balances and what they\'re worth.</p>'],
  ['tips','Insights and Settings','<p><b>Insights</b> gives tips from your actual spending, like moving a subscription to a card that earns more on it.</p><p>The <b>gear</b> (top right) has Gmail sync, your accent color, backups and this guide anytime.</p>']
];
var TOUR_I=-1;
function tourHtml(){
  var t=TOUR[TOUR_I], last=TOUR_I===TOUR.length-1;
  return '<div class="tr-card"><div class="tr-ic">'+(ICON[t[0]]||'')+'</div><div class="tr-step">'+(TOUR_I+1)+' of '+TOUR.length+'</div><h3>'+t[1]+'</h3><div class="tr-body">'+t[2]+'</div>'+
    '<div class="tr-dots">'+TOUR.map(function(_,i){ return '<i class="'+(i===TOUR_I?'on':'')+'"></i>'; }).join('')+'</div>'+
    '<div class="row"><button class="btn ghost" data-tour="skip">'+(last?'Close':'Skip')+'</button><button class="btn" data-tour="next" style="flex:1">'+(last?'Start using it':'Next')+'</button></div></div>';
}
function tourOpen(){ TOUR_I=0; var ov=document.getElementById('tourov'); if(!ov){ ov=document.createElement('div'); ov.id='tourov'; ov.className='pk-ov tr-ov'; document.body.appendChild(ov); } ov.innerHTML=tourHtml(); }
function tourClose(){ var ov=document.getElementById('tourov'); if(ov) ov.remove(); TOUR_I=-1; if(!S.tourDone){ S.tourDone=1; changed(); } }
document.addEventListener('click',function(e){
  var b=e.target.closest('[data-tour]'); if(!b) return; e.preventDefault(); e.stopImmediatePropagation();
  var a=b.dataset.tour;
  if(a==='open') tourOpen();
  else if(a==='next'){ if(TOUR_I>=TOUR.length-1) tourClose(); else { TOUR_I++; document.getElementById('tourov').innerHTML=tourHtml(); } }
  else tourClose();
}, true);
// Setup checklist on Pay
function setupItems(){
  S.setup=S.setup||{};
  return [
    ['cards','Pick your cards',true,''],
    ['home','Add Card Playbook to your Home Screen',isStandalone()||!!S.setup.home,'home'],
    ['alerts','Turn on $0 purchase alerts in each card\'s app',!!S.setup.alerts||(S.gmail&&S.gmail.count>0),'alerts'],
    ['gmail','Connect Gmail sync',!!(S.gmail&&S.gmail.on),'gmail'],
    ['offers','Grab your card offers',(S.offers||[]).length>0,'offers'],
    ['credits','Review your statement credits',!!S.setup.credits,'credits']];
}
function setupCard(){
  S.setup=S.setup||{};
  if(S.setup.hidden) return '';
  var it=setupItems(), done=it.filter(function(x){return x[2];}).length;
  if(done===it.length) return '';
  return '<div class="card su"><div class="su-h"><h2 style="margin:0">Getting set up</h2><span class="su-n">'+done+' of '+it.length+'</span></div><div class="bar" style="margin:10px 0 6px"><i style="width:'+Math.round(done/it.length*100)+'%"></i></div>'+
    it.map(function(x){ return '<button class="su-row'+(x[2]?' done':'')+'" data-su="'+x[3]+'"'+(x[2]?' disabled':'')+'><span class="su-ck"></span><span>'+x[1]+'</span>'+(x[2]?'':'<span class="su-go">›</span>')+'</button>'; }).join('')+
    '<div class="row" style="margin-top:8px"><button class="btn ghost" data-gd="open" style="flex:1">How to use the app</button><button class="mini x" data-su="hide">Hide</button></div></div>';
}
function suSheet(title,html,mark){
  var ov=document.createElement('div'); ov.className='pk-ov'; ov.id='suov';
  ov.innerHTML='<div class="pk gd" style="height:auto;max-height:80vh"><div class="pk-h"><b>'+title+'</b><button class="mini x" data-sux="x">Close</button></div><div class="gd-b" style="overflow:auto">'+html+'</div>'+(mark?'<button class="btn wide" data-sux="'+mark+'">I\'ve done this</button>':'')+'</div>';
  document.body.appendChild(ov); document.body.classList.add('pk-open');
}
document.addEventListener('click',function(e){
  var x=e.target.closest('[data-sux]'); if(x){ e.preventDefault(); e.stopImmediatePropagation(); var k=x.dataset.sux; if(k!=='x'){ S.setup=S.setup||{}; S.setup[k]=1; changed(); } var o=document.getElementById('suov'); if(o) o.remove(); document.body.classList.remove('pk-open'); render(); return; }
  var b=e.target.closest('[data-su]'); if(!b) return; e.preventDefault(); e.stopImmediatePropagation();
  var a=b.dataset.su; S.setup=S.setup||{};
  if(a==='hide'){ S.setup.hidden=1; changed(); render(); toast('Setup hidden. The guide is in Settings anytime.'); }
  else if(a==='home') suSheet('Add to Home Screen','<p>In <b>Safari</b>, tap <b>Share</b> (square with an arrow) → <b>Add to Home Screen</b> → <b>Add</b>. Then open Card Playbook from the new icon.</p><p>The icon keeps its own data, separate from Safari. If you already set things up here in Safari, use Gear → <b>Copy data</b> first, then <b>Import</b> in the icon version.</p>','home');
  else if(a==='alerts') suSheet('Turn on purchase alerts','<p>Gmail sync reads the emails your banks send when you buy something, so each card needs an alert for <b>every</b> purchase.</p><p>In each card\'s app, look for <b>Alerts</b> or <b>Notifications</b> (usually under Profile or Account), turn on email alerts for purchases or transactions, and set the minimum amount to <b>$0</b>.</p><p>Do this for every card you added.</p>','alerts');
  else if(a==='gmail'){ tab='sync'; render(); window.scrollTo(0,0); }
  else if(a==='offers'){ tab='offers'; render(); window.scrollTo(0,0); }
  else if(a==='credits'){ S.setup.credits=1; changed(); tab='credits'; render(); window.scrollTo(0,0); }
}, true);
var _viewPick=viewPick; viewPick=function(){ return setupCard()+_viewPick(); };
if(S.onboarded && !S.tourDone) setTimeout(tourOpen, 600);
// ===== Insights for anyone (replaces the personal version) =====
var CAT_LABEL={dining:'dining',grocery:'groceries',gas:'gas',costco:'Costco',superstore:'Target and Walmart',flights:'flights',hotels:'hotels',cars:'car rentals',drugstore:'drugstores',streaming:'streaming',phone:'phone bills',abroad:'purchases abroad',other:'everything else'};
function publicSuggestions(){
  var sp=spendByCat(), cardSpend=0, rewards=0;
  Object.keys(sp).forEach(function(k){ cardSpend+=sp[k]; });
  S.cards.forEach(function(c){ try{ rewards+=rewardsSoFar(c).v; }catch(e){} });
  var h='<div class="card hero"><h2>Your year so far</h2>';
  h+='<div class="kpis"><div class="kpi"><b>'+money(cardSpend)+'</b><span>card spending logged</span></div><div class="kpi"><b>'+money(rewards)+'</b><span>rewards earned · '+(cardSpend?(rewards/cardSpend*100).toFixed(1):'0')+'% back</span></div></div>';
  if (!cardSpend){
    h+='<p class="hint">Tips here are based on your own spending. Connect Gmail sync (gear → Gmail sync) or log purchases on the Pay tab (pick a category, enter the amount), and personalized tips will appear as your purchases come in.</p></div>';
  } else {
    var max=0; SUG_CATS.forEach(function(c){ if((sp[c[0]]||0)>max) max=sp[c[0]]; });
    h+='<div style="margin-top:12px">';
    SUG_CATS.forEach(function(c){ var a=sp[c[0]]||0; if(!a) return; h+='<div class="erow"><span>'+c[1]+'</span><b>'+money(a)+' · '+Math.round(a/cardSpend*100)+'%</b><div class="ebar"><i style="width:'+Math.max(2,a/max*100)+'%"></i></div></div>'; });
    h+='</div></div>';
  }
  var R=[];
  // 1) Spending that went on a weaker card
  var miss=[];
  Object.keys(S.spent||{}).forEach(function(key){
    var p=key.split(':'), c=cardById(p[0]), k=p[1], amt=S.spent[key]||0; if(!c||amt<50||k==='rent') return;
    var best=ranked(k).filter(function(r){ return r.ok; })[0]; if(!best||best.card.id===c.id) return;
    var cur=score(c,k); if(!cur.ok) return;
    var gain=amt*((best.val||0)-(cur.val||0))/100; if(gain<5) return;
    miss.push({k:k,from:c,to:best.card,amt:amt,gain:gain,toLabel:best.label});
  });
  miss.sort(function(a,b){ return b.gain-a.gain; }).slice(0,3).forEach(function(m){
    R.push(['Put '+(CAT_LABEL[m.k]||m.k)+' on '+esc(m.to.name), money(m.amt)+' of '+(CAT_LABEL[m.k]||m.k)+' went on '+esc(m.from.name)+'. '+esc(m.to.name)+' earns '+esc(m.toLabel)+' there, so the same spending would have earned more.', '+'+money(m.gain)]);
  });
  // 2) Credits
  try{ var cg=creditGaps(); if (cg.left>0||cg.missed>0) R.push(['Use the credits you\'re paying for', (cg.left>0?'About '+money(cg.left)+' in statement credits is still available this year. ':'')+(cg.missed>0?'About '+money(cg.missed)+' has gone unused so far. ':'')+'Check them off in Wallet → Credits as you use them.', cg.left>0?money(cg.left)+' left':'']); }catch(e){}
  // 3) Annual fees
  var feeCards=S.cards.filter(function(c){ return (c.fee!=null?c.fee:DEFAULT_FEE[c.id])>0; });
  if (feeCards.length) R.push(['Make sure each annual fee pays off', 'You pay fees on '+feeCards.map(function(c){ return esc(c.name)+' ('+money(c.fee!=null?c.fee:DEFAULT_FEE[c.id])+')'; }).join(', ')+'. Wallet → Cards shows each card\'s rewards and credits against its fee. If one comes up short a few months before renewal, ask the issuer for a retention offer or a switch to a no-fee card.', '']);
  // 4) Abroad
  var ab=ranked('abroad').filter(function(r){ return r.ok; })[0]; if (ab) R.push(['Traveling abroad? Use '+esc(ab.card.name), 'It\'s your best card for purchases in another currency'+(ab.perkWhy?' ('+esc(ab.perkWhy).toLowerCase()+')':'')+'. Cards with a 3% foreign transaction fee wipe out their rewards abroad. If a card machine asks to charge in dollars, choose the local currency.', '']);
  // 5) Rent
  var rc=rentCard(); if (rc && S.rent>0){ var need=S.rent*0.25; R.push(['Unlock more points on rent', 'Bilt pays more on housing when you spend on '+esc(rc.name)+' each statement. Spending about '+money(need)+' a month (25% of rent) unlocks the higher tier. See the Bilt tab for your progress.', '']); }
  // 6) Points
  var bal=0; Object.keys(S.balances||{}).forEach(function(k){ bal+=(S.balances[k]||0)*((S.cpp[k]||1)/100); });
  if (bal>0) R.push(['Put your points to work', 'Your points and miles are worth about '+money(bal)+' at the app\'s values, often more when transferred for flights or hotels. Programs devalue over time, so plan a trip and transfer only after you\'ve found an award seat.', '']);
  if (!R.length) R.push(['You\'re set up well', 'Keep using the Pay tab before each purchase. Tips appear here as you log spending, grab offers and check off credits.', '']);
  h+='<div class="card"><h2>Maximize rewards</h2>'+R.map(tipHTML).join('')+'</div>'+walletReview();
  var C=[
    ['Pay the full statement balance', 'Interest (often 20–30% APR) cancels out rewards fast. Set AutoPay on every card to the full statement balance.', ''],
    ['Keep balances low at closing', 'Utilization, meaning balances divided by limits, is reported on each card\'s closing date and drives about 30% of your score. Paying down before closing keeps it under 10%.', ''],
    ['Keep no-fee cards open', 'Older accounts and higher total limits help your score. Put a small recurring bill on unused no-fee cards so they aren\'t closed for inactivity.', ''],
    ['Space out new applications', 'Each application causes a small, temporary dip. Avoid new cards for 6–12 months before a mortgage or car loan.', '']];
  h+='<div class="card"><h2>Credit score basics</h2>'+C.map(tipHTML).join('')+'</div>';
  h+='<p class="foot">Estimates use your logged spending and the app\'s point values. General information, not financial advice.</p>';
  return h;
}
viewSuggestions=publicSuggestions;
