import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sunucu tarafı middleware ve API route'larında crypto modülü kullanılıyor,
  // Edge Runtime ile uyumsuz paketler için serverExternalPackages tanımlanır.
  serverExternalPackages: ["@supabase/supabase-js"],

  // Strict mode - production'da çift render'ı engeller
  reactStrictMode: true,
};

export default nextConfig;
