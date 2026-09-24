/* ⛔ L'horloge se monte à la ligne 3820 et `/health` la lit à la 422 : même forme de zone morte
   que celle qui a éteint toute la sauvegarde le 19 septembre. On mesure, on ne raisonne pas. */
const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
const {spawn}=require('child_process');
const RACINE='/home/user/teamop';
const dormir=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const B=fs.mkdtempSync(path.join(os.tmpdir(),'cons-'));
  const dir=path.join(B,'srv'),data=path.join(dir,'data'); fs.mkdirSync(data,{recursive:true});
  const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64');
  /* Deux entreprises : une à jour (aboStatut actif, fin lointaine), une en impayé. */
  fs.writeFileSync(path.join(data,'espaces.json'),JSON.stringify({
    ajour:{slug:'ajour',nom:'À jour',t:'ajour-1',code:b64({t:'ajour-1',k:'k1'}),formule:'pro',aboStatut:'actif',aboFin:'2099-01-01',ts:1},
    impaye:{slug:'impaye',nom:'Impayée',t:'impaye-2',code:b64({t:'impaye-2',k:'k2'}),formule:'pro',aboStatut:'impaye',ts:1}}));
  const cfg=path.join(dir,'config.json');
  const wp=require(path.join(RACINE,'server','node_modules','web-push')); const v=wp.generateVAPIDKeys();
  fs.writeFileSync(cfg,JSON.stringify({vapidPublicKey:v.publicKey,vapidPrivateKey:v.privateKey,apiKey:'banc',
    adminPassHash:crypto.createHash('sha256').update('mdp-sonde').digest('hex')}));
  const port=await new Promise(r=>{const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>r(p));});});
  const e=spawn(process.execPath,[path.join(RACINE,'server','index.js')],
    {env:Object.assign({},process.env,{TEAMOP_CONFIG:cfg,TEAMOP_DATA:data,PORT:String(port)}),stdio:['ignore','pipe','pipe']});
  let j=''; e.stdout.on('data',d=>j+=d); e.stderr.on('data',d=>j+=d);
  for(let i=0;i<120;i++){ await dormir(100); try{ if((await fetch('http://127.0.0.1:'+port+'/health')).ok) break; }catch(_){} }
  await dormir(500);
  const h=await (await fetch('http://127.0.0.1:'+port+'/health')).json();
  console.log('\n══ L\'HORLOGE SUR LE VRAI SERVEUR ══\n');
  console.log('  /health.conservation : '+JSON.stringify(h.conservation));
  console.log('  · montée sans erreur        : '+(!!h.conservation && h.conservation.actif===true && !h.conservation.erreur));
  /* ⛔ Depuis le 24 septembre 2026, `/health` ne publie plus de COMPTES (tableau de bord
     commercial offert à qui passe) : trois booléens, et le compte se lit sur la route gardée. */
  console.log('  · /health : aucun nombre      : '+(!!h.conservation && Object.values(h.conservation).every(x=>typeof x!=='number')));
  console.log('  · /health : exactement 4 champs : '+JSON.stringify(Object.keys(h.conservation||{}).sort()));
  console.log('  · aucun nom d\'entreprise publié : '+(!/ajour|impaye/.test(JSON.stringify(h.conservation))));
  const f=(()=>{try{return JSON.parse(fs.readFileSync(path.join(data,'conservation.json'),'utf8'));}catch(_){return null;}})();
  console.log('  · fichier sur le disque     : '+JSON.stringify(f));
  console.log('  · c\'est bien l\'IMPAYÉE      : '+(!!f&&!!f['impaye-2']&&!f['ajour-1']));
  /* La Tour, gardée. */
  const t=await (await fetch('http://127.0.0.1:'+port+'/api/monitor/login',{method:'POST',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({nom:'P',pass:'mdp-sonde'})})).json();
  const sans=await fetch('http://127.0.0.1:'+port+'/api/monitor/conservation');
  console.log('  · la route refuse sans jeton : '+(sans.status===401||sans.status===403)+' ('+sans.status+')');
  const avec=await (await fetch('http://127.0.0.1:'+port+'/api/monitor/conservation',
    {headers:{Authorization:'Bearer '+t.token}})).json();
  console.log('  · la Tour voit QUI          : '+JSON.stringify((avec.espaces||[]).map(x=>({nom:x.nom,restants:x.restants}))));
  console.log('  · la Tour voit COMBIEN (une seule suivie, l\'impayée) : '+(!!avec.compte&&avec.compte.suivis===1)+' '+JSON.stringify(avec.compte));
  console.log('  · aucun ReferenceError      : '+(!/ReferenceError/.test(j)));
  const lignes=j.split("\n").filter(l=>/conservation|balayage/.test(l));
  console.log("  · journal : "+JSON.stringify(lignes));
  const esp=await (await fetch("http://127.0.0.1:"+port+"/api/monitor/espaces",{headers:{Authorization:"Bearer "+t.token}})).json().catch(()=>({}));
  console.log("  · ce que la Tour voit des espaces : "+JSON.stringify((Array.isArray(esp.espaces)?esp.espaces:Array.isArray(esp)?esp:Object.keys(esp||{})).slice(0,4)).slice(0,500));
  if(/ReferenceError|conservation NON/.test(j)) console.log(j.split('\n').filter(l=>/Reference|conservation/.test(l)).join('\n'));
  try{e.kill('SIGKILL');}catch(_){ }
  fs.rmSync(B,{recursive:true,force:true});
})();
