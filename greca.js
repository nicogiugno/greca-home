/* ============================================================
   GRECA — Motion
   GSAP + ScrollTrigger + Lenis · líquido feTurbulence · reveals
   ============================================================ */
(function(){
  "use strict";
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(hover:hover) and (pointer:fine)').matches;

  /* ---------- Grain (canvas noise -> css var) ---------- */
  (function grain(){
    const s = 120, c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(s, s);
    for (let i = 0; i < img.data.length; i += 4){
      const v = (Math.random() * 255) | 0;
      img.data[i] = img.data[i+1] = img.data[i+2] = v;
      img.data[i+3] = 22;
    }
    ctx.putImageData(img, 0, 0);
    document.documentElement.style.setProperty('--grain-url', `url(${c.toDataURL()})`);
  })();

  /* ---------- Marquee content build ---------- */
  (function buildMarquee(){
    const track = document.getElementById('marqueeTrack');
    if(!track) return;
    const words = ['FIBRAS NATURALES','PRODUCCIÓN CUIDADA','HECHO PARA DURAR','TONOS QUE COMBINAN','MENOS, PERO MEJOR'];
    const unit = document.createElement('span');
    unit.className = 'marquee-item';
    unit.innerHTML = words.map(w => `${w} <span class="star">✳</span>`).join(' ');
    // duplicate enough times to fill & loop
    for(let i=0;i<4;i++) track.appendChild(unit.cloneNode(true));
  })();

  /* ---------- Custom cursor ---------- */
  if(FINE){
    const dot = document.querySelector('.cursor');
    let cx = innerWidth/2, cy = innerHeight/2, tx = cx, ty = cy;
    addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
    (function loop(){
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      dot.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.querySelectorAll('a, button, [data-magnetic], input').forEach(el=>{
      el.addEventListener('mouseenter', ()=> dot.classList.add('is-big'));
      el.addEventListener('mouseleave', ()=> dot.classList.remove('is-big'));
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if(FINE && !REDUCED){
    document.querySelectorAll('[data-magnetic]').forEach(el=>{
      const big = el.classList.contains('cat');     // tarjetas grandes de la colección
      const strength = big ? 0.09 : 0.3;            // mucha menos fuerza en las grandes
      const ease = big ? 0.07 : 0.16;               // interpolación más lenta = más suave
      const radius = 78;
      let tx = 0, ty = 0, cx = 0, cy = 0, active = false, raf = null;
      function tick(){
        cx += (tx - cx) * ease;
        cy += (ty - cy) * ease;
        const settled = Math.abs(tx - cx) < 0.1 && Math.abs(ty - cy) < 0.1;
        if(settled){ cx = tx; cy = ty; }
        if(!active && settled){ el.style.transform = ''; raf = null; return; }
        el.style.transform = `translate(${cx.toFixed(2)}px, ${cy.toFixed(2)}px)`;
        raf = settled ? null : requestAnimationFrame(tick);
      }
      function start(){ if(!raf) raf = requestAnimationFrame(tick); }
      el.addEventListener('mousemove', e=>{
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width/2);
        const my = e.clientY - (r.top + r.height/2);
        if(Math.hypot(mx,my) < radius + Math.max(r.width,r.height)/2){
          tx = mx*strength; ty = my*strength; active = true; start();
        }
      });
      el.addEventListener('mouseleave', ()=>{ tx = 0; ty = 0; active = false; start(); });
    });
  }

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null;
  if(!REDUCED && window.Lenis){
    lenis = new Lenis({ duration:1.15, easing:t=>Math.min(1,1.001-Math.pow(2,-10*t)), smoothWheel:true });
    function raf(time){ lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window.__lenis = lenis;
  }
  // anchor links
  function smoothScrollTo(t){
    if(!t) return;
    if(lenis){
      const startY = lenis.scroll || window.scrollY;
      const destY  = t.getBoundingClientRect().top + startY - 60;
      const dist   = Math.abs(destY - startY);
      const dur    = Math.min(2.6, Math.max(1.1, dist / 1400));   // duración proporcional a la distancia
      lenis.scrollTo(destY, {
        duration: dur,
        easing: x => x<0.5 ? 4*x*x*x : 1-Math.pow(-2*x+2,3)/2     // easeInOutCubic: arranque y frenado suaves
      });
    } else {
      t.scrollIntoView({behavior:'smooth'});
    }
  }
  window.__grecaScrollTo = smoothScrollTo;

  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    if(a.classList.contains('cat')) return;     // las tarjetas de colección no navegan
    if(a.classList.contains('mm-link')) return; // el menú mobile gestiona su propio scroll al cerrarse
    a.addEventListener('click', e=>{
      const id = a.getAttribute('href');
      if(id.length<2) return;
      const t = document.querySelector(id);
      if(!t) return;
      e.preventDefault();
      smoothScrollTo(t);
    });
  });

  /* ---------- Scroll-spy: marca la sección activa en el menú ---------- */
  (function scrollSpy(){
    const links = Array.from(document.querySelectorAll('.nav-links a[href^="#"], .mobile-menu .mm-link'));
    const items = links.map(a=>{
      const sec = document.querySelector(a.getAttribute('href'));
      return sec ? { a, sec } : null;
    }).filter(Boolean);
    if(!items.length) return;

    let current = null;
    function update(){
      // línea de referencia: justo debajo del header fijo
      const line = (document.getElementById('header')?.offsetHeight || 80) + 40;
      let active = items[0];
      for(const it of items){
        if(it.sec.getBoundingClientRect().top <= line) active = it;
      }
      // si estamos al fondo de la página, fuerza el último (Contacto)
      if(window.innerHeight + window.scrollY >= document.body.scrollHeight - 4){
        active = items[items.length-1];
      }
      if(active === current) return;
      current = active;
      items.forEach(it=> it.a.classList.toggle('is-current', it === active));
    }
    if(lenis) lenis.on('scroll', update);
    addEventListener('scroll', update, { passive:true });
    addEventListener('resize', update);
    update();
  })();

  /* ---------- Menú mobile (hamburguesa) ---------- */
  (function mobileMenu(){
    const toggle = document.getElementById('navToggle');
    const menu   = document.getElementById('mobileMenu');
    if(!toggle || !menu) return;
    let open = false;

    function setOpen(state){
      open = state;
      toggle.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if(lenis){ open ? lenis.stop() : lenis.start(); }
    }

    toggle.addEventListener('click', ()=> setOpen(!open));
    // al tocar un enlace: cerrar el menú y luego desplazar suavemente a la sección
    menu.querySelectorAll('.mm-link').forEach(a=>{
      a.addEventListener('click', e=>{
        e.preventDefault();
        const t = document.querySelector(a.getAttribute('href'));
        setOpen(false);                          // reanuda lenis + libera el scroll
        requestAnimationFrame(()=> smoothScrollTo(t));   // tras reanudar, desplaza
      });
    });
    addEventListener('keydown', e=>{ if(e.key==='Escape' && open) setOpen(false); });
    matchMedia('(min-width:781px)').addEventListener('change', e=>{ if(e.matches && open) setOpen(false); });
  })();

  /* ---------- Modal demo / contacto (VisualNova) ---------- */
  (function demoModal(){
    const modal = document.getElementById('demoModal');
    if(!modal) return;
    let open = false, lastFocus = null;

    function setOpen(state){
      open = state;
      modal.classList.toggle('is-open', open);
      modal.setAttribute('aria-hidden', open ? 'false' : 'true');
      document.documentElement.style.overflow = open ? 'hidden' : '';
      if(lenis){ open ? lenis.stop() : lenis.start(); }
      if(open){
        lastFocus = document.activeElement;
        const c = modal.querySelector('.demo-close'); if(c) c.focus();
      } else if(lastFocus && lastFocus.focus){ lastFocus.focus(); }
    }
    window.__openDemo = ()=> setOpen(true);

    // Enlaces/botones que no llevan a ningún lado de la página
    const DEAD = 'a[href="#"]:not(.wordmark), .cat-pop-cta, .post, [data-demo]';
    document.addEventListener('click', e=>{
      // cerrar (scrim o botón ✕)
      if(e.target.closest('[data-demo-close]')){ if(open){ e.preventDefault(); setOpen(false); } return; }
      // clicks dentro de la tarjeta (links de contacto reales) no se interceptan
      if(e.target.closest('.demo-card')) return;
      const trigger = e.target.closest(DEAD);
      if(!trigger) return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(true);
    }, true);  // captura: se adelanta a la navegación y a los toggles de las tarjetas

    addEventListener('keydown', e=>{ if(e.key==='Escape' && open) setOpen(false); });
  })();

  const header = document.getElementById('header');
  const onScrollHeader = ()=> header.classList.toggle('is-stuck', scrollY > 70);
  addEventListener('scroll', onScrollHeader); onScrollHeader();

  /* ---------- Hero: campo de fibras de algodón (Canvas 2D, interactivo) ---------- */
  (function fibers(){
    const cv = document.getElementById('heroFibers');
    const hero = document.getElementById('top');
    if(!cv || !cv.getContext || !hero) return;          // fallback: gradiente base
    const ctx = cv.getContext('2d');
    let W=0, H=0, dpr=Math.min(devicePixelRatio||1, 1.5);
    let scrollY = window.scrollY || 0;

    // Fibras de lino: tonos apenas más oscuros que el fondo (--crema #F3ECE1).
    // Casi monocromas, con algún hilo cálido (cuero) muy tenue.
    const INK  = '43,37,32';     // --tinta
    const WARM = '107,66,38';    // --cuero

    // Capas de profundidad: el fondo es más tenue/fino/lento; el frente, un punto más presente.
    const isPhone = window.innerWidth < 700;
    const LAYERS = [
      { count: isPhone? 5:8, width:0.6,  alpha:0.055, amp:5,  speed:0.10, parallax:0.018 },
      { count: isPhone? 5:8, width:0.85, alpha:0.082, amp:8,  speed:0.13, parallax:0.040 },
      { count: isPhone? 4:7, width:1.1,  alpha:0.120, amp:12, speed:0.16, parallax:0.075 }
    ];
    let threads = [];

    function resize(){
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
      cv.style.width = W+'px'; cv.style.height = H+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function build(){
      threads = [];
      const MARGIN = W*0.14;                  // los hilos entran y salen del cuadro
      const span = W + MARGIN*2;
      const step = Math.max(46, W/16);        // separación entre puntos de control
      const segs = Math.max(8, Math.round(span/step));
      LAYERS.forEach((L, li)=>{
        for(let i=0;i<L.count;i++){
          const baseY = (H/(L.count+1))*(i+1) + (Math.random()*2-1)*H*0.045;
          const slope = (Math.random()*2-1)*0.055;       // leve inclinación
          const weave = 0.7 + Math.random()*1.1;          // ondulación tejida (estática)
          const wf    = 0.0015 + Math.random()*0.0015;    // frecuencia del tejido
          const ph0   = Math.random()*Math.PI*2;
          const warm  = Math.random() < 0.16;
          const pts = [];
          for(let j=0;j<=segs;j++){
            const x = -MARGIN + (span/segs)*j;
            const y = baseY + slope*(x - W/2) + Math.sin(x*wf + ph0)*L.amp*weave*0.45;
            pts.push({ bx:x, by:y, dx:0, dy:0, fx:x, fy:y });  // dx/dy = brisa (eased)
          }
          threads.push({
            pts, layer:li,
            w: L.width*(0.85+Math.random()*0.4),
            alpha: L.alpha*(0.8+Math.random()*0.5),
            color: warm? WARM : INK,
            phase: Math.random()*Math.PI*2,
            speed: L.speed*(0.85+Math.random()*0.3),
            amp: L.amp, parallax: L.parallax,
            wob: 0.0009 + Math.random()*0.0008
          });
        }
      });
    }
    resize(); build();

    // brisa: el cursor se sigue con mucha inercia → corriente de aire lenta
    let mx=-9999, my=-9999, wx=-9999, wy=-9999, t=0;
    if(FINE){
      hero.addEventListener('mousemove', e=>{
        const r = hero.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
      });
      hero.addEventListener('mouseleave', ()=>{ mx=-9999; my=-9999; });
    }
    addEventListener('scroll', ()=>{ scrollY = window.scrollY || 0; }, {passive:true});

    const SIGMA = 155, SIG2 = 2*SIGMA*SIGMA;   // alcance de la brisa
    const LIFT  = 24;                          // cuánto se ahueca la tela

    function frame(){
      t += 0.006;
      ctx.clearRect(0,0,W,H);
      ctx.lineCap='round'; ctx.lineJoin='round';

      // el viento sigue al cursor con fuerte inercia (lento, fluido)
      if(FINE && mx>-9000){
        if(wx<-9000){ wx=mx; wy=my; }
        wx += (mx-wx)*0.045; wy += (my-wy)*0.045;
      } else { wx=-9999; wy=-9999; }

      for(const th of threads){
        const pts = th.pts, n = pts.length;
        const par = -scrollY * th.parallax;            // deriva lenta al hacer scroll
        const kf  = (th.layer+1)/3;                    // el frente reacciona más
        for(let k=0;k<n;k++){
          const p = pts[k];
          // respiración ambiente: onda viajera lenta (la tela respira)
          const amb = Math.sin(t*th.speed + th.phase + p.bx*th.wob)*th.amp
                    + Math.sin(t*th.speed*0.6 + p.bx*th.wob*0.5)*th.amp*0.28;
          // brisa del cursor: ahueca la tela alrededor, suave y direccional
          let tx=0, ty=0;
          if(wx>-9000){
            const ddx = p.bx - wx, ddy = (p.by+amb+par) - wy;
            const infl = Math.exp(-(ddx*ddx + ddy*ddy)/SIG2);
            if(infl>0.001){
              ty -= infl*LIFT*kf;                      // se levanta hacia la corriente
              tx += (ddx>=0?1:-1)*infl*LIFT*0.42*kf;   // y se abre a los lados
            }
          }
          // easing lento hacia el objetivo → retorno suave al soltar
          p.dx += (tx - p.dx)*0.045;
          p.dy += (ty - p.dy)*0.045;
          p.fx = p.bx + p.dx;
          p.fy = p.by + amb + par + p.dy;
        }
        // curva suave a través de los puntos (midpoints)
        ctx.beginPath();
        ctx.moveTo(pts[0].fx, pts[0].fy);
        for(let k=1;k<n-1;k++){
          const mpx=(pts[k].fx+pts[k+1].fx)/2, mpy=(pts[k].fy+pts[k+1].fy)/2;
          ctx.quadraticCurveTo(pts[k].fx, pts[k].fy, mpx, mpy);
        }
        ctx.quadraticCurveTo(pts[n-2].fx, pts[n-2].fy, pts[n-1].fx, pts[n-1].fy);
        ctx.lineWidth = th.w; ctx.strokeStyle = `rgba(${th.color},${th.alpha})`;
        ctx.globalAlpha = 1; ctx.stroke();
      }
    }

    if(REDUCED){ frame(); return; }              // un solo frame estático

    let running = true, raf;
    function loop(){ if(running){ frame(); } raf = requestAnimationFrame(loop); }
    loop();
    // pausar fuera de viewport
    if('IntersectionObserver' in window){
      new IntersectionObserver(es=>{ running = es[0].isIntersecting; }, {threshold:0})
        .observe(hero);
    }
    let rt;
    addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ dpr=Math.min(devicePixelRatio||1,1.5); resize(); build(); }, 200); });
  })();

  /* ====================== GSAP ====================== */
  if(!window.gsap){
    // Fallback sin GSAP: todo visible, sin estados ocultos.
    document.querySelectorAll('[data-fade]').forEach(e=>{ e.style.opacity=1; e.style.transform='none'; });
    document.querySelectorAll('.reveal-line>span').forEach(e=>{ e.style.transform='none'; });
    return;
  }
  document.documentElement.classList.add('js-ready');
  gsap.registerPlugin(ScrollTrigger);
  if(lenis) lenis.on('scroll', ScrollTrigger.update);
  // Red de seguridad en táctil: Lenis usa scroll nativo en mobile; garantizamos
  // que los ScrollTriggers (reveals, parallax, scrubs) se actualicen igualmente.
  if(!FINE) addEventListener('scroll', ()=> ScrollTrigger.update(), { passive:true });

  /* ---- Hero intro: liquid mask reveal + line reveal + ctas ---- */
  const introTl = gsap.timeline({ defaults:{ ease:'power4.out' }, delay:0.15 });
  // hero mask organic open
  const mask = document.getElementById('heroMask');
  const heroImg = document.querySelector('#heroCarousel .hero-slide');
  if(mask){
    if(REDUCED){
      gsap.set(mask,{clipPath:'inset(0 0 0 0)',opacity:1});
    } else {
      gsap.set(mask,{ clipPath:'inset(38% 30% 38% 30% round 50%)', opacity:0 });
      introTl.to(mask, { clipPath:'inset(0% 0% 0% 0% round 48% 48% 9% 9% / 34% 34% 6% 6%)', opacity:1, duration:1.5, ease:'expo.out' }, 0);
      introTl.from(heroImg, { scale:1.28, duration:1.8, ease:'expo.out' }, 0);
    }
  }
  // hero h1 lines
  gsap.utils.toArray('.hero .reveal-line > span').forEach((el,i)=>{
    gsap.set(el,{ yPercent:115 });
    introTl.to(el,{ yPercent:0, duration:1.1 }, 0.15 + i*0.12);
  });
  // hero fades
  introTl.from('.hero [data-fade]', { y:22, opacity:0, duration:0.9, stagger:0.1 }, 0.5);

  // Safety net: if rAF is throttled (e.g. tab backgrounded at load),
  // force the hero to its final, visible state so it never stays blank.
  setTimeout(()=>{ if(introTl.progress() < 1) introTl.progress(1); }, 2800);
  document.addEventListener('visibilitychange', ()=>{
    if(!document.hidden && introTl.progress() < 1) introTl.progress(1);
  });

  /* ---- Hero carousel: crossfade contemplativo + Ken Burns dentro de la máscara ---- */
  (function heroCarousel(){
    const car = document.getElementById('heroCarousel');
    if(!car) return;
    const slides = Array.from(car.querySelectorAll('.hero-slide'));
    const dots = Array.from(document.querySelectorAll('#heroDots span'));
    if(REDUCED || slides.length < 2){
      // estado base: solo la primera visible, nada se mueve
      slides.forEach((s,i)=> gsap.set(s,{ opacity:i===0?1:0 }));
      return;
    }

    const HOLD = 5.5;   // s en pantalla por slide
    const CROSS = 1.6;  // s de crossfade
    const isMobile = ()=> window.matchMedia('(max-width:880px)').matches;

    let idx = 0, call = null, visible = true, hovering = false;

    // estados iniciales (la slide 0 la maneja el intro: 1.28 → 1.06)
    slides.forEach((s,i)=> gsap.set(s,{ opacity:i===0?1:0, xPercent:0, yPercent:0 }));

    function kenBurns(slide, i, fromCurrent){
      const dir = i % 2 === 0 ? 1 : -1;
      const kb = isMobile() ? 1.04 : 1.06;          // Ken Burns más sutil en mobile
      if(fromCurrent){
        gsap.to(slide, { scale:kb + 0.04, xPercent:1.4*dir, yPercent:-1*dir,
          duration:HOLD + CROSS, ease:'none', overwrite:'auto' });
      } else {
        gsap.fromTo(slide,
          { scale:1.0, xPercent:-1.4*dir, yPercent:1*dir },
          { scale:kb, xPercent:1.4*dir, yPercent:-1*dir, duration:HOLD + CROSS, ease:'none', overwrite:'auto' });
      }
    }

    function setDots(i){
      dots.forEach((d,n)=> d.classList.toggle('is-active', n===i));
    }

    function advance(){
      const cur = slides[idx];
      const next = (idx + 1) % slides.length;
      const nxt = slides[next];
      gsap.to(cur, { opacity:0, duration:CROSS, ease:'power2.inOut', overwrite:'auto' });
      gsap.to(nxt, { opacity:1, duration:CROSS, ease:'power2.inOut', overwrite:'auto' });
      kenBurns(nxt, next, false);
      idx = next;
      setDots(idx);
      queueNext();
    }

    function queueNext(){
      if(call) call.kill();
      call = gsap.delayedCall(HOLD, advance);
      if(!visible || hovering) call.pause();
    }

    function updatePause(){
      if(!call) return;
      (visible && !hovering) ? call.resume() : call.pause();
    }

    // pausa fuera del viewport
    if('IntersectionObserver' in window){
      new IntersectionObserver((ents)=>{
        visible = ents[0].isIntersecting;
        updatePause();
      }, { threshold:0.15 }).observe(car);
    }
    // pausa muy sutil al pasar el cursor (no rompe el ritmo)
    if(FINE){
      car.addEventListener('pointerenter', ()=>{ hovering = true; updatePause(); });
      car.addEventListener('pointerleave', ()=>{ hovering = false; updatePause(); });
    }

    // arranca DESPUÉS del reveal de entrada de la máscara.
    // La primera slide se sostiene menos para que el carrusel "tome vida" pronto.
    gsap.delayedCall(2.2, ()=>{
      kenBurns(slides[0], 0, true);
      call = gsap.delayedCall(2.4, advance);
      if(!visible || hovering) call.pause();
    });
  })();

  /* ---- Line reveals on scroll (section H2s) ---- */
  gsap.utils.toArray('.section .reveal-line > span, .pin-panel .reveal-line > span, .news .reveal-line > span').forEach(span=>{
    gsap.set(span,{ yPercent:115 });
    ScrollTrigger.create({
      trigger: span, start:'top 88%',
      onEnter: ()=> gsap.to(span,{ yPercent:0, duration:1.0, ease:'power4.out' })
    });
  });

  /* ---- Stagger fade-up (batch) ---- */
  ScrollTrigger.batch('[data-fade]:not(.hero [data-fade])', {
    start:'top 86%',
    onEnter: batch => gsap.to(batch, { y:0, opacity:1, duration:0.9, stagger:0.08, ease:'power3.out', overwrite:true })
  });
  gsap.set('[data-fade]:not(.hero [data-fade])', { y: REDUCED?0:20, opacity: REDUCED?1:0 });

  /* ---- Multilayer parallax ---- */
  if(!REDUCED){
    gsap.utils.toArray('[data-parallax]').forEach(box=>{
      const img = box.querySelector('[data-parallax-img]') || box.querySelector('img');
      if(!img) return;
      gsap.fromTo(img, { yPercent:-8 }, {
        yPercent:8, ease:'none',
        scrollTrigger:{ trigger:box, start:'top bottom', end:'bottom top', scrub:true }
      });
    });
  }

  /* ---- Path-draw icons (valores) ---- */
  gsap.utils.toArray('.draw path, .draw circle').forEach(p=>{
    if(REDUCED) return;
    gsap.set(p,{ strokeDasharray:1, strokeDashoffset:1 });
    ScrollTrigger.create({
      trigger:p.closest('.pilar'), start:'top 82%',
      onEnter:()=> gsap.to(p,{ strokeDashoffset:0, duration:0.9, ease:'power2.out' })
    });
  });
  // greca meandro divider draw
  const greca = document.getElementById('grecaPath');
  if(greca && !REDUCED){
    gsap.set(greca,{ strokeDasharray:1, strokeDashoffset:1 });
    ScrollTrigger.create({ trigger:greca, start:'top 92%', onEnter:()=> gsap.to(greca,{ strokeDashoffset:0, duration:1.4, ease:'power2.out' }) });
  }

  /* ---- A · Featured: crossfade scrubbed óxido→arena→crudo + swatches ---- */
  (function featuredCrossfade(){
    const sec = document.getElementById('destacada');
    const fig = document.getElementById('featuredFig');
    if(!sec || !fig) return;
    const imgs = [0,1,2].map(i=> fig.querySelector(`.ff-img[data-ff="${i}"]`));
    const swatches = Array.from(document.querySelectorAll('#ffSwatches .swatch-opt'));
    if(imgs.some(x=>!x)) return;

    // remap helper: rampa lineal recortada
    const ramp = (p,a,b)=> gsap.utils.clamp(0, 1, (p-a)/(b-a));

    function apply(p){
      // óxido se sostiene al entrar; crudo se sostiene al salir. Transiciones más espaciadas.
      const o1 = 1 - ramp(p,0.34,0.46);
      const o2 = ramp(p,0.34,0.46) * (1 - ramp(p,0.66,0.78));
      const o3 = ramp(p,0.66,0.78);
      imgs[0].style.opacity = o1;
      imgs[1].style.opacity = o2;
      imgs[2].style.opacity = o3;
      const active = p < 0.44 ? 0 : (p <= 0.72 ? 1 : 2);
      if(active !== apply._a){
        apply._a = active;
        swatches.forEach((s,i)=> s.classList.toggle('is-active', i===active));
      }
    }
    apply(0);

    if(REDUCED){ return; }  // estático en óxido, swatches visibles

    // runway + fila sticky (sin pin). El scrub recorre toda la duración sticky
    // = alto del runway − viewport. Imagen y texto se sueltan juntos (sin cola).
    const runway = sec.querySelector('.featured-runway');
    ScrollTrigger.create({
      trigger: runway,
      start: 'top top',
      end: () => '+=' + Math.max(200, runway.offsetHeight - window.innerHeight),
      scrub:0.6, invalidateOnRefresh:true,
      onUpdate: self => apply(self.progress)
    });

    // swatches clicables: saltar a la zona correspondiente del recorrido
    const zone = [0.15, 0.55, 0.9];
    swatches.forEach((s,i)=>{
      s.addEventListener('click', ()=>{
        const trig = ScrollTrigger.getAll().find(t=>t.trigger===runway);
        if(!trig) return;
        const y = trig.start + (trig.end - trig.start)*zone[i];
        if(lenis) lenis.scrollTo(y); else window.scrollTo(0,y);
      });
    });
  })();

  /* ---- B · Valores: figura sticky + crossfade ligado al pilar activo ---- */
  (function valoresPillars(){
    const fig = document.getElementById('valoresFig');
    const pilares = Array.from(document.querySelectorAll('#pilares .pilar'));
    if(!fig || !pilares.length) return;
    const imgs = [0,1,2].map(i=> fig.querySelector(`.vf-img[data-vf="${i}"]`));
    if(imgs.some(x=>!x)) return;

    function setActive(i){
      if(setActive._i === i) return;
      setActive._i = i;
      pilares.forEach((p,k)=> p.classList.toggle('is-active', k===i));
      imgs.forEach((im,k)=> im.style.opacity = k===i ? 1 : 0);
    }
    setActive(0);

    if(REDUCED) return;   // todos los pilares legibles, imagen 20

    pilares.forEach((p,i)=>{
      ScrollTrigger.create({
        trigger:p, start:'top 55%', end:'bottom 45%',
        onEnter:()=> setActive(i),
        onEnterBack:()=> setActive(i)
      });
    });
  })();

  /* ---- C · Doble marquee opuesto (scrubbed, bidireccional) ---- */
  (function dualMarquee(){
    const sec = document.getElementById('dualMarquee');
    const top = document.getElementById('dmTop');
    const bot = document.getElementById('dmBottom');
    if(!sec || !top || !bot) return;
    const topTxt = 'VESTIR SIN PRISA';
    const botTxt = 'menos prendas, mejores decisiones';
    const mk = (track, txt, serif)=>{
      const item = document.createElement('span');
      item.className = 'dm-item';
      const sep = serif ? '·' : '✳';
      item.innerHTML = `${txt} <span class="sep">${sep}</span>`;
      for(let i=0;i<8;i++) track.appendChild(item.cloneNode(true));
    };
    mk(top, topTxt, false);
    mk(bot, botTxt, true);

    if(REDUCED) return;

    // distancia de recorrido: ancho de medio track aprox
    const dist = ()=> Math.min(top.scrollWidth*0.45, bot.scrollWidth*0.45, 1100);
    // estado inicial: arriba empieza en 0, abajo desplazado a -dist
    gsap.set(top, { x:0 });
    gsap.set(bot, { x:()=> -dist() });
    gsap.to(top, {
      x:()=> -dist(), ease:'none',
      scrollTrigger:{ trigger:sec, start:'top bottom', end:'bottom top', scrub:0.6, invalidateOnRefresh:true }
    });
    gsap.to(bot, {
      x:0, ease:'none',
      scrollTrigger:{ trigger:sec, start:'top bottom', end:'bottom top', scrub:0.6, invalidateOnRefresh:true }
    });
  })();

  /* ---- Pinned horizontal editorial (5.6) ---- */
  const pinTrack = document.getElementById('pinTrack');
  const pinVp = document.getElementById('pinViewport');
  const pinBar = document.getElementById('pinBar');
  if(pinTrack && window.innerWidth > 768 && !REDUCED){
    const panels = pinTrack.children.length;
    const scrollLen = (panels - 1) * window.innerWidth;
    gsap.to(pinTrack, {
      x: -scrollLen, ease:'none',
      scrollTrigger:{
        trigger: pinVp, start:'top top', end:'+='+scrollLen,
        pin:true, scrub:0.6, invalidateOnRefresh:true, refreshPriority:10,
        onUpdate: self => { if(pinBar) pinBar.style.width = (self.progress*100).toFixed(1)+'%'; }
      }
    });
  }

  /* ---- Reactive marquee (velocity) ---- */
  (function marquee(){
    const track = document.getElementById('marqueeTrack');
    if(!track) return;
    let x = 0, base = 0.6, vel = 0, last = scrollY;
    const unitW = ()=> track.firstElementChild ? track.firstElementChild.offsetWidth : 1;
    let paused = false;
    track.parentElement.addEventListener('mouseenter', ()=> paused = true);
    track.parentElement.addEventListener('mouseleave', ()=> paused = false);
    if(lenis){ lenis.on('scroll', ({velocity})=>{ vel = Math.min(Math.abs(velocity)*0.04, 4); }); }
    else { addEventListener('scroll', ()=>{ vel = Math.min(Math.abs(scrollY-last)*0.12,4); last = scrollY; }); }
    (function loop(){
      if(!REDUCED){
        const speed = paused ? 0 : (base + vel);
        x -= speed; vel *= 0.92;
        const w = unitW();
        if(w && -x >= w) x += w;
        track.style.transform = `translateX(${x}px)`;
      }
      requestAnimationFrame(loop);
    })();
  })();

  /* ---- Scroll-velocity warp (subtle skew) ---- */
  if(!REDUCED && lenis){
    const warpTargets = gsap.utils.toArray('.pin-fig');
    let q = warpTargets.map(t => gsap.quickTo(t, 'skewY', { duration:0.5, ease:'power3.out' }));
    lenis.on('scroll', ({velocity})=>{
      const sk = gsap.utils.clamp(-1.6, 1.6, velocity*0.03);
      q.forEach(fn => fn(sk));
    });
  }

  // refrescar posiciones cuando imágenes que cambian altura terminan de cargar
  document.querySelectorAll('#featuredFig img, #valoresFig img, #heroMask img').forEach(im=>{
    if(!im.complete) im.addEventListener('load', ()=> ScrollTrigger.refresh(), {once:true});
  });

  // El pin horizontal de "El look" agranda la página (pin-spacer) DESPUÉS de que
  // Lenis calculó su límite de scroll → re-sincronizamos Lenis tras cada refresh,
  // si no el footer/Contacto quedan inalcanzables y los reveals del fondo no disparan.
  if(lenis){
    ScrollTrigger.addEventListener('refresh', ()=> lenis.resize());
  }

  ScrollTrigger.refresh();
  window.addEventListener('load', ()=>{ ScrollTrigger.refresh(); if(lenis) lenis.resize(); });
})();
