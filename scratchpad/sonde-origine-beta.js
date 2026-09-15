/* ══ PREUVE QUE LA BÊTA CALCULE L'ORIGINE, PAR UNE VRAIE ERREUR ════════════════════════════
   `tmOrigine` vit dans une IIFE : elle n'est PAS globale, et c'est voulu — la sentinelle est
   isolée. On ne peut donc pas l'appeler depuis la page, et c'est tant mieux : on provoque une
   VRAIE erreur non rattrapée depuis une fonction nommée, et on lit ce que la sentinelle a mis
   dans sa file (`top_monitor_q`, localStorage). Ça prouve toute la chaîne, pas une fonction.
   ⛔ beta.html, jamais app.html. */
const { chromium } = require('playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const R='/home/user/teamop';
const srv=http.createServer((q,r)=>{const x=path.join(R,q.url.split('?')[0]);fs.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)))}).listen(8195,'127.0.0.1');
(async()=>{
 const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const p=await nav.newPage({viewport:{width:390,height:844}});
 const err=[]; p.on('pageerror',e=>err.push(String(e)));
 /* ⛔ ON OBSERVE CE QUI SORT DU NAVIGATEUR, pas ce qui reste dans la file. Première écriture de
    cette sonde : on lisait `top_monitor_q` après coup, et l'erreur n'y était plus — `tmFlush`
    part 500 ms après le premier signalement et VIDE la file. On concluait « pas capturée » sur
    une chaîne qui marchait. Le trafic, lui, ne ment pas. */
 const envois=[];
 p.on('request',r=>{ if(!/\/api\/monitor\/report/.test(r.url())) return;
   try{ const b=JSON.parse(r.postData()||'{}'); (b.reports||[]).forEach(x=>envois.push(x)); }catch(e){} });
 await p.route('**://api.teamop.fr/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await p.route('**://www.gstatic.com/**',r=>r.fulfill({status:200,contentType:'text/javascript',body:'/**/'}));
 await p.goto('http://127.0.0.1:8195/beta.html',{timeout:60000,waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>typeof tmPush==='function'||document.querySelectorAll('button').length>3,{timeout:30000});
 const version=await p.evaluate(()=>APP_VERSION);
 const boutons=await p.evaluate(()=>document.querySelectorAll('button').length);

 /* La file d'avant, pour ne compter que ce qu'on provoque. */
 await p.evaluate(()=>{ try{ localStorage.removeItem('top_monitor_q'); }catch(e){} });

 /* Une VRAIE erreur non rattrapée, depuis une fonction au nom reconnaissable. */
 await p.evaluate(()=>{ window.sondeOrigineTeamOp=function sondeOrigineTeamOp(){ null.x; };
   setTimeout(window.sondeOrigineTeamOp,0); });
 await p.waitForTimeout(900);
 /* Et une promesse rejetée, l'autre chemin de la sentinelle. */
 await p.evaluate(()=>{ window.sondePromesseTeamOp=function sondePromesseTeamOp(){ return Promise.reject(new Error('sonde promesse')); };
   window.sondePromesseTeamOp(); });
 await p.waitForTimeout(900);

 const reste=await p.evaluate(()=>{ try{ return JSON.parse(localStorage.getItem('top_monitor_q')||'[]'); }catch(e){ return []; } });
 /* Ce qui est PARTI plus ce qui attend encore : l'un ou l'autre, jamais perdu entre les deux. */
 const file=envois.concat(reste);
 console.log('\n  version bêta servie : '+version+'  ·  '+boutons+' boutons rendus');
 console.log('  envoyé : '+envois.length+'  ·  encore en file : '+reste.length);
 console.log('  ce que la sentinelle a produit : '+JSON.stringify(file.map(x=>({msg:String(x.message).slice(0,46),origine:x.origine,ecran:x.categorie})),null,1));

 const erreur=file.filter(x=>/null|Cannot read/i.test(String(x.message)))[0];
 const promesse=file.filter(x=>/sonde promesse/.test(String(x.message)))[0];
 const cas=[
   ['la bêta servie est bien la 692', version==='692-beta'],
   ['la page démarre (boutons rendus)', boutons>3],
   ['une erreur non rattrapée est mise en file', !!erreur],
   ['⛔ son ORIGINE nomme la fonction coupable', erreur&&erreur.origine==='sondeOrigineTeamOp'],
   ['… et l\'écran ouvert voyage à côté, pas à sa place', erreur&&typeof erreur.categorie==='string'&&erreur.categorie.length>0],
   ['une promesse rejetée est mise en file', !!promesse],
   ['⛔ son origine nomme aussi sa fonction', promesse&&promesse.origine==='sondePromesseTeamOp'],
   ['aucune erreur de page en dehors des sondes', err.filter(e=>!/null|sonde promesse/i.test(e)).length===0],
 ];
 cas.forEach(([n,b])=>console.log('  '+(b?'✓':'✗')+' '+n));
 const tout=cas.every(([,b])=>b);
 console.log('\n  '+(tout?'✅ LA BÊTA 692 CALCULE L\'ORIGINE, CHAÎNE COMPLÈTE':'⛔ ÉCHEC'));
 await nav.close();srv.close();
 process.exit(tout?0:1);
})();
