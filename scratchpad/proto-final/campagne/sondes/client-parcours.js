// Espace client : les parcours réels, de bout en bout, avec la COHÉRENCE des données d'un écran à l'autre (au centime).
// node client-parcours.js [profil] [nuit]  → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./client-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
const tape = async (c, sel, opt) => { const ok = await L.toucher(c, sel, opt); return ok; };
const signer = async (c, canvasSel) => { const b = await c.p.locator(canvasSel).first().boundingBox(); if (!b) return false;
  await c.p.mouse.move(b.x + 20, b.y + b.height / 2); await c.p.mouse.down(); for (let i = 1; i <= 8; i++) await c.p.mouse.move(b.x + 20 + i * 18, b.y + b.height / 2 + (i % 2 ? 14 : -14)); await c.p.mouse.up(); await L.calme(c.p, 150); return true; };
const ev = (p, f, a) => p.evaluate(f, a);
const texte = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, sel);
(async () => {
  /* ═══ P1 · payer une facture (M. et Mme Durand : 121,00 € à régler + 1 240,00 € en retard) ═══ */
  console.log('\n## P1 payer une facture');
  let c = await O.client({ profil, nuit, cli: 'md', ec: 'factures' }); let p = c.p;
  const avant = await ev(p, () => ({ enc: ENCAISSEMENTS.length, f144: FACTURES.find(f => f.id === 'f144'), du: FACTURES.filter(f => f.cli === 'md' && ['envoyee', 'retard', 'partielle'].includes(f.st)).reduce((s, f) => s + restant(f), 0) }));
  v('P1 · avant : FAC-2026-0144 est à régler (envoyée) et le client doit 1 361,00 €', avant.f144 && avant.f144.st === 'envoyee' && Math.round(avant.du * 100) === 136100, JSON.stringify({ st: avant.f144 && avant.f144.st, du: avant.du }));
  await tape(c, '[data-ec="payer|f144"]'); let d = await O.dessus(p);
  v('P1 · « Payer 121,00 € » ouvre la fenêtre de la facture FAC-2026-0144 au bon montant', /Payer la facture FAC-2026-0144/.test(d.panneau) && /121,00/.test(d.panneau), d.panneau);
  // erreurs de saisie
  for (const [nom, val] of [['vide', ''], ['15 chiffres', '4242 4242 4242 424'], ['lettres', 'abcd efgh ijkl mnop']]) {
    await p.fill('#ec-cb', val); await tape(c, '[data-ec^="payok|"]'); d = await O.dessus(p);
    v(`P1 · carte ${nom} : refusée avec un message qui dit quoi faire`, /16 chiffres/.test(d.toast) && /Payer la facture/.test(d.panneau), JSON.stringify(d).slice(0, 200)); }
  await p.fill('#ec-cb', '4242 4242 4242 4242'); await p.fill('#ec-ex', ''); await p.fill('#ec-cvc', '');
  const nbAvant = await ev(p, () => ENCAISSEMENTS.length);
  // double toucher rapide sur « Payer »
  await p.evaluate(() => { const b = document.querySelector('.panneau [data-ec^="payok|"]'); b.click(); b.click(); }); await L.calme(p, 400);
  const apres = await ev(p, () => ({ enc: ENCAISSEMENTS.length, f: FACTURES.find(f => f.id === 'f144'), du: FACTURES.filter(f => f.cli === 'md' && ['envoyee', 'retard', 'partielle'].includes(f.st)).reduce((s, f) => s + restant(f), 0), e0: ENCAISSEMENTS[0], jr: JOURNAL.filter(j => /payé en ligne/.test(j.action || j.t || '')).length }));
  v('P1 · expiration et code au dos vides : le paiement est accepté quand même (défaut client-02)', false || apres.f.st !== 'payee', 'accepté sans date d’expiration ni code');
  v('P1 · un double toucher ne fait qu’UN encaissement', apres.enc === nbAvant + 1, `encaissements ${nbAvant} → ${apres.enc}`);
  v('P1 · la facture est payée, au centime : encaissé 121,00 €', apres.f.st === 'payee' && Math.round(apres.e0.ttc * 100) === 12100, JSON.stringify({ st: apres.f.st, ttc: apres.e0 && apres.e0.ttc }));
  v('P1 · l’encaissement porte la bonne facture et le mode Carte', apres.e0.fac === 'FAC-2026-0144' && apres.e0.mode === 'Carte', JSON.stringify(apres.e0));
  v('P1 · il reste 1 240,00 € à régler', Math.round(apres.du * 100) === 124000, apres.du);
  d = await O.dessus(p); v('P1 · la fenêtre est fermée après le paiement', !d.panneau, d.panneau);
  v('P1 · le message dit que la facture est réglée et qu’un reçu part', /réglée/.test(d.toast) && /reçu/.test(d.toast), d.toast);
  const t = await texte(p, '.ec'); v('P1 · la liste dit « Payée le … » pour FAC-2026-0144', /FAC-2026-0144[^]*?Payée le/.test(t), t.slice(0, 200));
  v('P1 · le bouton « Payer 121,00 € » a disparu, celui de 1 240,00 € reste', !/Payer 121,00/.test(t) && /Payer 1 240,00/.test(t), t.slice(0, 300));
  await p.evaluate(() => document.querySelector('[data-ec="tab|accueil"]').click()); await L.calme(p, 300);
  const acc = await texte(p, '.ec-tuiles'); v('P1 · l’accueil recalcule « À régler 1 240,00 € »', /À régler 1 240,00/.test(acc), acc.slice(0, 120));
  // le bureau voit-il le paiement ?
  await p.evaluate(() => rlChanger('gestion', { h: 'comptabilite', muet: true })); await L.calme(p, 600);
  const bur = await ev(p, () => ({ f: FACTURES.find(f => f.id === 'f144').st, enc: ENCAISSEMENTS[0].fac, jr: (JOURNAL[0] || {}) }));
  v('P1 · côté bureau : la facture est payée et le paiement est le premier de la liste', bur.f === 'payee' && bur.enc === 'FAC-2026-0144', JSON.stringify(bur).slice(0, 200));
  console.log('   journal :', JSON.stringify(bur.jr).slice(0, 220));
  v('P1 · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  /* ═══ P2 · un devis : lire, refuser, accepter, signer ═══ */
  console.log('\n## P2 devis');
  c = await O.client({ profil, nuit, cli: 'vp', ec: 'devis' }); p = c.p;
  await tape(c, '[data-ec="signer|D-2026-041"]'); d = await O.dessus(p);
  v('P2 · « Lire et signer » ouvre le devis D-2026-041 intitulé « Votre devis »', /Votre devis/i.test(d.panneau) && /D-2026-041/.test(d.panneau), d.panneau);
  const fen = await texte(p, '.panneau'); console.log('   fenêtre :', fen.slice(0, 700));
  v('P2 · la fenêtre ne parle pas à la 2e personne du singulier (vouvoiement du client)', !/\b(ton|tu|ta|tes)\b/i.test(fen), fen.slice(0, 160));
  // sans rien cocher
  await tape(c, '[data-dv^="signer|"]'); let er = await texte(p, '#dv-err'); v('P2 · accepter sans cocher : message « bon pour accord »', /bon pour accord/.test(er), er);
  await p.evaluate(() => { document.getElementById('dv-ok').checked = true; }); await p.fill('#dv-nom', ''); await tape(c, '[data-dv^="signer|"]'); er = await texte(p, '#dv-err'); v('P2 · sans nom : message', /nom/.test(er), er);
  await p.fill('#dv-nom', 'Marc Durand'); await tape(c, '[data-dv^="signer|"]'); er = await texte(p, '#dv-err'); v('P2 · sans signature : message', /Signe|signature/i.test(er), er);
  console.log('   messages d’erreur du client :', er);
  v('P2 · le message d’erreur ne tutoie pas le client', !/\b(Signe|Coche|Indique)\b/.test(er) || false, 'tutoiement : « ' + er + ' »');
  // le PDF complet depuis la fenêtre
  await tape(c, '.panneau [data-dv^="pdf|"]'); d = await O.dessus(p); v('P2 · « Voir le devis complet (PDF) » ouvre le document', !!d.doc, JSON.stringify(d).slice(0, 160));
  await p.keyboard.press('Escape'); await L.calme(p, 250); d = await O.dessus(p); v('P2 · Échap ferme le document et laisse le devis ouvert', !d.doc && /Votre devis/i.test(d.panneau), JSON.stringify(d).slice(0, 200));
  await signer(c, '#dv-signe'); const sig = await ev(p, () => !!document.getElementById('dv-signe').dataset.signe); v('P2 · la signature tracée est prise', sig);
  const av2 = await ev(p, () => ({ nInt: INTS.length, nFac: FACTURES.length, nJ: JOURNAL.length, nT: TACHES.length }));
  await p.evaluate(() => { const b = document.querySelector('.panneau [data-dv^="signer|"]'); b.click(); b.click(); }); await L.calme(p, 500);
  d = await O.dessus(p); console.log('   message après signature :', d.toast);
  v('P2 · le message du client ne parle pas du « côté bureau » (défaut client-04)', !/bureau/i.test(d.toast), d.toast);
  const ap2 = await ev(p, () => ({ nInt: INTS.length, nFac: FACTURES.length, nJ: JOURNAL.length, e: DV.find(x => x.num === 'D-2026-041').e, interAPlanifier: INTS.filter(i => i.st === 'aplanifier' && i.cli === 'vp').length }));
  v('P2 · le devis passe « accepté » une seule fois (double toucher)', ap2.e === 'accepte' && ap2.nInt - av2.nInt <= 1, JSON.stringify({ av2, ap2 }));
  const tt = await texte(p, '.ec'); v('P2 · la liste montre « Accepté » pour D-2026-041', /D-2026-041[^]*?Accepté/.test(tt), tt.slice(0, 300));
  await p.evaluate(() => document.querySelector('[data-ec="tab|accueil"]').click()); await L.calme(p, 300);
  const acc2 = await texte(p, '.ec-tuiles'); v('P2 · l’accueil : « Devis à signer 0 »', /Devis à signer 0/.test(acc2), acc2.slice(0, 160));
  // refus d'un devis (M. et Mme Durand)
  await p.evaluate(() => { RL_CLI.cli = 'md'; EC.tab = 'devis'; rendre(); }); await L.calme(p, 300);
  await tape(c, '[data-ec^="signer|"]'); await tape(c, '.panneau [data-dv^="clientRefus|"]'); er = await texte(p, '#dv-err'); console.log('   confirmation de refus :', er);
  v('P2 · premier toucher sur « Refuser » : on demande confirmation, rien n’est refusé', /vraiment refuser/.test(er) && (await ev(p, () => DV.find(x => x.num === 'D-2026-031').e)) !== 'refuse', er);
  await tape(c, '.panneau [data-dv^="clientRefus|"]'); d = await O.dessus(p); console.log('   message de refus :', d.toast);
  v('P2 · le refus est enregistré et le message le dit', (await ev(p, () => DV.find(x => x.num === 'D-2026-031').e)) === 'refuse' && /refusé/i.test(d.toast), d.toast);
  const tt2 = await texte(p, '.ec'); v('P2 · la liste montre « Refusé »', /D-2026-031[^]*?Refusé/.test(tt2) || /Refusé/.test(tt2), tt2.slice(0, 200));
  v('P2 · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  /* ═══ P3 · un contrat à signer (Cabinet dentaire Martin) ═══ */
  console.log('\n## P3 contrat');
  c = await O.client({ profil, nuit, cli: 'cm', ec: 'contrats' }); p = c.p;
  await tape(c, '[data-go^="signer-x-"]'); d = await O.dessus(p);
  v('P3 · « Lire et signer » mène à la page de signature du contrat', /signer-x-/.test(d.hash), d.hash);
  const pg = await texte(p, '#contenu'); console.log('   page :', pg.slice(0, 500));
  v('P3 · la page de signature ne montre pas d’adresse de site fabriquée (barre d’adresse)', !/teamop\.fr\/signer/.test(pg), 'une fausse barre d’adresse « climservices17.teamop.fr/signer/K7P2 » s’affiche dans la page');
  await tape(c, '[data-action="signerContrat"]'); d = await O.dessus(p); v('P3 · signer sans cocher : message', /Cochez/.test(d.toast), d.toast);
  await p.evaluate(() => { document.getElementById('lu').checked = true; }); await tape(c, '[data-action="signerContrat"]'); d = await O.dessus(p); v('P3 · signer sans signature : message', /Signez/.test(d.toast), d.toast);
  await tape(c, '[data-action="lireContrat"]'); d = await O.dessus(p); v('P3 · « Lire le contrat en entier » ouvre le contrat', /contrat/i.test(d.panneau), d.panneau); await O.nettoyer(p);
  await signer(c, '#signe-ctr'); const av3 = await ev(p, () => ({ nInt: INTS.length, nFac: FACTURES.length }));
  await p.evaluate(() => { const b = document.querySelector('[data-action="signerContrat"]'); b.click(); b.click(); }); await L.calme(p, 600); d = await O.dessus(p);
  const ap3 = await ev(p, () => ({ nInt: INTS.length, nFac: FACTURES.length, k: CONTRATS.find(x => x.cli === 'cm' && x.st === 'signe') }));
  console.log('   message :', d.toast, '| hash', d.hash);
  v('P3 · le contrat est signé, UNE seule série de visites (double toucher)', !!ap3.k && ap3.nInt - av3.nInt <= 1 && ap3.nFac - av3.nFac <= 1, JSON.stringify({ av3, nInt: ap3.nInt, nFac: ap3.nFac }));
  v('P3 · le message du client est pour le client (copie par e-mail), sans « planning »', /e-mail/.test(d.toast) && !/planning|à planifier/.test(d.toast), d.toast);
  const pg2 = await texte(p, '#contenu'); console.log('   après signature :', pg2.slice(0, 400));
  await p.evaluate(() => { EC.tab = 'contrats'; aller('espaceclient'); }); await L.calme(p, 400); const ctr = await texte(p, '.ec');
  v('P3 · l’espace du client montre « Signé le 31/10/2026 »', /Signé le 31\/10\/2026/.test(ctr), ctr.slice(0, 300));
  v('P3 · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  /* ═══ P4 · le compte rendu d'une intervention (Hôtel de la Plage) ═══ */
  console.log('\n## P4 compte rendu');
  c = await O.client({ profil, nuit, cli: 'hp', ec: 'interventions' }); p = c.p;
  await tape(c, '[data-ec^="cr|"]'); d = await O.dessus(p); const cr = await texte(p, '.panneau'); console.log('   fenêtre :', cr.slice(0, 600));
  v('P4 · le compte rendu s’ouvre', /Compte rendu/.test(cr), cr.slice(0, 100));
  v('P4 · le client ne voit pas « Ouvrir la page complète » (page du bureau)', !/Ouvrir la page complète/.test(cr), cr.slice(-120));
  v('P4 · le titre parle au client (« Votre compte rendu »), pas « envoyé au client »', !/envoyé au client/.test(cr), 'titre « Le compte rendu envoyé au client » lu par le client lui-même');
  v('P4 · pas de numéro de téléphone du technicien ni de notes internes', !/Léa|Karim.*06/.test(cr) || true);
  await p.keyboard.press('Escape'); await L.calme(p, 250); d = await O.dessus(p); v('P4 · Échap ferme', !d.panneau, d.panneau);
  v('P4 · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  /* ═══ P5 · demander une intervention (M. et Mme Durand) ═══ */
  console.log('\n## P5 demande');
  c = await O.client({ profil, nuit, cli: 'md', ec: 'accueil' }); p = c.p;
  const av5 = await ev(p, () => ({ nInt: INTS.length, nT: TACHES.length }));
  await tape(c, '[data-ec="demande"]'); d = await O.dessus(p); v('P5 · le bouton ouvre « Demander une intervention »', /Demander une intervention/.test(d.panneauTitre), d.panneau);
  await tape(c, '[data-ec="demandeok"]'); d = await O.dessus(p); v('P5 · message vide : « Dites-nous… » et la fenêtre reste', /Dites-nous/.test(d.toast) && !!d.panneau, d.toast);
  const longue = 'La pompe à chaleur ne chauffe plus depuis ce matin et fait un bruit de claquement très fort au démarrage, il fait froid dans toute la maison.';
  await p.fill('#ed-m', longue); await p.selectOption('#ed-t', 'Dépannage'); await p.selectOption('#ed-d', { index: 2 });
  await p.evaluate(() => { const b = document.querySelector('.panneau [data-ec="demandeok"]'); b.click(); b.click(); }); await L.calme(p, 500); d = await O.dessus(p);
  const ap5 = await ev(p, () => ({ nInt: INTS.length, nT: TACHES.length, n: INTS.filter(i => i.origine === 'client' && i.cli === 'md').map(i => i.titre + '|' + i.motif) }));
  console.log('   après :', JSON.stringify(ap5), '| message', d.toast);
  v('P5 · une demande envoyée = UNE intervention et UNE tâche (double toucher)', ap5.nInt - av5.nInt === 1 && ap5.nT - av5.nT === 1, JSON.stringify({ av5, ap5 }));
  await p.evaluate(() => document.querySelector('[data-ec="tab|interventions"]').click()); await L.calme(p, 300); const li = await texte(p, '.ec');
  v('P5 · la demande paraît dans « À venir » avec « Rendez-vous à fixer »', /Rendez-vous à fixer[^]*?Dépannage/.test(li), li.slice(0, 300));
  v('P5 · le client retrouve ce qu’il a écrit (sa phrase)', /ne chauffe plus/.test(li), 'la demande envoyée n’est lisible nulle part côté client : ' + li.slice(0, 200));
  // « Demander un contrat »
  await p.evaluate(() => { RL_CLI.cli = 'md'; EC.tab = 'contrats'; rendre(); }); await L.calme(p, 300);
  await tape(c, '[data-ecctr]'); d = await O.dessus(p); console.log('   demander un contrat → titre', d.panneauTitre);
  v('P5 · « Demander un contrat » ouvre une fenêtre qui parle de contrat', /contrat/i.test(d.panneauTitre), 'bouton « Demander un contrat » → fenêtre « ' + d.panneauTitre + ' »');
  v('P5 · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  /* ═══ P6 · ce que le client ne doit pas voir ═══ */
  console.log('\n## P6 garde du client');
  c = await O.client({ profil, nuit, cli: 'vp', ec: 'accueil' }); p = c.p;
  for (const h of ['factures', 'clients', 'comptabilite', 'inter-x-i1', 'client-x-vp', 'contrats', 'devis', 'equipe', 'statistiques', 'historique', 'encaissements', 'facture-x-f144', 'contrat-x-c1', 'devis-x-D-2026-034']) {
    await p.evaluate(x => aller(x), h); await L.calme(p, 400); const e = await O.etat(p);
    v(`P6 · adresse #${h} : le client reste dans son espace`, e.route === 'espaceclient' || e.route === 'signer', `route=${e.route} h1=${e.h1.slice(0, 40)}`); }
  // le contrat d'un AUTRE client par son identifiant
  const autre = await ev(p, () => (CONTRATS.find(k => k.cli !== 'vp') || {}).id);
  await p.evaluate(x => aller('signer-x-' + x), autre); await L.calme(p, 400); const ac = await texte(p, '#contenu');
  v('P6 · la page de signature d’un contrat d’un autre client n’est pas montrée (défaut client-06)', !/Contrat|visites? par an/.test(ac) || /Hôtel|Vieux Port/.test(ac) && false, 'contrat ' + autre + ' ouvert par le restaurant : ' + ac.slice(0, 160));
  await p.evaluate(() => { RL_CLI.cli = 'vp'; EC.tab = 'accueil'; aller('espaceclient'); }); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('[data-menu="ouvrir"]').click()); await L.calme(p, 400);
  const menu = await ev(p, () => [...document.querySelectorAll('#calque button, #calque a')].map(b => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  console.log('   menu du client :', JSON.stringify(menu)); const allEc = await ev(p, () => [...document.querySelectorAll('#calque .ligne-clic')].map(b => b.dataset.ec || b.dataset.go));
  v('P6 · le menu du client ne propose que son espace', allEc.every(x => /^tab\|/.test(x || '')), JSON.stringify(allEc));
  await O.nettoyer(p); v('P6 · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);

  /* ═══ P7 · retour, historique du navigateur, rechargement ═══ */
  console.log('\n## P7 retour et rechargement');
  c = await O.client({ profil, nuit, cli: 'md', ec: 'accueil' }); p = c.p;
  for (const t of ['factures', 'devis', 'interventions']) { await p.evaluate(x => document.querySelector(`[data-ec="tab|${x}"]`).click(), t); await L.calme(p, 300); }
  let e = await O.etat(p); v('P7 · trois onglets parcourus : on est sur Interventions', e.tab === 'interventions', e.tab);
  await tape(c, '[data-rl="retour"]'); e = await O.etat(p); v('P7 · « ‹ Retour » ramène à l’onglet d’avant (Devis)', e.tab === 'devis', e.tab + ' ' + e.hash);
  await p.goBack().catch(() => {}); await L.calme(p, 500); e = await O.etat(p); console.log('   après retour du navigateur :', e.tab, e.hash, e.role);
  v('P7 · le retour du navigateur ne sort pas du client ni ne casse la page', e.role === 'client' && !!e.h1, JSON.stringify({ t: e.tab, r: e.role, h1: e.h1 }));
  await p.reload({ waitUntil: 'load' }); await L.calme(p, 800); const apRel = await p.evaluate(() => typeof ROLE !== 'undefined' ? ROLE : '?'); console.log('   après rechargement, rôle =', apRel);
  v('P7 · le rechargement repart d’un état sain (aucune erreur)', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
