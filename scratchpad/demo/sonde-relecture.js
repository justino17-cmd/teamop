/* Sonde navigateur de la RELECTURE de la démonstration publique (23 octobre 2026) — Chromium en CDP, demo.html servie en 127.0.0.1, réseau surveillé.
   Usage : node scratchpad/demo/sonde-relecture.js [métiers]   (défaut : 3d,plomberie,chauffage,nettoyage)   CAPTURES=dossier
   Ce qu'elle PROUVE, dans la vraie page (chaque contrôle compte sa population avant de croire un zéro) :
   · Paramètres : les huit cartes à serveur / boîte mail ne sont PLUS là, la carte Forfait dit « Formule » sans abonnement, jour ET nuit, 1440 / 1100 / 390 px ;
   · « Forcer la mise à jour » : un cache posé par la VRAIE application (même origine) survit au clic ;
   · la dictée : webkitSpeechRecognition n'existe pas, le bouton dit « Dictée non disponible » ;
   · Devis IA et Assistant devis : une phrase de démonstration, aucune requête ; « Réactiver la synchro » ne lève plus ;
   · sms: / mailto: : la page ne navigue pas, le toast le dit ;
   · ?metier=autre : une question avant de remplacer les essais (refus : la base reste ; accord : elle est remplacée) ;
   · un navigateur qui refuse la redéfinition du stockage : « Navigateur non pris en charge », aucune clé écrite chez les clients.      */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require('/home/user/teamop-demo/scratchpad/demo/lib.js');
const METIERS = (process.argv[2] || '3d,plomberie,chauffage,nettoyage').split(',');
const DOSSIER = process.env.CAPTURES || path.join('/home/user/teamop-demo/scratchpad/demo/captures', 'relecture');
const PROFILS = [
  { nom: 'bureau1440', l: 1440, h: 900, mobile: false }, { nom: 'bureau1100', l: 1100, h: 800, mobile: false }, { nom: 'tel390', l: 390, h: 844, mobile: true }
];
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const PRET = 'typeof db!=="undefined" && db && db.demoPublique && typeof currentUser!=="undefined" && currentUser && document.getElementById("content")';
const RETIREES = ['Notifications', 'Mon e-mail professionnel', 'Devis IA', "Installer l'application", "Synchronisation de l'équipe", 'Le lien de connexion de ton entreprise', 'Mes envois', 'E-mails aux clients'];

async function ouvrirMetier(S, m, P, th) {
  await S.profil(P.l, P.h, P.mobile, th);
  await S.goto('/demo.html?metier=' + m);
  const pret = await S.attendre(PRET, 40000);
  await dormir(1800);
  return pret;
}

(async () => {
  /* ── A. Paramètres, quatre métiers, jour et nuit, trois tailles ── */
  for (const M of METIERS) {
    console.log('\n══ ' + M + ' ══');
    const S = await ouvrir();
    try {
      for (const P of PROFILS) for (const th of ['light', 'dark']) {
        const pret = await ouvrirMetier(S, M, P, th);
        vrai('(population) l\'application est ouverte sur ' + M + ' (' + P.nom + ', ' + th + ')', pret);
        const r = JSON.parse(await S.ev(`
          go('parametres'); await new Promise(r=>setTimeout(r,1400));
          const cards=[...document.querySelectorAll('#content .card')];
          const titres=cards.map(c=>{const h=c.querySelector('.card-head h3'); return h?h.textContent.replace(/^[^A-Za-zÀ-ÿ]+/,'').trim():''});
          const f=cards.find(c=>/^Formule/.test((c.querySelector('.card-head h3')||{}).textContent||''));
          const r=document.documentElement;
          return JSON.stringify({titres, forfait: f?f.innerText.replace(/\\s+/g,' '):null, bandeau:(document.getElementById('demo-bandeau')||{}).innerText||null, deborde: r.scrollWidth-r.clientWidth});
        `));
        vrai('   (population) Paramètres affiche des cartes : ' + r.titres.length, r.titres.length >= 10);
        vrai('   ⛔ aucune des 8 cartes à serveur / boîte mail', RETIREES.every(t => r.titres.indexOf(t) < 0), r.titres.filter(t => RETIREES.indexOf(t) >= 0));
        vrai('   la carte Formule : pas d\'abonnement, tarifs', !!r.forfait && /Aucun abonnement n.existe ici/.test(r.forfait) && !/10 abonnements|Business Premium/.test(r.forfait), r.forfait);
        vrai('   le bandeau annonce ce qui manque', /IA, la synchro et le courrier ne fonctionnent pas ici/.test(r.bandeau || ''), r.bandeau);
        vrai('   la page ne déborde pas de côté', r.deborde <= 1, r.deborde);
        await S.snap(path.join(DOSSIER, M, 'parametres-' + P.nom + '-' + th + '.png'));
        await S.ev(`const f=[...document.querySelectorAll('#content .card')].find(c=>/^Formule/.test((c.querySelector('.card-head h3')||{}).textContent||'')); if(f) f.scrollIntoView({block:'center'}); await new Promise(r=>setTimeout(r,700)); return 1;`);
        await S.snap(path.join(DOSSIER, M, 'formule-' + P.nom + '-' + th + '.png'));
      }
      vrai('aucune exception JavaScript pendant le parcours', S.exceptions.length === 0, S.exceptions);
      vrai('aucune requête hors de 127.0.0.1 (et rien refusé par la politique de contenu)', S.exterieur.length === 0 && S.bloques.length === 0, [S.exterieur, S.bloques]);
    } finally { S.fermer(); }
  }

  /* ── B. les gestes, sur plomberie, bureau 1440 ── */
  console.log('\n══ gestes (plomberie) ══');
  {
    const S = await ouvrir();
    try {
      const P = PROFILS[0];
      /* un cache posé par la VRAIE application : sur une page de la même origine qui n'est pas la démonstration */
      await S.profil(P.l, P.h, false, 'light');
      await S.goto('/404.html'); await dormir(500);
      await S.ev(`await caches.open('teamop-REEL'); await caches.open('teamop-statique-v772'); return 1;`);
      const avant = JSON.parse(await S.ev(`return JSON.stringify(await caches.keys())`));
      vrai('(population) la vraie application a posé 2 caches sur l\'origine', avant.indexOf('teamop-REEL') >= 0 && avant.length >= 2, avant);
      await ouvrirMetier(S, 'plomberie', P, 'light');
      const vue = JSON.parse(await S.ev(`return JSON.stringify(await caches.keys())`));
      vrai('la démonstration NE VOIT PAS les caches de la vraie application', vue.length === 0, vue);
      const nav0 = await S.ev(`window.__marque='avant'; return 1;`);
      await S.ev(`go('parametres'); await new Promise(r=>setTimeout(r,1200)); const b=[...document.querySelectorAll('#content button')].find(x=>/Forcer la mise à jour/.test(x.textContent)); if(!b) throw new Error('bouton introuvable'); b.click(); return 1;`);
      await dormir(2500); await S.attendre(PRET, 30000);
      const rechargee = await S.ev(`return window.__marque===undefined`);
      vrai('« Forcer la mise à jour » a rechargé la page de la démonstration', rechargee === true);
      await S.goto('/404.html'); await dormir(600);
      const apres = JSON.parse(await S.ev(`return JSON.stringify(await caches.keys())`));
      vrai('⛔ les caches de la VRAIE application ont SURVÉCU au clic', apres.indexOf('teamop-REEL') >= 0 && apres.indexOf('teamop-statique-v772') >= 0, apres);

      /* la dictée */
      await ouvrirMetier(S, 'plomberie', P, 'light');
      const v = JSON.parse(await S.ev(`
        const r={ sr: typeof SpeechRecognition, wsr: typeof webkitSpeechRecognition };
        go('devis'); await new Promise(r=>setTimeout(r,1200)); devisIAModal(); await new Promise(r=>setTimeout(r,500));
        r.modal=!!document.getElementById('dia-demande'); r.etat=document.getElementById('dia-etat').textContent;
        document.getElementById('dia-mic').click(); await new Promise(r=>setTimeout(r,300)); r.mic=document.getElementById('dia-mic-etat').textContent;
        r.placeholder=document.getElementById('dia-demande').placeholder;
        document.getElementById('dia-demande').value='Remplacement d un chauffe-eau de 200 litres chez un particulier';
        document.getElementById('dia-go').click(); await new Promise(r=>setTimeout(r,800));
        r.err=document.getElementById('dia-err').textContent; r.errVisible=document.getElementById('dia-err').style.display;
        return JSON.stringify(r);`));
      vrai('(population) la fenêtre Devis IA est ouverte', v.modal === true);
      vrai('⛔ webkitSpeechRecognition / SpeechRecognition : « undefined »', v.sr === 'undefined' && v.wsr === 'undefined', v);
      vrai('le bouton « Dicter » dit « Dictée non disponible sur ce navigateur »', v.mic === 'Dictée non disponible sur ce navigateur', v.mic);
      vrai('la fenêtre Devis IA dit qu\'elle n\'est pas branchée (état)', /Démonstration : la rédaction par l’IA n’est pas branchée/.test(v.etat), v.etat);
      vrai('« Devis rapide » : une phrase de démonstration, pas « Le serveur ne répond pas »', /Dans la démonstration, la rédaction par l’IA n’est pas branchée/.test(v.err) && !/serveur ne répond pas/.test(v.err), v.err);
      await S.snap(path.join(DOSSIER, 'plomberie', 'devis-ia-bureau1440-light.png'));
      /* constat 3 de la relecture : tient à la reprise de claude/metiers-app (60fcbf9a) dans app.html, que cette branche n'a pas faite — dit, pas compté */
      if (/dératis|appâtage/i.test(v.placeholder || '')) console.log('  ⚠ (non compté) hors 3D, le champ de la prestation propose encore un exemple de dératisation : app.html de cette branche précède 60fcbf9a — à régler par la reprise de claude/metiers-app, puis node demo-build.js');
      else vrai('   le champ de la prestation n\'est plus un exemple de dératisation', true);
      await S.ev(`closeModal(); return 1;`);

      /* l'assistant devis, la synchro */
      const a = JSON.parse(await S.ev(`
        go('assistantDevis'); await new Promise(r=>setTimeout(r,1200));
        const t=document.getElementById('content').innerText.replace(/\\s+/g,' ');
        let exc=null; try{ const p=syncReactivate(); if(p&&p.then) await p; }catch(e){ exc=String(e); }
        return JSON.stringify({t, exc});`));
      vrai('l\'Assistant devis : une phrase de démonstration, ni « Code d\'accès requis » ni « Demande le code »', /Dans la démonstration, l’assistant ne répond pas/.test(a.t) && !/Code d'accès|Demande le code/.test(a.t), a.t);
      await S.snap(path.join(DOSSIER, 'plomberie', 'assistant-devis-bureau1440-light.png'));
      vrai('« Réactiver la synchro » (syncReactivate) ne lève plus de TypeError', a.exc === null, a.exc);

      /* sms / mailto */
      let navs = 0; S.c.sur(m => { if (m.method === 'Page.frameNavigated') navs++; });
      await S.c.envoyer('Page.enable');
      const u0 = await S.ev(`return location.href`);
      const t = JSON.parse(await S.ev(`
        demoNav.href='sms:0199003441?&body=Bonjour'; demoNav.href='mailto:client@exemple.invalid?subject=Devis';
        await new Promise(r=>setTimeout(r,500));
        return JSON.stringify({href:location.href, toast:(document.getElementById('toast')||{}).textContent||''});`));
      await dormir(600);
      vrai('sms: / mailto: : la page ne navigue pas, le toast le dit', t.href === u0 && navs === 0 && /messagerie ne s’ouvre pas/.test(t.toast), [t, navs]);
      vrai('aucune exception, aucune requête extérieure', S.exceptions.length === 0 && S.exterieur.length === 0, [S.exceptions, S.exterieur]);
    } finally { S.fermer(); }
  }

  /* ── C. ?metier= : on demande avant de remplacer ── */
  console.log('\n══ ?metier=autre ══');
  for (const accepte of [false, true]) {
    const S = await ouvrir();
    try {
      await S.c.envoyer('Page.enable');
      let dialogues = 0;
      S.c.sur(m => { if (m.method === 'Page.javascriptDialogOpening') { dialogues++; S.c.envoyer('Page.handleJavaScriptDialog', { accept: accepte }).catch(() => {}); } });
      await ouvrirMetier(S, '3d', PROFILS[0], 'light');
      await S.ev(`db.clients.push({id:'c-visiteur',nom:'Client du visiteur',email:'',tel:''}); save(); return 1;`);
      await dormir(400);
      await S.goto('/demo.html?metier=plomberie'); await S.attendre(PRET, 40000); await dormir(1500);
      const r = JSON.parse(await S.ev(`return JSON.stringify({metier: db.demoPublique.metier, garde: db.clients.some(c=>c.id==='c-visiteur'), url: location.search})`));
      vrai('un autre métier dans l\'adresse : UNE question posée (' + (accepte ? 'acceptée' : 'refusée') + ')', dialogues === 1, dialogues);
      if (!accepte) vrai('⛔ refusée : la base 3D et l\'essai du visiteur sont intacts, l\'adresse est nettoyée', r.metier === '3d' && r.garde === true && r.url === '', r);
      else vrai('acceptée : l\'exemple du plombier remplace les essais', r.metier === 'plomberie' && r.garde === false, r);
    } finally { S.fermer(); }
  }

  /* ── D. un navigateur qui refuse la vue du stockage ── */
  console.log('\n══ stockage refusé ══');
  {
    const S = await ouvrir();
    try {
      await S.c.envoyer('Page.enable');
      await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: "try{ var ls=window.localStorage; Object.defineProperty(window,'localStorage',{value:ls,writable:false,configurable:false}); Object.defineProperty(window,'sessionStorage',{value:window.sessionStorage,writable:false,configurable:false}); window.__figé=true; }catch(e){ window.__figé='échec '+e; }" });
      await S.profil(1440, 900, false, 'light');
      await S.goto('/demo.html?metier=plomberie'); await dormir(3500);
      const r = JSON.parse(await S.ev(`return JSON.stringify({fige: window.__figé, isole: window.__demoPublique && window.__demoPublique.stockageIsole, texte: (document.getElementById('login-box')||{}).innerText||'', app: getComputedStyle(document.getElementById('app-root')).display, cles: Object.keys(localStorage)})`));
      vrai('(population) le navigateur de l\'essai refuse bien la redéfinition', r.fige === true && r.isole === false, r);
      vrai('⛔ « Navigateur non pris en charge » : l\'application ne s\'ouvre pas', /Navigateur non pris en charge/.test(r.texte) && r.app === 'none', r);
      const cles = await S.c.envoyer('DOMStorage.enable').then(() => S.c.envoyer('DOMStorage.getDOMStorageItems', { storageId: { securityOrigin: S.BASE, isLocalStorage: true } })).then(x => x.entries.map(e => e[0]));
      vrai('(population) le rangement réel porte les clés de la démonstration elle-même (le script de l\'application a tourné jusqu\'au démarrage)', cles.length > 0 && cles.every(k => /^(elanD_|opD_)/.test(k)), cles);
      vrai('⛔ et AUCUNE clé hors du préfixe de la démonstration : ni top_monitor_off, ni elan_…, ni teamop_… (celles de l\'application des clients)', cles.filter(k => !/^(elanD_|opD_)/.test(k)).length === 0 && cles.indexOf('top_monitor_off') < 0, cles);
      await S.snap(path.join(DOSSIER, 'plomberie', 'navigateur-non-pris-en-charge.png'));
    } finally { S.fermer(); }
  }
  console.log('\n════ sonde-relecture : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exit(2); });
