/* ══ POINTAGE : « DÉBUT DE JOURNÉE » ⇄ « FIN DE JOURNÉE », EN TÊTE DE L'ÉCRAN (v733) ══════════
   Justin, 23 septembre 2026, capture de son iPhone à l'appui : « Juste ici, je veux plus ce
   bouton saisir manuellement. Je veux un bouton début de journée ; une fois cliqué dessus, ça met
   le bouton en fin de journée. Ils appuient fin de journée et là ils ont le temps de travail. Et
   s'ils reprennent la même journée, ça cumule, mais ça coupe la pause entre la fin et la reprise.
   Ils appuient, ça démarre, avec un historique qui se mettra en dessous. »

   Ce qu'il voyait, et pourquoi : le bouton « ▶ Pointer » EXISTAIT, dans une carte « Ma journée »
   réservée aux comptes reliés à une fiche du personnel. Or un rôle de bureau (administrateur,
   comptable, commercial) n'en reçoit jamais — c'est le rôle qui décide. Sur son compte, l'écran
   n'offrait donc QUE la saisie manuelle.

   Ce banc EXÉCUTE les vraies fonctions extraites d'app.html, horloge en main : le bouton du jour
   et ses trois états, le cumul, la pause qui n'est pas comptée, la reprise, l'oubli, et le compte
   qui ne peut pas fermer la journée d'un autre. Le geste au doigt, dans une vraie page, est dans
   `scratchpad/sonde-pointage.js`.                                                              */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

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

console.log('\n── 782 · 0. la population ──');
const NOMS = ['minutes(deb,fin)', 'pt2(n)', 'ptHM(ts)', 'ptHMS(ts)', 'ptJourDe(d)', 'ptJour(ts)', 'ptOuvert(p)', 'ptOubli(p,now)',
  'ptSecs(p,now)', 'ptDuree(sec)', 'ptChrono(sec)', 'ptHoraires(p)', 'ptEstAMoi(p)', 'ptMesPointages()', 'ptOuverteMoi()', 'ptNom(p)',
  'ptPauseEntre(a,b)', 'ptTotal(list,now)', 'ptBoutonJour()', 'pointerDebut()', 'pointerFin()', 'ptFermer(id,ts)'];
const CODE = NOMS.map(n => bloc('function ' + n + '{'));
const manquent = NOMS.filter((n, i) => !CODE[i]);
v('les ' + NOMS.length + ' fonctions du pointage sont trouvées', manquent, []);
const maxH = (SRC.match(/const PT_MAX_H = (\d+);/) || [])[1];
vrai('… et le plafond PT_MAX_H', !!maxH, maxH);

/* Un bac à sable avec une HORLOGE en main (Date.now), une base, un compte. Tout le reste de
   l'application est remplacé par des témoins qui comptent ce qu'on leur demande. */
function monde({ tid = null, moi = 'uA', users = [{ id: 'uA', prenom: 'Justin', nom: 'Biret' }] } = {}) {
  const ctx = { db: { pointages: [], users, techniciens: [] }, currentUser: moi ? { id: moi } : null,
    toasts: [], journal: [], saves: 0, rendus: 0, clore: [], current: 'pointage', navigator: {} };
  vm.createContext(ctx);
  vm.runInContext(`
    let __t = 0; Date.now = () => __t; var setT = t => { __t = t; };
    var myTechId = () => __tid; var __tid = null;
    var techName = id => 'Fiche ' + id;
    var fullName = u => ((u.prenom||'') + ' ' + (u.nom||'')).trim();
    var __n = 0; var uid = () => 'p' + (++__n);
    var save = () => { saves++; };
    var toast = m => { toasts.push(m); };
    var logEvent = (a, b) => { journal.push(b); };
    var views = { pointage: () => { rendus++; } };
    var ptCloreOubli = id => { clore.push(id); };
    const PT_MAX_H = ${maxH};
    ${CODE.join('\n')}
    var todayISO = () => ptJour(Date.now());
  `, ctx);
  ctx.__tid = tid; vm.runInContext('__tid = ' + JSON.stringify(tid), ctx);
  ctx.a = (h, m = 0) => { const d = new Date('2026-09-23T00:00:00'); d.setHours(h, m, 0, 0); vm.runInContext('setT(' + d.getTime() + ')', ctx); return d.getTime(); };
  ctx.run = js => vm.runInContext(js, ctx);
  return ctx;
}
const libelle = html => (String(html).match(/>([^<]*)<\/button>/) || [])[1] || '';

console.log('\n── 782 · 1. ⛔⛔ UN COMPTE SANS FICHE (l’administrateur de Justin) : la journée complète, horloge en main ──');
{ const W = monde();
  W.a(8, 0);
  v('le bouton dit « Début de journée »', libelle(W.run('ptBoutonJour()')).replace(/^[^A-ZÀ-Ý]*/, ''), 'Début de journée');
  vrai('… et il démarre la journée', /onclick="pointerDebut\(\)"/.test(W.run('ptBoutonJour()')));
  W.run('pointerDebut()');
  v('⛔ un pointage est ouvert, SOUS LE COMPTE (pas de fiche, jamais celle d’un autre)',
    W.db.pointages.map(p => ({ techId: p.techId, userId: p.userId, debut: p.debut, fin: p.fin || null })), [{ techId: '', userId: 'uA', debut: '08:00', fin: null }]);
  vrai('… à l’heure de l’APPAREIL, à la seconde (debutTs)', W.db.pointages[0].debutTs === W.a(8, 0));
  vrai('… enregistré (save) et redessiné', W.saves >= 1 && W.rendus >= 1, [W.saves, W.rendus]);
  vrai('le message le dit', /Journée commencée à 08:00/.test(W.toasts.at(-1)), W.toasts.at(-1));

  const b1 = W.run('ptBoutonJour()');
  v('⛔ le bouton devient « Fin de journée »', libelle(b1).replace(/^[^A-ZÀ-Ý]*/, ''), 'Fin de journée');
  vrai('… il ferme la journée, et il porte la teinte de l’arrêt (pt-fin), pas celle d’un bouton secondaire',
    /onclick="pointerFin\(\)"/.test(b1) && /class="btn pt-fin"/.test(b1) && !/ghost|danger/.test(b1), b1);

  W.run('pointerDebut()');
  v('⛔ appuyer deux fois ne démarre pas deux journées', W.db.pointages.length, 1);
  vrai('… et le dit', /déjà en cours/.test(W.toasts.at(-1)), W.toasts.at(-1));

  W.a(12, 0); W.run('pointerFin()');
  vrai('⛔ « Fin de journée » ferme le pointage à MIDI', W.db.pointages[0].fin === '12:00' && W.db.pointages[0].finTs === W.a(12, 0));
  vrai('… et donne le temps de travail : 4h00', /Journée terminée — 4h00 travaillées/.test(W.toasts.at(-1)), W.toasts.at(-1));
  v('le bouton propose de REPRENDRE la même journée', libelle(W.run('ptBoutonJour()')).replace(/^[^A-ZÀ-Ý]*/, ''), 'Reprendre la journée');

  W.a(13, 30); W.run('pointerDebut()');
  v('⛔ reprendre ajoute une DEUXIÈME ligne, la première reste telle quelle', W.db.pointages.map(p => [p.debut, p.fin || null]), [['08:00', '12:00'], ['13:30', null]]);
  vrai('⛔ … et le message dit la pause, NON COMPTÉE', /Journée reprise à 13:30 — pause de 1h30 non comptée/.test(W.toasts.at(-1)), W.toasts.at(-1));

  W.a(17, 30); W.run('pointerFin()');
  vrai('⛔⛔ le total de la journée CUMULE sans la pause : 4 h + 4 h = 8h00 (pas 9h30)',
    /Journée terminée — 8h00 travaillées \(pauses non comptées\)/.test(W.toasts.at(-1)), W.toasts.at(-1));
  v('… et c’est bien ce que compte le calcul', W.run('ptDuree(ptTotal(ptMesPointages()))'), '8h00');
  v('… la pause est mesurée pour être MONTRÉE : 1h30', W.run('ptDuree(ptPauseEntre(db.pointages[0],db.pointages[1]))'), '1h30');
  v('le bouton propose encore de reprendre', libelle(W.run('ptBoutonJour()')).replace(/^[^A-ZÀ-Ý]*/, ''), 'Reprendre la journée');
  v('le journal nomme la personne par son compte', W.journal.slice(0, 1).map(x => x.replace(/ à .*/, '')), ['Justin Biret a commencé sa journée']);
}

console.log('\n── 782 · 2. le lendemain, la journée repart à zéro ──');
{ const W = monde();
  W.a(8, 0); W.run('pointerDebut()'); W.a(17, 0); W.run('pointerFin()');
  const d = new Date('2026-09-24T00:00:00'); d.setHours(7, 45, 0, 0); W.run('setT(' + d.getTime() + ')');
  v('un autre jour, le bouton redit « Début de journée » (pas « Reprendre »)', libelle(W.run('ptBoutonJour()')).replace(/^[^A-ZÀ-Ý]*/, ''), 'Début de journée');
  W.run('pointerDebut()');
  vrai('… et le message ne parle d’aucune pause (la nuit n’en est pas une)', /Journée commencée à 07:45/.test(W.toasts.at(-1)) && !/pause/.test(W.toasts.at(-1)), W.toasts.at(-1));
}

console.log('\n── 782 · 3. ⛔ L’OUBLI : « Fin de journée » ne referme pas à MAINTENANT ──');
{ const W = monde();
  W.a(8, 0); W.run('pointerDebut()');
  const d = new Date('2026-09-24T00:00:00'); d.setHours(14, 0, 0, 0); W.run('setT(' + d.getTime() + ')');   // 30 h plus tard
  W.run('pointerFin()');
  v('⛔ ouverte depuis 30 h : on demande l’heure de fin (ptCloreOubli), au lieu d’inscrire 30 h', W.clore, [W.db.pointages[0].id]);
  vrai('… et la ligne reste ouverte tant que personne n’a dit l’heure', !W.db.pointages[0].finTs && !W.db.pointages[0].fin);
}

console.log('\n── 782 · 4. ⛔ la journée des autres ──');
{ const W = monde({ users: [{ id: 'uA', prenom: 'Justin', nom: 'Biret' }, { id: 'uB', prenom: 'Léa', nom: 'Roux' }] });
  W.a(8, 0); W.run('pointerDebut()');
  W.run('currentUser = {id:"uB"}');
  v('⛔ un AUTRE compte voit « Début de journée » — la journée de Justin n’est pas la sienne', libelle(W.run('ptBoutonJour()')).replace(/^[^A-ZÀ-Ý]*/, ''), 'Début de journée');
  W.a(12, 0); W.run('pointerFin()');
  vrai('⛔ … et il ne peut pas la fermer', !W.db.pointages[0].finTs && /Aucune journée en cours/.test(W.toasts.at(-1)), W.toasts.at(-1));
  W.run('ptFermer(db.pointages[0].id)');
  vrai('un responsable qui clôture la ligne de quelqu’un d’autre le lit AINSI (le nom, pas « ta journée »)',
    /Pointage de Justin Biret clôturé — 4h00/.test(W.toasts.at(-1)), W.toasts.at(-1));
}
{ const W = monde({ tid: 't1', moi: 'uT', users: [{ id: 'uT', prenom: 'Marc', nom: 'Terrain' }] });
  W.a(7, 0); W.run('pointerDebut()');
  v('un technicien pointe sur SA FICHE — rien ne change pour lui (et le compte est gardé en trace)',
    W.db.pointages.map(p => ({ techId: p.techId, userId: p.userId })), [{ techId: 't1', userId: 'uT' }]);
  v('… son nom est celui de sa fiche', W.run('ptNom(db.pointages[0])'), 'Fiche t1');
}
{ const W = monde({ moi: null });
  W.run('pointerDebut()');
  v('sans compte connecté, rien ne démarre', W.db.pointages.length, 0);
  v('… et le bouton n’est pas dessiné', W.run('ptBoutonJour()'), '');
}

console.log('\n── 782 · 5. l’écran : UN bouton du jour, en tête ; plus de saisie manuelle ──');
const vue = bloc('views.pointage=function(){');
vrai('population : la vue Pointage est trouvée', vue.length > 2000, vue.length);
const tete = (vue.match(/setHeader\('Pointage',[\s\S]*?\);/) || [''])[0];
vrai('⛔ l’en-tête porte le bouton du jour (ptBoutonJour)', /\$\{ptBoutonJour\(\)\}/.test(tete), tete);
vrai('⛔⛔ … et plus AUCUNE « Saisie manuelle » dans l’application (code, commentaires retirés)', !/Saisie manuelle/.test(SRC));
vrai('… l’export PDF reste, en bouton secondaire', /class="btn ghost" onclick="ptPdf\(\)"/.test(tete));
v('⛔ la vue n’appelle plus le formulaire VIDE (formPointage() sans ligne)', (vue.match(/formPointage\(\)/g) || []).length, 0);
v('⛔ deux boutons pour le même geste sur le même écran, c’est un de trop : la carte n’en porte plus',
  (vue.match(/pointerDebut\(\)|pointerFin\(\)/g) || []).length, 0);
vrai('« Ma journée » est dessinée pour TOUT compte connecté, avec ou sans fiche', /if\(currentUser\)\{\s*const ouv=ptOuverteMoi\(\)/.test(vue));
vrai('⛔ l’historique du jour montre les PAUSES, « non comptée »', /ptPauseEntre\(mj\[i-1\],p\)/.test(vue) && /non comptée/.test(vue));
vrai('les lignes et le total par personne passent par ptNom (jamais « Non assigné » pour un compte)',
  /esc\(ptNom\(p\)\)/.test(vue) && !/techName\(p\.techId\)/.test(vue));
vrai('le chrono du jour lit la même journée que la carte', /ptMesPointages\(\)\.filter\(p=>\(p\.date\|\|''\)===todayISO\(\)\)/.test(bloc('function ptTickStart(){')));
vrai('le PDF nomme la colonne « PERSONNE » et passe par ptNom', /'PERSONNE'/.test(SRC) && /cut\(ptNom\(p\),26\)/.test(SRC) && !/'TECHNICIEN',1/.test(SRC));

console.log('\n── 782 · 6. « Fin de journée » reste le bouton PRINCIPAL au téléphone ──');
const regleFin = /\.btn\.pt-fin,html\[data-refonte\] \.btn\.pt-fin\{background:var\(--danger-bg\)!important;color:var\(--danger-ink\)!important/.test(SRC);
vrai('⛔ il prend la teinte de l’arrêt (--danger-bg / --danger-ink)…', regleFin);
vrai('… sans être .danger ni .ghost : la ligne des actions le range donc en tête, pleine largeur',
  /\.ph-actions \.btn:not\(\.ghost\):not\(\.danger\)\{order:-1;flex:1 1 100%\}/.test(SRC));
vrai('⛔ au survol, l’aplat rouge porte SON encre (--on-red), pas du blanc écrit en dur',
  /\.btn\.pt-fin:hover,html\[data-refonte\] \.btn\.pt-fin:hover\{background:var\(--red-fill\)!important;color:var\(--on-red\)!important\}/.test(SRC));

console.log('\n── 782 · 7. ce que l’application disait, et qui n’est plus vrai ──');
vrai('⛔ la création d’un compte ne dit plus qu’une fiche est nécessaire « pour les pointages »',
  !/un véhicule et des pointages/.test(SRC) && !/le véhicule et les pointages/.test(SRC));
vrai('… elle le dit encore pour les interventions et le véhicule', /Nécessaire pour lui assigner des interventions et un véhicule\./.test(SRC));

console.log('\n── 782 · 8. la mesure au doigt existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-pointage.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-pointage.js existe', !!SONDE);
vrai('… elle TOUCHE le bouton de l’en-tête pour de vrai (Input.dispatchTouchEvent)', /Input\.dispatchTouchEvent/.test(SONDE) && /\.ph-actions/.test(SONDE));
vrai('… horloge en main (la pause se mesure en heures, pas en secondes)', /Date\.now\s*=/.test(SONDE));
vrai('… sur un compte SANS fiche ET sur un technicien', /sans fiche/i.test(SONDE) && /technicien/i.test(SONDE));
vrai('… après un rechargement (ce qui est enregistré tient)', /recharg/i.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-782 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
