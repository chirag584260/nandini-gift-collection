/* Mobile navigation disclosure; desktop navigation remains visible. */
(() => {
  'use strict';
  const nav = document.querySelector('.nav');
  const button = nav && nav.querySelector('.nav-menu-toggle');
  const links = nav && nav.querySelector('#site-menu');
  if (!nav || !button || !links) return;

  const mobile = window.matchMedia('(max-width:1024px)');
  const setOpen = (open, restoreFocus = false) => {
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    links.classList.toggle('is-open', open);
    if (restoreFocus) button.focus();
  };

  button.addEventListener('click', () => {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  });
  links.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && mobile.matches &&
        button.getAttribute('aria-expanded') === 'true') {
      setOpen(false, true);
    }
  });
  document.addEventListener('click', event => {
    if (mobile.matches && !nav.contains(event.target)) setOpen(false);
  });
  mobile.addEventListener('change', () => setOpen(false));

  for (const link of links.querySelectorAll('a')) {
    const url = new URL(link.href, window.location.href);
    if (url.pathname === window.location.pathname && !url.hash) {
      link.setAttribute('aria-current', 'page');
    }
  }
  setOpen(false);
  nav.classList.add('nav-ready');
})();
