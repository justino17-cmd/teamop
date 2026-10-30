/* ══ test-2896 · CVC 2 — L'ATTESTATION D'ENTRETIEN D'UNE CHAUDIÈRE (PDF) ═══════════════════════
   Justin, 23 octobre 2026 : depuis une intervention terminée sur une chaudière, un document « Attestation d'entretien » :
   société (docEntete), client, appareil, date, relevés, conseils, technicien, signature ; envoyable comme les autres documents.

   Ce banc EXÉCUTE le vrai bloc CVC d'app.html et les VRAIES fonctions d'écriture PDF (`_pdfTxt` écrit, `_pdfLarg` mesure), et
   LIT le PDF qui sort :
     1. les seuils du CO (arrêté du 15 septembre 2009, article 3), aux frontières — et le CO des FUMÉES ne reçoit AUCUN verdict ;
     2. qui peut recevoir une attestation : une chaudière (et, depuis le 25 octobre 2026, une pompe à chaleur ou une climatisation — test-3003), d'une intervention TERMINÉE qui la cite ;
     3. le formulaire part des relevés de l'intervention (copiés), l'attestation déjà établie l'emporte ;
     4. l'enregistrement : droit lu dans la fonction qui écrit, une ligne d'historique, rien d'écrit à l'ouverture ;
     5. un vrai PDF : structure, pages, images, société, textes — ⛔ aucun « ? » pour une flèche, un émoji, un « ≥ », et aucune ligne
        qui déborde de sa page, valeurs LONGUES comprises ;
     6. l'aperçu : la fenêtre s'ouvre DANS le geste, avant tout await ; popup bloquée = on le dit ;
     7. l'envoi : un seul courriel (deux touches rapides), PDF joint, trace écrite APRÈS la réussite seulement ;
     8. la carte de l'intervention : le bouton n'existe que pour une chaudière, et se grise tant que ce n'est pas terminé. */
const { monter, formulaire, lirePdf, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

const JPEG1 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const BASE = {
  clients: [{ id: 'c1', nom: 'Boulangerie Élise', email: 'elise@exemple.fr', adresse: '3 rue de l’Église, 17000 La Rochelle' }, { id: 'c2', nom: 'Sans courriel' }],
  appareils: [
    { id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval', modele: 'Thema Condens 24', serie: 'SN-123', puissance: 24, emplacement: 'Chaufferie', miseEnService: '2019-09-15' },
    { id: 'a2', clientId: 'c1', type: 'pac_air', marque: 'Daikin', modele: 'Altherma', fluide: 'R32', charge: 1.2 },
    { id: 'a3', clientId: 'c2', type: 'chaudiere_fioul', marque: 'De Dietrich' }],
  interventions: [
    { id: 'i1', num: 'INT-2026-051', clientId: 'c1', statut: 'terminee', date: '2026-10-20', heure: '09:00', type: 'Entretien annuel chaudière', appareilIds: ['a1', 'a2'],
      prestaMetier: ['Nettoyage du corps de chauffe', 'Analyse de combustion', 'Attestation d’entretien remise au client', 'Purge ⏰ des radiateurs'], relevesMetier: { co: '180', rdt: '94,2', tfum: '121', tirage: '12' },
      signature: 'data:sig', signatureTech: 'data:sigt' },
    { id: 'i2', clientId: 'c1', statut: 'planifiee', date: '2026-11-20', type: 'Entretien annuel chaudière', appareilIds: ['a1'] },
    { id: 'i3', clientId: 'c2', statut: 'terminee', date: '2026-10-21', appareilIds: ['a3'] }]
};
const PACK = { presta: ['Nettoyage du corps de chauffe', 'Contrôle du brûleur', 'Analyse de combustion', 'Purge ⏰ des radiateurs', 'Attestation d’entretien remise au client'] };

console.log('\n── 2896 · 1. les seuils du CO (arrêté du 15 septembre 2009, article 3) ──');
{
  const W = monter({ db: BASE });
  const n = x => { const r = W.cvcCoVerdict(x); return r && r.niveau; };
  v('9,9 ppm : normale', n('9,9'), 'normal'); v('0 ppm : normale', n('0'), 'normal');
  v('10 ppm pile : anomalie', n('10'), 'anomalie'); v('49,9 ppm : anomalie', n('49,9'), 'anomalie');
  v('50 ppm pile : danger grave et immédiat', n('50'), 'danger'); v('800 ppm : danger', n(800), 'danger');
  v('vide, texte, négatif : aucun verdict (on n’invente pas)', [n(''), n('abc'), n('-3'), n(undefined)], [null, null, null, null]);
  vrai('le texte du danger dit « arrêt » et « remise en sécurité »', /à l’arrêt jusqu’à sa remise en sécurité/.test(W.cvcCoVerdict(60).texte));
  vrai('le texte de l’anomalie dit « tirage et ventilation »', /tirage et la ventilation/.test(W.cvcCoVerdict(20).texte));
}

console.log('\n── 2896 · 2. qui peut recevoir une attestation ──');
{
  const W = monter({ db: BASE });
  vrai('chaudière gaz, fioul, bois : oui', ['chaudiere_gaz', 'chaudiere_fioul', 'chaudiere_bois'].every(t => W.cvcAttestable({ type: t })));
  vrai('pompe à chaleur, split, VMC, inconnu : non (le détail officiel n’a pas pu être relu)', ['pac_eau', 'pac_air', 'clim_split', 'vmc', 'autre'].every(t => !W.cvcAttestable({ type: t })) && !W.cvcAttestable(null));
  const refus = (nom, iid, aid, re) => { const t = W.__toasts.length; const r = W.cvcAttestationCtx(iid, aid); vrai('refus : ' + nom, r === null && re.test(W.__toasts.slice(t).join('|')), W.__toasts.slice(t)); };
  refus('intervention non terminée', 'i2', 'a1', /une fois l’intervention terminée/);
  refus('appareil non cité sur l’intervention', 'i1', 'a3', /pas cité/);
  refus('appareil d’un autre client', 'i3', 'a1', /pas cité/);
  /* 25 octobre 2026 : la pompe à chaleur reçoit SON attestation (arrêté du 24 juillet 2020, test-3003) ; un chauffe-eau thermodynamique, exclu de l'arrêté, non */
  vrai('pompe à chaleur + terminée + citée : accordée (attestation « thermo », test-3003)', !!W.cvcAttestationCtx('i1', 'a2'));
  W.db.appareils.push({ id: 'a9', clientId: 'c1', type: 'cet', marque: 'Thermor' }); W.db.interventions[0].appareilIds.push('a9');
  refus('chauffe-eau thermodynamique (exclu de l’arrêté)', 'i1', 'a9', /chaudières, les pompes à chaleur et les climatisations/);
  W.db.appareils.pop(); W.db.interventions[0].appareilIds.pop();
  refus('intervention inconnue', 'iX', 'a1', /introuvable/);
  vrai('chaudière + terminée + citée : accordée', !!W.cvcAttestationCtx('i1', 'a1'));
}

console.log('\n── 2896 · 3. le formulaire part des relevés, l’attestation établie l’emporte ──');
{
  const W = monter({ db: BASE, pack: PACK });
  const i = W.db.interventions[0];
  v('copie CO fumées, rendement, température, tirage depuis les Prestations — rangés avec le POINT (un champ numérique n’affiche pas « 94,2 »)', W.cvcAttestationDepart(i, 'a1'), { co: '180', rdt: '94.2', tfum: '121', tirage: '12' });
  vrai('⛔ le CO des fumées ne devient JAMAIS le CO ambiant (sinon « danger » sur une chaudière saine)', W.cvcAttestationDepart(i, 'a1').coAmbiant === undefined);
  i.attestations = { a1: { coAmbiant: '4', conseils: 'RAS' } };
  v('une attestation déjà établie l’emporte', W.cvcAttestationDepart(i, 'a1'), { coAmbiant: '4', conseils: 'RAS' });
  v('les points contrôlés : prestations cochées dans l’ordre du pack, sans « Attestation … remise »', W.cvcAttestationPoints(i), ['Nettoyage du corps de chauffe', 'Analyse de combustion', 'Purge ⏰ des radiateurs']);
  const F = formulaire({ coAmbiant: '7,5', co: '180', co2: '9', rdt: '', tfum: 'abc', tirage: '12', instrument: 'Testo 310 réf. 0563', classe: 'A', conseils: 'x'.repeat(2000), travaux: 'Remplacer le vase' });
  const L = W.cvcAttestationLire(F);
  vrai('lecture : virgule saisie rangée avec le POINT (rouvert, le champ numérique l’affiche), vide ignoré, texte libre conservé', L.coAmbiant === '7.5' && L.rdt === undefined && L.tfum === 'abc' && L.co === '180');
  vrai('lecture : conseils coupés à 1500', L.conseils.length === 1500 && L.travaux === 'Remplacer le vase' && L.classe === 'A');
}

console.log('\n── 2896 · 4. enregistrer ──');
{
  const mk = o => { const W = monter(Object.assign({ db: BASE, pack: PACK }, o || {})); W.__form = formulaire({ coAmbiant: '12', co: '200', rdt: '93', conseils: 'Prévoir le remplacement du brûleur d’ici 2 ans.', travaux: '', instrument: 'Testo 310' });
    require('vm').runInContext("document.getElementById=function(id){ return id==='cvc-att'?__form:null; }", W); return W; };
  const W = mk();
  const avant = JSON.stringify(W.db);
  W.cvcAttestationForm('i1', 'a1');
  vrai('⛔ ouvrir le formulaire n’écrit rien', JSON.stringify(W.db) === avant && W.__saves === 0 && W.__modals.length === 1);
  vrai('le formulaire DIT que ce n’est pas un formulaire officiel reproduit, et le délai de 15 jours', /n’est pas un formulaire officiel reproduit/.test(W.__modals[0]) && /15 jours/.test(W.__modals[0]));
  { const h = W.__modals[0], a = h.indexOf('name="coAmbiant"'), v0 = h.indexOf('id="cvc-att-co"'), f = h.indexOf('name="co"');
    vrai('⛔ le verdict du CO ambiant est posé juste SOUS son champ, avant celui des fumées (sinon il paraît juger les fumées)', a > 0 && a < v0 && v0 < f, [a, v0, f]); }
  vrai('la classe énergétique est demandée pour une chaudière gaz de moins de 70 kW', /name="classe"/.test(W.__modals[0]));
  vrai('… pas pour une chaudière de 120 kW', !/name="classe"/.test((() => { const X = monter({ db: Object.assign(cdc(BASE), { appareils: [Object.assign({}, BASE.appareils[0], { puissance: 120 })] }), pack: PACK }); X.cvcAttestationForm('i1', 'a1'); return X.__modals[0]; })()));
  vrai('enregistrer écrit l’attestation (date, auteur), une ligne d’historique, un save', W.cvcAttestationSauver('i1', 'a1') === true && W.db.interventions[0].attestations.a1.coAmbiant === '12' && W.db.interventions[0].attestations.a1.etabliLe === '2026-10-23' && W.db.interventions[0].attestations.a1.etabliPar === 'Test Admin' && W.__saves === 1 && /Attestation d’entretien établie/.test(W.db.interventions[0].histo.join('|')));
  vrai('une deuxième fois remplace, ne duplique pas', (W.cvcAttestationSauver('i1', 'a1'), Object.keys(W.db.interventions[0].attestations).length === 1));
  const D = mk({ droits: { 'int.modifier': false } });
  D.cvcAttestationForm('i1', 'a1');
  vrai('⛔ sans « Interventions → Modifier » : ni formulaire ni écriture', D.__modals.length === 0 && D.__saves === 0 && /pas autorisé/.test(D.__toasts.join('|')));
  vrai('⛔ … et la fonction qui écrit lit elle-même la case', D.cvcAttestationSauver('i1', 'a1') === false && !D.db.interventions[0].attestations);
  const R = mk(); R.cvcAttestationSauver('i2', 'a1');
  vrai('une intervention non terminée ne reçoit rien', !R.db.interventions[1].attestations && R.__saves === 0);
}

console.log('\n── 2896 · 5. un vrai PDF ──');
{
  const W = monter({ db: BASE, pack: PACK, jpeg: JPEG1 });
  const i = W.db.interventions[0], a = W.db.appareils[0];
  const E = { nom: 'Alpha Chauffage', couleur: '#C0392B', lignes: ['2 quai Alpha, 33000 Bordeaux', 'SIRET 222 222 222 00022 · TVA FR12222222222'] };
  const IM = (w, h, nom) => ({ b64: JPEG1, w, h, nom });
  const att = { coAmbiant: '4', co: '180', co2: '9.1', rdt: '94.2', tfum: '121', tirage: '12', instrument: 'Testo 310', classe: 'A', conseils: 'Prévoir le remplacement → du brûleur ⚠️ d’ici 2 ans, ≥ 10 ans d’âge. 🔥 Étanchéité du conduit à surveiller.', travaux: 'Remplacer le vase d’expansion • purger le circuit' };
  const pdf = W.cvcAttestationPdfStr(i, a, att, E, { sigCli: IM(3, 1, 'S1'), sigTech: IM(3, 1, 'S2') });
  /* une ligne « Libellé : valeur » s'écrit en DEUX morceaux (gras, puis normal) à la même hauteur : on les recolle pour lire ce que l'œil lit */
  const lignesDe = P0 => { const L = []; P0.textes.forEach(t => { const d = L[L.length - 1]; if (d && d.y === t.y) d.u += t.u; else L.push({ y: t.y, u: t.u }); }); return L.map(l => l.u); };
  const P = lirePdf(pdf), tout = lignesDe(P).join('\n');
  v('la structure se lit : xref juste, chaque objet à sa place', P.pb, []);
  vrai('une page', P.pages === 1, P.pages);
  v('deux images : les deux signatures', P.images, 2);
  vrai('le titre du document', /ATTESTATION D’ENTRETIEN/.test(tout));
  vrai('la société de CE passage et ses lignes (docEntete)', /Alpha Chauffage/.test(tout) && /SIRET 222 222 222 00022/.test(tout));
  vrai('le client, son adresse, la date de la visite', /Boulangerie Élise/.test(tout) && /3 rue de l’Église/.test(tout) && /20 octobre 2026/.test(tout));
  vrai('l’appareil : type, marque, modèle, série, puissance, emplacement, mise en service', /Chaudière gaz/.test(tout) && /Saunier Duval Thema Condens 24/.test(tout) && /SN-123/.test(tout) && /24 kW/.test(tout) && /Chaufferie/.test(tout) && /15 septembre 2019/.test(tout));
  vrai('les points contrôlés (et pas « Attestation … remise au client »)', /Nettoyage du corps de chauffe/.test(tout) && /Analyse de combustion/.test(tout) && !/Attestation d’entretien remise/.test(tout));
  vrai('les mesures avec leur unité (dont « CO₂ », écrit « CO2 » et non « CO? »)', /CO2 des fumées :\s*9,1 %/.test(tout) && /CO ambiant :\s*4 ppm/.test(tout) && /Rendement :\s*94,2 %/.test(tout) && /Tirage :\s*12 Pa/.test(tout) && /Température des fumées :\s*121 °C/.test(tout));
  vrai('l’analyseur et la classe énergétique', /Analyseur utilisé :\s*Testo 310/.test(tout) && /Classe énergétique :\s*A/.test(tout));
  vrai('la déclaration sur le CO (4 ppm → situation normale)', /Déclaration sur le CO : Situation normale/.test(tout));
  vrai('conseils et travaux recommandés', /Conseils d’usage, d’amélioration et de remplacement/.test(tout) && /Travaux recommandés/.test(tout) && /Remplacer le vase d’expansion/.test(tout));
  vrai('les deux signatures sont nommées', /Signature du client/.test(tout) && /Signature du technicien/.test(tout));
  const piedDe = pdfx => lirePdf(pdfx).textes.filter(t => t.y < 50).map(t => t.u).join(' ');
  vrai('⛔ le pied dit que ce n’est PAS un formulaire officiel reproduit', /ce n’est pas un formulaire officiel reproduit/.test(piedDe(pdf)) && /Page 1\/1/.test(piedDe(pdf)), piedDe(pdf));
  /* ⛔ un nom d'entreprise LONG ne fait pas perdre la moitié de la phrase (elle était coupée en « … ce… » sur une seule ligne) */
  for (const nom of ['Alpha Chauffage', 'Établissements Dupont-Lefèvre Chauffage Climatisation Énergies Renouvelables', 'N'.repeat(70) + ' Chauffage et Sanitaire de la Vallée', 'Z'.repeat(200)]) {
    const pp = W.cvcAttestationPdfStr(i, a, att, Object.assign({}, E, { nom }), {}), pt = piedDe(pp), tx = lirePdf(pp).textes.filter(t => t.y < 50);
    vrai('⛔ pied complet avec « ' + nom.slice(0, 30) + '… » (' + nom.length + ' car.)', /ce n’est pas un formulaire officiel reproduit/.test(pt) && /À conserver par le client \(2 ans au moins\)\./.test(pt) && /Page 1\/1/.test(pt) && !/…/.test(pt.replace(/…\s+à la suite/, '')), pt);
    vrai('… et chaque ligne du pied tient dans la page (marges)', tx.every(t => t.x >= 42 && t.y >= 20), tx.map(t => [t.x, t.y]));
  }
  vrai('⛔ AUCUN « ? » : la flèche, l’émoji, le ≥, la puce, le ⏰ sont dits autrement ou effacés', !/\?/.test(tout), tout.split('\n').filter(l => /\?/.test(l)));
  const verdict = x => lignesDe(lirePdf(W.cvcAttestationPdfStr(i, a, { coAmbiant: x }, E, {}))).join(' ');
  vrai('CO 25 ppm : « Anomalie », tirage et ventilation', /Anomalie/.test(verdict('25')) && /tirage et la ventilation/.test(verdict('25')));
  vrai('CO 80 ppm : « Danger grave et immédiat »', /Danger grave et immédiat/.test(verdict('80')));
  vrai('⛔ le CO des fumées seul (300 ppm, rien en ambiant) ne produit AUCUN verdict', !/Déclaration sur le CO/.test(lignesDe(lirePdf(W.cvcAttestationPdfStr(i, a, { co: '300' }, E, {}))).join('\n')));
  v('sans signature ni logo : aucune image', lirePdf(W.cvcAttestationPdfStr(i, a, att, E, {})).images, 0);
  v('avec un logo : une image de plus', lirePdf(W.cvcAttestationPdfStr(i, a, att, Object.assign({}, E, { logo: IM(3, 1) }), {})).images, 1);

  /* ── valeurs LONGUES plausibles : rien ne déborde de la page, les pages se suivent ── */
  const long = Object.assign(cdc(a), { marque: 'M'.repeat(80), modele: 'Modèle ' + 'très-long-'.repeat(7), serie: 'S'.repeat(80), emplacement: 'Chaufferie du sous-sol, bâtiment annexe nord, escalier de service ' + 'x'.repeat(40) });
  const il = cdc(i); il.adresse = 'Zone industrielle des Grands Ormeaux, bâtiment B, entrée de service nord ' + 'N'.repeat(60); il.prestaMetier = Array.from({ length: 40 }, (_, k) => 'Prestation numéro ' + k + ' — ' + 'contrôle '.repeat(6));
  W.db.clients[0].nom = 'Établissements Dupont-Lefèvre de la Grande Boulangerie Industrielle et Artisanale de Haute-Normandie';
  const paragraphe = 'Conseil détaillé numéro. '.repeat(60) + 'U'.repeat(150);
  const grosAtt = Object.assign({}, att, { conseils: paragraphe, travaux: paragraphe, instrument: 'I'.repeat(100) });
  const grosPdf = W.cvcAttestationPdfStr(il, long, grosAtt, E, { sigCli: IM(3, 1, 'S1') });
  const G = lirePdf(grosPdf);
  v('structure juste sur un document de plusieurs pages', G.pb, []);
  vrai('plusieurs pages (' + G.pages + ')', G.pages >= 2);
  const trop = G.textes.filter(t => t.x + W._pdfLarg(t.u, t.sz, t.gras) > 553.5);
  vrai('⛔ aucune ligne ne déborde de la marge droite (595 − 42)', trop.length === 0, trop.slice(0, 3).map(t => t.u.slice(0, 40) + ' → ' + Math.round(t.x + W._pdfLarg(t.u, t.sz, t.gras))));
  vrai('⛔ aucun texte sous le pied de page (y ≥ 74 hors pied)', G.textes.filter(t => t.y < 74 && t.y >= 50).length === 0);
  vrai('chaque page porte son pied « Page k/n »', Array.from({ length: G.pages }, (_, k) => 'Page ' + (k + 1) + '/' + G.pages).every(s => G.textes.some(t => t.u === s)));
  vrai('le client très long est dit en entier ou coupé avec « … », jamais hors page', G.textes.some(t => /Établissements Dupont/.test(t.u)));
}

console.log('\n── 2896 · 6. l’aperçu : la fenêtre PDF commune (v780) ──');
(async () => {
  {
    const W = monter({ db: BASE, pack: PACK, jpeg: JPEG1 });
    W.__form = formulaire({ coAmbiant: '3', conseils: 'Bon état' });
    require('vm').runInContext("document.getElementById=function(id){ return id==='cvc-att'?__form:null; }", W);
    const p = W.cvcAttestationApercu('i1', 'a1');
    const F = require('vm').runInContext('__feuilles', W);
    vrai('⛔ la fenêtre PDF s’ouvre AVANT toute attente (synchrone), avec l’envoi au client', F.length === 1 && typeof F[0].o.envoyer === 'function');
    await p;
    vrai('sa fabrique rend un vrai PDF (la saisie EN COURS du formulaire)', !!(F[0].d && /^%PDF-/.test(F[0].d.pdf || '')), F[0].d && F[0].d.err);
    vrai('⛔ aucun onglet ouvert d’office (un onglet ouvert après une attente, Safari le bloque) : Aperçu se touche dans la fenêtre', W.__windows.length === 0);
    vrai('⛔ un aperçu n’écrit RIEN (ni save, ni attestation)', W.__saves === 0 && !W.db.interventions[0].attestations);
    const S = monter({ db: BASE, pack: PACK }); await S.cvcAttestationApercu('i2', 'a1');
    vrai('intervention non terminée : aucune fenêtre ouverte pour rien', require('vm').runInContext('__feuilles', S).length === 0 && S.__windows.length === 0);
  }

  console.log('\n── 2896 · 7. l’envoi : un seul courriel, la trace après la réussite ──');
  {
    const mk = o => { const W = monter(Object.assign({ db: BASE, pack: PACK, jpeg: JPEG1 }, o || {}));
      W.__form = formulaire({ coAmbiant: '3', conseils: 'Bon état' });
      require('vm').runInContext("document.getElementById=function(id){ return id==='cvc-att'?__form:null; }", W); return W; };
    const W = mk();
    await Promise.all([W.cvcAttestationEnvoyer('i1', 'a1'), W.cvcAttestationEnvoyer('i1', 'a1')]);
    vrai('⛔ deux touches rapides = UN seul courriel', W.__mails.length === 1);
    const m = W.__mails[0];
    vrai('au client, avec un sujet qui nomme l’appareil', m.to === 'elise@exemple.fr' && /Attestation d’entretien — 20\/10/.test(m.sub) && /Chaudière gaz/.test(m.sub), m.sub);
    const att = m.opts.atts[0];
    vrai('PDF joint : nom propre, contenu base64 d’un vrai PDF, sans mailto de secours', /^Attestation-entretien-Boulangerie-Elise-2026-10-20\.pdf$/.test(att.filename) && Buffer.from(att.content, 'base64').toString('latin1').startsWith('%PDF-1.4') && m.opts.sansMailto === true, att.filename);
    vrai('la marque de la société de l’intervention est transmise', m.opts.brandName === 'Alpha Chauffage');
    const a1 = W.db.interventions[0].attestations.a1;
    vrai('la trace (date, destinataire) et l’historique sont écrits APRÈS l’envoi', a1.envoyeeA === 'elise@exemple.fr' && a1.envoyeeLe > 0 && /envoyée par e-mail à elise@exemple.fr/.test(W.db.interventions[0].histo.join('|')));
    vrai('le formulaire enregistré avant l’envoi est la source du PDF', a1.coAmbiant === '3' && a1.conseils === 'Bon état');
    const R = mk(); R.__mailOk = false;
    await R.cvcAttestationEnvoyer('i1', 'a1');
    vrai('⛔ courriel REFUSÉ : l’attestation reste enregistrée mais aucune trace d’envoi', R.__mails.length === 1 && R.db.interventions[0].attestations.a1.envoyeeLe === undefined && !/envoyée par e-mail/.test((R.db.interventions[0].histo || []).join('|')));
    await R.cvcAttestationEnvoyer('i1', 'a1');
    vrai('… et le verrou est levé : on peut réessayer', R.__mails.length === 2);
    const N = mk(); await N.cvcAttestationEnvoyer('i3', 'a3');
    vrai('client sans e-mail : on le dit, rien ne part', N.__mails.length === 0 && /e-mail du client/.test(N.__toasts.join('|')));
    const D = mk({ droits: { 'int.modifier': false } }); await D.cvcAttestationEnvoyer('i1', 'a1');
    vrai('⛔ sans la case « Interventions → Modifier » : rien ne part', D.__mails.length === 0 && D.__saves === 0);
    const D2 = monter({ db: BASE, pack: PACK, jpeg: JPEG1, droits: { 'int.modifier': false } }); await D2.cvcAttestationEnvoyer('i1', 'a1');
    vrai('⛔ … même sans formulaire ouvert (la garde de l’envoi ne repose pas sur celle de l’enregistrement)', D2.__mails.length === 0 && D2.__saves === 0);
    const X = mk(); await X.cvcAttestationEnvoyer('i2', 'a1');
    vrai('intervention non terminée : rien ne part', X.__mails.length === 0);
    /* ⛔ une signature qui n'a pas pu être convertie ne part pas EN SILENCE */
    const SJ = mk({ jpeg: '' }); require('vm').runInContext("var __cf=[]; var __okc=false; confirm=function(m){ __cf.push(m); return __okc; }", SJ);
    await SJ.cvcAttestationEnvoyer('i1', 'a1');
    vrai('⛔ signatures illisibles + refus : la question les NOMME, rien ne part, rien n’est tracé',
      SJ.__cf.length === 1 && /signature du client/.test(SJ.__cf[0]) && /signature du technicien/.test(SJ.__cf[0]) && SJ.__mails.length === 0 && SJ.db.interventions[0].attestations.a1.envoyeeLe === undefined, SJ.__cf);
    require('vm').runInContext('__okc=true', SJ); await SJ.cvcAttestationEnvoyer('i1', 'a1');
    vrai('… et sur « oui », le courriel part (la personne sait ce que le PDF ne porte pas)', SJ.__cf.length === 2 && SJ.__mails.length === 1);
    const SA = monter({ db: BASE, pack: PACK }); SA.__form = formulaire({ coAmbiant: '3' }); require('vm').runInContext("document.getElementById=function(id){ return id==='cvc-att'?__form:null; }", SA);
    await SA.cvcAttestationApercu('i1', 'a1');
    vrai('⛔ l’aperçu le dit aussi (toast « Non jointe au PDF »)', /Non jointe au PDF : la signature du client, la signature du technicien/.test(SA.__toasts.join('|')), SA.__toasts);
    const OK = mk(); require('vm').runInContext("var __cf=[]; confirm=function(m){ __cf.push(m); return true; }", OK); await OK.cvcAttestationEnvoyer('i1', 'a1');
    vrai('signatures lues : aucune question posée', OK.__cf.length === 0 && OK.__mails.length === 1);
  }

  console.log('\n── 2896 · 8. la carte de l’intervention ──');
  {
    const W = monter({ db: BASE, pack: PACK });
    const t = W.cvcIntCard(W.db.interventions[0], false);
    vrai('chaudière visitée + terminée : bouton « Attestation d’entretien » actif', /cvcAttestationForm\('i1','a1'\)/.test(t) && !/disabled/.test(t.slice(t.indexOf('Attestation') - 200, t.indexOf('Attestation'))), t.slice(0, 80));
    vrai('la pompe à chaleur visitée a SON bouton d’attestation (25 octobre 2026), mais pas de certificat de ramonage', /cvcAttestationForm\('i1','a2'\)/.test(t) && !/cvcRamonageForm\('i1','a2'\)/.test(t));
    const p = W.cvcIntCard(W.db.interventions[1], false);
    vrai('intervention planifiée : bouton grisé, avec la raison', /disabled/.test(p) && /une fois l’intervention terminée/.test(p));
    W.db.interventions[0].attestations = { a1: { etabliLe: '2026-10-21', envoyeeLe: 1790000000000, envoyeeA: 'elise@exemple.fr' } };
    vrai('l’état est lisible : « envoyée le … »', /envoyée le/.test(W.cvcIntCard(W.db.interventions[0], false)));
    const A = monter({ db: BASE, pack: PACK, metier: '3d' });
    vrai('métier 3D : rien', A.cvcIntCard(A.db.interventions[0], false) === '');
  }
  console.log('\n══ test-2896 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  process.exit(ko ? 1 : 0);
})();
