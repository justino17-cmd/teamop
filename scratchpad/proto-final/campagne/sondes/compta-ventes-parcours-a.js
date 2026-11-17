// Parcours A « compta-ventes » : une facture à la main, de la création à l'envoi, en gérant (Marc), valeurs absurdes comprises.
// Joue : Comptabilité › Ventes › Factures & avoirs › ＋ Ajouter › Facture client ; champs vides ; quantité négative ; prix extrême ;
// nom de 60 caractères ; « ＋ Ajouter une ligne » (peut-on la NOMMER ? la SUPPRIMER ?) ; aperçu et envoi ; numéro ; liste ; à recevoir.
// usage : node compta-ventes-parcours-a.js [profil]      « N ✓ · M ✗ », code 1 si un contrôle tombe (le nom du contrôle porte le numéro du défaut)
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const du0 = await X.du(p), d0 = await X.donnees(p);
  L.v('population : 8 factures au départ', d0.F.length === 8, d0.F.length);
  await X.compta(c, 'fventes', { cat: 'ventes' });
  L.v('l’écran Factures & avoirs est ouvert', /Factures/.test(await X.texte(p, '#contenu h1')) || /Comptabilité/.test(await X.texte(p, '#contenu h1')));
  await L.capture(c, X.CAP + `a-${profil}-liste.png`);
  // ＋ Ajouter → Facture client
  await L.toucher(c, '[data-cx="nouveau"]'); L.v('« ＋ Ajouter » ouvre une fenêtre à 4 choix', (await X.panneau(p)).includes('Facture client') && (await X.panneau(p)).includes('Paiement reçu'));
  await L.toucher(c, '#calque [data-cx="facture"]'); L.v('« Facture client » ouvre le formulaire', /Nouvelle facture/.test(await X.panneau(p)));
  await L.capture(c, X.CAP + `a-${profil}-formulaire.png`);
  // champs vides
  await L.toucher(c, '#calque [data-cx="factureok"]'); let t = await X.toasts(p); L.v('désignation vide : un message dit quoi faire', /désignation|factures/i.test(t), t);
  await X.saisir(c, '#nf-d', 'Mise en service'); await L.toucher(c, '#calque [data-cx="factureok"]'); t = await X.toasts(p); L.v('prix vide : un message dit quoi faire', /prix/i.test(t), t);
  // valeurs absurdes
  await X.saisir(c, '#nf-p', '-50'); await L.toucher(c, '#calque [data-cx="factureok"]'); t = await X.toasts(p); L.v('prix négatif refusé', /prix/i.test(t) && !(await p.evaluate(() => FACTURES.some(f => f.id.startsWith('fm')))), t);
  await X.saisir(c, '#nf-p', '100'); await X.saisir(c, '#nf-q', '-3');
  const avantNeg = await p.evaluate(() => FACTURES.length); await L.toucher(c, '#calque [data-cx="factureok"]');
  const negat = await p.evaluate(() => { const f = FACTURES.find(x => x.id.startsWith('fm')); return f ? { q: f.lignes[0].q, ht: htDe(f) } : null; });
  L.v('compta-ventes-01 · une quantité négative ne fabrique pas une facture négative (ou est refusée)', !negat || (parseFloat(String(negat.q).replace(',', '.')) > 0 && negat.ht > 0), negat);
  // remettre d'aplomb : repartir d'une page neuve pour la suite
  await X.O.neuf(c, 'comptabilite'); await X.compta(c, 'fventes', { cat: 'ventes' });
  await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]');
  const nom60 = 'Mise en service d’une pompe à chaleur air-eau avec groupe extérieur';
  await X.saisir(c, '#nf-o', nom60); await X.saisir(c, '#nf-d', nom60); await X.saisir(c, '#nf-q', '2'); await X.saisir(c, '#nf-p', '12 345,67');
  await L.toucher(c, '#calque [data-cx="factureok"]'); await p.waitForTimeout(400);
  const nf = await p.evaluate(() => { const f = FACTURES.find(x => x.id.startsWith('fm')); return f ? { id: f.id, ht: htDe(f), tva: f.tva, st: f.st, route, param } : null; });
  L.v('la facture est créée, « à valider », sans numéro', !!nf && nf.st === 'avalider', nf);
  L.v('HT = 2 × 12 345,67 = 24 691,34 au centime', !!nf && Math.round(nf.ht * 100) === 2469134, nf && nf.ht);
  L.v('la fiche de la facture s’ouvre toute seule', !!nf && /facture/.test(nf.route), nf && nf.route);
  await L.capture(c, X.CAP + `a-${profil}-fiche-nouvelle.png`);
  const dep = await L.deborde(c); L.v('aucun glissement latéral sur la fiche (valeurs longues)', !dep.bouge, dep);
  // « ＋ Ajouter une ligne »
  await L.toucher(c, '[data-action="ligneAjout"]');
  const lig = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return f.lignes.map(l => l.d + '|' + l.pu); }, nf.id);
  L.v('« ＋ Ajouter une ligne » ajoute une ligne', lig.length === 2, lig);
  const champsLigne = await p.evaluate(() => [...document.querySelectorAll('#contenu tbody tr')].map(tr => ({ txt: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 40), champs: tr.querySelectorAll('input,select').length, suppr: !!tr.querySelector('[data-action*="uppr"],[aria-label*="upprimer"],[data-lignesup]') })));
  L.v('compta-ventes-02 · la ligne ajoutée peut être NOMMÉE (un champ texte pour la désignation)', champsLigne.length > 1 && champsLigne[1].champs >= 2, champsLigne);
  L.v('compta-ventes-02b · la ligne ajoutée peut être SUPPRIMÉE', champsLigne.length > 1 && champsLigne[1].suppr, champsLigne);
  await L.capture(c, X.CAP + `a-${profil}-ligne-libre.png`);
  // « Aperçu et envoi » est grisé tant qu'une ligne n'a pas de prix, et dit pourquoi
  const apercuOff = await p.evaluate(() => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return b ? b.disabled : null; });
  L.v('« Aperçu et envoi » est grisé avec une ligne sans prix', apercuOff === true, apercuOff);
  const dit = await X.texte(p, '#contenu');
  L.v('l’écran dit pourquoi (« ligne sans prix »)', /sans prix/.test(dit));
  // on chiffre la ligne libre
  await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); f.lignes[1].pu = 50; rendre(); }, nf.id); await L.calme(p, 300);
  await L.toucher(c, '[data-action="apercuEnvoi"]');
  const ap = await X.panneau(p); L.v('l’aperçu montre le client, l’objet et les pièces jointes', /À :/.test(ap) && /Objet/.test(ap), ap.slice(0, 80));
  await L.capture(c, X.CAP + `a-${profil}-apercu.png`);
  await L.toucher(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(500);
  const apres = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return { num: f.num, st: f.st, ht: htDe(f), reste: restant(f), numSuiv }; }, nf.id);
  L.v('à l’envoi la facture prend un numéro définitif', /^FAC-2026-0\d{3}$/.test(apres.num), apres);
  L.v('à l’envoi elle passe « envoyée »', apres.st === 'envoyee', apres.st);
  const du1 = await X.du(p); L.v('« à recevoir » augmente du TTC exact (24 691,34 + 50 = 24 741,34 HT × 1,2)', du1 - du0 === Math.round(24741.34 * 1.2 * 100), { du0, du1 });
  await L.toucher(c, '[data-retour], .retour'); await X.compta(c, 'fventes', { cat: 'clients' });
  const liste = await X.texte(p, '#contenu'); L.v('la facture paraît dans la liste Factures clients', liste.includes(apres.num), apres.num);
  const err = c.err.slice(); L.v('aucune erreur de page', err.length === 0, err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
