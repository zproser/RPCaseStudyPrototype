const sectionsToReveal = document.querySelectorAll(".fade-in");
const mainScrollContainer = document.querySelector("main");
const sections = Array.from(document.querySelectorAll("main .section"));
const menuButton = document.querySelector(".hamburger-btn");
const menuOverlay = document.querySelector(".menu-overlay");
const menuOverlayLinks = document.querySelectorAll(".menu-links a");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeSectionIndex = 0;
let isTransitioning = false;
let isMenuOpen = false;
let scrollTransitionGeneration = 0;

function endSectionTransition(scrollEl, generation, onDone) {
  let finished = false;
  const done = () => {
    if (finished || generation !== scrollTransitionGeneration) return;
    finished = true;
    onDone();
  };
  scrollEl.addEventListener("scrollend", done, { once: true });
  window.setTimeout(done, reducedMotion.matches ? 80 : 900);
}

if (sectionsToReveal.length > 0) {
  sectionsToReveal[0].classList.add("is-visible");
}

function setupObjectiveLines() {
  const section = document.querySelector("#objective");
  const h2 = section && section.querySelector("h2");
  if (!section || !h2) return;

  const h2Top = h2.offsetTop;
  const h2Bottom = h2.offsetTop + h2.offsetHeight;

  const topSeg = document.createElement("div");
  topSeg.className = "line-segment";
  topSeg.style.top = "0";
  topSeg.style.height = h2Top + "px";

  const bottomSeg = document.createElement("div");
  bottomSeg.className = "line-segment";
  bottomSeg.style.top = h2Bottom + "px";
  bottomSeg.style.bottom = "0";

  section.appendChild(topSeg);
  section.appendChild(bottomSeg);
}

setupObjectiveLines();
window.addEventListener("resize", () => {
  document.querySelectorAll("#objective .line-segment").forEach((el) => el.remove());
  setupObjectiveLines();
});

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle("is-visible", entry.isIntersecting);
    });
  },
  {
    root: mainScrollContainer,
    threshold: 0.35,
  }
);

sectionsToReveal.forEach((section) => revealObserver.observe(section));

const navLinks = document.querySelectorAll('a[href^="#"]');

function jumpToSection(index) {
  if (!mainScrollContainer || sections.length === 0) {
    return;
  }
  const boundedIndex = Math.max(0, Math.min(sections.length - 1, index));
  activeSectionIndex = boundedIndex;
  isTransitioning = true;
  const generation = ++scrollTransitionGeneration;
  const useSmooth = !reducedMotion.matches;
  mainScrollContainer.scrollTo({
    top: boundedIndex * mainScrollContainer.clientHeight,
    behavior: useSmooth ? "smooth" : "auto",
  });
  const targetSection = sections[boundedIndex];
  targetSection.classList.remove("is-visible");
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      targetSection.classList.add("is-visible");
    });
  });
  endSectionTransition(mainScrollContainer, generation, () => {
    isTransitioning = false;
  });
}

function setMenuState(open) {
  isMenuOpen = open;
  document.body.classList.toggle("menu-open", open);
  if (menuButton) {
    menuButton.setAttribute("aria-expanded", open ? "true" : "false");
  }
  if (menuOverlay) {
    menuOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  }
}

if (mainScrollContainer && sections.length > 0) {
  mainScrollContainer.addEventListener(
    "wheel",
    (event) => {
      if (isMenuOpen) {
        event.preventDefault();
        return;
      }
      if (Math.abs(event.deltaY) < 8) {
        return;
      }
      const direction = event.deltaY > 0 ? 1 : -1;
      const currentSection = sections[activeSectionIndex];
      if (currentSection) {
        const atBottom = currentSection.scrollTop >= currentSection.scrollHeight - currentSection.clientHeight - 1;
        const atTop = currentSection.scrollTop <= 0;
        if (direction > 0 && !atBottom) return;
        if (direction < 0 && !atTop) return;
      }
      event.preventDefault();
      if (isTransitioning) return;
      jumpToSection(activeSectionIndex + direction);
    },
    { passive: false }
  );

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isMenuOpen) {
      setMenuState(false);
      return;
    }
    if (isMenuOpen) {
      return;
    }
    if (isTransitioning) {
      return;
    }
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      jumpToSection(activeSectionIndex + 1);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      jumpToSection(activeSectionIndex - 1);
    }
  });
}

if (menuButton) {
  menuButton.addEventListener("click", () => {
    setMenuState(!isMenuOpen);
  });
}

menuOverlayLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setMenuState(false);
  });
});

navLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetId = link.getAttribute("href");
    const targetSection = targetId ? document.querySelector(targetId) : null;
    if (!targetSection) {
      return;
    }
    event.preventDefault();
    const targetIndex = sections.findIndex((section) => section === targetSection);
    if (targetIndex >= 0) {
      jumpToSection(targetIndex);
    }
  });
});

document.querySelectorAll(".block-light").forEach((section) => {
  function setDotSpotlight(clientX, clientY) {
    const rect = section.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / Math.max(rect.width, 1)) * 100;
    const yPct = ((clientY - rect.top) / Math.max(rect.height, 1)) * 100;
    section.style.setProperty("--dot-mx", `${xPct}%`);
    section.style.setProperty("--dot-my", `${yPct}%`);
  }

  section.addEventListener("pointerenter", (event) => {
    setDotSpotlight(event.clientX, event.clientY);
  });

  section.addEventListener("pointermove", (event) => {
    setDotSpotlight(event.clientX, event.clientY);
  });

  section.addEventListener("pointerleave", () => {
    section.style.removeProperty("--dot-mx");
    section.style.removeProperty("--dot-my");
  });

  section.addEventListener(
    "touchmove",
    (event) => {
      const t = event.touches[0];
      if (t) setDotSpotlight(t.clientX, t.clientY);
    },
    { passive: true }
  );
});
