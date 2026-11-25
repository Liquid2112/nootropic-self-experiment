import { pubmed } from '../sources';
import type { DictionaryEntry } from '../types';

export const LONGEVITY_ENERGY_ENTRIES: DictionaryEntry[] = [
  {
    id: 'n-acetylcysteine',
    name: 'N-Acetylcysteine (NAC)',
    aliases: ['nac', 'acetylcysteine', 'n-acetyl-l-cysteine'],
    kind: 'supplement',
    category: 'Amino acid derivative',
    goals: ['mood', 'longevity'],
    tagline: 'The glutathione precursor psychiatry keeps revisiting.',
    mechanism:
      'Supplies cysteine for glutathione, the body’s main internal antioxidant, and modulates glutamate release in brain reward circuits.',
    claims: ['Antioxidant and liver support', 'Fewer cravings and compulsions', 'Better mood', 'Lower oxidative stress'],
    research:
      'Placebo-controlled trials in bipolar depression, compulsive disorders and addiction show some positive results, but later and larger trials have been mixed. There is little evidence for cognitive or longevity benefits in healthy people.',
    evidence: 'limited',
    safety:
      'Can cause nausea, stomach upset and an unpleasant smell. May interact with nitroglycerin and blood thinners. People with asthma should be cautious.',
    status:
      'Approved as a drug in the US since 1963. The FDA has said this technically excludes it from the dietary supplement definition, but its 2022 final guidance says it will not act against NAC supplements that are otherwise lawful.',
    studies: [
      {
        citation: 'Berk et al., 2008, Biol Psychiatry',
        finding: 'In bipolar disorder, adding NAC to usual treatment improved depressive symptoms versus placebo over 24 weeks.',
        url: pubmed('Berk 2008 N-acetyl cysteine for depressive symptoms in bipolar disorder'),
      },
      {
        citation: 'FDA: Guidance on N-acetyl-L-cysteine policy, 2022',
        finding: 'States the FDA will use enforcement discretion for NAC products labeled as dietary supplements.',
        url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-policy-regarding-n-acetyl-l-cysteine',
      },
    ],
  },
  {
    id: 'coenzyme-q10',
    name: 'Coenzyme Q10',
    aliases: ['coq10', 'ubiquinone', 'ubiquinol'],
    kind: 'supplement',
    category: 'Mitochondrial cofactor',
    goals: ['energy', 'longevity'],
    tagline: 'A spark plug for mitochondria, best studied in the heart.',
    mechanism:
      'Shuttles electrons in the mitochondrial energy chain and acts as a fat-soluble antioxidant in cell membranes.',
    claims: ['More cellular energy', 'Heart health', 'Less statin muscle pain', 'Anti-aging'],
    research:
      'The strongest data are in chronic heart failure, where one randomized trial found fewer major cardiac events. Results for statin muscle pain are mixed, and there is little evidence it boosts energy or cognition in healthy people.',
    evidence: 'limited',
    safety:
      'Generally well tolerated; mild stomach upset is possible. Can reduce the effect of warfarin and may lower blood pressure or blood sugar slightly.',
    studies: [
      {
        citation: 'Mortensen et al., 2014, JACC Heart Fail',
        finding: 'Q-SYMBIO: in chronic heart failure, CoQ10 reduced major adverse cardiovascular events over two years versus placebo.',
        url: pubmed('Mortensen 2014 effect of coenzyme Q10 on morbidity and mortality in chronic heart failure Q-SYMBIO'),
      },
    ],
  },
  {
    id: 'pqq',
    name: 'PQQ',
    aliases: ['pyrroloquinoline quinone', 'biopqq'],
    kind: 'supplement',
    category: 'Mitochondrial cofactor',
    goals: ['energy', 'memory', 'longevity'],
    tagline: 'Marketed to grow new mitochondria; human proof is thin.',
    mechanism:
      'A redox cofactor that in cell and animal studies switches on PGC-1alpha, a master regulator of new mitochondria.',
    claims: ['New mitochondria', 'More energy', 'Sharper memory', 'Neuroprotection'],
    research:
      'Mitochondrial growth comes from cell and rodent work. A handful of small Japanese human trials, mostly funded by the ingredient maker, report modest gains on some memory and attention tests.',
    evidence: 'limited',
    safety: 'Few side effects reported in short trials, but long-term human safety data are limited.',
    studies: [
      {
        citation: 'Itoh et al., 2016, Adv Exp Med Biol',
        finding: 'Small placebo-controlled trial in older adults reported better scores on some cognitive tests with PQQ.',
        url: pubmed('Itoh 2016 pyrroloquinoline quinone disodium salt BioPQQ cognitive functions'),
      },
    ],
  },
  {
    id: 'nmn',
    name: 'NMN',
    aliases: ['nicotinamide mononucleotide', 'nad booster'],
    kind: 'supplement',
    category: 'NAD+ precursor',
    goals: ['energy', 'longevity'],
    tagline: 'The headline NAD+ booster from the anti-aging boom.',
    mechanism:
      'Converted into NAD+, a coenzyme for energy metabolism and DNA-repair enzymes whose levels fall with age.',
    claims: ['Reverses aging', 'More energy and stamina', 'Better metabolism', 'Younger cells'],
    research:
      'The lifespan and rejuvenation results come from mice. Human trials are small and short: NMN reliably raises blood NAD+ levels, and one trial found better muscle insulin sensitivity in prediabetic women, but no human study shows slowed aging.',
    evidence: 'limited',
    safety: 'Well tolerated in short trials. Long-term effects are unknown, and theoretical concerns about feeding cancer cell metabolism have not been settled.',
    status:
      'The FDA said in 2022 that NMN could not be sold as a supplement, then reversed that position in 2025 and now treats it as a lawful dietary ingredient.',
    studies: [
      {
        citation: 'Yoshino et al., 2021, Science',
        finding: 'Ten weeks of NMN improved muscle insulin sensitivity in 25 prediabetic postmenopausal women; other measures did not change.',
        url: pubmed('Yoshino 2021 nicotinamide mononucleotide increases muscle insulin sensitivity prediabetic women'),
      },
    ],
  },
  {
    id: 'nicotinamide-riboside',
    name: 'Nicotinamide Riboside',
    aliases: ['nr', 'niagen', 'nad booster'],
    kind: 'supplement',
    category: 'NAD+ precursor',
    goals: ['energy', 'longevity'],
    tagline: 'A vitamin B3 form sold to top up falling NAD+.',
    mechanism: 'A form of vitamin B3 that cells convert into NAD+, supporting mitochondrial energy metabolism.',
    claims: ['Healthy aging', 'More energy', 'Better metabolism', 'Mitochondrial support'],
    research:
      'Human trials confirm it raises NAD+ in blood. Effects on muscle, metabolism and blood pressure in people have been small or absent so far, and the anti-aging promise still rests on rodent studies.',
    evidence: 'limited',
    safety: 'Mild nausea, flushing or headache occasionally reported. Long-term safety is not established.',
    studies: [
      {
        citation: 'Martens et al., 2018, Nat Commun',
        finding: 'In healthy middle-aged and older adults, six weeks raised NAD+ and was well tolerated, with only hints of blood-pressure benefit.',
        url: pubmed('Martens 2018 chronic nicotinamide riboside supplementation well-tolerated elevates NAD+ healthy middle-aged older adults'),
      },
    ],
  },
  {
    id: 'alpha-lipoic-acid',
    name: 'Alpha-Lipoic Acid',
    aliases: ['ala', 'lipoic acid', 'thioctic acid', 'r-lipoic acid'],
    kind: 'supplement',
    category: 'Antioxidant',
    goals: ['energy', 'longevity'],
    tagline: 'An antioxidant with real data for diabetic nerve pain.',
    mechanism:
      'A mitochondrial cofactor that works as an antioxidant and helps recycle other antioxidants such as vitamins C and E.',
    claims: ['Anti-aging antioxidant', 'Better blood sugar control', 'Nerve health', 'More energy'],
    research:
      'Meta-analyses of trials in diabetic neuropathy show symptom relief, mainly with intravenous use; oral results are weaker. Evidence for anti-aging or energy benefits in healthy people is lacking.',
    evidence: 'moderate',
    safety:
      'Can cause nausea and rash. May lower blood sugar, which matters for people on diabetes medication. Rarely linked to an autoimmune low-blood-sugar syndrome.',
    studies: [
      {
        citation: 'Mijnhout et al., 2012, Int J Endocrinol',
        finding: 'Meta-analysis: improved neuropathic symptoms in diabetic neuropathy, with the clearest effect from intravenous treatment.',
        url: pubmed('Mijnhout 2012 systematic review meta-analysis alpha-lipoic acid diabetic peripheral neuropathy'),
      },
    ],
  },
  {
    id: 'berberine',
    name: 'Berberine',
    aliases: ['berberine hcl', "nature's ozempic"],
    kind: 'supplement',
    category: 'Plant alkaloid',
    goals: ['energy', 'longevity'],
    tagline: 'A plant compound that genuinely moves blood sugar.',
    mechanism: 'Activates AMPK, a cellular energy sensor, and alters gut bacteria and liver glucose output.',
    claims: ['Lower blood sugar', 'Weight loss', 'Better cholesterol', 'Metformin-like longevity'],
    research:
      'Many randomized trials, mostly from China and of mixed quality, show it lowers blood sugar and cholesterol in people with type 2 diabetes or high lipids. Claims of big weight loss or slowed aging are not well supported in humans.',
    evidence: 'moderate',
    safety:
      'Commonly causes constipation, diarrhea or cramping. Interacts with many drugs through liver enzymes and can add to diabetes medication. Avoid in pregnancy, breastfeeding and newborns.',
    studies: [
      {
        citation: 'Lan et al., 2015, J Ethnopharmacol',
        finding: 'Meta-analysis: lowered blood glucose, lipids and blood pressure in metabolic disease, with few serious side effects.',
        url: pubmed('Lan 2015 meta-analysis berberine type 2 diabetes hyperlipemia hypertension'),
      },
    ],
  },
  {
    id: 'quercetin',
    name: 'Quercetin',
    aliases: ['quercetin dihydrate', 'isoquercetin'],
    kind: 'supplement',
    category: 'Flavonoid',
    goals: ['longevity'],
    tagline: 'An onion-and-apple flavonoid with senolytic hype.',
    mechanism:
      'A plant flavonoid with antioxidant and anti-inflammatory effects; combined with the cancer drug dasatinib it clears senescent cells in mice.',
    claims: ['Clears zombie cells', 'Anti-inflammatory', 'Lower blood pressure', 'Immune support'],
    research:
      'Trials pooled in a meta-analysis show a small blood-pressure drop. The senolytic story is mostly mouse work plus tiny human pilots that paired quercetin with a prescription drug, so it says little about quercetin alone.',
    evidence: 'limited',
    safety:
      'Usually well tolerated; headache and tingling reported. Can interact with drugs processed by liver enzymes and with some antibiotics.',
    studies: [
      {
        citation: 'Serban et al., 2016, J Am Heart Assoc',
        finding: 'Meta-analysis of randomized trials: quercetin modestly lowered blood pressure.',
        url: pubmed('Serban 2016 effects of quercetin on blood pressure systematic review meta-analysis'),
      },
      {
        citation: 'Justice et al., 2019, EBioMedicine',
        finding: 'Open-label pilot of dasatinib plus quercetin in 14 people with lung fibrosis improved some physical function measures.',
        url: pubmed('Justice 2019 senolytics idiopathic pulmonary fibrosis first-in-human open-label pilot'),
      },
    ],
  },
  {
    id: 'fisetin',
    name: 'Fisetin',
    aliases: ['strawberry flavonoid'],
    kind: 'supplement',
    category: 'Flavonoid',
    goals: ['longevity', 'memory'],
    tagline: 'The strawberry flavonoid that extended mouse lifespan.',
    mechanism: 'A flavonoid that in mice selectively kills senescent cells, which build up with age and drive inflammation.',
    claims: ['Senolytic: clears aged cells', 'Longer lifespan', 'Brain protection', 'Less inflammation'],
    research:
      'The lifespan and healthspan gains are in mice only. Human trials have been registered but have not yet produced published efficacy results, so any anti-aging effect in people is unproven.',
    evidence: 'preclinical',
    safety:
      'Little human safety data. May interact with drugs processed by liver enzymes and with blood thinners.',
    studies: [
      {
        citation: 'Yousefzadeh et al., 2018, EBioMedicine',
        finding: 'In aged mice, fisetin reduced senescent-cell markers and extended median and maximum lifespan.',
        url: pubmed('Yousefzadeh 2018 fisetin is a senotherapeutic that extends health and lifespan'),
      },
    ],
  },
  {
    id: 'sulforaphane',
    name: 'Sulforaphane',
    aliases: ['broccoli sprout extract', 'glucoraphanin'],
    kind: 'supplement',
    category: 'Plant compound',
    goals: ['longevity', 'mood'],
    tagline: 'The broccoli sprout compound that flips on cell defenses.',
    mechanism:
      'Activates Nrf2, a switch that turns on the body’s own antioxidant and detoxification genes.',
    claims: ['Detox support', 'Anti-inflammatory', 'Brain health', 'Cancer protection'],
    research:
      'Small human trials show it engages detox pathways, and one small trial in young men with autism found better social behavior scores. Cancer and longevity claims come mainly from cell and animal studies.',
    evidence: 'limited',
    safety: 'Can cause gas, bloating or nausea. Product potency varies widely between brands.',
    studies: [
      {
        citation: 'Singh et al., 2014, PNAS',
        finding: 'In 44 young men with autism, sulforaphane improved social responsiveness scores versus placebo over 18 weeks.',
        url: pubmed('Singh 2014 sulforaphane treatment of autism spectrum disorder'),
      },
    ],
  },
  {
    id: 'spermidine',
    name: 'Spermidine',
    aliases: ['wheat germ extract', 'polyamine'],
    kind: 'supplement',
    category: 'Polyamine',
    goals: ['longevity', 'memory'],
    tagline: 'An autophagy trigger that worked in mice, not yet in people.',
    mechanism: 'A natural polyamine that switches on autophagy, the cell’s recycling of damaged parts.',
    claims: ['Cellular renewal', 'Longer life', 'Heart health', 'Better memory'],
    research:
      'Lifespan and heart benefits come from mice and flies, plus observational diet studies in people. The largest human trial so far, a year-long study in older adults with memory complaints, found no memory benefit over placebo.',
    evidence: 'limited',
    safety: 'Well tolerated in trials. Many products are wheat-germ based, so they may not suit people with gluten issues.',
    studies: [
      {
        citation: 'Eisenberg et al., 2016, Nat Med',
        finding: 'Extended lifespan and protected heart function in mice.',
        url: pubmed('Eisenberg 2016 cardioprotection and lifespan extension by the natural polyamine spermidine'),
      },
      {
        citation: 'Schwarz et al., 2022, JAMA Netw Open',
        finding: 'SmartAge trial: 12 months in older adults with subjective cognitive decline did not improve memory versus placebo.',
        url: pubmed('Schwarz 2022 effects of spermidine supplementation on cognition biomarkers older adults subjective cognitive decline'),
      },
    ],
  },
  {
    id: 'urolithin-a',
    name: 'Urolithin A',
    aliases: ['mitopure', 'ua'],
    kind: 'supplement',
    category: 'Postbiotic',
    goals: ['energy', 'longevity'],
    tagline: 'A pomegranate metabolite that recycles worn-out mitochondria.',
    mechanism:
      'Made by gut bacteria from pomegranate and berry compounds; triggers mitophagy, the clearing of damaged mitochondria.',
    claims: ['Mitochondrial renewal', 'Muscle endurance', 'Healthy aging', 'Better recovery'],
    research:
      'Human trials in older adults show it is safe and shifts mitochondrial gene markers, with some improvement in muscle endurance measures but not in all primary outcomes. The trials are small and funded by the company that sells it.',
    evidence: 'limited',
    safety: 'Well tolerated in trials so far. Long-term safety data are limited.',
    studies: [
      {
        citation: 'Andreux et al., 2019, Nat Metab',
        finding: 'First human trial: safe in older adults and increased mitochondrial gene markers in muscle.',
        url: pubmed('Andreux 2019 mitophagy activator urolithin A safe induces molecular signature improved mitochondrial cellular health humans'),
      },
      {
        citation: 'Liu et al., 2022, JAMA Netw Open',
        finding: 'Four months in older adults improved some muscle endurance measures, though not the main walking test.',
        url: pubmed('Liu 2022 effect of urolithin A supplementation on muscle endurance mitochondrial health older adults'),
      },
    ],
  },
  {
    id: 'astaxanthin',
    name: 'Astaxanthin',
    aliases: ['haematococcus pluvialis', 'red algae carotenoid'],
    kind: 'supplement',
    category: 'Carotenoid',
    goals: ['longevity', 'memory'],
    tagline: 'The pink antioxidant that colors salmon.',
    mechanism: 'A carotenoid from algae that spans cell membranes and neutralizes oxidative damage.',
    claims: ['Powerful antioxidant', 'Skin and eye health', 'Brain protection', 'Exercise recovery'],
    research:
      'Small human trials suggest modest benefits for skin and some oxidative-stress markers. Cognitive data come from one or two small trials, often industry funded, and longevity claims rest on animal work.',
    evidence: 'limited',
    safety: 'Generally well tolerated; may slightly color stool. Little data in pregnancy.',
    studies: [
      {
        citation: 'Katagiri et al., 2012, J Clin Biochem Nutr',
        finding: 'In middle-aged and older adults with mild forgetfulness, some cognitive test scores improved versus placebo.',
        url: pubmed('Katagiri 2012 effects of astaxanthin-rich Haematococcus pluvialis extract on cognitive function'),
      },
    ],
  },
  {
    id: 'pterostilbene',
    name: 'Pterostilbene',
    aliases: ['blueberry resveratrol'],
    kind: 'supplement',
    category: 'Polyphenol',
    goals: ['longevity', 'memory'],
    tagline: 'Resveratrol’s more absorbable blueberry cousin.',
    mechanism: 'A close chemical relative of resveratrol that is absorbed better and activates sirtuin and AMPK pathways in lab studies.',
    claims: ['Better-absorbed resveratrol', 'Anti-aging', 'Brain health', 'Heart health'],
    research:
      'Anti-aging and memory claims come from animal studies. In the main human trial it lowered blood pressure but raised LDL cholesterol in people not on cholesterol medication.',
    evidence: 'limited',
    safety: 'May raise LDL cholesterol. Possible interactions with drugs processed by liver enzymes.',
    studies: [
      {
        citation: 'Riche et al., 2014, Evid Based Complement Alternat Med',
        finding: 'Randomized trial in adults with high cholesterol: lowered blood pressure but increased LDL cholesterol.',
        url: pubmed('Riche 2014 pterostilbene on metabolic parameters randomized double-blind placebo-controlled trial'),
      },
    ],
  },
  {
    id: 'sulbutiamine',
    name: 'Sulbutiamine',
    aliases: ['arcalion', 'enerion'],
    kind: 'supplement',
    category: 'Vitamin B1 derivative',
    goals: ['energy', 'focus', 'mood'],
    tagline: 'A fat-soluble vitamin B1 tweak sold for fatigue.',
    mechanism:
      'Two linked thiamine molecules that cross into the brain more easily than plain B1, raising brain thiamine levels.',
    claims: ['Beats mental fatigue', 'More motivation', 'Better memory', 'Mood lift'],
    research:
      'Older small trials in fatigue and asthenia give mixed results, and some were unblinded. There is little good evidence in healthy people, and claims of motivation boosts are anecdotal.',
    evidence: 'limited',
    safety: 'Can cause headache, irritability and sleep problems. Some users report tolerance or mood swings with frequent use.',
    status: 'Sold as a medicine for fatigue under brand names in some countries; sold as a supplement in the US.',
    noAffiliate: true,
    studies: [
      {
        citation: 'Tiev et al., 1999, Rev Med Interne',
        finding: 'Small randomized trial in post-infectious fatigue found no clear overall benefit over placebo.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/10573727/',
      },
      {
        citation: 'Starling-Soares et al., 2020, J Nutr Metab',
        finding: 'Review: human data are limited, mostly small trials in fatigue-related conditions.',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7210561/',
      },
    ],
  },
  {
    id: 'benfotiamine',
    name: 'Benfotiamine',
    aliases: ['vitamin b1 derivative', 'fat-soluble thiamine'],
    kind: 'supplement',
    category: 'Vitamin B1 derivative',
    goals: ['memory', 'longevity'],
    tagline: 'A high-absorption B1 being tested in Alzheimer’s.',
    mechanism:
      'A fat-soluble thiamine form that raises thiamine levels more than plain B1 and may block the buildup of glycation end products.',
    claims: ['Nerve protection', 'Better memory', 'Blood sugar damage defense', 'Healthy aging'],
    research:
      'Small trials suggest benefit for diabetic nerve symptoms. A pilot trial in early Alzheimer’s found less decline on some measures than placebo, but it was small; larger trials are underway.',
    evidence: 'limited',
    safety: 'Generally well tolerated; occasional stomach upset or skin reactions.',
    studies: [
      {
        citation: 'Gibson et al., 2020, J Alzheimers Dis',
        finding: 'Year-long pilot in mild Alzheimer’s: less clinical decline than placebo on some measures.',
        url: pubmed('Gibson 2020 benfotiamine and cognitive decline in Alzheimer’s disease randomized placebo-controlled'),
      },
    ],
  },
];
