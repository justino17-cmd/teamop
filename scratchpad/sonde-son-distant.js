let pw; for (const c of ['playwright-core','/opt/node22/lib/node_modules/playwright/node_modules/playwright-core','playwright']) { try { pw = require(c); break; } catch (_) {} }
let ok=0,ko=0; const vrai=(t,c,d)=>{ if(c){ok++;console.log('  ✓ '+t);} else {ko++;console.log('  ✗ '+t+' → '+JSON.stringify(d));} };
(async()=>{
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args:['--no-sandbox','--autoplay-policy=user-gesture-required'] });
  const p = await b.newPage({ viewport:{width:393,height:800}, hasTouch:true, isMobile:true }); const errs=[]; p.on('pageerror',e=>errs.push(String(e)));
  await p.goto('file://' + require('path').join(__dirname, '..', 'server-msg', 'public', 'index.html') + ''); await p.waitForTimeout(2500);
  vrai('la page servie porte sonJouer', await p.evaluate(()=>typeof window.opmSonJouer==='function'));
  await p.evaluate(()=>{ const au=document.getElementById('appel-audio-distant'); const ctx=new AudioContext(); const d=ctx.createMediaStreamDestination(); const o=ctx.createOscillator(); o.connect(d); o.start(); au.srcObject=d.stream; const vrai=au.play.bind(au); let refus=true; au.play=function(){ if(refus){ refus=false; return Promise.reject(Object.assign(new Error('Safari'),{name:'NotAllowedError'})); } return vrai(); }; window.opmSonJouer(au); });
  await p.waitForTimeout(500);
  const avant = await p.evaluate(()=>{ const b=document.getElementById('son-bloque'), au=document.getElementById('appel-audio-distant'); return {bouton:!!b&&!b.hidden, paused:au.paused}; });
  vrai('refus du navigateur : « 🔊 Touchez pour entendre » apparaît', avant.bouton && avant.paused, avant);
  await p.touchscreen.tap(30, 500); await p.waitForTimeout(500);
  const apres = await p.evaluate(()=>{ const b=document.getElementById('son-bloque'), au=document.getElementById('appel-audio-distant'); return {cache:!b||b.hidden, paused:au.paused}; });
  vrai('un toucher n’importe où : le son de l’autre JOUE, le bouton s’en va', !apres.paused && apres.cache, apres);
  vrai('aucune erreur JavaScript', !errs.length, errs.slice(0,2));
  console.log(`════ sonde-son : ${ok} ✓ ${ko} ✗ ════`); await b.close(); process.exit(ko?1:0);
})().catch(e=>{console.log('✗ '+e.stack);process.exit(1);});
