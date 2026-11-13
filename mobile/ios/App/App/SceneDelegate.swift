import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        // Sur un Mac : la fenêtre porte le nom de l'application et ne se réduit pas sous la largeur où la page
        // passerait en mise en page de téléphone (760 px de page, soit environ 1 000 points au zoom de 130 %).
        if ProcessInfo.processInfo.isiOSAppOnMac {
            windowScene.title = "OP GESTION"
            windowScene.sizeRestrictions?.minimumSize = CGSize(width: 1040, height: 680)
        }

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
        if let url = connectionOptions.urlContexts.first?.url {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in self?.ouvrirLien(url) }
        }
    }

    // Sur un Mac, une application iPad est affichée réduite (environ 77 %) : tout paraît plus petit que dans un navigateur.
    // On agrandit par la balise « viewport » de la page (échelle 1,3) : la page se REMET EN PAGE dans la largeur de la fenêtre.
    // ⛔ Pas `pageZoom` : il grossit sans remettre en page, et la fenêtre défilait de côté (Justin, 12 novembre 2026).
    // Sans effet sur iPhone et iPad.
    private static let echelleMac = """
    (function(){var f=function(){var m=document.querySelector('meta[name="viewport"]');if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}
    m.setAttribute('content','initial-scale=1.3,minimum-scale=1.3,maximum-scale=1.3,viewport-fit=cover');};
    if(document.head)f();document.addEventListener('DOMContentLoaded',f);})();
    """
    private var echellePosee = false

    func sceneDidBecomeActive(_ scene: UIScene) {
        guard ProcessInfo.processInfo.isiOSAppOnMac,
              let pont = window?.rootViewController as? CAPBridgeViewController,
              let vue = pont.webView else { return }
        if !echellePosee {
            echellePosee = true
            vue.configuration.userContentController.addUserScript(
                WKUserScript(source: SceneDelegate.echelleMac, injectionTime: .atDocumentEnd, forMainFrameOnly: true))
            // Le pincement du trackpad : la page ne le reçoit pas dans une application iPad lancée sur un Mac.
            // On le capte ici et on le transmet à la carte du Planning (window.opgPince), qui zoome autour du curseur.
            let pince = UIPinchGestureRecognizer(target: self, action: #selector(pinceTrackpad(_:)))
            pince.delegate = self
            vue.addGestureRecognizer(pince)
        }
        vue.evaluateJavaScript(SceneDelegate.echelleMac, completionHandler: nil)
        // La barre grise en bas de la fenêtre (Justin, 12 novembre 2026) : c'est la barre d'aide à la saisie d'iOS
        // (précédent, suivant, OK), vide sur un Mac, qui se pose sur la page dès qu'un champ a été touché.
        vue.retirerBarreDeSaisie()
        // Le trackpad : deux doigts vers la gauche ou la droite reviennent à l'écran précédent ou suivant.
        vue.allowsBackForwardNavigationGestures = true
    }

    // Le lien de connexion : opgestion://e/<entreprise> ouvre l'application et relie l'appareil à l'espace de cette entreprise.
    // La page peut ne pas être encore chargée (application lancée PAR le lien) : on réessaie jusqu'à ce qu'elle réponde.
    private func ouvrirLien(_ url: URL, essai: Int = 0) {
        guard url.scheme == "opgestion", url.host == "e" || url.host == "lien" else { return }
        let compte = url.lastPathComponent.lowercased().filter { ($0.isASCII && ($0.isLetter || $0.isNumber)) || $0 == "-" }
        guard !compte.isEmpty, compte.count <= 60,
              let pont = window?.rootViewController as? CAPBridgeViewController,
              let vue = pont.webView else { return }
        vue.evaluateJavaScript("typeof window.opgLien === 'function' ? window.opgLien('\(compte)') : false") { [weak self] resultat, _ in
            if (resultat as? Bool) != true, essai < 12 {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { self?.ouvrirLien(url, essai: essai + 1) }
            }
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        if let url = URLContexts.first?.url { ouvrirLien(url) }
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    @objc func pinceTrackpad(_ geste: UIPinchGestureRecognizer) {
        guard let vue = geste.view as? WKWebView, vue.bounds.width > 0, vue.bounds.height > 0 else { return }
        let point = geste.location(in: vue)
        let etat: String
        switch geste.state {
        case .began: etat = "debut"
        case .changed: etat = "change"
        default: etat = "fin"
        }
        let js = String(format: "window.opgPince && window.opgPince('%@', %.4f, %.5f, %.5f)", etat,
                        Double(geste.scale), Double(point.x / vue.bounds.width), Double(point.y / vue.bounds.height))
        vue.evaluateJavaScript(js, completionHandler: nil)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}


// Le pincement doit pouvoir se reconnaître en même temps que les gestes de la vue web (défilement, sélection).
extension SceneDelegate: UIGestureRecognizerDelegate {
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith otherGestureRecognizer: UIGestureRecognizer) -> Bool {
        return true
    }
}

// La barre d'aide à la saisie que WKWebView pose au-dessus du clavier n'a pas de sens sur un Mac (il n'y a pas de clavier
// à l'écran) : elle y paraît comme une bande grise vide en bas de la fenêtre. On la retire en donnant à la vue de contenu
// une sous-classe dont `inputAccessoryView` rend toujours rien.
private final class SansBarreDeSaisie: NSObject {
    @objc var inputAccessoryView: AnyObject? { nil }
}

extension WKWebView {
    func retirerBarreDeSaisie() {
        guard let cible = scrollView.subviews.first(where: { String(describing: type(of: $0)).hasPrefix("WKContent") }),
              let classe: AnyClass = object_getClass(cible) else { return }
        // La bande grise en bas de la fenêtre (capture de Justin, 13 novembre 2026, champ « Lien de connexion » actif) est
        // la barre de raccourcis du clavier d'iPadOS (annuler, coller, suggestions). Sur un Mac elle est vide : on retire
        // ses deux groupes de boutons, ce qui la fait disparaître.
        let assistant = cible.inputAssistantItem
        assistant.leadingBarButtonGroups = []
        assistant.trailingBarButtonGroups = []
        let nom = "\(classe)_SansBarreDeSaisie"
        if String(describing: classe).hasSuffix("_SansBarreDeSaisie") { return }
        if let existante = NSClassFromString(nom) { object_setClass(cible, existante); return }
        let selecteur = #selector(getter: SansBarreDeSaisie.inputAccessoryView)
        guard let nouvelle = objc_allocateClassPair(classe, nom, 0),
              let methode = class_getInstanceMethod(SansBarreDeSaisie.self, selecteur) else { return }
        class_addMethod(nouvelle, selecteur, method_getImplementation(methode), method_getTypeEncoding(methode))
        objc_registerClassPair(nouvelle)
        object_setClass(cible, nouvelle)
    }
}
