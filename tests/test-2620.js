/* ⛔ CE QUE CE FICHIER GARDE — L'HÔTE PAR INTÉRIM NE TERMINE PAS LA RÉUNION POUR TOUS (lot p01, `n#10`, reste de `securite#0`, 17 octobre 2026 ; le VRAI service, parlé en HTTP).

   `test-2400` garde que l'invité qui entre avant l'organisatrice (hôte par intérim, grade 2) n'exclut, ne verrouille, ne règle ni n'enregistre. Il restait un geste que ni le lot m01 (l'intérim) ni le
   lot m16 (la réunion terminée) n'avaient tranché : « Terminer pour tous ». `salleTerminer` demandait le grade d'hôte (`salleCommandant(id, par, GRADE_HOTE)`) SANS refuser l'intérimaire — alors que
   le refus existe pour tous les autres gestes qu'on ne défait pas. Mesuré : Dan, simple invité arrivé en avance, fermait la réunion de tous (200 `{ok:true}`) avant même qu'Ana ait paru, et le compte
   rendu partait à la fin de la séance. La porte, pas les armes : l'intérimaire tient l'entrée, il ne ferme pas la maison.

     1. L'INTÉRIMAIRE (Dan, entré le premier) : « terminer » → 403 `interdit`, et RIEN n'est écrit — la salle court encore, Cléo (déjà dedans) y est toujours, l'appel n'est pas fini ;
     2. ⛔ CONTRE-ÉPREUVES (sans elles le refus pourrait venir de n'importe où) : l'organisatrice qui entre ensuite termine (200), pour tous ; et si elle entre la PREMIÈRE, un simple participant
        reste refusé (l'état d'avant) ;
     3. un co-hôte nommé n'est pas un hôte : il n'a jamais pu terminer, et ne le peut toujours pas (403) — le refus de l'intérimaire n'a pas déplacé cette frontière.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : avant chaque « rien n'est écrit », la population que le geste aurait changée est comptée. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const JOUR = 86400000;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const dit = (rep) => [rep.code, rep.j && rep.j.error];

(async () => {
  const svc = await T.lancerService({ horloge: true, config: { quotas: { reunion: { max: 1000, fenetreMs: 3600000 }, rejoindre_code: { max: 1000, fenetreMs: 3600000 } }, appels: { balayageMs: 1000, perduMs: 600000 } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: () => Date.now() });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const appel = (sid) => { const d = brut(); try { return d.prepare('SELECT etat, motif FROM appel WHERE id = ?').get(sid) || null; } finally { d.close(); } };
  const ligne = (sid, uid) => { const d = brut(); try { return d.prepare('SELECT statut, grade FROM appel_part WHERE appel = ? AND uid = ?').get(sid, uid) || null; } finally { d.close(); } };
  try {
    const ana = pers('Ana'), dan = pers('Dan'), cleo = pers('Cleo'), eve = pers('Eve');
    const a1 = cl(ana), d1 = cl(dan), c1 = cl(cleo), e1 = cl(eve);
    for (const p of [dan, cleo, eve]) S.contactLier(ana.id, p.id);
    for (const p of [ana, cleo, eve]) S.contactLier(dan.id, p.id);
    const maintenant = Date.now();
    const programmer = async () => (await a1.post('/api/reunions', { titre: 'Point', debut: maintenant + 2 * 60000, fin: maintenant + 62 * 60000, invites: [dan.id, cleo.id, eve.id], notifier: false })).j.reunion.id;
    const POST = (c, sid, geste, corps) => c.post('/api/salles/' + sid + '/' + geste, corps || {});

    /* ═══ 1. L'INTÉRIMAIRE NE TERMINE PAS ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Dan, invité nommé, entre avant l\'organisatrice : il ne termine pas la réunion pour tous');
    const rid = await programmer();
    const rd = await d1.post('/api/reunions/' + rid + '/rejoindre', {});
    const sid = rd.j.appel && rd.j.appel.id;
    v('Dan entre le premier : hôte par intérim (grade 2, `interim`)', [rd.code, rd.j.appel.moi.grade, rd.j.appel.moi.interim], [200, 2, true]);
    const rc = await c1.post('/api/reunions/' + rid + '/rejoindre', {});
    v('Cléo entre ensuite (200) : la salle a deux personnes dedans', [rc.code, ligne(sid, dan.id).statut, ligne(sid, cleo.id).statut], [200, 'present', 'present']);
    v('(population) la salle court : ni finie, ni motif', appel(sid), { etat: 'en_cours', motif: null });
    v('⛔ Dan (intérim) : « terminer pour tous » → 403 interdit (avant : 200, la réunion fermée à tous)', dit(await POST(d1, sid, 'terminer')), [403, 'interdit']);
    v('… et RIEN n\'est écrit : la salle court toujours, Dan et Cléo y sont encore', [appel(sid), ligne(sid, dan.id).statut, ligne(sid, cleo.id).statut], [{ etat: 'en_cours', motif: null }, 'present', 'present']);
    v('… Cléo (simple participante) ne le peut pas non plus (403)', dit(await POST(c1, sid, 'terminer')), [403, 'interdit']);

    /* ═══ 2. CONTRE-ÉPREUVES ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nContre-épreuves : l\'organisatrice termine ; sans elle, le refus reste le même');
    const ra = await a1.post('/api/reunions/' + rid + '/rejoindre', {});
    v('Ana (l\'organisatrice) entre : hôte, pas intérimaire ; Dan retombe à 0', [ra.code, ra.j.appel.moi.grade, !!ra.j.appel.moi.interim, ligne(sid, dan.id).grade], [200, 2, false, 0]);
    v('⛔ Dan (grade 0 désormais) → toujours 403 interdit', dit(await POST(d1, sid, 'terminer')), [403, 'interdit']);
    const t = await POST(a1, sid, 'terminer');
    v('⛔ Ana termine pour tous : 200 — le geste existe, il est à elle', [t.code, t.j && t.j.ok], [200, true]);
    v('… la séance est finie « termine » pour tous', appel(sid), { etat: 'fini', motif: 'termine' });

    console.log('\nUn co-hôte nommé n\'est pas un hôte');
    const rid2 = await programmer();
    const ra2 = await a1.post('/api/reunions/' + rid2 + '/rejoindre', {});
    const sid2 = ra2.j.appel.id;
    await c1.post('/api/reunions/' + rid2 + '/rejoindre', {}); await d1.post('/api/reunions/' + rid2 + '/rejoindre', {});
    v('Ana nomme Cléo co-hôte (200, grade 1)', [(await POST(a1, sid2, 'cohote', { uid: cleo.id, actif: true })).code, ligne(sid2, cleo.id).grade], [200, 1]);
    v('Cléo (co-hôte) ne termine pas non plus (403) — la frontière n\'a pas bougé', [dit(await POST(c1, sid2, 'terminer')), appel(sid2).etat], [[403, 'interdit'], 'en_cours']);

    /* l'organisatrice entre la première : un invité arrivé ensuite reste refusé (l'état d'avant) */
    { const r = await a1.get('/api/appels'); if (r.j && r.j.actif) await a1.post('/api/appels/' + r.j.actif.id + '/quitter', {}); }          // Ana quitte la salle d'avant (on n'est que dans une salle à la fois)
    const rid3 = await programmer();
    const ra3 = await a1.post('/api/reunions/' + rid3 + '/rejoindre', {});
    const rd3 = await e1.post('/api/reunions/' + rid3 + '/rejoindre', {});
    v('Eve entre après Ana : grade 0, et « terminer » → 403 interdit', [rd3.j.appel.moi.grade, dit(await POST(e1, ra3.j.appel.id, 'terminer')), appel(ra3.j.appel.id).etat], [0, [403, 'interdit'], 'en_cours']);
  } finally {
    await svc.arreter();
  }
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
