// Builds the phone version from a Card Playbook artifact document.
// Usage: node tools/build.mjs <artifact.html>
// Writes index.html (app code only, no personal data) and, when pubkey.json exists,
// data.enc.json (your data, encrypted to the phone's public key).
import fs from 'fs';
import path from 'path';
import { webcrypto as wc } from 'crypto';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const src = fs.readFileSync(process.argv[2], 'utf8');

function block(re, name) {
  const m = src.match(re);
  if (!m) throw new Error('Missing ' + name + ' in artifact document');
  return m[1];
}
const css = block(/<style id="css">([\s\S]*?)<\/style>/, 'css');
const state = block(/<script id="state" type="application\/json">([\s\S]*?)<\/script>/, 'state');
const transfers = block(/<script id="transfers" type="application\/json">([\s\S]*?)<\/script>/, 'transfers');
const inboxM = src.match(/<script id="inbox" type="application\/json">([\s\S]*?)<\/script>/);
const emailM = src.match(/<script id="emailoffers" type="application\/json">([\s\S]*?)<\/script>/);
// main is the last script: everything up to the final </script> before </body>
const mi = src.indexOf('<script id="main">');
if (mi < 0) throw new Error('Missing main script');
const me = src.lastIndexOf('</script>');
let main = src.slice(mi + '<script id="main">'.length, me);
if (!/var MODE = 'artifact';/.test(main) && !/var MODE = 'local';/.test(main)) throw new Error('MODE line not found');
main = main.replace("var MODE = 'artifact';", "var MODE = 'local';");
JSON.parse(state); JSON.parse(transfers);
// Personal Insights code holds the owner's financial details: keep it out of public files.
// It moves into the encrypted data file and is stitched back in on the paired phone.
let PRIV = '';
{
  const a = main.indexOf('\nfunction planDiagram('), b = main.indexOf('\n// ---- Card faces');
  if (a > 0 && b > a) { PRIV = main.slice(a, b); main = main.slice(0, a) + '\n/*__PRIV__*/\n' + main.slice(b); }
  else console.warn('Insights block not found; nothing stripped');
}

const boot = fs.readFileSync(path.join(root, 'tools/boot.js'), 'utf8');
const esc = s => s.replace(/<\/script/gi, '<\\/script');
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#06100c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Card Playbook">
<meta name="robots" content="noindex">
<link rel="apple-touch-icon" href="icon-180.png">
<link rel="icon" href="icon-180.png">
<title>Card Playbook</title>
<style id="css">${css}</style>
</head>
<body>
<div class="wrap" id="app"></div>
<div class="toast" id="toast"></div>
<script id="state" type="application/json">{}</script>
<script id="transfers" type="application/json">${transfers}</script>
<script id="inbox" type="application/json">{"asOf":"","updates":[]}</script>
<script id="emailoffers" type="application/json">{"asOf":"","items":[]}</script>
<script id="carddb" type="application/json">${esc(fs.readFileSync(path.join(root, 'app/cards.json'), 'utf8'))}</script>
<script id="main" type="text/plain">${esc(main)}</script>
<script id="boot">${boot}</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'index.html'), html);
console.log('index.html', html.length, 'bytes');


// ---- Public app (app/index.html): anyone can use it with their own cards; no personal data ----
{
  let pm = main.replace('/*__PRIV__*/', "function viewSuggestions(){ return ''; }");
  const rep = [
    ["var MODE = 'local';", "var MODE = 'local'; var PUBLIC = true;"],
    ["var LS_KEY = 'cardplaybook-v1';", "var LS_KEY = 'cardplaybook-pub-v1';"],
    ["var OPENED = {vx:'2026-05-18'};", "var OPENED = {};"],
    ["+foundersSection();", "+(fcOn()?foundersSection():'');"],
    ["if (FC_TIP[cat])", "if (fcOn() && FC_TIP[cat])"],
    ["'<nav class=\"tabbar\">'+GROUPS.map(", "'<nav class=\"tabbar\">'+GROUPS.filter(navGroupOn).map("],
    ["h+=inboxCard()+", "h+=gmailCard()+"],
    ["var other = MODE==='local' ? 'the version in Claude' : 'your phone version';", "var other = 'another phone or browser';"],
    [" Searches work in the Claude version of this app; here the button opens Googl", " The button opens Googl"],
    ["' Import from the Claude version to get the latest.'", "' New data arrives with app updates.'"],
    ["If the Claude app covers the bottom of your screen", "If something covers the bottom of your screen"],
    ["h+=offerPasteBlock()+", "h+=(!(S.offers||[]).length?offersTutorial():'')+offerPasteBlock()+"],
    ["From purchase alert emails, every evening.", "From your card alert emails when you tap Sync Gmail in Settings."],
  ];
  for (const [a, b] of rep) {
    if (!pm.includes(a)) { console.warn('public patch skipped (not found): ' + a.slice(0, 60)); continue; }
    pm = pm.split(a).join(b);
  }
  const anchor = '\nrender();\nif (restoreY)';
  if (!pm.includes(anchor)) throw new Error('render anchor not found for public module');
  const pmod = fs.readFileSync(path.join(root, 'tools/public-module.js'), 'utf8'); pm = pm.replace(anchor, () => '\n' + pmod + anchor);
  const pcss = css + '\n' + fs.readFileSync(path.join(root, 'tools/public.css'), 'utf8');
  const cards = fs.readFileSync(path.join(root, 'app/cards.json'), 'utf8');
  const cfgPath = path.join(root, 'app/config.json');
  const cfg = fs.existsSync(cfgPath) ? fs.readFileSync(cfgPath, 'utf8') : '{"googleClientId":""}';
  const pboot = fs.readFileSync(path.join(root, 'tools/public-boot.js'), 'utf8');
  const phtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#06100c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Card Playbook">
<meta name="description" content="Pick your credit cards and see which one to use for every purchase.">
<link rel="apple-touch-icon" href="../icon-180.png">
<link rel="icon" href="../icon-180.png">
<link rel="manifest" href="manifest.webmanifest">
<title>Card Playbook</title>
<style id="css">${pcss}</style>
</head>
<body>
<div class="wrap" id="app"></div>
<div class="toast" id="toast"></div>
<script id="state" type="application/json">{}</script>
<script id="transfers" type="application/json">${transfers}</script>
<script id="inbox" type="application/json">{"asOf":"","updates":[]}</script>
<script id="emailoffers" type="application/json">{"asOf":"","items":[]}</script>
<script id="carddb" type="application/json">${esc(cards)}</script>
<script id="cfg" type="application/json">${esc(cfg)}</script>
<script id="main" type="text/plain">${esc(pm)}</script>
<script id="boot">${pboot}</script>
</body>
</html>
`;
  fs.mkdirSync(path.join(root, 'app'), { recursive: true });
  fs.writeFileSync(path.join(root, 'app/index.html'), phtml);
  console.log('app/index.html', phtml.length, 'bytes');
}


// ---- Grab offers bookmark install page (offers.html) ----
{
  const grab = fs.readFileSync(path.join(root, 'tools/grab.js'), 'utf8').replace(/^\s+/gm, '').replace(/\n+/g, '\n');
  const href = 'javascript:' + encodeURIComponent(grab);
  const page = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Get your card offers · Card Playbook</title><link rel="icon" href="icon-180.png"><link rel="apple-touch-icon" href="icon-180.png">
<style>
body{margin:0;background:#040a07;color:#eef3ef;font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.w{max-width:560px;margin:0 auto;padding:22px 16px 60px}h1{font-family:Georgia,serif;font-weight:600;font-size:32px;margin:0 0 6px}
.sub{color:#aebfb7;margin:0 0 18px}.c{background:linear-gradient(165deg,#13211b,#0a110e);border:1px solid rgba(110,231,183,.22);border-radius:18px;padding:16px;margin-bottom:14px}
h2{display:flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#c4d6cd;margin:0 0 10px}
h2 i{font-style:normal;flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#f1d79a,#b8913f);color:#0b1a14;font-size:13px;letter-spacing:0}
h3{font-size:15px;margin:14px 0 4px;color:#fff}ol,ul{margin:0;padding-left:20px}li{margin:6px 0}b{color:#fff}
.btn{display:block;width:100%;box-sizing:border-box;text-align:center;font:inherit;font-weight:700;padding:13px;border-radius:12px;border:0;background:linear-gradient(135deg,#34d399,#059669);color:#fff;text-decoration:none;margin:12px 0 4px;cursor:pointer}
.drag{background:none;border:2px dashed #34d399;color:#a7f3d0}.hint{color:#9fb3aa;font-size:14px}
.tag{display:inline-block;font-size:12px;font-weight:700;padding:2px 8px;border-radius:99px;background:rgba(52,211,153,.15);color:#9ff5d0;margin-right:6px}
textarea{width:100%;box-sizing:border-box;height:64px;background:#050b08;color:#9fb3aa;border:1px solid rgba(110,231,183,.26);border-radius:10px;font:12px ui-monospace,monospace;padding:8px}
details{margin-top:8px}summary{cursor:pointer;font-weight:600;color:#a7f3d0}
</style></head><body><div class="w">
<h1>Get your card offers</h1>
<p class="sub">Card Playbook can pull in every Amex, Chase and Capital One offer, plus Rakuten and Rove store rates, with one tap of a bookmark. It only <b>reads</b> the offers page you have open: it doesn't add offers, change your account, or send your info anywhere. Set it up once (about 2 minutes), then use it whenever you want fresh offers.</p>

<div class="c"><h2><i>1</i>Install the bookmark</h2>
<h3>On iPhone or iPad (Safari)</h3><ol>
<li>Tap <b>Copy bookmark code</b>.</li>
<li>Bookmark this page: tap <b>Share</b> (the square with an arrow) → <b>Add Bookmark</b> → <b>Save</b>.</li>
<li>Tap the <b>book icon</b> → <b>Edit</b> (bottom right) → tap the bookmark you just saved.</li>
<li>Change the name to <b>Grab offers</b>.</li>
<li>Tap the address under the name, delete it all, and <b>paste</b> the code. Tap <b>Done</b>.</li>
</ol>
<button class="btn" id="copy">Copy bookmark code</button><textarea id="code" readonly></textarea>
<h3>On a computer (Chrome, Safari, Edge)</h3><p class="hint" style="margin:0">Show your bookmarks bar, then drag this button onto it:</p><a class="btn drag" id="drag">Grab offers</a>
</div>

<div class="c"><h2><i>2</i>Open your offers page</h2>
<p class="hint" style="margin:0 0 8px">Use your bank's <b>website in Safari or Chrome</b>, not its app (bookmarks can't run inside bank apps). Sign in, then:</p>
<p><span class="tag">Amex</span>Menu → <b>Offers</b>. Pick the card at the top if you have more than one. The bookmark skips the "Added to Card" row and reads the full list below it.</p>
<p><span class="tag">Chase</span>Choose the card, then open <b>Chase Offers</b> (under the card's rewards, or "See all offers"). The page shows something like "148 results."</p>
<p><span class="tag">Capital One</span>Open <b>Offers</b> from your card (it opens capitaloneoffers.com).</p>
<p><span class="tag">Rakuten</span>Open rakuten.com in Safari and go to <b>Double Cash Back</b> (or any store list). The bookmark reads each store's rate and flags boosted ones (the ones showing "was").</p>
<p><span class="tag">Rove</span>Open rovemiles.com in Safari and go to the <b>shopping</b> page with stores and miles per $. Same thing: it reads the rates, nothing else.</p>
<p class="hint">Citi, Bank of America, U.S. Bank and Wells Fargo offer pages may work too.</p>
</div>

<div class="c"><h2><i>3</i>Tap the bookmark</h2><ol>
<li>With the offers page open, tap <b>Grab offers</b> (iPhone: book icon → Grab offers).</li>
<li>A small panel appears and the page scrolls by itself: <b>"Reading offers… 57 of 148."</b> Don't touch the page for 20 to 40 seconds.</li>
<li>When it says <b>"Found 148 Chase offers,"</b> tap <b>Copy for Card Playbook</b>.</li>
</ol></div>

<div class="c"><h2><i>4</i>Paste into Card Playbook</h2><ol>
<li>Open Card Playbook → <b>Offers</b> tab → <b>Paste offers from your bank</b>.</li>
<li>Check the card it picked under <b>"These are for,"</b> then tap <b>Import offers</b>.</li>
</ol><p class="hint">This replaces that card's offer list, so expired offers drop off. Offers you marked "Used" stay that way. Do one card at a time: grab, paste, repeat for the next card.</p></div>

<div class="c"><h2><i>?</i>Tips and fixes</h2><ul>
<li><b>How often:</b> about once a week per card, or before a big purchase.</li>
<li><b>"No offers found":</b> make sure the offers list is on screen and you're signed in, then tap the bookmark again.</li>
<li><b>Paste does nothing:</b> a box appears instead. Long-press it, tap <b>Paste</b>, then <b>Read code</b>.</li>
<li><b>Count looks wrong:</b> tap <b>"Something off? Copy troubleshooting details"</b> on the panel and send it to whoever shared Card Playbook with you.</li>
<li><b>Stopped working after a while:</b> banks redesign their sites. Come back here, copy the code again, and paste it over your bookmark's address to get the latest version.</li>
</ul>
<details><summary>Is this safe?</summary><p class="hint">The bookmark runs only on the page you're looking at, only when you tap it, and only reads the offers shown there. It can't see your password, doesn't click anything on your account, and the offers list goes only to your clipboard. You paste it into Card Playbook yourself, and it stays on your phone.</p></details>
</div>
</div><script>
var href=${JSON.stringify(href)};
document.getElementById('code').value=href;document.getElementById('drag').href=href;
document.getElementById('copy').onclick=function(){var b=this,ta=document.getElementById('code');(navigator.clipboard?navigator.clipboard.writeText(href):Promise.reject()).then(function(){b.textContent='Copied ✓';}).catch(function(){ta.focus();ta.select();document.execCommand('copy');b.textContent='Copied ✓';});};
</script></body></html>
`;
  fs.writeFileSync(path.join(root, 'offers.html'), page);
  console.log('offers.html', page.length, 'bytes');
}

const pkPath = path.join(root, 'pubkey.json');
if (!fs.existsSync(pkPath)) { console.log('No pubkey.json yet: skipped data.enc.json'); process.exit(0); }
const jwk = JSON.parse(fs.readFileSync(pkPath, 'utf8'));
const pub = await wc.subtle.importKey('jwk', { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RSA-OAEP-256', ext: true }, { name: 'RSA-OAEP', hash: 'SHA-256' }, false, ['encrypt']);
const payload = JSON.stringify({
  at: new Date().toISOString(),
  state: JSON.parse(state),
  transfers: JSON.parse(transfers),
  inbox: inboxM ? JSON.parse(inboxM[1]) : null,
  emailoffers: emailM ? JSON.parse(emailM[1]) : null,
  priv: PRIV,
});
const aes = await wc.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
const raw = await wc.subtle.exportKey('raw', aes);
const wrapped = await wc.subtle.encrypt({ name: 'RSA-OAEP' }, pub, raw);
const iv = wc.getRandomValues(new Uint8Array(12));
const ct = await wc.subtle.encrypt({ name: 'AES-GCM', iv }, aes, new TextEncoder().encode(payload));
const b64u = b => Buffer.from(b).toString('base64url');
fs.writeFileSync(path.join(root, 'data.enc.json'), JSON.stringify({ v: 1, alg: 'RSA-OAEP-256+A256GCM', key: b64u(wrapped), iv: b64u(iv), ct: b64u(ct) }));
console.log('data.enc.json', payload.length, 'bytes of data encrypted');
