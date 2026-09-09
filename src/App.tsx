import { useEffect, useState } from 'react'
import './App.css'
import { activerNotifications, etatNotifications, notificationsDisponibles, type EtatNotifications } from './push'

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
    const [etat, setEtat] = useState<EtatNotifications | 'chargement'>('chargement')

  useEffect(() => {
        if (!notificationsDisponibles()) {
                setEtat('indisponible')
                return
        }
        etatNotifications().then(setEtat)
  }, [])

  async function handleActiver() {
        setEtat('chargement')
        const resultat = await activerNotifications()
        setEtat(resultat)
  }

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
                                <h2>Notifications</h2>
                        {etat === 'chargement' && <p className="muted">Vérification…</p>}
                        {etat === 'indisponible' && (
                      <p className="muted">
                                    Les notifications ne sont pas disponibles ici — sur iPhone,
                                    installe d'abord l'app sur l'écran d'accueil (bouton Partager →
                                    Sur l'écran d'accueil), puis reviens sur cette page.
                      </p>
                                )}
                        {etat === 'refuse' && (
                      <p className="muted">
                                    Les notifications sont bloquées pour cette app. Active-les dans
                                    Réglages → Notifications → Organisateur pour recevoir tes
                                    rappels.
                      </p>
                                )}
                        {etat === 'inactif' && (
                      <>
                                    <p className="muted">
                                                    Active les notifications pour recevoir un rappel au bon
                                                    moment, sans avoir à demander à l'assistant.
                                    </p>
                                    <button className="btn-primary" onClick={handleActiver}>
                                                    Activer les notifications
                                    </button>
                      </>
                    )}
                        {etat === 'actif' && <p className="status">✅ Notifications activées.</p>}
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
