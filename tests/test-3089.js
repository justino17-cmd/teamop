/* 3089 — CAMILLE VOIT LES ANCIENS COURRIELS, ET SON TRAVAIL SE VOIT AU SUIVI (28 octobre 2026).
     Justin, devant « 35 courriers à traiter, personne dessus » : « pourquoi Camille n'a pas accès au mail ? » — puis : « il faut qu'elle puisse voir les anciens ». Mesuré dans le code :
     la veille ne lui annonce que les messages NON LUS et NEUFS (un courriel ouvert dans la Tour ne lui parvenait jamais), elle écarte ce qui a plus de trois jours, et elle n'écrivait
     rien au suivi du Courrier — « à traiter » ne baissait jamais, et Victor croyait que personne n'y était. Ce banc joue le VRAI `agent-camille.js` (établi `banc-agents-courrier.js`) :
       1. ce qu'elle décide s'écrit au suivi : ignoré → résolu ; réponse en brouillon → en cours (Camille) ; ce qui revient à Justin → en cours (Justin) ; un saut n'écrit rien ;
       2. plus de limite d'âge (Justin : « trois jours avant, et après ils n'ont plus accès au reste, c'est débile ») ; l'ARRIÉRÉ se ratisse seul et suit le MODE de Camille ; un courriel
          déjà traité ne se refait jamais, une panne ne grave rien ; les alertes vont au bilan (réf.) ; une reprise à la fois ; la moitié des plafonds du jour au plus ; le suivi ne réécrit
          jamais une ligne qu'un humain a touchée (relecture du `gardien`) ;
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
    let Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); let S = suivre(Z);
    let r = await Z.camille.surNouveauMessage(poser(Z, {}));
    v('une réponse en brouillon → « en cours », par Camille', [r.depose, S], [true, [['<c1@banc-3089>', 'enCours', 'Camille']]]); Z.nettoyer();
    Z = monter({ modes: { camille: 'brouillon' }, claude: () => 'CATEGORIE : litige' }); S = suivre(Z);
    r = await Z.camille.surNouveauMessage(poser(Z, {}));
    v('ce qui revient à Justin → « en cours », pour Justin', [r.justin, S], [true, [['<c1@banc-3089>', 'enCours', 'Justin']]]); Z.nettoyer();
    Z = monter({ modes: { camille: 'brouillon' }, claude: () => 'CATEGORIE : ignorer' }); S = suivre(Z);
    r = await Z.camille.surNouveauMessage(poser(Z, { mid: '<pub@banc-3089>' }));
    v('⛔ (gardien) « ignoré » ne passe JAMAIS par suiviMarquer (donc jamais « résolu » : définitif, une catégorie mal posée ne ferait pas disparaître un vrai message) — son classement doux est joué par test-3098', [r.ignore, S.length], [true, 0]); Z.nettoyer();
    Z = monter({ modes: { camille: 'arret' }, claude: () => QUESTION }); S = suivre(Z);
    r = await Z.camille.surNouveauMessage(poser(Z, {}));
    v('⛔ un saut (Camille à l’arrêt) n’écrit rien au suivi', [!!r.saute, S.length], [true, 0]); Z.nettoyer();
    Z = monter({ modes: { camille: 'brouillon' }, claude: () => 'Je ne sais pas trop.' }); S = suivre(Z);
    r = await Z.camille.surNouveauMessage(poser(Z, {}));
    v('⛔ un saut APRÈS la lecture (réponse de Claude sans catégorie) n’écrit rien non plus : le courriel reste « à traiter »', [r.saute, S.length], ['forme', 0]); Z.nettoyer();
  }
  {
    /* le VRAI suiviMarquer de mail.js : une ligne qu'un HUMAIN a touchée n'est jamais réécrite */
    const D = fs.mkdtempSync(path.join(require('os').tmpdir(), 'b3089m-'));
    fs.writeFileSync(path.join(D, 'mail-suivi.json'), JSON.stringify({ '<pris@x>': { statut: 'enCours', assigne: 'Paul', par: 'Justin', ts: 1, recuTs: 1, repTs: 0, de: '', objet: '' },
      '<rep@x>': { statut: 'aTraiter', assigne: '', par: '', ts: 1, recuTs: 1, repTs: 5, de: '', objet: '' }, '<libre@x>': { statut: 'aTraiter', assigne: '', par: '', ts: 1, recuTs: 1, repTs: 0, de: '', objet: '' } }));
    const app = { get() {}, post() {}, put() {}, delete() {}, use() {} };
    const M = require(path.join(RACINE, 'server', 'mail.js'))(app, { DATA_DIR: D, monAdmin: (q, r, n) => n(), monPatronStrict: (q, r, n) => n(), monStr: (x, n) => String(x == null ? '' : x).slice(0, n), pousseNotif: () => {} });
    v('suiviLibre : pris par un humain, répondu → non ; à traiter → oui ; inconnu → oui', [M.suiviLibre('<pris@x>'), M.suiviLibre('<rep@x>'), M.suiviLibre('<libre@x>'), M.suiviLibre('<neuf@x>')], [false, false, true, true]);
    v('⛔ suiviMarquer refuse une ligne prise ou répondue par un humain', [M.suiviMarquer('<pris@x>', { statut: 'enCours', assigne: 'Camille' }), M.suiviMarquer('<rep@x>', { statut: 'enCours', assigne: 'Camille' })], [false, false]);
    v('…et écrit une ligne libre (statut, Camille)', [M.suiviMarquer('<libre@x>', { statut: 'enCours', assigne: 'Camille' }), M.compter().aTraiter, M.compter().enCours], [true, 1, 2]);
    try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n2. Plus de limite d’âge, et l’arriéré se ratisse');
  {
    /* Justin, 28 octobre 2026 : « trois jours avant, et après ils n'ont plus accès au reste, c'est débile » */
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); suivre(Z);
    const r = await Z.camille.surNouveauMessage(poser(Z, { uid: 3, mid: '<cinq@banc-3089>', ts: Z.horloge.t - 5 * JOUR }));
    v('un courriel de CINQ jours se traite à son arrivée (plus d’« ancien »)', [r.saute, r.depose], [undefined, true]); Z.nettoyer();
  }
  {
    /* un courriel écarté comme « ancien » AVANT ce changement (vu quatre jours après sa date) se reprend ; un courriel déjà traité, jamais */
    const crypto = require('crypto'); const em = x => crypto.createHash('sha256').update('camille:' + x).digest('hex').slice(0, 32);
    const T0 = Date.UTC(2026, 9, 23, 9, 0, 0);
    const reg = { mids: { [em('<vieux@banc-3089>')]: T0 - JOUR, [em('<fait@banc-3089>')]: T0 - 9 * JOUR }, jour: { j: '', brouillons: 0, examens: 0, domaines: {}, prevenu: {} } };
    const Z = monter({ charte: CHARTE_OUVERTE, modes: { camille: 'auto' }, claude: () => 'CATEGORIE : remboursement', avant: D => fs.writeFileSync(path.join(D, 'agents-camille.json'), JSON.stringify(reg)) }); const S = suivre(Z);
    const vieux = poser(Z, { uid: 7, mid: '<vieux@banc-3089>', ts: T0 - 5 * JOUR }), fait = poser(Z, { uid: 8, mid: '<fait@banc-3089>', ts: T0 - 10 * JOUR });
    Z.mail.arriere = async () => [fait, vieux];
    const b = await Z.camille.reprendreArriere(30);
    vrai('la reprise prend l’« ancien » jamais traité et SAUTE le déjà traité', b.ok && b.examines === 1 && b.deja === 1 && b.reponses === 1, JSON.stringify(b));
    v('elle suit le MODE de Camille : en « auto », charte ouverte, la réponse part comme pour un courriel neuf (Justin : « toutes leurs tâches à 100 % »)', Z.envoyes.length, 1);
    vrai('…et le suivi la dit « en cours » par Camille', S.some(x => x[0] === '<vieux@banc-3089>' && x[1] === 'enCours' && x[2] === 'Camille'), JSON.stringify(S));
    const bilan = Z.paroles.filter(p => p.fil === 'camille' && /Reprise de l’arriéré/.test(p.texte));
    vrai('le bilan est dit à Justin, dans le fil Camille, en nombres (sans adresse ni nom)', bilan.length === 1 && /1 courriel examiné — 1 réponse/.test(bilan[0].texte) && !/@|Hortense/.test(bilan[0].texte), JSON.stringify(bilan));
    const b2 = await Z.camille.reprendreArriere(30);
    vrai('relancée, elle ne refait rien (déjà traité)', b2.ok && b2.examines === 0 && b2.deja === 2, JSON.stringify(b2));
    const avant = Z.paroles.length;
    const b3 = await Z.camille.reprendreArriere(30, { silencieux: true });
    vrai('le ratissage automatique se TAIT quand il n’a rien fait', b3.ok && Z.paroles.length === avant, JSON.stringify(b3));
    Z.nettoyer();
  }
  {
    /* (gardien) une panne ne grave rien : le courriel se reprendra */
    const T0 = Date.UTC(2026, 9, 23, 9, 0, 0);
    let panne = true;
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => { if (panne) { const e = new Error('surcharge'); e.status = 529; throw e; } return QUESTION; } }); suivre(Z);
    const x = poser(Z, { uid: 11, mid: '<panne@banc-3089>', ts: T0 - 6 * JOUR });
    Z.mail.arriere = async () => [x];
    const b = await Z.camille.reprendreArriere(30);
    panne = false;
    const b2 = await Z.camille.reprendreArriere(30);
    vrai('⛔ (gardien) une panne de Claude ne grave rien : le courriel est repris au passage suivant', b.examines === 0 && b2.examines === 1 && b2.reponses === 1, JSON.stringify([b, b2]));
    Z.nettoyer();
  }
  {
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => 'Je ne sais pas trop.' }); suivre(Z);
    Z.mail.arriere = async () => [1, 2, 3, 4, 5].map(k => poser(Z, { uid: 30 + k, mid: '<e' + k + '@banc-3089>', de: 'c' + k + '@ex-3089.fr' }));
    const b = await Z.camille.reprendreArriere(30);
    vrai('(gardien) trois échecs de suite arrêtent la reprise, et le bilan le dit', b.arret === 'echecs_repetes' && b.echecs === 3 && b.restent === 2 && Z.paroles.some(p => /que je n’ai pas pu lire ou traiter/.test(p.texte)), JSON.stringify(b));
    Z.nettoyer();
  }
  {
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => 'CATEGORIE : litige' }); const S = suivre(Z);
    Z.mail.arriere = async () => [1, 2].map(k => poser(Z, { uid: 40 + k, mid: '<l' + k + '@banc-3089>', de: 'l' + k + '@ex-3089.fr' }));
    const b = await Z.camille.reprendreArriere(30);
    const seuls = Z.paroles.filter(p => p.fil === 'camille');
    vrai('(gardien) sous la reprise, les alertes ne partent pas une à une (le plafond horaire les avalait) : UN bilan, qui cite les réf. et la nature', b.justin === 2 && seuls.length === 1 && /2 pour toi \(réf\. [0-9a-f]{4} litige, [0-9a-f]{4} litige\)/.test(seuls[0].texte), JSON.stringify(seuls));
    vrai('…et le suivi les dit « pour Justin »', S.filter(x => x[2] === 'Justin').length === 2, JSON.stringify(S));
    Z.nettoyer();
  }
  {
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); suivre(Z);
    let lache; const verrou = new Promise(r => { lache = r; });
    Z.mail.arriere = async () => { await verrou; return []; };
    const p1 = Z.camille.reprendreArriere(30);
    v('une reprise à la fois', (await Z.camille.reprendreArriere(30)).raison, 'deja_en_cours');
    vrai('…et elle se voit (repriseEnCours, pour la route)', Z.camille.repriseEnCours() === true);
    lache(); await p1;
    const Z2 = monter({ modes: { camille: 'pause' }, claude: () => QUESTION }); suivre(Z2);
    v('Camille en pause : la reprise ne démarre pas', (await Z2.camille.reprendreArriere(30)).ok, false);
    Z.nettoyer(); Z2.nettoyer();
  }
  {
    /* (gardien) la reprise prend au plus la MOITIÉ des plafonds du jour */
    const j = new Date(Date.UTC(2026, 9, 23, 9, 0, 0)).toISOString().slice(0, 10);
    const reg = { mids: {}, jour: { j, brouillons: 15, examens: 0, domaines: {}, prevenu: {} } };
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION, avant: D => fs.writeFileSync(path.join(D, 'agents-camille.json'), JSON.stringify(reg)) }); suivre(Z);
    Z.mail.arriere = async () => [poser(Z, { uid: 21, mid: '<p1@banc-3089>' }), poser(Z, { uid: 22, mid: '<p2@banc-3089>' })];
    const b = await Z.camille.reprendreArriere(30);
    vrai('à la moitié des réponses du jour, la reprise s’arrête (le courrier du jour garde l’autre) et le bilan dit combien attendent', b.arret === 'part_du_jour' && b.restent === 2 && Z.paroles.some(p => /2 attendent encore/.test(p.texte)), JSON.stringify(b));
    const r = await Z.camille.surNouveauMessage(poser(Z, { uid: 23, mid: '<neuf@banc-3089>' }));
    v('…et un courriel NEUF du jour, lui, est encore traité', r.depose, true);
    Z.nettoyer();
  }

  console.log('\n3. Son outil dans la messagerie');
  {
    const Z = monter({ modes: { camille: 'brouillon' }, claude: () => QUESTION }); suivre(Z);
    let appels = 0; Z.mail.arriere = async () => { appels++; return []; };
    const O = Z.camille.outilsEquipe;
    vrai('l’outil « reprendre_courriels_anciens » existe', O && O.outils.some(t => t.name === 'reprendre_courriels_anciens'));
    v('⛔ demandé par un COLLÈGUE (pas Victor) : refusé', [O.executer('reprendre_courriels_anciens', {}, { de: 'hugo', texte: 'reprends les anciens courriels' }).raison, O.executer('reprendre_courriels_anciens', {}, { de: 'systeme', texte: 'reprends les anciens courriels' }).raison], ['pas_justin', 'pas_justin']);
    v('⛔ Victor, mais une question d\u2019état : refusé', O.executer('reprendre_courriels_anciens', {}, { de: 'victor', texte: 'sur les mails tu en es où ?' }).raison, 'pas_demande');
    const rv = O.executer('reprendre_courriels_anciens', {}, { de: 'victor', texte: '@camille reprends les 35 courriels en attente' });
    await dormir(50);
    vrai('VICTOR le demande (chef d\u2019orchestre, 28 octobre) : la reprise est lancée', rv.ok && appels === 1, JSON.stringify([rv, appels]));
    appels = 0; await dormir(20);
    v('⛔ Justin, mais son message ne parle pas de reprendre le courrier : refusé', [O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: 'merci, top' }).raison, O.executer('reprendre_courriels_anciens', {}, { de: 'justin', texte: 'tu as vu mon mail ?' }).raison], ['pas_demande', 'pas_demande']);
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
    vrai('la route de la Tour existe, réservée au patron, et refuse une seconde reprise (409)', /app\.post\('\/api\/monitor\/agents\/camille\/arriere', monPatronStrict,[\s\S]{0,900}repriseEnCours\(\)\) return res\.status\(409\)/.test(IDX));
    vrai('Camille ratisse l’arriéré SEULE toutes les 30 minutes, silencieuse quand il n’y a rien', /const ratisserArriere = \(\) => \{[\s\S]{0,500}agentCamille\.reprendreArriere\(3650, \{ silencieux: true \}\)[\s\S]{0,300}setInterval\(ratisserArriere, 30 \* 60000\)/.test(IDX));
    const CAMS = fs.readFileSync(path.join(RACINE, 'server', 'agent-camille.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
    vrai('⛔ plus aucune limite d’âge à l’arrivée (« ancien » n’est plus un motif)', !/saute: 'ancien'/.test(CAMS));
    const MAIL = fs.readFileSync(path.join(RACINE, 'server', 'mail.js'), 'utf8');
    vrai('mail.js rend `arriere` et `suiviMarquer`', /return \{ boites: .*arriere, suiviMarquer, suiviClasser, suiviLibre \};/.test(MAIL));
    vrai('⛔ l’arriéré ne lit que les boîtes qu’un agent peut lire (controle@ jamais)', /async function arriere\(jours, opts\) \{[\s\S]{0,1200}if \(!boiteAgentOk\(b\)\) continue;/.test(MAIL));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
