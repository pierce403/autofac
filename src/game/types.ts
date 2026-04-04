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

export interface HoldingState {
  quantity: number;
  averageCost: number;
}

export interface MarketState {
  productId: string;
  price: number;
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
  tone: 'note' | 'trade' | 'warning';
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
  logs: LogEntry[];
}

export interface SimulationResult {
  ok: boolean;
  message: string;
  state: GameState;
}
