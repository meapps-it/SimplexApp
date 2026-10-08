import {test} from 'node:test';import assert from 'node:assert/strict';
let handler,admin=true,remoteFails=false,clients=new Map(),calls=[];
const product='inventory',id='11111111-1111-1111-1111-111111111111',remote='22222222-2222-2222-2222-222222222222',profile={modules:[{key:'products',label:'Articoli',ready:true},{key:'inventory',label:'Magazzino',ready:true,requires:['products']}],capabilities:{version:2,fields:['app_name','logo_url','primary_color','menu_layout'],menu_layouts:['original','left','right']},management_url:'https://product.supabase.co/functions/v1/simplex-modules'};
globalThis.Deno={env:{get:key=>key==='SUPABASE_URL'?'https://admin.supabase.co':'SERVER-ONLY'},serve:fn=>handler=fn};
globalThis.fetch=async(url,options={})=>{const u=new URL(url),data=options.body?JSON.parse(options.body):{},json=(value,status=200)=>new Response(JSON.stringify(value),{status});
 if(u.hostname==='product.supabase.co'){calls.push(data);if(remoteFails)return json({error:'Test rete'},503);return json({saved:true,customerId:remote,modules:data.modules});}
 if(u.pathname==='/auth/v1/user')return json({id:'user'});
 if(u.pathname.endsWith('/simplex_admins'))return json(admin?[{user_id:'user'}]:[]);
 if(u.pathname.endsWith('/simplex_product_modules'))return json([profile]);
 if(u.pathname.endsWith('/simplex_clients')){const selector=u.searchParams.get('id')?.slice(3);if(options.method==='POST'){const row={id,remote_customer_id:null,...data};clients.set(id,row);return json([row]);}if(options.method==='PATCH'){const old=clients.get(selector);if(!old)return json([]);const row={...old,...data};clients.set(selector,row);return json([row]);}return json(selector?(clients.has(selector)?[clients.get(selector)]:[]):[...clients.values()]);}
 throw Error('Unexpected request '+url);
};
await import('../backend/simplex-admin.ts');
const send=(client,auth=true)=>handler(new Request('https://admin.test/?action=client-save',{method:'POST',headers:{Origin:'https://meapps-it.github.io',...(auth?{Authorization:'Bearer admin'}:{})},body:JSON.stringify({client})}));
test('admin-only branding, generic configuration, preserved identity and explicit sync failures',async()=>{
 const client={name:'Cliente Rossi',business_name:'Ferramenta Rossi',email:'rossi@example.com',product_id:product,status:'active',plan:'base',modules:{products:true,inventory:true},branding:{app_name:'Gestionale Rossi',primary_color:'#a52c35',menu_layout:'left'}};
 assert.equal((await send(client,false)).status,401);admin=false;assert.equal((await send(client)).status,403);admin=true;
 for(const branding of [{html:'<script>'},{logo_url:'javascript:alert(1)'},{menu_layout:'drag'}])assert.equal((await send({...client,branding})).status,400);assert.equal(clients.size,0);
 let response=await (await send(client)).json();assert.equal(response.client.sync_state,'synced');assert.equal(response.client.remote_customer_id,remote);assert.equal(calls.at(-1).action,'configure');assert.equal(calls.at(-1).externalId,id);assert.equal(calls.at(-1).branding.app_name,'Gestionale Rossi');
 assert.equal((await send({...client,id,product_id:'other'})).status,400);
 remoteFails=true;response=await(await send({...client,id,branding:{app_name:'Nuovo nome'}})).json();assert.equal(response.client.sync_state,'error');assert.match(response.warning,/non applicata/);assert.equal(clients.get(id).branding.app_name,'Nuovo nome');
 remoteFails=false;response=await(await send({...client,id,branding:{},modules:{products:false,inventory:true}})).json();assert.equal(response.client.sync_state,'synced');assert.deepEqual(response.client.branding,{});assert.equal(response.client.modules.inventory,false);assert.equal(calls.at(-1).modules.inventory,false);
});
