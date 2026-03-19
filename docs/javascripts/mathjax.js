window.MathJax = {
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"], ["$$", "$$"]],
    processEscapes: true,
    processEnvironments: true,
  },
  options: {
    ignoreHtmlClass: ".*|",
    processHtmlClass: "arithmatex",
  },
  svg: {
    fontCache: "global",
  },
};

function typesetMath() {
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

if (!window.__zensical_mathjax_loaded__) {
  window.__zensical_mathjax_loaded__ = true;
  const script = document.createElement("script");
  script.id = "MathJax-script";
  script.async = true;
  script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
  script.onload = () => typesetMath();
  document.head.appendChild(script);
}

if (typeof document$ !== "undefined") {
  document$.subscribe(() => {
    typesetMath();
  });
}
