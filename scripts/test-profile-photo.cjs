const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const jpeg = require('jpeg-js'), babel = require('@babel/core');
const source = fs.readFileSync('supabase/functions/cba-portal/index.ts','utf8');
const {code} = babel.transformSync(source,{filename:'index.ts',configFile:false,babelrc:false,presets:['@babel/preset-typescript'],plugins:['@babel/plugin-transform-modules-commonjs']});
const url='https://test.supabase.co', id='11111111-1111-4111-8111-111111111111';
const oldPath=`${id}/22222222-2222-4222-8222-222222222222.jpg`, oldUrl=`${url}/storage/v1/object/public/profile-photos/${oldPath}`;
let handler, account, validSession, uploadError, dbError, conflict, writes, uploads, removals;
const reset=()=>{validSession=true;uploadError=dbError=conflict=false;writes=[];uploads=[];removals=[];account={id:'own-account',status:'approved',role:'MEMBER',athlete_id:id,athletes:{name:'Own',photo_url:oldUrl}}};
const db={storage:{from(name){assert.equal(name,'profile-photos');return {async upload(path,bytes,options){uploads.push({path,bytes,options});return {error:uploadError?new Error('storage failed'):null}},getPublicUrl(path){return {data:{publicUrl:`${url}/storage/v1/object/public/profile-photos/${path}`}}},async remove(paths){removals.push(...paths);return {error:null}}}}},from(table){const filters={};let row;const q={select(){return q},eq(k,v){filters[k]=v;return q},is(k,v){filters[k]=v;return q},update(value){row=value;return q},async insert(){return {error:null}},async maybeSingle(){if(table==='app_sessions')return {data:validSession?{account_id:account.id,expires_at:'2099-01-01'}:null};if(table==='accounts')return {data:account};assert.equal(table,'athletes');writes.push({filters,row});return {data:conflict?null:{...account.athletes,...row},error:dbError?new Error('db failed'):null}},then(resolve,reject){return Promise.resolve({data:null,error:null}).then(resolve,reject)}};return q}};
vm.runInNewContext(code,{require:name=>name.includes('jpeg-js')?jpeg:{createClient:()=>db},Deno:{env:{get:()=>url},serve:fn=>handler=fn},crypto:webcrypto,TextEncoder,TextDecoder,Request,Response,URL,console,atob});
const call=async payload=>{const response=await handler(new Request('https://example.test',{method:'POST',body:JSON.stringify({token:'a'.repeat(64),...payload})}));return {status:response.status,data:await response.json()}};
const photo=(w=64,h=64)=>jpeg.encode({width:w,height:h,data:Buffer.alloc(w*h*4,180)},85).data.toString('base64');
(async()=>{
 reset();let r=await call({action:'uploadMyPhoto',imageBase64:photo()});assert.equal(r.status,200);assert.equal(writes[0].filters.id,id);assert.equal(writes[0].filters.photo_url,oldUrl);assert.deepEqual(removals,[oldPath]);assert.ok(uploads[0].path.startsWith(id+'/'));assert.equal(uploads[0].options.upsert,false);assert.equal(jpeg.decode(uploads[0].bytes).width,64);
 for(const extra of [{athleteId:'other'},{path:'other.jpg'},{photoUrl:'https://evil.test'}]){reset();r=await call({action:'uploadMyPhoto',imageBase64:photo(),...extra});assert.equal(r.status,400);assert.equal(uploads.length,0)}
 for(const imageBase64 of ['not an image',Buffer.from('<svg/>').toString('base64'),photo(80,64),photo(769,769),'A'.repeat(1400004)]){reset();r=await call({action:'uploadMyPhoto',imageBase64});assert.equal(r.status,400);assert.equal(uploads.length,0)}
 reset();validSession=false;r=await call({action:'uploadMyPhoto',imageBase64:photo()});assert.equal(r.status,401);assert.equal(uploads.length,0);
 reset();account.status='blocked';r=await call({action:'removeMyPhoto'});assert.equal(r.status,403);assert.equal(writes.length,0);
 reset();account.athlete_id=null;r=await call({action:'uploadMyPhoto',imageBase64:photo()});assert.equal(r.status,409);assert.equal(uploads.length,0);
 reset();uploadError=true;r=await call({action:'uploadMyPhoto',imageBase64:photo()});assert.equal(r.status,502);assert.equal(writes.length,0);assert.equal(removals.length,0);
 reset();dbError=true;r=await call({action:'uploadMyPhoto',imageBase64:photo()});assert.equal(r.status,500);assert.deepEqual(removals,[uploads[0].path]);
 reset();conflict=true;r=await call({action:'uploadMyPhoto',imageBase64:photo()});assert.equal(r.status,409);assert.deepEqual(removals,[uploads[0].path]);
 reset();account.athletes.photo_url=`${url}/storage/v1/object/public/profile-photos/33333333-3333-4333-8333-333333333333/44444444-4444-4444-8444-444444444444.jpg`;r=await call({action:'removeMyPhoto'});assert.equal(r.status,200);assert.equal(writes[0].row.photo_url,null);assert.equal(removals.length,0);
 reset();r=await call({action:'removeMyPhoto'});assert.equal(r.status,200);assert.deepEqual(removals,[oldPath]);
 reset();r=await call({action:'uploadMyPhoto',imageBase64:'A'.repeat(2100000)});assert.equal(r.status,413);assert.equal(uploads.length,0);
 reset();const original=Buffer.from(photo(),'base64');r=await call({action:'uploadMyPhoto',imageBase64:Buffer.concat([original,Buffer.from('PRIVATE-TRAILING-METADATA')]).toString('base64')});assert.equal(r.status,200);assert.equal(Buffer.from(uploads[0].bytes).includes(Buffer.from('PRIVATE-TRAILING-METADATA')),false);
 console.log('Fotos: sessão, vínculo, conteúdo, tamanho, metadados, concorrência, falhas e remoção verificados.');
})().catch(error=>{console.error(error);process.exitCode=1});
