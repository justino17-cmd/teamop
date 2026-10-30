/* Sonde « Tester l'application » : demo.html?metier=…&variante=…&cats=… au navigateur (Chromium, 127.0.0.1 seulement, réseau SURVEILLÉ).
   Usage : node scratchpad/demo/sonde-demo-cats.js   (CAPTURES=dossier pour les images)
   Prouve, téléphone 390×844 ET bureau 1440×900, jour ET nuit : bandeau « non choisie » présent sur une rubrique non cochée (visible, dans l'écran, sous
   le bandeau de la démonstration), ABSENT sur une cochée et sur le tableau de bord, marque dans le menu, aucune rubrique fermée, « L'ajouter » (onglet
   d'origine simulé : un message vers https://teamop.fr ; sans lui : navigation vers creer.html), AUCUN lien d'adresse sans cats ne montre de bandeau,
   variante « deux » = chauffage + climatisation ; aucune exception, aucune requête hors 127.0.0.1. Chaque contrôle compte sa population. */
const path = require('path');
const { ouvrir, dormir } = require('./lib.js');
const DOSSIER = process.env.CAPTURES || path.join(__dirname, 'captures-cats');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const PROFILS = [
  { nom: 'tel390', l: 390, h: 844, mobile: true, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1' },
  { nom: 'bureau1440', l: 1440, h: 900, mobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15' }
];
(async () => {
  const S = await ouvrir({});
  /* une lecture lancée pendant qu'une navigation détruit la page peut ne JAMAIS répondre : chaque lecture d'attente a son délai */
  S.attendre = async (expr, ms) => { const fin = Date.now() + (ms || 20000); while (Date.now() < fin) { try { const r = await Promise.race([S.ev('return !!(' + expr + ')'), dormir(2000).then(() => false)]); if (r) return true; } catch (e) { /* page en chargement */ } await dormir(300); } return false; };
  /* un confirm natif (« Passer à ce métier ? ») figerait le pilotage : posé AVANT le script de la page */
  await S.c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: 'window.confirm=function(){return true};window.alert=function(){};' });
  try {
    for (const P of (process.env.SANS_PROFILS ? [] : PROFILS)) for (const theme of ['light', 'dark']) {
      console.log('\n── ' + P.nom + ' · ' + (theme === 'dark' ? 'nuit' : 'jour'));
      await S.profil(P.l, P.h, P.mobile, theme);
      await S.c.envoyer('Emulation.setUserAgentOverride', { userAgent: P.ua });
      await S.goto('/demo.html?metier=plomberie&cats=planning,clients,factures');
      await S.attendre('document.getElementById("demo-bandeau")', 40000);
      await S.ev('window.confirm=()=>true; window.alert=()=>{}; return 1');
      await S.ev('document.body.classList.remove("nav-open");return 1');
      const nonChoisieSur = async (vue) => { await S.ev('try{closeModal();}catch(e){} go(' + JSON.stringify(vue) + ');return 1'); await dormir(900);
        return S.ev('const n=document.getElementById("demo-nonchoisie"),b=document.getElementById("demo-bandeau"),c=document.getElementById("content");' +
          'const r=n&&n.getBoundingClientRect(),rb=b&&b.getBoundingClientRect(),rc=c.getBoundingClientRect();' +
          'return {vue:current,present:!!n,txt:n?n.textContent.replace(/\\s+/g," ").trim():"",sous:n&&b?(r.top>=rb.bottom-1):null,dansEcran:n?(r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth+1):null,' +
          'haut:n?Math.round(r.top-rc.top):null,larg:n?Math.round(r.width):null,prem:c.firstElementChild&&c.firstElementChild.id,second:c.children[1]&&c.children[1].id,debord:document.documentElement.scrollWidth-innerWidth,' +
          'ouvert:!!c.querySelector(".card,.kpi,.pf-bar,.filters,table,h2,h3")}'); };
      const d = await nonChoisieSur('dashboard');
      vrai('tableau de bord : jamais « non choisi » (population : l\'écran est ouvert)', !d.present && d.ouvert && d.prem === 'demo-bandeau', d);
      const pl = await nonChoisieSur('planning');
      vrai('planning (cochée) : le bandeau de la démonstration seul, rien de spécial', !pl.present && pl.ouvert, pl);
      const st = await nonChoisieSur('stock');
      vrai('stock (NON cochée) : le bandeau est là, sous celui de la démonstration, dans l\'écran, sans débordement', st.present && st.sous && st.dansEcran && st.second === 'demo-nonchoisie' && st.debord <= 0, st);
      vrai('stock : la phrase exacte, le geste « L\'ajouter à ma demande »', /Vous n’avez pas sélectionné cette rubrique — vous pouvez la visualiser ici\./.test(st.txt) && /L’ajouter à ma demande/.test(st.txt), st.txt);
      vrai('stock : la rubrique reste OUVERTE (son contenu s\'affiche, rien n\'est fermé)', st.ouvert && st.vue === 'stock', st);
      const col = await S.ev('const n=document.getElementById("demo-nonchoisie");const s=getComputedStyle(n);const t=getComputedStyle(n.querySelector(".demo-txt"));const bt=getComputedStyle(n.querySelector("button"));return {fond:s.backgroundColor,txt:t.color,btnFond:bt.backgroundColor,btn:bt.color,h:Math.round(n.getBoundingClientRect().height),btnH:Math.round(n.querySelector("button").getBoundingClientRect().height)}');
      vrai('(contraste lisible, bouton assez haut) ' + JSON.stringify(col), col.fond !== 'rgba(0, 0, 0, 0)' && col.btnH >= 28, col);
      await dormir(2500); await S.ev('try{closeModal();}catch(e){}return 1'); await dormir(900); await S.snap(path.join(DOSSIER, P.nom + '-' + theme + '-stock.png'));
      const fa = await nonChoisieSur('factures');
      vrai('factures (cochée) : aucun bandeau', !fa.present && fa.ouvert, fa);
      const cl = await nonChoisieSur('clients');
      vrai('clients (cochée) : aucun bandeau', !cl.present && cl.ouvert, cl);
      const four = await nonChoisieSur('fournisseurs');
      vrai('fournisseurs (non cochée) : le bandeau', four.present && four.dansEcran, four);
      /* le menu */
      const menu = await S.ev('const nav=document.getElementById("nav");const its=[...nav.querySelectorAll(".nav-item[data-view]")];' +
        'const marq=its.filter(e=>e.hasAttribute("data-nonchoisie")).map(e=>e.getAttribute("data-view"));const non=its.filter(e=>!e.hasAttribute("data-nonchoisie")).map(e=>e.getAttribute("data-view"));' +
        'const st=nav.querySelector(\'.nav-item[data-view="stock"]\');const cs=st&&getComputedStyle(st,"::after");' +
        'const nr=nav.getBoundingClientRect();const hors=[...nav.querySelectorAll(".nav-item[data-nonchoisie]")].filter(e=>{const q=e.getBoundingClientRect();return q.width>0&&(q.right>nr.right+1||e.scrollWidth>e.clientWidth+1)}).map(e=>e.getAttribute("data-view"));const bad=nav.querySelector(\'.nav-item[data-view="interventions"]\');' +
        'return {n:its.length,marq:marq.length,nonMarq:non,contenu:cs&&cs.content,deb:nav.scrollWidth-nav.clientWidth,hors:hors,legende:!!nav.querySelector(".demo-legende"),badgeMarque:!!(bad&&bad.hasAttribute("data-nonchoisie")&&bad.querySelector(".badge,[data-badge]"))}');
      vrai('menu : population de rubriques > 20, les cochées (planning, clients, factures) SANS marque, les autres avec', menu.n > 20 && menu.marq > 10 && ['planning', 'clients', 'factures'].every(k => menu.nonMarq.includes(k)) && !menu.nonMarq.includes('stock'), menu);
      vrai('menu : le rond pointillé s\'écrit (CSS), la légende est là, AUCUNE ligne marquée ne déborde du menu (même « Interventions » et sa pastille), pas de défilement latéral du menu', menu.contenu === '""' && menu.legende && menu.hors.length === 0 && menu.deb <= 0, menu);
      if (!P.mobile) { const r = await S.ev('const e=document.querySelector(\'.nav-item[data-view="stock"]\');e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}'); await dormir(300); await S.snap(path.join(DOSSIER, P.nom + '-' + theme + '-menu.png'), { x: 0, y: Math.max(0, r.y - 120), width: Math.max(300, r.x + r.width + 20), height: 260 }).catch(() => {}); }
      /* « L'ajouter » avec un onglet d'origine simulé */
      await S.ev('go("stock");return 1'); await dormir(700);
      const msg = await S.ev('Object.defineProperty(window,"opener",{configurable:true,value:{closed:false,postMessage:(m,o)=>{window.__pm=[m,o]},focus(){window.__foc=1}}});document.querySelector("#demo-nonchoisie button").click();return {pm:window.__pm,foc:window.__foc,url:location.pathname}');
      vrai('« L\'ajouter » avec onglet d\'origine : UN message vers https://teamop.fr (rubrique stock), pas de navigation', msg.pm && msg.pm[1] === 'https://teamop.fr' && msg.pm[0].rubrique === 'stock' && msg.url === '/demo.html', msg);
    }
    /* sans cats (le lien « Essayer la démo plombier ») */
    console.log('\n── sans cats dans l\'adresse');
    await S.profil(1440, 900, false, 'light');
    await S.goto('/demo.html?metier=plomberie');
    await S.attendre('document.getElementById("demo-bandeau")', 40000);
    await S.ev('window.confirm=()=>true;return 1');
    const sans = []; for (const v of ['stock', 'fournisseurs', 'planning', 'devis']) { await S.ev('go(' + JSON.stringify(v) + ');return 1'); await dormir(800); sans.push(await S.ev('return {v:current,nc:!!document.getElementById("demo-nonchoisie"),ouvert:!!document.getElementById("content").children.length}')); }
    vrai('⛔ aucun bandeau « non choisie » sur 4 écrans (population : 4 écrans ouverts)', sans.length === 4 && sans.every(x => !x.nc && x.ouvert), sans);
    const mk = await S.ev('return document.querySelectorAll(".nav-item[data-nonchoisie]").length');
    vrai('aucune marque dans le menu', mk === 0, mk);
    /* variante */
    console.log('\n── variante « deux » : chauffage + climatisation');
    await S.goto('/demo.html?metier=chauffage&variante=deux&cats=planning');
    await S.attendre('document.getElementById("demo-bandeau")', 40000);
    await S.ev('window.confirm=()=>true;return 1');
    await dormir(800);
    let v = await S.ev('return {m:db.metier,plus:db.metierPlus,d:db.demoPublique,nonc:demoPubliqueNonChoisie("stock"),types:intTypes().length,sel:JSON.parse(localStorage.getItem("elanD_demo_etat"))}');
    vrai('chauffage + climatisation en complément, rubriques retenues rangées', v.m === 'chauffage' && v.plus === 'climatisation' && v.d.plus === 'climatisation' && v.nonc === 'stock' && v.sel.variante === 'deux' && v.sel.cats[0] === 'planning', v);
    await S.goto('/demo.html?metier=chauffage&variante=climatisation&cats=planning');
    await S.attendre('document.getElementById("demo-bandeau")', 40000);
    v = await S.ev('return {m:db.metier,plus:db.metierPlus}');
    vrai('variante « climatisation » : le métier climatisation', v.m === 'climatisation' && !v.plus, v);
    /* l'adresse cassée */
    await S.goto('/demo.html?metier=plomberie&cats=%E0%A4%A,<script>alert(1)</script>,planning');
    await S.attendre('document.getElementById("demo-bandeau")', 40000);
    await S.ev('window.confirm=()=>true;return 1'); await dormir(400);
    v = await S.ev('return {sel:JSON.parse(localStorage.getItem("elanD_demo_etat")),m:db.metier}');
    vrai('une adresse piégée ne casse rien : seules les clés connues sont gardées', v.m === 'plomberie' && (v.sel.cats === undefined || v.sel.cats.every(k => /^[a-zA-Z]+$/.test(k))), v);
    /* sans onglet d'origine : navigation vers creer.html */
    await S.goto('/demo.html?metier=plomberie&cats=planning');
    await S.attendre('document.getElementById("demo-bandeau")', 40000);
    await S.ev('go("stock");return 1'); await dormir(800);
    await S.ev('document.querySelector("#demo-nonchoisie button").click();return 1'); await dormir(1500);
    const fin = await S.ev('return location.pathname+location.search');
    vrai('« L\'ajouter » sans onglet d\'origine : on retourne à la page de commande (creer.html?ajouter=stock)', fin === '/creer.html?ajouter=stock', fin);
    console.log('\n── transversal');
    vrai('aucune exception JavaScript', S.exceptions.length === 0, S.exceptions);
    vrai('aucune erreur de console', S.erreurs.length === 0, S.erreurs);
    vrai('⛔ aucune requête hors de 127.0.0.1 (population : ' + S.reseau.length + ' requêtes vues)', S.exterieur.length === 0 && S.reseau.length > 3, S.exterieur);
    vrai('la politique de contenu n\'a rien eu à refuser', S.bloques.length === 0 && S.violations.length === 0, [S.bloques, S.violations]);
  } finally { S.fermer(); }
  console.log('\n════ sonde-demo-cats : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
