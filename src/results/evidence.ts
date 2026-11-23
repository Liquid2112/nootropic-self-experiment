/**
 * Evidence-card model.
 *
 * Turns a supplement row into the educational evidence card: a short summary of
 * what studies say, the reference links, and a weak-evidence note. It is
 * educational only and carries NO dose and NO recommendation, matching the
 * compliance rules enforced on every results surface.
 *
 * "Other" (a free-text supplement the user typed, not in the seed list) has no
 * row in the supplement DAO, so buildEvidenceCard returns null and the screen
 * shows no evidence card for it.
 */

import type { Supplement } from '@/db/types';
import { COMPLIANCE_DISCLAIMER } from './compliance';

export type EvidenceCard = {
  supplementName: string;
  /** One plain line on what studies say. */
  summary: string;
  /** Reference links (educational starting points). */
  links: string[];
  /** Honest note when the evidence base is thin. */
  weakEvidenceNote: string | null;
  disclaimer: string;
};

/**
 * Phrases in a supplement's own summary that already flag limited evidence.
 * When present we surface an explicit weak-evidence note so the card never
 * overstates the science.
 */
const WEAK_EVIDENCE_MARKERS = ['mixed', 'modest', 'weak', 'small', 'limited', 'early', 'still'];

const WEAK_EVIDENCE_NOTE =
  'Evidence here is limited or mixed; studies are small or results vary. Treat this as a starting point, not a settled finding.';

/** True when the supplement is a real seeded entry (not a user-typed "Other"). */
export function hasEvidenceCard(supplement: Supplement | undefined): supplement is Supplement {
  if (!supplement) return false;
  if (supplement.id === 'other' || supplement.name.trim().toLowerCase() === 'other') return false;
  return supplement.evidenceSummary.trim().length > 0;
}

/**
 * Build the evidence card for a supplement, or null when there is none ("Other"
 * or a missing row). The weak-evidence note is attached when the summary itself
 * signals limited or mixed evidence.
 */
export function buildEvidenceCard(supplement: Supplement | undefined): EvidenceCard | null {
  if (!hasEvidenceCard(supplement)) return null;
  const summaryLower = supplement.evidenceSummary.toLowerCase();
  const weak = WEAK_EVIDENCE_MARKERS.some((m) => summaryLower.includes(m));
  return {
    supplementName: supplement.name,
    summary: supplement.evidenceSummary,
    links: supplement.evidenceLinks,
    weakEvidenceNote: weak ? WEAK_EVIDENCE_NOTE : null,
    disclaimer: COMPLIANCE_DISCLAIMER,
  };
}
