/* ══ SONDE — LA CARTE SUIT LE THÈME (v719) ═══════════════════════════════════════════════
   Mesure au NAVIGATEUR ce que le banc ne peut pas voir : l'écran réellement rendu, les
   pastilles réellement présentes, et la teinte réellement calculée sur les tuiles.

   ⛔ Copie LOCALE de beta.html (préfixe elanB_), servie sur 127.0.0.1. Jamais app.html,
      jamais teamop.fr.
   ⛔ Leaflet et les tuiles Google sont SERVIS LOCALEMENT par interception CDP : le
      conteneur n'a pas de réseau sortant pour le navigateur, et sans ça `loadLeaflet()`
      rejette — on mesurerait une page sans carte en croyant mesurer la carte.
   ⛔ L'écran « Connexion requise » (`horsLigneDebut`) est neutralisé : il est OPAQUE et
      plein écran, et tout ce qui est lu après lui montre le panneau, pas l'application.  */
const fs = require('fs'), path = require('path');
const { ouvrir, dormir } = require(path.join(__dirname, 'pilote.js'));
/* Leaflet est téléchargé une fois dans ce dossier :
   mkdir -p scratchpad/leaflet && curl -sS -o scratchpad/leaflet/leaflet.js https://unpkg.com/leaflet@1.9.4/dist/leaflet.js \
     && curl -sS -o scratchpad/leaflet/leaflet.css https://unpkg.com/leaflet@1.9.4/dist/leaflet.css */
const LEAF = __dirname + '/leaflet';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

let ok = 0, ko = 0; const lignes = [];
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b);
  bon ? ok++ : ko++; lignes.push((bon ? '  ✓ ' : '  ✗ ') + t + (bon ? '' : `\n      attendu : ${JSON.stringify(b)}\n      obtenu  : ${JSON.stringify(a)}`)); };
const vrai = (t, c) => v(t, !!c, true);
const faux = (t, c) => v(t, !!c, false);
const titre = t => lignes.push('\n══ ' + t + ' ══\n');

(async () => {
  const S = await ouvrir();

  /* ── interception : Leaflet et les tuiles viennent du disque ── */
  await S.c.envoyer('Fetch.enable', { patterns: [{ urlPattern: '*unpkg.com*' }, { urlPattern: '*google.com/vt*' }] });
  const tuiles = { m: 0, s: 0 };
  S.c.sur(async m => {
    if (m.method !== 'Fetch.requestPaused') return;
    const u = m.params.request.url, id = m.params.requestId;
    try {
      if (/leaflet\.js/.test(u)) return await S.c.envoyer('Fetch.fulfillRequest', { requestId: id, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: fs.readFileSync(LEAF + '/leaflet.js').toString('base64') });
      if (/leaflet\.css/.test(u)) return await S.c.envoyer('Fetch.fulfillRequest', { requestId: id, responseCode: 200,
        responseHeaders: [{ name: 'Content-Type', value: 'text/css' }], body: fs.readFileSync(LEAF + '/leaflet.css').toString('base64') });
      if (/google\.com\/vt/.test(u)) { /lyrs=s/.test(u) ? tuiles.s++ : tuiles.m++;
        return await S.c.envoyer('Fetch.fulfillRequest', { requestId: id, responseCode: 200,
          responseHeaders: [{ name: 'Content-Type', value: 'image/png' }], body: PNG.toString('base64') }); }
      await S.c.envoyer('Fetch.failRequest', { requestId: id, errorReason: 'Failed' });
    } catch (e) {}
  });

  /* ── on neutralise l'écran hors-ligne et on entre dans l'application ── */
  await S.ev(`window.horsLigneDebut=function(){}; try{ _horsLigne=false; }catch(e){}
    const e=document.getElementById('hl-ecran'); if(e) e.remove(); return 1;`);

  const entre = await S.ev(`
    if(!db.users.length){ db.users.push({id:'u1',prenom:'Justin',nom:'B',role:'admin',username:'j',pass:'x',actif:true,pref:{}}); save(); }
    currentUser=db.users[0]; try{ localStorage.setItem(STORE_KEY+'_user', currentUser.id); }catch(e){}
    if(typeof enterApp==='function') enterApp(currentUser); else { document.body.classList.add('logged'); renderNav(); }
    return { user: currentUser.prenom, boxes: (db.boxes||[]).length };`);
  await dormir(600);

  /* ── une box géolocalisée, sinon la carte n'a rien à montrer ── */
  await S.ev(`if(!db.boxes.length) db.boxes.push({id:'b1',nom:'Cuisine',stock:{},_ms:{}});
    db.boxes[0].lat=48.8566; db.boxes[0].lng=2.3522; save(); return 1;`);

  const themePoser = async p => { await S.ev(`setThemePref('${p}'); return 1;`); await dormir(120); };
  const versCarte = async () => { await S.ev(`go('carteBox'); return 1;`); await dormir(1400); };

  /* ⛔ L'écran porte D'AUTRES .chip (le bascule Liste / Carte des box) : compter tous les
     .chip du contenu rendrait 2 et accuserait la barre de porter une pastille de trop. On
     isole la barre de fond — le conteneur .filters qui porte la pastille Satellite.
     ⚠️ Et la clé de rangement se LIT dans la page : la bêta réécrit 'elan_' en 'elanB_',
     donc un nom écrit en dur ici rendrait null et ferait croire à un réglage perdu. */
  const etat = () => S.ev(`
    /* ⛔ setHeader() écrit les actions DEUX FOIS : dans #topbar-actions et dans
       #page-head .ph-actions — une seule des deux est visible selon la mise en page. Et
       AUCUNE des deux n'est dans #content : une sonde qui cherche là rend une liste VIDE,
       et une liste vide passe au vert sur « aucune pastille Jour ». On prend donc tout le
       document, et on ne garde que ce qui est VISIBLE (rectangle non nul). */
    const vis=e=>{ const r=e.getBoundingClientRect(); return r.width>0&&r.height>0; };
    const tous=[...document.querySelectorAll('.chip')];
    const sats=tous.filter(c=>/Satellite/.test(c.textContent)).filter(vis);
    const barres=[...new Set(sats.map(c=>c.closest('.filters')).filter(Boolean))];
    const chips=barres.length?[...barres[0].querySelectorAll('.chip')].filter(vis)
                 .map(c=>({t:c.textContent.trim(),a:c.classList.contains('active')})):[];
    const pane=document.querySelector('.leaflet-tile-pane');
    const img=document.querySelector('.leaflet-tile-pane img');
    const r=sats[0]?sats[0].getBoundingClientRect():null;
    return { chips, barres:barres.length, satsVisibles:sats.length,
             tousChips:tous.filter(vis).length,
             carte: !!document.querySelector('.leaflet-container'), pane: !!pane,
             nuit: !!(pane&&pane.classList.contains('tiles-night')),
             filtre: pane?getComputedStyle(pane).filter:null,
             fond: (typeof mapFond==='function')?mapFond():null,
             theme: effectiveTheme(), pref: localStorage.getItem(PREF_CLES.carte),
             cle: PREF_CLES.carte, haut: r?Math.round(r.height*10)/10:0,
             icone: !!(sats[0]&&sats[0].querySelector('svg.rf-ic')),
             boxesLoc: (db.boxes||[]).filter(b=>b.lat!=null).length,
             tuile: img?img.src.replace(/^https:\\/\\/[^/]+/,''):null };`);
  /* On CLIQUE la pastille au lieu d'appeler setMapSat : c'est l'attribut onclick qu'on écrit
     dans le HTML, et c'est lui qui peut être faux sans que la fonction le soit. */
  const cliquer = () => S.ev(`const c=[...document.querySelectorAll('.chip')]
      .filter(x=>/Satellite/.test(x.textContent))
      .find(x=>{ const r=x.getBoundingClientRect(); return r.width>0&&r.height>0; });
    if(!c) return false; c.click(); return true;`);

  titre('0. LA SONDE REGARDE BIEN QUELQUE CHOSE');
  await themePoser('light'); await versCarte();
  let E = await etat();
  vrai('population : la carte Leaflet est réellement construite', E.carte);
  vrai('population : le volet de tuiles existe', E.pane);
  vrai('population : au moins une tuile a été demandée', (tuiles.m + tuiles.s) > 0);
  v('population : une box géolocalisée existe (sinon la carte n’a rien à montrer)', E.boxesLoc, 1);
  vrai('population : l’écran porte au moins une pastille visible', E.tousChips > 0);
  v('population : la barre de fond de carte est trouvée, une seule fois', E.barres, 1);

  titre('1. LA BARRE : UNE SEULE PASTILLE');
  v('une seule pastille Satellite visible (setHeader l’écrit deux fois)', E.satsVisibles, 1);
  v('une seule pastille DANS la barre de fond de carte', E.chips.length, 1);
  /* ⚠️ L'application remplace l'émoji par une icône SVG (`rf-ic`) : chercher « 🛰️ Satellite »
     dans le texte rend FAUX alors que le bouton dit bien « Satellite ». On lit le texte, et
     on exige l'icône séparément. */
  v('… et elle dit « Satellite »', E.chips[0] && E.chips[0].t, 'Satellite');
  vrai('… avec son icône SVG (l’émoji est remplacé par `rf-ic`)', E.icone);
  faux('⛔ aucune pastille « Jour »', E.chips.some(c => /Jour/.test(c.t)));
  faux('⛔ aucune pastille « Nuit »', E.chips.some(c => /Nuit/.test(c.t)));
  faux('éteinte tant que le satellite n’est pas choisi', E.chips[0] && E.chips[0].a);

  titre('1 bis. AU DOIGT, SUR UN TÉLÉPHONE — ENCOCHES POSÉES');
  /* ⛔ `env(safe-area-inset-*)` vaut 0 dans un navigateur piloté : on les simule, sinon on
     valide une mise en page que personne ne voit. Et `maxTouchPoints` doit être 1–16. */
  await S.c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  try { await S.c.envoyer('Emulation.setSafeAreaInsetsOverride',
    { insets: { top: 47, bottom: 34, left: 0, right: 0, topMax: 47, bottomMax: 34, leftMax: 0, rightMax: 0 } }); } catch (e) {}
  await versCarte();
  const T = await etat();
  vrai('population : la barre est bien rendue sur téléphone', T.chips.length === 1);
  v('⛔ la pastille tient le plancher tactile de 44 px', T.haut >= 44, true);
  lignes.push('      mesuré : ' + T.haut + ' px de haut');
  await S.c.envoyer('Emulation.clearDeviceMetricsOverride');
  await S.c.envoyer('Emulation.setTouchEmulationEnabled', { enabled: false });
  await versCarte();

  titre('2. LE THÈME DÉCIDE — MESURÉ SUR LA TUILE');
  v('thème jour : le fond est « m »', E.fond, 'm');
  faux('⛔ … et le volet n’est PAS teinté', E.nuit);
  v('… le filtre CSS calculé est neutre', E.filtre, 'none');
  vrai('… et la tuile demandée est le plan Google', /lyrs=m/.test(E.tuile || ''));

  await themePoser('dark'); await versCarte(); E = await etat();
  v('thème nuit : le fond est « n »', E.fond, 'n');
  vrai('⛔ … et le volet EST teinté', E.nuit);
  vrai('… le filtre CSS calculé assombrit vraiment', /brightness\(0\.82\)/.test(E.filtre || ''));
  vrai('… la tuile demandée est le MÊME plan Google', /lyrs=m/.test(E.tuile || ''));

  titre('3. ⛔ LA BASCULE DU SOIR — SANS QUITTER L’ÉCRAN');
  /* C'est la demande de Justin : « si c'est en automatique, la journée c'est jour, la nuit
     ça passe en mode nuit ». On ne recharge pas, on ne change pas de rubrique : on change
     le thème pendant que la carte est sous les yeux. */
  await S.ev(`setThemePref('light'); return 1;`); await dormir(250);
  let B = await etat();
  vrai('population : on est toujours sur la carte', B.carte);
  faux('⛔ la carte redevient claire, la vue n’a pas été reconstruite', B.nuit);
  v('… le filtre suit', B.filtre, 'none');
  await S.ev(`setThemePref('dark'); return 1;`); await dormir(250);
  B = await etat();
  vrai('⛔ et elle repasse en nuit dans l’autre sens', B.nuit);

  titre('4. LE SATELLITE RESTE, ET IL RESTE CLAIR');
  vrai('population : la pastille répond au clic', await cliquer()); await dormir(1400);
  E = await etat();
  v('la préférence est rangée (sous la clé de la bêta)', [E.cle, E.pref], ['elanB_carte', 's']);
  v('le fond passe au satellite', E.fond, 's');
  vrai('la pastille s’allume', E.chips[0] && E.chips[0].a);
  faux('⛔ le satellite n’est PAS assombri, même en thème nuit', E.nuit);
  vrai('… et la tuile demandée est bien la vue aérienne', /lyrs=s,h/.test(E.tuile || ''));
  v('population : des tuiles satellite ont vraiment été demandées', tuiles.s > 0, true);

  vrai('population : la pastille répond encore', await cliquer()); await dormir(1400);
  E = await etat();
  v('on en sort par la MÊME pastille', E.pref, 'a');
  v('… et on retombe sur le thème (nuit)', E.fond, 'n');
  vrai('… la teinte revient', E.nuit);

  titre('5. AUCUNE ERREUR JAVASCRIPT');
  v('exceptions', S.exceptions, []);
  v('erreurs console', S.consoleErr.filter(x => !/leaflet|tile|net::|Failed to load/i.test(x)), []);

  console.log(lignes.join('\n'));
  console.log(`\n════ sonde-carte : ${ok} ✓ ${ko} ✗ ════`);
  console.log(`   tuiles demandées : plan ${tuiles.m} · satellite ${tuiles.s}`);
  S.fermer();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE :', e && e.stack || e); process.exit(2); });
