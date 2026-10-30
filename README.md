# PyStudio

ブラウザー内でPythonを書いて実行するオンラインワークスペースです。

## 開発・確認

```sh
npm ci
npm run dev
npm run lint
npm run build
```

## 現在の機能

- React、TypeScript、Vite、Tailwind CSS、React Router、Zustand
- Monaco Editor（Python、JSON、Markdown、HTML、CSSなど）
- 固定バージョンPyodideをWeb Worker上で実行
- 標準出力・エラー表示、基本的な`input()`、停止、20秒の実行上限、出力上限
- 複数ファイル・フォルダー、タブ、ファイル操作、プロジェクト内import
- IndexedDBへのゲストプロジェクト自動保存と複数プロジェクト管理
- プロジェクトの作成、名前・説明の編集、複製、削除、検索、更新日時・最終実行日時の表示
- ライト／ダークテーマとエディターレイアウト設定の保存
- Render Static Site用Blueprint

プロジェクトデータは現在のブラウザー内に保存されます。Firebase認証・クラウド同期、グラフ／表のプレビュー、ZIP出力などは未実装です。ブラウザー内Workerは実行の分離と停止に役立ちますが、完全なセキュリティ境界ではありません。

## Renderにデプロイ

GitHubリポジトリをRenderのBlueprintとして接続してください。ルートの`render.yaml`を読み込み、`npm ci && npm run build`でビルドし、`dist`を公開します。SPAルーティング用にすべてのパスを`index.html`へrewriteします。
