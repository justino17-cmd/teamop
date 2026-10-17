/* ══ g16 · accueil#12 — ENGLISH / ESPAÑOL : LES ÉCRANS NE RESTENT PAS À MOITIÉ EN FRANÇAIS, ET <html lang> SUIT ══
   Constaté au navigateur : en English, le tableau de bord mêlait « Jobs / Boxes / Vehicles » à « Planning de
   l’entreprise », « Aujourd’hui · 7 jours · 14 jours · Le mois », « Bons à envoyer », « interventions sur la
   période » ; Statistiques à « CA encaissé », « En attente de paiement », « Devis émis », « Top clients (CA
   facturé) » ; Archives à « CA facturé », « Temps pointé » ; Historique à « Tout ». Et `<html lang>` valait
   toujours « fr » : un lecteur d'écran lisait de l'anglais avec la voix française, le navigateur proposait de
   traduire une page déjà traduite.

   Deux gestes, et seulement eux :
   · compléter le DICTIONNAIRE (`I18N`) pour les libellés cités — par lui, jamais en éditant les corps de
     `views.statistiques` / `archStats` : la clé est la chaîne française d'AUJOURD'HUI, telle que l'écran
     l'écrit (`translateNode` compare le texte entier d'un nœud). Ne sont traduits ni les données de
     l'utilisateur (noms de clients, d'interventions) ni les libellés qui portent un nombre ;
   · `setLang` et le démarrage posent `document.documentElement.lang`.

   Ce banc EXÉCUTE la vraie `setLang`, charge le vrai dictionnaire (I18N et ses compléments) et exige, pour
   chaque libellé cité : qu'il soit toujours écrit tel quel dans le code (une clé qui ne correspond plus à rien
   est une traduction morte), qu'il ait sa version anglaise ET espagnole, et qu'elle diffère du français sauf
   mot identique dans la langue. La mesure dans une vraie page : scratchpad/gestion/correctifs/g16/textes.js. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}

console.log('\n── 1153 · 0. la population ──');
const iDico = SRC.indexOf('const I18N={'), iFin = SRC.indexOf('function t(s){', iDico);
const DICO = iDico < 0 || iFin < 0 ? '' : SRC.slice(iDico, iFin);
const SETLANG = bloc('function setLang(l){'), LDA = bloc('function langDocAppliquer(');
v('le dictionnaire et setLang sont trouvés', [DICO.length > 5000, SETLANG.length > 50], [true, true]);
v('une seule définition de setLang', SRC.split('function setLang(').length - 1, 1);

/* Le dictionnaire tel que la page le construit : I18N et ses compléments (Object.assign) jusqu'à t(). */
const dico = vm.runInNewContext(DICO.replace('const I18N=', 'var I18N=') + ';I18N');
vrai('la population : en et es existent et sont fournis', Object.keys(dico.en || {}).length > 100 && Object.keys(dico.es || {}).length > 100,
  [Object.keys(dico.en || {}).length, Object.keys(dico.es || {}).length]);

/* Les libellés cités par le rapport, chacun avec ce que l'écran écrit VRAIMENT aujourd'hui. */
const CITES = {
  'Tableau de bord': ['Bons à envoyer', 'Planning de l’entreprise', 'Mon planning', 'Aujourd’hui', '7 jours', '14 jours', 'Le mois',
    'Ouvrir le planning général', 'Ouvrir mon planning', 'interventions sur la période', 'intervention sur la période', 'à planifier',
    'en retard', 'absent', 'absents', 'de travail prévu', 'Équipe', 'Non assigné',
    'Tout est en ordre — stocks OK, aucune demande ni bon en attente.'],
  'Statistiques': ['CA encaissé', 'En attente de paiement', 'Devis émis', 'Taux d\'acceptation devis', 'Interventions par statut',
    'Top clients (CA facturé)', 'Aucune facture'],
  'Archives': ['CA facturé', 'Temps pointé'],
  'Historique': ['Tout', 'Aucun évènement.'],
};
/* Mots qui s'écrivent pareil dans la langue : le dictionnaire n'a pas à les changer. */
const IDEM = { en: new Set(['absent']), es: new Set([]) };

console.log('\n── 1. chaque libellé cité est traduit, et correspond à une chaîne qui existe ──');
for (const [ecran, cles] of Object.entries(CITES)) {
  for (const k of cles) {
    const code = SRC.replace(DICO, ' ');   // hors dictionnaire : la chaîne doit être écrite par l'écran lui-même
    const motif = k.replace(/ — .*/, '');  // la phrase longue : on cherche son début
    const frag = /^interventions? sur la période$/.test(k) ? 'sur la période' : motif;   // le « s » se pose au rendu (`intervention${n>1?'s':''} sur la période`)
    vrai(ecran + ' · « ' + k + ' » est toujours écrit par l\'écran', code.includes(frag) || code.includes(frag.replace(/’/g, '\'')), k);
    for (const l of ['en', 'es']) {
      const t = dico[l] && dico[l][k];
      vrai(ecran + ' · « ' + k + ' » → ' + l + (t ? ' : ' + t : ''), typeof t === 'string' && t.length > 0 && (t !== k || IDEM[l].has(k)), t);
    }
  }
}

console.log('\n── 2. <html lang> suit la langue ──');
vrai('la fonction de pose est trouvée', LDA.length > 20);
function pageLangue(langInitiale) {
  const doc = { documentElement: { lang: 'fr' } }, rang = {};
  const ctx = { console, JSON, document: doc, __rang: rang, __saves: [], currentUser: null, current: '', toast() {},
    LANGS: { fr: 'Français', en: 'English', es: 'Español' }, LANG_FLAG: { fr: 'F', en: 'E', es: 'S' } };
  vm.createContext(ctx);
  vm.runInContext(`function prefLocal(k,v){ __rang[k]=v; return true; } function prefLocalLire(k){ return __rang[k]===undefined?null:__rang[k]; }
    function prefGarder(k,v){ __saves.push(k+'='+v); } function renderNav(){} function go(){} function $(){ return null; } function translateNode(){}
    function getLang(){ return prefLocalLire('elan_lang')||'fr'; }
    ${LDA}\n${SETLANG}`, ctx);
  if (langInitiale) rang.elan_lang = langInitiale;
  return ctx;
}
{
  const p = pageLangue();
  p.setLang('en');
  v('setLang(en) → <html lang="en">', p.document.documentElement.lang, 'en');
  p.setLang('es');
  v('setLang(es) → <html lang="es">', p.document.documentElement.lang, 'es');
  p.setLang('fr');
  v('setLang(fr) → <html lang="fr">', p.document.documentElement.lang, 'fr');
  v('la langue est toujours enregistrée (prefGarder)', p.__saves, ['lang=en', 'lang=es', 'lang=fr']);
  const q = pageLangue('es');
  if (LDA) q.langDocAppliquer();
  v('au démarrage, la langue rangée sur l\'appareil est posée', q.document.documentElement.lang, 'es');
  const r = pageLangue();
  if (LDA) r.langDocAppliquer();
  v('sans langue rangée : « fr »', r.document.documentElement.lang, 'fr');
}
{
  const boot = bloc('async function boot(){');
  const avantLePremierAwait = boot.slice(0, boot.indexOf('await'));
  vrai('boot() pose la langue du document AVANT son premier await (même si le lien d\'entreprise rend la main)', /langDocAppliquer\(\)/.test(avantLePremierAwait), avantLePremierAwait.slice(0, 200));
}

console.log('\n══ test-1153 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
