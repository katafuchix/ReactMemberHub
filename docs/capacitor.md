# Capacitor（iOS / Android アプリ化）

クライアント（`dist`）を [Capacitor](https://capacitorjs.com/) でネイティブアプリとしてラップする。
Express サーバーはバンドルされず、**リモート API のまま**。Capacitor はフロントエンドだけを包む。

- Capacitor: `8.5.x`
- 追加物: `capacitor.config.ts` / `android/` / `ios/`
- サーバー側の変更: CORS の許可 origin を複数対応にしただけ（`server/config/env.ts`）

---

## bundle id / アプリ名

| 環境 | bundle id | アプリ名 |
|---|---|---|
| production | `net.deskplate.memberhub` | Member Hub |
| staging | `net.deskplate.memberhub.dev` | Member Hub |

staging と production は **別アプリ**として同一端末に共存インストールできる。

`capacitor.config.ts` の `appId` は「`npx cap add` 時の初期値」でしかなく、
実際の bundle id はネイティブプロジェクト側で管理する（下記）。

### Android — product flavors

`android/app/build.gradle`:

```gradle
flavorDimensions "env"
productFlavors {
    production {
        dimension "env"
        // applicationId = net.deskplate.memberhub（defaultConfig のまま）
    }
    dev {
        dimension "env"
        applicationIdSuffix ".dev"   // -> net.deskplate.memberhub.dev
        versionNameSuffix "-dev"
    }
}
```

生成されるビルドバリアント: `productionDebug` / `productionRelease` / `devDebug` / `devRelease`。

### iOS — Debug = staging / Release = production

`ios/App/App.xcodeproj/project.pbxproj` の App target 設定で、

| Build Configuration | `PRODUCT_BUNDLE_IDENTIFIER` |
|---|---|
| Debug | `net.deskplate.memberhub.dev` |
| Release | `net.deskplate.memberhub` |

- `npx cap run ios` や Xcode の Run は Debug → staging
- Archive（TestFlight / App Store）は Release → production

> **制約**: この方式では「Release ビルドの staging（TestFlight 配信）」ができない。
> staging も TestFlight で配りたくなったら、Xcode に `Staging` build configuration（Release の複製）と
> 専用 scheme を追加し、その configuration だけ bundle id を `.dev` にする。

---

## 環境ごとのビルド（API 接続先の切替）

ネイティブアプリには Vite の dev proxy が無いため、API は**絶対 URL** が必須。
Vite の mode 機能で環境ファイルを切り替える。

| ファイル | mode | 用途 |
|---|---|---|
| `.env.staging` | `staging` | `VITE_API_BASE_URL` = staging API |
| `.env.production` | `production` | `VITE_API_BASE_URL` = production API |

```bash
# staging をビルドして各ネイティブへ反映
npm run cap:sync:staging      # = vite build --mode staging && cap sync

# production
npm run cap:sync:production    # = vite build --mode production && cap sync
```

> リポジトリの `.env.staging` / `.env.production` は**プレースホルダ**（`https://api-stg.example.com/api` 等）。
> 実際のエンドポイントに書き換えること。

`lib/api.ts` は `import.meta.env.VITE_API_BASE_URL ?? '/api'` を baseURL にしているので、
コード側の変更は不要。

### env ファイルの読み込みルール

`--mode staging` のとき Vite は「`.env` を読んで、その上に `.env.staging` を**重ねる**（マージ）」。
「どちらか一方」ではなく**両方**読まれ、同じキーがあれば mode 側が勝つ。

優先順位（上が強い）:

```
.env.staging.local   個人用・gitignore 対象
.env.staging         mode=staging のとき
.env.local           全 mode 共通・個人用
.env                 全 mode 共通
```

**重要**: Vite がクライアントの JS に埋め込むのは `VITE_` で始まる変数だけ。

| ファイル | 主な中身 | クライアントに影響 |
|---|---|---|
| `.env` | `PORT` / `MONGODB_URI` / `JWT_SECRET` / `RESEND_API_KEY` / `CLIENT_ORIGIN` … | **なし**（`VITE_` 接頭辞が無い。サーバー専用） |
| `.env.staging` | `VITE_API_BASE_URL`（staging） | **あり** |
| `.env.production` | `VITE_API_BASE_URL`（production） | **あり** |

このプロジェクトでは client 向けの値が `.env.staging` / `.env.production` にしか無いので、
`vite build --mode staging` で実質効くのは `.env.staging` の `VITE_API_BASE_URL` だけ。
`.env` は今後もサーバー専用と考えてよい（`server/config/env.ts` がルートの `.env` を直接読む）。

> サーバー側には staging/production の mode 切替の仕組みは無い。
> API サーバーを環境ごとに別インスタンスで立て、それぞれに `.env` を持たせる。

---

## 開発ワークフロー

### 1. Web 開発（従来通り）

```bash
npm run dev:full   # API(8000) + client(5173)
```

ブラウザで開発する分にはこれまで通り。Capacitor は関係しない。

### 2. 実機ライブリロード（端末で動かしながら開発）

`capacitor.config.ts` の `server` を有効化して dev マシンの Vite を直接読ませる:

```ts
server: {
  androidScheme: 'https',
  url: 'http://192.168.x.x:5173',   // dev マシンの LAN IP
  cleartext: true,                  // http を許可
},
```

その後:

```bash
npm run dev:full
npx cap run ios      # or: npx cap run android
```

> **コミットしないこと**。`url` を残したままビルドすると本番アプリが dev マシンを見に行く。

### 3. ネイティブビルド / IDE で開く

```bash
npm run cap:sync:staging     # dist を作って android/ ios/ に反映
npm run cap:ios              # = cap open ios（Xcode）
npm run cap:android          # = cap open android（Android Studio）
```

- iOS: scheme = `App`、Run（Debug）で staging、Product > Archive（Release）で production
- Android: Build Variants パネルで `devDebug` / `productionRelease` などを選択

---

## API 接続と CORS

ネイティブ WebView の origin:

| プラットフォーム | origin |
|---|---|
| iOS | `capacitor://localhost` |
| Android（`androidScheme: 'https'`） | `https://localhost` |

サーバーの `CLIENT_ORIGIN` はカンマ区切りで複数指定できる（`server/config/env.ts` の `CLIENT_ORIGINS` が配列化）:

```
CLIENT_ORIGIN=http://localhost:5173,capacitor://localhost,https://localhost
```

staging / production それぞれの API サーバーで、対応するネイティブ origin ＋ Web origin を許可する。

---

## よくある落とし穴

| 症状 | 原因 / 対処 |
|---|---|
| ネイティブで API が全部失敗する | `VITE_API_BASE_URL` が未設定 or 相対 `/api` のまま。`--mode` 付きでビルドし直す |
| CORS エラー | サーバーの `CLIENT_ORIGIN` に `capacitor://localhost` / `https://localhost` が無い |
| Android で `http://` API に繋がらない | cleartext 不許可。開発時は `capacitor.config.ts` の `cleartext: true`、本番は HTTPS 必須 |
| リロードすると画面が真っ白 / 404 | `BrowserRouter` の deep link。必要なら `main.tsx` を `HashRouter` に変更 |
| ログイン状態がすぐ切れる | JWT が `localStorage`。永続化したいなら `@capacitor/preferences` に移行（`lib/api.ts` の `getToken` / `setToken` だけ差し替え） |
| セーフエリアに被る | `index.html` は `viewport-fit=cover` 済み。CSS 側で `env(safe-area-inset-*)` を使う |
| iOS ビルドで bundle id が想定と違う | Debug=`.dev` / Release=production の仕様（上記）。Xcode の scheme / Archive 対象を確認 |

---

## リリース前にやること（PoC では未対応）

- [ ] `.env.staging` / `.env.production` を実 URL に
- [ ] Apple Developer で `net.deskplate.memberhub` と `net.deskplate.memberhub.dev` の App ID・プロビジョニングプロファイルを作成
- [ ] iOS の署名設定（`CODE_SIGN_STYLE` / Team）
- [ ] アプリアイコン・スプラッシュ画像の差し替え（`@capacitor/assets` が便利）
- [ ] `@capacitor/preferences` によるトークン永続化
- [ ] JWT を `localStorage` に置くことのセキュリティ評価（XSS 耐性）
- [ ] （プッシュ通知を使うなら）flavor / configuration ごとの `google-services.json` / APNs 設定
- [ ] staging を TestFlight 配信するなら iOS に `Staging` configuration + scheme を追加

---

## 参考

- [Capacitor Docs — Developer Workflow](https://capacitorjs.com/docs/basics/workflow)
- [Capacitor — Environment-specific Configurations](https://capacitorjs.com/docs/guides/environment-specific-configurations)
- [Android product flavors](https://developer.android.com/build/build-variants)
