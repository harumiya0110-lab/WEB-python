# PyStudio

ブラウザー内でPythonを書いて実行するオンラインワークスペースです。

## 開発・確認

```sh
npm ci
npm run dev
npm run lint
npm test
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
- Python入門から応用までのサンプルコード読み込み
- 36種類のPythonテンプレート（検索、カテゴリー・難易度の絞り込み、並び替え、お気に入り）
- プロジェクトをユーザー独自のマイテンプレートとして保存・編集・複製・削除
- マイテンプレートはIndexedDB v3の独立ストアへ保存し、作成時のファイル内容をスナップショット
- 標準テンプレートの固定並び順と、マイテンプレートの作成・更新日時による並び替え
- エディターの12種類のサンプルとテンプレートで共通のPythonコード定義
- テンプレートのコード・ファイル構成プレビューと、IndexedDBへの新規プロジェクト作成
- MatplotlibグラフのプレビューとPyodideでのpandas自動読み込み
- ライト／ダークテーマとエディターレイアウト設定の保存
- Render Static Site用Blueprint

テンプレートから作成したプロジェクト、マイテンプレート、お気に入りは現在のブラウザー内に保存されます。マイテンプレートのライブラリ依存は自動解析しないため、利用するコードのimport文を確認してください。標準テンプレートは固定のカタログ順で管理し、実際の作成日時とは区別します。Firebase認証・クラウド同期、pandas DataFrame専用の表プレビュー、ZIP出力などは未実装です。Matplotlibとpandasは初回実行時にPyodideから読み込まれます。ブラウザー内Workerは実行の分離と停止に役立ちますが、完全なセキュリティ境界ではありません。

## Renderにデプロイ

GitHubリポジトリをRenderのBlueprintとして接続してください。ルートの`render.yaml`を読み込み、`npm ci && npm run build`でビルドし、`dist`を公開します。SPAルーティング用にすべてのパスを`index.html`へrewriteします。
