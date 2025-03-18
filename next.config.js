
const nextConfig = {
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com', // Google user content
        },
        {
            protocol: 'https',
            hostname: 'avatars.githubusercontent.com', // GitHub
          },
      ],
    },
  };

  module.exports = nextConfig;