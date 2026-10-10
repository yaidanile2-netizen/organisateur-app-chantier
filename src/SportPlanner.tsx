import { useState } from 'react'
import {
    creerTache,
    getCategories,
    getCoursEntre,
    getTachesEntre,
    supprimerTache,
    type Tache,
} from './api'
import {
    DUREE_MIN,
    MARQUEUR,
    SEANCES,
    debutDeSemaine,
    descriptionSeance,
    planifierSemaine,
    type Creneau,
} from './sport'

type Semaine = 'courante' | 'prochaine'
type Etape = 'repos' | 'calcul' | 'apercu' | 'enregistrement' | 'fait'

const jourFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const heureFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const dateCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' })

function lundiDe(semaine: Semaine): Date {
    const lundi = debutDeSemaine(new Date())
    if (semaine === 'prochaine') lundi.setDate(lundi.getDate() + 7)
    return lundi
}

function finDeSemaine(lundi: Date): Date {
    const dimanche = new Date(lundi)
    dimanche.setDate(lundi.getDate() + 6)
    dimanche.setHours(23, 59, 59, 999)
    return dimanche
}

export default function SportPlanner({ onPlanifie }: { onPlanifie: () => void }) {
    // Du vendredi au dimanche, on propose par défaut la semaine suivante.
    const [semaine, setSemaine] = useState<Semaine>(() =>
        [0, 5, 6].includes(new Date().getDay()) ? 'prochaine' : 'courante'
    )
    const [etape, setEtape] = useState<Etape>('repos')
    const [propositions, setPropositions] = useState<Creneau[]>([])
    const [existantes, setExistantes] = useState<Tache[]>([])
    const [erreur, setErreur] = useState<string | null>(null)

    const lundi = lundiDe(semaine)
    const dimanche = finDeSemaine(lundi)

    async function proposer() {
        setEtape('calcul')
        setErreur(null)
        try {
            const [cours, taches] = await Promise.all([
                getCoursEntre(lundi, dimanche),
                getTachesEntre(lundi, dimanche),
            ])
            const dejaAuto = taches.filter((t) => t.description?.includes(MARQUEUR))
            const autres = taches.filter((t) => !t.description?.includes(MARQUEUR))
            setExistantes(dejaAuto)
            setPropositions(planifierSemaine(lundi, cours, autres))
            setEtape('apercu')
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
            setEtape('repos')
        }
    }

    async function valider() {
        setEtape('enregistrement')
        setErreur(null)
        try {
            const categories = await getCategories()
            const sport = categories.find((c) => c.nom.toLowerCase() === 'sport')
            for (const t of existantes) {
                await supprimerTache(t.id)
            }
            for (const p of propositions) {
                await creerTache({
                    titre: `Séance ${p.seance.code} · ${p.seance.titre}`,
                    description: descriptionSeance(p.seance),
                    categorie_id: sport ? sport.id : null,
                    date_debut: p.debut.toISOString(),
                    date_fin: p.fin.toISOString(),
                    toute_la_journee: false,
                    statut: 'a_faire',
                    priorite: 'normale',
                })
            }
            setEtape('fait')
            onPlanifie()
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
            setEtape('apercu')
        }
    }

    return (
        <section className="card sport-planner">
            <h2>Séances de sport</h2>
            <p className="muted">
                {SEANCES.length} séances de ~{DUREE_MIN} min par semaine (programme élastiques),
                placées automatiquement autour de tes cours et de tes tâches.
            </p>

            <div className="segmented" role="group" aria-label="Semaine">
                <button
                    className={semaine === 'courante' ? 'actif' : ''}
                    onClick={() => {
                        setSemaine('courante')
                        setEtape('repos')
                    }}
                    disabled={etape === 'calcul' || etape === 'enregistrement'}
                >
                    Cette semaine
                </button>
                <button
                    className={semaine === 'prochaine' ? 'actif' : ''}
                    onClick={() => {
                        setSemaine('prochaine')
                        setEtape('repos')
                    }}
                    disabled={etape === 'calcul' || etape === 'enregistrement'}
                >
                    Semaine prochaine
                </button>
            </div>
            <p className="muted sport-periode">
                Du lundi {dateCourte.format(lundi)} au dimanche {dateCourte.format(dimanche)}
            </p>

            {erreur && <p className="form-error">{erreur}</p>}

            {(etape === 'repos' || etape === 'calcul') && (
                <button className="btn-primary" onClick={proposer} disabled={etape === 'calcul'}>
                    {etape === 'calcul' ? 'Recherche des créneaux…' : 'Proposer mes séances'}
                </button>
            )}

            {(etape === 'apercu' || etape === 'enregistrement') && (
                <>
                    {propositions.length === 0 ? (
                        <p className="muted">
                            Aucun créneau libre de {DUREE_MIN} min trouvé sur cette période.
                        </p>
                    ) : (
                        <ul className="sport-liste">
                            {propositions.map((p) => (
                                <li key={p.seance.code} className="sport-item">
                                    <span className="sport-quand">
                                        {jourFormat.format(p.debut)}
                                        <br />
                                        {heureFormat.format(p.debut)}–{heureFormat.format(p.fin)}
                                    </span>
                                    <span className="sport-quoi">
                                        <strong>Séance {p.seance.code}</strong> · {p.seance.titre}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {propositions.length > 0 && propositions.length < SEANCES.length && (
                        <p className="muted">
                            Seulement {propositions.length} créneau(x) libre(s) cette semaine.
                        </p>
                    )}
                    {existantes.length > 0 && (
                        <p className="muted">
                            Les {existantes.length} séance(s) déjà programmée(s) cette semaine seront remplacées.
                        </p>
                    )}
                    <div className="modal-actions">
                        <button
                            className="btn-secondary"
                            onClick={() => setEtape('repos')}
                            disabled={etape === 'enregistrement'}
                        >
                            Annuler
                        </button>
                        {propositions.length > 0 && (
                            <button className="btn-primary" onClick={valider} disabled={etape === 'enregistrement'}>
                                {etape === 'enregistrement' ? 'Ajout…' : 'Ajouter à mon agenda'}
                            </button>
                        )}
                    </div>
                </>
            )}

            {etape === 'fait' && (
                <>
                    <p className="status">
                        ✅ {propositions.length} séance(s) ajoutée(s) à ton agenda, avec rappel avant chaque séance si les
                        notifications sont activées.
                    </p>
                    <button className="btn-secondary sport-refaire" onClick={() => setEtape('repos')}>
                        Reprogrammer
                    </button>
                </>
            )}
        </section>
    )
}
