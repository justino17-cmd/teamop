// Angle « ponts » · sonde 3 : UNE VALEUR MALFORMÉE OU ÉNORME DANS LE RANGEMENT DE L'APPAREIL fait-elle planter l'ouverture ? exécute-t-elle du code ?
// Qui peut écrire dans le rangement : un script du même site (une faille d'injection), une extension, la personne elle-même — ce n'est donc pas une porte d'entrée
// à distance, mais une valeur qui BLOQUE l'application tant qu'on n'efface pas le rangement est un déni de service durable. On pose TOUTES les clés connues à la même
// valeur avant le chargement, on ouvre le prototype (gérant), on visite la Boîte mail, la Comptabilité et l'atelier, et on relève : erreurs de page, écran utilisable,
// code exécuté (window.__xss), pollution de Object.prototype. Population : les clés posées sont relues en tête de page.
// Usage : node ponts-poison.js [ valeur … ]   (par défaut, toutes ; PAR_CLE=1 rejoue chaque clé séparément pour les valeurs qui tombent)
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/ponts/';
const CLES = ['opg_proto_vues', 'opg_proto_mode', 'opg_proto_barre', 'opg_proto_atelier', 'opg_proto_espace', 'opg_proto_fenetre', 'opg_prvue', 'opg_proto_nv_vu_marc',
  'documents-sur-mesure-opg-entreprise', 'documents-sur-mesure-opg-v1', 'documents-sur-mesure-opg-v1-copie', 'documents-sur-mesure-opg-vierge', 'documents-sur-mesure-opg-catalogue',
  'documents-sur-mesure-opg-composition-devis', 'documents-sur-mesure-opg-composition-contrat', 'documents-sur-mesure-opg-groupes', 'documents-sur-mesure-opg-sections-v1',
  'proto_courrier_patron', 'opc_mode', 'opc_apparence', 'cmpt_hero_replie'];
const VALEURS = {
  vide: '', nul: 'null', accolade: '{', tableauVide: '[]', objetVide: '{}', chaine: '"x"', nombre: '1e999', booleen: 'true',
  proto: '{"__proto__":{"pollue":"oui"},"constructor":{"prototype":{"pollue2":"oui"}}}',
  typesFaux: '[null,1,"a",[],{"id":null}]',
  html: '<img src=x onerror="window.__xss=1">',
  htmlJson: JSON.stringify({ v: 1, v4: 0, docs: [{ id: 'a1', type: 'devis', etat: 'brouillon', nom: '<img src=x onerror="window.__xss=1">', numero: '<b onmouseover=1>', client: '"><svg onload="window.__xss=1">' }], abimes: [], clients: [], modeles: [] }),
  atelierFaux: '{"v":1,"docs":[null,{"id":"a","type":"devis","blocs":null,"meta":null},{"id":"b","type":"contrat","blocs":"x","vars":5}],"abimes":"x","clients":"y","logos":[1],"modeles":{"a":1},"ui":null}',
  gros: 'a'.repeat(3000000),
  profond: '['.repeat(40000) + ']'.repeat(40000),
};
VALEURS.temoin = null;   // le témoin : aucune clé posée — si lui tombe, c'est la sonde
const choisies = process.argv.slice(2).length ? process.argv.slice(2) : ['temoin'].concat(Object.keys(VALEURS).filter(k => k !== 'temoin'));
const poser = (cles, val) => ({ cles, val });
async function essai(cles, nom, val) {
  const init = ({ cles, val }) => { try { cles.forEach(k => localStorage.setItem(k, val)); window.__population = cles.filter(k => localStorage.getItem(k) === val).length; } catch (e) { window.__population = -1; } };
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1800, init: `(${init.toString()})(${JSON.stringify(poser(cles, val))})` + ';window.R=()=>{const e=document.querySelector("#courrier-hote [data-opcourrier]");return e?e.shadowRoot:null};' }).catch(e => ({ erreur: e.message }));
  if (c.erreur) return { nom, ouvre: false, erreurs: [c.erreur.slice(0, 120)] };
  const p = c.p, r = { nom, erreurs: [] };
  try {
    r.population = await p.evaluate(() => window.__population);
    r.pret = await p.evaluate(() => { const h = document.querySelector('#contenu h1'); return !!h && h.textContent.trim().length > 0; }).catch(() => false);
    for (const h of ['boiteMail', 'devis']) { try { await L.aller(p, h); await p.waitForTimeout(600); } catch (e) { r.erreurs.push('aller ' + h + ' : ' + e.message.slice(0, 80)); } }
    await p.evaluate(() => { try { cpSysAllerRubrique('comptabilite'); } catch (e) {} }); await p.waitForTimeout(2200); r.mail = await p.evaluate(() => { const x = window.R && window.R(); return !!x && x.querySelectorAll('.msg').length; }).catch(() => 0); await p.evaluate(() => { try { cpSysteme = false; aller('devis'); } catch (e) {} }); await p.waitForTimeout(500);
    await p.evaluate(() => { try { opdOuvrir('devis', {}); } catch (e) {} }); await p.waitForTimeout(2200);
    const f = L.cadre(p, /prototype-documents/);
    r.atelier = f ? await f.evaluate(() => !!document.querySelector('.voile, #vue-editeur:not([hidden]), .fenetre, .accueil, main') && document.body.innerText.length > 50).catch(() => false) : false;
    const cm = L.cadre(p, /prototype-comptabilite/); r.compta = cm ? await cm.evaluate(() => document.body.innerText.length > 200).catch(() => false) : false;
    r.xss = await p.evaluate(() => !!window.__xss) || (f ? await f.evaluate(() => !!window.__xss).catch(() => false) : false) || (cm ? await cm.evaluate(() => !!window.__xss).catch(() => false) : false);
    r.pollue = await p.evaluate(() => ({}).pollue || ({}).pollue2 || null) || (f ? await f.evaluate(() => ({}).pollue || ({}).pollue2 || null).catch(() => null) : null);
    r.erreurs = r.erreurs.concat(c.err.map(x => x.slice(0, 160)));
  } catch (e) { r.erreurs.push('sonde : ' + e.message.slice(0, 100)); }
  await L.fin(c); return r;
}
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const sortie = {}; let n = 0;
  for (const nom of choisies) {
    const r = await essai(nom === 'temoin' ? [] : CLES, nom, VALEURS[nom]); sortie[nom] = r; n++;
    const bon = r.pret && r.atelier && r.compta && r.mail > 0 && !r.xss && !r.pollue && r.erreurs.length === 0;
    L.v('toutes les clés = « ' + nom + ' » : l\'application s\'ouvre, l\'atelier et la Comptabilité aussi, sans erreur, sans code exécuté', bon, { population: r.population, pret: r.pret, atelier: r.atelier, compta: r.compta, mail: r.mail, xss: r.xss, pollue: r.pollue, erreurs: r.erreurs.slice(0, 2) });
  }
  fs.writeFileSync(CAP + 'poison.json', JSON.stringify(sortie, null, 1));
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
