const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('/opt/node-tools/node_modules/playwright');
const lib=require('../../lib.js');
const ROOT=__dirname, RACINE=require('path').join(__dirname,'..','..','..','..'), MODULE=process.env.MODULE||require('path').join(RACINE,'opcourrier.js'); const T={'.html':'text/html;charset=utf-8','.js':'text/javascript','.mp3':'audio/mpeg'};
let srv,port,nav;
exports.PROFILS=lib.PROFILS;
exports.ouvrir=async(o)=>{o=o||{};
 if(!srv){await new Promise(ok=>{srv=http.createServer((q,r)=>{const rel=decodeURIComponent(q.url.split('?')[0]);const x=rel==='/opcourrier.js'?MODULE:path.join(ROOT,rel);fs.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':T[path.extname(x)]||'application/octet-stream'}),r.end(d)))});srv.listen(0,'127.0.0.1',()=>{port=srv.address().port;ok()})});}
 if(!nav)nav=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']});
 const pr=exports.PROFILS[o.profil||'mac'];
 const ctx=await nav.newContext({viewport:{width:pr.w,height:pr.h},isMobile:!!pr.mobile,hasTouch:!!pr.doigt,userAgent:pr.ua,colorScheme:o.nuit?'dark':'light',locale:'fr-FR',timezoneId:'Europe/Paris',acceptDownloads:true,permissions:[]});
 const p=await ctx.newPage(),err=[];
 p.on('pageerror',e=>err.push('ERREUR '+e.message+' @ '+String(e.stack||'').split('\n')[1]));
 p.on('console',m=>{if(m.type()==='error'&&!/Failed to load|net::/.test(m.text()))err.push('CONSOLE '+m.text())});
 if(pr.encoches){try{const cdp=await ctx.newCDPSession(p);const e=pr.encoches;await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:e.top,bottom:e.bottom,left:e.left,right:e.right,topMax:e.top,bottomMax:e.bottom,leftMax:e.left,rightMax:e.right}});}catch(x){}}
 const qs=new URLSearchParams(); if(o.nuit)qs.set('theme','nuit'); else if(o.jour)qs.set('theme','jour'); if(o.src)qs.set('src',JSON.stringify(o.src)); if(o.cotes)qs.set('cotes',o.cotes); if(o.iv)qs.set('iv',o.iv); if(o.marge)qs.set('marge',o.marge);
 if(o.init)await p.addInitScript(o.init);
 await p.goto('http://127.0.0.1:'+port+'/'+(o.page||'essai.html')+'?'+qs,{waitUntil:'load'});
 await p.waitForTimeout(o.attente||900);
 return {p,ctx,err,doigt:!!pr.doigt,w:pr.w,h:pr.h,profil:o.profil||'mac'};
};
exports.fin=async c=>{try{await c.ctx.close()}catch(e){}};
exports.fermer=async()=>{if(nav){await nav.close();nav=null}if(srv){srv.close();srv=null}};
const dir=(process.env.CAP||__dirname+'/img')+'/'; fs.mkdirSync(dir,{recursive:true});
exports.cap=async(c,nom)=>{await c.p.screenshot({path:dir+nom+'.png'});return dir+nom+'.png'};
