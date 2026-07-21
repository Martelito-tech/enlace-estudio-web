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

// Hero: red de conexión animada
(function () {
  const canvas = document.getElementById('hero-network');
  if (!canvas) return;

  const hero = canvas.closest('.hero');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Parámetros de prueba vía URL: ?net_speed=slow|normal|fast  &  ?net_pulses=few|normal|many
  const params = new URLSearchParams(window.location.search);
  const SPEED = { slow: 0.5, normal: 1, fast: 2.2 }[params.get('net_speed')] || 1;
  const PULSE_RATE = { few: 0.006, normal: 0.016, many: 0.036 }[params.get('net_pulses')] || 0.016;

  let W = 0, H = 0, dpr = 1;
  let nodes = [];
  const pulses = [];

  // Interacción con el cursor: repulsión suave, sin líneas hacia el ratón
  const REPEL_RADIUS = 130;
  const REPEL_STRENGTH = 2.6;
  let mouseX = null, mouseY = null;

  // Interacción entre nodos: se apartan si se acercan demasiado
  const NODE_REPEL_RADIUS = 48;
  const NODE_REPEL_STRENGTH = 0.5;

  // Repulsión suave en los bordes: nunca llegan a "cortarse" contra el borde
  const BORDER_MARGIN = 70;
  const BORDER_STRENGTH = 1.1;

  // Distancia máxima entre nodos para poder enviarse un impulso: tiene que
  // coincidir con una línea claramente visible (opacidad alta), no cualquiera.
  const LINE_MAX_DIST = 150;
  const PULSE_MAX_DIST = 70;

  // Escuchamos en .hero (no en el canvas): el texto encima tiene una caja
  // invisible que ocupa todo el ancho y, si escucháramos solo en el canvas,
  // bloquearía el mousemove en gran parte del área.
  hero.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
  });
  hero.addEventListener('mouseleave', () => {
    mouseX = null;
    mouseY = null;
  });

  function nodeCount() {
    return W < 760 ? 24 : 42;
  }

  function resize() {
    const rect = hero.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initNodes();
  }

  function initNodes() {
    const n = nodeCount();
    nodes = [];
    for (let i = 0; i < n; i++) {
      // sesgado hacia los laterales: menos nodos cerca del texto centrado
      const side = Math.random() < 0.5 ? -1 : 1;
      const x = W / 2 + side * (0.16 + Math.pow(Math.random(), 1.3) * 0.34) * W;
      nodes.push({
        x: Math.max(0, Math.min(x, W)),
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28 * SPEED,
        vy: (Math.random() - 0.5) * 0.28 * SPEED,
        r: Math.random() < 0.18 ? 4.4 : 2.6,
        blue: Math.random() < 0.45
      });
    }
  }

  function maybeSpawnPulse() {
    if (Math.random() < PULSE_RATE && nodes.length) {
      const a = nodes[Math.floor(Math.random() * nodes.length)];
      let best = null, bestD = PULSE_MAX_DIST;
      for (const b of nodes) {
        if (b === a) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < bestD) { bestD = d; best = b; }
      }
      if (best) pulses.push({ a, b: best, t: 0 });
    }
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < BORDER_MARGIN) {
        n.x += (BORDER_MARGIN - n.x) / BORDER_MARGIN * BORDER_STRENGTH;
        if (n.vx < 0) n.vx = -n.vx;
      }
      if (n.x > W - BORDER_MARGIN) {
        n.x -= (BORDER_MARGIN - (W - n.x)) / BORDER_MARGIN * BORDER_STRENGTH;
        if (n.vx > 0) n.vx = -n.vx;
      }
      if (n.y < BORDER_MARGIN) {
        n.y += (BORDER_MARGIN - n.y) / BORDER_MARGIN * BORDER_STRENGTH;
        if (n.vy < 0) n.vy = -n.vy;
      }
      if (n.y > H - BORDER_MARGIN) {
        n.y -= (BORDER_MARGIN - (H - n.y)) / BORDER_MARGIN * BORDER_STRENGTH;
        if (n.vy > 0) n.vy = -n.vy;
      }
      n.x = Math.max(0, Math.min(W, n.x));
      n.y = Math.max(0, Math.min(H, n.y));

      if (mouseX !== null) {
        const dx = n.x - mouseX;
        const dy = n.y - mouseY;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS && dist > 0.01) {
          const force = Math.pow(1 - dist / REPEL_RADIUS, 2) * REPEL_STRENGTH;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
          n.x = Math.max(0, Math.min(W, n.x));
          n.y = Math.max(0, Math.min(H, n.y));
        }
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);

        if (d < LINE_MAX_DIST) {
          ctx.strokeStyle = 'rgba(20,33,61,' + (0.32 * (1 - d / LINE_MAX_DIST)) + ')';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }

        if (d < NODE_REPEL_RADIUS && d > 0.01) {
          const force = (1 - d / NODE_REPEL_RADIUS) * NODE_REPEL_STRENGTH;
          const ux = dx / d, uy = dy / d;
          a.x += ux * force; a.y += uy * force;
          b.x -= ux * force; b.y -= uy * force;
        }
      }
    }

    for (const n of nodes) {
      ctx.beginPath();
      ctx.fillStyle = n.blue ? '#3a86ff' : '#14213d';
      ctx.globalAlpha = n.blue ? 1 : 0.8;
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    maybeSpawnPulse();
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.t += 0.008 * SPEED;
      if (p.t >= 1) { pulses.splice(i, 1); continue; }
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      // pequeña -> grande -> pequeña a lo largo del camino
      const pulseR = 1.5 + Math.sin(Math.PI * p.t) * 1.8;
      ctx.beginPath();
      ctx.fillStyle = '#3a86ff';
      ctx.shadowColor = '#3a86ff';
      ctx.shadowBlur = 12;
      ctx.arc(x, y, pulseR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    requestAnimationFrame(step);
  }

  resize();
  window.addEventListener('resize', resize);

  if (!reduceMotion) {
    requestAnimationFrame(step);
  } else {
    step(); // un solo frame estático, sin animar
  }
})();
