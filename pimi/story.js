(() => {
  const workflow = document.querySelector('.workflow');
  const app = workflow?.querySelector('.app-window');
  if (!app) return;
  const scenes = [...app.querySelectorAll('[data-scene]')];
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const states = ['tasks', 'reports', 'review'];
  const labels = ['Two agents working', 'Two reports ready', 'Comparing worktrees'];
  let frame = 0;
  let current = -1;
  let ready;

  function moveCard(progress) {
    const travel = Math.max(0, Math.min(1, (progress - .05) / .3));
    app.style.setProperty('--card-travel', travel.toFixed(4));
    const nextReady = travel > .85;
    if (ready === nextReady) return;
    ready = nextReady;
    app.toggleAttribute('data-card-ready', ready);
    app.querySelector('[data-count=running]').textContent = ready ? '0' : '1';
    app.querySelector('[data-count=review]').textContent = ready ? '1' : '0';
    app.querySelectorAll('.work-state').forEach((state) => state.textContent = ready ? 'Ready' : 'Running');
    app.querySelector('.card-state').textContent = ready ? 'Reports ready' : 'Agents at work';
    if (current === 0) app.querySelector('.footer-state').textContent = ready ? labels[1] : labels[0];
  }

  function show(index) {
    if (index === current) return;
    current = index;
    app.dataset.phase = states[index];
    scenes.forEach((scene, position) => {
      scene.setAttribute('aria-hidden', String(position !== index));
      scene.inert = position !== index;
    });
    app.querySelector('.footer-state').textContent = labels[index === 0 && ready ? 1 : index];
  }

  function update() {
    frame = 0;
    if (motion.matches) { moveCard(0); return show(0); }
    const stickyTop = parseFloat(getComputedStyle(app).top) || 0;
    const distance = Math.max(1, workflow.offsetHeight - app.offsetHeight);
    const progress = Math.max(0, Math.min(1, (stickyTop - workflow.getBoundingClientRect().top) / distance));
    // The board gets most of the scroll: finish the move before opening the outcome.
    moveCard(progress);
    show(progress < .58 ? 0 : progress < .82 ? 1 : 2);
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function configure() {
    workflow.toggleAttribute('data-scroll', !motion.matches);
    if (motion.matches) {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      moveCard(0);
      show(0);
    } else {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      schedule();
    }
  }

  motion.addEventListener('change', configure);
  configure();
})();
