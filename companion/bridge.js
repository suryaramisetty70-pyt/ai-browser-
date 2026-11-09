window.addEventListener("message",async e=>{
 if(e.source!==window||e.origin!==location.origin||e.data?.deskpa!=="request")return;
 const {id,command,args}=e.data;
 try{const result=await chrome.runtime.sendMessage({command,args});window.postMessage({deskpa:"reply",id,...result},location.origin)}
 catch{window.postMessage({deskpa:"reply",id,error:"Reload DeskPA after enabling the companion."},location.origin)}
});
