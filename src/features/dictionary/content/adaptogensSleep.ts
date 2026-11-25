import { pubmed } from '../sources';
import type { DictionaryEntry } from '../types';

/**
 * Adaptogens, functional mushrooms and sleep / calm botanicals.
 * Original summaries; no dosing, no sourcing.
 */
export const ADAPTOGEN_SLEEP_ENTRIES: DictionaryEntry[] = [
  {
    id: 'schisandra',
    name: 'Schisandra',
    aliases: ['schisandra chinensis', 'five-flavor berry', 'wu wei zi'],
    kind: 'supplement',
    category: 'Adaptogen',
    goals: ['focus', 'energy'],
    tagline: 'The sour "five-flavor" berry of Soviet adaptogen research.',
    mechanism:
      'Its lignans (schisandrins) are thought to temper the stress-hormone response and support liver detox enzymes, which may help endurance under fatigue.',
    claims: ['Mental stamina under stress', 'Less fatigue', 'Liver support', 'Sharper attention'],
    research:
      'Much of the human data comes from older Russian studies that are hard to judge by modern standards. A small modern trial of a combination product (with rhodiola and eleuthero) found modest single-dose gains in attention, so schisandra’s own effect is hard to isolate.',
    evidence: 'limited',
    safety:
      'Usually well tolerated; heartburn, stomach upset and skin rash are reported. It can change how the liver clears some drugs (e.g. tacrolimus and other CYP3A substrates). Avoid in pregnancy, as it may stimulate the uterus.',
    studies: [
      {
        citation: 'Panossian & Wikman, 2008, J Ethnopharmacol',
        finding: 'Review of mostly Russian research describing stimulant and anti-fatigue uses, with many studies of uneven quality.',
        url: pubmed('Panossian Wikman 2008 pharmacology of Schisandra chinensis overview Russian research'),
      },
      {
        citation: 'Aslanyan et al., 2010, Phytomedicine',
        finding: 'One dose of a schisandra-rhodiola-eleuthero blend improved attention and speed on a stressful task in a small trial.',
        url: pubmed('Aslanyan 2010 single dose effects ADAPT-232 cognitive functions'),
      },
    ],
  },
  {
    id: 'eleuthero',
    name: 'Eleuthero',
    aliases: ['siberian ginseng', 'eleutherococcus senticosus', 'eleuthero root'],
    kind: 'supplement',
    category: 'Adaptogen',
    goals: ['energy', 'mood'],
    tagline: 'Not true ginseng, but the Soviet go-to for stamina.',
    mechanism:
      'Its eleutherosides are proposed to buffer the body’s stress-hormone axis; it is botanically distinct from Panax ginseng and lacks ginsenosides.',
    claims: ['More stamina and endurance', 'Resilience to stress', 'Less fatigue', 'Immune support'],
    research:
      'Human trials are few, small and mixed: some report better self-rated wellbeing or social functioning early on that fades with continued use, while exercise-performance trials are largely negative. A lot of the older evidence is from Soviet-era studies that are hard to verify.',
    evidence: 'limited',
    safety:
      'Generally well tolerated; insomnia, headache and raised blood pressure are occasionally reported. May interact with digoxin lab tests, blood thinners and diabetes medication. Avoid in pregnancy for lack of safety data.',
    studies: [
      {
        citation: 'Cicero et al., 2004, Arch Gerontol Geriatr Suppl',
        finding: 'In older adults, some quality-of-life scores improved at four weeks but the difference faded by eight weeks.',
        url: pubmed('Cicero 2004 Eleutherococcus senticosus quality of life elderly'),
      },
      {
        citation: 'Aslanyan et al., 2010, Phytomedicine',
        finding: 'A blend containing eleuthero gave small acute attention gains under stress; eleuthero alone was not tested.',
        url: pubmed('Aslanyan 2010 single dose effects ADAPT-232 cognitive functions'),
      },
    ],
  },
  {
    id: 'gotu-kola',
    name: 'Gotu Kola',
    aliases: ['centella asiatica', 'centella', 'brahmi (in some regions)'],
    kind: 'supplement',
    category: 'Herb',
    goals: ['memory', 'mood'],
    tagline: 'An Ayurvedic "brain herb" with more hype than human data.',
    mechanism:
      'Triterpenes such as asiaticoside and madecassoside show antioxidant, anti-inflammatory and nerve-growth effects in animal and cell studies.',
    claims: ['Better memory', 'Calmer mood', 'Healthy circulation', 'Skin and wound healing'],
    research:
      'A meta-analysis of a handful of small trials found no clear benefit for cognition overall, with hints of improved alertness and lower anger. Individual trials, such as one in healthy older adults, reported some memory and mood gains but were small.',
    evidence: 'limited',
    safety:
      'Generally well tolerated in trials; stomach upset, drowsiness and rare reports of liver injury exist. May add to sedatives. Avoid in pregnancy and with liver disease.',
    studies: [
      {
        citation: 'Puttarak et al., 2017, Sci Rep',
        finding: 'Meta-analysis of small RCTs: no significant overall cognitive benefit, though alertness may improve.',
        url: pubmed('Puttarak 2017 Centella asiatica cognitive function mood systematic review meta-analysis'),
      },
      {
        citation: 'Wattanathorn et al., 2008, J Ethnopharmacol',
        finding: 'In healthy older adults, two months of extract improved some working-memory and mood measures versus placebo.',
        url: pubmed('Wattanathorn 2008 Centella asiatica cognitive function healthy elderly'),
      },
    ],
  },
  {
    id: 'cordyceps',
    name: 'Cordyceps',
    aliases: ['cordyceps militaris', 'cordyceps sinensis', 'cs-4', 'caterpillar fungus'],
    kind: 'supplement',
    category: 'Functional mushroom',
    goals: ['energy'],
    tagline: 'The caterpillar fungus sold as an oxygen and stamina boost.',
    mechanism:
      'Compounds like cordycepin and adenosine analogues may influence cellular energy (ATP) metabolism and oxygen use, mostly shown in animals.',
    claims: ['Better endurance and VO2 max', 'More energy', 'Libido support', 'Immune support'],
    research:
      'A small trial in older adults found modest gains in exercise thresholds, and a short trial of a mushroom blend saw some benefit only after several weeks. Trials in trained athletes have been mostly negative, and many studies are small or industry-funded.',
    evidence: 'limited',
    safety:
      'Generally well tolerated; mild digestive upset is most common. May add to blood thinners, diabetes drugs and immunosuppressants. Avoid with autoimmune conditions or before surgery unless cleared by a doctor.',
    studies: [
      {
        citation: 'Chen et al., 2010, J Altern Complement Med',
        finding: 'In healthy older adults, a Cs-4 extract modestly improved metabolic and ventilatory thresholds versus placebo.',
        url: pubmed('Chen 2010 Cs-4 Cordyceps sinensis exercise performance healthy older subjects'),
      },
      {
        citation: 'Hirsch et al., 2017, J Diet Suppl',
        finding: 'A cordyceps-rich mushroom blend showed little acute effect but some VO2 max and time-to-exhaustion gains after three weeks.',
        url: pubmed('Hirsch 2017 Cordyceps militaris mushroom blend high-intensity exercise'),
      },
    ],
  },
  {
    id: 'reishi',
    name: 'Reishi',
    aliases: ['ganoderma lucidum', 'lingzhi', 'mushroom of immortality'],
    kind: 'supplement',
    category: 'Functional mushroom',
    goals: ['sleep', 'longevity', 'mood'],
    tagline: 'The "mushroom of immortality", big on tradition and small on proof.',
    mechanism:
      'Beta-glucan polysaccharides and triterpenes appear to modulate immune activity and may have mild sedative effects in animals.',
    claims: ['Deeper sleep', 'Immune support', 'Longevity', 'Calm and stress relief'],
    research:
      'Cochrane reviews found no solid evidence it treats cancer or improves cardiovascular risk factors, though some trials hinted at better immune markers alongside chemotherapy. Evidence for sleep and fatigue in humans is thin and mostly from low-quality studies.',
    evidence: 'limited',
    safety:
      'Dry mouth, itching and stomach upset are reported; powdered extracts have been linked to rare liver injury. May add to blood thinners, blood-pressure and diabetes drugs. Avoid before surgery and with bleeding disorders.',
    studies: [
      {
        citation: 'Jin et al., 2016, Cochrane Database Syst Rev',
        finding: 'No good evidence it works as a first-line cancer treatment; some low-quality hints as an add-on to chemo.',
        url: pubmed('Jin 2016 Ganoderma lucidum Reishi mushroom cancer treatment Cochrane'),
      },
      {
        citation: 'Klupp et al., 2015, Cochrane Database Syst Rev',
        finding: 'Did not improve blood sugar, blood pressure or cholesterol versus placebo in the available trials.',
        url: pubmed('Klupp 2015 Ganoderma lucidum cardiovascular risk factors Cochrane'),
      },
    ],
  },
  {
    id: 'maca',
    name: 'Maca',
    aliases: ['lepidium meyenii', 'peruvian ginseng', 'maca root'],
    kind: 'supplement',
    category: 'Root vegetable',
    goals: ['energy', 'mood'],
    tagline: 'An Andean root famous for libido, not for hormones.',
    mechanism:
      'Its exact action is unknown; macamides and glucosinolates are candidates. Studies find it does not change testosterone or estrogen levels.',
    claims: ['Higher libido', 'More energy', 'Better mood', 'Hormone balance'],
    research:
      'A few small RCTs report improved sexual desire or function in men and women, and a review called the evidence suggestive but limited by small, few trials. A trial in healthy men found more desire without any change in testosterone.',
    evidence: 'limited',
    safety:
      'Generally well tolerated as a food. Evidence on long-term high intake is thin; people with hormone-sensitive conditions or thyroid issues should check with a doctor.',
    studies: [
      {
        citation: 'Shin et al., 2010, BMC Complement Altern Med',
        finding: 'Systematic review: limited evidence of benefit for sexual function from a small number of small trials.',
        url: pubmed('Shin 2010 maca Lepidium meyenii sexual function systematic review'),
      },
      {
        citation: 'Gonzales et al., 2002, Andrologia',
        finding: 'Healthy men reported more sexual desire after several weeks, with no change in testosterone or estradiol.',
        url: pubmed('Gonzales 2002 Lepidium meyenii sexual desire serum testosterone'),
      },
    ],
  },
  {
    id: 'shilajit',
    name: 'Shilajit',
    aliases: ['mumijo', 'mumie', 'mineral pitch'],
    kind: 'supplement',
    category: 'Mineral resin',
    goals: ['energy', 'longevity'],
    tagline: 'Himalayan rock resin rich in fulvic acid and marketing.',
    mechanism:
      'A tar-like resin containing fulvic and humic acids and minerals; it is proposed to support mitochondrial energy production, mostly from lab work.',
    claims: ['Higher testosterone', 'More energy and vitality', 'Better recovery', 'Anti-aging'],
    research:
      'A small, sponsor-linked trial reported higher total testosterone in middle-aged men, and another found better strength retention after a fatiguing task. Both used the same branded extract; independent replication is lacking.',
    evidence: 'limited',
    safety:
      'Raw or poorly purified shilajit can contain heavy metals, mycotoxins and microbes, so purity matters a lot. Avoid with gout or high uric acid, hemochromatosis, and in pregnancy.',
    studies: [
      {
        citation: 'Pandit et al., 2016, Andrologia',
        finding: 'Purified shilajit raised total and free testosterone versus placebo in healthy men aged 45-55.',
        url: pubmed('Pandit 2016 purified Shilajit testosterone healthy volunteers'),
      },
      {
        citation: 'Keller et al., 2019, J Int Soc Sports Nutr',
        finding: 'Recreationally active men kept more strength after a fatiguing exercise protocol than with placebo.',
        url: pubmed('Keller 2019 Shilajit muscle fatigue strength collagen'),
      },
    ],
  },
  {
    id: 'tongkat-ali',
    name: 'Tongkat Ali',
    aliases: ['eurycoma longifolia', 'longjack', 'pasak bumi'],
    kind: 'supplement',
    category: 'Herb',
    goals: ['energy', 'mood'],
    tagline: 'The Malaysian root behind the "natural testosterone" craze.',
    mechanism:
      'Quassinoids such as eurycomanone may raise testosterone by lowering its binding to SHBG and by stimulating production in the testes.',
    claims: ['Higher testosterone', 'Better libido', 'Lower stress hormones', 'More drive and energy'],
    research:
      'A meta-analysis of small trials found a modest rise in total testosterone, mainly in men with low levels to start. One trial in stressed adults reported lower cortisol and better mood scores; many trials use one patented extract and have industry ties.',
    evidence: 'limited',
    safety:
      'Usually well tolerated short term; insomnia, restlessness and irritability are reported. Some products have tested positive for lead or mercury. Avoid with hormone-sensitive cancers and in pregnancy.',
    studies: [
      {
        citation: 'Leisegang et al., 2022, Medicina',
        finding: 'Meta-analysis: raised total testosterone in men, especially those with hypogonadism.',
        url: pubmed('Leisegang 2022 Eurycoma longifolia testosterone systematic review meta-analysis'),
      },
      {
        citation: 'Talbott et al., 2013, J Int Soc Sports Nutr',
        finding: 'Moderately stressed adults showed lower cortisol and better mood scores after four weeks versus placebo.',
        url: pubmed('Talbott 2013 Tongkat Ali stress hormones psychological mood state'),
      },
    ],
  },
  {
    id: 'holy-basil',
    name: 'Holy Basil',
    aliases: ['tulsi', 'ocimum sanctum', 'ocimum tenuiflorum'],
    kind: 'supplement',
    category: 'Adaptogen',
    goals: ['mood', 'sleep'],
    tagline: 'India’s sacred basil, sold as an everyday stress buffer.',
    mechanism:
      'Compounds such as eugenol, ursolic acid and rosmarinic acid may dampen the stress-hormone response and inflammation, mostly per animal work.',
    claims: ['Less stress and anxiety', 'Better sleep', 'Steadier blood sugar', 'Immune support'],
    research:
      'A systematic review found favorable results across varied small trials but rated their quality as generally low. A later RCT in stressed adults reported lower stress scores and better sleep than placebo.',
    evidence: 'limited',
    safety:
      'Generally well tolerated; nausea is occasionally reported. May lower blood sugar and slow clotting. Animal data hint at effects on fertility, so avoid when pregnant or trying to conceive.',
    studies: [
      {
        citation: 'Jamshidi & Cohen, 2017, Evid Based Complement Alternat Med',
        finding: 'Review of human trials: generally positive for stress and metabolic outcomes, but trials were small and varied.',
        url: pubmed('Jamshidi Cohen 2017 clinical efficacy safety Tulsi humans systematic review'),
      },
      {
        citation: 'Lopresti et al., 2022, Front Nutr',
        finding: 'Eight weeks of extract lowered perceived stress and improved sleep versus placebo in stressed adults.',
        url: pubmed('Lopresti 2022 Holy Basil Ocimum tenuiflorum stress sleep randomized'),
      },
    ],
  },
  {
    id: 'kava',
    name: 'Kava',
    aliases: ['kava kava', 'piper methysticum', 'kavalactones'],
    kind: 'supplement',
    category: 'Anxiolytic herb',
    goals: ['mood', 'sleep'],
    tagline: 'A Pacific ceremonial drink that calms, with a liver warning.',
    mechanism:
      'Kavalactones enhance GABA-A receptor signaling and affect sodium and calcium channels, producing relaxation without the drug class of benzodiazepines.',
    claims: ['Fast anxiety relief', 'Social ease', 'Better sleep', 'Muscle relaxation'],
    research:
      'An older Cochrane review of short trials found kava extract reduced anxiety more than placebo. A larger, later 16-week trial in generalized anxiety disorder found no meaningful benefit over placebo, so the picture is now mixed.',
    evidence: 'limited',
    safety:
      'Linked to rare but serious liver injury, including cases needing transplant; avoid with liver disease, heavy drinking or other liver-stressing drugs. Causes drowsiness, so do not drive impaired and do not mix with alcohol or sedatives. Heavy long-term use can cause scaly skin. Avoid in pregnancy and breastfeeding.',
    status:
      'FDA issued a consumer advisory on liver injury in 2002. Germany banned kava products in 2002 (overturned by court in 2014); the UK and several other countries still restrict its sale.',
    studies: [
      {
        citation: 'Pittler & Ernst, 2003, Cochrane Database Syst Rev',
        finding: 'Pooled short-term trials: kava extract reduced anxiety scores more than placebo.',
        url: pubmed('Pittler Ernst 2003 kava extract treating anxiety Cochrane'),
      },
      {
        citation: 'Sarris et al., 2020, Aust N Z J Psychiatry',
        finding: 'In a 16-week trial in generalized anxiety disorder, kava was no better than placebo.',
        url: pubmed('Sarris 2020 kava generalised anxiety disorder 16-week double-blind'),
      },
      {
        citation: 'NCCIH: Kava',
        finding: 'Federal overview noting kava use has been linked to severe liver damage.',
        url: 'https://www.nccih.nih.gov/health/kava',
      },
    ],
    noAffiliate: true,
  },
  {
    id: 'lemon-balm',
    name: 'Lemon Balm',
    aliases: ['melissa officinalis', 'melissa', 'balm mint'],
    kind: 'supplement',
    category: 'Calming herb',
    goals: ['mood', 'sleep', 'focus'],
    tagline: 'A gentle mint-family herb for calm and lighter stress.',
    mechanism:
      'Rosmarinic acid and related compounds appear to slow the breakdown of GABA and may act on acetylcholine receptors.',
    claims: ['Calm without sedation', 'Better sleep', 'Better mood', 'Easier focus under stress'],
    research:
      'Small single-dose crossover trials found improved calmness and mood, and in one case better maths speed under a lab stressor. Trials are small and short, often from the same research group.',
    evidence: 'limited',
    safety:
      'Well tolerated; may cause mild drowsiness or stomach upset. May add to sedatives and may affect thyroid medication. Limited data in pregnancy.',
    studies: [
      {
        citation: 'Kennedy et al., 2004, Psychosom Med',
        finding: 'A single dose reduced the negative mood effects of a laboratory stressor and raised self-rated calmness.',
        url: pubmed('Kennedy 2004 attenuation laboratory-induced stress Melissa officinalis'),
      },
    ],
  },
  {
    id: 'passionflower',
    name: 'Passionflower',
    aliases: ['passiflora incarnata', 'maypop', 'passion vine'],
    kind: 'supplement',
    category: 'Calming herb',
    goals: ['sleep', 'mood'],
    tagline: 'A climbing vine traditionally steeped for anxious nights.',
    mechanism:
      'Flavonoids such as chrysin and vitexin are thought to act on GABA receptors, giving a mild sedative effect in animal studies.',
    claims: ['Less anxiety', 'Falling asleep easier', 'Quieter mind at night'],
    research:
      'A Cochrane review found too few, too small trials to draw firm conclusions on anxiety. A small trial of passionflower tea found slightly better self-rated sleep quality but no change on sleep diaries.',
    evidence: 'limited',
    safety:
      'May cause drowsiness, dizziness or confusion; avoid driving if affected and avoid mixing with alcohol or sedatives. Avoid in pregnancy, as it may stimulate the uterus.',
    studies: [
      {
        citation: 'Miyasaka et al., 2007, Cochrane Database Syst Rev',
        finding: 'Not enough good trials to judge its effect on anxiety.',
        url: pubmed('Miyasaka 2007 Passiflora anxiety disorder Cochrane'),
      },
      {
        citation: 'Ngan & Conduit, 2011, Phytother Res',
        finding: 'A week of passionflower tea modestly improved self-rated sleep quality in healthy adults.',
        url: pubmed('Ngan Conduit 2011 Passiflora incarnata herbal tea subjective sleep quality'),
      },
    ],
  },
  {
    id: 'valerian-root',
    name: 'Valerian Root',
    aliases: ['valerian', 'valeriana officinalis'],
    kind: 'supplement',
    category: 'Sleep herb',
    goals: ['sleep'],
    tagline: 'The classic herbal sleep aid with a famously bad smell.',
    mechanism:
      'Valerenic acid and related compounds seem to act on GABA-A receptors and may also affect adenosine signaling.',
    claims: ['Falling asleep faster', 'Deeper sleep', 'Less anxiety'],
    research:
      'Meta-analyses report a possible improvement in subjective sleep quality but no clear change in objective sleep measures, with signs of publication bias. Trials vary widely in extract type and quality.',
    evidence: 'limited',
    safety:
      'Generally well tolerated; headache, stomach upset and morning grogginess are reported, and rare liver injury has been described. May add to alcohol and sedatives. Avoid in pregnancy and in children without medical advice.',
    studies: [
      {
        citation: 'Bent et al., 2006, Am J Med',
        finding: 'Meta-analysis: may improve sleep quality, but results were inconsistent and possibly biased.',
        url: pubmed('Bent 2006 valerian for sleep systematic review meta-analysis'),
      },
      {
        citation: 'Fernandez-San-Martin et al., 2010, Sleep Med',
        finding: 'Subjective sleep improvement was possible but not supported by quantitative sleep measures.',
        url: pubmed('Fernandez-San-Martin 2010 effectiveness valerian insomnia meta-analysis'),
      },
    ],
  },
  {
    id: 'melatonin',
    name: 'Melatonin',
    aliases: ['n-acetyl-5-methoxytryptamine', 'sleep hormone'],
    kind: 'supplement',
    category: 'Hormone',
    goals: ['sleep'],
    tagline: 'Your body’s darkness signal, best for shifting sleep timing.',
    mechanism:
      'A pineal hormone that signals night to the body’s clock via MT1 and MT2 receptors; it nudges sleep timing more than it knocks you out.',
    claims: ['Falling asleep faster', 'Beating jet lag', 'Fixing a late sleep schedule', 'Better sleep quality'],
    research:
      'A meta-analysis of RCTs found it shortens time to fall asleep and slightly increases total sleep, with small average effects. It works best for circadian problems like jet lag and delayed sleep phase rather than general insomnia.',
    evidence: 'moderate',
    safety:
      'Morning grogginess, headache, dizziness and vivid dreams are common. May interact with blood thinners, sedatives, blood-pressure and diabetes drugs. Product content can differ sharply from the label. Use in children, pregnancy or with autoimmune or seizure disorders only with medical advice.',
    status:
      'Sold as a dietary supplement in the US; prescription-only in the UK and many EU countries.',
    studies: [
      {
        citation: 'Ferracioli-Oda et al., 2013, PLoS One',
        finding: 'Meta-analysis: reduced time to fall asleep and modestly increased total sleep in primary sleep disorders.',
        url: pubmed('Ferracioli-Oda 2013 melatonin treatment primary sleep disorders meta-analysis'),
      },
      {
        citation: 'Erland & Saxena, 2017, J Clin Sleep Med',
        finding: 'Melatonin content of retail products often differed widely from the label, and some contained serotonin.',
        url: pubmed('Erland Saxena 2017 melatonin natural health products content'),
      },
    ],
  },
  {
    id: 'gaba',
    name: 'GABA',
    aliases: ['gamma-aminobutyric acid', 'pharmagaba'],
    kind: 'supplement',
    category: 'Neurotransmitter',
    goals: ['sleep', 'mood'],
    tagline: 'The brain’s main brake, though it may not reach the brain.',
    mechanism:
      'GABA is the main calming neurotransmitter, but whether swallowed GABA crosses the blood-brain barrier is debated; any effect may come via the gut-brain axis or peripheral nerves.',
    claims: ['Less stress and anxiety', 'Falling asleep faster', 'Relaxation'],
    research:
      'A systematic review found limited evidence for stress relief and very limited evidence for sleep, from small and often industry-funded trials. Reviews note that brain uptake in humans is unproven.',
    evidence: 'limited',
    safety:
      'Generally well tolerated; tingling, flushing and drowsiness are occasionally reported. May add to blood-pressure drugs and sedatives. Limited data in pregnancy.',
    studies: [
      {
        citation: 'Boonstra et al., 2015, Front Psychol',
        finding: 'Review: evidence that oral GABA crosses the blood-brain barrier is conflicting, and human effects are uncertain.',
        url: pubmed('Boonstra 2015 neurotransmitters as food supplements GABA brain behavior'),
      },
      {
        citation: 'Hepsomali et al., 2020, Front Neurosci',
        finding: 'Systematic review: limited support for stress reduction and very limited support for sleep.',
        url: pubmed('Hepsomali 2020 oral gamma-aminobutyric acid stress sleep systematic review'),
      },
    ],
  },
  {
    id: 'magnolia-bark',
    name: 'Magnolia Bark',
    aliases: ['magnolia officinalis', 'honokiol', 'magnolol', 'relora'],
    kind: 'supplement',
    category: 'Calming herb',
    goals: ['sleep', 'mood'],
    tagline: 'Honokiol-rich bark pitched for stress and sleep.',
    mechanism:
      'Honokiol and magnolol act as positive modulators of GABA-A receptors in lab studies, which may explain calming and sleep effects.',
    claims: ['Less stress', 'Lower cortisol', 'Better sleep', 'Less stress eating'],
    research:
      'Small trials of a branded magnolia-phellodendron blend reported lower self-rated anxiety and, in one, lower cortisol. Evidence for magnolia alone in people is thin, and the trials were small and industry-linked.',
    evidence: 'limited',
    safety:
      'May cause drowsiness; avoid mixing with alcohol or sedatives. May slow clotting, so take care around surgery and with blood thinners. Avoid in pregnancy.',
    studies: [
      {
        citation: 'Kalman et al., 2008, Nutr J',
        finding: 'Pilot trial in women: a magnolia-phellodendron extract reduced transient anxiety versus placebo.',
        url: pubmed('Kalman 2008 Magnolia Phellodendron extract stress healthy women pilot'),
      },
      {
        citation: 'Talbott et al., 2013, J Int Soc Sports Nutr',
        finding: 'The same blend lowered salivary cortisol and improved mood scores in moderately stressed adults.',
        url: pubmed('Talbott 2013 Magnolia officinalis Phellodendron amurense cortisol mood state'),
      },
    ],
  },
];
