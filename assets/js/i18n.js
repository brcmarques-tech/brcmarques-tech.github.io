/* =========================================================
   brcmarques.dev — i18n engine (vanilla, no deps)
   PT-BR é o idioma-fonte (já no HTML). EN/ES vêm de window.I18N.
   Roda de forma síncrona ANTES do main.js para que o split-text
   opere sobre o texto já traduzido.
   ========================================================= */
(() => {
  "use strict";
  const DICT = window.I18N || { en: {}, es: {} };
  const LANGS = ["pt", "en", "es"];
  const STORE_KEY = "pf_lang";

  // Registro de tudo que é traduzível, com o original (PT) cacheado do DOM.
  const reg = [];
  function capture() {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const isMeta = el.tagName === "META";
      reg.push({ el, key, attr: isMeta ? "content" : null,
        pt: isMeta ? (el.getAttribute("content") || "") : el.innerHTML });
    });
    [["data-i18n-alt", "alt"], ["data-i18n-aria", "aria-label"]].forEach(([dataAttr, domAttr]) => {
      document.querySelectorAll("[" + dataAttr + "]").forEach((el) => {
        reg.push({ el, key: el.getAttribute(dataAttr), attr: domAttr,
          pt: el.getAttribute(domAttr) || "" });
      });
    });
  }

  function valueFor(key, lang) {
    if (lang === "pt") return null; // usa o PT cacheado
    const table = DICT[lang] || {};
    return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null;
  }

  function apply(lang) {
    reg.forEach(({ el, key, attr, pt }) => {
      const v = lang === "pt" ? pt : valueFor(key, lang);
      const out = v == null ? pt : v; // fallback p/ PT se faltar tradução
      if (attr) el.setAttribute(attr, out);
      else el.innerHTML = out;
    });
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
    // estado do seletor
    document.querySelectorAll("[data-lang]").forEach((b) => {
      b.setAttribute("aria-current", b.getAttribute("data-lang") === lang ? "true" : "false");
    });
  }

  function resolveInitial() {
    const params = new URLSearchParams(location.search);
    const q = (params.get("lang") || "").toLowerCase();
    if (LANGS.includes(q)) return q;
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (LANGS.includes(saved)) return saved;
    const nav = (navigator.language || "pt").slice(0, 2).toLowerCase();
    if (nav === "es") return "es";
    if (nav === "pt") return "pt";
    return "en"; // qualquer outro idioma do navegador → inglês
  }

  function persist(lang) {
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) {}
    const url = new URL(location.href);
    if (lang === "pt") url.searchParams.delete("lang");
    else url.searchParams.set("lang", lang);
    history.replaceState(null, "", url);
  }

  function setLang(lang, save) {
    if (!LANGS.includes(lang)) lang = "pt";
    apply(lang);
    if (save) persist(lang);
  }

  function bindSwitcher() {
    document.querySelectorAll("[data-lang]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.preventDefault();
        setLang(b.getAttribute("data-lang"), true);
      });
    });
  }

  // boot síncrono (script no fim do body → DOM já parseado)
  capture();
  const initial = resolveInitial();
  apply(initial);
  // mantém ?lang coerente sem empurrar PT na URL
  if (initial !== "pt") persist(initial);
  bindSwitcher();
  window.PF_I18N = { set: (l) => setLang(l, true), current: () => document.documentElement.lang };
})();
