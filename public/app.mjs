import { airports } from './airports.mjs';
import { carriers } from './carriers.mjs';
const $=id=>document.getElementById(id), form=$('search-form');let response=null,installPrompt=null;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',timeZone:'UTC'}).format(new Date(v.slice(0,10)+'T12:00Z')):'Not supplied';
const time=v=>v?.includes('T')?' · '+v.slice(11,16)+' origin time':'';
$('airports').innerHTML=airports.map(a=>`<option value="${a.code}">${esc(a.city+' · '+a.name+' · '+a.country)}</option>`).join('');
$('carriers').innerHTML=carriers.map(c=>`<option value="${c.code}">${esc(c.name)}</option>`).join('');
function originInfo(){const code=$('origin').value.trim().toUpperCase(),a=airports.find(a=>a.code===code);$('airport-label').textContent=a?`${a.city} · ${a.name}`:'Manual IATA code · enter timezone below';$('timezone-row').hidden=!!a;$('timezone').required=!a;if(a) $('timezone').value=a.timezone;updateDates();}
function updateDates(){try{const zone=airports.find(a=>a.code===$('origin').value.toUpperCase())?.timezone||$('timezone').value;const now=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const end=new Date(now+'T12:00Z');end.setUTCDate(end.getUTCDate()+90);for(const id of ['start','end']){$(id).min=now;$(id).max=end.toISOString().slice(0,10);if(!$(id).value)$(id).value=id==='start'?now:end.toISOString().slice(0,10);}}catch{}}
$('origin').addEventListener('input',originInfo);$('timezone').addEventListener('change',updateDates);originInfo();
$('when').addEventListener('change',()=>{$('custom').hidden=$('when').value!=='custom';$('start').required=$('end').required=!$('custom').hidden;});
$('currency').addEventListener('change',()=>{$('symbol').textContent=$('currency').value==='USD'?'$':'€';});
function connection(){const online=navigator.onLine;$('connection').textContent=online?'● ONLINE':'● OFFLINE';$('offline').hidden=online;$('search-button').disabled=!online;}
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
function usage(list){$('providers').innerHTML=list.map(p=>`<div class="provider"><strong>${esc(p.name)}</strong>${p.configured?`${p.used} / ${p.limit} ${esc(p.scope||'local')} attempts · ${p.exhausted?'Provider search limit reached':Math.max(0,p.limit-p.used)+' remaining on this server'}`:'Key not configured'}</div>`).join('');$('source-summary').textContent=list.filter(p=>p.configured).map(p=>`${p.name} ${p.exhausted?'search limit reached':Math.max(0,p.limit-p.used)+'/'+p.limit+' '+(p.scope||'local')+' remaining'}`).join(' · ')||'No API keys · demo available';}
function render(){if(!response)return;const data=[...response.offers],sort=$('sort').value;const number=v=>typeof v==='number'?v:Infinity;if(sort==='duration')data.sort((a,b)=>number(a.duration)-number(b.duration));if(sort==='departure')data.sort((a,b)=>(a.departure||'9999').localeCompare(b.departure||'9999'));$('result-count').textContent=`${data.length} ${data.length===1?'getaway':'getaways'}`;
 $('results').innerHTML=data.length?data.map(o=>{const a=airports.find(a=>a.code===o.destination),city=o.city||a?.city||o.destination,country=o.country||a?.country||'Destination';const price=new Intl.NumberFormat('en-US',{style:'currency',currency:o.currency,maximumFractionDigits:2}).format(o.price);return `<article class="flight"><div class="destination"><span class="airport-code">${esc(o.destination?.length===3?o.destination:'↗')}</span><div><span class="city">${esc(city)}</span><span class="sub">${esc(country)}</span></div></div><div class="dates">${esc(date(o.departure)+time(o.departure))}<span class="sub">${o.trip==='round'?'↳ '+esc(date(o.returnDate)+time(o.returnDate)):'One way'}</span></div><div class="airline">${esc(o.airline||'Not supplied')}<span class="sub">${esc(o.kind==='demo'?'DEMO FLIGHT':o.provider||'Provider')}</span></div><div class="journey">${typeof o.duration==='number'?`${Math.floor(o.duration/60)}h ${o.duration%60}m`:'Duration not supplied'}<span class="sub">${typeof o.stops==='number'?o.stops===0?'Nonstop':o.stops+' stop'+(o.stops===1?'':'s'):'Stops not supplied'}</span></div><div class="fare">${esc(price)}<span class="sub">${esc(o.currency)} · ${o.trip==='round'?'ROUND TRIP':'ONE WAY'}</span></div><details><summary>Details ↗</summary><p>${esc(o.kind==='demo'?'Fictional demo fare.':(o.source||response.source)+' · Indicative price.')} ${o.checkedAt?'Retrieved '+esc(o.checkedAt)+'.':''} Times shown only where supplied. Layover airports and lengths are not supplied by these discovery results.</p><p>Verify final fare, taxes, fees and availability on the booking site.</p><a class="external" href="${esc(o.url)}" target="_blank" rel="noopener noreferrer">${o.generic?'Open generic flight search':'View provider flight search'} ↗</a></details></article>`;}).join(''):'<div class="empty">NO MATCHING DEALS RETURNED<br>Try a wider departure window or a different airport.<br>This does not mean no flights exist.</div>';
}
async function search(){
 if(!navigator.onLine)return connection();
 const button=$('search-button');button.disabled=true;button.textContent='Searching departures…';
 $('notice').classList.remove('error');
 $('notice').textContent=$('mode').value==='demo'?'Loading fictional demo fares.':'Checking selected providers once each. Both providers combines their matching offers; identical searches use the short-lived cache.';
 $('retrieval-summary').textContent='Checking provider results…';
 $('results').innerHTML='<div class="empty">CHECKING THE DEPARTURE BOARD…</div>';
 try{
  const params=new URLSearchParams(new FormData(form));params.set('origin',$('origin').value.trim().toUpperCase());
  const r=await fetch('/api/explore?'+params,{signal:AbortSignal.timeout(60000)});const d=await r.json();
  if(!r.ok)throw Error(d.error||'Search unavailable.');response=d;
  $('route').textContent='from '+d.search.origin;$('sort').value='price';
  const problems=d.attempts.filter(a=>a.status!=='ok').map(a=>a.provider+': '+a.status.replaceAll('-',' ')).join(' · ');
  const notice=d.kind==='demo'?d.notes.join(' '):`Indicative fares from the selected sources. ${d.search.carrier?'Requested carrier '+d.search.carrier+'. ':''}${problems}${d.cached?' · From server cache; no new provider requests.':''}`;
  $('notice').innerHTML=`<strong>${esc(d.source.toUpperCase())}</strong> &nbsp; ${esc(notice)}`;
  $('notice').classList.toggle('error',d.kind==='unavailable');
  $('board-status').textContent=d.kind==='demo'?'DEMO DATA · FICTIONAL FARES':`INDICATIVE FARES · ${d.cached?'CACHED':'RETRIEVED'}`;
  const providers=d.attempts.map(a=>`${a.provider}: ${a.status==='ok'?a.matching+' matches / '+a.returned+' returned':a.status}`).join(' · ');
  $('retrieval-summary').textContent=d.audit?`${d.audit.returned} provider offers retrieved · ${d.audit.matching} match dates, trip, currency, budget and carrier · ${d.audit.excluded} excluded · no local result cutoff. ${providers}. Discovery is not exhaustive.`:d.kind==='demo'?'Fictional demo offers, filtered to your search. No live inventory.':'No matching provider results. This does not mean no flights exist.';
  $('coverage').textContent=`Departure range ${d.search.start} – ${d.search.end} (${d.search.timezone}). Returns no later than ${d.search.horizon}. ${d.notes.join(' ')} Cache TTL ${d.cacheTtlSeconds/60} minutes. USD and EUR are never compared. Retrieved ${d.checkedAt||'no provider fares checked'}.`;
  usage(d.usage);render();
 }catch(e){response=null;$('notice').textContent=e.name==='TimeoutError'?'Search timed out. Please try again.':e.message;$('notice').classList.add('error');$('results').innerHTML='<div class="empty">SEARCH UNAVAILABLE<br>Check your connection and search settings.</div>';$('retrieval-summary').textContent='Search did not complete.';$('result-count').textContent='— getaways';$('board-status').textContent='SEARCH UNAVAILABLE';}
 finally{button.disabled=!navigator.onLine;button.innerHTML='Find getaways <span>↗</span>';}
}
form.addEventListener('submit',e=>{e.preventDefault();search();});$('sort').addEventListener('change',render);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('install').hidden=false;});$('install').addEventListener('click',async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;$('install').hidden=true;}});
function tick(){$('clock').textContent=new Intl.DateTimeFormat('en-US',{month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date()).toUpperCase();}tick();setInterval(tick,30000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{$('pwa-status').textContent='PWA: service worker active; offline app shell ready. Searches require internet. Install with Chrome/Edge’s Install app menu or iPhone Safari’s Add to Home Screen.';}).catch(()=>{$('pwa-status').textContent='PWA offline shell unavailable. Use localhost or HTTPS in a supported browser.';});else $('pwa-status').textContent='PWA service workers are unsupported in this browser.';
// Loading the app never spends live-provider quota.
fetch('/api/status').then(r=>r.json()).then(d=>{usage(d.usage);if(!d.usage.some(p=>p.configured))search();else{$('notice').textContent='Providers ready. Choose your departure window and search to check fares.';$('results').innerHTML='<div class="empty">WHERE WILL YOU GO NEXT?<br>Choose an airport and find your getaway.</div>';}}).catch(()=>{$('notice').textContent='Server unavailable. Flight searches need an internet connection.';});
