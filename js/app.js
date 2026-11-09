(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var params = new URLSearchParams(location.search);
  var NAME = (params.get('n') || '').trim().slice(0, 60) || 'Invitado';
  var SKEY = 'nb_state_v1_' + NAME.toLowerCase();
  var DEF = { done: [false, false, false, false, false], ubiTried: false, finished: false };
  var st;
  try { st = Object.assign({}, DEF, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) { st = Object.assign({}, DEF); }
  if (!Array.isArray(st.done) || st.done.length !== 5) st.done = DEF.done.slice();
  function save() { try { localStorage.setItem(SKEY, JSON.stringify(st)); } catch (e) {} }

  var guest = { name: NAME, plus_one: false, rsvp: null, plus_one_name: '', role: null };
  var THEME = { splash1: '#27DF96', splash2: '#27DF96', login: '#27DF96', home: '#27DF96', s0: '#BB3A4A', s1: '#EEF3EF', s2: '#EEF3EF', s3: '#EEF3EF', s4: '#FFFFFF', final: '#212123' };
  var LABELS = ['Contexto', 'Pizzas', 'Invertir', 'Juicio', 'Natcho'];
  var cur = 'splash1';

  /* ---------- navegación ---------- */
  function show(id, mode) {
    var prev = $('.screen.active');
    if (prev) prev.classList.remove('active', 'anim-fwd', 'anim-back', 'anim-fade');
    var el = $('#' + id);
    el.classList.add('active', mode === 'back' ? 'anim-back' : mode === 'fwd' ? 'anim-fwd' : 'anim-fade');
    var sc = $('.scroll', el);
    if (sc && mode !== 'back') sc.scrollTop = 0;
    cur = id;
    $('#themeColor').content = THEME[id] || '#fff';
    if (id === 'home') renderHome();
  }
  var isSub = function () { return /^s[0-4]$/.test(cur); };

  function goHome() {
    if (!isSub()) return;
    if (history.state && history.state.sub) history.back();
    else show('home', 'back');
  }
  window.addEventListener('popstate', function () { if (isSub()) show('home', 'back'); });

  // splashes: tap tipo story (derecha avanza, izquierda vuelve)
  $('#splash1').addEventListener('click', function (e) {
    var r = e.currentTarget.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width > 0.33) show('splash2', 'fade');
  });
  $('#splash2').addEventListener('click', function (e) {
    var r = e.currentTarget.getBoundingClientRect();
    if ((e.clientX - r.left) / r.width > 0.33) show('login', 'fade'); else show('splash1', 'fade');
  });

  // login
  function enter() { if (st.finished) { renderFinal(); show('final', 'fade'); } else show('home', 'fade'); }
  $('#btnLogin').addEventListener('click', enter);
  $('#btnFace').addEventListener('click', enter);

  /* ---------- invitado ---------- */
  function initials(n) {
    var p = n.trim().split(/\s+/); return ((p[0] || 'N')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }
  function renderGuest() {
    $('#hola').textContent = '¡Hola, ' + guest.name + '!';
    $('#plus1Login').hidden = !guest.plus_one;
    $('#initials').textContent = initials(guest.name);
    $('#plus1Box').hidden = !guest.plus_one;
    document.documentElement.dataset.rsvp = guest.rsvp || '';
  }
  renderGuest();
  NBAPI.getGuest(NAME).then(function (g) {
    guest = Object.assign(guest, g); guest.name = g.name || NAME; renderGuest();
  }).catch(function () {});

  /* ---------- home ---------- */
  function nextStep() { return st.done.indexOf(false); }
  function renderHome() {
    var nxt = nextStep();
    $$('.sc').forEach(function (b, i) {
      b.classList.toggle('done', st.done[i]);
      b.classList.toggle('next', i === nxt);
      b.classList.toggle('locked', nxt !== -1 && i > nxt);
    });
    $('#stepTxt').textContent = nxt === -1 ? 'Completado' : 'Paso ' + (nxt + 1) + ' de 5';
  }
  $$('.sc').forEach(function (b) {
    b.addEventListener('click', function () { openStep(+b.dataset.i, b); });
  });
  function openStep(i, btn) {
    var nxt = nextStep();
    if (nxt !== -1 && i > nxt) {
      btn.classList.remove('shake'); void btn.offsetWidth; btn.classList.add('shake');
      toast('Qué ansiedad. Primero tocá «' + LABELS[nxt] + '».');
      return;
    }
    if (i <= 2) { st.done[i] = true; save(); }
    if (i === 3) renderJuicio();
    if (i === 4) renderNatcho();
    history.pushState({ sub: i }, '');
    show('s' + i, 'fwd');
  }
  $$('[data-back]').forEach(function (b) { b.addEventListener('click', goHome); });

  // swipe estilo iPhone (desde el borde izquierdo)
  var app = $('#app'), sx = null, sy = 0;
  app.addEventListener('pointerdown', function (e) {
    var r = app.getBoundingClientRect(); sx = (e.clientX - r.left) < 32 ? e.clientX : null; sy = e.clientY;
  });
  app.addEventListener('pointerup', function (e) {
    if (sx !== null && isSub() && e.clientX - sx > 70 && Math.abs(e.clientY - sy) < 70) goHome();
    sx = null;
  });

  /* ---------- ubicación (primer clic = chiste) ---------- */
  $('.map-first').addEventListener('click', function (e) {
    if (!st.ubiTried) { e.preventDefault(); $('#m1').classList.add('on'); }
  });
  function ubiDone() { st.ubiTried = true; save(); }
  $('#m1ok').addEventListener('click', function () { ubiDone(); $('#m1').classList.remove('on'); });
  $('#m1no').addEventListener('click', function () { ubiDone(); $('#m1').classList.remove('on'); $('#m2').classList.add('on'); });
  $('#m2ok').addEventListener('click', function () { $('#m2').classList.remove('on'); });

  /* ---------- juicio ---------- */
  var busy = false;
  function renderJuicio() {
    var a = guest.rsvp;
    $('#j-choose').hidden = !!a;
    $('#j-done').hidden = !a;
    $('#j-yes').hidden = a !== 'yes';
    $('#j-no').hidden = a !== 'no';
    $('#p1Wrap').hidden = !(a === 'yes' && guest.plus_one);
    $('#p1').value = guest.plus_one_name || '';
    $$('.rsvp-btn').forEach(function (b) { b.disabled = false; });
  }
  $$('.rsvp-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      if (busy) return; busy = true;
      $$('.rsvp-btn').forEach(function (x) { x.disabled = true; });
      NBAPI.setRsvp(NAME, b.dataset.v).then(function (g) {
        guest = Object.assign(guest, g, { name: guest.name });
        st.done[3] = true; save(); renderGuest(); renderJuicio();
      }).catch(function () {
        toast('No pude guardar tu respuesta. Probá de nuevo.');
        $$('.rsvp-btn').forEach(function (x) { x.disabled = false; });
      }).then(function () { busy = false; });
    });
  });
  $('#p1Save').addEventListener('click', function () {
    var v = $('#p1').value.trim().slice(0, 60);
    NBAPI.setPlusName(NAME, v).then(function () { guest.plus_one_name = v; toast('¡Anotado!'); })
      .catch(function () { toast('No se pudo guardar. Probá de nuevo.'); });
  });

  /* ---------- natcho ---------- */
  function renderNatcho() {
    var going = guest.rsvp === 'yes';
    $$('.role-btn').forEach(function (b) { b.disabled = !going; });
    $('#natNote').hidden = going;
  }
  function pickRole(r) {
    if (busy) return; busy = true;
    NBAPI.setRole(NAME, r).then(function (g) {
      guest = Object.assign(guest, g, { name: guest.name });
      st.done[4] = true; st.finished = true; save();
      renderFinal(); show('final', 'fwd');
    }).catch(function () { toast('No pude guardar tu respuesta. Probá de nuevo.'); })
      .then(function () { busy = false; });
  }
  $$('.role-btn').forEach(function (b) { b.addEventListener('click', function () { pickRole(b.dataset.r); }); });
  $('#roleNone').addEventListener('click', function () { pickRole('none'); });

  /* ---------- final ---------- */
  function renderFinal() { document.documentElement.dataset.rsvp = guest.rsvp || 'yes'; }

  /* ---------- toast ---------- */
  var tt;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('on'); }, 2400);
  }

  // precarga de imágenes
  window.addEventListener('load', function () {
    ['natibank-green.png', 'natchis.png', 'natuti.png', 'natcho.png', 'missing-cat.webp', 'me-and-bro.webp', 'lobo.webp', 'cat-black.webp', 'cat-pizza.gif', 'cat-beer.webp', 'cat-cocktails.webp', 'cat-glitter.webp', 'cat-tattoo.webp', 'nati-barbie.webp', 'meme-batidora.webp', 'kid-dog.webp', 'natiblack.png']
      .forEach(function (f) { (new Image()).src = 'assets/' + f; });
  });
})();
