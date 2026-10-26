/* 3061 — L'EXAMEN DU 26 OCTOBRE 2026 (17 h 36), SCÉNARIO 8 « RÉUNIONS » : au bilan du vendredi, Victor n'a pas écrit son compte rendu
   (« Compte rendu non écrit. », « compte rendu de 0 caractères », examen « inconnu ») alors que le plafond n'était pas atteint (85 appels sur 200, 1,95 $ sur 12), et
   que Jules, Max, Léa et Inès s'étaient renvoyé six « @max ok… », « @jules ok… ».
   Ce que la lecture a établi (reunions.js) :
     · PAS le plafond de la réunion : une ouverture, un tour de table de huit, au plus douze prises de parole, une conclusion — sous les 45 messages de l'heure du fil et les 12 par
       agent (`conversations.js`) ; ni le délai (l'heure de la réunion se lit sur l'horloge de l'examen, qui ne bouge pas, et le scénario a droit à 25 minutes) ;
     · « Compte rendu non écrit. » SANS cause = Victor a rendu des OUTILS seuls (le vendredi il juge ses propres objectifs en concluant) et la seconde demande, sans outil, n'a
       rien rendu non plus — une seule tentative, avec une consigne qui lui demande encore « juge aussi tes objectifs (outil juger_objectif) » sans outil à portée, et la réflexion
       adaptative prise sur la longueur permise (de quoi ne laisser aucun mot) ; la cause de cet échec-là n'était pas dite ;
     · les accusés de réception (« @max ok ») sont publiés, donc CITENT : chacun rappelle l'autre, jusqu'à épuiser les deux tours de chacun.
   Ce banc joue le VRAI `reunions.js` (le vendredi 23 octobre 2026, 18 h) avec les vraies conversations et le vrai registre des agents, un cerveau scripté :
     1. le compte rendu est écrit même si Victor ne rend d'abord que ses outils et que la première redemande échoue (vide, coupée) ;
     2. la redemande est SANS outil, SANS réflexion, avec la consigne du compte rendu seule ; une cause globale (budget) ne la répète pas ;
     3. s'il reste muet, la cause est DITE (jamais « Compte rendu non écrit. » nu) ;
     4. un accusé de réception n'est pas une prise de parole : rien n'est publié, personne n'est rappelé. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3061-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);

(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const REU = require(path.join(RACINE, 'server', 'reunions.js'));
  const REG = AG.AGENTS.map(a => a.id);

  let n = 0;
  const rep = (texte, actions) => ({ ok: true, texte, actions: actions || [] });
  const outil = (nom, entree) => ({ id: 'tu_' + nom, nom, entree });
  /* la phase d'un appel : la redemande SANS outil porte « Écris maintenant, sans outil » dans son dernier message */
  const phase = t => {
    const u = t.messages[0].content, fin = t.messages[t.messages.length - 1].content;
    const redemande = /Écris maintenant, sans outil/.test(fin);
    return /Tu ouvres la réunion/.test(u) ? 'ouverture' : /Clos la réunion/.test(u) ? (redemande ? 'conclusion-redemande' : 'conclusion') : /On t’a cité/.test(u) ? 'discussion' : (redemande ? 'tour-redemande' : 'tour');
  };
  async function monter(o) {
    const Dd = path.join(banc, 'm' + (n++)); fs.mkdirSync(Dd, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const horloge = { t: o.depart };
    const modes = {}; for (const id of REG) modes[id] = 'brouillon';
    fs.writeFileSync(path.join(Dd, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    const agents = AG(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge.t });
    const appels = []; let eq = null, reu = null;
    const conv = CV(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => horloge.t, pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = {
      etatBudget: () => ({ illisible: false, cle: true }),
      penser: async (id, system, messages, opts) => {
        const trace = { id, system, messages: JSON.parse(JSON.stringify(messages)), opts }; trace.phase = phase(trace); appels.push(trace);
        await dormir(1);
        return o.script(trace, appels.length);
      } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {}, memoire: id => reu ? reu.memoire(id) : '' });
    reu = REU(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, conversations: conv, cerveau, pousseNotif: () => Promise.resolve(), equipe: () => eq, maintenant: () => horloge.t });
    const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(Dd, f), 'utf8')); } catch (x) { return null; } };
    return { appels, horloge, conv, tic: async () => { const r = reu.tic(); await reu.attendre(); return r; }, messages: () => conv.lire('reunions', 200),
      reunion: () => ((lire('agents-reunions.json') || { reunions: [] }).reunions || [])[0] };
  }
  const VENDREDI = U(2026, 10, 23, 16);   // vendredi 23 octobre 2026, 18 h à Paris (été)
  /* le bon équipier d'un vendredi : parle, ne cite personne ; Victor, en concluant, rend d'abord SES outils (il juge ses propres objectifs) */
  const base = (t) => {
    if (t.phase === 'ouverture') return rep('Bilan de la semaine : le courrier a avancé, rien de grave côté serveur.');
    if (t.phase === 'tour' || t.phase === 'tour-redemande') return rep('Mon bilan de la semaine : rien ne coince de mon côté, une leçon notée.');
    if (t.phase === 'discussion') return rep('RAS');
    return null;
  };
  const CR = 'Compte rendu du vendredi. Décisions : on garde le rythme de la semaine, les objectifs tenus le restent. Qui fait quoi : chacun reprend ses dossiers lundi. Ce qui attend Justin : rien de bloquant cette semaine, juste un coup d’œil à la file de validations.';
  const outilsVictor = () => rep('', [outil('ajouter_lecon', { texte: 'Relire les faits du journal avant chaque point' })]);

  console.log('\n1. Le compte rendu de Victor est écrit, même quand il commence par rendre ses outils seuls');
  {
    /* ce que le vrai modèle a fait le 26 octobre : les outils sans un mot, puis la redemande qui ne rend rien (vide) */
    let redemandes = 0;
    const H = await monter({ depart: VENDREDI, script: async t => {
      const b = base(t); if (b) return b;
      if (t.phase === 'conclusion') return outilsVictor();
      redemandes++;
      return redemandes === 1 ? { ok: false, raison: 'vide' } : rep(CR);
    } });
    const r = await H.tic();
    vrai('(population) la réunion du vendredi a eu lieu', !!r.lancee && H.reunion() && H.reunion().type === 'bilan', JSON.stringify(r));
    v('⛔ la première redemande rend « vide » : la SECONDE aboutit, le compte rendu est écrit', [H.reunion().statut, (H.reunion().compteRendu || '').length > 150, redemandes], ['terminee', true, 2]);
    vrai('…et rien n’est dit « Compte rendu non écrit »', !H.messages().some(m => /Compte rendu non écrit/.test(m.texte)), JSON.stringify(H.messages().map(m => m.texte.slice(0, 60))));
    const rd = H.appels.filter(a => a.phase === 'conclusion-redemande');
    v('⛔ la redemande est SANS outil et SANS réflexion adaptative (elle n’est plus prise sur la longueur permise)', rd.map(a => [a.opts.outils === undefined, a.opts.reflechir === true]), [[true, false], [true, false]]);
    vrai('⛔ …avec la consigne du COMPTE RENDU seule : elle ne redemande plus « juge aussi tes objectifs (outil juger_objectif) » à qui n’a plus d’outil', rd.every(a => !/outil juger_objectif/.test(a.messages[0].content) && /Clos la réunion par le compte rendu/.test(a.messages[0].content) && /Tes outils sont faits \(ajouter_lecon\)/.test(a.messages[0].content)), rd[0] && rd[0].messages[0].content.slice(-500));
    vrai('…et lui laisse de quoi écrire 1 500 caractères (maxTokens explicite)', rd.every(a => a.opts.maxTokens >= 1200), JSON.stringify(rd.map(a => a.opts)));
    v('le tour de table et la discussion sont inchangés : un appel par prise de parole, pas de redemande', H.appels.filter(a => a.phase === 'tour-redemande').length, 0);
  }
  {
    /* la première demande elle-même rend « vide » (ni texte ni outil) : redemandée aussi */
    let premiere = true;
    const H = await monter({ depart: VENDREDI, script: async t => {
      const b = base(t); if (b) return b;
      if (t.phase === 'conclusion') { if (premiere) { premiere = false; return { ok: false, raison: 'vide' }; } return rep(CR); }
      return rep(CR);
    } });
    await H.tic();
    v('⛔ une première demande « vide » (rien du tout) : le compte rendu est redemandé, sans outil, et écrit', [H.reunion().statut, (H.reunion().compteRendu || '').length > 150, H.appels.filter(a => a.phase === 'conclusion-redemande').length], ['terminee', true, 1]);
  }
  {
    /* la première demande est « trop longue » (réflexion mangeant la longueur) : même chose */
    const H = await monter({ depart: VENDREDI, script: async t => {
      const b = base(t); if (b) return b;
      return t.phase === 'conclusion' ? { ok: false, raison: 'trop_long' } : rep(CR);
    } });
    await H.tic();
    v('⛔ une première demande « trop longue » : redemandée, écrite', [H.reunion().statut, (H.reunion().compteRendu || '').length > 150], ['terminee', true]);
  }

  console.log('\n2. Quand il reste muet, la cause est DITE — jamais « Compte rendu non écrit. » tout nu');
  {
    const H = await monter({ depart: VENDREDI, script: async t => { const b = base(t); if (b) return b; return t.phase === 'conclusion' ? outilsVictor() : { ok: false, raison: 'trop_long' }; } });
    await H.tic();
    const ligne = H.messages().find(m => /Compte rendu non écrit/.test(m.texte));
    v('⛔ outils seuls, puis DEUX redemandes coupées : la ligne du système donne la cause', ligne && ligne.texte, 'Compte rendu non écrit : sa réponse dépassait la longueur permise.');
    v('…la réunion est tout de même terminée, sans compte rendu', [H.reunion().statut, H.reunion().compteRendu || ''], ['terminee', '']);
    v('…après trois appels de Victor pour conclure (la demande, deux redemandes) — jamais une boucle', H.appels.filter(a => a.id === 'victor' && /Clos la réunion/.test(a.messages[0].content)).length, 3);
  }
  {
    const H = await monter({ depart: VENDREDI, script: async t => { const b = base(t); if (b) return b; return t.phase === 'conclusion' ? outilsVictor() : { ok: false, raison: 'plafond_total' }; } });
    await H.tic();
    v('⛔ une cause qui vaut pour TOUS (le budget) : UNE redemande, pas deux (rien ne passera), et la cause est dite', [H.appels.filter(a => a.phase === 'conclusion-redemande').length, (H.messages().find(m => /Compte rendu non écrit/.test(m.texte)) || {}).texte], [1, 'Compte rendu non écrit : le budget des agents est atteint.']);
  }

  console.log('\n3. Un accusé de réception n’est pas une prise de parole');
  {
    const S = REU.sansRedites;
    v('« @max ok, merci. » : rien à publier', S('@max ok, merci.'), '');
    v('« Ok, noté. » / « D’accord ! » / « Entendu, merci Léa » : rien à publier', [S('Ok, noté.'), S('D’accord !'), S('Entendu, merci Léa')], ['', '', '']);
    v('⛔ un ENGAGEMENT reste : « @jules ok, je regarde les relances de Léa demain matin et je te dis » (plus de huit mots)', S('@jules ok, je regarde les relances de Léa demain matin et je te dis'), '@jules ok, je regarde les relances de Léa demain matin et je te dis');
    v('⛔ une QUESTION reste : « ok, tu peux me redire quand ? »', S('ok, tu peux me redire quand ?'), 'ok, tu peux me redire quand ?');
    v('⛔ un CHIFFRE reste : « merci, 3 relances sont parties »', S('merci, 3 relances sont parties'), 'merci, 3 relances sont parties');
    v('⛔ un fait qui n’est pas un accusé reste : « Rien de nouveau côté serveur » (ce n’est pas un « ok »)', S('Rien de nouveau côté serveur'), 'Rien de nouveau côté serveur');
    v('   les redites d’objectifs, retirées avant : inchangées (« Je confirme mes objectifs. » → rien)', [S('Je confirme mes objectifs.'), S('Je confirme mes objectifs, et je m’engage à livrer vendredi.')], ['', 'Je m’engage à livrer vendredi.']);
    v('   « ok mais attention, le planning de Léa a trois jours de retard » reste (plus de huit mots, un chiffre)', S('ok mais attention, le planning de Léa a trois jours de retard'), 'ok mais attention, le planning de Léa a trois jours de retard');
  }
  {
    /* le tour de table : chacun cite Max et Jules ; en discussion, ils s'accusent réception en se citant — comme le 26 octobre */
    const LUNDI = U(2026, 10, 26, 8);
    const H = await monter({ depart: LUNDI, script: async t => {
      if (t.phase === 'ouverture') return rep('On démarre la semaine, voici les faits.');
      if (t.phase === 'tour' || t.phase === 'tour-redemande') return rep('Mes objectifs sont posés. @max @jules vous me dites si ça vous va.', t.id === 'victor' ? [] : []);
      if (t.phase === 'discussion') return rep(t.id === 'max' ? '@jules ok, merci.' : '@max ok, noté.');
      if (t.phase === 'conclusion') return rep(CR);
      return rep(CR);
    } });
    const r = await H.tic();
    vrai('(population) le lundi a eu lieu', !!r.lancee && H.reunion().type === 'objectifs', JSON.stringify(r));
    const polis = H.messages().filter(m => /\bok\b/.test(m.texte));
    v('⛔ aucun « ok, merci » n’est publié dans le fil', polis.length, 0);
    const disc = H.appels.filter(a => a.phase === 'discussion');
    v('⛔ la discussion s’arrête d’elle-même : Max et Jules répondent UNE fois chacun (rien ne les rappelle), pas jusqu’à épuiser leurs deux tours', disc.map(a => a.id).sort(), ['jules', 'max']);
    v('…le compte rendu est écrit', [H.reunion().statut, (H.reunion().compteRendu || '').length > 150], ['terminee', true]);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
