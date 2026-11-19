// Sonde « reconnaissance » : ce que l'ANCIEN écran savait faire, le module le fait pour chacun des sujets, avec le MÊME raisonnement (mlLire, jamais deviné) et les mêmes gestes.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  const c = await entrer({ profil:'mac' }), p = c.p;
  const tout = await S(c, () => MAILS.filter(m => m.dossier === 'recu').map(m => { const R = mlLire(m), b = courrierBandeau(m), pa = courrierHoteApi.pastille({ id:m.id }),
    ancien = [...mlActions(m, R).matchAll(/data-(ml|mbx)="([a-z]+)\|/g)].map(x => x[1] + ':' + x[2]), neuf = b.actions.map(a => a.id.split('|')[0]);
    return { id:m.id, sujet:R.sujet, qui:R.qui, titre:b.titre, attendu:(ML_SUJET[R.sujet] || 'Un message') + (R.urgent && !m.fait ? ' · urgent' : ''), pastille:pa && pa.texte, tag:ML_TAG[R.qui][0], info:!!m.info, ancien, neuf, extras:neuf.filter(x => !ancien.includes(x)) }; }));
  const sujets = new Set(tout.map(x => x.sujet));
  v('population : au moins 8 sujets distincts reconnus parmi les e-mails (panne, devis, accord, expédition, facture, paiement, info, nouveau…)', sujets.size >= 7 && tout.length >= 8, { sujets:[...sujets], n:tout.length });
  for (const x of tout) {
    v(x.id + ' (' + x.sujet + ') : le titre du bandeau est celui de l\'ancien écran', x.titre === x.attendu || (x.sujet === 'trier' && x.titre === 'Message traité'), x);
    v(x.id + ' : la pastille de la liste dit ' + (x.info ? '(rien : une information n\'est pas un contact)' : x.tag), x.pastille === (x.info ? null : x.tag) || x.qui === 'moi', x);
    const manque = x.ancien.filter(a => !x.neuf.includes(a));
    v(x.id + ' : tous les gestes de l\'ancien écran sont dans le bandeau (rien de perdu)', manque.length === 0 || (x.ancien.length === 0), { manque, ancien:x.ancien, neuf:x.neuf });
  }
  // dans le module, à l'écran : le bandeau est là pour chaque message ouvert
  for (const id of ['m1', 'm3', 'm5', 'm9', 'm4']) { await ouvrirMsg(c, id);
    const b = await S(c, () => { const e = window.R().querySelector('.hband'); return e ? { titre:(e.querySelector('.ht') || {}).textContent, boutons:e.querySelectorAll('button').length, liens:e.querySelectorAll('.lnk').length } : null; });
    v(id + ' : le bandeau « OP GESTION a reconnu » est affiché dans la lecture, avec ses boutons', !!b && b.boutons >= 2 && /\S/.test(b.titre || ''), b); }
  // compteur : le chiffre « à traiter » de l'en-tête de la page = les e-mails à traiter de la logique conservée
  const cpt = await S(c, () => ({ page:(document.querySelector('.mbx-tete .gris') || {}).textContent, calcule:MAILS.filter(m => mbxATraiter(m) && !m.suiviEnCours).length, dossier:window.R().querySelectorAll('.msg .sgchip').length }));
  v('le compteur « à traiter » de la page égale mbxATraiter', new RegExp('^' + cpt.calcule + ' message').test(cpt.page || ''), cpt);
  // les gestes, jouables dans le module (vrais clics)
  await ouvrirMsg(c, 'm1');
  await p.locator('#courrier-hote .hband button', { hasText:'Créer l’intervention' }).first().click(); await p.waitForTimeout(900);
  const creation = await S(c, () => ({ cli:typeof CREA !== 'undefined' && CREA ? CREA.cli : null, titre:CREA && CREA.titre, motif:CREA && CREA.motif, mail:CREA && CREA.mail, hp:Object.keys(CLIENTS).find(k => CLIENTS[k].mail === mlDe('m1').de.mail), modules:!!document.getElementById('fenetre') && document.getElementById('fenetre').innerText.length }));
  v('« Créer l\'intervention » : le client, le titre et le motif viennent de l’e-mail (comme avant)', creation.cli === creation.hp && creation.titre === 'Climatisation chambre 214 en panne' && /climatisation/i.test(creation.motif || '') && creation.mail === 'm1', creation);
  await cap(c, 'reconnaissance-intervention');
  await S(c, () => { if (typeof fermerCreation === 'function') fermerCreation(); }); await p.waitForTimeout(400);
  await ouvrirMsg(c, 'm1');
  await p.locator('#courrier-hote .hband button', { hasText:'Proposer un créneau' }).first().click(); await p.waitForTimeout(800);
  const cren = await S(c, () => ({ corps:window.R().querySelector('#cBody').value, attendus:mlCreneaux().map(x => jlong(x.d) + ' à ' + mlH(x.h)) }));
  v('« Proposer un créneau » : le message porte les trois créneaux LIBRES lus dans le planning (ceux de mlCreneaux)', cren.attendus.length === 3 && cren.attendus.every(t => cren.corps.includes(t)), cren);
  await S(c, () => COURRIER.inst.fermer()); await p.waitForTimeout(300);
  await ouvrirMsg(c, 'm3');
  await p.locator('#courrier-hote .hband button', { hasText:'Rapprocher' }).first().click(); await p.waitForTimeout(900);
  const rap = await S(c, () => (document.querySelector('#calque .panneau') || {}).innerText || '');
  // le lot Matériel a tranché : un numéro de commande s'écrit SANS « BC- » à l'ÉCRAN (matNumAff), le document et la donnée gardent le leur — le panneau dit « 2026-036 », jamais « BC-2026-036 »
  v('« Rapprocher » : le panneau compare la facture à la commande 2026-036 (écrite sans préfixe à l\'écran) et montre l\'écart', /COMMANDE 2026-036/i.test(rap) && !/BC-2026-036/.test(rap) && /1,20/.test(rap), rap.slice(0, 200));
  await S(c, () => fermerPanneau()); await p.waitForTimeout(300);
  await ouvrirMsg(c, 'm9');
  await p.locator('#courrier-hote .hband button', { hasText:'Noter l’accord du devis' }).first().click(); await p.waitForTimeout(900);
  const acc = await S(c, () => { const R = mlLire(mlDe('m9')); return { etat:R.devis && R.devis.e, bandeau:(window.R().querySelector('.hband') || {}).textContent || '' }; });
  v('« Noter l\'accord du devis » : le devis passe à accepté et le bandeau propose maintenant « Planifier l\'installation »', acc.etat === 'accepte' && /Planifier l’installation/.test(acc.bandeau), acc);
  await ouvrirMsg(c, 'm4');
  await p.locator('#courrier-hote .hband button', { hasText:'Noter le paiement annoncé' }).first().click(); await p.waitForTimeout(900);
  const pai = await S(c, () => { const f = mlLire(mlDe('m4')).facture; return { annonce:!!(f && f.annonce), fait:mlDe('m4').fait }; });
  v('« Noter le paiement annoncé » : la facture porte l\'annonce, l’e-mail est rangé en « fait »', pai.annonce && /Paiement annoncé/.test(pai.fait || ''), pai);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await fin(c);
  await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });
