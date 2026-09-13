import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.1/build/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.181.1/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'https://cdn.jsdelivr.net/npm/three@0.181.1/examples/jsm/loaders/GLTFLoader.js';

const root=document.querySelector('#scene');
const toast=document.querySelector('#toast');
const cinematic=document.querySelector('#cinematic');
const captureButton=document.querySelector('#capture');
let captureRequested=false;
function captureRealFrame(){captureRequested=true;}
const autoCapture=new URLSearchParams(location.search).get('capture')==='1';
let autoCaptureArmed=autoCapture;
const boot=document.querySelector('#boot');
const bootProgress=document.querySelector('#boot-progress');
const bootStatus=document.querySelector('#boot-status');
const bootSet=(n,msg)=>{bootProgress.style.width=Math.round(n*100)+'%';bootStatus.textContent=msg};
bootSet(.03,'Waking the crossing…');

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x18231f);
scene.fog=new THREE.FogExp2(0x6f8279,.00265);

const camera=new THREE.PerspectiveCamera(40,innerWidth/innerHeight,.1,1400);
camera.position.set(42,52,46);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
renderer.physicallyCorrectLights=true;
renderer.domElement.style.touchAction='none';
root.appendChild(renderer.domElement);

const controls=new OrbitControls(camera,renderer.domElement);
controls.target.set(0,0,0);controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.06;
controls.minDistance=19;controls.maxDistance=68;controls.minPolarAngle=.62;controls.maxPolarAngle=1.22;controls.rotateSpeed=.34;

const hemi=new THREE.HemisphereLight(0xd9e8df,0x29221f,1.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffdfaa,4.7);sun.position.set(-58,86,42);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-95;sun.shadow.camera.right=95;sun.shadow.camera.top=95;sun.shadow.camera.bottom=-95;sun.shadow.bias=-.00022;scene.add(sun);
const fill=new THREE.DirectionalLight(0x84a8bd,1.0);fill.position.set(45,34,-55);scene.add(fill);
const moon=new THREE.DirectionalLight(0x5f79a4,.18);moon.position.set(30,50,-45);scene.add(moon);

const sky=new THREE.Mesh(new THREE.SphereGeometry(520,32,18),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x213e49)},mid:{value:new THREE.Color(0x78908c)},horizon:{value:new THREE.Color(0xcab98d)},sun:{value:new THREE.Color(0xffd39a)}},vertexShader:'varying vec3 vN;void main(){vN=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform vec3 top;uniform vec3 mid;uniform vec3 horizon;uniform vec3 sun;varying vec3 vN;void main(){float h=max(vN.y,0.0);vec3 c=mix(horizon,mid,smoothstep(0.0,.35,h));c=mix(c,top,smoothstep(.35,.92,h));float s=pow(max(dot(vN,normalize(vec3(-.38,.72,.45))),0.0),96.0);c+=sun*s*.72;gl_FragColor=vec4(c,1.0);}'}));
scene.add(sky);

const loader=new THREE.TextureLoader();
function tex(path,repeat){const t=loader.load(path);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(...repeat);t.colorSpace=THREE.SRGBColorSpace;return t}
const grass=tex('./assets/grass.png',[27,27]);
const cobble=tex('./assets/cobble.png',[5.5,5.5]);
const roof=tex('./assets/roof.png',[1.7,1.7]);
const grassNormal=tex('./assets/grass_normal.jpg',[27,27]);
const cobbleNormal=tex('./assets/cobble_normal.jpg',[5.5,5.5]);
const roofNormal=tex('./assets/roof_normal.jpg',[1.7,1.7]);
grassNormal.colorSpace=THREE.NoColorSpace;cobbleNormal.colorSpace=THREE.NoColorSpace;roofNormal.colorSpace=THREE.NoColorSpace;
const MAT={
 grass:new THREE.MeshStandardMaterial({map:grass,normalMap:grassNormal,normalScale:new THREE.Vector2(.32,.32),roughness:.98}),road:new THREE.MeshStandardMaterial({map:cobble,normalMap:cobbleNormal,normalScale:new THREE.Vector2(.55,.55),roughness:.94}),
 water:new THREE.MeshPhysicalMaterial({color:0x176270,roughness:.08,metalness:.04,transmission:.08,clearcoat:1,clearcoatRoughness:.10,transparent:true,opacity:.92}),
 rock:new THREE.MeshStandardMaterial({color:0x5e5a50,roughness:1}),
 foam:new THREE.MeshBasicMaterial({color:0xd6eee9,transparent:true,opacity:.23,depthWrite:false}),
 ember:new THREE.MeshBasicMaterial({color:0xff9a4b,transparent:true,opacity:.9,depthWrite:false})
};
// Terrain material pass: subtle macro variation keeps the meadow from reading as a tiled texture.
MAT.grass.onBeforeCompile=(shader)=>{
 shader.uniforms.uTime={value:0};
 shader.vertexShader='varying vec3 vWorldPos;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n vWorldPos=(modelMatrix*vec4(transformed,1.0)).xyz;');
 shader.fragmentShader='varying vec3 vWorldPos;\n'+shader.fragmentShader.replace('#include <map_fragment',"#include <map_fragment\n float macro=sin(vWorldPos.x*.075)*sin(vWorldPos.z*.061)+sin((vWorldPos.x+vWorldPos.z)*.021);\n float variation=smoothstep(-1.0,1.0,macro)*.075;\n diffuseColor.rgb*=vec3(1.0+variation,1.0+variation*.82,1.0+variation*.48);");
 MAT.grass.userData.shader=shader;
};
MAT.water.onBeforeCompile=(shader)=>{
 shader.uniforms.uTime={value:0};
 shader.vertexShader='uniform float uTime;\n'+shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.y += sin(transformed.x*0.55 + uTime*1.7)*0.045 + cos(transformed.z*0.22 + uTime*1.15)*0.028;');
 MAT.water.userData.shader=shader;
};
function addMesh(g,m,pos=[0,0,0],rot=[0,0,0],cast=true){const o=new THREE.Mesh(g,m);o.position.set(...pos);o.rotation.set(...rot);o.castShadow=cast;o.receiveShadow=true;scene.add(o);return o}
function label(text,pos,color='#efe6d2',scale=1){const c=document.createElement('canvas');c.width=640;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,640,128);x.font='700 31px Georgia';x.textAlign='center';x.fillStyle='rgba(5,9,8,.78)';x.roundRect(22,20,596,88,18);x.fill();x.fillStyle=color;x.fillText(text,320,76);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(6.8*scale,1.36*scale,1);s.position.set(...pos);scene.add(s);return s}

// Ground: broad playable meadow with restrained sculpted undulation.
const tg=new THREE.PlaneGeometry(190,190,112,112);const ta=tg.attributes.position;
for(let i=0;i<ta.count;i++){const x=ta.getX(i),z=ta.getY(i);let h=Math.sin(x*.075)*.62+Math.cos(z*.082)*.48+Math.sin((x-z)*.035)*.72;h*=Math.max(0,1-Math.abs(x)/112);ta.setZ(i,h)}
tg.rotateX(-Math.PI/2);tg.computeVertexNormals();addMesh(tg,MAT.grass,[0,0,0],undefined,false);

// River with a shallow bank lip and moving highlights.
const river=addMesh(new THREE.PlaneGeometry(27,190,1,16),MAT.water,[31,.05,4],[-Math.PI/2,.02,.08],false);
const riverGlow=addMesh(new THREE.PlaneGeometry(26.2,188,1,1),new THREE.MeshBasicMaterial({color:0x2a8990,transparent:true,opacity:.10,depthWrite:false}),[31,.08,4],[-Math.PI/2,.02,.08],false);
const bankMat=new THREE.MeshStandardMaterial({color:0x5d654b,roughness:1});
addMesh(new THREE.PlaneGeometry(4.5,188,1,8),bankMat,[16.9,.16,4],[-Math.PI/2,.02,.08],false);
addMesh(new THREE.PlaneGeometry(4.5,188,1,8),bankMat,[45.1,.16,4],[-Math.PI/2,.02,.08],false);
const foam=[];for(let i=0;i<34;i++){const r=addMesh(new THREE.RingGeometry(.18,.34,12),MAT.foam,[27.3+Math.sin(i*1.7)*3.8,.22,-49+i*3.2],[-Math.PI/2,0,0],false);r.scale.set(1.5,.55,1);foam.push(r)}
// Irregular shoreline highlights visually connect the river to its banks.
const shorelineGlints=[];for(let i=0;i<46;i++){const z=-50+i*2.35;const side=i%2?-1:1;const x=31+side*(11.9+Math.sin(i*2.7)*.75);const g=addMesh(new THREE.PlaneGeometry(.7+.35*(i%3),.18),MAT.foam,[x,.22,z],[-Math.PI/2,0,(i%2)*.18],false);shorelineGlints.push(g)}
// River-edge transition detail: irregular wet soil, exposed stones, and reed clumps break the straight shoreline.
const wetBankMat=new THREE.MeshStandardMaterial({color:0x514b3d,roughness:.96});
const reedMat=new THREE.MeshStandardMaterial({color:0x536447,roughness:1});
for(let i=0;i<54;i++){
  const z=-51+i*1.92;
  const side=i%2?-1:1;
  const wav=Math.sin(i*1.91)*.72+Math.sin(i*.43)*.38;
  const edgeX=31+side*(11.65+wav);
  const mud=addMesh(new THREE.PlaneGeometry(.75+(i%4)*.18,.55+(i%3)*.14),wetBankMat,[edgeX+side*.34,.205,z],[-Math.PI/2,0,(i%5)*.23],false);
  mud.rotation.z+=(side<0?0:Math.PI);
  if(i%2===0){
    const stone=rockMesh(.16+(i%3)*.055);
    stone.position.set(edgeX+side*(.55+(i%3)*.12),.28,z+.32*Math.sin(i));
    stone.scale.y=.55;stone.rotation.y=i*.61;scene.add(stone);
  }
  if(i%5===0){
    for(let r=0;r<3;r++){
      const reed=box(.035,.55+(r%2)*.18,.035,reedMat,[edgeX+side*(.15+r*.10),.48,z+r*.12],(r-1)*.12);
      reed.rotation.z=(r-1)*.12;reed.castShadow=false;
    }
  }
}

function road(x,z,w,d,rot=0){return addMesh(new THREE.PlaneGeometry(w,d),MAT.road,[x,.10,z],[-Math.PI/2,0,rot],false)}
road(0,7,11.5,120);road(-13,-1,50,7.5);road(17,7,8,65,.18);road(31,7,9,18,.08);road(23,6,24,6.2,.02);

// Terrain-transition pass: roads should emerge from the meadow instead of ending at a hard texture seam.
function roadShoulder(x,z,w,d,rot=0){
  const g=new THREE.Group();g.position.set(x,.12,z);g.rotation.y=rot;
  const edgeMat=new THREE.MeshStandardMaterial({color:0x77705c,roughness:1});
  const soilMat=new THREE.MeshStandardMaterial({color:0x665b49,roughness:1});
  for(const side of [-1,1]){
    for(let i=0;i<18;i++){
      const t=i/17-.5;
      const px=t*w;
      const pz=side*(d*.5+.35+(i%3)*.18);
      const peb=box(.18+(i%3)*.07,.10+(i%2)*.05,.26+(i%4)*.06,edgeMat,[px,.05,pz],(i*1.7)%Math.PI,g);
      peb.scale.y=.65+(i%4)*.12;
    }
    for(let i=0;i<12;i++){
      const t=i/11-.5;
      const tuft=box(.07,.12+(i%3)*.06,.18,soilMat,[t*w, .08, side*(d*.5+.12)],(i%2)*.4,g);
      tuft.rotation.x=(i%2?-1:1)*.18;
    }
  }
  scene.add(g);return g;
}
roadShoulder(0,7,11.5,120);
roadShoulder(-13,-1,50,7.5);
roadShoulder(17,7,8,65,.18);
roadShoulder(23,6,24,6.2,.02);

const assetLoader=new GLTFLoader();
const assetCache=new Map();const assetPromises=new Map();const assetClips=new Map();
let loadedCount=0;const assetQueue=['inn','forge','chapel','mill','watchtower','well','cart','fence','bench','crate','sign','lantern','rock','tree_oak','tree_pine','shrub','grass_clump','bridge','barrel','character','hero','chimney_detail','door_detail','window_detail','roof_ridge_detail','timber_brace_detail','stone_foundation_detail','eave_bracket_detail','roof_eave_trim_detail'];
async function loadAsset(name){
 if(assetPromises.has(name))return assetPromises.get(name);
 const p=assetLoader.loadAsync(`./assets/${name}.glb`).then(gltf=>{
   gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;if(o.material){o.material=o.material.clone();o.material.roughness=Math.min(.94,Math.max(.34,o.material.roughness??.7));const n=(o.name||'').toLowerCase();if(n.includes('roof')||n.includes('ridge')){o.material.map=roof;o.material.normalMap=roofNormal;o.material.normalScale=new THREE.Vector2(.34,.34);o.material.needsUpdate=true;}if(n.includes('window')){o.material.emissive=new THREE.Color(0x6f4925);o.material.emissiveIntensity=.18;warmWindows.push(o);}}}});
   assetCache.set(name,gltf.scene);assetClips.set(name,gltf.animations||[]);loadedCount++;bootSet(.08+.57*(loadedCount/assetQueue.length),'Loading '+name+'…');return {scene:gltf.scene,clips:gltf.animations||[]};
 }).catch(err=>{console.warn('Asset failed',name,err);return null});
 assetPromises.set(name,p);return p;
}
async function placeAsset(name,x,z,scale=1,rotation=0,tint=null){const loaded=await loadAsset(name);if(!loaded)return null;const g=loaded.scene.clone(true);g.position.set(x,name==='bridge'?0.12:terrainHeight(x,z),z);g.scale.setScalar(scale);g.rotation.y=rotation;g.userData.assetName=name;g.userData.animations=loaded.clips;if(tint){g.traverse(o=>{if(o.isMesh&&o.material?.color){o.material=o.material.clone();o.material.color.lerp(new THREE.Color(tint),.18)}})}scene.add(g);return g}


// Hearthmere authored-detail pass: architectural trim, windows, doors, chimneys,
// market dressing and terrain-edge storytelling. These are modular scene details,
// not placeholder debug geometry.
const MAT_DETAIL={
 wood:new THREE.MeshStandardMaterial({color:0x4b3325,roughness:.82,metalness:0}),
 timber:new THREE.MeshStandardMaterial({color:0x2e211a,roughness:.9}),
 plaster:new THREE.MeshStandardMaterial({color:0xc2b69a,roughness:.95}),
 stone:new THREE.MeshStandardMaterial({color:0x67665d,roughness:.96}),
 iron:new THREE.MeshStandardMaterial({color:0x252a28,roughness:.5,metalness:.62}),
 glass:new THREE.MeshPhysicalMaterial({color:0x78a8a7,roughness:.12,metalness:.05,transmission:.2,transparent:true,opacity:.78}),
 flower:new THREE.MeshStandardMaterial({color:0x8e4d55,roughness:.9}),
 leaf:new THREE.MeshStandardMaterial({color:0x496b43,roughness:1})
};
function box(w,h,d,m,pos,rotY=0,parent=null){const q=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);q.position.set(...pos);q.rotation.y=rotY;q.castShadow=true;q.receiveShadow=true;(parent||scene).add(q);return q}
function cyl(r,h,m,pos,rot=[0,0,0],parent=null){const q=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.94,h,10),m);q.position.set(...pos);q.rotation.set(...rot);q.castShadow=true;q.receiveShadow=true;(parent||scene).add(q);return q}
function windowUnit(x,y,z,rot=0,w=1.15,h=1.45){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;const warm=new THREE.MeshPhysicalMaterial({color:0xb7c7bd,roughness:.22,metalness:.02,transmission:.12,transparent:true,opacity:.84,emissive:0x2a1b10,emissiveIntensity:.18});warmWindows.push(warm);box(w,h,.10,warm,[0,0,0],0,g);box(.08,h+.12,.16,MAT_DETAIL.timber,[-w*.5,0,.08],0,g);box(.08,h+.12,.16,MAT_DETAIL.timber,[w*.5,0,.08],0,g);box(w+.12,.08,.16,MAT_DETAIL.timber,[0,-h*.5,.08],0,g);box(w+.12,.08,.16,MAT_DETAIL.timber,[0,h*.5,.08],0,g);box(.06,h,.18,MAT_DETAIL.timber,[0,0,.10],0,g);box(w,.06,.18,MAT_DETAIL.timber,[0,0,.10],0,g);scene.add(g);return g}
function doorUnit(x,y,z,rot=0,w=1.35,h=2.65){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;box(w,h,.16,MAT_DETAIL.wood,[0,0,0],0,g);for(let i=-1;i<=1;i++)box(.08,h*.92,.2,MAT_DETAIL.timber,[i*w*.28,0,.12],0,g);box(w+.08,.10,.2,MAT_DETAIL.timber,[0,h*.44,.12],0,g);cyl(.07,.12,MAT_DETAIL.iron,[w*.24,0,.18],[Math.PI/2,0,0],g);scene.add(g);return g}
function chimney(x,y,z,scale=1){const g=new THREE.Group();g.position.set(x,y,z);for(let i=0;i<4;i++)box(.58*scale,.72*scale,.58*scale,MAT_DETAIL.stone,[0,i*.62*scale,0]);box(.82*scale,.18*scale,.82*scale,MAT_DETAIL.stone,[0,2.45*scale,0]);scene.add(g);return g}
function flowerBed(x,z,rot=0){const g=new THREE.Group();g.position.set(x,terrainHeight(x,z)+.03,z);g.rotation.y=rot;box(2.8,.22,.8,MAT_DETAIL.wood,[0,.12,0],0,g);for(let i=0;i<8;i++){const px=-1.15+(i%4)*.75,pz=-.24+(i%2)*.48;cyl(.10,.28,i%3?MAT_DETAIL.flower:new THREE.MeshStandardMaterial({color:0xd0ad59,roughness:.9}),[px,.35,pz],[],g)}scene.add(g);return g}
function landmarkDetailPass(){
  // Inn: deep timber frame, warm windows and a projecting sign.
  windowUnit(-17.1,3.7,-13.0,.02,1.3,1.35);windowUnit(-10.9,3.7,-13.0,.02,1.3,1.35);
  doorUnit(-14,1.55,-9.75,Math.PI,1.45,2.7);chimney(-11.2,3.2,-15.0,.9);
  box(3.4,.22,.12,MAT_DETAIL.timber,[-14,5.1,-9.55],0);box(3.0,.12,.12,MAT_DETAIL.wood,[-14,4.75,-9.48],0);
  // Forge: heavy stone base, tall chimney, glowing furnace mouth.
  for(let i=0;i<5;i++)box(.85,.55,5.4,MAT_DETAIL.stone,[-1.9+i*.95,0.45,-7],0);
  chimney(2.9,2.7,-7.4,1.1);box(1.0,1.15,.18,new THREE.MeshStandardMaterial({color:0x6b2517,emissive:0x9c3219,emissiveIntensity:1.4,roughness:.7}),[1.2,1.05,-3.95],0);
  // Chapel: bell tower trim and rose-window motif.
  windowUnit(-14.1,4.4,10.2,.0,1.45,1.55);doorUnit(-12,1.45,14.5,0,1.3,2.7);chimney(-8.7,4.4,10.9,.65);
  // Mill: water-facing timber gallery and wheel hub.
  for(let i=0;i<5;i++)box(.18,3.0,.20,MAT_DETAIL.timber,[13.2+i*1.15,3.0,-19.8],0);
  cyl(2.5,.32,MAT_DETAIL.wood,[19.1,2.0,-19.0],[Math.PI/2,0,0]);
  cyl(.38,.48,MAT_DETAIL.iron,[19.1,2.0,-19.0],[Math.PI/2,0,0]);
  // Watch: crenellation and warm beacon.
  for(let i=0;i<7;i++)box(.48,.75,.62,MAT_DETAIL.stone,[11.2+i*1.55,7.4,10.0],0);
  cyl(.18,.8,new THREE.MeshStandardMaterial({color:0xe7a64c,emissive:0xb75c20,emissiveIntensity:1.5}),[16,8.2,10.0]);
  // Village dressing: beds, posts, market awnings, and a visible road threshold.
  flowerBed(-20,-7,.1);flowerBed(-4,8,-.25);flowerBed(7,-16,.3);
  for(const [x,z] of [[-25,-16],[-21,-16],[-17,-16]]){cyl(.11,2.1,MAT_DETAIL.timber,[x,1.05,z]);box(2.0,.65,.08,MAT_DETAIL.wood,[x,2.0,z]);}
}
function addRoadEdges(){
  for(let i=0;i<34;i++){const z=-50+i*3.15;const side=i%2?-1:1;const x=side*(5.9+(i%3)*.12);const r=box(.34,.24,.62,MAT_DETAIL.stone,[x,.28,z],(i%5)*.18);r.scale.y=.7}
  for(let i=0;i<18;i++){const z=-18+i*3.0;const x=-28-(i%2)*.7;box(.26,.22,.5,MAT_DETAIL.stone,[x,.25,z],i*.17)}
}

const landmarks={};
function landmarkAccent(g,type,x,z,scale=1){
  if(!g)return;
  const y=terrainHeight(x,z);
  const add=(o,px,py,pz,rot=0)=>{o.position.set(px,py,pz);o.rotation.y=rot;g.add(o);return o};
  if(type==='inn'){
    // Deep timber porch + hanging sign + stacked firewood make the inn read immediately from the road.
    add(box(5.6,.18,1.15,MAT_DETAIL.wood,undefined,0),0,2.15,-4.1);
    for(const px of [-2.35,2.35]) add(cyl(.13,3.9,MAT_DETAIL.timber),px,1.15,-4.0);
    add(box(4.9,.08,.16,MAT_DETAIL.timber),0,4.05,-4.0);
    add(box(1.25,.10,.08,MAT_DETAIL.timber),0,3.25,-4.28);
    add(box(1.12,.82,.10,MAT_DETAIL.wood),0,2.83,-4.3);
    woodPile(x+4,z-3.8,.15);
    // Broad signboard with hanging supports makes the inn legible before the player reaches it.
    add(box(2.25,.82,.12,MAT_DETAIL.wood),0,3.45,-4.42);
    add(box(.09,1.0,.12,MAT_DETAIL.iron),-.95,3.55,-4.48);
    add(box(.09,1.0,.12,MAT_DETAIL.iron),.95,3.55,-4.48);
  } else if(type==='forge'){
    // Forge apron, heavy chimney collar and tool rack establish a working smithy silhouette.
    add(box(4.4,.18,2.0,MAT_DETAIL.stone),0,.15,-3.2);
    for(const px of [-1.7,0,1.7]) add(cyl(.09,1.65,MAT_DETAIL.timber),px,.9,-3.95);
    add(box(4.0,.12,.18,MAT_DETAIL.timber),0,1.72,-3.95);
    add(box(3.4,.14,.22,MAT_DETAIL.stone),0,4.65,.5);
    for(let i=0;i<4;i++) add(cyl(.035,.9,MAT_DETAIL.timber),-1.2+i*.8,1.25,-4.08,Math.PI/2);
    woodPile(x-3.7,z-3.0,-.35);
    // Smithy apron, anvil block and ore baskets sell the building's purpose at a glance.
    add(box(.9,.55,.7,MAT_DETAIL.stone),-2.2,.55,-4.05);
    add(box(.52,.22,.30,MAT_DETAIL.iron),-2.2,1.0,-4.05);
    add(cyl(.34,.45,MAT_DETAIL.iron),2.35,.42,-3.98);
    add(cyl(.38,.52,MAT_DETAIL.stone),3.05,.46,-3.55);
  } else if(type==='chapel'){
    // Buttress rhythm and a small entry canopy give the chapel a civic landmark profile.
    for(const px of [-3.1,-1.55,1.55,3.1]) add(box(.48,3.0,.62,MAT_DETAIL.stone),px,1.5,2.35);
    add(box(3.0,.16,1.0,MAT_DETAIL.wood),0,2.15,-3.55);
    for(const px of [-1.2,1.2]) add(cyl(.10,2.2,MAT_DETAIL.timber),px,1.05,-3.35);
    add(box(2.7,.10,.16,MAT_DETAIL.timber),0,2.15,-3.35);
    // Small bell gable and rose-window ring make the chapel's civic identity unmistakable.
    add(cyl(.48,.12,MAT_DETAIL.iron),0,5.25,2.52,[Math.PI/2,0,0]);
    add(cyl(.13,.18,MAT_DETAIL.timber),0,5.25,2.62,[Math.PI/2,0,0]);
    add(box(.16,1.25,.10,MAT_DETAIL.timber),0,5.9,2.54);
    add(box(.82,.12,.10,MAT_DETAIL.timber),0,5.9,2.54);
  } else if(type==='mill'){
    // Oversized timber braces and a readable wheel/axle accent reinforce the mill's function.
    for(const px of [-2.2,2.2]) add(box(.22,4.4,.26,MAT_DETAIL.timber),px,2.2,-3.0,.12);
    add(cyl(.16,2.0,MAT_DETAIL.stone),3.0,1.5,-3.7,[Math.PI/2][0]);
    const wheel=new THREE.Group(); wheel.position.set(3.05,1.55,-3.72); wheel.rotation.z=Math.PI/2;
    for(let i=0;i<10;i++){const a=i*Math.PI/5; const spoke=box(.10,1.75,.10,MAT_DETAIL.timber,[Math.cos(a)*.72,Math.sin(a)*.72,0],a); wheel.add(spoke);}
    wheel.add(cyl(.12,2.0,MAT_DETAIL.timber,[0,0,0],[Math.PI/2,0,0])); g.add(wheel);
    // Sluice channel and grain sacks visually connect the mill to the river's working edge.
    add(box(2.8,.18,1.25,MAT_DETAIL.wood),3.45,.28,-3.15,-.12);
    add(box(1.0,.65,.75,MAT_DETAIL.flower),-2.65,.42,-3.75);
    add(box(.82,.58,.62,MAT_DETAIL.flower),-3.25,.37,-3.35);
  } else if(type==='watchtower'){
    // Layered platform, braces and crenel accents make the tower read as defensive rather than generic.
    add(box(4.0,.24,4.0,MAT_DETAIL.stone),0,3.65,0);
    for(const px of [-1.55,1.55]) for(const pz of [-1.55,1.55]) add(box(.22,2.6,.22,MAT_DETAIL.timber),px,2.2,pz);
    for(const px of [-1.5,-.5,.5,1.5]) add(box(.55,.48,.38,MAT_DETAIL.stone),px,5.25,-1.7);
    for(const px of [-1.5,-.5,.5,1.5]) add(box(.55,.48,.38,MAT_DETAIL.stone),px,5.25,1.7);
    // External stair and beacon pennant give the tower a strong silhouette from the meadow.
    for(let i=0;i<6;i++) add(box(1.15,.16,.62,MAT_DETAIL.wood),-2.65+i*.34,1.0+i*.43,-.95-i*.28,-.38);
    add(cyl(.07,3.0,MAT_DETAIL.timber),0,7.0,0);
    const pennant=new THREE.Mesh(new THREE.BufferGeometry(),new THREE.MeshStandardMaterial({color:0x7d3d35,roughness:.9}));
    pennant.geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,7.8,0,1.0,7.48,0,0,7.12,0],3));pennant.geometry.computeVertexNormals();add(pennant,0,0,0);
  }
}
async function buildLandmarks(){
 const specs=[
  ['inn','THE WARM LANTERN',-14,-13,1.04,-.08,7.0],['forge','RIVERSIDE FORGE',1,-7,1.08,.04,6.1],['chapel','CHAPEL OF THE LAST BELL',-12,11,.86,.06,11.0],['mill','ASHWHEEL MILL',16,-17,.92,-.12,7.2],['watchtower','NORTH WATCH',16,14,.88,.12,12.2]
 ];
 for(const [asset,name,x,z,scale,rot,labelY] of specs){const g=await placeAsset(asset,x,z,scale,rot);landmarks[asset]=g;landmarkAccent(g,asset,x,z,scale);label(name,[x,labelY,z],'#f0e7d2',asset==='chapel'?1.0:.9)}
 const bridge=await placeAsset('bridge',31,6,2.05,.02);
  if(bridge) bridge.scale.set(2.05,.82,1.0);landmarks.bridge=bridge;
  landmarkDetailPass();
  addRoadEdges();
}

async function dressVillage(){
 const p=[['well',-20,-2,.95,.2],['cart',-22,-19,.95,.15],['bench',-9,-7,.9,-.35],['bench',-8,14,.9,.55],['sign',-6,-2,.8,.2],['lantern',-13,-8,.85,.15],['lantern',4,-12,.85,-.2],['lantern',15,-10,.85,.4],['crate',-17,-20,.8,.1],['crate',-14,-20,.7,-.2],['crate',3,-4,.65,.4]];
 const placed=await Promise.all(p.map(v=>placeAsset(...v)));
 villageWell=placed[0];
 const barrels=[];for(let i=0;i<12;i++)barrels.push(placeAsset('barrel',-24+(i%4)*2.7,-22+Math.floor(i/4)*2.7,.44+(i%3)*.04,(i%2)*.32));
 const fences=[];for(let i=0;i<13;i++)fences.push(placeAsset('fence',-31+i*5.0,-25,.85,0));
 const rocks=[];for(let i=0;i<18;i++)rocks.push(placeAsset('rock',-42+i*4.9,25+Math.sin(i*.8)*6,.40+(i%4)*.09,i*.21));
 await Promise.all([...barrels,...fences,...rocks]);
}

const foliage=[];async function buildFoliage(){
 const list=[];for(let i=0;i<100;i++){const side=i%2?-1:1;let x=side*(31+Math.random()*48),z=-58+Math.random()*112;if(Math.abs(z-6)<17&&Math.abs(x)<54)continue;list.push([i%3?'tree_oak':'tree_pine',x,z,.62+Math.random()*.68,(Math.random()-.5)*.55])}
 for(let i=0;i<26;i++)list.push([i%2?'tree_oak':'tree_pine',-45+Math.random()*92,31+Math.random()*31,.55+Math.random()*.55,(Math.random()-.5)*.6]);
 // Preserve deliberate sightlines to the village core and its major destinations.
 // Trees still form a dense perimeter, but they no longer randomly plug the authored approaches.
 const filtered=list.filter(v=>{
   const x=v[1], z=v[2];
   const centralApproach=Math.abs(x)<24 && z>-31 && z<25;
   const northApproach=Math.abs(x-16)<9 && z>-1 && z<13;
   const chapelApproach=Math.abs(x+12)<7 && z>3 && z<13;
   const millApproach=Math.abs(x-16)<8 && z>-25 && z<-10;
   return !(centralApproach||northApproach||chapelApproach||millApproach);
 });
 const gs=await Promise.all(filtered.map(v=>placeAsset(...v)));gs.forEach((g,i)=>{if(g){g.userData.windPhase=i*.73;g.userData.windStrength=.006+(i%5)*.0015;foliage.push(g)}});
 // Deliberate gateway clusters frame the approaches without blocking the destination silhouettes.
 const frames=[[-25,-30,-.18],[-25,-22,.12],[7,-28,.25],[25,24,-.22],[25,36,.18],[-27,25,.35]];
 for(const [x,z,r] of frames){
   const a=await placeAsset('tree_oak',x,z,1.05,r);
   const b=await placeAsset('tree_oak',x+(r>.0?2.4:-2.4),z+1.1,0.88,r+.3);
   if(a)foliage.push(a); if(b)foliage.push(b);
 }
}

async function buildNaturalDressing(){
 const specs=[];
 for(let i=0;i<42;i++){
  const x=-44+Math.random()*92,z=-49+Math.random()*104;
  if(Math.abs(x-31)<15) continue;
  if(Math.abs(z-7)<7 && x>-32 && x<25) continue;
  specs.push(['shrub',x,z,.45+Math.random()*.5,(Math.random()-.5)*.8]);
 }
 for(let i=0;i<68;i++){
  const x=-47+Math.random()*96,z=-53+Math.random()*110;
  if(Math.abs(x-31)<15) continue;
  specs.push(['grass_clump',x,z,.38+Math.random()*.48,Math.random()*Math.PI*2]);
 }
 await Promise.all(specs.map(v=>placeAsset(...v)));
}

// High-frequency environmental dressing: small authored clusters that break repetition
// and make the village read as inhabited rather than assembled from isolated landmarks.
function woodPile(x,z,rot=0){
 const g=new THREE.Group();g.position.set(x,terrainHeight(x,z)+.02,z);g.rotation.y=rot;
 for(let i=0;i<5;i++){const log=cyl(.18,1.7,MAT_DETAIL.wood,[((i%2)*.34-.17),.22+Math.floor(i/2)*.30,0],[0,0,Math.PI/2],g);log.rotation.y=(i%2)*.18;}
 scene.add(g);return g;
}
function hayStack(x,z,s=1){const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);cyl(.7*s,1.25*s,MAT_DETAIL.flower,[0,.62*s,0]);cyl(.46*s,.22*s,MAT_DETAIL.timber,[0,1.28*s,0]);scene.add(g);return g}
function marketStall(x,z,rot=0){const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);g.rotation.y=rot;
 box(2.8,.16,1.25,MAT_DETAIL.wood,[0,1.55,0],0,g);for(const px of [-1.15,1.15])cyl(.09,2.5,MAT_DETAIL.timber,[px,1.25,0],[0,0,0],g);
 box(3.0,.08,1.35,new THREE.MeshStandardMaterial({color:0x6e4f3e,roughness:.85}),[0,2.45,0],0,g);box(3.0,.06,.32,MAT_DETAIL.wood,[0,.72,0],0,g);scene.add(g);return g;
}
function reedPatch(x,z,rot=0){const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);g.rotation.y=rot;for(let i=0;i<10;i++){const r=cyl(.018,.8+Math.random()*.65,new THREE.MeshStandardMaterial({color:0x60794a,roughness:1}),[(Math.random()-.5)*1.4,.4,(Math.random()-.5)*1.2],[0,(Math.random()-.5)*.5,(Math.random()-.5)*.25],g);r.userData.reed=true}scene.add(g);return g}
function stoneBorder(x,z,count=7,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;for(let i=0;i<count;i++){const a=(i/(count-1)-.5)*5;const r=box(.45,.28,.34,MAT_DETAIL.stone,[a,.25,Math.sin(i*1.4)*.18],i*.21,g);r.scale.set(1+(i%3)*.15,.8,1)}scene.add(g);return g}
// Hearthmere residential quarter: three distinct cottage archetypes built from the same
// material language. The silhouettes, rooflines, porches and facade dressing deliberately vary
// so the village no longer reads as one repeated house dropped around the landmarks.
const cottageMats={
  stone:new THREE.MeshStandardMaterial({color:0x777269,roughness:.96}),
  timber:new THREE.MeshStandardMaterial({color:0x3a2920,roughness:.88}),
  plasterA:new THREE.MeshStandardMaterial({color:0xb9ad92,roughness:.94}),
  plasterB:new THREE.MeshStandardMaterial({color:0x9eaa96,roughness:.94}),
  plasterC:new THREE.MeshStandardMaterial({color:0xc3a987,roughness:.94}),
  roofA:new THREE.MeshStandardMaterial({color:0x4b4542,roughness:.92}),
  roofB:new THREE.MeshStandardMaterial({color:0x5c4034,roughness:.92}),
  roofC:new THREE.MeshStandardMaterial({color:0x3f514a,roughness:.92})
};
function roofRidge(g,w,d,h,m){
  const shape=new THREE.Shape();shape.moveTo(-w/2,0);shape.lineTo(0,h);shape.lineTo(w/2,0);shape.lineTo(-w/2,0);
  const ex=new THREE.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false});ex.rotateX(-Math.PI/2);ex.translate(0,0,-d/2);
  const r=new THREE.Mesh(ex,m);r.castShadow=true;r.receiveShadow=true;g.add(r);return r;
}
function cottage(x,z,variant=0,rot=0){
  const g=new THREE.Group();g.position.set(x,terrainHeight(x,z),z);g.rotation.y=rot;
  const bodyMat=[cottageMats.plasterA,cottageMats.plasterB,cottageMats.plasterC][variant%3];
  const roofMat=[cottageMats.roofA,cottageMats.roofB,cottageMats.roofC][variant%3];
  const w=variant===1?5.7:variant===2?4.9:5.3, d=variant===1?4.7:4.4, h=3.4;
  box(w,h,d,bodyMat,[0,h/2,0],0,g);
  // Dark timber frame establishes the OSRS-readable silhouette while retaining richer materials.
  for(const px of [-w/2+.16,w/2-.16])box(.18,h+.1,.22,cottageMats.timber,[px,h/2,.02],0,g);
  box(w+.18,.18,.22,cottageMats.timber,[0,h-.16,.02],0,g);
  box(w*.72,.16,.22,cottageMats.timber,[0,h*.48,.02],0,g);
  roofRidge(g,w+1.0,d+.65,1.75,roofMat).position.y=h;
  box(w+.45,.16,.32,cottageMats.timber,[0,h-.04,-d/2-.08],0,g);
  // Front door, two windows, shutters and warm interior glow.
  doorUnit(0,1.35,d/2+.10,0,1.05,2.55); 
  windowUnit(-w*.29,2.05,d/2+.08,0,.92,1.12);windowUnit(w*.29,2.05,d/2+.08,0,.92,1.12);
  for(const px of [-w*.29,w*.29]){box(.14,1.22,.10,cottageMats.timber,[px-.56,2.05,d/2+.02],0,g);box(.14,1.22,.10,cottageMats.timber,[px+.56,2.05,d/2+.02],0,g)}
  chimney(-w*.24,3.35,-d*.16,.62);
  // Variant-specific porch/balcony treatment.
  if(variant===0){
    box(2.8,.16,1.15,cottageMats.timber,[0,.92,d/2+.62],0,g);for(const px of [-1.15,1.15])cyl(.08,1.85,cottageMats.timber,[px,.92,d/2+.96],[],g);
  } else if(variant===1){
    box(3.0,.18,.12,cottageMats.timber,[0,2.92,d/2+.14],0,g);for(const px of [-1.3,-.43,.43,1.3])box(.07,.55,.10,cottageMats.timber,[px,2.68,d/2+.12],0,g);
  } else {
    for(const px of [-1.55,-.78,0,.78,1.55])box(.06,.82,.12,cottageMats.timber,[px,1.85,d/2+.12],0,g);
    box(3.5,.08,.12,cottageMats.timber,[0,1.45,d/2+.12],0,g);
  }
  // Firewood and planter details ground the building in the terrain.
  woodPile(x+(variant-1)*1.15,z-d*.56,.3+variant*.4);
  flowerBed(x+(variant===2?1.0:-1.0),z+d*.60,rot);
  scene.add(g);return g;
}
async function buildResidentialQuarter(){
  // Distinct authored GLB homes replace the old runtime cottage blocks. Each house has a different
  // silhouette, facade treatment, roof, porch/awning and small lived-in details while sharing Hearthmere's material language.
  const homes=[
    ['cottage_A',-25,-4,1.0,.18],['cottage_B',-23,5,.96,-.22],['cottage_C',-20,15,1.0,.06],
    ['cottage_A',-8,20,.98,.52],['cottage_B',-1,22,.94,-.28],['cottage_C',7,17,.96,.12],
    ['cottage_B',-28,13,.93,.72],['cottage_A',10,-28,1.02,-.12]
  ];
  await Promise.all(homes.map(async ([asset,x,z,scale,rot])=>{
    const home=await placeAsset(asset,x,z,scale,rot);
    if(!home)return;
    // Architectural detailing pass: these pieces are children of each cottage so the facade details inherit its unique rotation/scale.
    const details=[
      ['door_detail',[0,0,-3.92],.72],
      ['window_detail',[-1.95,1.55,-3.88],.58],
      ['window_detail',[1.95,1.55,-3.88],.58],
      ['chimney_detail',[1.45,5.02,.25],.72],
      ['roof_ridge_detail',[0,5.15,0],.78],
      ['timber_brace_detail',[-2.45,.95,-4.00],.72],
      ['timber_brace_detail',[2.45,.95,-4.00],.72],
      ['stone_foundation_detail',[0,0,-3.98],.72],
      ['eave_bracket_detail',[-2.45,4.48,-3.88],.72],
      ['eave_bracket_detail',[0,4.62,-3.88],.72],
      ['eave_bracket_detail',[2.45,4.48,-3.88],.72],
      ['eave_bracket_detail',[-2.45,4.48,3.15],.72],
      ['eave_bracket_detail',[0,4.62,3.15],.72],
      ['eave_bracket_detail',[2.45,4.48,3.15],.72],
      ['roof_eave_trim_detail',[0,0,0],.78]
    ];
    for(const [name,pos,sc] of details){
      const a=await loadAsset(name);
      if(!a)continue;
      const d=a.scene.clone(true); d.position.set(pos[0],pos[1],pos[2]); d.scale.setScalar(sc); d.userData.assetName=name;
      // Give authored architectural trim a deliberate material language instead of inherited gray defaults.
      const detailMat = name.includes('foundation') ? MAT_DETAIL.stone :
        (name.includes('chimney') ? MAT_DETAIL.stone :
        (name.includes('window') ? MAT_DETAIL.glass :
        (name.includes('door') ? MAT_DETAIL.wood :
        (name.includes('roof_') || name.includes('eave_') || name.includes('timber') ? MAT_DETAIL.timber : MAT_DETAIL.wood))));
      d.traverse(o=>{if(o.isMesh){o.material=detailMat.clone();o.castShadow=true;o.receiveShadow=true;}});
      home.add(d);
    }
  }));
  // A narrow service lane, deliberately offset from the main road.
  road(-18,19,4.2,24,-.08);
  for(let i=0;i<7;i++){const z=8+i*3.0;box(.34,.18,.5,cottageMats.stone,[-20.1,.24,z],i*.23)}
}
function addVillageMicroDressing(){
 [[-24,-12,.18],[-8,-21,-.42],[4,-3,.75],[11,-13,-.3]].forEach(v=>woodPile(...v));
 [[-27,-7,1.0],[-20,-18,.75],[8,-24,.9]].forEach(v=>hayStack(...v));
 marketStall(-3,-14,-.04);marketStall(-7,-14,.02);
 stoneBorder(-19,-4,8,.1);stoneBorder(-3,6,9,-.18);
 [[28,-25],[29,-8],[28,20],[28,43]].forEach(v=>reedPatch(...v));
 // little footbridge approach posts / lantern hooks
 for(const [x,z,r] of [[24,3,.02],[37,3,.02],[24,10,.02],[37,10,.02]]){cyl(.10,2.1,MAT_DETAIL.timber,[x,1.05,z],[0,0,0]);cyl(.08,.35,MAT_DETAIL.iron,[x,2.05,z],[Math.PI/2,0,0]);}
}

let villageWell=null;
const interactables=[];
const gameState={quest:0, gathered:0, gold:24, inventory:{wood:12,stone:8,herb:6,fish:7}, lastInteraction:null};
function interact(obj,name,msg,action=null){if(!obj)return obj;obj.userData.interaction={name,msg,action};interactables.push(obj);return obj}
async function buildInteractions(){
 interact(landmarks.forge,'Riverside Forge','Mara: The bell rang by itself before dawn. Something moved in the old mill.',()=>advanceQuest(1));
 interact(landmarks.mill,'Ashwheel Mill','The wheel turns even when the river wind dies.',()=>advanceQuest(2));
 interact(landmarks.watchtower,'North Watch','Rowan watches the tree line. The road feels quieter than it should.',()=>advanceQuest(3));
 interact(villageWell,'Village Well','Cold water. The rope is still wet, though nobody remembers drawing it.',()=>say('You fill a flask with cold spring water.'));
}

const characters=[];let player=null;
function characterDetail(g,role){
 const cloakMat=new THREE.MeshStandardMaterial({color:role==='smith'?0x6b3027:role==='watch'?0x405c4a:0x35404a,roughness:.9});
 const leather=new THREE.MeshStandardMaterial({color:0x33251d,roughness:.92});
 const metal=new THREE.MeshStandardMaterial({color:0x4d514c,metalness:.7,roughness:.34});
 // Distinct silhouettes: each named villager gets role-specific equipment rather than a tinted clone.
 if(role==='smith'){
   const apron=new THREE.Mesh(new THREE.BoxGeometry(1.05,1.35,.10),leather);apron.position.set(0,1.42,.43);apron.castShadow=true;g.add(apron);
   const hammer=cyl(.075,1.15,metal,[.78,1.65,.18],[0,0,.22],g);hammer.rotation.z=.22;
   const belt=box(1.18,.11,.16,leather,[0,1.03,.34],0,g);
   const boots=new THREE.MeshStandardMaterial({color:0x231914,roughness:.95});box(.30,.22,.34,boots,[-.29,.18,.02],0,g);box(.30,.22,.34,boots,[.29,.18,.02],0,g);
   const cap=new THREE.Mesh(new THREE.CylinderGeometry(.38,.46,.20,10),cloakMat);cap.position.set(0,3.02,.01);cap.castShadow=true;g.add(cap);
 } else if(role==='watch'){
   const cloak=new THREE.Mesh(new THREE.CylinderGeometry(.62,.82,1.65,8,1,true),cloakMat);cloak.position.set(0,1.55,-.05);cloak.castShadow=true;g.add(cloak);
   const spear=cyl(.045,2.9,leather,[.82,1.65,0],[0,0,.02],g);cyl(.09,.38,metal,[.82,3.10,0],[0,0,0],g);
   const boots=new THREE.MeshStandardMaterial({color:0x20231f,roughness:.96});box(.30,.22,.34,boots,[-.29,.18,.02],0,g);box(.30,.22,.34,boots,[.29,.18,.02],0,g);
   const hood=new THREE.Mesh(new THREE.ConeGeometry(.43,.42,10),cloakMat);hood.position.set(0,3.00,.01);hood.scale.y=.55;hood.castShadow=true;g.add(hood);
 } else if(role==='player'){
   // Hero equipment pass: a restrained, readable kit that gives the player a strong
   // silhouette at the game's normal isometric distance without obscuring the base mesh.
   const steelBlue=new THREE.MeshStandardMaterial({color:0x566a73,metalness:.72,roughness:.30});
   const brass=new THREE.MeshStandardMaterial({color:0xb38a43,metalness:.62,roughness:.34});
   const cloth=new THREE.MeshStandardMaterial({color:0x35565a,roughness:.88});
   const leatherDark=new THREE.MeshStandardMaterial({color:0x2b211b,roughness:.94});
   const shoulder=new THREE.Mesh(new THREE.BoxGeometry(1.42,.18,.38),steelBlue);shoulder.position.set(0,2.25,.02);shoulder.castShadow=true;g.add(shoulder);
   // Neck guard and collar break the head/body seam and read well in silhouette.
   cyl(.27,.18,brass,[0,2.28,.04],[0,0,0],g);
   box(1.08,.12,.18,leatherDark,[0,1.15,.39],0,g);
   // Two small utility pouches make the waist feel equipped rather than decorative.
   box(.28,.28,.20,leatherDark,[-.50,1.15,.48],-.10,g);box(.28,.28,.20,leatherDark,[.50,1.15,.48],.10,g);
   // A compact kite shield sits behind the off hand; the boss gives it a readable highlight.
   const shield=new THREE.Group();shield.position.set(-.68,1.55,.12);shield.rotation.set(.08,.16,-.10);g.add(shield);
   const shieldMat=new THREE.MeshStandardMaterial({color:0x38555a,metalness:.48,roughness:.48});
   const shieldFace=new THREE.Mesh(new THREE.CylinderGeometry(.48,.38,.12,6),shieldMat);shieldFace.rotation.x=Math.PI/2;shieldFace.scale.y=1.22;shield.add(shieldFace);
   const boss=new THREE.Mesh(new THREE.SphereGeometry(.105,10,8),brass);boss.position.set(0,0,.09);shield.add(boss);
   const rim=new THREE.Mesh(new THREE.TorusGeometry(.39,.035,6,6),brass);rim.rotation.x=Math.PI/2;rim.scale.y=1.2;shield.add(rim);
   g.userData.heroShield=shield;
   // Sword is mounted as a believable sidearm rather than a floating blade.
   const sheath=cyl(.095,1.42,leatherDark,[.72,1.43,.27],[0,0,-.24],g);
   const blade=cyl(.055,1.22,steelBlue,[.72,1.76,.23],[0,0,-.24],g);
   const guard=box(.58,.09,.14,brass,[.72,2.03,.20],0,g);
   const pommel=new THREE.Mesh(new THREE.SphereGeometry(.10,8,6),brass);pommel.position.set(.72,2.14,.19);g.add(pommel);
   g.userData.heroBlade=blade;
   // Short shoulder cape adds a controlled secondary motion layer.
   const cape=new THREE.Mesh(new THREE.CylinderGeometry(.46,.66,.72,8,1,true,0,Math.PI),cloth);cape.position.set(0,1.62,-.28);cape.rotation.x=Math.PI/2;cape.scale.set(1,.92,.72);cape.castShadow=true;g.add(cape);g.userData.heroCape=cape;
   // Final silhouette polish: boots, gloves, hairline and a small shoulder clasp make the hero read as a finished character rather than a dressed primitive.
   const bootMat=new THREE.MeshStandardMaterial({color:0x211914,roughness:.96});
   const gloveMat=new THREE.MeshStandardMaterial({color:0x49372a,roughness:.88});
   const hairMat=new THREE.MeshStandardMaterial({color:0x241b17,roughness:.94});
   box(.34,.24,.42,bootMat,[-.30,.20,.04],0,g);box(.34,.24,.42,bootMat,[.30,.20,.04],0,g);
   box(.22,.24,.20,gloveMat,[-.67,1.48,.05],0,g);box(.22,.24,.20,gloveMat,[.67,1.48,.05],0,g);
   const hair=new THREE.Mesh(new THREE.SphereGeometry(.435,12,8,0,Math.PI*2,0,Math.PI*.48),hairMat);hair.position.set(0,2.92,.02);hair.scale.set(1,.62,1);hair.castShadow=true;g.add(hair);g.userData.heroHair=hair;
   const clasp=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.045,10),brass);clasp.rotation.x=Math.PI/2;clasp.position.set(0,2.18,-.30);g.add(clasp);
 }
}
async function spawnCharacter(x,z,cloth,name,role='villager'){
 const source=role==='player'?'hero':'character'; const g=await placeAsset(source,x,z,role==='player'?1.16:1,0,cloth);if(!g)return null;
 g.userData.baseY=0;g.userData.phase=Math.random()*Math.PI*2;g.userData.walking=false;g.userData.name=name;g.userData.role=role;
 g.userData.parts={arms:[],legs:[],cloak:null,body:g};g.userData.restRotationZ=g.rotation.z;g.userData.home=new THREE.Vector3(x,0,z);g.userData.wanderTarget=null;g.userData.nextWander=performance.now()+1800+Math.random()*4200;
 g.traverse(o=>{if(o.name)o.name=o.name.replace(/-?\d+$/,'');});
 g.traverse(o=>{if(o.name.startsWith('Arm_'))g.userData.parts.arms.push(o); if(o.name.startsWith('Leg_'))g.userData.parts.legs.push(o); if(o.name==='Cloak')g.userData.parts.cloak=o;});
 if(role!=='player') characterDetail(g,role);
 // Hero presentation: layered equipment pieces are kept separate so the idle/walk pass can breathe without a skinned rig.
 if(role==='player'){g.userData.heroMeshes=[];g.traverse(o=>{if(o.isMesh)g.userData.heroMeshes.push(o);});}
 label(name,[x,5.15,z],'#f0e7d2',.58);characters.push(g);return g;
}
async function buildCharacters(){
 player=await spawnCharacter(0,30,0x60746e,'YOU','player');
 const mara=await spawnCharacter(5,-10,0x8b5144,'MARA','smith');
 const rowan=await spawnCharacter(14,13,0x506e4b,'ROWAN','watch');
 interact(mara,'Mara','The bell rang by itself. I heard footsteps on the mill roof after midnight.');
 interact(rowan,'Rowan','Keep to the road after dusk. The trees have been moving where there is no wind.');
}

// Small authored environmental effects.
const fireLights=[];const embers=[];
const warmWindows=[];
function fire(x,z){const core=addMesh(new THREE.IcosahedronGeometry(.42,1),new THREE.MeshBasicMaterial({color:0xff6f31,transparent:true,opacity:.82}),[x,.85,z],undefined,false);const l=new THREE.PointLight(0xff7a32,5.5,15);l.position.set(x,2,z);scene.add(l);fireLights.push(l);for(let i=0;i<8;i++){const e=addMesh(new THREE.SphereGeometry(.055,6,6),MAT.ember,[x+(Math.random()-.5)*.6,1+Math.random()*2,z+(Math.random()-.5)*.6],undefined,false);e.userData.phase=Math.random()*6.28;embers.push(e)}}
fire(5,-10);fire(-4,-28);fire(20,-24);
const falls=addMesh(new THREE.PlaneGeometry(9,13),new THREE.MeshBasicMaterial({color:0xbbe8e4,transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}),[45,7,33],[0,.42,0],false);


// Distant ruin silhouette: a low-poly landmark beyond the playable village, giving the horizon a destination.
function buildDistantRuin(){
 const g=new THREE.Group();g.position.set(-31,.15,48);
 for(let i=0;i<7;i++){const h=3.5+(i%3)*1.1;box(1.3,h,1.1,MAT_DETAIL.stone,[-4+i*1.35,h/2,0],(i%2)*.08,g)}
 box(10,.65,1.0,MAT_DETAIL.stone,[0,4.2,0],0,g);box(7,.45,.8,MAT_DETAIL.timber,[0,5.0,0],0,g);scene.add(g);label('THE OLD RUINS',[-31,8.2,48],'#d6c49a',.65);
}
buildDistantRuin();

// Named destination dressing: each secondary location gets a visual grammar of its own.
// The goal is immediate recognition from the meadow/road, not another anonymous prop cluster.
function buildFarmArrival(){
  // Designed arrival corridor: the old road narrows at the farm gate, then opens toward Hearthmere's core.
  const gx=-31.5,gz=-18.5;
  // Gate posts and a simple timber crossbeam establish a memorable threshold.
  for(const x of [gx-2.3,gx+2.3]){
    const post=cyl(.14,2.35,MAT_DETAIL.timber,[x,1.18,gz]); post.rotation.z=(x<gx?-.025:.025);
    cyl(.19,.22,MAT_DETAIL.stone,[x,.12,gz]);
  }
  box(4.9,.16,.18,MAT_DETAIL.timber,[gx,2.25,gz]);
  // Farm track shoulders taper into the village road rather than ending abruptly.
  for(let i=0;i<11;i++){
    const t=i/10, x=-38.5+t*8.0, z=-18.5+t*2.2;
    const r=box(.28,.10,.20,MAT_DETAIL.stone,[x,-.01,z],t*.7);
    r.scale.set(1+(i%3)*.35,1,1+(i%2)*.25);
  }
  // Low fencing leads the eye through the gate; gaps keep the arrival readable.
  for(let i=0;i<7;i++){
    const x=-39+i*1.45;
    if(i===3) continue;
    cyl(.08,1.15,MAT_DETAIL.timber,[x,.58,-16.0]);
    if(i<6) box(1.45,.09,.10,MAT_DETAIL.wood,[x+.72,.85,-16.0]);
  }
  // A small roadside sign faces the incoming player and points toward the village.
  const sign=new THREE.Group(); sign.position.set(-30.0,terrainHeight(-30,-14)+.02,-14); sign.rotation.y=-.35; scene.add(sign);
  cyl(.075,1.65,MAT_DETAIL.timber,[0,.82,0],[],sign);
  box(1.55,.42,.10,MAT_DETAIL.wood,[0,1.55,0],0,sign);
  label('HEARTHMERE',[gx,3.05,gz],'#e4c878',.55);

  // Arrival storytelling: cultivated land gives way to the lived-in village edge.
  // The dressing is asymmetric so the approach has a deliberate visual rhythm.
  const fieldX=-35.5, fieldZ=-24.0;
  for(let row=0;row<6;row++){
    const rowZ=fieldZ+row*.78;
    for(let i=0;i<13;i++){
      const stem=box(.055,.34,.055,MAT_DETAIL.flower,[fieldX-5.0+i*.76,.17,rowZ],(i%4)*.12);
      stem.scale.y=.72+(i%5)*.08;
    }
  }
  // A weathered handcart marks the farm side of the threshold.
  const cartX=-38.8,cartZ=-17.0;
  box(2.15,.12,1.15,MAT_DETAIL.wood,[cartX,.82,cartZ],-.08);
  box(1.65,.10,.12,MAT_DETAIL.timber,[cartX,1.28,cartZ],-.08);
  for(const z of [cartZ-.62,cartZ+.62]) cyl(.38,.16,MAT_DETAIL.stone,[cartX-.48,.42,z],[Math.PI/2,0,0]);
  for(const x of [cartX-.82,cartX+.82]) cyl(.06,1.15,MAT_DETAIL.timber,[x,1.02,cartZ],[],scene);
  // Low milestone creates a readable transition point without becoming a gameplay blocker.
  const mileX=-28.0,mileZ=-14.2;
  box(.48,.95,.34,MAT_DETAIL.stone,[mileX,.48,mileZ],-.12);
  box(.58,.08,.40,MAT_DETAIL.stone,[mileX,.97,mileZ],-.12);
  // Two warm lantern posts begin the village lighting language before the first houses.
  for(const [lx,lz] of [[-27.0,-12.8],[-24.4,-11.7]]){
    cyl(.065,1.75,MAT_DETAIL.timber,[lx,.88,lz]);
    const glow=new THREE.Mesh(new THREE.SphereGeometry(.11,10,8),new THREE.MeshStandardMaterial({color:0xffd27a,emissive:0xff9a32,emissiveIntensity:2.2,roughness:.35}));
    glow.position.set(lx,1.68,lz);scene.add(glow);
  }

  // Arrival reveal: a compact, irregular village apron gives the player a physical
  // threshold before the road dissolves into Hearthmere's lived-in core.
  const apron=new THREE.Group(); apron.position.set(-25.4,0,-10.9); scene.add(apron);
  for(let i=0;i<19;i++){
    const a=(i/19)*Math.PI*2, r=3.1+(i%4)*.34;
    const px=Math.cos(a)*r, pz=Math.sin(a)*r*.62;
    const stone=box(.72+(i%3)*.18,.045,.54+(i%2)*.12,MAT_DETAIL.stone,[px,.025,pz],a*.17,apron);
    stone.scale.y=.8+(i%3)*.08;
  }
  // Two asymmetrical hedge/brush masses frame the first view into the village,
  // leaving the central sightline open to the landmark cluster.
  for(const [bx,bz,sc] of [[-29.3,-9.2,1.25],[-22.2,-8.0,1.05],[-29.0,-6.8,.82]]){
    const bush=new THREE.Group(); bush.position.set(bx,terrainHeight(bx,bz),bz); scene.add(bush);
    for(let j=0;j<5;j++){
      const q=new THREE.Mesh(new THREE.IcosahedronGeometry(.58*sc*(.8+(j%3)*.12),1),MAT_DETAIL.leaf);
      q.position.set((j-2)*.32,.42+(j%2)*.18,(j%3)*.28-.28); q.scale.y=.72; q.castShadow=true; bush.add(q);
    }
  }
  // A pair of low wheel-rut stones visually continues the farm track into town.
  for(let i=0;i<8;i++){
    const t=i/7, z=-13.7+t*3.1, x=-27.2+t*1.4;
    for(const off of [-.72,.72]){
      const rut=box(.34,.035,.62,MAT_DETAIL.cobble,[x+off,.018,z],-.08+(i%2)*.03);
      rut.scale.x=.78+(i%3)*.08;
    }
  }
}

function buildImportantLocations(){
  // Hearthmere Farm — orderly crop rows, gate posts, hay and a little tool shed.
  const farmX=-36,farmZ=-20;
  for(let row=0;row<5;row++){
    for(let i=0;i<9;i++){
      const crop=box(.10,.38,.10,MAT_DETAIL.flower,[farmX-3.2+i*.82,.20,farmZ-2.6+row*1.25],0);
      crop.scale.y=.65+(i%3)*.12;
    }
  }
  for(const x of [farmX-4.2,farmX+4.2]) cyl(.13,2.0,MAT_DETAIL.timber,[x,1,farmZ],[],scene);
  box(8.6,.08,.10,MAT_DETAIL.wood,[farmX,2.0,farmZ]);
  hayStack(farmX+5.4,farmZ+1.5,1.15);hayStack(farmX+5.0,farmZ+3.0,.82);
  const shed=box(3.0,2.0,2.4,MAT_DETAIL.wood,[farmX+4.7,1,farmZ-3.0]);shed.castShadow=true;
  roofRidge(new THREE.Group(),3.6,3.0,1.0,MAT_DETAIL.timber);
  label('HEARTHMERE FARM',[farmX,5.0,farmZ],'#e4c878',.62);

  // Old mine — timber-framed stone portal, spoil heap and ore carts immediately signal a mine.
  const mineX=-43,mineZ=12;
  const portal=new THREE.Group();portal.position.set(mineX,terrainHeight(mineX,mineZ),mineZ);scene.add(portal);
  for(const x of [-2.0,2.0]) box(.75,3.8,1.0,MAT_DETAIL.stone,[x,1.9,0],0,portal);
  box(4.7,.85,1.0,MAT_DETAIL.stone,[0,4.0,0],0,portal);
  box(3.7,.22,.28,MAT_DETAIL.timber,[0,3.25,.55],0,portal);
  for(const x of [-1.45,0,1.45]) box(.18,3.0,.22,MAT_DETAIL.timber,[x,1.65,.58],0,portal);
  for(let i=0;i<7;i++) box(.55,.24,.42,MAT_DETAIL.stone,[-4.0+i*.55,.25,1.8+(i%2)*.38],i*.2);
  box(1.7,.22,1.0,MAT_DETAIL.wood,[-5.0,.28,2.8],-.08);
  label('OLD IRON MINE',[mineX,6.0,mineZ],'#d6c49a',.62);

  // Fisher's bend — dock posts, a small jetty, reeds and hanging nets create a water-specific identity.
  const fx=26,fz=-2;
  for(const x of [fx-2,fx,fx+2]) cyl(.10,2.0,MAT_DETAIL.timber,[x,1,fz+1.7]);
  box(4.7,.16,1.15,MAT_DETAIL.wood,[fx,.62,fz+1.7],0,scene);
  for(let i=0;i<5;i++) box(.12,.12,1.05,MAT_DETAIL.timber,[fx-1.8+i*.9,.82,fz+1.7],0,scene);
  reedPatch(29,-3,.2);reedPatch(30,0,-.4);
  const net=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.2,5,4),new THREE.MeshStandardMaterial({color:0x6c746b,transparent:true,opacity:.55,side:THREE.DoubleSide,roughness:1}));
  net.position.set(fx-2.8,1.4,fz+1.2);net.rotation.set(0,.2,-.18);scene.add(net);
  label('FISHER\'S BEND',[fx,3.7,fz],'#b9d8c8',.60);
  // Fisher's Bend landing: a lived-in west-bank work edge, with a skiff pulled above the reeds.
  const lx=17.15,lz=-2.6;
  const landing=new THREE.Group(); landing.position.set(lx,terrainHeight(lx,lz)+.03,lz); scene.add(landing);
  for(let i=0;i<6;i++){
    const stone=box(.62,.18,.42,MAT_DETAIL.stone,[-1.65+i*.66,.09,(i%2)*.12],i*.12,landing);
    stone.scale.set(1+(i%3)*.16,.8,1+(i%2)*.14);
  }
  // A small hauled-up skiff adds a strong silhouette without occupying the walking route.
  const boat=new THREE.Group(); boat.position.set(lx+2.1,terrainHeight(lx+2.1,lz+.9)+.10,lz+.9); boat.rotation.y=-.25; scene.add(boat);
  const hull=new THREE.Mesh(new THREE.CapsuleGeometry(.62,2.5,4,10),MAT_DETAIL.wood); hull.scale.set(.62,.22,1); hull.rotation.z=Math.PI/2; hull.castShadow=true; boat.add(hull);
  box(2.0,.07,.08,MAT_DETAIL.timber,[0,.30,0],0,boat);
  for(const zoff of [-.42,.42]) box(1.25,.06,.08,MAT_DETAIL.timber,[0,.34,zoff],0,boat);
  cyl(.035,1.65,MAT_DETAIL.timber,[.18,.88,0],[0,0,0],boat);
  const crateMat=new THREE.MeshStandardMaterial({color:0x70513a,roughness:.9});
  for(let i=0;i<3;i++) box(.62,.48,.58,crateMat,[4.0+i*.72,.28,-.45+(i%2)*.62],(i%2)*.12,landing);
  // A low net-drying frame and fish baskets make the location read as a working shoreline.
  for(const xoff of [3.25,5.0]) cyl(.06,1.65,MAT_DETAIL.timber,[xoff,.82,.75],[],landing);
  box(1.9,.06,.06,MAT_DETAIL.timber,[4.12,1.55,.75],0,landing);
  const smallNet=new THREE.Mesh(new THREE.PlaneGeometry(1.7,.95,5,3),new THREE.MeshStandardMaterial({color:0x687269,transparent:true,opacity:.48,side:THREE.DoubleSide,roughness:1}));
  smallNet.position.set(4.12,1.02,.78); smallNet.rotation.set(.08,.05,.12); landing.add(smallNet);

  // Moonwood clearing — a ring of deliberate standing stones and a central fire scar.
  const cx=36,cz=34;
  for(let i=0;i<8;i++){const a=i*Math.PI/4;const r=4.8;const s=box(.75,1.15,.62,MAT_DETAIL.stone,[cx+Math.cos(a)*r,.58,cz+Math.sin(a)*r],a*.15);s.scale.y=.7+(i%3)*.18;}
  for(let i=0;i<9;i++) cyl(.16,.7,MAT_DETAIL.wood,[cx+(Math.random()-.5)*1.7,.35,cz+(Math.random()-.5)*1.7],[0,Math.random()*Math.PI,Math.PI/2]);
  label('MOONWOOD CLEARING',[cx,3.0,cz],'#c8d1b2',.58);

  // Old road ruins — broken masonry, a fallen lintel and a lone marker make the distant destination tangible.
  const rx=-31,rz=48;
  for(let i=0;i<8;i++){const a=i%4;box(.65+.2*(i%2),.55+.25*(i%3),.55,MAT_DETAIL.stone,[rx-5+a*2.8,.35,rz-2+Math.floor(i/4)*4],i*.18)}
  box(7.0,.55,.75,MAT_DETAIL.stone,[rx,2.5,rz+3],.16);
  cyl(.12,2.7,MAT_DETAIL.timber,[rx+6,1.35,rz+1.5]);
  label('THE OLD ROAD RUINS',[rx,7.0,rz],'#d6c49a',.60);
}
buildImportantLocations();

// Soft atmospheric motes over the village. Sparse by design for mobile performance.
const motes=[];const moteMat=new THREE.SpriteMaterial({color:0xf1d9a0,transparent:true,opacity:.18,depthWrite:false});
for(let i=0;i<70;i++){const sp=new THREE.Sprite(moteMat.clone());sp.position.set(-45+Math.random()*90,1+Math.random()*9,-40+Math.random()*90);sp.scale.setScalar(.035+Math.random()*.055);sp.userData.phase=Math.random()*6.28;scene.add(sp);motes.push(sp)}

// Minimap
const mini=document.createElement('canvas');mini.width=220;mini.height=160;mini.style.cssText='position:fixed;right:18px;top:95px;width:220px;height:160px;border:1px solid rgba(228,200,120,.24);border-radius:12px;background:rgba(9,14,13,.72);box-shadow:0 12px 35px #0008;backdrop-filter:blur(8px);pointer-events:none';document.body.appendChild(mini);const mx=mini.getContext('2d');
function minimap(){mx.clearRect(0,0,220,160);mx.fillStyle='#15201d';mx.fillRect(0,0,220,160);mx.strokeStyle='#28757b';mx.lineWidth=20;mx.beginPath();mx.moveTo(170,0);mx.lineTo(150,160);mx.stroke();mx.strokeStyle='#79664e';mx.lineWidth=9;mx.beginPath();mx.moveTo(110,160);mx.lineTo(110,0);mx.stroke();mx.fillStyle='#8a755b';for(const p of [[62,35],[155,55],[55,100],[155,119],[112,24]])mx.fillRect(p[0],p[1],22,15);if(player){mx.fillStyle='#e4c878';mx.beginPath();mx.arc(110+(player.position.x/80)*70,80+(player.position.z/80)*65,4.5,0,Math.PI*2);mx.fill()}}

// Gameplay layer: small, tactile gathering loop and quest progression.
const resourceNodes=[];
function advanceQuest(step){
 if(step<=gameState.quest){say('You have already searched this place.');return;}
 gameState.quest=step;
 const texts={1:'Objective updated — inspect the Ashwheel Mill.',2:'Objective updated — ask Rowan what he saw from the watch.',3:'Objective complete — the crossing is listening.'};
 say(texts[step]||'Objective updated.');
 const q=document.querySelector('.quest');
 if(q){const title=q.querySelector('b'),desc=q.querySelector('span');
  if(step===1){title.textContent='Smoke on the Water';desc.textContent='Inspect the Ashwheel Mill and find out why the wheel turns without wind.'}
  if(step===2){title.textContent='A Quiet Watch';desc.textContent='Speak with Rowan at North Watch. Something is moving beyond the trees.'}
  if(step===3){title.textContent='The Listening Road';desc.textContent='The first mystery is solved. Follow the old road when the bells ring again.'}
 }
}
async function buildResourceNodes(){
 const specs=[];
 for(let i=0;i<14;i++) specs.push(['tree_oak',-40+Math.random()*18,-36+Math.random()*70,.42+Math.random()*.16]);
 for(let i=0;i<9;i++) specs.push(['rock',20+Math.random()*22,-36+Math.random()*68,.36+Math.random()*.12]);
 for(const [asset,x,z,scale] of specs){const g=await placeAsset(asset,x,z,scale,Math.random()*Math.PI*2);if(!g)continue;g.userData.resource={type:asset==='rock'?'stone':'wood',amount:1};interact(g,asset==='rock'?'Stone outcrop':'Young oak',asset==='rock'?'Gather a piece of clean river stone.':'Gather a fallen branch.',()=>gather(g));resourceNodes.push(g)}
}
function gather(g){const r=g.userData.resource;if(!r)return;if(!g.visible)return;say(r.type==='wood'?'You gather useful wood.':'You collect a smooth stone.');gameState.gathered++;gameState.inventory[r.type]=(gameState.inventory[r.type]||0)+r.amount;g.visible=false;setTimeout(()=>{g.visible=true},6500);}

// Movement and targeting
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let dest=null;let cinematicMode=false;let hovered=null;
function setHover(o){if(hovered===o)return;if(hovered?.traverse)hovered.traverse(m=>{if(m.isMesh&&m.material?.emissive)m.material.emissive.setHex(m.userData.baseEmissive||0x000000)});hovered=o;if(hovered?.traverse)hovered.traverse(m=>{if(m.isMesh&&m.material?.emissive){m.userData.baseEmissive=m.material.emissive.getHex();m.material.emissive.lerp(new THREE.Color(0x9d7b39),.35)}})}
renderer.domElement.addEventListener('pointermove',e=>{mouse.x=e.clientX/innerWidth*2-1;mouse.y=-(e.clientY/innerHeight)*2+1;ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(interactables,true);let o=hits[0]?.object||null;while(o&&!o.userData.interaction)o=o.parent;setHover(o)});
const destinationMarker=new THREE.Mesh(new THREE.RingGeometry(.34,.52,28),new THREE.MeshBasicMaterial({color:0xe7cb76,transparent:true,opacity:.86,side:THREE.DoubleSide,depthWrite:false}));destinationMarker.rotation.x=-Math.PI/2;destinationMarker.position.y=.18;destinationMarker.visible=false;scene.add(destinationMarker);
function terrainHeight(x,z){return Math.sin(x*.075)*.62+Math.cos(z*.082)*.48+Math.sin((x-z)*.035)*.72;}
function traversable(x,z){const riverBlocked=Math.abs(x-31)<13.4;const bridge=Math.abs(x-31)<6.2&&z>-2&&z<14;return !riverBlocked||bridge}
function say(s){toast.textContent=s;toast.classList.add('show');clearTimeout(say.t);say.t=setTimeout(()=>toast.classList.remove('show'),2600)}
function pick(e){mouse.x=e.clientX/innerWidth*2-1;mouse.y=-(e.clientY/innerHeight)*2+1;ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(interactables,true);if(hits.length){let o=hits[0].object;while(o&&!o.userData.interaction)o=o.parent;if(o){say(`${o.userData.interaction.name} — ${o.userData.interaction.msg}`);if(o.userData.interaction.action)o.userData.interaction.action();return}}const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),p=new THREE.Vector3();if(ray.ray.intersectPlane(plane,p)){p.x=THREE.MathUtils.clamp(p.x,-52,55);p.z=THREE.MathUtils.clamp(p.z,-58,64);if(!traversable(p.x,p.z)){say('The river is too deep here. Cross at the stone bridge.');return}dest=p.clone();destinationMarker.position.set(p.x,.2,p.z);destinationMarker.visible=true}}
renderer.domElement.addEventListener('pointerdown',pick);
cinematic.addEventListener('click',()=>{cinematicMode=!cinematicMode;document.body.classList.toggle('cinematic',cinematicMode);cinematic.textContent=cinematicMode?'RETURN':'CINEMATIC';say(cinematicMode?'Cinematic world view':'Interactive world view')});
addEventListener('keydown',e=>{if(e.key==='Escape'){dest=null;destinationMarker.visible=false;cinematicMode=false;document.body.classList.remove('cinematic');cinematic.textContent='CINEMATIC'}if(e.key.toLowerCase()==='m')say('Map — Ashenvale Crossing')});

// Living atmosphere: soft smoke columns and distant birds keep the scene from feeling static.
const smoke=[];
function smokeColumn(x,z){for(let i=0;i<7;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({color:0xb8b2a2,transparent:true,opacity:.055,depthWrite:false}));sp.position.set(x+(Math.random()-.5)*.4,.9+i*.65,z+(Math.random()-.5)*.4);sp.scale.setScalar(.35+Math.random()*.28);sp.userData.phase=Math.random()*6.28;smoke.push(sp);scene.add(sp)}}
smokeColumn(5,-10);smokeColumn(-4,-28);smokeColumn(20,-24);
const birds=[];const birdMat=new THREE.MeshBasicMaterial({color:0x1e2825,side:THREE.DoubleSide});
for(let i=0;i<5;i++){const b=new THREE.Mesh(new THREE.PlaneGeometry(.7,.22),birdMat);b.position.set(-30+i*11,13+i*.7,15+i*9);b.userData.phase=i*1.7;scene.add(b);birds.push(b)}
let last=performance.now(),time=0;const tmpTarget=new THREE.Vector3();

// Hero readability pass: a soft selection disc, grounded shadow, and stronger layered motion.
const heroRing=new THREE.Mesh(new THREE.RingGeometry(.52,.68,32),new THREE.MeshBasicMaterial({color:0xe5c66e,transparent:true,opacity:.34,side:THREE.DoubleSide,depthWrite:false}));
heroRing.rotation.x=-Math.PI/2;heroRing.position.y=.035;heroRing.visible=false;scene.add(heroRing);
function updateHeroPresentation(){
  if(!player)return;
  heroRing.visible=true;heroRing.position.set(player.position.x,.035,player.position.z);heroRing.scale.setScalar(1+Math.sin(time*2.8)*.035);
  const walking=player.userData.walking?1:0, ph=time*(walking?9.5:2.1)+player.userData.phase;
  if(player.userData.parts.arms.length){player.userData.parts.arms.forEach((a,j)=>{a.rotation.z=Math.sin(ph)*(walking?.34:.025)*(j?-1:1);a.rotation.x=walking?Math.cos(ph)*.08:Math.sin(time*1.4+ j)*.012;});}
  if(player.userData.parts.legs.length){player.userData.parts.legs.forEach((l,j)=>l.rotation.x=Math.sin(ph)*(walking?.48:.018)*(j?-1:1));}
  if(player.userData.parts.cloak){player.userData.parts.cloak.rotation.x=Math.sin(time*2.2+player.userData.phase)*.035;player.userData.parts.cloak.rotation.y=Math.sin(time*1.7+player.userData.phase)*.028;}
  if(player.userData.heroCape){const amp=walking?.055:.018;player.userData.heroCape.rotation.z=Math.sin(ph*.72)*amp;player.userData.heroCape.rotation.y=-.08+Math.sin(ph*.51)*amp*.7;}
  if(player.userData.heroShield){player.userData.heroShield.rotation.z=-.10+Math.sin(ph)*.018*walking;player.userData.heroShield.position.y=1.55+Math.sin(ph)*.012*walking;}
  if(player.userData.heroBlade){player.userData.heroBlade.rotation.z=-.24+Math.sin(ph)*.012*walking;}
}

function updateVillager(g,t,dt){
 if(g===player)return;
 const now=t;
 if(!g.userData.wanderTarget && now>g.userData.nextWander){
   const a=Math.random()*Math.PI*2,r=2.5+Math.random()*5.5;
   const tx=g.userData.home.x+Math.cos(a)*r,tz=g.userData.home.z+Math.sin(a)*r;
   if(traversable(tx,tz)){g.userData.wanderTarget=new THREE.Vector3(tx,0,tz);g.userData.walking=true;}
   g.userData.nextWander=now+6500+Math.random()*6500;
 }
 const target=g.userData.wanderTarget;if(!target)return;
 const d=target.clone().sub(g.position);d.y=0;const len=d.length();
 if(len<.28){g.userData.wanderTarget=null;g.userData.walking=false;return;}
 d.normalize();g.position.x+=d.x*dt*1.15;g.position.z+=d.z*dt*1.15;g.position.y=terrainHeight(g.position.x,g.position.z)+.02;
 g.rotation.y=THREE.MathUtils.lerp(g.rotation.y,Math.atan2(d.x,d.z),Math.min(1,dt*7));
}
function frame(t){const dt=Math.min(.05,(t-last)/1000);last=t;time+=dt;
 if(MAT.water.userData.shader)MAT.water.userData.shader.uniforms.uTime.value=time;
 if(dest&&player){const d=dest.clone().sub(player.position);d.y=0;const len=d.length();if(len<.25){dest=null;player.userData.walking=false;destinationMarker.visible=false}else{d.normalize();const next=player.position.clone().addScaledVector(d,dt*5.5);if(traversable(next.x,next.z)){player.position.copy(next);player.position.y=terrainHeight(next.x,next.z)+.02;player.rotation.y=Math.atan2(d.x,d.z);player.userData.walking=true}else{dest=null;player.userData.walking=false;destinationMarker.visible=false;say('You cannot cross the river here.')}}}
 characters.forEach((g,i)=>{
  updateVillager(g,t,dt);
  const walk=g.userData.walking?1:0; const phase=time*9+g.userData.phase; const swing=Math.sin(phase)*(.48*walk+.06*(1-walk));
  if(g.userData.parts.arms.length){g.userData.parts.arms.forEach((a,j)=>a.rotation.z=(j?swing:-swing));}
  if(g.userData.parts.legs.length){g.userData.parts.legs.forEach((l,j)=>l.rotation.x=(j?-swing:swing)*.7);}
  // Current character source is unskinned; subtle root motion keeps the silhouette alive.
  g.position.y+=(walk?Math.sin(phase)*.028:Math.sin(time*2+g.userData.phase)*.012);
  g.rotation.z=THREE.MathUtils.lerp(g.rotation.z,Math.sin(phase*.5)*(.018*walk),.12);
  if(g.userData.parts.cloak)g.userData.parts.cloak.position.z=.38+Math.sin(time*3.1+g.userData.phase)*.025;
  if(g===player&&g.userData.heroMeshes){const breathe=Math.sin(time*2.15)*.012;g.userData.heroMeshes.forEach((m,j)=>{m.rotation.z+=Math.sin(time*1.7+j*.37)*.0007;m.scale.y=1+breathe*(j%3===0?1:.35)});}
  if(g.userData.mixer)g.userData.mixer.update(dt);if(g===player){g.position.y=terrainHeight(g.position.x,g.position.z)+.02+Math.sin(time*7)*.018}else{g.position.y=terrainHeight(g.position.x,g.position.z)+.02+Math.sin(time*1.7+(g.userData.phase||0))*.035;g.rotation.y+=Math.sin(time*.65+(g.userData.phase||0))*dt*.018}});
 foliage.forEach((g,i)=>{const ph=g.userData.windPhase??i*.71;const st=g.userData.windStrength??.008;g.rotation.z=Math.sin(time*.48+ph)*st;g.rotation.x=Math.cos(time*.42+ph*.61)*st*.72});
 shorelineGlints.forEach((g,i)=>{g.material.opacity=.10+.11*(Math.sin(time*1.35+i*.63)+1)/2;g.scale.x=.82+.32*(Math.sin(time*1.1+i)+1)/2});
 if(MAT.grass.userData.shader)MAT.grass.userData.shader.uniforms.uTime.value=time;
 updateHeroPresentation();
 foam.forEach((r,i)=>{r.position.z+=dt*(.65+(i%4)*.1);r.scale.x=1.5+Math.sin(time*1.8+i)*.22;r.material.opacity=.16+.10*(Math.sin(time*1.4+i)+1);if(r.position.z>62)r.position.z=-52;r.position.x=27+Math.sin(time*.7+i*1.8)*3.8});
 embers.forEach((e,i)=>{e.position.y+=dt*(.35+Math.sin(i)*.08);e.position.x+=Math.sin(time*2+i)*dt*.025;if(e.position.y>3)e.position.y=.9;e.material.opacity=.35+.5*(Math.sin(time*6+i)+1)/2});
 fireLights.forEach((l,i)=>l.intensity=5.1+Math.sin(time*7+i)*.75+Math.sin(time*13)*.3);warmWindows.forEach((m,i)=>m.emissiveIntensity=.10+.055*(Math.sin(time*.9+i*.73)+1)/2);
 smoke.forEach((s,i)=>{s.position.y+=dt*(.22+.025*i);s.position.x+=Math.sin(time*.65+s.userData.phase)*dt*.018;s.material.opacity=.035+.025*(Math.sin(time*.8+s.userData.phase)+1)/2;if(s.position.y>6){s.position.y=.9;s.position.x+=((i%2)-.5)*.3}});
 birds.forEach((b,i)=>{b.position.x+=dt*(1.2+i*.15);b.position.z+=Math.sin(time*.8+b.userData.phase)*dt*.12;b.rotation.z=Math.sin(time*7+b.userData.phase)*.16;if(b.position.x>55)b.position.x=-55});
 motes.forEach((m,i)=>{m.position.y+=dt*(.018+Math.sin(i)*.006);m.position.x+=Math.sin(time*.25+m.userData.phase)*dt*.012;m.material.opacity=.08+.12*(Math.sin(time*.7+m.userData.phase)+1)/2;if(m.position.y>10)m.position.y=1});
 const day=(Math.sin(time*.014)+1)/2;scene.fog.density=.00235+.00075*(1-day);sun.position.x=-58+Math.sin(time*.018)*18;sun.position.z=42+Math.cos(time*.014)*14;sun.intensity=1.8+3.0*day;moon.intensity=.10+.42*(1-day);hemi.intensity=1.0+.82*day;renderer.toneMappingExposure=.84+.30*day;
 if(player){tmpTarget.set(player.position.x,0,player.position.z);controls.target.lerp(tmpTarget,.07)}controls.update();destinationMarker.scale.setScalar(1+Math.sin(time*5)*.08);minimap();renderer.render(scene,camera);if(autoCaptureArmed && player && renderer.info.render.calls>0){autoCaptureArmed=false;captureRequested=true;}if(captureRequested){captureRequested=false;renderer.domElement.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='hearthmere-real-game-frame.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)},'image/png')}requestAnimationFrame(frame)}
requestAnimationFrame(frame);

(async()=>{bootSet(.10,'Assembling the village…');await buildLandmarks();bootSet(.69,'Dressing Hearthmere…');await dressVillage();await buildResidentialQuarter();addVillageMicroDressing();bootSet(.79,'Growing the woodland…');await buildFoliage();bootSet(.82,'Finishing woodland dressing…');await buildNaturalDressing();buildFarmArrival();bootSet(.86,'Placing gathering sites…');await buildResourceNodes();bootSet(.91,'Calling the villagers…');await buildCharacters();await buildInteractions();bootSet(1,'The lanterns are lit.');setTimeout(()=>{boot.style.opacity='0';setTimeout(()=>boot.remove(),650)},420)})().catch(err=>{console.error(err);bootStatus.textContent='The crossing could not be prepared.'});

document.querySelectorAll('.tabs button').forEach((btn,i)=>btn.addEventListener('click',()=>{document.querySelectorAll('.tabs button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const bodies=['INVENTORY — 15 carried items','SKILLS — Combat 1 · Gathering 1 · Crafting 1','EQUIPMENT — Iron blade · Traveller cloak · Field boots','MAP — Ashenvale Crossing'];say(bodies[i]||'Hearthmere');}));
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));mini.style.right=innerWidth<600?'10px':'18px';mini.style.top=innerWidth<600?'58px':'95px'});
