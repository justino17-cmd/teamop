// TITRE DE LA FICHE CLIENT, tour 4 (19 novembre 2026) : un nom de 112 signes (avec un contact de 120, une adresse de 160) tient sur 2 lignes au plus, coupé proprement (ellipse),
// le nom ENTIER se lit ailleurs dans la fiche (onglet Infos), « Appeler / E-mail » restent à l'écran, au-dessus de la barre d'onglets, sans défiler. Mesuré ET photographié sur
// 320 px jour et nuit, iPhone nuit, Android nuit, iPad jour, Mac jour. Contre-épreuve : un nom court n'est ni coupé ni changé. ⛔ 127.0.0.1 seulement.
// Captures hors dépôt (à REGARDER) : cap/tour4/.
const L = require('../lib.js');
const SORTIE = '/tmp/claude-0/-home-user-teamop/9be26ef7-266a-5a6c-9d53-503511d117fa/scratchpad/cap/tour4/';
const NOM = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic'.slice(0, 112);
const CONTACT = 'Madame Marie-Hélène de la Tour-d’Auvergne-Lorraine, gestionnaire du syndic, assistée de Monsieur Jean-Baptiste Dupont-Delacroix'.slice(0, 120);
const ADR = '12 rue des Marins d’Aunis, résidence Les Jardins du Port, bâtiment C, escalier 2, 3e étage porte gauche, 17300 Rochefort-sur-Mer, près du pont transbordeur, parking visiteurs à droite du portail'.slice(0, 160);
const PROFILS = (process.env.PROFILS ? JSON.parse(process.env.PROFILS) : [['petit', false], ['petit', true], ['iphone', true], ['android', true], ['ipad', false], ['mac', false]]);
(async () => {
  for (const [profil, nuit] of PROFILS) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p, tag = profil + (nuit ? '-nuit' : '-jour');
    const k = await p.evaluate(([nom, contact, adr]) => { const k = Object.keys(CLIENTS).find(x => x !== '__nv' && CLIENTS[x].tel && CLIENTS[x].mail); const c = CLIENTS[k]; window.__avant = { nom: c.nom, contact: c.contact, adr: c.adr }; c.nom = nom; c.contact = contact; c.adr = adr; return k; }, [NOM, CONTACT, ADR]);
    L.v(tag + ' · population : le client porte un nom de ' + NOM.length + ' signes, un contact de ' + CONTACT.length + ', une adresse de ' + ADR.length, NOM.length === 112 && CONTACT.length === 120 && ADR.length === 160, [NOM.length, CONTACT.length, ADR.length]);
    const mesure = async () => p.evaluate(() => { const h1e = document.querySelector('.tete-client h1'), sous = document.querySelector('.tete-client > div:first-child > span.gris'), bs = [...document.querySelectorAll('.tete-client .actions .btn, .tete-client .actions a')];
      const lignes = e => { if (!e) return null; const cs = getComputedStyle(e), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return Math.round(e.getBoundingClientRect().height / lh); };
      const bar = document.querySelector('.barre-bas'), haut = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().top : innerHeight;
      const lib = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim();
      const appeler = bs.find(b => /Appeler/i.test(lib(b))), mail = bs.find(b => /mail/i.test(lib(b)));
      const r = e => { if (!e) return null; const q = e.getBoundingClientRect(); return { haut: Math.round(q.top), bas: Math.round(q.bottom) }; };
      return { h1: { lignes: lignes(h1e), coupe: !!h1e && h1e.scrollHeight > h1e.clientHeight + 1, ellipse: h1e ? getComputedStyle(h1e).textOverflow + '|' + (getComputedStyle(h1e).webkitLineClamp || getComputedStyle(h1e).lineClamp) : null, bas: r(h1e) && r(h1e).bas },
        sous: { lignes: lignes(sous), coupe: !!sous && sous.scrollHeight > sous.clientHeight + 1 }, appeler: r(appeler), mail: r(mail), barreHaut: Math.round(haut), hauteur: innerHeight, scrollY: Math.round(scrollY), nbBoutons: bs.length }; });
    await p.evaluate(kk => aller('client-x-' + kk), k); await L.calme(p, 900);
    const m = await mesure(); console.log('  · ' + tag + ' :', JSON.stringify(m));
    L.v(tag + ' · population : le titre, le sous-titre et les boutons Appeler / E-mail sont à l’écran', !!m.h1.lignes && !!m.sous.lignes && !!m.appeler && !!m.mail, m);
    L.v(tag + ' · le titre tient sur 2 lignes au plus', m.h1.lignes <= 2, m.h1);
    L.v(tag + ' · contact, téléphone et adresse restent bornés (3 lignes à partir de 600 px ; 5 sur téléphone : 2 pour le contact, 1 pour le numéro, 2 pour l’adresse)', m.sous.lignes <= (c.largeur <= 600 ? 5 : 3), m.sous);
    L.v(tag + ' · le titre est coupé proprement par une ellipse (sur téléphone et tablette la coupe est visible : fini les 7 lignes)', (m.h1.coupe || c.largeur >= 1000) && /ellipsis/.test(m.h1.ellipse), m.h1);   // sur Mac le nom de 112 signes TIENT sur 2 lignes : rien à couper
    L.v(tag + ' · Appeler et E-mail sont à l’écran SANS défiler (au-dessus de la barre d’onglets ou du bas de l’écran)', m.scrollY === 0 && m.appeler && m.mail && m.appeler.haut >= 0 && m.appeler.bas <= m.barreHaut && m.mail.bas <= m.barreHaut, m);
    await L.capture(c, SORTIE + 'fiche-' + tag + '.png');
    const d = await L.deborde(c); L.v(tag + ' · la fiche ne déborde pas de la largeur du profil', !d || !d.deborde, d);
    // le nom ENTIER se lit dans l'onglet Infos (champ Nom ET libellé complet)
    await p.evaluate(() => { ongletClient = 'infos'; rendre(); }); await L.calme(p, 700);
    const inf = await p.evaluate(nom => { const e = document.querySelector('[data-ci="nom"]'), pl = document.querySelector('.ci-nom-plein'); return { champ: e ? e.value === nom : null, libelle: pl ? pl.textContent.includes(nom) : null, visible: pl ? pl.getBoundingClientRect().height > 0 : null }; }, NOM);
    L.v(tag + ' · le nom entier (112 signes) se lit dans la fiche : champ Nom ET libellé complet visible', inf.champ === true && inf.libelle === true && inf.visible === true, inf);
    await L.capture(c, SORTIE + 'infos-' + tag + '.png');
    // contre-épreuve : un nom court n'est ni coupé ni changé
    await p.evaluate(([kk]) => { const c = CLIENTS[kk]; c.nom = 'Restaurant Le Vieux Port'; c.contact = 'Mme Roux'; c.adr = '3 quai Sud, 17000 La Rochelle'; ongletClient = 'histo'; aller('clients'); setTimeout(() => aller('client-x-' + kk), 50); }, [k]); await L.calme(p, 900);
    const cc = await mesure();
    const nomCourt = await p.evaluate(() => { const h = document.querySelector('.tete-client h1'); return h ? h.textContent : null; });
    L.v(tag + ' · contre-épreuve : un nom court reste sur 1 ou 2 lignes, sans coupe, texte inchangé', cc.h1.lignes <= 2 && cc.h1.coupe === false && nomCourt === 'Restaurant Le Vieux Port', [cc.h1, nomCourt]);
    L.v(tag + ' · aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
