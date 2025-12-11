// script.js — animations, modal handling, timeline reveal, simple particles

document.addEventListener('DOMContentLoaded',()=>{
  // set year
  document.getElementById('year').textContent = new Date().getFullYear();

  // modal elements
  const modal = document.getElementById('projectModal');
  const modalPanel = modal.querySelector('.modal-panel');
  const modalTitle = document.getElementById('modalTitle');
  const modalVideo = document.getElementById('modalVideo');
  const modalPdf = document.getElementById('modalPdf');
  const openSite = document.getElementById('openSite');
  const downloadFiles = document.getElementById('downloadFiles');
  const closeBtn = modal.querySelector('.modal-close');

  function openModal(data){
    modalTitle.textContent = data.title || 'Project';
    modalVideo.src = data.video || '';
    modalPdf.src = data.pdf || '';
    openSite.href = data.site || '';
    downloadFiles.href = data.download || '#';
    downloadFiles.setAttribute('download','');
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    // small timeout for panel animation
    setTimeout(()=> modalPanel.classList.add('open'),50);
  }

  function closeModal(){
    modalPanel.classList.remove('open');
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    // stop videos
    modalVideo.src = '';
    modalPdf.src = '';
  }

  document.querySelectorAll('.view-more').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const data = {
        title: btn.dataset.title,
        video: btn.dataset.video,
        pdf: btn.dataset.pdf,
        site: btn.dataset.site,
        download: btn.dataset.download
      };
      openModal(data);
    })
  });

  // view-media buttons (open modal with video/pdf)
  document.querySelectorAll('.view-media').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const data = {
        title: btn.dataset.title,
        video: btn.dataset.video,
        pdf: btn.dataset.pdf,
        download: btn.dataset.download,
        site: btn.dataset.site
      };
      openModal(data);
    })
  });

  closeBtn.addEventListener('click',closeModal);
  modal.querySelector('.modal-backdrop').addEventListener('click',closeModal);
  document.addEventListener('keydown',e=>{if(e.key==='Escape') closeModal();});

  // Intersection Observer for reveal animations
  const reveales = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('visible');}
    })
  },{threshold:0.12});
  reveales.forEach(r=>io.observe(r));

  // Smooth parallax for hero on mouse move
  const hero = document.querySelector('.hero');
  if(hero){
    hero.addEventListener('mousemove', (e)=>{
      const bounds = hero.getBoundingClientRect();
      const rx = (e.clientX - bounds.left)/bounds.width - 0.5;
      const ry = (e.clientY - bounds.top)/bounds.height - 0.5;
      const blobs = document.querySelectorAll('.blob');
      blobs.forEach((b,i)=>{
        const speed = (i+1)*6;
        b.style.transform = `translate(${rx*speed}px, ${ry*speed}px) scale(1)`;
      })
    });
  }

  // Scroll-based parallax for elements with data-scroll-speed
  const scrollItems = Array.from(document.querySelectorAll('[data-scroll-speed]'));
  let lastScroll = 0; let ticking = false;
  function onScroll(){
    lastScroll = window.scrollY;
    if(!ticking){
      window.requestAnimationFrame(()=>{
        scrollItems.forEach(el=>{
          const speed = parseFloat(el.getAttribute('data-scroll-speed')) || 0.2;
          const offset = el.getBoundingClientRect().top + window.scrollY;
          const y = (lastScroll - offset) * speed;
          el.style.transform = `translate3d(0,${y}px,0)`;
        });
        ticking = false;
      });
    }
    ticking = true;
  }
  if(scrollItems.length) window.addEventListener('scroll', onScroll, {passive:true});

  // small tilt interaction on project cards based on mouse
  document.querySelectorAll('.project-card').forEach(card=>{
    card.addEventListener('mousemove', e=>{
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left)/r.width - 0.5;
      const py = (e.clientY - r.top)/r.height - 0.5;
      const rotateY = px * 6; const rotateX = -py * 6;
      card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
    card.addEventListener('mouseleave', ()=>{card.style.transform='';});
  });

  // Announcement popup (admin-configurable in code)
  const ADMIN_ANNOUNCEMENT = {
    enabled: true, // set to false to disable the announcement
    title: '🥈 1st Runner Up Position \n 🏆 Best Team Work Award ',
    body: 'We are also proud to share that we were the only Junior Team representing the entire Chennai Region to get qualified for the Finals! 🚀',
    image: 'assets/images/announcement.jpg', // optional image (set to null or '' to hide)
    imageHref: '', // optional link when image is clicked
    timeoutMs: 8000 // auto-hide after this many ms (set 0 to keep until closed)
  };

  function showAnnouncement(cfg){
    if(!cfg || !cfg.enabled) return;
    const a = document.createElement('div');
    a.className = 'announcement';
    let imgHtml = '';
    if(cfg.image){
      const href = cfg.imageHref ? `href="${cfg.imageHref}" target="_blank" rel="noopener"` : '';
      imgHtml = cfg.imageHref ? `<a ${href}><img class="a-img" src="${cfg.image}" alt="announcement image"></a>` : `<img class="a-img" src="${cfg.image}" alt="announcement image">`;
    }
    a.innerHTML = `<button class="a-close" aria-label="Close">✕</button>${imgHtml}<div class="title">${cfg.title}</div><div class="body">${cfg.body}</div>`;
    document.body.appendChild(a);
    // allow CSS transition
    requestAnimationFrame(()=>a.classList.add('show'));
    a.querySelector('.a-close').addEventListener('click', ()=>{a.classList.remove('show');setTimeout(()=>a.remove(),400)});
    if(cfg.timeoutMs && cfg.timeoutMs>0){setTimeout(()=>{if(document.body.contains(a)){a.classList.remove('show');setTimeout(()=>a.remove(),400)}},cfg.timeoutMs)}
  }
  // show on every page load (customize ADMIN_ANNOUNCEMENT above)
  showAnnouncement(ADMIN_ANNOUNCEMENT);

  // Simple particles for footer canvas
  const canvas = document.getElementById('particles');
  if(canvas && canvas.getContext){
    const ctx = canvas.getContext('2d');
    let w=canvas.width=canvas.clientWidth;let h=canvas.height=canvas.clientHeight;
    window.addEventListener('resize',()=>{w=canvas.width=canvas.clientWidth;h=canvas.height=canvas.clientHeight});
    const particles = Array.from({length:26}).map(()=>({
      x:Math.random()*w,y:Math.random()*h,r:Math.random()*1.6+0.6,alpha:Math.random()*0.6+0.2,dx:(Math.random()-0.5)*0.3,dy:(Math.random()-0.5)*0.3
    }));
    function draw(){ctx.clearRect(0,0,w,h);particles.forEach(p=>{p.x+=p.dx;p.y+=p.dy;if(p.x<0)p.x=w;if(p.x>w)p.x=0;if(p.y<0)p.y=h;if(p.y>h)p.y=0;ctx.beginPath();ctx.fillStyle=`rgba(140,150,255,${p.alpha})`;ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();});requestAnimationFrame(draw)}
    draw();
  }

});
