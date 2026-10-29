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

/* Local SEO enhancements for category pages. Keeps product/cart behaviour unchanged. */
(() => {
  'use strict';
  const path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);
  const category = params.get('cat');

  const pages = {
    kids: {
      title: 'Kids Toys Age 1–5 Years in Bhopal | Nandini Gift',
      description: 'Shop kids toys for ages 1–5 in Bhopal at Nandini Gift Collection, Bagsewaniya. Explore learning toys, musical toys, dancing toys and gift sets with prices.',
      h1: 'Kids Toys for Ages 1–5 Years in Bhopal',
      lead: 'Explore kids toys for ages 1–5, including learning, musical and activity toys at Nandini Gift Collection in Bagsewaniya, Bhopal. Browse photos, prices and add your favourites to the cart.'
    },
    dolls: {
      title: 'Dolls & Fashion Toys in Bhopal | Nandini Gift',
      description: 'Shop dolls and fashion toys in Bhopal at Nandini Gift Collection, Bagsewaniya. Explore fashion dolls, traditional dolls and gift toys with prices.',
      h1: 'Dolls & Fashion Toys in Bhopal',
      lead: 'Explore fashion dolls, traditional dolls and cute gift toys at Nandini Gift Collection in Bagsewaniya, Bhopal. Browse current photos and prices.'
    },
    god: {
      title: 'God Statues & Murtis in Bhopal | Nandini Gift',
      description: 'Shop God statues and decorative murtis in Bhopal at Nandini Gift Collection, Bagsewaniya. Explore Ganesh, Krishna, Ram Darbar and devotional gift statues.',
      h1: 'God Statues & Decorative Murtis in Bhopal',
      lead: 'Explore devotional and decorative God statues for gifting and home décor at Nandini Gift Collection in Bagsewaniya, Bhopal. Browse current designs and prices.'
    },
    cars: {
      title: 'Remote Control Cars for Kids in Bhopal | Nandini Gift',
      description: 'Shop rechargeable remote control cars for kids in Bhopal at Nandini Gift Collection, Bagsewaniya. Browse RC toy cars with photos and prices.',
      h1: 'Rechargeable Remote Control Cars in Bhopal',
      lead: 'Explore rechargeable remote control toy cars for kids at Nandini Gift Collection in Bagsewaniya, Bhopal. Browse available styles, photos and prices.'
    },
    frames: {
      title: 'Photo Frames & Gift Frames in Bhopal | Nandini Gift',
      description: 'Shop photo frames in Bhopal for birthdays, anniversaries, couples and families at Nandini Gift Collection, Bagsewaniya.',
      h1: 'Photo Frames & Gift Frames in Bhopal',
      lead: 'Explore photo frames for birthdays, anniversaries, couples, families and special occasions at Nandini Gift Collection in Bagsewaniya, Bhopal.'
    },
    lamps: {
      title: 'Decorative & Night Lamps in Bhopal | Nandini Gift',
      description: 'Shop decorative lamps and night lamps in Bhopal at Nandini Gift Collection, Bagsewaniya. Explore LED, table and gifting lamps.',
      h1: 'Decorative & Night Lamps in Bhopal',
      lead: 'Explore decorative, LED and night lamps for gifting and home décor at Nandini Gift Collection in Bagsewaniya, Bhopal.'
    },
    scenery: {
      title: 'Scenery & Wall Art in Bhopal | Nandini Gift',
      description: 'Shop scenery frames and decorative wall art in Bhopal at Nandini Gift Collection, Bagsewaniya. Explore nature, religious and home décor wall frames.',
      h1: 'Scenery & Wall Art in Bhopal',
      lead: 'Explore nature, religious and decorative wall scenery for home décor and gifting at Nandini Gift Collection in Bagsewaniya, Bhopal.'
    },
    diy: {
      title: 'DIY Craft & Activity Gifts for Kids in Bhopal | Nandini Gift',
      description: 'Shop DIY craft and activity gifts for kids in Bhopal at Nandini Gift Collection, Bagsewaniya. Explore colouring, painting, craft and creative activity kits.',
      h1: 'DIY Craft & Activity Gifts for Kids in Bhopal',
      lead: 'Explore creative craft, colouring, painting and activity gifts for children at Nandini Gift Collection in Bagsewaniya, Bhopal.'
    }
  };

  let seo = null;
  if (path.endsWith('/kids-toys-age-1-5-year.html')) seo = pages.kids;
  if (path.endsWith('/subcategory.html') && pages[category]) seo = pages[category];
  if (!seo) return;

  document.title = seo.title;
  const description = document.querySelector('meta[name="description"]');
  if (description) description.setAttribute('content', seo.description);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  if (ogTitle) ogTitle.setAttribute('content', seo.title);
  if (ogDescription) ogDescription.setAttribute('content', seo.description);

  const h1 = document.querySelector('h1');
  if (h1) h1.textContent = seo.h1;
  const lead = document.querySelector('.cathead p, .kids-collection .lead');
  if (lead) lead.textContent = seo.lead;

  const container = document.querySelector('.cathead, .kids-collection');
  if (container && !document.getElementById('seo-category-links')) {
    const links = document.createElement('p');
    links.id = 'seo-category-links';
    links.className = 'lead';
    links.innerHTML = 'More gifting options: <a href="products.html">browse all gifts in Bhopal</a>, <a href="showpieces.html">decorative showpieces</a>, or <a href="contact.html">contact Nandini Gift Collection</a> for current availability.';
    if (container.classList.contains('cathead')) container.appendChild(links);
    else container.appendChild(links);
  }
})();
