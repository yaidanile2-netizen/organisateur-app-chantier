import './App.css'

const CATEGORIES = [
  { key: 'etudes', label: 'Études (IUT)', color: '#4f46e5' },
  { key: 'travail', label: 'Travail', color: '#0891b2' },
  { key: 'sport', label: 'Sport / Muscu', color: '#16a34a' },
  { key: 'perso', label: 'Perso', color: '#d97706' },
]

const todayLabel = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())

function App() {
  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-dot" />
          Organisateur
        </div>
        <span className="today">{capitalize(todayLabel)}</span>
      </header>

      <main className="content">
        <section className="card">
          <h1>Que dois-je faire maintenant ?</h1>
          <p className="muted">
            Rien de prévu pour l'instant — cette vue affichera automatiquement
            ce qui est pertinent à l'instant présent une fois l'agenda
            connecté (chantier 4).
          </p>
        </section>

        <section className="card">
          <h2>Catégories</h2>
          <ul className="categories">
            {CATEGORIES.map((c) => (
              <li key={c.key} className="chip" style={{ '--chip-color': c.color } as React.CSSProperties}>
                {c.label}
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <h2>Vues à venir</h2>
          <p className="muted">
            Jour · Semaine · Mois · Année — arrivent au chantier 8, une fois
            le backend et la voix validés.
          </p>
        </section>

        <p className="status">
          ✅ Chantier 1 : squelette installable — en place.
        </p>
      </main>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default App
