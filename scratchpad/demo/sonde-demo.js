/* Sonde de la démonstration publique — demo.html servie en 127.0.0.1, réseau SURVEILLÉ, jour ET nuit, bureau 1440 et 1100 px ET téléphone 390 px.
   Usage : node scratchpad/demo/sonde-demo.js [métiers séparés par des virgules]   (défaut : 3d,plomberie,chauffage,nettoyage)
           CAPTURES=dossier  pour changer le dossier des images (défaut : scratchpad/demo/captures)
   Ce qu'elle PROUVE (chaque contrôle compte sa population avant de croire un zéro) :
   · aucune requête ne part hors de 127.0.0.1 — ni pendant le chargement (la surveillance part avant la première navigation), ni pendant
     le parcours — et la politique de contenu n'a rien eu à refuser (le pare-feu arrête avant elle) ;
   · aucune exception JavaScript, aucune erreur de console ;
   · le rangement de l'origine ne porte QUE des clés elanD_… (lu par le protocole du navigateur, pas par la page : la vue de la page ment exprès) ;
   · le parcours : choix du métier → tableau de bord → planning → une intervention ouverte puis clôturée → un devis → une facture « envoyée »
     qui dit « rien n'est envoyé » et reste un brouillon → « Recommencer » (le préfixe est effacé, l'exemple revient) ;
   · le bandeau est là, sur chaque écran visité, et ne déborde pas.                                                                       */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require('./lib.js');
const METIERS = (process.argv[2] || '3d,plomberie,chauffage,nettoyage').split(',');
const DOSSIER = process.env.CAPTURES || path.join(__dirname, 'captures');
const PROFILS = [
  { nom: 'bureau1440', l: 1440, h: 900, mobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15' },
  { nom: 'bureau1100', l: 1100, h: 800, mobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15' },
  { nom: 'tel390', l: 390, h: 844, mobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1' }
];
const THEMES = ['light', 'dark'];
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };

async function profil(S, P, theme) {
  await S.profil(P.l, P.h, P.mobile, theme);
  await S.c.envoyer('Emulation.setUserAgentOverride', { userAgent: P.ua });
}
/* les clés réellement rangées pour l'origine (CDP DOMStorage : la page ne les voit pas toutes — c'est exprès) */
async function clesReelles(S) {
  await S.c.envoyer('DOMStorage.enable').catch(() => {});
  const r = await S.c.envoyer('DOMStorage.getDOMStorageItems', { storageId: { securityOrigin: S.BASE, isLocalStorage: true } });
  return r.entries.map(e => e[0]);
}
async function attendreApp(S, ms) { return S.attendre('typeof db!=="undefined" && db && db.demoPublique && typeof currentUser!=="undefined" && currentUser && document.getElementById("content")', ms || 25000); }
async function ranger(S) {   // ferme ce qui s'ouvre tout seul (fenêtres, toasts) sans rien détruire de la page
  await S.ev('try{ closeModal(); }catch(e){} try{ const t=document.getElementById("toast"); if(t) t.classList.remove("show"); }catch(e){} return 1;');
}

(async () => {
  for (const M of METIERS) {
    console.log('\n══ ' + M + ' ══');
    const S = await ouvrir();
    try {
      await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
      /* 1. le choix du métier (page vide) : jour et nuit, trois tailles — pour le premier métier seulement */
      if (M === METIERS[0]) {
        for (const P of PROFILS) for (const th of THEMES) {
          await profil(S, P, th); await S.goto('/demo.html'); await S.attendre('document.querySelectorAll(".demo-carte").length>0', 15000); await dormir(500);
          const n = await S.ev('return document.querySelectorAll(".demo-carte").length');
          vrai('le choix du métier s\'affiche : ' + n + ' métiers (' + P.nom + ', ' + th + ')', n === 13);
          const deborde = await S.ev('const r=document.documentElement; return r.scrollWidth-document.documentElement.clientWidth');
          vrai('   et ne déborde pas de côté', deborde <= 1, deborde);
          await S.snap(path.join(DOSSIER, M, 'choix-' + P.nom + '-' + th + '.png'));
        }
      }
      await profil(S, PROFILS[0], 'light'); await S.goto('/demo.html'); await S.attendre('document.querySelectorAll(".demo-carte").length>0', 15000);
      await S.ev('document.querySelector(\'[data-metier="' + M + '"]\').click(); return 1;');
      vrai('(population) l\'application s\'ouvre sur le métier choisi', await attendreApp(S));
      await dormir(2500);
      const etat = await S.ev('return {metier:db.metier, t:db.techniciens.length, c:db.clients.length, i:db.interventions.length, p:db.produits.length, d:db.devis.length, f:db.factures.length, user:currentUser.id, vue:current, forfait:forfait(), suspendu:accesSuspendu()}');
      vrai('l\'exemple est posé pour ' + M + ' : ' + etat.t + ' techniciens, ' + etat.c + ' clients, ' + etat.i + ' interventions, ' + etat.p + ' produits, ' + etat.d + ' devis, ' + etat.f + ' factures',
        etat.metier === M && etat.t === 3 && etat.c === 6 && etat.i === 13 && etat.p >= 4 && etat.d === 3 && etat.f === 4 && etat.user === 'demo-admin' && etat.vue === 'dashboard' && etat.forfait === 'premium' && !etat.suspendu, etat);
      const ecrans = await S.ev('return {hl:!!document.getElementById("hl-ecran"), jr:!!document.getElementById("jr-ecran"), modal:(document.getElementById("overlay")||{}).className, login:getComputedStyle(document.getElementById("login")).display}');
      vrai('ni « Connexion requise », ni écran de jeton refusé, ni connexion, ni fenêtre ouverte toute seule', !ecrans.hl && !ecrans.jr && ecrans.login === 'none' && !/\bopen\b|\bshow\b|\bon\b/.test(ecrans.modal || ''), ecrans);

      /* 2. chaque rubrique visible s'ouvre sans exception, le bandeau en tête */
      const vues = await S.ev('const L=[]; NAV.forEach(s=>s.items.forEach(x=>{ if(canSee(x)) L.push(x.k); })); return L;');
      vrai('(population) ' + vues.length + ' rubriques ouvertes à la démonstration (toutes celles du métier, sans verrou de forfait)', vues.length >= 25, vues.length);
      const sansBandeau = [], vides = [], exc0 = S.exceptions.length, err0 = S.erreurs.length;
      for (const v of vues) {
        await S.ev('go(' + JSON.stringify(v) + '); return 1;'); await dormir(450); await ranger(S);
        const r = await S.ev('const c=document.getElementById("content"); const b=c.firstElementChild; return {b:!!(b&&b.id==="demo-bandeau"), n:c.innerText.length}');
        if (!r.b) sansBandeau.push(v); if (r.n < 80) vides.push(v);
      }
      vrai('le bandeau « Démonstration » ouvre chacune des ' + vues.length + ' rubriques', sansBandeau.length === 0, sansBandeau);
      vrai('aucune rubrique vide', vides.length === 0, vides);
      vrai('aucune exception, aucune erreur de console pendant les ' + vues.length + ' rubriques', S.exceptions.length === exc0 && S.erreurs.length === err0, S.exceptions.slice(exc0).concat(S.erreurs.slice(err0)));

      /* 3. les captures : trois tailles × jour et nuit, cinq écrans */
      for (const P of PROFILS) for (const th of THEMES) {
        await profil(S, P, th); await S.goto('/demo.html'); await attendreApp(S); await dormir(1800); await ranger(S);
        const ids = await S.ev('const i=db.interventions.find(x=>x.statut==="encours")||db.interventions[0]; const d=db.devis.find(x=>x.statut==="brouillon")||db.devis[0]; return {i:i.id,d:d.id};');
        for (const [nom, js] of [['tableau', 'go("dashboard")'], ['planning', 'go("planning")'], ['interventions', 'go("interventions")'], ['fiche-intervention', 'go("interventions"); detailIntervention("' + ids.i + '")'],
          ['devis', 'go("devis")'], ['produits', 'go("produits")'], ['clients', 'go("clients")']]) {
          await S.ev(js + '; return 1;'); await dormir(900); await S.snap(path.join(DOSSIER, M, nom + '-' + P.nom + '-' + th + '.png'));
          const deb = await S.ev('const r=document.documentElement; return r.scrollWidth-document.documentElement.clientWidth');
          if (deb > 1) vrai('pas de débordement latéral sur ' + nom + ' (' + P.nom + ', ' + th + ')', false, deb);
          await ranger(S);
        }
      }
      await profil(S, PROFILS[0], 'light'); await S.goto('/demo.html'); await attendreApp(S); await dormir(1200);

      /* 4. le geste : une intervention ouverte puis clôturée */
      const iid = await S.ev('const i=db.interventions.find(x=>x.statut==="encours"); return i&&i.id;');
      vrai('(population) une intervention est en cours aujourd\'hui', !!iid);
      await S.ev('go("interventions"); detailIntervention(' + JSON.stringify(iid) + '); return 1;'); await dormir(900);
      const fiche = await S.ev('return document.getElementById("content").innerText.length');
      vrai('la fiche de l\'intervention s\'ouvre', fiche > 200, fiche);
      await S.ev('window.confirm=()=>true; intSetStatut(' + JSON.stringify(iid) + ',"terminee"); return 1;'); await dormir(1200);
      await S.snap(path.join(DOSSIER, M, 'cloture.png'));
      const st = await S.ev('const i=db.interventions.find(x=>x.id===' + JSON.stringify(iid) + '); const m=document.getElementById("overlay"); return {st:i.statut, modal:!!(m&&m.classList.contains("open")), txt:(m&&m.innerText||"").slice(0,200)}');
      /* la clôture peut ouvrir un assistant (« compte rendu ») : on le dit, on ne le suppose pas */
      console.log('   clôture : statut ' + st.st + (st.modal ? ' — une fenêtre s\'est ouverte : « ' + st.txt.replace(/\s+/g, ' ').slice(0, 90) + '… »' : ''));
      vrai('l\'intervention est clôturée (ou la clôture guidée s\'ouvre)', st.st === 'terminee' || st.modal, st);
      await ranger(S);
      if (st.st !== 'terminee') { await S.ev('const i=db.interventions.find(x=>x.id===' + JSON.stringify(iid) + '); intSetStatutDo(i.id,"terminee"); return 1;'); await dormir(600); await ranger(S); }

      /* 5. un devis et une facture « envoyés » : « rien n'est envoyé », et ils restent des brouillons */
      for (const [coll, kind] of [['devis', 'devis'], ['factures', 'factures']]) {
        const d = await S.ev('const d=db.' + coll + '.find(x=>x.statut==="brouillon"); return d&&{id:d.id,num:d.num,statut:d.statut,client:(db.clients.find(c=>c.id===d.clientId)||{}).email};');
        vrai('(population) un ' + kind + ' brouillon existe, son client a un courriel inventé (.invalid)', !!d && /@exemple\.invalid$/.test(d.client || ''), d);
        await S.ev('go("' + kind + '"); return 1;'); await dormir(600);
        const av = await S.ev('return window.__demoPublique.refus.length');
        await S.ev('window.confirm=()=>true; window.__r=null; envoiDoc("' + kind + '",' + JSON.stringify(d.id) + ',"mail"); return 1;'); await dormir(2500);
        const ap = await S.ev('const x=db.' + coll + '.find(y=>y.id===' + JSON.stringify(d.id) + '); return {statut:x.statut, toast:(document.getElementById("toast")||{}).textContent||"", refus:window.__demoPublique.refus.length, href:location.href}');
        vrai(kind + ' « envoyé » : le message dit « rien n\'est envoyé » et le document reste un brouillon', /rien n.est envoy/.test(ap.toast) && ap.statut === 'brouillon' && ap.href.indexOf('mailto') < 0, ap);
        await S.snap(path.join(DOSSIER, M, 'envoi-' + kind + '.png'));
      }

      /* 6. aucune requête hors de 127.0.0.1, aucun refus de la politique de contenu */
      vrai('⛔ AUCUNE requête hors de 127.0.0.1 (population : ' + S.reseau.length + ' requêtes vues, toutes locales ou data:)', S.reseau.length > 20 && S.exterieur.length === 0, S.exterieur);
      vrai('⛔ la politique de contenu n\'a rien eu à refuser (le pare-feu arrête avant) : 0 requête bloquée, 0 violation', S.bloques.length === 0 && S.violations.length === 0, [S.bloques, S.violations]);
      const refus = await S.ev('return window.__demoPublique.refus.map(r=>r.genre+" "+r.cible.slice(0,60))');
      console.log('   refus du pare-feu pendant le parcours (' + refus.length + ') : ' + [...new Set(refus.map(r => r.split(' ')[0] + ' ' + (r.split(' ')[1] || '').replace(/^https?:\/\/([^/]+).*/, '$1')))].join(' ; '));
      const cles = await clesReelles(S);
      vrai('⛔ le rangement de l\'origine ne porte que des clés elanD_… (population : ' + cles.length + ' clés)', cles.length >= 8 && cles.every(k => /^(elanD_|opD_)/.test(k)), cles.filter(k => !/^(elanD_|opD_)/.test(k)));
      vrai('aucune exception JavaScript pendant tout le parcours', S.exceptions.length === 0, S.exceptions);
      vrai('aucune erreur de console pendant tout le parcours', S.erreurs.length === 0, S.erreurs.slice(0, 5));

      /* 7. Recommencer : le préfixe est effacé, l'exemple revient (même métier) */
      await S.ev('window.confirm=()=>true; db.clients[0].nom="MODIFIÉ PAR LE VISITEUR"; save(); return 1;');
      const avant = await S.ev('return db.clients[0].nom');
      await S.ev('demoPubliqueRecommencer(); return 1;'); await dormir(800);
      await attendreApp(S); await dormir(1500);
      const apres = await S.ev('return {nom:db.clients[0].nom, metier:db.metier, n:db.interventions.length, bandeau:!!document.getElementById("demo-bandeau")}');
      vrai('« Recommencer » efface les essais (« ' + avant + ' » → « ' + apres.nom + ' »), garde le métier et resème', avant === 'MODIFIÉ PAR LE VISITEUR' && apres.nom !== avant && apres.metier === M && apres.n === 13 && apres.bandeau, apres);
      const cles2 = await clesReelles(S);
      vrai('… et le rangement ne porte toujours que des clés elanD_…', cles2.every(k => /^(elanD_|opD_)/.test(k)), cles2.filter(k => !/^(elanD_|opD_)/.test(k)));
      vrai('⛔ après le rechargement : toujours aucune requête hors de 127.0.0.1', S.exterieur.length === 0 && S.bloques.length === 0, [S.exterieur, S.bloques]);
    } catch (e) { ko++; console.log('  ✗ la sonde est morte sur ' + M + ' : ' + (e && e.stack || e)); }
    S.fermer();
  }
  console.log('\n════ sonde-demo : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})();
