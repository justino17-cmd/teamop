/* ══ SONDE v763 — LES PLACES SERVIES PAR LE SERVEUR, DANS LA VRAIE PAGE ═══════════════════════════════════════════
   28 septembre 2026, nuit. La v763 lit `places` de /api/espaces/etat (ce qui est payé chez Stripe, et les places
   gardées par les abonnées d'avant) et ne le range JAMAIS dans la base synchronisée. Joué sur la bêta servie en
   127.0.0.1, iPhone de 402 px, par la VRAIE `forfaitServeurSync` — seul `fetch` est remplacé, pour rendre la réponse
   du serveur qu'on veut :
     1. sans réponse du serveur : Paramètres → « Places utilisateur » dit « 3 / 2 · 2 abonnements », avec « − » et
        « ＋ Abonnement » ;
     2. le serveur sert 7 places payées : « 3 / 7 · selon ce qui est payé », SANS « − » ni « ＋ Abonnement » (ils ne
        changeraient rien : le serveur réécrit le nombre) ; `db.forfaitQty` reste 2 (le nombre d'abonnements, celui
        que la v760 écrit aussi : pas de boucle de synchro) ; `places` n'est nulle part dans `db` ;
     3. la formule avait été réglée SUR L'APPAREIL (forfaitSrv « local »), la même que celle du serveur : les 7 places
        font foi quand même (`gardien`, M2) ; une formule locale DIFFÉRENTE, non ;
     4. 7 personnes pour 7 places, « ＋ Utilisateur » → « Créer » : la question dit que la place « s'ajoute d'elle-même
        à ton espace en quelques minutes » — plus « TEAM OP ajoute la place » ;
     5. aucune erreur JavaScript de toute la séance.
   ⛔ Bêta uniquement, 127.0.0.1. SOURCE=<une bêta d'avant> pour la contre-épreuve (la sonde compte ses échecs). */
const path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
let ok = 0, ko = 0; const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c || d === undefined ? '' : '  → ' + JSON.stringify(d))); };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
let navigateur = null;

(async () => {
  const S = await ouvrir(process.env.SOURCE ? { source: process.env.SOURCE } : {}); navigateur = S;
  console.log('page mesurée :', S.version);
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 402, height: 874, deviceScaleFactor: 3, mobile: true });
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  await S.c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  /* le bocal n'a pas de réseau : l'écran « Connexion requise » est neutralisé (ce n'est pas ce qu'on mesure) ;
     `fetch` ne répond qu'à /api/espaces/etat, avec la réponse posée par la sonde ; confirm et window.open sont notés */
  await S.ev(`window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
    window.loginExisteAilleurs=async function(){ return false; }; window.userIdentifiantsModal=function(){};
    window.__etat=null; window.__appelsEtat=0; const f0=window.fetch;
    window.fetch=function(u,o){ if(/\\/api\\/espaces\\/etat$/.test(String(u))){ window.__appelsEtat++; return Promise.resolve(new Response(JSON.stringify(window.__etat||{}),{status:200,headers:{'Content-Type':'application/json'}})); } return Promise.reject(new TypeError('hors ligne (sonde)')); };
    window.__questions=[]; window.__ouverts=[]; window.confirm=function(m){ window.__questions.push(String(m)); return false; };
    window.open=function(u,c){ window.__ouverts.push([String(u),c]); return null; }; return 1;`);
  const cle = await S.ev(`return STORE_KEY.replace(/_db.*$/,'').replace(/[^a-zA-Z]+$/,'');`);
  const syncCle = await S.ev(`return Object.keys(localStorage).length>=0 ? (typeof STORE_KEY==='string' && STORE_KEY.startsWith('elanB') ? 'elanB_sync_team' : 'elan_sync_team') : '';`);
  vrai('la page mesurée est la bêta (préfixe elanB_) — jamais app.html', syncCle === 'elanB_sync_team', { cle, syncCle });

  /* l'entreprise : un administrateur et deux collègues, Business Premium × 2 réglée par TEAM OP */
  await S.ev(`try{ closeModal(true); }catch(e){}
    const adm=db.users.find(u=>u.role==='admin')||{id:'u-admin-sonde', prenom:'Admin', nom:'Sonde', login:'admin-sonde', role:'admin', actif:true};
    db.users=[adm]; for(let i=1;i<=2;i++) db.users.push({id:'u-sonde-'+i, prenom:'Collègue', nom:'N'+i, login:'collegue'+i, role:'technicien', actif:true});
    db.forfait='premium'; db.forfaitQty=2; db.forfaitSrv='teamop'; db.forfaitEssai=null; db.formuleAttente=null;
    currentUser=adm; enterApp(adm); await new Promise(r=>setTimeout(r,1200)); try{ closeModal(true); }catch(e){}
    const b=document.getElementById('fdr-banner'); if(b) b.remove();
    localStorage.setItem(${JSON.stringify(syncCle)}, 'ent-sonde-763'); return db.users.length;`);
  const ligne = () => S.ev(`try{ closeModal(true); }catch(e){} go('parametres'); await new Promise(r=>setTimeout(r,700));
    const l=[...document.querySelectorAll('#content .frow')].find(r=>/Places utilisateur/.test(r.textContent));
    if(!l) return null; const t=l.textContent.replace(/\\s+/g,' ').trim();
    const b=[...l.querySelectorAll('button')].map(x=>x.textContent.replace(/\\s+/g,' ').trim());
    return { texte:t, boutons:b, qty:db.forfaitQty, places:planPlaces(), dansDb: JSON.stringify(db).includes('"places"') };`);

  console.log('\n1. sans réponse du serveur : le calcul d\'avant');
  let L = await ligne();
  vrai('la ligne « Places utilisateur » est trouvée dans Paramètres', !!L, L);
  if (L) {
    vrai('   « 3 / 2 » et « 2 abonnements » (1 compte par abonnement)', /3 \/ 2/.test(L.texte) && /2 abonnements/.test(L.texte), L.texte);
    v('   « − » et « ＋ Abonnement » sont là', L.boutons, ['−', '＋ Abonnement']);
  }

  console.log('\n2. le serveur sert 7 places payées');
  await S.ev(`window.__etat={formule:'premium', quantite:2, paye:true, motif:'abonnement Stripe (active, par référence d\\'espace)', places:7}; await forfaitServeurSync(true); return window.__appelsEtat;`);
  L = await ligne();
  vrai('la vraie forfaitServeurSync a interrogé /api/espaces/etat', (await S.ev(`return window.__appelsEtat;`)) >= 1);
  if (L) {
    vrai('⛔ « 3 / 7 · selon ce qui est payé »', /3 \/ 7/.test(L.texte) && /selon ce qui est payé/.test(L.texte), L.texte);
    v('⛔ ni « − » ni « ＋ Abonnement » (le serveur réécrirait le nombre)', L.boutons, []);
    v('⛔ db.forfaitQty reste 2 (le nombre d\'abonnements, comme la v760) — planPlaces rend 7', [L.qty, L.places], [2, 7]);
    v('⛔ `places` n\'entre pas dans la base synchronisée', L.dansDb, false);
  }

  console.log('\n3. une formule réglée sur l\'appareil');
  L = await S.ev(`db.forfaitSrv='local'; return { memeFormule: planPlaces() };`);
  v('⛔ la même que celle du serveur : les 7 places font foi (gardien, M2)', L.memeFormule, 7);
  L = await S.ev(`db.forfait='pro'; const p=planPlaces(); db.forfait='premium'; db.forfaitSrv='teamop'; return p;`);
  v('   une formule locale DIFFÉRENTE (Pro) : le calcul d\'avant (1 × 2)', L, 2);

  console.log('\n4. « ＋ Utilisateur » quand les 7 places sont prises');
  await S.ev(`for(let i=3;i<=6;i++) db.users.push({id:'u-sonde-'+i, prenom:'Collègue', nom:'N'+i, login:'collegue'+i, role:'technicien', actif:true}); window.__questions=[]; return db.users.length;`);
  const q = await S.ev(`try{ closeModal(true); }catch(e){} proposerAbonnement(); return window.__questions.slice();`);
  vrai('une question est posée (7 personnes pour 7 places)', q.length === 1, q);
  if (q[0]) {
    vrai('⛔ « la place s\'ajoute d\'elle-même à ton espace en quelques minutes »', q[0].includes('la place s\'ajoute d\'elle-même à ton espace en quelques minutes'), q[0]);
    vrai('   plus « TEAM OP ajoute la place »', !q[0].includes('TEAM OP ajoute'), q[0]);
    vrai('   « 7 utilisateurs pour 7 places »', q[0].includes('7 utilisateurs pour 7 places'), q[0]);
  }

  console.log('\n5. la séance');
  v('⛔ aucune erreur JavaScript', S.exceptions, []);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  await S.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('  ✗ la sonde a jeté : ' + (e && e.stack || e)); try { await navigateur.fermer(); } catch (x) {} process.exit(1); });
