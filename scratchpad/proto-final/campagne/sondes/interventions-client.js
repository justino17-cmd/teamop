// CÔTÉ CLIENT : « Mes interventions » de l'espace client (prototype nu, bande « Tester en tant que » : ce que fait rlChanger).
// Le client voit ce qui est prévu, ce qui est fait, le compte rendu ; une intervention « à planifier » est un « rendez-vous à fixer ».
// usage : node interventions-client.js [profil] [nuit]
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: null, app: false, nuit }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = z => I.texte(p, z); const ev = (f, a) => p.evaluate(f, a);
  const CAPN = n => I.CAP + `client-${profil}${nuit ? '-nuit' : ''}-${n}.png`;
  await ev(() => { rlChanger('client', { cli: 'vp', muet: true, h: 'espaceclient' }); EC.tab = 'interventions'; rendre(); }); await L.calme(p, 700);
  let t = await txt('#contenu'); v('C1 le client voit « À venir » et « Déjà faites »', /À venir/i.test(t) && /Déjà faites/i.test(t), t.slice(0, 200));
  v('C1 le dépannage d’aujourd’hui est « En cours »', /Dépannage climatisation[\s\S]{0,80}En cours/.test(t), t.slice(0, 300));
  v('C1 le client ne lit aucun mot de bureau (technicien interne, « à planifier », « devis IA »…)', !/à planifier|Non assigné|prototype|bureau/i.test(t), (t.match(/.{0,30}(à planifier|Non assigné|prototype|bureau).{0,30}/i) || [''])[0]);
  await L.capture(c, CAPN('1-interventions'));
  // l'intervention d'un autre client n'apparaît pas
  { const lignes = await ev(() => [...document.querySelectorAll('#contenu .ec-l')].map(e => e.textContent)); v('C1 le client ne voit que SES interventions', lignes.length > 0 && !lignes.join(' ').match(/Hôtel de la Plage|Mme Roux|Mimosas|Camping/), lignes.slice(0, 4)); }
  // la technicienne termine ; le client voit « Faite » et le compte rendu
  await ev(() => { const F = fiche('i1'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Roulement remplacé.'; F.signature = 'signee'; F.suite = { entretien: false }; ACTIONS.terminer({ dataset: { id: 'i1' } }); fermerPanneau(); rendre(); }); await L.calme(p, 600);
  t = await txt('#contenu'); v('C2 l’intervention terminée passe dans « Déjà faites » avec « Faite »', /Déjà faites[\s\S]*Dépannage climatisation[\s\S]{0,80}Faite/i.test(t), t.slice(-300));
  await L.capture(c, CAPN('2-faite'));
  const ok = await tap('[data-ec^="cr|i1"]'); await L.calme(p, 600); const e = await L.etat(p); console.log('  · « Compte rendu » côté client :', JSON.stringify({ ok, panneau: e.panneau.slice(0, 80), h1: e.h1, toast: e.toast })); v('C2 « Compte rendu » s’ouvre', ok && (!!(await ev(() => !!document.querySelector('.pdf'))) || /Compte rendu|compte rendu/.test(e.panneau)), e);
  await L.capture(c, CAPN('3-compte-rendu'));
  await p.keyboard.press('Escape'); await L.calme(p, 300);
  // un rendez-vous « à planifier » est un « rendez-vous à fixer » pour le client (client « Hôtel de la Plage »)
  await ev(() => { RL_CLI.cli = 'hp'; EC.tab = 'interventions'; rendre(); }); await L.calme(p, 500); t = await txt('#contenu');
  v('C3 une intervention « à planifier » est « Rendez-vous à fixer » côté client', /Rendez-vous à fixer/.test(t) && /Date à fixer/.test(t), t.slice(0, 260));
  const d = await L.deborde(c); v('C3 pas de glissement latéral', d.bouge === 0, d);
  console.log('  · erreurs de page :', c.err.length, c.err.slice(0, 3)); v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });
