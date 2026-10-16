import Repliable from './Repliable'
import { useState } from 'react'
import {
    creerTache,
    getCategories,
    getCoursEntre,
    getTachesEntre,
    supprimerTache,
    type Tache,
} from './api'
import { SALLE, SEANCES_SALLE } from './programme'
import {
    MARQUEUR,
    debutDeSemaine,
    descriptionSeance,
    enregistrerReglages,
    lireReglages,
    planifierSemaine,
    titreSeance,
    type Creneau,
    type Reglages,
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
    const [reglages, setReglages] = useState<Reglages>(() => lireReglages())
    const [voirReglages, setVoirReglages] = useState(false)

    const lundi = lundiDe(semaine)
    const dimanche = finDeSemaine(lundi)
    const occupe = etape === 'calcul' || etape === 'enregistrement'

    function changerReglage<K extends keyof Reglages>(cle: K, valeur: Reglages[K]) {
        const r = { ...reglages, [cle]: valeur }
        setReglages(r)
        enregistrerReglages(r)
        setEtape('repos')
    }

    async function proposer() {
        setEtape('calcul')
        setErreur(null)
        try {
            const [cours, taches] = await Promise.all([getCoursEntre(lundi, dimanche), getTachesEntre(lundi, dimanche)])
            const dejaAuto = taches.filter((t) => t.description?.includes(MARQUEUR))
            const autres = taches.filter((t) => !t.description?.includes(MARQUEUR))
            setExistantes(dejaAuto)
            setPropositions(planifierSemaine(lundi, cours, autres, reglages))
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
            // La tâche couvre tout l'aller-retour : le rappel arrive avant de partir.
            for (const p of propositions) {
                await creerTache({
                    titre: titreSeance(p.seance),
                    description: descriptionSeance(p),
                    categorie_id: sport ? sport.id : null,
                    date_debut: p.depart.toISOString(),
                    date_fin: p.retour.toISOString(),
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
        <Repliable cle="agenda.sport" className="card sport-planner" titre="🏋️ Séances de sport">
            <p className="muted">
                {SEANCES_SALLE.length} séances au {SALLE.nom} (2 muscu de {reglages.duree} min et 1 cardio){reglages.seanceMaison ? ', + 1 à la maison' : ''}, placées autour de tes cours en comptant les
                trajets.
            </p>

            <button className="btn-link sport-reglages-lien" onClick={() => setVoirReglages((v) => !v)}>
                {voirReglages ? 'Masquer mes contraintes' : 'Mes contraintes (trajets, horaires)'}
            </button>
            {voirReglages && (
                <div className="task-form sport-reglages">
                    <div className="form-row">
                        <label>
                            Trajet IUT → maison (min)
                            <input
                                type="number"
                                min={0}
                                value={reglages.trajetIut}
                                onChange={(e) => changerReglage('trajetIut', Number(e.target.value) || 0)}
                            />
                        </label>
                        <label>
                            Trajet maison → salle (min)
                            <input
                                type="number"
                                min={0}
                                value={reglages.trajetSalle}
                                onChange={(e) => changerReglage('trajetSalle', Number(e.target.value) || 0)}
                            />
                        </label>
                    </div>
                    <div className="form-row">
                        <label>
                            Durée de la séance muscu (min)
                            <input
                                type="number"
                                min={15}
                                step={5}
                                value={reglages.duree}
                                onChange={(e) => changerReglage('duree', Number(e.target.value) || 45)}
                            />
                        </label>
                        <label>
                            Rentré avant
                            <input
                                type="time"
                                value={reglages.retourAvant}
                                onChange={(e) => changerReglage('retourAvant', e.target.value || '20:00')}
                            />
                        </label>
                        <label>
                            Pas de départ avant
                            <input
                                type="time"
                                value={reglages.departAuPlusTot}
                                onChange={(e) => changerReglage('departAuPlusTot', e.target.value || '08:00')}
                            />
                        </label>
                    </div>
                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={reglages.seanceMaison}
                            onChange={(e) => changerReglage('seanceMaison', e.target.checked)}
                        />
                        Ajouter une séance à la maison (élastiques)
                    </label>
                    {reglages.seanceMaison && (
                        <div className="form-row">
                            <label>
                                Séance maison finie avant
                                <input
                                    type="time"
                                    value={reglages.maisonAvant}
                                    onChange={(e) => changerReglage('maisonAvant', e.target.value || '22:00')}
                                />
                            </label>
                        </div>
                    )}
                    <p className="muted sport-periode">
                        Le trajet vers la salle compte à l’aller et au retour. Après un cours, l’app compte le trajet
                        IUT → maison avant de te faire partir à la salle.
                    </p>
                </div>
            )}

            <div className="segmented" role="group" aria-label="Semaine">
                <button
                    className={semaine === 'courante' ? 'actif' : ''}
                    onClick={() => {
                        setSemaine('courante')
                        setEtape('repos')
                    }}
                    disabled={occupe}
                >
                    Cette semaine
                </button>
                <button
                    className={semaine === 'prochaine' ? 'actif' : ''}
                    onClick={() => {
                        setSemaine('prochaine')
                        setEtape('repos')
                    }}
                    disabled={occupe}
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
                        <p className="muted">Aucun créneau possible cette semaine avec ces contraintes.</p>
                    ) : (
                        <ul className="sport-liste">
                            {propositions.map((p) => (
                                <li key={p.seance.code} className="sport-item">
                                    <span className="sport-quand" style={{ color: p.seance.couleur }}>
                                        {jourFormat.format(p.debut)}
                                        <br />
                                        {heureFormat.format(p.debut)}–{heureFormat.format(p.fin)}
                                    </span>
                                    <span className="sport-quoi">
                                        <strong>Séance {p.seance.code}</strong> · {p.seance.court}
                                        <span className="muted sport-trajet">
                                            {p.seance.lieu === 'maison'
                                                ? 'À la maison, sans trajet'
                                                : `Départ ${heureFormat.format(p.depart)} · retour ${heureFormat.format(p.retour)}`}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {propositions.length > 0 && propositions.length < SEANCES_SALLE.length + (reglages.seanceMaison ? 1 : 0) && (
                        <p className="muted">Seulement {propositions.length} créneau(x) possible(s) cette semaine.</p>
                    )}
                    {existantes.length > 0 && (
                        <p className="muted">
                            Les {existantes.length} séance(s) déjà programmée(s) cette semaine seront remplacées.
                        </p>
                    )}
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setEtape('repos')} disabled={etape === 'enregistrement'}>
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
                        ✅ {propositions.length} séance(s) ajoutée(s) à ton agenda, trajets compris. Le rappel arrive avant
                        l’heure de départ (ou avant la séance à la maison) si les notifications sont activées.
                    </p>
                    <button className="btn-secondary sport-refaire" onClick={() => setEtape('repos')}>
                        Reprogrammer
                    </button>
                </>
            )}
        </Repliable>
    )
}
