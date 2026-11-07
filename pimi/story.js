(() => {
  const workflow = document.querySelector('.workflow');
  const sticky = workflow?.querySelector('.workflow-sticky');
  if (!sticky) return;

  const scenes = [...sticky.querySelectorAll('.scene')];
  const frames = sticky.querySelector('.board-motion img');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameCount = 10;
  const sceneBreaks = [.37, .57, .77];
  let scheduled = 0;
  let active;

  function show(index) {
    if (index === active) return;
    active = index;
    scenes.forEach((scene, position) => {
      scene.toggleAttribute('data-active', position === index);
      scene.toggleAttribute('inert', index !== undefined && position !== index);
    });
  }

  function update() {
    scheduled = 0;
    const top = parseFloat(getComputedStyle(sticky).top);
    const distance = workflow.offsetHeight - sticky.offsetHeight;
    const progress = Math.max(0, Math.min(1, (top - workflow.getBoundingClientRect().top) / distance));
    const index = sceneBreaks.filter((start) => progress >= start).length;
    const move = Math.max(0, Math.min(1, (progress - .04) / .24));
    const frame = Math.round(move * (frameCount - 1));
    workflow.toggleAttribute('data-moving', progress > .04 && index === 0 && frames.naturalWidth > 0);
    frames.style.setProperty('--frame-offset', `${-100 * frame / frameCount}%`);
    show(index);
  }

  function schedule() {
    if (!scheduled) scheduled = requestAnimationFrame(update);
  }

  function configure() {
    workflow.toggleAttribute('data-scroll', !motion.matches);
    if (motion.matches) {
      cancelAnimationFrame(scheduled);
      scheduled = 0;
      workflow.removeAttribute('data-moving');
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      frames.removeEventListener('load', schedule);
      show(undefined);
    } else {
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule);
      frames.addEventListener('load', schedule);
      schedule();
    }
  }

  motion.addEventListener('change', configure);
  configure();
})();
