// Contrôle de COHÉRENCE de la spécification révisée (étape 3) : applique `ROUTE_DROIT`, `ACTE_DROIT` et les profils types du § 2.12 tels qu'ils sont ÉCRITS,
// et vérifie que les menus qui en sortent sont ceux que le document annonce (Marc 20, Responsable 20, Julie 9, Sophie/Karim 6, Julie ≠ Responsable).
// Remplace `derive.js` (qui rejouait les profils d'AVANT, ceux du prototype). Aucun navigateur, aucune page lue : c'est un contrôle du TEXTE de la spécification.
// Usage : node scratchpad/proto-final/refonte/entreprise-droits-outils/derive-table-finale.js
const ROUTE_DROIT = { accueil:['admin','equipe'], statistiques:['admin','equipe'], historique:['admin','equipe'], planning:['planif','equipe'], absences:['planif','tous'], interventions:['inter','equipe'],
  majournee:['inter','terrain'], taches:[null,'tous'], clients:['crm','equipe'], devis:['ventes','equipe'], contrats:['ventes','equipe'], comptabilite:['compta','equipe'], boiteMail:['com','equipe'],
  achats:['achats','equipe'], techfrais:['achats','terrain'], stock:['stock','equipe'], produits:['stock','equipe'], boxes:['stock','equipe','s'], moncamion:['stock','terrain'],
  pointage:['temps','equipe'], vehicules:['temps','equipe'], mesheures:['temps','terrain'], equipe:['admin','equipe'], entreprise:['admin','equipe'] };
// l'ordre et le contenu de ce que le menu PROPOSE (CATS pour une personne du bureau, LIGNES_TERRAIN pour le terrain), hors pack 3D
const CATS = ['accueil','statistiques','historique','planning','interventions','taches','absences','clients','devis','contrats','boiteMail','comptabilite','achats','stock','produits','boxes','equipe','pointage','vehicules','entreprise'];
const TERRAIN = ['majournee','taches','techfrais','mesheures','moncamion','absences'];
const C = s => { const [v,c,m,sp] = s.split('').map(Number); return { v, c, m, s:sp }; };
const T = { planif:'0000', inter:'0000', crm:'0000', ventes:'0000', compta:'0000', stock:'0000', temps:'0000', com:'0000', achats:'0000', admin:'0000' };
const PROFILS = {
  admin: Object.fromEntries(Object.keys(T).map(k => [k, C('1111')])),
  resp: Object.fromEntries(Object.entries({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1000', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }).map(([k, v]) => [k, C(v)])),
  secr: Object.fromEntries(Object.entries({ ...T, planif:'0000', inter:'1110', crm:'1110', ventes:'1110', compta:'1110', stock:'1110', temps:'0000', com:'0000', achats:'1000', admin:'0000' }).map(([k, v]) => [k, C(v)])),
  tech: Object.fromEntries(Object.entries({ ...T, planif:'1101', inter:'1011', crm:'1000', stock:'1010', temps:'1110', achats:'1111' }).map(([k, v]) => [k, C(v)]))
};
const TERRAIN_PAR_PROFIL = { admin:false, resp:false, secr:false, tech:true };
const voit = (route, prof, terrain) => { const d = ROUTE_DROIT[route]; if (!d) return false;
  const [cat, forme, plus] = d; if (forme === 'equipe' && terrain) return false; if (forme === 'terrain' && !terrain) return false;
  if (!cat) return true; const k = PROFILS[prof][cat]; return !!(k && k.v && (!plus || k[plus])); };
let ko = 0; const v = (nom, cond, det) => { console.log((cond ? '  ✓ ' : '  ✗ ') + nom + (cond ? '' : ' → ' + JSON.stringify(det))); if (!cond) ko++; };
const menu = {};
for (const p of Object.keys(PROFILS)) { const t = TERRAIN_PAR_PROFIL[p]; menu[p] = (t ? TERRAIN : CATS).filter(r => voit(r, p, t)); console.log(p.padEnd(6), menu[p].length, menu[p].join(' ')); }
v('population : quatre profils, 24 routes décrites', Object.keys(PROFILS).length === 4 && Object.keys(ROUTE_DROIT).length === 24, Object.keys(ROUTE_DROIT).length);
v('Administrateur = 20 lignes (19 + Mon entreprise)', menu.admin.length === 20, menu.admin.length);
v('Responsable = 20 lignes', menu.resp.length === 20, menu.resp.length);
v('Secrétariat = 9 lignes (les sept validées + Stock + Fournisseurs)', menu.secr.length === 9 && ['taches','interventions','clients','devis','contrats','comptabilite','achats','stock','produits'].every(r => menu.secr.includes(r)), menu.secr);
v('Secrétariat : ni Dépôts et camions (`stock.s` manque), ni Boîte mail, ni Temps de travail, ni Planning, ni Équipe', ['boxes','boiteMail','pointage','vehicules','planning','equipe','entreprise','accueil'].every(r => !menu.secr.includes(r)), menu.secr);
v('Technicien = 6 lignes (Ma journée, Mes tâches, Mes frais, Mes heures, Mon camion, Mes congés)', menu.tech.length === 6 && TERRAIN.every(r => menu.tech.includes(r)), menu.tech);
v('Technicien : aucun écran d\'équipe', menu.tech.every(r => !ROUTE_DROIT[r] || ROUTE_DROIT[r][1] !== 'equipe'), menu.tech);
v('Responsable ≠ Secrétariat (l\'écart que MENU-FINAL demandait)', JSON.stringify(menu.resp) !== JSON.stringify(menu.secr), null);
// forme : décocher « terrain » pour le profil Technicien donne un menu du bureau, jamais les cinq écrans personnels
const tNon = CATS.filter(r => voit(r, 'tech', false)); v('Technicien décoché « terrain » : écrans d\'équipe seulement, aucun des cinq écrans personnels', tNon.length > 0 && TERRAIN.filter(r => !['taches','absences'].includes(r)).every(r => !tNon.includes(r)), tNon);
// les trois noms qui ne sont pas des routes (O2)
const ACTE = { stockAccepter:p => PROFILS_SP[p].valstock, stockReglages:p => PROFILS[p].stock.s, produitsPrixVente:p => PROFILS[p].stock.s };
const PROFILS_SP = { admin:{ valstock:1 }, resp:{ valstock:1 }, secr:{ valstock:0 }, tech:{ valstock:0 } };
for (const [nom, f] of Object.entries(ACTE)) v(`${nom} : Marc et Responsable oui, Secrétariat non`, !!f('admin') && !!f('resp') && !f('secr'), nom);
console.log(`\n== ${ko ? 'ÉCHEC' : 'OK'} : ${ko} contrôle(s) en échec`); process.exit(ko ? 1 : 0);
