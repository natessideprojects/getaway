import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate,filterOffers} from '../lib/search.mjs';
import {createEngine} from '../lib/engine.mjs';
import {destinationGeography} from '../lib/geography.mjs';
const clock=()=>new Date('2026-10-30T16:00Z');
const airports={NA:'JFK',SA:'GRU',EU:'LHR',AF:'JNB',AS:'HND',OC:'SYD'};
const offer=destination=>({destination,price:100,currency:'USD',trip:'round',departure:'2026-11-03',returnDate:'2026-11-10'});
test('each continent selects only its arrival airports, while Anywhere retains unknown geography',()=>{
 const offers=[...Object.values(airports),'ZZZ'].map(offer);
 for(const [region,code] of Object.entries(airports))assert.deepEqual(filterOffers(offers,validate({origin:'ATL',region},clock())).map(o=>o.destination),[code]);
 assert.equal(filterOffers(offers,validate({origin:'ATL'},clock())).length,7);
 assert.throws(()=>validate({origin:'ATL',region:'invalid'},clock()));
 assert.equal(destinationGeography({destination:'SJU'}).destinationRegion,'NA');
 assert.equal(destinationGeography({destination:'PTY'}).destinationRegion,'NA');
});
test('arrival-airport geography wins over attraction country; known country is fallback only',()=>{
 assert.equal(destinationGeography({destination:'JFK',country:'France'}).destinationRegion,'NA');
 assert.equal(destinationGeography({destination:'Unknown',country:'France'}).destinationRegion,'EU');
 assert.equal(destinationGeography({destination:'Unknown',country:'AU'}).destinationRegion,'OC');
 assert.equal(destinationGeography({destination:'Unknown',country:'Unknown'}).destinationRegion,null);
});
test('region is requested upstream and enforced for both providers, including unknown exclusion notification',async()=>{
 const calls=[];const engine=createEngine({env:{SERPAPI_KEY:'fake',TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async url=>{
  calls.push(url);if(url.includes('serpapi')){assert.equal(new URL(url).searchParams.get('arrival_area_id'),'/m/02j9z');return {ok:true,json:async()=>({search_parameters:{currency:'USD'},destinations:['LHR','JFK','ZZZ'].map(code=>({name:code,destination_airport:{code},flight_price:100,start_date:'2026-11-03',end_date:'2026-11-10'}))})};}
  return {ok:true,json:async()=>({success:true,data:['CDG','HND'].map(destination=>({destination,price:100,departure_at:'2026-11-03',return_at:'2026-11-10'}))})};
 }});
 const r=await engine.search({strategy:'deals',origin:'ATL',region:'EU'});assert.deepEqual(r.offers.map(o=>o.destination),['LHR','CDG']);assert.equal(calls.length,2);assert.equal(r.audit.returned,5);assert.equal(r.audit.excluded,3);assert.ok(r.notes.some(n=>n.includes('1 returned offers excluded because destination region is unknown')));
 await engine.search({strategy:'deals',origin:'ATL',region:'EU'});assert.equal(calls.length,2);
});
test('changing regions cannot reuse another region cache; Oceania does not send an unverified area ID',async()=>{
 const params=[];const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>{params.push(new URL(url).searchParams);return {ok:true,json:async()=>({search_parameters:{currency:'USD'},destinations:[]})};}});
 for(const region of ['any','NA','SA','AF','AS','OC'])await engine.search({strategy:'deals',origin:'ATL',region});
 assert.equal(params.length,6);assert.deepEqual(params.map(p=>p.get('arrival_area_id')),[null,'/m/059g4','/m/06n3y','/m/0dg3n1','/m/0j0k',null]);
});
