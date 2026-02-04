/**
 * haitask run [--dry] — Execute full pipeline
 * Thin handler: load config, call pipeline, output result.
 */

export async function runRun(options = {}) {
  const dry = options.dry ?? false;
  // TODO: load config, run pipeline, output result
  console.log('haitask run', dry ? '(dry run)' : '— not implemented yet');
}
