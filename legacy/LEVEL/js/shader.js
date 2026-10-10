/* === SHADER.JS: WebGL Water Simulation & 2D Canvas Fallback === */
"use strict";

/* ---------- WebGL ---------- */
const VS = `
attribute vec2 a;
void main(){gl_Position=vec4(a,0.0,1.0);}
`;

const FS = `
precision highp float;
uniform vec2 R;
uniform float T;
uniform float F[8];
uniform vec3 rp[8];
uniform vec2 cam;
uniform float A;
uniform float uZoom;
uniform vec3 uIsl[6];
uniform vec3 uWaterDeep;
uniform vec3 uWaterShallow;
uniform vec3 uSkyReflect;

float hs(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}
float nz(vec2 p){
  vec2 i=floor(p),f=fract(p);
  f=f*f*(3.0-2.0*f);
  return mix(
    mix(hs(i),hs(i+vec2(1.0,0.0)),f.x),
    mix(hs(i+vec2(0.0,1.0)),hs(i+vec2(1.0,1.0)),f.x),
    f.y
  );
}
float fbm(vec2 p){
  float a=.5,s=0.0;
  for(int i=0;i<4;i++){
    s+=a*nz(p);
    p=p*2.03+7.1;
    a*=.5;
  }
  return s/.94;
}
float shore(vec2 yv){
  float y=yv.y;
  return A*.33+.07*sin(y*4.0+.5)+.03*sin(y*10.0+2.0)+.015*sin(y*27.0);
}
float distToBeach(vec2 p){
  return (F[1]>.5) ? p.x-shore(p) : .4;
}
float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
float distToCoast(vec2 p){
  float dCoast = distToBeach(p);
  for(int i=0; i<6; i++){
    if(uIsl[i].z > 0.001){
      float dIsl = length(p - uIsl[i].xy) - uIsl[i].z;
      dCoast = smin(dCoast, dIsl, 0.24);
    }
  }
  return dCoast;
}
float distToShore(vec2 p){
  return distToCoast(p);
}
float phaseWave(vec2 p){
  float dd=max(distToCoast(p),0.0);
  float w=fbm(p*3.0+T*.05)*3.0;
  return 20.0*pow(dd+.01,.6)-T*1.4+w+(F[1]>.5?0.0:p.x*6.0);
}
float waterHeight(vec2 p){
  float dd=max(distToShore(p),0.0);
  float s=sin(phaseWave(p))*.5+.5;
  s*=s;
  float h=s*smoothstep(0.0,.05,dd)*F[0];
  h+=.12*(fbm(p*22.0+vec2(T*.4,T*.2))-.5)*F[0];

  for(int i=0;i<8;i++){
    float age=T-rp[i].z;
    if(age>0.0 && age<4.0){
      float d=length(p-rp[i].xy);
      h+=sin(d*70.0-age*11.0)*exp(-d*7.0)*exp(-age*.9)*.5*F[6];
    }
  }
  return h;
}
float caust(vec2 uv){
  vec2 p=mod(uv*6.28318,6.28318)-3.14159;
  vec2 i=p;
  float c=1.0,k=.005;
  for(int n=0;n<5;n++){
    float t=T*.5*(1.0-3.5/float(n+1));
    i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x));
    float sx=sin(i.x+t);
    float cy=cos(i.y+t);
    float divX = abs(sx) < .001 ? (sx >= 0.0 ? .001 : -.001) : sx;
    float divY = abs(cy) < .001 ? (cy >= 0.0 ? .001 : -.001) : cy;
    vec2 q=vec2(p.x/divX, p.y/divY);
    c+=1.0/length(q/k+vec2(.0001));
  }
  c/=5.0;
  c=1.17-pow(max(c, 0.0),1.4);
  return pow(abs(c),8.0);
}
vec3 sand(vec2 p,float wet){
  vec3 s=vec3(.83,.69,.47)*(.86+.22*fbm(p*70.0));
  s*=.96+.04*sin(p.x*90.0+fbm(p*6.0)*8.0);
  s+=(hs(floor(p*900.0))-.5)*.05;
  return mix(s,s*.55,wet);
}

void main(){
  vec2 p=gl_FragCoord.xy/(R.y*uZoom);
  p.y=1.0/uZoom-p.y;
  vec2 w=p+cam;

  float dBeach=distToBeach(w);
  float d=distToShore(w);
  float sw=(F[1]>.5)
    ? (.02+.04*(.5+.5*sin(w.y*2.0-T*1.4+fbm(vec2(w.y*3.0,T*.1))*4.0)))*F[0]
    : 0.0;

  float e=d+sw;
  float th=max(e,0.0)*(.8+.6*fbm(w*2.5+3.0));

  float h=waterHeight(w);
  float ee=.0035;
  vec2 grad=vec2(
    waterHeight(w+vec2(ee,0.0))-h,
    waterHeight(w+vec2(0.0,ee))-h
  )/ee;

  vec2 q=w+grad*.012*F[3]*min(th*4.0,1.0);

  vec3 bed=sand(q,.6);

  if(F[4]>.5){
    bed+=caust(q*3.0)*.6*(1.0-smoothstep(.12,.5,th));
  }

  vec3 tr=(F[2]>.5)
    ? exp(-th*vec3(6.0,2.0,1.6))
    : vec3(.4);

  vec3 dc=(F[2]>.5)
    ? mix(uWaterShallow, uWaterDeep, smoothstep(.1,.9,th))
    : uWaterDeep;

  vec3 col=bed*tr+dc*(1.0-tr);

  vec3 L=normalize(vec3(-.4,.6,.7));
  vec3 nn=normalize(vec3(-grad*.35,1.0));

  if(F[7]>.5){
    col*=.85+.3*dot(nn,L);
    float fr=.05+.9*pow(1.0-nn.z,5.0);
    col=mix(col, uSkyReflect, clamp(fr+.04,0.0,.6));
    col+=pow(max(dot(nn,normalize(L+vec3(0.0,0.0,1.0))),0.0),260.0)*1.6;
  }

  if(F[5]>.5){
    float ph=phaseWave(w);
    float tex=smoothstep(.42,.72,fbm(w*45.0+vec2(T*.15,0.0)));
    float mask=smoothstep(.6,.05,max(d,0.0))*smoothstep(0.0,.03,max(d,0.0));
    float f=(smoothstep(.42,.72,sin(ph))+.35*smoothstep(.2,.9,sin(ph-1.0)))*tex*mask*1.4;
    f+=(smoothstep(.02,0.0,abs(e-.004))+.6*smoothstep(.05,0.0,abs(e-.025))*tex);
    col=mix(col,vec3(1.0),clamp(f,0.0,.95));
  }

  // Only render procedural beach sand for the western mainland shore
  float eBeach = dBeach + sw;
  float wet=smoothstep(-.08,0.0,eBeach);
  vec3 land=sand(w,wet*.9);
  float wa=(F[1]>.5)?smoothstep(0.0,.012,eBeach):1.0;
  col=mix(land,col,wa);

  gl_FragColor=vec4(col,1.0);
}
`;

let prog=null, uR=null,uT=null,uF=null,uRp=null,uCam=null,uA=null,uZoom=null,uIsl=null;
let uWaterDeep=null, uWaterShallow=null, uSkyReflect=null;

function compileShader(type,src){
  if(!gl) return null;
  const sh=gl.createShader(type);
  gl.shaderSource(sh,src);
  gl.compileShader(sh);
  if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){
    const info=gl.getShaderInfoLog(sh)||"unknown shader error";
    console.error(info);
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function initGL(){
  if(!gl){
    if(statusEl) statusEl.textContent="Canvas 2D fallback";
    return false;
  }
  const vs=compileShader(gl.VERTEX_SHADER,VS);
  const fs=compileShader(gl.FRAGMENT_SHADER,FS);
  if(!vs||!fs){
    if(statusEl) statusEl.textContent="Canvas 2D fallback";
    gl=null;
    return false;
  }

  prog=gl.createProgram();
  gl.attachShader(prog,vs);
  gl.attachShader(prog,fs);
  gl.linkProgram(prog);

  if(!gl.getProgramParameter(prog,gl.LINK_STATUS)){
    console.error(gl.getProgramInfoLog(prog)||"WebGL program link failed");
    prog=null;
    if(statusEl) statusEl.textContent="Canvas 2D fallback";
    gl=null;
    return false;
  }

  gl.useProgram(prog);

  const buf=gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1,-1,1,-1,-1,1,1,1]),
    gl.STATIC_DRAW
  );

  const aLoc=gl.getAttribLocation(prog,"a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc,2,gl.FLOAT,false,0,0);

  uR=gl.getUniformLocation(prog,"R");
  uT=gl.getUniformLocation(prog,"T");
  uF=gl.getUniformLocation(prog,"F[0]");
  uRp=gl.getUniformLocation(prog,"rp[0]");
  uCam=gl.getUniformLocation(prog,"cam");
  uA=gl.getUniformLocation(prog,"A");
  uZoom=gl.getUniformLocation(prog,"uZoom");
  uIsl=gl.getUniformLocation(prog,"uIsl[0]");
  uWaterDeep=gl.getUniformLocation(prog,"uWaterDeep");
  uWaterShallow=gl.getUniformLocation(prog,"uWaterShallow");
  uSkyReflect=gl.getUniformLocation(prog,"uSkyReflect");

  if(statusEl) statusEl.textContent="WebGL + Canvas 2D";
  return true;
}

let webglOK=initGL();

if(webglOK && gl){
  cv.addEventListener("webglcontextlost",e=>{
    e.preventDefault();
    webglOK=false;
    if(statusEl) statusEl.textContent="WebGL lost — Canvas 2D fallback";
  });
}


/* ---------- fallback sea ---------- */
function draw2DSea(t){
  const w=innerWidth,h=innerHeight;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const sky=ctx.createLinearGradient(0,0,0,h);
  if(currentLevel === 1){
    sky.addColorStop(0,"#69b8f4");
    sky.addColorStop(.45,"#38a7c8");
    sky.addColorStop(1,"#0a557a");
  } else if(currentLevel === 2){
    sky.addColorStop(0,"#32527b");
    sky.addColorStop(.45,"#1a3459");
    sky.addColorStop(1,"#08162d");
  } else {
    sky.addColorStop(0,"#d97736");
    sky.addColorStop(.45,"#743d69");
    sky.addColorStop(1,"#1a1033");
  }
  ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);

  const shPx=shoreAt(cam.y+.5/zoom);
  const sx=(shPx-cam.x)*h*zoom;

  ctx.fillStyle="#e4c48b";
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.lineTo(Math.max(0,sx),0);
  ctx.lineTo(Math.max(0,sx),h);
  for(let y=h;y>=0;y-=8){
    const wy=cam.y+y/(h*zoom);
    ctx.lineTo((shoreAt(wy)-cam.x)*h*zoom,y);
  }
  ctx.closePath();ctx.fill();

  const grd=ctx.createLinearGradient(0,0,0,h);
  grd.addColorStop(0,"rgba(65,190,210,.1)");
  grd.addColorStop(1,"rgba(0,30,80,.2)");
  ctx.fillStyle=grd;ctx.fillRect(0,0,w,h);

  for(let i=0;i<16;i++){
    const y=(i/16*h+(t*30)%40);
    ctx.strokeStyle="rgba(255,255,255,.08)";
    ctx.lineWidth=1.5;
    ctx.beginPath();
    ctx.moveTo(Math.max(0,sx),y);
    ctx.lineTo(w,y+Math.sin(t+i)*8);
    ctx.stroke();
  }
}


