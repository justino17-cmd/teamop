import UIKit
import WebKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        // Une fenêtre de PLUS (clic droit › « Ouvrir dans une nouvelle fenêtre », ou Fichier › Nouvelle fenêtre) ne relance pas
        // l'application : avant de charger sa page, on demande à une fenêtre déjà ouverte de lui laisser un passage
        // (qui est connecté, quel écran). La page le lit à son démarrage et arrive directement dessus, sans écran de
        // lancement ni identifiants (Justin, 13 novembre 2026). La première fenêtre, elle, se charge tout de suite.
        let poser: () -> Void = { [weak self] in
            guard let moi = self, moi.window?.rootViewController == nil else { return }
            moi.window?.rootViewController = CAPBridgeViewController()
            moi.window?.makeKeyAndVisible()
            DispatchQueue.main.async { moi.sceneDidBecomeActive(windowScene) }
        }
        let dejaOuverte = UIApplication.shared.connectedScenes
            .filter { $0 !== scene }
            .compactMap { (($0.delegate as? SceneDelegate)?.window?.rootViewController as? CAPBridgeViewController)?.webView }
            .first
        if let source = dejaOuverte {
            source.evaluateJavaScript("typeof window.opgFenetrePasse === 'function' ? window.opgFenetrePasse() : false") { _, _ in poser() }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { poser() }   // si la page ne répond pas, on ouvre quand même
        } else {
            poser()
        }

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
            // Les fenêtres : la page demande une fenêtre de plus, et dit le titre de celle-ci (menu Fenêtre du Mac).
            vue.configuration.userContentController.add(PontFenetres(scene: window?.windowScene), name: "opgFenetre")
        }
        vue.evaluateJavaScript(SceneDelegate.echelleMac, completionHandler: nil)
        // La barre grise en bas de la fenêtre (Justin, 12 novembre 2026) : c'est la barre d'aide à la saisie d'iOS
        // (précédent, suivant, OK), vide sur un Mac, qui se pose sur la page dès qu'un champ a été touché.
        vue.retirerBarreDeSaisie()
        surveillerBarreClavier()
        masquerBarreClavier()
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

    // Troisième garde contre la bande grise du bas (elle restait même sans champ actif, capture du 13 novembre 2026) :
    // sur un Mac il n'y a pas de clavier à l'écran, donc tout ce que le système pose pour lui (barre de raccourcis,
    // fond du clavier) est masqué dès qu'il paraît. Sans effet sur iPhone et iPad.
    private var barreSurveillee = false

    private func surveillerBarreClavier() {
        guard ProcessInfo.processInfo.isiOSAppOnMac, !barreSurveillee else { return }
        barreSurveillee = true
        let noms: [Notification.Name] = [UIResponder.keyboardWillShowNotification, UIResponder.keyboardDidShowNotification,
                                         UIResponder.keyboardWillChangeFrameNotification, UIResponder.keyboardDidChangeFrameNotification]
        for nom in noms {
            NotificationCenter.default.addObserver(forName: nom, object: nil, queue: .main) { [weak self] _ in
                self?.masquerBarreClavier()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { self?.masquerBarreClavier() }
            }
        }
    }

    private func masquerBarreClavier() {
        guard ProcessInfo.processInfo.isiOSAppOnMac else { return }
        for scene in UIApplication.shared.connectedScenes {
            guard let fenetres = (scene as? UIWindowScene)?.windows else { continue }
            for fenetre in fenetres { masquerVuesClavier(dans: fenetre) }
        }
    }

    private func masquerVuesClavier(dans vue: UIView) {
        let nom = String(describing: type(of: vue))
        if nom.contains("InputAssistant") || nom.contains("InputSetHostView") || nom.contains("KBInputBackdrop") || nom.contains("InputSetContainerView") {
            vue.isHidden = true
            vue.alpha = 0
            return
        }
        for sous in vue.subviews { masquerVuesClavier(dans: sous) }
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


// Ce que la page demande à la coque à propos des fenêtres : `{a:'fenetre'}` en ouvre une de plus (le passage est déjà
// rangé par la page), `{a:'titre', t:'…'}` nomme la fenêtre d'après la rubrique affichée.
final class PontFenetres: NSObject, WKScriptMessageHandler {
    weak var scene: UIWindowScene?
    init(scene: UIWindowScene?) { self.scene = scene }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let corps = message.body as? [String: Any], let action = corps["a"] as? String else { return }
        if action == "titre", let titre = corps["t"] as? String {
            scene?.title = String(titre.prefix(60))
        } else if action == "fenetre", UIApplication.shared.supportsMultipleScenes {
            UIApplication.shared.requestSceneSessionActivation(nil, userActivity: nil, options: nil, errorHandler: nil)
        }
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
