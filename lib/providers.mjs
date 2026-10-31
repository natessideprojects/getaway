import { carrierName } from '../public/carriers.mjs';

export class ProviderError extends Error {constructor(code){super(code);this.code=code;}}
export async function jsonRequest(url,options={},fetcher=fetch){
 try{
  const r=await fetcher(url,{...options,signal:AbortSignal.timeout(12000),redirect:'error'});
  if(r.status===429)throw new ProviderError('quota');
  if([401,403].includes(r.status))throw new ProviderError('invalid-key');
  if(!r.ok)throw new ProviderError('provider-error');
  const d=await r.json();
  if(d.error||d.success===false||d.errors?.length){const message=JSON.stringify(d.error||d.errors||'');throw new ProviderError(/limit|quota|run out|exceed/i.test(message)?'quota':/key|token|auth/i.test(message)?'invalid-key':'provider-error');}
  return d;
 }catch(e){if(e instanceof ProviderError)throw e;throw new ProviderError(['TimeoutError','AbortError'].includes(e.name)?'timeout':'provider-error');}
}
const endpoint=(base,params)=>base+'?'+new URLSearchParams(params);
const codes=value=>String(value||'').toUpperCase().split(/[^A-Z0-9]+/).filter(x=>/^(?:[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])$/.test(x));
export function createProviders(env,fetcher=fetch){return [
 {name:'SerpApi',id:'serpapi',configured:!!env.SERPAPI_KEY,limit:Number(env.SERPAPI_MONTHLY_LIMIT||250),async search(s,{beforeRequest=()=>{}}={}){
  const params={engine:'google_travel_explore',departure_id:s.origin,currency:s.currency,hl:'en',gl:'us',type:s.trip==='round'?'1':'2',api_key:env.SERPAPI_KEY};
  if(s.trip==='round')params.travel_duration='2';
  if(s.start.slice(0,7)===s.end.slice(0,7))params.month=String(Number(s.start.slice(5,7)));
  if(s.carrier)params.include_airlines=s.carrier;
  beforeRequest();const d=await jsonRequest(endpoint('https://serpapi.com/search.json',params),{},fetcher);
  if(d.search_parameters?.currency!==s.currency)throw new ProviderError('currency-unverified');
  const rows=Array.isArray(d.destinations)?d.destinations:[];
  return {offers:rows.map(x=>({destination:x.destination_airport?.code||x.name,city:x.destination_airport?.location||x.name,suggestedArea:x.name,country:x.country,price:x.flight_price,currency:d.search_parameters.currency,departure:x.start_date,returnDate:s.trip==='round'?x.end_date:null,trip:s.trip,airline:x.airline,airlineCodes:codes(x.airline_code),duration:x.flight_duration,stops:x.number_of_stops,url:x.link})),notes:[`SerpApi: one Explore discovery request${s.trip==='round'?' using one-week stay suggestions':''}. ${s.carrier?'Carrier '+s.carrier+' requested from the provider. ':''}Explore supplies limited destination/fare suggestions, not all carriers or departures. Exact dates and budget are filtered locally. Arrival airport may serve a nearby attraction; ground travel is excluded.`],fields:Object.keys(rows[0]||{}),source:'SerpApi · Google Explore',kind:'provider',checkedAt:d.search_metadata?.created_at||new Date().toISOString()};
 }},
 {name:'Travelpayouts',id:'travelpayouts',configured:!!env.TRAVELPAYOUTS_TOKEN,limit:Number(env.TRAVELPAYOUTS_MONTHLY_LIMIT||100),async search(s,{beforeRequest=()=>{}}={}){
  const params={origin:s.origin,currency:s.currency.toLowerCase(),one_way:String(s.trip==='oneway'),unique:'false',sorting:'price',limit:'1000',page:'1',market:'us'};
  if(s.start.slice(0,7)===s.end.slice(0,7))params.departure_at=s.start.slice(0,7);
  beforeRequest();const d=await jsonRequest(endpoint('https://api.travelpayouts.com/aviasales/v3/prices_for_dates',params),{headers:{'X-Access-Token':env.TRAVELPAYOUTS_TOKEN}},fetcher);
  if(d.currency&&d.currency.toUpperCase()!==s.currency)throw new ProviderError('currency-unverified');
  const rows=Array.isArray(d.data)?d.data:[];
  return {offers:rows.map(x=>({destination:x.destination_airport||x.destination,price:x.price,currency:s.currency,departure:x.departure_at,returnDate:s.trip==='round'?x.return_at:null,trip:s.trip,airline:carrierName(x.airline),airlineCodes:codes(x.airline),duration:x.duration_to,stops:x.transfers,url:typeof x.link==='string'&&x.link.startsWith('/search/')?'https://www.aviasales.com'+x.link:null})),notes:[`Travelpayouts: one cached-fare discovery request. ${rows.length===1000?'The provider page is full; additional cached records may exist. ':''}${s.carrier?'Carrier filtering is applied to returned fares locally; this endpoint cannot discover extra alternatives for the chosen carrier. ':''}These are cached cheapest-fare records, not live availability or exhaustive flight inventory. Currency is explicitly requested.`],fields:Object.keys(rows[0]||{}),source:'Travelpayouts · cached fares',kind:'cached',checkedAt:new Date().toISOString()};
 }}
];}
