import { useEffect, useMemo, useState } from 'react'
import {
    creerTache,
    getCategories,
    getCoursEntre,
    getTachesEntre,
    modifierTache,
    supprimerTache,
    type Categorie,
    type Cours,
    type ModificationTache,
    type NouvelleTache,
    type Tache,
} from './api'
import EventDetail, { type Item } from './EventDetail'
import { duree } from './temps'
import { seanceParCode } from './programme'
import { MARQUEUR, codeDeTache, debutDeSemaine } from './sport'
import TaskForm from './TaskForm'

const heureFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const dateLabelFormat = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
})

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const heureCourte = (d: Date) => `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`

function memeJour(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// Couleur et emoji d'un événement dans la bande de la semaine.
function visuel(it: Item): { couleur: string; emoji: string } {
    if (it.type === 'cours') return { couleur: '#64748b', emoji: '📚' }
    const code = it.data.description?.includes(MARQUEUR) ? codeDeTache(it.data) : null
    if (code) {
        const s = seanceParCode(code)
        return { couleur: s.couleur, emoji: s.emoji }
    }
    return { couleur: it.data.categorie_couleur || '#4f46e5', emoji: '📌' }
}

function estAujourdhui(date: Date): boolean {
    const auj = new Date()
    return (
        date.getFullYear() === auj.getFullYear() &&
        date.getMonth() === auj.getMonth() &&
        date.getDate() === auj.getDate()
    )
}

export default function DayView({ rafraichir = 0, onVoirSeance }: { rafraichir?: number; onVoirSeance?: () => void }) {
    const [date, setDate] = useState(() => new Date())
    const [taches, setTaches] = useState<Tache[]>([])
    const [cours, setCours] = useState<Cours[]>([])
    const [categories, setCategories] = useState<Categorie[]>([])
    const [chargement, setChargement] = useState(true)
    const [erreur, setErreur] = useState<string | null>(null)
    const [formOuvert, setFormOuvert] = useState(false)
    const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
    const [detail, setDetail] = useState<{ item: Item; maintenant: number } | null>(null)

    // On charge toute la semaine du jour affiché : la bande « semaine » et la liste du jour s'en servent.
    const cleSemaine = debutDeSemaine(date).toDateString()
    const lundi = useMemo(() => new Date(cleSemaine), [cleSemaine])

    async function recharger() {
        setChargement(true)
        setErreur(null)
        try {
            const dimanche = new Date(lundi)
            dimanche.setDate(lundi.getDate() + 6)
            dimanche.setHours(23, 59, 59, 999)
            const [t, c, cat] = await Promise.all([getTachesEntre(lundi, dimanche), getCoursEntre(lundi, dimanche), getCategories()])
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
    }, [lundi, rafraichir])

    function changerJour(delta: number) {
        setDate((d) => {
            const nouvelle = new Date(d)
            nouvelle.setDate(nouvelle.getDate() + delta)
            return nouvelle
        })
    }

    const toutes: Item[] = [
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
    const itemsDe = (jour: Date) => toutes.filter((i) => i.debut && memeJour(i.debut, jour))
    const items = itemsDe(date)
    const semaine = Array.from({ length: 7 }, (_, i) => {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        return { jour, items: itemsDe(jour) }
    })

    function ouvrirDetail(item: Item) {
        setDetail({ item, maintenant: Date.now() })
    }

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
        setDetail(null)
        setTacheEnEdition(t)
        setFormOuvert(true)
    }

    async function basculerFait(t: Tache) {
        setDetail(null)
        await modifierTache({ id: t.id, statut: t.statut === 'fait' ? 'a_faire' : 'fait' })
        await recharger()
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

            <div className="sem" role="list" aria-label="Semaine">
                {semaine.map(({ jour, items: duJour }) => {
                    const choisi = memeJour(jour, date)
                    return (
                        <div key={jour.toDateString()} className={`sem-jour ${choisi ? 'choisi' : ''} ${estAujourdhui(jour) ? 'auj' : ''}`} role="listitem">
                            <button className="sem-tete" onClick={() => setDate(new Date(jour))} aria-label={dateLabelFormat.format(jour)}>
                                <span>{JOURS[(jour.getDay() + 6) % 7]}</span>
                                <b>{jour.getDate()}</b>
                            </button>
                            {duJour.slice(0, 4).map((it) => {
                                const v = visuel(it)
                                return (
                                    <button
                                        key={`${it.type}-${it.data.id}`}
                                        className={`sem-ev ${it.type === 'tache' && it.data.statut === 'fait' ? 'fait' : ''}`}
                                        style={{ '--ev': v.couleur } as React.CSSProperties}
                                        onClick={() => {
                                            setDate(new Date(jour))
                                            ouvrirDetail(it)
                                        }}
                                        title={it.data.titre}
                                    >
                                        <span>{v.emoji}</span>
                                        <small>{it.debut ? heureCourte(it.debut) : ''}</small>
                                    </button>
                                )
                            })}
                            {duJour.length > 4 && (
                                <button className="sem-plus" onClick={() => setDate(new Date(jour))}>
                                    +{duJour.length - 4}
                                </button>
                            )}
                        </div>
                    )
                })}
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
                            onClick={() => ouvrirDetail(item)}
                        >
                            <span className="day-item-heure">
                                <b>{item.debut ? heureFormat.format(item.debut) : '—'}</b>
                                {item.fin && <small>{heureFormat.format(item.fin)}</small>}
                            </span>
                            <span className="day-item-barre" />
                            <span className="day-item-corps">
                                <span className="day-item-titre">{item.data.titre}</span>
                                {item.type === 'tache' && item.data.categorie_nom && (
                                    <span className="day-item-categorie">{item.data.categorie_nom}</span>
                                )}
                                {item.type === 'cours' && (
                                    <span className="day-item-categorie">
                                        {[item.data.lieu && `📍 ${item.data.lieu}`, duree((item.fin.getTime() - item.debut.getTime()) / 60000)]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </span>
                                )}
                                {item.type === 'tache' && item.data.statut === 'fait' && (
                                    <span className="day-item-fait">✓ fait</span>
                                )}
                            </span>
                            <span className="day-item-chevron" aria-hidden>
                                ›
                            </span>
                        </li>
                    ))}
                </ul>
            )}

            <button className="btn-primary" onClick={ouvrirCreation}>
                + Ajouter une tâche
            </button>

            {detail && (
                <EventDetail
                    item={detail.item}
                    jour={detail.item.debut ? itemsDe(detail.item.debut) : items}
                    maintenant={detail.maintenant}
                    onFermer={() => setDetail(null)}
                    onModifier={ouvrirEdition}
                    onBasculerFait={basculerFait}
                    onVoirSeance={
                        onVoirSeance
                            ? () => {
                                  setDetail(null)
                                  onVoirSeance()
                              }
                            : undefined
                    }
                />
            )}

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
