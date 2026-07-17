// Menú móvil
const navToggle = document.getElementById('nav-toggle');
const siteHeader = document.querySelector('.site-header');

if (navToggle) {
  navToggle.addEventListener('click', () => {
    const isOpen = siteHeader.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  document.querySelectorAll('.main-nav a').forEach(link => {
    link.addEventListener('click', () => {
      siteHeader.classList.remove('nav-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Acordeón FAQ
document.querySelectorAll('.faq-item').forEach(item => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('is-open'));
    if (!isOpen) item.classList.add('is-open');
  });
});

// Año en el footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
