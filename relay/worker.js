const FORM_URL="https://forms.guest.usercontent.microsoft/formapi/api/6e68e7f4-e285-46f8-8984-47cf58f2d6a8/users/dbb53c17-3ac8-4998-8eb3-59723898d2ad/forms('9OdoboXi-EaJhEfPWPLWqBc8tdvIOphJjrNZcjiY0q1UMEFEM0I5TDVXR1hZRTQ4QlNaR1NDWUdJWS4u')/responses";
const Q_CODE="r47201a16dbe7497a85a581c92d04077d";const Q_CONSENT="r1add92437e384c04b6f0e15bb5086b9f";const CONSENT="أوافق";
const ORIGINS=["https://assadi50.github.io"];const KEY_HASH="160b1acef33cb55315d66c778bb91f5a0dcae2264ba67c9b20fc535c97275403";
const FULL=/^DDL2-(\d{38})(\d{2})-([A-Z2-9]{6})(-[A-Z0-9]{1,10})?$/;const PART=/^DDLP-[0-9X]{38}-[A-Z2-9]{6}-S\d(-[A-Z0-9]{1,10})?$/;
const STAGES=["single","married_nokids","married_kids","carer"];
const W={single:[.15,.35,.25,.25],married_nokids:[.25,.25,.2,.3],married_kids:[.35,.2,.15,.3],carer:[.3,.25,.2,.25]};
function valid(code){const m=FULL.exec(code);if(!m){return PART.test(code);}let c=0;for(let i=0;i<38;i++){c+=Number(m[1][i])*(i+1);}return c%97===Number(m[2]);}
async function sha(s){const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");}
async function all(env){const out=[];let cursor;do{const r=await env.RESULTS.list({prefix:"r:",cursor:cursor});for(const k of r.keys){if(k.metadata){out.push(k.metadata);}}cursor=r.list_complete?null:r.cursor;}while(cursor);return out;}
function baseline(rows){const first={};for(const r of rows){const m=FULL.exec(r.c);if(!m){continue;}const d=m[1],pid=m[3],seq=Number(d[36]);if(!first[pid]||seq<first[pid].seq){first[pid]={seq:seq,d:d};}}
const acc={};for(const s of STAGES){acc[s]={n:0,family:0,health:0,social:0,digital:0,idx:0,qol:0};}
for(const pid in first){const d=first[pid].d;const s=STAGES[Number(d[0])];if(!s){continue;}const dim=a=>(Number(d[a])+Number(d[a+1])+Number(d[a+2]))*100/9;const v=[dim(1),dim(4),dim(7),dim(10)];const w=W[s];
let who=0;for(let i=21;i<26;i++){who+=Number(d[i]);}const qol=.4*who*4+.3*Number(d.slice(26,28))*10+.3*Number(d.slice(28,30))*10;const e=acc[s];e.n++;e.family+=v[0];e.health+=v[1];e.social+=v[2];e.digital+=v[3];e.idx+=v[0]*w[0]+v[1]*w[1]+v[2]*w[2]+v[3]*w[3];e.qol+=qol;}
for(const s of STAGES){const e=acc[s];if(e.n){for(const k of ["family","health","social","digital","idx","qol"]){e[k]=Math.round(e[k]/e.n*10)/10;}}}return acc;}
export default{async fetch(request,env){const url=new URL(request.url);const origin=request.headers.get("Origin")||"";
const cors={"Access-Control-Allow-Origin":ORIGINS.includes(origin)?origin:ORIGINS[0],"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type, X-Key","Vary":"Origin"};
const json=(obj,status)=>new Response(JSON.stringify(obj),{status:status,headers:Object.assign({},cors,{"Content-Type":"application/json","Cache-Control":"no-store"})});
if(request.method==="OPTIONS"){return new Response(null,{status:204,headers:cors});}
const keyOk=async()=>(await sha(request.headers.get("X-Key")||url.searchParams.get("k")||""))===KEY_HASH;
if(request.method==="GET"){if(url.pathname==="/results"){if(!(await keyOk())){return json({ok:false,error:"key"},401);}return json({ok:true,rows:await all(env)},200);}
if(url.pathname==="/baseline"){let c=await env.RESULTS.get("agg",{type:"json"});if(!c||Date.now()-Date.parse(c.updated)>600000){c={updated:new Date().toISOString(),min_n:20,demo:false,stages:baseline(await all(env))};await env.RESULTS.put("agg",JSON.stringify(c));}return json(c,200);}return json({ok:true,service:"ddl-relay"},200);}
if(request.method!=="POST"){return json({ok:false},405);}if(origin&&!ORIGINS.includes(origin)){return json({ok:false,error:"origin"},403);}
let code="";try{const text=(await request.text()).slice(0,400);try{code=JSON.parse(text).code;}catch(e){code=text;}}catch(e){}code=String(code||"").trim().toUpperCase();
if(!valid(code)){return json({ok:false,error:"code"},400);}const now=new Date();
await env.RESULTS.put("r:"+now.getTime()+":"+crypto.randomUUID().slice(0,8),"",{metadata:{c:code,t:now.toISOString()}});
if(url.pathname==="/import"&&(await keyOk())){return json({ok:true,stored:true},200);}
const body={startDate:new Date(now.getTime()-60000).toISOString(),submitDate:now.toISOString(),answers:JSON.stringify([{questionId:Q_CODE,answer1:code},{questionId:Q_CONSENT,answer1:CONSENT}])};
const r=await fetch(FORM_URL,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","x-correlationid":crypto.randomUUID(),"x-ms-form-request-ring":"business","x-ms-form-request-source":"ms-formweb"},body:JSON.stringify(body)});
return json({ok:r.ok,status:r.status},r.ok?200:502);}};
