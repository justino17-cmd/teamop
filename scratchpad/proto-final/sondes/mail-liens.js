// Sonde « liens » : les liens qui viennent d'AILLEURS (une tâche, l'Accueil, la fiche d'un client, une notification) ouvrent le BON courriel dans le module,
// y compris quand il n'est pas encore monté (la demande attend son premier relevé), et même si une recherche, une catégorie ou un autre message le cachaient.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg, pret } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const sujet = c => S(c, () => { const r = window.R && window.R(); const e = r && r.querySelector('.rsubj'); return e ? e.textContent.trim() : ''; });
(async () => {
  // a) module PAS encore monté : un lien de tâche (data-taller) vers m3
  let c = await entrer({ profil:'mac', sansAller:true }), p = c.p;
  const avant = await S(c, () => ({ monte:!!COURRIER.inst, route }));
  v('départ : le module n\'est pas encore monté (la population du cas « à froid » est prouvée)', avant.monte === false && avant.route !== 'boiteMail', avant);
  await S(c, () => { const b = document.createElement('button'); b.dataset.taller = 'boiteMail|m3'; document.body.appendChild(b); b.click(); b.remove(); });
  await lib.attendre(p, () => !!(window.R && window.R() && window.R().querySelector('.rsubj')), 9000); await p.waitForTimeout(600);
  const s1 = await sujet(c);
  v('lien de tâche à froid : la Boîte mail s\'ouvre sur « Facture FA-CDA-10-552 »', /FA-CDA-10-552/.test(s1), s1);
  // b) module monté, une recherche et une catégorie cachent le message : le lien les lève
  await S(c, () => window.R().querySelector('[data-cat=voyages]').click()); await p.waitForTimeout(300);
  await p.locator('#courrier-hote #search').fill('zzz'); await p.waitForTimeout(500);
  await S(c, () => { const b = document.createElement('button'); b.dataset.taller = 'boiteMail|m5'; document.body.appendChild(b); b.click(); b.remove(); }); await p.waitForTimeout(900);
  const s2 = await sujet(c), q = await S(c, () => window.R().querySelector('#search').value);
  v('lien alors qu\'une recherche et une autre catégorie cachaient le message : il s\'ouvre quand même (recherche levée)', /devis climatisation/i.test(s2) && q === '', { s2, q });
  // c) depuis une TÂCHE créée par « En faire une tâche » (le bouton du bandeau) : sa fiche porte le lien « Boîte mail »
  await S(c, () => { courrierAgir('ml:tache|m6', { id:'m6' }); });
  await S(c, () => { const t = TACHES.at(-1); aller('taches'); setTimeout(() => tDetail(t.id), 200); }); await lib.calme(p, 1200);
  const lien = await S(c, () => { const b = document.querySelector('.panneau [data-taller]'); return b ? b.dataset.taller : null; });
  v('la tâche créée depuis un courriel porte un lien « Boîte mail » (population)', lien === 'boiteMail|m6', lien);
  if (lien) { await p.locator('.panneau [data-taller]').first().click(); await p.waitForTimeout(1300);
    const s3 = await sujet(c), attendu = await S(c, () => mlDe('m6').objet);
    v('depuis la tâche : le module ouvre le courriel du lien', s3.indexOf(attendu.slice(0, 20)) >= 0, { s3, attendu }); }
  // d) la fiche d'un client : « Tous ses courriels »
  await S(c, () => aller('client-x-hp')); await lib.calme(p, 900);
  const bouton = await S(c, () => !![...document.querySelectorAll('[data-mbx^="cli|"]')].length);
  v('la fiche du client propose « tous les courriels » (population)', bouton);
  if (bouton) { await p.locator('[data-mbx^="cli|"]').first().click(); await p.waitForTimeout(1500);
    const r = await S(c, () => ({ route, q:window.R().querySelector('#search').value, lignes:window.R().querySelectorAll('.msg').length, mail:CLIENTS.hp.mail }));
    v('depuis la fiche client : la Boîte mail est filtrée sur son adresse et montre ses courriels', r.route === 'boiteMail' && r.q === r.mail && r.lignes >= 1, r); await cap(c, 'liens-fiche-client'); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await fin(c);
  // e) bout en bout : proposer des créneaux, le client répond 4 s plus tard, la notification « Ouvrir » mène à SA réponse
  c = await entrer({ profil:'mac' }); p = c.p;
  await ouvrirMsg(c, 'm1'); await p.locator('#courrier-hote .hband button', { hasText:'Proposer un créneau' }).first().click(); await p.waitForTimeout(700);
  await p.locator('#courrier-hote #cSend').click(); await p.waitForTimeout(6500);   // 5 s d'annulation possible, puis l'envoi
  const nb = await S(c, () => MAILS.filter(m => m.dossier === 'envoye' && /climatisation chambre 214/i.test(m.objet)).length);
  v('l\'envoi des créneaux est parti (un courriel envoyé de plus)', nb === 1, nb);
  await p.waitForTimeout(5200);
  const arrive = await S(c, () => MAILS.some(m => m.cren && m.cren.choix));
  v('le client répond (message de démonstration arrivé 4 s après l\'envoi)', arrive);
  const t = await S(c, () => (document.getElementById('toast') || {}).innerText || '');
  if (/Ouvrir/.test(t)) { await p.locator('#toast button', { hasText:'Ouvrir' }).first().click(); await p.waitForTimeout(1200); const s4 = await sujet(c);
    v('la notification « Ouvrir » mène à la réponse du client', /Re: Climatisation chambre 214/.test(s4), s4); } else v('la notification du client porte un bouton « Ouvrir »', false, t);
  await fin(c);
  await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });
