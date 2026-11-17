// ANALYSE DES MOTS relevés par mots-releve.js : corpus dédoublonné par rôle + drapeaux. Ne juge pas : elle LISTE ce qu'un humain relit.
// usage : node mots-analyse.js [--liste] ; lit /tmp/…/cap/final-mots/<rôle>-<profil>*.json, écrit corpus-<rôle>.txt et drapeaux-<rôle>.txt à côté.
const fs = require('fs'); const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
const ROLES = ['marc', 'julie', 'sm', 'kb', 'client', 'connexion', 'guide-marc', 'guide-julie', 'guide-sm', 'guide-kb', 'visite'];
exports.corpus = function (qui) {
  const fichiers = fs.readdirSync(D).filter(f => f.startsWith(qui + '-') && f.endsWith('.json')); const C = new Map();
  if (qui === 'visite') { for (const f of fichiers) { const r = JSON.parse(fs.readFileSync(D + f)); (r.pas || []).forEach((x, i) => { const m = (x.cle || '').split('|')[1] || i; const t = x.texte; const ou = 'visite ' + m;
      // la bulle d'un pas : « Chapitre N sur M · rôle · catégorie · titre · phrase » — on garde le tout et chaque phrase
      if (!C.has(t)) C.set(t, { ou: new Set(), type: 'visite' }); C.get(t).ou.add(ou); (x.attrs || []).forEach(a => { if (!C.has(a)) C.set(a, { ou: new Set(), type: 'attribut' }); C.get(a).ou.add(ou); }); }); } return C; }   // texte → { ou:Set, type }
  const CODE = /^(window\.|try \{|\}\)\(\);?|:root|\*\{|[.#\[a-z][^ ]*\{[^}]*\}?;?$|--[a-z0-9-]+\s*:|color-scheme:|[a-z-]+:[^ ]+;$|\}$|\{$)/i;
  const ajoute = (t, ou, type) => { t = String(t || '').trim(); if (!t || CODE.test(t)) return; if (!C.has(t)) C.set(t, { ou: new Set(), type }); C.get(t).ou.add(ou); };
  for (const f of fichiers) { const r = JSON.parse(fs.readFileSync(D + f));
    for (const [nom, e] of Object.entries(r.ecrans || {})) {
      const lire = (o, ou) => { (o.lignes || []).forEach(l => ajoute(l, ou, 'écran')); (o.attrs || []).forEach(a => ajoute(a, ou, 'attribut')); };
      lire(e, nom); for (const [k, cd] of Object.entries(e.cadres || {})) { if ((cd.lignes || []).some(l => /opcAppliquer|:root\{|box-sizing:border-box/.test(l))) continue; /* cadre caché lu avant le correctif : son texte était celui du code */ lire(cd, nom + '>' + k); (Array.isArray(cd.gestes) ? cd.gestes : []).forEach(g => gest(g, nom + '>' + k)); }
      (Array.isArray(e.gestes) ? e.gestes : []).forEach(g => gest(g, nom));
      function gest(g, ou) { const o = ou + ' › ' + g.geste; if (g.toast) ajoute(g.toast, o, 'toast'); (g.dialogue || []).forEach(d => ajoute(d, o, 'boîte')); (g.lignes || []).forEach(l => ajoute(l, o, 'fenêtre')); (g.attrs || []).forEach(a => ajoute(a, o, 'attribut')); (g.nouveau || []).forEach(l => ajoute(l, o, 'écran')); (g.nouveauCadre || []).forEach(l => ajoute(l, o, 'cadre')); } } }
  return C; };
exports.REGLES = {
  technique: /\b(module|synchro\w*|token|dashboard|workflow|OK|KO|login|logout|reset|payload|callback|timeout|debug|bug|offline|online|backup|upload|download|cache|serveur|base de donn[ée]es|requ[êe]te|template|ticket|slot|checklist|feedback|popup|pop-up|plugin|widget|interface|param[èe]tr\w*|configur\w*|utilisateurs?|statuts?|ID|URL|API|JSON|admin|id\.|N\/A|n\/a|null|undefined|NaN|\[object|workflows?|process|scan\w*|import\w*|export\w*|booking|scanner|mobile|desktop|drag|drop|snap|badge|tag|tags|stats?|sms|e-?mails?|mails?|app|appli)\b/i,
  echafaudage: /prototype|pour l.essai|dans cette d[ée]mo|\bd[ée]mo\b|d[ée]monstration|fictif|simul[ée]|lorem|\btodo\b|à titre d.exemple|exemple de|faux |test test|maquette/i,
  anglais: /\b(the|and|for|with|your|click|please|loading|error|success|submit|cancel|save|delete|edit|new|open|close|search|settings|dashboard|home|next|back|send|done)\b/i,
  apostropheDroite: /\w'\w/, guillemetsDroits: /"/, troisPoints: /\.\.\./,
  espaceAvantPonct: /[^\s  \d][:;!?]/, // « mot: » ou « mot? » sans espace
  espaceAvantEuro: /\d ?€|\d[  ]€/, tiretCourt: / - /,
  majusculesChaqueMot: /\b[A-ZÉÈ][a-zéèêàâîôûç]{2,} [A-ZÉÈ][a-zéèêàâîôûç]{2,} [A-ZÉÈ][a-zéèêàâîôûç]{2,}/,
  vousStaff: /\b(vous|votre|vos|veuillez)\b/i, tuClient: /\b(tu|ton|ta|tes|toi|te|t’)\b/i,
};
if (require.main === module) {
  const liste = process.argv.includes('--liste');
  for (const q of ROLES) { let C; try { C = exports.corpus(q); } catch (e) { continue; } if (!C.size) continue;
    const lignes = [...C.entries()].map(([t, o]) => `[${o.type}] ${t}   ⟵ ${[...o.ou].slice(0, 2).join(' ; ')}`);
    fs.writeFileSync(D + 'corpus-' + q + '.txt', lignes.join('\n'));
    const fl = []; for (const [t, o] of C) { for (const [nom, re] of Object.entries(exports.REGLES)) {
        if (nom === 'vousStaff' && q === 'client') continue; if (nom === 'tuClient' && q !== 'client') continue; const m = t.match(re); if (m) fl.push(`${nom} « ${m[0]} » :: ${t.slice(0, 200)}   ⟵ ${[...o.ou][0]}`); }
      const mots = t.split(/\s+/).length; if (mots > 20 && o.type !== 'attribut') fl.push(`phrase-longue (${mots} mots) :: ${t.slice(0, 260)}   ⟵ ${[...o.ou][0]}`); }
    fs.writeFileSync(D + 'drapeaux-' + q + '.txt', fl.join('\n')); console.log(q, C.size, 'textes distincts,', fl.length, 'drapeaux'); }
}

// ── LECTURE : le corpus de TOUS les rôles réuni, dédoublonné par FORME (les chiffres deviennent #), écrit en fichiers courts à relire.
//    Étiquettes (≤ 4 mots) groupées par écran, phrases (≥ 5 mots) une par ligne avec les rôles qui les lisent. node mots-analyse.js --lecture
exports.lecture = function () {
  const TAG = { marc: 'M', julie: 'J', sm: 'S', kb: 'K', client: 'C', connexion: 'X', 'guide-marc': 'G', 'guide-julie': 'G', 'guide-sm': 'G', 'guide-kb': 'G', visite: 'V' }; const forme = t => t.replace(/\d+/g, '#').replace(/\s+/g, ' ');
  const U = new Map();
  for (const q of ROLES) { let C; try { C = exports.corpus(q); } catch (e) { continue; }
    for (const [t, o] of C) { if (/^[\d\s#.,:%€h\-–/·+×]+$/.test(t) || t.length < 2) continue; const f = forme(t); if (!U.has(f)) U.set(f, { t, type: o.type, ou: [...o.ou][0], r: new Set() }); U.get(f).r.add(TAG[q]); } }
  const etiq = new Map(), phr = [], toa = [];
  for (const [f, o] of U) { const n = o.t.split(/\s+/).length; const r = [...o.r].join('');
    if (o.type === 'toast' || o.type === 'boîte') toa.push(`${o.type === 'toast' ? 'T' : 'B'} [${r}] ${o.t.slice(0, 400)}   ⟵ ${o.ou.slice(0, 70)}`);
    else if (n >= 5) phr.push(`[${r}] ${o.t.slice(0, 400)}   ⟵ ${o.ou.slice(0, 50)}`);
    else { const k = o.ou.split(' › ')[0].slice(0, 40); if (!etiq.has(k)) etiq.set(k, []); etiq.get(k).push(o.t + (r.length < 5 ? '{' + r + '}' : '')); } }
  fs.writeFileSync(D + 'lecture-etiquettes.txt', [...etiq].map(([k, v]) => `## ${k}\n${v.join(' | ')}`).join('\n\n'));
  fs.writeFileSync(D + 'lecture-phrases.txt', phr.join('\n')); fs.writeFileSync(D + 'lecture-toasts.txt', toa.join('\n'));
  console.log('formes', U.size, '· étiquettes', [...etiq.values()].reduce((a, b) => a + b.length, 0), '· phrases', phr.length, '· toasts/boîtes', toa.length); };
if (require.main === module && process.argv.includes('--lecture')) exports.lecture();
