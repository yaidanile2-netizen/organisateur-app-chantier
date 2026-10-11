// Carte « Révisions » de l'onglet Agenda : échéances à venir, ajout d'une échéance, et placement des heures d'étude.
import { useEffect, useState } from 'react'
import { creerTache, getCategories, getCoursEntre, getTachesEntre, supprimerTache, type Tache } from './api'
import {
    MARQUEUR_ECHEANCE,
    MARQUEUR_ETUDE,
    TYPES_ECHEANCE,
    descriptionBloc,
    echeances,
    enregistrerReglagesEtudes,
    lireReglagesEtudes,
    planifierEtudes,
    titreBloc,
    type BlocEtude,
    type Echeance,
    type ReglagesEtudes,
    type TypeEcheance,
} from './etudes'
import { debutDeSemaine } from './sport'
import { duree } from './temps'

type Semaine = 'courante' | 'prochaine'
type Etape = 'repos' | 'calcul' | 'apercu' | 'enregistrement' | 'fait'

const JOUR = 24 * 3600 * 1000
const jourFormat = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const heureFormat = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })

function lundiDe(semaine: Semaine): Date {
    const lundi = debutDeSemaine(new Date())
    if (semaine === 'prochaine') lundi.setDate(lundi.getDate() + 7)
    return lundi
}

async function categorieCours(): Promise<number | null> {
    const cats = await getCategories()
    return (cats.find((c) => /cours|[ée]tude/i.test(c.nom)) ?? null)?.id ?? null
}

function Points({ faits, total, couleur }: { faits: number; total: number; couleur: string }) {
    return (
        <span className="et-points" style={{ '--t': couleur } as React.CSSProperties} aria-label={`${faits} sur ${total} blocs prévus`}>
            {Array.from({ length: total }, (_, i) => (
                <i key={i} className={i < faits ? 'ok' : ''} />
            ))}
        </span>
    )
}

export default function EtudesPlanner({ onPlanifie, version = 0 }: { onPlanifie: () => void; version?: number }) {
    const [semaine, setSemaine] = useState<Semaine>(() => ([0, 6].includes(new Date().getDay()) ? 'prochaine' : 'courante'))
    const [etape, setEtape] = useState<Etape>('repos')
    const [aVenir, setAVenir] = useState<Echeance[] | null>(null)
    const [propositions, setPropositions] = useState<BlocEtude[]>([])
    const [manques, setManques] = useState<{ echeance: Echeance; manque: number }[]>([])
    const [aRemplacer, setARemplacer] = useState<Tache[]>([])
    const [erreur, setErreur] = useState<string | null>(null)
    const [reglages, setReglages] = useState<ReglagesEtudes>(() => lireReglagesEtudes())
    const [voirReglages, setVoirReglages] = useState(false)
    const [ajout, setAjout] = useState<{ type: TypeEcheance; matiere: string; date: string; heure: string; blocs: number } | null>(null)

    // Échéances des 3 prochaines semaines (pour le tableau « À venir »).
    useEffect(() => {
        let annule = false
        const maintenant = new Date()
        const fin = new Date(maintenant.getTime() + 21 * JOUR)
        Promise.all([getCoursEntre(maintenant, fin), getTachesEntre(new Date(maintenant.getTime() - 21 * JOUR), fin)])
            .then(([cours, taches]) => {
                if (!annule) setAVenir(echeances(cours, taches, maintenant, fin))
            })
            .catch(() => {
                if (!annule) setAVenir([])
            })
        return () => {
            annule = true
        }
    }, [version, etape])

    const lundi = lundiDe(semaine)
    const dimanche = new Date(lundi.getTime() + 7 * JOUR - 1)
    const occupe = etape === 'calcul' || etape === 'enregistrement'

    function changerReglage<K extends keyof ReglagesEtudes>(cle: K, valeur: ReglagesEtudes[K]) {
        const r = { ...reglages, [cle]: valeur }
        setReglages(r)
        enregistrerReglagesEtudes(r)
        setEtape('repos')
    }

    async function proposer() {
        setEtape('calcul')
        setErreur(null)
        try {
            const maintenant = new Date()
            const finFenetre = new Date(dimanche.getTime() + 14 * JOUR)
            const [cours, taches] = await Promise.all([
                getCoursEntre(lundi, finFenetre),
                getTachesEntre(new Date(lundi.getTime() - 21 * JOUR), finFenetre),
            ])
            // Les blocs déjà placés cette semaine et pas encore faits sont recalculés.
            const remplacees = taches.filter(
                (t) =>
                    t.description?.includes(MARQUEUR_ETUDE) &&
                    t.statut !== 'fait' &&
                    t.date_debut &&
                    new Date(t.date_debut) >= lundi &&
                    new Date(t.date_debut) <= dimanche &&
                    new Date(t.date_debut) > maintenant,
            )
            const gardees = taches.filter((t) => !remplacees.includes(t))
            const liste = echeances(cours, gardees, maintenant, finFenetre)
            const { blocs, restants } = planifierEtudes(lundi, cours, gardees, liste, reglages, maintenant)
            setARemplacer(remplacees)
            setPropositions(blocs)
            setManques(restants)
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
            const categorie = await categorieCours()
            for (const t of aRemplacer) await supprimerTache(t.id)
            for (const b of propositions) {
                await creerTache({
                    titre: titreBloc(b.echeance),
                    description: descriptionBloc(b),
                    categorie_id: categorie,
                    date_debut: b.debut.toISOString(),
                    date_fin: b.fin.toISOString(),
                    toute_la_journee: false,
                    statut: 'a_faire',
                    priorite: TYPES_ECHEANCE[b.echeance.type].priorite === 1 ? 'haute' : 'normale',
                })
            }
            setEtape('fait')
            onPlanifie()
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
            setEtape('apercu')
        }
    }

    async function ajouterEcheance() {
        if (!ajout || !ajout.matiere.trim() || !ajout.date) return
        setErreur(null)
        try {
            const t = TYPES_ECHEANCE[ajout.type]
            const debut = new Date(`${ajout.date}T${ajout.heure || '08:00'}`)
            const nom = { ds: 'DS', soutenance: 'Soutenance', projet: 'Projet', tp: 'TP', td: 'TD' }[ajout.type]
            await creerTache({
                titre: `${t.emoji} ${nom} · ${ajout.matiere.trim()}`,
                description: `${MARQUEUR_ECHEANCE} ${ajout.type} prepa=${ajout.blocs}`,
                categorie_id: await categorieCours(),
                date_debut: debut.toISOString(),
                date_fin: new Date(debut.getTime() + 60 * 60000).toISOString(),
                toute_la_journee: false,
                statut: 'a_faire',
                priorite: t.priorite === 1 ? 'haute' : 'normale',
            })
            setAjout(null)
            setEtape('repos')
            onPlanifie()
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Impossible d’ajouter cette échéance.')
        }
    }

    const importantes = (aVenir || []).filter((e) => e.source !== 'preparation')
    const preparations = (aVenir || []).filter((e) => e.source === 'preparation')

    return (
        <section className="card etudes">
            <h2>📚 Révisions</h2>
            <p className="muted">
                Des blocs de {reglages.bloc} min placés avant tes DS et soutenances d’abord, puis tes projets, TP et TD — au plus{' '}
                {duree(reglages.maxJourCours)} un jour de cours.
            </p>

            <h3 className="et-h3">À venir (3 semaines)</h3>
            {aVenir === null ? (
                <p className="muted">Chargement…</p>
            ) : importantes.length === 0 ? (
                <p className="muted">Aucun DS ni soutenance dans les 3 prochaines semaines.</p>
            ) : (
                <table className="et-table">
                    <tbody>
                        {importantes.map((e) => {
                            const t = TYPES_ECHEANCE[e.type]
                            const jours = Math.max(0, Math.ceil((e.date.getTime() - Date.parse(new Date().toDateString())) / JOUR))
                            return (
                                <tr key={e.cle}>
                                    <td className="et-quand">
                                        <b>{jourFormat.format(e.date)}</b>
                                        <small>{jours === 0 ? 'aujourd’hui' : jours === 1 ? 'demain' : `dans ${jours} j`}</small>
                                    </td>
                                    <td>
                                        <span className="type-badge" style={{ '--t': t.couleur } as React.CSSProperties}>
                                            {e.type === 'soutenance' ? 'ORAL' : e.type.toUpperCase()}
                                        </span>
                                        {e.matiere}
                                    </td>
                                    <td className="et-droite">
                                        <Points faits={Math.min(e.faits, e.blocs)} total={e.blocs} couleur={t.couleur} />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
            {preparations.length > 0 && (
                <p className="et-prep">
                    + {preparations.filter((p) => p.type === 'tp').length} TP et {preparations.filter((p) => p.type === 'td').length} TD à préparer (1 bloc
                    par matière et par semaine, s’il reste de la place).
                </p>
            )}

            {ajout ? (
                <div className="task-form et-ajout">
                    <div className="form-row">
                        <label>
                            Type
                            <select
                                value={ajout.type}
                                onChange={(e) => {
                                    const type = e.target.value as TypeEcheance
                                    setAjout({ ...ajout, type, blocs: TYPES_ECHEANCE[type].blocs })
                                }}
                            >
                                {(Object.keys(TYPES_ECHEANCE) as TypeEcheance[]).map((k) => (
                                    <option key={k} value={k}>
                                        {TYPES_ECHEANCE[k].emoji} {TYPES_ECHEANCE[k].libelle}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Matière
                            <input type="text" value={ajout.matiere} placeholder="ex. Thermique" onChange={(e) => setAjout({ ...ajout, matiere: e.target.value })} />
                        </label>
                    </div>
                    <div className="form-row">
                        <label>
                            Date
                            <input type="date" value={ajout.date} onChange={(e) => setAjout({ ...ajout, date: e.target.value })} />
                        </label>
                        <label>
                            Heure
                            <input type="time" value={ajout.heure} onChange={(e) => setAjout({ ...ajout, heure: e.target.value })} />
                        </label>
                        <label>
                            Prépa
                            <select value={ajout.blocs} onChange={(e) => setAjout({ ...ajout, blocs: Number(e.target.value) })}>
                                {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                                    <option key={n} value={n}>
                                        {n} × {reglages.bloc} min
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setAjout(null)}>
                            Annuler
                        </button>
                        <button className="btn-primary" onClick={ajouterEcheance} disabled={!ajout.matiere.trim() || !ajout.date}>
                            Ajouter
                        </button>
                    </div>
                </div>
            ) : (
                <button className="btn-link" onClick={() => setAjout({ type: 'ds', matiere: '', date: '', heure: '08:00', blocs: TYPES_ECHEANCE.ds.blocs })}>
                    + Ajouter un DS, une soutenance, un projet…
                </button>
            )}

            <button className="btn-link sport-reglages-lien" onClick={() => setVoirReglages((v) => !v)}>
                {voirReglages ? 'Masquer mes réglages' : 'Mes réglages (temps par jour, blocs)'}
            </button>
            {voirReglages && (
                <div className="task-form sport-reglages">
                    <div className="form-row">
                        <label>
                            Max un jour de cours (min)
                            <input type="number" min={0} step={15} value={reglages.maxJourCours} onChange={(e) => changerReglage('maxJourCours', Number(e.target.value) || 0)} />
                        </label>
                        <label>
                            Max un jour sans cours (min)
                            <input type="number" min={0} step={15} value={reglages.maxJourLibre} onChange={(e) => changerReglage('maxJourLibre', Number(e.target.value) || 0)} />
                        </label>
                    </div>
                    <div className="form-row">
                        <label>
                            Durée d’un bloc (min)
                            <input type="number" min={15} step={5} value={reglages.bloc} onChange={(e) => changerReglage('bloc', Math.max(15, Number(e.target.value) || 45))} />
                        </label>
                        <label>
                            Fini avant
                            <input type="time" value={reglages.fin} onChange={(e) => changerReglage('fin', e.target.value)} />
                        </label>
                    </div>
                </div>
            )}

            <div className="segmented">
                <button className={semaine === 'courante' ? 'actif' : ''} onClick={() => { setSemaine('courante'); setEtape('repos') }} disabled={occupe}>
                    Cette semaine
                </button>
                <button className={semaine === 'prochaine' ? 'actif' : ''} onClick={() => { setSemaine('prochaine'); setEtape('repos') }} disabled={occupe}>
                    Semaine prochaine
                </button>
            </div>

            {erreur && <p className="form-error">{erreur}</p>}

            {(etape === 'repos' || etape === 'calcul' || etape === 'fait') && (
                <>
                    {etape === 'fait' && <p className="et-ok">✓ Tes heures d’étude sont dans ton agenda.</p>}
                    <button className="btn-primary" onClick={proposer} disabled={occupe}>
                        {etape === 'calcul' ? 'Calcul…' : etape === 'fait' ? 'Reprogrammer mes révisions' : 'Proposer mes révisions'}
                    </button>
                </>
            )}

            {(etape === 'apercu' || etape === 'enregistrement') && (
                <>
                    {propositions.length === 0 ? (
                        <p className="muted">Rien à placer cette semaine : pas d’échéance proche, ou tout est déjà prévu.</p>
                    ) : (
                        <table className="et-table et-apercu">
                            <tbody>
                                {propositions.map((b) => {
                                    const t = TYPES_ECHEANCE[b.echeance.type]
                                    return (
                                        <tr key={`${b.echeance.cle}-${b.debut.getTime()}`}>
                                            <td className="et-quand">
                                                <b>{jourFormat.format(b.debut)}</b>
                                                <small>
                                                    {heureFormat.format(b.debut)}–{heureFormat.format(b.fin)}
                                                </small>
                                            </td>
                                            <td>
                                                <span className="type-badge" style={{ '--t': t.couleur } as React.CSSProperties}>
                                                    {b.echeance.type === 'soutenance' ? 'ORAL' : b.echeance.type.toUpperCase()}
                                                </span>
                                                {b.echeance.source === 'preparation' ? 'Préparer · ' : ''}
                                                {b.echeance.matiere}
                                            </td>
                                            <td className="et-droite">{b.aIut ? '🏫 IUT' : '🏠'}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                    {manques.filter((m) => TYPES_ECHEANCE[m.echeance.type].priorite < 3).map((m) => (
                        <p key={m.echeance.cle} className="form-error et-manque">
                            ⚠️ Pas assez de place pour {m.manque} bloc{m.manque > 1 ? 's' : ''} de « {m.echeance.matiere} » : augmente le maximum par jour ou libère
                            un créneau.
                        </p>
                    ))}
                    {aRemplacer.length > 0 && <p className="muted">{aRemplacer.length} bloc(s) déjà prévus cette semaine seront remplacés.</p>}
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setEtape('repos')} disabled={etape === 'enregistrement'}>
                            Annuler
                        </button>
                        <button className="btn-primary" onClick={valider} disabled={etape === 'enregistrement' || (propositions.length === 0 && aRemplacer.length === 0)}>
                            {etape === 'enregistrement' ? 'Ajout…' : `Ajouter ${propositions.length} bloc${propositions.length > 1 ? 's' : ''}`}
                        </button>
                    </div>
                </>
            )}
        </section>
    )
}

