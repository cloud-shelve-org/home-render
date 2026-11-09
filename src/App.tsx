import { useEffect, useRef, useState } from 'react';
import * as T from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type FloorMode = 'both' | 'ground' | 'first';
type ViewName = 'front' | 'rear' | 'east' | 'west' | 'aerial' | 'interior';
type SunMode = 'morning' | 'midday' | 'evening';

export default function App() {
  const mount = useRef<HTMLDivElement>(null);
  const [floor, setFloor] = useState<FloorMode>('both');
  const [view, setView] = useState<ViewName>('front');
  const [sun, setSun] = useState<SunMode>('morning');
  const [extension, setExtension] = useState(false);
  const [wireframe, setWireframe] = useState(false);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: T.WebGLRenderer;
    let controls: OrbitControls;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let disposed = false;

    try {
      const scene = new T.Scene();
      scene.background = new T.Color('#d9e2d5');
      scene.fog = new T.Fog('#d9e2d5', 115, 240);
      const camera = new T.PerspectiveCamera(38, 1, 0.1, 500);
      renderer = new T.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFSoftShadowMap;
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      host.appendChild(renderer.domElement);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.target.set(0, 8, 0);
      controls.minDistance = 18;
      controls.maxDistance = 145;
      controls.maxPolarAngle = Math.PI * 0.49;
      controls.screenSpacePanning = true;

      scene.add(new T.HemisphereLight(0xfff7e9, 0x77745e, 2.0));
      const sunLight = new T.DirectionalLight(0xffd8a0, sun === 'midday' ? 3.1 : 2.4);
      sunLight.position.set(sun === 'morning' ? -65 : sun === 'evening' ? 65 : -10, 75, 48);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.left = -85;
      sunLight.shadow.camera.right = 85;
      sunLight.shadow.camera.top = 85;
      sunLight.shadow.camera.bottom = -85;
      scene.add(sunLight);

      const mat = (color: string, roughness = 0.86, metalness = 0) =>
        new T.MeshStandardMaterial({ color, roughness, metalness });
      const plaster = mat('#e8ddc9');
      const plasterLight = mat('#f0e8d9');
      const brick = mat('#a95635');
      const brickDark = mat('#713c2b');
      const concrete = mat('#a9a398');
      const concreteTop = mat('#c4bdb0');
      const wood = mat('#795039');
      const woodLight = mat('#a77b53');
      const dark = mat('#302e29');
      const glass = new T.MeshPhysicalMaterial({ color: '#8baeb0', roughness: 0.18, metalness: 0.05, transparent: true, opacity: 0.58 });
      const green = mat('#667c4d');
      const lawnMat = mat('#71865a');
      const stone = mat('#b6ad9d');
      const bedBase = mat('#92775f');
      const linen = mat('#e8dfcf');
      const sofaMat = mat('#b9ad9b');

      const ground = new T.Mesh(new T.PlaneGeometry(240, 240), lawnMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.42;
      ground.receiveShadow = true;
      scene.add(ground);

      const house = new T.Group();
      scene.add(house);
      const box = (parent: T.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, material: T.Material, cast = true) => {
        const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
        mesh.position.set(x, y + h / 2, z);
        mesh.castShadow = cast;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
      };
      const cylinder = (parent: T.Object3D, radius: number, height: number, x: number, y: number, z: number, material: T.Material, sides = 12) => {
        const mesh = new T.Mesh(new T.CylinderGeometry(radius, radius, height, sides), material);
        mesh.position.set(x, y + height / 2, z);
        mesh.castShadow = true;
        parent.add(mesh);
        return mesh;
      };

      // South-facing garden, entrance walk and plinth.
      box(house, 68, 0.55, 39, 0, 0, 0, concrete);
      box(house, 65, 0.22, 36, 0, 0.55, 0, stone, false);
      // Broad front steps toward the south (positive Z).
      for (let i = 0; i < 4; i++) box(house, 14 + i * 2, 0.22, 2.2, 0, 0.05 + i * 0.22, 22 + i * 2.05, concreteTop);
      // Front walkway from south road.
      for (let i = 0; i < 9; i++) box(house, 5.8, 0.12, 3.2, 0, -0.05, 31 + i * 4.1, stone, false);
      // South road and eastern side path.
      box(house, 190, 0.12, 13, 0, -0.38, 52, mat('#777a76'), false);
      box(house, 4.5, 0.08, 54, 35, -0.12, 22, stone, false);
      // Boundary markers, planted beds.
      box(house, 0.45, 1.2, 82, -39, 0, 5, plasterLight);
      box(house, 0.45, 1.2, 82, 39, 0, 5, plasterLight);
      box(house, 80, 1.2, 0.45, 0, 0, -36, plasterLight);

      const groundLevel = floor !== 'first';
      const firstLevel = floor !== 'ground';

      if (groundLevel) {
        const g = new T.Group();
        house.add(g);
        // Ground floor: 60 x 30 ft footprint, with deep south verandah.
        box(g, 60, 11, 0.7, 0, 0.75, -15, plaster);
        box(g, 0.7, 11, 30, -29.65, 0.75, 0, plaster);
        box(g, 0.7, 11, 30, 29.65, 0.75, 0, plaster);
        box(g, 60, 11, 0.7, 0, 0.75, 15, view === 'interior' ? new T.MeshStandardMaterial({ color: '#e8ddc9', transparent: true, opacity: 0.13, depthWrite: false }) : plaster);
        // Internal partitions hint at the room arrangement.
        box(g, 0.35, 10, 28, -9, 0.8, 0, plasterLight);
        box(g, 0.35, 10, 28, 10, 0.8, 0, plasterLight);
        box(g, 19, 10, 0.35, -19, 0.8, -1, plasterLight);
        box(g, 19, 10, 0.35, 20, 0.8, -1, plasterLight);
        // Entry portal and timber front door.
        box(g, 5.4, 8.2, 0.22, 0, 1.0, 15.38, dark);
        box(g, 4.2, 7.2, 0.18, 0, 1.1, 15.55, wood);
        box(g, 0.12, 7, 0.08, 1.25, 1.2, 15.68, woodLight);
        cylinder(g, 0.12, 0.35, 1.35, 4.1, 15.8, concreteTop, 10);
        // South verandah roof and deep shade.
        box(g, 68, 0.75, 12, 0, 10.95, 22, concreteTop);
        box(g, 68, 0.18, 12, 0, 11.72, 22, wood);
        for (const x of [-30, -15, 15, 30]) {
          box(g, 0.8, 10.6, 0.8, x, 0.8, 26.8, concrete);
          box(g, 1.05, 0.25, 1.05, x - 0.1, 0.55, 26.7, concreteTop);
        }
        // Front windows: dark frames, divided panes, timber lintels.
        for (const x of [-23, -14, 12, 23]) {
          box(g, 5.1, 4.5, 0.25, x, 3.2, 15.38, dark);
          box(g, 4.55, 3.95, 0.12, x, 3.45, 15.55, glass);
          box(g, 0.13, 4.0, 0.1, x, 3.4, 15.68, wood);
          box(g, 4.5, 0.12, 0.1, x, 5.35, 15.68, wood);
          box(g, 4.8, 0.18, 0.4, x, 7.72, 15.2, woodLight);
        }
        // Side windows and ventilation slots.
        for (const z of [-10, 0, 9]) {
          box(g, 0.2, 4.2, 4.2, -30.05, 3.3, z, dark);
          box(g, 0.12, 3.7, 3.7, -30.18, 3.5, z, glass);
          box(g, 0.2, 3.8, 4.5, 30.05, 3.5, z, dark);
          box(g, 0.12, 3.3, 4.0, 30.18, 3.7, z, glass);
        }
        // Brick jali feature rising beside entry.
        box(g, 5.2, 10.4, 0.65, 6.1, 1.0, 15.2, brick);
        for (let row = 0; row < 10; row++) {
          for (let col = 0; col < 5; col++) {
            box(g, 0.62, 0.62, 0.78, 4.35 + col * 0.88, 1.35 + row * 0.94, 15.25, brickDark);
          }
        }
        // Simple furniture blocks make the interior camera useful for spatial reading.
        const furniture = new T.Group();
        g.add(furniture);
        const bed = (x: number, z: number) => {
          box(furniture, 7.5, 1.0, 7.0, x, 0.9, z, bedBase);
          box(furniture, 7.2, 0.55, 6.7, x, 1.9, z, linen);
          box(furniture, 7.3, 1.4, 0.5, x, 1.0, z + 3.5, woodLight);
          box(furniture, 2.7, 0.7, 1.5, x - 1.8, 2.0, z + 2.1, plasterLight);
          box(furniture, 2.7, 0.7, 1.5, x + 1.8, 2.0, z + 2.1, plasterLight);
        };
        bed(-19, -6); bed(20, -6);
        // Living seating, centre table and dining table.
        box(furniture, 10, 1.8, 3.0, 1, 1.0, 3, sofaMat);
        box(furniture, 2.0, 1.4, 8.0, -4.0, 1.0, 3, sofaMat);
        box(furniture, 5.5, 1.0, 3.5, 1, 0.9, -3, woodLight);
        box(furniture, 8, 0.35, 4.5, -1, 3.0, -12, wood);
        for (const x of [-4, 2, 6]) for (const z of [-14, -10]) box(furniture, 0.65, 2.2, 0.65, x, 0.8, z, woodLight);
        // Ground floor slab / first-floor terrace edge is removed for the cutaway view.
        if (view !== 'interior') {
          box(g, 68, 0.8, 39, 0, 11.8, 0, concreteTop);
          box(g, 70, 0.2, 41, 0, 12.6, 0, wood);
        }
        // Stair block visible on east side.
        for (let i = 0; i < 12; i++) box(g, 8, 0.22, 1.15, 22, 0.8 + i * 0.32, -12 + i * 1.05, concreteTop);
      }

      if (firstLevel) {
        const f = new T.Group();
        house.add(f);
        const y = 12.7;
        // Recessed first-floor volume, shifted back to make a roof terrace.
        box(f, 38, 9.4, 0.65, -4, y, -8.8, plasterLight);
        box(f, 0.65, 9.4, 22, -23, y, 2, plasterLight);
        box(f, 0.65, 9.4, 22, 15, y, 2, plasterLight);
        box(f, 38, 9.4, 0.65, -4, y, 13, plasterLight);
        // Upper-level glazing and timber-framed windows.
        for (const x of [-16, -5, 7]) {
          box(f, 5.5, 4.2, 0.22, x, y + 2.0, 13.38, dark);
          box(f, 4.9, 3.7, 0.12, x, y + 2.25, 13.52, glass);
          box(f, 0.14, 3.7, 0.1, x, y + 2.25, 13.65, wood);
        }
        // Brick jali tower feature.
        box(f, 6.5, 10, 0.7, 10.2, y, 13.1, brick);
        for (let row = 0; row < 9; row++) {
          for (let col = 0; col < 6; col++) {
            box(f, 0.72, 0.65, 0.78, 7.55 + col * 0.98, y + 0.55 + row * 0.98, 13.2, brickDark);
          }
        }
        // Basic bedroom and lounge furniture for the upper cutaway view.
        if (view === 'interior') {
          box(f, 10, 1.0, 7, -5, y + 0.8, -1, bedBase);
          box(f, 9.6, 0.5, 6.6, -5, y + 1.8, -1, linen);
          box(f, 9, 1.6, 3.0, 5, y + 0.8, 7, sofaMat);
          box(f, 4.0, 0.8, 2.5, 5, y + 0.8, 2, woodLight);
        }
        // Upper balcony with timber soffit and railing.
        box(f, 45, 0.55, 8, -1, y, 18, concreteTop);
        box(f, 45, 0.18, 8, -1, y + 0.58, 18, wood);
        box(f, 45, 0.2, 0.18, -1, y + 1.0, 22, wood);
        for (let x = -22; x <= 20; x += 2.8) box(f, 0.12, 1.0, 0.12, x, y + 0.15, 22, wood);
        // Staggered roof slabs and deep overhangs.
        if (view !== 'interior') {
          box(f, 49, 0.65, 30, -3, y + 9.45, 1, concreteTop);
          box(f, 50, 0.18, 30, -3, y + 10.12, 1, wood);
          box(f, 30, 0.6, 22, 3, y + 10.1, -8, concrete);
        }
        // Parapet on roof terrace.
        box(f, 30, 1.0, 0.25, 4, y + 10.2, 12, plaster);
        box(f, 0.25, 1.0, 20, -11, y + 10.2, 2, plaster);
      }

      // Future rear extension shown as a dashed/wireframe volume.
      if (extension) {
        const ext = new T.Mesh(new T.BoxGeometry(34, 10, 23), new T.MeshBasicMaterial({ color: '#b45f3c', wireframe: true }));
        ext.position.set(0, 5.2, -49);
        house.add(ext);
        const labelBase = box(house, 34, 0.12, 23, 0, -0.1, -49, brick, false);
        labelBase.material = new T.MeshBasicMaterial({ color: '#b45f3c', wireframe: true });
      }

      // Tropical planting beds, pots and stylized trees.
      const addTree = (x: number, z: number, scale = 1) => {
        cylinder(house, 0.45 * scale, 5.5 * scale, x, 0, z, wood, 9);
        const crown = new T.Mesh(new T.IcosahedronGeometry(3.0 * scale, 1), green);
        crown.position.set(x, 7.0 * scale, z);
        crown.castShadow = true;
        house.add(crown);
        for (let i = 0; i < 5; i++) {
          const leaf = new T.Mesh(new T.SphereGeometry(1.35 * scale, 8, 6), mat('#81965d'));
          leaf.scale.set(1.8, 0.45, 0.75);
          leaf.position.set(x + Math.cos(i * 1.25) * 2.2 * scale, 7.2 * scale + (i % 2), z + Math.sin(i * 1.25) * 2.2 * scale);
          leaf.rotation.y = i * 0.9;
          house.add(leaf);
        }
      };
      const addPlant = (x: number, z: number) => {
        cylinder(house, 0.65, 0.65, x, 0, z, brick, 12);
        for (let i = 0; i < 7; i++) {
          const leaf = new T.Mesh(new T.ConeGeometry(0.22, 2.2, 5), green);
          leaf.position.set(x + Math.cos(i * Math.PI * 2 / 7) * 0.5, 1.35, z + Math.sin(i * Math.PI * 2 / 7) * 0.5);
          leaf.rotation.z = Math.cos(i * Math.PI * 2 / 7) * 0.45;
          leaf.rotation.x = Math.sin(i * Math.PI * 2 / 7) * 0.45;
          house.add(leaf);
        }
      };
      addTree(-43, 20, 1.35); addTree(44, 19, 1.2); addTree(-40, -28, 1.1); addTree(43, -30, 1.15);
      for (const x of [-29, -20, -10, 10, 20, 29]) { addPlant(x, 29); addPlant(x, -24); }
      for (let i = 0; i < 10; i++) addPlant(36, -22 + i * 4.5);

      const views: Record<ViewName, [number, number, number]> = {
        front: [0, 26, 83], rear: [0, 26, -83], east: [83, 24, 0],
        west: [-83, 24, 0], aerial: [0, 112, 52], interior: [18, 20, 38]
      };
      camera.position.set(...views[view]);
      controls.target.set(0, 9, 0);
      const resize = () => {
        if (!host || disposed) return;
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(host);
      const animate = () => {
        if (disposed) return;
        frame = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const panel = document.getElementById('boot-diagnostic');
      if (panel) {
        panel.style.display = 'block';
        panel.querySelector('h2')!.textContent = '3D renderer could not start';
        panel.querySelector('pre')!.textContent = message;
      }
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      controls?.dispose();
      if (renderer) {
        renderer.dispose();
        if (host.contains(renderer.domElement)) host.removeChild(renderer.domElement);
      }
    };
  }, [floor, view, extension, sun, wireframe]);

  return <main className="app-shell">
    <header className="site-header"><div className="brand-mark">⌂</div><div><b>SUNDARGARH DREAM HOME</b><span>ARCHITECTURAL 3D STUDY · ODISHA</span></div><div className="header-tag">CONCEPT DESIGN / 01</div></header>
    <section className="hero-copy"><div><div className="eyebrow">A HOME DESIGNED AROUND LIGHT, SHADE &amp; GARDEN</div><h1>Explore your future home.</h1><p>A warm, contemporary Indian duplex concept with shaded verandahs, brick jali and tropical landscaping.</p></div><div className="area-summary"><div><b>1,800</b><span>GROUND SQ.FT.</span></div><div><b>900</b><span>FIRST SQ.FT.</span></div><div><b>800</b><span>FUTURE SQ.FT.</span></div></div></section>
    <section className="workspace">
      <div className="model-card"><div className="model-toolbar"><div><span className="live-dot"></span> INTERACTIVE 3D MODEL <small>DRAG TO ROTATE · PINCH TO ZOOM</small></div><button onClick={() => setView('front')}>Reset view ↗</button></div><div ref={mount} className="model-canvas"/><div className="view-strip">{([['front','South / Front'],['rear','North / Garden'],['east','East'],['west','West'],['aerial','Aerial'],['interior','Interior angle']] as [ViewName,string][]).map(([v,label])=><button key={v} className={view===v?'selected':''} onClick={()=>setView(v)}>{label}</button>)}</div></div>
      <aside className="control-panel"><div className="panel-heading"><span>MODEL SETTINGS</span><b>Explore</b></div><label>Floor visibility</label><div className="segmented">{(['both','ground','first'] as FloorMode[]).map(v=><button key={v} className={floor===v?'selected':''} onClick={()=>setFloor(v)}>{v==='both'?'Both floors':v==='ground'?'Ground':'First'}</button>)}</div><label>Sunlight study</label><div className="segmented">{(['morning','midday','evening'] as SunMode[]).map(v=><button key={v} className={sun===v?'selected':''} onClick={()=>setSun(v)}>{v}</button>)}</div><label className="check-row"><span>Show future rear extension</span><input type="checkbox" checked={extension} onChange={e=>setExtension(e.target.checked)}/></label><div className="orientation"><b>ORIENTATION</b><div className="compass"><span>N</span><span>W</span><span>E</span><span>S</span><i>⌖</i></div><p>Main road on South · Entry from East</p></div><p className="disclaimer">This is a visual concept model, not a construction drawing. Exact room layouts, dimensions, structural members and setbacks require architect/engineer validation.</p></aside>
    </section>
    <section className="reference-gallery">
      <div className="gallery-heading"><div><span className="eyebrow">DESIGN REFERENCES</span><h2>Spaces, materials &amp; atmosphere</h2><p>Visual direction for the exterior and interiors. These are inspiration photographs, not the final project render.</p></div><span className="gallery-note">REFERENCE MOODBOARD</span></div>
      <div className="gallery-grid">
        <figure className="gallery-feature"><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1500&q=85" alt="Warm contemporary home exterior with garden" /><figcaption>01 / Exterior character</figcaption></figure>
        <figure><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=85" alt="Warm modern living room" /><figcaption>02 / Living room</figcaption></figure>
        <figure><img src="https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=900&q=85" alt="Contemporary dining and living interior" /><figcaption>03 / Dining space</figcaption></figure>
        <figure><img src="https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=85" alt="Warm bedroom interior" /><figcaption>04 / Bedroom palette</figcaption></figure>
        <figure><img src="https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=900&q=85" alt="Contemporary home interior detail" /><figcaption>05 / Material direction</figcaption></figure>
      </div>
    </section>
    <section className="detail-grid"><article><span>01 / GROUND FLOOR</span><h2>Family living, all on one level.</h2><p>Two bedrooms, living and dining spaces, kitchen, bathrooms and a broad shaded front verandah.</p></article><article><span>02 / FIRST FLOOR</span><h2>A quieter private retreat.</h2><p>Third bedroom, family lounge, bathroom, balcony and open terrace.</p></article><article><span>03 / CLIMATE RESPONSE</span><h2>Built for the Odisha climate.</h2><p>Deep overhangs, shaded openings, cross-ventilation, brick jali, roof insulation and monsoon-ready drainage.</p></article><article><span>04 / MATERIAL PALETTE</span><h2>Honest, warm materials.</h2><p>RCC structure, supplied mud-brick infill, concrete ceilings, timber-tone soffits, stone steps and no floor tiles.</p></article></section>
    <footer><b>DESIGN NOTE</b><span>Confirm plot survey, soil conditions, local setbacks, Vastu preferences, structural design and rainwater disposal with qualified local professionals before construction.</span></footer>
  </main>;
}
