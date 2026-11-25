import { ods, pubmed } from '../sources';
import type { DictionaryEntry } from '../types';

export const FOCUS_MOOD_ENTRIES: DictionaryEntry[] = [
  {
    id: 'huperzine-a',
    name: 'Huperzine A',
    aliases: ['huperzia serrata', 'hupa', 'qian ceng ta'],
    kind: 'supplement',
    category: 'Acetylcholinesterase inhibitor',
    goals: ['memory', 'focus'],
    tagline: 'A club-moss alkaloid that keeps acetylcholine around longer.',
    mechanism:
      'Blocks acetylcholinesterase, the enzyme that breaks down acetylcholine, so more of the neurotransmitter stays active at synapses.',
    claims: ['Sharper memory', 'Better recall while studying', 'Lucid dreams'],
    research:
      'Meta-analyses of mostly Chinese trials in Alzheimer’s and vascular dementia report better cognitive scores, but the trials are small and often low quality. A US phase II trial in Alzheimer’s found no benefit at its main dose. There is little good data in healthy people.',
    evidence: 'limited',
    safety:
      'Can cause nausea, diarrhea, sweating, slow heart rate and muscle twitching. Long half-life, so effects can build up. Avoid with other cholinergic drugs, beta-blockers, or if you have heart rhythm problems, asthma, seizures or ulcers.',
    studies: [
      {
        citation: 'Xing et al., 2014, Evid Based Complement Alternat Med',
        finding: 'Meta-analysis: improved cognition and daily function in dementia, with weak trial quality.',
        url: pubmed('Xing 2014 Huperzine A Alzheimer vascular dementia meta-analysis'),
      },
      {
        citation: 'Rafii et al., 2011, Neurology',
        finding: 'In mild-to-moderate Alzheimer’s, the main dose did not beat placebo on the primary cognitive measure.',
        url: pubmed('Rafii 2011 phase II trial huperzine A mild to moderate Alzheimer disease'),
      },
    ],
  },
  {
    id: 'galantamine',
    name: 'Galantamine',
    aliases: ['galanthamine', 'razadyne', 'reminyl', 'snowdrop extract'],
    kind: 'supplement',
    category: 'Acetylcholinesterase inhibitor',
    goals: ['memory'],
    tagline: 'An Alzheimer’s drug that also sits on supplement shelves.',
    mechanism:
      'Slows the breakdown of acetylcholine and also makes nicotinic acetylcholine receptors more responsive.',
    claims: ['Better memory', 'Vivid or lucid dreams', 'Mental clarity'],
    research:
      'Large trials and a Cochrane review show a small but consistent benefit on cognition in mild-to-moderate Alzheimer’s disease. It did not help mild cognitive impairment and those trials saw more deaths in the galantamine group. There is no solid evidence it enhances cognition in healthy people.',
    evidence: 'moderate',
    safety:
      'Nausea, vomiting, dizziness, poor appetite and slow heart rate are common. Interacts with other cholinergic drugs, anticholinergics and heart-rate-lowering medicine. Avoid with heart conduction problems, seizures, asthma or ulcers; talk to a doctor first.',
    status:
      'Prescription drug for Alzheimer’s disease in the US, UK and EU. Also sold over the counter in the US as a dietary supplement derived from plants.',
    studies: [
      {
        citation: 'Loy & Schneider, 2006, Cochrane Database Syst Rev',
        finding: 'Modest cognitive and global benefits in Alzheimer’s; no meaningful benefit in mild cognitive impairment.',
        url: pubmed('Loy Schneider 2006 galantamine Alzheimer disease mild cognitive impairment'),
      },
    ],
    noAffiliate: true,
  },
  {
    id: 'choline-bitartrate',
    name: 'Choline Bitartrate',
    aliases: ['choline', 'choline salt'],
    kind: 'supplement',
    category: 'Choline source',
    goals: ['memory', 'focus'],
    tagline: 'The cheapest choline source, with the weakest brain case.',
    mechanism:
      'Supplies choline, an essential nutrient used for acetylcholine and cell membranes, though less of it reaches the brain than with other forms.',
    claims: ['Better memory', 'Cheap choline top-up', 'Supports liver health'],
    research:
      'A placebo-controlled study in healthy young adults found no acute effect on memory. Choline is a genuine essential nutrient, but there is little evidence that extra choline bitartrate sharpens cognition in people who are not deficient.',
    evidence: 'limited',
    safety:
      'Large amounts can cause a fishy body odor, sweating, stomach upset and low blood pressure. Gut bacteria turn choline into TMAO, which has been linked to heart risk in observational studies.',
    studies: [
      {
        citation: 'Lippelt et al., 2016, PLoS One',
        finding: 'A single serving had no measurable effect on memory in healthy young adults.',
        url: pubmed('Lippelt 2016 No acute effects choline bitartrate memory healthy young'),
      },
      {
        citation: 'NIH ODS: Choline fact sheet',
        finding: 'Choline is an essential nutrient; most people get it from food and deficiency is uncommon.',
        url: ods('Choline'),
      },
    ],
  },
  {
    id: 'uridine-monophosphate',
    name: 'Uridine Monophosphate',
    aliases: ['uridine', 'ump', 'uridine-5-monophosphate'],
    kind: 'supplement',
    category: 'Nucleotide',
    goals: ['memory', 'mood'],
    tagline: 'A building block for brain cell membranes and synapses.',
    mechanism:
      'Feeds the pathway that builds phosphatidylcholine for neuron membranes; with choline and omega-3s it may help form new synapses.',
    claims: ['Better memory', 'Lifted mood', 'Motivation', 'Synergy with choline and fish oil'],
    research:
      'The main human data come from a medical-food blend (uridine plus choline, omega-3s and vitamins) that modestly helped delayed recall in early Alzheimer’s in one trial, with mixed results later. Uridine alone has only small open-label pilot data in mood disorders.',
    evidence: 'limited',
    safety:
      'Generally well tolerated in studies. Little long-term safety data on uridine alone. People with bipolar disorder or on psychiatric medication should check with a doctor.',
    studies: [
      {
        citation: 'Scheltens et al., 2010, Alzheimers Dement',
        finding: 'A uridine-containing nutrient blend improved delayed verbal recall in mild Alzheimer’s over 12 weeks.',
        url: pubmed('Scheltens 2010 efficacy of a medical food in mild Alzheimer disease randomized'),
      },
      {
        citation: 'Kondo et al., 2011, J Child Adolesc Psychopharmacol',
        finding: 'Small open-label pilot: depressive symptoms dropped in adolescents with bipolar depression.',
        url: pubmed('Kondo 2011 open-label uridine adolescents bipolar depression'),
      },
    ],
  },
  {
    id: 'dmae',
    name: 'DMAE',
    aliases: ['dimethylaminoethanol', 'deanol', 'dmae bitartrate'],
    kind: 'supplement',
    category: 'Choline precursor',
    goals: ['focus', 'mood'],
    tagline: 'An old "brain booster" with mostly decades-old data.',
    mechanism:
      'Thought to raise choline levels and acetylcholine production, though animal studies show it may actually compete with choline for entry into the brain.',
    claims: ['Better focus', 'Mood lift', 'Firmer skin'],
    research:
      'Deanol was studied in the 1970s for memory in older adults and for attention problems, with mostly null or weak results. Modern studies are small and usually test multi-ingredient blends, so its own effect is unclear.',
    evidence: 'limited',
    safety:
      'May cause headache, insomnia, muscle tension or twitching. Avoid in pregnancy, epilepsy or bipolar disorder, and with cholinergic or anticholinergic drugs.',
    studies: [
      {
        citation: 'Marsh & Linnoila, 1979, Psychopharmacology',
        finding: 'In elderly adults with memory complaints, deanol did not clearly improve cognitive test performance.',
        url: pubmed('effects of deanol on cognitive performance and electrophysiology in elderly humans'),
      },
    ],
  },
  {
    id: 'paraxanthine',
    name: 'Paraxanthine',
    aliases: ['1,7-dimethylxanthine', 'enfinity'],
    kind: 'supplement',
    category: 'Stimulant',
    goals: ['focus', 'energy'],
    tagline: 'Caffeine’s main metabolite, sold as a "cleaner" caffeine.',
    mechanism:
      'Blocks adenosine receptors like caffeine does, and may also boost dopamine signaling; it is what the liver turns most caffeine into.',
    claims: ['Focus without jitters', 'Less anxiety than caffeine', 'Smoother comedown'],
    research:
      'A handful of small crossover trials found improvements in attention, reaction time and working-memory tasks versus placebo. Nearly all of them were funded by the company that sells it, and head-to-head comparisons with caffeine are few.',
    evidence: 'limited',
    safety:
      'Expect caffeine-like cautions: sleep disruption, raised heart rate and nervousness are possible. Long-term human safety data are limited. Do not stack heavily with other stimulants.',
    studies: [
      {
        citation: 'Dose-response crossover trial, 2021, Nutrients',
        finding: 'Single servings improved several attention and memory test scores versus placebo; industry-funded.',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8708375/',
      },
    ],
  },
  {
    id: 'theacrine',
    name: 'Theacrine',
    aliases: ['teacrine', '1,3,7,9-tetramethyluric acid', 'kucha'],
    kind: 'supplement',
    category: 'Stimulant',
    goals: ['energy', 'focus', 'mood'],
    tagline: 'A tea alkaloid marketed as caffeine without the tolerance.',
    mechanism:
      'Structurally similar to caffeine; appears to act on adenosine and dopamine systems, with animal data suggesting less tolerance build-up.',
    claims: ['Steady energy', 'No tolerance', 'Better mood and motivation'],
    research:
      'Small, mostly industry-funded human trials report more self-rated energy and focus, often only when combined with caffeine. An eight-week safety study found no clear tolerance or major safety signals. Objective cognitive gains are not well shown.',
    evidence: 'limited',
    safety:
      'Can cause stimulant-type effects such as restlessness, headache and poor sleep. Little data beyond a few months. Use caution with heart conditions or other stimulants.',
    studies: [
      {
        citation: 'Taylor et al., 2016, J Int Soc Sports Nutr',
        finding: 'Eight weeks of daily use showed no habituation or meaningful safety problems in healthy adults.',
        url: pubmed('Taylor 2016 safety TeaCrine non-habituating purine alkaloid eight weeks'),
      },
      {
        citation: 'Kuhman et al., 2015, Nutrients',
        finding: 'A theacrine-containing product raised self-rated energy and mood; objective test changes were small.',
        url: pubmed('Kuhman 2015 cognitive performance mood theacrine-containing dietary supplement'),
      },
    ],
  },
  {
    id: 'nicotine',
    name: 'Nicotine (gum or lozenge)',
    aliases: ['nicotine gum', 'nicotine lozenge', 'nicotine pouch', 'nrt'],
    kind: 'supplement',
    category: 'Nicotinic agonist',
    goals: ['focus', 'memory'],
    tagline: 'A real attention booster with a real addiction problem.',
    mechanism:
      'Activates nicotinic acetylcholine receptors, which boosts attention networks and releases dopamine and noradrenaline.',
    claims: ['Laser focus', 'Faster reactions', 'Appetite control'],
    research:
      'A meta-analysis found acute nicotine reliably improves attention, reaction time and some memory measures, partly in non-smokers too. A small six-month trial of nicotine patches in mild cognitive impairment showed attention gains. Benefits in habitual users partly reflect withdrawal relief.',
    evidence: 'moderate',
    safety:
      'Highly addictive, even without tobacco; dependence can develop quickly in non-users. Raises heart rate and blood pressure and can cause nausea, dizziness and mouth irritation. Avoid in pregnancy, teens, and with heart disease. Never combine with smoking or vaping as a "nootropic".',
    status:
      'Nicotine replacement products are regulated medicines (FDA-approved OTC in the US) for quitting smoking, not dietary supplements.',
    studies: [
      {
        citation: 'Heishman et al., 2010, Psychopharmacology',
        finding: 'Meta-analysis: nicotine improved fine motor skills, attention accuracy and response time, and some memory measures.',
        url: pubmed('Heishman 2010 meta-analysis acute effects nicotine smoking human performance'),
      },
      {
        citation: 'Newhouse et al., 2012, Neurology',
        finding: 'Six months of nicotine patches improved attention in non-smokers with mild cognitive impairment.',
        url: pubmed('Newhouse 2012 nicotine treatment mild cognitive impairment pilot'),
      },
    ],
    noAffiliate: true,
  },
  {
    id: 'mucuna-pruriens',
    name: 'Mucuna Pruriens',
    aliases: ['velvet bean', 'kapikachhu', 'l-dopa bean'],
    kind: 'supplement',
    category: 'Dopamine precursor',
    goals: ['mood', 'focus'],
    tagline: 'A bean naturally rich in L-dopa, the dopamine precursor.',
    mechanism:
      'Its seeds contain L-dopa, which the brain converts into dopamine, the neurotransmitter behind motivation and movement.',
    claims: ['Motivation and drive', 'Better mood', 'Higher libido and testosterone'],
    research:
      'Small trials in Parkinson’s disease show mucuna can work about as well as standard L-dopa drugs for motor symptoms. There are no good trials for mood or focus in healthy people.',
    evidence: 'limited',
    safety:
      'Can cause nausea, low blood pressure, insomnia and, with sustained use, involuntary movements. Dangerous with MAO inhibitors and may interact with antipsychotics, antidepressants and Parkinson’s drugs. Avoid with psychosis, melanoma history or in pregnancy.',
    studies: [
      {
        citation: 'Katzenschlager et al., 2004, J Neurol Neurosurg Psychiatry',
        finding: 'In Parkinson’s, mucuna seed powder worked faster and lasted slightly longer than standard L-dopa.',
        url: pubmed('Katzenschlager 2004 Mucuna pruriens Parkinson double blind clinical pharmacological'),
      },
      {
        citation: 'Cilia et al., 2017, Neurology',
        finding: 'In a low-income setting, mucuna gave motor benefit similar to L-dopa drugs, but tolerability limited use.',
        url: pubmed('Cilia 2017 Mucuna pruriens Parkinson disease low-income'),
      },
    ],
  },
  {
    id: 'saffron',
    name: 'Saffron',
    aliases: ['crocus sativus', 'affron', 'satiereal', 'crocin'],
    kind: 'supplement',
    category: 'Herbal extract',
    goals: ['mood', 'sleep'],
    tagline: 'The pricey spice with real mood trial data.',
    mechanism:
      'Compounds such as crocin and safranal appear to affect serotonin and other monoamines and reduce inflammation and oxidative stress.',
    claims: ['Brighter mood', 'Less anxiety', 'Better sleep', 'Fewer PMS symptoms'],
    research:
      'Meta-analyses of randomized trials find saffron reduces symptoms of mild-to-moderate depression versus placebo and roughly matches some antidepressants. Many trials came from one country and were small, so results need wider replication.',
    evidence: 'moderate',
    safety:
      'Usually well tolerated as an extract. Very large amounts are toxic. Avoid in pregnancy. Use caution with antidepressants, blood thinners and blood-pressure medication, and with bipolar disorder.',
    studies: [
      {
        citation: 'Hausenblas et al., 2013, J Integr Med',
        finding: 'Meta-analysis: saffron outperformed placebo and was comparable to antidepressants in major depression.',
        url: pubmed('Hausenblas 2013 saffron major depressive disorder meta-analysis'),
      },
      {
        citation: 'Tóth et al., 2019, Planta Med',
        finding: 'Meta-analysis: saffron had a large effect on mild-to-moderate depression symptoms versus placebo.',
        url: pubmed('Toth 2019 efficacy of saffron mild to moderate depression meta-analysis'),
      },
    ],
  },
  {
    id: 'kanna',
    name: 'Kanna',
    aliases: ['sceletium tortuosum', 'zembrin', 'channa', 'kougoed'],
    kind: 'supplement',
    category: 'Herbal extract',
    goals: ['mood', 'focus'],
    tagline: 'A South African succulent used for calm and connection.',
    mechanism:
      'Its alkaloids, chiefly mesembrine, block serotonin reuptake and inhibit the PDE4 enzyme, which may lower stress reactivity.',
    claims: ['Less anxiety', 'Social ease', 'Mood lift', 'Mental flexibility'],
    research:
      'Small, industry-supported trials of one extract showed better executive function and calmer amygdala responses to threat in healthy adults. Results are promising but rest on few participants.',
    evidence: 'limited',
    safety:
      'May cause headache, nausea or sleepiness. Because it affects serotonin, do not combine with SSRIs, MAOIs or other serotonergic drugs; serotonin syndrome is a theoretical risk. Avoid in pregnancy.',
    studies: [
      {
        citation: 'Chiu et al., 2014, Evid Based Complement Alternat Med',
        finding: 'Three weeks improved cognitive flexibility and executive function in healthy older adults.',
        url: pubmed('Chiu 2014 Sceletium tortuosum Zembrin cognition phosphodiesterase-4'),
      },
      {
        citation: 'Terburg et al., 2013, Neuropsychopharmacology',
        finding: 'A single serving reduced amygdala reactivity to fearful faces on brain scans.',
        url: pubmed('Terburg 2013 Sceletium tortuosum Zembrin amygdala hypothalamus'),
      },
    ],
  },
  {
    id: 'agmatine',
    name: 'Agmatine',
    aliases: ['agmatine sulfate', 'decarboxylated arginine'],
    kind: 'supplement',
    category: 'Neuromodulator',
    goals: ['mood'],
    tagline: 'An arginine byproduct that tweaks NMDA and imidazoline signals.',
    mechanism:
      'Made from arginine in the body; it blocks NMDA receptors, binds imidazoline and alpha-2 receptors and inhibits nitric oxide synthase.',
    claims: ['Mood lift', 'Nerve pain relief', 'Lower stimulant tolerance', 'Bigger gym pumps'],
    research:
      'Most evidence is from animals. A randomized trial found it reduced pain from lumbar disc compression, and a tiny pilot reported mood improvement in depression. Nothing solid on cognition in healthy people.',
    evidence: 'limited',
    safety:
      'Nausea and digestive upset are the main complaints. May lower blood pressure. Little long-term data; caution with blood-pressure drugs and psychiatric medication.',
    studies: [
      {
        citation: 'Keynan et al., 2010, Pain Med',
        finding: 'In people with lumbar disc-related sciatica, agmatine reduced pain more than placebo.',
        url: pubmed('Keynan 2010 agmatine lumbar disc associated radiculopathy'),
      },
      {
        citation: 'Shopsin, 2013, Acta Neuropsychiatr',
        finding: 'Very small pilot: depressive symptoms improved in a few patients.',
        url: pubmed('Shopsin clinical antidepressant effect exogenous agmatine parachlorophenylalanine'),
      },
    ],
  },
  {
    id: 'sam-e',
    name: 'SAM-e',
    aliases: ['s-adenosyl methionine', 'same', 'ademetionine'],
    kind: 'supplement',
    category: 'Methyl donor',
    goals: ['mood'],
    tagline: 'The body’s main methyl donor, sold for mood and joints.',
    mechanism:
      'Donates methyl groups needed to make and recycle serotonin, dopamine and norepinephrine, and supports cell-membrane chemistry.',
    claims: ['Mood support', 'Joint comfort', 'Liver support'],
    research:
      'Dozens of trials, mostly older and small, suggest benefit in depression, and a clinician review found it promising as an add-on. A Cochrane review judged the evidence low quality with no clear advantage over placebo on its own.',
    evidence: 'limited',
    safety:
      'Can cause nausea, digestive upset, insomnia and anxiety. Can trigger mania in bipolar disorder. Risk of serotonin syndrome with SSRIs, MAOIs, triptans or other serotonergic drugs.',
    studies: [
      {
        citation: 'Galizia et al., 2016, Cochrane Database Syst Rev',
        finding: 'Low-quality evidence; SAM-e alone was not clearly better than placebo or antidepressants.',
        url: pubmed('Galizia 2016 S-adenosyl methionine depression adults Cochrane'),
      },
      {
        citation: 'Sharma et al., 2017, J Clin Psychiatry',
        finding: 'Review: promising signals for depression, especially as an add-on, but needs larger trials.',
        url: pubmed('Sharma 2017 S-adenosylmethionine neuropsychiatric disorders clinician-oriented review'),
      },
    ],
  },
  {
    id: '5-htp',
    name: '5-HTP',
    aliases: ['5-hydroxytryptophan', 'oxitriptan', 'griffonia simplicifolia'],
    kind: 'supplement',
    category: 'Serotonin precursor',
    goals: ['mood', 'sleep'],
    tagline: 'The direct precursor to serotonin, with a serious interaction.',
    mechanism:
      'Crosses into the brain and is converted straight into serotonin, skipping the rate-limiting step from tryptophan.',
    claims: ['Better mood', 'Better sleep', 'Appetite control'],
    research:
      'A Cochrane review found only a couple of small trials of acceptable quality; they hinted at benefit in depression but were too weak to draw conclusions. Modern, larger trials are lacking.',
    evidence: 'limited',
    safety:
      'Can cause nausea, diarrhea and drowsiness. Combining it with SSRIs, SNRIs, MAOIs, tramadol, triptans or other serotonergic drugs can cause serotonin syndrome, which can be life-threatening. Avoid in pregnancy.',
    studies: [
      {
        citation: 'Shaw et al., 2002, Cochrane Database Syst Rev',
        finding: 'Too few quality trials to recommend 5-HTP or tryptophan for depression, though small trials leaned positive.',
        url: pubmed('Shaw 2002 tryptophan 5-hydroxytryptophan for depression Cochrane'),
      },
    ],
  },
  {
    id: 'lithium-orotate',
    name: 'Lithium Orotate',
    aliases: ['low-dose lithium', 'microdose lithium', 'trace lithium'],
    kind: 'supplement',
    category: 'Trace mineral',
    goals: ['mood', 'longevity'],
    tagline: 'Trace lithium sold for mood; real science, big unknowns.',
    mechanism:
      'Lithium inhibits the enzyme GSK-3 and affects several signaling pathways tied to mood stability and neuron survival.',
    claims: ['Mood stability', 'Less irritability', 'Brain protection with age'],
    research:
      'Population studies link more lithium in drinking water to lower suicide and dementia rates, and a trial of low-dose prescription lithium slowed decline in mild cognitive impairment. A 2025 mouse study renewed interest in the orotate form, but lithium orotate itself has almost no human trial data.',
    evidence: 'limited',
    safety:
      'Lithium has a narrow safety margin. Can affect kidney and thyroid function. Dangerous with NSAIDs, diuretics, ACE inhibitors and dehydration, which raise lithium levels. Never use alongside prescribed lithium or without medical advice if you have kidney, thyroid or heart disease, are pregnant, or have bipolar disorder.',
    status:
      'Sold as a dietary supplement in the US. Therapeutic lithium (carbonate or citrate) is a prescription drug worldwide.',
    studies: [
      {
        citation: 'Forlenza et al., 2011, Br J Psychiatry',
        finding: 'Low-dose prescription lithium for a year stabilized cognition in amnestic mild cognitive impairment.',
        url: pubmed('Forlenza 2011 lithium amnestic mild cognitive impairment randomised'),
      },
      {
        citation: 'Aron et al., 2025, Nature',
        finding: 'Mouse study: brain lithium loss drove Alzheimer’s-like changes, and lithium orotate reversed them.',
        url: pubmed('Aron 2025 lithium deficiency onset Alzheimer disease'),
      },
    ],
    noAffiliate: true,
  },
  {
    id: 'glycine',
    name: 'Glycine',
    aliases: ['aminoacetic acid'],
    kind: 'supplement',
    category: 'Amino acid',
    goals: ['sleep'],
    tagline: 'A simple amino acid that may help you sleep deeper.',
    mechanism:
      'Acts as an inhibitory neurotransmitter and an NMDA co-agonist; it may lower core body temperature, which helps trigger sleep.',
    claims: ['Faster sleep onset', 'Deeper sleep', 'Less next-day fatigue'],
    research:
      'Small Japanese trials, some industry-funded, found better subjective sleep quality and less daytime sleepiness, plus quicker deep sleep on sleep recordings. The studies are small and short.',
    evidence: 'limited',
    safety:
      'Generally well tolerated; mild stomach upset is possible. People taking clozapine should avoid it.',
    studies: [
      {
        citation: 'Yamadera et al., 2007, Sleep Biol Rhythms',
        finding: 'Improved subjective sleep and shortened time to deep sleep in people with poor sleep.',
        url: pubmed('Yamadera 2007 glycine subjective sleep quality polysomnographic'),
      },
      {
        citation: 'Bannai et al., 2012, Front Neurol',
        finding: 'Under partial sleep restriction, glycine reduced daytime sleepiness and fatigue.',
        url: pubmed('Bannai 2012 glycine subjective daytime performance partially sleep-restricted'),
      },
    ],
  },
  {
    id: 'apigenin-chamomile',
    name: 'Apigenin / Chamomile',
    aliases: ['chamomile', 'matricaria chamomilla', 'apigenin'],
    kind: 'supplement',
    category: 'Flavonoid',
    goals: ['sleep', 'mood'],
    tagline: 'The bedtime-tea flavonoid behind a popular sleep stack.',
    mechanism:
      'Apigenin, chamomile’s main flavonoid, binds benzodiazepine sites on GABA-A receptors in lab studies, which may produce mild calming effects.',
    claims: ['Easier sleep', 'Less anxiety', 'Calmer evenings'],
    research:
      'Chamomile extract reduced generalized anxiety symptoms in randomized trials. For insomnia, a pilot trial found no significant improvement in sleep diaries. Isolated apigenin has almost no human sleep data.',
    evidence: 'limited',
    safety:
      'Usually well tolerated. Allergic reactions possible in people allergic to ragweed or daisy-family plants. May add to sedatives and could interact with blood thinners.',
    studies: [
      {
        citation: 'Mao et al., 2016, Phytomedicine',
        finding: 'Long-term chamomile reduced moderate-to-severe anxiety symptoms; relapse reduction was not significant.',
        url: pubmed('Mao 2016 long-term chamomile generalized anxiety disorder randomized'),
      },
      {
        citation: 'Zick et al., 2011, BMC Complement Altern Med',
        finding: 'In chronic insomnia, chamomile did not significantly improve sleep diary measures versus placebo.',
        url: pubmed('Zick 2011 chamomile chronic primary insomnia pilot'),
      },
    ],
  },
];
