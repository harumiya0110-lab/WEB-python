# PyStudio

ブラウザでPythonを始めるためのオンラインワークスペースです。

## 開発

```sh
npm ci
npm run dev
```

## 確認

```sh
npm run lint
npm run build
```

## Renderにデプロイ

このリポジトリをGitHubにpushし、Render Dashboardから **New > Blueprint** を選んでリポジトリを接続してください。ルートの `render.yaml` を読み取り、静的サイトとしてビルド・公開します。

- ビルドコマンド: `npm ci && npm run build`
- 公開ディレクトリ: `dist`
- SPAルーティング: すべてのパスを `index.html` にrewrite

Phase 1ではReact、TypeScript、Vite、Tailwind CSS、React Router、Zustandの基盤と共通レイアウトを用意しています。エディター、プロジェクト、テンプレート、設定ページの機能は後続Phaseで実装します。
