import https from 'node:https';

// Deno fetch removes Content-Length on unknown-length streams. GitHub assets
// require it, so use the Node HTTP transport with bounded, backpressured writes.
export async function uploadAsset(url:string,token:string,size:number,body:ReadableStream<Uint8Array>){
 const target=new URL(url);
 if(target.protocol!=='https:'||target.hostname!=='uploads.github.com'||target.port||target.username||target.password)throw Error('Destinazione APK non valida');
 const reader=body.getReader();
 return await new Promise<any>((resolve,reject)=>{
  let settled=false,request:any;
  const finish=(error?:Error,value?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);if(error){request?.destroy();void reader.cancel().catch(()=>{});reject(error)}else resolve(value)};
  const timer=setTimeout(()=>finish(Error('Caricamento APK scaduto. Riprova con una connessione più veloce.')),120000);
  try{
   request=https.request(target,{method:'POST',headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'SimplexApp-Admin','Content-Type':'application/vnd.android.package-archive','Content-Length':String(size)}},response=>{
    let result='',length=0;
    response.on('error',()=>finish(Error('Risposta GitHub interrotta. Riprova.')));
    response.on('aborted',()=>finish(Error('Risposta GitHub interrotta. Riprova.')));
    response.on('data',chunk=>{length+=chunk.length;if(length>65536){response.destroy();finish(Error('Risposta GitHub non valida'))}else result+=chunk.toString()});
    response.on('end',()=>{
     if(response.statusCode!==201){finish(Error('Caricamento GitHub non riuscito ('+response.statusCode+'). Riprova.'));return}
     try{const asset=JSON.parse(result);if(asset.size!==size||typeof asset.browser_download_url!=='string'||!asset.browser_download_url.startsWith('https://github.com/meapps-it/SimplexApp/'))throw Error();finish(undefined,asset)}catch{finish(Error('GitHub non ha confermato il file completo. Riprova.'))}
    });
   });
   request.on('error',()=>finish(Error('Connessione al caricamento GitHub interrotta. Riprova.')));
   void (async()=>{
    try{
     let sent=0;
     while(!settled){const chunk=await reader.read();if(chunk.done)break;sent+=chunk.value.length;if(sent>size)throw Error('Dimensione del file non valida');
      if(!request.write(chunk.value))await new Promise<void>((done,fail)=>{
       const cleanup=()=>{request.off('drain',drain);request.off('error',error);request.off('close',close)};
       const drain=()=>{cleanup();done()},error=()=>{cleanup();fail(Error('Trasferimento APK interrotto'))},close=()=>error();
       request.once('drain',drain);request.once('error',error);request.once('close',close);
      });
     }
     if(settled)return;
     if(sent!==size)throw Error('File APK incompleto');request.end();
    }catch(e){finish(e instanceof Error?e:Error('Trasferimento APK interrotto'))}
   })();
  }catch{finish(Error('Connessione al caricamento GitHub non riuscita. Riprova.'))}
 });
}
