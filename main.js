import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/* ================
   RENDERER & SCENE
   ================ */
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = false;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = null;

/* ==========
   CAMERA
   ========== */
const cam = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 6000);
const orbitRadius = 950;
const tilt = THREE.MathUtils.degToRad(28);
const yaw  = THREE.MathUtils.degToRad(30);
cam.position.set(
  Math.cos(yaw)*Math.cos(tilt)*orbitRadius,
  Math.sin(tilt)*orbitRadius,
  Math.sin(yaw)*Math.cos(tilt)*orbitRadius
);
cam.lookAt(0,0,0);

const controls = new OrbitControls(cam, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = true;
controls.minDistance = 420;
controls.maxDistance = 2000;
controls.minPolarAngle = THREE.MathUtils.degToRad(10);
controls.maxPolarAngle = THREE.MathUtils.degToRad(80);

/* ==========
   BACKDROP
   ========== */
makeStars(3000, 2600, 1.6);
makeStars(1500, 1500, 2.4);
makeNebulaBillboard();

function makeStars(count, spread, size){
  const geom = new THREE.BufferGeometry();
  const pos = new Float32Array(count*3);
  for(let i=0;i<count;i++){
    const r = spread * (0.2 + Math.random()*0.8);
    const t = Math.random()*Math.PI*2;
    const p = (Math.random()-0.5)*0.9*Math.PI;
    pos[i*3+0] = Math.cos(t)*Math.cos(p)*r;
    pos[i*3+1] = Math.sin(p)*r*0.35;
    pos[i*3+2] = Math.sin(t)*Math.cos(p)*r;
  }
  geom.setAttribute('position', new THREE.BufferAttribute(pos,3));
  const mat = new THREE.PointsMaterial({ color:'#d9e8ff', size, transparent:true, opacity:0.95 });
  scene.add(new THREE.Points(geom, mat));
}
function makeNebulaBillboard(){
  const s = 1024;
  const c = document.createElement('canvas'); c.width=s; c.height=s;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(s/2,s/2,80,s/2,s/2,500);
  grad.addColorStop(0,'rgba(120,180,255,0.40)');
  grad.addColorStop(1,'rgba(20,30,60,0.0)');
  g.fillStyle=grad; g.fillRect(0,0,s,s);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true, depthWrite:false, depthTest:true });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(1800,1800,1);
  spr.position.set(0, -60, 0);
  scene.add(spr);
}

/* ==========
   UTILS
   ========== */
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
const lerp  = (a,b,t)=>a+(b-a)*t;

// robust boolean parser for CSV flags
function boolish(v){
  const s = String(v ?? '').trim().toLowerCase();
  if (s === '') return false;
  return ['1','y','yes','true','t'].includes(s);
}

const GENRE_COLORS = {
  'Action': '#ff5e5e',
  'Adventure': '#7ddcff',
  'Animation': '#ffd966',
  'Drama': '#88aaff',
  'Comedy': '#a8fca0',
  'Sci-Fi': '#c2a0ff',
  'Horror': '#ff99e8',
  'Crime': '#90f0ff',
  'Fantasy': '#deb6ff',
  'Family': '#fff59a',
  'Other': '#d1dae5'
};

/* ==========
   TEXT SPRITES
   ========== */
const LABEL_SPRITES = [];
function makeTextSprite(text, {
  fontSize=10,
  color='#ffffff',
  panel=true,
  maxWidth=260,
  stroke='#0a0e1a',
  strokeWidth=1,
  shadowColor='rgba(255,255,255,0.35)',
  shadowBlur=2,
  panelFill='rgba(10,15,28,0.96)',
  panelStroke='rgba(120,150,220,0.85)'
}={}){
  const padX = panel? 10:0, padY = panel? 4:0;
  const ctx0 = document.createElement('canvas').getContext('2d');
  ctx0.font = `800 ${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  let s = String(text);
  if (ctx0.measureText(s).width > maxWidth){
    while(s.length>0 && ctx0.measureText(s+'…').width>maxWidth) s=s.slice(0,-1);
    s+='…';
  }
  const w = Math.ceil(ctx0.measureText(s).width) + padX*2;
  const h = fontSize + padY*2;

  const c = document.createElement('canvas'); c.width=w*2; c.height=h*2;
  const ctx = c.getContext('2d'); ctx.scale(2,2);

  if(panel){
    ctx.fillStyle=panelFill; roundRect(ctx,0,0,w,h,6); ctx.fill();
    ctx.strokeStyle=panelStroke; ctx.lineWidth=1; ctx.stroke();
  }

  ctx.shadowColor = shadowColor;
  ctx.shadowBlur  = shadowBlur;
  ctx.lineJoin = 'round';
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = stroke;
  ctx.font = `800 ${fontSize}px Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  ctx.textBaseline='top';
  ctx.strokeText(s, padX, padY);
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.fillText(s, padX, padY);

  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true, depthWrite:false });
  mat.depthTest = false;
  const spr = new THREE.Sprite(mat);
  spr.renderOrder = 999;
  spr.userData.pixelW=w; spr.userData.pixelH=h;
  LABEL_SPRITES.push(spr);
  return spr;
}
function setSpritePixelSize(sprite){
  const distance = cam.position.distanceTo(sprite.getWorldPosition(new THREE.Vector3()));
  const vFov = cam.fov * Math.PI/180;
  const worldScreenHeight = 2 * Math.tan(vFov/2) * distance;
  const worldPerPixel = worldScreenHeight / renderer.domElement.clientHeight;
  sprite.scale.set(sprite.userData.pixelW * worldPerPixel, sprite.userData.pixelH * worldPerPixel, 1);
}
function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

/* ==========
   GEOMETRY HELPERS (UNLIT)
   ========== */
function makeSpoke(innerR, outerR, angle, radius=2.4, color='#27436f'){
  const start = new THREE.Vector3(Math.cos(angle)*innerR, 0, Math.sin(angle)*innerR);
  const end   = new THREE.Vector3(Math.cos(angle)*outerR, 0, Math.sin(angle)*outerR);
  const curve = new THREE.LineCurve3(start, end);
  const geom = new THREE.TubeGeometry(curve, 16, radius, 8, false);
  const mat  = new THREE.MeshBasicMaterial({ color });
  return new THREE.Mesh(geom, mat);
}
function makeTickDot(radius, angle){
  const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const p = dir.multiplyScalar(radius);
  const dot = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), new THREE.MeshBasicMaterial({ color:'#a0cfff' }));
  dot.position.copy(p).add(new THREE.Vector3(0, 0.4, 0));
  return dot;
}
function makeImdbLine(innerR, outerR, angle){
  const a = angle;
  const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const p0  = dir.clone().multiplyScalar(innerR+12);
  const p1  = dir.clone().multiplyScalar(outerR);
  const geom = new THREE.BufferGeometry().setFromPoints([p0, p1]);
  const mat  = new THREE.LineBasicMaterial({ color:'#6fa7ff', transparent:true, opacity:0.9 });
  const line = new THREE.Line(geom, mat);
  line.renderOrder = 5;
  return line;
}

/* ==========
   BUILD
   ========== */
init();
window.addEventListener('resize', onResize);

async function init(){
  // base-aware path (Vite/Vercel subpaths)
  const CSV_URL = `${import.meta.env.BASE_URL}boxoffice_top50_roi.csv`;
  const rows = await loadCSV(CSV_URL);

  const data = rows.map(r => ({
    Title: r.Title || r.title || 'Untitled',
    Worldwide_Gross: num(r.Worldwide_Gross || r.Gross || 0),
    Main_Genre: (r.Main_Genre || r.Genre || 'Other').split('/')[0],
    IMDb_Rating: num(r.IMDb_Rating || r.rating || 0),
    Year: parseInt(r.Year || 2000,10),
    Franchise: r.Franchise || r.franchise || 'Standalone',
    // robustly detect franchise flag
    Is_Franchise: boolish(r.Is_Franchise ?? r.is_franchise ?? r.Franchise_Flag ?? r.isFranchise ?? r.franchise_flag ?? r.IsSeries)
  }));

  // Domains
  const imdbVals  = data.map(d=>d.IMDb_Rating).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
  const grossVals = data.map(d=>d.Worldwide_Gross).filter(n=>!isNaN(n)).sort((a,b)=>a-b);
  const q = (arr,p)=>arr[Math.floor(clamp(p,0,0.999)*arr.length)];
  const imdbMin = Math.floor(q(imdbVals,0.00)*2)/2;
  const imdbMax = Math.ceil(q(imdbVals,0.98)*2)/2;
  const grossMin = q(grossVals,0.05), grossMax = q(grossVals,0.95);

  const innerHubR = 110;
  const maxR = 460;
  const imdbToR = v => lerp(innerHubR+12, maxR, (clamp(v,imdbMin,imdbMax)-imdbMin)/((imdbMax-imdbMin)||1));
  const grossToSize = v => lerp(7, 22, Math.cbrt((clamp(v,grossMin,grossMax)-grossMin)/((grossMax-grossMin)||1)));

  // Hub ring
  const hub = new THREE.Mesh(
    new THREE.TorusGeometry(innerHubR, 9, 24, 220),
    new THREE.MeshBasicMaterial({ color:'#1a2850' })
  );
  hub.rotation.x = Math.PI/2;
  scene.add(hub);

  // Years & angles
  const years = [...new Set(data.map(d=>d.Year))].sort((a,b)=>a-b);
  const yearAngle = new Map(years.map((y,i)=>[y, (i/years.length)*Math.PI*2]));

  // Inner ring year labels + spokes + imdb ticks
  years.forEach(y=>{
    const a = yearAngle.get(y);

    const lbl = makeTextSprite(String(y), { fontSize:12, color:'#f0f6ff', panel:false, shadowColor:'rgba(255,255,255,0.35)', shadowBlur:4, strokeWidth:3 });
    lbl.position.set(Math.cos(a)*(innerHubR-40), 20, Math.sin(a)*(innerHubR-40));
    scene.add(lbl);

    scene.add( makeSpoke(innerHubR+1, maxR+8, a) );
    scene.add( makeImdbLine(innerHubR, maxR, a) );

    for(let rVal = imdbMin; rVal <= imdbMax + 0.0001; rVal += 0.5){
      const rr = imdbToR(rVal);
      scene.add( makeTickDot(rr, a) );
      if (Math.abs((rVal*10) % 10) < 0.001){
        const tickLbl = makeTextSprite(`${rVal.toFixed(1)}`, {
          fontSize:12, color:'#b9d4ff', panel:false,
          shadowColor:'rgba(185,212,255,0.5)', shadowBlur:4, strokeWidth:3
        });
        const ddir = new THREE.Vector3(Math.cos(a),0,Math.sin(a));
        const posTick = ddir.multiplyScalar(rr).add(new THREE.Vector3(0, 14, 0));
        tickLbl.position.copy(posTick);
        scene.add(tickLbl);
      }
    }

    const imdbTag = makeTextSprite('IMDb', { fontSize:11, color:'#a8c9ff', panel:false, shadowColor:'rgba(168,201,255,0.5)', shadowBlur:4, strokeWidth:3 });
    imdbTag.position.set(Math.cos(a)*(innerHubR+16), 12, Math.sin(a)*(innerHubR+16));
    scene.add(imdbTag);
  });

  // Planets + labels + FRANCHISE RING per movie
  data.forEach(d=>{
    const a = yearAngle.get(d.Year) ?? 0;
    const r = imdbToR(d.IMDb_Rating);

    const size = grossToSize(d.Worldwide_Gross);
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(size, 36, 24),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(GENRE_COLORS[d.Main_Genre] || GENRE_COLORS['Other']) })
    );
    planet.position.set(Math.cos(a)*r, 6, Math.sin(a)*r);
    scene.add(planet);

    // Franchise ring: ONLY if Is_Franchise is true
    if (d.Is_Franchise) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(size + 4, 1.6, 12, 64),
        new THREE.MeshBasicMaterial({ color:'#ffe96f' })
      );
      ring.rotation.x = Math.PI/2;
      ring.position.copy(planet.position);
      ring.renderOrder = 2;
      scene.add(ring);
    }

    const titleLabel = makeTextSprite(d.Title, {
      fontSize:14, color:'#ffffff', panel:true, maxWidth:300,
      stroke:'#0a0e1a', strokeWidth:3, shadowColor:'rgba(255,255,255,0.5)', shadowBlur:0,
      panelFill:'rgba(10,15,28,0.96)', panelStroke:'rgba(150,180,255,0.95)'
    });
    titleLabel.position.set(planet.position.x, planet.position.y + 30, planet.position.z);
    scene.add(titleLabel);
  });

  // Build legend (franchise ring + genre swatches)
  buildLegend();

  fitAll(cam, scene, 1.12);
  animate();
}

function buildLegend(){
  const el = document.getElementById('legend-genres');
  if (!el) return;

  // Franchise (ring)
  const ringCell = document.createElement('div');
  ringCell.innerHTML = `<div class="ring-swatch"></div>`;
  const ringText = document.createElement('div');
  ringText.textContent = 'Franchise movie';
  el.appendChild(ringCell);
  el.appendChild(ringText);

  // Genres
  Object.entries(GENRE_COLORS).forEach(([g, col])=>{
    const sw = document.createElement('div');
    sw.className = 'swatch';
    sw.style.background = col;
    const tx = document.createElement('div');
    tx.textContent = g;
    el.appendChild(sw);
    el.appendChild(tx);
  });
}

function animate(){
  controls.update();
  for (const spr of LABEL_SPRITES) setSpritePixelSize(spr);
  renderer.render(scene, cam);
  requestAnimationFrame(animate);
}

/* ==========
   HELPERS
   ========== */
function onResize(){
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function fitAll(camera, object, padding=1.1){
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const radius = 0.5*Math.max(size.x, size.z)*padding;
  const fov = THREE.MathUtils.degToRad(camera.fov);
  const dist = radius / Math.tan(fov/2);
  const dir = camera.getWorldDirection(new THREE.Vector3()).clone().multiplyScalar(-1);
  camera.position.copy(center.clone().add(dir.multiplyScalar(dist+200)));
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
}

async function loadCSV(url){
  const res = await fetch(url, { cache: 'no-cache' });
  if(!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const text = await res.text();
  return parseCSV(text);
}
function parseCSV(text){
  const lines = text.trim().split('\n');
  const headers = splitCSVLine(lines.shift());
  return lines.filter(l=>l.trim().length).map(line=>{
    const cols = splitCSVLine(line);
    const obj={};
    headers.forEach((h,i)=> obj[h.trim()] = (cols[i]??'').trim());
    return obj;
  });
}
function splitCSVLine(line){
  const out=[]; let cur=''; let inQ=false;
  for(let i=0;i<line.length;i++){
    const ch=line[i];
    if(ch==='"'){ if(inQ && line[i+1]==='"'){cur+='"'; i++;} else inQ=!inQ; }
    else if(ch===',' && !inQ){ out.push(cur); cur=''; }
    else cur+=ch;
  }
  out.push(cur); return out;
}
function num(v){ return Number(String(v).replace(/[^\d.-]/g,''))||0; }
