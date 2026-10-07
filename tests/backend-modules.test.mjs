import assert from 'node:assert/strict';
let handler,role='admin',writes=[];
const defs={inventory:[{key:'products',label:'Articoli',ready:true},{key:'quotes',label:'Preventivi',ready:false}],turns:[{key:'turni',label:'Turni',ready:true}]};
const endpoint='https://product.supabase.co/functions/v1/simplex-modules';let forwarded;
globalThis.Deno={env:{get:k=>k==='SUPABASE_URL'?'https://test.supabase.co':'test-server-key'},serve:h=>handler=h};
globalThis.fetch=async(url,options={})=>{const u=new URL(url),path=u.pathname;const json=(data,status=200)=>new Response(JSON.stringify(data),{status});
 if(u.href===endpoint){forwarded=JSON.parse(options.body);assert.equal(options.headers.Authorization,'Bearer test-user');return json(forwarded.action==='list'?{customers:[]}:forwarded.action==='issue-license'?{key:'SIMPLEX-ONE-TIME-TEST'}:{saved:true,modules:forwarded.modules});}
 if(path==='/auth/v1/user')return json({id:role});
 if(path.endsWith('/simplex_admins'))return json(role==='admin'?[{user_id:'admin'}]:[]);
 if(path.endsWith('/simplex_product_modules')){if(options.method==='POST'){writes.push(JSON.parse(options.body));return json([])}const product=(u.searchParams.get('product_id')||'').replace('eq.','');return json(product?(defs[product]?[{modules:defs[product],management_url:product==='inventory'?endpoint:null}]:[]):Object.entries(defs).map(([product_id,modules])=>({product_id,modules,management_url:product_id==='inventory'?endpoint:null})));}
 if(path.endsWith('/simplex_apps'))return json(u.searchParams.get('id')==='eq.inventory'?[{id:'inventory'}]:[]);
 if(path.endsWith('/simplex_clients')){if(options.method==='POST'){const row=JSON.parse(options.body);writes.push(row);return json([row])}if(u.searchParams.get('id'))return json([{id:'12345678-1234-1234-1234-123456789012',name:'Test',product_id:'inventory',status:'active',remote_customer_id:'12345678-1234-1234-1234-123456789013',modules:{products:true}}]);return json([{id:'a',product_id:'inventory',modules:{products:true,turni:true,quotes:true}}]);}
 throw Error('Unexpected request '+path);
};
await import('../backend/simplex-admin.ts');
async function send(action,body={},authenticated=true){return handler(new Request('https://test/functions/v1/simplex-admin?action='+action,{method:'POST',headers:{...(authenticated?{Authorization:'Bearer test-user'}:{}),Origin:'https://meapps-it.github.io','Content-Type':'application/json'},body:JSON.stringify(body)}));}
assert.equal((await send('product-modules',{},false)).status,401);role='visitor';assert.equal((await send('product-modules')).status,403);assert.equal((await send('product-modules-save',{id:'inventory',modules:[]})).status,403);role='admin';
assert.equal((await send('product-modules')).status,200);
const products=await(await send('product-modules')).json();assert.equal(products.products[0].managed,true);assert.ok(!JSON.stringify(products).includes(endpoint));
assert.equal((await send('product-customers',{id:'inventory'})).status,200);assert.equal(forwarded.action,'list');assert.equal((await send('product-customer-modules',{id:'inventory',customerId:'a',modules:{products:true}})).status,200);assert.deepEqual(forwarded.modules,{products:true});assert.equal((await send('product-customers',{id:'turns'})).status,400);
const client={name:'Test',product_id:'inventory',modules:{products:true}};assert.equal((await send('client-save',{client})).status,200);assert.deepEqual(writes.at(-1).modules,{products:true});
for(const modules of [{turni:true},{quotes:true},{evil:true}]){const count=writes.length;assert.equal((await send('client-save',{client:{...client,modules}})).status,400);assert.equal(writes.length,count);}
assert.equal((await send('client-save',{client:{...client,product_id:'unknown'}})).status,400);
const clients=await(await send('clients-list')).json();assert.deepEqual(clients.clients[0].modules,{products:true});
assert.equal((await send('product-modules-save',{id:'missing',modules:[]})).status,400);assert.equal((await send('product-modules-save',{id:'inventory',modules:[{key:'products',label:'A'},{key:'products',label:'B'}]})).status,400);
assert.equal((await send('product-modules-save',{id:'inventory',modules:defs.inventory})).status,200);
console.log('PASS: module registry admin authorization, compatible client writes, rejection of unknown/development modules and incompatible legacy keys excluded from responses.');

role='visitor';assert.equal((await send('client-issue-license',{})).status,403);role='admin';assert.equal((await send('client-issue-license',{})).status,400);const issued=await send('client-issue-license',{id:'12345678-1234-1234-1234-123456789012',email:'owner@example.com',plan:'Base',expiresAt:'2099-01-01'});assert.equal(issued.status,200);assert.equal((await issued.json()).key,'SIMPLEX-ONE-TIME-TEST');assert.equal(forwarded.action,'issue-license');assert.deepEqual(forwarded.modules,{products:true});
