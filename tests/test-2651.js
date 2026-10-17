/* ══ OP MESSAGES — UNE RÉUNION A UNE COULEUR D'AVATAR, PAS DEUX (lot p04 : conversations n#3) ══════════════════════════════════════════════════════════════════
   La conversation d'une RÉUNION portait deux teintes : la liste et l'en-tête de la conversation la calculent sur l'identifiant de la CONVERSATION (`c_…`, `resume`/`ouvrir` de la source), la feuille
   « Infos » (la fiche de la réunion) sur celui de la RÉUNION (`r_…`, `indexAvatarPage(d.id)`). Les deux hachages sont les mêmes, les entrées diffèrent : une teinte ici, une autre là. Le commentaire
   de la source le dit déjà (« une réunion garde la couleur de sa conversation »). La fiche prend donc l'identifiant de la conversation que la réunion porte (`d.conv`).
   Ce que ce fichier garde : le VRAI service, la VRAIE source (liste, en-tête d'une conversation, fiche de la réunion) et la VRAIE fonction de la page qui choisit la teinte de la fiche.
   ⛔ Un identifiant tiré au sort tombe sur la même teinte une fois sur six : HUIT réunions sont jouées, et le banc exige d'abord que deux identifiants au moins donnent des teintes DIFFÉRENTES
   (la population qui rend le contrôle capable de tomber). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const localDans = (t, tz) => { const p = {}; for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t))) p[x.type] = x.value; return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute; };

(async () => {
  const NOMS = { ana: 'Ana Martin', ben: 'Ben Durand' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  try {
    const P = {}; for (const l of Object.keys(NOMS)) P[l] = await T.connecter(svc, og, l, MDP[l]);
    const l = await P.ana.post('/api/contacts/lien', {}); await P.ben.post('/api/liens/accepter', { code: l.j.code });
    const nav = T.navigateur(svc.base);
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const S = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
    await S.connexion('ana', MDP.ana); const d0 = await S.demarrer();
    if (!d0.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d0));
    sources.push(S);

    /* ── la VRAIE fonction de la page qui choisit la teinte de la fiche ── */
    const M = { indexAvatarPage: ligne('const indexAvatarPage = '), indexAvatarReunion: ligne('const indexAvatarReunion = ') };
    const ctx = { String, console }; vm.createContext(ctx);
    let F = null;
    try { vm.runInContext(Object.values(M).filter(Boolean).join('\n') + '\nthis.F = { page: indexAvatarPage, teinte: typeof indexAvatarReunion === "function" ? indexAvatarReunion : null };', ctx); F = ctx.F; } catch (e) { console.log('  ✗ ' + e.message); }
    vrai('(population) la page a sa fonction de hachage', !!F && typeof F.page === 'function');
    /* avant le correctif la fiche hachait l'identifiant de la réunion : sans fonction dédiée, le banc rejoue ce chemin-là pour tomber sur la teinte, pas sur une absence */
    const teinteFiche = d => F.teinte ? F.teinte(d) : F.page(d.id);

    /* ── huit réunions, vues par la liste, l'en-tête et la fiche ── */
    const debut = Date.now() + 3600000, H = 3600000;
    const lignes = [];
    for (let i = 0; i < 8; i++) {
      const r = await P.ana.post('/api/reunions', { titre: 'Point ' + i, debut: localDans(debut + i * 86400000, 'Europe/Paris'), fin: localDans(debut + i * 86400000 + H, 'Europe/Paris'), tz: 'Europe/Paris', invites: [P.ben.moi.id], rappels: [], notifier: false });
      if (r.code !== 201 && r.code !== 200) throw new Error('la réunion ' + i + ' n\'est pas créée (' + r.code + ')');
      lignes.push(r.j.reunion.id);
    }
    let liste = [];
    await T.attendre(async () => { liste = await S.lister(); return liste.filter(c => c.type === 'reunion').length >= 8; }, 8000, 50);
    const fiches = [];
    for (const id of lignes) {
      const d = await S.reunion(id);
      const dansListe = liste.find(c => c.id === d.conv);
      const entete = await S.ouvrir(d.conv);
      fiches.push({ id, conv: d.conv, liste: dansListe && dansListe.avatar, entete: entete && entete.avatar, fiche: teinteFiche(d), d });
    }
    vrai('(population) chaque réunion a sa conversation dans la liste et une en-tête', fiches.length === 8 && fiches.every(f => typeof f.liste === 'number' && typeof f.entete === 'number'));
    vrai('(population) les identifiants de réunion et de conversation donnent bien des teintes différentes pour au moins une réunion (sinon le banc ne peut pas tomber)',
      fiches.some(f => f.liste !== F.page(f.id)));
    v('l\'en-tête d\'une conversation de réunion a la teinte de la liste (une seule source)', fiches.map(f => f.entete), fiches.map(f => f.liste));
    v('⛔ la feuille « Infos » (la fiche de la réunion) a la MÊME teinte que la liste et l\'en-tête, pour chacune des huit réunions', fiches.map(f => f.fiche), fiches.map(f => f.liste));
    /* le repli : une fiche sans conversation (un service d'avant) garde une teinte, celle de la réunion */
    if (F && F.teinte) vrai('(repli) une fiche sans `conv` garde une teinte valide (celle de la réunion)', Number.isInteger(F.teinte({ id: 'r_x' })) && F.teinte({ id: 'r_x' }) >= 0 && F.teinte({ id: 'r_x' }) < 6);
    /* la fiche de la page appelle bien cette fonction (le code, commentaires retirés) */
    const i = JS.indexOf('function htmlFiche('), j = i < 0 ? -1 : JS.indexOf('\n  }\n', i);
    vrai('(population) le corps de `htmlFiche` est trouvé', i > 0 && j > i);
    vrai('⛔ `htmlFiche` écrit la teinte par `indexAvatarReunion(d)` — plus par `indexAvatarPage(d.id)`', i > 0 && /indexAvatarReunion\(d\)/.test(JS.slice(i, j)) && !/indexAvatarPage\(d\.id\)/.test(JS.slice(i, j)));
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  for (const s of sources) { try { s.arreter && s.arreter(); } catch (e) {} }
  await svc.arreter(); await og.fermer();
  fin();
})();
