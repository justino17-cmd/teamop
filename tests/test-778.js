/* ══ UN SEUL ACCUEIL LE MATIN (v730) ════════════════════════════════════════════════════════
   Justin, 23 septembre 2026 : « chaque matin pour tes techniciens, fais ce qui est le mieux ».

   Jusque-là un technicien qui avait des interventions recevait DEUX accueils à 200 ms d'écart :
   le panneau de Leia s'ouvrait sur « Petits rappels du jour » (« 3 intervention(s) prévue(s)
   aujourd'hui »…) ET le bandeau « Ta journée » montait en bas. La même nouvelle deux fois, dont
   une qui couvre l'écran. La sonde « Ma journée » devait elle-même fermer Leia pour pouvoir
   photographier le bandeau — c'est ce qui l'a trahi.

   La règle, une fois par jour et par personne (`accueilJournee`) :
   · un TECHNICIEN qui a des interventions aujourd'hui → « Ta journée », ses retards compris ;
   · tous les autres (un responsable : administrateur, DR, chef d'équipe ; un technicien sans
     intervention ce jour-là) → leurs rappels sont dans la CLOCHE.

   ⛔ 23 SEPTEMBRE 2026 AU SOIR — LEIA EST RETIRÉE. Justin : « on supprime la bulle Leia, on
   supprime totalement, on fera un vrai agent dans le futur ». Plus de bulle, plus de bienvenue
   qu'elle ouvrait, plus de rappels qu'elle ouvrait chaque matin. Ce qu'elle était SEULE à dire
   (les interventions en retard, les factures impayées) est passé dans la cloche — la section 3
   l'EXÉCUTE. La visite guidée et « Signaler un problème » vivent dans Paramètres → Aide.

   Ce banc EXÉCUTE la vraie `accueilJournee` extraite du fichier livré — une règle se mesure à ce
   qu'elle laisse passer, pas au texte qui la nomme. Le comportement de bout en bout (vrai
   `enterApp`, minuteries comprises, cinq matins) est dans `scratchpad/sonde-accueil.js`, qui
   voit les deux accueils sur la bêta d'avant (7 ✗) et un seul sur celle-ci (18 ✓).          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* Découpe par ACCOLADES appariées, à partir d'une ouverture donnée. */
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) {
    const c = SRC[k];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); }
  }
  return '';
}

console.log('\n── 778 · 1. la règle, extraite et JOUÉE ──');
const fAcc = bloc('function accueilJournee(){'), fTech = bloc('function intTechIds(i){'), fMy = bloc('function myTechId(){');
/* ⛔ v737 : la règle lit une CASE (« Tout voir »), plus le nom du rôle — on lui donne donc les
   VRAIS userCap / can / capDeduitRegle. Sans eux, `can` manquait, l'exception tombait dans le
   `catch` de la règle, et TOUS les cas rendaient « cloche » : les trois responsables passaient au
   vert pour une mauvaise raison, et seul le technicien le trahissait. */
const fCap = bloc('function userCap(u,cap){'), fCan = bloc('function can(cap){'), fRegle = bloc('function capDeduitRegle(cap){');
vrai('population : userCap, can et capDeduitRegle sont trouvés', fCap.length > 200 && fCan.length > 40 && fRegle.length > 200, [fCap.length, fCan.length, fRegle.length]);
vrai('population : accueilJournee, intTechIds et myTechId sont trouvés', fAcc.length > 150 && fTech.length > 40 && fMy.length > 60,
  [fAcc.length, fTech.length, fMy.length]);
v1: {
  if (!fAcc) break v1;
  const AUJ = '2026-09-23';
  const jouer = (user, interventions) => {
    const bac = { currentUser: user, db: { interventions, techniciens: [] }, todayISO: () => AUJ, CAPS: { technicien: {} },
                  fullName: u => ((u.prenom || '') + ' ' + (u.nom || '')).trim() };
    vm.createContext(bac);
    vm.runInContext(fRegle + '\n' + fCap + '\n' + fCan + '\n' + fTech + '\n' + fMy + '\n' + fAcc + '\nthis.r = accueilJournee();', bac);
    return bac.r;
  };
  const tech = { id: 'u1', role: 'technicien', techId: 't1' };
  const jour = [{ date: AUJ, techIds: ['t1'], statut: 'planifiee' }];
  vrai('⛔ un technicien qui a une intervention aujourd’hui → « Ta journée »', jouer(tech, jour) === true);
  vrai('… même quand elle ne porte que l’ancien champ `techId`', jouer(tech, [{ date: AUJ, techId: 't1', statut: 'encours' }]) === true);
  vrai('⛔ une intervention ANNULÉE ne fait pas une journée', jouer(tech, [{ date: AUJ, techIds: ['t1'], statut: 'annulee' }]) === false);
  vrai('⛔ rien aujourd’hui (seulement du retard) → la cloche, pas le bandeau', jouer(tech, [{ date: '2026-09-22', techIds: ['t1'], statut: 'planifiee' }]) === false);
  vrai('⛔ la journée d’un AUTRE technicien ne compte pas', jouer(tech, [{ date: AUJ, techIds: ['t2'], statut: 'planifiee' }]) === false);
  vrai('⛔ l’administrateur, même technicien et occupé → la cloche, pas le bandeau', jouer({ id: 'u2', role: 'admin', techId: 't1' }, jour) === false);
  for (const r of ['dr', 'chefEquipe', 'technicien'])
    vrai(`⛔ qui a « Tout voir » (rôle ${r}), même occupé → la cloche, pas le bandeau`, jouer({ id: 'u2', role: r, techId: 't1', acces: { caps: { voirTout: true } } }, jour) === false);
  /* ⛔⛔ v737 — « technicien, DR… c'est juste des noms » (Justin, 23 septembre 2026) : un compte
     nommé « DR » ou « chef d'équipe » à qui l'on n'a PAS coché « Tout voir » ne voit que ses
     interventions — sa journée, c'est « Ta journée ». Jusqu'ici son NOM le lui retirait. */
  for (const r of ['dr', 'chefEquipe'])
    vrai(`⛔⛔ un compte nommé « ${r} » SANS « Tout voir », qui a sa journée → « Ta journée » (le nom ne décide plus)`, jouer({ id: 'u2', role: r, techId: 't1' }, jour) === true);
  vrai('un compte sans technicien lié → la cloche', jouer({ id: 'u3', role: 'technicien' }, jour) === false);
  vrai('personne de connecté → rien', jouer(null, jour) === false);
}

console.log('\n── 778 · 2. le câblage : jamais les deux ──');
const fEnter = bloc('function enterApp(u){');
vrai('population : enterApp est trouvé', fEnter.length > 2000, fEnter.length);
const plat = fEnter.replace(/\s*\n\s*/g, ' ');
vrai('⛔⛔ « Ta journée » est le SEUL accueil programmé, et seulement quand c’est l’accueil du jour',
  /if\(accueilJournee\(\)\) setTimeout\(\(\)=>\{ try\{ planFdrCheck\(\); \}catch\(e\)\{\} \},\d+\);/.test(plat)
  && (plat.match(/planFdrCheck\(\)/g) || []).length === 1);
vrai('⛔ plus rien n’ouvre Leia au démarrage (ni bienvenue, ni rappels)', !/maybeWelcome|maybeRappels|renderAsst|asstOpen/.test(plat));
vrai('⛔⛔ Leia n’existe plus nulle part : ni élément, ni fonction, ni état',
  !/id="assistant"/.test(SRC) && !/function (maybeWelcome|maybeRappels|computeRappels|renderAsst|askAssistant|openAsst|toggleAsst)\(/.test(SRC)
  && !/\basstMsgs\b|\basstOpen\b|APP_GUIDE|ASST_KB/.test(SRC));
const fFdr = bloc('function planFdrCheck(){');
vrai('population : planFdrCheck est trouvé', fFdr.length > 400, fFdr.length);
vrai('⛔ planFdrCheck porte la même règle (un autre appelant ne la contourne pas)', /if\(!accueilJournee\(\)\) return;/.test(fFdr));
vrai('⛔ le bandeau dit les retards DU technicien (pas ceux de l’entreprise)',
  /const retard=\(db\.interventions\|\|\[\]\)\.filter\(i=>i\.date<todayISO\(\)&&intTechIds\(i\)\.includes\(tid\)/.test(fFdr) && /en retard/.test(fFdr));
v('une seule définition de accueilJournee', (SRC.match(/function accueilJournee\(/g) || []).length, 1);
/* ⛔ Trouvé par la sonde le 23 septembre 2026 au soir : le minuteur de 15 s effaçait « le bandeau
   qui porte ce nom », pas le sien — un collègue qui se connecte dans les 15 s perdait le sien. */
vrai('⛔ le minuteur efface SON bandeau, pas celui qui porte le même nom', /setTimeout\(\(\)=>\{ try\{ b\.remove\(\); \}catch\(e\)\{\} \},15000\);/.test(fFdr)
  && !/setTimeout\(\(\)=>\{ try\{ const el=document\.getElementById\('fdr-banner'\)/.test(fFdr));
vrai('⛔ … un nouveau bandeau remplace l’ancien au lieu de s’empiler sous le même identifiant',
  /const ancien=document\.getElementById\('fdr-banner'\); if\(ancien\) ancien\.remove\(\);\s*document\.body\.appendChild\(b\);/.test(fFdr));
vrai('⛔ … et la déconnexion le retire (sa journée et ses clients ne restent pas sur l’écran de connexion)',
  /const fb=document\.getElementById\('fdr-banner'\); if\(fb\) fb\.remove\(\);/.test(bloc('function logout(){')));
function v(t, a, b) { vrai(t, JSON.stringify(a) === JSON.stringify(b), a); }

console.log('\n── 778 · 3. ⛔ CE QUE LEIA ÉTAIT SEULE À DIRE EST DANS LA CLOCHE — exécuté ──');
/* On découpe les deux lignes neuves de `computeNotifs` dans le fichier livré, et on les JOUE avec
   une horloge, des droits et une base. Un contrôle sur le texte laisserait passer une condition
   inversée ; celui-ci la voit. */
{ const iR = SRC.indexOf("const retard=visibleInts(db.interventions||[])");
  const iD = SRC.lastIndexOf("if(notifVoitModule('interventions')||notifVoitModule('planning')){", iR);
  const iI = SRC.indexOf("if(can('voirCompta') && (notifVoitModule('factures')||notifVoitModule('comptabilite'))){", iR);
  let fin = -1; if (iI > 0) { let p = 0; for (let k = SRC.indexOf('{', iI); k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (p === 0) { fin = k + 1; break; } } } }
  const code = (iD > 0 && iR > iD && iI > iR && fin > iI) ? SRC.slice(iD, fin) : '';
  vrai('population : les deux lignes de la cloche sont trouvées dans computeNotifs', code.length > 400 && iR - iD < 120, code.length);
  const jouer = ({ voit = ['interventions', 'factures', 'comptabilite'], compta = true, ints = [], facts = [] } = {}) => {
    const bac = { out: [], today: '2026-09-23', db: { interventions: ints, factures: facts },
      notifVoitModule: k => voit.includes(k), can: k => k === 'voirCompta' && compta,
      visibleInts: l => l, fmtShort: d => d.slice(8) + '/' + d.slice(5, 7), esc: x => x };
    vm.createContext(bac); vm.runInContext(code, bac); return bac.out;
  };
  const ints = [{ id: 'a', date: '2026-09-20', statut: 'planifiee' }, { id: 'b', date: '2026-09-18', statut: 'encours' },
                { id: 'c', date: '2026-09-21', statut: 'terminee' }, { id: 'd', date: '2026-09-23', statut: 'planifiee' },
                { id: 'e', date: '2026-09-19', statut: 'annulee' }];
  const facts = [{ id: 'f1', statut: 'envoyee' }, { id: 'f2', statut: 'retard' }, { id: 'f3', statut: 'payee' }, { id: 'f4', statut: 'brouillon' }];
  if (code) {
    const o = jouer({ ints, facts });
    const r = o.find(x => /^retard:/.test(x.id)), f = o.find(x => /^impayees:/.test(x.id));
    vrai('⛔ les interventions EN RETARD : deux (planifiée ou en cours, d’avant aujourd’hui) — ni la terminée, ni l’annulée, ni celle du jour',
      !!r && /<b>2 interventions en retard<\/b>/.test(r.txt), r && r.txt);
    vrai('… la plus ancienne est nommée (18/09)', !!r && /la plus ancienne du 18\/09/.test(r.txt), r && r.txt);
    vrai('… et la ligne mène aux Interventions', !!r && r.act === "go('interventions')", r && r.act);
    vrai('⛔ les factures IMPAYÉES : envoyée et en retard, pas la payée ni le brouillon', !!f && /<b>2 factures impayées<\/b>/.test(f.txt), f && f.txt);
    vrai('… et la ligne mène à la Comptabilité', !!f && f.act === "go('comptabilite')", f && f.act);
    /* ⛔ Trouvé par mutation : la première version comparait deux jeux dont la date la plus ancienne
       différait AUSSI — un identifiant qui ne portait que la date passait au vert. Ici la plus
       ancienne reste le 18 : seul le NOMBRE change. */
    const plus = jouer({ ints: ints.concat([{ id: 'g', date: '2026-09-21', statut: 'planifiee' }]), facts }).find(x => /^retard:/.test(x.id));
    vrai('⛔ quand le NOMBRE change (même plus ancienne), la ligne revient « non lue » — l’identifiant porte le compte',
      !!r && !!plus && /<b>3 interventions en retard<\/b>/.test(plus.txt) && /18\/09/.test(plus.txt) && r.id !== plus.id, [r && r.id, plus && plus.id]);
    vrai('⛔ sans le droit de voir la compta, AUCUNE ligne de factures', !jouer({ ints, facts, compta: false }).some(x => /^impayees:/.test(x.id)));
    vrai('⛔ sans la rubrique Interventions ni Planning, AUCUNE ligne de retard', !jouer({ ints, facts, voit: ['factures'] }).some(x => /^retard:/.test(x.id)));
    vrai('rien en retard, rien d’impayé → rien d’ajouté', jouer({ ints: ints.slice(2), facts: facts.slice(2) }).length === 0);
  }
}
{ const fPar = bloc('views.parametres=function(){'), fAide = bloc('function carteAide(){');
  vrai('⛔ la visite guidée et « Signaler un problème » ont une maison : Paramètres → Aide',
    /<h3>Aide<\/h3>/.test(fAide) && /onclick="startTour\(\)"/.test(fAide) && /onclick="signalerProbleme\(\)"/.test(fAide));
  /* ⛔ Et POUR TOUT LE MONDE : la carte vit dans `_app`, la partie que voient aussi les comptes non
     administrateurs — un technicien n'ouvre de Paramètres que ses propres réglages. */
  const iApp = fPar.indexOf('const _app=`'), iNonAdmin = fPar.indexOf("if(currentUser.role!=='admin')");
  vrai('⛔ … et un technicien la voit aussi (elle est dans la partie commune, avant le partage admin / non-admin)',
    iApp > 0 && iNonAdmin > iApp && /carteAppareil\(\)\+carteAide\(\);/.test(fPar.slice(iApp, iNonAdmin)));
  vrai('… et le signalement arrive toujours à l’Historique (catégorie support)', /logEvent\('Problème signalé',txt,'support'\)/.test(bloc('function signalerEnvoyer(e){')));
  vrai('… et la visite ne ferme plus une bulle qui n’existe pas', !/closeAsst/.test(bloc('function startTour(){')));
}

console.log('\n── 778 · 4. la mesure de bout en bout existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-accueil.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-accueil.js existe', !!SONDE);
vrai('… elle passe par le VRAI enterApp', /enterApp\(u\)/.test(SONDE));
vrai('… elle COMPTE les accueils affichés (bandeau, et plus jamais de bulle)', /accueils\(/.test(SONDE) && /Leia/.test(SONDE));
vrai('… elle joue le responsable ET le premier lancement', /ADMINISTRATEUR/.test(SONDE) && /PREMIER LANCEMENT/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-778 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
