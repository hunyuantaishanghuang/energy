export type WorkspaceTab = 'player2d' | 'sandbox3d' | 'scenarios' | 'aistudio';

export type ScenarioId = 'bau' | 'policy' | 'risk' | 'tech';

export type SimulationYear = 2025 | 2030 | 2045;

export type EnergySourceKey =
  | 'coal'
  | 'solar'
  | 'wind'
  | 'hydro'
  | 'nuclear'
  | 'oil'
  | 'gas'
  | 'biomass';

export interface EnergySourceMeta {
  key: EnergySourceKey;
  name: string;
  enName: string;
  color: string;
  category: 'fossil' | 'renewable' | 'clean';
  unitDesc: string;
}

export interface YearSnapshotData {
  year: SimulationYear;
  policyAdj: number;
  techMultiplier: number;
  grossCo2: number; // 亿吨
  netCo2: number; // 亿吨
  nonFossilCapacityShare: number; // %
  nonFossilConsumptionShare: number; // %
  mix: Record<EnergySourceKey, number>; // % sum to ~100
  videoTimestamp: number;
  keyInsight: string;
}

export interface MiMoScenario {
  id: ScenarioId;
  code: string;
  name: string;
  enName: string;
  shortDesc: string;
  mechanismDetail: string;
  badgeText: string;
  accentColor: string;
  videoStartTime: number;
  snapshots: Record<SimulationYear, YearSnapshotData>;
  trajectory: Array<{
    year: number;
    grossCo2: number;
    netCo2: number;
    owidHistorical?: number;
    nonFossilInstalled: number;
    nonFossilConsumed: number;
  }>;
}

export interface AcademicChapter {
  id: string;
  indexNumber: string;
  timestamp: number;
  endTime: number;
  title: string;
  subtitle: string;
  sectionCategory: '理论框架' | '闭环仿真' | '政策建议';
  scenarioId?: ScenarioId;
  defaultYear?: SimulationYear;
  thumbnailUrl: string;
  keyFormulaOrMetric: string;
  academicScript: string;
  bulletPoints: string[];
}

export interface AcademicVideoFilter {
  id: string;
  name: string;
  enName: string;
  description: string;
  cssFilter: string;
  settings: {
    brightness: number;
    contrast: number;
    saturate: number;
    invert: number;
    sepia: number;
  };
}

export interface CapturedFrameAsset {
  id: string;
  dataUrl: string;
  timestamp: number;
  chapterTitle: string;
  label: string;
  createdAt: string;
  isPreset?: boolean;
  localAssetPath?: string;
}

export interface GeneratedDiagramAsset {
  id: string;
  imageUrl: string;
  prompt: string;
  mode: 'generate' | 'edit';
  chapterRef: string;
  createdAt: string;
  notes?: string;
}
