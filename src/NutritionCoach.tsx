import { useEffect, useState } from 'react'
import {
    envoyerNutrition,
    getEtatNutrition,
    supprimerRepas,
    type Moment,
    type Objectif,
    type Repas,
    type ReponseNutrition,
} from './api'

const OBJECTIFS: { cle: Objectif; libelle: string }[] = [
    { cle: 'musculation', libelle: 'Musculation' },
    { cle: 'cardio', libelle: 'Cardio' },
    { cle: 'croissance', libelle: 'Croissance' },
    { cle: 'perte_gras', libelle: 'Moins de gras' },
    { cle: 'peau', libelle: 'Peau du visage' },
]
const PAR_DEFAUT: Objectif[] = OBJECTIFS.map((o) => o.cle)

const MOMENTS: Record<Moment, string> = {
    petit_dejeuner: 'Petit-déj',
    dejeuner: 'Déjeuner',
    diner: 'Dîner',
    collation: 'Collation',
}

const jourFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' })

function libelle(o: Objectif): string {
    return OBJECTIFS.find((x) => x.cle === o)?.libelle ?? o
}

// Affiche le texte du coach : retours à la ligne conservés, **gras** rendu en gras.
function TexteCoach({ texte }: { texte: string }) {
    const morceaux = texte.split(/(\*\*[^*]+\*\*)/g)
    return (
        <p className="coach-texte">
            {morceaux.map((m, i) =>
                m.startsWith('**') && m.endsWith('**') ? <strong key={i}>{m.slice(2, -2)}</strong> : m
            )}
        </p>
    )
}

export default function NutritionCoach() {
    const [priorites, setPriorites] = useState<Objectif[]>(PAR_DEFAUT)
    const [prioritesServeur, setPrioritesServeur] = useState<Objectif[]>(PAR_DEFAUT)
    const [repas, setRepas] = useState<Repas[]>([])
    const [texte, setTexte] = useState('')
    const [reponse, setReponse] = useState<ReponseNutrition | null>(null)
    const [voirDetail, setVoirDetail] = useState(false)
    const [enCours, setEnCours] = useState<null | 'repas' | 'bilan' | 'objectifs'>(null)
    const [erreur, setErreur] = useState<string | null>(null)

    async function recharger() {
        try {
            const etat = await getEtatNutrition()
            const p = etat.priorites.length ? etat.priorites : PAR_DEFAUT
            setPriorites(p)
            setPrioritesServeur(p)
            setRepas(etat.repas_semaine)
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Erreur de chargement.')
        }
    }

    useEffect(() => {
        recharger()
    }, [])

    async function demander(type: 'repas' | 'bilan' | 'objectifs') {
        setEnCours(type)
        setErreur(null)
        setVoirDetail(type === 'bilan')
        try {
            const r =
                type === 'repas'
                    ? await envoyerNutrition({ texte: texte.trim() })
                    : type === 'bilan'
                      ? await envoyerNutrition({ action: 'bilan' })
                      : await envoyerNutrition({ action: 'objectifs', objectifs: priorites })
            setReponse(r)
            if (type === 'repas') setTexte('')
            await recharger()
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
        } finally {
            setEnCours(null)
        }
    }

    // Toucher un objectif le fait passer en priorité n°1.
    function mettreEnAvant(o: Objectif) {
        setPriorites((p) => [o, ...p.filter((x) => x !== o)])
    }

    async function retirer(r: Repas) {
        if (!window.confirm(`Retirer « ${r.description} » de ton journal ?`)) return
        try {
            await supprimerRepas(r.id)
            await recharger()
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
        }
    }

    const prioritesModifiees = priorites.join() !== prioritesServeur.join()

    return (
        <section className="card coach">
            <h2>Coach nutrition</h2>

            <p className="muted">Mes priorités (touche un objectif pour le mettre en avant) :</p>
            <ul className="categories coach-objectifs">
                {priorites.map((o, i) => (
                    <li key={o}>
                        <button
                            className={`chip coach-chip ${i === 0 ? 'coach-chip-top' : ''}`}
                            onClick={() => mettreEnAvant(o)}
                            disabled={enCours !== null}
                        >
                            {i + 1}. {libelle(o)}
                        </button>
                    </li>
                ))}
            </ul>
            {prioritesModifiees && (
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setPriorites(prioritesServeur)} disabled={enCours !== null}>
                        Annuler
                    </button>
                    <button className="btn-primary" onClick={() => demander('objectifs')} disabled={enCours !== null}>
                        {enCours === 'objectifs' ? 'Enregistrement…' : 'Enregistrer mes priorités'}
                    </button>
                </div>
            )}

            <form
                className="task-form coach-form"
                onSubmit={(e) => {
                    e.preventDefault()
                    if (texte.trim()) demander('repas')
                }}
            >
                <label>
                    Qu'est-ce que tu as mangé ?
                    <textarea
                        value={texte}
                        onChange={(e) => setTexte(e.target.value)}
                        placeholder="Ex. : ce midi des pâtes au thon et un yaourt"
                        rows={2}
                        disabled={enCours !== null}
                    />
                </label>
                <div className="modal-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => demander('bilan')}
                        disabled={enCours !== null}
                    >
                        {enCours === 'bilan' ? 'Bilan en cours…' : 'Bilan de ma semaine'}
                    </button>
                    <button type="submit" className="btn-primary" disabled={enCours !== null || !texte.trim()}>
                        {enCours === 'repas' ? 'Analyse…' : 'Analyser'}
                    </button>
                </div>
            </form>

            {erreur && <p className="form-error">{erreur}</p>}

            {reponse && reponse.reponse && (
                <div className="coach-reponse">
                    <TexteCoach texte={reponse.reponse} />
                    {reponse.manques.length > 0 && (
                        <p className="coach-manques">
                            <span>Il te manque :</span>{' '}
                            {reponse.manques.map((m) => (
                                <span key={m} className="coach-manque">
                                    {m}
                                </span>
                            ))}
                        </p>
                    )}
                    {reponse.suggestions.length > 0 && (
                        <ul className="coach-suggestions">
                            {reponse.suggestions.map((s, i) => (
                                <li key={i}>
                                    <strong>{s.aliment}</strong>
                                    {s.comment ? ` : ${s.comment}` : ''}
                                    {s.nutriment ? <span className="muted"> ({s.nutriment})</span> : null}
                                </li>
                            ))}
                        </ul>
                    )}
                    {reponse.detail && (
                        <>
                            <button className="btn-link" onClick={() => setVoirDetail((v) => !v)}>
                                {voirDetail ? 'Masquer le détail' : 'Voir le détail'}
                            </button>
                            {voirDetail && <TexteCoach texte={reponse.detail} />}
                        </>
                    )}
                </div>
            )}

            <h3 className="coach-titre">Cette semaine</h3>
            {repas.length === 0 ? (
                <p className="muted">Aucun repas noté depuis lundi.</p>
            ) : (
                <ul className="coach-journal">
                    {repas.map((r) => (
                        <li key={r.id}>
                            <span className="coach-quand">
                                {jourFormat.format(new Date(r.date))}
                                <br />
                                {MOMENTS[r.moment] ?? r.moment}
                            </span>
                            <span className="coach-repas">
                                {r.description}
                                {r.nutriments.length > 0 && (
                                    <span className="muted coach-nutriments">{r.nutriments.join(' · ')}</span>
                                )}
                            </span>
                            <button className="btn-icon coach-retirer" onClick={() => retirer(r)} aria-label="Retirer ce repas">
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
