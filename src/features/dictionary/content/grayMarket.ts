import { pubmed } from '../sources';
import type { DictionaryEntry } from '../types';

/**
 * Gray-market and prescription-only compounds people ask about. Education only:
 * no dosing, no sourcing. Most of these have little or no long-term human
 * safety data, and products sold online are unverified and often mislabeled.
 */
export const GRAY_MARKET_ENTRIES: DictionaryEntry[] = [
  {
    id: 'oxiracetam',
    name: 'Oxiracetam',
    aliases: ['ISF 2522'],
    kind: 'unregulated',
    category: 'Racetam',
    goals: ['memory', 'focus'],
    tagline: 'A racetam pitched as the "logical thinking" one.',
    mechanism:
      'A piracetam relative thought to modulate AMPA glutamate receptors and acetylcholine release in lab studies; the exact mechanism is unclear.',
    claims: ['Sharper reasoning', 'Memory', 'Mental energy without stimulation'],
    research:
      'Clinical trials from the 1980s and 1990s in dementia and age-related decline were small and gave mixed results. There are no modern controlled trials in healthy people.',
    evidence: 'limited',
    safety:
      'Reported headache, nervousness and sleep trouble. Long-term safety is unknown, and gray-market powders are not checked for purity or identity.',
    status:
      'Has been sold as a prescription drug in a few countries. Not FDA-approved; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'PubMed: oxiracetam in dementia',
        finding: 'Older trials of oxiracetam in dementia and cognitive decline, with mixed results.',
        url: pubmed('oxiracetam dementia randomized'),
      },
    ],
  },
  {
    id: 'pramiracetam',
    name: 'Pramiracetam',
    aliases: ['CI-879', 'Pramistar'],
    kind: 'unregulated',
    category: 'Racetam',
    goals: ['memory', 'focus'],
    tagline: 'A potent racetam with a reputation bigger than its data.',
    mechanism: 'Animal studies suggest it raises choline uptake in the hippocampus; how that translates to people is unknown.',
    claims: ['Memory and recall', 'Focus', 'Learning speed'],
    research:
      'Human evidence is a handful of small studies, mostly in people with brain injury or dementia, from decades ago. Nothing rigorous exists in healthy people.',
    evidence: 'limited',
    safety:
      'Reported headache, anxiety and insomnia. Long-term safety is unknown. Unregulated products may be contaminated or mislabeled.',
    status:
      'Was sold as a prescription drug in parts of Europe. Not FDA-approved; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'PubMed: pramiracetam studies',
        finding: 'Small, older human studies in memory impairment and animal work on choline uptake.',
        url: pubmed('pramiracetam'),
      },
    ],
  },
  {
    id: 'coluracetam',
    name: 'Coluracetam',
    aliases: ['MKC-231', 'BCI-540'],
    kind: 'unregulated',
    category: 'Racetam',
    goals: ['memory', 'mood'],
    tagline: 'A failed drug candidate reborn as an online nootropic.',
    mechanism: 'In rodents it boosts high-affinity choline uptake, the step that feeds acetylcholine production.',
    claims: ['Memory', 'Mood lift', 'Sharper vision (anecdotal)'],
    research:
      'Most data are from rodent studies. It entered early clinical development for depression with anxiety, but no convincing trial results have been published.',
    evidence: 'preclinical',
    safety: 'Very little human safety data. Long-term effects are unknown and gray-market products are unverified.',
    status: 'Never approved anywhere. Research chemical only; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'PubMed: MKC-231 choline uptake studies',
        finding: 'Animal research on coluracetam enhancing choline uptake and memory in impaired rodents.',
        url: pubmed('MKC-231 choline uptake'),
      },
    ],
  },
  {
    id: 'fasoracetam',
    name: 'Fasoracetam',
    aliases: ['NS-105', 'NFC-1'],
    kind: 'unregulated',
    category: 'Racetam',
    goals: ['focus', 'mood'],
    tagline: 'A shelved dementia drug later tested in genetic ADHD.',
    mechanism: 'Acts on metabotropic glutamate (mGluR) receptors and may influence GABA-B signaling in lab studies.',
    claims: ['Focus and attention', 'Calmer mood', 'Less anxiety'],
    research:
      'Developed for vascular dementia and dropped. A small, short pilot study in teens with ADHD and specific mGluR gene variants reported improvement, but it was open-label and has not led to approval.',
    evidence: 'limited',
    safety: 'Short-term pilot data only. Long-term safety is unknown, and online products are not quality-controlled.',
    status: 'Not approved anywhere. Not FDA-approved; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'Elia et al., 2018, Nat Commun',
        finding: 'Five-week pilot in adolescents with ADHD and mGluR network variants; symptoms improved, but without a placebo control.',
        url: pubmed('Elia 2018 fasoracetam adolescents ADHD glutamatergic gene network variants mGluR'),
      },
    ],
  },
  {
    id: 'nefiracetam',
    name: 'Nefiracetam',
    aliases: ['DM-9384', 'Translon'],
    kind: 'unregulated',
    category: 'Racetam',
    goals: ['memory', 'mood'],
    tagline: 'A racetam that reached late trials, then stalled.',
    mechanism: 'Lab studies show it enhances calcium-channel and nicotinic acetylcholine receptor currents in neurons.',
    claims: ['Memory', 'Motivation', 'Mood support'],
    research:
      'It was tested in stroke and dementia patients. A randomized trial in post-stroke depression did not show a clear overall advantage over placebo, and development stopped.',
    evidence: 'limited',
    safety:
      'Animal studies at high exposure raised kidney and testicular toxicity concerns. Long-term human safety is unknown.',
    status: 'Never approved. Not FDA-approved; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'Robinson et al., 2008, J Neuropsychiatry Clin Neurosci',
        finding: 'Double-blind trial in post-stroke depression; no clear overall benefit over placebo.',
        url: pubmed('Robinson 2008 double-blind randomized treatment poststroke depression nefiracetam'),
      },
      {
        citation: 'Robinson et al., 2009, J Neuropsychiatry Clin Neurosci',
        finding: 'Follow-up analysis of apathy in the same patient group.',
        url: pubmed('Robinson 2009 double-blind treatment apathy poststroke depression nefiracetam'),
      },
    ],
  },
  {
    id: 'sunifiram',
    name: 'Sunifiram',
    aliases: ['DM235'],
    kind: 'unregulated',
    category: 'Research chemical',
    goals: ['memory', 'focus'],
    tagline: 'A lab compound that has never been tested in people.',
    mechanism: 'In rodents it appears to boost AMPA receptor signaling and acetylcholine release; structurally related to piracetam.',
    claims: ['Strong memory boost', 'Focus', 'Stimulating feel'],
    research:
      'All published data come from mouse and rat experiments where it reversed drug-induced amnesia. There are zero human clinical trials.',
    evidence: 'preclinical',
    safety: 'No formal human safety data at all. Unknown long-term effects; gray-market powders are unverified.',
    status: 'Never approved anywhere. Research chemical only; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'Ghelardini et al., 2002, Naunyn Schmiedebergs Arch Pharmacol',
        finding: 'Rodent study: sunifiram and unifiram prevented induced amnesia at very low exposures.',
        url: pubmed('Ghelardini 2002 DM232 unifiram DM235 sunifiram antiamnesic'),
      },
    ],
  },
  {
    id: 'unifiram',
    name: 'Unifiram',
    aliases: ['DM232'],
    kind: 'unregulated',
    category: 'Research chemical',
    goals: ['memory'],
    tagline: 'Sunifiram’s lab sibling, with even less known.',
    mechanism: 'Rodent work suggests it increases acetylcholine release and AMPA-related signaling.',
    claims: ['Memory', 'Learning'],
    research: 'Evidence is limited to a few animal studies on reversing induced amnesia. It has never been studied in humans.',
    evidence: 'preclinical',
    safety: 'No human safety data. Unknown long-term effects; products sold online are unverified.',
    status: 'Never approved anywhere. Research chemical only; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'Ghelardini et al., 2002, Naunyn Schmiedebergs Arch Pharmacol',
        finding: 'Animal study showing antiamnesic effects of unifiram and sunifiram.',
        url: pubmed('Ghelardini 2002 DM232 unifiram DM235 sunifiram antiamnesic'),
      },
    ],
  },
  {
    id: 'modafinil',
    name: 'Modafinil',
    aliases: ['Provigil', 'modalert'],
    kind: 'unregulated',
    category: 'Prescription wakefulness drug',
    goals: ['focus', 'energy'],
    tagline: 'The prescription "smart drug" for wakefulness.',
    mechanism: 'Mainly blocks dopamine reuptake, with downstream effects on orexin, histamine and norepinephrine systems.',
    claims: ['Long hours of focus', 'Wakefulness', 'Productivity'],
    research:
      'It is well established for sleepiness in narcolepsy, sleep apnea and shift-work disorder. In rested healthy people, reviews find modest benefits on planning and decision tasks, with small and inconsistent effects elsewhere.',
    evidence: 'moderate',
    safety:
      'Headache, insomnia and anxiety are common. Rare but serious skin reactions (including Stevens-Johnson syndrome) have been reported. It can reduce the effectiveness of hormonal birth control. Some potential for misuse.',
    status:
      'FDA-approved prescription drug and a Schedule IV controlled substance in the US. Buying it without a prescription is illegal, and online pills are often counterfeit. Prohibited in competition by WADA.',
    studies: [
      {
        citation: 'Battleday & Brem, 2015, Eur Neuropsychopharmacol',
        finding: 'Systematic review: in non-sleep-deprived adults, benefits were clearest on complex tasks and effects were modest.',
        url: pubmed('Battleday Brem 2015 modafinil cognitive neuroenhancement healthy non-sleep-deprived'),
      },
      {
        citation: 'Kredlow et al., 2019, J Clin Psychopharmacol',
        finding: 'Meta-analysis: small overall cognitive benefit in healthy people.',
        url: pubmed('Kredlow 2019 efficacy of modafinil as a cognitive enhancer meta-analysis'),
      },
    ],
  },
  {
    id: 'armodafinil',
    name: 'Armodafinil',
    aliases: ['Nuvigil', 'R-modafinil'],
    kind: 'unregulated',
    category: 'Prescription wakefulness drug',
    goals: ['focus', 'energy'],
    tagline: 'The longer-lasting mirror half of modafinil.',
    mechanism: 'The R-enantiomer of modafinil; works the same way (dopamine reuptake inhibition) but stays active longer.',
    claims: ['All-day wakefulness', 'Focus', 'Less fatigue'],
    research:
      'Randomized trials show it improves wakefulness in narcolepsy, sleep apnea and shift-work disorder. Data on cognitive enhancement in healthy, rested people are sparse.',
    evidence: 'moderate',
    safety:
      'Same cautions as modafinil: insomnia, headache, anxiety, rare serious skin reactions, and reduced effectiveness of hormonal birth control.',
    status:
      'FDA-approved prescription drug and a Schedule IV controlled substance in the US. Buying it without a prescription is illegal. Prohibited in competition by WADA.',
    studies: [
      {
        citation: 'Harsh et al., 2006, Curr Med Res Opin',
        finding: 'Randomized trial: improved wakefulness and attention in adults with narcolepsy.',
        url: pubmed('Harsh 2006 efficacy safety armodafinil excessive sleepiness narcolepsy'),
      },
    ],
  },
  {
    id: 'adrafinil',
    name: 'Adrafinil',
    aliases: ['Olmifon'],
    kind: 'unregulated',
    category: 'Wakefulness prodrug',
    goals: ['focus', 'energy'],
    tagline: 'The liver-processed precursor to modafinil.',
    mechanism: 'The liver converts it into modafinil, so its effects are essentially modafinil’s, arriving more slowly.',
    claims: ['Wakefulness', 'Focus', 'A legal-gray modafinil alternative'],
    research:
      'Most published work is in aged dogs and older small human studies. It has never been tested to modern standards in healthy people.',
    evidence: 'limited',
    safety:
      'Because the liver does the conversion, raised liver enzymes are a concern with repeated use. Carries modafinil’s cautions too (insomnia, anxiety, interactions with hormonal birth control).',
    status:
      'Was sold in France and later withdrawn there. Not FDA-approved and not a lawful dietary supplement in the US. Prohibited in competition by WADA.',
    studies: [
      {
        citation: 'Milgram et al., 2000, Pharmacol Biochem Behav',
        finding: 'Aged beagle dogs given adrafinil learned a discrimination task better than controls.',
        url: pubmed('Milgram 2000 oral administration adrafinil discrimination learning aged beagle dogs'),
      },
    ],
  },
  {
    id: 'vinpocetine',
    name: 'Vinpocetine',
    aliases: ['Cavinton', 'periwinkle extract'],
    kind: 'unregulated',
    category: 'Synthetic plant derivative',
    goals: ['memory', 'focus'],
    tagline: 'A blood-flow compound the FDA warns pregnant women about.',
    mechanism: 'Made from a periwinkle alkaloid; inhibits the PDE1 enzyme and sodium channels, which may raise blood flow to the brain.',
    claims: ['Brain blood flow', 'Memory', 'Mental clarity'],
    research:
      'A Cochrane review of older dementia trials found the evidence too weak to support its use. Studies in healthy people are few and small.',
    evidence: 'limited',
    safety:
      'Can lower blood pressure and may raise bleeding risk with blood thinners. The FDA warns that it may cause miscarriage or harm fetal development; anyone pregnant or who could become pregnant should avoid it.',
    status:
      'A prescription drug in some countries. In 2019 the FDA said it does not meet the definition of a dietary ingredient and warned women of childbearing age about it, though it is still widely sold in US supplements.',
    studies: [
      {
        citation: 'FDA: 2019 statement on vinpocetine',
        finding: 'Warning that vinpocetine in supplements may cause miscarriage or harm fetal development.',
        url: 'https://www.fda.gov/news-events/press-announcements/statement-warning-women-childbearing-age-about-possible-safety-risks-dietary-supplements-containing',
      },
      {
        citation: 'PubMed: vinpocetine for cognitive impairment and dementia',
        finding: 'Systematic review of older trials; insufficient evidence for clinical use.',
        url: pubmed('vinpocetine cognitive impairment dementia Cochrane'),
      },
    ],
  },
  {
    id: 'picamilon',
    name: 'Picamilon',
    aliases: ['pikamilon', 'nicotinoyl-GABA'],
    kind: 'unregulated',
    category: 'Russian prescription drug',
    goals: ['mood', 'sleep'],
    tagline: 'GABA bolted to niacin, a Russian Rx the FDA rejected.',
    mechanism: 'Niacin attached to GABA, designed to cross into the brain and then split apart; the niacin part may widen blood vessels.',
    claims: ['Calm and less anxiety', 'Better mood', 'Easier sleep'],
    research:
      'Research is mostly Russian clinical and animal work that has not been replicated in rigorous Western trials.',
    evidence: 'limited',
    safety:
      'Reported flushing, headache and drowsiness. Avoid combining with alcohol or other sedatives. Long-term safety is unknown, and supplement testing has found products with inaccurate amounts.',
    status:
      'Prescription drug in Russia. The FDA has stated picamilon is not a lawful dietary ingredient, so supplements containing it are misbranded in the US.',
    studies: [
      {
        citation: 'FDA: Picamilon in dietary supplements',
        finding: 'FDA position that picamilon does not qualify as a dietary ingredient.',
        url: 'https://www.fda.gov/food/dietary-supplement-ingredient-directory/picamilon-dietary-supplements',
      },
      {
        citation: 'PubMed: picamilon research',
        finding: 'Mostly Russian pharmacology and small clinical reports.',
        url: pubmed('picamilon'),
      },
    ],
  },
  {
    id: 'meclofenoxate',
    name: 'Meclofenoxate',
    aliases: ['centrophenoxine', 'Lucidril'],
    kind: 'unregulated',
    category: 'Cholinergic drug',
    goals: ['memory', 'longevity'],
    tagline: 'An old European anti-aging drug linked to lipofuscin.',
    mechanism:
      'Combines DMAE with an auxin-like compound; thought to supply choline and, in old animal studies, reduce lipofuscin (age pigment) in neurons.',
    claims: ['Memory', 'Brain anti-aging', 'Clearer thinking'],
    research:
      'Small trials from the 1970s and 1980s in elderly people gave modest, inconsistent memory results. There are no modern, well-controlled trials.',
    evidence: 'limited',
    safety:
      'Reported headache, insomnia, agitation and stomach upset. Avoid with seizure disorders or with other cholinergic drugs unless a doctor advises. Long-term safety is unknown.',
    status:
      'A prescription drug in some countries. Not FDA-approved; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'Marcer & Hopkins, 1977, Age Ageing',
        finding: 'In elderly volunteers, effects on memory varied and were modest at best.',
        url: pubmed('Marcer Hopkins 1977 differential effects meclofenoxate memory loss elderly'),
      },
    ],
  },
  {
    id: '9-me-bc',
    name: '9-Me-BC',
    aliases: ['9-methyl-beta-carboline', '9-methyl-β-carboline'],
    kind: 'unregulated',
    category: 'Research chemical',
    goals: ['focus', 'mood'],
    tagline: 'A dopamine-neuron compound known only from lab dishes and rats.',
    mechanism:
      'In cell and rodent studies it promoted growth of dopamine neurons and inhibited MAO enzymes; it belongs to the beta-carboline family, some of which are neurotoxic.',
    claims: ['Motivation and drive', 'Dopamine "reset"', 'Learning'],
    research:
      'All evidence is from cell cultures and rodents, including a rat Parkinson’s model. There are no human trials of any kind.',
    evidence: 'preclinical',
    safety:
      'No human safety data. As an MAO inhibitor it may interact dangerously with antidepressants, stimulants and some foods. Related compounds can be toxic, and gray-market products are unverified.',
    status: 'Never approved anywhere. Research chemical only; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'Wernicke et al., 2010, Pharmacol Rep',
        finding: 'Rat study: 9-Me-BC had restorative effects on dopamine neurons in a Parkinson’s model.',
        url: pubmed('9-Methyl-beta-carboline has restorative effects in an animal model of Parkinson disease'),
      },
    ],
  },
  {
    id: 'dihexa',
    name: 'Dihexa',
    aliases: ['PNB-0408', 'N-hexanoic-Tyr-Ile-(6) aminohexanoic amide'],
    kind: 'unregulated',
    category: 'Research peptide',
    goals: ['memory'],
    tagline: 'A rat-study peptide hyped far past its evidence.',
    mechanism: 'An angiotensin IV analog that boosts hepatocyte growth factor (HGF) signaling through its c-Met receptor, promoting new synapses in lab studies.',
    claims: ['Huge memory gains', 'Brain repair', 'Synapse growth'],
    research:
      'Evidence is from rodent and cell studies only; dihexa itself has never been tested in humans. A related drug aimed at the same HGF pathway did not meet its main goal in an Alzheimer’s trial.',
    evidence: 'preclinical',
    safety:
      'No human safety data. The HGF/c-Met pathway it activates is involved in tumor growth, so a cancer-promotion risk is a real theoretical concern. Unregulated products may be contaminated or mislabeled.',
    status: 'Never approved anywhere. Research chemical only; not a lawful dietary supplement in the US.',
    studies: [
      {
        citation: 'McCoy et al., 2013, J Pharmacol Exp Ther',
        finding: 'Rat study: stabilized angiotensin IV analogs including dihexa improved memory in impaired animals.',
        url: pubmed('McCoy 2013 evaluation metabolically stabilized angiotensin IV analogs procognitive antidementia'),
      },
    ],
  },
  {
    id: 'cerebrolysin',
    name: 'Cerebrolysin',
    aliases: ['FPF-1070'],
    kind: 'unregulated',
    category: 'Peptide preparation',
    goals: ['memory'],
    tagline: 'An injectable pig-brain peptide mix used abroad after stroke.',
    mechanism:
      'A mixture of small peptides and amino acids from purified pig brain proteins, said to mimic natural nerve-growth factors.',
    claims: ['Brain repair', 'Stroke and injury recovery', 'Memory'],
    research:
      'Many trials exist in stroke and dementia, a large share manufacturer-funded. A 2015 meta-analysis reported small benefits in Alzheimer’s, while a 2020 Cochrane review in acute stroke found no reduction in deaths and flagged a possible rise in serious non-fatal side effects.',
    evidence: 'limited',
    safety:
      'Given only by injection, which carries infection risk outside medical settings. Reported dizziness, headache and agitation. Unregulated products carry contamination and sterility risks.',
    status:
      'A prescription drug in Russia, China and parts of Europe and Asia. Not FDA-approved.',
    studies: [
      {
        citation: 'Gauthier et al., 2015, Dement Geriatr Cogn Disord',
        finding: 'Meta-analysis of trials in mild-to-moderate Alzheimer’s found small benefits on cognition and global function.',
        url: pubmed('Gauthier 2015 cerebrolysin mild-to-moderate Alzheimer meta-analysis'),
      },
      {
        citation: 'Ziganshina et al., 2020, Cochrane Database Syst Rev',
        finding: 'In acute ischemic stroke, no reduction in deaths; possible increase in serious non-fatal adverse events.',
        url: pubmed('Ziganshina 2020 cerebrolysin acute ischaemic stroke Cochrane'),
      },
    ],
  },
  {
    id: 'p21-peptide',
    name: 'P21',
    aliases: ['P021', 'P-21'],
    kind: 'unregulated',
    category: 'Research peptide',
    goals: ['memory'],
    tagline: 'A lab peptide inspired by Cerebrolysin, studied in mice.',
    mechanism:
      'A small synthetic peptide modeled on part of ciliary neurotrophic factor (CNTF), designed to raise BDNF and encourage new neuron growth.',
    claims: ['Neurogenesis', 'Memory', 'Brain repair'],
    research:
      'All published work is in mouse and rat models of Alzheimer’s and aging, where it improved some memory and neurogenesis measures. There are no human trials.',
    evidence: 'preclinical',
    safety: 'No human safety data. Long-term effects are unknown, and gray-market peptide products are unverified.',
    status: 'Never approved anywhere. Research chemical only; not FDA-approved.',
    studies: [
      {
        citation: 'PubMed: P021 peptide in Alzheimer’s models',
        finding: 'Rodent studies of the CNTF-derived peptide on neurogenesis and memory.',
        url: pubmed('P021 peptide neurogenesis Alzheimer mouse'),
      },
    ],
  },
  {
    id: 'emoxypine',
    name: 'Emoxypine',
    aliases: ['Mexidol', 'mexidol', 'emoxipine', 'ethylmethylhydroxypyridine succinate'],
    kind: 'unregulated',
    category: 'Russian prescription drug',
    goals: ['mood', 'memory'],
    tagline: 'A Russian antioxidant drug prescribed for nearly everything.',
    mechanism: 'Described as an antioxidant and membrane protector; the succinate form is said to support cell energy metabolism.',
    claims: ['Less anxiety', 'Neuroprotection', 'Hangover and stress recovery'],
    research:
      'Widely prescribed in Russia for stroke, anxiety and other conditions, but the trials are mostly Russian, often industry-linked, and not rigorously replicated elsewhere.',
    evidence: 'limited',
    safety:
      'Reported nausea, dry mouth and drowsiness. Long-term safety outside Russian clinical use is not well documented. Unregulated products may be mislabeled.',
    status: 'Prescription drug in Russia and some neighboring countries. Not FDA-approved.',
    studies: [
      {
        citation: 'PubMed: emoxypine (Mexidol) clinical studies',
        finding: 'Mostly Russian clinical studies in stroke and anxiety.',
        url: pubmed('mexidol emoxypine'),
      },
    ],
  },
  {
    id: 'methylene-blue',
    name: 'Methylene Blue',
    aliases: ['methylthioninium chloride', 'ProvayBlue', 'MB'],
    kind: 'unregulated',
    category: 'Prescription dye / drug',
    goals: ['memory', 'energy', 'longevity'],
    tagline: 'A century-old blue dye with a serious drug interaction.',
    mechanism:
      'Shuttles electrons in the mitochondrial energy chain and is also a potent MAO-A inhibitor, which raises serotonin.',
    claims: ['Mitochondrial energy', 'Memory', 'Anti-aging'],
    research:
      'A small randomized imaging study in healthy adults found a slight boost in short-term memory and related brain activity. Larger trials of a related compound in Alzheimer’s did not show clear benefit.',
    evidence: 'limited',
    safety:
      'Can cause serotonin syndrome, which can be fatal, when combined with SSRIs, SNRIs, MAOIs and other serotonergic drugs. People with G6PD deficiency risk dangerous red-blood-cell breakdown. Turns urine blue-green. Non-pharmaceutical grades may contain heavy metals.',
    status:
      'FDA-approved prescription drug for methemoglobinemia. Not approved for cognition. Non-pharmaceutical (aquarium or lab) grades are not intended for people.',
    studies: [
      {
        citation: 'Rodriguez et al., 2016, Radiology',
        finding: 'Single-dose randomized study in healthy adults: slight short-term memory gain with changes in brain activity.',
        url: pubmed('Rodriguez 2016 multimodal randomized functional MR imaging methylene blue human brain'),
      },
      {
        citation: 'FDA: Drug Safety Communication on methylene blue',
        finding: 'Warns of serious serotonin syndrome when methylene blue is combined with serotonergic psychiatric drugs.',
        url: 'https://www.fda.gov/drugs/drug-safety-and-availability/fda-drug-safety-communication-serious-cns-reactions-possible-when-methylene-blue-given-patients',
      },
    ],
  },
];
