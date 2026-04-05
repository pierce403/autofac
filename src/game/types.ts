export interface ProductDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  baseSupply: number;
  baseDemand: number;
  storagePerUnit: number;
  volatility: number;
  priceElasticity: number;
  peakMonth: number;
}

export type RivalStyle = 'seasonal' | 'scalper' | 'value';

export interface RivalDefinition {
  id: string;
  name: string;
  style: RivalStyle;
  description: string;
  startingCash: number;
}

export interface HoldingState {
  quantity: number;
  averageCost: number;
  listingPrice: number | null;
}

export interface PricePoint {
  day: number;
  price: number;
}

export interface NewsImpact {
  productId: string;
  demandShift: number;
  supplyShift: number;
}

export type NewsTone = 'warning' | 'tailwind' | 'watch';

export interface NewsItem {
  id: string;
  templateId: string;
  headline: string;
  summary: string;
  tone: NewsTone;
  startedDay: number;
  startedDate: string;
  expiresDay: number;
  effects: NewsImpact[];
}

export interface NewsTemplateEffect {
  productIds: string[];
  demandShiftRange?: [number, number];
  supplyShiftRange?: [number, number];
}

export interface NewsTemplate {
  id: string;
  headline: string;
  summary: string;
  tone: NewsTone;
  durationRange: [number, number];
  activeMonths?: number[];
  effects: NewsTemplateEffect[];
}

export interface MarketState {
  productId: string;
  price: number;
  priceHistory: PricePoint[];
  demandShock: number;
  supplyShock: number;
  supply: number;
  demandIndex: number;
  seasonFactor: number;
  demandLabel: string;
  seasonLabel: string;
  note: string;
}

export interface LogEntry {
  day: number;
  text: string;
  tone: 'note' | 'trade' | 'warning' | 'rival';
}

export interface RivalState {
  id: string;
  name: string;
  style: RivalStyle;
  cash: number;
  holdings: Record<string, HoldingState>;
  description: string;
  lastAction: string;
}

export interface GameState {
  version: number;
  day: number;
  currentDate: string;
  cash: number;
  realizedProfit: number;
  warehouseCapacity: number;
  holdings: Record<string, HoldingState>;
  markets: Record<string, MarketState>;
  rivals: RivalState[];
  newsFeed: NewsItem[];
  logs: LogEntry[];
}

export interface SimulationResult {
  ok: boolean;
  message: string;
  state: GameState;
}
