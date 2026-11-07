const story = document.querySelector(".story");
const scenes = [...story.querySelectorAll(".scene")];
const controls = story.querySelector(".story-controls");
const tabs = [...controls.querySelectorAll("[role=tab]")];
const play = controls.querySelector(".story-play");
const icon = play.querySelector("use");
const progress = controls.querySelector(".story-progress");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const sceneDuration = 5200;
let selected = 0;
let timer;
let sweep;
let startedAt = 0;
let remaining = sceneDuration;
let paused = false;

function show(index) {
  selected = index;
  scenes.forEach((scene, position) => {
    const active = position === index;
    scene.hidden = !active;
    tabs[position].setAttribute("aria-selected", String(active));
    tabs[position].tabIndex = active ? 0 : -1;
  });
}

function setPlayControl(label, playing) {
  story.toggleAttribute("data-playing", playing);
  play.setAttribute("aria-label", label);
  play.querySelector("span").textContent = label;
  icon.setAttribute("href", playing ? "#pause-icon" : "#play-icon");
}

function stop(label = "Play tour") {
  clearTimeout(timer);
  timer = undefined;
  sweep?.cancel();
  paused = false;
  remaining = sceneDuration;
  setPlayControl(label, false);
}

function pause() {
  if (timer === undefined) return;
  remaining = Math.max(0, remaining - (performance.now() - startedAt));
  clearTimeout(timer);
  timer = undefined;
  sweep?.cancel();
  paused = true;
  setPlayControl("Resume tour", false);
}

function advance() {
  sweep?.cancel();
  if (!reducedMotion.matches && remaining > 0) {
    const fraction = 1 - remaining / sceneDuration;
    sweep = progress.animate([{ transform: `scaleX(${fraction})` }, { transform: "scaleX(1)" }], {
      duration: remaining,
      fill: "forwards",
    });
  }
  startedAt = performance.now();
  timer = setTimeout(() => {
    if (selected === scenes.length - 1) {
      stop("Replay tour");
      return;
    }
    show(selected + 1);
    remaining = sceneDuration;
    advance();
  }, remaining);
}

play.addEventListener("click", () => {
  if (timer !== undefined) {
    pause();
    return;
  }
  if (!paused) show(0);
  paused = false;
  setPlayControl("Pause tour", true);
  advance();
});

tabs.forEach((tab, index) => {
  scenes[index].setAttribute("role", "tabpanel");
  scenes[index].setAttribute("aria-labelledby", tab.id);
  tab.addEventListener("click", () => {
    stop();
    show(index);
  });
  tab.addEventListener("keydown", (event) => {
    const positions = {
      ArrowLeft: (index + tabs.length - 1) % tabs.length,
      ArrowRight: (index + 1) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };
    if (!Object.hasOwn(positions, event.key)) return;
    event.preventDefault();
    stop();
    show(positions[event.key]);
    tabs[selected].focus();
  });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
if ("IntersectionObserver" in window) {
  new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) pause();
  }).observe(story);
}
show(0);
story.dataset.enhanced = "";
controls.hidden = false;
