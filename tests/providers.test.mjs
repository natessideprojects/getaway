import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEngine} from '../lib/engine.mjs';
import {validate} from '../lib/search.mjs';
const clock=()=>new Date('2026-10-30T16:00Z');
const reply=d=>({ok:true,status:200,json:async()=>d});
const serp=(airline='Frontier',code='F9',price=80)=>({search_parameters:{currency:'USD'},destinations:[{name:'New York',destination_airport:{code:'JFK'},flight_price:price,start_date:'2026-11-03',end_date:'2026-11-10',airline,airline_code:code}]});
const travel=(airline='DL',price=150)=>({success:true,currency:'usd',data:[{destination:'JFK',price,departure_at:'2026-11-03T12:00:00-05:00',return_at:'2026-11-10T12:00:00-05:00',airline}]});
test('both providers are queried even when SerpApi succeeds; higher-price same-route carrier survives',async()=>{
 const calls=[];const engine=createEngine({env:{SERPAPI_KEY:'fake',TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async url=>{calls.push(url.includes('serpapi')?'serpapi':'travelpayouts');return reply(url.includes('serpapi')?serp():travel());}});
 const r=await engine.search({origin:'ATL',budget:500});assert.deepEqual(calls,['serpapi','travelpayouts']);assert.deepEqual(r.offers.map(x=>x.price),[80,150]);assert.deepEqual(r.offers.map(x=>x.provider),['SerpApi','Travelpayouts']);assert.equal(r.offers[1].airline,'Delta');assert.equal(r.audit.matching,2);assert.equal(r.kind,'combined');
});
test('Travelpayouts-only selection never consumes SerpApi requests',async()=>{
 let calls=0;const engine=createEngine({env:{SERPAPI_KEY:'fake',TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async url=>{calls++;assert.ok(url.includes('travelpayouts'));return reply(travel());}});
 const r=await engine.search({origin:'ATL',mode:'travelpayouts'});assert.equal(calls,1);assert.equal(r.offers[0].provider,'Travelpayouts');assert.equal(r.usage[0].used,0);assert.equal(r.attempts.length,1);
});
test('carrier is requested upstream and enforced on all returned provider offers',async()=>{
 const engine=createEngine({env:{SERPAPI_KEY:'fake',TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async url=>{if(url.includes('serpapi')){assert.equal(new URL(url).searchParams.get('include_airlines'),'DL');return reply(serp('Delta','DL',130));}return reply({success:true,data:[...travel().data,...travel('F9',60).data]});}});
 const r=await engine.search({origin:'ATL',carrier:'dl'});assert.equal(r.offers.length,2);assert.ok(r.offers.every(x=>x.airlineCodes.includes('DL')));assert.deepEqual(r.offers.map(x=>x.price),[130,150]);assert.equal(r.audit.excluded,1);
});
test('carrier and data source are validated; explicit missing provider does not become demo',async()=>{
 assert.throws(()=>validate({origin:'ATL',carrier:'DELTA'},clock()));assert.throws(()=>validate({origin:'ATL',mode:'amadeus'},clock()));
 const r=await createEngine({env:{},clock}).search({origin:'ATL',mode:'travelpayouts'});assert.equal(r.kind,'unavailable');assert.equal(r.attempts[0].status,'not-configured');
});
test('Travelpayouts currency mismatch cannot enter USD totals',async()=>{
 const engine=createEngine({env:{TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async()=>reply({...travel(),currency:'rub'})});const r=await engine.search({origin:'ATL'});assert.equal(r.offers.length,0);assert.equal(r.attempts.find(a=>a.provider==='Travelpayouts').status,'currency-unverified');
});
test('exhausted SerpApi does not block Travelpayouts',async()=>{
 const engine=createEngine({env:{SERPAPI_KEY:'fake',SERPAPI_MONTHLY_LIMIT:'0',TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async url=>{assert.ok(url.includes('travelpayouts'));return reply(travel());}});
 const r=await engine.search({origin:'ATL'});assert.equal(r.offers[0].provider,'Travelpayouts');assert.equal(r.attempts[0].status,'local-quota');assert.equal(r.usage[0].used,0);
});
