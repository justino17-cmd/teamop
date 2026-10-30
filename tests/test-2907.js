/* ⛔ CE QUE CE FICHIER GARDE — ILS PARLENT DANS LA MESSAGERIE COMME UNE ÉQUIPE (23 octobre 2026, cahier §6).
     Justin : « tous les agents communiquent entre eux s'ils ont besoin » ; « je veux une vraie équipe d'entreprise » ; « une question reçoit LEUR réponse ». Les VRAIS modules — `agents`,
     `conversations`, `agent-equipe` (la messagerie), Léa, Chloé, Camille — montés ensemble ; seuls Claude et la boîte mail sont simulés.
       0. Camille passe la main à Margaux (facture), à Jules (technique), à Hugo (arrêt) PAR LA MESSAGERIE : la mention réveille le collègue, qui lit le message du code et répond lui-même ;
          le message dit la raison, le dossier, une référence — jamais un nom, une adresse, un numéro ni un mot du client ;
       1. Léa et Chloé annoncent dans « Clients » ce qu'elles ont envoyé (sans mention : personne n'est réveillé pour une annonce) ;
       2. une question posée à Léa, Chloé, Camille ou Louis reçoit LEUR réponse, avec leurs chiffres (le bloc Faits « commercial » : des NOMBRES) ;
       3. rien de ce qui s'est dit dans toute la messagerie ne contient une donnée personnelle ; Hugo ne reçoit aucune consigne libre de Camille. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter, CHARTE_OUVERTE } = require('./banc-agents-courrier.js');
const CV = require(path.join(RACINE, 'server', 'conversations.js'));
const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const calme = async () => { for (let i = 0; i < 6; i++) await dormir(40); };
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();

const CHAT = /^Tu es (Margaux|Jules|Hugo|Léa|Chloé|Camille|Louis), l’agent « /;
async function monterEquipe(o) {
  let conv = null, eq = null;
  const proxy = { parler: (...a) => conv.parler(...a) };
  let Z = null;
  const faits = {
    commercial: () => { const b = Z.brouillons.bilan(), l = Z.louis.compter(); return { lea: b.lea || {}, chloe: b.chloe || {}, camille: b.camille || {}, louis: { connaissancesAValider: l.propose, connaissancesValidees: l.valide } }; },
    dossier: async () => null, clients: () => ({ clients: 3 }), courrier: () => ({ aTraiter: 1, enCours: 0 }) };
  Z = monter(Object.assign({ conversations: proxy, dossierDe: () => 'DOS-000123',
    claude: (r) => (CHAT.test(String(r.system)) ? (o.chat ? o.chat(r) : 'Réponse du banc.') : (o.mails ? o.mails(r) : require('./banc-agents-courrier.js').courrielPour(r))) }, o));
  const app = { get() {}, post() {} };
  conv = CV(app, { DATA_DIR: Z.D, monAdmin() {}, monPatronStrict() {}, agents: Z.agents, maintenant: () => Z.horloge.t, surMessage: m => eq.surMessage(m) });
  eq = EQ({ agents: Z.agents, conversations: conv, cerveau: Z.cerveau, faits });
  Z.conv = conv; Z.eq = eq;
  Z.chats = () => Z.recus.filter(r => CHAT.test(String(r.system)));
  Z.fils = () => { const out = {}; for (const f of ['clients', 'equipe', 'plateforme', 'lea', 'chloe', 'camille', 'louis', 'margaux', 'jules', 'hugo']) out[f] = conv.lire(f, 50); return out; };
  return Z;
}
const poser = (Z, o) => { const m = Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<m1@banc-2907>', de: 'client@exemple-2907.fr', deNom: 'Hortense Valmont', pour: 'contact@teamop.fr', objet: 'Sujet',
  texte: 'Bonjour, voici mon souci. Mon numéro 06 12 34 56 78. Cordialement, Hortense Valmont', ts: Z.horloge.t - 3600000, auto: false, protege: false, authentifie: true }, o); Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m; return { boiteId: m.boite, dossier: m.dossier, uid: m.uid }; };

(async () => {
  console.log('\n── 2907 · Ils parlent dans la messagerie comme une équipe ──');

  console.log('\n0. Camille passe la main par la messagerie');
  {
    const Z = await monterEquipe({ charte: CHARTE_OUVERTE, modes: { camille: 'brouillon', margaux: 'brouillon', jules: 'brouillon', hugo: 'brouillon' }, mails: () => 'CATEGORIE : facture',
      chat: (r) => (/^Tu es Margaux/.test(r.system) ? 'Je regarde où il en est.' : /^Tu es Jules/.test(r.system) ? 'Je regarde côté serveur.' : 'Reçu.') });
    await Z.camille.surNouveauMessage(poser(Z, {}));
    await calme();
    let cl = Z.conv.lire('clients', 50);
    const mc = cl.find(m => m.de === 'camille');
    v('Camille parle dans « Clients » : la mention de Margaux est RECONNUE par le serveur, la profondeur 1', [mc.mentions, mc.prof], [['margaux'], 1]);
    v('⛔ Margaux est RÉVEILLÉE par la mention : elle lit le fil (le message du code) et répond ELLE-MÊME, dans « Clients », à la profondeur 2', [Z.chats().map(r => r.system.match(CHAT)[1]), cl.filter(m => m.de === 'margaux').map(m => [m.texte, m.prof])], [['Margaux'], [['Je regarde où il en est.', 2]]]);
    vrai('…ce que Margaux lit : la phrase du code, avec le dossier et la raison — et rien du client', /@Margaux un client écrit à propos d’une facture \(dossier DOS-000123\)/.test(JSON.stringify(Z.chats()[0].messages)) && !/Hortense|Valmont|exemple-2907|06 12|souci/.test(JSON.stringify(Z.chats()[0])), JSON.stringify(Z.chats()[0].messages).slice(0, 300));
    vrai('…aucune tâche n’est fabriquée pour Margaux : une mention n’est pas un ordre (elle décide avec son cerveau)', Z.agents.tachesDe('margaux').length === 0);

    Z.nettoyer();

    const T = await monterEquipe({ charte: CHARTE_OUVERTE, modes: { camille: 'brouillon', margaux: 'brouillon', jules: 'brouillon', hugo: 'brouillon' }, mails: () => 'CATEGORIE : technique',
      chat: (r) => (/^Tu es Jules/.test(r.system) ? 'Je regarde côté serveur.' : 'Reçu.') });
    await T.camille.surNouveauMessage(poser(T, { texte: 'Je n’arrive plus à me connecter.' }));
    await calme();
    cl = T.conv.lire('equipe', 50);
    v('⛔ un problème technique : la main passe par « Équipe » (Jules n’est pas dans « Clients »), Jules est réveillé et répond lui-même', [T.chats().map(r => r.system.match(CHAT)[1]), cl.filter(m => m.de === 'jules').map(m => m.texte)], [['Jules'], ['Je regarde côté serveur.']]);
    T.nettoyer();

    const H = await monterEquipe({ charte: CHARTE_OUVERTE, modes: { camille: 'brouillon', hugo: 'brouillon' }, mails: () => 'CATEGORIE : resiliation', chat: () => 'Je programme la fin à l’échéance.' });
    await H.camille.surNouveauMessage(poser(H, { texte: 'Je veux arrêter mon abonnement.' }));
    await calme();
    cl = H.conv.lire('clients', 50);
    const mh = cl.find(m => m.de === 'camille');
    v('⛔ « je veux arrêter » : le message à Hugo est celui du code, avec le dossier ; Hugo est réveillé et répond', [mh.mentions, /^@Hugo demande fermée déposée : programmer la fin d’abonnement à la fin de la période pour DOS-000123\./.test(mh.texte), H.chats().map(r => r.system.match(CHAT)[1])], [['hugo'], true, ['Hugo']]);
    const taches = JSON.parse(fs.readFileSync(path.join(H.D, 'agents-taches.json'), 'utf8'));
    v('⛔ Hugo ne reçoit AUCUNE consigne libre de Camille : la seule tâche est la demande FERMÉE (un numéro de dossier), de Camille', taches.map(k => [k.vers, k.de, k.type, k.params]), [['hugo', 'camille', 'resilier_fin_periode', { dossier: 'DOS-000123' }]]);
    H.nettoyer();
  }

  console.log('\n1. Léa et Chloé annoncent ce qu’elles ont envoyé');
  {
    const Z = await monterEquipe({ charte: CHARTE_OUVERTE, modes: { lea: 'auto', chloe: 'auto', camille: 'brouillon' } });
    await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'prospect@exemple-2907.fr' });
    await calme();
    const cl = () => Z.conv.lire('clients', 50);
    const ml = cl().find(m => m.de === 'lea');
    vrai('Léa annonce, dans « Clients », qu’elle a répondu seule — avec une référence, sans nom ni adresse', ml && /^J’ai répondu seule à une nouvelle inscription : le contrôle qualité est passé, le courriel est parti\. Référence [0-9a-f]{4}\.$/.test(ml.texte), ml && ml.texte);
    v('⛔ une annonce ne cite PERSONNE : aucun réveil, aucun appel à Claude d’un agent pour y répondre', [ml.mentions, Z.chats().length], [[], 0]);
    await Z.chloe.surReponse({ adresse: 'prospect@exemple-2907.fr', texte: 'Nous sommes 4 techniciens.', mid: '<r@x>', boiteId: 'b-contact', dossier: 'INBOX', uid: 3, authentifie: true });
    await calme();
    const mc = cl().find(m => m.de === 'chloe');
    vrai('Chloé annonce sa proposition : le métier et la formule (des valeurs du référentiel), la référence', mc && /^J’ai envoyé seule une proposition sur mesure à un prospect qui avait répondu à Léa \(métier : Chauffage(?: \/ Climatisation)?\), formule OP GESTION Business\. Contrôle qualité passé\. Référence [0-9a-f]{4}\.$/.test(mc.texte), mc && mc.texte);
    v('…et personne n’est réveillé non plus', Z.chats().length, 0);
    vrai('⛔ elles n’écrivent que dans les fils dont elles sont membres (Clients) — pas « Plateforme », pas le fil d’un collègue', Z.conv.lire('plateforme', 10).length === 0 && Z.conv.lire('margaux', 10).length === 0);
    Z.nettoyer();
  }

  console.log('\n2. Une question posée à Léa, Chloé, Camille ou Louis reçoit LEUR réponse, avec leurs chiffres');
  {
    const Z = await monterEquipe({ charte: CHARTE_OUVERTE, modes: { lea: 'auto', chloe: 'auto', camille: 'brouillon', louis: 'brouillon', margaux: 'brouillon' }, chat: (r) => 'Réponse de ' + r.system.match(CHAT)[1] + '.' });
    await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'prospect@exemple-2907.fr' });
    await Z.chloe.surReponse({ adresse: 'prospect@exemple-2907.fr', texte: 'Nous sommes 4.', mid: '<r@x>', boiteId: 'b-contact', dossier: 'INBOX', uid: 3, authentifie: false });
    await calme();
    Z.recus.length = 0;
    for (const id of ['lea', 'chloe', 'camille', 'louis']) {
      Z.recus.length = 0;
      /* Justin écrit dans le fil privé de l'agent : la route d'envoi n'est pas montée ici, on déclenche comme elle le fait (`surMessage`). */
      await Z.eq.surMessage({ id: 'q' + id, fil: id, de: 'justin', texte: 'Qu’as-tu envoyé aujourd’hui ?', ts: Z.horloge.t, prof: 0, mentions: [] });
      await calme();
      const c = Z.chats();
      v('⛔ ' + id + ' : une seule agente répond à la question qu’on lui pose, c’est ELLE', c.map(r => r.system.match(CHAT)[1].toLowerCase().replace('é', 'e').replace('ë', 'e')), [id]);
      const sys = c[0].system;
      vrai('…et son bloc Faits porte le travail commercial en NOMBRES (envoyés, partis seuls, en attente, à revoir, connaissances)', /commercial \{"lea":\{[^}]*\}/.test(sys) && /"envoyes24h":/.test(sys) && /"partisSeuls24h":1/.test(sys) && /"connaissancesAValider":0/.test(sys), sys.slice(sys.indexOf('commercial')).slice(0, 300));
      vrai('…ses chiffres sont ceux du serveur : Léa a envoyé un courriel seule, Chloé a une proposition en attente', /"lea":\{"envoyes24h":1,"partisSeuls24h":1,"enAttente":0,"aRevoir":0\}/.test(sys) && /"chloe":\{"envoyes24h":0,"partisSeuls24h":0,"enAttente":1,"aRevoir":0\}/.test(sys), sys.slice(sys.indexOf('commercial')).slice(0, 300));
    }
    const missions = { lea: /tu te renseignes sur l’entreprise/, chloe: /proposition sur mesure/, camille: /TOUT le courrier de contact@ et de support@/, louis: /base de connaissances de Léa, de Camille et de Chloé/ };
    for (const id of Object.keys(missions)) {
      Z.recus.length = 0;
      await Z.eq.surMessage({ id: 'm' + id, fil: id, de: 'justin', texte: 'Que fais-tu ?', ts: Z.horloge.t, prof: 0, mentions: [] });
      await calme();
      vrai('la mission de ' + id + ' est celle d’aujourd’hui', missions[id].test(Z.chats()[0].system), Z.chats()[0].system.slice(0, 200));
    }
    Z.nettoyer();
  }

  console.log('\n3. Aucune donnée personnelle dans toute la messagerie');
  const Z_cat = ['facture', 'technique', 'resiliation', 'litige', 'remboursement', 'inconnu'];
  {
    const Z = await monterEquipe({ charte: CHARTE_OUVERTE, modes: { lea: 'auto', camille: 'brouillon', margaux: 'brouillon', jules: 'brouillon', hugo: 'brouillon', louis: 'brouillon' },
      mails: (r) => (/Camille/.test(r.system) ? 'CATEGORIE : ' + (Z_cat.shift() || 'facture') : require('./banc-agents-courrier.js').courrielPour(r)) });
    await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'client@exemple-2907.fr' });
    for (let i = 1; i <= 6; i++) { await Z.camille.surNouveauMessage(poser(Z, { uid: i, mid: '<pii' + i + '@x>', de: 'client' + i + '@exemple-2907.fr', texte: 'Hortense Valmont, 06 12 34 56 78, hortense@secret-2907.fr, IBAN FR76 3000 6000 0112 3456 7890 189. Rappelez-moi.' })); await calme(); }
    const tout = JSON.stringify(Z.fils());
    vrai('(population) la messagerie contient bien des messages de Léa et de Camille à propos de ces courriels', Object.values(Z.fils()).flat().filter(m => m.de === 'camille' || m.de === 'lea').length >= 6, tout.length);
    for (const [nom, jeton] of [['un nom', 'Valmont'], ['un prénom', 'Hortense'], ['une adresse', 'secret-2907'], ['une adresse (symbole)', '@exemple'], ['un téléphone', '06 12 34'], ['un IBAN', 'FR76'], ['un mot du client', 'Rappelez']]) vrai('⛔ ' + nom + ' : nulle part dans les fils', !tout.includes(jeton), jeton);
    Z.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
