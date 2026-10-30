import { ArrowLeft, Construction } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  return (
    <section className="placeholder-page">
      <span className="placeholder-icon">
        <Construction size={24} aria-hidden="true" />
      </span>
      <span className="section-kicker">COMING IN A FUTURE PHASE</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <Link className="text-link" to="/">
        <ArrowLeft size={16} aria-hidden="true" />
        ホームに戻る
      </Link>
    </section>
  )
}
