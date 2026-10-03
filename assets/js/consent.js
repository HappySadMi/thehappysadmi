/* ==========================================================
   Happy Sad Mi
   consent.js

   Analytics consent gate for Google Analytics (Consent Mode v2).

   The GA4 consent default in <head> already denies analytics_storage,
   so GA4 runs cookieless until a choice is recorded here. This file
   only decides whether to show the banner and then grants or leaves
   the existing denial in place.

   If this file never loads, nothing is granted -- the failure mode is
   "no analytics", not "analytics without consent".
   ========================================================== */

const CONSENT_KEY = "hsm-consent";

const CONSENT_GRANTED = "granted";
const CONSENT_DENIED = "denied";

/* Must mirror the gtag('consent', 'default', ...) call in index.html.
   ad_* stay denied regardless of the choice -- we run no ad features. */
const CONSENT_SIGNALS = {
    analytics_storage: CONSENT_GRANTED,
    ad_storage: CONSENT_DENIED,
    ad_user_data: CONSENT_DENIED,
    ad_personalization: CONSENT_DENIED
};

document.addEventListener("DOMContentLoaded", initConsent);

/* ==========================================================
   INIT
   ========================================================== */

function initConsent() {

    const banner = document.getElementById("consentBanner");

    const acceptBtn = document.getElementById("consentAccept");

    const declineBtn = document.getElementById("consentDecline");

    if (!banner || !acceptBtn || !declineBtn) return;

    // Already answered on a previous visit -- nothing to ask.
    if (readConsent()) return;

    showBanner(banner);

    acceptBtn.addEventListener("click", () => {

        storeConsent(CONSENT_GRANTED);

        applyConsent(CONSENT_GRANTED);

        hideBanner(banner);

    });

    declineBtn.addEventListener("click", () => {

        // Storing "declined" means we will not ask again. The consent
        // default in <head> is already "denied", so there is nothing
        // to undo -- we only need to remember the answer.
        storeConsent(CONSENT_DENIED);

        hideBanner(banner);

    });

    // Move focus to the banner so keyboard and screen reader users
    // are not left behind on the page body.
    acceptBtn.focus();

}

/* ==========================================================
   BANNER
   ========================================================== */

function showBanner(banner) {

    banner.hidden = false;

    // One frame later so the transition has an initial state to animate from
    requestAnimationFrame(() => banner.classList.add("show"));

}

function hideBanner(banner) {

    banner.classList.remove("show");

    banner.addEventListener("transitionend", () => {

        banner.hidden = true;

    }, { once: true });

    // Fallback for browsers where the transition never fires
    setTimeout(() => {

        banner.hidden = true;

    }, 400);

}

/* ==========================================================
   CONSENT STATE
   ========================================================== */

/* Grants or leaves denied. Safe to call whether or not gtag.js has
   finished loading -- gtag() queues onto dataLayer either way. */
function applyConsent(choice) {

    if (typeof window.gtag !== "function") return;

    const state = choice === CONSENT_GRANTED
        ? CONSENT_SIGNALS
        : {
            analytics_storage: CONSENT_DENIED,
            ad_storage: CONSENT_DENIED,
            ad_user_data: CONSENT_DENIED,
            ad_personalization: CONSENT_DENIED
        };

    window.gtag("consent", "update", state);

}

function storeConsent(choice) {

    try {

        localStorage.setItem(CONSENT_KEY, choice);

    }

    catch (error) {

        // Private browsing or storage disabled. The banner will be shown
        // again next visit, which is acceptable -- we never grant
        // analytics without a recorded choice.

        console.warn("Unable to store consent choice.", error);

    }

}

function readConsent() {

    try {

        return localStorage.getItem(CONSENT_KEY);

    }

    catch (error) {

        return null;

    }

}