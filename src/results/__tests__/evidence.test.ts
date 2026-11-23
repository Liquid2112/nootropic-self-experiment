import type { Supplement } from '@/db/types';
import { buildEvidenceCard, hasEvidenceCard } from '../evidence';
import { COMPLIANCE_DISCLAIMER } from '../compliance';

function supp(overrides: Partial<Supplement> = {}): Supplement {
  return {
    id: 'bacopa-monnieri',
    name: 'Bacopa Monnieri',
    type: 'cumulative',
    evidenceSummary: 'Ayurvedic herb; memory benefits typically emerge after several weeks of daily use.',
    evidenceLinks: ['https://pubmed.ncbi.nlm.nih.gov/?term=bacopa+memory'],
    excluded: false,
    ...overrides,
  };
}

describe('evidence card', () => {
  it('builds a card with summary, links, and the compliance disclaimer', () => {
    const card = buildEvidenceCard(supp());
    expect(card).not.toBeNull();
    expect(card!.supplementName).toBe('Bacopa Monnieri');
    expect(card!.links.length).toBe(1);
    expect(card!.disclaimer).toBe(COMPLIANCE_DISCLAIMER);
  });

  it('attaches a weak-evidence note when the summary signals limited/mixed evidence', () => {
    const mixed = buildEvidenceCard(supp({ evidenceSummary: 'Herbal extract; benefit overall modest and mixed.' }));
    expect(mixed!.weakEvidenceNote).not.toBeNull();
  });

  it('omits the weak-evidence note for a firmly supported summary', () => {
    const firm = buildEvidenceCard(
      supp({ evidenceSummary: 'Adenosine antagonist; reliably improves alertness and reaction time acutely.' }),
    );
    expect(firm!.weakEvidenceNote).toBeNull();
  });

  it('gives no evidence card for an "Other" supplement', () => {
    expect(hasEvidenceCard(undefined)).toBe(false);
    expect(buildEvidenceCard(undefined)).toBeNull();
    expect(buildEvidenceCard(supp({ id: 'other', name: 'Other' }))).toBeNull();
    expect(buildEvidenceCard(supp({ id: 'custom', name: 'other' }))).toBeNull();
  });

  it('carries no dosing language (summary is the DAO\u2019s own copy, educational only)', () => {
    const card = buildEvidenceCard(supp());
    expect(card!.summary.toLowerCase()).not.toMatch(/\b(mg|dose|take \d|per day|twice daily)\b/);
  });
});
