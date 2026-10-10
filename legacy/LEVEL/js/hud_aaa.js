
/*
============================================================
 KID OF THE SEA — FULL AAA TRANSPARENT HUD
 -----------------------------------------------------------
 Pure HTML/CSS/JS. No image and no external libraries.

 EASY ENGINE INTEGRATION:
   BoatHUD.setBoatPosition(42, 54)
   BoatHUD.setHeading(35)
   BoatHUD.setTarget(73, 21)
   BoatHUD.setRouteAngle(-22)
   BoatHUD.setDestinationDistance(120)

 The HUD is transparent, so place this file over your game.
============================================================
*/

(() => {
  const $ = id => document.getElementById(id);

  let speed = 1.0;
  let sail = false;
  let heading = 0;

  const toast = msg => {
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 1000);
  };

  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }

  /* ---------- public API ---------- */
  window.BoatHUD = {

    // Boat center in viewport percentage.
    setBoatPosition(xPercent, yPercent){
      const el = $('boatRing');
      if (el) {
        el.style.left = `${xPercent}%`;
        el.style.top  = `${yPercent}%`;
      }
      const nav = $('navPath');
      if (nav) {
        nav.style.left = `${xPercent}%`;
        nav.style.top  = `${yPercent}%`;
      }
    },

    // Destination beacon in viewport percentage.
    setTarget(xPercent, yPercent){
      const el = $('targetBeacon');
      if (el) {
        el.style.left = `${xPercent}%`;
        el.style.top  = `${yPercent}%`;
      }
    },

    // Rotate heading/needle in degrees.
    setHeading(degrees){
      heading = Number(degrees) || 0;
      const needle = $('headingNeedle');
      if (needle) {
        needle.style.transform = `translate(-50%,-100%) rotate(${heading}deg)`;
      }
      const arrow = $('directionArrow');
      if (arrow) {
        arrow.style.transform = `rotate(${heading}deg)`;
      }
      const cone = document.querySelector('.boat-light-cone');
      if (cone) {
        cone.style.transformOrigin = "-15px 50%";
        cone.style.transform = `translateY(-50%) rotate(${heading}deg)`;
      }
    },

    // Rotate the projected navigation route.
    setRouteAngle(degrees){
      const el = $('navPath');
      if (el) {
        el.style.transform = `rotate(${Number(degrees)||0}deg)`;
      }
    },

    // Destination distance shown in status.
    setDestinationDistance(meters){
      const d = Number(meters) || 0;
      const el = $('destination');
      if (el) {
        el.dataset.distance = `${Math.round(d)} m`;
        const sub = el.querySelector('.label-sub');
        if (sub) sub.textContent = `${Math.round(d)}m to destination`;
      }
    },

    setSpeed(value){
      speed = clamp(Number(value)||1,0.1,5);
      const el = $('speedText');
      if (el) el.textContent = `SPEED ${speed.toFixed(1)}x`;
    },

    setSail(enabled){
      sail = !!enabled;
      const el = $('sailState');
      if (el) el.textContent = sail ? 'SAIL ON' : 'SAIL OFF';
    },

    setMiniMapPosition(xPercent,yPercent){
      const map = $('miniMap');
      const p = map ? map.querySelector('.mini-player') : null;
      if (p) {
        const x = clamp(Number(xPercent)||50,5,95);
        const y = clamp(Number(yPercent)||50,5,95);
        p.style.left = x+'%';
        p.style.top = y+'%';
      }
    },

    setMiniMapTarget(xPercent,yPercent){
      const map = $('miniMap');
      const p = map ? map.querySelector('.mini-target') : null;
      if (p) {
        p.style.left = clamp(Number(xPercent)||50,5,95)+'%';
        p.style.top  = clamp(Number(yPercent)||50,5,95)+'%';
      }
    },

    showRoute(show=true){
      const el = $('navPath');
      if (el) el.style.display = show ? '' : 'none';
    },

    showMiniMap(show=true){
      const m = $('miniMap');
      if (m) m.style.display = show ? '' : 'none';
      const leg = $('miniLegend');
      if (leg) leg.style.display = show ? '' : 'none';
    },

    showDirection(show=true){
      const di = $('directionInfo');
      if (di) di.style.display = show ? '' : 'none';
      const br = $('boatRing');
      if (br) br.style.display = show ? '' : 'none';
    },

    showControls(show=true){
      ['joystick','btnBoost','btnDolphin','btnKick'].forEach(id => {
        const el = $(id);
        if (el) {
          if (id === 'btnDolphin') {
            const unlocked = (typeof currentLevel !== 'undefined' && currentLevel > 1) || 
              (typeof player !== 'undefined' && player && (player.boatDestroyed || player.dolphinRescueUsed || player.onDolphin));
            el.style.display = (show && unlocked) ? '' : 'none';
          } else {
            el.style.display = show ? '' : 'none';
          }
        }
      });
    },

    showNavigation(show=true){
      ['destination','targetBeacon','navPath','navInfo'].forEach(id => {
        const el = $(id);
        if (el) el.style.display = show ? '' : 'none';
      });
    }
  };


  /* ---------- virtual joystick ---------- */
  const joy = $('joystick');
  const stick = $('stick');
  let drag = false;

  if (joy && stick) {
    function joystickMove(clientX,clientY){
      const r = joy.getBoundingClientRect();
      const cx = r.left+r.width/2;
      const cy = r.top+r.height/2;
      let dx = clientX-cx;
      let dy = clientY-cy;
      const max = r.width*.285;
      const d = Math.hypot(dx,dy);
      if(d>max){
        dx = dx/d*max;
        dy = dy/d*max;
      }
      stick.style.left = `calc(50% + ${dx}px)`;
      stick.style.top  = `calc(50% + ${dy}px)`;

      window.dispatchEvent(new CustomEvent('boathud:move',{
        detail:{
          x:Number((dx/max).toFixed(3)),
          y:Number((-dy/max).toFixed(3))
        }
      }));
    }

    joy.addEventListener('pointerdown',e=>{
      drag=true;
      joy.setPointerCapture(e.pointerId);
      joystickMove(e.clientX,e.clientY);
    });
    joy.addEventListener('pointermove',e=>{
      if(drag) joystickMove(e.clientX,e.clientY);
    });
    function resetJoystick(){
      drag=false;
      stick.style.left='50%';
      stick.style.top='50%';
      window.dispatchEvent(new CustomEvent('boathud:move',{detail:{x:0,y:0}}));
    }
    joy.addEventListener('pointerup',resetJoystick);
    joy.addEventListener('pointercancel',resetJoystick);
  }


  /* ---------- auto-dismiss guide callout panels on interaction ---------- */
  let guideDismissed = false;
  function dismissGuideCallouts() {
    if (guideDismissed) return;
    guideDismissed = true;
    document.querySelectorAll('.guide-callout').forEach(el => {
      el.classList.add('dismissed');
    });
  }

  window.addEventListener('boathud:move', (e) => {
    if (e.detail && (Math.abs(e.detail.x) > 0.05 || Math.abs(e.detail.y) > 0.05)) {
      dismissGuideCallouts();
    }
  });

  window.addEventListener('keydown', (e) => {
    if (["KeyW","KeyA","KeyS","KeyD","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Space"].includes(e.code)) {
      dismissGuideCallouts();
    }
  });

  window.addEventListener('pointerdown', (e) => {
    if (e.target && e.target.closest && (e.target.closest('#joystick') || e.target.closest('.control-btn'))) {
      dismissGuideCallouts();
    }
  });

  BoatHUD.toggleGuide = function(show) {
    document.querySelectorAll('.guide-callout').forEach(el => {
      if (show) el.classList.remove('dismissed');
      else el.classList.add('dismissed');
    });
  };

  /* ---------- default layout ---------- */
  BoatHUD.setBoatPosition(43,54);
  BoatHUD.setTarget(73,21);
  BoatHUD.setHeading(0);
})();
