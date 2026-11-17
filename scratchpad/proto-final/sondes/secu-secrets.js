// Sonde « secu-secrets » (double authentification, étape 2, § 8.1, décisions 3 et 5) : AUCUN secret nulle part, et aucun code de secours.
// Population : le fichier de la page (les mots et les clés qui ont disparu), puis un parcours COMPLET joué au navigateur (activation de Marc, mot de passe choisi, déconnexion,
// connexion par le nombre, connexion inhabituelle refusée par code), avec une fouille après CHAQUE étape : rangement (localStorage, sessionStorage, cookies, window.name, adresse,
// noms d'IndexedDB), DOM (hors script, hors bloc « Démonstration »), attributs data-*, journal de la page. Chaque secret est cherché : provisoires, mots de passe choisis, PIN,
// clés des téléphones (hexadécimal), codes d'activation (avec et sans tirets). Le nombre (2 chiffres) ne se cherche pas dans un texte : une fouille de « 47 » trouverait n'importe quoi ;
// sa propre sonde (secu-nombre) prouve qu'il n'est jamais dans le téléphone, et ici on prouve qu'il n'est dans AUCUNE donnée `data-` ni rangement.
const fs = require('fs'), path = require('path');
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const src = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
const nette = src.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/\/\*[^\n]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
// le bloc de la double authentification dans le fichier (du premier « SECU_DEMO » à la fin des écrans de connexion)
const i0 = src.indexOf('const SECU_DEMO'), i1 = src.indexOf('function cnxEntrer'); const bloc = src.slice(i0, i1);
const j0 = nette.indexOf('const SECU_DEMO'), j1 = nette.indexOf('function cnxEntrer'), blocN = nette.slice(j0, j1);   // le même bloc, sans commentaires : on garde du CODE, jamais une phrase d'explication
(async () => {
  console.log('\n── 1. le fichier : ce qui a disparu, ce qui ne doit jamais être écrit ──');
  v('population : le bloc de la double authentification est trouvé (plus de 20 000 caractères)', i0 > 0 && i1 > i0 && bloc.length > 20000, { i0, i1 });
  v('« Bienvenue17 » (le mot de passe commun) n’est plus écrit', !/Bienvenue17/.test(src));
  v('« opg_proto_mdp » (les mots de passe en clair dans le navigateur) n’existe plus', !/opg_proto_mdp/.test(src));
  v('« opg_proto_session » (la session rangée) n’existe plus', !/opg_proto_session/.test(src));
  v('MDP_PROVISOIRE, MDP_CLE, SESSION_CLE n’existent plus', !/MDP_PROVISOIRE|MDP_CLE|SESSION_CLE/.test(src));
  v('la case « Rester connecté » n’existe plus (ni son identifiant, ni son texte)', !/Rester connecté|cn-reste|dataset\.reste|data-reste="1"/.test(nette));
  // aucun code de secours : les SEULES phrases qui prononcent le mot sont celles qui le nient (le métier de la page parle de « Dépannage » et de « trousse de secours » : on cherche le CODE)
  const secours = [...nette.matchAll(/[^.\n]{0,60}(code[s]? de (secours|récupération|dépannage|recovery|backup)|recovery code|backup code|code[s]? de sauvegarde)[^.\n]{0,60}/gi)].map(m => m[0].trim());
  v('le mot « code de secours » n’est écrit que pour dire qu’il n’y en a pas (' + secours.length + ' phrases)', secours.length > 0 && secours.every(t => /(n’y a pas|n’existe pas|pas de|aucun) (de )?code[s]? de secours/i.test(t)), secours);
  v('aucun lien, bouton ni écran « se connecter sans téléphone »', !/sans téléphone\b|sans ton téléphone|autre moyen de te connecter/i.test(blocN));
  v('la démonstration ne fait jamais JSON.stringify de SECU ni de SECU.comptes', !/JSON\.stringify\(\s*SECU(\.comptes)?\s*[,)]/.test(nette));
  v('aucun secret n’est rangé : le bloc n’écrit ni dans localStorage ni dans sessionStorage ni dans un cookie', !/(localStorage|sessionStorage)\.setItem|document\.cookie\s*=|window\.name\s*=/.test(blocN), (bloc.match(/.{40}(localStorage|sessionStorage)\.setItem.{60}/g) || []).slice(0, 3));
  v('le hasard des secrets vient de crypto.getRandomValues (jamais Math.random, dans le bloc, hors commentaires)', blocN.length > 20000 && /crypto\.getRandomValues/.test(blocN) && !/Math\.random/.test(blocN), blocN.length);

  console.log('\n── 2. un parcours complet, fouillé après chaque étape ──');
  const c = await S.ouvrir({ profil:'mac' });
  const secrets = { prov:new Set(), mdp:new Set(), pin:new Set(), cle:new Set(), code:new Set() };
  // ce que la page tient en mémoire, lu par la voie réservée aux sondes locales (SECU_TEST)
  const relever = async () => { const m = await c.p.evaluate(() => { const o = { prov:[], cle:[], code:[] }; for (const k in SECU.comptes) { const cc = SECU.comptes[k]; if (cc.prov) o.prov.push(cc.prov); if (cc.tel && cc.tel.cle) o.cle.push(Array.from(cc.tel.cle).map(b => b.toString(16).padStart(2, '0')).join('')); if (cc.codeActivation) o.code.push(cc.codeActivation.code); } return o; });
    m.prov.forEach(x => secrets.prov.add(x)); m.cle.forEach(x => secrets.cle.add(x)); m.code.forEach(x => { secrets.code.add(x); secrets.code.add(x.replace(/-/g, '')); }); };
  const fouille = async etape => {
    await relever();
    const rang = await S.rangement(c);
    const dom = await c.p.evaluate(() => { const r = document.documentElement.cloneNode(true); r.querySelectorAll('script, style, .sec-demo').forEach(e => e.remove()); const html = r.outerHTML; const datas = [];
      document.querySelectorAll('*').forEach(e => { for (const a of e.attributes) if (/^data-/.test(a.name)) datas.push(a.name + '=' + a.value); });
      return { html, datas:datas.join('\n') }; });
    const journal = await c.p.evaluate(() => JSON.stringify(SECU.journal || []) + JSON.stringify(Object.values(SECU.comptes).map(x => x.histo)));
    let total = 0; const trouves = [];
    for (const [genre, ens] of Object.entries(secrets)) for (const s of ens) { if (!s || s.length < 6) continue; total++;
      for (const [ou, texte] of [['rangement', rang], ['page', dom.html], ['data-*', dom.datas], ['journal', journal]]) if (texte.includes(s)) trouves.push(genre + ' dans ' + ou);
      // un secret ne se range jamais encodé non plus (adresse, base64)
      if (rang.includes(Buffer.from(s).toString('base64'))) trouves.push(genre + ' (base64) dans le rangement'); }
    v(etape + ' : ' + total + ' secrets cherchés dans 4 endroits, aucun trouvé', total >= 3 && trouves.length === 0, trouves.slice(0, 5)); return total; };
  await fouille('au départ');
  const prov = await S.provisoire(c, 'marc'); secrets.prov.add(prov);
  v('le provisoire de Marc se lit dans le bloc « Démonstration » (le seul endroit)', /^[A-Za-z2-9]{6}-[A-Za-z2-9]{6}-[A-Za-z2-9]{6}$/.test(prov), prov);
  const pin = '482915', perso = 'Phrase-bien-longue-et-unique-2026';
  secrets.pin.add(pin); secrets.mdp.add(perso);
  const surDemo = await c.p.evaluate(() => ({ prov:[...document.querySelectorAll('.sec-demo [data-sec-prov]')].length, copier:[...document.querySelectorAll('.sec-demo button')].filter(b => /copier/i.test(b.textContent)).length }));
  v('le bloc « Démonstration » n’a AUCUN bouton « Copier » (un provisoire ne se copie pas)', surDemo.copier === 0 && surDemo.prov >= 4, surDemo);
  await S.activer(c, 'marc', { pin, mdp:perso }); await fouille('après l’activation et le choix du mot de passe');
  await c.p.evaluate(() => { const b = document.querySelector('[data-cnx="deconnexion"], .cn-out'); });
  await c.p.evaluate(() => sessionFermer('deconnexion')); await c.p.waitForTimeout(1200);
  await S.attendreSel(c, '#cn-id', 8000); await fouille('après la déconnexion');
  await S.connecter(c, 'marc', perso); const n = await S.lireNombre(c); v('le nombre est affiché (2 chiffres, 10 à 99)', /^[1-9][0-9]$/.test(n), n);
  await fouille('pendant la demande de connexion');
  const apresN = await c.p.evaluate(nn => { const d = []; document.querySelectorAll('*').forEach(e => { for (const a of e.attributes) if (/^data-/.test(a.name) && a.value === nn) d.push(e.tagName + '[' + a.name + ']'); if (e.id === nn) d.push('id'); }); return { d, ls:Object.values(localStorage).concat(Object.values(sessionStorage)).filter(x => x === nn).length }; }, n);
  v('le nombre (« ' + n + ' ») n’est la valeur d’aucune donnée data-*, d’aucun identifiant ni d’aucun rangement', apresN.d.length === 0 && apresN.ls === 0, apresN);
  await S.approuver(c, 'marc', n, pin); await S.attendreApp(c, 15000); await fouille('après la connexion par le nombre');
  // une connexion inhabituelle, un code à 6 chiffres refusé : aucun secret de plus dans le journal
  await c.p.evaluate(() => sessionFermer('deconnexion')); await S.attendreSel(c, '#cn-id', 8000);
  await c.p.evaluate(() => { SECU.cases.autre = true; }); await S.connecter(c, 'marc', perso); await S.lireNombre(c);
  await fouille('pendant une connexion inhabituelle');
  const jr = await c.p.evaluate(() => SECU.journal.map(j => j.action + ' ' + j.detail).join(' | '));
  v('le journal de la page ne dit que des faits (aucun mot de passe, aucun PIN) : ' + (jr.match(/login\.|mfa\./g) || []).length + ' lignes', /login\./.test(jr) && !jr.includes(perso) && !jr.includes(pin), jr.slice(0, 200));
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);

  console.log('\n── 3. la fiche d’une personne (Équipe) : aucun mot de passe lisible, ni dans l’écran ni dans le texte à envoyer ──');
  { const g = await L.ouvrir({ profil:'mac', qui:'marc' }); await L.aller(g.p, 'equipe');
    const pop = await g.p.evaluate(() => EQUIPE.map(p => p.k)); v('population : les ' + pop.length + ' personnes de l’équipe', pop.length === 6, pop);
    let lues = 0, secretsVus = 0;
    for (const k of pop) {
      const r = await g.p.evaluate(k => { fermerPanneau && fermerPanneau(); eqFiche(k); const P = document.querySelector('#calque .panneau'); if (!P) return null; const cl = SECU.comptes[k], clairs = [cl.prov, cl.demoClair].filter(Boolean);
        const copier = P.querySelector('[data-cnx="copier"]'); const attrs = []; P.querySelectorAll('*').forEach(e => { for (const a of e.attributes) attrs.push(a.value); });
        return { texte:P.textContent.replace(/\s+/g, ' '), html:P.innerHTML, copie:copier ? copier.dataset.t : null, clairs, acces:!!P.querySelector('.cn-acces'), attrs:attrs.join('\n'), prov:!!cl.prov, tel:!!cl.tel }; }, k);
      if (!r) { v('fiche de ' + k + ' : le panneau s’ouvre', false); continue; } lues++;
      v('fiche de ' + k + ' : le bloc « Connexion » est là (Marc est administrateur)', r.acces, k);
      const trouves = r.clairs.filter(x => r.html.includes(x) || (r.copie || '').includes(x) || r.attrs.includes(x)); secretsVus += r.clairs.length;
      v('fiche de ' + k + ' : aucun mot de passe (' + r.clairs.length + ' cherché' + (r.clairs.length > 1 ? 's' : '') + ') ni dans l’écran, ni dans le texte à copier, ni dans une donnée data-*', trouves.length === 0 && (r.clairs.length > 0 || !r.prov), trouves);
      v('fiche de ' + k + ' : la ligne « Mot de passe » dit ' + (r.prov ? '« Provisoire : à lui remettre en main propre. »' : '« Personnel, choisi par … »'), r.prov ? /Provisoire : à lui remettre en main propre\./.test(r.texte) : /Personnel, choisi par/.test(r.texte), r.texte.slice(0, 200));
      if (r.copie) v('fiche de ' + k + ' : le texte à copier dit « je te le remets en main propre » et ne contient aucun mot de passe', /je te le remets en main propre/.test(r.copie) && !/Bienvenue/.test(r.copie), r.copie);
      v('fiche de ' + k + ' : le téléphone est dit (' + (r.tel ? 'activé' : 'à activer') + ')', /Téléphone/.test(r.texte) && (r.tel ? /activé le/.test(r.texte) || /Verrouillé/.test(r.texte) : /À activer à sa première connexion/.test(r.texte)), r.texte.slice(0, 300)); }
    v('population : ' + lues + ' fiches lues, ' + secretsVus + ' mots de passe cherchés (zéro serait une mesure creuse)', lues === 6 && secretsVus >= 4, { lues, secretsVus });
    v('aucune erreur JavaScript', g.err.length === 0, g.err.slice(0, 3)); await L.fin(g); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
