import UIKit
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
    // On rend à la page la taille qu'elle a sur le Web. Sans effet sur iPhone et iPad.
    func sceneDidBecomeActive(_ scene: UIScene) {
        guard ProcessInfo.processInfo.isiOSAppOnMac,
              let pont = window?.rootViewController as? CAPBridgeViewController,
              let vue = pont.webView, vue.pageZoom != 1.3 else { return }
        vue.pageZoom = 1.3
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
