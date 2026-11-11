import { definirOuvert } from './repli'
import Repliable from './Repliable'
import { useEffect, useRef, useState } from 'react'
import './App.css'
import { activerNotifications, etatNotifications, notificationsDisponibles, type EtatNotifications } from './push'
import { getCategories, type Categorie } from './api'
import DayView from './DayView'
import EtudesPlanner from './EtudesPlanner'
import SportPlanner from './SportPlanner'
import NutritionCoach from './NutritionCoach'
import MuscuView from './MuscuView'
import { QuestionsTD, SuiviTD } from './AvancementTD'
import CoursView from './CoursView'
import AssistantIA from './AssistantIA'
import { ecouter } from './evenements'

type Onglet = 'agenda' | 'muscu' | 'nutrition' | 'cours'

const ONGLETS: { cle: Onglet; libelle: string; icone: string }[] = [
    { cle: 'agenda', libelle: 'Agenda', icone: '📅' },
    { cle: 'muscu', libelle: 'Muscu', icone: '🏋️' },
    { cle: 'nutrition', libelle: 'Nutrition', icone: '🥗' },
    { cle: 'cours', libelle: 'Cours', icone: '📚' },
]

const todayLabel = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
}).format(new Date())

function ongletInitial(): Onglet {
    try {
        const o = localStorage.getItem('app.onglet')
        if (o === 'agenda' || o === 'muscu' || o === 'nutrition' || o === 'cours') return o
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
    const topbar = useRef<HTMLElement>(null)
    const tabbar = useRef<HTMLElement>(null)

    // Hauteur des barres (pour l'onglet Cours, qui occupe tout l'espace entre les deux)
    useEffect(() => {
        const maj = () => {
            const r = document.documentElement.style
            r.setProperty('--haut-topbar', `${topbar.current?.offsetHeight ?? 60}px`)
            r.setProperty('--haut-tabbar', `${tabbar.current?.offsetHeight ?? 64}px`)
        }
        maj()
        const ro = new ResizeObserver(maj)
        if (topbar.current) ro.observe(topbar.current)
        if (tabbar.current) ro.observe(tabbar.current)
        return () => ro.disconnect()
    }, [])

    // L'assistant a modifié l'agenda → on recharge ; « Ouvrir le cours » → onglet Cours
    useEffect(() => ecouter('organisateur:actualiser', () => setVersion((v) => v + 1)), [])
    useEffect(() => ecouter('organisateur:cours', () => choisir('cours')), [])

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
        <div className={`page ${onglet === 'muscu' ? 'page-muscu' : ''} ${onglet === 'cours' ? 'page-cours' : ''}`}>
            <header className="topbar" ref={topbar}>
                <div className="brand">
                    <span className="brand-dot" />
                    Organisateur
                </div>
                <span className="today">{capitalize(todayLabel)}</span>
            </header>

            <main className="content">
                {onglet === 'agenda' && (
                    <>
                        <QuestionsTD />

                        <DayView rafraichir={version} onVoirSeance={() => {
                                definirOuvert('muscu.seance', true)
                                choisir('muscu')
                            }} />

                        <SportPlanner onPlanifie={() => setVersion((v) => v + 1)} />

                        <EtudesPlanner version={version} onPlanifie={() => setVersion((v) => v + 1)} />

                        <SuiviTD />

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

            <CoursView actif={onglet === 'cours'} />

            <AssistantIA ecran={onglet} />

            <nav className="tabbar" aria-label="Sections" ref={tabbar}>
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
