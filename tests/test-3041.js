/* ⛔ CE QUE CE FICHIER GARDE — DEUX PHRASES QUE LA LISTE DES CONVERSATIONS DISAIT MAL, ET QUE LE SERVICE DOIT DIRE (Justin, 26 octobre 2026, « fait les 18 » : groupes#2 et groupes#3).
   LE VRAI SERVICE, EN HTTP, À TROIS PERSONNES (modèle `test-961`).

   · groupes#2 — la dernière ligne d'un groupe est souvent un message SYSTÈME (« Léa a ajouté Hugo »). La liste n'en disait que « Activité du groupe » : l'aperçu ne portait ni la méta du
     message ni le nom de la personne visée. Il porte désormais `meta` (ce que le fil porte déjà, relu chez un membre qui y a droit) et `pour` (la personne visée, même PARTIE du groupe : « Hugo
     a quitté le groupe » doit nommer Hugo) ; l'auteur (`par`) paraît aussi pour une ligne système. Un message ordinaire ne porte ni `meta` ni `pour`.
   · groupes#3 — un canal SUPPRIMÉ par son administrateur se disait « retiré » : chaque membre reçoit désormais un événement `retire` marqué `supprime` (la page dit « supprimé »). Quitter ou
     être retiré d'un canal, lui, reste un `retire` ordinaire, SANS le marqueur.
   ⛔ Une absence se prouve sur une population : chaque « sans marqueur » est précédé du contrôle que le même chemin rend bien un événement. */
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const al = () => Math.random().toString(36).slice(2, 10);

(async () => {
  const og = await T.fauxOpGestion({
    ana: { pass: 'pw-ana-12345', nom: 'Ana Test', actif: true }, ben: { pass: 'pw-ben-12345', nom: 'Ben Test', actif: true }, cleo: { pass: 'pw-cleo-1234', nom: 'Cleo Test', actif: true },
  });
  const svc = await T.lancerService({ urlGestion: og.url });
  const compte = (login) => T.connecter(svc, og, login, 'pw-' + login + (login === 'cleo' ? '-1234' : '-12345'));
  const lien = async (a, b) => { const l = await a.post('/api/contacts/lien', { max: 1 }); return b.post('/api/liens/accepter', { code: l.j.code }); };
  const liste = async (c) => (await c.get('/api/conversations')).j.conversations;
  const ligne = async (c, conv) => (await liste(c)).find(x => x.id === conv) || null;
  let A, B, C, flB = null;
  try {
    A = await compte('ana'); B = await compte('ben'); C = await compte('cleo');
    await lien(A, B); await lien(A, C);

    /* ═══ 1. LA LIGNE SYSTÈME DE LA LISTE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Une ligne système de la liste porte de quoi faire une phrase : la méta, la personne visée, l\'auteur');
    const G = (await A.post('/api/conversations/groupe', { nom: 'Équipe', membres: [B.moi.id] })).j.conversation.id;
    {
      const l = await ligne(B, G);
      v('population : la dernière ligne du groupe est la ligne système de sa création', [l.apercu.type, l.apercu.meta && l.apercu.meta.k], ['systeme', 'groupe_cree']);
      v('… son auteur (`par`) est nommé : Ana', l.apercu.par && l.apercu.par.id, A.moi.id);
      vrai('… un message système sans personne visée n\'a PAS de `pour`', !('pour' in l.apercu));
      await A.post('/api/conversations/' + G + '/membres/ajouter', { uids: [C.moi.id] });
      const l2 = await ligne(B, G);
      v('⛔ Ana ajoute Cleo : l\'aperçu de Ben dit `membre_ajoute`, la personne visée (Cleo, avec son nom) et l\'auteur (Ana)', [l2.apercu.type, l2.apercu.meta.k, l2.apercu.meta.uid === C.moi.id, l2.apercu.pour && l2.apercu.pour.id, l2.apercu.pour && l2.apercu.pour.prenom, l2.apercu.par && l2.apercu.par.id],
        ['systeme', 'membre_ajoute', true, C.moi.id, 'Cleo Test', A.moi.id]);
      await C.post('/api/conversations/' + G + '/quitter', {});
      const l3 = await ligne(B, G);
      v('⛔ Cleo QUITTE le groupe : la ligne est `membre_parti`, et Cleo est nommée alors qu\'elle n\'en est plus membre (« Cleo a quitté le groupe »)', [l3.apercu.meta.k, l3.apercu.pour && l3.apercu.pour.id], ['membre_parti', C.moi.id]);
      const r = await B.post('/api/conversations/' + G + '/messages', { cid: 'cid-' + al(), texte: 'un message ordinaire' });
      const l4 = await ligne(A, G);
      vrai('population : un message ordinaire arrive (201), et son aperçu ne porte NI `meta` NI `pour`', r.code === 201 && l4.apercu.type === 'texte' && !('meta' in l4.apercu) && !('pour' in l4.apercu));
      v('… et il garde son auteur (`par`), comme avant', l4.apercu.par && l4.apercu.par.id, B.moi.id);
    }

    /* ═══ 2. UN CANAL SUPPRIMÉ SE DIT « SUPPRIMÉ » ══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn canal supprimé : chaque membre reçoit `retire` AVEC `supprime` ; quitter un canal privé reste un `retire` ordinaire');
    {
      const e = await A.post('/api/espaces', { nom: 'Boîte ' + al() });
      const E = e.j.espace.id;
      const inv = await A.post('/api/espaces/' + E + '/invitations', {});
      await B.post('/api/invitations/accepter', { code: inv.j.code });
      await C.post('/api/invitations/accepter', { code: (await A.post('/api/espaces/' + E + '/invitations', {})).j.code });
      const pub = (await A.post('/api/espaces/' + E + '/canaux', { nom: 'general' })).j.canal;
      const priv = (await A.post('/api/espaces/' + E + '/canaux', { nom: 'direction', prive: true, membres: [B.moi.id, C.moi.id] })).j.canal;
      vrai('population : Ben est membre des DEUX canaux (public et privé)', !!(await ligne(B, pub.id)) && !!(await ligne(B, priv.id)));
      flB = await T.flux(B);
      await flB.attendre(e2 => e2.event === 'bonjour');

      /* quitter un canal privé : un `retire` ordinaire (la population du contrôle « sans marqueur ») */
      const q = await C.post('/api/conversations/' + priv.id + '/quitter', {});
      const flC = await T.flux(C, { lastEventId: 0 });
      const evQ = await flC.attendre(x => x.event === 'retire' && x.data && x.data.conv === priv.id);
      vrai('population : Cleo quitte le canal privé (' + q.code + ') et le flux lui rend `retire`', q.code === 200 && !!evQ);
      vrai('⛔ … SANS `supprime` : elle l\'a quitté, il existe encore', evQ && !('supprime' in evQ.data));
      flC.fermer();

      const s = await A.post('/api/espaces/' + E + '/canaux/' + pub.id + '/supprimer', { confirmation: 'SUPPRIMER' });
      v('Ana supprime le canal public', s.code, 200);
      const ev = await flB.attendre(x => x.event === 'retire' && x.data && x.data.conv === pub.id);
      vrai('⛔ Ben reçoit `retire` pour ce canal', !!ev);
      v('⛔ … et il porte `supprime: true`', ev && ev.data.supprime, true);
      vrai('population : le canal n\'est plus dans la liste de Ben', !(await ligne(B, pub.id)));
    }
  } catch (e) {
    vrai('le banc a tourné sans exception', false);
    console.log(e && e.stack || e);
    process.exitCode = 1;
  } finally {
    try { flB && flB.fermer(); } catch (e) { /* déjà fermé */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
