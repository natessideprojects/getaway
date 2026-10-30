import {createEngine} from '../lib/engine.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));if(root.split(/[\\/]/).some(x=>x.toLowerCase()==='onedrive'))throw Error('Forbidden workspace');
const engine=createEngine({storage:new URL('../.runtime/quota.json',import.meta.url)});
const results=[];
if(!engine.usage().some(p=>p.configured))results.push({status:'BLOCKED',reason:'No provider credentials configured. Zero external API requests made.'});
else for(const input of [{origin:'ATL',budget:500,when:'anytime'},{origin:'LHR',budget:500,when:'week'}]){const r=await engine.search(input);results.push({input,kind:r.kind,source:r.source,search:r.search,offers:r.offers.length,checkedAt:r.checkedAt,attempts:r.attempts,notes:r.notes,usage:r.usage,links:r.offers.slice(0,3).map(o=>({url:o.url,verification:'HTTPS allowlist validated; browser landing and ticket availability not verified'}))});}
mkdirSync(new URL('../test-results/',import.meta.url),{recursive:true});writeFileSync(new URL('../test-results/live-report.json',import.meta.url),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
