const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const babel=require('@babel/core');
const {webcrypto}=require('node:crypto');

const source=fs.readFileSync(path.join(__dirname,'../supabase/functions/cba-admin/index.ts'),'utf8');
assert.match(source,/case 'intelligenceDashboard'/);
const {code}=babel.transformSync(source,{
 filename:'cba-admin-index.ts',configFile:false,babelrc:false,
 presets:['@babel/preset-typescript'],plugins:['@babel/plugin-transform-modules-commonjs']
});
const ownerId='66ea4f7f-f82f-40f5-a82d-cf178cbb84fb';
let currentAccount={
 id:ownerId,email:'vinicius.m84@gmail.com',role:'SUPER_ADMIN',status:'approved',
 athlete_id:'7092ab86-f6c2-4c53-b9cf-e04c1b4bb296'
};
const rows={
 athletes:[
  {id:'a1',name:'Atleta A',active:true},{id:'a2',name:'Atleta B',active:true}
 ],
 accounts:[
  {id:ownerId,athlete_id:'a1',role:'SUPER_ADMIN',status:'approved'},
  {id:'ordinary',athlete_id:'a2',role:'MEMBER',status:'approved'}
 ],
 attendance_records:[
  {athlete_id:'a1',attendance_date:'2026-10-11',status:'present',source:'legacy_sheet'},
  {athlete_id:'a1',attendance_date:'2026-10-18',status:'present',source:'admin_console'},
  {athlete_id:'a2',attendance_date:'2026-10-18',status:'absent',source:'admin_console'}
 ],
 round_matches:[{id:'round1',match_date:'2026-10-18',black_score:12,green_score:8,winner:'black'}],
 match_player_stats:[
  {match_id:'round1',athlete_id:'a1',pts2:2,pts3:1,reb:3,ast:1,blk:0},
  {match_id:'round1',athlete_id:'a2',pts2:1,pts3:0,reb:1,ast:0,blk:0}
 ],
 member_dues:[
  {athlete_id:'a1',period_id:'p2026',amount_due:20,amount_paid:20,status:'paid'},
  {athlete_id:'a2',period_id:'p2026',amount_due:20,amount_paid:0,status:'pending'},
  {athlete_id:'a2',period_id:'p2025',amount_due:30,amount_paid:0,status:'pending'}
 ],
 finance_periods:[{id:'p2026',year:2026,month:10},{id:'p2025',year:2025,month:12}],
 finance_entries:[
  {occurred_on:'2026-10-18',kind:'revenue',amount:40,category:'contribuições'},
  {occurred_on:'2026-10-18',kind:'expense',amount:10,category:'locação'}
 ],
 cba_access_history:[{account_id:ownerId,started_at:'2026-10-18T14:00:00Z',device_type:'celular',app_mode:'pwa'}],
 cba_usage_events:[{account_id:ownerId,tab_key:'inicio',created_at:'2026-10-18T14:15:00Z'}],
 cba_usage_preferences:[{account_id:ownerId,analytics_opt_in:true}]
};

const fakeDb={
 from(table){
  const filters=[],orders=[];
  let offset=0,to=null;
  const query={
   select(){return query;},
   eq(field,value){filters.push(row=>row[field]===value);return query;},
   gte(field,value){filters.push(row=>String(row[field]||'')>=String(value));return query;},
   lte(field,value){filters.push(row=>String(row[field]||'')<=String(value));return query;},
   order(field,config){orders.push({field,asc:config?.ascending!==false});return query;},
   range(a,b){offset=a;to=b;return Promise.resolve(read());},
   limit(n){to=n-1;return query;},
   update(){return query;},
   async maybeSingle(){
    if(table==='app_sessions')return {data:{account_id:currentAccount.id,expires_at:'2099-01-01T00:00:00Z'},error:null};
    if(table==='accounts')return {data:currentAccount,error:null};
    throw Error('Unexpected maybeSingle '+table);
   },
   then(resolve,reject){return Promise.resolve(read()).then(resolve,reject);}
  };
  function read(){
   const source=table==='accounts'?rows.accounts:rows[table];
   if(!source) return {data:[],error:null};
   const arr=source.filter(row=>filters.every(fn=>fn(row))).slice();
   if(orders.length)arr.sort((a,b)=>{
    for(const {field,asc} of orders){
     const av=String(a[field]??''),bv=String(b[field]??'');
     const cmp=av.localeCompare(bv);
     if(cmp!==0)return asc?cmp:-cmp;
    }
    return 0;
   });
   return {data:arr.slice(offset,to===null?undefined:to+1),error:null};
  }
  return query;
 }
};
let handler;
vm.runInNewContext(code,{
 require:(specifier)=>{
  assert.match(specifier,/supabase-js/);
  return {createClient:()=>fakeDb};
 },
 exports:{},
 Deno:{env:{get:key=>({SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'test'})[key]},serve:fn=>{handler=fn;}},
 crypto:webcrypto,Response,Request,TextEncoder,Uint8Array,Date,console,Intl,atob,btoa
});
const invoke=async(year=2026)=>{
 const response=await handler(new Request('https://test.invalid/functions/v1/cba-admin',{
  method:'POST',body:JSON.stringify({action:'intelligenceDashboard',token:'a'.repeat(64),year})
 }));
 return {status:response.status,body:await response.json()};
};
(async()=>{
 let r=await invoke();
 assert.equal(r.status,200);
 assert.equal(r.body.data.engagement.activeAthletes,2);
 assert.equal(r.body.data.engagement.sessions,1);
 assert.equal(r.body.data.attendance.records,3);
 assert.equal(r.body.data.attendance.totalPresent,2);
 assert.equal(r.body.data.sports.matches,1);
 assert.equal(r.body.data.sports.performers[0].points,7);
 assert.equal(r.body.data.finance.due,40,'Only 2026 monthly dues counted');
 assert.equal(r.body.data.finance.paid,20);
 assert.equal(r.body.data.finance.receipts,40,'Finance ledger is separate from dues');
 assert.equal(r.body.data.finance.expenses,10);
 assert.equal(r.body.data.finance.ledgerBalance,30);
 assert.equal(r.body.data.engagement.consentedUsers,1);
 assert.doesNotMatch(JSON.stringify(r.body.data),/vinicius.m84@gmail.com/);
 assert.doesNotMatch(JSON.stringify(r.body.data),/session_hash/);
 r=await invoke(2019);assert.equal(r.status,400);

 currentAccount={...currentAccount,role:'ADMIN'};
 r=await invoke();assert.equal(r.status,403,'ADMIN cannot see intelligence');
 currentAccount={...currentAccount,role:'MEMBER'};
 r=await invoke();assert.equal(r.status,403,'MEMBER cannot see intelligence');
 currentAccount={...currentAccount,role:'SUPER_ADMIN',id:'different-account'};
 r=await invoke();assert.equal(r.status,403,'SUPER_ADMIN with wrong identity cannot see intelligence');
 console.log('Intelligence API contract: metrics, years, identity protection, and privacy passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
