/* ============================================================
   GRECA — UI interactions (popover de colección + drawer de detalle)
   Carga después de greca.js
   ============================================================ */
(function(){
  "use strict";
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!window.gsap;
  const isMobile = ()=> window.matchMedia('(max-width:760px)').matches;

  /* ---------- 1 · Colección: popover de piezas ---------- */
  (function collectionPops(){
    const cats = Array.from(document.querySelectorAll('.cat'));
    if(!cats.length) return;

    cats.forEach(cat=>{
      const frame = cat.querySelector('.cat-frame');
      const pop   = cat.querySelector('.cat-pop');
      if(!frame || !pop) return;

      // indicador "+" (sólo visible en mobile vía CSS) que sugiere tocar para ver piezas
      const tap = document.createElement('span');
      tap.className = 'cat-tap';
      tap.setAttribute('aria-hidden','true');
      frame.appendChild(tap);

      function setOpen(open){
        cat.classList.toggle('is-open', open);
        pop.setAttribute('aria-hidden', open ? 'false' : 'true');
      }
      function closeOthers(){
        cats.forEach(c=>{ if(c!==cat){ c.classList.remove('is-open'); const p=c.querySelector('.cat-pop'); if(p) p.setAttribute('aria-hidden','true'); } });
      }

      // los <a> son placeholders → evitamos el salto a #coleccion.
      // en mobile, tocar la tarjeta despliega/oculta el overlay de piezas.
      cat.addEventListener('click', e=>{
        e.preventDefault();
        if(isMobile()){
          const open = !cat.classList.contains('is-open');
          closeOthers(); setOpen(open);
        }
      });
    });

    // tocar fuera cierra los abiertos (mobile)
    document.addEventListener('click', e=>{
      if(!isMobile()) return;
      if(e.target.closest('.cat')) return;
      cats.forEach(c=>{ c.classList.remove('is-open'); const p=c.querySelector('.cat-pop'); if(p) p.setAttribute('aria-hidden','true'); });
    });
  })();

  /* ---------- 2 · Pieza destacada: drawer de detalle ---------- */
  (function detailSheet(){
    const sheet = document.getElementById('ffDetail');
    const btn   = document.getElementById('ffDetailBtn');
    if(!sheet || !btn) return;

    const panel = sheet.querySelector('.sheet-panel');
    const scrim = sheet.querySelector('.sheet-scrim');
    const fig   = document.getElementById('featuredFig');
    const items = Array.from(sheet.querySelectorAll('.sh-anim'));
    const lenis = window.__lenis || null;
    let lastFocus = null, animating = false, photo = null;
    const axis = ()=> window.matchMedia('(max-width:560px)').matches ? 'yPercent' : 'xPercent';
    const lockScroll = e=>{ e.preventDefault(); };

    // clon nítido de la foto del sweater, posicionado sobre su lugar real
    function makePhoto(){
      if(!fig) return;
      removePhoto();
      const r = fig.getBoundingClientRect();
      if(r.width < 2 || r.bottom < 0 || r.top > innerHeight) return; // fuera de vista → sin clon
      photo = fig.cloneNode(true);
      photo.removeAttribute('id');
      photo.className = 'sheet-photo';
      photo.setAttribute('aria-hidden','true');
      photo.querySelectorAll('[id]').forEach(n=> n.removeAttribute('id'));
      photo.style.left = r.left+'px';
      photo.style.top = r.top+'px';
      photo.style.width = r.width+'px';
      photo.style.height = r.height+'px';
      panel.insertAdjacentElement('beforebegin', photo);
    }
    function removePhoto(){ if(photo && photo.parentNode){ photo.parentNode.removeChild(photo); } photo = null; }

    function open(){
      lastFocus = document.activeElement;
      sheet.classList.add('is-open');
      sheet.setAttribute('aria-hidden','false');
      if(lenis) lenis.stop();
      window.addEventListener('wheel', lockScroll, {passive:false});
      window.addEventListener('touchmove', lockScroll, {passive:false});
      const A = axis();
      makePhoto();

      if(hasGSAP && !REDUCED){
        gsap.killTweensOf([panel, scrim, ...items]);
        gsap.set(panel, { xPercent:0, yPercent:0 });
        gsap.set(panel, { [A]:100 });
        gsap.set(scrim, { opacity:0 });
        gsap.to(scrim, { opacity:1, duration:0.5, ease:'power2.out' });
        gsap.to(panel, { [A]:0, duration:0.62, ease:'expo.out' });
        if(photo) gsap.fromTo(photo, { opacity:0 }, { opacity:1, duration:0.5, ease:'power2.out' });
        gsap.fromTo(items, { opacity:0, y:16 }, { opacity:1, y:0, duration:0.55, ease:'power3.out', stagger:0.05, delay:0.18 });
      } else {
        panel.style.transform = 'none';
        scrim.style.opacity = '1';
        items.forEach(it=>{ it.style.opacity=1; it.style.transform='none'; });
      }
      const closeBtn = sheet.querySelector('.sheet-close');
      if(closeBtn) closeBtn.focus({preventScroll:true});
    }

    function finishClose(){
      sheet.classList.remove('is-open');
      sheet.setAttribute('aria-hidden','true');
      if(lenis) lenis.start();
      window.removeEventListener('wheel', lockScroll, {passive:false});
      window.removeEventListener('touchmove', lockScroll, {passive:false});
      if(hasGSAP) gsap.set(panel, { clearProps:'transform' });
      else panel.style.transform = '';
      scrim.style.opacity = '';
      removePhoto();
      animating = false;
      if(lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
    }

    function close(){
      if(animating) return;
      const A = axis();
      if(hasGSAP && !REDUCED){
        animating = true;
        gsap.killTweensOf([panel, scrim]);
        gsap.to(scrim, { opacity:0, duration:0.4, ease:'power2.in' });
        if(photo) gsap.to(photo, { opacity:0, duration:0.32, ease:'power2.in' });
        gsap.to(panel, { [A]:100, duration:0.46, ease:'power3.in', onComplete:finishClose });
      } else {
        finishClose();
      }
    }

    btn.addEventListener('click', e=>{ e.preventDefault(); open(); });
    sheet.querySelectorAll('[data-close]').forEach(el=> el.addEventListener('click', close));
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && sheet.classList.contains('is-open')) close(); });
  })();
})();
