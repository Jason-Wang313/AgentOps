/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://agentops-api.onrender.com/:path*', // The actual backend URL
      },
    ]
  },
}

module.exports = nextConfig