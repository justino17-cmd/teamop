// Angle « courrier » · sonde 4 : À QUI L'APPLICATION FAIT CONFIANCE DANS UN COURRIEL. Le bandeau « OP GESTION a reconnu » propose des gestes qui
// TOUCHENT À L'ARGENT ET AUX DOCUMENTS (noter l'accord d'un devis, noter un paiement annoncé, ranger une pièce dans la fiche d'un client) à partir
// de ce que le courriel DIT (un numéro de devis ou de facture écrit dans le texte), sans regarder QUI l'écrit :
//   · un INCONNU qui cite « D-2026-… » et « validé » → « Noter l'accord du devis » (le devis passe « accepté », une intervention naît, l'acompte part) ;
//   · un INCONNU qui cite « FAC-… » et « virement » → « Noter le paiement annoncé » / « enregistrer le paiement » ;
//   · aucune information d'authenticité (SPF, DKIM, DMARC) n'existe dans le contrat de la source : un expéditeur FALSIFIÉ (l'adresse d'un vrai client) passe pour lui.
// Les numéros se devinent (séquentiels : D-2026-031 → 030, 029…). On rejoue chaque geste et on relit l'état.
// ⛔ 127.0.0.1, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), fs = require('fs');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/courrier/';
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot";
  const prep = await p.evaluate(() => { const dv = DV.find(o => o.e === 'envoye' || o.e === 'attente' || (o.e !== 'accepte' && o.e !== 'refuse' && o.e !== 'brouillon')) || DV[0], fac = FACTURES.find(f => f.num !== '—' && f.st !== 'payee' && f.st !== 'brouillon');
    MAILS.push(mlM('cE1', AUJ, '12:10', { nom: 'Jean Dupond', mail: 'inconnu@exemple.fr' }, 'Re: devis ' + dv.num, 'Bonjour, nous validons votre devis ' + dv.num + '. Vous pouvez planifier l’installation.'));
    MAILS.push(mlM('cE2', AUJ, '12:11', { nom: 'Compta Exemple', mail: 'compta@exemple.fr' }, 'Virement ' + fac.num, 'Bonjour, nous avons effectué le virement de ' + fac.num + ' ce matin.'));
    // un courriel écrit AU NOM d'un vrai client (adresse falsifiée : rien, dans le contrat de la source, ne permet de le dire)
    MAILS.push(mlM('cE3', AUJ, '12:12', { nom: CLIENTS[fac.cli].contact || CLIENTS[fac.cli].nom, mail: CLIENTS[fac.cli].mail }, 'Re: ' + fac.num, 'Le virement de ' + fac.num + ' est parti, merci de noter le paiement.'));
    return { dv: dv.num, dvId: dv.id, fac: fac.num, facId: fac.id, cliFac: fac.cli, intAvant: INTS.length, tachesAvant: TACHES.length }; });
  console.log('  ·', JSON.stringify(prep));
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await p.waitForTimeout(600);
  await p.evaluate(() => COURRIER.inst.rafraichir()); await p.waitForTimeout(800);
  const gestes = async id => { await p.evaluate(i => COURRIER.inst.ouvrir(i), id); await p.waitForTimeout(600);
    return p.evaluate(`(() => { const s = ${SR}, h = s.querySelector('.hband'); return h ? { kicker: (h.querySelector('.ht') || {}).textContent, boutons: [...h.querySelectorAll('[data-hote]')].map(b => b.getAttribute('data-hote') + '¦' + b.textContent.trim()), pastille: ((s.querySelector('.msg.sel .hpast, .msg[aria-selected="true"] .hpast') || {}).textContent) || '' } : null; })()`); };
  const clic = async (id, hid) => { await p.evaluate(i => COURRIER.inst.ouvrir(i), id); await p.waitForTimeout(500); const r = await p.evaluate(`(() => { const b = ${SR}.querySelector('.hband [data-hote="' + ${JSON.stringify(hid)} + '"]'); if (!b) return false; b.click(); return true; })()`); await p.waitForTimeout(700); return r; };
  // 1. un INCONNU valide un devis
  const g1 = await gestes('cE1'); console.log('  · inconnu + numéro de devis :', JSON.stringify(g1).slice(0, 400));
  L.v('population : le courriel d\'un inconnu est bien reconnu comme « Nouveau contact » (il n\'est ni client ni fournisseur)', await p.evaluate(() => mlLire(mlDe('cE1')).qui === 'nouveau'), g1);
  const offre = !!g1 && g1.boutons.some(b => /accord/i.test(b.split('¦')[1]));
  L.v('1. un INCONNU qui cite le numéro d\'un devis et dit « validons » ne se voit PAS proposer « Noter l\'accord du devis »', !offre, g1 && g1.boutons.map(b => b.split('¦')[1]));
  const av = await p.evaluate(id => { const d = DV.find(o => o.num === id); return { e: d.e, par: d.signePar }; }, prep.dv);
  await clic('cE1', 'ml:accord|cE1');
  const ap = await p.evaluate(id => { const d = DV.find(o => o.num === id); return { e: d.e, par: d.signePar, ints: INTS.length, taches: TACHES.length }; }, prep.dv);
  console.log('  · devis', prep.dv, ':', JSON.stringify(av), '→', JSON.stringify(ap), '· interventions', prep.intAvant, '→', ap.ints);
  L.v('1b. le devis ' + prep.dv + ' ne passe pas « accepté » sur la parole d\'un inconnu (état : ' + av.e + ' → ' + ap.e + ', « signé par » : ' + ap.par + ')', ap.e === av.e, { av, ap });
  L.v('1c. ni une intervention ni des tâches ne naissent de cette acceptation (interventions ' + prep.intAvant + ' → ' + ap.ints + ')', ap.ints === prep.intAvant, { ints: ap.ints });
  // 2. un INCONNU annonce un virement
  const g2 = await gestes('cE2'); console.log('  · inconnu + numéro de facture :', JSON.stringify(g2).slice(0, 400));
  const offre2 = !!g2 && g2.boutons.some(b => /paiement/i.test(b.split('¦')[1]));
  L.v('2. un INCONNU qui cite le numéro d\'une facture et parle de virement ne se voit PAS proposer « Noter le paiement annoncé » / « enregistrer le paiement »', !offre2, g2 && g2.boutons.map(b => b.split('¦')[1]));
  await clic('cE2', 'mbx:annonce|cE2');
  const an = await p.evaluate(id => { const f = FACTURES.find(o => o.id === id); return f.annonce ? JSON.stringify(f.annonce).slice(0, 80) : null; }, prep.facId);
  L.v('2b. la facture ' + prep.fac + ' ne reçoit pas de « paiement annoncé » sur la parole d\'un inconnu (annonce : ' + an + ')', an === null, an);
  // 3. un courriel AU NOM d'un vrai client : aucune information d'authenticité n'existe
  const g3 = await gestes('cE3'); console.log('  · au nom du client :', JSON.stringify(g3).slice(0, 300));
  const SOURCE = fs.readFileSync(require('path').join(L.RACINE, 'apercu', 'prototype-courrier.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const sansAuth = !/spf|dkim|dmarc|authentication-results|authentifi/i.test(SOURCE.replace(/rapport DMARC[^\n]*/g, ''));
  L.v('population : le courriel piégé au nom d\'un client est reconnu « Client » par l\'application (pastille/bandeau)', !!g3 && /client|facture/i.test(JSON.stringify(g3)), g3);
  L.v('3. le module sait dire qu\'un expéditeur n\'est pas authentifié (SPF / DKIM / DMARC lus par la source) : aucun champ de ce genre dans le contrat ni dans l\'affichage', !sansAuth, 'aucune occurrence de spf/dkim/dmarc/authentication-results dans le module');
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  await p.screenshot({ path: CAP + 'confiance-mac.png' }).catch(() => {});
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
