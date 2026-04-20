const sectionsToReveal = document.querySelectorAll(".fade-in");
const mainScrollContainer = document.querySelector("main");
const sections = Array.from(document.querySelectorAll("main .section"));
const projectOverviewSection = document.querySelector("#project-overview");
const pageFooterEl = document.querySelector("#page-footer");

/** Cumulative scroll offsets — sections can differ from one viewport height (e.g. tall #objective). */
function getSectionScrollTops() {
  const tops = [];
  let acc = 0;
  for (const section of sections) {
    tops.push(acc);
    acc += section.offsetHeight;
  }
  return tops;
}

function scrollTopForSectionIndex(index) {
  const tops = getSectionScrollTops();
  const i = Math.max(0, Math.min(index, tops.length - 1));
  return tops[i] ?? 0;
}

function mainScrollTopToActiveSectionIndex(scrollTop) {
  const tops = getSectionScrollTops();
  for (let i = sections.length - 1; i >= 0; i--) {
    if (scrollTop + 0.5 >= tops[i]) {
      return i;
    }
  }
  return 0;
}

/** Keep scroll position clamped to the end of `main` (footer zone). */
function pinMainScrollBottom() {
  if (!mainScrollContainer) return;
  const max = mainScrollContainer.scrollHeight - mainScrollContainer.clientHeight;
  if (max <= 0) return;
  if (mainScrollContainer.scrollTop > max - 0.25) {
    mainScrollContainer.scrollTop = max;
  }
}
const projectOverviewScaleTarget = projectOverviewSection?.querySelector(".objective-overview-media");
const menuButton = document.querySelector(".hamburger-btn");
const menuOverlay = document.querySelector(".menu-overlay");
const menuOverlayLinks = document.querySelectorAll("#menuOverlay a[href]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let activeSectionIndex = 0;

/**
 * Map scroll position → --overview-img-scale (0.5 → 1), linearly.
 * #project-overview: thumb scales to intrinsic size (origin bottom-right, aligned with body copy).
 * Inner section scroll + main scroll fallback; see section scroll listeners on `sections`.
 */
function updateOverviewImageScrollScale() {
  if (!mainScrollContainer || !projectOverviewSection || !projectOverviewScaleTarget) return;
  if (reducedMotion.matches) {
    projectOverviewScaleTarget.style.removeProperty("--overview-img-scale");
    return;
  }
  const vh = mainScrollContainer.clientHeight;
  if (vh <= 0) return;

  const rect = projectOverviewSection.getBoundingClientRect();
  const maxInner = Math.max(0, projectOverviewSection.scrollHeight - projectOverviewSection.clientHeight);
  let raw;
  if (maxInner > 2) {
    raw = Math.min(1, Math.max(0, projectOverviewSection.scrollTop / maxInner));
  } else {
    raw = Math.min(1, Math.max(0, -rect.top / vh));
  }
  const t = Math.min(1, Math.max(0, raw));
  const scale = 0.5 + 0.5 * t;
  projectOverviewScaleTarget.style.setProperty("--overview-img-scale", scale.toFixed(4));
}

let isTransitioning = false;
let isMenuOpen = false;
let scrollTransitionGeneration = 0;
let lastMainScrollTopForNav = 0;

/** If `scrollend` is missing, unlock after this (native smooth is usually under ~1s). */
const SMOOTH_SCROLL_FALLBACK_MS = 900;

/**
 * Single `scrollTo({ behavior: "smooth" })` — browser handles interpolation (simplest / least janky).
 */
function scrollMainToIndex(targetIndex, generation, onArrived) {
  if (!mainScrollContainer) {
    onArrived?.();
    return;
  }
  const h = mainScrollContainer.clientHeight;
  if (h <= 0) {
    onArrived?.();
    return;
  }
  const targetTop = scrollTopForSectionIndex(targetIndex);
  if (Math.abs(targetTop - mainScrollContainer.scrollTop) < 1) {
    onArrived?.();
    return;
  }
  if (reducedMotion.matches) {
    mainScrollContainer.scrollTop = targetTop;
    onArrived?.();
    return;
  }

  let finished = false;
  function done() {
    if (finished || generation !== scrollTransitionGeneration) return;
    finished = true;
    window.clearTimeout(fallbackId);
    mainScrollContainer.scrollTop = targetTop;
    onArrived?.();
  }
  function onScrollEnd() {
    done();
  }

  mainScrollContainer.addEventListener("scrollend", onScrollEnd, { once: true });
  const fallbackId = window.setTimeout(done, SMOOTH_SCROLL_FALLBACK_MS);

  mainScrollContainer.scrollTo({
    top: targetTop,
    left: 0,
    behavior: "smooth",
  });
}

if (sectionsToReveal.length > 0) {
  const first = sectionsToReveal[0];
  if (first.classList.contains("hero")) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        first.classList.add("is-visible");
      });
    });
  } else {
    first.classList.add("is-visible");
  }
}

function setupObjectiveLines() {
  const section = projectOverviewSection;
  const main = section && section.querySelector(".objective-head-main");
  const h2 = section && section.querySelector("h2");
  if (!section || !main || !h2) return;

  const s = section.getBoundingClientRect();
  const m = main.getBoundingClientRect();
  const h = h2.getBoundingClientRect();
  const h2TopFromSection = h.top - s.top;
  const h2BottomFromMainTop = h.bottom - m.top;

  /* Above the H2: pinned to the section (eyebrow → headline), scrolls with the slide */
  const topSeg = document.createElement("div");
  topSeg.className = "line-segment line-segment--objective-top";
  topSeg.style.top = "0";
  topSeg.style.height = `${Math.max(0, h2TopFromSection)}px`;

  /* Below the H2: inside .objective-head-main so it scrolls with subtext + images */
  const bottomSeg = document.createElement("div");
  bottomSeg.className = "line-segment line-segment--objective-bottom";
  bottomSeg.style.top = `${h2BottomFromMainTop}px`;
  bottomSeg.style.bottom = "0";

  section.appendChild(topSeg);
  main.appendChild(bottomSeg);
}

function refreshObjectiveLines() {
  document.querySelectorAll("#project-overview .line-segment").forEach((el) => el.remove());
  setupObjectiveLines();
}

const metricsSection = document.querySelector("#metrics");

/** Same vertical guides as #project-overview: two lines (50% / 75%), linesGrow (top→down + bottom→up). */
function setupMetricsLines() {
  const section = metricsSection;
  const inner = section?.querySelector(".metrics-inner");
  const cards = section?.querySelector(".metrics-cards");
  if (!section || !inner || !cards) return;

  const s = section.getBoundingClientRect();
  const c = cards.getBoundingClientRect();
  const cardsBottomFromSectionTop = c.bottom - s.top;

  const topSeg = document.createElement("div");
  topSeg.className = "line-segment line-segment--metrics-top";
  topSeg.style.top = "0";
  topSeg.style.height = `${Math.max(0, cardsBottomFromSectionTop)}px`;

  const i = inner.getBoundingClientRect();
  const cardsBottomFromInnerTop = c.bottom - i.top;

  const bottomSeg = document.createElement("div");
  bottomSeg.className = "line-segment line-segment--metrics-bottom";
  bottomSeg.style.top = `${Math.max(0, cardsBottomFromInnerTop)}px`;
  bottomSeg.style.bottom = "0";

  section.appendChild(topSeg);
  inner.appendChild(bottomSeg);
}

function refreshMetricsLines() {
  document.querySelectorAll("#metrics .line-segment").forEach((el) => el.remove());
  setupMetricsLines();
}

function refreshSectionGuideLines() {
  refreshObjectiveLines();
  refreshMetricsLines();
}

setupObjectiveLines();
setupMetricsLines();
window.addEventListener("load", refreshSectionGuideLines);
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(refreshSectionGuideLines);
}

if (projectOverviewSection) {
  projectOverviewSection.addEventListener(
    "scroll",
    () => window.requestAnimationFrame(refreshObjectiveLines),
    { passive: true }
  );
}

if (metricsSection) {
  metricsSection.addEventListener(
    "scroll",
    () => window.requestAnimationFrame(refreshMetricsLines),
    { passive: true }
  );
}

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

/* Objective rows: own reveal — section .is-visible fights snap scroll + 35% IO threshold */
const objectiveRowsEl = document.querySelector("#objective .objective-rows");
if (objectiveRowsEl && mainScrollContainer) {
  if (reducedMotion.matches) {
    objectiveRowsEl.classList.add("objective-rows--reveal");
  } else {
    const objectiveRowsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("objective-rows--reveal");
          objectiveRowsObserver.unobserve(entry.target);
        });
      },
      {
        root: mainScrollContainer,
        threshold: 0.15,
      }
    );
    objectiveRowsObserver.observe(objectiveRowsEl);
  }
}

/** Hide fixed header while `main` scroll is in the footer; show again when scrolled back to #impact or above. */
function updateNavFooterHidden() {
  if (!mainScrollContainer || !pageFooterEl) {
    document.body.classList.remove("footer-nav-hidden");
    return;
  }
  const st = mainScrollContainer.scrollTop;
  const footerStart = pageFooterEl.offsetTop;
  const inFooter = st >= footerStart - 1;
  document.body.classList.toggle("footer-nav-hidden", inFooter);
}

/* Footer: one-shot reveal — keeps .is-visible after first intersect (no clip reset on scroll up) */
if (pageFooterEl && mainScrollContainer) {
  if (reducedMotion.matches) {
    pageFooterEl.classList.add("is-visible");
  } else {
    const footerRevealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          footerRevealObserver.unobserve(entry.target);
        });
      },
      {
        root: mainScrollContainer,
        threshold: 0,
      }
    );
    footerRevealObserver.observe(pageFooterEl);
  }
}

const navLinks = document.querySelectorAll('a[href^="#"]');

function syncNavThemeToSectionIndex(index) {
  if (sections.length === 0) return;
  const idx = Math.max(0, Math.min(sections.length - 1, index));
  document.body.classList.toggle("nav-on-light", sections[idx].classList.contains("block-light"));
}

function updateNavThemeFromScroll() {
  if (!mainScrollContainer || sections.length === 0) return;
  if (isTransitioning) {
    syncNavThemeToSectionIndex(activeSectionIndex);
    return;
  }
  if (mainScrollContainer.clientHeight <= 0) return;
  const idx = mainScrollTopToActiveSectionIndex(mainScrollContainer.scrollTop);
  document.body.classList.toggle("nav-on-light", sections[idx].classList.contains("block-light"));
}

function updateNavScrollChrome() {
  if (!mainScrollContainer || sections.length === 0) return;
  if (isMenuOpen) {
    document.body.classList.remove("nav-scroll-down", "nav-scroll-up-bar");
    return;
  }
  /* Programmatic slide scroll: do not run (and do not advance lastMainScrollTopForNav) — avoids body-class churn every frame and a bogus ~0 delta at the end. */
  if (isTransitioning) return;
  const st = mainScrollContainer.scrollTop;
  if (st <= 2) {
    document.body.classList.remove("nav-scroll-down", "nav-scroll-up-bar");
    lastMainScrollTopForNav = st;
    return;
  }
  const delta = st - lastMainScrollTopForNav;
  lastMainScrollTopForNav = st;
  if (Math.abs(delta) < 1.5) return;
  if (delta > 0) {
    document.body.classList.add("nav-scroll-down");
    document.body.classList.remove("nav-scroll-up-bar");
  } else {
    document.body.classList.remove("nav-scroll-down");
    document.body.classList.add("nav-scroll-up-bar");
  }
}

function jumpToSection(index) {
  if (!mainScrollContainer || sections.length === 0) {
    return;
  }
  const boundedIndex = Math.max(0, Math.min(sections.length - 1, index));
  activeSectionIndex = boundedIndex;
  syncNavThemeToSectionIndex(boundedIndex);
  if (mainScrollContainer) {
    lastMainScrollTopForNav = mainScrollContainer.scrollTop;
  }
  isTransitioning = true;
  const generation = ++scrollTransitionGeneration;
  const targetSection = sections[boundedIndex];
  targetSection.classList.remove("is-visible");
  void targetSection.offsetHeight;
  targetSection.classList.add("is-visible");
  scrollMainToIndex(boundedIndex, generation, () => {
    if (generation !== scrollTransitionGeneration) return;
    isTransitioning = false;
    updateNavThemeFromScroll();
    /* Do not set lastMainScrollTopForNav here — updateNavScrollChrome needs a real delta from the pre-arrival value. */
    updateNavScrollChrome();
    updateNavFooterHidden();
    updateOverviewImageScrollScale();
    const rows = targetSection.querySelector(".objective-rows");
    if (rows && !rows.classList.contains("objective-rows--reveal")) {
      rows.classList.add("objective-rows--reveal");
    }
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
  if (open) {
    document.body.classList.remove("nav-scroll-down", "nav-scroll-up-bar");
  } else if (mainScrollContainer) {
    updateNavScrollChrome();
    updateNavFooterHidden();
  }
}

function getSectionScrollMetrics(section) {
  return {
    scrollTop: section.scrollTop,
    scrollHeight: section.scrollHeight,
    clientHeight: section.clientHeight,
  };
}

let mainScrollEffectsRaf = null;
function scheduleMainScrollEffects() {
  if (mainScrollEffectsRaf !== null) return;
  mainScrollEffectsRaf = requestAnimationFrame(() => {
    mainScrollEffectsRaf = null;
    if (mainScrollContainer && sections.length > 0 && !isTransitioning) {
      activeSectionIndex = mainScrollTopToActiveSectionIndex(mainScrollContainer.scrollTop);
    }
    updateNavThemeFromScroll();
    updateNavFooterHidden();
    if (!isTransitioning) {
      updateNavScrollChrome();
      updateOverviewImageScrollScale();
    }
  });
}

function onMainScroll() {
  pinMainScrollBottom();
  scheduleMainScrollEffects();
}

if (mainScrollContainer && sections.length > 0) {
  mainScrollContainer.addEventListener("scroll", onMainScroll, { passive: true });

  sections.forEach((section) => {
    section.addEventListener("scroll", onMainScroll, { passive: true });
  });

  mainScrollContainer.addEventListener(
    "wheel",
    (event) => {
      if (isMenuOpen) {
        event.preventDefault();
        return;
      }
      const st = mainScrollContainer.scrollTop;
      const vh = mainScrollContainer.clientHeight;
      const tops = getSectionScrollTops();
      const i = mainScrollTopToActiveSectionIndex(st);
      activeSectionIndex = i;
      const currentSection = sections[i];

      if (Math.abs(event.deltaY) < 8) {
        return;
      }
      const direction = event.deltaY > 0 ? 1 : -1;

      /* Video break: full-viewport image (no inner scroll); any scroll advances to adjacent slide. */
      if (currentSection && currentSection.id === "video-break") {
        event.preventDefault();
        if (isTransitioning) return;
        jumpToSection(i + direction);
        return;
      }

      /* Sections with inner scroll (fixed 100vh slides with overflowing content) */
      if (currentSection) {
        const m = getSectionScrollMetrics(currentSection);
        const hasInnerScroll = m.scrollHeight > m.clientHeight + 2;
        if (hasInnerScroll) {
          const atBottom = m.scrollTop >= m.scrollHeight - m.clientHeight - 1;
          const atTop = m.scrollTop <= 0;
          if (direction > 0 && !atBottom) return;
          if (direction < 0 && !atTop) return;
        }
      }

      /* Last slide (#metrics) + footer: one continuous document scroll — no synthetic scroll steps. */
      if (i === sections.length - 1) {
        const secTop = tops[i];
        if (direction < 0 && st <= secTop + 2) {
          event.preventDefault();
          if (isTransitioning) return;
          jumpToSection(i - 1);
          return;
        }
        return;
      }

      /* Tall sections (e.g. #objective): scroll main through the section before changing slide */
      const secTop = tops[i];
      const secH = currentSection ? currentSection.offsetHeight : vh;
      const maxStInSection = secTop + Math.max(0, secH - vh);

      if (direction > 0) {
        if (st < maxStInSection - 2) {
          event.preventDefault();
          if (isTransitioning) return;
          const delta = Math.min(vh * 0.92, maxStInSection - st);
          if (delta < 0.5) return;
          mainScrollContainer.scrollBy({
            top: delta,
            behavior: reducedMotion.matches ? "auto" : "smooth",
          });
          return;
        }
      } else if (st > secTop + 2) {
        event.preventDefault();
        if (isTransitioning) return;
        const delta = Math.min(vh * 0.92, st - secTop);
        if (delta < 0.5) return;
        mainScrollContainer.scrollBy({
          top: -delta,
          behavior: reducedMotion.matches ? "auto" : "smooth",
        });
        return;
      }

      event.preventDefault();
      if (isTransitioning) return;
      jumpToSection(i + direction);
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

  updateNavThemeFromScroll();
  updateNavScrollChrome();
  updateNavFooterHidden();
  updateOverviewImageScrollScale();
}

window.addEventListener("resize", () => {
  if (mainScrollContainer) {
    lastMainScrollTopForNav = mainScrollContainer.scrollTop;
  }
  refreshSectionGuideLines();
  updateOverviewImageScrollScale();
  updateNavFooterHidden();
});
reducedMotion.addEventListener("change", () => {
  updateOverviewImageScrollScale();
});
updateOverviewImageScrollScale();
updateNavScrollChrome();
updateNavFooterHidden();

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

document.querySelectorAll(".block-light, #menuOverlay").forEach((section) => {
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

/* Solution carousel: equal-width slides, peek of slide 2 past viewport edge */
const solutionSectionEl = document.querySelector("#solution");
const solutionSliderViewport = document.querySelector("#solutionSliderViewport");
const solutionSliderShell = document.querySelector("#solution .slider-shell");
const solutionArrowPrev = document.querySelector("#solution .slide-card__arrow-hit--prev");
const solutionArrowNext = document.querySelector("#solution .slide-card__arrow-hit--next");
const solutionFirstCard = document.querySelector("#solution .slide-card--split");

let solutionPeekDismissed = false;
let solutionSlideActiveRaf = 0;

function updateSolutionActiveSlide() {
  if (!solutionSliderViewport) return;
  const slides = solutionSliderViewport.querySelectorAll(".solution-slide");
  if (!slides.length) return;
  const sl = solutionSliderViewport.scrollLeft;
  let best = 0;
  let bestDist = Infinity;
  slides.forEach((slide, i) => {
    const d = Math.abs(sl - slide.offsetLeft);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  slides.forEach((slide, i) => {
    const active = i === best;
    slide.classList.toggle("solution-slide--active", active);
    slide.setAttribute("aria-hidden", active ? "false" : "true");
  });
}

function scheduleSolutionActiveSlideUpdate() {
  cancelAnimationFrame(solutionSlideActiveRaf);
  solutionSlideActiveRaf = requestAnimationFrame(() => {
    updateSolutionActiveSlide();
  });
}

function dismissSolutionPeekHint() {
  if (!solutionSliderViewport?.classList.contains("solution-viewport--peek-hint")) return;
  solutionSliderViewport.classList.remove("solution-viewport--peek-hint");
  solutionPeekDismissed = true;
}

function tryStartSolutionPeekHint() {
  if (
    solutionPeekDismissed ||
    reducedMotion.matches ||
    !solutionSliderViewport ||
    !solutionSliderShell?.hasAttribute("data-solution-ready") ||
    !solutionSectionEl?.classList.contains("is-visible")
  ) {
    return;
  }
  if (solutionSliderViewport.scrollLeft > 6) return;
  if (solutionSliderViewport.classList.contains("solution-viewport--peek-hint")) return;
  solutionSliderViewport.classList.add("solution-viewport--peek-hint");
  window.setTimeout(() => dismissSolutionPeekHint(), 5200);
}

function solutionSlideStepPx() {
  if (!solutionSliderShell || !solutionSliderViewport) return 0;
  const gapRaw = getComputedStyle(solutionSliderShell).getPropertyValue("--solution-slide-gap").trim();
  const gap = Number.parseFloat(gapRaw) || 20;
  const slide = solutionSliderViewport.querySelector(".solution-slide");
  if (!slide || slide.offsetWidth < 1) return 0;
  return slide.offsetWidth + gap;
}

function solutionSliderScrollByDirection(direction) {
  if (!solutionSliderViewport) return;
  const step = solutionSlideStepPx();
  if (step < 1) return;
  solutionSliderViewport.scrollBy({
    left: direction * step,
    behavior: reducedMotion.matches ? "auto" : "smooth",
  });
}

if (solutionArrowPrev) {
  solutionArrowPrev.addEventListener("click", () => {
    dismissSolutionPeekHint();
    solutionSliderScrollByDirection(-1);
  });
}
if (solutionArrowNext) {
  solutionArrowNext.addEventListener("click", () => {
    dismissSolutionPeekHint();
    solutionSliderScrollByDirection(1);
  });
}

function applySolutionCarouselDimensions() {
  if (!solutionSliderShell || !solutionFirstCard) return;
  solutionSliderShell.removeAttribute("data-solution-ready");
  void solutionSliderShell.offsetWidth;

  const w = Math.round(solutionFirstCard.getBoundingClientRect().width);
  const h = Math.round(solutionFirstCard.getBoundingClientRect().height);
  if (w < 2 || h < 2) return;

  solutionSliderShell.style.setProperty("--solution-slide-w", `${w}px`);
  solutionSliderShell.style.setProperty("--solution-slide-h", `${h}px`);
  solutionSliderShell.setAttribute("data-solution-ready", "true");
  scheduleSolutionActiveSlideUpdate();
  tryStartSolutionPeekHint();
}

function scheduleSolutionCarouselLayout() {
  requestAnimationFrame(() => {
    requestAnimationFrame(applySolutionCarouselDimensions);
  });
}

if (solutionSliderShell && solutionFirstCard) {
  let solutionResizeDebounce;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(solutionResizeDebounce);
      solutionResizeDebounce = setTimeout(scheduleSolutionCarouselLayout, 150);
    },
    { passive: true }
  );
  window.addEventListener("load", scheduleSolutionCarouselLayout);
  const solutionCardImg = solutionFirstCard.querySelector(".slide-card__media");
  if (solutionCardImg && !solutionCardImg.complete) {
    solutionCardImg.addEventListener("load", scheduleSolutionCarouselLayout, { once: true });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleSolutionCarouselLayout);
  }
  scheduleSolutionCarouselLayout();
}

if (solutionSliderViewport) {
  solutionSliderViewport.addEventListener(
    "scroll",
    () => {
      dismissSolutionPeekHint();
      scheduleSolutionActiveSlideUpdate();
    },
    { passive: true }
  );
}

if (solutionSectionEl && mainScrollContainer) {
  const solutionPeekObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) tryStartSolutionPeekHint();
      });
    },
    { root: mainScrollContainer, threshold: 0.35 }
  );
  solutionPeekObserver.observe(solutionSectionEl);
}
