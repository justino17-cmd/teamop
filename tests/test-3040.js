/* ⛔ CE QUE CE FICHIER GARDE — BLOQUER UN CONTACT : SA CONVERSATION RESTE CHEZ MOI EN LECTURE SEULE, ET LUI NE VOIT RIEN CHANGER, MAIS SES MESSAGES NE ME SONT PLUS REMIS
   (Justin, 26 octobre 2026, « fait les 18 » : contacts#1). LE VRAI SERVICE, EN HTTP, À TROIS PERSONNES (modèle `test-943`).

   La règle est celle du SERVICE, pas seulement de l'écran : un écran qui masque ce qu'il reçoit laisserait la notification, l'aperçu, la pastille et la recherche dire que quelqu'un a écrit.
     · Ben (bloqué) écrit toujours : le service répond 201 comme à un envoi ordinaire (un refus lui dirait le blocage) ; son message est RANGÉ, il le voit dans sa conversation ;
     · pour Ana (qui a bloqué) il naît MASQUÉ (`msg_masque`) : ni dans la liste des messages, ni dans l'aperçu, ni dans la pastille, ni dans la recherche, ni par le flux, ni en pièce ; la conversation
       ne REMONTE pas dans sa liste (`dernier_ts` ne bouge pas) ;
     · seule Ana voit `bloque: true` (liste et détail) : Ben n'a aucun champ qui le dise ;
     · Ben rouvre sa conversation, dépose une photo, annonce sa frappe : tout répond comme avant ; une conversation NEUVE avec qui l'a bloqué reste introuvable ;
     · Ana, elle, n'écrit pas à qui elle a bloqué (404 comme avant) ; un GROUPE n'est pas touché (le blocage ne sépare pas deux membres d'un même groupe) ;
     · débloquer rend la conversation inscriptible ET remet les messages à venir — jamais ceux de la période de blocage.
   ⛔ Une absence se prouve sur une population : chaque « Ana ne voit pas » est précédé du contrôle que le même chemin voit un message ordinaire (et le canari, qui porte des lettres hors de
   [0-9a-f], est cherché dans tout ce qu'Ana peut lire). */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const F = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const CANARI = 'ZQXBLOQUEZQX';
const PNG = F.png();
const al = () => Math.random().toString(36).slice(2, 10);

(async () => {
  const og = await T.fauxOpGestion({
    ana: { pass: 'pw-ana-12345', nom: 'Ana Test', actif: true }, ben: { pass: 'pw-ben-12345', nom: 'Ben Test', actif: true }, cleo: { pass: 'pw-cleo-1234', nom: 'Cleo Test', actif: true },
  });
  const svc = await T.lancerService({ urlGestion: og.url, config: { pieces: { photoMax: 200000, vocalMax: 300000, fichierMax: 600000, avatarMax: 100000, bloc: 4096 }, quotas: { piece: { max: 100000, fenetreMs: 3600000 } } } });
  const compte = (login) => T.connecter(svc, og, login, 'pw-' + login + (login === 'cleo' ? '-1234' : '-12345'));
  const lien = async (a, b) => { const l = await a.post('/api/contacts/lien', { max: 1 }); return b.post('/api/liens/accepter', { code: l.j.code }); };
  const directe = async (a, b) => (await a.post('/api/conversations/directe', { uid: b.moi.id })).j.conversation.id;
  const envoyer = (c, conv, corps) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'cid-' + al() }, corps));
  const liste = async (c) => (await c.get('/api/conversations')).j.conversations;
  const ligne = async (c, conv) => (await liste(c)).find(x => x.id === conv) || null;
  const textes = async (c, conv) => ((await c.get('/api/conversations/' + conv + '/messages')).j.messages || []).map(m => m.texte);
  const base = () => T.lireBase(path.join(svc.data, 'msg.db'));
  const requete = (sql, ...a) => { const d = base(); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
  let A, B, C, fl = null;
  try {
    A = await compte('ana'); B = await compte('ben'); C = await compte('cleo');
    await lien(A, B); await lien(A, C); await lien(B, C);
    const DAB = await directe(A, B);
    const G = (await A.post('/api/conversations/groupe', { nom: 'Équipe', membres: [B.moi.id, C.moi.id] })).j.conversation.id;
    fl = await T.flux(A);
    await fl.attendre(e => e.event === 'bonjour');

    /* ═══ 1. AVANT LE BLOCAGE : le chemin ordinaire fonctionne (la population des contrôles suivants) ═══════════════════════════════════════ */
    console.log('Avant le blocage : Ben écrit, Ana le reçoit partout — c\'est la population des contrôles qui suivent');
    {
      const r = await envoyer(B, DAB, { texte: 'avant le blocage' });
      v('Ben écrit : 201', r.code, 201);
      v('Ana le lit dans sa conversation', await textes(A, DAB), ['avant le blocage']);
      const l = await ligne(A, DAB);
      v('… sa liste porte l\'aperçu et UN non lu, sans champ `bloque`', [l.apercu.texte, l.non_lus, 'bloque' in l], ['avant le blocage', 1, false]);
      vrai('… le flux d\'Ana a livré l\'événement « message »', !!(await fl.attendre(e => e.event === 'message' && e.data && e.data.texte === 'avant le blocage')));
      const ch = await A.get('/api/conversations/' + DAB + '/messages/chercher?q=' + encodeURIComponent('avant le'));
      vrai('… la recherche d\'Ana le trouve', ch.code === 200 && JSON.stringify(ch.j).includes('avant le blocage'));
      await A.post('/api/conversations/' + DAB + '/lu', { seq: 1 });
    }
    const avant = await ligne(A, DAB);
    const seqAvant = avant.dernier_seq, tsAvant = avant.dernier_ts;

    /* ═══ 2. ANA BLOQUE BEN : sa conversation reste, lecture seule ═════════════════════════════════════════════════════════════════════════ */
    console.log('\nAna bloque Ben : sa conversation reste chez elle, marquée `bloque` — chez elle seule');
    {
      const b = await A.post('/api/contacts/bloquer', { uid: B.moi.id });
      v('le blocage est posé', b.code, 200);
      const la = await ligne(A, DAB), lb = await ligne(B, DAB);
      vrai('population : la conversation est dans les DEUX listes', !!la && !!lb);
      v('⛔ Ana : `bloque: true` dans sa liste', la.bloque, true);
      v('⛔ Ana : `bloque: true` dans le détail de la conversation', (await A.get('/api/conversations/' + DAB)).j.conversation.bloque, true);
      vrai('⛔ Ben : AUCUN champ `bloque` — ni dans sa liste, ni dans le détail (on ne dit pas à qui est bloqué qu\'il l\'est)', !('bloque' in lb) && !('bloque' in (await B.get('/api/conversations/' + DAB)).j.conversation));
      v('Ana relit toujours les messages d\'avant', await textes(A, DAB), ['avant le blocage']);
      const e = await envoyer(A, DAB, { texte: 'je réponds quand même' });
      v('Ana n\'écrit pas à qui elle a bloqué : 404 comme avant', e.code, 404);
      v('… et rien n\'est parti', await textes(B, DAB), ['avant le blocage']);
    }

    /* ═══ 3. BEN ÉCRIT : tout répond comme avant, rien n'est remis ═════════════════════════════════════════════════════════════════════════ */
    console.log('\nBen écrit : le service répond comme à un envoi ordinaire, et rien n\'est remis à Ana');
    let seqSilence = null;
    {
      /* population : une conversation ARCHIVÉE revient quand l'autre y écrit (règle d'avant) — Ana–Cléo ; ici, Ana archive celle de Ben avant qu'il écrive */
      const DAC = await directe(A, C);
      await envoyer(C, DAC, { texte: 'coucou' });
      await A.post('/api/conversations/' + DAC + '/prefs', { archive: true });
      v('population : Ana archive sa conversation avec Cléo', (await ligne(A, DAC)).archive, true);
      await envoyer(C, DAC, { texte: 'tu es là ?' });
      v('population : Cléo y écrit, la conversation REVIENT (règle d\'avant)', (await ligne(A, DAC)).archive, false);
      await A.post('/api/conversations/' + DAB + '/prefs', { archive: true });
      v('population : Ana archive sa conversation (bloquée) avec Ben', (await ligne(A, DAB)).archive, true);
      const r = await envoyer(B, DAB, { texte: 'après le blocage ' + CANARI });
      v('⛔ Ben : 201 — un refus lui aurait dit le blocage', [r.code, Number.isInteger(r.j.seq), Number.isInteger(r.j.ts)], [201, true, true]);
      seqSilence = r.j.seq;
      vrai('⛔ Ben VOIT son message dans sa conversation (rangé, pas perdu)', (await textes(B, DAB)).some(t => t && t.includes(CANARI)));
      v('population : la ligne existe bien en base, masquée pour Ana seule', requete('SELECT uid FROM msg_masque WHERE conv = ? AND seq = ?', DAB, seqSilence).map(x => x.uid), [A.moi.id]);
      const messagesAna = await A.get('/api/conversations/' + DAB + '/messages');
      vrai('⛔ Ana : le message n\'est PAS dans sa liste de messages', !JSON.stringify(messagesAna.j).includes(CANARI));
      const la = await ligne(A, DAB);
      v('⛔ Ana : ni aperçu neuf ni pastille (l\'aperçu reste « avant le blocage », zéro non lu)', [la.apercu.texte, la.non_lus], ['avant le blocage', 0]);
      v('⛔ Ana : la conversation ne REMONTE pas dans sa liste (`dernier_ts` inchangé), alors que le numéro a bien avancé', [la.dernier_ts, la.dernier_seq > seqAvant], [tsAvant, true]);
      v('⛔ Ana : sa conversation reste ARCHIVÉE (un message qu\'elle ne reçoit pas ne la ressort pas des Archivées)', la.archive, true);
      await A.post('/api/conversations/' + DAB + '/prefs', { archive: false });
      const lb = await ligne(B, DAB);
      vrai('Ben : son aperçu est son message (il ne voit rien changer)', lb.apercu && /après le blocage/.test(lb.apercu.texte));
      const ch = await A.get('/api/conversations/' + DAB + '/messages/chercher?q=' + encodeURIComponent('après le blocage'));
      vrai('⛔ Ana : la recherche ne le trouve pas (elle trouvait « avant le blocage » plus haut)', ch.code === 200 && !JSON.stringify(ch.j).includes(CANARI));
    }

    /* ═══ 4. LES AUTRES GESTES DE BEN : photo, frappe, rouvrir ═════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes autres gestes de Ben répondent comme avant');
    {
      const d = await F.deposer(B, { conv: DAB, genre: 'photo', corps: PNG });
      v('⛔ Ben dépose une photo : 201', d.code, 201);
      const r = await envoyer(B, DAB, { type: 'photo', pieces: [{ id: d.j.id, w: 8, h: 8 }] });
      v('… et l\'envoie : 201', r.code, 201);
      v('Ben relit sa photo (population : la pièce est lisible de son auteur)', (await F.lirePiece(B, d.j.id)).code, 200);
      v('⛔ Ana ne peut PAS la lire (404, comme une pièce qu\'elle n\'a jamais reçue)', (await F.lirePiece(A, d.j.id)).code, 404);
      const s = await B.post('/api/conversations/' + DAB + '/saisie', { actif: true });
      v('⛔ Ben annonce sa frappe : {ok:true} (rien ne part chez Ana)', [s.code, s.j.ok], [200, true]);
      const o = await B.post('/api/conversations/directe', { uid: A.moi.id });
      v('⛔ Ben rouvre sa conversation depuis la fiche d\'Ana : la MÊME (200), pas un 404 qui dirait le blocage', [o.code, o.j && o.j.conversation && o.j.conversation.id], [200, DAB]);
      await C.post('/api/contacts/bloquer', { uid: B.moi.id });
      const neuve = await B.post('/api/conversations/directe', { uid: C.moi.id });
      v('une conversation NEUVE avec quelqu\'un qui l\'a bloqué reste introuvable (personne pour la recevoir)', neuve.code, 404);
      await C.post('/api/contacts/debloquer', { uid: B.moi.id });
    }

    /* ═══ 5. LE GROUPE N'EST PAS TOUCHÉ ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn groupe n\'est pas touché : le blocage ne sépare pas deux membres d\'un même groupe');
    {
      const r = await envoyer(B, G, { texte: 'dans le groupe' });
      v('Ben écrit dans le groupe : 201', r.code, 201);
      v('⛔ Ana le LIT (le blocage est personnel, il ne retire personne d\'un groupe)', (await textes(A, G)).includes('dans le groupe'), true);
      vrai('… et le flux d\'Ana a livré ce message (et PAS celui de la conversation bloquée, plus ancien : les événements sont ordonnés)', !!(await fl.attendre(e => e.event === 'message' && e.data && e.data.texte === 'dans le groupe')) && !fl.evenements.some(e => JSON.stringify(e).includes(CANARI)));
    }

    /* ═══ 6. DÉBLOQUER ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nDébloquer : la conversation redevient inscriptible, les messages à venir arrivent — jamais ceux de la période de blocage');
    {
      const d = await A.post('/api/contacts/debloquer', { uid: B.moi.id });
      v('le déblocage est posé', d.code, 200);
      const la = await ligne(A, DAB);
      v('Ana : plus de `bloque`', 'bloque' in la, false);
      const e = await envoyer(A, DAB, { texte: 'on reprend' });
      v('Ana écrit de nouveau', e.code, 201);
      const r = await envoyer(B, DAB, { texte: 'merci de m\'avoir débloqué' });
      v('Ben écrit', r.code, 201);
      const t = await textes(A, DAB);
      vrai('⛔ Ana reçoit le message d\'APRÈS le déblocage', t.includes('merci de m\'avoir débloqué'));
      vrai('⛔ …mais jamais celui de la période de blocage, même maintenant (masqué pour toujours : « plus remis »)', !t.some(x => x && x.includes(CANARI)) && t.includes('avant le blocage'));
      vrai('… et Ben, lui, relit toute la conversation', (await textes(B, DAB)).some(x => x && x.includes(CANARI)));
    }

    /* ═══ 7. DEUX BLOCAGES : qui bloque n'écrit pas ═════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nDeux blocages croisés : chacun a bloqué l\'autre, aucun n\'écrit');
    {
      await A.post('/api/contacts/bloquer', { uid: B.moi.id });
      await B.post('/api/contacts/bloquer', { uid: A.moi.id });
      const r = await envoyer(B, DAB, { texte: 'et moi aussi' });
      v('⛔ Ben a AUSSI bloqué Ana : il n\'écrit plus (404) — le silence est pour qui est bloqué sans avoir bloqué', r.code, 404);
    }
  } catch (e) {
    vrai('le banc a tourné sans exception', false);
    console.log(e && e.stack || e);
    process.exitCode = 1;
  } finally {
    try { fl && fl.fermer(); } catch (e) { /* déjà fermé */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
