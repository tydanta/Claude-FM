import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import LiquidGlass from "liquid-glass-react";

const navItems = [
  { id: "radio", label: "cladio", icon: "claude" },
  { id: "mine", label: "\u6211\u7684", icon: "user" }
];

function getActivePage() {
  const page = document.body.dataset.page;
  return page === "mine" || page === "settings" ? "mine" : "radio";
}

function ClaudeIcon() {
  return (
    <span className="liquid-nav-claude" aria-hidden="true">
      <i />
      <b />
    </span>
  );
}

function UserIcon() {
  return <span className="liquid-nav-user" aria-hidden="true" />;
}

function LiquidNav() {
  const [activePage, setActivePage] = useState(getActivePage);
  const glassProps = useMemo(() => ({
    displacementScale: 65,
    blurAmount: 0.1,
    saturation: 130,
    aberrationIntensity: 2,
    elasticity: 0.15,
    cornerRadius: 0,
    padding: "7px",
    mode: "standard",
    overLight: false
  }), []);

  useEffect(() => {
    const observer = new MutationObserver(() => setActivePage(getActivePage()));
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-page", "data-theme"] });
    const onPageChange = () => setActivePage(getActivePage());
    window.addEventListener("claudio:pagechange", onPageChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("claudio:pagechange", onPageChange);
    };
  }, []);

  const go = (page) => {
    window.dispatchEvent(new CustomEvent("claudio:navigate", { detail: { page } }));
  };

  return (
    <LiquidGlass className="liquid-nav-glass" style={{ width: "100%" }} {...glassProps}>
      <div className="liquid-nav-content" role="presentation">
        <span className="liquid-nav-indicator" style={{ left: activePage === "mine" ? "75%" : "25%" }} />
        {navItems.map((item) => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              className={`status-tab liquid-status-tab${active ? " is-active" : ""}`}
              type="button"
              data-page-target={item.id}
              aria-pressed={active}
              onClick={() => go(item.id)}
            >
              {item.icon === "claude" ? <ClaudeIcon /> : <UserIcon />}
              <span className="status-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </LiquidGlass>
  );
}

const mount = document.querySelector("#liquidNavRoot");

if (mount) {
  createRoot(mount).render(<LiquidNav />);
  document.body.classList.add("has-liquid-react-nav");
}

