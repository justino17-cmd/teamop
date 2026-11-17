// Angle « dépendances » · sonde 3 : LES PORTES DE TEST ET LES RÉGLAGES PAR DÉFAUT.
// A. recensement par analyseur (acorn) des quatre pages et du module : eval, new Function, setTimeout/setInterval avec une CHAÎNE, document.write,
//    javascript: dans une adresse, console.* qui écrirait une donnée, target=_blank sans rel=noopener, objets de débogage posés sur window.
// B. rejoué au navigateur : l'interrupteur « window.DROITS_GARDE === false » de la garde des droits (droitsGeste). Une technicienne (sm) touche un geste
//    de la vente (« Envoyer ») : la garde le refuse ; la même technicienne, après « window.DROITS_GARDE = false » (une ligne dans la console, ou dans
//    n'importe quel code qui s'exécute dans la page), le voit passer. Le prototype garde ses droits côté page : c'est l'interrupteur qui est en trop.
// C. les adresses qui ouvrent des portes (?auto=, ?lien=, ?seul=, ?liaison=, ?mode=) : ce qu'elles font sur 127.0.0.1 et ce qu'elles font sur le site (nom d'hôte réel).
// ⛔ 127.0.0.1 seulement, entreprise fictive. Population comptée avant de conclure.
const L = require('../lib.js'), fs = require('fs'), path = require('path');
const acorn = require('/opt/node-tools/node_modules/acorn'), walk = require('/opt/node-tools/node_modules/acorn-walk');
const APERCU = path.join(__dirname, '..', '..', '..', 'apercu');
const PAGES = ['prototype-op-gestion.html', 'prototype-comptabilite.html', 'prototype-paiement.html', 'prototype-documents.html'];
(async () => {
  // ── A. recensement ──
  const T = { appels: 0, eval: [], fonction: [], minuterieChaine: [], write: [], jsUrl: [], consoleDonnee: [], blankSansNoopener: [], fenetre: [] };
  const sources = PAGES.map(f => ({ f, texte: fs.readFileSync(path.join(APERCU, f), 'utf8'), html: true })).concat([{ f: 'prototype-courrier.js', texte: fs.readFileSync(path.join(APERCU, 'prototype-courrier.js'), 'utf8'), html: false }]);
  let nbScripts = 0, nbNoeuds = 0;
  for (const s of sources) {
    const blocs = s.html ? [...s.texte.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]) : [s.texte];
    for (const b of blocs) { let ast; try { ast = acorn.parse(b, { ecmaVersion: 'latest', sourceType: 'script', allowReturnOutsideFunction: true, locations: true }); } catch (e) { console.log('  (bloc illisible par acorn dans ' + s.f + ' : ' + e.message.slice(0, 60) + ')'); continue; }
      nbScripts++;
      walk.full(ast, n => { nbNoeuds++;
        if (n.type === 'CallExpression' || n.type === 'NewExpression') { T.appels++;
          const c = n.callee, nom = c.type === 'Identifier' ? c.name : (c.type === 'MemberExpression' && !c.computed && c.property.type === 'Identifier' ? (c.object.type === 'Identifier' ? c.object.name + '.' : '') + c.property.name : '');
          const a0 = n.arguments[0], chaine = a0 && (a0.type === 'Literal' && typeof a0.value === 'string' || a0.type === 'TemplateLiteral' || (a0.type === 'BinaryExpression' && a0.operator === '+'));
          const ou = s.f + ':' + n.loc.start.line;
          if (nom === 'eval' || nom === 'window.eval') T.eval.push(ou);
          if ((n.type === 'NewExpression' || n.type === 'CallExpression') && (nom === 'Function' || nom === 'window.Function')) T.fonction.push(ou);
          if (/^(setTimeout|setInterval|window\.setTimeout|window\.setInterval)$/.test(nom) && chaine) T.minuterieChaine.push(ou);
          if (/^document\.(write|writeln)$/.test(nom)) T.write.push(ou);
          if (/^console\./.test(nom) && n.arguments.some(x => x.type !== 'Literal' && x.type !== 'Identifier')) T.consoleDonnee.push(ou + ' ' + nom);
          if (nom === 'window.open') T.fenetre.push(ou); }
        if (n.type === 'Literal' && typeof n.value === 'string' && /^\s*javascript:/i.test(n.value)) T.jsUrl.push(s.f + ':' + n.loc.start.line);
        if (n.type === 'TemplateElement' && /href=["']?\s*javascript:/i.test(n.value.raw)) T.jsUrl.push(s.f + ':' + n.loc.start.line); }); } }
  // target=_blank sans noopener : dans les gabarits (texte brut des pages)
  let blank = 0;
  for (const s of sources) for (const m of s.texte.matchAll(/<a\b[^>]*target=\\?["']_blank\\?["'][^>]*>/g)) { blank++; if (!/rel=\\?["'][^"']*noopener/.test(m[0])) T.blankSansNoopener.push(s.f + ' : ' + m[0].slice(0, 80)); }
  console.log('recensement : ' + nbScripts + ' blocs de script, ' + nbNoeuds + ' noeuds, ' + T.appels + ' appels · target=_blank : ' + blank + ' · window.open : ' + T.fenetre.length);
  L.v('population : l\'analyseur a lu les quatre pages et le module (≥ 5 blocs, ≥ 100 000 noeuds)', nbScripts >= 5 && nbNoeuds > 100000, { nbScripts, nbNoeuds });
  L.v('population : des liens target=_blank existent (≥ 8) — on vérifie leur rel', blank >= 8, blank);
  L.v('A1. aucun eval()', T.eval.length === 0, T.eval);
  L.v('A2. aucun new Function()', T.fonction.length === 0, T.fonction);
  L.v('A3. aucun setTimeout / setInterval avec une chaîne', T.minuterieChaine.length === 0, T.minuterieChaine);
  L.v('A4. aucun document.write', T.write.length === 0, T.write);
  L.v('A5. aucune adresse javascript: écrite dans un lien', T.jsUrl.length === 0, T.jsUrl);
  L.v('A6. tout lien target=_blank porte rel=noopener', T.blankSansNoopener.length === 0, T.blankSansNoopener);
  console.log('   console.* avec une expression (à relire à la main) :', T.consoleDonnee.join(' · ') || 'aucune');
  L.v('A7. les appels console.* ne portent que le nom d\'une fonction et l\'objet erreur (identificateurs), jamais une expression qui bâtit une donnée de client', T.consoleDonnee.length === 0, T.consoleDonnee);

  // ── B. l'interrupteur de la garde des droits ──
  const c = await L.ouvrir({ profil: 'mac', qui: 'sm', attente: 900 });
  const etat = await c.p.evaluate(() => { const p = eqDe(acteur()); return { qui: p && p.k, admin: p && droitAdmin(p), role: ROLE, peutEnvoyer: p && peut('ventes', 'm', p), existe: typeof droitsGeste === 'function' }; });
  console.log('B. personne connectée :', JSON.stringify(etat));
  L.v('population : la technicienne (sm) est connectée, n\'est PAS administratrice et n\'a pas le droit de modifier les ventes', etat.existe && etat.qui === 'sm' && !etat.admin && etat.peutEnvoyer === false, etat);
  const essai = () => c.p.evaluate(() => { const b = document.createElement('button'); b.setAttribute('data-action', 'relanceOk'); document.body.appendChild(b); let avale = false;
    const ev = { target: b, type: 'click', stopImmediatePropagation() { avale = true; }, preventDefault() {} }; try { droitsGeste(ev); } catch (e) {} b.remove(); return avale; });
  const avantInterrupteur = await essai();
  L.v('B1. la garde refuse à la technicienne un geste de la vente (« relanceOk ») : refus avalé', avantInterrupteur === true, avantInterrupteur);
  await c.p.evaluate(() => { window.DROITS_GARDE = false; });
  const apres = await essai();
  L.v('B2. un simple « window.DROITS_GARDE = false » ne désarme PAS la garde (l\'interrupteur n\'existe pas dans le code de production)', apres === true, { refuseApresInterrupteur: apres });
  await c.p.evaluate(() => { delete window.DROITS_GARDE; });
  // le même, par les clés connues du rangement ou de l'adresse ?
  const portes = await c.p.evaluate(() => ({ windowTest: ['SECU_TEST', 'DSM', '__encPhoto', 'CMPT_DROITS', 'CMPT_REFUS', 'DROITS_GARDE', 'opgRaccourci', 'opgLien', 'opgPince'].filter(k => k in window) }));
  console.log('objets d\'aide posés sur window (hôte local) :', JSON.stringify(portes));
  await L.fin(c);

  // ── C. SECU_TEST / DSM / ?auto= selon le nom d'hôte : on rejoue la fonction de garde avec le NOM de l'hôte du site (sans jamais s'y connecter) ──
  const d = await L.ouvrir({ profil: 'mac', qui: null, attente: 700 });
  const garde = await d.p.evaluate(() => ({ site: secuAutoPermis({ protocol: 'https:', hostname: 'teamop.fr' }), local: secuAutoPermis({ protocol: 'http:', hostname: '127.0.0.1' }), coqueIos: secuAutoPermis({ protocol: 'capacitor:', hostname: 'localhost' }), coqueAndroid: secuAutoPermis({ protocol: 'https:', hostname: 'localhost' }), fichier: secuAutoPermis({ protocol: 'file:', hostname: '' }) }));
  console.log('secuAutoPermis :', JSON.stringify(garde));
  L.v('C1. sur le site (https, teamop.fr), ?auto= et SECU_TEST sont fermés (déjà rapporté : ponts-04 pour les coques ; témoin)', garde.site === false && garde.local === true);
  L.v('C2. la même garde est fermée dans les deux coques (iOS capacitor://localhost, Android https://localhost) — ponts-04 : elle croit à « localhost = les sondes »', garde.coqueIos === false && garde.coqueAndroid === false, garde);
  await L.fin(d); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
