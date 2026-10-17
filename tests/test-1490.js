/* ══ LA BARRE « APPEL EN COURS » : LE COMBINÉ DU BOUTON RACCROCHER SE VOIT (lot m19, appels#2) ══════════════════════════════════════════════
   Le rond rouge de la barre verte (« Appel en cours · … · Revenir ») est un `<span class="rond">` : le MÊME nom de classe que la coche des cases de contact, dont la règle
   `.rond .ic { opacity: 0 }` cache la coche tant que la case n'est pas cochée. Le combiné (`svg.ic`) était là — 18 px, trait blanc — mais à `opacity: 0` : un rond rouge vide,
   mesuré sur iPhone, Android et Mac. Aucune lecture d'une règle seule ne le montre : il faut REJOUER la cascade sur le bouton tel que la page l'écrit.

   Ce que ce fichier garde :
   1. la page écrit bien le bouton comme on le croit (`button.appel-barre-raccrocher > span.rond > svg.ic`) — sans ça, la cascade rejouée viserait un élément qui n'existe pas ;
   2. ce que la cascade DONNE à ce combiné : une opacité de 1 (la règle des cases de contact ne le cache plus), et le contre-témoin — la coche d'une case de contact, elle, reste
      cachée tant que la case n'est pas cochée (on n'a pas « corrigé » en supprimant la règle des cases) ;
   3. la population : la feuille a bien été lue (des centaines de règles), et la cascade a vu la règle des cases (sinon « 1 » ne prouverait rien).
   La mesure au navigateur (opacité CALCULÉE et cliché de l'élément) est dans la sonde du lot : scratchpad/messages/correctifs/m19/sonde-m19.js. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const C = require('./outils-cascade-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(__dirname, '..', 'apercu/opmessages/index.html'), 'utf8');
const style = (/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1];
const HTML = PAGE.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<script>[\s\S]*?<\/script>/, ' ').replace(/<!--[\s\S]*?-->/g, ' ');

const R = C.regles(style);
vrai('(population) la feuille est lue : ' + R.length + ' règles de premier niveau rejouables', R.length > 300);

/* 1. le bouton tel que la page l'écrit */
vrai('le bouton Raccrocher de la barre est un <button class="appel-barre-raccrocher"> qui porte <span class="rond"><svg class="ic">',
  /<button[^>]*class="appel-barre-raccrocher[^"]*"[^>]*>\s*<span class="rond"><svg class="ic"[^>]*><use href="#i-raccrocher"\/><\/svg><\/span>\s*<\/button>/.test(HTML));

/* 2. la cascade */
const COMBINE = [{ tag: 'button', classes: ['appel-barre-raccrocher', 'presse'] }, { tag: 'span', classes: ['rond'] }, { tag: 'svg', classes: ['ic'] }];
const COCHE = [{ tag: 'button', classes: ['contact'] }, { tag: 'span', classes: ['rond'] }, { tag: 'svg', classes: ['ic'] }];
vrai('(population) la règle des cases de contact « .rond .ic » est vue par la cascade (sinon un « 1 » ne prouverait rien) : sur une coche neuve elle donne 0',
  C.gagne(R, COCHE, 'opacity') === '0');
v('⛔ le combiné de la barre est OPAQUE : la règle des cases de contact (« .rond .ic { opacity: 0 } ») ne l\'atteint plus', C.gagne(R, COMBINE, 'opacity'), '1');
vrai('le combiné garde sa taille de 18 px (la règle de la barre pose width et height)', C.gagne(R, COMBINE, 'width') === '18px' && C.gagne(R, COMBINE, 'height') === '18px');
vrai('contre-témoin : la coche d\'une case de contact reste CACHÉE tant que la case n\'est pas cochée (la règle des cases est intacte)', C.gagne(R, COCHE, 'opacity') === '0');

fin();
