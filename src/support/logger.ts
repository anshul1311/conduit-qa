/**
 * Structured test logger.
 *
 * Every line is a single-line JSON object so failure runs can be diffed,
 * grep'd, or piped to an agent for triage. Plain `console.log` strings are
 * fine for humans but useless for a follow-up Claude run trying to figure out
 * why a test broke.
 *
 * USAGE
 *   log.info('article.created', { slug: a.slug });
 *   log.warn('cleanup.skipped', { reason: 'no token' });
 *
 * The event name is mandatory and uses dot.case — this makes it easy for an
 * agent to grep `event: "article.created"` across runs.
 */

type Fields = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', event: string, fields: Fields = {}): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    worker: process.env.TEST_WORKER_INDEX ?? '0',
    ...fields,
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

export const log = {
  info: (event: string, fields?: Fields) => emit('info', event, fields),
  warn: (event: string, fields?: Fields) => emit('warn', event, fields),
  error: (event: string, fields?: Fields) => emit('error', event, fields),
};
