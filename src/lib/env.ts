const mocksValue = import.meta.env.VITE_ENABLE_MOCKS
if (
  mocksValue !== undefined &&
  mocksValue !== 'true' &&
  mocksValue !== 'false'
) {
  throw new Error('VITE_ENABLE_MOCKS deve ser true ou false.')
}
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  mocksEnabled: mocksValue === 'true' || (mocksValue === undefined && import.meta.env.DEV),
}
