/* test-2998 — Chauffage / climatisation : les entretiens qui pressent ont leur ligne dans la CLOCHE (24 octobre 2026).
   `cvcNotif` (le VRAI bloc CVC, monté par cvc-monter.js) rend UNE ligne regroupée — dépassés, ou dans les 30 jours — tirée de la même liste que les Tâches et le
   tableau de bord ; null pour un métier sans parc ou quand rien ne presse ; son identifiant change quand la liste change (elle revient « non lue »). Et `computeNotifs`
   ne la lit que pour qui voit les interventions (lu dans le code, commentaires retirés). */
const { monter, APP, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const BASE = {
  clients: [{ id: 'c1', nom: 'Boulangerie Élise' }, { id: 'c3', nom: 'Société Martin' }],
  appareils: [
    { id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval', emplacement: 'Chaufferie' },
    { id: 'a2', clientId: 'c1', type: 'pac_air', marque: 'Daikin', miseEnService: '2024-11-10' },
    { id: 'a4', clientId: 'c3', type: 'chaudiere_gaz', miseEnService: '2020-01-01' }],
  interventions: [{ id: 'i1', clientId: 'c1', statut: 'terminee', date: '2025-10-30', heure: '09:00', type: 'Entretien annuel chaudière', appareilIds: ['a1'] }],
  contrats: [] };
const W = monter({ db: cdc(BASE), today: '2026-10-23' });
const n = W.cvcNotif();
v('⛔ chauffage : UNE ligne, qui compte les entretiens qui pressent et dit combien sont dépassés', [n && n.ic, n && n.txt.replace(/<[^>]+>/g, ''), n && n.act], ['🔥', '3 entretiens à planifier — dont 1 dépassé', "go('taches')"]);
const W2 = monter({ db: cdc(BASE), today: '2026-10-23' }); W2.db.interventions.push({ id: 'i9', clientId: 'c3', statut: 'terminee', date: '2026-10-20', type: 'Entretien annuel chaudière', appareilIds: ['a4'] });
const n2 = W2.cvcNotif();
v('   l’entretien du dépassé fait : la ligne change de texte ET d’identifiant (elle revient « non lue »)', [n2 && n2.txt.replace(/<[^>]+>/g, ''), n2 && n2.id !== n.id], ['2 entretiens à planifier dans les 30 jours', true]);
const SANS_RETARD = Object.assign(cdc(BASE), { appareils: BASE.appareils.filter(a => a.id !== 'a4') });
v('   rien ne presse (les échéances sont à plus de 30 jours) : aucune ligne', monter({ db: SANS_RETARD, today: '2025-11-01' }).cvcNotif(), null);
v('⛔ un métier sans parc (3D) : aucune ligne, même avec des appareils', monter({ db: cdc(BASE), today: '2026-10-23', metier: '3d' }).cvcNotif(), null);
const W3 = monter({ db: cdc(BASE), today: '2026-10-23' }); W3.cvcPropositions = () => { throw new Error('calcul cassé'); };
v('   un calcul qui jette : aucune ligne, la cloche ne casse pas', W3.cvcNotif(), null);
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const d = CODE.indexOf('function computeNotifs(');
v('⛔ computeNotifs lit la ligne SEULEMENT pour qui voit les interventions', d > 0 && /if\(typeof cvcNotif==='function'&&notifVoitModule\('interventions'\)\)\{ const n=cvcNotif\(\); if\(n\) out\.push\(n\); \}/.test(CODE.slice(d, d + 20000)), true);
console.log(`\ntest-2998 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);
