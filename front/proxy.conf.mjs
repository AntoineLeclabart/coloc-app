// Redirige /api vers le Worker (wrangler dev) pendant `ng serve`.
export default {
  '/api': {
    target: process.env.API_URL ?? 'http://localhost:8000',
    changeOrigin: true,
  },
};
