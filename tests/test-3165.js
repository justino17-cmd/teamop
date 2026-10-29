/* ⛔ CE QUE CE FICHIER GARDE (le code de server/, sans aucune page) — LES CORRECTIFS DE LA RELECTURE DE `gardien` ET `relecteur` SUR LA COMPTA DE MARGAUX (29 octobre 2026). Chaque défaut a d'abord été REJOUÉ, puis corrigé, puis retiré à la main pour voir ce banc tomber :
     1. les chiffres du point ne partent chez Anthropic dans AUCUN mode, même quand la messagerie des agents ne s'est pas montée (le repli `agent-conversation.js` relisait les lignes « système ») ;
     2. un registre de relances ILLISIBLE se dit « je ne sais pas les lire », jamais « 0 · 0 · 0 » ;
     3. l'adresse de l'expert-comptable est lue par le CODE dans le message de Justin (la messagerie la masque avant de la montrer au modèle) ;
     4. la réponse que Margaux suggère à SA question (« oui » / « pas encore ») est acceptée — à cette question seulement ; hors d'elle, un « oui » seul ne note rien ;
     5. une négation ou un doute (« je ne suis PAS en franchise », « je ne sais pas si… », « 293 clients ») ne note pas la valeur ;
     6. les lignes du point ne sont pas recopiées vers OP MESSAGES (décision D5 ouverte) ; les compteurs de factures disent de quelles factures ils parlent. */
'use strict';
const fs = require('fs'), path = require('path');
const { monter, rep, outil, S: SRV } = require('./banc-autonomie');
const B = require('./banc-compta');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 400) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); process.exit(1); }, 150000).unref();

const COMPTA = require(SRV('compta-stripe.js')), AGENT = require(SRV('agent-compta.js')), AG = require(SRV('agents.js'));
const R = B.reel();
/* des chiffres DISTINCTIFS : aucun ne peut se trouver par hasard dans un prompt, un journal ou une phrase de Claude */
const CHIFFRES = ['3 142,75', '3142,75', '3142.75', '487,50', '487,5', '314275'];
const JEU = () => [
  B.facture({ id: 'in_c1', cents: 199900, cree: '2026-10-03T08:00:00Z', payee: '2026-10-03T08:05:00Z', nom: 'Dupont Secrète SARL' }),
  B.facture({ id: 'in_c2', cents: 114375, cree: '2026-10-09T08:00:00Z', payee: '2026-10-09T08:05:00Z', nom: 'Martin Confidentiel' }),
  B.facture({ id: 'in_c3', status: 'open', cents: 1500, cree: '2026-10-12T08:00:00Z' }), B.facture({ id: 'in_c4', status: 'open', cents: 1500, cree: '2026-10-13T08:00:00Z' }), B.facture({ id: 'in_c5', status: 'open', cents: 1500, cree: '2026-10-14T08:00:00Z' }),
  B.facture({ id: 'in_c6', status: 'uncollectible', cents: 1500, cree: '2026-10-15T08:00:00Z' }), B.facture({ id: 'in_c7', status: 'open', attempted: true, cents: 1500, cree: '2026-10-16T08:00:00Z' }),
  B.facture({ id: 'in_c8', status: 'void', cents: 1500, cree: '2026-10-17T08:00:00Z' }),
];
const ABOS = () => [B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Business'), B.abo('actif', 'OP GESTION Business'),
  B.abo('actif', 'OP GESTION Business Premium', 50), B.abo('actif', 'OP GESTION Business Premium', 50), B.abo('essai', 'OP GESTION Pro'), B.abo('essai', 'OP GESTION Business'), B.abo('impaye', 'OP GESTION Pro')];
const ABOS_ETAT = () => ({ ok: true, configured: true, abos: ABOS(), mrr: 487.5, actifs: 9, impayes: 1 });

/* Une équipe d'essai : les vrais modules, un faux Stripe, un faux Claude qui joue `jouer(t)` pour Margaux */
function equipe(o) {
  o = o || {};
  const stripe = B.fauxStripe(o.factures || JEU());
  const etatAbos = { v: o.abos || ABOS_ETAT() };
  let compta = null;
  const H = monter(Object.assign({ outilsAgents: { get margaux() { return compta && compta.outilsEquipe; } },
    script: t => (t.id === 'margaux' ? (o.jouer ? o.jouer(t) : rep('Voilà le point, il est juste en dessous.', [outil('point_compta', { periode: 'ce_mois' })])) : rep('Ok.')) }, o.monter || {}));
  const fichier = require(SRV('agents-fichier.js'))(H.D);
  if (o.avantCompta) o.avantCompta(H.D);
  const fichierCompta = o.fichier ? o.fichier(H.D) : fichier;
  const stripeMod = COMPTA({ lire: stripe.lire, convertir: R.stripePaiement, abonnements: async () => { if (typeof etatAbos.v === 'function') return etatAbos.v(); return etatAbos.v; }, configure: () => !o.sansCle, maintenant: () => H.horloge.t });
  compta = AGENT({ agents: H.agents, conversations: o.conversations ? o.conversations(H) : H.conv, fichier: fichierCompta, stripe: stripeMod, maintenant: () => H.horloge.t,
    periodes: () => ({ ok: true, nombre: 3, prochaine: '2026-11-12' }), relances: () => ({ impayesSuivis: 2, relancesParties: 3, misesEnDemeurePreparees: 1 }) });
  return Object.assign(H, { stripe, etatAbos, compta, fichierCompta, reglages: () => { try { return JSON.parse(fs.readFileSync(path.join(H.D, 'compta-reglages.json'), 'utf8')); } catch (e) { return null; } } });
}
const lignesSysteme = async (H, fil) => (await H.messages(fil)).filter(m => m.de === 'systeme').map(m => m.texte);
const corpsRecus = H => JSON.stringify(H.appels.map(a => ({ s: a.system, m: a.messages })));


(async () => {
  console.log('\n── 3165 · Margaux comptable : les correctifs de la relecture ──');
  const AC = require(SRV('agent-conversation.js')), REGISTRE = AG.AGENTS;

  console.log('\n1. Le repli de la messagerie (agent-conversation) ne relit JAMAIS une ligne « système »');
  {
    const j = []; const histo = [{ de: 'justin', texte: 'Margaux, le point ?', ts: 1 }, { de: 'systeme', texte: 'Au 28 octobre 2026 · encaissé en octobre 2026 : 3 142,75 € · revenu mensuel récurrent : 487,50 €', ts: 2 }, { de: 'justin', texte: 'Merci Margaux', ts: 3 }];
    const m = AC({ agents: { AGENTS: REGISTRE, peutAgir: () => ({ ok: true, mode: 'brouillon' }) }, conversations: { historique: () => histo, parler: () => ({ ok: true }) },
      cerveau: { penser: async (id, system, messages) => { j.push({ system, messages: JSON.parse(JSON.stringify(messages)) }); return { ok: true, texte: 'Avec plaisir.' }; } }, faits: {} });
    await m.repondre('margaux', 'Merci Margaux');
    vrai('(population) Claude a bien été appelé une fois', j.length === 1, j.length);
    const recu = JSON.stringify(j);
    vrai('⛔ AUCUN chiffre du point dans ce que Claude reçoit (requête, prompt)', ['3 142,75', '487,50', 'revenu mensuel'].every(c => !recu.includes(c)), recu.slice(0, 300));
    v('…les deux messages de Justin sont fusionnés, la ligne du système est écartée', j[0].messages, [{ role: 'user', content: 'Margaux, le point ?\nMerci Margaux' }]);
  }

  console.log('\n2. Un registre de relances illisible se dit « illisible », pas « 0 · 0 · 0 »');
  {
    const MARG = require(SRV('agent-margaux.js'));
    const mk = illisible => { const H = equipe({ monter: {}, avantCompta: null }); return H; };
    for (const illisible of [false, true]) {
      const H = equipe({ fichier: D => require(SRV('agents-fichier.js'))(D) });
      const f = require(SRV('agents-fichier.js'))(H.D);
      if (illisible) fs.writeFileSync(path.join(H.D, 'agents-margaux.json'), '{"impayes":{"a":{"aboId":"su');   // tronqué
      const f2 = require(SRV('agents-fichier.js'))(H.D);
      const marg = MARG({ agents: H.agents, documents: { courrier: async () => ({ ok: true }) }, fichier: f2, impayes: async () => ({ ok: true, liste: [] }), conversations: H.conv });
      const etat = marg.etat();
      v(illisible ? '⛔ registre tronqué : `etat()` rend null (on ne sait pas)' : 'registre sain et vide : `etat()` rend de vrais zéros', illisible ? etat : etat && [etat.impayesSuivis, etat.relancesParties, etat.misesEnDemeurePreparees], illisible ? null : [0, 0, 0]);
      const H2 = equipe({ relances: null });
      H.nettoyer(); H2.nettoyer();
    }
    /* de bout en bout : le point, avec le registre illisible, ne montre pas de zéros */
    const H = equipe();
    const MARG2 = MARG({ agents: H.agents, documents: { courrier: async () => ({ ok: true }) }, fichier: (() => { fs.writeFileSync(path.join(H.D, 'agents-margaux.json'), '{"impayes":{"a":'); return require(SRV('agents-fichier.js'))(H.D); })(), impayes: async () => ({ ok: true, liste: [] }), conversations: H.conv });
    const compta = AGENT({ agents: H.agents, conversations: H.conv, fichier: require(SRV('agents-fichier.js'))(H.D), stripe: COMPTA({ lire: H.stripe.lire, convertir: R.stripePaiement, abonnements: async () => ABOS_ETAT(), configure: () => true, maintenant: () => H.horloge.t }), maintenant: () => H.horloge.t,
      periodes: () => ({ ok: true, nombre: 3, prochaine: '2026-11-12' }), relances: () => MARG2.etat() });
    await compta.outilsEquipe.executer('point_compta', { periode: 'ce_mois' }, { de: 'justin', fil: 'margaux', texte: 'le point' });
    const t = (await lignesSysteme(H, 'margaux')).join('\n');
    vrai('⛔ le point dit « je ne sais pas les lire » pour les relances', /Mes relances : je ne sais pas les lire/.test(t), t);
    vrai('…et ne porte aucun « 0 impayé suivi »', !/0 impayé suivi|0 relance partie/.test(t), t);
    H.nettoyer();
  }

  console.log('\n3. L’expert-comptable : l’adresse est lue par le code, dans le message de Justin');
  {
    const Z = async (texte, entree) => { const H = equipe({ jouer: () => rep('Noté.', [outil('regler_compta', entree)]) }); await H.justin('margaux', texte); const r = { H, reg: H.reglages() }; return r; };
    let r = await Z('Mon expert-comptable est Cabinet Durand, durand@cabinet-banc.fr.', { expert_comptable: { nom: 'Cabinet Durand' } });
    v('le modèle ne donne QUE le nom (il ne voit pas l’adresse) : l’adresse est prise dans le message de Justin, point final retiré', r.reg && r.reg.expert, { aucun: false, nom: 'Cabinet Durand', adresse: 'durand@cabinet-banc.fr' });
    vrai('…et la messagerie a bien masqué l’adresse avant le modèle (c’est le défaut rejoué)', !/durand@cabinet-banc/.test(corpsRecus(r.H)), corpsRecus(r.H).slice(0, 200));
    r.H.nettoyer();
    r = await Z('Mon expert-comptable est Cabinet Durand, durand@cabinet-banc.fr', { expert_comptable: { nom: 'Cabinet Durand', adresse: 'pirate@mauvais.fr' } });
    v('⛔ une adresse inventée par le modèle est ignorée : seule celle de Justin compte', r.reg && r.reg.expert && r.reg.expert.adresse, 'durand@cabinet-banc.fr');
    r.H.nettoyer();
    r = await Z('Mon expert-comptable est Cabinet Durand', { expert_comptable: { nom: 'Cabinet Durand', adresse: 'durand@cabinet-banc.fr' } });
    v('⛔ aucune adresse dans son message : refusé, même si le modèle en propose une', r.reg, null);
    r.H.nettoyer();
    r = await Z('Mon expert est Cabinet Durand, durand@cabinet-banc.fr ou compta@autre-cabinet.fr', { expert_comptable: { nom: 'Cabinet Durand' } });
    v('⛔ deux adresses dans le message : on ne devine pas laquelle, refusé', r.reg, null);
    r.H.nettoyer();
    r = await Z('Mon expert est durand@cabinet-banc.fr', { expert_comptable: { nom: 'Cabinet Durand' } });
    v('⛔ le nom n’est pas dans son message : refusé', r.reg, null);
    r.H.nettoyer();
  }

  console.log('\n4. La réponse que Margaux suggère à sa question est acceptée — à cette question seulement');
  {
    const rejouer = async (reponse, valeur, avant) => {
      const H = equipe({ jouer: () => rep('Noté.', [outil('regler_compta', { plateforme_reception: valeur })]) });
      if (avant) await avant(H);
      await H.justin('margaux', reponse);
      return H;
    };
    let H = equipe(); await H.compta.passer();
    vrai('(population) la question est partie, elle propose « oui » et « pas encore »', (await H.messages('margaux')).some(m => /En as-tu désigné une \?/.test(m.texte) && /« oui »/.test(m.texte) && /« pas encore »/.test(m.texte)));
    H.nettoyer();
    H = await rejouer('pas encore', 'non', h => h.compta.passer());
    v('« pas encore » juste après la question → plateforme « non »', (H.reglages() || {}).plateforme, 'non'); H.nettoyer();
    H = await rejouer('Oui.', 'oui', h => h.compta.passer());
    v('« Oui. » juste après la question → plateforme « oui »', (H.reglages() || {}).plateforme, 'oui'); H.nettoyer();
    H = await rejouer('oui', 'non', h => h.compta.passer());
    v('⛔ « oui » mais le modèle voulait « non » : refusé', (H.reglages() || {}).plateforme, undefined); H.nettoyer();
    H = await rejouer('oui', 'oui');
    v('⛔ « oui » SEUL, sans que la question ait été posée : refusé (rien n’est noté)', (H.reglages() || {}).plateforme, undefined); H.nettoyer();
    H = await rejouer('oui', 'oui', async h => { await h.compta.passer(); h.conv.parler('margaux', 'margaux', 'Autre chose : ton expert-comptable ?', { niveau: 'info' }); });
    v('⛔ « oui » quand la DERNIÈRE parole de Margaux n’est plus la question : refusé', (H.reglages() || {}).plateforme, undefined); H.nettoyer();
    H = await rejouer('oui mais je ne sais pas trop', 'oui', h => h.compta.passer());
    v('⛔ « oui, mais… » n’est pas une réponse sèche : refusé', (H.reglages() || {}).plateforme, undefined); H.nettoyer();
  }

  console.log('\n5. Une négation ou un doute ne note pas la valeur');
  {
    const Z = async (texte, entree) => { const H = equipe({ jouer: () => rep('Noté.', [outil('regler_compta', entree)]) }); await H.justin('margaux', texte); const r = { H, reg: H.reglages() }; r.regime = (r.reg || {}).regime; r.pf = (r.reg || {}).plateforme; return r; };
    const cas = [
      ['Je ne suis PAS en franchise', { regime: 'franchise' }, 'regime', undefined, '⛔ « je ne suis PAS en franchise » ne note pas la franchise'],
      ['Je ne suis pas en franchise, je suis au réel', { regime: 'reel' }, 'regime', 'reel', '…mais « je suis au réel » est noté'],
      ['J’ai 293 clients', { regime: 'franchise' }, 'regime', undefined, '⛔ « 293 clients » n’ouvre pas la porte de la franchise'],
      ['Je suis en franchise, article 293 B', { regime: 'franchise' }, 'regime', 'franchise', '…« article 293 B » la note toujours'],
      ['Je ne sais pas si j’ai déjà désigné une plateforme', { plateforme_reception: 'oui' }, 'pf', undefined, '⛔ « je ne sais pas si j’ai désigné » ne note pas « oui »'],
      ['Je ne sais pas si j’ai déjà désigné une plateforme', { plateforme_reception: 'inconnu' }, 'pf', 'inconnu', '…mais note « inconnu »'],
    ];
    for (const [texte, entree, champ, attendu, nom] of cas) { const r = await Z(texte, entree); v(nom, r[champ], attendu); r.H.nettoyer(); }
  }

  console.log('\n6. Les chiffres ne sont pas recopiés vers OP MESSAGES, et les compteurs disent de quelles factures ils parlent');
  {
    const H = equipe();
    await H.justin('margaux', 'Margaux, fais-moi le point du mois');
    const sys = await lignesSysteme(H, 'margaux');
    vrai('(population) le point est écrit dans le fil (4 lignes ou plus)', sys.length >= 4, sys.length);
    const pont = JSON.stringify(H.pont);
    vrai('(population) le pont a bien reçu le message de Justin et la réponse de Margaux', H.pont.some(m => m.de === 'justin') && H.pont.some(m => m.de === 'margaux'), H.pont.length);
    vrai('⛔ …mais AUCUNE ligne du point (ni 3 142,75, ni 487,50, ni « Abonnés ») ne lui est offerte', !H.pont.some(m => m.de === 'systeme') && !/3 142,75|487,50|Abonnés|encaissé en/.test(pont), pont.slice(0, 200));
    const tout = sys.join('\n');
    vrai('les compteurs en attente / refusées / annulées disent « les factures émises en octobre 2026 » et renvoient à la Tour', /ces trois compteurs : les factures émises en octobre 2026/.test(tout) && /50 dernières/.test(tout), tout);
    vrai('…et chaque ligne tient toujours en 300 signes', sys.every(l => l.length <= 300), sys.map(l => l.length).join(','));
    vrai('la description de verifier_factures dit « attendues », pas « obligatoires »', /mentions attendues/.test(H.compta.outilsEquipe.outils.find(o => o.name === 'verifier_factures').description) && !/mentions obligatoires/.test(H.compta.outilsEquipe.outils.find(o => o.name === 'verifier_factures').description));
    H.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
