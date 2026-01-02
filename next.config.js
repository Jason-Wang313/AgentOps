/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*', // Matches /api/proxy/stats
        destination: 'https://agentops-api.onrender.com/:path*', // Forwards to https://agentops-api.onrender.com/stats
      },
    ]
  },
}

module.exports = nextConfig