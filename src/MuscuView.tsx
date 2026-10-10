import { useEffect, useState } from 'react'
import { getTachesEntre, modifierTache, type Tache } from './api'
import { PROGRAMME, SALLE, seanceParCode, type Exercice } from './programme'
import { MARQUEUR, codeDeTache } from './sport'

type Code = 'A' | 'B' | 'C'
type Historique = { date: string; code: Code }[]

// Suivi personnel (charges, séries cochées, historique) gardé sur l'appareil.
function lire<T>(cle: string, defaut: T): T {
    try {
        const brut = localStorage.getItem(cle)
        return brut ? (JSON.parse(brut) as T) : defaut
    } catch {
        return defaut
    }
}
function ecrire(cle: string, valeur: unknown): void {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur))
    } catch {
        // stockage indisponible : le suivi reste valable tant que la page est ouverte
    }
}

const jourFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
const heureFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

function memeJour(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function MuscuView() {
    const [prochaines, setProchaines] = useState<Tache[]>([])
    const [code, setCode] = useState<Code>('A')
    const [charges, setCharges] = useState<Record<string, string>>(() => lire('muscu.charges', {}))
    const [series, setSeries] = useState<Record<string, boolean[]>>(() => lire('muscu.series', {}))
    const [historique, setHistorique] = useState<Historique>(() => lire('muscu.historique', []))
    const [repos, setRepos] = useState(0)
    const [message, setMessage] = useState<string | null>(null)

    useEffect(() => {
        const debut = new Date()
        debut.setHours(0, 0, 0, 0)
        const fin = new Date(debut)
        fin.setDate(fin.getDate() + 14)
        getTachesEntre(debut, fin)
            .then((taches) => {
                const auto = taches
                    .filter((t) => t.description?.includes(MARQUEUR) && t.statut !== 'fait' && t.statut !== 'annule')
                    .sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || ''))
                setProchaines(auto)
                const c = auto[0] && codeDeTache(auto[0])
                if (c) setCode(c)
            })
            .catch(() => setProchaines([]))
    }, [])

    useEffect(() => {
        if (repos <= 0) return
        const id = window.setTimeout(() => {
            if (repos === 1 && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
            setRepos((r) => r - 1)
        }, 1000)
        return () => window.clearTimeout(id)
    }, [repos])

    const seance = seanceParCode(code)
    const exercices = seance.blocs.flatMap((b) => b.exercices)
    const total = exercices.reduce((n, e) => n + e.series, 0)
    const faites = exercices.reduce((n, e) => n + (series[e.id] || []).filter(Boolean).length, 0)
    const prochaine = prochaines[0]

    function changerCharge(id: string, valeur: string) {
        const c = { ...charges, [id]: valeur }
        setCharges(c)
        ecrire('muscu.charges', c)
    }

    function basculerSerie(e: Exercice, i: number) {
        const actuelles = series[e.id] ? [...series[e.id]] : Array(e.series).fill(false)
        actuelles[i] = !actuelles[i]
        const s = { ...series, [e.id]: actuelles }
        setSeries(s)
        ecrire('muscu.series', s)
    }

    async function terminer() {
        const h = [{ date: new Date().toISOString(), code }, ...historique].slice(0, 30)
        setHistorique(h)
        ecrire('muscu.historique', h)
        const s = { ...series }
        for (const e of exercices) delete s[e.id]
        setSeries(s)
        ecrire('muscu.series', s)
        setRepos(0)
        // Marque la séance prévue aujourd'hui comme faite dans l'agenda.
        const duJour = prochaines.find(
            (t) => t.date_debut && memeJour(new Date(t.date_debut), new Date()) && codeDeTache(t) === code
        )
        if (duJour) {
            try {
                await modifierTache({ id: duJour.id, statut: 'fait' })
                setProchaines((p) => p.filter((t) => t.id !== duJour.id))
                setMessage(`Séance ${code} terminée et cochée dans ton agenda. Bravo 💪`)
                return
            } catch {
                // l'agenda n'a pas pu être mis à jour : la séance reste enregistrée ici
            }
        }
        setMessage(`Séance ${code} terminée. Bravo 💪`)
    }

    return (
        <>
            <section className="card muscu-entete">
                <h2>Muscu · {SALLE.nom}</h2>
                <p className="muted">{SALLE.horaires} · 3 séances de 30 min par semaine, dont une de cardio.</p>
                {prochaine && prochaine.date_debut ? (
                    <p className="muscu-prochaine">
                        Prochaine séance : <strong>{jourFormat.format(new Date(prochaine.date_debut))}</strong>, départ{' '}
                        {heureFormat.format(new Date(prochaine.date_debut))} · Séance {codeDeTache(prochaine) ?? '?'}
                    </p>
                ) : (
                    <p className="muted">Aucune séance programmée : utilise « Séances à la salle » dans l’onglet Agenda.</p>
                )}
            </section>

            <div className="muscu-onglets">
                {PROGRAMME.map((s) => (
                    <button
                        key={s.code}
                        className={`muscu-onglet ${s.code === code ? 'actif' : ''}`}
                        style={{ '--chip-color': s.couleur } as React.CSSProperties}
                        onClick={() => {
                            setCode(s.code)
                            setMessage(null)
                        }}
                    >
                        <span className="muscu-onglet-code">{s.code}</span>
                        <span className="muscu-onglet-titre">{s.titre}</span>
                    </button>
                ))}
            </div>

            <section className="card muscu-seance" style={{ '--chip-color': seance.couleur } as React.CSSProperties}>
                <h2>
                    Séance {seance.code} · {seance.titre}
                </h2>
                <p className="muted">{seance.focus}</p>
                <div className="muscu-progression">
                    <div className="muscu-barre">
                        <div style={{ width: `${total ? Math.round((faites / total) * 100) : 0}%` }} />
                    </div>
                    <span>
                        {faites}/{total} séries
                    </span>
                </div>

                <h3 className="muscu-sous-titre">Échauffement</h3>
                <ul className="muscu-liste">
                    {seance.echauffement.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>

                {seance.blocs.map((bloc) => (
                    <div key={bloc.titre} className="muscu-bloc">
                        <h3 className="muscu-sous-titre">{bloc.titre}</h3>
                        {bloc.info && <p className="muted muscu-info">{bloc.info}</p>}
                        {bloc.exercices.map((e) => (
                            <div key={e.id} className="muscu-exo">
                                <div className="muscu-exo-tete">
                                    <strong>{e.nom}</strong>
                                    <span className="muscu-cible">
                                        {e.series} × {e.reps}
                                    </span>
                                </div>
                                <p className="muted muscu-machine">{e.machine}</p>
                                <ul className="muscu-consignes">
                                    {e.consignes.map((c) => (
                                        <li key={c}>{c}</li>
                                    ))}
                                </ul>
                                {e.alternative && (
                                    <p className="muted muscu-alternative">Si la machine est prise : {e.alternative}</p>
                                )}
                                <div className="muscu-suivi">
                                    {e.charge !== false && (
                                        <label className="muscu-charge">
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                step="0.5"
                                                min="0"
                                                placeholder="—"
                                                value={charges[e.id] ?? ''}
                                                onChange={(ev) => changerCharge(e.id, ev.target.value)}
                                                aria-label={`Charge pour ${e.nom}`}
                                            />
                                            kg
                                        </label>
                                    )}
                                    <div className="muscu-series">
                                        {Array.from({ length: e.series }, (_, i) => {
                                            const fait = !!(series[e.id] || [])[i]
                                            return (
                                                <button
                                                    key={i}
                                                    className={`muscu-serie ${fait ? 'fait' : ''}`}
                                                    onClick={() => basculerSerie(e, i)}
                                                    aria-label={`Série ${i + 1} ${fait ? 'faite' : 'à faire'}`}
                                                >
                                                    {fait ? '✓' : i + 1}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}

                <h3 className="muscu-sous-titre">Retour au calme</h3>
                <ul className="muscu-liste">
                    {seance.retourAuCalme.map((l) => (
                        <li key={l}>{l}</li>
                    ))}
                </ul>

                {seance.code !== 'C' && (
                    <p className="muted muscu-conseil">
                        Progression : quand tu réussis toutes les séries en haut de la fourchette de répétitions avec une
                        bonne technique, monte d’un cran à la séance suivante. Pas de charge maximale : la technique
                        d’abord.
                    </p>
                )}

                <div className="modal-actions muscu-actions">
                    <button className="btn-secondary" onClick={() => setRepos(repos > 0 ? 0 : 60)}>
                        {repos > 0 ? `Repos : ${repos} s (arrêter)` : '⏱ Repos 60 s'}
                    </button>
                    <button className="btn-primary" onClick={terminer}>
                        Séance terminée
                    </button>
                </div>
                {message && <p className="status">{message}</p>}
            </section>

            {historique.length > 0 && (
                <section className="card">
                    <h2>Mes dernières séances</h2>
                    <ul className="muscu-historique">
                        {historique.slice(0, 6).map((h) => (
                            <li key={h.date}>
                                <span>{jourFormat.format(new Date(h.date))}</span>
                                <span style={{ color: seanceParCode(h.code).couleur }}>
                                    Séance {h.code} · {seanceParCode(h.code).titre}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    )
}
