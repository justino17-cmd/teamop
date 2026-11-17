// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), faille S05 : « un inconnu qui cite un numéro de devis ou de facture ne se voit
// pas proposer les gestes d'argent ». L'audit a posé : un devis ou une facture ne se rattache à un courriel que si l'expéditeur est le CLIENT de ce document
// (égalité d'adresse, en minuscules). Variantes que l'audit n'a pas jouées :
//   1. un expéditeur SANS adresse (en-tête From réduit au nom : « mail » vide) — il est égal à l'adresse VIDE de tout client ou fournisseur qui n'en a pas ;
//   2. l'adresse du vrai client avec une majuscule, un espace, une balise « +suite » (la vraie personne, ou un usurpateur qui la copie) ;
//   3. le NOM du client écrit comme nom d'affichage, l'adresse étant celle de l'attaquant ;
//   4. un fournisseur connu qui cite le bon de commande d'un AUTRE fournisseur (la commande n'est pas rattachée à son fournisseur) ;
//   5. un courriel sans champ « mail » du tout (l'application plante-t-elle, au point de masquer toute la boîte ?).
// La sonde lit ce que l'application reconnaît (mlLire) ET ce que le bandeau propose (les vrais boutons, dans l'arbre d'ombre du module de courrier).
// Témoins : le vrai client, à son adresse exacte, a bien ses gestes (sinon « rien ne se rattache » ne prouverait rien). Un ✗ = une variante qui passe.
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot";
  const D = await p.evaluate(() => { dvInit();
    const k = Object.keys(CLIENTS).find(x => CLIENTS[x].mail && DV.some(d => d.cli === x && d.num && d.e !== 'accepte') && FACTURES.some(f => f.cli === x && f.num !== '—' && f.st !== 'payee')) || Object.keys(CLIENTS).find(x => CLIENTS[x].mail);
    const dv = DV.find(d => d.cli === k && d.num && d.e !== 'accepte') || DV.find(d => d.num && d.e !== 'accepte'), fac = FACTURES.find(f => f.cli === k && f.num !== '—' && f.st !== 'payee') || FACTURES.find(f => f.num !== '—' && f.st !== 'payee');
    const sansMail = Object.keys(CLIENTS).filter(x => !(CLIENTS[x].mail || '').trim()), fournSans = MES_FOURN.filter(f => !(f.mail || '').trim()).map(f => f.nom);
    const four = MES_FOURN.find(f => (f.mail || '').trim()), cmd = COMMANDES.find(x => x.num), cmdAutre = four && COMMANDES.find(x => x.num && x.four && four.nom && String(x.four).toLowerCase() !== String(four.nom).toLowerCase());
    return { k, mail: CLIENTS[k].mail, nom: CLIENTS[k].nom, dv: dv && dv.num, fac: fac && fac.num, sansMail, fournSans, four: four && { nom: four.nom, mail: four.mail }, cmdAutre: cmdAutre && cmdAutre.num, nClients: Object.keys(CLIENTS).length }; });
  console.log('  · client de référence :', D.k, D.mail, '· devis', D.dv, '· facture', D.fac, '· clients sans adresse :', D.sansMail.length, '· fournisseurs sans adresse :', D.fournSans.length);
  L.v('population : un client avec adresse, un devis à accepter et une facture à régler existent', !!D.mail && !!D.dv && !!D.fac, D);
  // ═══ 1 à 4 : ce que l'application RECONNAÎT ═══
  const cas = [
    ['adresse vide (« From » sans adresse)', { nom: 'Quelqu\'un', mail: '' }], ['adresse vide, nom = celui du client', { nom: D.nom, mail: '' }],
    ['adresse du client en MAJUSCULES (témoin : même personne)', { nom: 'X', mail: String(D.mail).toUpperCase() }],
    ['adresse du client suivie d\'une espace', { nom: 'X', mail: D.mail + ' ' }], ['adresse du client avec +suite', { nom: 'X', mail: String(D.mail).replace('@', '+x@') }],
    ['nom d\'affichage = nom du client, adresse = attaquant', { nom: D.nom, mail: 'pirate@exemple.fr' }], ['adresse du client dans le nom d\'affichage', { nom: D.mail, mail: 'pirate@exemple.fr' }],
    ['adresse = attaquant (témoin : le cas que l\'audit a fermé)', { nom: 'Pirate', mail: 'pirate@exemple.fr' }], ['le vrai client, à son adresse exacte (témoin positif)', { nom: 'Le client', mail: D.mail }],
  ];
  const res = await p.evaluate(({ cas, dv, fac }) => cas.map(([lib, de], i) => { const m = mlM('rc' + i, AUJ, '12:0' + (i % 10), de, 'Re: Devis ' + dv + ' et facture ' + fac, 'Nous validons le devis ' + dv + '. Virement effectué pour la facture ' + fac + '.', {}); MAILS.push(m);
    try { const R = mlLire(m); return { lib, qui: R.qui, sujet: R.sujet || null, devis: !!R.devis, facture: !!R.facture, cli: R.cli || null }; } catch (e) { return { lib, erreur: e.message.slice(0, 80) }; } }), { cas, dv: D.dv, fac: D.fac });
  res.forEach(r => console.log('  ·', r.lib.padEnd(62), '→', JSON.stringify({ ...r, lib: undefined })));
  L.v('population : les neuf courriels ont été lus par l\'application (aucune exception)', res.every(r => !r.erreur), res.filter(r => r.erreur));
  const t = n => res.find(r => r.lib.startsWith(n));
  L.v('témoin : le vrai client, à son adresse exacte, a son devis et sa facture reconnus (sinon la garde refuserait tout)', t('le vrai client').devis && t('le vrai client').facture, t('le vrai client'));
  L.v('témoin : l\'adresse de l\'attaquant n\'est reconnue pour AUCUN document (le cas fermé par l\'audit tient)', !t('adresse = attaquant').devis && !t('adresse = attaquant').facture, t('adresse = attaquant'));
  L.v('1. un expéditeur SANS adresse ne se voit rattacher aucun devis ni facture (même si un client sans adresse existe : ' + D.sansMail.length + ')', !t('adresse vide (').devis && !t('adresse vide (').facture && !t('adresse vide, nom').devis && !t('adresse vide, nom').facture, [t('adresse vide ('), t('adresse vide, nom')]);
  L.v('2. l\'adresse du client avec une espace ou un « +suite » n\'est pas reconnue (pas d\'usurpation par variante) — une majuscule, si : c\'est la même adresse', !t('adresse du client suivie').devis && !t('adresse du client avec +').devis, [t('adresse du client suivie'), t('adresse du client avec +')]);
  L.v('3. le NOM d\'affichage du client, avec une autre adresse, ne rattache rien', !t('nom d\'affichage').devis && !t('nom d\'affichage').facture && !t('adresse du client dans le nom').devis, [t('nom d\'affichage'), t('adresse du client dans le nom')]);
  // ═══ le bandeau : les vrais boutons, pour l'expéditeur SANS adresse ═══
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await att(700); await p.evaluate(() => COURRIER.inst.rafraichir()); await att(900);
  const bandeau = async id => { await p.evaluate(i => COURRIER.inst.ouvrir(i), id); await att(650); return p.evaluate(`[...${SR}.querySelectorAll('.hband [data-hote]')].map(b => b.textContent.trim().slice(0, 60))`); };
  const bVide = await bandeau('rc0'), bClient = await bandeau('rc8');
  console.log('  · gestes offerts à l\'expéditeur sans adresse :', JSON.stringify(bVide));
  console.log('  · gestes offerts au vrai client :', JSON.stringify(bClient));
  L.v('témoin (population) : le vrai client se voit proposer « Noter l\'accord du devis » ou « Noter le paiement annoncé »', bClient.some(x => /accord du devis|paiement annoncé|enregistrer le paiement/i.test(x)), bClient);
  L.v('l\'expéditeur sans adresse ne se voit proposer AUCUN geste d\'argent (accord du devis, paiement annoncé, enregistrer le paiement)', !bVide.some(x => /accord du devis|paiement annoncé|enregistrer le paiement|Planifier l.installation/i.test(x)), bVide);
  // ═══ 4. un fournisseur connu qui cite le bon de commande d'un autre fournisseur ═══
  if (D.four && D.cmdAutre) {
    const r4 = await p.evaluate(({ four, bc }) => { const m = mlM('rcf', AUJ, '12:30', { nom: four.nom, mail: four.mail }, 'Commande ' + bc + ' expédiée', 'Votre commande ' + bc + ' est expédiée, livraison demain.', {}); MAILS.push(m); const R = mlLire(m); return { qui: R.qui, sujet: R.sujet || null, cmd: R.cmd ? R.cmd.num : null, cmdFour: R.cmd ? (R.cmd.four || R.cmd.fournisseur || null) : null }; }, { four: D.four, bc: D.cmdAutre });
    console.log('  · fournisseur « ' + D.four.nom + ' » citant la commande ' + D.cmdAutre + ' (d\'un autre fournisseur) :', JSON.stringify(r4));
    L.v('4. un fournisseur ne se voit pas rattacher la commande d\'un AUTRE fournisseur (« Mettre à jour la livraison »)', !r4.cmd, r4);
  } else console.log('  · 4. non jouable : pas de commande d\'un autre fournisseur dans la démonstration', JSON.stringify({ four: D.four, cmdAutre: D.cmdAutre }));
  // ═══ 5. un courriel SANS champ « mail » : l'application plante-t-elle ? ═══
  const r5 = await p.evaluate(async () => { const err = []; const h = e => { if (!/ResizeObserver/.test(e.message)) err.push(e.message); };   /* le bruit connu du navigateur ne compte pas (les autres sondes le filtrent aussi) */ window.addEventListener('error', h);
    let lu = 'ok'; try { const m = mlM('rcn', AUJ, '12:40', { nom: 'Sans adresse' }, 'Bonjour', 'Un message sans en-tête d\'adresse.', {}); MAILS.push(m); mlLire(m); } catch (e) { lu = 'exception : ' + e.message.slice(0, 80); }
    let rendu = 'ok'; try { aller('accueil'); await new Promise(r => setTimeout(r, 500)); aller('boiteMail'); await new Promise(r => setTimeout(r, 900)); COURRIER.inst.rafraichir(); await new Promise(r => setTimeout(r, 600)); } catch (e) { rendu = 'exception : ' + e.message.slice(0, 80); }
    window.removeEventListener('error', h); return { lu, rendu, err: err.slice(0, 3), nContenu: (document.getElementById('contenu') || {}).innerText ? document.getElementById('contenu').innerText.length : 0 }; });
  console.log('  · courriel sans champ « mail » :', JSON.stringify(r5));
  L.v('5. un courriel sans champ « mail » ne fait pas planter la lecture de la boîte (mlLire) ni son affichage', r5.lu === 'ok' && r5.rendu === 'ok' && r5.err.length === 0, r5);
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); console.log('  · erreurs de page :', nErr.length, nErr.slice(0, 3));
  fs.writeFileSync(SORTIE + 'confiance.json', JSON.stringify({ D, res, bVide, bClient, r5 }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
