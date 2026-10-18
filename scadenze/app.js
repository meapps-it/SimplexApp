(() => {
const KEY="simplex_scadenze_v1";
const $=id=>document.getElementById(id);
const form=$("deadlineForm"), list=$("deadlineList"), empty=$("emptyState"), template=$("itemTemplate");
let items=load();
let deferredPrompt=null;

function load(){try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return []}}
function save(){localStorage.setItem(KEY,JSON.stringify(items))}
function isoToday(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),d.getDate())}
function parseDate(v){const [y,m,d]=v.split("-").map(Number);return new Date(y,m-1,d)}
function daysFromToday(v){return Math.round((parseDate(v)-isoToday())/86400000)}
function fmtDate(v){return new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"short",year:"numeric"}).format(parseDate(v))}
function fmtMoney(v){return v==null||v===""?"":new Intl.NumberFormat("it-IT",{style:"currency",currency:"EUR"}).format(Number(v))}
function id(){return crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2)}
function repeatLabel(v){return v==="monthly"?"ogni mese":v==="yearly"?"ogni anno":""}

function nextRepeatDate(date, repeat){
  const d=parseDate(date);
  if(repeat==="monthly") d.setMonth(d.getMonth()+1);
  if(repeat==="yearly") d.setFullYear(d.getFullYear()+1);
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}

function statusFor(item){
  if(item.done)return {label:"Completata",cls:""};
  const n=daysFromToday(item.date);
  if(n<0)return {label:"Scaduta",cls:"overdue"};
  if(n===0)return {label:"Oggi",cls:"today"};
  if(n===1)return {label:"Domani",cls:""};
  if(n<=7)return {label:`Tra ${n} giorni`,cls:""};
  return {label:item.category,cls:""};
}

function updateSummary(){
  const active=items.filter(x=>!x.done);
  $("overdueCount").textContent=active.filter(x=>daysFromToday(x.date)<0).length;
  $("todayCount").textContent=active.filter(x=>daysFromToday(x.date)===0).length;
  $("weekCount").textContent=active.filter(x=>{const n=daysFromToday(x.date);return n>=0&&n<=7}).length;
  $("totalCount").textContent=items.length;
}

function filtered(){
  const f=$("filter").value;
  const sorted=[...items].sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title));
  if(f==="active")return sorted.filter(x=>!x.done);
  if(f==="done")return sorted.filter(x=>x.done);
  if(f==="overdue")return sorted.filter(x=>!x.done&&daysFromToday(x.date)<0);
  return sorted;
}

function render(){
  list.innerHTML="";
  const data=filtered();
  empty.classList.toggle("hidden",data.length>0);
  data.forEach(item=>{
    const node=template.content.firstElementChild.cloneNode(true);
    const st=statusFor(item);
    node.dataset.id=item.id;
    node.classList.toggle("done",!!item.done);
    node.classList.toggle("overdue",!item.done&&daysFromToday(item.date)<0);
    node.querySelector(".item-title").textContent=item.title;
    const badge=node.querySelector(".badge");
    badge.textContent=st.label; if(st.cls)badge.classList.add(st.cls);
    const parts=[fmtDate(item.date),item.category];
    if(item.amount!==""&&item.amount!=null)parts.push(fmtMoney(item.amount));
    if(item.repeat!=="none")parts.push(repeatLabel(item.repeat));
    node.querySelector(".item-meta").textContent=parts.join(" · ");
    node.querySelector(".item-notes").textContent=item.notes||"";
    node.querySelector(".check").setAttribute("aria-label",item.done?"Segna come da fare":"Segna come completata");
    node.querySelector(".check").onclick=()=>toggleDone(item.id);
    node.querySelector(".edit").onclick=()=>editItem(item.id);
    node.querySelector(".delete").onclick=()=>deleteItem(item.id);
    list.appendChild(node);
  });
  updateSummary();
}

function resetForm(){
  form.reset();$("editId").value="";$("date").value=new Date().toISOString().slice(0,10);$("repeat").value="none";
}
function showForm(){form.classList.remove("hidden");$("toggleForm").classList.add("hidden");$("title").focus()}
function hideForm(){form.classList.add("hidden");$("toggleForm").classList.remove("hidden");resetForm()}

form.addEventListener("submit",e=>{
  e.preventDefault();
  const editId=$("editId").value;
  const item={
    id:editId||id(),
    title:$("title").value.trim(),
    date:$("date").value,
    category:$("category").value,
    amount:$("amount").value,
    repeat:$("repeat").value,
    notes:$("notes").value.trim(),
    done:false,
    createdAt:new Date().toISOString()
  };
  if(!item.title||!item.date)return;
  const old=items.find(x=>x.id===editId);
  if(old){item.done=old.done;item.createdAt=old.createdAt;items=items.map(x=>x.id===editId?item:x)}
  else items.push(item);
  save();hideForm();render();
});

function toggleDone(itemId){
  const i=items.findIndex(x=>x.id===itemId); if(i<0)return;
  const item=items[i];
  const markingDone=!item.done;
  item.done=markingDone;
  if(markingDone&&item.repeat!=="none"){
    const future={...item,id:id(),date:nextRepeatDate(item.date,item.repeat),done:false,createdAt:new Date().toISOString()};
    items.push(future);
  }
  save();render();
}
function editItem(itemId){
  const x=items.find(v=>v.id===itemId);if(!x)return;
  $("editId").value=x.id;$("title").value=x.title;$("date").value=x.date;$("category").value=x.category;
  $("amount").value=x.amount??"";$("repeat").value=x.repeat||"none";$("notes").value=x.notes||"";
  showForm();window.scrollTo({top:form.getBoundingClientRect().top+window.scrollY-90,behavior:"smooth"});
}
function deleteItem(itemId){
  if(!confirm("Eliminare questa scadenza?"))return;
  items=items.filter(x=>x.id!==itemId);save();render();
}

$("toggleForm").onclick=()=>{resetForm();showForm()};
$("cancelBtn").onclick=hideForm;
$("filter").onchange=render;

$("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),items},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`scadenze-backup-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
};
$("importFile").onchange=async e=>{
  const f=e.target.files?.[0];if(!f)return;
  try{
    const data=JSON.parse(await f.text());const incoming=Array.isArray(data)?data:data.items;
    if(!Array.isArray(incoming))throw new Error();
    if(!confirm(`Importare ${incoming.length} scadenze? I dati attuali verranno sostituiti.`))return;
    items=incoming;save();render();
  }catch{alert("Backup non valido.")}finally{e.target.value=""}
};


if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
resetForm();render();
})();