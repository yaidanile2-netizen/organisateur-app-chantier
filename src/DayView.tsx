import { useEffect, useState } from 'react'
import {
    creerTache,
    getCategories,
    getCours,
    getTaches,
    modifierTache,
    supprimerTache,
    type Categorie,
    type Cours,
    type ModificationTache,
    type NouvelleTache,
    type Tache,
} from './api'
import TaskForm from './TaskForm'

type Item =
    | { type: 'tache'; data: Tache; debut: Date | null; fin: Date | null }
    | { type: 'cours'; data: Cours; debut: Date; fin: Date }

const heureFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const dateLabelFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
})

function estAujourdhui(date: Date): boolean {
    const auj = new Date()
    return (
        date.getFullYear() === auj.getFullYear() &&
        date.getMonth() === auj.getMonth() &&
        date.getDate() === auj.getDate()
    )
}

export default function DayView({ rafraichir = 0 }: { rafraichir?: number }) {
    const [date, setDate] = useState(() => new Date())
    const [taches, setTaches] = useState<Tache[]>([])
    const [cours, setCours] = useState<Cours[]>([])
    const [categories, setCategories] = useState<Categorie[]>([])
    const [chargement, setChargement] = useState(true)
    const [erreur, setErreur] = useState<string | null>(null)
    const [formOuvert, setFormOuvert] = useState(false)
    const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)

    async function recharger() {
        setChargement(true)
        setErreur(null)
        try {
            const [t, c, cat] = await Promise.all([getTaches(date), getCours(date), getCategories()])
            setTaches(t)
            setCours(c)
            setCategories(cat)
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Erreur de chargement.')
        } finally {
            setChargement(false)
        }
    }

    useEffect(() => {
        recharger()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [date, rafraichir])

    function changerJour(delta: number) {
        setDate((d) => {
            const nouvelle = new Date(d)
            nouvelle.setDate(nouvelle.getDate() + delta)
            return nouvelle
        })
    }

    const items: Item[] = [
        ...taches.map(
            (t): Item => ({
                type: 'tache',
                data: t,
                debut: t.date_debut ? new Date(t.date_debut) : null,
                fin: t.date_fin ? new Date(t.date_fin) : null,
            })
        ),
        ...cours.map(
            (c): Item => ({ type: 'cours', data: c, debut: new Date(c.date_debut), fin: new Date(c.date_fin) })
        ),
    ].sort((a, b) => {
        const ta = a.debut ? a.debut.getTime() : Infinity
        const tb = b.debut ? b.debut.getTime() : Infinity
        return ta - tb
    })

    async function handleEnregistrer(data: NouvelleTache | ModificationTache) {
        if ('id' in data) {
            await modifierTache(data as ModificationTache)
        } else {
            await creerTache(data as NouvelleTache)
        }
        setFormOuvert(false)
        setTacheEnEdition(null)
        await recharger()
    }

    async function handleSupprimer(id: string) {
        await supprimerTache(id)
        setFormOuvert(false)
        setTacheEnEdition(null)
        await recharger()
    }

    function ouvrirCreation() {
        setTacheEnEdition(null)
        setFormOuvert(true)
    }

    function ouvrirEdition(t: Tache) {
        setTacheEnEdition(t)
        setFormOuvert(true)
    }

    return (
        <section className="card day-view">
            <div className="day-view-header">
                <button className="btn-icon" onClick={() => changerJour(-1)} aria-label="Jour précédent">
                    ‹
                </button>
                <div className="day-view-title">
                    <h2>{capitalize(dateLabelFormat.format(date))}</h2>
                    {!estAujourdhui(date) && (
                        <button className="btn-link" onClick={() => setDate(new Date())}>
                            Revenir à aujourd'hui
                        </button>
                    )}
                </div>
                <button className="btn-icon" onClick={() => changerJour(1)} aria-label="Jour suivant">
                    ›
                </button>
            </div>

            {chargement && <p className="muted">Chargement…</p>}
            {erreur && <p className="form-error">{erreur}</p>}

            {!chargement && !erreur && items.length === 0 && (
                <p className="muted">Rien de prévu ce jour-là.</p>
            )}

            {!chargement && !erreur && items.length > 0 && (
                <ul className="day-list">
                    {items.map((item) => (
                        <li
                            key={`${item.type}-${item.data.id}`}
                            className={`day-item ${item.type === 'cours' ? 'day-item-cours' : ''}`}
                            style={
                                item.type === 'tache' && item.data.categorie_couleur
                                    ? ({ '--chip-color': item.data.categorie_couleur } as React.CSSProperties)
                                    : undefined
                            }
                            onClick={() => item.type === 'tache' && ouvrirEdition(item.data)}
                        >
                            <span className="day-item-heure">
                                {item.debut ? heureFormat.format(item.debut) : '—'}
                            </span>
                            <span className="day-item-barre" />
                            <span className="day-item-corps">
                                <span className="day-item-titre">{item.data.titre}</span>
                                {item.type === 'tache' && item.data.categorie_nom && (
                                    <span className="day-item-categorie">{item.data.categorie_nom}</span>
                                )}
                                {item.type === 'cours' && item.data.lieu && (
                                    <span className="day-item-categorie">{item.data.lieu}</span>
                                )}
                                {item.type === 'tache' && item.data.statut === 'fait' && (
                                    <span className="day-item-fait">✓ fait</span>
                                )}
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <button className="btn-primary" onClick={ouvrirCreation}>
                + Ajouter une tâche
            </button>

            {formOuvert && (
                <TaskForm
                    categories={categories}
                    tacheExistante={tacheEnEdition}
                    dateParDefaut={date}
                    onFermer={() => {
                        setFormOuvert(false)
                        setTacheEnEdition(null)
                    }}
                    onEnregistrer={handleEnregistrer}
                    onSupprimer={handleSupprimer}
                />
            )}
        </section>
    )
}

function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1)
}
