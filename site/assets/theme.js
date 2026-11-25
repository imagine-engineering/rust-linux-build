(() => {
  const key = "rust-linux-build-theme";
  try {
    if (localStorage.getItem(key) === "light") document.documentElement.dataset.theme = "light";
  } catch {
    // A disabled storage backend still permits a theme change for this page.
  }

  document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector("#theme");
    function update() {
      const light = document.documentElement.dataset.theme === "light";
      toggle.setAttribute("aria-label", `Switch to ${light ? "dark" : "light"} theme`);
      toggle.title = toggle.getAttribute("aria-label");
      toggle.querySelector("use").setAttribute("href", `./assets/icons.svg#${light ? "moon" : "sun"}`);
    }
    update();
    toggle.addEventListener("click", () => {
      const theme = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      try { localStorage.setItem(key, theme); } catch { /* Ephemeral preference. */ }
      update();
    });
  });
})();
