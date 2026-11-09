const workspace="https://deskpa-workstation.grassycaper.chatgpt.site";
function normal(raw){
 const u=new URL(raw);
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password||u.origin===workspace)throw Error("Choose an external HTTP or HTTPS page.");
 return u.href;
}
function readPage(){
 const nodes=[...document.querySelectorAll('a[href],button,textarea,select,input:not([type=hidden]),[role=button]')].filter(e=>e.checkVisibility()&&!e.disabled).slice(0,120);
 const token=Array.from(crypto.getRandomValues(new Uint32Array(4))).join("-");
 globalThis.deskpaControls={nodes,token};
 const controls=nodes.map((e,i)=>({id:i+1,tag:e.tagName.toLowerCase(),type:e.type||"",name:(e.labels?.[0]?.innerText||e.getAttribute("aria-label")||e.placeholder||e.innerText||e.name||e.tagName).trim().slice(0,100),filled:!!e.value,options:e.options?[...e.options].slice(0,40).map(o=>o.text):[]}));
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n,parts=[],size=0;
 while((n=walker.nextNode())&&size<12000){const e=n.parentElement,t=n.textContent.trim();if(t&&e&&!e.closest('input,textarea,select,[contenteditable],script,style,noscript,[hidden],[aria-hidden=true]')&&e.checkVisibility()){parts.push(t);size+=t.length}}
 return {token,title:document.title,site:location.host,text:parts.join(' ').slice(0,12000),controls};
}
function operate(step){
 const saved=globalThis.deskpaControls,e=saved?.nodes[step.id-1];
 if(!e?.isConnected||saved.token!==step.token||!e.checkVisibility())throw Error("Page changed. Resume to inspect it again.");
 if(step.action==="click"){if(e.target==="_blank"&&e.tagName==="A")e.target="_self"; e.click();return true}
 if(!["fill","select"].includes(step.action)||typeof step.value!=="string")throw Error("Unsupported action.");
 if(/password|one.time|otp|cc-|credit.card|security.code/i.test([e.type,e.name,e.autocomplete,e.labels?.[0]?.innerText].join(" "))||e.type==="file")throw Error("Enter this sensitive field yourself and resume.");
 if(step.action==="select"){if(!(e instanceof HTMLSelectElement))throw Error("Select field changed.");const opt=[...e.options].find(o=>o.text===step.value);if(!opt)throw Error("Option unavailable.");e.value=opt.value}
 else{if(!(e instanceof HTMLInputElement||e instanceof HTMLTextAreaElement)||["checkbox","radio","button","submit"].includes(e.type))throw Error("This control needs manual input.");Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e),"value").set.call(e,step.value)}
 e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));return true;
}
chrome.runtime.onMessage.addListener((msg,sender,send)=>{
 if(sender.origin!==workspace||!sender.tab?.id||sender.frameId!==0)return;
 (async()=>{
 const {command,args}=msg;const slot="workspace-"+sender.tab.id;
 if(command==="ping")return true;
 if(command==="open"){const tab=await chrome.tabs.create({url:normal(args.url),active:true});await chrome.storage.session.set({[slot]:{id:tab.id,run:args.run}});return true}
 const linked=(await chrome.storage.session.get(slot))[slot];
 if(!linked||linked.run!==args.run)throw Error("Task tab is disconnected. Open the task link again to reconnect.");
 const tab=await chrome.tabs.get(linked.id);normal(tab.pendingUrl||tab.url);
 if(command==="focus"){await chrome.tabs.update(tab.id,{active:true});return true}
 if(command!=="observe"&&command!=="act")throw Error("Unknown command.");
 if(tab.status==="loading")throw Error("Task page is loading. Resume once it is visible.");
 const injection=command==="observe"?{func:readPage}:{func:operate,args:[args.step]};
 const [result]=await chrome.scripting.executeScript({target:{tabId:tab.id},...injection});
 if(result?.error||result?.result==null)throw Error("Page action could not be verified. Check the task tab.");
 return result.result;
 })().then(value=>send({value})).catch(e=>send({error:e.message}));return true;
});
