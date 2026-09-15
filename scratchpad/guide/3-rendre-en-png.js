const { chromium } = require('playwright-core');
(async()=>{
 const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const p=await nav.newPage({viewport:{width:960,height:1200},deviceScaleFactor:2});
 const err=[]; p.on('pageerror',e=>err.push(String(e)));
 await p.goto('file:///tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/guide/guide.html',{waitUntil:'load',timeout:60000});
 await p.waitForTimeout(1200);
 const h=await p.evaluate(()=>document.body.scrollHeight);
 await p.screenshot({path:'/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/guide/GUIDE-premiere-connexion.png',fullPage:true});
 console.log('hauteur de page : '+h+' px · erreurs : '+(err.length?err.join(' | '):'aucune'));
 await nav.close();
})();
