import type { NewsTemplate, ProductDefinition, RivalDefinition } from './types';

export const PRODUCTS: ProductDefinition[] = [
  {
    id: 'solshade-lotion',
    name: 'Solshade Lotion',
    category: 'Personal Care',
    description: 'Fast-moving sun guard with strong warm-weather demand.',
    basePrice: 18,
    baseSupply: 58,
    baseDemand: 1.08,
    storagePerUnit: 1,
    volatility: 0.12,
    priceElasticity: 0.08,
    peakMonth: 7,
  },
  {
    id: 'draftpod-fan',
    name: 'Draftpod Fan',
    category: 'Home Comfort',
    description: 'Pocket desk fan that spikes whenever rooms start feeling close.',
    basePrice: 34,
    baseSupply: 42,
    baseDemand: 0.98,
    storagePerUnit: 1,
    volatility: 0.14,
    priceElasticity: 0.1,
    peakMonth: 7,
  },
  {
    id: 'brightnest-tabs',
    name: 'Brightnest Tabs',
    category: 'Cleaning',
    description: 'Dissolving cleaning tablets with spring reset momentum.',
    basePrice: 14,
    baseSupply: 64,
    baseDemand: 1.02,
    storagePerUnit: 1,
    volatility: 0.09,
    priceElasticity: 0.07,
    peakMonth: 4,
  },
  {
    id: 'quickpatch-roll',
    name: 'Quickpatch Roll',
    category: 'Home Repair',
    description: 'Instant repair wrap that moves faster before rough weather.',
    basePrice: 22,
    baseSupply: 38,
    baseDemand: 0.96,
    storagePerUnit: 1,
    volatility: 0.13,
    priceElasticity: 0.09,
    peakMonth: 10,
  },
  {
    id: 'hearthleaf-sachets',
    name: 'Hearthleaf Sachets',
    category: 'Pantry',
    description: 'Steep-and-go drink sachets that perk up in cold snaps.',
    basePrice: 12,
    baseSupply: 72,
    baseDemand: 0.9,
    storagePerUnit: 1,
    volatility: 0.08,
    priceElasticity: 0.06,
    peakMonth: 12,
  },
  {
    id: 'pawprint-bites',
    name: 'Pawprint Bites',
    category: 'Pet Care',
    description: 'Low-volatility pet snacks that keep cash moving between spikes.',
    basePrice: 16,
    baseSupply: 76,
    baseDemand: 1.05,
    storagePerUnit: 1,
    volatility: 0.07,
    priceElasticity: 0.05,
    peakMonth: 5,
  },
];

const ALL_PRODUCT_IDS = PRODUCTS.map((product) => product.id);

export const NEWS_TEMPLATES: NewsTemplate[] = [
  {
    id: 'heat-band',
    headline: 'Heat band settles over the southern ring',
    summary: 'Cooling and sun-care lots are moving faster as households stock up ahead of a hot spell.',
    tone: 'warning',
    durationRange: [4, 8],
    activeMonths: [4, 5, 6, 7, 8, 9],
    effects: [
      {
        productIds: ['solshade-lotion'],
        demandShiftRange: [0.14, 0.24],
      },
      {
        productIds: ['draftpod-fan'],
        demandShiftRange: [0.09, 0.18],
      },
    ],
  },
  {
    id: 'storm-prep',
    headline: 'Storm prep buying sweeps the outer districts',
    summary: 'Repair wraps and pantry comfort goods are clearing faster before rough weather reaches the hubs.',
    tone: 'warning',
    durationRange: [3, 6],
    activeMonths: [8, 9, 10, 11],
    effects: [
      {
        productIds: ['quickpatch-roll'],
        demandShiftRange: [0.11, 0.2],
      },
      {
        productIds: ['hearthleaf-sachets'],
        demandShiftRange: [0.05, 0.12],
      },
    ],
  },
  {
    id: 'yard-inspection',
    headline: 'Distribution-yard inspections slow local van unloads',
    summary: 'Local merchants are warning about slower replenishment across several fast-turn categories.',
    tone: 'warning',
    durationRange: [5, 9],
    effects: [
      {
        productIds: ALL_PRODUCT_IDS,
        supplyShiftRange: [0.08, 0.16],
      },
    ],
  },
  {
    id: 'cold-snap',
    headline: 'Unexpected cold snap pulls forward comfort spending',
    summary: 'Warm drink sachets and quick fixes are getting extra orders as households hunker down.',
    tone: 'watch',
    durationRange: [3, 7],
    activeMonths: [10, 11, 12, 1, 2, 3],
    effects: [
      {
        productIds: ['hearthleaf-sachets'],
        demandShiftRange: [0.12, 0.22],
      },
      {
        productIds: ['quickpatch-roll'],
        demandShiftRange: [0.04, 0.1],
      },
    ],
  },
  {
    id: 'plant-calibration',
    headline: 'Neighborhood pouching line returns ahead of schedule',
    summary: 'Fresh output is easing replenishment pressure in a few household staples.',
    tone: 'tailwind',
    durationRange: [4, 8],
    effects: [
      {
        productIds: ['brightnest-tabs'],
        supplyShiftRange: [-0.16, -0.08],
      },
      {
        productIds: ['pawprint-bites'],
        supplyShiftRange: [-0.1, -0.05],
      },
    ],
  },
  {
    id: 'festival-week',
    headline: 'Festival bookings lift convenience demand',
    summary: 'Portable comfort and personal care goods are getting pulled into quick-turn baskets.',
    tone: 'watch',
    durationRange: [4, 7],
    activeMonths: [5, 6, 7, 8, 9],
    effects: [
      {
        productIds: ['solshade-lotion'],
        demandShiftRange: [0.07, 0.14],
      },
      {
        productIds: ['draftpod-fan'],
        demandShiftRange: [0.05, 0.1],
      },
    ],
  },
  {
    id: 'ingredient-shortfall',
    headline: 'County herb shortfall hits drink inputs',
    summary: 'Pantry buyers are bracing for tighter sachet stock while nearby wholesalers reprice incoming lots.',
    tone: 'warning',
    durationRange: [5, 8],
    effects: [
      {
        productIds: ['hearthleaf-sachets'],
        supplyShiftRange: [0.08, 0.16],
      },
    ],
  },
  {
    id: 'budget-pullback',
    headline: 'Utility spike cools discretionary baskets',
    summary: 'Households are trimming nonessential fills and waiting longer before buying comfort extras.',
    tone: 'watch',
    durationRange: [4, 7],
    effects: [
      {
        productIds: ['solshade-lotion'],
        demandShiftRange: [-0.16, -0.08],
      },
      {
        productIds: ['draftpod-fan'],
        demandShiftRange: [-0.12, -0.06],
      },
    ],
  },
  {
    id: 'pet-adoption-drive',
    headline: 'Adoption drive sends pet basket orders higher',
    summary: 'Pet aisles are clearing faster after a weekend of new household placements.',
    tone: 'watch',
    durationRange: [3, 6],
    effects: [
      {
        productIds: ['pawprint-bites'],
        demandShiftRange: [0.1, 0.18],
      },
    ],
  },
  {
    id: 'route-closure',
    headline: 'Bridge closure slows cross-district trucking',
    summary: 'Several everyday lines are arriving unevenly after an overnight closure pushed vans onto longer local routes.',
    tone: 'warning',
    durationRange: [4, 8],
    effects: [
      {
        productIds: ['quickpatch-roll', 'brightnest-tabs', 'hearthleaf-sachets'],
        supplyShiftRange: [0.07, 0.14],
      },
    ],
  },
  {
    id: 'allergen-surge',
    headline: 'Early pollen surge shifts household shopping',
    summary: 'Cleaning tablets and pantry comfort goods are seeing extra pull as households spend more time indoors.',
    tone: 'watch',
    durationRange: [3, 6],
    activeMonths: [3, 4, 5, 6],
    effects: [
      {
        productIds: ['brightnest-tabs'],
        demandShiftRange: [0.08, 0.15],
      },
      {
        productIds: ['hearthleaf-sachets'],
        demandShiftRange: [0.04, 0.08],
      },
    ],
  },
  {
    id: 'overstock-glut',
    headline: 'Regional overstock sale floods bargain channels',
    summary: 'Extra inventory is landing faster than buyers can absorb it in a few staple lines.',
    tone: 'tailwind',
    durationRange: [4, 7],
    effects: [
      {
        productIds: ['brightnest-tabs', 'pawprint-bites'],
        supplyShiftRange: [-0.15, -0.08],
      },
    ],
  },
];

export const RIVALS: RivalDefinition[] = [
  {
    id: 'heatstreet-desk',
    name: 'Heatstreet Desk',
    style: 'seasonal',
    description: 'Front-runs obvious calendar shifts and unloads fast once demand peaks.',
    startingCash: 18000,
  },
  {
    id: 'latchkey-desk',
    name: 'Latchkey Desk',
    style: 'scalper',
    description: 'Pounces on tightening supply and short-lived buying rushes.',
    startingCash: 16500,
  },
  {
    id: 'mossline-desk',
    name: 'Mossline Desk',
    style: 'value',
    description: 'Accumulates neglected staples and waits for cleaner exits.',
    startingCash: 21000,
  },
];
