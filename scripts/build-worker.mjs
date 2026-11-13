import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { build } from "esbuild";
import path from "node:path";

const assets = {};
async function collect(directory, prefix = "") {
  for (const file of await readdir(directory, { withFileTypes: true })) {
    const name = path.join(directory, file.name);
    const url = `${prefix}/${file.name}`;
    if (file.isDirectory()) await collect(name, url);
    else assets[url] = (await readFile(name)).toString("base64");
  }
}
await collect("dist/client");
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
const entry = `import {weatherResponse} from './server/weather.ts';
const assets = ${JSON.stringify(assets)};
const types = {html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css',svg:'image/svg+xml'};
export default {async fetch(request) {
 const url = new URL(request.url);
 if(url.pathname === '/api/weather') return weatherResponse();
 if(!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405});
 const key = url.pathname === '/' ? '/index.html' : url.pathname;
 const content = assets[key];
 if(!content) return new Response('Not found',{status:404});
 const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0));
 return new Response(request.method === 'HEAD' ? null : bytes,{headers:{'Content-Type':types[key.split('.').pop()] || 'application/octet-stream','Cache-Control':key.includes('/assets/')?'public, max-age=31536000, immutable':'no-cache','X-Content-Type-Options':'nosniff'}});
}};`;
await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: "ts" },
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  outfile: "dist/server/index.js",
});
await writeFile(
  "dist/.openai/hosting.json",
  await readFile(".openai/hosting.json"),
);
