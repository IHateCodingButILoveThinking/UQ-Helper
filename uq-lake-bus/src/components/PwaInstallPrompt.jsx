import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Download, MoreVertical, Share2, Smartphone, X } from "lucide-react";

const DISMISS_KEY = "uq-campus-pwa-install-dismissed-v1";
const DISMISS_FOR_MS = 3 * 24 * 60 * 60 * 1000;

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  const userAgent = window.navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(userAgent) ||
    (window.navigator.platform === "MacIntel" &&
      window.navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent);
}

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

export default function PwaInstallPrompt({ visible }) {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(() => isStandaloneApp());
  const [dismissed, setDismissed] = useState(() => wasRecentlyDismissed());
  const [isIos] = useState(() => isIosDevice());
  const [isAndroid] = useState(() => isAndroidDevice());
  const [ready, setReady] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    const revealTimer = window.setTimeout(() => setReady(true), 1400);
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowInstallHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.clearTimeout(revealTimer);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (!visible) setShowInstallHelp(false);
  }, [visible]);

  const dismiss = () => {
    setDismissed(true);
    setShowInstallHelp(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // The prompt can still be dismissed for the current session.
    }
  };

  const install = async () => {
    if (!installPrompt) {
      setShowInstallHelp(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice?.outcome === "accepted") {
      setInstalled(true);
    } else {
      dismiss();
    }
  };

  const canOfferInstall = Boolean(installPrompt) || isIos;
  const showPrompt =
    visible && ready && canOfferInstall && !installed && !dismissed;
  const showLauncher = visible && ready && !installed && !showPrompt;
  const deviceLabel = isIos
    ? "iPhone or iPad"
    : isAndroid
      ? "Android phone"
      : "Browser install";

  return (
    <>
      <AnimatePresence>
        {showLauncher ? (
          <motion.button
            type="button"
            className="pwa-install-launcher"
            aria-label="Install UQ Campus app"
            onClick={install}
            initial={{ opacity: 0, y: -8, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <Download aria-hidden="true" />
            <span>Install app</span>
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showPrompt ? (
          <motion.aside
            className="pwa-install-prompt"
            aria-label="Install UQ Campus"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="pwa-install-icon" aria-hidden="true">
              <Smartphone />
            </span>
            <span className="pwa-install-copy">
              <strong>Get UQ Campus</strong>
              <small>{isIos ? "Add it to your Home Screen" : "Install on this device"}</small>
            </span>
            <button type="button" className="pwa-install-action" onClick={install}>
              <Download aria-hidden="true" />
              {isIos ? "How" : "Install"}
            </button>
            <button
              type="button"
              className="pwa-install-dismiss"
              aria-label="Dismiss install suggestion"
              onClick={dismiss}
            >
              <X aria-hidden="true" />
            </button>
          </motion.aside>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {visible && !installed && showInstallHelp ? (
          <motion.div
            className="pwa-ios-backdrop"
            role="presentation"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInstallHelp(false)}
          >
            <motion.section
              className="pwa-ios-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="pwa-ios-title"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(event) => event.stopPropagation()}
            >
              <span className="pwa-ios-handle" aria-hidden="true" />
              <div className="pwa-ios-title-row">
                <span>
                  {isIos ? <Share2 aria-hidden="true" /> : <MoreVertical aria-hidden="true" />}
                </span>
                <div>
                  <small>{deviceLabel}</small>
                  <h2 id="pwa-ios-title">
                    {isIos ? "Add to Home Screen" : "Install from your browser"}
                  </h2>
                </div>
              </div>
              <ol className="pwa-ios-steps">
                {isIos ? (
                  <>
                    <li><b>1</b><span>Open this website in <strong>Safari</strong>.</span></li>
                    <li><b>2</b><span>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.</span></li>
                    <li><b>3</b><span>Tap <strong>Add</strong>.</span></li>
                  </>
                ) : (
                  <>
                    <li><b>1</b><span>Open this website in <strong>Chrome</strong>.</span></li>
                    <li><b>2</b><span>Tap the browser menu <strong>⋮</strong>.</span></li>
                    <li><b>3</b><span>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</span></li>
                  </>
                )}
              </ol>
              <button type="button" className="pwa-ios-done" onClick={() => setShowInstallHelp(false)}>Got it</button>
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
