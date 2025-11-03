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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene(); // no fog for max clarity

/* ==========
   CAMERA
   ========== */
const cam = new THREE.PerspectiveCamera(42, innerWidth/innerHeight, 0.1, 6000);
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
   LIGHTING
   ========== */
const hemi = new THREE.HemisphereLight('#cce6ff', '#05080f', 1.0);
scene.add(hemi);

const key = new THREE.DirectionalLight('#ffffff', 1.6);
key.position.set(600, 800, 380);
key.castShadow = true;
key.shadow.mapSize.set(2048,2048);
scene.add(key);

const rim = new THREE.DirectionalLight('#9ec8ff', 0.9);
rim.position.set(-800, 500, -500);
scene.add(rim);

/* ==========
   GALAXY BACKDROP
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
  grad.addColorStop(0,'rgba(120,180,255,0.5)');
  grad.addColorStop(1,'rgba(20,30,60,0.0)');
  g.fillStyle=grad; g.fillRect(0,0,s,s);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent:true, depthWrite:false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(1800,1800,1);
  spr.position.set(0, -60, 0);
  scene.add(spr);
}

/* ==========
   HUD DOM
   ========== */
const LEGEND_GENRES = document.getElementById('legend-genres');

/* ==========
   UTILS
   ========== */
const clamp = (v,a,b)=>Math.min(b,Math.max(a,v));
const lerp  = (a,b,t)=>a+(b-a)*t;

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
(function buildLegend(){
  // Franchise ring key (first row)
  const ring = document.createElement('div'); ring.className='ring-swatch';
  const ringLbl = document.createElement('div'); ringLbl.textContent = 'Franchise (yellow ring)';
  LEGEND_GENRES.append(ring, ringLbl);

  // Then genre colors
  for (const [k,v] of Object.entries(GENRE_COLORS)) {
    const sw = document.createElement('div'); sw.className='swatch'; sw.style.background=v;
    const label = document.createElement('div'); label.textContent = k;
    LEGEND_GENRES.append(sw, label);
  }
})();

/* ==========
   HIGH-VIS TEXT SPRITES (screen-constant + glow + always on top)
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
    s += '…';
  }
  const w = Math.ceil(ctx0.measureText(s).width) + padX*2;
  const h = fontSize + padY*2;

  const c = document.createElement('canvas'); c.width=w*2; c.height=h*2;
  const ctx = c.getContext('2d'); ctx.scale(2,2);

  if(panel){
    ctx.fillStyle=panelFill; roundRect(ctx,0,0,w,h,6); ctx.fill();
    ctx.strokeStyle=panelStroke; ctx.lineWidth=1; ctx.stroke();
  }

  // glow + outline
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
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
  mat.depthTest = false; // ALWAYS ON TOP
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
   GEOMETRY HELPERS
   ========== */
function makeSpoke(innerR, outerR, angle, radius=2.1, color='#324c7a'){
  const start = new THREE.Vector3(Math.cos(angle)*innerR, 0, Math.sin(angle)*innerR);
  const end   = new THREE.Vector3(Math.cos(angle)*outerR, 0, Math.sin(angle)*outerR);
  const curve = new THREE.LineCurve3(start, end);
  const geom = new THREE.TubeGeometry(curve, 16, radius, 8, false);
  const mat = new THREE.MeshStandardMaterial({ color, metalness:0.35, roughness:0.4 });
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
  const mat  = new THREE.LineBasicMaterial({ color:'#6fa7ff', transparent:true, opacity:0.7 });
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
  const rows = await loadCSV('./boxoffice_top50_roi.csv');
  const data = rows.map(r => ({
    Title: r.Title || r.title || 'Untitled',
    Worldwide_Gross: num(r.Worldwide_Gross || r.Gross || 0),
    Main_Genre: (r.Main_Genre || r.Genre || 'Other').split('/')[0],
    IMDb_Rating: num(r.IMDb_Rating || r.rating || 0),
    Year: parseInt(r.Year || 2000,10),
    Franchise: r.Franchise || r.franchise || 'Standalone' // not shown as label
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
    new THREE.MeshStandardMaterial({ color:'#1a2850', metalness:0.45, roughness:0.28 })
  );
  hub.rotation.x = Math.PI/2;
  scene.add(hub);

  // Years & angles
  const years = [...new Set(data.map(d=>d.Year))].sort((a,b)=>a-b);
  const yearAngle = new Map(years.map((y,i)=>[y, (i/years.length)*Math.PI*2]));
  const byYear = new Map(years.map(y=>[y, []]));
  data.forEach(d=>byYear.get(d.Year).push(d));

  // Inner ring year labels (inside hub)
  years.forEach(y=>{
    const a = yearAngle.get(y);
    const lbl = makeTextSprite(String(y), { fontSize:12, color:'#f0f6ff', panel:false, shadowColor:'rgba(255,255,255,0.5)', shadowBlur:8, strokeWidth:3 });
    lbl.position.set(Math.cos(a)*(innerHubR-40), 20, Math.sin(a)*(innerHubR-40));
    scene.add(lbl);
  });

  // Spokes + IMDb lines + ticks + numeric labels
  years.forEach(y=>{
    const a = yearAngle.get(y);

    scene.add( makeSpoke(innerHubR+1, maxR+8, a, 2.4, '#27436f') );
    scene.add( makeImdbLine(innerHubR, maxR, a) );

    for(let rVal = imdbMin; rVal <= imdbMax + 0.0001; rVal += 0.5){
      const rr = imdbToR(rVal);
      scene.add( makeTickDot(rr, a) );
      if (Math.abs((rVal*10) % 10) < 0.001){
        const tickLbl = makeTextSprite(`${rVal.toFixed(1)}`, {
          fontSize:12, color:'#b9d4ff', panel:false,
          shadowColor:'rgba(185,212,255,0.55)', shadowBlur:6, strokeWidth:3
        });
        const ddir = new THREE.Vector3(Math.cos(a),0,Math.sin(a));
        const posTick = ddir.multiplyScalar(rr).add(new THREE.Vector3(0, 14, 0));
        tickLbl.position.copy(posTick);
        scene.add(tickLbl);
      }
    }

    // small IMDb tag near hub
    const imdbTag = makeTextSprite('IMDb', { fontSize:11, color:'#a8c9ff', panel:false, shadowColor:'rgba(168,201,255,0.6)', shadowBlur:6, strokeWidth:3 });
    imdbTag.position.set(Math.cos(a)*(innerHubR+16), 12, Math.sin(a)*(innerHubR+16));
    scene.add(imdbTag);
  });

  // Planets + 3D movie title ABOVE only (NO franchise labels)
  data.forEach(d=>{
    const a = yearAngle.get(d.Year) ?? 0;
    const r = imdbToR(d.IMDb_Rating);

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(grossToSize(d.Worldwide_Gross), 36, 24),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(GENRE_COLORS[d.Main_Genre] || GENRE_COLORS['Other']),
        emissive: new THREE.Color(GENRE_COLORS[d.Main_Genre] || '#ffffff').multiplyScalar(0.12),
        metalness:0.55, roughness:0.25
      })
    );
    planet.position.set(Math.cos(a)*r, 6, Math.sin(a)*r);
    planet.castShadow = true;
    scene.add(planet);

    const titleLabel = makeTextSprite(d.Title, {
      fontSize:14, color:'#ffffff', panel:true, maxWidth:300,
      stroke:'#0a0e1a', strokeWidth:3, shadowColor:'rgba(255,255,255,0.6)', shadowBlur:8,
      panelFill:'rgba(10,15,28,0.96)', panelStroke:'rgba(150,180,255,0.95)'
    });
    titleLabel.position.set(planet.position.x, planet.position.y + 30, planet.position.z);
    scene.add(titleLabel);
  });

  // Per-year top IMDb: yellow halo ring (Franchise indicator)
  years.forEach(y=>{
    const group = byYear.get(y);
    if (!group?.length) return;
    const top = group.reduce((b,c)=> (c.IMDb_Rating>(b?.IMDb_Rating??-1))?c:b,null);
    const a = yearAngle.get(top.Year);
    const rTop = imdbToR(top.IMDb_Rating);
    const p = new THREE.Vector3(Math.cos(a)*rTop, 6, Math.sin(a)*rTop);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(14, 1.6, 12, 64),
      new THREE.MeshBasicMaterial({ color:'#ffe96f' })
    );
    halo.rotation.x = Math.PI/2; halo.position.copy(p);
    halo.renderOrder = 2;
    scene.add(halo);
  });

  fitAll(cam, scene, 1.12);
  animate();
}

function animate(){
  controls.update();
  // keep 3D sprites readable
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
  const res = await fetch(url);
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
