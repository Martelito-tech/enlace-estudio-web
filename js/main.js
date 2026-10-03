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
  //
  // Solo en dispositivos con cursor real (hover + puntero fino). En táctil
  // el "mousemove" que simulan los navegadores al hacer scroll con el dedo
  // se queda clavado en un punto (nunca llega el "mouseleave"), empujando
  // nodos sin parar, y no aporta nada ahí, así que lo desactivamos del todo.
  const supportsHoverCursor = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (supportsHoverCursor) {
    hero.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    hero.addEventListener('mouseleave', () => {
      mouseX = null;
      mouseY = null;
    });
  }

  function nodeCount() {
    return W < 760 ? 24 : 42;
  }

  let lastW = null;

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

    // En móvil, mostrar/ocultar la barra de direcciones al hacer scroll
    // dispara "resize" cambiando solo el alto. Si regenerásemos los nodos
    // cada vez, se verían "saltar" a posiciones nuevas mientras deslizas.
    // Solo reiniciamos si el ANCHO cambia de verdad (giro de pantalla,
    // redimensionar ventana o primera carga).
    if (lastW === null || Math.abs(W - lastW) > 2) {
      lastW = W;
      initNodes();
    } else {
      // Mismo ancho: no regenerar, solo mantener los nodos dentro del
      // nuevo alto para que no queden fuera del lienzo.
      for (const n of nodes) {
        n.y = Math.min(n.y, H);
      }
    }
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

// Escaparate de tarjetas NFC: carrusel horizontal que se arrastra. Las tarjetas
// se doblan con la velocidad al arrastrarlas y la del centro se inclina en 3D
// siguiendo al cursor.
(function () {
  const scene = document.querySelector('.nfc-examples');
  if (!scene) return;
  const track = scene.querySelector('.nfc-examples-grid');
  const cards = [...track.querySelectorAll('.nfc-card')];
  const n = cards.length;
  if (!n) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  // Distancia más corta entre dos posiciones de un carrusel circular
  const wrap = d => ((d % n) + n + n / 2) % n - n / 2;
  const DIM = 0.6; // opacidad máxima del velo de las tarjetas de los lados

  track.classList.add('is-carousel');
  track.tabIndex = 0;

  const parts = cards.map(card => {
    const tilt = card.querySelector('.nfc-card-tilt');
    const img = tilt.querySelector('img');
    const canvas = document.createElement('canvas');
    canvas.className = 'nfc-card-bend';
    canvas.setAttribute('aria-hidden', 'true');
    img.after(canvas);
    // Velo de las tarjetas de los lados: una capa propia a la que sólo se le
    // cambia la opacidad, que el navegador resuelve sin volver a pintar nada
    const dim = document.createElement('span');
    dim.className = 'nfc-card-dim';
    dim.setAttribute('aria-hidden', 'true');
    canvas.after(dim);
    img.addEventListener('dragstart', e => e.preventDefault());
    return {
      card, tilt, img, canvas, dim,
      ctx: canvas.getContext('2d'),
      glare: tilt.querySelector('.nfc-card-glare'),
      caption: card.querySelector('figcaption'),
      bending: false, lastBend: NaN, lastNear: NaN, lastDim: -1,
    };
  });

  // Controles: flechas y un punto por tarjeta (con el nombre del negocio)
  const controls = scene.querySelector('.nfc-carousel-controls');
  const dots = [];
  if (controls) {
    controls.hidden = false;
    const dotsWrap = controls.querySelector('.nfc-carousel-dots');
    cards.forEach((card, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'nfc-carousel-dot';
      dot.setAttribute('aria-label', card.querySelector('figcaption strong').textContent.trim());
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      dots.push(dot);
    });
    controls.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => step(Number(btn.dataset.dir)));
    });
  }

  // ---- Estado. pos es la tarjeta (con decimales) que ocupa el centro ----
  let pos = 0, target = 0, vel = 0;
  let cardW = 0, gapStep = 0, dpr = 1;
  let dragging = false, dragStartX = 0, dragStartPos = 0, dragMoved = 0, lastPos = 0;
  let running = false;
  let active = 0;

  function measure() {
    cardW = parts[0].tilt.offsetWidth; // ancho sin transformar
    // De centro a centro. En móvil, más juntas para que asome la de al lado
    // (0,92 y no menos: por debajo se solapan y se pisan al moverse)
    gapStep = cardW * (window.innerWidth < 760 ? 0.92 : 1.0);
    // El lienzo sólo se ve mientras la tarjeta se mueve: con 1,5x basta
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    parts.forEach(p => {
      p.canvas.width = Math.round(cardW * 1.2 * dpr);
      p.canvas.height = Math.round(p.tilt.offsetHeight * dpr);
      p.lastBend = NaN;
    });
  }

  // Dibuja la tarjeta doblada: la imagen se pinta por franjas horizontales y
  // cada franja se desplaza según una parábola, así el centro se queda atrás
  // respecto a los bordes de arriba y abajo, como una tela que se arrastra.
  // Una franja cada 4 px: la curva se sigue viendo lisa y cuesta la mitad.
  // El velo de las tarjetas de los lados se pinta encima, dentro del lienzo,
  // con el mismo color y opacidad que la capa .nfc-card-dim: al pasar de la
  // imagen al lienzo no cambia nada a la vista.
  function drawBend(p, bend, near) {
    const { img, canvas, ctx } = p;
    if (!img.complete || !img.naturalWidth) return;
    // Si apenas ha cambiado desde el último dibujo, no se repinta
    if (Math.abs(bend - p.lastBend) < 0.3 && Math.abs(near - p.lastNear) < 0.01) return;
    p.lastBend = bend;
    p.lastNear = near;
    const W = cardW * dpr, H = canvas.height, M = cardW * 0.1 * dpr;
    const rows = Math.max(20, Math.round(H / (4 * dpr)));
    const rowH = H / rows;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, H);
    for (let r = 0; r < rows; r++) {
      const t = (r + 0.5) / rows;
      const dx = bend * dpr * (1 - Math.pow(2 * t - 1, 2));
      ctx.drawImage(img, 0, (r / rows) * ih, iw, ih / rows + 1, M + dx, r * rowH, W, rowH + 0.75);
    }
    if (near > 0.005) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = 'rgba(10, 17, 34, ' + (near * DIM).toFixed(3) + ')';
      ctx.fillRect(0, 0, canvas.width, H);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  function render() {
    const bendPx = reduceMotion ? 0 : clamp(-vel * gapStep * 1.3, -cardW * 0.09, cardW * 0.09);
    parts.forEach((p, i) => {
      const d = wrap(i - pos);
      const ad = Math.abs(d);
      const near = Math.min(ad, 1);
      const scale = 1 - near * 0.2 - Math.max(ad - 1, 0) * 0.08;
      const x = d * gapStep;
      p.card.style.transform = `translate3d(${(x - cardW / 2).toFixed(1)}px, 0, 0) scale(${scale.toFixed(4)})`;
      // La más cercana al centro siempre encima, sin empates
      p.card.style.zIndex = String(100 - Math.round(ad * 40));
      p.card.style.visibility = ad > 2.4 ? 'hidden' : '';
      // Velo y pie: sólo opacidad, y sólo si ha cambiado de verdad
      const dimNow = Math.round(near * DIM * 1000) / 1000;
      if (dimNow !== p.lastDim) {
        p.lastDim = dimNow;
        p.dim.style.opacity = String(dimNow);
        p.caption.style.opacity = String(Math.round((1 - near) * 1000) / 1000);
      }

      // Doblado. Una vez que la tarjeta empieza a doblarse se queda en el
      // lienzo hasta que el carrusel se para del todo: si saltara entre lienzo
      // e imagen cada vez que el muelle oscila, parpadearía.
      // Sólo las tres que se ven (centro y vecinas)
      if (ad < 1.6 && (p.bending || Math.abs(bendPx) > 0.6)) {
        if (!p.bending) { p.bending = true; p.lastBend = NaN; p.card.classList.add('is-bending'); }
        drawBend(p, bendPx, near);
      } else if (p.bending) {
        p.bending = false;
        p.card.classList.remove('is-bending');
      }
    });

    const now = ((Math.round(pos) % n) + n) % n;
    if (now !== active || !cards[active].classList.contains('is-active')) {
      cards[active].classList.remove('is-active');
      active = now;
      cards[active].classList.add('is-active');
      dots.forEach((dot, i) => dot.setAttribute('aria-current', i === active ? 'true' : 'false'));
      cards.forEach((card, i) => card.setAttribute('aria-hidden', i === active ? 'false' : 'true'));
    }
  }

  // Bucle de física: al arrastrar, la posición sigue al dedo; al soltar, un
  // muelle amortiguado la lleva a la tarjeta más cercana.
  // Todo va en «fotogramas de 60 Hz» (f): en una pantalla de 120 o 144 Hz el
  // carrusel se mueve y se dobla igual que en una de 60.
  let lastTime = 0;
  function frame(now) {
    const f = lastTime ? clamp((now - lastTime) / (1000 / 60), 0.25, 3) : 1;
    lastTime = now;
    if (dragging) {
      // Velocidad suavizada: si el dedo se para, la tarjeta se endereza poco a
      // poco en vez de de golpe
      const keep = Math.pow(0.75, f);
      vel = vel * keep + ((pos - lastPos) / f) * (1 - keep);
      lastPos = pos;
    } else {
      // Muelle amortiguado hacia la tarjeta de destino
      vel += (target - pos) * 0.075 * f;
      vel *= Math.pow(0.78, f);
      pos += vel * f;
    }
    render();
    const settled = !dragging && Math.abs(target - pos) < 0.0005 && Math.abs(vel) < 0.0005;
    if (settled) {
      pos = target;
      vel = 0;
      render();
      // Ya quieto: todas vuelven a la imagen, que se ve más nítida que el lienzo
      parts.forEach(p => {
        if (p.bending) { p.bending = false; p.card.classList.remove('is-bending'); }
      });
      running = false;
      lastTime = 0;
      return;
    }
    requestAnimationFrame(frame);
  }
  const kick = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  function goTo(i) {
    target = Math.round(pos + wrap(i - pos));
    releaseAll();
    kick();
  }
  function step(dir) {
    target = Math.round(target) + dir;
    releaseAll();
    kick();
  }

  // ---- Arrastre (ratón y dedo) ----
  track.addEventListener('pointerdown', ev => {
    if (ev.button !== 0) return;
    dragging = true;
    dragStartX = ev.clientX;
    dragStartPos = pos;
    lastPos = pos;
    dragMoved = 0;
    try { track.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura, el arrastre sigue funcionando */ }
    track.classList.add('is-dragging');
    releaseAll();
    kick();
  });
  track.addEventListener('pointermove', ev => {
    if (!dragging) return;
    const dx = ev.clientX - dragStartX;
    dragMoved = Math.max(dragMoved, Math.abs(dx));
    pos = dragStartPos - dx / gapStep;
  });
  const endDrag = ev => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove('is-dragging');
    if (dragMoved < 6) {
      // Ha sido un clic: si es una tarjeta de los lados, la trae al centro
      const hit = document.elementFromPoint(ev.clientX, ev.clientY);
      const card = hit && hit.closest('.nfc-card');
      const i = cards.indexOf(card);
      target = Math.round(pos);
      if (i >= 0 && i !== active) goTo(i);
    } else {
      // Inercia: un gesto rápido puede saltar más de una tarjeta
      target = Math.round(pos + clamp(vel * 9, -1.5, 1.5));
    }
    kick();
  };
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  track.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
  });

  // ---- Inclinación 3D de la tarjeta del centro, siguiendo al cursor ----
  const MAX_TILT = 10;
  const SCALE = 1.05;
  const LIFT = -12;
  const tilts = [];

  function releaseAll() { tilts.forEach(t => t && t.release()); }

  if (canHover && !reduceMotion) {
    parts.forEach((p, i) => {
      const { card, tilt } = p;
      const cur = { rx: 0, ry: 0, s: 1, y: 0 };
      let goal = { rx: 0, ry: 0, s: 1, y: 0 };
      let anim = false;

      function tiltFrame() {
        let moving = false;
        for (const key in cur) {
          const d = goal[key] - cur[key];
          cur[key] += d * 0.14;
          if (Math.abs(d) > 0.001) moving = true;
        }
        tilt.style.transform =
          `perspective(1100px) translateY(${cur.y.toFixed(2)}px) ` +
          `rotateX(${cur.rx.toFixed(2)}deg) rotateY(${cur.ry.toFixed(2)}deg) scale(${cur.s.toFixed(4)})`;
        if (moving) {
          requestAnimationFrame(tiltFrame);
        } else {
          anim = false;
          if (goal.s === 1) tilt.style.transform = '';
        }
      }
      const go = () => { if (!anim) { anim = true; requestAnimationFrame(tiltFrame); } };

      tilt.addEventListener('pointermove', ev => {
        if (dragging || i !== active || Math.abs(wrap(i - pos)) > 0.02) return;
        const r = card.querySelector('.nfc-card-stage').getBoundingClientRect();
        const x = clamp((ev.clientX - r.left) / r.width, 0, 1);
        const y = clamp((ev.clientY - r.top) / r.height, 0, 1);
        card.classList.add('is-tilting');
        // Las variables del brillo van en el propio brillo, no en la tarjeta:
        // así el navegador sólo recalcula ese elemento
        p.glare.style.setProperty('--gx', (x * 100).toFixed(1) + '%');
        p.glare.style.setProperty('--gy', (y * 100).toFixed(1) + '%');
        goal = { rx: (0.5 - y) * 2 * MAX_TILT, ry: (x - 0.5) * 2 * MAX_TILT, s: SCALE, y: LIFT };
        go();
      });
      const release = () => {
        card.classList.remove('is-tilting');
        goal = { rx: 0, ry: 0, s: 1, y: 0 };
        go();
      };
      tilt.addEventListener('pointerleave', release);
      tilts[i] = { release };
    });

    // Foco de luz de la escena, que sigue al cursor. Es un elemento propio que
    // se desplaza con transform (sin repintar el fondo) y como mucho una vez
    // por fotograma, aunque el ratón mande más eventos.
    const spot = document.createElement('div');
    spot.className = 'nfc-spotlight';
    spot.setAttribute('aria-hidden', 'true');
    scene.prepend(spot);
    let spotX = 0, spotY = 0, spotQueued = false;
    scene.addEventListener('pointermove', ev => {
      const r = scene.getBoundingClientRect();
      spotX = ev.clientX - r.left;
      spotY = ev.clientY - r.top;
      if (!spotQueued) {
        spotQueued = true;
        requestAnimationFrame(() => {
          spot.style.transform = 'translate3d(' + spotX.toFixed(0) + 'px, ' + spotY.toFixed(0) + 'px, 0)';
          spotQueued = false;
        });
      }
      scene.classList.add('is-lit');
    });
    scene.addEventListener('pointerleave', () => scene.classList.remove('is-lit'));
  }

  // ---- Arranque ----
  measure();
  render();
  window.addEventListener('resize', () => { measure(); render(); });
  // Si una imagen termina de cargar más tarde, el lienzo necesita sus medidas
  parts.forEach(p => { if (!p.img.complete) p.img.addEventListener('load', () => { measure(); render(); }, { once: true }); });
})();

// Vídeo de fondo de «cómo funciona»: sólo se reproduce mientras se ve, para no
// gastar batería ni procesador cuando la sección está fuera de pantalla. Con
// «reducir movimiento» se queda parado en el primer fotograma.
(function () {
  const video = document.querySelector('.nfc-how-video');
  if (!video) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    video.removeAttribute('autoplay');
    video.pause();
    return;
  }
  if (!('IntersectionObserver' in window)) return;
  new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const p = video.play();
        if (p && p.catch) p.catch(() => { /* sin permiso para reproducir: se queda el póster */ });
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.05 }).observe(video);
})();
