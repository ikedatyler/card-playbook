(function(){
if(window.__cpGrab){window.__cpGrab.remove();}
var H=location.hostname, ISS=/americanexpress|aexp/.test(H)?'amex':/chase\.com/.test(H)?'chase':/capitalone/.test(H)?'c1':/citi/.test(H)?'citi':/bankofamerica/.test(H)?'boa':/usbank/.test(H)?'usb':/wellsfargo/.test(H)?'wf':'';
var NAMES={amex:'Amex',chase:'Chase',c1:'Capital One',citi:'Citi',boa:'Bank of America',usb:'U.S. Bank',wf:'Wells Fargo'};
var box=document.createElement('div');window.__cpGrab=box;
box.setAttribute('style','position:fixed;z-index:2147483647;left:12px;right:12px;bottom:12px;max-width:420px;margin:0 auto;background:#07120d;color:#eef3ef;border:1px solid #2f7a5c;border-radius:16px;padding:14px 16px;font:15px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 18px 40px rgba(0,0,0,.5)');
function btn(t,id,primary){return '<button id="'+id+'" style="flex:1;font:inherit;font-weight:600;padding:10px 8px;border-radius:10px;border:1px solid #2f7a5c;background:'+(primary?'#10b981':'transparent')+';color:'+(primary?'#04110b':'#a7f3d0')+'">'+t+'</button>';}
function ui(msg,buttons){box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:16px">Card Playbook · Grab offers</b><button id="cpx" style="background:none;border:0;color:#9aa;font-size:20px">×</button></div><div id="cpm" style="color:#cfe0d8;font-size:14px">'+msg+'</div>'+(buttons?'<div style="display:flex;gap:8px;margin-top:10px">'+buttons+'</div>':'');box.querySelector('#cpx').onclick=function(){box.remove();};}
document.body.appendChild(box);
if(!ISS){ui('Open your card\'s offers page (Amex, Chase, Capital One, Citi, BofA, U.S. Bank or Wells Fargo) and tap this bookmark there.');return;}
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
var VAL=/\$\s?\d|\d+(\.\d+)?\s?%|\d[\d,]*\s*(bonus\s+)?(membership rewards\S*\s+)?(points|miles|pts)|\d+x\b|cash back/i;
var ADDRE=/^(\+|add|add to card|add offer|add to list|activate|activate offer|enroll|save|save offer|add to my card)$/i;
var DONERE=/^(added|added to card|offer added|enrolled|activated|saved|✓|in your list)$/i;
function txt(e){return ((e.innerText||e.textContent||'')+'').trim();}
function parts(e){var out=[];(function walk(n){for(var c=n.firstChild;c;c=c.nextSibling){if(c.nodeType===3){var t=c.nodeValue.trim();if(t)out.push(t);}else if(c.nodeType===1&&!/^(SCRIPT|STYLE|SVG|NOSCRIPT)$/i.test(c.tagName)){var st=getComputedStyle(c);if(st.display==='none'||st.visibility==='hidden')continue;var blockish=!/^(inline)$/.test(st.display)||c.children.length===0;if(c.shadowRoot)walk(c.shadowRoot);if(c.children.length===0){var t2=(c.textContent||'').trim();if(t2&&out[out.length-1]!==t2)out.push(t2);}else walk(c);}}})(e.shadowRoot&&!e.firstChild?e.shadowRoot:e);return out.join('\n');}
function deepAll(root){var out=[];(function w(n){if(n.shadowRoot&&n===root)w(n.shadowRoot);var k=n.children||[];for(var i=0;i<k.length;i++){out.push(k[i]);if(k[i].shadowRoot)w(k[i].shadowRoot);w(k[i]);}})(root);return out;}
function up(e){return e.parentElement||(e.parentNode&&e.parentNode.host)||null;}
var VLINE=/^(?:up to\s+)?(?:\$\s?[\d,]+(?:\.\d+)?|[\d.]+\s?%|\+?[\d,]+\s?x?\s+(?:bonus\s+)?(?:membership rewards\S*\s+)?(?:points|miles|pts))(?:\s+(?:cash\s+)?(?:back|off|statement credit|points|miles))?\b/i;
function vis(e){var r=e.getBoundingClientRect();return r.width>0&&r.height>0;}
function lab(e){return (txt(e)||e.getAttribute('aria-label')||e.getAttribute('title')||'').trim();}
function isAdd(e){var l=lab(e);return ADDRE.test(l)||/^add\b.{0,40}(offer|to (your )?card)/i.test(e.getAttribute('aria-label')||'');}
function isDone(e){var l=lab(e);return DONERE.test(l)||/^(added|enrolled|activated)\b/i.test(e.getAttribute('aria-label')||'');}
function tileOf(e){var n=e,best=null;for(var i=0;i<9&&n&&n!==document.body;i++){n=n.parentElement;if(!n)break;var t=txt(n);if(t.length>700)break;if(VAL.test(t)&&parts(n).split('\n').filter(Boolean).length>=2){best=n;break;}}return best;}
function controls(){return deepAll(document.body).filter(function(e){return /^(BUTTON|A)$/.test(e.tagName)||/^(button|switch|checkbox)$/.test(e.getAttribute('role')||'');}).filter(vis);}
function valLeaves(){return deepAll(document.body).filter(function(e){if(e.children.length&&!(e.children.length===1&&/^(SPAN|B|STRONG)$/.test(e.children[0].tagName)))return false;var t=(e.textContent||'').trim();return t.length<90&&(VLINE.test(t)||/^(spend|earn|get|receive)\s+(\$\s?\d|\d)/i.test(t))&&/(back|off|cash|points|miles|pts|credit|%|\dx\b)/i.test(t)&&vis(e)&&!(window.__cpGrab&&window.__cpGrab.contains(e));});}
function tileOfVal(e){var n=e;for(var i=0;i<10&&n;i++){n=up(n);if(!n||n===document.body||n===document.documentElement)return null;var ls=parts(n).split('\n').filter(Boolean);if(ls.join(' ').length>500)return null;if(ls.length>=2&&ls.some(function(l){return !VAL.test(l)&&l.length>=2&&l.length<=60&&!ADDRE.test(l)&&!/^(new|offer)$/i.test(l);}))return n;if(logoName(n))return n;}return null;}
function logoName(n){var im=deepAll(n).filter(function(e){return /^(IMG|SVG)$/i.test(e.tagName)||e.getAttribute('role')==='img';}).map(function(e){return (e.getAttribute('alt')||e.getAttribute('aria-label')||e.getAttribute('title')||'').replace(/\s*(logo|image|icon|brand)\s*$/i,'').trim();}).filter(function(t){return t.length>=2&&t.length<=60&&!VAL.test(t)&&!/^(offer|merchant|close|plus|add)$/i.test(t);});return im[0]||(n.getAttribute&&(n.getAttribute('aria-label')||'').replace(/[,.].*$/,'').trim())||'';}
function expand(t){var base=parts(t).replace(/[✓\s]/g,'').length,n=t;for(var i=0;i<4;i++){var q=up(n);if(!q||q===document.body)break;if(parts(q).replace(/[✓\s]/g,'').length>base+4)break;n=q;}return n;}
function addCtl(t){var r0=t.getBoundingClientRect(),c=deepAll(t).filter(function(e){if(!vis(e))return false;var clk=/^(BUTTON|A)$/.test(e.tagName)||e.getAttribute('role')==='button'||e.tabIndex>=0||e.onclick;if(!clk)return false;var r=e.getBoundingClientRect();if(r.width>96||r.height>96)return false;if(r.width*r.height>0.25*r0.width*r0.height)return false;var l=lab(e);if(isDone(e))return false;return isAdd(e)||/add|plus|enroll|activate/i.test((e.getAttribute('aria-label')||'')+' '+(e.getAttribute('data-testid')||'')+' '+(e.className&&e.className.baseVal!==undefined?e.className.baseVal:e.className||''))||(!l&&e.querySelector&&e.querySelector('svg,img,mds-icon,i'));});return c[0]||null;}
function doneIn(t){return deepAll(t).some(function(e){return isDone(e)||/\b(added|enrolled|activated|offer-added|is-added)\b/i.test((e.getAttribute('aria-label')||'')+' '+(e.getAttribute('data-testid')||'')+' '+(typeof e.className==='string'?e.className:''));});}
function scroller(){var best=null,bh=0;deepAll(document.body).forEach(function(el){if(el.scrollHeight>el.clientHeight+400&&el.clientHeight>250){var oy=getComputedStyle(el).overflowY;if(/(auto|scroll)/.test(oy)&&el.scrollHeight>bh){best=el;bh=el.scrollHeight;}}});var de=document.scrollingElement||document.documentElement;return (best&&bh>de.scrollHeight*0.8)?best:null;}
function clickMore(){if(ISS==='amex')return;controls().filter(function(b){return b.tagName==='BUTTON'&&!b.closest('a,form')&&/^(load|show|view|see)\s+more(\s+offers)?$/i.test(lab(b));}).slice(0,1).forEach(function(b){try{b.click();}catch(e){}});}
async function collectAll(){var blk=function(e){var a=e.target.closest&&e.target.closest('a[href]');if(a&&!(window.__cpGrab&&window.__cpGrab.contains(a))){e.preventDefault();e.stopPropagation();}};document.addEventListener('click',blk,true);try{return await collectAll2();}finally{document.removeEventListener('click',blk,true);}}
async function collectAll2(){
  var acc=new Map(),tm=(document.body.innerText||'').match(/(\d{1,4})\s+(?:results|offers)\b/i),target=tm?+tm[1]:0;
  var sc=scroller(),pos=function(){return sc?sc.scrollTop:window.scrollY;},max=function(){return sc?sc.scrollHeight-sc.clientHeight:(document.scrollingElement||document.documentElement).scrollHeight-innerHeight;};
  var step=function(){var d=Math.max(200,Math.round((sc?sc.clientHeight:innerHeight)*0.6));if(sc)sc.scrollTop+=d;else window.scrollBy(0,d);};
  var SK0=skipRoots();
  if(sc)sc.scrollTop=0;else window.scrollTo(0,0);
  if(SK0.length){var yb=0;SK0.forEach(function(r){var rb=r.getBoundingClientRect().bottom+(sc?sc.scrollTop:window.scrollY);if(rb>yb)yb=rb;});if(sc)sc.scrollTop=yb;else window.scrollTo(0,yb);}
  await sleep(500);
  var stall=0;
  for(var i=0;i<600;i++){
    clickMore();
    var grab=function(){scan().offers.forEach(function(o){var k=o.merchant.toLowerCase()+'|'+(o.amount||o.pct||o.note||'');if(!acc.has(k))acc.set(k,o);else if(o.added)acc.get(k).added=true;});};
    grab();
    var hs=ISS==='amex'?[]:deepAll(document.body).filter(function(el){if(!(el.scrollWidth>el.clientWidth+80&&el.clientWidth>150))return false;var r=el.getBoundingClientRect();if(r.bottom<0||r.top>innerHeight)return false;return /(auto|scroll)/.test(getComputedStyle(el).overflowX)&&!el.__cpDone;});
    for(var h=0;h<hs.length;h++){var el=hs[h];el.__cpDone=1;for(var j=0;j<40&&el.scrollLeft<el.scrollWidth-el.clientWidth-2;j++){el.scrollLeft+=Math.max(120,el.clientWidth*0.8);await sleep(300);grab();}el.scrollLeft=0;}
    ui('Reading offers… '+acc.size+(target?' of '+target:'')+'. Keep this page open.');
    if(target&&acc.size>=target)break;
    var before=pos();step();await sleep(420);
    if(pos()<=before+2&&pos()>=max()-4){stall++;await sleep(900);if(stall>=4)break;}else stall=0;
  }
  return {offers:Array.from(acc.values()),target:target};
}
function money(s){return parseFloat(String(s).replace(/,/g,''));}
function isoDate(s){
  s=s.trim();var m,Y=new Date().getFullYear();
  if((m=s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/))){var y=m[3]?(m[3].length===2?2000+ +m[3]:+m[3]):Y;return y+'-'+('0'+m[1]).slice(-2)+'-'+('0'+m[2]).slice(-2);}
  var d=new Date(s.replace(/\./g,''));if(!isNaN(d)){if(!/\d{4}/.test(s))d.setFullYear(Y);return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);}
  return '';
}
function parse(t,added){
  var lines=t.split('\n').map(function(l){return l.trim();}).filter(function(l){return l&&!ADDRE.test(l)&&!DONERE.test(l)&&!/^(new|offer|expiring soon|online|in-store|online & in-store|details|terms apply|view details|\d+ (days?|hours?) left)$/i.test(l);});
  var vl=lines.filter(function(l){return VAL.test(l);})[0]||'';
  var merchant=lines.filter(function(l){return l!==vl&&!VAL.test(l)&&!/expire|exp\b|ends?\b|valid|days? left/i.test(l)&&l.length>=2&&l.length<=60;})[0]||'';
  if(!merchant||!vl)return null;
  var all=lines.join(' '),raw=t.replace(/\n/g,' '),o={merchant:merchant,added:!!added},m;
  var em=all.match(/(?:expires?|exp\.?|ends?|valid (?:through|until|thru))\s*:?\s*(?:on\s+)?([A-Za-z]{3,9}\.?\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
  if(em)o.ends=isoDate(em[1]);
  var dl=raw.match(/(\d+)\s+days?\s+left/i);if(!o.ends&&dl){var d=new Date(Date.now()+ +dl[1]*864e5);o.ends=d.toISOString().slice(0,10);}
  var v=vl+' '+all;
  if((m=v.match(/spend\s+\$\s?([\d,]+(?:\.\d+)?)(?:\s+or\s+more)?[^$]{0,40}?(?:get|earn|receive)\s+\$\s?([\d,]+(?:\.\d+)?)/i))){o.kind='cash';o.spend=money(m[1]);o.amount=money(m[2]);}
  else if((m=v.match(/(?:get|earn|receive)\s+\$\s?([\d,]+(?:\.\d+)?)[^$]{0,50}?(?:spend|purchase)s?\s+(?:of\s+)?\$\s?([\d,]+(?:\.\d+)?)/i))){o.kind='cash';o.amount=money(m[1]);o.spend=money(m[2]);}
  else if((m=v.match(/spend\s+\$\s?([\d,]+)[^$]{0,40}?(?:get|earn|receive)\s+([\d,]+)\s+(?:bonus\s+)?(?:membership rewards\S*\s+)?(?:points|miles)/i))){o.kind='points';o.spend=money(m[1]);o.amount=money(m[2]);}
  else if((m=v.match(/(?:get|earn)\s+([\d,]+)\s+(?:bonus\s+)?(?:membership rewards\S*\s+)?(?:points|miles)[^$]{0,40}?\$\s?([\d,]+)/i))){o.kind='points';o.amount=money(m[1]);o.spend=money(m[2]);}
  else if((m=v.match(/\+?\s?(\d+)\s?x?\s+(?:additional\s+|bonus\s+)?(?:membership rewards\S*\s+)?(?:points|miles)\s+(?:per|on each|for every|\/)\s*(?:eligible\s+)?(?:\$1|\$|dollar)/i))||(m=vl.match(/\+?\s?(\d+)x\s+(?:points|miles)/i))){o.kind='points';o.note='+'+m[1]+'X '+(/mile/i.test(v)?'miles':'pts')+' per $';}
  else if((m=v.match(/(\d+(?:\.\d+)?)\s?%\s+(?:cash\s+)?(?:back|off)/i))){o.kind='percent';o.pct=money(m[1]);var c=v.match(/up to (?:a total of )?\$\s?([\d,]+(?:\.\d+)?)/i);if(c)o.cap=money(c[1]);}
  else if((m=v.match(/up to\s+([\d,]+)\s+(points|miles)/i))){o.kind='points';o.amount=money(m[1]);o.note='up to';}
  else if((m=vl.match(/^\s*([\d,]{3,})\s+(?:bonus\s+)?(points|miles)\b/i))){o.kind='points';o.amount=money(m[1]);}
  else if((m=v.match(/\$\s?([\d,]+(?:\.\d+)?)\s+(?:cash\s+)?(?:back|statement credit|off)/i))){o.kind='cash';o.amount=money(m[1]);var s=v.match(/(?:purchase|spend)s?\s+of\s+\$\s?([\d,]+)|\$\s?([\d,]+)\s+(?:or more\s+)?purchase/i);if(s)o.spend=money(s[1]||s[2]);}
  else {o.kind='cash';o.note=vl.slice(0,60);}
  var t2=v.match(/(?:up to|limit)\s+(\d+)\s+times?/i);if(t2)o.note=(o.note?o.note+' · ':'')+'up to '+t2[1]+' times';
  return o;
}
function skipRoots(){if(ISS!=='amex')return [];return deepAll(document.body).filter(function(e){return e.children.length<=2&&/^added to (your )?card\s*(\(\d+\))?$/i.test((e.textContent||'').trim())&&vis(e);}).map(function(h){var n=h;for(var i=0;i<8;i++){var q=up(n);if(!q||q===document.body)break;var r=q.getBoundingClientRect();if(r.height>1400)break;n=q;}return n;});}
function scan(){var SK=skipRoots(),skip=function(t){return SK.some(function(r){return r.contains(t);});};
  var seen=new Set(),out=[],adds=[];
  controls().forEach(function(b){
    var a=isAdd(b),d=!a&&isDone(b);if(!a&&!d)return;
    var t=tileOf(b);if(!t||seen.has(t)||skip(t))return;seen.add(t);
    var o=parse(parts(t),d);if(!o)return;out.push(o);if(a&&!b.disabled&&b.getAttribute('aria-disabled')!=='true')adds.push({b:b,o:o});
  });
  valLeaves().forEach(function(v){
    var t=tileOfVal(v);if(!t||seen.has(t)||skip(t))return;
    var inside=false;seen.forEach(function(x){if(x.contains&&(x.contains(t)||t.contains(x)))inside=true;});if(inside)return;
    seen.add(t);var T=expand(t);seen.add(T);var d=doneIn(T),pt=parts(t),o=parse(pt,d);if(!o){var ln=logoName(T);if(ln)o=parse(ln+'\n'+pt,d);}if(!o)return;out.push(o);
    if(!d){var b=addCtl(T);if(b)adds.push({b:b,o:o});}
  });
  var k={};out=out.filter(function(o){var key=o.merchant+'|'+(o.amount||o.pct||o.note);if(k[key])return false;k[key]=1;return true;});
  return {offers:out,adds:adds};
}
function cardHint(){
  var t=(document.body.innerText||'').slice(0,4000);
  var m=t.match(/(Platinum|Gold|Green|Blue Cash \w+|Delta SkyMiles \w+|Hilton Honors \w*|Marriott Bonvoy \w+|Sapphire (?:Preferred|Reserve)|Freedom (?:Unlimited|Flex)|Prime Visa|Ink Business \w+|United \w+|Southwest \w+(?: \w+)?|Venture X|VentureOne|Venture|Savor|Quicksilver|Strata \w+|Double Cash|Custom Cash|Costco|AAdvantage \w+|Autograph(?: Journey)?|Active Cash|Customized Cash|Premium Rewards|Unlimited Cash|Altitude \w+|Cash\+)[^\n]{0,24}/i);
  return m?m[0].trim():'';
}
function code(offers){
  var p={v:1,iss:ISS,cardHint:cardHint(),at:new Date().toISOString(),offers:offers};
  var s=btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return 'CPO1.'+s;
}
function finish(offers,addedNow,target){
  var c=code(offers),n=offers.length,na=offers.filter(function(o){return o.added;}).length;
  ui('Found '+n+' '+NAMES[ISS]+' offers'+(target&&n<target?' (the page says '+target+'; scroll the list once by hand and tap the bookmark again if any are missing)':'')+'. Tap Copy, then open Card Playbook → Offers → Paste offers from your bank.',btn('Copy for Card Playbook','cpc',1));
  var dbgb=document.createElement('button');dbgb.textContent='Something off? Copy troubleshooting details';dbgb.setAttribute('style','display:block;margin:10px auto 0;background:none;border:0;color:#9fb3aa;font:13px -apple-system,sans-serif;text-decoration:underline');box.appendChild(dbgb);
  dbgb.onclick=function(){var sc=scroller(),de=document.scrollingElement||document.documentElement;var d='CPDBG2 '+location.hostname+location.pathname+'\nfound='+n+' target='+(target||0)+' scroller='+(sc?(sc.tagName+'.'+(sc.className||'').toString().slice(0,40)+' h='+sc.scrollHeight):'window h='+de.scrollHeight)+' y='+(sc?sc.scrollTop:scrollY)+' skipRoots='+skipRoots().length+' vals='+valLeaves().length+'\nfirst: '+offers.slice(0,4).map(function(o){return o.merchant+' / '+(o.amount||o.pct||o.note||'');}).join(' | ')+'\nlast: '+offers.slice(-3).map(function(o){return o.merchant;}).join(' | ');(navigator.clipboard?navigator.clipboard.writeText(d):Promise.reject()).then(function(){dbgb.textContent='Copied. Send it to whoever shared Card Playbook with you.';}).catch(function(){var ta=document.createElement('textarea');ta.value=d;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();dbgb.textContent='Copied. Send it to whoever shared Card Playbook with you.';});};
  box.querySelector('#cpc').onclick=function(){
    var done=function(){box.querySelector('#cpm').textContent='Copied. Now open Card Playbook → Offers → Paste offers.';box.querySelector('#cpc').textContent='Copied ✓';};
    (navigator.clipboard?navigator.clipboard.writeText(c):Promise.reject()).then(done).catch(function(){var ta=document.createElement('textarea');ta.value=c;ta.setAttribute('style','position:fixed;top:0;left:0;opacity:0');document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');done();}catch(e){}ta.remove();});
  };
}
(async function(){
  ui('Loading your '+NAMES[ISS]+' offers…');
  var r=await collectAll();
  if(!r.offers.length){ui('No offers found on this page. Make sure the offers list is showing, then tap the bookmark again. Still nothing? Tap the button and send the result to whoever shared Card Playbook with you so the bookmark can be fixed for this page.',btn('Copy troubleshooting details','cpd',1));box.querySelector('#cpd').onclick=function(){var v=valLeaves()[0]||deepAll(document.body).filter(function(e){return /cash back|% back|\$\d/.test(e.textContent||'')&&e.children.length<3;})[0];var t=v?(tileOfVal(v)||up(up(up(v)))):null;var h=t?t.outerHTML:'(no offer text found) '+deepAll(document.body).slice(0,400).map(function(e){return e.tagName.toLowerCase()+(e.shadowRoot?'#shadow':'');}).join(' ');h=h.replace(/<(svg|img|picture|source)[^>]*>[\s\S]*?<\/\1>|<img[^>]*>/gi,'<$1/>').replace(/\s(src|srcset|style|d)="[^"]*"/gi,'').slice(0,6000);var dbg='CPDBG '+location.hostname+location.pathname+' shadowHosts='+deepAll(document.body).filter(function(e){return e.shadowRoot;}).length+' vals='+valLeaves().length+'\n'+h;(navigator.clipboard?navigator.clipboard.writeText(dbg):Promise.reject()).then(function(){box.querySelector('#cpm').textContent='Copied. Send it to whoever shared Card Playbook with you.';}).catch(function(){var ta=document.createElement('textarea');ta.value=dbg;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();box.querySelector('#cpm').textContent='Copied. Send it to whoever shared Card Playbook with you.';});};return;}
  finish(r.offers,0,r.target);
})();
})();
