import {providers} from "/catalog.js";
import {interpret} from "/task.js";
const $=id=>document.getElementById(id);
function load(key,def){try{return JSON.parse(localStorage.getItem("deskpa."+key))??def}catch{return def}}
function persist(key,value){localStorage.setItem("deskpa."+key,JSON.stringify(value))}
const keys={},tested={},pending=new Map();
let order=[...new Set([...load("order",[]),...Object.keys(providers)])].filter(id=>Object.hasOwn(providers,id));
let records=load("tasks",[]),current=null,busy=false,paused=false,mode="auto",connected=false,noticeTimer;
function note(s){$("notice").textContent=s;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$("notice").textContent="",6000)}
function el(tag,text,cls){const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e}
function button(text,fn,cls){const b=el("button",text,cls);b.onclick=fn;return b}
function view(id){for(const v of document.querySelectorAll(".view"))v.hidden=v.id!==id;document.querySelectorAll(".navlinks button").forEach(b=>b.classList.toggle("active",b.dataset.view===id));$("crumb").textContent={workspace:"Workspace",history:"Task history",settings:"Settings"}[id];if(id==="history")historyView();window.scrollTo(0,0)}
document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>view(b.dataset.view));
$("setup").onclick=()=>view("settings");
$("companionLink").onclick=()=>{view("settings");$("companionPanel").scrollIntoView()};
function profile(){const map={};for(const line of $("profile").value.split("\n").filter(s=>s.trim())){const i=line.indexOf("=");if(i<1||!line.slice(i+1).trim())throw Error("Use alias=value in the local profile.");map[line.slice(0,i).trim()]=line.slice(i+1).trim()}return map}
function redact(text){for(const [k,v] of Object.entries(profile()).sort((a,b)=>b[1].length-a[1].length))text=text.split(v).join("@"+k);return text}
function mini(){const list=$("mini");list.replaceChildren();for(const id of order){const row=el("div",null,"mini");row.append(el("strong",providers[id].name),el("small",tested[id]?"Tested":keys[id]?"Key entered":"No key"));list.append(row)}}
async function request(id,mode,input){
 const response=await fetch("/api/infer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({provider:id,key:keys[id],mode,input})});
 const data=await response.json().catch(()=>({error:"Service unavailable."}));if(!response.ok)throw Error(data.error||"Request failed.");return data.answer;
}
function settings(){const list=$("providerList");list.replaceChildren();order.forEach((id,i)=>{
 const p=providers[id],box=el("section",null,"provider"),head=el("div",null,"row"),name=el("strong",p.name),desc=el("small",p.label),up=button("↑",()=>{[order[i-1],order[i]]=[order[i],order[i-1]];persist("order",order);settings()}, "");up.disabled=!i;up.setAttribute("aria-label","Move "+p.name+" earlier");head.append(name,desc,up);
 const row=el("div",null,"row"),input=el("input");input.type="password";input.autocomplete="off";input.placeholder="Paste "+p.name+" API key";input.value=keys[id]||"";input.setAttribute("aria-label",p.name+" API key");input.oninput=()=>{keys[id]=input.value.trim();tested[id]=false;mini()};
 const status=el("small",tested[id]?"Connection verified":"");
 const test=button("Test key",async()=>{if(!keys[id])return note("Paste a key first.");const old=keys[id];test.disabled=true;status.textContent="Testing…";try{await request(id,"test","Reply OK.");if(keys[id]===old){tested[id]=true;status.textContent="Connection verified"}}catch(e){status.textContent=e.message}finally{test.disabled=false;mini()}});
 const link=el("a","Get API key ↗");link.href=p.keys;link.target="_blank";link.rel="noreferrer";row.append(input,test);box.append(head,row,link,document.createTextNode("  "),status);list.append(box);
 });mini()}
function setMode(m){mode=m;$("auto").classList.toggle("on",m==="auto");$("ask").classList.toggle("on",m==="ask");$("browse").classList.toggle("on",m==="browse");$("browserFields").hidden=m!=="browse";$("modehint").textContent=m==="auto"?"A link opens a browser task.":m==="ask"?"English or Telugu-in-English":"Page text is shared with your configured AI."}
$("auto").onclick=()=>setMode("auto");$("ask").onclick=()=>setMode("ask");$("browse").onclick=()=>setMode("browse");
window.addEventListener("message",e=>{if(e.origin!==location.origin||e.source!==window||e.data?.deskpa!=="reply")return;const fn=pending.get(e.data.id);if(fn)fn(e.data)});
function bridge(command,args={},timeout=9000){return new Promise((ok,fail)=>{const id=crypto.randomUUID();const timer=setTimeout(()=>{pending.delete(id);fail(Error("Browser companion did not respond. Check Settings → Connect your browser."))},timeout);pending.set(id,data=>{clearTimeout(timer);pending.delete(id);data.error?fail(Error(data.error)):ok(data.value)});window.postMessage({deskpa:"request",id,command,args},location.origin)})}
async function ping(){try{connected=await bridge("ping",{},700)}catch{connected=false}$("companionStatus").textContent=connected?"Connected to this browser.":"Set up the companion to work in a live browser tab."}
function stash(){const i=records.findIndex(r=>r.id===current.id);if(i<0)records.unshift(current);else records[i]=current;records=records.slice(0,35);persist("tasks",records);draw()}
function log(s){current.log.push(s);stash()}
function state(status,output){current.status=status;current.output=output;stash()}
function historyView(){const list=$("historyList");list.replaceChildren();if(!records.length){list.append(el("p","Your completed and paused tasks will appear here."));return}for(const r of records){const item=el("div",null,"historyrow");item.append(el("strong",r.goal),el("div",new Date(r.time).toLocaleString()+" · "+r.status,"muted"),button("Open task",()=>{if(busy)return note("Pause the running task first.");current=r;view("workspace");draw()}));list.append(item)}}
function draw(){
 $("result").hidden=!current;$("run").disabled=busy;if(!current)return;
 $("output").textContent=current.output||"Working…";$("status").textContent=current.status;
 $("logs").replaceChildren(...current.log.map(s=>el("li",s)));const a=$("actions");a.replaceChildren();
 if(busy){a.append(button("Pause",()=>{paused=true;note("Pausing at the next step boundary.")}));return}
 if(["browse","open"].includes(current.mode) && !current.opened){
   const target=new URL(current.url);
   if(["https:","http:"].includes(target.protocol)){
     const link=el("a","Open starting link ↗","primary");
     link.href=target.href;link.target="_blank";link.rel="noopener noreferrer";
     link.onclick=()=>{
       log("Requested starting link in a separate tab: "+target.hostname);
       if(current.mode==="open") state("Opened","Requested the page in a new tab.");
     };
     a.append(link);
   }
 }
 if(current.status==="Done"||current.mode==="open")return;
 if(current.mode==="browse"&&current.opened)a.append(button("View task tab",()=>bridge("focus",{run:current.id}).catch(e=>note(e.message))));
 if(current.pending){a.append(button("I checked the outcome",()=>{log("User reviewed uncertain action: "+current.pending);current.pending=null;state("Paused","Continue after checking the website.")}));return}
 if(current.proposal){a.append(button("Approve action",()=>execute(true),"primary"),button("Skip action",()=>{current.proposal=null;state("Paused","Action skipped. Use the task tab manually, then resume.")}));}
 else a.append(button("Resume",()=>execute(false),"primary"));
 if(current.mode==="browse"&&current.opened)a.append(button("Reconnect tab",async()=>{if(!confirm("Reopen the starting link in a new task tab? Check prior actions before continuing."))return;try{await bridge("open",{url:current.url,run:current.id});current.proposal=null;state("Paused","Task tab reopened. Check the page, then resume.")}catch(e){note(e.message)}}));
}
async function infer(m,input){let attempted=false;for(const id of [...order]){if(!keys[id])continue;attempted=true;try{const a=await request(id,m,input);if(m==="plan"){const clean=a.trim().replace(/^\x60{3}(?:json)?\s*/i,"").replace(/\s*\x60{3}$/,"");const step=JSON.parse(clean);if(!["done","manual","fill","select","click"].includes(step?.action))throw Error("Invalid browser step.");log(providers[id].name+" planned a step.");return step}log(providers[id].name+" responded.");return a}catch(e){log(providers[id].name+" · "+e.message);if(paused)break}}throw Error(attempted?"Configured providers could not finish. Check the activity log and resume.":"Add a provider key in Settings and resume.")}
async function observe(){let last;for(let i=0;i<6;i++){try{return await bridge("observe",{run:current.id})}catch(e){last=e;if(!/loading|cannot access/i.test(e.message))throw e;await new Promise(r=>setTimeout(r,650))}}throw last}
async function execute(approve){
 if(busy||!current)return;busy=true;paused=false;draw();
 try{
 const missing=[];
 if(!order.some(k=>keys[k]))missing.push("add an AI provider key");
 if(current.mode==="browse"){await ping();if(!connected)missing.push("connect the browser companion")}
 if(missing.length)throw Error("In Settings, "+missing.join(" and ")+". Then resume this task.");
 if(current.mode==="ask"){const a=await infer("ask",redact(current.goal));state(paused?"Paused":"Done",a);return}
 if(!current.opened){await bridge("open",{url:current.url,run:current.id});current.opened=true;log("Opened task tab.");await new Promise(r=>setTimeout(r,850))}
 if(approve&&current.proposal){
 const step={...current.proposal.step},title=current.proposal.title,fingerprint=current.proposal.fingerprint;
 if(step.action==="fill"&&step.value?.startsWith("@")){const value=profile()[step.value.slice(1)];if(!value)throw Error("Add "+step.value+" to the local profile in Settings.");step.value=value}
 current.proposal=null;current.pending=title;current.used.push(fingerprint);stash();
 await bridge("act",{run:current.id,step});current.pending=null;log("Executed: "+title);await new Promise(r=>setTimeout(r,800));
 }
 const page=await observe();const {token,...pageData}=page;
 if(paused)return state("Paused","Task paused.");
 const step=await infer("plan",redact(JSON.stringify({task:current.goal,page:pageData,history:current.log.slice(-18),aliases:Object.keys(profile())})));
 if(paused)return state("Paused","Task paused before the next step.");
 if(step.action==="manual")return state("Needs you",String(step.message||"Check the task tab, then resume."));
 if(step.action==="done"){const evidence=String(step.evidence||"").trim();if(!evidence||![page.title,page.text,...page.controls.map(c=>c.name)].some(s=>s.includes(evidence)))throw Error("The suggested result could not be verified on the current page.");return state("Done",String(step.message)+"\n\nPage evidence: "+evidence)}
 const control=page.controls.find(c=>c.id===step.id);if(!control)throw Error("Control changed. Resume to inspect again.");
 const title=step.action+" “"+control.name+"” on "+page.site;
 const fingerprint=title+" · "+page.title;
 if(step.action==="click"&&current.used.includes(fingerprint))throw Error("This control was already activated. Inspect the result manually.");
 if(step.action!=="click"&&typeof step.value!=="string")throw Error("Model returned an incomplete field value.");
 current.proposal={step:{...step,token},title,fingerprint};
 state("Review action",title+(step.action!=="click"?"\nValue: "+step.value:""));
 }catch(e){state("Paused",e.message)}finally{busy=false;draw()}
}
$("run").onclick=()=>{
 if(busy)return;
 let task;
 try{task=interpret($("goal").value,mode,mode==="browse"?$("url").value.trim():"")}
 catch(error){return note(error.message)}
 current={...task,id:crypto.randomUUID(),time:Date.now(),log:[],used:[],status:"Ready",output:"",opened:false,proposal:null,pending:null};
 if(task.mode==="open"){
   const tab=window.open("about:blank","_blank");
   if(!tab){state("Needs you","Use Open starting link below to open this page.");return}
   tab.opener=null;
   tab.location.replace(task.url);
   state("Opened","Requested "+new URL(task.url).hostname+" in a new tab.");
   return;
 }
 stash();
 execute(false);
};
settings();ping();if(records.length){current=records[0];draw()}
