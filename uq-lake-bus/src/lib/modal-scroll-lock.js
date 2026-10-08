// Lock the page and its nested home scroller while allowing the dialog to scroll.
// Fixed-body locking also covers iOS Safari, where overflow:hidden alone leaks.
export function lockModalScroll(dialog) {
  const body = document.body;
  const root = document.documentElement;
  const x = window.scrollX, y = window.scrollY;
  const nested = [...document.querySelectorAll('.campus-home-page, .app-shell')]
    .map(element => ({ element, top: element.scrollTop, left: element.scrollLeft }));
  const bodyStyles = body.getAttribute('style');
  const rootOverflow = root.style.overflow;
  const alreadyLocked = root.classList.contains('life-sheet-open');
  root.classList.add('life-sheet-open');
  root.style.overflow = 'hidden';
  Object.assign(body.style, { position: 'fixed', top: `${-y}px`, left: `${-x}px`, width: '100%', overflow: 'hidden' });

  function canScroll(target, delta) {
    if (!(target instanceof Element) || !dialog.contains(target)) return false;
    for (let element = target; element && dialog.contains(element); element = element.parentElement) {
      const overflow = getComputedStyle(element).overflowY;
      if (/(auto|scroll)/.test(overflow) && element.scrollHeight > element.clientHeight + 1) {
        if (delta < 0 && element.scrollTop > 0) return true;
        if (delta > 0 && element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
      }
    }
    return false;
  }
  let lastTouchY = 0;
  const touchStart = event => { lastTouchY = event.touches[0]?.clientY ?? 0; };
  const touchMove = event => {
    if (event.touches.length !== 1) return;
    const nextY = event.touches[0].clientY;
    if (!canScroll(event.target, lastTouchY - nextY)) event.preventDefault();
    lastTouchY = nextY;
  };
  const wheel = event => { if (event.deltaY && !canScroll(event.target, event.deltaY)) event.preventDefault(); };
  document.addEventListener('touchstart', touchStart, { passive: true });
  document.addEventListener('touchmove', touchMove, { passive: false });
  document.addEventListener('wheel', wheel, { passive: false });
  return () => {
    document.removeEventListener('touchstart', touchStart);
    document.removeEventListener('touchmove', touchMove);
    document.removeEventListener('wheel', wheel);
    if (!alreadyLocked) root.classList.remove('life-sheet-open');
    root.style.overflow = rootOverflow;
    if (bodyStyles === null) body.removeAttribute('style');
    else body.setAttribute('style', bodyStyles);
    for (const { element, top, left } of nested) { element.scrollTop = top; element.scrollLeft = left; }
    window.scrollTo({ left: x, top: y, behavior: 'instant' });
  };
}
