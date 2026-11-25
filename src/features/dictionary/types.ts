/**
 * Nootropic dictionary types.
 *
 * The dictionary is static, educational reference content shipped with the
 * app. It is separate from the experiment supplement list (`src/db/seed.ts`):
 * every OTC entry can link to its seeded supplement so the user can test it,
 * while `unregulated` entries are reference-only and never appear in the
 * experiment picker.
 *
 * Content rules (enforced by tests): no dosing, no sourcing or vendor info,
 * every entry cites at least one study or authoritative reference.
 */

/** What a user is trying to improve; drives the dictionary filter chips. */
export type DictionaryGoal = 'focus' | 'memory' | 'mood' | 'energy' | 'sleep' | 'longevity';

/**
 * How strong the human evidence is, in plain terms.
 * - strong: consistent results across multiple good human trials or meta-analyses
 * - moderate: several human RCTs, mostly positive but with caveats
 * - limited: few or small human trials, or mixed results
 * - preclinical: mostly animal / cell data or very early human safety studies
 */
export type EvidenceGrade = 'strong' | 'moderate' | 'limited' | 'preclinical';

/**
 * supplement: widely sold over the counter as a dietary supplement.
 * unregulated: not approved as a supplement or drug where most users live
 * (racetams, research compounds, foreign prescription drugs). Shown with a
 * prominent warning and never offered in the experiment picker.
 */
export type DictionaryKind = 'supplement' | 'unregulated';

export type StudyRef = {
  /** Short citation: first author, year, journal or source. */
  citation: string;
  /** One line on what it found, in our own words. */
  finding: string;
  /** Link to the paper, a PubMed search for it, or an authoritative fact sheet. */
  url: string;
};

export type DictionaryEntry = {
  id: string;
  name: string;
  /** Other names people search for. */
  aliases: string[];
  kind: DictionaryKind;
  /** Short class label, e.g. "Amino acid", "Adaptogen", "Racetam". */
  category: string;
  goals: DictionaryGoal[];
  /** One-line hook shown in the list. */
  tagline: string;
  /** How it is thought to work. */
  mechanism: string;
  /** What people claim it does (claims, not findings). */
  claims: string[];
  /** What the research actually shows, honestly. */
  research: string;
  evidence: EvidenceGrade;
  /** Known side effects, interactions and cautions. No dosing. */
  safety: string;
  /** Regulatory status, mainly for unregulated entries. */
  status?: string;
  studies: StudyRef[];
  /** Seeded supplement id, when the user can run an experiment on it. */
  supplementId?: string;
};
