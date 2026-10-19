/* ⛔ CE QUE CE FICHIER GARDE — les liens du moteur interne partent PAR LA BOÎTE DU PRO (`signLiensEnvoyer`, EXÉCUTÉE telle qu'elle est dans opcourrier.js)
   Le moteur interne rend les liens UNE fois ; Yousign, lui, écrivait aux signataires. Sans cette pièce, une demande « envoyée » n'atteint personne.
     1. un courriel par signataire, par la boîte CHOISIE (pas la première), au bon destinataire, avec SON lien (jamais celui d'un autre) ;
     2. le texte ne dit jamais « avancée » ni « qualifiée », annonce le code reçu par e-mail, et porte le titre ;
     3. une contre-signature dit « contresigner » ; une relance commence par « Rappel » ;
     4. ⛔ un envoi qui échoue ne casse pas les autres, et se NOMME (l'adresse) — jamais « envoyé » sur un lien qui n'est pas parti ;
     5. sans `liens` (Yousign) : rien n'est envoyé, aucun courriel fantôme. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu ' + JSON.stringify(b) + ' · obtenu ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => v(t + (d !== undefined && !a ? ' — ' + String(d).slice(0, 200) : ''), !!a, true);
const SRC = fs.readFileSync(path.join(__dirname, '..', 'opcourrier.js'), 'utf8');
function corps(nom) {
  const i = SRC.indexOf('  function ' + nom + '(');
  if (i < 0) return '';
  const j = SRC.indexOf('\n  function ', i + 10);
  return SRC.slice(i, j < 0 ? undefined : j);
}
const code = corps('signLiensEnvoyer') + '\n' + corps('signLiensDire');
vrai('les deux fonctions sont trouvées (une tranche vide passe au vert sur tout)', code.includes('signLiensEnvoyer') && code.includes('signLiensDire') && code.length > 600, code.length);

function monde(echoue) {
  const envoyes = [], toasts = [];
  const comptes = { c1: { id: 'c1', sid: 'b1', email: 'premiere@exemple.fr', name: 'Première' }, c2: { id: 'c2', sid: 'b2', email: 'dupont@exemple.fr', name: 'Dupont Hygiène' } };
  const sb = { vivant: true, Promise, toast: (t) => toasts.push(t), acctOf: (id) => comptes[id] || comptes.c1,
    SRC: { envoyer: (c) => { if (echoue && echoue(c)) return Promise.reject(new Error('refus')); envoyes.push(c); return Promise.resolve(); } } };
  vm.createContext(sb); vm.runInContext(code + '\nthis.__e = signLiensEnvoyer; this.__d = signLiensDire;', sb);
  return { sb, envoyes, toasts };
}
const liens = [{ n: 1, nom: 'Claire Mercier', email: 'claire@mercier.fr', contre: false, url: 'https://courrier-beta.teamop.fr/signer/AAA' },
  { n: 2, nom: 'Paul Durand', email: 'paul@durand.fr', contre: false, url: 'https://courrier-beta.teamop.fr/signer/BBB' },
  { n: 3, nom: 'Dupont Hygiène', email: 'dupont@exemple.fr', contre: true, url: 'https://courrier-beta.teamop.fr/signer/CCC' }];

(async () => {
  console.log('\n── 1. Un courriel par signataire, par la boîte choisie ──');
  let w = monde(); let r = await w.sb.__e('c2', 'Contrat de maintenance 2027', { liens }, false);
  v('trois courriels, trois destinataires', w.envoyes.map((c) => c.a), ['claire@mercier.fr', 'paul@durand.fr', 'dupont@exemple.fr']);
  v('⛔ par la boîte CHOISIE (b2), jamais la première', [...new Set(w.envoyes.map((c) => c.boite))], ['b2']);
  v('…de l\'adresse de cette boîte', [...new Set(w.envoyes.map((c) => c.de))], ['dupont@exemple.fr']);
  vrai('⛔ chacun reçoit SON lien et aucun autre', w.envoyes.every((c, i) => c.texte.includes(liens[i].url) && liens.filter((_, k) => k !== i).every((l) => !c.texte.includes(l.url))));
  vrai('le titre est dans l\'objet et dans le texte', w.envoyes.every((c) => c.objet.includes('Contrat de maintenance 2027') && c.texte.includes('Contrat de maintenance 2027')));
  v('le résultat dit combien sont partis, sans échec', [r.n, r.echecs], [3, []]);
  console.log('\n── 2. Ce que le texte dit — et ne dit jamais ──');
  const t = w.envoyes[0].texte;
  vrai('annonce le code reçu par e-mail et le caractère personnel du lien', /code par e-mail/.test(t) && /personnel/.test(t), t);
  vrai('⛔ jamais « avancée » ni « qualifiée »', w.envoyes.every((c) => !/avanc|qualifi/i.test(c.texte + c.objet)));
  vrai('la contre-signature dit « contresigner », les autres « signer »', /contresigner/.test(w.envoyes[2].texte) && !/contresigner/.test(w.envoyes[0].texte));
  vrai('le nom du signataire ouvre le courriel', t.startsWith('Bonjour Claire Mercier,'));
  console.log('\n── 3. Une relance se reconnaît ──');
  w = monde(); await w.sb.__e('c1', 'Devis', { liens: [liens[0]] }, true);
  vrai('l\'objet commence par « Rappel »', /^Rappel/.test(w.envoyes[0].objet), w.envoyes[0].objet);
  console.log('\n── 4. Un échec se nomme et n\'arrête pas les autres ──');
  w = monde((c) => c.a === 'paul@durand.fr'); r = await w.sb.__e('c1', 'Devis', { liens }, false);
  v('les deux autres sont partis', w.envoyes.map((c) => c.a), ['claire@mercier.fr', 'dupont@exemple.fr']);
  v('⛔ l\'échec NOMME l\'adresse', r.echecs, ['paul@durand.fr']);
  w.sb.__d(r, false);
  vrai('l\'écran dit le refus et l\'adresse, jamais « envoyé »', /n’est pas parti pour paul@durand\.fr/.test(w.toasts[0]) && !/Lien envoyé/.test(w.toasts[0]), w.toasts[0]);
  w = monde(); r = await w.sb.__e('c1', 'Devis', { liens: [liens[0]] }, false); w.sb.__d(r, false);
  vrai('tout est parti : « Lien envoyé », par votre boîte', /Lien envoyé/.test(w.toasts[0]) && /votre boîte/.test(w.toasts[0]), w.toasts[0]);
  console.log('\n── 5. Sans liens (Yousign) : rien ne part ──');
  for (const vue of [{}, { liens: [] }, { liens: 'x' }, null]) { w = monde(); r = await w.sb.__e('c1', 'Devis', vue, false); w.sb.__d(r, false); v('vue ' + JSON.stringify(vue) + ' : aucun courriel, aucun message', [w.envoyes.length, w.toasts.length], [0, 0]); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})();
