/* ══ g10 · clients#4 et clients#5 — L'ADRESSE D'UN CLIENT SUIT SA FICHE, ET LA CARTE LA TROUVE ═══════════
   clients#4 (mesuré au navigateur) : modifier l'adresse d'un client laissait lat/lng sur l'ANCIENNE adresse
   (la carte et les tournées pointaient La Rochelle pour une adresse à Bordeaux) et la ville affichée dans la
   liste ne bougeait pas : `saveClientForm` faisait `{...ancien,...d}` sans rien recalculer. La box, elle,
   remet lat/lng à zéro quand son adresse change (`saveBox`).
   clients#5 : un client créé avec une adresse n'était JAMAIS localisé — seul le bouton « localiser les clients »
   du Planning général (`geocodeClients`) le faisait. La box géocode en tâche de fond après l'enregistrement.

   Ce banc EXÉCUTE la vraie `saveClientForm` (et les pièces qu'elle appelle) dans un bac à sable, avec un
   `geocode` simulé (aucun réseau), des promesses relâchées au geste, et un FormData qui rend les champs.
   ⛔ Jamais au chargement : le géocodage n'est appelé que depuis l'enregistrement d'un client — ce banc le
   compte dans le texte du fichier (les appels, pas les commentaires).
   Relecture de g10 : (1) une adresse nouvelle qui ne dit pas où elle est ne garde pas l'ancien code postal ni l'ancienne
   ville (§ 3 bis) ; (2) le save() d'arrière-plan de cliLocaliserFond se mesure AU NAVIGATEUR, pas ici : la sonde
   scratchpad/gestion/correctifs/g10/sonde-localiser-fond.js (bêta, nominatim simulé, synchro allumée pour que _m se pose)
   rend 15 ✓ : deux save() exactement, aucun _m sur une autre fiche (181 fiches), un seul redessin de carteInt à la réponse,
   aucun appel quand l'adresse ne change pas, échec silencieux sans boucle.                                  */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1131 · 0. la population ──');
const SC = bloc('function saveClientForm(e,id){');
const AIDES = ['function cliAdresseDerive(', 'function cliRetouche(', 'function cliLieuApres(', 'function cliGeoRequete(', 'function cliLocaliserFond(', 'function cliDoublon(', 'function nomNorm('].map(bloc).join('\n');   // cliDoublon : g10 clients#8 (test-1134)
vrai('saveClientForm est trouvée', SC.length > 900, SC.length);
v('⛔ une seule définition de saveClientForm', SRC.split('function saveClientForm(').length - 1, 1);

function monde(clients, geocodeRep) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, RegExp,
    db: { clients, interventions: [] }, currentUser: { id: 'u1', role: 'admin' }, current: 'clients',
    __toasts: [], __saves: 0, __geo: [], __rep: geocodeRep, __libere: [], __vues: [], __confirms: [] };
  vm.createContext(ctx);
  vm.runInContext(`${AIDES}
    var views={ carteInt(){ __vues.push('carteInt'); }, clients(){}, carte(){} };
    function visibleClients(l){ return l; }
    function permGarde(){ return true; } function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; }
    function closeModal(){} function go(){} function logEvent(){} var __id=0; function uid(){ return 'n'+(++__id); }
    function FormData(t){ return Object.entries(t); } function initials(){ return ''; }
    function geocode(q){ __geo.push(q); return new Promise(res=>{ __libere.push(()=>res(typeof __rep==='function'?__rep(q):__rep)); }); }
    function confirm(m){ __confirms.push(m); return true; }
    var norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'');
    ${SC}`, ctx);
  return ctx;
}
const soumettre = (W, champs, id) => W.saveClientForm({ preventDefault() {}, target: champs }, id || '');
const attendre = async W => { for (let i = 0; i < 5; i++) { while (W.__libere.length) W.__libere.shift()(); await new Promise(r => setTimeout(r, 0)); } };
const rochelle = () => ({ id: 'c1', nom: 'Boulangerie Au Bon Pain', adresse: '2 rue du Port', codePostal: '17000', ville: 'La Rochelle', tel: '0612345678', lat: 46.158, lng: -1.151 });
const BORDEAUX = { lat: 44.8378, lng: -0.5792 };

(async () => {
  console.log('\n── 1131 · 1. clients#4 : l’adresse change, la fiche suit ──');
  { const W = monde([rochelle()], BORDEAUX);
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '1 place de la Bourse 33000 Bordeaux', tel: '0612345678' }, 'c1');
    const c = W.db.clients[0];
    v('⛔ les anciennes coordonnées (La Rochelle) sont effacées', [c.lat, c.lng], [null, null]);
    v('⛔ le code postal et la ville suivent l’adresse', [c.codePostal, c.ville], ['33000', 'Bordeaux']);
    await attendre(W);
    v('… et le client est re-localisé à sa nouvelle adresse', [c.lat, c.lng], [BORDEAUX.lat, BORDEAUX.lng]);
    v('… par UN seul appel au géocodeur', W.__geo.length, 1);
    vrai('… sur la nouvelle adresse (pas l’ancienne)', /Bourse/.test(W.__geo[0] || '') && !/rue du Port/.test(W.__geo[0] || ''), W.__geo); }

  console.log('\n── 1131 · 2. clients#4 : adresse inchangée = rien ne bouge, rien n’est demandé ──');
  { const W = monde([rochelle()], BORDEAUX);
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '2 rue du Port', tel: '0699999999' }, 'c1');
    await attendre(W);
    const c = W.db.clients[0];
    v('lat/lng/ville/code postal gardés', [c.lat, c.lng, c.ville, c.codePostal], [46.158, -1.151, 'La Rochelle', '17000']);
    v('le téléphone, lui, est bien mis à jour', c.tel, '0699999999');
    v('aucun appel au géocodeur', W.__geo.length, 0); }

  console.log('\n── 1131 · 3. clients#4 : une adresse corrigée sans code postal garde la ville connue (rien d’inventé) ──');
  { const W = monde([rochelle()], null);
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '2 rue du Port-Neuf', tel: '0612345678' }, 'c1');
    const c = W.db.clients[0];
    v('coordonnées effacées (l’adresse n’est plus la même)', [c.lat, c.lng], [null, null]);
    v('ville et code postal gardés : l’adresse ne les contredit pas', [c.ville, c.codePostal], ['La Rochelle', '17000']);
    vrai('… et la requête les joint à l’adresse', /La Rochelle/.test(W.__geo[0] || ''), W.__geo); }

  console.log('\n── 1131 · 3 bis. clients#4 (relecture) : on ne garde PAS un lieu que la nouvelle adresse contredit ──');
  { const W = monde([rochelle()], null);   // La Rochelle (17000) → « 5 rue des Lilas » : un déménagement, sans ville
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '5 rue des Lilas', tel: '0612345678' }, 'c1');
    const c = W.db.clients[0];
    v('⛔ l’ancien code postal et l’ancienne ville ne survivent pas à une adresse qui n’a plus rien à voir', [c.codePostal, c.ville], ['', '']);
    vrai('⛔ … et le géocodeur n’est PAS interrogé sur « 5 rue des Lilas 17000 La Rochelle »', !/Rochelle|17000/.test(W.__geo.join('|')), W.__geo);
    v('… les coordonnées d’avant sont effacées', [c.lat, c.lng], [null, null]); }
  { const W = monde([rochelle()], null);   // un code postal que le motif de cliAdresseDerive ne lit pas (suffixe après la ville)
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '1 place de la Bourse, 33000 Bordeaux, bât 3', tel: '0612345678' }, 'c1');
    const c = W.db.clients[0];
    v('⛔ le code postal de l’adresse l’emporte sur l’ancien (keyForClient lit codePostal AVANT l’adresse)', c.codePostal, '33000');
    v('… et l’ancienne ville (La Rochelle) ne reste pas à côté d’un 33000', c.ville, ''); }
  { const W = monde([rochelle()], null);   // même rue, autre numéro : le lieu ne bouge pas
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '4 rue du Port', tel: '0612345678' }, 'c1');
    const c = W.db.clients[0];
    v('autre numéro dans la même rue : la ville et le code postal restent', [c.codePostal, c.ville], ['17000', 'La Rochelle']); }
  { const W = monde([rochelle()], null);   // faute de frappe corrigée
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '2 rue du Prot', tel: '0612345678' }, 'c1');
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '2 rue du Port', tel: '0612345678' }, 'c1');
    const c = W.db.clients[0];
    v('faute de frappe puis correction : le lieu reste', [c.codePostal, c.ville], ['17000', 'La Rochelle']); }
  { const W = monde([rochelle()], null);   // l’adresse NOMME la ville sans code postal
    soumettre(W, { nom: 'Boulangerie Au Bon Pain', adresse: '9 avenue Carnot, La Rochelle', tel: '0612345678' }, 'c1');
    const c = W.db.clients[0];
    v('l’adresse nomme la ville connue : code postal et ville restent', [c.codePostal, c.ville], ['17000', 'La Rochelle']); }
  { const W = monde([{ id: 'c2', nom: 'Sans lieu', adresse: '3 rue A', tel: '' }], null);
    soumettre(W, { nom: 'Sans lieu', adresse: '7 impasse Zéro', tel: '' }, 'c2');
    v('un client qui n’avait aucun lieu n’en reçoit pas d’inventé', [W.db.clients[0].codePostal, W.db.clients[0].ville], ['', '']); }

  console.log('\n── 1131 · 4. clients#5 : un client créé avec une adresse est localisé en tâche de fond ──');
  { const W = monde([], { lat: 46.16, lng: -1.15 });
    soumettre(W, { nom: 'Nouveau', adresse: '10 rue Gambetta 17000 La Rochelle', tel: '' });
    const c = W.db.clients[0];
    v('créé', W.db.clients.length, 1);
    v('l’enregistrement ne bloque pas : pas encore de coordonnées', c.lat == null, true);
    v('… mais le géocodeur a été appelé une fois', W.__geo.length, 1);
    await attendre(W);
    v('⛔ puis le client porte ses coordonnées', [c.lat, c.lng], [46.16, -1.15]);
    vrai('… elles sont enregistrées (save après la réponse)', W.__saves >= 2, W.__saves); }

  console.log('\n── 1131 · 5. clients#5 : échec silencieux, sans adresse rien, réponse périmée ignorée ──');
  { const W = monde([], null);
    soumettre(W, { nom: 'Nouveau', adresse: '10 rue Gambetta 17000 La Rochelle' });
    const t0 = W.__toasts.length; await attendre(W);
    v('le géocodeur ne trouve rien : coordonnées toujours absentes', W.db.clients[0].lat == null, true);
    v('… et aucun message d’erreur (échec silencieux)', W.__toasts.length - t0, 0); }
  { const W = monde([], BORDEAUX);
    soumettre(W, { nom: 'Sans adresse', adresse: '', tel: '0600000001' });
    await attendre(W);
    v('un client sans adresse n’appelle pas le géocodeur', W.__geo.length, 0); }
  { const W = monde([], BORDEAUX);
    soumettre(W, { nom: 'Mouvant', adresse: '10 rue Gambetta 17000 La Rochelle' });
    const id = W.db.clients[0].id;
    soumettre(W, { nom: 'Mouvant', adresse: '5 quai Richelieu 33000 Bordeaux' }, id);   // l’adresse change avant la réponse de la première
    const c = W.db.clients[0];
    { const f = W.__libere.shift(); if (f) f(); }   // la réponse de la PREMIÈRE requête arrive maintenant
    await new Promise(r => setTimeout(r, 0));
    vrai('⛔ une réponse sur l’ancienne adresse n’écrit pas ses coordonnées sur la nouvelle', c.lat == null, [c.lat, c.lng]);
    await attendre(W);
    v('… la deuxième requête, elle, pose les bonnes', [c.lat, c.lng], [BORDEAUX.lat, BORDEAUX.lng]); }
  { const W = monde([{ id: 'c9', nom: 'Parti', adresse: '1 rue A 17000 La Rochelle' }], BORDEAUX);
    soumettre(W, { nom: 'Parti', adresse: '2 rue B 17000 La Rochelle' }, 'c9');
    W.db.clients.length = 0;   // le client est supprimé avant la réponse
    let erreur = null; try { await attendre(W); } catch (e) { erreur = e; }
    v('un client supprimé entre-temps ne fait rien jeter', erreur, null); }

  console.log('\n── 1131 · 6. ⛔ jamais au chargement, jamais en boucle ──');
  const appels = (SRC.match(/\bcliLocaliserFond\(/g) || []).length;
  vrai('cliLocaliserFond existe et saveClientForm l’appelle', appels >= 2 && SC.includes('cliLocaliserFond(cible)'), appels);
  /* `docCliCreer` : le « Nouveau client » tapé dans un devis ou une facture (v779) — un geste de création, comme l'enregistrement de la fiche */
  const hors = SRC.replace(SC, '').replace(bloc('function cliLocaliserFond('), '').replace(bloc('function docCliCreer('), '');
  v('aucun appel hors de saveClientForm (ni boot, ni load, ni views.*)', (hors.match(/\bcliLocaliserFond\(/g) || []).length, 0);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
