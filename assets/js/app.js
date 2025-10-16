// Talent Sénégal - JS interactions
(function(){
  const $ = (s, el=document) => el.querySelector(s);
  const $$ = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Year
  const y = new Date().getFullYear();
  const yearEl = $('#year'); if (yearEl) yearEl.textContent = y;

  // Mobile menu
  const navToggle = $('.nav-toggle');
  const nav = $('.site-nav');
  if (navToggle && nav){
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('nav-open', open);
    });
    // close on link click (mobile)
    $$('.site-nav a').forEach(a=>a.addEventListener('click', ()=>{
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded','false');
      document.body.classList.remove('nav-open');
    }));
  }

  // Route guards: require login for protected pages
  (function guards(){
    const currentUser = localStorage.getItem('currentUser');
    const page = location.pathname.split('/').pop().toLowerCase();
    const protectedPages = ['profile.html','dashboard.html','messages.html'];
    if (!currentUser && protectedPages.includes(page)){
      location.replace('auth.html');
      return;
    }
  })();

  // Smooth reveal with IntersectionObserver
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting){
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    })
  }, {threshold: 0.2});
  $$('.reveal').forEach(el=>io.observe(el));

  // Tabs (auth)
  const tabs = $$('.tab');
  if (tabs.length){
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const target = t.getAttribute('data-tab');
      $$('.form').forEach(f => f.classList.toggle('active', f.id.toLowerCase().includes(target)));
    }))
  }

  // Toast
  function toast(msg){
    const t = $('#toast'); if(!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._to);
    t._to = setTimeout(()=> t.classList.remove('show'), 2200);
  }

  // Helpers
  function showError(input, msg){
    input.classList.add('error');
    const small = input.parentElement.querySelector('.error-msg');
    if (small) small.textContent = msg || '';
  }
  function clearError(input){
    input.classList.remove('error');
    const small = input.parentElement.querySelector('.error-msg');
    if (small) small.textContent = '';
  }
  function validateEmail(v){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  // Auth forms
  const loginForm = $('#loginForm');
  if (loginForm){
    loginForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const email = $('#loginEmail');
      const pass = $('#loginPassword');
      const roleSel = document.querySelector('input[name="role"]:checked');
      [email, pass].forEach(clearError);
      let ok = true;
      if (!email.value || !validateEmail(email.value)){ showError(email, 'Email invalide'); ok=false; }
      if (!pass.value || pass.value.length < 6){ showError(pass, '6 caractères minimum'); ok=false; }
      if (ok){
        const users = JSON.parse(localStorage.getItem('users')||'{}');
        const key = (email.value||'').toLowerCase();
        const storedRole = users[key];
        const chosenRole = roleSel?.value;
        if (!storedRole){ toast('Compte introuvable. Veuillez vous inscrire.'); return; }
        if (chosenRole && storedRole !== chosenRole){ toast('Rôle incorrect pour ce compte.'); return; }
        localStorage.setItem('role', storedRole);
        localStorage.setItem('currentUser', key);
        // Clear any stale global CV cache to avoid leakage across users
        localStorage.removeItem('cvDataUrl');
        localStorage.removeItem('cvName');
        toast('Connexion réussie ✅'); setTimeout(()=> location.href='dashboard.html', 900);
      }
    })
  }
  const registerForm = $('#registerForm');
  if (registerForm){
    // Toggle company field visibility by role
    const regCompanyField = document.getElementById('regCompanyField');
    const regOngField = document.getElementById('regOngField');
    const regUnivField = document.getElementById('regUnivField');
    const regUniversity = document.getElementById('regUniversity');

    // Allowed lists (can be overridden by localStorage.allowedOrgs)
    const defaultsAllow = {
      universities: [
        'UCAD – Université Cheikh Anta Diop',
        'ESP – École Supérieure Polytechnique',
        'ISI – Institut Supérieur d’Informatique',
        'Sup’Info Dakar',
        'UCAO – Université Catholique de l’Afrique del’Ouest',
        'ISM – Institut Supérieur de Management'
      ],
      entreprises: [],
      ongs: []
    };
    const storedAllow = JSON.parse(localStorage.getItem('allowedOrgs')||'null');
    const allow = storedAllow && typeof storedAllow==='object' ? storedAllow : defaultsAllow;

    // Populate university select
    const populateUniversities = ()=>{
      if (!regUniversity) return;
      regUniversity.innerHTML = '';
      const makeOpt = (v,t)=>{ const o=document.createElement('option'); o.value=v; o.textContent=t||v; return o; };
      regUniversity.appendChild(makeOpt('', 'Sélectionner votre établissement'));
      (allow.universities||[]).forEach(u=> regUniversity.appendChild(makeOpt(u,u)));
    };
    populateUniversities();
    const updateCompanyVis = ()=>{
      const r = registerForm.querySelector('input[name="role"]:checked')?.value;
      if (regCompanyField) regCompanyField.style.display = (r === 'entreprise') ? '' : 'none';
      if (regOngField) regOngField.style.display = (r === 'ong') ? '' : 'none';
      if (regUnivField) regUnivField.style.display = (r === 'etudiant') ? '' : 'none';
    };
    registerForm.querySelectorAll('input[name="role"]').forEach(r=> r.addEventListener('change', updateCompanyVis));
    updateCompanyVis();

    registerForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = $('#regName');
      const email = $('#regEmail');
      const pass = $('#regPassword');
      const roleSel = registerForm.querySelector('input[name="role"]:checked');
      ;[name,email,pass].forEach(clearError);
      let ok = true;
      if (!name.value.trim()){ showError(name, 'Nom requis'); ok=false; }
      if (!email.value || !validateEmail(email.value)){ showError(email, 'Email invalide'); ok=false; }
      if (!pass.value || !pass.value.length || pass.value.length < 6){ showError(pass, '6 caractères minimum'); ok=false; }
      if (ok){
        const users = JSON.parse(localStorage.getItem('users')||'{}');
        const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
        const key = (email.value||'').toLowerCase();
        const r = roleSel?.value || 'etudiant';
        // If entreprise, require company name
        let companyVal = '';
        if (r === 'entreprise'){
          const regCompanyEl = document.getElementById('regCompany');
          companyVal = (regCompanyEl?.value||'').trim();
          if (!companyVal){
            companyVal = (prompt('Nom de l’Entreprise')||'').trim();
          }
          if (!companyVal){
            if (regCompanyEl) showError(regCompanyEl, 'Nom de l’entreprise requis');
            toast('Nom de l’entreprise requis');
            return;
          }
          // Optional: enforce entreprise allowlist if provided
          if ((allow.entreprises||[]).length && !allow.entreprises.includes(companyVal)){
            toast('Entreprise non autorisée à s’inscrire');
            return;
          }
        }
        // If ONG, require ONG name
        let ongVal = '';
        if (r === 'ong'){
          const regOngEl = document.getElementById('regOng');
          ongVal = (regOngEl?.value||'').trim();
          if (!ongVal){
            ongVal = (prompt('Nom de l’ONG')||'').trim();
          }
          if (!ongVal){
            if (regOngEl) showError(regOngEl, 'Nom de l’ONG requis');
            toast('Nom de l’ONG requis');
            return;
          }
          if ((allow.ongs||[]).length && !allow.ongs.includes(ongVal)){
            toast('ONG non autorisée à s’inscrire');
            return;
          }
        }
        // If student, require allowed university selection
        let schoolVal = '';
        if (r === 'etudiant'){
          schoolVal = (regUniversity?.value||'').trim();
          if (!schoolVal){
            toast('Veuillez sélectionner votre université/école');
            return;
          }
          if ((allow.universities||[]).length && !allow.universities.includes(schoolVal)){
            toast('Établissement non autorisé à s’inscrire');
            return;
          }
        }
        users[key] = r;
        localStorage.setItem('users', JSON.stringify(users));
        usersMeta[key] = {
          name: name.value.trim(),
          ...(r==='entreprise'? { company: companyVal } : {}),
          ...(r==='ong'? { ongName: ongVal } : {}),
          ...(r==='etudiant'? { school: schoolVal } : {})
        };
        localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
        localStorage.setItem('role', r);
        localStorage.setItem('currentUser', key);
        toast('Compte créé 🎉'); setTimeout(()=> location.href='dashboard.html', 900);
      }
    })
  }

  // Offers filtering
  const filters = $('#filters');
  const offerList = $('#offerList');
  if (filters && offerList){
    const apply = () => {
      const q = (filters.q.value || '').toLowerCase();
      const sk = (filters.skill.value || '').toLowerCase();
      const se = (filters.sector.value || '').toLowerCase();
      const lo = (filters.location.value || '').toLowerCase();
      $$('.offer-card', offerList).forEach(card=>{
        const text = card.textContent.toLowerCase();
        const mQ = !q || text.includes(q);
        const mS = !sk || (card.dataset.skill||'').toLowerCase().includes(sk);
        const mSe = !se || (card.dataset.sector||'').toLowerCase().includes(se);
        const mL = !lo || (card.dataset.location||'').toLowerCase().includes(lo);
        card.style.display = (mQ && mS && mSe && mL) ? '' : 'none';
      })
    };
    filters.addEventListener('input', apply);
    filters.addEventListener('change', apply);
    filters.addEventListener('reset', ()=> setTimeout(()=>{ filters.reset(); apply(); }, 0));
    apply();
  }
  // Prefill offers filter from URL (?q=...)
  if (filters){
    const qParam = new URLSearchParams(location.search).get('q');
    if (qParam){ filters.q.value = qParam; filters.dispatchEvent(new Event('input')); }
  }

  // Role helpers
  const getRole = () => localStorage.getItem('role') || 'etudiant';

  // Dashboard role-specific panels
  const cvPanel = document.getElementById('cvPanel');
  const postOfferPanel = document.getElementById('postOfferPanel');
  const role = getRole();
  const currentUser = localStorage.getItem('currentUser');
  // Personalize UI (nav, body classes, hero CTA)
  (function personalize(){
    if (currentUser){
      document.body.classList.add('logged-in');
      document.body.setAttribute('data-role', role);
    }
    const navList = document.querySelector('.site-nav ul');
    if (navList){
      // Remove Join/Auth button if logged-in
      if (currentUser){
        navList.querySelectorAll('a[href$="auth.html"], a[href$="login.html"]').forEach(a=> a.closest('li')?.remove());
        // Add user pill + logout if not present
        if (!document.getElementById('logoutBtn')){
          const liLogout = document.createElement('li');
          liLogout.innerHTML = `<button id="logoutBtn" class="btn btn-ghost">Déconnexion</button>`;
          navList.appendChild(liLogout);
        }
        // Inject user chip with avatar + name
        if (currentUser){
          const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
          const meta = usersMeta[currentUser]||{};
          let chip = document.getElementById('navUserChip');
          if (!chip){
            chip = document.createElement('li'); chip.id = 'navUserChip';
            const logoutLi = document.getElementById('logoutBtn')?.closest('li');
            if (logoutLi){ navList.insertBefore(chip, logoutLi); }
            else { navList.appendChild(chip); }
          }
          const displayName = meta.name || (currentUser.split('@')[0]||'Utilisateur');
          const avatarSrc = meta.avatar || '';
          const initial = (displayName||'U').charAt(0).toUpperCase();
          chip.innerHTML = `<a class="nav-user" href="profile.html" title="Voir mon profil">
              ${avatarSrc? `<img class="nav-avatar" src="${avatarSrc}" alt="avatar"/>` : `<span class="nav-avatar placeholder">${initial}</span>`}
              <span class="nav-username">${displayName}</span>
            </a>`;
        }
      } else {
        // Not logged in: hide links to protected pages
        navList.querySelectorAll('a[href$="profile.html"], a[href$="dashboard.html"], a[href$="messages.html"]').forEach(a=>{
          a.closest('li')?.remove();
        });
      }
    }
    // Hero actions tweak
    if (currentUser){
      const hero = document.querySelector('.hero .actions');
      if (hero){
        const primary = hero.querySelector('.btn-primary');
        if (primary){ primary.textContent = 'Aller au tableau de bord'; primary.setAttribute('href','dashboard.html'); }
        const secondary = hero.querySelector('.btn-ghost');
        if (secondary){
          if (role === 'etudiant'){
            secondary.textContent = 'Voir les offres';
            secondary.setAttribute('href','offers.html');
          } else {
            secondary.textContent = 'Publier une offre';
            secondary.setAttribute('href','dashboard.html');
          }
        }
      }
      // Dashboard greeting name
      const dashNameEl = document.getElementById('dashName');
      if (dashNameEl){
        const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
        const meta = usersMeta[currentUser]||{};
        dashNameEl.textContent = meta.name || (currentUser.split('@')[0]||'Utilisateur');
      }
    }
  })();

  // Dashboard: persist profile meta (avatar + fields)
  (function persistDashboardMeta(){
    const form = document.getElementById('profileMetaForm');
    const avatarInput = document.getElementById('pmAvatar');
    if (avatarInput){
      avatarInput.addEventListener('change', ()=>{
        const file = avatarInput.files?.[0]; if (!file) return;
        if (!currentUser){ toast('Veuillez vous connecter'); return; }
        const reader = new FileReader();
        reader.onload = ()=>{
          const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
          usersMeta[currentUser] = { ...(usersMeta[currentUser]||{}), avatar: reader.result };
          localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
          toast('Photo de profil enregistrée ✅');
        };
        reader.readAsDataURL(file);
      });
    }
    if (form){
      form.addEventListener('submit', (e)=>{
        e.preventDefault();
        if (!currentUser){ toast('Veuillez vous connecter'); return; }
        const fd = new FormData(form);
        const data = Object.fromEntries(fd.entries());
        const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
        usersMeta[currentUser] = { ...(usersMeta[currentUser]||{}), ...data };
        localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
        toast('Profil mis à jour ✅');
      });
    }
  })();

  // Profile page: render published offers for entreprise/coach/ong
  (function renderProfileOffers(){
    const listEl = document.getElementById('profileOffersList');
    if (!listEl) return;
    // decide owner: use ?user= if present; otherwise currentUser
    const qp = new URLSearchParams(location.search);
    const viewUser = qp.get('user') || currentUser;
    const users = JSON.parse(localStorage.getItem('users')||'{}');
    const vRole = users[viewUser] || role;
    if (!(vRole==='entreprise' || vRole==='coach' || vRole==='ong')) return;
    const offers = JSON.parse(localStorage.getItem('offersCustom')||'[]')
      .filter(o => o.owner === viewUser);
    listEl.innerHTML = '';
    if (!offers.length){
      listEl.innerHTML = '<li class="offer-item"><div><p class="muted">Aucune offre publiée pour le moment.</p></div></li>';
      return;
    }
    offers.forEach(o=>{
      const li = document.createElement('li'); li.className='offer-item';
      li.innerHTML = `<div>
          <h3>${o.title}</h3>
          <p>${o.company} • ${o.sector||''} • ${o.location||''}</p>
        </div>
        <div style="display:flex; gap:8px; align-items:center">
          <span class="tag">${o.type||'Offre'}</span>
          <button class="btn btn-ghost" data-offer-applicants data-title="${o.title.replace(/"/g,'&quot;')}">Voir qui a postulé</button>
        </div>`;
      listEl.appendChild(li);
    });
    // Hook modal
    const modal = document.getElementById('offerApplicantsModal');
    const list = document.getElementById('offerApplicantsList');
    const titleEl = document.getElementById('offerApplicantsTitle');
    listEl.addEventListener('click', (e)=>{
      const btn = e.target.closest('[data-offer-applicants]'); if(!btn) return;
      const title = btn.getAttribute('data-title');
      const apps = JSON.parse(localStorage.getItem('applications')||'[]');
      const filtered = apps.filter(a=> a.title===title && a.toOwner===viewUser);
      titleEl.textContent = `Candidats – ${title}`;
      list.innerHTML = '';
      if (!filtered.length){ list.innerHTML = '<li class="offer-item"><div><p class="muted">Aucun candidat.</p></div></li>'; }
      filtered.forEach(a=>{
        const li = document.createElement('li'); li.className='offer-item';
        const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
        const m = usersMeta[a.user]||{};
        const st = a.status==='accepted'? 'Acceptée' : a.status==='refused'? 'Refusée' : a.status==='interview'? `Entretien: ${new Date(a.interview||'').toLocaleString('fr-FR')}` : 'En attente';
        li.innerHTML = `<div><h3>${m.name||a.user}</h3><p>${new Date(a.date).toLocaleString('fr-FR')} • ${st}</p></div>
          <div style="display:flex; gap:8px">
            <a class="btn btn-ghost" href="profile.html?user=${encodeURIComponent(a.user)}">Voir profil</a>
            ${a.cvUrl? '<a class="btn btn-ghost" target="_blank" href="'+a.cvUrl+'">CV</a>':''}
            <button class="btn btn-ghost" data-view-letter>Lettre</button>
          </div>`;
        li.querySelector('[data-view-letter]')?.addEventListener('click', ()=> alert(a.text));
        list.appendChild(li);
      });
      if (modal) modal.style.display='block';
    });
    if (modal){
      modal.addEventListener('click', (e)=>{ if (e.target===modal){ modal.style.display='none'; list.innerHTML=''; }});
      modal.querySelectorAll('[data-close]').forEach(c=> c.addEventListener('click', ()=>{ modal.style.display='none'; list.innerHTML=''; }));
    }
  })();

  // Profile page: edit modal (in-place editing)
  (function profileEdit(){
    const editBtns = [
      document.getElementById('editProfileBtn'),
      document.getElementById('editProfileBtn2'),
      document.getElementById('editProfileBtn3'),
      document.getElementById('editProfileBtn4')
    ].filter(Boolean);
    const modal = document.getElementById('profileEditModal');
    const form = document.getElementById('profileEditForm');
    if (!modal || !form || !editBtns.length) return;
    const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
    const m = usersMeta[currentUser] || {};
    const showRoleFields = (root)=>{
      root.querySelectorAll('[data-roles]').forEach(el=>{
        const roles = (el.getAttribute('data-roles')||'').split(',').map(s=>s.trim());
        el.style.display = roles.includes(role)? '' : 'none';
      });
    };
    const prefill = ()=>{
      showRoleFields(form);
      ['peCity','peSchool','peDiploma','peCompany','peSector','peOrganization','peSpecialty','peOng','peDomain','peFormations','peCerts','pePortfolio','peSkills',
       'peCompanyDesc','peAddress','peContactName','peContactEmail','peContactPhone','peWebsite','peNinea','peRccm','peCompanySize',
       'peOngDesc','peAddressOng','peOngContactName','peOngContactEmail','peOngContactPhone','peOngWebsite']
      .forEach(id=>{
        const el = document.getElementById(id); if (el){ const key = el.name; el.value = m[key]||''; }
      });
    };
    const open = ()=>{ prefill(); modal.style.display='block'; };
    const close = ()=>{ modal.style.display='none'; };
    editBtns.forEach(b=> b.addEventListener('click', (e)=>{ e.preventDefault(); if (!currentUser){ toast('Veuillez vous connecter'); return; } open(); }));
    modal.addEventListener('click', (e)=>{ if (e.target===modal) close(); });
    modal.querySelectorAll('[data-close]').forEach(c=> c.addEventListener('click', close));
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (!currentUser){ toast('Veuillez vous connecter'); return; }
      const fd = new FormData(form);
      const data = Object.fromEntries(fd.entries());
      const merged = { ...(usersMeta[currentUser]||{}), ...data };
      const avatarFile = document.getElementById('peAvatar')?.files?.[0];
      const finalize = ()=>{
        usersMeta[currentUser] = merged;
        localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
        toast('Profil mis à jour ✅');
        close();
        // Rehydrate immediately
        (function(){
          const usersMeta2 = JSON.parse(localStorage.getItem('usersMeta')||'{}');
          const m2 = usersMeta2[currentUser] || {};
          if (role === 'etudiant'){
            const header = document.querySelector('section.profile-header[data-roles="etudiant"]');
            if (header){
              const p = header.querySelector('p');
              const diploma = m2.diploma || 'Diplôme'; const city = m2.city || 'Ville';
              if (p) p.textContent = `${diploma} • ${city}`;
              if (m2.avatar){ const img = header.querySelector('img'); if (img) img.src = m2.avatar; }
              const h1 = header.querySelector('h1'); if (m2.name && h1) h1.textContent = m2.name;
            }
            // Details lists
            const listForm = document.getElementById('studentFormations');
            if (listForm){
              listForm.innerHTML = '';
              const lines = (m2.formations||'').split('\n').map(s=>s.trim()).filter(Boolean);
              lines.forEach(line=>{
                const [time, rest] = line.split('|').map(s=>s.trim());
                const [title, estab] = (rest||'').split('–').map(s=>s.trim());
                const li = document.createElement('li');
                li.innerHTML = `<div class="time">${time||''}</div><div class="desc"><h3>${title||rest||''}</h3><p>${estab||''}</p></div>`;
                listForm.appendChild(li);
              });
            }
            const chips = document.getElementById('studentCerts');
            if (chips){
              chips.innerHTML = '';
              const certs = (m2.certs||'').split(',').map(s=>s.trim()).filter(Boolean);
              certs.forEach(c=>{ const li=document.createElement('li'); li.textContent=c; chips.appendChild(li); });
            }
            const portfolio = document.getElementById('studentPortfolio');
            if (portfolio){
              portfolio.innerHTML = '';
              if (m2.portfolio){
                const li = document.createElement('li'); li.className='offer-item';
                li.innerHTML = `<div><h3>Portfolio</h3><p>${m2.portfolio}</p></div><a class="btn btn-primary" target="_blank" href="${m2.portfolio}">Ouvrir</a>`;
                portfolio.appendChild(li);
              }
            }
            const cvSlot = document.getElementById('studentCvSlot');
            if (cvSlot){
              const cvUrl = m2.cvUrl; const cvName = m2.cvName;
              cvSlot.innerHTML = cvUrl ? `<a class="btn btn-ghost" target="_blank" href="${cvUrl}">${cvName||'Voir mon CV'}</a>` : '<p class="muted">Aucun CV en ligne.</p>';
            }
            const headSkills = document.getElementById('studentSkills');
            if (headSkills){
              headSkills.innerHTML = '';
              const skills = (m2.skills||'').split(',').map(s=>s.trim()).filter(Boolean);
              skills.forEach(s=>{ const span=document.createElement('span'); span.className='tag'; span.textContent=s; headSkills.appendChild(span); });
            }
          } else if (role === 'entreprise'){
            const header = document.querySelector('section.profile-header[data-roles="entreprise"]');
            if (header){
              const h1 = header.querySelector('h1'); if (m2.company) h1.textContent = m2.company;
              const p = header.querySelector('p');
              const sector = m2.sector || 'Secteur'; const city = m2.city || 'Ville';
              if (p) p.textContent = `Entreprise • ${sector} • ${city}`;
              if (m2.avatar){ const img = header.querySelector('img'); if (img) img.src = m2.avatar; }
            }
          } else if (role === 'coach'){
            const header = document.querySelector('section.profile-header[data-roles="coach"]');
            if (header){
              const p = header.querySelector('p');
              const org = m2.organization || 'Organisation'; const city = m2.city || 'Ville';
              if (p) p.textContent = `${org} • ${city}`;
              if (m2.avatar){ const img = header.querySelector('img'); if (img) img.src = m2.avatar; }
            }
          } else if (role === 'ong'){
            const header = document.querySelector('section.profile-header[data-roles="ong"]');
            if (header){
              const h1 = header.querySelector('h1'); if (m2.ongName) h1.textContent = m2.ongName;
              const p = header.querySelector('p');
              const domain = m2.domain || 'Domaine'; const city = m2.city || 'Ville';
              if (p) p.textContent = `ONG • ${domain} • ${city}`;
              if (m2.avatar){ const img = header.querySelector('img'); if (img) img.src = m2.avatar; }
            }
          }
        })();
      };
      if (avatarFile){
        const reader = new FileReader();
        reader.onload = ()=>{ merged.avatar = reader.result; finalize(); };
        reader.readAsDataURL(avatarFile);
      } else {
        finalize();
      }
    });
  })();

  // Logout handler
  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('#logoutBtn');
    if (!btn) return;
    e.preventDefault();
    // Only clear session keys
    localStorage.removeItem('currentUser');
    // Keep users and usersMeta for demo accounts; keep role? remove to avoid leakage
    localStorage.removeItem('role');
    toast('Déconnecté');
    setTimeout(()=> location.href='index.html', 600);
  });
  function requireAuth(){
    if (!currentUser){ toast('Veuillez vous connecter pour continuer'); setTimeout(()=> location.href='login.html', 600); return false; }
    return true;
  }
  // Protect dashboard sections
  if ((cvPanel || postOfferPanel) && !currentUser){
    toast('Veuillez vous connecter pour accéder au tableau de bord');
    setTimeout(()=> location.href='login.html', 700);
  }
  if (cvPanel || postOfferPanel){
    if (role === 'etudiant'){
      if (cvPanel) cvPanel.style.display = '';
      if (postOfferPanel) postOfferPanel.style.display = 'none';
      // CV logic
      const cvStatus = cvPanel.querySelector('.cv-status');
      const cvLink = cvPanel.querySelector('.cv-link');
      const cvForm = cvPanel.querySelector('#cvForm');
      const existingUrl = localStorage.getItem('cvDataUrl');
      const existingName = localStorage.getItem('cvName');
      if (existingUrl && cvLink){
        cvLink.href = existingUrl; cvLink.textContent = existingName || 'Mon CV';
        if (cvStatus) cvStatus.textContent = 'CV en ligne';
      }
      if (cvForm){
        cvForm.addEventListener('submit', (e)=>{
          e.preventDefault();
          if (!requireAuth()) return;
          const file = document.getElementById('cvFile')?.files?.[0];
          const urlInput = document.getElementById('cvUrl');
          if (urlInput && urlInput.value){
            localStorage.setItem('cvDataUrl', urlInput.value);
            localStorage.setItem('cvName', 'CV en ligne');
            // persist per user for visibility by others
            const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
            usersMeta[currentUser] = { ...(usersMeta[currentUser]||{}), cvUrl: urlInput.value, cvName: 'CV en ligne' };
            localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
            toast('CV ajouté via lien ✅');
            setTimeout(()=>location.reload(), 500);
            return;
          }
          if (!file){ toast('Veuillez choisir un fichier ou coller un lien'); return; }
          const reader = new FileReader();
          reader.onload = () => {
            localStorage.setItem('cvDataUrl', reader.result);
            localStorage.setItem('cvName', file.name);
            const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
            usersMeta[currentUser] = { ...(usersMeta[currentUser]||{}), cvUrl: reader.result, cvName: file.name };
            localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
            toast('CV mis en ligne ✅');
            setTimeout(()=>location.reload(), 500);
          };
          reader.readAsDataURL(file);
        });
      }
    } else {
      if (cvPanel) cvPanel.style.display = 'none';
      if (postOfferPanel) postOfferPanel.style.display = '';
      // Adjust title per role
      const titleEl = postOfferPanel.querySelector('h2');
      if (titleEl && role === 'ong') titleEl.textContent = 'Publier une mission';
      // Post offer logic
      const form = document.getElementById('postOfferForm');
      form?.addEventListener('submit', (e)=>{
        e.preventDefault();
        if (!requireAuth()) return;
        const f = form;
        const offer = {
          title: f.title.value.trim(),
          company: f.company.value.trim(),
          location: f.location.value.trim(),
          type: f.type.value,
          skill: f.skill.value.trim(),
          sector: f.sector.value,
          description: f.description.value.trim(),
          owner: currentUser
        };
        if (!offer.title || !offer.company){ toast('Veuillez compléter le titre et l\'entreprise'); return; }
        const list = JSON.parse(localStorage.getItem('offersCustom')||'[]');
        list.push(offer);
        localStorage.setItem('offersCustom', JSON.stringify(list));
        toast('Offre publiée ✅');
        form.reset();
      });
    }
  }

  // Profile: show content blocks per role using [data-roles]
  const roleBlocks = $$('[data-roles]');
  if (roleBlocks.length){
    roleBlocks.forEach(b=>{
      const roles = (b.getAttribute('data-roles')||'').split(',').map(s=>s.trim());
      b.style.display = roles.includes(role) ? '' : 'none';
    });
  }

  // Profile meta form (dashboard): preload and save
  const profileMetaForm = document.getElementById('profileMetaForm');
  if (profileMetaForm && currentUser){
    const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
    const m = usersMeta[currentUser] || {};
    // Prefill
    ['pmCity','pmSchool','pmDiploma','pmCompany','pmSector','pmOrganization','pmSpecialty','pmOng','pmDomain'].forEach(id=>{
      const el = document.getElementById(id); if (el && m){ const key = el.name; if (m[key]) el.value = m[key]; }
    });
    // Save
    profileMetaForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const fd = new FormData(profileMetaForm);
      const data = Object.fromEntries(fd.entries());
      const merged = { ...(usersMeta[currentUser]||{}), ...data };
      const avatarFile = document.getElementById('pmAvatar')?.files?.[0];
      if (avatarFile){
        const reader = new FileReader();
        reader.onload = ()=>{
          merged.avatar = reader.result;
          usersMeta[currentUser] = merged; localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
          toast('Profil mis à jour ✅');
        };
        reader.readAsDataURL(avatarFile);
      } else {
        usersMeta[currentUser] = merged; localStorage.setItem('usersMeta', JSON.stringify(usersMeta));
        toast('Profil mis à jour ✅');
      }
    });
  }

  // Hydrate profile page from meta (supports ?user= viewing)
  (function hydrateProfile(){
    const onProfile = document.body?.classList?.contains('profile-page') || document.querySelector('.profile-page');
    if (!onProfile) return;
    const qp = new URLSearchParams(location.search);
    const viewUser = qp.get('user') || currentUser;
    const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
    const users = JSON.parse(localStorage.getItem('users')||'{}');
    const vRole = users[viewUser] || role;
    const m = usersMeta[viewUser] || {};
    // Ensure profile sections visibility follows viewed user's role
    const profileRoot = document.querySelector('.profile-page') || document;
    profileRoot.querySelectorAll('[data-roles]')?.forEach(el=>{
      const roles = (el.getAttribute('data-roles')||'').split(',').map(s=>s.trim());
      el.style.display = roles.includes(vRole) ? '' : 'none';
    });
    // Hide edit buttons if viewing someone else
    if (viewUser && currentUser && viewUser !== currentUser){
      document.querySelectorAll('#editProfileBtn, #editProfileBtn2, #editProfileBtn3, #editProfileBtn4').forEach(b=> b?.remove());
    }
    const setText = (sel, txt)=>{ const el = document.querySelector(sel); if (el && txt) el.textContent = txt; };
    if (vRole === 'etudiant'){
      const header = document.querySelector('section.profile-header[data-roles="etudiant"]');
      if (header){
        const h1 = header.querySelector('h1'); if (m.name) h1.textContent = m.name;
        const p = header.querySelector('p');
        const school = m.school || 'École';
        const diploma = m.diploma || 'Diplôme';
        const city = m.city || 'Ville';
        if (p) p.textContent = `${diploma} • ${city}`;
        if (m.avatar){ const img = header.querySelector('img'); if (img) img.src = m.avatar; }
      }
      // Hydrate student details for viewed profile
      const listForm = document.getElementById('studentFormations');
      if (listForm){
        listForm.innerHTML = '';
        const lines = (m.formations||'').split('\n').map(s=>s.trim()).filter(Boolean);
        lines.forEach(line=>{
          const [time, rest] = line.split('|').map(s=>s.trim());
          const [title, estab] = (rest||'').split('–').map(s=>s.trim());
          const li = document.createElement('li');
          li.innerHTML = `<div class="time">${time||''}</div><div class="desc"><h3>${title||rest||''}</h3><p>${estab||''}</p></div>`;
          listForm.appendChild(li);
        });
      }
      const headSkills2 = document.getElementById('studentSkills');
      if (headSkills2){
        headSkills2.innerHTML = '';
        const skills = (m.skills||'').split(',').map(s=>s.trim()).filter(Boolean);
        skills.forEach(s=>{ const span=document.createElement('span'); span.className='tag'; span.textContent=s; headSkills2.appendChild(span); });
      }
      const chips = document.getElementById('studentCerts');
      if (chips){
        chips.innerHTML = '';
        const certs = (m.certs||'').split(',').map(s=>s.trim()).filter(Boolean);
        certs.forEach(c=>{ const li=document.createElement('li'); li.textContent=c; chips.appendChild(li); });
      }
      const portfolio = document.getElementById('studentPortfolio');
      if (portfolio){
        portfolio.innerHTML = '';
        if (m.portfolio){
          const li = document.createElement('li'); li.className='offer-item';
          li.innerHTML = `<div><h3>Portfolio</h3><p>${m.portfolio}</p></div><a class="btn btn-primary" target="_blank" href="${m.portfolio}">Ouvrir</a>`;
          portfolio.appendChild(li);
        }
      }
      const cvSlot = document.getElementById('studentCvSlot');
      if (cvSlot){
        const cvUrl = m.cvUrl; const cvName = m.cvName;
        cvSlot.innerHTML = cvUrl ? `<a class="btn btn-ghost" target="_blank" href="${cvUrl}">${cvName||'Voir le CV'}</a>` : '<p class="muted">Aucun CV en ligne.</p>';
      }
    } else if (vRole === 'entreprise'){
      const header = document.querySelector('section.profile-header[data-roles="entreprise"]');
      if (header){
        const h1 = header.querySelector('h1'); if (m.company) h1.textContent = m.company;
        const p = header.querySelector('p');
        const sector = m.sector || 'Secteur'; const city = m.city || 'Ville';
        if (p) p.textContent = `Entreprise • ${sector} • ${city}`;
        if (m.avatar){ const img = header.querySelector('img'); if (img) img.src = m.avatar; }
      }
      // Details panels (blank by default if not provided)
      const setTxt = (id, val)=>{ const el = document.getElementById(id); if (!el) return; el.textContent = val || ''; };
      const setHref = (id, val)=>{ const el = document.getElementById(id); if (!el) return; if (val){ el.href = val; el.textContent = val; } else { el.removeAttribute('href'); el.textContent = ''; } };
      setTxt('entDesc', m.company_desc || m.description || '');
      setTxt('entAddress', m.address || '');
      setTxt('entCity', m.city || '');
      setTxt('entContact', m.contact_name && m.contact_email ? `${m.contact_name} – ${m.contact_email}${m.contact_phone? ' – '+m.contact_phone:''}` : (m.contact_email||''));
      setHref('entWebsite', m.website || '');
      setTxt('entNinea', m.ninea || '');
      setTxt('entRccm', m.rccm || '');
      setTxt('entSize', m.company_size || '');
      // Stats
      const offers = (JSON.parse(localStorage.getItem('offersCustom')||'[]')||[]).filter(o=> o.owner===viewUser);
      const apps = (JSON.parse(localStorage.getItem('applications')||'[]')||[]).filter(a=> a.toOwner===viewUser);
      const interviews = apps.filter(a=> a.status==='interview');
      setTxt('entStatOffers', offers.length);
      setTxt('entStatApps', apps.length);
      setTxt('entStatInterviews', interviews.length);
    } else if (vRole === 'coach'){
      const header = document.querySelector('section.profile-header[data-roles="coach"]');
      if (header){
        const p = header.querySelector('p');
        const org = m.organization || 'Organisation'; const city = m.city || 'Ville';
        if (p) p.textContent = `${org} • ${city}`;
        if (m.avatar){ const img = header.querySelector('img'); if (img) img.src = m.avatar; }
      }
    } else if (vRole === 'ong'){
      const header = document.querySelector('section.profile-header[data-roles="ong"]');
      if (header){
        const h1 = header.querySelector('h1'); if (m.ongName) h1.textContent = m.ongName;
        const p = header.querySelector('p');
        const domain = m.domain || 'Domaine'; const city = m.city || 'Ville';
        if (p) p.textContent = `ONG • ${domain} • ${city}`;
        if (m.avatar){ const img = header.querySelector('img'); if (img) img.src = m.avatar; }
      }
      // Details panels
      const setTxt = (id, val)=>{ const el = document.getElementById(id); if (el && val) el.textContent = val; };
      const setHref = (id, val)=>{ const el = document.getElementById(id); if (el && val){ el.href = val; el.textContent = val; } };
      setTxt('ongDesc', m.ong_desc || m.description || '');
      setTxt('ongAddress', m.address || '');
      const contact = m.contact_name && m.contact_email ? `${m.contact_name} – ${m.contact_email}${m.contact_phone? ' – '+m.contact_phone:''}` : (m.contact_email||'');
      setTxt('ongContact', contact);
      setHref('ongWebsite', m.website || '');
      // Projects and news if arrays/CSV
      const projEl = document.getElementById('ongProjects');
      if (projEl && m.projects){
        projEl.innerHTML = '';
        (Array.isArray(m.projects)? m.projects : String(m.projects).split(',')).map(s=>String(s).trim()).filter(Boolean).forEach(p=>{
          const li=document.createElement('li'); li.textContent=p; projEl.appendChild(li);
        });
      }
      const newsEl = document.getElementById('ongNews');
      if (newsEl && m.news){
        newsEl.innerHTML = '';
        (Array.isArray(m.news)? m.news : String(m.news).split('\n')).map(s=>String(s).trim()).filter(Boolean).forEach(n=>{
          const li=document.createElement('li'); li.className='offer-item'; li.innerHTML = `<div><h3>${n}</h3></div>`; newsEl.appendChild(li);
        });
      }
    }
  })();

  // Dashboard: render applications (student + received)
  (function renderApplications(){
    const apps = JSON.parse(localStorage.getItem('applications')||'[]');
    // Student view
    const myList = document.getElementById('myApplicationsList');
    if (myList && role==='etudiant'){
      myList.innerHTML = '';
      const mine = apps.filter(a=> a.user === currentUser).sort((a,b)=> b.date.localeCompare(a.date));
      if (!mine.length){ myList.innerHTML = '<li class="offer-item"><div><p class="muted">Aucune candidature pour le moment.</p></div></li>'; }
      mine.forEach(a=>{
        const li = document.createElement('li'); li.className='offer-item';
        const badge = a.status==='accepted'? '<span class="tag" style="margin-right:8px">Acceptée</span>' : a.status==='refused'? '<span class="tag red" style="margin-right:8px">Refusée</span>' : a.status==='interview'? `<span class="tag yellow" style="margin-right:8px">Entretien: ${new Date(a.interview||'').toLocaleString('fr-FR')}</span>` : '<span class="tag" style="margin-right:8px">En attente</span>';
        li.innerHTML = `<div><h3>${a.title}</h3><p>${new Date(a.date).toLocaleString('fr-FR')}</p></div>
          <div style="display:flex; gap:8px; align-items:center">
            ${badge}
            <button class="btn btn-ghost" data-view-motivation>Lettre</button>
            ${a.cvUrl? '<a class="btn btn-ghost" target="_blank" href="'+a.cvUrl+'">CV</a>':''}
            ${a.toOwner? '<a class="btn btn-ghost" href="profile.html?user='+encodeURIComponent(a.toOwner)+'">Entreprise</a>':''}
          </div>`;
        li.querySelector('[data-view-motivation]')?.addEventListener('click', ()=> alert(a.text));
        myList.appendChild(li);
      });
    }
    // Received (entreprise/coach/ong)
    const recPanel = document.getElementById('receivedAppsPanel');
    const recList = document.getElementById('receivedAppsList');
    if (recPanel && recList && (role==='entreprise' || role==='coach' || role==='ong')){
      recPanel.style.display = '';
      recList.innerHTML = '';
      const rec = apps.filter(a=> a.toOwner && a.toOwner === currentUser).sort((a,b)=> b.date.localeCompare(a.date));
      if (!rec.length){ recList.innerHTML = '<li class="offer-item"><div><p class="muted">Aucune candidature reçue.</p></div></li>'; }
      rec.forEach((a, idx)=>{
        const li = document.createElement('li'); li.className='offer-item';
        const masked = a.user; // could mask email if needed
        const badge = a.status==='accepted'? '<span class="tag" style="margin-right:8px">Acceptée</span>' : a.status==='refused'? '<span class="tag red" style="margin-right:8px">Refusée</span>' : a.status==='interview'? `<span class="tag yellow" style="margin-right:8px">Entretien: ${new Date(a.interview||'').toLocaleString('fr-FR')}</span>` : '<span class="tag" style="margin-right:8px">En attente</span>';
        li.innerHTML = `<div><h3>${a.title}</h3><p>${new Date(a.date).toLocaleString('fr-FR')} • ${masked}</p></div>
          <div style="display:flex; gap:8px; align-items:center">
            ${badge}
            <button class="btn btn-ghost" data-view-motivation>Lettre</button>
            ${a.cvUrl? '<a class="btn btn-ghost" target="_blank" href="'+a.cvUrl+'">CV</a>':''}
            <a class="btn btn-primary" href="profile.html?user=${encodeURIComponent(a.user)}">Voir profil</a>
            <button class="btn btn-ghost" data-app-act="accept" data-i="${idx}">Accepter</button>
            <button class="btn btn-ghost" data-app-act="refuse" data-i="${idx}">Refuser</button>
            <button class="btn btn-ghost" data-app-act="interview" data-i="${idx}">Planifier</button>
          </div>`;
        li.querySelector('[data-view-motivation]')?.addEventListener('click', ()=> alert(a.text));
        li.querySelectorAll('[data-app-act]').forEach(btn=> btn.addEventListener('click', (e)=>{
          const act = e.currentTarget.getAttribute('data-app-act');
          const i = Number(e.currentTarget.getAttribute('data-i'));
          const all = JSON.parse(localStorage.getItem('applications')||'[]');
          const item = rec[i];
          const idxGlobal = all.findIndex(x=> x.user===item.user && x.title===item.title && x.toOwner===item.toOwner && x.date===item.date);
          if (idxGlobal<0) return;
          if (act==='accept'){ all[idxGlobal].status='accepted'; notifyUser(item.user, `Votre candidature à "${item.title}" a été acceptée 🎉`); }
          else if (act==='refuse'){ all[idxGlobal].status='refused'; notifyUser(item.user, `Votre candidature à "${item.title}" a été refusée`); }
          else if (act==='interview'){
            const when = prompt('Date/heure entretien (ex: 20/10/2025 10:00)');
            if (when){ all[idxGlobal].status='interview'; all[idxGlobal].interview = new Date(when).toISOString(); notifyUser(item.user, `Entretien planifié pour "${item.title}" le ${when}`); }
          }
          localStorage.setItem('applications', JSON.stringify(all));
          toast('Mis à jour');
          location.reload();
        }));
        recList.appendChild(li);
      });
    }

    // Accepted / Refused panels (entreprise/coach/ong)
    if (role==='entreprise' || role==='coach' || role==='ong'){
      const byOwner = apps.filter(a=> a.toOwner===currentUser);
      const accepted = byOwner.filter(a=> a.status==='accepted');
      const refused = byOwner.filter(a=> a.status==='refused');

      const accPanel = document.getElementById('acceptedAppsPanel');
      const accList = document.getElementById('acceptedAppsList');
      if (accPanel && accList){
        accPanel.style.display=''; accList.innerHTML='';
        if (!accepted.length){ accList.innerHTML = '<li class="offer-item"><div><p class="muted">Aucune candidature acceptée.</p></div></li>'; }
        accepted.forEach(a=>{
          const li = document.createElement('li'); li.className='offer-item';
          const mail = encodeURIComponent(a.user);
          const subject = encodeURIComponent(`Acceptation – ${a.title}`);
          const body = encodeURIComponent(`Bonjour,\n\nNous avons le plaisir d'accepter votre candidature pour le poste ${a.title}.\nNous reviendrons vers vous pour la suite.\n\nCordialement.`);
          li.innerHTML = `<div><h3>${a.title}</h3><p>${new Date(a.date).toLocaleString('fr-FR')} • ${a.user}</p></div>
            <div style="display:flex; gap:8px">
              <a class="btn btn-ghost" href="mailto:${mail}?subject=${subject}&body=${body}">Email d’acceptation</a>
              ${a.cvUrl? '<a class="btn btn-ghost" target="_blank" href="'+a.cvUrl+'">CV</a>':''}
              <a class="btn btn-ghost" href="profile.html?user=${encodeURIComponent(a.user)}">Profil</a>
            </div>`;
          accList.appendChild(li);
        });
      }

      const refPanel = document.getElementById('refusedAppsPanel');
      const refList = document.getElementById('refusedAppsList');
      if (refPanel && refList){
        refPanel.style.display=''; refList.innerHTML='';
        if (!refused.length){ refList.innerHTML = '<li class="offer-item"><div><p class="muted">Aucune candidature refusée.</p></div></li>'; }
        refused.forEach(a=>{
          const li = document.createElement('li'); li.className='offer-item';
          const mail = encodeURIComponent(a.user);
          const subject = encodeURIComponent(`Réponse candidature – ${a.title}`);
          const body = encodeURIComponent(`Bonjour,\n\nAprès étude de votre candidature pour ${a.title}, nous ne pouvons pas y donner une suite favorable.\nNous vous remercions pour l’intérêt porté à notre organisation.\n\nCordialement.`);
          li.innerHTML = `<div><h3>${a.title}</h3><p>${new Date(a.date).toLocaleString('fr-FR')} • ${a.user}</p></div>
            <div style="display:flex; gap:8px">
              <a class="btn btn-ghost" href="mailto:${mail}?subject=${subject}&body=${body}">Email de refus</a>
              ${a.cvUrl? '<a class="btn btn-ghost" target="_blank" href="'+a.cvUrl+'">CV</a>':''}
              <a class="btn btn-ghost" href="profile.html?user=${encodeURIComponent(a.user)}">Profil</a>
            </div>`;
          refList.appendChild(li);
        });
      }
    }
  })();

  function notifyUser(userKey, message){
    const box = JSON.parse(localStorage.getItem('notifications')||'{}');
    if (!box[userKey]) box[userKey]=[];
    box[userKey].push({ message, date: new Date().toISOString() });
    localStorage.setItem('notifications', JSON.stringify(box));
  }

  // Entity modal rendering (applicant/company)
  const entityModal = document.getElementById('entityModal');
  const entityBody = document.getElementById('entityBody');
  function openEntityModal({userKey, letter='', title='Détails'}){
    if (!entityModal || !entityBody) return;
    const users = JSON.parse(localStorage.getItem('users')||'{}');
    const metaAll = JSON.parse(localStorage.getItem('usersMeta')||'{}');
    const r = users[userKey] || '';
    const m = metaAll[userKey] || {};
    document.getElementById('entityTitle').textContent = title;
    const avatar = m.avatar ? `<img src="${m.avatar}" alt="avatar" style="width:64px;height:64px;border-radius:12px;object-fit:cover"/>` : '';
    let html = '';
    if (r==='etudiant'){
      html = `
        <div style="display:flex; gap:12px; align-items:center">${avatar}<div><strong>${m.name||userKey}</strong><div class="muted">${m.diploma||'Diplôme'} • ${m.city||'Ville'}</div></div></div>
        <div><strong>École:</strong> ${m.school||'-'}</div>
        ${letter? `<div><strong>Lettre:</strong><br/>${letter.replace(/\n/g,'<br/>')}</div>`:''}
        ${m.avatar? '': ''}
      `;
      if (entityBody) entityBody.innerHTML = html;
    } else if (r==='entreprise' || r==='ong'){
      html = `
        <div style="display:flex; gap:12px; align-items:center">${avatar}<div><strong>${r==='ong'?(m.ongName||'ONG'):(m.company||'Entreprise')}</strong><div class="muted">${(m.sector||m.domain||'Secteur')} • ${m.city||'Ville'}</div></div></div>
      `;
      if (entityBody) entityBody.innerHTML = html;
    } else if (r==='coach'){
      html = `
        <div style="display:flex; gap:12px; align-items:center">${avatar}<div><strong>${m.name||userKey}</strong><div class="muted">${m.organization||'Organisation'} • ${m.city||'Ville'}</div></div></div>
        <div><strong>Spécialité:</strong> ${m.specialty||'-'}</div>
      `;
      if (entityBody) entityBody.innerHTML = html;
    } else {
      entityBody.innerHTML = '<p class="muted">Informations indisponibles.</p>';
    }
    entityModal.style.display='block';
  }
  if (entityModal){
    entityModal.addEventListener('click', (e)=>{ if (e.target===entityModal){ entityModal.style.display='none'; entityBody.innerHTML=''; }});
    entityModal.querySelectorAll('[data-close]').forEach(c=> c.addEventListener('click', ()=>{ entityModal.style.display='none'; entityBody.innerHTML=''; }));
  }

  // Student dashboard job search -> redirect with query
  const jobSearchForm = document.getElementById('jobSearchForm');
  if (jobSearchForm){
    jobSearchForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const q = document.getElementById('jobSearch')?.value?.trim();
      if (!q) return;
      location.href = `offers.html?q=${encodeURIComponent(q)}`;
    });
  }

  // Media library: filters and modal player
  const mediaFilters = document.getElementById('mediaFilters');
  const mediaList = document.getElementById('mediaList');
  const mediaModal = document.getElementById('mediaModal');
  const mediaContent = document.getElementById('mediaContent');
  if (mediaFilters && mediaList){
    const doFilter = ()=>{
      const q = (mediaFilters.q.value||'').toLowerCase();
      const type = (mediaFilters.type.value||'').toLowerCase();
      $$('.media-card', mediaList).forEach(card=>{
        const t = (card.dataset.type||'').toLowerCase();
        const text = (card.dataset.title+' '+card.dataset.author+' '+(card.dataset.tags||'')).toLowerCase();
        const okType = !type || t===type;
        const okQ = !q || text.includes(q);
        card.style.display = (okType && okQ)? '' : 'none';
      });
    };
    mediaFilters.addEventListener('input', doFilter);
    mediaFilters.addEventListener('change', doFilter);
    mediaFilters.addEventListener('reset', ()=> setTimeout(doFilter,0));
    doFilter();

    mediaList.addEventListener('click', (e)=>{
      const card = e.target.closest('.media-card'); if(!card) return;
      const type = (card.dataset.type||'');
      if (type === 'ebook'){
        const file = card.dataset.file; if (file) window.open(file, '_blank');
        return;
      }
      const src = card.dataset.src;
      const title = card.dataset.title || 'Lecture';
      if (mediaModal && mediaContent && src){
        document.getElementById('mediaTitle').textContent = title;
        mediaContent.innerHTML = `<iframe width="100%" height="100%" src="${src}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        mediaModal.style.display='block';
      }
    });
  }
  if (mediaModal){
    mediaModal.addEventListener('click', (e)=>{
      if (e.target===mediaModal){ mediaModal.style.display='none'; mediaContent.innerHTML=''; }
    });
    mediaModal.querySelectorAll('[data-close]').forEach(c=> c.addEventListener('click', ()=>{ mediaModal.style.display='none'; mediaContent.innerHTML=''; }));
  }

  // Offers page: render custom offers from localStorage
  if (offerList && !filters?.dataset.rendered){
    const list = JSON.parse(localStorage.getItem('offersCustom')||'[]');
    if (list.length){
      const frag = document.createDocumentFragment();
      list.forEach(o=>{
        const li = document.createElement('li');
        li.className = 'offer-card';
        li.dataset.skill = o.skill || '';
        li.dataset.sector = o.sector || '';
        li.dataset.location = o.location || '';
        if (o.owner) li.dataset.owner = o.owner;
        const canViewApplicants = !!o.owner;
        li.innerHTML = `
          <div class="card-top">
            <h3>${o.title}</h3>
            <span class="tag">${o.type||'Offre'}</span>
          </div>
          <p>${o.company} • ${o.skill||'Compétences'} • ${o.location||''}</p>
          <div class="meta">
            <span>${o.sector||''}</span>
            <span>${o.skill||''}</span>
            <span>${o.location||''}</span>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap">
            <a class="btn btn-primary" href="#">Postuler</a>
            ${o.owner? '<button class="btn btn-ghost" data-view-company>Profil entreprise</button>' : ''}
            ${o.owner ? '<button class="btn btn-ghost" data-offer-apps>Voir candidats</button>' : ''}
          </div>
        `;
        frag.appendChild(li);
      });
      offerList.appendChild(frag);
      // buttons will be handled by delegated listener to open modal
    }
    if (filters){ filters.dataset.rendered = '1'; }
  }

  // Application modal (motivation letter) on offers page
  const applyModal = document.getElementById('applyModal');
  const applyForm = document.getElementById('applyForm');
  const applyTitle = document.getElementById('applyOfferTitle');
  const motivationText = document.getElementById('motivationText');
  function openApply(title, owner){
    if (!offerList || !applyModal) return;
    if (!localStorage.getItem('currentUser')){ toast('Veuillez vous connecter pour postuler'); setTimeout(()=> location.href='login.html', 600); return; }
    if ((localStorage.getItem('role')||'') !== 'etudiant'){ toast('Connectez-vous en tant qu’étudiant pour postuler'); return; }
    document.getElementById('applyTitle').textContent = `Postuler: ${title}`;
    applyTitle.value = title;
    motivationText.value = '';
    applyForm.dataset.owner = owner || '';
    applyModal.style.display = 'block';
  }
  const offersApplicantsModal = document.getElementById('offersApplicantsModal');
  const offersApplicantsList = document.getElementById('offersApplicantsList');
  const offersApplicantsTitle = document.getElementById('offersApplicantsTitle');

  if (offerList && applyModal){
    offerList.addEventListener('click', (e)=>{
      const btn = e.target.closest('.btn'); if(!btn) return;
      // company profile view
      if (btn.matches('[data-view-company]')){
        e.preventDefault();
        const card = btn.closest('.offer-card');
        const owner = card?.dataset.owner;
        if (owner){ location.href = `profile.html?user=${encodeURIComponent(owner)}`; }
        return;
      }
      // view applicants
      if (btn.matches('[data-offer-apps]')){
        e.preventDefault();
        const card = btn.closest('.offer-card');
        const title = card?.querySelector('h3')?.textContent || '';
        const owner = card?.dataset.owner || '';
        if (!owner) return;
        const apps = JSON.parse(localStorage.getItem('applications')||'[]');
        const filtered = apps.filter(a=> a.title===title && a.toOwner===owner).sort((a,b)=> b.date.localeCompare(a.date));
        if (offersApplicantsTitle) offersApplicantsTitle.textContent = `Candidats – ${title}`;
        if (offersApplicantsList){
          offersApplicantsList.innerHTML = '';
          if (!filtered.length){ offersApplicantsList.innerHTML = '<li class="offer-item"><div><p class="muted">Aucun candidat.</p></div></li>'; }
          filtered.forEach(a=>{
            const li = document.createElement('li'); li.className='offer-item';
            const usersMeta = JSON.parse(localStorage.getItem('usersMeta')||'{}');
            const m = usersMeta[a.user]||{};
            const st = a.status==='accepted'? 'Acceptée' : a.status==='refused'? 'Refusée' : a.status==='interview'? `Entretien: ${new Date(a.interview||'').toLocaleString('fr-FR')}` : 'En attente';
            li.innerHTML = `<div><h3>${m.name||a.user}</h3><p>${new Date(a.date).toLocaleString('fr-FR')} • ${st}</p></div>
              <div style=\"display:flex; gap:8px\">
                <a class=\"btn btn-ghost\" href=\"profile.html?user=${encodeURIComponent(a.user)}\">Voir profil</a>
                ${a.cvUrl? '<a class=\"btn btn-ghost\" target=\"_blank\" href=\"'+a.cvUrl+'\">CV</a>':''}
                <button class=\"btn btn-ghost\" data-view-letter>Lettre</button>
              </div>`;
            li.querySelector('[data-view-letter]')?.addEventListener('click', ()=> alert(a.text));
            offersApplicantsList.appendChild(li);
          });
        }
        if (offersApplicantsModal) offersApplicantsModal.style.display='block';
        return;
      }
      // apply flow
      e.preventDefault();
      const card = btn.closest('.offer-card');
      const title = card?.querySelector('h3')?.textContent || 'Offre';
      const owner = card?.dataset.owner || '';
      openApply(title, owner);
    });
    applyModal.addEventListener('click', (e)=>{ if (e.target === applyModal) applyModal.style.display='none'; });
    applyModal.querySelectorAll('[data-close]').forEach(c=> c.addEventListener('click', ()=> applyModal.style.display='none'));
  }
  if (offersApplicantsModal){
    offersApplicantsModal.addEventListener('click', (e)=>{ if (e.target===offersApplicantsModal){ offersApplicantsModal.style.display='none'; offersApplicantsList.innerHTML=''; }});
    offersApplicantsModal.querySelectorAll('[data-close]').forEach(c=> c.addEventListener('click', ()=>{ offersApplicantsModal.style.display='none'; offersApplicantsList.innerHTML=''; }));
  }
  if (applyForm){
    applyForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const user = localStorage.getItem('currentUser'); if (!user){ toast('Veuillez vous connecter'); return; }
      const roleNow = localStorage.getItem('role'); if (roleNow !== 'etudiant'){ toast('Réservé aux étudiants'); return; }
      const title = applyTitle.value || 'Offre';
      const text = motivationText.value.trim(); if (!text){ toast('Lettre de motivation requise'); return; }
      const applications = JSON.parse(localStorage.getItem('applications')||'[]');
      const toOwner = applyForm.dataset.owner || '';
      const cvUrl = localStorage.getItem('cvDataUrl')||'';
      const cvName = localStorage.getItem('cvName')||'';
      const app = { user, title, text, date: new Date().toISOString(), toOwner, cvUrl, cvName };
      applications.push(app);
      localStorage.setItem('applications', JSON.stringify(applications));
      toast('Candidature envoyée ✅'); applyModal.style.display='none';
      // Redirect to dashboard to display updated KPIs immediately
      setTimeout(()=> location.href='dashboard.html', 700);
    });
  }

  // Animated counters
  const counters = $$('[data-count]');
  if (counters.length){
    const io2 = new IntersectionObserver((entries)=>{
      entries.forEach(en=>{
        if(!en.isIntersecting) return;
        const el = en.target; io2.unobserve(el);
        const target = parseInt(el.getAttribute('data-count')||'0',10);
        const dur = 1200; const start = performance.now();
        const step = (t)=>{
          const p = Math.min(1, (t-start)/dur);
          const val = Math.floor(target * (0.1 + 0.9*Math.pow(p, 0.8)));
          el.textContent = val.toLocaleString('fr-FR');
          if (p<1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      })
    }, {threshold:0.4});
    counters.forEach(c=>io2.observe(c));
  }

  // Offers simple pagination (client-side)
  const pager = $('#pagination');
  if (offerList && pager){
    const pageSize = 6;
    let page = 1;
    const all = $$('.offer-card', offerList);
    const render = ()=>{
      const visible = all.filter(li => li.style.display !== 'none');
      const total = visible.length; const pages = Math.max(1, Math.ceil(total/pageSize));
      page = Math.max(1, Math.min(page, pages));
      visible.forEach((li, i)=>{
        const start = (page-1)*pageSize;
        const end = start + pageSize;
        li.style.visibility = (i>=start && i<end)? 'visible' : 'hidden';
        li.style.position = (i>=start && i<end)? '' : 'absolute';
      });
      pager.querySelector('[data-page]')?.setAttribute('data-page', String(page));
      const info = pager.querySelector('.page-info');
      if (info) info.textContent = `${page} / ${pages}`;
    };
    pager.addEventListener('click', (e)=>{
      const a = e.target.closest('button'); if(!a) return;
      if (a.name==='prev') page--; else if (a.name==='next') page++;
      render();
    });
    // Re-render on filter changes
    ['input','change','reset'].forEach(ev=> filters?.addEventListener(ev, ()=> setTimeout(render, 0)));
    render();
  }

  // Contact modal (profile)
  const contactBtn = document.getElementById('contactBtn');
  const modal = document.getElementById('contactModal');
  if (contactBtn && modal){
    const close = modal.querySelector('[data-close]');
    contactBtn.addEventListener('click', ()=> modal.classList.add('open'));
    close?.addEventListener('click', ()=> modal.classList.remove('open'));
    modal.addEventListener('click', (e)=>{ if (e.target === modal) modal.classList.remove('open'); });
    const form = modal.querySelector('form');
    form?.addEventListener('submit', (e)=>{ e.preventDefault(); modal.classList.remove('open'); toast('Message envoyé ✅'); });
  }

  // Chat simulation (messages)
  const chatForm = document.getElementById('chatForm');
  const chatBody = document.getElementById('chatBody');
  const chatInput = document.getElementById('chatMessage');
  if (chatForm && chatBody && chatInput){
    const reply = (text)=>{
      const b = document.createElement('div'); b.className='bubble bot'; b.textContent=text; chatBody.appendChild(b); b.scrollIntoView({behavior:'smooth', block:'end'});
    };
    chatForm.addEventListener('submit', (e)=>{
      e.preventDefault(); const v = chatInput.value.trim(); if(!v) return;
      const mine = document.createElement('div'); mine.className='bubble me'; mine.textContent=v; chatBody.appendChild(mine); chatInput.value=''; mine.scrollIntoView({behavior:'smooth', block:'end'});
      setTimeout(()=>{
        if (/recommande/i.test(v)){
          reply('Voici 3 offres pour vous: Front-end à Dakar, Data Analyst en Banque, Chargé·e Com à Thiès.');
        } else if (/bonjour|salut/i.test(v)){
          reply('Bonjour ! Comment puis-je vous aider aujourd\'hui ?');
        } else {
          reply("Je suis un assistant fictif 🤖. Essayez 'recommande'.");
        }
      }, 600);
    });
  }
})();
