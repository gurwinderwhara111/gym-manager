const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/supabase-api/:path*",
        destination: "http://127.0.0.1:54321/:path*",
      },
    ];
  },
};

export default nextConfig;
