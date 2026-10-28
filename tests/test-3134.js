/* ⛔ CE QUE CE FICHIER GARDE — LES PAGES D'UN CODE PROMO RÉSERVÉ À DES MÉTIERS (28 octobre 2026). Le serveur est gardé par `test-3133` (le vrai serveur) ; ici
   ce que les PAGES en disent, et il est HORS de la liste du serveur seul : la Tour et la page du portail ne partent pas avec lui (le serveur d'abord, la Tour
   ensuite — « aucun code réservé n'entre dans config.promos tant que la Tour réordonnée n'est pas servie »).

   · la Tour pose le MÉTIER avant d'appliquer le CODE (`tourAccepterDemande`) : le serveur juge sur le métier que l'annuaire porte, l'ancien ordre
     (code, formule, métier) refusait tout code réservé pour un espace neuf ;
   · la liste des codes de la Tour montre « Réservé : … » avec les libellés que le serveur fournit, et la restriction illisible — sans que la Tour
     puisse créer ou régler un code (lecture seule) ;
   · la page du portail DIT le refus d'un code réservé (`code_reserve_metiers`) : ce n'est pas une panne ;
   · le refus de la Tour (`error`) s'affiche, il n'est pas avalé. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const ESPACE = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const bloc = (src, debut, fin) => { const i = src.indexOf(debut); const j = i < 0 ? -1 : src.indexOf(fin, i + debut.length); return (i < 0 || j < 0) ? '' : src.slice(i, j); };

(async () => {
console.log('\n── 3134 · les pages d\'un code promo réservé à des métiers ──');
{
  const acc = sansCommentaires(bloc(TOUR, 'async function tourAccepterDemande(', '\n}\n'));
  const iM = acc.indexOf("/api/monitor/espaces/metier'"), iP = acc.indexOf("/api/monitor/espaces/promo'"), iF = acc.indexOf("/api/monitor/espaces/formule'"), iC = acc.indexOf("/api/monitor/espaces/cats'");
  vrai('(population) l\'acceptation d\'une demande est trouvée, avec ses quatre appels', acc.length > 2000 && iM > 0 && iP > 0 && iF > 0 && iC > 0);
  vrai('⛔ l\'ordre : métier → code → formule → rubriques (le métier AVANT le code)', iM < iP && iP < iF && iF < iC);
  vrai('   … le métier se pose en `siVide` (une seconde demande ne change pas le métier d\'une entreprise ouverte)', /espaces\/metier',\{nom:e\.nom,metier:metierDem,siVide:true\}/.test(acc));
  vrai('   … et le refus du code (`error` du serveur) s\'affiche dans le panneau (`promoErr`), il n\'est pas avalé', /else promoErr=\(rp&&rp\.d&&rp\.d\.error\)\|\|'refusé'/.test(acc) && /non appliqué : '\+esc\(promoErr\)/.test(acc));

  const pastille = sansCommentaires(bloc(TOUR, 'function blocPromos(){', '\n}\n'));
  vrai('(population) la liste des codes est trouvée', pastille.length > 1500);
  vrai('la liste des codes montre « Réservé : … » avec les libellés du serveur', /Réservé : /.test(pastille) && /c\.metiers\.join\(', '\)/.test(pastille));
  vrai('   … et signale la restriction illisible (code fermé), en rouge', /c\.metiersIllisible/.test(pastille) && /p-rouge[\s\S]{0,300}Restriction illisible/.test(pastille));
  vrai('   … avant le « +n » : la restriction ne se cache pas derrière lui', pastille.indexOf('Réservé : ') < pastille.indexOf("if(reste) p.push("));
  vrai('⛔ en lecture seule : la Tour ne crée et ne règle aucun code (aucun POST vers `/api/monitor/promos`)', !/apiPost\('\/api\/monitor\/promos/.test(TOUR));

  const portail = sansCommentaires(ESPACE);
  vrai('la page du portail DIT le refus d\'un code réservé, avant le message générique « impossible de vérifier »', /r\.code===403&&r\.j&&r\.j\.error==='code_reserve_metiers'/.test(portail)
    && portail.indexOf("code_reserve_metiers") < portail.lastIndexOf("Impossible de vérifier le code pour le moment"));
  vrai('   … et ce message n\'est pas une panne (« réservé à certains métiers », « à l\'ouverture de votre espace »)', /réservé à certains métiers/.test(portail) && /ouverture de votre espace/.test(portail));
}

console.log('\n── 3134 · b. L\'écran d\'acceptation d\'un code réservé : l\'entreprise, le métier déclaré, et une CONFIRMATION (gardien, 28 octobre 2026) ──');
{
  /* les VRAIES fonctions de la Tour, exécutées : ce que la Tour montre et demande, pas le texte qui le nomme */
  const fn = (nom) => { const i = TOUR.indexOf('\nasync function ' + nom + '(') >= 0 ? TOUR.indexOf('\nasync function ' + nom + '(') : TOUR.indexOf('\nfunction ' + nom + '('); const j = i < 0 ? -1 : TOUR.indexOf('\n}\n', i); return (i < 0 || j < 0) ? '' : TOUR.slice(i, j + 3); };
  const src = ['demCodeReserve', 'demReserveBadge', 'demReserveTexte', 'demAccepter'].map(fn);
  vrai('(population) les quatre fonctions sont trouvées', src.every(x => x.length > 100));
  const MET_L = { plomberie: 'Plomberie', nettoyage: 'Nettoyage' };
  const monter = (o) => {
    const jour = { confirms: [], acceptes: [], apiGets: 0 };
    const PRO = o.pro || { loaded: true, err: '', codes: [], actifsTotal: 0 };
    const CLI = { list: [{ email: 'a@x.fr', demandes: [o.dem] }] };
    const f = new Function('PRO', 'CLI', 'MET_L', 'DEM', 'toast', 'confirm', 'apiGet', '$', 'sigleAdr', 'demCatsCle', 'tourAccepterDemande', 'esc', src.join('\n') + '\nreturn { demCodeReserve, demReserveBadge, demReserveTexte, demAccepter };')(
      PRO, CLI, MET_L, { cats: {} }, () => {}, (m) => { jour.confirms.push(m); return o.oui !== false; },
      async () => { jour.apiGets++; return { codes: o.charges || [], actifsTotal: 0 }; }, () => ({ value: 'jean' }), () => 'sg', () => 'cle',
      async (...a) => { jour.acceptes.push(a); }, (x) => String(x));
    return { f, jour, PRO };
  };
  const RES = { code: 'CODE-FICTIF-A', metiers: ['Plomberie', 'Chauffage / Climatisation'], metiersIllisible: false };
  const pro = (c) => ({ loaded: true, err: '', codes: [c], actifsTotal: 0 });

  let m = monter({ dem: { code: 'code-fictif-a', metier: 'nettoyage' }, pro: pro(RES) });
  const t = m.f.demReserveTexte({}, { code: 'code-fictif-a', metier: 'nettoyage' }, 'Dupont Plomberie SARL');
  vrai('la confirmation nomme le code, les métiers admis, l\'ENTREPRISE et le métier DÉCLARÉ par le client', /CODE-FICTIF-A|code-fictif-a/.test(t) && /Plomberie, Chauffage/.test(t) && /Entreprise : Dupont Plomberie SARL/.test(t) && /Métier déclaré par le client : Nettoyage/.test(t), t);
  vrai('   … et elle dit que le serveur ne peut pas deviner si l\'entreprise exerce ce métier', /ne peut pas deviner/.test(t));
  vrai('la carte de la demande porte la pastille « réservé · métier demandé »', /réservé : Plomberie, Chauffage \/ Climatisation · métier demandé : Nettoyage/.test(m.f.demReserveBadge({ code: 'CODE-FICTIF-A', metier: 'nettoyage' })));
  vrai('   … et rien pour un code libre, un code inconnu ou une liste pas lue', m.f.demReserveBadge({ code: 'LIBRE' }) === '' && m.f.demCodeReserve('INCONNU') === null && monter({ dem: {}, pro: { loaded: false, err: '', codes: [] } }).f.demCodeReserve('CODE-FICTIF-A') === null);
  vrai('   … ni pour un code dont `metiers` est vide (libre)', monter({ dem: {}, pro: pro({ code: 'LIBRE', metiers: [], metiersIllisible: false }) }).f.demCodeReserve('LIBRE') === null);

  await m.f.demAccepter('a@x.fr', 'Dupont Plomberie SARL', 0, null);
  v('⛔ accepter une demande à code RÉSERVÉ : UNE confirmation, qui montre l\'entreprise ET le métier déclaré', [m.jour.confirms.length, /Dupont Plomberie SARL/.test(m.jour.confirms[0] || ''), /Nettoyage/.test(m.jour.confirms[0] || '')], [1, true, true]);
  v('   … confirmée : l\'espace s\'ouvre', m.jour.acceptes.length, 1);
  m = monter({ dem: { code: 'CODE-FICTIF-A', metier: 'nettoyage' }, pro: pro(RES), oui: false });
  await m.f.demAccepter('a@x.fr', 'Dupont Plomberie SARL', 0, null);
  v('   … REFUSÉE par le patron : rien n\'est ouvert', [m.jour.confirms.length, m.jour.acceptes.length], [1, 0]);
  m = monter({ dem: { code: 'LIBRE', metier: 'nettoyage' }, pro: pro({ code: 'LIBRE', metiers: [], metiersIllisible: false }) });
  await m.f.demAccepter('a@x.fr', 'X', 0, null);
  v('un code LIBRE : aucune confirmation de plus, comme avant', [m.jour.confirms.length, m.jour.acceptes.length], [0, 1]);
  m = monter({ dem: { besoin: 'x' }, pro: pro(RES) });
  await m.f.demAccepter('a@x.fr', 'X', 0, null);
  v('une demande SANS code : aucune confirmation, aucune lecture de la liste', [m.jour.confirms.length, m.jour.acceptes.length, m.jour.apiGets], [0, 1, 0]);
  m = monter({ dem: { code: 'CODE-FICTIF-A', metier: 'nettoyage' }, pro: { loaded: false, err: '', codes: [] }, charges: [RES] });
  await m.f.demAccepter('a@x.fr', 'Dupont', 0, null);
  v('⛔ la liste des codes pas encore lue : elle est relue AVANT d\'accepter, le patron ne passe pas à côté de la confirmation', [m.jour.apiGets, m.jour.confirms.length, m.jour.acceptes.length], [1, 1, 1]);
  m = monter({ dem: { code: 'CODE-FICTIF-A', metier: '' }, pro: pro(RES), oui: false });
  await m.f.demAccepter('a@x.fr', 'Dupont', 0, null);
  vrai('   … sans métier déclaré : la confirmation le dit (« non précisé »)', /non précisé/.test(m.jour.confirms[0] || '') && m.jour.acceptes.length === 0);
  m = monter({ dem: { code: 'CODE-FICTIF-A', metier: 'plomberie' }, pro: pro({ code: 'CODE-FICTIF-A', metiers: [], metiersIllisible: true }), oui: false });
  await m.f.demAccepter('a@x.fr', 'Dupont', 0, null);
  vrai('une restriction illisible : le patron lit que le code est FERMÉ avant d\'ouvrir', /FERMÉ/.test(m.jour.confirms[0] || '') && m.jour.acceptes.length === 0);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
