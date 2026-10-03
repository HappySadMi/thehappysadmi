/* ==========================================================
   Happy Sad Mi
   chat.js

   Chat assistant widget.

   Progressive enhancement: the entire widget is built here and injected, so
   a JS failure leaves no broken markup behind. The contact form remains the
   primary way to reach the team -- this is a convenience, not a gate.

   Privacy: conversation state lives only in this closure. Nothing is written
   to localStorage or sessionStorage, so closing or reloading the page
   discards it. That matches what privacy.html promises.
   ========================================================== */

const CHAT_ENDPOINT = "https://portfolio.happysadmi.workers.dev/chat";

const MAX_HISTORY_TURNS = 8;
const MAX_INPUT_CHARS = 800;

const SUGGESTIONS = [
  "What services do you offer?",
  "Who is on the team?",
  "What is your process?",
  "How do I get in touch?"
];

const GREETING =
  "Hi! I can answer questions about Happy Sad Mi — our services, projects, " +
  "process and team. For pricing or scheduling, please use the contact form.";

document.addEventListener("DOMContentLoaded", () => {

  initChat();

});

/* ==========================================================
   INIT
   ========================================================== */

function initChat() {

  const launcher = createElement("button", {
    className: "chat-launcher",
    attrs: {
      type: "button",
      id: "chatLauncher",
      "aria-label": "Open the chat assistant",
      "aria-expanded": "false",
      "aria-controls": "chatPanel",
      html: '<i class="fas fa-comment-dots" aria-hidden="true"></i>'
    }
  });

  const panel = buildPanel();

  document.body.append(launcher, panel.panel);

  launcher.addEventListener("click", () => {

    if (panel.isOpen()) closeChat(launcher, panel);
    else openChat(launcher, panel);

  });

  panel.closeBtn.addEventListener("click", () => closeChat(launcher, panel));

  panel.form.addEventListener("submit", (event) => {

    event.preventDefault();
    sendMessage(panel);

  });

  panel.input.addEventListener("keydown", (event) => {

    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {

      event.preventDefault();
      sendMessage(panel);

    }

  });

  // Auto-grow the textarea up to its CSS max-height.
  panel.input.addEventListener("input", () => {

    panel.input.style.height = "auto";
    panel.input.style.height = Math.min(panel.input.scrollHeight, 120) + "px";

  });

  document.addEventListener("keydown", (event) => {

    if (event.key === "Escape" && panel.isOpen()) {

      closeChat(launcher, panel);

    }

  });

  watchConsentBanner();

}

/* ==========================================================
   PANEL CONSTRUCTION
   ========================================================== */

function buildPanel() {

  const panel = createElement("div", {
    className: "chat-panel",
    attrs: {
      id: "chatPanel",
      role: "dialog",
      "aria-labelledby": "chatHeading",
      hidden: ""
    }
  });

  const head = createElement("div", { className: "chat-head" });
  const headText = createElement("div");
  headText.append(
    createElement("h2", { text: "Happy Sad Mi assistant", attrs: { id: "chatHeading" } }),
    createElement("p", { text: "Usually replies in a few seconds" })
  );
  const closeBtn = createElement("button", {
    className: "chat-close",
    attrs: { type: "button", "aria-label": "Close the chat assistant", html: '<i class="fas fa-xmark" aria-hidden="true"></i>' }
  });
  head.append(headText, closeBtn);

  // role="log" makes screen readers announce newly added messages.
  const log = createElement("div", {
    className: "chat-log",
    attrs: { id: "chatLog", role: "log", "aria-live": "polite", "aria-relevant": "additions" }
  });
  log.append(createElement("div", { className: "chat-msg is-bot", text: GREETING }));

  const suggestions = createElement("div", { className: "chat-suggestions" });
  SUGGESTIONS.forEach(text => {
    const chip = createElement("button", {
      className: "chat-suggestion",
      text,
      attrs: { type: "button" }
    });
    chip.addEventListener("click", () => {
      panel.input.value = text;
      sendMessage(panel);
    });
    suggestions.appendChild(chip);
  });

  const form = createElement("form", { className: "chat-form" });

  const inputId = "chatInput";
  const input = createElement("textarea", {
    className: "chat-input",
    attrs: {
      id: inputId,
      rows: "1",
      maxlength: String(MAX_INPUT_CHARS),
      placeholder: "Ask about our services, projects or team..."
    }
  });

  const sendBtn = createElement("button", {
    className: "chat-send",
    attrs: {
      type: "submit",
      "aria-label": "Send message",
      html: '<i class="fas fa-paper-plane" aria-hidden="true"></i>'
    }
  });

  form.append(input, sendBtn);

  const foot = createElement("p", { className: "chat-foot" });
  foot.innerHTML =
    'For pricing and scheduling, please use the <a href="#contact">contact form</a>. ' +
    "Do not send personal details here.";

  panel.append(head, log, suggestions, form, foot);

  return {
    panel,
    closeBtn,
    log,
    form,
    input,
    sendBtn,
    suggestions,
    history: [],
    isOpen: () => panel.classList.contains("is-open")
};

}

/* ==========================================================
   OPEN / CLOSE
   ========================================================== */

function openChat(launcher, panel) {

  panel.panel.hidden = false;

  launcher.setAttribute("aria-expanded", "true");
  launcher.setAttribute("aria-label", "Close the chat assistant");

  // Next frame, so the transition has an initial state to animate from.
  requestAnimationFrame(() => {

    panel.panel.classList.add("is-open");

    // Focus only once the panel is actually visible. Focusing an element
    // that is still visibility:hidden silently does nothing, which is why
    // this cannot happen before the class is added.
    panel.input.focus();

  });

}

function closeChat(launcher, panel) {

  panel.panel.classList.remove("is-open");

  launcher.setAttribute("aria-expanded", "false");
  launcher.setAttribute("aria-label", "Open the chat assistant");

  launcher.focus();

  // Wait out the transition before hiding, so it does not vanish abruptly.
  setTimeout(() => {

    if (!panel.panel.classList.contains("is-open")) panel.panel.hidden = true;

  }, 220);

}

/* ==========================================================
   SEND
   ========================================================== */

async function sendMessage(panel) {

  const text = panel.input.value.trim();

  if (!text) return;
  if (panel.input.disabled) return; // still streaming

  panel.input.value = "";
  panel.input.style.height = "auto";

  panel.log.appendChild(createElement("div", { className: "chat-msg is-user", text }));

  const pending = createElement("div", { className: "chat-msg is-bot is-pending" });
  pending.textContent = "";
  panel.log.appendChild(pending);

  scrollToEnd(panel);

  setBusy(panel, true);

  const history = panel.history.map(turn => ({ ...turn }));

  try {

    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history,
        stream: true
      })
    });

    if (res.status === 429) {

      const retry = Number(res.headers.get("Retry-After") || 10);
      throw new Error(
        `Too many messages in a row. Please wait about ${retry} seconds and try again.`
      );

    }

    if (res.status === 502) {

      throw new Error(
        "The assistant is taking too long right now. Please try again in a moment."
      );

    }

    if (!res.ok || !res.body) {

      throw new Error("Something went wrong reaching the assistant. Please try again.");

    }

    // Stream the reply into the pending bubble.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {

      const { value, done } = await reader.read();

      if (done) break;

      full += decoder.decode(value, { stream: true });
      pending.textContent = full;
      scrollToEnd(panel);

    }

    pending.textContent = full.trim();
    pending.classList.remove("is-pending");

    if (full.trim()) {

      panel.history.push({ role: "user", content: text });
      panel.history.push({ role: "assistant", content: full.trim() });

      // Keep the payload small; the Worker caps this anyway.
      if (panel.history.length > MAX_HISTORY_TURNS * 2) {

        panel.history = panel.history.slice(-MAX_HISTORY_TURNS * 2);

      }

    } else {

      pending.remove();
      addNotice(panel, "The assistant returned an empty reply. Please try rephrasing.");

    }

  } catch (error) {

    pending.remove();
    addNotice(panel, error.message || "Something went wrong. Please try again.");

  } finally {

    setBusy(panel, false);
    panel.input.focus();

  }

}

function addNotice(panel, text) {

  panel.log.appendChild(createElement("div", { className: "chat-msg is-error", text }));

  scrollToEnd(panel);

}

function setBusy(panel, busy) {

  panel.input.disabled = busy;
  panel.sendBtn.disabled = busy;
  panel.log.setAttribute("aria-busy", busy ? "true" : "false");

}

function scrollToEnd(panel) {

  panel.log.scrollTop = panel.log.scrollHeight;

}

/* ==========================================================
   CONSENT BANNER OFFSET
   ========================================================== */

/**
 * The launcher and the back-to-top button are fixed to the bottom of the
 * viewport, so the consent banner would cover them. Measure the banner and
 * expose it as a CSS variable that chat.css offsets both controls by.
 */
function watchConsentBanner() {

  const banner = document.getElementById("consentBanner");

  if (!banner) return;

  const apply = () => {

    const open = !banner.hasAttribute("hidden");

    document.body.classList.toggle("has-consent-banner", open);

    document.documentElement.style.setProperty(
      "--consent-height",
      open ? `${Math.round(banner.getBoundingClientRect().height)}px` : "0px"
    );

  };

  const observer = new MutationObserver(apply);
  observer.observe(banner, { attributes: true, attributeFilter: ["hidden"] });

  banner.addEventListener("transitionend", apply);

  window.addEventListener("resize", apply);

  apply();

}

/* ==========================================================
   ELEMENT HELPER
   ========================================================== */

/**
 * Minimal element factory. Kept local rather than relying on app.js so the
 * widget works even if the other scripts fail.
 */
function createElement(tag, options = {}) {

  const el = document.createElement(tag);

  if (options.className) el.className = options.className;

  if (options.text != null) el.textContent = options.text;

  if (options.html != null) el.innerHTML = options.html;

  if (options.attrs) {

    Object.entries(options.attrs).forEach(([key, value]) => {

      if (value == null) return;

      el.setAttribute(key, value);

    });

  }

  return el;

}