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
        }
        vue.evaluateJavaScript(SceneDelegate.echelleMac, completionHandler: nil)
        // Le trackpad : deux doigts vers la gauche ou la droite reviennent à l'écran précédent ou suivant.
        vue.allowsBackForwardNavigationGestures = true
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
