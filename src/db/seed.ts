import type { SqlDriver } from './driver';
import { supplements } from './repositories';
import type { Supplement } from './types';

/**
 * Curated list of common OTC nootropics used as seed data.
 *
 * Inclusion rule: widely available over-the-counter supplements only.
 * EXCLUDED by policy and absent from this list: prescription drugs (modafinil,
 * ADHD stimulants), grey-market research chemicals (racetams, phenibut,
 * tianeptine), and anything injectable. The `excluded` flag exists so a later
 * release can soft-hide an entry (e.g. on new safety information) without
 * deleting the row; nothing in this seed is excluded today.
 *
 * `type` follows the spec: 'acute' = effect expected within a single dose/day;
 * 'cumulative' = effect builds over days to weeks of daily use.
 *
 * evidence_summary is one plain line. evidence_links are starting-point
 * references; later rounds can refine them.
 */
export const SEED_SUPPLEMENTS: Supplement[] = [
  // --- acute ---------------------------------------------------------------
  {
    id: 'l-theanine',
    name: 'L-Theanine',
    type: 'acute',
    evidenceSummary: 'Amino acid from tea; promotes calm focus and may reduce stress-related arousal.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=l-theanine+cognition'],
    excluded: false,
  },
  {
    id: 'l-theanine-caffeine',
    name: 'L-Theanine + Caffeine',
    type: 'acute',
    evidenceSummary: 'Common stack; caffeine lifts alertness while theanine smooths the jitter.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=theanine+caffeine+attention'],
    excluded: false,
  },
  {
    id: 'caffeine',
    name: 'Caffeine',
    type: 'acute',
    evidenceSummary: 'Adenosine antagonist; reliably improves alertness and reaction time acutely.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=caffeine+reaction+time'],
    excluded: false,
  },
  {
    id: 'alpha-gpc',
    name: 'Alpha-GPC',
    type: 'acute',
    evidenceSummary: 'Choline source; studied for acute focus and power output, mixed cognitive evidence.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=alpha-gpc+cognition'],
    excluded: false,
  },
  {
    id: 'rhodiola-rosea',
    name: 'Rhodiola Rosea',
    type: 'acute',
    evidenceSummary: 'Adaptogen; may reduce mental fatigue under stress within hours of a dose.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=rhodiola+fatigue'],
    excluded: false,
  },
  {
    id: 'citicoline',
    name: 'Citicoline (CDP-Choline)',
    type: 'acute',
    evidenceSummary: 'Choline donor; some trials show acute attention and focus benefits.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=citicoline+attention'],
    excluded: false,
  },
  {
    id: 'tyrosine',
    name: 'L-Tyrosine',
    type: 'acute',
    evidenceSummary: 'Dopamine precursor; may protect working memory under acute stress or sleep loss.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=tyrosine+stress+cognition'],
    excluded: false,
  },
  {
    id: 'theobromine',
    name: 'Theobromine',
    type: 'acute',
    evidenceSummary: 'Cocoa alkaloid; mild stimulant with a gentler curve than caffeine.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=theobromine+cognition'],
    excluded: false,
  },
  {
    id: 'peppermint',
    name: 'Peppermint (Aroma/Extract)',
    type: 'acute',
    evidenceSummary: 'Small studies link peppermint to short-term alertness and memory in some tasks.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=peppermint+alertness'],
    excluded: false,
  },
  {
    id: 'ginkgo-biloba',
    name: 'Ginkgo Biloba',
    type: 'acute',
    evidenceSummary: 'Herbal extract; some acute attention findings, benefit overall modest and mixed.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=ginkgo+attention'],
    excluded: false,
  },
  {
    id: 'panax-ginseng',
    name: 'Panax Ginseng',
    type: 'acute',
    evidenceSummary: 'Ginsenoside herb; studied for acute mental performance and reduced fatigue.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=panax+ginseng+cognition'],
    excluded: false,
  },
  {
    id: 'taurine',
    name: 'Taurine',
    type: 'acute',
    evidenceSummary: 'Amino acid common in energy drinks; acute cognitive effect in isolation is weak.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=taurine+cognition'],
    excluded: false,
  },
  {
    id: 'dark-chocolate-flavanols',
    name: 'Cocoa Flavanols',
    type: 'acute',
    evidenceSummary: 'Flavanols may boost cerebral blood flow and attention within a few hours.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=cocoa+flavanols+cognition'],
    excluded: false,
  },

  // --- cumulative ----------------------------------------------------------
  {
    id: 'bacopa-monnieri',
    name: 'Bacopa Monnieri',
    type: 'cumulative',
    evidenceSummary: 'Ayurvedic herb; memory benefits typically emerge after several weeks of daily use.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=bacopa+memory'],
    excluded: false,
  },
  {
    id: 'creatine',
    name: 'Creatine Monohydrate',
    type: 'cumulative',
    evidenceSummary: 'Builds muscle and brain creatine stores; cognitive benefit clearest under stress or vegetarian diet.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=creatine+cognition'],
    excluded: false,
  },
  {
    id: 'lions-mane',
    name: "Lion's Mane Mushroom",
    type: 'cumulative',
    evidenceSummary: 'Hericium erinaceus; small trials suggest memory/mood benefits over weeks.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=lion%27s+mane+cognition'],
    excluded: false,
  },
  {
    id: 'omega-3',
    name: 'Omega-3 (EPA/DHA)',
    type: 'cumulative',
    evidenceSummary: 'Fish-oil fatty acids; long-term intake supports brain structure and mood.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=omega-3+cognition'],
    excluded: false,
  },
  {
    id: 'vitamin-d3',
    name: 'Vitamin D3',
    type: 'cumulative',
    evidenceSummary: 'Correcting a deficiency over weeks may improve mood and cognition; little benefit if replete.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=vitamin+d+cognition'],
    excluded: false,
  },
  {
    id: 'vitamin-b12',
    name: 'Vitamin B12',
    type: 'cumulative',
    evidenceSummary: 'Correcting a B12 deficiency over weeks supports energy and cognition.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=vitamin+b12+cognition'],
    excluded: false,
  },
  {
    id: 'vitamin-b-complex',
    name: 'B-Complex Vitamins',
    type: 'cumulative',
    evidenceSummary: 'B vitamins support energy metabolism; cognitive benefit mainly when intake is low.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=b+vitamins+cognition'],
    excluded: false,
  },
  {
    id: 'magnesium',
    name: 'Magnesium',
    type: 'cumulative',
    evidenceSummary: 'Mineral tied to sleep and stress; benefits build when correcting low intake.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=magnesium+cognition+sleep'],
    excluded: false,
  },
  {
    id: 'magnesium-l-threonate',
    name: 'Magnesium L-Threonate',
    type: 'cumulative',
    evidenceSummary: 'Brain-targeted magnesium form; early memory evidence over weeks, still limited.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=magnesium+threonate+memory'],
    excluded: false,
  },
  {
    id: 'ashwagandha',
    name: 'Ashwagandha',
    type: 'cumulative',
    evidenceSummary: 'Adaptogen; stress and sleep improvements accrue over several weeks of use.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=ashwagandha+stress'],
    excluded: false,
  },
  {
    id: 'phosphatidylserine',
    name: 'Phosphatidylserine',
    type: 'cumulative',
    evidenceSummary: 'Membrane phospholipid; memory support in older adults over weeks of daily use.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=phosphatidylserine+memory'],
    excluded: false,
  },
  {
    id: 'acetyl-l-carnitine',
    name: 'Acetyl-L-Carnitine (ALCAR)',
    type: 'cumulative',
    evidenceSummary: 'Amino-acid derivative; studied for mental energy and mood over weeks.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=acetyl-l-carnitine+cognition'],
    excluded: false,
  },
  {
    id: 'curcumin',
    name: 'Curcumin',
    type: 'cumulative',
    evidenceSummary: 'Turmeric polyphenol; anti-inflammatory, memory/mood signals over months in trials.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=curcumin+memory'],
    excluded: false,
  },
  {
    id: 'resveratrol',
    name: 'Resveratrol',
    type: 'cumulative',
    evidenceSummary: 'Polyphenol; cerebral blood flow and memory signals over weeks, evidence mixed.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=resveratrol+cognition'],
    excluded: false,
  },
  {
    id: 'zinc',
    name: 'Zinc',
    type: 'cumulative',
    evidenceSummary: 'Essential mineral; cognition and mood respond when correcting a deficiency over weeks.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=zinc+cognition'],
    excluded: false,
  },
  {
    id: 'iron',
    name: 'Iron',
    type: 'cumulative',
    evidenceSummary: 'Correcting iron deficiency over weeks can restore attention and energy.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=iron+deficiency+cognition'],
    excluded: false,
  },
  {
    id: 'green-tea-extract',
    name: 'Green Tea Extract (EGCG)',
    type: 'cumulative',
    evidenceSummary: 'Catechin-rich extract; working-memory and connectivity signals over weeks.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=green+tea+egcg+cognition'],
    excluded: false,
  },
];

/**
 * Insert the seed list if the supplement table is empty. Safe to call on every
 * launch: it is a no-op once seeded.
 */
export function seedSupplements(db: SqlDriver): void {
  if (supplements.count(db) > 0) {
    return;
  }
  for (const supplement of SEED_SUPPLEMENTS) {
    supplements.insert(db, supplement);
  }
}
