import {regions} from '../public/regions.mjs';
import {destinationGeography} from './geography.mjs';
import { airports } from '../public/airports.mjs';
export function dayInZone(now,zone) { return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function addDays(date,n) { const d=new Date(date+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+n); return d.toISOString().slice(0,10); }
export function validDate(d) { return typeof d==='string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !isNaN(Date.parse(d)) && new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d; }
export function validate(input,now=new Date()) {
 const origin=String(input.origin||'').trim().toUpperCase();
 if(!/^[A-Z]{3}$/.test(origin)) throw Error('Enter a three-letter IATA airport code.');
 const airport=airports.find(a=>a.code===origin);
 const timezone=airport?.timezone || input.timezone;
 if(!timezone) throw Error('For an unlisted airport, enter its IANA timezone (for example Europe/London).');
 try { new Intl.DateTimeFormat('en',{timeZone:timezone}).format(); } catch { throw Error('Enter a valid IANA timezone.'); }
 const today=dayInZone(now,timezone), horizon=addDays(today,90);
 const when=input.when||'anytime'; let start=today,end=addDays(today,59);
 if(when==='today') end=today;
 else if(when==='tomorrow') start=end=addDays(today,1);
 else if(when==='week') { const weekday=new Date(today+'T12:00Z').getUTCDay(); start=addDays(today,weekday===0?1:8-weekday); end=addDays(start,6); }
 else if(when==='month') end=addDays(today,29);
 else if(when==='custom') { start=input.start; end=input.end; }
 else if(when!=='anytime') throw Error('Choose a valid departure window.');
 if(!validDate(start)||!validDate(end)||start<today||end<start||end>horizon) throw Error('Choose an ordered departure range from today through 90 days ahead.');
 const budget=input.budget===''||input.budget==null?null:Number(input.budget);
 if(budget!==null&&(!Number.isFinite(budget)||budget<0||budget>1000000)) throw Error('Budget must be a number between 0 and 1,000,000, or blank.');
 const trip=input.trip||'round'; if(!['round','oneway'].includes(trip)) throw Error('Choose round trip or one way.');
 const currency=input.currency||'USD'; if(!['USD','EUR'].includes(currency)) throw Error('Choose USD or EUR.');
 const mode=input.mode||'auto'; if(!['auto','serpapi','travelpayouts','demo'].includes(mode)) throw Error('Choose both providers, SerpApi, Travelpayouts or demo mode.');
 const carrier=String(input.carrier||'').trim().toUpperCase();
 if(carrier&&!/^(?:[A-Z]{2}|[A-Z][0-9]|[0-9][A-Z])$/.test(carrier))throw Error('Carrier must be a two-character airline IATA code, or blank for any carrier.');
 const region=String(input.region||'any');if(!regions.some(r=>r.code===region))throw Error('Choose a valid destination region.');
 // Legacy coverage query parameters no longer trigger extra requests.
 return {origin,timezone,today,horizon,start,end,when,budget,trip,currency,mode,carrier,region};
}
export function safeLink(value) { try { const u=new URL(value); return u.protocol==='https:'&&!u.username&&!u.password&&['www.google.com','google.com','www.aviasales.com','aviasales.com'].includes(u.hostname)?u.href:null; } catch { return null; } }
export function genericLink(s,d) { return 'https://www.google.com/travel/flights?q='+encodeURIComponent(`${s.trip==='round'?'Round trip':'One way'} flights from ${s.origin} to ${d.destination} on ${d.departure}${d.returnDate?' returning '+d.returnDate:''} ${s.currency}`); }
function originTimestamp(value,s) {
 if(typeof value!=='string'||!value.includes('T')||!/(Z|[+-]\d{2}:\d{2})$/.test(value)) return value;
 const instant=new Date(value);if(isNaN(instant.getTime()))return null;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:s.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant).map(x=>[x.type,x.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function filterOffers(offers,s) {
 return offers.map(o=>({...o,...destinationGeography(o),departure:originTimestamp(o.departure,s),returnDate:originTimestamp(o.returnDate,s)})).filter(o=>(!s.region||s.region==='any'||o.destinationRegion===s.region)&&o.currency===s.currency&&o.trip===s.trip&&(!s.carrier||o.airlineCodes?.includes(s.carrier))&&typeof o.price==='number'&&Number.isFinite(o.price)&&o.price>=0&&(s.budget===null||o.price<=s.budget)&&validDate(o.departure?.slice(0,10))&&o.departure.slice(0,10)>=s.start&&o.departure.slice(0,10)<=s.end&&(s.trip==='oneway'||(validDate(o.returnDate?.slice(0,10))&&o.returnDate.slice(0,10)>=o.departure.slice(0,10)&&o.returnDate.slice(0,10)<=s.horizon))).map(o=>({...o,url:safeLink(o.url)||genericLink(s,o),generic:!safeLink(o.url)||!!o.generic})).sort((a,b)=>a.price-b.price);
}
