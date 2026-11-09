(function () {
  'use strict';
  var C = window.NB_CONFIG || {};
  var remote = !!(C.supabaseUrl && C.supabaseKey);

  function rpc(fn, args) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, 12000);
    return fetch(C.supabaseUrl + '/rest/v1/rpc/' + fn, {
      method: 'POST', signal: ctl.signal,
      headers: { apikey: C.supabaseKey, Authorization: 'Bearer ' + C.supabaseKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    }).then(function (r) {
      clearTimeout(t);
      return r.text().then(function (txt) {
        if (!r.ok) throw new Error(txt || r.status);
        return txt ? JSON.parse(txt) : null;
      });
    });
  }

  // ---- modo local (preview) ----
  var LK = 'nb_local_guests_v1';
  function lget() { try { return JSON.parse(localStorage.getItem(LK)) || {}; } catch (e) { return {}; } }
  function lset(o) { try { localStorage.setItem(LK, JSON.stringify(o)); } catch (e) {} }
  function blank(name, plus) { return { name: name, plus_one: !!plus, rsvp: null, plus_one_name: '', role: null, responded_at: null }; }
  function lupsert(name, patch, plusDefault) {
    var all = lget(), k = name.toLowerCase();
    var g = all[k] || blank(name, plusDefault);
    Object.keys(patch || {}).forEach(function (p) { g[p] = patch[p]; });
    all[k] = g; lset(all); return g;
  }
  var qs = new URLSearchParams(location.search);
  var localPlus = qs.get('p') === '1';

  var API = {
    remote: remote,
    getGuest: function (name) {
      if (remote) return rpc('nb_get', { p_name: name }).then(function (g) { return g || blank(name, false); });
      var g = lget()[name.toLowerCase()];
      return Promise.resolve(g || blank(name, localPlus));
    },
    setRsvp: function (name, v) {
      if (remote) return rpc('nb_rsvp', { p_name: name, p_status: v });
      return Promise.resolve(lupsert(name, { rsvp: v, responded_at: new Date().toISOString() }, localPlus));
    },
    setPlusName: function (name, txt) {
      if (remote) return rpc('nb_plus_name', { p_name: name, p_text: txt });
      return Promise.resolve(lupsert(name, { plus_one_name: txt }, localPlus));
    },
    setRole: function (name, role) {
      if (remote) return rpc('nb_role', { p_name: name, p_role: role });
      return Promise.resolve(lupsert(name, { role: role }, localPlus));
    },
    // ---- admin ----
    adminList: function (pass) {
      if (remote) return rpc('nb_admin_list', { p_pass: pass });
      var all = lget(); return Promise.resolve(Object.keys(all).map(function (k) { return all[k]; }));
    },
    adminUpsert: function (pass, name, plus) {
      if (remote) return rpc('nb_admin_upsert', { p_pass: pass, p_name: name, p_plus: !!plus });
      return Promise.resolve(lupsert(name, { plus_one: !!plus }, !!plus));
    },
    adminDelete: function (pass, name) {
      if (remote) return rpc('nb_admin_delete', { p_pass: pass, p_name: name });
      var all = lget(); delete all[name.toLowerCase()]; lset(all); return Promise.resolve(true);
    }
  };
  window.NBAPI = API;
})();
