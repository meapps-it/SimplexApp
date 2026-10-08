import {test} from 'node:test';import assert from 'node:assert/strict';
import '../tenant-config.js';
const T=globalThis.SimplexTenants,cap={version:2,fields:T.fields,menu_layouts:T.layouts,themes:Object.keys(T.presets),defaults:{app_name:'Originale',icon_url:'https://example.com/default.png',menu_layout:'original'}};
test('separate configurations, standard fallback, safe fields and supported capabilities',()=>{
 const a=T.branding({app_name:'Rossi',primary_color:'#a52c35',menu_layout:'left'},cap),b=T.branding({app_name:'Bianchi',primary_color:'#174a8b',menu_layout:'right'},cap);
 assert.equal(T.resolve(a,cap).app_name,'Rossi');assert.equal(T.resolve(b,cap).app_name,'Bianchi');assert.equal(T.resolve({},cap).app_name,'Originale');assert.equal(T.resolve(a,cap).icon_url,cap.defaults.icon_url);
 for(const input of [{html:'<script>'},{primary_color:'red'},{logo_url:'javascript:alert(1)'},{menu_layout:'free'},{short_name:'a'.repeat(31)}])assert.throws(()=>T.branding(input,cap));assert.throws(()=>T.branding({app_name:'No'},{}));
 assert.equal(T.capabilities({fields:['html','app_name'],menu_layouts:['free']}).fields.join(','),'app_name');
});
test('palette contrast and dependencies preserve explicit OFF and unavailable modules',()=>{
 for(const colors of Object.values(T.presets))for(const color of Object.values(colors))assert.ok(T.contrast(color,T.ink(color))>=4.5);
 const defs=[{key:'products',ready:true},{key:'inventory',ready:true,requires:['products']},{key:'clients',ready:true},{key:'orders',ready:true,feature_requires:['clients','products']},{key:'future',ready:false}];
 assert.deepEqual(T.modules({products:false,inventory:true,clients:false,orders:true},defs),{products:false,inventory:false,clients:false,orders:true});assert.equal(T.modules({},defs,false,true).products,true);assert.equal(T.modules({},defs).products,false);assert.throws(()=>T.modules({future:true},defs,true));
});
