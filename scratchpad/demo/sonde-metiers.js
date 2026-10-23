/* Sonde des 23 métiers de la démonstration publique — demo.html en 127.0.0.1, réseau surveillé (24 octobre 2026).
   Usage : node scratchpad/demo/sonde-metiers.js [métiers séparés par des virgules]   (défaut : les 23 de metiers.json)
   Pour CHAQUE métier : la carte du choix existe (population), un clic ouvre l'application, et la base posée est relevée DANS la page :
   techniciens (prénom, fonction — l'accord est à relire à l'œil, il est imprimé), types d'intervention, catégories de produits,
   un mot de l'anti-nuisibles hors 3D, courriels/téléphones, requêtes hors 127.0.0.1, exceptions, erreurs de console. */
const { ouvrir, dormir } = require('./lib.js');
const metiersJson = require('../../metiers.json');
const METIERS = (process.argv[2] || metiersJson.ordreMetiers.join(',')).split(',');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const MOTS_3D = '/d[ée]ratis|d[ée]sinsect|punaise|rongeur|nuisible|blatte|frelon|gu[êe]pe|rodenticide|insecticide|certibiocide|biocide/i';
(async () => {
  const S = await ouvrir();
  try {
    await S.profil(1440, 900, false, 'light');
    await S.goto('/demo.html'); await S.attendre('document.querySelectorAll(".demo-carte").length>0', 15000);
    const cartes = await S.ev('return [...document.querySelectorAll(".demo-carte")].map(c=>c.getAttribute("data-metier"))');
    vrai('(population) ' + cartes.length + ' cartes de métier au choix, aucune « Bientôt »', cartes.length === 23 && !(await S.ev('return /bientôt/i.test(document.body.innerText.split("Démonstration")[0]||"") && /bientôt/i.test([...document.querySelectorAll(".demo-carte")].map(c=>c.innerText).join(" "))')), cartes);
    for (const M of METIERS) {
      console.log('\n══ ' + M + ' ══');
      await S.ev('try{ Object.keys(localStorage).filter(k=>/^(elanD_|opD_)/.test(k)).forEach(k=>localStorage.removeItem(k)); }catch(e){} return 1;');
      const ext0 = S.exterieur.length, exc0 = S.exceptions.length, err0 = S.erreurs.length;
      await S.goto('/demo.html'); await S.attendre('document.querySelectorAll(".demo-carte").length>0', 15000);
      const present = await S.ev('return !!document.querySelector(\'[data-metier="' + M + '"]\')');
      vrai('la carte « ' + M + ' » existe', present); if (!present) continue;
      const libelle = await S.ev('return document.querySelector(\'[data-metier="' + M + '"]\').innerText.replace(/\\s+/g," ").trim()');
      await S.ev('document.querySelector(\'[data-metier="' + M + '"]\').click(); return 1;');
      const pret = await S.attendre('typeof db!=="undefined" && db && db.demoPublique && typeof currentUser!=="undefined" && currentUser && document.getElementById("content")', 25000);
      vrai('l\'application s\'ouvre (carte : « ' + libelle + ' »)', pret); if (!pret) continue;
      await dormir(1500);
      const e = await S.ev(`const T=intTypes(), C=categoriesProduit(); const re=${MOTS_3D}; const tout=JSON.stringify([db.techniciens,db.clients,db.interventions,db.produits,db.devis,db.factures,db.contrats,db.fournisseurs]);
        return {metier:db.metier, ent:(db.entreprise||{}).nom||(db.entreprise||{}).raison||'', tech:db.techniciens.map(t=>t.nom+' — '+t.metier),
        nInt:db.interventions.length, typesHors:db.interventions.filter(i=>T.indexOf(i.type)<0).map(i=>i.type), typesUtilises:[...new Set(db.interventions.map(i=>i.type))],
        catsHors:db.produits.filter(p=>C.indexOf(p.categorie)<0).map(p=>p.categorie), nProd:db.produits.length, mot3d:(re.exec(tout)||[])[0]||null,
        cli:db.clients.map(c=>c.nom+' | '+c.email+' | '+c.tel), users:db.users.map(u=>u.id+':'+u.role), forfait:forfait(), suspendu:accesSuspendu(), vue:current,
        bandeau:!!document.getElementById('demo-bandeau'), reseau:typeof syncEnabled==='function'?syncEnabled():null, ipp:!!(window.__demoPublique)}`);
      console.log('   ' + e.ent + ' · techniciens : ' + e.tech.join(' ; '));
      console.log('   clients : ' + e.cli.slice(0, 2).join(' ; ') + ' …');
      console.log('   types : ' + e.typesUtilises.join(', '));
      vrai('(population) ' + e.nInt + ' interventions, ' + e.nProd + ' produits, ' + e.tech.length + ' techniciens', e.nInt >= 10 && e.nProd >= 4 && e.tech.length === 3);
      vrai('métier posé = ' + M, e.metier === M, e.metier);
      vrai('tous les types et catégories appartiennent au métier', e.typesHors.length === 0 && e.catsHors.length === 0, [e.typesHors, e.catsHors]);
      vrai(M === '3d' ? 'la 3D garde son vocabulaire' : 'aucun mot de l\'anti-nuisibles', M === '3d' ? e.mot3d !== null : e.mot3d === null, e.mot3d);
      vrai('courriels .invalid et téléphones 01 99 00', e.cli.every(l => /\.invalid \| 01 99 00 \d\d \d\d$/.test(l)), e.cli);
      vrai('un seul compte fictif (demo-admin), forfait premium, jamais suspendu, bandeau présent, synchro éteinte', e.users.join() === 'demo-admin:admin' && e.forfait === 'premium' && !e.suspendu && e.bandeau && !e.reseau, e);
      vrai('aucune requête hors 127.0.0.1, aucune exception, aucune erreur de console', S.exterieur.length === ext0 && S.exceptions.length === exc0 && S.erreurs.length === err0, [S.exterieur.slice(ext0), S.exceptions.slice(exc0), S.erreurs.slice(err0)]);
    }
    vrai('⛔ en tout : ' + S.reseau.length + ' requêtes vues, ZÉRO hors 127.0.0.1, ZÉRO bloquée par la politique de contenu', S.reseau.length > 50 && S.exterieur.length === 0 && S.bloques.length === 0 && S.violations.length === 0, [S.exterieur, S.bloques, S.violations]);
  } finally { S.fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORT', e); process.exit(2); });
