// LA COMPTABILITÉ DANS SON CADRE : la fenêtre OP COMPTABLE ne partage pas le code de la page, la garde d'OP GESTION n'y voit aucun clic. Elle REÇOIT les droits de la personne (opc_role.droits) et avale
// elle-même les gestes qui écrivent quand « Comptabilité › Modifier » manque ; qui l'a (Julie, le gérant) n'est jamais refusé. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
const ECRIT = ['rappro-ok', 'rappro-pointer', 'tout-traiter', 'piece-ok', 'paie-valider', 'tva-declarer', 'ecr-supprimer', 'ecr-modifier', 'cloturer-envoyer', 'valider-tout', 'saisie-ok'];
const LIRE = ['aller', 'expliquer', 'fermer', 'menu', 'film', 'consigne-x', 'fec-dl'];   /* pas « piece » : sans identifiant, ouvrirPiece(undefined) jette dans la page, une erreur que seule la sonde fabrique */
async function essai(c) {
  /* par la porte que prennent le menu et la recherche (cpSysAllerRubrique) : un simple aller() est une navigation programmée, qui ouvre la Comptabilité native et non sa fenêtre */
  await c.p.evaluate(() => { fermerPanneau(); cpSysAllerRubrique('comptabilite'); }); await L.calme(c.p, 1500);
  /* le cadre se crée après le rendu de la vue : sur une machine chargée il tarde (rejouer sur un délai, jamais conclure) */
  let f = null; for (let i = 0; i < 40 && !f; i++) { f = L.cadre(c.p, /prototype-comptabilite\.html/); if (!f) await c.p.waitForTimeout(500); } if (!f) return null;
  for (let i = 0; i < 20; i++) { const ok = await f.evaluate(() => !!window.CMPT_DROITS || window.CMPT_DROITS === null && document.readyState === 'complete'); if (ok) break; await c.p.waitForTimeout(300); }
  await c.p.waitForTimeout(600);
  return f.evaluate(([E, R]) => { const toucher = a => { const b = document.createElement('button'); b.type = 'button'; b.dataset.a = a; document.body.appendChild(b); const n0 = window.CMPT_REFUS; let fire = 0; const w = ev => { fire++; ev.stopPropagation(); };   /* le témoin coupe la suite : sans identifiant, les vrais gestes (pointer, ouvrir une pièce) jetteraient dans la page, une erreur que seule la sonde fabrique */ b.addEventListener('click', w); b.click(); b.remove(); return { fire, refus:window.CMPT_REFUS - n0 }; };
    return { droits:window.CMPT_DROITS, ecrit:E.map(a => [a, toucher(a)]), lecture:R.map(a => [a, toucher(a)]), toast:(document.getElementById('toast') || {}).textContent || '' }; }, [ECRIT, LIRE]);
}
(async () => {
  const lect = await ouvrirComme({ k:'lc', prenom:'Lou', nom:'Lecture', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1000'])), sp:{} });
  const a = await essai(lect); v('lecture seule : la fenêtre a reçu les droits (modifier : faux)', !!a && a.droits && a.droits.m === false && a.droits.qui === 'Marc', a && a.droits);
  v('lecture seule : les 11 gestes qui écrivent sont avalés (témoin muet, refus compté) et le refus est dit', !!a && a.ecrit.every(([, t]) => t.fire === 0 && t.refus === 1) && /Ce geste n’est pas ouvert à ton compte : .* Demande à Marc\./.test(a.toast), a && [a.ecrit.filter(([, t]) => !(t.fire === 0 && t.refus === 1)), a.toast]);
  v('lecture seule : les gestes de lecture passent (7)', !!a && a.lecture.every(([, t]) => t.fire === 1 && t.refus === 0), a && a.lecture.filter(([, t]) => !(t.fire === 1 && t.refus === 0)));
  await L.fin(lect);
  const julie = await ouvrirComme('julie'); const b = await essai(julie);
  v('Julie (Comptabilité en écriture) : rien n\'est refusé dans la fenêtre', !!b && b.droits && b.droits.m === true && b.ecrit.every(([, t]) => t.fire === 1 && t.refus === 0), b && [b.droits, b.ecrit.filter(([, t]) => t.refus)]);
  await L.fin(julie);
  const marc = await ouvrirComme('marc'); const m = await essai(marc);
  v('le gérant : rien n\'est refusé', !!m && m.ecrit.every(([, t]) => t.fire === 1 && t.refus === 0), m && m.ecrit.filter(([, t]) => t.refus));
  v('aucune erreur de page', lect.err.length === 0 && julie.err.length === 0 && marc.err.length === 0, [lect.err.slice(0, 2), julie.err.slice(0, 2), marc.err.slice(0, 2)].map(l => l.map(e => String(e).slice(0, 160))));
  await L.fin(marc); await fin();
})().catch(e => { console.error(e); process.exit(1); });
