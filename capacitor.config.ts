import type { CapacitorConfig } from '@capacitor/cli';

// appId はネイティブプロジェクト追加時の初期値。
// staging の bundle id (net.deskplate.memberhub.dev) は
//   - Android: android/app/build.gradle の productFlavors "dev"
//   - iOS: Xcode の Staging build configuration (ios/App/Staging.xcconfig)
// で上書きする。ここでは変更しない。
const config: CapacitorConfig = {
  appId: 'net.deskplate.memberhub',
  appName: 'Member Hub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // 実機ライブリロード時のみ有効化する (Vite dev server を直接読む):
    //   url: 'http://192.168.x.x:5173',
    //   cleartext: true,
  },
};

export default config;
