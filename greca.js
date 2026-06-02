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
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id = a.getAttribute('href');
      if(id.length<2) return;
      const t = document.querySelector(id);
      if(!t) return;
      e.preventDefault();
      if(lenis) lenis.scrollTo(t, { offset:-60 });
      else t.scrollIntoView({behavior:'smooth'});
    });
  });

  /* ---------- Sticky header morph ---------- */
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
    const COLORS = ['#D8C7AC','#C2A878','#9C572F'];      // lino / arena / óxido
    const N = window.innerWidth < 700 ? 90 : 170;
    let strands = [];

    function resize(){
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height;
      cv.width = Math.round(W*dpr); cv.height = Math.round(H*dpr);
      cv.style.width = W+'px'; cv.style.height = H+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function build(){
      strands = [];
      for(let i=0;i<N;i++){
        const len = 60 + Math.random()*220;
        const ang = (Math.random()*0.7 - 0.35) + (Math.random()<0.5?0:Math.PI); // mostly horizontal-ish
        strands.push({
          x: Math.random()*W, y: Math.random()*H,
          ox:0, oy:0,                       // desplazamiento por repulsión
          len, ang,
          curve:(Math.random()*0.5-0.25),
          w: 0.6 + Math.random()*0.8,
          a: 0.10 + Math.random()*0.12,
          c: COLORS[(Math.random()*COLORS.length)|0],
          ph: Math.random()*Math.PI*2,
          sp: 0.2 + Math.random()*0.5
        });
      }
    }
    resize(); build();

    let mx=-9999, my=-9999, t=0;
    if(FINE){
      hero.addEventListener('mousemove', e=>{
        const r = hero.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
      });
      hero.addEventListener('mouseleave', ()=>{ mx=-9999; my=-9999; });
    }

    function drawStrand(s, drift){
      const dx = Math.cos(s.ang), dy = Math.sin(s.ang);
      const nx = -dy, ny = dx;                       // normal
      const bow = s.curve * s.len;
      const x0 = s.x + s.ox, y0 = s.y + s.oy + drift;
      const x1 = x0 + dx*s.len, y1 = y0 + dy*s.len;
      const cxp = (x0+x1)/2 + nx*bow, cyp = (y0+y1)/2 + ny*bow;
      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.quadraticCurveTo(cxp,cyp,x1,y1);
      ctx.lineWidth = s.w; ctx.strokeStyle = s.c; ctx.globalAlpha = s.a;
      ctx.stroke();
    }

    function frame(){
      t += 0.005;
      ctx.clearRect(0,0,W,H);
      ctx.lineCap='round';
      for(const s of strands){
        // deriva orgánica
        const drift = Math.sin(t*s.sp + s.ph)*6;
        // repulsión del cursor (con easing de retorno)
        if(FINE){
          const cx = s.x - mx, cy = s.y - my;
          const d = Math.hypot(cx,cy);
          const R = 140;
          if(d < R){
            const f = (1 - d/R);
            s.ox += ((cx/ (d||1)) * f * 26 - s.ox)*0.12;
            s.oy += ((cy/ (d||1)) * f * 26 - s.oy)*0.12;
          } else {
            s.ox += (0 - s.ox)*0.06; s.oy += (0 - s.oy)*0.06;
          }
        }
        drawStrand(s, drift);
      }
      ctx.globalAlpha = 1;
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
      introTl.to(mask, { clipPath:'inset(0% 0% 0% 0% round 46% 54% 48% 52% / 58% 42% 58% 42%)', opacity:1, duration:1.5, ease:'expo.out' }, 0);
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

  ScrollTrigger.refresh();
  window.addEventListener('load', ()=> ScrollTrigger.refresh());
})();
