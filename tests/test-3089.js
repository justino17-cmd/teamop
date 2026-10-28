/* 3089 — CAMILLE VOIT LES ANCIENS COURRIELS, ET SON TRAVAIL SE VOIT AU SUIVI (28 octobre 2026).
     Justin, devant « 35 courriers à traiter, personne dessus » : « pourquoi Camille n'a pas accès au mail ? » — puis : « il faut qu'elle puisse voir les anciens ». Mesuré dans le code :
     la veille ne lui annonce que les messages NON LUS et NEUFS (un courriel ouvert dans la Tour ne lui parvenait jamais), elle écarte ce qui a plus de trois jours, et elle n'écrivait
     rien au suivi du Courrier — « à traiter » ne baissait jamais, et Victor croyait que personne n'y était. Ce banc joue le VRAI `agent-camille.js` (établi `banc-agents-courrier.js`) :
       1. ce qu'elle décide s'écrit au suivi : ignoré → résolu ; réponse en brouillon → en cours (Camille) ; ce qui revient à Justin → en cours (Justin) ; un saut n'écrit rien ;
       2. l'ARRIÉRÉ : un courriel de cinq jours, écarté à l'arrivée, est repris ; même Camille en « auto » charte ouverte, la réponse ATTEND la validation (rien ne part) ; un courriel déjà
          traité ne se refait jamais ; une demande d'arrêt ancienne va à Justin, rien chez Hugo ; le bilan est dit à Justin (des nombres) ; une reprise à la fois ; un plafond l'arrête et le dit ;
       3. son outil dans la messagerie : seulement sur un message de Justin qui parle du courrier ;
       4. les consignes de l'équipe : ne pas annoncer ce qu'aucun outil ne fait ; ne pas relancer un sujet qu'on a soi-même clos. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter, COURRIEL, CHARTE_OUVERTE } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const JOUR = 86400000;
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 120000).unref();
const dormir = ms => new Promise(r => setTimeout(r, ms));

const QUESTION = 'CATEGORIE : question\nObjet : Re : Fonctionnement de l’application\n\nBonjour,\n\nOP GESTION fonctionne sur ordinateur, tablette et téléphone, depuis le navigateur, sans installation.\n\nBien cordialement,';
const poser = (Z, o) => { const m = Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<c1@banc-3089>', de: 'client@exemple-3089.fr', deNom: 'Hortense Valmont', pour: 'contact@teamop.fr', objet: 'Ma question',
  texte: 'Bonjour, comment ça marche ?', ts: Z.horloge.t - 3600000, auto: false, protege: false, authentifie: true }, o); Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m;
  return { boiteId: m.boite, dossier: m.dossier, uid: m.uid, mid: m.mid, ts: m.ts }; };
const suivre = Z => { const s = []; Z.mail.suiviMarquer = (mid, o) => { s.push([mid, o.statut, o.assigne || '']); return true; }; return s; };

(async () => {
  console.log('\n── 3089 · Camille : les anciens courriels, et son travail au suivi ──');

  console.log('\n1. Ce qu’elle décide s’écrit au suivi du Courrier');
  {
    let Z = monter({ modes: { camille: 'brouillon' }, claude: () => 'CATEGORIE : ignorer' }); let S = suivre(Z);
    let r = await Z.camille.surNouveauMessage(poser(Z, { mid: '<pub@banc-3089>' }));
    v('ignoré (publicité) → « résolu »', [r.ignore, S], [true, [['<pub@banc-3089>', 'resolu', '']]]); Z.nettoyer();
    Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); S = suivre(Z);
    r = await Z.camille.surNouveauMessage(poser(Z, {}));
    v('une réponse en brouillon → « en cours », par Camille', [r.depose, S], [true, [['<c1@banc-3089>', 'enCours', 'Camille']]]); Z.nettoyer();
    Z = monter({ modes: { camille: 'brouillon' }, claude: () => 'CATEGORIE : litige' }); S = suivre(Z);
    r = await Z.camille.surNouveauMessage(poser(Z, {}));
    v('ce qui revient à Justin → « en cours », pour Justin', [r.justin, S], [true, [['<c1@banc-3089>', 'enCours', 'Justin']]]); Z.nettoyer();
    Z = monter({ modes: { camille: 'arret' }, claude: () => QUESTION }); S = suivre(Z);
    r = await Z.camille.surNouveauMessage(poser(Z, {}));
    v('⛔ un saut (Camille à l’arrêt) n’écrit RIEN au suivi', [!!r.saute, S.length], [true, 0]); Z.nettoyer();
  }

  console.log('\n2. L’arriéré : elle voit les anciens');
  {
    /* le refus de remboursement est un GABARIT (« bon » d'office) : en « auto », charte ouverte, il part seul — c'est ce qui rend la contre-épreuve possible */
    const Z = monter({ charte: CHARTE_OUVERTE, modes: { camille: 'auto', hugo: 'brouillon' }, claude: () => 'CATEGORIE : remboursement', dossierDe: () => 'DOS-000123' }); const S = suivre(Z);
    const vieux = poser(Z, { uid: 7, mid: '<vieux@banc-3089>', ts: Z.horloge.t - 5 * JOUR });
    let r = await Z.camille.surNouveauMessage(vieux);
    v('(population) à l’arrivée, un courriel de cinq jours est écarté (« ancien »)', r.saute, 'ancien');
    const deja = poser(Z, { uid: 8, mid: '<deja@banc-3089>', ts: Z.horloge.t - 3600000 });
    r = await Z.camille.surNouveauMessage(deja);
    v('(population) un courriel récent est traité normalement : en « auto », charte ouverte, la réponse part SANS Justin (voie directe)', [r.depose, r.voie], [true, 'direct']);
    const envoyesAvant = Z.envoyes.length;
    Z.mail.arriere = async () => [vieux, deja];
    const b = await Z.camille.reprendreArriere(30);
    vrai('la reprise examine l’ancien et SAUTE le déjà traité', b.ok && b.examines === 1 && b.deja === 1 && b.reponses === 1, JSON.stringify(b));
    v('⛔ même en « auto », charte ouverte : la réponse à un ancien ATTEND la validation — rien ne part', Z.envoyes.length, envoyesAvant);
    const vals = await Z.validations();
    vrai('…elle est dans les validations de Justin', vals.some(x => x.statut === 'attente' || x.statut === 'en_attente' || !x.decide), JSON.stringify(vals.map(x => x.statut)));
    vrai('…et le suivi la dit « en cours » par Camille', S.some(x => x[0] === '<vieux@banc-3089>' && x[1] === 'enCours' && x[2] === 'Camille'), JSON.stringify(S));
    const bilan = Z.paroles.filter(p => p.fil === 'camille' && /Reprise de l’arriéré/.test(p.texte));
    vrai('le bilan est dit à Justin, dans le fil Camille, en nombres (sans adresse ni nom)', bilan.length === 1 && /1 courriel examiné — 1 réponse en brouillon à valider/.test(bilan[0].texte) && !/@|Hortense/.test(bilan[0].texte), JSON.stringify(bilan));
    const b2 = await Z.camille.reprendreArriere(30);
    vrai('relancée, la reprise ne refait rien (déjà traité)', b2.ok && b2.examines === 0 && b2.deja === 2, JSON.stringify(b2));
    Z.nettoyer();
  }
  {
    const Z = monter({ modes: { camille: 'brouillon', hugo: 'brouillon' }, claude: () => 'CATEGORIE : resiliation', dossierDe: () => 'DOS-000123' }); suivre(Z);
    const x = poser(Z, { uid: 9, mid: '<arret@banc-3089>', ts: Z.horloge.t - 10 * JOUR });
    Z.mail.arriere = async () => [x];
    const b = await Z.camille.reprendreArriere(30);
    const taches = (() => { try { return Z.agents.tachesDe('hugo'); } catch (e) { return []; } })();
    vrai('⛔ une demande d’arrêt ANCIENNE va à Justin : aucune demande déposée chez Hugo', b.justin === 1 && taches.length === 0 && Z.paroles.some(p => p.fil === 'camille' && /Dans l’arriéré : un courriel demande l’arrêt/.test(p.texte)), JSON.stringify([b, taches.length]));
    Z.nettoyer();
  }
  {
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); suivre(Z);
    let lache; const verrou = new Promise(r => { lache = r; });
    Z.mail.arriere = async () => { await verrou; return []; };
    const p1 = Z.camille.reprendreArriere(30);
    const p2 = await Z.camille.reprendreArriere(30);
    v('une reprise à la fois', p2.raison, 'deja_en_cours');
    lache(); await p1;
    const Z2 = monter({ modes: { camille: 'pause' }, claude: () => QUESTION }); suivre(Z2);
    v('Camille en pause : la reprise ne démarre pas, et le dit', (await Z2.camille.reprendreArriere(30)).ok, false);
    Z.nettoyer(); Z2.nettoyer();
  }
  {
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); suivre(Z);
    const j = new Date(Z.horloge.t).toISOString().slice(0, 10);
    const F = path.join(Z.D, 'agents-camille.json');
    const reg = fs.existsSync(F) ? JSON.parse(fs.readFileSync(F, 'utf8')) : { mids: {} };
    reg.jour = { j, brouillons: 30, examens: 0, domaines: {}, prevenu: {} };
    fs.writeFileSync(F, JSON.stringify(reg));
    const Z2 = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION, avant: D => fs.writeFileSync(path.join(D, 'agents-camille.json'), JSON.stringify(reg)) }); suivre(Z2);
    Z2.mail.arriere = async () => [poser(Z2, { uid: 21, mid: '<p1@banc-3089>', ts: Z2.horloge.t - 6 * JOUR }), poser(Z2, { uid: 22, mid: '<p2@banc-3089>', ts: Z2.horloge.t - 6 * JOUR })];
    const b = await Z2.camille.reprendreArriere(30);
    vrai('un plafond du jour arrête la reprise, et le bilan dit combien attendent encore', b.arret === 'plafond_jour' && b.restent === 2 && Z2.paroles.some(p => /Je me suis arrêtée \(plafond jour\) : 2 attendent encore/.test(p.texte)), JSON.stringify(b));
    Z.nettoyer(); Z2.nettoyer();
  }

  console.log('\n3. Son outil dans la messagerie');
  {
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); suivre(Z);
    let appels = 0; Z.mail.arriere = async () => { appels++; return []; };
    const O = Z.camille.outilsEquipe;
    vrai('l’outil « reprendre_courriels_anciens » existe', O && O.outils.some(t => t.name === 'reprendre_courriels_anciens'));
    v('⛔ demandé par un COLLÈGUE : refusé', O.executer('reprendre_courriels_anciens', {}, { de: 'victor', texte: 'reprends les anciens courriels' }).raison, 'pas_justin');
    v('⛔ Justin, mais son message ne parle pas du courrier : refusé', O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: 'merci, top' }).raison, 'pas_demande');
    const r = O.executer('reprendre_courriels_anciens', { jours: 20 }, { de: 'justin', texte: 'Camille, regarde les anciens courriels' });
    await dormir(50);
    vrai('Justin le demande : la reprise est lancée, et la phrase le dit', r.ok && /Reprise de l’arriéré lancée \(20 derniers jours\)/.test(r.ligne) && appels === 1, JSON.stringify([r, appels]));
    Z.nettoyer();
  }

  console.log('\n4. Les consignes de l’équipe, et le câblage');
  {
    const EQ = fs.readFileSync(path.join(RACINE, 'server', 'agent-equipe.js'), 'utf8');
    vrai('aucun agent n’annonce une action qu’aucun de ses outils ne fait', /ni de faire ce qu’aucun de tes outils ne fait/.test(EQ));
    vrai('un sujet qu’on a soi-même clos ne se relance pas', /Un sujet que tu as toi-même déclaré clos dans ce fil, tu ne le relances pas/.test(EQ));
    const IDX = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
    vrai('l’outil de Camille est branché dans la messagerie (getter tardif)', /get camille\(\) \{ return agentCamille && agentCamille\.outilsEquipe; \}/.test(IDX));
    vrai('la route de la Tour existe, réservée au patron', /app\.post\('\/api\/monitor\/agents\/camille\/arriere', monPatronStrict,/.test(IDX));
    const MAIL = fs.readFileSync(path.join(RACINE, 'server', 'mail.js'), 'utf8');
    vrai('mail.js rend `arriere` et `suiviMarquer`', /return \{ boites: .*arriere, suiviMarquer \};/.test(MAIL));
    vrai('⛔ l’arriéré ne lit que les boîtes qu’un agent peut lire (controle@ jamais)', /async function arriere\(jours\) \{[\s\S]{0,400}if \(!boiteAgentOk\(b\)\) continue;/.test(MAIL));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
