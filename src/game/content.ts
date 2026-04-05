import type { NewsTemplate, ProductDefinition, RivalDefinition } from './types';

export const PRODUCTS: ProductDefinition[] = [
  {
    id: 'solshade-lotion',
    name: 'Northmill Flour',
    category: 'Baking Staples',
    description: 'Shelf-stable flour sacks that tighten when home kitchens and corner bakeries restock at once.',
    basePrice: 11,
    baseSupply: 74,
    baseDemand: 1.03,
    storagePerUnit: 1,
    volatility: 0.09,
    priceElasticity: 0.05,
    peakMonth: 11,
  },
  {
    id: 'draftpod-fan',
    name: 'Kettle Row Oats',
    category: 'Breakfast Staples',
    description: 'Quick-cook oat canisters with dependable repeat demand and extra lift in colder months.',
    basePrice: 13,
    baseSupply: 68,
    baseDemand: 1.01,
    storagePerUnit: 1,
    volatility: 0.08,
    priceElasticity: 0.05,
    peakMonth: 1,
  },
  {
    id: 'brightnest-tabs',
    name: 'Commonrice Bags',
    category: 'Dry Goods',
    description: 'Long-life rice bags that move steadily and pick up whenever households trade down into staples.',
    basePrice: 17,
    baseSupply: 70,
    baseDemand: 1.04,
    storagePerUnit: 1,
    volatility: 0.07,
    priceElasticity: 0.04,
    peakMonth: 9,
  },
  {
    id: 'quickpatch-roll',
    name: 'Pinebar Soap',
    category: 'Toiletries',
    description: 'Plain bath soap that clears faster during school resets and hygiene scares.',
    basePrice: 9,
    baseSupply: 86,
    baseDemand: 1.08,
    storagePerUnit: 1,
    volatility: 0.08,
    priceElasticity: 0.05,
    peakMonth: 8,
  },
  {
    id: 'hearthleaf-sachets',
    name: 'Brushmint Paste',
    category: 'Oral Care',
    description: 'Everyday toothpaste with steady recurring demand and short restock squeezes.',
    basePrice: 7,
    baseSupply: 92,
    baseDemand: 1.1,
    storagePerUnit: 1,
    volatility: 0.06,
    priceElasticity: 0.04,
    peakMonth: 8,
  },
  {
    id: 'pawprint-bites',
    name: 'Softloop Tissue',
    category: 'Paper Goods',
    description: 'Bathroom tissue multipacks that stay liquid and jump whenever households brace for illness or delivery hiccups.',
    basePrice: 14,
    baseSupply: 78,
    baseDemand: 1.06,
    storagePerUnit: 1,
    volatility: 0.09,
    priceElasticity: 0.05,
    peakMonth: 12,
  },
];

const ALL_PRODUCT_IDS = PRODUCTS.map((product) => product.id);

export const NEWS_TEMPLATES: NewsTemplate[] = [
  {
    id: 'heat-band',
    headline: 'Corner bakery contracts pull flour off the board',
    summary: 'Two neighborhood bakeries added weekend batches, and local flour lots are disappearing faster than usual.',
    tone: 'warning',
    durationRange: [3, 6],
    activeMonths: [9, 10, 11, 12],
    effects: [
      {
        productIds: ['solshade-lotion'],
        demandShiftRange: [0.14, 0.22],
      },
    ],
  },
  {
    id: 'storm-prep',
    headline: 'Storm prep buying sweeps the outer districts',
    summary: 'Households are topping off dry goods and bathroom stock before rough weather reaches the district.',
    tone: 'warning',
    durationRange: [3, 6],
    activeMonths: [8, 9, 10, 11],
    effects: [
      {
        productIds: ['solshade-lotion'],
        demandShiftRange: [0.05, 0.1],
      },
      {
        productIds: ['brightnest-tabs'],
        demandShiftRange: [0.1, 0.18],
      },
      {
        productIds: ['pawprint-bites'],
        demandShiftRange: [0.08, 0.16],
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
    headline: 'Cold snap lifts breakfast and paper aisles',
    summary: 'Colder mornings are nudging faster oat pulls while tissue packs move sooner through neighborhood shops.',
    tone: 'watch',
    durationRange: [3, 7],
    activeMonths: [10, 11, 12, 1, 2, 3],
    effects: [
      {
        productIds: ['draftpod-fan'],
        demandShiftRange: [0.1, 0.18],
      },
      {
        productIds: ['pawprint-bites'],
        demandShiftRange: [0.05, 0.1],
      },
    ],
  },
  {
    id: 'plant-calibration',
    headline: 'Neighborhood soap and paper packer returns ahead of schedule',
    summary: 'Fresh local output is easing replenishment pressure in a few personal-use staples.',
    tone: 'tailwind',
    durationRange: [4, 8],
    effects: [
      {
        productIds: ['quickpatch-roll'],
        supplyShiftRange: [-0.16, -0.08],
      },
      {
        productIds: ['pawprint-bites'],
        supplyShiftRange: [-0.12, -0.06],
      },
      {
        productIds: ['hearthleaf-sachets'],
        supplyShiftRange: [-0.08, -0.04],
      },
    ],
  },
  {
    id: 'festival-week',
    headline: 'School pantry program expands weekly take-home kits',
    summary: 'Breakfast staples and dry goods are turning faster as more households pick up school-issued pantry kits.',
    tone: 'watch',
    durationRange: [4, 7],
    activeMonths: [1, 2, 3, 4, 5, 8, 9, 10, 11, 12],
    effects: [
      {
        productIds: ['draftpod-fan'],
        demandShiftRange: [0.08, 0.15],
      },
      {
        productIds: ['brightnest-tabs'],
        demandShiftRange: [0.08, 0.14],
      },
      {
        productIds: ['solshade-lotion'],
        demandShiftRange: [0.04, 0.08],
      },
    ],
  },
  {
    id: 'ingredient-shortfall',
    headline: 'County wheat milling shortfall tightens flour supply',
    summary: 'Local mill buyers are paying up for inbound wheat, leaving fewer flour sacks on neighborhood routes.',
    tone: 'warning',
    durationRange: [5, 8],
    effects: [
      {
        productIds: ['solshade-lotion'],
        supplyShiftRange: [0.1, 0.18],
      },
    ],
  },
  {
    id: 'budget-pullback',
    headline: 'Utility spike pushes baskets toward cheap staples',
    summary: 'Households are leaning harder on oats and rice while delaying less urgent restocks.',
    tone: 'watch',
    durationRange: [4, 7],
    effects: [
      {
        productIds: ['draftpod-fan'],
        demandShiftRange: [0.08, 0.14],
      },
      {
        productIds: ['brightnest-tabs'],
        demandShiftRange: [0.1, 0.16],
      },
    ],
  },
  {
    id: 'pet-adoption-drive',
    headline: 'Public clinic hygiene push lifts toiletry restocks',
    summary: 'Neighborhood clinics are nudging households and dorms to top off soap and toothpaste before the next school wave.',
    tone: 'watch',
    durationRange: [3, 6],
    effects: [
      {
        productIds: ['quickpatch-roll'],
        demandShiftRange: [0.08, 0.15],
      },
      {
        productIds: ['hearthleaf-sachets'],
        demandShiftRange: [0.1, 0.18],
      },
    ],
  },
  {
    id: 'route-closure',
    headline: 'Bridge closure slows cross-district trucking',
    summary: 'Bulk flour, rice, and tissue pallets are arriving unevenly after trucks were rerouted through smaller neighborhood streets.',
    tone: 'warning',
    durationRange: [4, 8],
    effects: [
      {
        productIds: ['solshade-lotion', 'brightnest-tabs', 'pawprint-bites'],
        supplyShiftRange: [0.07, 0.14],
      },
    ],
  },
  {
    id: 'allergen-surge',
    headline: 'School term restocks hit breakfast and hygiene aisles',
    summary: 'Families are refilling oats, soap, and toothpaste as school-week routines tighten.',
    tone: 'watch',
    durationRange: [3, 6],
    activeMonths: [8, 9],
    effects: [
      {
        productIds: ['draftpod-fan'],
        demandShiftRange: [0.05, 0.1],
      },
      {
        productIds: ['quickpatch-roll'],
        demandShiftRange: [0.06, 0.12],
      },
      {
        productIds: ['hearthleaf-sachets'],
        demandShiftRange: [0.08, 0.14],
      },
    ],
  },
  {
    id: 'overstock-glut',
    headline: 'Wholesaler overbuy floods bargain staple channels',
    summary: 'Unexpected extra pallets are landing in dry goods and toiletries after a local distributor overshot orders.',
    tone: 'tailwind',
    durationRange: [4, 7],
    effects: [
      {
        productIds: ['brightnest-tabs', 'quickpatch-roll'],
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
