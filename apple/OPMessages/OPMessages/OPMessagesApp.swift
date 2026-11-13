//  OP MESSAGES — prototype (application de test pour Mac, iPhone et iPad).
//
//  Cette application n'est PAS OP MESSAGES : elle ouvre le PROTOTYPE (données entièrement fictives, aucun appel réseau,
//  rien ne s'enregistre) dans une fenêtre native, pour le juger « en application » plutôt que dans un navigateur.
//  La page vit dans Web/index.html ; elle est fabriquée par `synchroniser.js` depuis apercu/prototype-op-messages.html.

import SwiftUI

@main
struct OPMessagesApp: App {
    var body: some Scene {
        WindowGroup {
            VueWeb()
                // La page va de bord à bord : c'est ELLE qui s'écarte de l'encoche et de la barre d'accueil (env(safe-area-inset-*)).
                .ignoresSafeArea()
                #if os(macOS)
                .frame(minWidth: 940, minHeight: 640)
                #endif
        }
        #if os(macOS)
        .defaultSize(width: 1320, height: 860)
        #endif
    }
}
