/* ══ g15 · accueil#7 — IMPOSSIBLE D'EFFACER LE NOM DE L'ENTREPRISE ═══════════════════════════════════════════
   `entSave` rangeait le nom dans `localStorage` (elan_entreprise_nom — elanB_… sur la bêta, c'est beta-build qui
   change le préfixe) SEULEMENT s'il était non vide, et ne l'effaçait jamais. Or `entrepriseNom()` et `entNom()`
   retombent sur cette clé quand `db.entreprise.nom` est vide : vider le champ et enregistrer laissait donc l'ancien
   nom partout (menu, sous-titre du tableau de bord, bons), pendant que le toast annonçait « Entreprise enregistrée ».

   Ce banc EXÉCUTE la vraie `entSave` avec les vraies `entrepriseNom` et `entNom`, un `localStorage` qui fonctionne
   vraiment (Map), et note si `applyBrand` (qui repeint le menu) est rappelée.                                    */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
console.log('\n── 1282 · 0. la population ──');
const ES = bloc('function entSave(){'), EN = bloc('function entrepriseNom(){'), NM = bloc('function entNom(){');
vrai('entSave, entrepriseNom, entNom sont trouvées', ES.length > 200 && EN.length > 40 && NM.length > 60, [ES.length, EN.length, NM.length]);
vrai('⛔ une seule définition de entSave', SRC.split('function entSave(').length - 1 === 1);
vrai('la clé de rangement lue par entrepriseNom est celle qu\'entSave écrit', /elan_entreprise_nom/.test(EN) && /elan_entreprise_nom/.test(ES));

function monde(nomAvant, nomSaisi) {
  const mem = new Map(); if (nomAvant) mem.set('elan_entreprise_nom', nomAvant);
  const champs = { 'ent-nom': nomSaisi, 'ent-adresse': '', 'ent-cp': '', 'ent-ville': '', 'ent-tel': '', 'ent-siret': '', 'ent-tvaintra': '', 'ent-iban': '', 'ent-bic': '', 'ent-entete-bc': '' };
  const ctx = { console, JSON, Math, Date, __toasts: [], __brand: 0, __saves: 0, mem,
    db: { entreprise: { nom: nomAvant || '', logo: 'data:logo' } },
    localStorage: { getItem: k => mem.has(k) ? mem.get(k) : null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) },
    document: { getElementById: id => id in champs ? { value: champs[id] } : null } };
  vm.createContext(ctx);
  vm.runInContext(`function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function applyBrand(){ __brand++; }
    ${EN}\n${NM}\n${ES}`, ctx);
  return ctx;
}

console.log('\n── 1282 · 1. vider le champ et enregistrer efface le nom PARTOUT ──');
{ const W = monde('Dératisation Dupont', ''); W.entSave();
  vrai('db.entreprise.nom est vide', W.db.entreprise.nom === '', W.db.entreprise);
  vrai('⛔ le nom rangé sur l\'appareil est effacé', !W.mem.has('elan_entreprise_nom'), [...W.mem]);
  vrai('⛔ entrepriseNom() ne rend plus l\'ancien nom (menu, sous-titre)', W.entrepriseNom() === '', W.entrepriseNom());
  vrai('entNom() ne rend plus l\'ancien nom non plus', W.entNom() === 'OP GESTION', W.entNom());
  vrai('le menu est repeint (applyBrand) et l\'enregistrement part (save)', W.__brand === 1 && W.__saves === 1, [W.__brand, W.__saves]);
  vrai('le logo est conservé (le nom seul est retiré)', W.db.entreprise.logo === 'data:logo'); }

console.log('\n── 1282 · 2. contre-épreuves : écrire et changer le nom marchent toujours ──');
{ const W = monde('', 'Dératisation Dupont'); W.entSave();
  vrai('un nom saisi est rangé et lu', W.mem.get('elan_entreprise_nom') === 'Dératisation Dupont' && W.entrepriseNom() === 'Dératisation Dupont', [...W.mem]); }
{ const W = monde('Ancien SARL', '  Nouveau SARL  '); W.entSave();
  vrai('un nom changé remplace l\'ancien (espaces retirés)', W.mem.get('elan_entreprise_nom') === 'Nouveau SARL' && W.entrepriseNom() === 'Nouveau SARL', [...W.mem]); }
{ const W = monde('', ''); W.entSave();
  vrai('rien saisi, rien rangé avant : pas d\'erreur, rien rangé', !W.mem.has('elan_entreprise_nom') && W.__saves === 1, [...W.mem]); }
{ const W = monde('Dératisation Dupont', ''); W.localStorage.removeItem = () => { throw new Error('rangement refusé'); };
  let jete = false; try { W.entSave(); } catch (e) { jete = true; }
  vrai('un rangement qui refuse (mode privé, plein) ne casse pas l\'enregistrement', !jete && W.__saves === 1 && W.db.entreprise.nom === '', [jete, W.__saves]); }

console.log('\n══ test-1282 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
