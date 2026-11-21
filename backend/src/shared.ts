/**
 * The scoring engine, validation, catalogue and types live in the frontend source and are reused here,
 * so the browser preview and the server always calculate exactly the same score.
 */
export { analyzeLead, DEFAULT_SCORING, guessService } from '../../frontend/src/lib/intelligence.ts'
export { findDuplicates } from '../../frontend/src/lib/duplicates.ts'
export { validateLead, sanitizeLeadInput } from '../../frontend/src/lib/validation.ts'
export { DEFAULT_SERVICES, getServices, setServiceCatalog, serviceName, statusLabel, STATUSES } from '../../frontend/src/data/catalog.ts'
export { buildSeedData, DEMO_PASSWORD } from '../../frontend/src/data/mockData.ts'
export type * from '../../frontend/src/types/index.ts'
