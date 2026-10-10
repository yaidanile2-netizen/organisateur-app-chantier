import { useEffect, useState } from 'react'
import './App.css'
import { activerNotifications, etatNotifications, notificationsDisponibles, type EtatNotifications } from './push'
import { getCategories, type Categorie } from './api'
import DayView from './DayView'

const todayLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
}).format(new Date())

function App() {
    const [etat, setEtat] = useState<EtatNotifications | 'chargement'>('chargement')
    const [categories, setCategories] = useState<Categorie[]>([])

  useEffect(() => {
        if (!notificationsDisponibles()) {
                setEtat('indisponible')
                return
        }
        etatNotifications().then(setEtat)
  }, [])

  useEffect(() => {
        getCategories().then(setCategories).catch(() => setCategories([]))
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
                      <DayView />

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

                      {categories.length > 0 && (
                    <section className="card">
                                <h2>Catégories</h2>
                                <ul className="categories">
                                  {categories.map((c) => (
                        <li key={c.id} className="chip" style={{ '--chip-color': c.couleur } as React.CSSProperties}>
                          {c.nom}
                        </li>
                      ))}
                                </ul>
                      </section>
                        )}

                      <p className="status">
                                ✅ Chantier 8 : vue jour + création/modification de tâches — en place.
                      </p>
              </main>
        </div>
      )
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export default App
