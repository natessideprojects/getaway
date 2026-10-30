import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
if(root.split(/[\\/]/).some(x=>x.toLowerCase()==='onedrive'))throw Error('Build workspace must be outside OneDrive');
const manifest=JSON.parse(readFileSync(new URL('../public/manifest.webmanifest',import.meta.url)));
for(const icon of manifest.icons)if(!existsSync(new URL('../public'+icon.src,import.meta.url)))throw Error('Missing PWA icon');
for(const name of ['index.html','styles.css','app.mjs','sw.js'])if(!existsSync(new URL('../public/'+name,import.meta.url)))throw Error('Missing shell asset');
console.log('Static PWA and serverless API prepared. No dependencies or bundled secrets.');
