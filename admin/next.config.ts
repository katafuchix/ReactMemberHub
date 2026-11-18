import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // 親ディレクトリ (ルートの package.json) をワークスペースと誤認しないよう固定する
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
