import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {addDays,filterOffers,validate} from './search.mjs';
import {createProviders} from './providers.mjs';
const fixture=JSON.parse(readFileSync(new URL('../public/demo.json',import.meta.url)));
const reasons={quota:'search limit reached','local-quota':'server search limit reached','invalid-key':'API key rejected',timeout:'request timed out','provider-error':'provider error','currency-unverified':'returned currency could not be verified'};
export function createEngine({env=process.env,fetcher=fetch,storage=null,clock=()=>new Date()}={}){
 const providers=createProviders(env,fetcher),cache=new Map(),pending=new Map();let ledger={};
 if(storage&&existsSync(storage)){try{ledger=JSON.parse(readFileSync(storage,'utf8'));}catch{throw Error('Quota ledger is unreadable. Restore it before making provider calls.');}}
 const month=()=>clock().toISOString().slice(0,7);
 function save(){if(storage){mkdirSync(new URL('.',storage),{recursive:true});writeFileSync(storage,JSON.stringify(ledger));}}
 function usage(){return providers.map(p=>({name:p.name,id:p.id,configured:p.configured,scope:storage?'installation':'instance',used:ledger[month()]?.[p.name]||0,exhausted:!!ledger[month()]?.[p.name+':exhausted'],limit:Number.isFinite(p.limit)&&p.limit>=0?Math.floor(p.limit):0}));}
 function reserve(name){const p=usage().find(x=>x.name===name);if(p.exhausted||p.used>=p.limit)return false;ledger[month()]??={};ledger[month()][name]=p.used+1;save();return true;}
 async function execute(s){
  const notes=[],attempts=[],offers=[],sources=[],timestamps=[];
  if(s.mode==='demo'||(s.mode==='auto'&&!providers.some(p=>p.configured))){
   const demo=fixture.filter(x=>x.destination!==s.origin).map(x=>({...x,departure:addDays(s.today,x.offset),returnDate:s.trip==='round'?addDays(s.today,x.offset+x.stay):null,trip:s.trip,currency:s.currency,generic:true,provider:'Demo',kind:'demo'}));
   return {offers:filterOffers(demo,s),source:'DEMO · fictional fares',kind:'demo',checkedAt:null,notes:['Fictional demo fares; no provider requests or live availability.'],attempts};
  }
  const selected=providers.filter(p=>s.mode==='auto'||s.mode===p.id);
  for(const p of selected){
   if(!p.configured){notes.push(p.name+': key not configured.');attempts.push({provider:p.name,status:'not-configured',discoveryRequests:0,returned:0,matching:0});continue;}
   let requests=0;
   const beforeRequest=()=>{if(!reserve(p.name))throw Object.assign(Error('Quota reached'),{code:'local-quota'});requests++;};
   try{
    const result=await p.search(s,{beforeRequest});
    const matches=filterOffers(result.offers,s).map(o=>({...o,provider:p.name,source:result.source,kind:result.kind,checkedAt:result.checkedAt}));
    offers.push(...matches);sources.push(p.name);timestamps.push(result.checkedAt);
    attempts.push({provider:p.name,status:'ok',discoveryRequests:requests,fields:result.fields,returned:result.offers.length,matching:matches.length,excluded:result.offers.length-matches.length});
    notes.push(...result.notes);
   }catch(e){
    const code=e.code||'provider-error';attempts.push({provider:p.name,status:code,discoveryRequests:requests,returned:0,matching:0});
    if(code==='quota'){ledger[month()]??={};ledger[month()][p.name+':exhausted']=true;save();}
    notes.push(p.name+': '+(reasons[code]||'provider error')+'. Other selected providers are still considered.');
   }
  }
  offers.sort((a,b)=>a.price-b.price);
  const returned=attempts.reduce((sum,a)=>sum+(a.returned||0),0),hasResponse=sources.length>0;
  if(s.carrier)notes.push('Carrier choices are common airline codes, not a verified route list for this airport. A reported carrier match does not establish who operates every connecting segment.');
  if(!offers.length)notes.push('No matching deals returned. This does not mean no flights exist.');
  return {offers,source:sources.length?sources.join(' + '):'Providers unavailable',kind:offers.length?(sources.length>1?'combined':offers[0].kind):hasResponse?'empty':'unavailable',audit:{returned,matching:offers.length,excluded:returned-offers.length,locallyTruncated:0},checkedAt:timestamps.filter(Boolean).sort()[0]||null,notes,attempts};
 }
 return {usage,async search(input){
  const s=validate(input,clock()),key=JSON.stringify(s);let result,cached=false;
  if(cache.has(key)&&cache.get(key).until>clock().getTime()){result=cache.get(key).result;cached=true;}
  else{if(!pending.has(key))pending.set(key,execute(s).then(r=>{if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{result:r,until:clock().getTime()+(r.kind==='unavailable'?30000:900000)});return r;}).finally(()=>pending.delete(key)));result=await pending.get(key);}
  return {...result,search:s,cached,usage:usage(),cacheTtlSeconds:result.kind==='unavailable'?30:900};
 }};
}
