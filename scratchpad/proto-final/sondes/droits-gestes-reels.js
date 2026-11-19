// Des gestes RÉELS, de bout en bout : pour chaque geste, la personne qui a la case le fait (la donnée ou l'écran CHANGE), celle à qui la seule case manque ne le fait pas (rien ne bouge, le compteur
// de refus monte de 1, le message dit QUOI et à QUI demander). On mesure l'effet, jamais le texte du code. Une personne « complète » (toutes les cases sauf administrateur) prouve le chemin d'une personne
// qui n'est pas le gérant. ⛔ 127.0.0.1 seulement. Population comptée : nombre de gestes joués dans chaque sens.
const { L, v, ouvrirComme, toast, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
const TOUT = Object.fromEntries(CATS.map(c => [c, '1111'])), SP = { tout:1, prix:1, atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 };
// geste : { n, mot (ce que le refus dit), sans:{cases ou sp à retirer}, route, mesure (dans la page), jouer (dans la page, rend void) }
const PANNEAU = '!!document.querySelector("#calque .panneau")';
const G = [
  { n:'créer un client', sans:{ cases:{ crm:'1011' } }, mot:'créer un client', route:'clients', mesure:PANNEAU, jouer:'clic("data-action","clientNouveau")' },
  { n:'faire une demande d’achat', sans:{ cases:{ achats:'1011' } }, mot:'faire une demande ou une note de frais', route:'achats', mesure:PANNEAU, jouer:'clic("data-axa","dem")' },
  { n:'créer une intervention', sans:{ cases:{ inter:'1011' } }, mot:'créer une intervention', route:'interventions', mesure:PANNEAU + ' || (typeof CREA !== "undefined" && !!CREA)', jouer:'clic("data-creer","1")' },
  { n:'désactiver un compte', sans:{ cases:{ admin:'1110' } }, mot:'désactiver un compte, annuler une invitation', route:'equipe', mesure:'eqDe("tl").actif', jouer:'clic("data-eqx","desactok|tl")' },
  { n:'valider les envois du terrain (droit à part)', sans:{ sp:{ valstock:0 } }, mot:'valider les gestes de stock des autres', route:'stock', mesure:'MVTS_ATT.length', jouer:'clic("data-ms","toutacc")' },
  { n:'inviter une personne (droit à part « Créer des comptes »)', sans:{ sp:{ comptes:0 } }, mot:'créer des comptes, dans la limite des places', route:'equipe', mesure:PANNEAU, jouer:'clic("data-eq","inviter")' },
  { n:'déplacer une intervention au planning', sans:{ cases:{ planif:'1101' } }, mot:'déplacer, changer de technicien, décider d’une absence', route:'planning', mesure:'INTS.find(i => i.id === "i1").tech', jouer:'poser(INTS.find(i => i.id === "i1"), INTS.find(i => i.id === "i1").tech === "tl" ? "lr" : "tl", INTS.find(i => i.id === "i1").d, INTS.find(i => i.id === "i1").h)' },
  { n:'envoyer une facture (envoyerFacture, porte de fonction)', sans:{ cases:{ ventes:'1101' } }, mot:'modifier, envoyer, relancer, faire signer', route:'comptabilite', prep:'(() => { const f = JSON.parse(JSON.stringify(FACTURES[0])); f.id = "ftest"; f.st = "avalider"; f.num = "—"; f.vue = false; FACTURES.push(f); })()', mesure:'FACTURES.find(o => o.id === "ftest").st', jouer:'envoyerFacture(FACTURES.find(o => o.id === "ftest"))' },
  { n:'régler l’entreprise (fiche de Mon entreprise)', sans:{ cases:{ admin:'1101' } }, mot:'changer la fiche de l’entreprise', route:'entreprise', sansSeul:true, mesure:'ENTREPRISE.tel', jouer:'clic("data-ent","identok")' }
];
const CLIC = `window.clic = (a, val) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute(a, val); document.body.appendChild(b); try { b.click(); } finally { b.remove(); } };`;
(async () => {
  let nAvec = 0, nSans = 0;
  for (const g of G) {
    for (const sens of g.sansSeul ? ['sans'] : ['avec', 'sans']) {
      const cases = Object.assign({}, TOUT, sens === 'sans' ? (g.sans.cases || {}) : {}), sp = Object.assign({}, SP, sens === 'sans' ? (g.sans.sp || {}) : {});
      const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases, sp });
      await c.p.evaluate(CLIC + 'window.DR0 = DROITS_REFUS.length;'); await L.aller(c.p, g.route); if (g.prep) await c.p.evaluate(g.prep);
      // restes entreprise, tour 6 : la page porte une politique de sécurité qui REFUSE eval() (script-src sans 'unsafe-eval') — ce qui est bien — et la sonde faisait `eval(m)` DANS la page : 9 ✗ qui étaient des
      // erreurs de la sonde. Le défaut était donc dans la SONDE ; elle évalue maintenant ses expressions par le protocole du navigateur (une chaîne passée à evaluate), qui n'est pas soumise à la politique de la page.
      const mesure = async () => { try { return await c.p.evaluate(g.mesure); } catch (e) { return 'ERR ' + e.message; } };
      const avant = await mesure(); let r;
      try { await c.p.evaluate(g.jouer); await new Promise(z => setTimeout(z, 250)); const ap = await mesure();
        r = await c.p.evaluate(() => { const refus = DROITS_REFUS.length - window.DR0; const t = document.getElementById('toast'); return { refus, toast:t && t.classList.contains('on') ? t.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : '' }; }); r.avant = avant; r.ap = ap;
      } catch (e) { r = { err:String(e.message), avant }; }
      if (sens === 'avec') { nAvec++; v(`${g.n} : AVEC la case, le geste a lieu (${JSON.stringify(r.avant)} → ${JSON.stringify(r.ap)}), aucun refus`, !r.err && r.refus === 0 && JSON.stringify(r.avant) !== JSON.stringify(r.ap), r); }
      else { nSans++; v(`${g.n} : SANS la case seule, rien ne bouge, un refus compté, le message dit quoi et à qui demander`, !r.err && r.refus >= 1 && JSON.stringify(r.avant) === JSON.stringify(r.ap) && r.toast.includes('Ce geste n’est pas ouvert à ton compte : ' + g.mot) && /Demande à Marc\./.test(r.toast), r); }
      v(`${g.n} (${sens}) : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2)); await L.fin(c);
    }
  }
  v('population : neuf gestes joués sans la case, huit avec', nAvec === 8 && nSans === 9, { nAvec, nSans });
  await fin();
})().catch(e => { console.error(e); process.exit(1); });
