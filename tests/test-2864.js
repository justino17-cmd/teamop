/* ⛔ CE QUE CE FICHIER GARDE — CE QUI FAIT PARTIR UN BROUILLON, ET LES DEUX ROUTES QUI LE MONTRENT ET LE CORRIGENT (23 octobre 2026).
     Un brouillon de Léa ou de Camille ne part que par UNE porte : la validation de Justin (« Valider et envoyer »), ou — seulement en mode « auto » ET charte
     `repondre_client` ouverte — l'envoi direct, journalisé. Trois moitiés :
       § 0  les VRAIS modules (`tests/banc-agents-courrier.js`), messagerie simulée : l'exécuteur de « envoyer_mail » (une validation envoie UNE fois, une
            seconde ne renvoie pas, un échec se dit sans adresse, une pause n'envoie rien), les routes (le collaborateur lit, le PATRON corrige, le destinataire
            ne change JAMAIS, les bornes), le mode « auto » (fermé par défaut : la validation passe quand même), les 500 entrées, un registre illisible ;
       § 1  `MON_GESTES` : la route de correction est un geste journalisé, la lecture non ;
       § 2  le VRAI serveur (facteur SMTP et fausse boîte IMAP de banc, faux Claude) : l'inscription publique → le brouillon → la correction → « Valider et
            envoyer » → UN courriel au facteur, avec la signature du Courrier et une copie dans « Envoyés » ; la demande d'application (portail, vraie session)
            réécrit le brouillon qui attend ; auto + charte fermée (le défaut) = validation, puis charte ouverte par le patron = envoi direct. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter, COURRIEL, COURRIEL_TOKA, pourToka, SIGNATURE, signatureDe, CHARTE_OUVERTE } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const JOUR = 86400000;
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 170000).unref();
const apercu = async (Z, ref, qui) => (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: qui === undefined ? Z.PATRON : qui, query: { refs: ref } }));
/* Accepter = lire l'aperçu puis renvoyer SON empreinte, comme la Tour (la garde d'acceptation l'exige). `empreinte` : une valeur imposée (le test du texte changé), ou null pour n'en envoyer aucune. */
const decider = async (Z, id, decision, qui, empreinte) => {
  const body = { id, decision };
  if (decision === 'accepter') {
    if (empreinte === undefined) {
      const vl = (await Z.validations()).find(x => x.id === id), fil = vl && vl.params && vl.params.fil;
      const b = fil ? (await apercu(Z, fil)).corps : null;
      if (b && b[fil]) body.empreinte = b[fil].empreinte;
    } else if (empreinte !== null) body.empreinte = empreinte;
  }
  return Z.appeler('POST /api/monitor/agents/validations/decider', { tourUser: qui || Z.PATRON, body });
};

(async () => {
  console.log('\n── 2864 · ce qui fait partir un brouillon, et les routes de la Tour ──');

  console.log('\n0. L’exécuteur : une validation envoie UNE fois');
  {
    const Z = monter({ modes: { lea: 'brouillon', camille: 'brouillon' } });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'jean.dupont@client-secret.fr' });
    const id = (await Z.validations())[0].id;
    v('(population) un brouillon attend, rien n’est parti', [(await apercu(Z, r.ref)).corps[r.ref].etat, Z.envoyes.length], ['attente', 0]);
    const a = await decider(Z, id, 'accepter');
    v('Justin valide : 200, exécution « ok »', [a.status, a.corps.validation.statut, a.corps.validation.execution], [200, 'accepte', 'ok']);
    v('⛔ UN envoi, au destinataire du compte, depuis la boîte « contact », avec l’objet et le texte du brouillon', Z.envoyes.length === 1 && [Z.envoyes[0].boiteId, Z.envoyes[0].a, Z.envoyes[0].objet === 'TeamOP — OP GESTION pour votre activité', Z.envoyes[0].texte === (await Z.fichierJson('agents-brouillons.json'))[r.ref].texte, Z.envoyes[0].enReponseA], ['b-contact', 'jean.dupont@client-secret.fr', true, true, null]);
    v('…le brouillon est « envoyé »', [(await apercu(Z, r.ref)).corps[r.ref].etat, Z.fichierJson('agents-brouillons.json')[r.ref].etat], ['envoye', 'envoye']);
    const b = await decider(Z, id, 'accepter');
    v('⛔ une SECONDE validation de la même demande : 409, aucun renvoi', [b.status, Z.envoyes.length], [409, 1]);
    let levee = '';
    try { await Z.brouillons.envoyer(r.ref); } catch (e) { levee = e.message; }
    v('⛔ même appelé directement, l’envoi d’un brouillon déjà parti jette (« déjà envoyé »), aucun renvoi', [levee, Z.envoyes.length], ['brouillon déjà envoyé', 1]);
    v('le journal : validation acceptée, courriel envoyé', ['validation acceptée', 'courriel envoyé'].every(a => Z.journal().some(e => e.agent === 'lea' && e.action === a && e.resultat === 'ok')), true);
    v('un refus de Justin n’envoie rien', await (async () => { const r2 = await Z.lea.surInscription({ entreprise: 'Autre Société', email: 'refus@client-2864.fr' }); const v2 = (await Z.validations()).find(x => x.params.fil === r2.ref); await decider(Z, v2.id, 'refuser'); return [Z.envoyes.length, (await apercu(Z, r2.ref)).corps[r2.ref].etat]; })(), [1, 'attente']);

    console.log('   … une réponse à un mail (Camille) part avec son fil');
    Z.messages['b-support|INBOX|7'] = { uid: 7, dossier: 'INBOX', boite: 'b-support', mid: '<q7@banc-2864>', de: 'prospect@exemple-2864.fr', deNom: '', pour: 'support@teamop.fr', objet: 'Question', texte: 'Que proposez-vous pour une entreprise de nettoyage ?', ts: Z.horloge.t - 1000, auto: false, protege: false };
    const rc = await Z.camille.surNouveauMessage({ boiteId: 'b-support', dossier: 'INBOX', uid: 7 });
    const vc = (await Z.validations()).find(x => x.params.fil === rc.ref);
    await decider(Z, vc.id, 'accepter');
    v('⛔ l’envoi porte le fil (Message-ID, boîte, dossier, uid) et part de la boîte où le mail est arrivé', [Z.envoyes[1].boiteId, Z.envoyes[1].a, Z.envoyes[1].enReponseA], ['b-support', 'prospect@exemple-2864.fr', { mid: '<q7@banc-2864>', boiteId: 'b-support', dossier: 'INBOX', uid: 7 }]);

    console.log('   … un échec d’envoi');
    const E = monter({ modes: { lea: 'brouillon' }, panneEnvoi: true });
    const re = await E.lea.surInscription({ entreprise: 'Toka Clim', email: 'jean.dupont@client-secret.fr' });
    const ide = (await E.validations())[0].id;
    const ae = await decider(E, ide, 'accepter');
    v('l’échec de la messagerie : la décision est enregistrée, l’exécution est « echec »', [ae.status, ae.corps.validation.statut, ae.corps.validation.execution], [200, 'accepte', 'echec']);
    const be = E.fichierJson('agents-brouillons.json')[re.ref];
    v('⛔ …le brouillon n’est PAS fini : il revient « attente » (1 échec), l’erreur est notée SANS l’adresse', [be.etat, be.echecs, /client-secret|jean\.dupont/i.test(be.erreur || '')], ['attente', 1, false]);
    const vE = await E.validations();
    v('⛔ …et une NOUVELLE validation est rouverte pour le même brouillon (l’ancienne reste acceptée)', [vE.length, vE.filter(x => x.statut === 'en_attente').map(x => x.params.fil), /envoi échoué/.test(vE.find(x => x.statut === 'en_attente').resume)], [2, [re.ref], true]);
    vrai('…le journal des agents ne porte aucune adresse', !/client-secret|jean\.dupont/i.test(JSON.stringify(E.journal())), JSON.stringify(E.journal()).slice(0, 300));
    await decider(E, vE.find(x => x.statut === 'en_attente').id, 'accepter');
    await decider(E, (await E.validations()).find(x => x.statut === 'en_attente').id, 'accepter');
    const bf = E.fichierJson('agents-brouillons.json')[re.ref];
    v('⛔ trois échecs au total : l’échec devient définitif (« echec »), plus de validation ouverte', [bf.etat, bf.echecs, (await E.validations()).filter(x => x.statut === 'en_attente').length], ['echec', 3, 0]);
    let l2 = ''; try { await E.brouillons.envoyer(re.ref); } catch (e) { l2 = e.message; }
    v('⛔ un brouillon en échec définitif ne repart pas tout seul (« en échec »)', l2, 'brouillon déjà en échec');
    E.nettoyer();

    console.log('   … une pause posée entre la demande et la validation');
    const P = monter({ modes: { lea: 'brouillon' } });
    const rp = await P.lea.surInscription({ entreprise: 'Toka Clim', email: 'p@pause-2864.fr' });
    await P.appeler('POST /api/monitor/agents/pause', { tourUser: P.PATRON, body: { pause: true } });
    const ap = await decider(P, (await P.validations())[0].id, 'accepter');
    v('⛔ en PAUSE, accepter est REFUSÉ (409, la demande reste en attente) : rien ne part, et le brouillon n’est pas laissé sans validation', [ap.status, /pause/.test(ap.corps.error), P.envoyes.length, P.fichierJson('agents-brouillons.json')[rp.ref].etat, (await P.validations())[0].statut], [409, true, 0, 'attente', 'en_attente']);
    await P.appeler('POST /api/monitor/agents/pause', { tourUser: P.PATRON, body: { pause: false } });
    const ap2 = await decider(P, (await P.validations())[0].id, 'accepter');
    v('…la pause levée, la MÊME validation s’accepte et le courriel part', [ap2.status, ap2.corps.validation.execution, P.envoyes.length], [200, 'ok', 1]);
    P.nettoyer();

    console.log('   … deux envois SIMULTANÉS du même brouillon');
    let ouvert = null;
    const Q = monter({ modes: { lea: 'brouillon' } });
    const lent = Q.mail.envoyerAgent;
    Q.mail.envoyerAgent = async (x) => { await new Promise(r => setTimeout(r, 80)); return lent(x); };
    const rq = await Q.lea.surInscription({ entreprise: 'Toka Clim', email: 'q@simul-2864.fr' });
    const rs = await Promise.allSettled([Q.brouillons.envoyer(rq.ref), Q.brouillons.envoyer(rq.ref)]);
    v('⛔ un seul des deux part, l’autre est refusé (« envoi déjà en cours »)', [rs.filter(x => x.status === 'fulfilled').length, rs.filter(x => x.status === 'rejected' && /déjà en cours/.test(x.reason.message)).length, Q.envoyes.length], [1, 1, 1]);
    Q.nettoyer(); void ouvert;
    Z.nettoyer();
  }

  console.log('\n1. Les deux routes de la Tour');
  {
    const Z = monter({ modes: { lea: 'brouillon' } });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'jean.dupont@client-secret.fr' });
    const ref = r.ref;
    v('LIRE : un collaborateur le peut', (await apercu(Z, ref, Z.COLLAB)).status, 200);
    v('LIRE : un anonyme non (401)', (await apercu(Z, ref, null)).status, 401);
    v('LIRE : la réponse porte destinataire, objet, texte, source, entreprise, état, l’empreinte du texte, le nombre d’échecs et la signature DE L’AGENT, le verdict du contrôle qualité et l’authentification — pas l’objet du mail reçu, pas de fil',
      Object.keys((await apercu(Z, ref)).corps[ref]).sort(), ['a', 'agent', 'authentifie', 'controle', 'echecs', 'empreinte', 'entreprise', 'etat', 'objet', 'signature', 'source', 'texte']);
    v('LIRE : une référence mal formée ou inconnue est ignorée (jamais une erreur qui dit ce qui existe)', (await apercu(Z, ref + ',../etc/passwd,br000000000000,' + 'x'.repeat(40))).corps, { [ref]: (await apercu(Z, ref)).corps[ref] });
    const cinquante = []; for (let i = 0; i < 60; i++) cinquante.push('br' + String(i).padStart(12, '0'));
    v('⛔ LIRE : les noms que porte tout objet (constructor, __proto__, toString, hasOwnProperty) ne répondent pas comme des brouillons', (await apercu(Z, 'constructor,__proto__,toString,hasOwnProperty,valueOf')).corps, {});
    v('LIRE : sans référence, une réponse vide', (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: Z.PATRON, query: {} })).corps, {});
    void cinquante;
    const OK = { ref, objet: 'Objet corrigé par Justin', texte: 'Texte corrigé par Justin, avec assez de mots.' };
    v('⛔ CORRIGER : un collaborateur est refusé (403), rien ne bouge', [(await Z.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: Z.COLLAB, body: OK })).status, (await apercu(Z, ref)).corps[ref].objet === 'Objet corrigé par Justin'], [403, false]);
    v('⛔ CORRIGER : un anonyme est refusé (403)', (await Z.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: null, body: OK })).status, 403);
    for (const [nom, corps, code] of [['une référence inconnue', { ref: 'br000000000000', objet: 'o', texte: 't' }, 404], ['une référence qui n’a pas la forme', { ref: '../../x', objet: 'o', texte: 't' }, 404],
      ['un objet qui n’est pas un texte', { ref, objet: 5, texte: 't' }, 400], ['un texte absent', { ref, objet: 'o' }, 400], ['un objet vide', { ref, objet: '   ', texte: 't' }, 400], ['un texte vide', { ref, objet: 'o', texte: ' \n ' }, 400],
      ['un objet de 201 caractères', { ref, objet: 'x'.repeat(201), texte: 't' }, 400], ['un texte de 20 001 caractères', { ref, objet: 'o', texte: 'x'.repeat(20001) }, 400]])
      v('CORRIGER : ' + nom + ' → ' + code, (await Z.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: Z.PATRON, body: corps })).status, code);
    v('CORRIGER : les bornes exactes passent (objet 200, texte 20 000)', (await Z.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: Z.PATRON, body: { ref, objet: 'x'.repeat(200), texte: 'y'.repeat(20000) } })).status, 200);
    const m = await Z.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: Z.PATRON, body: Object.assign({ a: 'pirate@evil-2864.example', agent: 'camille', source: 'courrier', etat: 'envoye', boiteId: 'b-support', enReponseA: { mid: '<x>' } }, OK) });
    v('le patron corrige : 200, l’aperçu rendu est le nouveau', [m.status, m.corps.brouillon.objet, m.corps.brouillon.texte], [200, OK.objet, OK.texte]);
    const reg = Z.fichierJson('agents-brouillons.json')[ref];
    v('⛔ le DESTINATAIRE ne change JAMAIS, ni l’agent, la source, l’état, la boîte ou le fil — même si le corps les propose', [reg.a, reg.agent, reg.source, reg.etat, reg.boiteId, reg.enReponseA], ['jean.dupont@client-secret.fr', 'lea', 'inscription', 'attente', 'b-contact', null]);
    vrai('le journal note la correction (par qui, sans le texte)', Z.journal().some(e => e.agent === 'lea' && e.action === 'brouillon corrigé' && e.qui === 'Justin') && !/Texte corrigé/.test(JSON.stringify(Z.journal())));
    await decider(Z, (await Z.validations())[0].id, 'accepter');
    v('⛔ le texte envoyé est celui de Justin', [Z.envoyes[0].objet, Z.envoyes[0].texte], [OK.objet, OK.texte]);
    v('CORRIGER un brouillon déjà parti : 409, rien ne change', [(await Z.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: Z.PATRON, body: { ref, objet: 'tard', texte: 'trop tard' } })).status, Z.fichierJson('agents-brouillons.json')[ref].objet], [409, OK.objet]);

    console.log('   … registre illisible');
    const I = monter({ modes: { lea: 'brouillon' }, avant: D => fs.writeFileSync(path.join(D, 'agents-brouillons.json'), '{pas du json') });
    v('registre des brouillons illisible : la lecture dit 503 (jamais « aucun brouillon »)', (await apercu(I, 'br000000000000')).status, 503);
    v('…la correction aussi, et le fichier n’est pas écrasé', [(await I.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: I.PATRON, body: { ref: 'br000000000000', objet: 'o', texte: 't' } })).status, fs.readFileSync(path.join(I.D, 'agents-brouillons.json'), 'utf8')], [503, '{pas du json']);
    v('…et envoyer jette', await I.brouillons.envoyer('br000000000000').then(() => 'parti', e => e.message), 'registre des brouillons illisible');
    I.nettoyer();
    Z.nettoyer();
  }

  console.log('\n2. Le mode « auto » : la charte est FERMÉE par défaut (Justin l\'ouvre dans la Tour), le mode et le contrôle qualité décident encore');
  {
    const Z = monter({ modes: { lea: 'auto' } });
    v('(population) la charte, par défaut, laisse « répondre seul » FERMÉ', Z.direction.autorise('repondre_client'), { auto: false, raison: 'brouillon' });
    const r2 = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'a2@auto-2864.fr' });
    v('⛔ mode auto mais charte FERMÉE (le défaut, Justin ne l’a pas ouverte) : une VALIDATION, rien ne part', [r2.voie, Z.envoyes.length, (await Z.validations()).length], ['validation', 0, 1]);
    const ouvre = await Z.appeler('POST /api/monitor/agents/charte', { tourUser: Z.PATRON, body: { gestes: { repondre_client: { auto: true } } } });
    v('(population) le patron OUVRE le geste « répondre seul »', ouvre.status, 200);
    const r1 = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'a1@auto-2864.fr' });
    v('mode AUTO, charte ouverte par Justin, contrôle « bon » : envoi DIRECT, aucune validation de plus', [r1.voie, r1.controle, Z.envoyes.length, Z.envoyes[0] && Z.envoyes[0].a, (await Z.validations()).length], ['direct', 'bon', 1, 'a1@auto-2864.fr', 1]);
    vrai('…journalisé (« réponse envoyée sans validation »)', Z.journal().some(e => e.agent === 'lea' && e.action === 'réponse envoyée sans validation' && e.resultat === 'ok'));
    v('…et le registre garde le brouillon comme « envoyé »', Z.fichierJson('agents-brouillons.json')[r1.ref].etat, 'envoye');
    Z.nettoyer();

    const B = monter({ modes: { lea: 'brouillon' }, charte: CHARTE_OUVERTE });
    const rb = await B.lea.surInscription({ entreprise: 'Toka Clim', email: 'b@auto-2864.fr' });
    v('⛔ charte ouverte mais Léa en BROUILLON : validation (le mode décide aussi)', [rb.voie, B.envoyes.length], ['validation', 0]);
    B.nettoyer();

    const I = monter({ modes: { lea: 'auto' }, charte: CHARTE_OUVERTE, avant: D => fs.writeFileSync(path.join(D, 'agents-charte.json'), '{charte illisible') });
    const ri = await I.lea.surInscription({ entreprise: 'Toka Clim', email: 'i@auto-2864.fr' });
    v('⛔ charte ILLISIBLE : rien ne passe en auto, validation', [ri.voie, I.envoyes.length], ['validation', 0]);
    I.nettoyer();

    const F = monter({ modes: { camille: 'auto' }, charte: CHARTE_OUVERTE, panneEnvoi: true });
    F.messages['b-contact|INBOX|1'] = { uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<f1@x>', de: 'prospect@exemple-2864.fr', objet: 'Question', texte: 'Que proposez-vous ?', ts: F.horloge.t - 1000, auto: false, protege: false, authentifie: true };
    const rf = await F.camille.surNouveauMessage({ boiteId: 'b-contact', dossier: 'INBOX', uid: 1 });
    const rbF = F.fichierJson('agents-brouillons.json')[Object.keys(F.fichierJson('agents-brouillons.json'))[0]];
    v('⛔ auto + charte ouverte + messagerie en panne : pas d’exception ; le brouillon n’est PAS perdu — il revient « attente » et UNE validation s’ouvre pour Justin', [rf.depose, rf.voie, rbF.etat, rbF.echecs, (await F.validations()).filter(x => x.statut === 'en_attente').length], [true, 'validation', 'attente', 1, 1]);
    F.nettoyer();
  }

  console.log('\n3. Le registre : 500 entrées, les envoyées partent d’abord');
  {
    const avant = D => {
      const o = {};
      /* les 100 plus VIEUX attendent encore Justin ; les ENVOYÉS sont plus récents : si l'élagage allait « au plus vieux » tout court, il jetterait un brouillon qui attend */
      const e = (i, etat, cree) => ({ agent: 'lea', a: 'x' + i + '@y.fr', objet: 'o', texte: 't', enReponseA: null, boiteId: 'b-contact', source: 'inscription', entreprise: '', objetRecu: '', cree, etat });
      for (let i = 0; i < 100; i++) o['br' + String(i).padStart(12, '0')] = e(i, 'attente', 1000 + i);
      for (let i = 100; i < 200; i++) o['br' + String(i).padStart(12, '0')] = e(i, 'envoye', 5000 + i);
      for (let i = 200; i < 500; i++) o['br' + String(i).padStart(12, '0')] = e(i, 'attente', 2000 + i);
      fs.writeFileSync(path.join(D, 'agents-brouillons.json'), JSON.stringify(o));
    };
    const Z = monter({ modes: { lea: 'brouillon' }, avant });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'neuf@cinq-cents-2864.fr' });
    const reg = Z.fichierJson('agents-brouillons.json'), refs = Object.keys(reg);
    v('(population) 500 entrées avant, 500 après (jamais plus)', refs.length, 500);
    vrai('⛔ …la plus ancienne ENVOYÉE (la 100e) est partie ; la toute plus ancienne, qui ATTEND Justin, est restée avec les 400 autres', !reg['br000000000100'] && !!reg['br000000000000'] && Object.values(reg).filter(e => e.etat === 'attente').length === 401 && !!reg[r.ref], Object.values(reg).filter(e => e.etat === 'attente').length);
    Z.nettoyer();
  }

  console.log('\n3 bis. Le rangement : un fichier illisible n’est JAMAIS réécrit, un fichier absent se crée');
  {
    const os = require('os');
    const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bfichier-'));
    const fich = require(path.join(RACINE, 'server', 'agents-fichier.js'))(D);
    fs.writeFileSync(path.join(D, 'casse.json'), '{pas du json'); fs.writeFileSync(path.join(D, 'mauvaise-forme.json'), '[1,2]');
    v('absent : la valeur par défaut, lisible', [fich.charger('absent.json', { a: 1 }), fich.illisible('absent.json')], [{ a: 1 }, false]);
    v('illisible (JSON cassé) : la valeur par défaut ET le fichier est déclaré illisible', [fich.charger('casse.json', {}), fich.illisible('casse.json')], [{}, true]);
    v('illisible (un tableau là où l’on attend un objet) : pareil', [fich.charger('mauvaise-forme.json', {}), fich.illisible('mauvaise-forme.json')], [{}, true]);
    v('⛔ écrire un fichier illisible REFUSE et ne touche à rien', [fich.ecrire('casse.json', { neuf: true }), fs.readFileSync(path.join(D, 'casse.json'), 'utf8'), fs.existsSync(path.join(D, 'casse.json.tmp'))], [false, '{pas du json', false]);
    v('écrire un fichier absent le crée (temporaire puis renommage : aucun .tmp ne reste)', [fich.ecrire('absent.json', { a: 2 }), JSON.parse(fs.readFileSync(path.join(D, 'absent.json'), 'utf8')), fs.existsSync(path.join(D, 'absent.json.tmp'))], [true, { a: 2 }, false]);
    try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n4. MON_GESTES : la correction est un geste journalisé, la lecture non');
  {
    const SRC = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
    const i0 = SRC.indexOf('const MON_GESTES = {'), i1 = i0 < 0 ? -1 : SRC.indexOf('\n};', i0);
    vrai('(population) la table MON_GESTES est trouvée', i0 > 0 && i1 > i0);
    let T = {}; try { T = require('vm').runInNewContext('(' + SRC.slice(i0 + 'const MON_GESTES = '.length, i1 + 2) + ')'); } catch (e) { vrai('la table se lit', false, e.message); }
    vrai('« agents/brouillons/modifier » est un geste, avec une phrase', typeof T['agents/brouillons/modifier'] === 'string' && T['agents/brouillons/modifier'].length > 10, T['agents/brouillons/modifier']);
    vrai('…la phrase ne contient ni adresse ni texte de brouillon (c’est un libellé fixe)', !/@/.test(T['agents/brouillons/modifier']));
    const code = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('(population) la route de correction est déclarée en POST et gardée par monPatronStrict dans le fichier réel', /app\.post\('\/api\/monitor\/agents\/brouillons\/modifier', monPatronStrict/.test(require('fs').readFileSync(path.join(RACINE, 'server', 'agents-brouillons.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ')));
    vrai('…la lecture est en GET avec monAdmin (une lecture n’est pas un geste)', /app\.get\('\/api\/monitor\/agents\/brouillons', monAdmin/.test(require('fs').readFileSync(path.join(RACINE, 'server', 'agents-brouillons.js'), 'utf8')));
    void code;
  }

  console.log('\n4 bis. mail.js SEUL : l’envoi d’un agent (destinataire, budget à part de celui de la Tour)');
  {
    const os = require('os');
    const { facteur } = require('./banc-serveur-courrier.js');
    const f = facteur();
    const port = await new Promise(res => f.s.listen(0, '127.0.0.1', () => res(f.s.address().port)));
    const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bmail-'));
    fs.writeFileSync(path.join(D, 'mail-boites.json'), JSON.stringify([{ id: 'b-x', email: 'contact@banc-2864.fr', pass: 'x', imapHost: '127.0.0.1', imapPort: 1, smtpHost: '127.0.0.1', smtpPort: port, nom: 'TEAM OP', ts: Date.now(), par: 'banc' }]));
    const routes = {}, app = { use() {} };
    for (const m of ['get', 'post', 'put', 'delete', 'patch']) app[m] = (p, ...h) => { routes[m.toUpperCase() + ' ' + p] = h; };
    const quotaOk = (map, cle, max, fen) => { const q = map.get(cle) || { n: 0, reset: Date.now() + fen }; if (Date.now() > q.reset) { q.n = 0; q.reset = Date.now() + fen; } q.n++; map.set(cle, q); return q.n <= max; };
    const passe = (q, r, n) => n();
    const m = require(path.join(RACINE, 'server', 'mail.js'))(app, { DATA_DIR: D, monAdmin: passe, monPatronStrict: passe, monStr: (x, n) => String(x == null ? '' : x).slice(0, n), pousseNotif: async () => 0, quotaOk, jsonGros: passe });
    const refus = async (o) => m.envoyerAgent(o).then(() => 'parti', e => e.message);
    const base = { boiteId: 'b-x', objet: 'Bonjour', texte: 'Texte du courriel.', signature: signatureDe('Léa') };
    v('⛔ un destinataire qui n’est pas UNE adresse simple est refusé : deux adresses, un saut de ligne (injection d’en-tête), des chevrons, rien', [
      await refus(Object.assign({ a: 'a@exemple-2864.fr, b@exemple-2864.fr' }, base)), await refus(Object.assign({ a: 'a@exemple-2864.fr\nBcc: c@exemple-2864.fr' }, base)),
      await refus(Object.assign({ a: 'Nom <a@exemple-2864.fr>' }, base)), await refus(Object.assign({ a: '' }, base)), await refus(Object.assign({ a: 'pas une adresse' }, base))], Array(5).fill('destinataire invalide'));
    v('une boîte inconnue, un texte vide : refusés', [await refus({ boiteId: 'b-inconnue', a: 'a@exemple-2864.fr', objet: 'o', texte: 't' }), await refus(Object.assign({ a: 'a@exemple-2864.fr' }, base, { texte: '  ' }))], ['boîte introuvable', 'message vide']);
    v('(population) rien n’est parti jusque-là', f.recus.length, 0);
    let partis = 0;
    for (let i = 0; i < 30; i++) if ((await refus(Object.assign({ a: 'dest' + i + '@exemple-2864.fr' }, base))) === 'parti') partis++;
    v('(population) trente envois d’agents partent dans l’heure', [partis, f.recus.length], [30, 30]);
    const t31 = await refus(Object.assign({ a: 'dest31@exemple-2864.fr' }, base));
    v('⛔ le trente-et-unième est refusé : « limite d’envoi des agents atteinte (30 par heure) », rien ne part', [/limite d’envoi des agents atteinte \(30 par heure\)/.test(t31), f.recus.length], [true, 30]);
    const res = { code: 200, corps: null, status(c) { this.code = c; return this; }, json(x) { this.corps = x; return this; }, setHeader() {} };
    const hs = routes['POST /api/monitor/mail/envoyer'];
    await hs[hs.length - 1]({ body: { boite: 'b-x', a: 'justin-envoie@exemple-2864.fr', objet: 'De la Tour', texte: 'Écrit par Justin.' }, tourUser: { nom: 'Justin', id: 'u1' } }, res);
    v('⛔ le budget de la TOUR est à part : Justin envoie encore (200), un agent qui boucle ne lui prend pas ses envois', [res.code, res.corps && res.corps.ok, f.recus.length], [200, true, 31]);
    try { f.s.close(); fs.rmSync(D, { recursive: true, force: true }); } catch (e) {}
  }

  if (process.env.BANC_MODULES_SEULS) { console.log('\n(BANC_MODULES_SEULS : le vrai serveur est sauté)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }

  /* ═══ LE VRAI SERVEUR ═══ */
  console.log('\n5. Le vrai serveur : inscription publique → brouillon → correction → « Valider et envoyer » → SMTP');
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); require.resolve('imapflow', { paths: [path.join(RACINE, 'server')] }); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const crypto = require('crypto');
  const { demarrer, dormir } = require('./banc-serveur-courrier.js');
  const { simpleParser } = require(path.join(RACINE, 'server', 'node_modules', 'mailparser'));
  const MARQUE = 'MARQUE-REECRIT-2864';
  const S = await demarrer({ modes: { lea: 'brouillon' }, comptes: true,
    claude: "async (r, n) => { if (n === 1) await new Promise(x => setTimeout(x, 1200)); const c = (" + require('./banc-agents-courrier.js').courrielPour.toString() + ")(r); return (n === 1 || !/Toka Clim/.test(r.messages[0].content)) ? c : c.replace(/Nous avons bien noté que [^\\n]*\\./, 'Nous avons bien noté que Toka Clim est une entreprise de chauffage (" + MARQUE + ").'); }" });
  vrai('le serveur démarre (portail des comptes allumé, fausse boîte, facteur, faux Claude)', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(0, 800)); await S.fin(); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const ADR = 'nora.neuve@exemple-2864.fr';

  /* ⛔ LA ROUTE PUBLIQUE NE DÉCLENCHE PLUS LÉA (relecture adverse du 23 octobre 2026) : elle ne prouve aucune adresse. */
  const mails = async () => Promise.all(S.fact.recus.map(r => simpleParser(r)));
  const ins = await S.public('/api/nouveau-compte', { email: ADR, prenom: 'Zéphyrin', nom: 'Quarantelle', company: 'Toka Clim' });
  vrai('(population) la route publique a servi : elle répond ok et l’avis « Nouveau compte » est parti à l’équipe', ins.s === 200 && ins.j.ok === true && await S.attendre(async () => (await mails()).some(m => /Nouveau compte/.test(String(m.subject || ''))), 8000));
  await dormir(2500);
  v('⛔ …mais Léa n’a PAS été appelée : ni Claude, ni brouillon, ni validation (un anonyme ne prépare aucun courriel à l’adresse de son choix)', [S.claudeRecus().length, ((await S.get('/api/monitor/agents/validations')).j.validations || []).length], [0, 0]);
  for (let k = 0; k < 12; k++) await S.public('/api/nouveau-compte', { email: 'bruit' + k + '@exemple-2864.fr', prenom: 'A', nom: 'B', company: 'Bruit ' + k });
  await dormir(1500);
  v('⛔ …même douze inscriptions factices de plus : aucun appel à Claude, aucune validation (le plafond du jour de Léa et sa file ne s’épuisent plus)', [S.claudeRecus().length, ((await S.get('/api/monitor/agents/validations')).j.validations || []).length], [0, 0]);

  console.log('   … une adresse PROUVÉE : la première synchro du compte vérifié prépare le brouillon');
  const H = crypto.createHash('sha256').update('teamop-portail:mot-de-passe-du-banc-2864').digest('hex');
  await S.public('/api/compte/creer', { email: ADR, h: H, prenom: 'Nora', nom: 'Neuve', societe: 'Toka Clim' });
  let jv = '';
  await S.attendre(async () => { for (const m of await mails()) { const x = /mode=verifyEmail&jeton=([0-9a-f]{64})/.exec(String(m.text || '')); if (x) { jv = x[1]; return true; } } return false; }, 10000);
  vrai('(population) le lien de confirmation du portail est parti au facteur', !!jv);
  const cxAvant = await S.public('/api/compte/connexion', { email: ADR, h: H });
  const syAvant = await S.http('POST', '/api/clients/sync', cxAvant.j.jeton || 'a'.repeat(64), { entreprise: 'Toka Clim', nom: 'Nora Neuve', demandes: [] });
  await dormir(1500);
  v('⛔ une session dont l’adresse n’est PAS encore prouvée : la synchro est refusée (403) et Léa n’est pas appelée', [syAvant.s === 403 || syAvant.s === 401, S.claudeRecus().length], [true, 0]);
  await S.public('/api/compte/verifier', { jeton: jv });
  const cx = await S.public('/api/compte/connexion', { email: ADR, h: H });
  vrai('(population) une session du portail, adresse prouvée', /^[0-9a-f]{64}$/.test(cx.j.jeton || ''), JSON.stringify(cx.j).slice(0, 100));
  const t0 = Date.now();
  const sy0 = await S.http('POST', '/api/clients/sync', cx.j.jeton, { entreprise: 'Toka Clim', nom: 'Nora Neuve', prenom: 'Nora', nomFam: 'Neuve', tel: '06 55 44 33 22', demandes: [] });
  const dt = Date.now() - t0;
  v('⛔ la synchro répond tout de suite, sans attendre Claude (Claude met 1,2 s)', [sy0.s, dt < 1000], [200, true]);
  vrai('(population) la validation de Léa arrive ensuite', await S.attendre(async () => ((await S.get('/api/monitor/agents/validations')).j.validations || []).length > 0, 15000));
  const val = (await S.get('/api/monitor/agents/validations')).j.validations;
  v('UNE validation, de Léa, envoyer_mail, au résumé composé par le code', [val.length, val[0].agent, val[0].type, val[0].resume, val[0].params.boite], [1, 'lea', 'envoyer_mail', 'Réponse à l’inscription de Toka Clim — à relire avant envoi', 'contact']);   // (le contrôle qualité est « bon » : aucune marque « À REVOIR »)
  const ref = val[0].params.fil;
  const tout = JSON.stringify(S.claudeRecus());
  for (const [nom, jeton] of [['l’adresse', 'exemple-2864'], ['le début de l’adresse', 'nora.neuve'], ['le prénom', 'Zéphyrin'], ['le nom', 'Quarantelle'], ['le téléphone', '55 44 33']]) vrai('⛔ ' + nom + ' ne part PAS chez Claude', !tout.includes(jeton));
  const ap = (await S.get('/api/monitor/agents/brouillons?refs=' + ref)).j[ref];
  v('l’aperçu (route de la Tour) : destinataire = l’adresse du compte, source « inscription »', [ap.a, ap.source, ap.etat], [ADR, 'inscription', 'attente']);
  v('rien n’est parti vers le client (le brouillon attend ; seuls l’avis à l’équipe et le lien de confirmation ont voyagé)', (await mails()).filter(m => /nora\.neuve@/.test(String((m.to && m.to.text) || '')) && /OP GESTION pour votre activité/.test(String(m.subject || ''))).length, 0);
  const sy1 = await S.http('POST', '/api/clients/sync', cx.j.jeton, { entreprise: 'Toka Clim', nom: 'Nora Neuve', demandes: [] });
  await dormir(1200);
  v('⛔ une seconde synchro (la fiche existe déjà) ne rappelle pas Claude : une réponse par adresse', [sy1.s, S.claudeRecus().length], [200, 1]);

  console.log('   … la demande d’application (portail) réécrit le brouillon qui attend');
  const sy = await S.http('POST', '/api/clients/sync', cx.j.jeton, { entreprise: 'Toka Clim', nom: 'Nora Neuve', prenom: 'Nora', nomFam: 'Neuve', tel: '06 55 44 33 22', demandes: [{ app: 'OP GESTION', formule: 'Pro', statut: 'en attente', date: Date.now(), besoin: 'suivre les fluides frigorigènes, appelez le 06 55 44 33 22', users: '5', metier: 'chauffage' }] });
  v('la synchro du portail répond 200', sy.s, 200);
  vrai('le brouillon est RÉÉCRIT (même référence, le texte à jour)', await S.attendre(async () => (((await S.get('/api/monitor/agents/brouillons?refs=' + ref)).j[ref] || {}).texte || '').includes(MARQUE), 15000));
  v('⛔ toujours UNE validation, la même', ((await S.get('/api/monitor/agents/validations')).j.validations || []).map(x => x.params.fil), [ref]);
  const q2 = S.claudeRecus()[1] ? S.claudeRecus()[1].messages[0].content : '';
  vrai('la seconde requête porte le métier, les utilisateurs, la formule et le besoin — sans le téléphone ni le nom', /Métier : Chauffage(?! \/)/.test(q2) && /utilisateurs souhaité : 5/.test(q2) && /Formule demandée : pro/.test(q2) && /fluides frigorigènes/.test(q2) && !/06 55 44|Neuve|nora/i.test(JSON.stringify(S.claudeRecus()[1])), q2);

  console.log('   … la correction de Justin, puis « Valider et envoyer »');
  const corr = { ref, objet: 'Notre proposition pour Toka Clim', texte: 'Bonjour,\n\nTexte relu par Justin, avec la précision demandée par le client.\n\nBien cordialement,' };
  const rA = await S.http('POST', '/api/monitor/agents/brouillons/modifier', S.TA, corr);
  const rN = await S.http('POST', '/api/monitor/agents/brouillons/modifier', '', corr);
  v('⛔ un collaborateur : 403 ; un anonyme : refusé', [rA.s, rN.s === 401 || rN.s === 403], [403, true]);
  const rP = await S.http('POST', '/api/monitor/agents/brouillons/modifier', S.TP, corr);
  v('le patron corrige : 200', rP.s, 200);
  const lj = (await S.get('/api/monitor/journal')).j;
  vrai('⛔ la correction est inscrite au journal des gestes de la Tour (qui, quoi), sans le texte', JSON.stringify(lj).includes('a corrigé un brouillon de réponse') && !/Texte relu par Justin/.test(JSON.stringify(lj)), JSON.stringify(lj).slice(0, 200));
  const nClaude = S.claudeRecus().length;
  await S.public('/api/clients/sync', {});   // (sans session : refusé, sans effet)
  const sy2 = await S.http('POST', '/api/clients/sync', cx.j.jeton, { entreprise: 'Toka Clim', nom: 'Nora Neuve', demandes: [{ app: 'OP GESTION', formule: 'Pro', statut: 'en attente', date: 1, besoin: 'x', users: '5', metier: 'chauffage' }, { app: 'OP GESTION', formule: 'Business', statut: 'en attente', date: 2, besoin: 'y', users: '8', metier: 'chauffage' }] });
  await dormir(1500);
  v('⛔ une AUTRE demande n’écrase pas la correction de Justin (et Claude n’est pas rappelé)', [sy2.s, (await S.get('/api/monitor/agents/brouillons?refs=' + ref)).j[ref].texte, S.claudeRecus().length], [200, corr.texte, nClaude]);

  const empr = (await S.get('/api/monitor/agents/brouillons?refs=' + ref)).j[ref].empreinte;
  const dec = await S.post('/api/monitor/agents/validations/decider', { id: val[0].id, decision: 'accepter', empreinte: empr });
  v('« Valider et envoyer » : 200, exécution « ok »', [dec.s, dec.j.validation && dec.j.validation.execution], [200, 'ok']);
  const recus = (await mails()).filter(m => /nora\.neuve@exemple-2864\.fr/.test(String((m.to && m.to.text) || '')) && /Notre proposition/.test(String(m.subject || '')));
  v('⛔ le facteur reçoit UN courriel de la proposition, au destinataire du compte', recus.length, 1);
  const m1 = recus[0] || { text: '', subject: '', to: { text: '' }, from: { text: '' } };
  v('…objet et texte de Justin, puis la signature DE LÉA (jamais celle du Courrier de Justin), ajoutée par le serveur UNE fois', [m1.subject, String(m1.text).includes('Texte relu par Justin'), (String(m1.text).match(/Léa — Assistante de TeamOP/g) || []).length, /Bien cordialement,\s+Léa — Assistante de TeamOP\s+contact@banc-courrier\.fr · https:\/\/teamop\.fr\/\?de=lea/.test(String(m1.text)), /Justin Biret|L'équipe TEAM OP/.test(String(m1.text))], ['Notre proposition pour Toka Clim', true, 1, true, false]);
  vrai('…l’expéditeur affiché est celui de Léa', /Léa/.test(String(m1.from.text)), m1.from.text);
  vrai('…depuis la boîte de contact', /contact@banc-courrier\.fr/.test(String(m1.from.text)), m1.from.text);
  const copie = (S.imap().boites['contact@banc-courrier.fr'].ajouts || []).length;
  vrai('une copie est rangée dans « Envoyés » de la boîte', copie >= 1, copie);
  const dec2 = await S.post('/api/monitor/agents/validations/decider', { id: val[0].id, decision: 'accepter', empreinte: empr });
  await dormir(500);
  v('⛔ une seconde validation : 409, et le facteur ne reçoit rien de plus', [dec2.s, (await mails()).filter(m => /Notre proposition/.test(String(m.subject || ''))).length], [409, 1]);

  console.log('   … auto : charte FERMÉE (le défaut d\'un serveur neuf) = validation ; charte ouverte par le patron = envoi direct');
  v('(population) Léa passe en AUTO (depuis brouillon)', (await S.post('/api/monitor/agents/mode', { agent: 'lea', mode: 'auto' })).s, 200);
  const reponseA = async re => (await mails()).filter(m => re.test(String((m.to && m.to.text) || '')) && /OP GESTION pour votre activité/.test(String(m.subject || '')));   // (le lien de confirmation du portail part aussi à l’adresse : on vise la RÉPONSE de Léa)
  const enAttente = async () => ((await S.get('/api/monitor/agents/validations')).j.validations || []).filter(x => x.statut === 'en_attente').length;
  vrai('(population) ce serveur n\'a PAS d\'`agents-charte.json` : la charte est celle du défaut', !fs.existsSync(path.join(S.D, 'agents-charte.json')));
  const avantAuto = await enAttente();
  await S.inscrire('auto1@exemple-2864.fr', 'Auto Un');
  vrai('une nouvelle validation attend', await S.attendre(async () => (await enAttente()) > avantAuto, 15000));
  await dormir(500);
  v('⛔ AUTO + contrôle bon + adresse prouvée, mais la charte est FERMÉE (le défaut : Justin ne l\'a pas ouverte) : validation, rien au facteur', [await enAttente(), (await reponseA(/auto1@/)).length], [avantAuto + 1, 0]);
  vrai('…et le journal des agents ne dit PAS « réponse envoyée sans validation »', !(((await S.get('/api/monitor/agents/journal?agent=lea')).j.journal) || []).some(e => e.action === 'réponse envoyée sans validation'));
  v('(population) le patron OUVRE « répondre seul »', (await S.post('/api/monitor/agents/charte', { gestes: { repondre_client: { auto: true } } })).s, 200);
  await S.inscrire('auto2@exemple-2864.fr', 'Auto Deux');
  vrai('⛔ AUTO + charte OUVERTE par le patron + contrôle bon + adresse prouvée : le courriel part SANS validation', await S.attendre(async () => (await reponseA(/auto2@/)).length > 0, 15000));
  v('…et aucune validation de plus ne s’est ouverte', await enAttente(), avantAuto + 1);
  vrai('…le journal des agents le note', (((await S.get('/api/monitor/agents/journal?agent=lea')).j.journal) || []).some(e => e.action === 'réponse envoyée sans validation'));
  vrai('le journal du serveur ne porte ni adresse en clair, ni prénom, ni nom, ni texte de courriel (ses lignes d’adresse sont masquées)', !/Zéphyrin|Quarantelle|nora\.neuve@|Texte relu|auto1@|auto2@|fluides/.test(S.journal()), S.journal().slice(-300));
  await S.fin();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
