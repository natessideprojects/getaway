import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { addDays,filterOffers,validate } from './search.mjs';
import { createProviders } from './providers.mjs';
const fixture=JSON.parse(readFileSync(new URL('../public/demo.json',import.meta.url)));
const reasons={quota:'search limit reached','local-quota':'local search limit reached', 'invalid-key':'API key rejected',timeout:'request timed out','provider-error':'provider error','currency-unverified':'currency could not be verified for your selection (Amadeus commonly returns EUR; try EUR)'};
export function createEngine({env=process.env,fetcher=fetch,storage=null,clock=()=>new Date()}={}) {
 const providers=createProviders(env,fetcher),cache=new Map(),pending=new Map(); let ledger={};
 if(storage&&existsSync(storage)) { try {ledger=JSON.parse(readFileSync(storage,'utf8'));} catch {throw Error('Quota ledger is unreadable. Restore it before making provider calls.');} }
 function usage() {const month=clock().toISOString().slice(0,7);return providers.map(p=>({name:p.name,configured:p.configured,scope:storage?'installation':'instance',used:ledger[month]?.[p.name]||0,exhausted:!!ledger[month]?.[p.name+':exhausted'],limit:Number.isFinite(p.limit)&&p.limit>=0?Math.floor(p.limit):0}));}
 function reserve(name) { const p=usage().find(p=>p.name===name);if(p.exhausted||p.used>=p.limit) return false; const month=clock().toISOString().slice(0,7);ledger[month]??={};ledger[month][name]=p.used+1;if(storage){mkdirSync(new URL('.',storage),{recursive:true});writeFileSync(storage,JSON.stringify(ledger));} return true; }
 async function execute(s) {
  const notes=[],attempts=[]; const configured=providers.filter(p=>p.configured);const deadline=Date.now()+42000;
  if(s.mode==='demo'||configured.length===0) {
   const offers=fixture.filter(x=>x.destination!==s.origin).map(x=>({...x,departure:addDays(s.today,x.offset),returnDate:s.trip==='round'?addDays(s.today,x.offset+x.stay):null,trip:s.trip,currency:s.currency,generic:true}));
   return {offers:filterOffers(offers,s),source:'DEMO · fictional fares',kind:'demo',checkedAt:null,notes:[configured.length?'Demo selected. No provider requests made.':'No API keys configured. Demo mode uses fictional fares and relative dates; no live availability.'],attempts};
  }
  for(const p of providers) {
   if(!p.configured) {notes.push(p.name+': not configured.');continue;}
   const current=usage().find(x=>x.name===p.name);
   if(current.exhausted||current.used>=current.limit) {notes.push(p.name+': local search limit reached; trying the next configured provider.');attempts.push({provider:p.name,status:'local-quota',discoveryRequests:0});continue;}
   let requests=0;
   const beforeRequest=()=>{if(Date.now()>deadline)throw Object.assign(Error('Search time budget reached'),{code:'timeout'});if(!reserve(p.name))throw Object.assign(Error('Local quota reached'),{code:'local-quota'});requests++;};
   try {
    const result=await p.search(s,{beforeRequest}); const offers=filterOffers(result.offers,s);
    for(const code of result.warnings||[]){notes.push(p.name+': '+(reasons[code]||'provider error')+'; displaying partial results from completed requests.');if(code==='quota'){const month=clock().toISOString().slice(0,7);ledger[month][p.name+':exhausted']=true;if(storage)writeFileSync(storage,JSON.stringify(ledger));}}
    attempts.push({provider:p.name,status:result.warnings?.length?'partial':'ok',discoveryRequests:requests,fields:result.fields,returned:result.offers.length,matching:offers.length,excluded:result.offers.length-offers.length});
    if(offers.length) {const returned=attempts.reduce((sum,a)=>sum+(a.returned||0),0);return {...result,offers,audit:{returned,matching:offers.length,excluded:returned-offers.length,locallyTruncated:0},notes:[...notes,...result.notes],attempts};}
    notes.push(p.name+': no matching deals returned; trying the next configured provider.');
   } catch(e) {
    const code=e.code||'provider-error'; attempts.push({provider:p.name,status:code,discoveryRequests:requests});
    if(code==='quota') { const month=clock().toISOString().slice(0,7); ledger[month]??={};ledger[month][p.name+':exhausted']=true;if(storage)writeFileSync(storage,JSON.stringify(ledger)); }
    notes.push(p.name+': '+(reasons[code]||'provider error')+'; trying the next configured provider.');
   }
  }
  const returned=attempts.reduce((sum,a)=>sum+(a.returned||0),0),hasResponse=attempts.some(a=>['ok','partial'].includes(a.status));
  return {offers:[],source:hasResponse?'No matching provider deals':'Providers unavailable',kind:hasResponse?'empty':'unavailable',audit:{returned,matching:0,excluded:returned,locallyTruncated:0},checkedAt:null,notes:[...notes,'No matching deals returned. This does not mean no flights exist. Demo data is available only by selecting Demo mode.'],attempts};
 }
 return {usage,async search(input) {
  const s=validate(input,clock());const key=JSON.stringify(s);let result;let cached=false;
  if(cache.has(key)&&cache.get(key).until>clock().getTime()) {result=cache.get(key).result;cached=true;}
  else {if(!pending.has(key)) pending.set(key,execute(s).then(r=>{if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{result:r,until:clock().getTime()+(r.kind==='unavailable'?30000:900000)});return r;}).finally(()=>pending.delete(key)));result=await pending.get(key);}
  return {...result,search:s,cached,usage:usage(),cacheTtlSeconds:result.kind==='unavailable'?30:900};
 }};
}
