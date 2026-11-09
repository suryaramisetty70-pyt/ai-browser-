import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,providers} from './providers.mjs';
import app from './dist/server/index.js';
const origin='https://deskpa-workstation.grassycaper.chatgpt.site';
function req(provider='groq',from=origin){return new Request(origin+'/api/infer',{method:'POST',headers:{Origin:from},body:JSON.stringify({key:'test-only',provider,mode:'test',input:'Hello'})})}
for(const id of Object.keys(providers))test(id+' provider request and response',async()=>{
 const reply=await api(req(id),async(url,opts)=>{assert.equal(url,providers[id].url);const data=JSON.parse(opts.body);assert.ok(id==='gemini'?data.contents:data.messages);assert.ok(id==='gemini'?opts.headers['x-goog-api-key']:opts.headers.Authorization);return Response.json(id==='gemini'?{candidates:[{content:{parts:[{text:'OK'}]}}]}:{choices:[{message:{content:'OK'}}]})});assert.deepEqual(await reply.json(),{answer:'OK'});
});
test('denies external origin',async()=>assert.equal((await api(req('groq','https://invalid.example'))).status,403));
test('denies unlisted providers',async()=>assert.equal((await api(req('unknown'))).status,400));
test('quota failure preserves status',async()=>assert.equal((await api(req(),async()=>new Response(null,{status:429}))).status,429));
test('does not leak upstream error text',async()=>{const r=await api(req(),async()=>new Response('test-only',{status:401}));assert.ok(!(await r.text()).includes('test-only'))});
test('serves four frontend resources',async()=>{for(const path of ['/','/catalog.js','/app.js','/style.css'])assert.equal((await app.fetch(new Request(origin+path))).status,200)});
test('download is a ZIP',async()=>{const r=await app.fetch(new Request(origin+'/companion.zip'));assert.equal(r.headers.get('Content-Type'),'application/zip');assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0,2).toString(),'PK')});

import {interpret} from './web/task.js';
for(const [instruction,kind] of [
  ["Java loops easy ga explain chey","ask"],
  ["https://example.org", "open"],
  ["ee link ni open chey https://example.org","open"],
  ["Open https://example.org and summarize the eligibility rules","browse"],
  ["https://example.org lo pending modules chupinchu","browse"]
])test('routes '+instruction,()=>assert.equal(interpret(instruction).mode,kind));
test('keeps explicit text-only requests',()=>assert.equal(interpret('Draft a message about https://example.org','ask').mode,'ask'));
test('requires a starting link for multiple destinations',()=>assert.throws(()=>interpret('Compare https://a.example and https://b.example')));
test('rejects embedded credentials',()=>assert.throws(()=>interpret('Open https://name:secret@example.org')));
test('accepts explicit browser tasks without an inline link',()=>assert.equal(interpret('Summarize this page','browse','https://example.org').mode,'browse'));
