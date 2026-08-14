/**
 * Research Profile — the contract shared by the three litpipe apps.
 *
 * This file is intentionally IDENTICAL in research-triage, reading-versions and
 * author-mapping. It is copied rather than published as a package: three
 * consumers, all owned by the same author, do not justify the cost of
 * publishing and version-bumping an npm package. See README, "Architecture
 * decisions".
 *
 * A profile is the answer to "what am I researching?" — free-text topic plus a
 * list of objectives. The user types it once and moves it between the apps as
 * JSON.
 */

/** Bumped whenever the shape changes, so old exports can be detected. */
export const PROFILE_SCHEMA_VERSION = 1;

/** Input caps. Applied on every import; a pasted file is untrusted input. */
export const LIMITS = {
  topic: 4000,
  objective: 500,
  objectives: 50,
};

/**
 * @typedef {object} ResearchProfile
 * @property {number} schemaVersion
 * @property {string} topic       Free-text description of the research topic.
 * @property {string[]} objectives
 * @property {string} updatedAt   ISO-8601 timestamp.
 */

/**
 * @param {string} [topic]
 * @param {string[]} [objectives]
 * @returns {ResearchProfile}
 */
export function createProfile(topic = '', objectives = []) {
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    topic,
    objectives,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * The single text used for matching: topic plus objectives, concatenated.
 * Both repo 1 (similarity) and repo 3 (author search) read the profile through
 * this function, so the two apps always interpret a profile the same way.
 *
 * @param {ResearchProfile} profile
 * @returns {string}
 */
export function profileToQuery(profile) {
  return [profile.topic, ...(profile.objectives ?? [])].filter(Boolean).join('. ');
}

/**
 * Validates and normalises an unknown value into a ResearchProfile.
 *
 * Returns a result object instead of throwing: the caller is always a UI that
 * needs to show the reason to the user, never a crash.
 *
 * @param {unknown} value
 * @returns {{ ok: boolean, profile: ResearchProfile | null, errors: string[] }}
 */
export function validateProfile(value) {
  const errors = [];

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ok: false, profile: null, errors: ['Profile must be a JSON object.'] };
  }

  const raw = /** @type {Record<string, unknown>} */ (value);

  if (raw.schemaVersion !== undefined && raw.schemaVersion !== PROFILE_SCHEMA_VERSION) {
    errors.push(
      `Unsupported schemaVersion ${String(raw.schemaVersion)}; this app reads version ${PROFILE_SCHEMA_VERSION}.`,
    );
  }

  const topic = typeof raw.topic === 'string' ? raw.topic.trim() : '';
  if (!topic) errors.push('Field "topic" is required and must be a non-empty string.');
  if (topic.length > LIMITS.topic) {
    errors.push(`Field "topic" exceeds ${LIMITS.topic} characters.`);
  }

  let objectives = [];
  if (raw.objectives !== undefined) {
    if (!Array.isArray(raw.objectives)) {
      errors.push('Field "objectives" must be an array of strings.');
    } else {
      if (raw.objectives.length > LIMITS.objectives) {
        errors.push(`Field "objectives" exceeds ${LIMITS.objectives} entries.`);
      }
      objectives = raw.objectives
        .slice(0, LIMITS.objectives)
        .filter((o) => typeof o === 'string')
        .map((o) => o.trim().slice(0, LIMITS.objective))
        .filter(Boolean);
    }
  }

  if (errors.length > 0) return { ok: false, profile: null, errors };

  return {
    ok: true,
    profile: {
      schemaVersion: PROFILE_SCHEMA_VERSION,
      topic: topic.slice(0, LIMITS.topic),
      objectives,
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString(),
    },
    errors: [],
  };
}

/**
 * Parses profile JSON text (a file the user picked, so: untrusted).
 *
 * Accepts either a bare profile or the pipeline envelope `{ profile, ... }`
 * exported by research-triage, so a hand-off file can be dropped into any of
 * the three apps.
 *
 * @param {string} text
 * @returns {{ ok: boolean, profile: ResearchProfile | null, errors: string[] }}
 */
export function parseProfileJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, profile: null, errors: ['File is not valid JSON.'] };
  }
  const candidate =
    parsed && typeof parsed === 'object' && 'profile' in parsed ? parsed.profile : parsed;
  return validateProfile(candidate);
}
