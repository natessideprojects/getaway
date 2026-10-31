import {departureDates} from '../public/search-plan.mjs';
import {addDays} from './search.mjs';
const hardErrors=new Set(['quota','local-quota','invalid-key']);
export function createDatedSearch(request){
 const cache=new Map(),pending=new Map();
 return async function search(s,params,beforeRequest){
  const dates=departureDates(s),completed=[],failed=[],errors=[],rows=[],times=[];
  if(!dates.length)return {rows,checkedAt:null,errors,dateCoverage:{planned:[],completed,failed,sampled:false},notes:['No departure dates fit the selected stay within the 90-day return horizon. Shorten the stay or departure range.']};
  async function one(date){
   const query={...params,outbound_date:date};if(s.trip==='round')query.return_date=addDays(date,s.stay);
   const key=JSON.stringify(query);let data;
   if(cache.get(key)?.until>Date.now())data=cache.get(key).data;
   else{
    if(!pending.has(key))pending.set(key,(async()=>{beforeRequest();const d=await request(query);if(d.search_parameters?.currency!==s.currency)throw Object.assign(Error('currency-unverified'),{code:'currency-unverified'});const result={rows:Array.isArray(d.destinations)?d.destinations:[],checkedAt:d.search_metadata?.created_at||new Date().toISOString()};if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{data:result,until:Date.now()+900000});return result;})().finally(()=>pending.delete(key)));
    data=await pending.get(key);
   }
   return {date,...data};
  }
  // Validate credentials with the first date, then check at most three dates at
  // a time. Reserve each actual network attempt; never retry a paid request.
  for(let i=0;i<dates.length;){
   const batch=dates.slice(i,i+(i===0?1:3));i+=batch.length;
   const outcomes=await Promise.allSettled(batch.map(one));
   outcomes.forEach((outcome,n)=>{if(outcome.status==='fulfilled'){completed.push(outcome.value.date);rows.push(...outcome.value.rows);times.push(outcome.value.checkedAt);}else{failed.push(batch[n]);errors.push({date:batch[n],code:outcome.reason.code||'provider-error'});}});
   if(errors.some(e=>hardErrors.has(e.code)))break;
  }
  const unattempted=dates.filter(d=>!completed.includes(d)&&!failed.includes(d));failed.push(...unattempted);
  const sampled=dates.length<Math.round((Date.parse(s.end)-Date.parse(s.start))/86400000)+1;
  if(!completed.length&&errors.length){const code=(errors.find(e=>hardErrors.has(e.code))||errors[0]).code;throw Object.assign(Error(code),{code,errors,dateCoverage:{planned:dates,completed,failed,sampled}});}
  return {rows,checkedAt:times.sort()[0]||null,errors,dateCoverage:{planned:dates,completed,failed,sampled},notes:[`SerpApi: checked ${completed.length}/${dates.length} planned departure dates${s.trip==='round'?' with '+s.stay+'-night returns':''}. ${sampled?'The window is sampled or limited by the return horizon; not every date is checked.':'Every departure day in the selected window was planned.'} ${failed.length?'Partial coverage: unsuccessful or unattempted dates '+failed.join(', ')+'. Completed results are retained.':''} ${errors.length?'Request issues: '+[...new Set(errors.map(e=>e.code))].join(', ')+'.':''}`]};
 };
}
