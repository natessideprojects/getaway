import { genericLink } from './search.mjs';
export class ProviderError extends Error { constructor(code) {super(code);this.code=code;} }
export async function jsonRequest(url,options={},fetcher=fetch) {
 try {
  const r=await fetcher(url,{...options,signal:AbortSignal.timeout(12000),redirect:'error'});
  if(r.status===429) throw new ProviderError('quota');
  if([401,403].includes(r.status)) throw new ProviderError('invalid-key');
  if(!r.ok) throw new ProviderError('provider-error');
  const d=await r.json();
  if(d.error || d.success===false || d.errors?.length) {
   const message=JSON.stringify(d.error||d.errors||'');
   throw new ProviderError(/limit|quota|run out|exceed/i.test(message)?'quota':/key|token|auth/i.test(message)?'invalid-key':'provider-error');
  }
  return d;
 } catch(e) { if(e instanceof ProviderError) throw e; throw new ProviderError(['TimeoutError','AbortError'].includes(e.name)?'timeout':'provider-error'); }
}
const endpoint=(base,p)=>base+'?'+new URLSearchParams(p);
export function createProviders(env,fetcher=fetch) {
 let token=null,expires=0;
 return [
  {name:'SerpApi',configured:!!env.SERPAPI_KEY,limit:Number(env.SERPAPI_MONTHLY_LIMIT||250),async search(s,{beforeRequest=()=>{}}={}){
   const base={engine:'google_travel_explore',departure_id:s.origin,currency:s.currency,hl:'en',gl:'us',type:s.trip==='round'?'1':'2',api_key:env.SERPAPI_KEY};
   if(s.start.slice(0,7)===s.end.slice(0,7)) base.month=String(Number(s.start.slice(5,7)));
   let queries=[{...base,travel_duration:'2'}];
   if(s.coverage==='broad'&&s.trip==='round') queries=['2','1','3'].map(travel_duration=>({...base,travel_duration}));
   if(s.coverage==='broad'&&s.trip==='oneway') {
    const months=[];let m=s.start.slice(0,7);while(m<=s.end.slice(0,7)&&months.length<3){months.push(m);const d=new Date(m+'-01T12:00Z');d.setUTCMonth(d.getUTCMonth()+1);m=d.toISOString().slice(0,7);}
    queries=months.map(m=>({...base,month:String(Number(m.slice(5,7)))}));
   }
   const responses=[],warnings=[];
   for(const params of queries) {
    try {beforeRequest();const d=await jsonRequest(endpoint('https://serpapi.com/search.json',params),{},fetcher);if(d.search_parameters?.currency!==s.currency)throw new ProviderError('currency-unverified');responses.push(d);}
    catch(e){if(!responses.length)throw e;warnings.push(e.code||'provider-error');break;}
   }
   const offers=responses.flatMap(d=>(d.destinations||[]).map(x=>({destination:x.destination_airport?.code||x.name,city:x.destination_airport?.location||x.name,suggestedArea:x.name,country:x.country,price:x.flight_price,currency:d.search_parameters.currency,departure:x.start_date,returnDate:s.trip==='round'?x.end_date:null,trip:s.trip,airline:x.airline,duration:x.flight_duration,stops:x.number_of_stops,url:x.link})));
   return {offers,warnings,notes:[`Explore discovery: ${responses.length} response(s), ${s.trip==='round'?(s.coverage==='broad'?'weekend / one-week / two-week stay buckets':'one-week stay bucket'):(s.coverage==='broad'?'up to three departure months':'flexible departure suggestions')}. Every qualifying retrieved offer is shown; this is not every available flight. Exact departure windows and the 90-day return limit are filtered locally. Destination labels may include attractions near the listed arrival airport; ground travel is not included.`],fields:Object.keys(responses[0]?.destinations?.[0]||{}),source:'SerpApi · Google Explore',kind:'provider',checkedAt:responses.map(d=>d.search_metadata?.created_at).filter(Boolean).sort()[0]||new Date().toISOString()};
  }},
  {name:'Travelpayouts',configured:!!env.TRAVELPAYOUTS_TOKEN,limit:Number(env.TRAVELPAYOUTS_MONTHLY_LIMIT||100),async search(s,{beforeRequest=()=>{}}={}){
   const params={origin:s.origin,currency:s.currency.toLowerCase(),one_way:String(s.trip==='oneway'),unique:'false',sorting:'price',limit:'1000',page:'1',market:'us'};
   if(s.start.slice(0,7)===s.end.slice(0,7)) params.departure_at=s.start.slice(0,7);
   const rows=[],warnings=[];let more=false;
   for(let page=1;page<=(s.coverage==='broad'?3:1);page++) {
    try{beforeRequest();const d=await jsonRequest(endpoint('https://api.travelpayouts.com/aviasales/v3/prices_for_dates',{...params,page:String(page)}),{headers:{'X-Access-Token':env.TRAVELPAYOUTS_TOKEN}},fetcher);rows.push(...(d.data||[]));more=(d.data||[]).length===1000;if(!more)break;}
    catch(e){if(!rows.length)throw e;warnings.push(e.code||'provider-error');break;}
   }
   return {offers:rows.map(x=>({destination:x.destination_airport||x.destination,price:x.price,currency:s.currency,departure:x.departure_at,returnDate:s.trip==='round'?x.return_at:null,trip:s.trip,airline:x.airline,duration:x.duration_to,stops:x.transfers,url:typeof x.link==='string'&&x.link.startsWith('/search/')?'https://www.aviasales.com'+x.link:null})),warnings,notes:[`Travelpayouts fares are cached and indicative, not a live availability check. ${more?'Request cap reached; more provider pages may exist. Choose broader discovery for up to three pages.':'All records from the retrieved page(s) are considered.'} Provider coverage is incomplete. Currency is requested explicitly.`],fields:Object.keys(rows[0]||{}),source:'Travelpayouts · cached fares',kind:'cached',checkedAt:new Date().toISOString()};
  }},
  {name:'Amadeus',configured:!!(env.AMADEUS_CLIENT_ID&&env.AMADEUS_CLIENT_SECRET),limit:Number(env.AMADEUS_MONTHLY_LIMIT||100),async search(s,{beforeRequest=()=>{}}={}){
   const base=env.AMADEUS_ENV==='production'?'https://api.amadeus.com':'https://test.api.amadeus.com';
   if(!token||Date.now()>expires) {
    const auth=await jsonRequest(base+'/v1/security/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.AMADEUS_CLIENT_ID,client_secret:env.AMADEUS_CLIENT_SECRET})},fetcher);
    if(!auth.access_token) throw new ProviderError('invalid-key'); token=auth.access_token; expires=Date.now()+(Number(auth.expires_in)-60)*1000;
   }
   beforeRequest();const d=await jsonRequest(endpoint(base+'/v1/shopping/flight-destinations',{origin:s.origin,departureDate:s.start+','+s.end,oneWay:String(s.trip==='oneway'),viewBy:'DATE'}),{headers:{Authorization:'Bearer '+token}},fetcher);
   if(d.meta?.currency!==s.currency) throw new ProviderError('currency-unverified');
   return {offers:(d.data||[]).map(x=>({destination:x.destination,city:d.dictionaries?.locations?.[x.destination]?.detailedName,price:Number(x.price?.total),currency:d.meta.currency,departure:x.departureDate,returnDate:s.trip==='round'?x.returnDate:null,trip:s.trip,generic:true,url:genericLink(s,{destination:x.destination,departure:x.departureDate,returnDate:x.returnDate})})),notes:['Amadeus inspiration covers selected cached routes. Airline, duration and layovers are not supplied. Search links are generic Google searches.'],fields:Object.keys(d.data?.[0]||{}),source:'Amadeus · '+(env.AMADEUS_ENV==='production'?'cached inspiration':'SANDBOX TEST DATA'),kind:env.AMADEUS_ENV==='production'?'cached':'sandbox',checkedAt:new Date().toISOString()};
  }}
 ];
}
