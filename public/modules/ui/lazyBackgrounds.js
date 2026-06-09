import { escapeHtml } from "./formatting.js";

export function renderLazyBackgroundAttrs(styleText = "", { lazy = true } = {}) {
  const style = String(styleText || "").trim();
  if (!style) return "";
  return lazy
    ? `data-lazy-background="${escapeHtml(style)}"`
    : `style="${escapeHtml(style)}"`;
}

function applyLazyBackground(element) {
  const styleText = element?.dataset?.lazyBackground || element?.getAttribute?.("data-lazy-background") || "";
  if (!styleText) return;
  if (element.style && "cssText" in element.style) {
    element.style.cssText = [element.style.cssText, styleText].filter(Boolean).join("; ");
  } else {
    element?.setAttribute?.("style", styleText);
  }
  element?.removeAttribute?.("data-lazy-background");
}

export function hydrateLazyBackgrounds(root = document, {
  selector = "[data-lazy-background]",
  rootMargin = "420px 0px",
  IntersectionObserverImpl = globalThis.IntersectionObserver
} = {}) {
  const elements = Array.from(root?.querySelectorAll?.(selector) || []);
  if (!elements.length) return 0;
  if (typeof IntersectionObserverImpl !== "function") {
    elements.forEach(applyLazyBackground);
    return elements.length;
  }
  const observer = new IntersectionObserverImpl((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting && entry.intersectionRatio <= 0) return;
      applyLazyBackground(entry.target);
      currentObserver.unobserve(entry.target);
    });
  }, { root: null, rootMargin, threshold: 0.01 });
  elements.forEach((element) => observer.observe(element));
  return elements.length;
}
