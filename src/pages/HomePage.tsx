import { ArrowRight, Code2, Layers3, ShieldCheck, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'

const highlights = [
  {
    icon: Code2,
    title: 'ブラウザで、すぐ書ける',
    description: '環境構築なしで、思いついたコードをすぐ形に。',
  },
  {
    icon: Layers3,
    title: 'プロジェクトを整理',
    description: 'ファイルやアイデアをひとつの場所にまとめて管理。',
  },
  {
    icon: ShieldCheck,
    title: '自分のペースで学べる',
    description: '初心者から経験者まで、心地よく使える環境を目指します。',
  },
]

export function HomePage() {
  return (
    <div className="home-page">
      <section className="welcome-card">
        <div className="welcome-copy">
          <span className="eyebrow">
            <Sparkles size={14} aria-hidden="true" />
            YOUR PYTHON WORKSPACE
          </span>
          <h1>Pythonを、もっと自由に。<br />もっと身近に。</h1>
          <p>
            ブラウザを開いたら、そこがあなたの開発環境。
            PyStudioでPythonのアイデアを形にしましょう。
          </p>
          <Link className="primary-button" to="/editor/">
            ワークスペースを開く
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
        <div className="code-decoration" aria-hidden="true">
          <div className="code-window-bar">
            <span />
            <span />
            <span />
            <small>hello.py</small>
          </div>
          <pre>
            <span className="code-muted">1</span> <span className="code-purple">def</span>{' '}
            <span className="code-blue">hello</span>():
            {'\n'}
            <span className="code-muted">2</span> {'  '}
            <span className="code-purple">print</span>(
            <span className="code-green">"Hello, world!"</span>)
            {'\n'}
            <span className="code-muted">3</span>
            {'\n'}
            <span className="code-muted">4</span>{' '}
            <span className="code-blue">hello</span>()
          </pre>
          <span className="code-output">
            <span aria-hidden="true">›</span> Hello, world!
          </span>
        </div>
        <div className="welcome-orb welcome-orb-one" aria-hidden="true" />
        <div className="welcome-orb welcome-orb-two" aria-hidden="true" />
      </section>

      <section className="foundation-section" aria-labelledby="foundation-title">
        <div className="section-heading">
          <div>
            <span className="section-kicker">A BETTER WAY TO CODE</span>
            <h2 id="foundation-title">アイデアを、すぐにコードへ。</h2>
          </div>
          <p>必要なものをひとつに。創作に集中できる場所をつくります。</p>
        </div>
        <div className="highlight-grid">
          {highlights.map(({ icon: Icon, title, description }) => (
            <article className="highlight-card" key={title}>
              <span className="highlight-icon">
                <Icon size={19} aria-hidden="true" />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
