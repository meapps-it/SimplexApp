'use strict';
const PROMO_DEFAULTS={
 toi:{promoImages:['assets/promotional/turni-operai.png']},
 app_1790955596835:{promoImages:['assets/promotional/noidue.jpg']}
};
const uploadedPromo=new Map();
function promoURLs(app,key){const values=Array.isArray(app[key])?app[key]:(PROMO_DEFAULTS[app.id]?.[key]||[]);return values.map(u=>{try{const url=new URL(u,location.href);return url.protocol==='https:'&&!url.username&&!url.password?url.href:''}catch{return ''}}).filter(Boolean).slice(0,6)}
// The final item is the most recently added promotional image.
const shareImages=new Map();
function shareImageURL(app){return promoURLs(app,'promoImages').at(-1)||safeIcon(app.icon)}
function prepareShareImage(app){const url=shareImageURL(app);if(!url)return Promise.resolve(null);if(shareImages.has(url))return shareImages.get(url);const pending=(async()=>{try{const response=await fetch(url);if(!response.ok)throw Error();const blob=await response.blob(),type=blob.type.split(';')[0];if(blob.size>25*1024*1024||!['image/png','image/jpeg','image/webp'].includes(type))throw Error();const extension=type==='image/jpeg'?'jpg':type==='image/webp'?'webp':'png';return new File([blob],app.id+'-simplexapp.'+extension,{type})}catch{shareImages.delete(url);return null}})();if(shareImages.size>=12)shareImages.delete(shareImages.keys().next().value);shareImages.set(url,pending);return pending}
function mediaLines(id){return $(id).value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)}
function validatePromoForm(item){const pending=Array.from($('appPromoImagesFile').files).filter(f=>!uploadedPromo.has(f));if(item.promoImages.length+pending.length>6)throw Error('Puoi aggiungere al massimo 6 immagini promozionali');for(const u of item.promoImages){const parsed=new URL(u);if(parsed.protocol!=='https:'||parsed.username||parsed.password||u.length>3000)throw Error('Usa link HTTPS per le immagini promozionali')}for(const f of pending)if(!['image/png','image/jpeg','image/webp'].includes(f.type)||f.size>8*1024*1024)throw Error('Usa immagini PNG, JPEG o WebP di massimo 8 MB')}
async function uploadPromo(item){for(const file of Array.from($('appPromoImagesFile').files)){if(uploadedPromo.has(file))continue;const blob=await(await fetch(await imageFile(file,1920))).blob();const result=await uploadFile('icon',blob);uploadedPromo.set(file,result.url);item.promoImages.push(result.url);$('appPromoImages').value=item.promoImages.join('\n')}$('appPromoImagesFile').value='';uploadedPromo.clear()}
