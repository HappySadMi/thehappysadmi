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

/* Short labels on purpose. The longer phrasings wrapped onto four or five
   rows in a 360px panel and pushed the composer out of view. */
const SUGGESTIONS = [
  { icon: "fas fa-layer-group", label: "Our services" },
  { icon: "fas fa-users", label: "Meet the team" },
  { icon: "fas fa-diagram-project", label: "Our process" },
  { icon: "fas fa-envelope", label: "How to reach us" }
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
    html: '<i class="fas fa-comment-dots" aria-hidden="true"></i>',
    attrs: {
      type: "button",
      id: "chatLauncher",
      "aria-label": "Open the chat assistant",
      "aria-expanded": "false",
      "aria-controls": "chatPanel"
    }
  });

  const ui = buildPanel();

  document.body.append(launcher, ui.panel);

  launcher.addEventListener("click", () => openChat(launcher, ui));

  ui.closeBtn.addEventListener("click", () => closeChat(launcher, ui));

  // Wired here rather than inside buildPanel, because only now do we have
  // the controls object the handler needs.
  ui.chips.forEach(chip => {
    chip.addEventListener("click", () => {
      ui.input.value = chip.dataset.question;
      sendMessage(ui);
    });
  });

  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(ui);
  });

  ui.input.addEventListener("keydown", (event) => {
    // Enter sends; Shift+Enter inserts a newline.
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage(ui);
    }
  });

  // Auto-grow the textarea up to its CSS max-height.
  ui.input.addEventListener("input", () => {
    ui.input.style.height = "auto";
    ui.input.style.height = Math.min(ui.input.scrollHeight, 120) + "px";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ui.isOpen()) closeChat(launcher, ui);
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

  /* ---------- Header ---------- */

  const head = createElement("div", { className: "chat-head" });

  const headMain = createElement("div", { className: "chat-head-main" });
  headMain.append(
    createElement("span", {
      className: "chat-avatar",
      html: '<i class="fas fa-robot" aria-hidden="true"></i><span class="chat-online"></span>'
    })
  );

  const headText = createElement("div", { className: "chat-head-text" });
  headText.append(
    createElement("h2", { text: "Happy Sad Mi assistant", attrs: { id: "chatHeading" } }),
    createElement("p", { text: "Typically replies in seconds" })
  );
  headMain.append(headText);

  const closeBtn = createElement("button", {
    className: "chat-close",
    html: '<i class="fas fa-xmark" aria-hidden="true"></i>',
    attrs: { type: "button", "aria-label": "Close the chat assistant" }
  });

  head.append(headMain, closeBtn);

  /* ---------- Transcript ---------- */

  // role="log" makes screen readers announce newly added messages.
  const log = createElement("div", {
    className: "chat-log",
    attrs: {
      id: "chatLog",
      role: "log",
      "aria-live": "polite",
      "aria-relevant": "additions"
    }
  });

  const botAvatar = createElement("span", {
    className: "chat-avatar is-sm",
    html: '<i class="fas fa-robot" aria-hidden="true"></i>'
  });

  const greeting = createElement("div", { className: "chat-msg", text: GREETING });
  const greetingRow = createElement("div", { className: "chat-row is-bot" });
  greetingRow.append(botAvatar, greeting);
  log.append(greetingRow);

  /* ---------- Suggested questions ---------- */

  // Built here, wired in initChat: inside this function `panel` is the DOM
  // element, not the controls object returned below, so `panel.input` would
  // be undefined.
  const suggestions = createElement("div", { className: "chat-suggestions" });
  const chips = [];

  // Icon and label are appended separately rather than passing both `html`
  // and `text`: `html` assigns innerHTML, which wipes any text already set.
  SUGGESTIONS.forEach(({ icon, label }) => {
    const chip = createElement("button", {
      className: "chat-suggestion",
      attrs: { type: "button", "data-question": label }
    });

    chip.appendChild(createElement("i", {
      className: icon,
      attrs: { "aria-hidden": "true" }
    }));
    chip.appendChild(document.createTextNode(label));

    chips.push(chip);
    suggestions.appendChild(chip);
  });

  /* ---------- Composer ---------- */

  const form = createElement("form", { className: "chat-form" });

  const input = createElement("textarea", {
    className: "chat-input",
    attrs: {
      id: "chatInput",
      rows: "1",
      maxlength: String(MAX_INPUT_CHARS),
      // Kept short enough to sit on one line. A longer prompt wrapped to two
      // lines and the second was clipped by the single-row textarea.
      placeholder: "Ask about our services or team…"
    }
  });

  const sendBtn = createElement("button", {
    className: "chat-send",
    html: '<i class="fas fa-paper-plane" aria-hidden="true"></i>',
    attrs: { type: "submit", "aria-label": "Send message" }
  });

  form.append(
    createElement("label", { className: "visually-hidden", text: "Type your message", attrs: { for: "chatInput" } }),
    input,
    sendBtn
  );

  /* ---------- Footer note ---------- */

  const foot = createElement("p", { className: "chat-foot" });
  foot.innerHTML =
    'Pricing or scheduling? <a href="#contact">Use the contact form</a>. ' +
    "Please don’t send personal details here.";

  panel.append(head, log, suggestions, form, foot);

  return {
    panel,
    closeBtn,
    log,
    form,
    input,
    sendBtn,
    chips,
    suggestions,
    botAvatar,
    chipsShown: true,
    history: [],
    isOpen: () => panel.classList.contains("is-open")
  };

}

/* ==========================================================
   OPEN / CLOSE
   ========================================================== */

/**
 * The panel's bottom edge is level with the launcher (both use --chat-dock),
 * so the launcher is hidden while the panel is open and the card appears to
 * grow out of the button's corner.
 */
function openChat(launcher, ui) {

  // Un-hide first: the closed state is display:none, so this is what makes
  // the panel render at all.
  ui.panel.hidden = false;

  // Flush the just-removed [hidden] state so the entrance animation has a
  // starting value.
  //
  // Deliberately NOT requestAnimationFrame. rAF is paused in background tabs
  // and throttled by some mobile browsers, and it used to be what decided
  // whether the panel was visible.
  void ui.panel.offsetHeight;

  // Adds the entrance animation only. The panel's open appearance is the
  // plain CSS default, so if the animation never runs the panel is still
  // visible and usable rather than stuck invisible.
  ui.panel.classList.add("is-open");

  launcher.setAttribute("aria-expanded", "true");
  launcher.hidden = true;

  ui.input.focus();

}

function closeChat(launcher, ui) {

  ui.panel.classList.remove("is-open");
  ui.panel.hidden = true;

  launcher.setAttribute("aria-expanded", "false");

  // Show the launcher before restoring focus, otherwise it is still
  // display:none and focus() silently goes nowhere.
  launcher.hidden = false;
  launcher.focus();

}

/* ==========================================================
   SEND
   ========================================================== */

async function sendMessage(ui) {

  const text = ui.input.value.trim();

  if (!text) return;
  if (ui.input.disabled) return; // still streaming

  ui.input.value = "";
  ui.input.style.height = "auto";

  // The starter chips have served their purpose. Keeping them around costs
  // 110-215px of the panel, which on a short screen with the consent banner
  // open is the difference between the composer fitting and being clipped.
  if (ui.chipsShown) {
    ui.chipsShown = false;
    ui.suggestions.hidden = true;
  }

  appendUser(ui, text);

  const bubble = appendBot(ui);
  bubble.classList.add("is-typing");
  bubble.append(typingDots());

  scrollToEnd(ui);
  setBusy(ui, true);

  try {

    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: ui.history.map(turn => ({ ...turn })),
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
      throw new Error("The assistant is taking too long right now. Please try again in a moment.");
    }

    if (!res.ok || !res.body) {
      throw new Error("Something went wrong reaching the assistant. Please try again.");
    }

    // Stream the reply into the pending bubble. Three real dots are shown
    // until the first token lands, then replaced.
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      full += decoder.decode(value, { stream: true });

      if (bubble.classList.contains("is-typing")) bubble.classList.remove("is-typing");
      bubble.textContent = full;
      scrollToEnd(ui);
    }

    full = full.trim();

    if (!full) {
      bubble.closest(".chat-row").remove();
      appendNotice(ui, "The assistant returned an empty reply. Please try rephrasing.");
      return;
    }

    bubble.textContent = full;

    ui.history.push({ role: "user", content: text });
    ui.history.push({ role: "assistant", content: full });

    // Keep the payload small; the Worker caps this anyway.
    const maxMessages = MAX_HISTORY_TURNS * 2;
    if (ui.history.length > maxMessages) ui.history = ui.history.slice(-maxMessages);

  } catch (error) {

    bubble.closest(".chat-row").remove();
    appendNotice(ui, error.message || "Something went wrong. Please try again.");

  } finally {

    setBusy(ui, false);
    ui.input.focus();

  }

}

function appendUser(ui, text) {

  const row = createElement("div", { className: "chat-row is-user" });
  row.append(createElement("div", { className: "chat-msg", text }));
  ui.log.appendChild(row);

}

function appendBot(ui) {

  const row = createElement("div", { className: "chat-row is-bot" });
  const bubble = createElement("div", { className: "chat-msg" });

  row.append(ui.botAvatar.cloneNode(true), bubble);
  ui.log.appendChild(row);

  return bubble;

}

function appendNotice(ui, text) {

  const row = createElement("div", { className: "chat-row is-bot is-error" });
  row.append(
    ui.botAvatar.cloneNode(true),
    createElement("div", { className: "chat-msg", text })
  );
  ui.log.appendChild(row);

  scrollToEnd(ui);

}

function typingDots() {

  const frag = document.createDocumentFragment();
  for (let i = 0; i < 3; i++) frag.appendChild(createElement("span"));
  return frag;

}

function setBusy(ui, busy) {

  ui.input.disabled = busy;
  ui.sendBtn.disabled = busy;
  ui.log.setAttribute("aria-busy", busy ? "true" : "false");

}

function scrollToEnd(ui) {

  ui.log.scrollTop = ui.log.scrollHeight;

}

/* ==========================================================
   CONSENT BANNER OFFSET
   ========================================================== */

/**
 * The launcher and the panel are fixed to the bottom of the viewport, so the
 * consent banner would cover them. Measure the banner and expose it as a CSS
 * variable that chat.css folds into their offsets.
 *
 * chat.css deliberately does not also key off a body class: that class
 * silently failed to apply once, which left the controls underneath the
 * banner.
 */
function watchConsentBanner() {

  const banner = document.getElementById("consentBanner");

  if (!banner) return;

  const apply = () => {

    const open = !banner.hasAttribute("hidden");

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
 *
 * `html` and `text` are top-level options. Passing `html` inside `attrs`
 * calls setAttribute("html", ...) instead, which silently produces no
 * markup at all.
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