import { definirOuvert } from './repli'
import Repliable from './Repliable'
import { useEffect, useState } from 'react'
import './App.css'
import { activerNotifications, etatNotifications, notificationsDisponibles, type EtatNotifications } from './push'
import { getCategories, type Categorie } from './api'
import DayView from './DayView'
import EtudesPlanner from './EtudesPlanner'
import SportPlanner from './SportPlanner'
import NutritionCoach from './NutritionCoach'
import MuscuView from './MuscuView'

type Onglet = 'agenda' | 'muscu' | 'nutrition'

const ONGLETS: { cle: Onglet; libelle: string; icone: string }[] = [
    { cle: 'agenda', libelle: 'Agenda', icone: '📅' },
    { cle: 'muscu', libelle: 'Muscu', icone: '🏋️' },
    { cle: 'nutrition', libelle: 'Nutrition', icone: '🥗' },
]

const todayLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
}).format(new Date())

function ongletInitial(): Onglet {
    try {
        const o = localStorage.getItem('app.onglet')
        if (o === 'agenda' || o === 'muscu' || o === 'nutrition') return o
    } catch {
        // stockage indisponible : onglet Agenda
    }
    return 'agenda'
}

function App() {
    const [onglet, setOnglet] = useState<Onglet>(ongletInitial)
    const [etat, setEtat] = useState<EtatNotifications | 'chargement'>('chargement')
    const [categories, setCategories] = useState<Categorie[]>([])
    const [version, setVersion] = useState(0)

    useEffect(() => {
        if (!notificationsDisponibles()) {
            setEtat('indisponible')
            return
        }
        etatNotifications().then(setEtat)
    }, [])

    useEffect(() => {
        getCategories()
            .then(setCategories)
            .catch(() => setCategories([]))
    }, [])

    function choisir(o: Onglet) {
        setOnglet(o)
        window.scrollTo({ top: 0 })
        try {
            localStorage.setItem('app.onglet', o)
        } catch {
            // stockage indisponible
        }
    }

    async function handleActiver() {
        setEtat('chargement')
        const resultat = await activerNotifications()
        setEtat(resultat)
    }

    return (
        <div className={`page ${onglet === 'muscu' ? 'page-muscu' : ''}`}>
            <header className="topbar">
                <div className="brand">
                    <span className="brand-dot" />
                    Organisateur
                </div>
                <span className="today">{capitalize(todayLabel)}</span>
            </header>

            <main className="content">
                {onglet === 'agenda' && (
                    <>
                        <DayView rafraichir={version} onVoirSeance={() => {
                                definirOuvert('muscu.seance', true)
                                choisir('muscu')
                            }} />

                        <SportPlanner onPlanifie={() => setVersion((v) => v + 1)} />

                        <EtudesPlanner version={version} onPlanifie={() => setVersion((v) => v + 1)} />

                        <Repliable cle="agenda.notifications" className="card" titre="🔔 Notifications" resume={etat === 'actif' ? '✅ activées' : undefined}>
                            {etat === 'chargement' && <p className="muted">Vérification…</p>}
                            {etat === 'indisponible' && (
                                <p className="muted">
                                    Les notifications ne sont pas disponibles ici — sur iPhone, installe d'abord l'app sur
                                    l'écran d'accueil (bouton Partager → Sur l'écran d'accueil), puis reviens sur cette page.
                                </p>
                            )}
                            {etat === 'refuse' && (
                                <p className="muted">
                                    Les notifications sont bloquées pour cette app. Active-les dans Réglages → Notifications
                                    → Organisateur pour recevoir tes rappels.
                                </p>
                            )}
                            {etat === 'inactif' && (
                                <>
                                    <p className="muted">
                                        Active les notifications pour recevoir un rappel au bon moment, sans avoir à
                                        demander à l'assistant.
                                    </p>
                                    <button className="btn-primary" onClick={handleActiver}>
                                        Activer les notifications
                                    </button>
                                </>
                            )}
                            {etat === 'actif' && <p className="status">✅ Notifications activées.</p>}
                        </Repliable>

                        {categories.length > 0 && (
                            <Repliable cle="agenda.categories" className="card" titre="🏷️ Catégories" resume={`${categories.length}`}>
                                <ul className="categories">
                                    {categories.map((c) => (
                                        <li
                                            key={c.id}
                                            className="chip"
                                            style={{ '--chip-color': c.couleur } as React.CSSProperties}
                                        >
                                            {c.nom}
                                        </li>
                                    ))}
                                </ul>
                            </Repliable>
                        )}
                    </>
                )}

                {onglet === 'muscu' && <MuscuView />}

                {onglet === 'nutrition' && <NutritionCoach />}
            </main>

            <nav className="tabbar" aria-label="Sections">
                {ONGLETS.map((o) => (
                    <button
                        key={o.cle}
                        className={`tabbar-bouton ${onglet === o.cle ? 'actif' : ''}`}
                        onClick={() => choisir(o.cle)}
                        aria-current={onglet === o.cle ? 'page' : undefined}
                    >
                        <span className="tabbar-icone" aria-hidden="true">
                            {o.icone}
                        </span>
                        {o.libelle}
                    </button>
                ))}
            </nav>
        </div>
    )
}

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1)
}

export default App
