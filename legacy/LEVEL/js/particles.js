/* === PARTICLES.JS: Particle Emitters, Physics & World Drawing === */
"use strict";

function spawnBoatDebris(x, y){
  for(let i=0; i<10; i++){
    parts.push({
      type: "woodPlank",
      x: x + (Math.random() - 0.5) * 0.14,
      y: y + (Math.random() - 0.5) * 0.14,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 6,
      w: 0.038 + Math.random() * 0.032,
      h: 0.012 + Math.random() * 0.008,
      col: Math.random() > 0.4 ? "#a9743f" : "#e8484f",
      t: 0,
      life: 10.0
    });
  }
  burst(x, y, "#ff7b6b", 18, 1.4);
  burst(x, y, "#ffffff", 22, 1.5);
  ring(x, y, "rgba(255,255,255,0.95)");
}

function burst(x,y,col,n,pow=1){
  const count = Math.min(n, parts.length > 60 ? 10 : 24);
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2;
    const v=rand(.05,.20)*pow;
    parts.push({type:"spark",x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,t:0,life:rand(.35,.75),col,r:rand(.005,.011)});
  }
}

function ring(x,y,col){
  if(parts.some(p => p.type === "ring" && Math.hypot(p.x - x, p.y - y) < 0.1 && p.t < 0.2)) return;
  parts.push({type:"ring",x,y,t:0,life:.6,col});
}

function floatTxt(x,y,txt,col){
  const hasRecent = parts.some(p => p.type === "txt" && p.txt === txt && p.t < 0.4);
  if(hasRecent) return;
  parts.push({type:"txt",x,y,t:0,life:1.2,txt,col});
}


function updateParticles(dt){
  for(let i=parts.length-1;i>=0;i--){
    const p=parts[i];
    p.t+=dt;
    if(p.t>=p.life){parts.splice(i,1);continue;}
    if(p.type==="woodPlank"){
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.vx*=(1 - dt * 1.5);p.vy*=(1 - dt * 1.5);
      if(p.vrot){ p.rot += p.vrot * dt; p.vrot *= (1 - dt * 1.5); }
    }

    if(p.type==="spark"){
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      p.vx*=.96;p.vy*=.96;
    }
  }

  for(let i=bubbles.length-1;i>=0;i--){
    bubbles[i].t+=dt;
    if(bubbles[i].t>1.5)bubbles.splice(i,1);
  }

}

function drawPartsWorld(){
  for(const p of parts){
    const k=1-p.t/p.life;

    if(p.type === "woodPlank"){
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.8));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillStyle = p.col || "#a9743f";
      rr(-p.w/2, -p.h/2, p.w, p.h, 0.003);
      ctx.fill();
      ctx.strokeStyle = "#5a3414";
      ctx.lineWidth = 0.0015;
      ctx.stroke();
      ctx.restore();
      continue;
    }

    if(p.type==="spark"){
      ctx.save();ctx.globalAlpha=k;ctx.fillStyle=p.col;
      star(p.x,p.y,p.r*(.5+k),p.t*6);ctx.fill();ctx.restore();

    }else if(p.type==="ring"){
      ctx.save();
      ctx.globalAlpha=k*.8;ctx.strokeStyle=p.col;ctx.lineWidth=.006*k+.002;
      ctx.beginPath();ctx.arc(p.x,p.y,(1-k)*.09+.015,0,Math.PI*2);ctx.stroke();
      ctx.restore();

    }else if(p.type==="fish"){
      const u=p.t/p.life,jump=Math.sin(u*Math.PI)*.07;
      ctx.save();ctx.translate(p.x+p.dx*u,p.y);

      ctx.fillStyle="rgba(0,30,40,.18)";
      ctx.beginPath();ctx.ellipse(0,.008,.02,.007,0,0,Math.PI*2);ctx.fill();

      ctx.translate(0,-jump);
      ctx.rotate(Math.atan2(-Math.cos(u*Math.PI),p.dx>0?1:-1));

      ctx.fillStyle="#9fd8ff";
      ctx.beginPath();ctx.ellipse(0,0,.022,.011,0,0,Math.PI*2);ctx.fill();
      ctx.beginPath();ctx.moveTo(-.02,0);ctx.lineTo(-.034,-.011);ctx.lineTo(-.034,.011);ctx.closePath();ctx.fill();

      ctx.fillStyle="#222";ctx.beginPath();ctx.arc(.012,-.003,.0025,0,Math.PI*2);ctx.fill();
      ctx.restore();

      if(u<.08||u>.93){
        ctx.save();ctx.globalAlpha=.5;ctx.strokeStyle="#fff";ctx.lineWidth=.003;
        ctx.beginPath();ctx.arc(p.x,p.y,.02,0,Math.PI*2);ctx.stroke();ctx.restore();
      }

    }else if(p.type==="waterBubble"){
      ctx.save();
      ctx.globalAlpha = k * 0.65;
      ctx.fillStyle = "rgba(220, 248, 255, 0.75)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.6 + k * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 0.0015;
      ctx.stroke();
      ctx.restore();
    }
  }
}

