import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const dbcTraceInclude = [
  "./src/vendor/meteora-dbc.cjs",
  "./node_modules/@meteora-ag/dynamic-bonding-curve-sdk/**",
  "./node_modules/@coral-xyz/anchor/**",
  "./node_modules/@solana/web3.js/**",
  "./node_modules/@solana/spl-token/**",
  "./node_modules/@solana/buffer-layout/**",
  "./node_modules/@solana/codecs-numbers/**",
  "./node_modules/@noble/curves/**",
  "./node_modules/@noble/hashes/**",
  "./node_modules/@babel/runtime/**",
  "./node_modules/bn.js/**",
  "./node_modules/decimal.js/**",
  "./node_modules/bs58/**",
  "./node_modules/borsh/**",
  "./node_modules/buffer/**",
  "./node_modules/rpc-websockets/**",
  "./node_modules/superstruct/**",
  "./node_modules/jayson/**",
  "./node_modules/node-fetch/**",
  "./node_modules/agentkeepalive/**",
  "./node_modules/fast-stable-stringify/**",
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  serverExternalPackages: ["@meteora-ag/dynamic-bonding-curve-sdk", "@coral-xyz/anchor"],
  outputFileTracingIncludes: {
    "/api/launch": dbcTraceInclude,
    "/api/launch/lookup": dbcTraceInclude,
    "/api/swap/quote": dbcTraceInclude,
    "/api/swap/build": dbcTraceInclude,
    "/*": ["./src/vendor/meteora-dbc.cjs", "./node_modules/@solana/web3.js/**", "./node_modules/@solana/spl-token/**"],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      bufferutil: false,
      "utf-8-validate": false,
    };
    if (isServer) {
      config.plugins.push({
        apply(compiler: { hooks: { afterEmit: { tap: (name: string, fn: () => void) => void } }; options: { output: { path: string } } }) {
          compiler.hooks.afterEmit.tap("CopyMeteoraDbc", () => {
            const from = path.join(__dirname, "src/vendor/meteora-dbc.cjs");
            if (!fs.existsSync(from)) return;
            const destDir = path.join(compiler.options.output.path, "vendor");
            fs.mkdirSync(destDir, { recursive: true });
            fs.copyFileSync(from, path.join(destDir, "meteora-dbc.cjs"));
          });
        },
      });
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/subscribe", destination: "/pricing", permanent: false },
      { source: "/auto", destination: "/trading", permanent: false },
      { source: "/copy", destination: "/trading", permanent: false },
      { source: "/alerts", destination: "/trading", permanent: false },
      { source: "/sniper", destination: "/trading", permanent: false },
      { source: "/migrate", destination: "/trading", permanent: false },
      { source: "/terminal", destination: "/trading", permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
