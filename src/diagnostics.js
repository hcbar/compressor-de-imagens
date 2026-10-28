// Kept in sync with package.json by a unit test; this is a plain static module.
export const APP_VERSION = '0.1.1';
const codes = {
  INVALID_MODE: ['IC_INVALID_MODE', 'input', 'validation'],
  INVALID_TARGET: ['IC_INVALID_TARGET', 'limit', 'validation'],
  FILE_LIMIT: ['IC_FILE_LIMIT', 'limit', 'validation'],
  UNSUPPORTED_INPUT: ['IC_INPUT_FORMAT', 'compatibility', 'validation'],
  INVALID_IMAGE: ['IC_INVALID_IMAGE', 'input', 'opening'],
  DECODE_FAILED: ['IC_DECODE_FAILED', 'input', 'opening'],
  PIXEL_LIMIT: ['IC_PIXEL_LIMIT', 'limit', 'validation'],
  CANVAS_UNAVAILABLE: ['IC_CANVAS_UNAVAILABLE', 'compatibility', 'conversion'],
  UNSUPPORTED_OUTPUT: ['IC_OUTPUT_FORMAT', 'compatibility', 'conversion'],
  NO_OUTPUT: ['IC_NO_OUTPUT', 'compatibility', 'conversion'],
  TARGET_UNREACHABLE: ['IC_TARGET_UNREACHABLE', 'limit', 'conversion'],
  PREVIEW_FAILED: ['IC_PREVIEW_FAILED', 'rendering', 'rendering'],
};
const stages = new Set(['opening', 'validation', 'rendering', 'conversion', 'export']);
export function createDiagnostic(error, stage) {
  const known = Object.hasOwn(codes, error?.code) ? codes[error.code] : null;
  return {
    tool: 'Image Compressor', version: APP_VERSION,
    stage: known ? known[2] : stages.has(stage) ? stage : 'conversion',
    code: known ? known[0] : 'IC_PROCESSING_FAILED',
    category: known ? known[1] : 'processing',
  };
}
