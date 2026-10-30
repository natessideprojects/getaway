import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createEngine} from '../lib/engine.mjs';
import {GET} from '../api/index.mjs';
const clock=()=>new Date('2026-10-30T16:00Z');
const response=data=>({ok:true,status:200,json:async()=>data});
const offer=(price=100)=>({name:'New York',destination_airport:{code:'JFK'},start_date:'2026-11-03',end_date:'2026-11-10',flight_price:price});
test('no local truncation: every one of 501 matching offers survives normalization',async()=>{
 const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async()=>response({search_parameters:{currency:'USD'},destinations:Array.from({length:502},(_,i)=>offer(i))})});
 const r=await engine.search({origin:'ATL',budget:500});assert.equal(r.offers.length,501);assert.deepEqual(r.audit,{returned:502,matching:501,excluded:1,locallyTruncated:0});
});
test('broader round trips collect all three documented stay buckets and count each call',async()=>{
 const durations=[];const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async url=>{durations.push(new URL(url).searchParams.get('travel_duration'));return response({search_parameters:{currency:'USD'},destinations:[offer()]});}});
 const r=await engine.search({origin:'ATL',coverage:'broad'});assert.deepEqual(durations,['2','1','3']);assert.equal(r.offers.length,3);assert.equal(r.usage[0].used,3);assert.equal(r.attempts[0].discoveryRequests,3);assert.equal(r.audit.returned,3);
});
test('broader search preserves completed results and stops before local quota overrun',async()=>{
 let calls=0;const engine=createEngine({env:{SERPAPI_KEY:'fake',SERPAPI_MONTHLY_LIMIT:'1'},clock,fetcher:async()=>{calls++;return response({search_parameters:{currency:'USD'},destinations:[offer()]});}});
 const r=await engine.search({origin:'ATL',coverage:'broad'});assert.equal(calls,1);assert.equal(r.offers.length,1);assert.equal(r.attempts[0].status,'partial');assert.match(r.notes.join(' '),/partial results/);assert.equal(r.usage[0].used,1);
});
test('broader Travelpayouts follows full pages instead of discarding page two',async()=>{
 const pages=[];const engine=createEngine({env:{TRAVELPAYOUTS_TOKEN:'fake'},clock,fetcher:async url=>{const page=new URL(url).searchParams.get('page');pages.push(page);return response({success:true,data:Array.from({length:page==='1'?1000:2},()=>({destination:'JFK',price:99,departure_at:'2026-11-03T12:00:00Z',return_at:'2026-11-10T12:00:00Z'}))});}});
 const r=await engine.search({origin:'ATL',coverage:'broad'});assert.deepEqual(pages,['1','2']);assert.equal(r.offers.length,1002);assert.equal(r.attempts[0].discoveryRequests,2);
});
test('serverless Web handler serves status and validates requests without filesystem writes',async()=>{
 const status=await GET(new Request('https://example.test/api/index?route=status'));assert.equal(status.status,200);assert.equal((await status.json()).quotaScope,'instance');
 const bad=await GET(new Request('https://example.test/api/index?route=explore&origin=BAD-CODE'));assert.equal(bad.status,400);assert.equal(bad.headers.get('cache-control'),'no-store');
 assert.equal((await GET(new Request('https://example.test/api/index?route=secret'))).status,404);
});
test('an empty matching set still reports all retrieved offers and filter exclusions',async()=>{
 const engine=createEngine({env:{SERPAPI_KEY:'fake'},clock,fetcher:async()=>response({search_parameters:{currency:'USD'},destinations:[offer(200),offer(300)]})});
 const r=await engine.search({origin:'ATL',budget:150});assert.equal(r.kind,'empty');assert.deepEqual(r.audit,{returned:2,matching:0,excluded:2,locallyTruncated:0});
});
