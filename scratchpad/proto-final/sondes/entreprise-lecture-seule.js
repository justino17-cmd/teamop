// « Mon entreprise » en LECTURE SEULE (la personne qui a la rubrique sans pouvoir la modifier : le Responsable de l'étape des droits) : les cartes
// restent et se lisent, aucun « Enregistrer », champs désactivés, la phrase « Tu peux regarder cette fiche ; c'est {prénom} qui la modifie. »,
// aucun bouton « Compléter », pas de pastille au menu, pas de lien « Notes de frais » ; une écriture FORCÉE (clic synthétique) est avalée et dite.
// La condition vit dans UNE fonction (entModifiable) : à l'étape des droits elle lira la case « L'entreprise et l'équipe › Modifier ».
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population (panneaux, boutons d'écriture) avant de conclure.
const { L, v, ouvrirEnt, fiche, toast, panneauOuvert, fin } = require('./entreprise-commun.js');
(async () => {
  for (const profil of ['mac', 'iphone']) {
    const c = await ouvrirEnt({ profil });
    await c.p.evaluate(() => { entModifiable = () => false; ENTREPRISE.siret = ''; rendre(); }); await L.calme(c.p, 400);
    const r = await c.p.evaluate(() => ({ cartes:document.querySelectorAll('[data-ent^="carte|"]').length, completer:document.querySelectorAll('[data-ent="completer"]').length, ban:(document.querySelector('.ent-ban') || {}).textContent || '', liens:[...document.querySelectorAll('[data-ent^="lien|"]')].map(e => e.dataset.ent.split('|')[1]), pastille:rlPastille('entreprise') }));
    const b = r.ban.replace(/[  ]/g, ' ');
    v(`${profil} : cinq cartes lisibles`, r.cartes === 5, r.cartes);
    v(`${profil} : le bandeau dit le manque SANS bouton « Compléter »`, r.completer === 0 && /Il manque le SIRET sur la fiche de l’entreprise : une facture ne peut pas partir sans\./.test(b), { b, n:r.completer });
    v(`${profil} : pas de pastille au menu (le manque n’est pas SON affaire)`, r.pastille === 0, r.pastille);
    v(`${profil} : le lien « Notes de frais » (règle du gérant) n’est pas proposé`, !r.liens.includes('ndf') && r.liens.length === 5, r.liens);
    let nPan = 0, nEcr = 0;
    for (const k of ['ident', 'legal', 'logo', 'banque', 'horaires']) {
      await L.toucher(c, `[data-ent="carte|${k}"]`); await L.calme(c.p, 250); nPan++;
      const p = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; const champs = [...P.querySelectorAll('input, select, textarea')]; return { champs:champs.length, actifs:champs.filter(e => !e.disabled).length, enreg:[...P.querySelectorAll('.actions .btn:not(.gris)')].length, phrase:((P.querySelector('.info') || {}).textContent || '').replace(/\s+/g, ' '), fermer:[...P.querySelectorAll('.actions .btn')].map(b => b.textContent), choisir:!!P.querySelector('label.btn[for="en-logo"]'), retirer:!!P.querySelector('[data-ent="logoretirer"]') }; });
      v(`${profil} carte ${k} : le panneau s’ouvre en lecture (champs désactivés : ${p && p.champs}, aucun actif)`, !!p && p.champs >= 1 && p.actifs === 0, p);
      v(`${profil} carte ${k} : aucun « Enregistrer » ; « Annuler » devient « Fermer »`, !!p && p.enreg === 0 && p.fermer.every(t => t === 'Fermer') && !p.choisir && !p.retirer, p);
      v(`${profil} carte ${k} : « Tu peux regarder cette fiche ; c’est Marc qui la modifie. »`, !!p && /Tu peux regarder cette fiche ; c’est Marc qui la modifie\./.test(p.phrase), p && p.phrase);
      nEcr += p ? p.enreg : 0; await L.ranger(c.p);
    }
    v(`${profil} population : cinq panneaux ouverts, boutons d’écriture comptés (0)`, nPan === 5 && nEcr === 0, { nPan, nEcr });
    // une écriture FORCÉE (clic synthétique) est avalée et dite, la donnée ne bouge pas
    const avant = await fiche(c.p); let n = 0;
    for (const [attr, v0] of [['data-ent', 'identok'], ['data-ent', 'banqueok'], ['data-ent', 'horairesok'], ['data-ent', 'logook'], ['data-ent', 'logoretirer'], ['data-cx', 'ficheok']]) {
      await c.p.evaluate(([a, x]) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute(a, x); document.body.appendChild(b); b.click(); b.remove(); }, [attr, v0]); await L.calme(c.p, 150);
      const t = await toast(c.p), ap = await fiche(c.p); n++;
      v(`${profil} écriture forcée « ${v0} » : avalée, dite (« Ce geste n’est pas ouvert à ton compte »), la fiche ne bouge pas`, /Ce geste n’est pas ouvert à ton compte : changer la fiche de l’entreprise\. Demande à Marc\./.test(t) && JSON.stringify(ap) === JSON.stringify(avant), t);
    }
    v(`${profil} population : six écritures forcées jouées`, n === 6, n);
    v(`${profil} : aucune erreur de page`, c.err.length === 0, c.err);
    await L.fin(c);
  }
  await fin();
})();
