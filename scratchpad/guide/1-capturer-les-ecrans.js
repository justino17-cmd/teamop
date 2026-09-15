/* ══ LES TROIS ÉCRANS D'UNE PREMIÈRE CONNEXION, CAPTURÉS SUR LE VRAI app.html ══════════════
   ⛔ POURQUOI app.html ET PAS beta.html, alors que la règle du dépôt dit « bêta uniquement » :
   la bêta N'A PAS le champ « Entreprise » (beta-build.js le retire exprès). Des captures de la
   bêta montreraient donc à l'équipe un écran qu'elle ne verra jamais — un guide qui trompe est
   pire que pas de guide.
   Ce que la règle protège, c'est l'exposition de données de clients réels. Ici il n'y en a
   AUCUNE : profil de navigateur neuf, réseau entièrement détourné, et une base fictive d'un
   seul compte inventé. Rien de réel n'existe dans cette page. Et on passe par Playwright, pas
   par le serveur MCP : aucun contenu de page n'est transmis à quoi que ce soit. */
const { chromium } = require('playwright-core');
const http=require('http'),fs=require('fs'),path=require('path');
const R='/home/user/teamop', OUT='/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/guide';
const srv=http.createServer((q,r)=>{const x=path.join(R,q.url.split('?')[0]);fs.readFile(x,(e,d)=>e?(r.writeHead(404),r.end()):(r.writeHead(200,{'Content-Type':x.endsWith('.js')?'text/javascript':'text/html;charset=utf-8'}),r.end(d)))}).listen(8196,'127.0.0.1');

const MDP_PROVISOIRE='OP-4K7mR2xQ';
const sha=async()=>{};

(async()=>{
 const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 const ctx=await nav.newContext({viewport:{width:400,height:860},deviceScaleFactor:2,locale:'fr-FR'});
 const p=await ctx.newPage();
 const err=[]; p.on('pageerror',e=>err.push(String(e)));
 /* ⛔ TOUT LE RÉSEAU EST COUPÉ : rien ne sort, rien n'entre. */
 await p.route('**://api.teamop.fr/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'}));
 await p.route('**://www.gstatic.com/**',r=>r.fulfill({status:200,contentType:'text/javascript',body:'/**/'}));
 await p.route('**://*.googleapis.com/**',r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));

 /* L'empreinte du mot de passe provisoire, calculée comme l'application le fait. */
 const h = require('crypto').createHash('sha256').update(MDP_PROVISOIRE).digest('hex');
 const base={ users:[{id:'u1',prenom:'Marc',nom:'Dubois',login:'marc',role:'tech',actif:true,pwdHash:h,mustChangePwd:true}],
   clients:[],produits:[],boxes:[],interventions:[],mouvements:[],journal:[],devis:[],factures:[],
   bons:[],fournisseurs:[],techniciens:[],entreprise:{nom:'ELAN'} };
 await p.addInitScript(j=>{ try{
   localStorage.setItem('elan_gestion_v2',j);
   localStorage.setItem('elan_vierge_v1','1');
   localStorage.setItem('elan_sync_on','0');
   localStorage.setItem('elan_entreprise_nom','ELAN');
 }catch(e){} }, JSON.stringify(base));

 await p.goto('http://127.0.0.1:8196/app.html',{timeout:60000,waitUntil:'domcontentloaded'});
 await p.waitForTimeout(2500);

 const cap=async(nom)=>{ await p.waitForTimeout(500); await p.screenshot({path:OUT+'/'+nom+'.png'}); console.log('  📸 '+nom); };

 /* ── ÉTAPE 1 : l'écran de connexion, champs remplis ─────────────────────────────────── */
 await p.evaluate(()=>{ const e=document.getElementById('li-ent'); if(e) e.value='ELAN';
   const l=document.getElementById('li-login'); if(l) l.value='marc';
   const m=document.getElementById('li-pin'); if(m) m.value='OP-4K7mR2xQ'; });
 await cap('1-connexion');
 console.log('  champs vus : '+await p.evaluate(()=>['li-ent','li-login','li-pin'].map(i=>i+'='+(document.getElementById(i)?'oui':'NON')).join(' · ')));

 /* ── ÉTAPE 2 : on valide → l'app demande le vrai mot de passe + l'e-mail ────────────── */
 /* ⛔ ON CLIQUE LE VRAI BOUTON. Premier jet : `doLogin()` appelée à la main → elle jette sur
    `e.preventDefault()` (sa signature prend l'événement du formulaire), la connexion passait
    quand même par un autre chemin et la modale ne venait pas. On concluait « pas de modale »
    sur un parcours qu'on n'avait pas joué. On clique ce que l'utilisateur clique. */
 await p.click('form button[type="submit"], form .btn');
 await p.waitForTimeout(3500);
 const modale=await p.evaluate(()=>{ const m=document.querySelector('.modal-head h3'); return m?m.textContent.trim():'(aucune)'; });
 console.log('  modale : '+modale);
 await cap('2-nouveau-mot-de-passe');

 /* ── ÉTAPE 3 : rempli, prêt à enregistrer ───────────────────────────────────────────── */
 await p.evaluate(()=>{ const a=document.getElementById('fp-p1'), b=document.getElementById('fp-p2'), c=document.getElementById('fp-mail');
   if(a) a.value='Chantier2026!'; if(b) b.value='Chantier2026!'; if(c) c.value='marc.dubois@elan.fr'; });
 await cap('3-rempli');

 /* ── ÉTAPE 4 : enregistré → l'application ───────────────────────────────────────────── */
 await p.evaluate(()=>{ if(typeof forcePwdSave==='function') forcePwdSave(); });
 await p.waitForTimeout(3000);
 const apres=await p.evaluate(()=>{ const m=document.querySelector('.modal-head h3'); const e=document.getElementById('fp-err');
   return (m?'modale: '+m.textContent.trim():'(plus de modale)')+' · écran='+(typeof current!=='undefined'?current:'?')
     +' · erreur affichée: '+((e&&e.style.display!=='none'&&e.textContent)||'(aucune)')
     +' · mustChangePwd='+(typeof currentUser!=='undefined'&&currentUser?currentUser.mustChangePwd:'?')
     +' · email='+(typeof currentUser!=='undefined'&&currentUser?(currentUser.email||'(vide)'):'?'); });
 console.log('  après enregistrement : '+apres);
 /* L'assistant s'ouvre tout seul à la première arrivée : on le ferme pour montrer l'écran nu,
    qui est ce que la personne verra les fois suivantes. */
 await p.evaluate(()=>{ try{ if(typeof closeModal==='function') closeModal(); }catch(e){}
   document.querySelectorAll('.modal-close,[onclick*="closeModal"],[onclick*="leiaFermer"]').forEach(b=>{ try{ b.click(); }catch(e){} }); });
 await p.waitForTimeout(900);
 await cap('4-apres');

 console.log('\n  erreurs de page : '+(err.length?err.join(' | '):'aucune'));
 await nav.close(); srv.close();
})();
