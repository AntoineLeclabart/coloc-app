// Redirige /api vers Symfony pendant `ng serve`.
export default {
  '/api': {
    target: process.env.API_URL ?? 'http://localhost:8000',
    changeOrigin: true,
  },
};
