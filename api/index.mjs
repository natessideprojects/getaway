import { createEngine } from '../lib/engine.mjs';

// Vercel instances have a read-only filesystem. Never write the local quota ledger here.
const engine=createEngine();
const headers={'Cache-Control':'no-store','Content-Type':'application/json','X-Content-Type-Options':'nosniff'};
export async function GET(request) {
 const url=new URL(request.url);
 const route=url.pathname==='/api/index'?url.searchParams.get('route'):url.pathname.replace(/^\/api\//,'');
 if(route==='status')return Response.json({usage:engine.usage(),quotaScope:'instance'}, {headers});
 if(route!=='explore')return Response.json({error:'Not found.'},{status:404,headers});
 try { const result=await engine.search(Object.fromEntries(url.searchParams)); console.info(JSON.stringify({event:'flight-search',source:result.source,cached:result.cached,matching:result.offers.length,requests:result.attempts.map(x=>({provider:x.provider,status:x.status,requests:x.discoveryRequests||0}))})); return Response.json(result,{headers}); }
 catch(e) {return Response.json({error:e.message},{status:400,headers});}
}
