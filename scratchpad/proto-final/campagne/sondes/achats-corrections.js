// Les corrections de la campagne « achats » (17 novembre 2026), jouées comme une personne : une ligne par défaut corrigé.
// Usage : node achats-corrections.js [profil=mac] [nuit]   (le même script sur ordinateur et téléphone ; les contrôles propres à un format se disent)
const { L, ouvrirAchats, toast, panneau, txt, CAP } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tel = ['iphone', 'android', 'petit'].includes(profil);
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const cap = async n => { await E(n => { const t = document.getElementById('toast'); if (t) t.classList.remove('on'); const z = document.querySelector(n.startsWith('03') ? '.tt-paie' : n.startsWith('12') ? '[data-axid="da1"]' : null); if (z) z.scrollIntoView({ block: 'center' }); }, n); await L.calme(p, 350); return L.capture(c, CAP + 'corr-' + n + '-' + profil + (nuit ? '-nuit' : '') + '.png'); };
  const n0 = () => E(() => DEM_ACHAT.length);
  // ── achats-01 : la virgule d'une quantité ne s'avale jamais ; une valeur illisible est refusée avec une phrase
  const ouvrir = async () => { await E(() => { try { fermerPanneau(); } catch (e) {} acOnglet = 'demandes'; }); await L.aller(p, 'achats'); await L.toucher(c, '[data-axa="dem"]'); await L.calme(p, 300); };
  const taper = async (q, n, u) => { await p.fill('#ax-q', q); await p.fill('#ax-n', n); if (u) await E(u => { document.getElementById('ax-u').value = u; }, u); };
  const envoyer = async () => { await L.toucher(c, '[data-axa^="demok"]'); await L.calme(p, 350); };
  await ouvrir();
  const champ = await E(() => { const e = document.getElementById('ax-n'); return { type: e.type, mode: e.inputMode }; });
  v('01-0 le champ « Combien ? » n’est plus un champ numérique (qui avale la virgule) et ouvre le clavier décimal', champ.type === 'text' && champ.mode === 'decimal', champ);
  for (const [txtq, attendu] of [['1,5', 1.5], ['2,25', 2.25], ['12,5', 12.5], ['1.5', 1.5], ['1 234,5', 1234.5]]) {
    await ouvrir(); await taper('Fluide R32', txtq, 'kg'); const av = await n0(); await envoyer(); if (attendu > 500) await envoyer();   // au-delà de 500, « Vraiment … ? » demande un second toucher
    const d = await E(() => DEM_ACHAT[0]); const ap = await n0();
    v('01-1 « ' + txtq + ' » devient ' + attendu + ' (et non ' + txtq.replace(/[,. ]/g, '') + ')', ap === av + 1 && d.q === attendu, { av, ap, q: d.q });
    await E(() => { try { fermerPanneau(); } catch (e) {} });
  }
  for (const [mauvais, motif] of [['douze', /chiffres/], ['1.500', /pas clair/], ['0', /plus grand que zéro/], ['', /Indique combien/], ['-3', /chiffres/], ['1,2,3', /chiffres/]]) {
    await ouvrir(); await taper('Gants', mauvais, 'kg'); const av = await n0(); await envoyer(); const ap = await n0(), t = await toast(p), ouvert = /Demande d’achat|Nouvelle demande/.test(await panneau(p));
    v('01-2 « ' + mauvais + ' » est refusé avec une phrase, rien n’est envoyé', ap === av && ouvert && motif.test(t), { av, ap, t });
  }
  await ouvrir(); await taper('Gants', '2,5', 'paire'); { const av = await n0(); await envoyer(); const t = await toast(p); v('01-3 « 2,5 » en paires : la phrase parle en nombre entier, avec une virgule (« 2,5 »)', av === await n0() && /nombre entier/.test(t) && /2,5/.test(t), t); }
  // la modification d'une demande en attente remontre sa quantité avec la virgule
  await E(() => { try { fermerPanneau(); } catch (e) {} DEM_ACHAT.find(d => d.id === 'da1').q = 1.5; acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  await E(() => axDemForm(DEM_ACHAT.find(d => d.id === 'da1'))); await L.calme(p, 300);
  v('01-4 la fenêtre « Modifier la demande » remontre « 1,5 » (pas « 1.5 »)', await E(() => document.getElementById('ax-n').value) === '1,5');
  await E(() => { try { fermerPanneau(); } catch (e) {} DEM_ACHAT.find(d => d.id === 'da1').q = 10; });
  // ── achats-12 : les grandes quantités ont leurs espaces
  await E(() => { DEM_ACHAT.find(d => d.id === 'da1').q = 1523.5; DEM_ACHAT.find(d => d.id === 'da1').est = 12345.67; acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const carte = await txt(p, '[data-axid="da1"]'), esti = await E(() => document.querySelector('[data-axest="da1"]').value);
  v('12-1 « 1 523,5 kg » s’écrit avec son espace (titre de la carte et bouton)', /1 ? ?523,5 kg|1[   ]523,5 kg/.test(carte) && !/1523,5/.test(carte), carte.slice(0, 200));
  v('12-2 l’estimation « 12 345,67 » aussi', /^12[   ]345,67$/.test(esti), esti);
  await cap('12-grande-quantite');
  await E(() => { DEM_ACHAT.find(d => d.id === 'da1').q = 10; DEM_ACHAT.find(d => d.id === 'da1').est = 380; });
  // ── achats-04 / 07 / 08 / 09 / 10 : les mots
  await L.aller(p, 'achats'); const page = await txt(p);
  v('04 un bouton dit « Accepter » (pas « Achat en magasin »)', /Accepter : \S+ l’achète en magasin/.test(page) && !/Achat en magasin/.test(page), page.slice(page.indexOf('Accepter') - 20, page.indexOf('Accepter') + 60));
  const g = await E(() => { const e = document.querySelector('.ach-cpt-t'); if (!e) return null; const cs = getComputedStyle(e), l = getComputedStyle(document.querySelector('.ach-aide')); return { c: cs.color, lien: l.color, t: cs.textTransform, f: cs.fontSize }; });
  v('07 le titre « Ça se règle dans la Comptabilité » n’a pas la couleur des liens, et se lit comme un titre de groupe', !!g && g.c !== g.lien && g.t === 'uppercase', g);
  const ouvertNouvelle = async () => { await L.toucher(c, '[data-axa="dem"]'); await L.calme(p, 300); return panneau(p); };
  const pn = await ouvertNouvelle(); v('09 la fenêtre du gérant s’appelle « Nouvelle demande d’achat » et dit à quoi elle sert', /Nouvelle demande d’achat/.test(pn) && /Note ce que quelqu’un de l’équipe/.test(pn), pn.slice(0, 160)); await E(() => fermerPanneau());
  v('10-1 un seul mot : « sans justificatif » sur le lien, pas « sans facture »', /sans justificatif/.test(page) && !/sans facture/.test(page));
  const n10 = await E(() => [axSansJustif(), cxDocs().filter(x => x.fam === 'achats' && x.src === 'ndf' && !x.piece).length]);
  v('10-2 une note de frais encore à valider (sans ticket) ne compte pas parmi les achats sans justificatif', n10[1] >= 1 && n10[0] === await E(() => ACHATS.filter(a => !a.piece || (!!a.tva && a.piece !== 'facture')).length), n10);
  await L.toucher(c, '[data-cx="sec|factures|achats|sanspiece"]'); await L.calme(p, 600);
  const lst = await txt(p, '#cx-liste'), chip = await txt(p, '#contenu');
  v('10-3 la liste où mène le lien ne contient aucune note de frais, ses puces disent « Sans justificatif »', !/Note de frais/.test(lst) && /Sans justificatif/.test(chip) && !/Sans facture/.test(chip) && !/sans facture/.test(lst), lst.slice(0, 120));
  // ── achats-08 / 02 / 11 : les notes
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats');
  if (tel) {
    const r = await E(() => { const z = document.querySelector('.ach-regl'), b = document.querySelector('.ach-regl-b'); return { zone: z && z.offsetParent !== null, bouton: b && b.offsetParent !== null }; });
    v('05-3 (téléphone) les réglages des notes sont derrière « Réglages › »', !r.zone && r.bouton, r);
    await cap('05-notes'); await L.toucher(c, '[data-axa="reglages"]'); await L.calme(p, 300); await cap('05-reglages');
  }
  const reg = tel ? await panneau(p) : await txt(p);
  v('08 « 0,60 € le km (à régler avec ton expert-comptable : le barème dépend de la puissance du véhicule) », plus de « démonstration »', /à régler avec ton expert-comptable : le barème dépend de la puissance du véhicule/.test(reg) && !/démonstration/i.test(reg), reg.slice(reg.indexOf('Kilomètres'), reg.indexOf('Kilomètres') + 140));
  if (tel) await E(() => fermerPanneau());
  const nt = await txt(p);
  v('02 « Ajouté à la paie du mois (Temps de travail › Mois) » : plus d’« export de paie » ni d’onglet Paie', /Ajouté à la paie du mois \(Temps de travail › Mois\)/.test(nt) && !/export de paie|Temps de travail → Paie/.test(nt), nt.slice(nt.indexOf('Ajouté'), nt.indexOf('Ajouté') + 120));
  // ── achats-03 : la paie du mois dit les frais qu'elle emporte
  await L.toucher(c, '[data-ac="ndfok|n1"]'); await L.calme(p, 500);   // Tom : 16,50 € validé, comme Karim 14,90 €
  await E(() => { ptOnglet = 'mois'; TT.garder = true; }); await L.aller(p, 'pointage');
  const paie = await txt(p, '.tt-paie');
  v('03-1 « La paie » porte UNE ligne « Frais à rembourser avec cette paie : Tom 16,50 € · Karim 14,90 € — hors salaire »', /Frais à rembourser avec cette paie : (Tom 16,50\s€ · Karim 14,90\s€|Karim 14,90\s€ · Tom 16,50\s€) — hors salaire/.test(paie.replace(/[  ]/g, ' ').replace(/ €/g, ' €')) && (paie.match(/Frais à rembourser/g) || []).length === 1, paie.slice(0, 260));
  const somme = await E(() => PT_GENS.map(paieVariables).reduce((s, x) => s + x.frais, 0));
  v('03-2 les chiffres viennent du relevé de chaque personne (somme des frais = 31,40 €)', Math.abs(somme - 31.4) < .005, somme);
  await cap('03-paie-frais');
  await L.toucher(c, '.tt-paie [data-ac="allernotes"]'); await L.calme(p, 500);
  v('03-3 « Voir les notes › » mène aux notes de frais', /Achats et frais/.test(await txt(p, 'h1')) && await E(() => acOnglet) === 'notes', await E(() => [acOnglet, location.hash]));
  // ── achats-11 : le montant d'une note
  await E(() => { try { fermerPanneau(); } catch (e) {} ROLE_TECH_SIM = 0; });
  // ── achats-05 : la disposition du téléphone
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  const lay = await E(() => { const vis = e => e && e.offsetParent !== null && e.getBoundingClientRect().height > 0, k = document.querySelector('.ach-k2'), cartes = [...document.querySelectorAll('.ach-d')], cpt = document.querySelector('.ach-compta'), dernier = cartes[cartes.length - 1];
    return { tuiles: vis(k), h: innerHeight, premiereCarte: cartes[0] ? Math.round(cartes[0].getBoundingClientRect().top + scrollY) : null, compta: cpt ? Math.round(cpt.getBoundingClientRect().top + scrollY) : null, finListe: dernier ? Math.round(dernier.getBoundingClientRect().bottom + scrollY) : null }; });
  if (tel) {
    v('05-1 (téléphone) plus de tuiles qui répètent les chiffres des onglets', !lay.tuiles, lay);
    v('05-2 (téléphone) la première demande à décider se voit sans défiler, « Ça se règle dans la Comptabilité » est sous la liste', lay.premiereCarte < lay.h - 80 && lay.compta > lay.finListe, lay);
  } else {
    v('05-4 (ordinateur) rien ne change : les deux tuiles sont là, les réglages sont sur la page', lay.tuiles && lay.compta < lay.premiereCarte, lay);
  }
  await cap('05-achats');
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
