/** PubMed search URL. A specific author + year + topic query lands on the paper. */
export function pubmed(query: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`;
}

/** NIH Office of Dietary Supplements health-professional fact sheet. */
export function ods(slug: string): string {
  return `https://ods.od.nih.gov/factsheets/${slug}-HealthProfessional/`;
}
