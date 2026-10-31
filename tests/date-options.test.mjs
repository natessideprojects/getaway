import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEngine} from '../lib/engine.mjs';
import {validate,addDays} from '../lib/search.mjs';
import {departureDates} from '../public/search-plan.mjs';
const clock=()=>new Date('2026-10-30T16:00Z');
const input={origin:'ATL',when:'week',carrier:'DL',budget:1999};
const reply=d=>({ok:true,status:200,json:async()=>d});
function datedReply(url){const p=new URL(url).searchParams,date=p.get('outbound_date');return reply({search_parameters:{currency:'USD'},destinations:[{name:'New York',destination_airport:{code:'JFK'},flight_price:100,start_date:date,end_date:p.get('return_date'),airline:'Delta',airline_code:'DL'},{name:'Los Angeles',destination_airport:{code:'LAX'},flight_price:500,start_date:date,end_date:p.get('return_date'),airline:'Delta',airline_code:'DL'}]});}
test('next week queries every actual departure day and keeps the same destination on different days',async()=>{
 const calls=[];const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>{calls.push(new URL(url).searchParams);return datedReply(url);}});
 const r=await engine.search(input);assert.equal(r.offers.length,14);assert.equal(r.audit.returned,14);assert.equal(r.attempts[0].discoveryRequests,7);assert.deepEqual(calls.map(p=>p.get('outbound_date')),Array.from({length:7},(_,i)=>addDays('2026-11-02',i)));
 assert.ok(calls.every(p=>!p.has('month')&&!p.has('travel_duration')&&p.get('include_airlines')==='DL'&&p.get('return_date')===addDays(p.get('outbound_date'),7)));
 assert.equal(r.attempts[0].dateCoverage.sampled,false);await engine.search(input);assert.equal(calls.length,7);
 await engine.search({...input,budget:200});assert.equal(calls.length,7); // per-date cache survives a different local budget
});
test('every timeframe uses exact dates; long ranges sample endpoints without inventing full coverage',async()=>{
 for(const when of ['today','tomorrow','week','month','anytime','custom']){
  const s=validate({origin:'ATL',when,start:'2026-11-01',end:'2026-11-04'},clock()),dates=departureDates(s),calls=[];
  const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>{calls.push(new URL(url).searchParams.get('outbound_date'));return datedReply(url);}});
  const r=await engine.search({origin:'ATL',when,start:s.start,end:s.end});assert.deepEqual(calls,dates);assert.equal(calls[0],s.start);assert.equal(calls.at(-1),s.end);assert.ok(r.offers.every(o=>o.departure>=s.start&&o.departure<=s.end));assert.equal(r.attempts[0].dateCoverage.sampled,['month','anytime'].includes(when));
 }
});
test('partial timeout keeps successful dates and lists exactly what failed',async()=>{
 const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>{if(new URL(url).searchParams.get('outbound_date')==='2026-11-04')throw Object.assign(Error('secret'),{name:'TimeoutError'});return datedReply(url);}});
 const r=await engine.search(input);assert.equal(r.offers.length,12);assert.equal(r.attempts[0].status,'partial');assert.deepEqual(r.attempts[0].dateCoverage.failed,['2026-11-04']);assert.equal(r.attempts[0].dateCoverage.completed.length,6);assert.ok(!JSON.stringify(r).includes('secret'));
});
test('quota halfway through preserves completed offers and still uses Travelpayouts',async()=>{
 let serp=0,travel=0;const engine=createEngine({env:{SERPAPI_KEY:'fake',SERPAPI_MONTHLY_LIMIT:'2',TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async url=>{if(url.includes('serpapi')){serp++;return datedReply(url);}travel++;return reply({success:true,data:[]});}});
 const r=await engine.search(input);assert.equal(serp,2);assert.equal(travel,1);assert.equal(r.offers.length,4);assert.equal(r.usage[0].used,2);assert.equal(r.attempts[0].status,'partial');assert.equal(r.attempts[0].dateCoverage.failed.length,5);
});
test('upstream quota after a successful date marks exhausted and does not discard results',async()=>{
 let calls=0;const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>++calls===1?datedReply(url):{ok:false,status:429}});
 const r=await engine.search(input);assert.equal(r.offers.length,2);assert.equal(r.usage[0].exhausted,true);assert.equal(r.attempts[0].status,'partial');assert.equal(r.attempts[0].dateCoverage.failed.length,6);
});
test('return horizon never silently shortens stays, and one-way searches have no return parameter',async()=>{
 const s=validate({origin:'ATL',when:'custom',start:'2027-01-20',end:'2027-01-28',stay:7},clock());assert.deepEqual(departureDates(s),['2027-01-20','2027-01-21']);
 const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>{assert.ok(!new URL(url).searchParams.has('return_date'));return datedReply(url);}});
 const r=await engine.search({...input,when:'tomorrow',trip:'oneway'});assert.equal(r.offers.length,2);assert.ok(r.offers.every(o=>o.returnDate===null));assert.throws(()=>validate({...input,stay:0.5},clock()));assert.throws(()=>validate({...input,strategy:'all'},clock()));
});
test('selected stay also filters Travelpayouts cached records',async()=>{
 const engine=createEngine({env:{TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async()=>reply({success:true,data:[3,7,14].map(stay=>({destination:'JFK',airline:'DL',price:100,departure_at:'2026-11-02',return_at:addDays('2026-11-02',stay)}))})});
 const r=await engine.search(input);assert.equal(r.offers.length,1);assert.equal(r.offers[0].returnDate,'2026-11-09');
});
test('date request concurrency is bounded and all-failed coverage remains visible',async()=>{
 let active=0,max=0;const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>{active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,2));active--;return datedReply(url);}});
 await engine.search(input);assert.equal(max,3);
 const failed=await createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async()=>{throw Object.assign(Error('no response'),{name:'TimeoutError'});}}).search(input);
 assert.equal(failed.kind,'unavailable');assert.equal(failed.attempts[0].dateCoverage.failed.length,7);assert.deepEqual(failed.attempts[0].dateCoverage.completed,[]);
});
