(() => {
const KEY="simplex_solleciti_v1";
const $=id=>document.getElementById(id);
const form=$("reminderForm"),list=$("list"),empty=$("emptyState"),template=$("itemTemplate");
let items=load(),deferredPrompt=null;
function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function save(){localStorage.setItem(KEY,JSON.stringify(items))}
function makeId(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function today(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function parseDate(v){const p=v.split("-").map(Number);return new Date(p[0],p[1]-1,p[2])}
function dayDiff(v){return Math.round((parseDate(v)-today())/86400000)}
function fmtDate(v){return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(parseDate(v))}
function fmtMoney(v){return v==null||v===""?"":new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v))}
function cleanPhone(v){return (v||"").replace(/\D/g,"")}
function draft(){return {client:$("client").value.trim(),phone:$("phone").value.trim(),type:$("type").value,dueDate:$("dueDate").value,subject:$("subject").value.trim(),amount:$("amount").value,notes:$("notes").value.trim()}}
function makeMessage(x){
 const amount=(x.amount!==""&&x.amount!=null)?" per l'importo di "+fmtMoney(x.amount):"";
 const date=x.dueDate?" entro il "+fmtDate(x.dueDate):"";
 let intro="ti ricordo";
 if(x.type==="Pagamento")intro="ti ricordo il pagamento relativo a";
 else if(x.type==="Documento da ricevere")intro="ti ricordo che sto aspettando";
 else if(x.type==="Conferma preventivo")intro="ti ricordo la conferma relativa a";
 else if(x.type==="Conferma appuntamento")intro="ti ricordo la conferma dell'appuntamento per";
 else if(x.type==="Richiamare")intro="ti ricontatto per";
 return "Ciao "+(x.client||"")+", "+intro+" "+(x.subject||"")+amount+date+". Quando puoi, fammi sapere. Grazie.";
}
function stateOf(x){
 if(x.resolved)return {label:"Risolto",cls:"done"};
 if(dayDiff(x.dueDate)<0)return {label:"Scaduto",cls:"overdue"};
 if(x.sendCount>0)return {label:"Sollecitato",cls:"sent"};
 if(dayDiff(x.dueDate)===0)return {label:"Oggi",cls:""};
 return {label:x.type,cls:""};
}
function updateSummary(){
 $("overdueCount").textContent=items.filter(x=>!x.resolved&&dayDiff(x.dueDate)<0).length;
 $("todayCount").textContent=items.filter(x=>!x.resolved&&dayDiff(x.dueDate)===0).length;
 $("sentCount").textContent=items.filter(x=>!x.resolved&&x.sendCount>0).length;
 $("doneCount").textContent=items.filter(x=>x.resolved).length;
}
function filtered(){
 const f=$("filter").value;
 const a=[...items].sort((x,y)=>x.dueDate.localeCompare(y.dueDate)||x.client.localeCompare(y.client));
 if(f==="active")return a.filter(x=>!x.resolved);
 if(f==="overdue")return a.filter(x=>!x.resolved&&dayDiff(x.dueDate)<0);
 if(f==="sent")return a.filter(x=>!x.resolved&&x.sendCount>0);
 if(f==="done")return a.filter(x=>x.resolved);
 return a;
}
function render(){
 list.innerHTML="";
 const data=filtered();
 empty.classList.toggle("hidden",data.length>0);
 data.forEach(x=>{
   const node=template.content.firstElementChild.cloneNode(true),st=stateOf(x);
   node.classList.toggle("overdue",!x.resolved&&dayDiff(x.dueDate)<0);
   node.classList.toggle("sent",!x.resolved&&x.sendCount>0);
   node.classList.toggle("resolved",!!x.resolved);
   node.querySelector(".item-client").textContent=x.client;
   node.querySelector(".item-subject").textContent=x.subject;
   const badge=node.querySelector(".badge");badge.textContent=st.label;if(st.cls)badge.classList.add(st.cls);
   const meta=[fmtDate(x.dueDate),x.type];if(x.amount!==""&&x.amount!=null)meta.push(fmtMoney(x.amount));
   node.querySelector(".item-meta").textContent=meta.join(" · ");
   node.querySelector(".item-notes").textContent=x.notes||"";
   node.querySelector(".history").textContent=x.sendCount?"Solleciti inviati: "+x.sendCount+" · ultimo "+new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(x.lastSentAt)):"Mai sollecitato";
   node.querySelector(".whatsapp").disabled=x.resolved;
   node.querySelector(".whatsapp").onclick=()=>sendWhatsApp(x.id);
   node.querySelector(".copy").onclick=()=>copyText(x.id);
   const done=node.querySelector(".done");done.textContent=x.resolved?"Riapri":"Risolto";done.onclick=()=>toggleDone(x.id);
   node.querySelector(".edit").onclick=()=>editItem(x.id);
   node.querySelector(".delete").onclick=()=>deleteItem(x.id);
   list.appendChild(node);
 });
 updateSummary();
}
function resetForm(){form.reset();$("editId").value="";$("dueDate").value=new Date().toISOString().slice(0,10);$("message").value=makeMessage(draft())}
function showForm(){form.classList.remove("hidden");$("toggleForm").classList.add("hidden");$("client").focus()}
function hideForm(){form.classList.add("hidden");$("toggleForm").classList.remove("hidden");resetForm()}
function regenerate(){ $("message").value=makeMessage(draft()) }
$("regenMessage").onclick=regenerate;
form.addEventListener("submit",e=>{
 e.preventDefault();
 const editId=$("editId").value,old=items.find(x=>x.id===editId),d=draft();
 if(!d.client||!d.subject||!d.dueDate)return;
 const item={id:editId||makeId(),...d,message:$("message").value.trim()||makeMessage(d),resolved:old?old.resolved:false,sendCount:old?old.sendCount:0,lastSentAt:old?old.lastSentAt:null,createdAt:old?old.createdAt:new Date().toISOString()};
 items=old?items.map(x=>x.id===editId?item:x):items.concat(item);
 save();hideForm();render();
});
function markSent(x){x.sendCount=(x.sendCount||0)+1;x.lastSentAt=new Date().toISOString();save();render()}
function sendWhatsApp(itemId){
 const x=items.find(v=>v.id===itemId);if(!x)return;
 const phone=cleanPhone(x.phone),text=encodeURIComponent(x.message||makeMessage(x));
 const url=phone?("https://wa.me/"+phone+"?text="+text):("https://api.whatsapp.com/send?text="+text);
 markSent(x);window.open(url,"_blank","noopener");
}
async function copyText(itemId){
 const x=items.find(v=>v.id===itemId);if(!x)return;
 const text=x.message||makeMessage(x);
 try{await navigator.clipboard.writeText(text);alert("Messaggio copiato.")}catch{prompt("Copia il messaggio:",text)}
}
function toggleDone(itemId){const x=items.find(v=>v.id===itemId);if(!x)return;x.resolved=!x.resolved;save();render()}
function editItem(itemId){
 const x=items.find(v=>v.id===itemId);if(!x)return;
 $("editId").value=x.id;$("client").value=x.client;$("phone").value=x.phone||"";$("type").value=x.type;$("dueDate").value=x.dueDate;$("subject").value=x.subject;$("amount").value=x.amount||"";$("notes").value=x.notes||"";$("message").value=x.message||makeMessage(x);
 showForm();window.scrollTo({top:form.getBoundingClientRect().top+window.scrollY-90,behavior:"smooth"});
}
function deleteItem(itemId){if(!confirm("Eliminare questo sollecito?"))return;items=items.filter(x=>x.id!==itemId);save();render()}
$("toggleForm").onclick=()=>{resetForm();showForm()};
$("cancelBtn").onclick=hideForm;
$("filter").onchange=render;
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),items:items},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="solleciti-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$("importFile").onchange=async e=>{const f=e.target.files&&e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());const incoming=Array.isArray(data)?data:data.items;if(!Array.isArray(incoming))throw new Error();if(!confirm("Importare "+incoming.length+" solleciti? I dati attuali verranno sostituiti."))return;items=incoming;save();render()}catch{alert("Backup non valido.")}finally{e.target.value=""}};
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("installBtn").classList.remove("hidden")});
$("installBtn").onclick=async()=>{if(!deferredPrompt)return;deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("installBtn").classList.add("hidden")};
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
resetForm();render();
})();