/* « Mot de passe enregistre » ne doit se dire QUE si le serveur l'a pris.
   On simule le refus 426 (appareil sous le minimum) et on regarde ce que l'app fait vraiment. */
const { chromium } = require('playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const R='/home/user/teamop';
const srv=http.createServer((q,r)=>{const x=path.join(R,q.url.split('?')[0]);
  fs.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)));}).listen(8192,'127.0.0.1');
const base={users:[{id:'u1',prenom:'Florian',nom:'Duflot',login:'florian.duflot',role:'tech',actif:true,
  pwdHash:'a'.repeat(64),mustChangePwd:true,email:'',acces:{caps:{},modules:{}}}],
  produits:[],boxes:[],clients:[],interventions:[],mouvements:[],journal:[],techniciens:[]};
(async()=>{
  const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
  const p=await nav.newPage({viewport:{width:390,height:844}});
  p.on('pageerror',e=>console.log('  ! '+String(e).slice(0,150)));
  await p.route('**://api.teamop.fr/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
  await p.route('**://www.gstatic.com/**',r=>r.fulfill({status:200,contentType:'text/javascript',body:'/* n */'}));
  await p.addInitScript(j=>{try{localStorage.setItem('elanB_gestion_v2',j);localStorage.setItem('elanB_vierge_v1','1');localStorage.setItem('elanB_sync_on','0');}catch(e){}},JSON.stringify(base));
  await p.goto('http://127.0.0.1:8192/beta.html',{timeout:120000,waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>typeof forcePwdSave==='function'&&typeof identifiantsDeposer==='function',{timeout:60000});

  const essai=async(verdict,label)=>p.evaluate(async({v,lab})=>{
    const u=db.users[0];
    u.pwdHash='a'.repeat(64); u.mustChangePwd=true; u.email='';
    enterApp(u); await new Promise(r=>setTimeout(r,400));
    forcePwdModal();
    await new Promise(r=>setTimeout(r,200));
    document.getElementById('fp-p1').value='C1k17031996??';
    document.getElementById('fp-p2').value='C1k17031996??';
    const m=document.getElementById('fp-mail'); if(m) m.value='florian@exemple.fr';
    window.annuaireMaintenant=async()=>v;            // le serveur repond ce qu'on veut
    let dit=''; const vrai=window.toast; window.toast=(t)=>{ dit=String(t); };
    await forcePwdSave();
    window.toast=vrai;
    const err=document.getElementById('fp-err');
    return { cas:lab,
      hachChange: u.pwdHash!=='a'.repeat(64),
      mustChangePwd: !!u.mustChangePwd,
      email: u.email||'(vide)',
      erreurAffichee: (err&&err.style.display!=='none')?(err.textContent||'').slice(0,120):'',
      toast: dit.slice(0,90),
      sortieOfferte: !!(document.getElementById('fp-sortie')&&document.getElementById('fp-sortie').style.display!=='none'),
      fenetreOuverte: document.getElementById('overlay').classList.contains('open'),
    };
  },{v:verdict,lab:label});

  const ko=await essai({ok:false,status:426},'SERVEUR REFUSE (426, appareil trop vieux)');
  const ok=await essai({ok:true},'SERVEUR ACCEPTE');
  const rien=await essai({ok:null},'RIEN A DEPOSER (appareil sans entreprise)');
  [ko,ok,rien].forEach(r=>{
    console.log('\n  ── '+r.cas+' ──');
    console.log('  empreinte changee      : '+r.hachChange);
    console.log('  mustChangePwd conserve : '+r.mustChangePwd);
    console.log('  e-mail                 : '+r.email);
    console.log('  erreur a l ecran       : '+(r.erreurAffichee||'(aucune)'));
    console.log('  toast de succes        : '+(r.toast||'(aucun)'));
    console.log('  sortie proposee        : '+r.sortieOfferte);
    console.log('  fenetre encore ouverte : '+r.fenetreOuverte);
  });
  await nav.close(); srv.close();
})();
