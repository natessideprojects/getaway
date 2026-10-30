import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath,pathToFileURL } from 'node:url';
import path from 'node:path';
import { createEngine } from './lib/engine.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
if(root.split(/[\\/]/).some(x=>x.toLowerCase()==='onedrive')) throw Error('Workspace must be outside OneDrive.');
export function makeServer(engine=createEngine({storage:new URL('./.runtime/quota.json',import.meta.url)})) {
 return createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  try {
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')) {
    res.setHeader('Cache-Control','no-store'); res.setHeader('Content-Type','application/json');
    if(req.method!=='GET') {res.writeHead(405);return res.end(JSON.stringify({error:'GET required.'}));}
    if(url.pathname==='/api/status') return res.end(JSON.stringify({usage:engine.usage()}));
    if(url.pathname!=='/api/explore') {res.writeHead(404);return res.end('{}');}
    try {return res.end(JSON.stringify(await engine.search(Object.fromEntries(url.searchParams))));} catch(e) {res.writeHead(400);return res.end(JSON.stringify({error:e.message}));}
   }
   if(!['GET','HEAD'].includes(req.method)) {res.writeHead(405);return res.end();}
   const name=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1));
   const file=path.resolve(root,'public',name);if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);return res.end();}
   const data=await readFile(file);const types={'.html':'text/html','.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
   res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.end(req.method==='HEAD'?undefined:data);
  } catch {res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) makeServer().listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log(`Getaway ready: http://localhost:${process.env.PORT||3000}`));
