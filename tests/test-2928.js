/* ⛔ CE QUE CE FICHIER GARDE — UN DÉCLENCHEUR FORGEABLE RESTE BORNÉ (revue du 23 octobre 2026, constats rejoués puis corrigés).
     Trois routes publiques se laissent écrire par n'importe qui : le courrier refusé pour un espace que l'appelant choisit (`X-Teamop-Kh` + un teamId qui n'existe pas), les rapports des
     appareils (`/api/monitor/report`, type « erreur » et `count` jusqu'à 500), les erreurs d'application. Avant la correction, une seule requête anonyme donnait un push 🔴 à Justin, un incident
     « haute », un diagnostic de Jules (un appel à Claude) et un point de Victor devenu urgent ; trente incidents forgés d'un appel donnaient dix notifications.
     Les VRAIS modules (`banc-plateforme.js`), Max, Jules, Nina et Victor ensemble :
       · « inconnu » : jamais critique, jamais d'incident, aucune notification, aucun appel à Claude ; un vieil « invalide » ne se réveille PAS sur un « inconnu » forgé (`mailRefus.ts` ne dit pas
         quel motif a refusé : Nina compte ce qui monte, motif par motif) ; un vrai « invalide » qui monte est critique, et cinq épisodes dans la journée ne sonnent qu'UNE fois, n'ouvrent que DEUX incidents ;
       · trente incidents d'appareils forgés : au plus six signalements par jour de Max, AUCUNE notification de Jules, un point de Victor qui n'est pas urgent ; corroborés par le serveur (une personne
         vérifiée au journal des connexions + trois entreprises), ils sonnent — trois fois par jour au plus, le point de Victor devient urgent. */
const { monter, SANTE_BONNE, S } = require('./banc-plateforme');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); process.exit(1); }, 90000).unref();
const O = require(S('plateforme-outils.js'));

function equipe(o) {
  o = o || {};
  const B = monter(Object.assign({ claude: q => (/^Tu es Victor/.test(String(q.system)) ? new Error('Victor écrit le texte du code dans ce banc') : 'Diagnostic du banc : la cause la plus probable est une régression récente ; relis le journal puis propose un correctif à Justin.') }, o));
  const sante = { j: SANTE_BONNE() };
  const lire = async () => JSON.parse(JSON.stringify(sante.j));
  const eq = require(S('agent-equipe.js'))({ agents: B.agents, conversations: B.conversations, cerveau: B.cerveau, faits: {} });
  const deps = { agents: B.agents, conversations: B.conversations, etat: B.etat, incidents: B.incidents, maintenant: B.maintenant };
  const max = require(S('agent-max.js'))(Object.assign({ sante: lire }, deps));
  const jules = require(S('agent-jules.js'))(Object.assign({ cerveau: B.cerveau, equipe: () => eq }, deps));
  const nina = require(S('agent-nina.js'))(Object.assign({ sante: lire, securite: () => ({ verrousTour: 0, verrousPortail: 0, clesInvalides: 0 }), contrats: { etat: () => null } }, deps));
  const victor = require(S('agent-victor.js'))(Object.assign({ cerveau: B.cerveau, equipe: () => eq, rgpd: () => [], contrats: () => null, courrier: () => null, clients: () => null,
    alarmes: () => ({ ouvertes: 0, critiques: 0 }), qualite: () => null }, deps));
  return Object.assign(B, { sante, max, jules, nina, victor, eq });
}
const sonneries = (B, qui) => B.pousses.filter(p => (qui ? p.titre.includes(qui) : true));
const niveauxDe = (B, f, de) => B.fichierJson('agents-messages.json').filter(m => m.fil === f && m.de === de).map(m => m.niveau);
/* un incident d'appareil FORGÉ : type « erreur », gravité calculée « haute » par `count` seul (aucune entreprise vérifiée) */
const forge = (B, k, plus) => B.issues.push(Object.assign({ id: 'i' + String(k).padStart(12, '0'), signature: 'opgestion|forge-' + k, app: 'opgestion', type: 'erreur', categorie: 'Planning', message: 'x', count: 10 + k,
  firstTs: B.horloge.t - 600000, lastTs: B.horloge.t, entreprises: [{ nom: 'Inventée ' + k, count: 1, gens: [] }], appareils: { a: 1 }, statut: 'nouveau', notes: '', mailEnvoye: false }, plus || {}));
const corrobore = (B, k) => forge(B, k, { entreprises: [{ nom: 'A' + k, count: 4, gens: [{ login: 'p' + k, nom: 'Vérifiée', role: 'patron', count: 4 }] }, { nom: 'B' + k, count: 3, gens: [] }, { nom: 'C' + k, count: 3, gens: [] }] });

console.log('\n── 2928 · un déclencheur forgeable reste borné ──');
(async () => {
  console.log('\n1. Le courrier refusé : « inconnu » ne réveille personne, « invalide » sonne une fois par jour');
  {
    const B = equipe();
    B.sante.j.mailRefus = { n: 0, parMotif: {}, parRoute: {}, ts: 0 };
    await B.nina.passer(); B.avancer(300000);
    B.sante.j.mailRefus = { n: 1, parMotif: { inconnu: 1 }, parRoute: { replies: 1 }, ts: B.horloge.t };     // UNE requête anonyme : un teamId inventé
    await B.nina.passer(); B.avancer(60000); await B.jules.passer(); await B.victor.pointDuMatin({ forcer: true });
    v('⛔ UN « inconnu » forgé : aucune notification (ni Nina, ni Jules, ni Victor), aucun incident, aucun appel à Claude', [B.pousses.length, B.issues.length, B.recus.length], [0, 0, 0]);
    vrai('…il est dit en info, une fois, sans « urgent »', B.fil('plateforme').some(m => m.de === 'nina' && /refus de courrier pour un espace que le serveur ne connaît pas/.test(m.texte)) && !niveauxDe(B, 'nina', 'nina').includes('urgent'), JSON.stringify(B.fil('plateforme').map(m => m.texte)));
    v('…et le point du matin n’est pas urgent (aucun message privé « important » de Victor)', niveauxDe(B, 'victor', 'victor'), []);
    B.nettoyer();
  }
  {
    const B = equipe();
    B.sante.j.mailRefus = { n: 2, parMotif: { invalide: 2 }, parRoute: {}, ts: B.horloge.t - 5 * 3600000 };     // deux vrais refus, il y a cinq heures — la base de Nina
    await B.nina.passer(); B.avancer(5 * 3600000);
    B.sante.j.mailRefus = { n: 3, parMotif: { invalide: 2, inconnu: 1 }, parRoute: { replies: 3 }, ts: B.horloge.t };      // un « inconnu » forgé remet `ts` à maintenant
    await B.nina.passer(); await B.jules.passer();
    v('⛔ un vieil « invalide » ne se réveille pas sur un « inconnu » forgé (`mailRefus.ts` ne dit pas QUEL motif)', [B.pousses.length, B.issues.length, B.recus.length], [0, 0, 0]);
    B.nettoyer();
  }
  {
    const B = equipe();
    B.sante.j.mailRefus = { n: 0, parMotif: {}, parRoute: {}, ts: 0 };
    await B.nina.passer();
    let invalides = 0;
    for (let tour = 0; tour < 5; tour++) {
      B.avancer(300000); invalides += 2;
      B.sante.j.mailRefus = { n: invalides, parMotif: { invalide: invalides }, parRoute: { replies: invalides }, ts: B.horloge.t };
      await B.nina.passer(); await B.jules.passer();
      for (let k = 0; k < 4; k++) { B.avancer(300000); await B.nina.passer(); await B.jules.passer(); }          // deux passages clairs : rétabli, puis l'épisode suivant
    }
    const reveils = sonneries(B, '🔴 Nina').length, nina = B.issues.filter(i => i.agent === 'nina');
    v('⛔ cinq épisodes « courrier refusé » le même jour : Justin n’est RÉVEILLÉ (🔴) qu’une fois', reveils, 1);
    v('⛔ …et le « rétabli » des épisodes sans réveil ne sonne pas non plus (une notification « Nina te parle » pour le seul premier épisode)', sonneries(B, 'Nina te parle').length, 1);
    v('…deux incidents au plus (donc deux diagnostics de Jules au plus) : les trois autres épisodes sont annoncés sans incident', [nina.length, B.recus.length <= 2], [2, true]);
    vrai('(population) les cinq épisodes ont bien eu lieu et ont été annoncés dans « Plateforme »', B.fil('plateforme').filter(m => m.de === 'nina' && /^Des appareils se font refuser leur courrier/.test(m.texte)).length === 5, JSON.stringify(B.fil('plateforme').map(m => m.texte.slice(0, 60))));
    v('…et le message privé des épisodes suivants reste lisible dans son fil (info, sans notification)', niveauxDe(B, 'nina', 'nina').filter(n => n === 'urgent').length, 1);
    B.heure(7, 0, 24);          // le lendemain : le plafond se remet à zéro, un vrai refus sonne de nouveau
    invalides += 2; B.sante.j.mailRefus = { n: invalides, parMotif: { invalide: invalides }, parRoute: {}, ts: B.horloge.t };
    await B.nina.passer();
    v('le lendemain, un vrai refus réveille de nouveau Justin', sonneries(B, '🔴 Nina').length, 2);
    B.nettoyer();
  }

  console.log('\n2. Les incidents d’appareils : forgés, ils ne sonnent pas ; corroborés par le serveur, ils sonnent trois fois par jour au plus');
  {
    const B = equipe();
    for (let k = 1; k <= 30; k++) forge(B, k);
    for (let tour = 0; tour < 16; tour++) { await B.max.passer(); B.avancer(60000); await B.jules.passer(); B.avancer(240000); }
    const signalements = B.fil('plateforme').filter(m => m.de === 'max' && /^Un incident de gravité haute vient d’arriver des appareils/.test(m.texte)).length;
    v('⛔ TRENTE incidents forgés (count 11 à 40, une entreprise inventée chacun) : Max en signale six au plus dans la journée', signalements, 6);
    v('⛔ …Jules ne fait SONNER aucun téléphone (« Jules te parle ») : ses lectures sont en « info »', [sonneries(B, 'Jules').length, niveauxDe(B, 'jules', 'jules').filter(n => n !== 'info').length], [0, 0]);
    vrai('(population) Jules a bien lu les six incidents signalés dans son fil', niveauxDe(B, 'jules', 'jules').length === 6, niveauxDe(B, 'jules', 'jules').length);
    await B.victor.pointDuMatin({ forcer: true });
    v('⛔ …et le point du matin n’est pas urgent : Victor le dit dans « Équipe » (le nombre d’incidents hauts y paraît), sans message privé ni notification', [niveauxDe(B, 'victor', 'victor'), sonneries(B, 'Victor').length, B.fil('equipe').some(m => m.de === 'victor' && /30 de gravité haute/.test(m.texte))], [[], 0, true]);
    B.nettoyer();
  }
  {
    const B = equipe();
    for (let k = 1; k <= 8; k++) corrobore(B, k);
    for (let tour = 0; tour < 6; tour++) { await B.max.passer(); B.avancer(60000); await B.jules.passer(); B.avancer(240000); }
    v('⛔ HUIT incidents corroborés (une personne vérifiée au journal des connexions + trois entreprises) : Jules sonne trois fois au plus dans la journée', [sonneries(B, 'Jules').length, niveauxDe(B, 'jules', 'jules').filter(n => n === 'important').length], [3, 3]);
    vrai('(population) …et il a bien lu les six signalés de Max (les trois derniers en info)', niveauxDe(B, 'jules', 'jules').length === 6, niveauxDe(B, 'jules', 'jules').length);
    await B.victor.pointDuMatin({ forcer: true });
    v('un incident corroboré rend le point de Victor URGENT (message privé « important »)', niveauxDe(B, 'victor', 'victor'), ['important']);
    B.nettoyer();
  }
  {
    const B = equipe();
    forge(B, 1, { entreprises: [{ nom: 'A', count: 4, gens: [{ login: 'p', nom: 'Vérifiée', count: 4 }] }] });        // une personne vérifiée, mais UNE seule entreprise
    forge(B, 2, { entreprises: [{ nom: 'A', count: 1, gens: [] }, { nom: 'B', count: 1, gens: [] }, { nom: 'C', count: 1, gens: [] }] });     // trois entreprises inventées, personne de vérifié
    v('⛔ ni « une entreprise vérifiée », ni « trois entreprises sans personne vérifiée » ne suffisent à corroborer', [B.incidents.faits('i000000000001').corrobore, B.incidents.faits('i000000000002').corrobore, B.incidents.compteurs().hauteSure], [false, false, 0]);
    corrobore(B, 3);
    v('…trois entreprises et une personne vérifiée : corroboré, et compté dans les hautes SÛRES', [B.incidents.faits('i000000000003').corrobore, B.incidents.compteurs().haute, B.incidents.compteurs().hauteSure], [true, 3, 1]);
    B.issues.push({ id: 'imaxaaaaaaaa', signature: 'agent|max|x', app: 'serveur', type: 'reseau', agent: 'max', gravite: 'haute', count: 1, firstTs: B.horloge.t, lastTs: B.horloge.t, entreprises: [], appareils: {}, statut: 'nouveau' });
    v('un incident ouvert par UN DE NOS agents est sûr par construction (son texte est le nôtre)', B.incidents.compteurs().hauteSure, 2);
    B.nettoyer();
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack || e)); process.exit(1); });
