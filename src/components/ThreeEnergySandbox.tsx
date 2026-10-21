import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Play, Pause, RotateCcw, Eye, Layers } from 'lucide-react';
import { ENERGY_SOURCES, MIMO_SCENARIOS } from '../constants/videoData';
import { ScenarioId, SimulationYear, EnergySourceKey } from '../types/video';

interface ThreeEnergySandboxProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeScenarioId: ScenarioId;
  activeYear: SimulationYear;
  onSelectScenario: (id: ScenarioId) => void;
  onSelectYear: (year: SimulationYear) => void;
  onSeekVideo: (seconds: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

interface SelectedNodeInfo {
  title: string;
  subtitle: string;
  metricLabel: string;
  metricValue: string;
  description: string;
  color: string;
}

// Reusable module-scope math helpers (zero GC in render loop)
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();

function createLabelTexture(
  renderer: THREE.WebGLRenderer,
  title: string,
  valueText: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 192);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 180);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 34px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 72);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 58px "JetBrains Mono", monospace';
  ctx.fillText(valueText, 256, 146);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.needsUpdate = true;
  return texture;
}

export const ThreeEnergySandbox: React.FC<ThreeEnergySandboxProps> = ({
  videoRef,
  activeScenarioId,
  activeYear,
  onSelectScenario,
  onSelectYear,
  onSeekVideo,
  isPlaying,
  onTogglePlay,
}) => {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [explodedFactor, setExplodedFactor] = useState<number>(0);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'pillars' | 'equipment' | 'screen'>('overview');
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);

  // Store mutable refs for animation loop access without re-mounting WebGL
  const stateRef = useRef({
    scenarioId: activeScenarioId,
    year: activeYear,
    exploded: explodedFactor,
    cameraPreset: 'overview' as 'overview' | 'pillars' | 'equipment' | 'screen',
    cameraTransitionActive: false,
  });

  useEffect(() => {
    stateRef.current.scenarioId = activeScenarioId;
    stateRef.current.year = activeYear;
  }, [activeScenarioId, activeYear]);

  useEffect(() => {
    stateRef.current.exploded = explodedFactor;
  }, [explodedFactor]);

  const handleCameraPresetChange = (preset: 'overview' | 'pillars' | 'equipment' | 'screen') => {
    setCameraPreset(preset);
    stateRef.current.cameraPreset = preset;
    stateRef.current.cameraTransitionActive = true;
  };

  useEffect(() => {
    const container = canvasMountRef.current;
    if (!container) return;

    // 1. Software WebGL detection
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || 1200;
    const height = container.clientHeight || 680;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.018);

    // 2. Studio Environment Map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    camera.position.set(0, 11.5, 22);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 6;
    controls.maxDistance = 42;
    controls.target.set(0, 2.8, 0);

    controls.addEventListener('start', () => {
      stateRef.current.cameraTransitionActive = false;
    });

    // 3. Balanced 3-Point Studio Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(14, 22, 16);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 60;
    const d = 18;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-16, 12, -14);
    scene.add(rimLight);

    // 4. Ground Stage & Contact Shadow Platform
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);

    const floorGeo = new THREE.CylinderGeometry(18, 19, 0.4, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.65,
      metalness: 0.25,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.y = -0.2;
    floorMesh.receiveShadow = true;
    stageGroup.add(floorMesh);

    const ringGeo = new THREE.RingGeometry(11.5, 11.65, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.02;
    stageGroup.add(ringMesh);

    const clickableMeshes: THREE.Object3D[] = [];

    // 5. Composite Model A: Academic Video Projection Screen (Back Center)
    const screenGroup = new THREE.Group();
    screenGroup.position.set(0, 0, -6.8);
    scene.add(screenGroup);

    // Pedestal base (Part 1)
    const pedestalMesh = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.35, 1.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })
    );
    pedestalMesh.position.y = 0.175;
    pedestalMesh.castShadow = true;
    pedestalMesh.receiveShadow = true;
    screenGroup.add(pedestalMesh);

    // Twin vertical pillars (Parts 2 & 3)
    const pillarGeo = new THREE.CylinderGeometry(0.16, 0.2, 4.2, 24);
    const pillarMat = new THREE.MeshPhysicalMaterial({
      color: 0x94a3b8,
      metalness: 0.9,
      roughness: 0.2,
      clearcoat: 0.6,
    });
    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-2.1, 2.2, 0);
    leftPillar.castShadow = true;
    screenGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
    rightPillar.position.set(2.1, 2.2, 0);
    rightPillar.castShadow = true;
    screenGroup.add(rightPillar);

    // Outer metallic frame (Part 4)
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(11.6, 7.2, 0.28),
      new THREE.MeshPhysicalMaterial({
        color: 0x1e293b,
        metalness: 0.85,
        roughness: 0.22,
        clearcoat: 0.5,
      })
    );
    frameMesh.position.set(0, 5.2, 0);
    frameMesh.castShadow = true;
    screenGroup.add(frameMesh);

    // Video Texture surface (Part 5)
    let videoTexture: THREE.VideoTexture | null = null;
    if (videoRef.current) {
      videoTexture = new THREE.VideoTexture(videoRef.current);
      videoTexture.colorSpace = THREE.SRGBColorSpace;
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;
    }

    const screenDisplayMat = new THREE.MeshBasicMaterial({
      map: videoTexture || null,
      color: 0xffffff,
    });
    const screenDisplayMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.0, 6.875), screenDisplayMat);
    screenDisplayMesh.position.set(0, 5.2, 0.16);
    screenDisplayMesh.userData = {
      nodeInfo: {
        title: '3.4K 学术母带同步放映银幕',
        subtitle: 'VideoTexture 实时帧映射 (3456 × 2160)',
        metricLabel: '当前同步状态',
        metricValue: '实时帧同步 (30 FPS)',
        description:
          '该 3D 主讲银幕与 2D 精讲放映厅共享同一视频源。您可以在 3D 沙盘中一边观察原视频的折线图与饼图演化，一边对比前方 8 大电源立体柱的动态高度变化。',
        color: '#0284c7',
      },
    };
    clickableMeshes.push(screenDisplayMesh);
    screenGroup.add(screenDisplayMesh);

    // 6. Composite Model B: 8 Energy Mix 3D Dynamic Pillars (Front Arc)
    interface PillarRecord {
      key: EnergySourceKey;
      group: THREE.Group;
      barMesh: THREE.Mesh;
      capMesh: THREE.Mesh;
      labelMesh: THREE.Mesh;
      currentHeight: number;
      lastRenderedShare: number;
      colorHex: string;
      name: string;
    }

    const pillars: PillarRecord[] = [];
    const totalSources = ENERGY_SOURCES.length;
    const startX = -7.7;
    const spacingX = 2.2;

    ENERGY_SOURCES.forEach((source, idx) => {
      const pGroup = new THREE.Group();
      const xPos = startX + idx * spacingX;
      const zPos = 1.6 + Math.abs(idx - (totalSources - 1) / 2) * 0.35;
      pGroup.position.set(xPos, 0, zPos);
      scene.add(pGroup);

      // Part 1: Octagonal base pad
      const basePad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.85, 0.24, 8),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.75, roughness: 0.3 })
      );
      basePad.position.y = 0.12;
      basePad.castShadow = true;
      basePad.receiveShadow = true;
      pGroup.add(basePad);

      // Part 2: Metallic collar ring
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.06, 12, 24),
        new THREE.MeshStandardMaterial({ color: source.color, metalness: 0.6, roughness: 0.25 })
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.26;
      pGroup.add(collar);

      // Part 3: Dynamic height bar (unit geometry 1.0 high, scaled on Y)
      const barGeo = new THREE.BoxGeometry(0.88, 1.0, 0.88);
      barGeo.translate(0, 0.5, 0); // Pivot at bottom-center
      const barMat = new THREE.MeshPhysicalMaterial({
        color: source.color,
        metalness: 0.35,
        roughness: 0.25,
        clearcoat: 0.7,
        clearcoatRoughness: 0.15,
      });
      const barMesh = new THREE.Mesh(barGeo, barMat);
      barMesh.position.y = 0.24;
      barMesh.castShadow = true;
      barMesh.receiveShadow = true;
      pGroup.add(barMesh);

      // Part 4: Top bevel cap
      const capMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.14, 0.96),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.8, roughness: 0.2 })
      );
      capMesh.position.y = 1.3;
      pGroup.add(capMesh);

      // Part 5: Procedural high-sharpness data plaque
      const initTex = createLabelTexture(renderer, source.name, '0%', source.color);
      const labelMat = new THREE.MeshBasicMaterial({ map: initTex });
      const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.62), labelMat);
      labelMesh.position.set(0, 2.1, 0.52);
      pGroup.add(labelMesh);

      barMesh.userData = {
        energyKey: source.key,
      };
      clickableMeshes.push(barMesh);

      pillars.push({
        key: source.key,
        group: pGroup,
        barMesh,
        capMesh,
        labelMesh,
        currentHeight: 1.0,
        lastRenderedShare: -1,
        colorHex: source.color,
        name: source.name,
      });
    });

    // 7. Composite Model C: Clean Energy & Flexible Coal Equipment Models (Flanks)
    // Left Flank: Wind Turbine + Solar PV Array + Storage Battery
    const cleanEquipGroup = new THREE.Group();
    cleanEquipGroup.position.set(-8.2, 0, -2.5);
    scene.add(cleanEquipGroup);

    // Wind Turbine (6 parts)
    const turbinePad = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.25, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.2 })
    );
    turbinePad.position.y = 0.125;
    cleanEquipGroup.add(turbinePad);

    const towerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.32, 4.8, 24),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.4 })
    );
    towerMesh.position.y = 2.5;
    towerMesh.castShadow = true;
    cleanEquipGroup.add(towerMesh);

    const nacelleMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.45, 1.1),
      new THREE.MeshPhysicalMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.5, clearcoat: 0.5 })
    );
    nacelleMesh.position.set(0, 4.95, 0.1);
    cleanEquipGroup.add(nacelleMesh);

    const rotorGroup = new THREE.Group();
    rotorGroup.position.set(0, 4.95, 0.7);
    cleanEquipGroup.add(rotorGroup);

    const hubMesh = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.5, 16),
      new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.2 })
    );
    hubMesh.rotation.x = Math.PI / 2;
    rotorGroup.add(hubMesh);

    for (let b = 0; b < 3; b++) {
      const bladePivot = new THREE.Group();
      bladePivot.rotation.z = (b * Math.PI * 2) / 3;
      const bladeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 2.2, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.3 })
      );
      bladeMesh.position.y = 1.1;
      bladePivot.add(bladeMesh);
      rotorGroup.add(bladePivot);
    }

    // Solar Panel Array next to Wind Turbine
    const solarRack = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.12, 1.4),
      new THREE.MeshPhysicalMaterial({ color: 0x0284c7, metalness: 0.6, roughness: 0.15, clearcoat: 0.9 })
    );
    solarRack.position.set(2.1, 1.1, 0.6);
    solarRack.rotation.x = Math.PI / 6;
    solarRack.castShadow = true;
    cleanEquipGroup.add(solarRack);

    const solarStand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8, roughness: 0.3 })
    );
    solarStand.position.set(2.1, 0.5, 0.6);
    cleanEquipGroup.add(solarStand);

    towerMesh.userData = {
      nodeInfo: {
        title: '风光储高比例新能源出力系统',
        subtitle: '对应视频第一/三部分：清洁能源内生技术学习与降本',
        metricLabel: '2045风光合计占比',
        metricValue: '64% ~ 65% (政策强化/技术突破)',
        description:
          '通过技术转型倍率 (1.19 → 1.39) 驱动平准化度电成本下降，风光成为主力新增电源，配套新型储能平抑日内波动。',
        color: '#059669',
      },
    };
    clickableMeshes.push(towerMesh);
    clickableMeshes.push(solarRack);
    solarRack.userData = towerMesh.userData;

    // Right Flank: Flexible Coal Power Plant + Hyperbolic Cooling Tower + Capacity Shield
    const coalEquipGroup = new THREE.Group();
    coalEquipGroup.position.set(8.2, 0, -2.5);
    scene.add(coalEquipGroup);

    // Hyperbolic Cooling Tower using LatheGeometry (Part 1)
    const lathePoints: THREE.Vector2[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const y = t * 3.4;
      const r = 0.72 + 0.32 * Math.pow(t - 0.58, 2) * 3.2;
      lathePoints.push(new THREE.Vector2(r, y));
    }
    const coolingTowerGeo = new THREE.LatheGeometry(lathePoints, 32);
    const coolingTowerMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.7,
      metalness: 0.15,
      side: THREE.DoubleSide,
    });
    const coolingTowerMesh = new THREE.Mesh(coolingTowerGeo, coolingTowerMat);
    coolingTowerMesh.castShadow = true;
    coolingTowerMesh.receiveShadow = true;
    coalEquipGroup.add(coolingTowerMesh);

    // Main Turbine Hall (Part 2)
    const boilerHall = new THREE.Mesh(
      new THREE.BoxGeometry(2.1, 1.9, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.45, metalness: 0.5 })
    );
    boilerHall.position.set(-2.1, 0.95, 0.3);
    boilerHall.castShadow = true;
    coalEquipGroup.add(boilerHall);

    // Flue Chimney Stack (Part 3)
    const chimney = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.24, 4.2, 20),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4, metalness: 0.4 })
    );
    chimney.position.set(-2.6, 2.1, -0.2);
    chimney.castShadow = true;
    coalEquipGroup.add(chimney);

    // Capacity Tariff Shield Emblem (Part 4)
    const shieldRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.09, 16, 32),
      new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.15, clearcoat: 1.0 })
    );
    shieldRing.position.set(-1.2, 2.6, 1.1);
    coalEquipGroup.add(shieldRing);

    coolingTowerMesh.userData = {
      nodeInfo: {
        title: '支撑调节型煤电与容量电价保底机制',
        subtitle: '对应视频政策建议二 & 极端风险情景兜底',
        metricLabel: '2045安全兜底装机',
        metricValue: '22% ~ 29% (容量电价护盾)',
        description:
          '推动煤电由传统电量主体向灵活性调峰与旋转备用容量主体转型，通过容量电价机制保底固定成本回收，在极端风险情景下发挥能源安全兜底作用。',
        color: '#d97706',
      },
    };
    clickableMeshes.push(coolingTowerMesh);
    clickableMeshes.push(boilerHall);
    boilerHall.userData = coolingTowerMesh.userData;

    // 8. Raycasting Interaction (Click to inspect 3D elements)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const onPointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(clickableMeshes, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hit.userData.energyKey) {
          const key = hit.userData.energyKey as EnergySourceKey;
          const meta = ENERGY_SOURCES.find((e) => e.key === key);
          const sc = MIMO_SCENARIOS[stateRef.current.scenarioId];
          const snap = sc.snapshots[stateRef.current.year];
          const val = snap.mix[key];
          if (meta) {
            setSelectedNode({
              title: `${meta.name} (${meta.enName})`,
              subtitle: `${sc.name} · ${stateRef.current.year}年仿真截面`,
              metricLabel: '电源结构占比',
              metricValue: `${val}%`,
              description: `${meta.unitDesc}。当前情景下 policy_adj=${snap.policyAdj.toFixed(2)}，技术转型倍率=${snap.techMultiplier.toFixed(2)}。`,
              color: meta.color,
            });
          }
        } else if (hit.userData.nodeInfo) {
          setSelectedNode(hit.userData.nodeInfo as SelectedNodeInfo);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // Pre-compile shaders on hardware WebGL
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 9. Animation Loop with Software-WebGL Pacing & Smooth Damping
    const clock = new THREE.Clock();
    let frameId = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      const delta = Math.min(clock.getDelta(), 0.1);
      const sc = MIMO_SCENARIOS[stateRef.current.scenarioId] || MIMO_SCENARIOS.bau;
      const snap = sc.snapshots[stateRef.current.year] || sc.snapshots[2030];
      const explode = stateRef.current.exploded;

      // Rotate wind turbine blades proportional to techMultiplier
      rotorGroup.rotation.z -= delta * 1.8 * snap.techMultiplier;
      shieldRing.rotation.y += delta * 0.9;

      // Update 8 Energy Pillars with smooth exponential damping
      pillars.forEach((p, idx) => {
        const targetShare = snap.mix[p.key] ?? 1;
        const targetHeight = Math.max(0.35, targetShare * 0.135);
        p.currentHeight = THREE.MathUtils.damp(p.currentHeight, targetHeight, 6.5, delta);

        p.barMesh.scale.y = p.currentHeight;
        p.capMesh.position.y = 0.24 + p.currentHeight + 0.08 + explode * 0.8;
        p.labelMesh.position.y = 0.24 + p.currentHeight + 0.72 + explode * 1.4;

        // Horizontal spread on Exploded View
        const baseX = startX + idx * spacingX;
        const spreadX = baseX * (1 + explode * 0.28);
        p.group.position.x = THREE.MathUtils.damp(p.group.position.x, spreadX, 6.0, delta);

        // Update canvas plaque texture only when percentage value changes
        if (p.lastRenderedShare !== targetShare) {
          p.lastRenderedShare = targetShare;
          const mat = p.labelMesh.material as THREE.MeshBasicMaterial;
          if (mat.map) mat.map.dispose();
          mat.map = createLabelTexture(renderer, p.name, `${targetShare}%`, p.colorHex);
          mat.needsUpdate = true;
        }
      });

      // Smooth Camera Preset Transitions
      if (stateRef.current.cameraTransitionActive) {
        switch (stateRef.current.cameraPreset) {
          case 'pillars':
            _targetCamPos.set(0, 6.2, 13.5);
            _targetLookAt.set(0, 2.2, 1.5);
            break;
          case 'equipment':
            _targetCamPos.set(-11.5, 5.8, 8.5);
            _targetLookAt.set(0, 2.5, -2.2);
            break;
          case 'screen':
            _targetCamPos.set(0, 5.2, 4.2);
            _targetLookAt.set(0, 5.1, -6.8);
            break;
          case 'overview':
          default:
            _targetCamPos.set(0, 11.5, 22);
            _targetLookAt.set(0, 2.8, 0);
            break;
        }
        camera.position.lerp(_targetCamPos, 1 - Math.exp(-5 * delta));
        controls.target.lerp(_targetLookAt, 1 - Math.exp(-5 * delta));
        if (camera.position.distanceTo(_targetCamPos) < 0.08) {
          stateRef.current.cameraTransitionActive = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 1200;
      const h = container.clientHeight || 680;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      controls.dispose();
      renderer.dispose();
    };
  }, [videoRef]);

  const currentScenario = MIMO_SCENARIOS[activeScenarioId];
  const currentSnap = currentScenario.snapshots[activeYear];

  return (
    <div className="relative w-full h-[calc(100vh-76px)] min-h-[640px] bg-slate-950 overflow-hidden select-none">
      {/* Dedicated WebGL Mount Container (100% Unobstructed Center) */}
      <div ref={canvasMountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Minimal Top-Left Academic Spec & Scenario Header (No backdrop-filter over WebGL) */}
      <div className="absolute top-4 left-6 z-10 pointer-events-auto max-w-md bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-1.5">
          <span className="text-xs font-medium text-sky-400">
            Three.js 3D 能源结构演化数字沙盘 · 点击任意3D模型查看参数
          </span>
          <span className="text-xs font-mono-tabular text-slate-400">
            {activeYear}年截面
          </span>
        </div>
        <h2 className="text-base font-bold text-slate-100">
          {currentScenario.code} — {currentSnap.keyInsight}
        </h2>
        <div className="mt-2.5 flex items-center gap-4 text-xs font-mono-tabular text-slate-300 border-t border-slate-800 pt-2">
          <span>policy_adj = {currentSnap.policyAdj.toFixed(2)}</span>
          <span>·</span>
          <span>技术转型倍率 = {currentSnap.techMultiplier.toFixed(2)}</span>
          <span>·</span>
          <span>净CO2: {currentSnap.netCo2}亿吨</span>
        </div>
      </div>

      {/* Selected 3D Node Inspection Popup (Top-Right, only when a 3D mesh is clicked) */}
      {selectedNode && (
        <div className="absolute top-4 right-6 z-10 pointer-events-auto max-w-sm bg-slate-900/95 border border-slate-700 rounded-xl p-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">{selectedNode.subtitle}</div>
              <h3 className="text-sm font-bold text-white mt-0.5">{selectedNode.title}</h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800"
            >
              关闭
            </button>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xs text-slate-400">{selectedNode.metricLabel}:</span>
            <span className="text-lg font-bold font-mono-tabular" style={{ color: selectedNode.color }}>
              {selectedNode.metricValue}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed">{selectedNode.description}</p>
        </div>
      )}

      {/* Unified Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 pointer-events-auto w-[min(940px,94vw)] transition-transform duration-200"
        style={{
          transform: dockCollapsed ? 'translate(-50%, calc(100% - 34px))' : 'translate(-50%, 0)',
        }}
      >
        {/* Collapse / Expand Toggle Handle */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="px-4 py-1.5 bg-slate-900 border border-slate-700 rounded-t-lg text-xs font-medium text-slate-200 hover:text-white flex items-center gap-1.5 shadow-lg whitespace-nowrap shrink-0"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                展开 3D 沙盘控制台
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                隐藏控制台 (纯净全屏观摩)
              </>
            )}
          </button>
        </div>

        {/* Main Horizontal Dock Body (Solid high-contrast dark surface, no backdrop-filter) */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-3.5 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 1. Scenario Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {(['bau', 'policy', 'risk', 'tech'] as ScenarioId[]).map((sid) => {
                const sc = MIMO_SCENARIOS[sid];
                const active = activeScenarioId === sid;
                return (
                  <button
                    key={sid}
                    onClick={() => {
                      onSelectScenario(sid);
                      onSeekVideo(sc.snapshots[activeYear].videoTimestamp);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      active ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {sc.name}
                  </button>
                );
              })}
            </div>

            {/* 2. Year Selector */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              {([2025, 2030, 2045] as SimulationYear[]).map((yr) => (
                <button
                  key={yr}
                  onClick={() => {
                    onSelectYear(yr);
                    onSeekVideo(currentScenario.snapshots[yr].videoTimestamp);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-mono-tabular font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    activeYear === yr ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {yr}年
                </button>
              ))}
            </div>

            {/* 3. Camera View Presets */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <Eye className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
              {(
                [
                  { id: 'overview', label: '沙盘全景' },
                  { id: 'pillars', label: '8大电源矩阵' },
                  { id: 'equipment', label: '风光火储装备' },
                  { id: 'screen', label: '3D主讲巨幕' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleCameraPresetChange(preset.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    cameraPreset === preset.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* 4. 3D Screen Video Play/Pause & Exploded Slider */}
            <div className="flex items-center gap-3">
              <button
                onClick={onTogglePlay}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? '暂停主幕视频' : '播放主幕视频'}
              </button>

              <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-slate-400 whitespace-nowrap">拆解间距:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={explodedFactor}
                  onChange={(e) => setExplodedFactor(parseFloat(e.target.value))}
                  className="w-20 accent-sky-500 cursor-pointer"
                />
                <span className="text-xs font-mono-tabular text-slate-200 w-9">
                  {Math.round(explodedFactor * 100)}%
                </span>
              </div>

              <button
                onClick={() => {
                  setExplodedFactor(0);
                  handleCameraPresetChange('overview');
                  setSelectedNode(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                title="复位视角与拆解参数"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
