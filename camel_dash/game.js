(() => {
  // ===== Elements =====
  const landing  = document.getElementById('landing');
  const playArea = document.getElementById('playArea');
  const btnStart = document.getElementById('btnStart');
  const btnHow   = document.getElementById('btnHow');

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const scoreEl = document.getElementById('score');
  const timeEl  = document.getElementById('time');
  const livesEl = document.getElementById('lives');

  const overlay = document.getElementById('overlay');
  const ovTitle = document.getElementById('ovTitle');
  const ovSub   = document.getElementById('ovSub');
  const btnRestart = document.getElementById('btnRestart');
  const btnBack    = document.getElementById('btnBack');
  const btnDock    = document.getElementById('btnDock');
  const btnHide    = document.getElementById('btnHide');
  const pauseToast = document.getElementById('pauseToast');

  const oskButtons = [...document.querySelectorAll('.key')];
  const CSS = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

  // ===== Fit canvas to viewport =====
  function fit() {
    const ratio = W / H;
    let w = window.innerWidth - 16, h = window.innerHeight - 170; // reserve for topbar+OSK
    h = Math.max(320, h);
    let rw = h * ratio, rh = w / ratio;
    if (rw <= w) { canvas.style.width = `${Math.floor(rw)}px`; canvas.style.height = `${Math.floor(h)}px`; }
    else { canvas.style.width = `${Math.floor(w)}px`; canvas.style.height = `${Math.floor(rh)}px`; }
  }
  window.addEventListener('resize', fit); fit();

  // ===== Top-down lanes (horizontal) =====
  const LANES_X = [W*0.25, W*0.5, W*0.75];    // 3 lanes
  const PLAYER_Y = H*0.78;                    // camel near bottom

  // ===== Overlay layout state =====
  let overlayDocked = false;   // false = center, true = docked right
  let overlayHidden = false;   // true = hide panel and show toast

  // ===== Game state =====
  let running=false, paused=false, gameOver=false, inAttract=true;
  const state = {
    score:0, timeLeft:60, lives:1,
    speed:4.6, maxSpeed:11.5,
    lane:1,
    dash:{active:false, timer:0, cooldown:0},
    dunesOffset:0,
    spawnTimerObs:0, spawnTimerDate:0, spawnTimerLandmark:1.5,
    obstacles:[], dates:[], landmarks:[]
  };

  // ===== Player (camel) — top-down silhouette =====
  const camel = {
    w:70, h:120, laneX(){ return LANES_X[state.lane]; },
    x: LANES_X[1], y: PLAYER_Y,
    color: CSS('--camel'), shade: CSS('--camelShade'),
    vx:0
  };

  // ===== Input (keyboard + on-screen) =====
  function setKeyActive(code, isDown){
    const btn = oskButtons.find(b => b.dataset.key === code || (code==='NumpadEnter' && b.dataset.key==='Enter'));
    if (btn) btn.classList.toggle('active', isDown);
  }
  function handleKey(code, isDown){
    if (isDown) setKeyActive(code, true); else setKeyActive(code, false);

    if (isDown && (code==='Enter' || code==='NumpadEnter' || code===13)){
      if (!running || gameOver) startGame();
    }
    if (isDown && (code==='KeyP' || code==='p')){
      if (running && !gameOver){ paused = !paused; showPause(paused); }
    }
    if (isDown && (code==='KeyH' || code==='h')){ // toggle hide/show panel
      overlayHidden = !overlayHidden;
      if (paused && !gameOver) showPause(true);
    }
    if (isDown && (code==='ArrowLeft' || code===37))  if (state.lane>0) state.lane--;
    if (isDown && (code==='ArrowRight'|| code===39))  if (state.lane<2) state.lane++;
    if (isDown && (code==='ArrowUp'   || code===38))  triggerDash();
  }
  window.addEventListener('keydown', e => { e.preventDefault(); handleKey(e.code || e.key || e.keyCode, true); }, {passive:false});
  window.addEventListener('keyup',   e => handleKey(e.code || e.key || e.keyCode, false));

  oskButtons.forEach(btn=>{
    btn.addEventListener('pointerdown', ()=> handleKey(btn.dataset.key, true));
    btn.addEventListener('pointerup',   ()=> handleKey(btn.dataset.key, false));
    btn.addEventListener('pointerleave',()=> handleKey(btn.dataset.key, false));
  });

  // Landing buttons
  btnStart.addEventListener('click', startGame);
  btnHow.addEventListener('click', ()=>{
    if (inAttract){
      playArea.classList.remove('hidden'); landing.classList.add('hidden');
      inAttract=false; running=false; paused=true; overlayHidden=false;
      ovTitle.textContent='On-Screen Controls';
      ovSub.innerHTML='Tap the buttons below or use your remote/keyboard. Press <b>Enter</b> to start.';
      showPause(true);
    }
    document.getElementById('osk').scrollIntoView({behavior:'smooth', block:'end'});
  });
  btnRestart.addEventListener('click', startGame);
  btnBack.addEventListener('click', backToLanding);

  // Overlay dock/hide buttons
  btnDock.addEventListener('click', () => {
    overlayDocked = !overlayDocked;
    applyOverlayLayout();
  });
  btnHide.addEventListener('click', () => {
    overlayHidden = true;
    overlay.hidden = true;
    showToast(true);
  });

  // ===== Overlay helpers =====
  function applyOverlayLayout(){
    overlay.classList.toggle('side', overlayDocked);
    btnDock.textContent = overlayDocked ? 'Undock' : 'Dock to Side';
  }
  function showToast(show){ pauseToast.hidden = !show; }
  function showPause(show){
    if (show && !gameOver){
      if (overlayHidden){
        overlay.hidden = true;
        showToast(true);
      } else {
        applyOverlayLayout();
        overlay.hidden = false;
        ovTitle.textContent='Paused';
        ovSub.innerHTML='Press <b>P</b> to resume.';
        showToast(false);
      }
    } else if (!gameOver){
      overlay.hidden = true;
      showToast(false);
    }
  }

  function backToLanding(){
    running=false; inAttract=true; paused=false; gameOver=false;
    overlayHidden=false; overlayDocked=false; applyOverlayLayout();
    showToast(false);
    playArea.classList.add('hidden'); landing.classList.remove('hidden');
  }

  // ===== Spawners =====
  function spawnObstacle(){
    const lane = Math.floor(Math.random()*3);
    const type = Math.random() < 0.65 ? 'cactus' : 'rock';
    const baseW = type==='cactus'? 44 : 52;
    const baseH = type==='cactus'? 64 : 36;
    state.obstacles.push({
      type, lane,
      x: LANES_X[lane] - baseW/2,
      y: -baseH - 10,
      w: baseW, h: baseH,
      vy: state.speed * (0.9 + Math.random()*0.2)
    });
  }
  function spawnDate(){
    const lane = Math.floor(Math.random()*3);
    const size = 30;
    state.dates.push({
      lane, x: LANES_X[lane] - size/2, y: -size - 10,
      w: size, h: size,
      vy: state.speed * (0.85 + Math.random()*0.2),
      pulse:0
    });
  }
  function spawnLandmark(){
    const which = Math.random()<0.6 ? 'pyramid' : 'sphinx';
    const lane = Math.floor(Math.random()*3);
    const cfg = which==='pyramid'
      ? {w:180, h:120, vy: state.speed*0.6}
      : {w:220, h:110, vy: state.speed*0.55};
    state.landmarks.push({
      kind: which,
      x: LANES_X[lane] - cfg.w/2,
      y: -cfg.h - 40,
      w: cfg.w, h: cfg.h,
      vy: cfg.vy,
      tone: 0.85 + Math.random()*0.15
    });
  }

  // ===== Dash mechanic =====
  function triggerDash(){
    if (state.dash.cooldown<=0 && !state.dash.active){
      state.dash.active = true; state.dash.timer = 0.9; state.dash.cooldown = 3.0;
    }
  }

  // ===== Game lifecycle =====
  function reset(){
    Object.assign(state, {
      score:0, timeLeft:60, lives:1,
      speed:4.6, maxSpeed:11.5, lane:1,
      dash:{active:false, timer:0, cooldown:0},
      dunesOffset:0,
      spawnTimerObs:0, spawnTimerDate:0, spawnTimerLandmark:1.5,
      obstacles:[], dates:[], landmarks:[]
    });
    camel.x = LANES_X[1]; camel.y = PLAYER_Y; camel.vx = 0;
    scoreEl.textContent = 0; timeEl.textContent = 60; livesEl.textContent = 1;
  }

  function startGame(){
    inAttract=false; running=true; paused=false; gameOver=false;
    overlayHidden=false; overlayDocked=false; applyOverlayLayout(); showToast(false);
    landing.classList.add('hidden'); playArea.classList.remove('hidden');
    overlay.hidden = true;
    reset();
  }

  function endGame(title, subtitleHTML){
    gameOver=true; running=false; paused=false;
    overlayHidden = false;                     // force show full panel for clarity
    applyOverlayLayout();
    ovTitle.textContent = title;
    ovSub.innerHTML = subtitleHTML;
    overlay.hidden = false;
    showToast(false);
  }

  // ===== Loop =====
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now-last)/1000); last = now;
    if (running && !paused && !gameOver) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ===== Update =====
  function update(dt){
    state.timeLeft -= dt;
    if (state.timeLeft <= 0){
      state.timeLeft = 0;
      endGame('Time Up!', `Final Score: <b>${Math.floor(state.score)}</b>. Press <b>Enter</b> to play again.`);
      return;
    }
    state.speed = Math.min(state.maxSpeed, state.speed + 0.012);

    // dash
    if (state.dash.active){
      state.dash.timer -= dt;
      if (state.dash.timer <= 0) state.dash.active = false;
    } else if (state.dash.cooldown > 0){
      state.dash.cooldown -= dt;
    }

    const scroll = state.speed * (state.dash.active ? 1.55 : 1.0);
    state.dunesOffset = (state.dunesOffset + scroll*1.2) % H;

    // smooth move toward lane center
    const targetX = LANES_X[state.lane];
    camel.vx += (targetX - camel.x) * 0.18;
    camel.vx *= 0.68;
    camel.x += camel.vx * dt * 10;

    // spawns
    state.spawnTimerObs -= dt; state.spawnTimerDate -= dt; state.spawnTimerLandmark -= dt;
    if (state.spawnTimerObs <= 0){ spawnObstacle(); state.spawnTimerObs = Math.max(0.35, 0.9 + Math.random()*0.6 - (state.speed-4.6)*0.03); }
    if (state.spawnTimerDate <= 0){ spawnDate();    state.spawnTimerDate = Math.max(0.65, 1.4 + Math.random()*0.9 - (state.speed-4.6)*0.04); }
    if (state.spawnTimerLandmark <= 0){ spawnLandmark(); state.spawnTimerLandmark = 2 + Math.random()*3; }

    // move entities
    for (let i=state.landmarks.length-1;i>=0;i--){
      const L = state.landmarks[i]; L.y += L.vy;
      if (L.y - L.h > H) state.landmarks.splice(i,1);
    }
    for (let i=state.obstacles.length-1;i>=0;i--){
      const o = state.obstacles[i]; o.y += o.vy;
      if (hitRect(camel.x - camel.w/2, camel.y - camel.h/2, camel.w, camel.h, o.x, o.y, o.w, o.h)){
        state.lives--; state.obstacles.splice(i,1);
        state.speed = Math.max(4.2, state.speed - 1.2);
        if (state.lives<=0){
          endGame('Crashed!', `Final Score: <b>${Math.floor(state.score)}</b>. Press <b>Enter</b> to restart.`);
          return;
        }
      } else if (o.y - o.h > H){
        state.obstacles.splice(i,1);
      }
    }
    for (let i=state.dates.length-1;i>=0;i--){
      const d = state.dates[i]; d.y += d.vy; d.pulse += dt*4;
      if (hitRect(camel.x - camel.w/2, camel.y - camel.h/2, camel.w, camel.h, d.x, d.y, d.w, d.h)){
        state.score += 5; state.dates.splice(i,1);
      } else if (d.y - d.h > H){
        state.dates.splice(i,1);
      }
    }

    // passive score
    state.score += (state.dash.active?2:1) * (dt*1.4);

    // HUD
    scoreEl.textContent = Math.floor(state.score);
    timeEl.textContent  = Math.ceil(state.timeLeft);
    livesEl.textContent = state.lives;
  }

  // ===== Draw =====
  function draw(){
    // sand gradient
    const g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0, CSS('--sand1')); g.addColorStop(1, CSS('--sand2'));
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // dunes/ripples
    drawDunes(state.dunesOffset);

    // landmarks (back)
    state.landmarks.forEach(drawLandmark);

    // collectibles
    state.dates.forEach(drawDate);

    // player
    drawCamelTopDown(camel.x, camel.y, camel.w, camel.h);

    // obstacles (front)
    state.obstacles.forEach(drawObstacle);
  }

  // ===== Drawing helpers =====
  function drawDunes(offset){
    ctx.fillStyle = CSS('--sand3');
    ctx.globalAlpha = 0.18;
    const step = 16;
    for (let y = -H; y < H*2; y += 64){
      const yy = (y + offset) % (H + 64) - 64;
      ctx.beginPath();
      ctx.moveTo(0, yy);
      for (let x = 0; x <= W; x += step){
        const wave = Math.sin((x+yy)*0.01) * 6 + Math.cos((x-yy)*0.013) * 4;
        ctx.lineTo(x, yy + wave);
      }
      ctx.lineTo(W, yy+18); ctx.lineTo(0, yy+18); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawLandmark(L){
    if (L.kind === 'pyramid'){ drawPyramid(L.x, L.y, L.w, L.h, L.tone); }
    else { drawSphinx(L.x, L.y, L.w, L.h); }
  }
  function drawPyramid(x,y,w,h,tone){
    const baseY = y + h;
    ctx.fillStyle = shade(CSS('--sand2'), (tone-1)*100);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w/2, y);
    ctx.lineTo(x + w, baseY);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.beginPath();
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w, baseY);
    ctx.lineTo(x + w*0.62, baseY);
    ctx.closePath(); ctx.fill();
  }
  function drawSphinx(x,y,w,h){
    ctx.fillStyle = shade(CSS('--sand2'), -6);
    roundRect(ctx, x + w*0.1, y + h*0.35, w*0.8, h*0.5, 10, true, false); // body
    roundRect(ctx, x + w*0.15, y + h*0.48, w*0.35, h*0.25, 8, true, false); // chest
    roundRect(ctx, x + w*0.62, y + h*0.18, w*0.18, h*0.22, 6, true, false); // head
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    ctx.beginPath(); ctx.ellipse(x+w*0.5, y+h*0.88, w*0.45, h*0.1, 0, 0, Math.PI*2); ctx.fill();
  }

  function drawCamelTopDown(cx, cy, w, h){
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(cx, cy + h*0.32, w*0.55, h*0.16, 0, 0, Math.PI*2); ctx.fill();

    // body (ellipse)
    ctx.fillStyle = camel.color;
    ctx.beginPath(); ctx.ellipse(cx, cy, w*0.38, h*0.42, 0, 0, Math.PI*2); ctx.fill();

    // neck
    ctx.fillStyle = camel.shade;
    roundRect(ctx, cx - w*0.08, cy - h*0.45, w*0.16, h*0.22, 8, true, false);

    // head
    roundRect(ctx, cx - w*0.10, cy - h*0.60, w*0.20, h*0.14, 8, true, false);
    // muzzle
    roundRect(ctx, cx - w*0.06, cy - h*0.66, w*0.12, h*0.08, 6, true, false);
    // ears
    roundRect(ctx, cx - w*0.16, cy - h*0.62, w*0.06, h*0.06, 3, true, false);
    roundRect(ctx, cx + w*0.10, cy - h*0.62, w*0.06, h*0.06, 3, true, false);

    // legs (hints)
    ctx.fillStyle = camel.shade;
    roundRect(ctx, cx - w*0.26, cy + h*0.20, w*0.10, h*0.20, 8, true, false);
    roundRect(ctx, cx + w*0.16, cy + h*0.20, w*0.10, h*0.20, 8, true, false);
  }

  function drawObstacle(o){
    if (o.type === 'cactus'){
      ctx.fillStyle = CSS('--cactus');
      roundRect(ctx, o.x + o.w*0.22, o.y, o.w*0.38, o.h, 8, true, false); // trunk
      roundRect(ctx, o.x + o.w*0.02, o.y + o.h*0.28, o.w*0.24, o.h*0.35, 8, true, false);
      roundRect(ctx, o.x + o.w*0.62, o.y + o.h*0.20, o.w*0.24, o.h*0.42, 8, true, false);
    } else {
      ctx.fillStyle = CSS('--rock');
      roundRect(ctx, o.x, o.y + 8, o.w, o.h-8, 10, true, false);
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      roundRect(ctx, o.x + 6, o.y + 10, o.w*0.6, o.h*0.35, 6, true, false);
    }
  }

  function drawDate(d){
    ctx.fillStyle = CSS('--dateGlow');
    ctx.beginPath(); ctx.ellipse(d.x + d.w/2, d.y + d.h*0.9, d.w*0.6, d.h*0.25, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = CSS('--date');
    roundRect(ctx, d.x+2,  d.y+4, 10, 16, 5, true, false);
    roundRect(ctx, d.x+10, d.y+2, 10, 16, 5, true, false);
    roundRect(ctx, d.x+18, d.y+5, 10, 16, 5, true, false);
  }

  // ===== Geometry utils =====
  function hitRect(ax,ay,aw,ah, bx,by,bw,bh){
    return !(bx>ax+aw || bx+bw<ax || by>ay+ah || by+bh<ay);
  }
  function roundRect(ctx, x, y, w, h, r, fill, stroke){
    if (typeof r === 'number') r = {tl:r, tr:r, br:r, bl:r};
    ctx.beginPath();
    ctx.moveTo(x + r.tl, y);
    ctx.lineTo(x + w - r.tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
    ctx.lineTo(x + w, y + h - r.br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
    ctx.lineTo(x + r.bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
    ctx.lineTo(x, y + r.tl);
    ctx.quadraticCurveTo(x, y, x + r.tl, y);
    ctx.closePath();
    if (fill) ctx.fill(); if (stroke) ctx.stroke();
  }
  function shade(css, percent){
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = css; c.fillRect(0,0,1,1);
    let [r,g,b] = c.getImageData(0,0,1,1).data;
    const t = percent>=0 ? 255 : 0, p = Math.abs(percent)/100;
    r = Math.round((t-r)*p + r); g = Math.round((t-g)*p + g); b = Math.round((t-b)*p + b);
    return `rgb(${r},${g},${b})`;
  }

  // ===== Init: show landing =====
  playArea.classList.add('hidden'); landing.classList.remove('hidden');

  // ===== Game loop kick =====
  function drawOnceForLanding(){ draw(); requestAnimationFrame(drawOnceForLanding); }
  drawOnceForLanding();
})();
