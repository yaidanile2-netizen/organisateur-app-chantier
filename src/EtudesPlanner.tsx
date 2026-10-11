// Carte « Révisions » de l'onglet Agenda : échéances à venir avec leur programme (Réviser → Appliquer → Valider),
// ajout d'une échéance, et placement des créneaux d'étude le soir.
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
    programme,
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

// Les étapes d'une échéance en pastilles : ✓ validée, ● prévue, ○ à placer.
function Etapes({ e, r }: { e: Echeance; r: ReglagesEtudes }) {
    const prog = programme(e.type, r)
    return (
        <span className="et-etapes" style={{ '--t': TYPES_ECHEANCE[e.type].couleur } as React.CSSProperties}>
            {prog.map((p, i) => {
                const s = e.etapes[i]?.statut ?? 'manque'
                return (
                    <span key={i} className={`et-etape ${s}`} title={`${i + 1}. ${p.nom} : ${s === 'fait' ? 'validée' : s === 'prevu' ? 'prévue' : 'à placer'}`}>
                        {s === 'fait' ? '✓' : i + 1}
                        <small>{p.nom.split(' ')[0]}</small>
                    </span>
                )
            })}
        </span>
    )
}

export default function EtudesPlanner({ onPlanifie, version = 0 }: { onPlanifie: () => void; version?: number }) {
    const [semaine, setSemaine] = useState<Semaine>(() => ([0, 6].includes(new Date().getDay()) ? 'prochaine' : 'courante'))
    const [etape, setEtape] = useState<Etape>('repos')
    const [aVenir, setAVenir] = useState<Echeance[] | null>(null)
    const [propositions, setPropositions] = useState<BlocEtude[]>([])
    const [manques, setManques] = useState<{ echeance: Echeance; etape: number }[]>([])
    const [aRemplacer, setARemplacer] = useState<Tache[]>([])
    const [erreur, setErreur] = useState<string | null>(null)
    const [reglages, setReglages] = useState<ReglagesEtudes>(() => lireReglagesEtudes())
    const [voirReglages, setVoirReglages] = useState(false)
    const [voirProgramme, setVoirProgramme] = useState(false)
    const [ajout, setAjout] = useState<{ type: TypeEcheance; matiere: string; date: string; heure: string } | null>(null)

    // Échéances des 3 prochaines semaines (tableau « À venir »).
    useEffect(() => {
        let annule = false
        const maintenant = new Date()
        const fin = new Date(maintenant.getTime() + 21 * JOUR)
        Promise.all([getCoursEntre(new Date(maintenant.getTime() - 3 * JOUR), fin), getTachesEntre(new Date(maintenant.getTime() - 21 * JOUR), fin)])
            .then(([cours, taches]) => {
                if (!annule) setAVenir(echeances(cours, taches, maintenant, fin, reglages))
            })
            .catch(() => {
                if (!annule) setAVenir([])
            })
        return () => {
            annule = true
        }
    }, [version, etape, reglages])

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
                getCoursEntre(new Date(lundi.getTime() - 3 * JOUR), finFenetre),
                getTachesEntre(new Date(lundi.getTime() - 21 * JOUR), finFenetre),
            ])
            // Les blocs à venir de la semaine qui ne sont pas encore validés sont recalculés.
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
            const liste = echeances(cours, gardees, maintenant, finFenetre, reglages)
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
                    titre: titreBloc(b, reglages),
                    description: descriptionBloc(b, reglages),
                    categorie_id: categorie,
                    date_debut: b.debut.toISOString(),
                    date_fin: b.fin.toISOString(),
                    toute_la_journee: false,
                    statut: 'a_faire',
                    priorite: b.echeance.type === 'ds' || b.echeance.type === 'soutenance' ? 'haute' : 'normale',
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
            const nom = { ds: 'DS', soutenance: 'Oral', projet: 'Projet', tp: 'TP', td: 'TD' }[ajout.type]
            await creerTache({
                titre: `${t.emoji} ${nom} · ${ajout.matiere.trim()}`,
                description: `${MARQUEUR_ECHEANCE} ${ajout.type}`,
                categorie_id: await categorieCours(),
                date_debut: debut.toISOString(),
                date_fin: new Date(debut.getTime() + 60 * 60000).toISOString(),
                toute_la_journee: false,
                statut: 'a_faire',
                priorite: 'haute',
            })
            setAjout(null)
            setEtape('repos')
            onPlanifie()
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Impossible d’ajouter cette échéance.')
        }
    }

    const importantes = (aVenir || []).filter((e) => e.type !== 'td' && e.type !== 'tp')
    const tds = (aVenir || []).filter((e) => e.type === 'td' && e.etapes[0]?.statut !== 'fait')
    const tps = (aVenir || []).filter((e) => e.type === 'tp' && e.etapes[0]?.statut !== 'fait')
    const prog = programme('ds', reglages)

    return (
        <section className="card etudes">
            <h2>📚 Révisions</h2>
            <p className="muted">
                Le soir de {reglages.debut.replace(':', 'h')} à {reglages.fin.replace(':', 'h')} (au plus {duree(reglages.maxJourCours)} un jour de cours). DS
                d’abord, puis oraux, projets, TP et de courtes révisions de TD.
            </p>

            <button className="btn-link" onClick={() => setVoirProgramme((v) => !v)}>
                {voirProgramme ? 'Masquer le programme d’un DS' : 'Comment je prépare un DS ? (3 créneaux)'}
            </button>
            {voirProgramme && (
                <ol className="et-programme">
                    {prog.map((p, i) => (
                        <li key={p.nom}>
                            <b>
                                {i + 1}. {p.nom}
                            </b>{' '}
                            <small>
                                {p.duree} min · vers J−{p.avant}
                            </small>
                            <ul>
                                {p.consignes.map((c) => (
                                    <li key={c}>{c}</li>
                                ))}
                            </ul>
                        </li>
                    ))}
                    <li className="et-programme-note">
                        Coche le créneau « fait » quand l’étape est finie. Si le DS est dans moins de {reglages.urgenceJours} jours et qu’une étape n’est pas validée,
                        l’app peut la placer en dehors du soir (pause, week-end).
                    </li>
                </ol>
            )}

            <h3 className="et-h3">À venir (3 semaines)</h3>
            {aVenir === null ? (
                <p className="muted">Chargement…</p>
            ) : importantes.length === 0 ? (
                <p className="muted">Aucun DS, oral ni projet dans les 3 prochaines semaines.</p>
            ) : (
                <table className="et-table">
                    <tbody>
                        {importantes.map((e) => {
                            const t = TYPES_ECHEANCE[e.type]
                            const jours = Math.max(0, Math.round((new Date(e.date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / JOUR))
                            return (
                                <tr key={e.cle}>
                                    <td className="et-quand">
                                        <b>{jourFormat.format(e.date)}</b>
                                        <small>{jours === 0 ? 'aujourd’hui' : jours === 1 ? 'demain' : `dans ${jours} j`}</small>
                                    </td>
                                    <td>
                                        <span className="type-badge" style={{ '--t': t.couleur } as React.CSSProperties}>
                                            {t.court}
                                        </span>
                                        {e.matiere}
                                        <Etapes e={e} r={reglages} />
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            )}
            {(tds.length > 0 || tps.length > 0) && (
                <p className="et-prep">
                    + {tds.length} TD à préparer la veille ({Math.min(30, Math.max(15, reglages.dureeTD))} min chacun)
                    {tps.length ? ` et ${tps.length} TP à préparer (30 min la veille)` : ''}.
                </p>
            )}

            {ajout ? (
                <div className="task-form et-ajout">
                    <div className="form-row">
                        <label>
                            Type
                            <select value={ajout.type} onChange={(e) => setAjout({ ...ajout, type: e.target.value as TypeEcheance })}>
                                {(['ds', 'soutenance', 'projet'] as TypeEcheance[]).map((k) => (
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
                    </div>
                    <p className="et-prep">
                        Programme : {programme(ajout.type, reglages).map((p, i) => `${i + 1} ${p.nom}`).join(' → ')} (
                        {programme(ajout.type, reglages).length} × {programme(ajout.type, reglages)[0].duree} min)
                    </p>
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
                <button className="btn-link" onClick={() => setAjout({ type: 'soutenance', matiere: '', date: '', heure: '08:00' })}>
                    + Ajouter un oral, un projet ou un DS
                </button>
            )}

            <button className="btn-link sport-reglages-lien" onClick={() => setVoirReglages((v) => !v)}>
                {voirReglages ? 'Masquer mes réglages' : 'Mes réglages (créneau du soir, durées)'}
            </button>
            {voirReglages && (
                <div className="task-form sport-reglages">
                    <div className="form-row">
                        <label>
                            Je révise à partir de
                            <input type="time" value={reglages.debut} onChange={(e) => changerReglage('debut', e.target.value)} />
                        </label>
                        <label>
                            jusqu’à
                            <input type="time" value={reglages.fin} onChange={(e) => changerReglage('fin', e.target.value)} />
                        </label>
                    </div>
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
                            Révision d’un TD (15 à 30 min)
                            <input type="number" min={15} max={30} step={5} value={reglages.dureeTD} onChange={(e) => changerReglage('dureeTD', Number(e.target.value) || 20)} />
                        </label>
                        <label>
                            DS « très proche » (jours)
                            <input type="number" min={0} max={7} value={reglages.urgenceJours} onChange={(e) => changerReglage('urgenceJours', Number(e.target.value) || 0)} />
                        </label>
                    </div>
                    <label className="checkbox-row">
                        <input type="checkbox" checked={reglages.midiOraux} onChange={(e) => changerReglage('midiOraux', e.target.checked)} />
                        Oraux : utiliser aussi la pause de midi en semaine (12h45–13h45)
                    </label>
                </div>
            )}

            <div className="segmented">
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

            {erreur && <p className="form-error">{erreur}</p>}

            {(etape === 'repos' || etape === 'calcul' || etape === 'fait') && (
                <>
                    {etape === 'fait' && <p className="et-ok">✓ Tes créneaux de révision sont dans ton agenda.</p>}
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
                                    const p = programme(b.echeance.type, reglages)
                                    return (
                                        <tr key={`${b.echeance.cle}-${b.etape}`}>
                                            <td className="et-quand">
                                                <b>{jourFormat.format(b.debut)}</b>
                                                <small>
                                                    {heureFormat.format(b.debut)}–{heureFormat.format(b.fin)}
                                                </small>
                                            </td>
                                            <td>
                                                <span className="type-badge" style={{ '--t': t.couleur } as React.CSSProperties}>
                                                    {t.court}
                                                </span>
                                                {b.echeance.matiere}
                                                <small className="et-quoi">
                                                    {p.length > 1 ? `${b.etape + 1}/${p.length} ` : ''}
                                                    {p[b.etape].nom}
                                                    {b.mode === 'urgence' ? ' · ⚡ hors du soir' : b.mode === 'midi' ? ' · pause de midi' : ''}
                                                </small>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                    {manques
                        .filter((m) => m.echeance.type !== 'td')
                        .map((m) => (
                            <p key={`${m.echeance.cle}-${m.etape}`} className="form-error et-manque">
                                ⚠️ Pas de place pour « {programme(m.echeance.type, reglages)[m.etape].nom} » ({TYPES_ECHEANCE[m.echeance.type].court} {m.echeance.matiere}) :
                                libère une soirée ou augmente le maximum par jour.
                            </p>
                        ))}
                    {aRemplacer.length > 0 && <p className="muted">{aRemplacer.length} créneau(x) déjà prévus cette semaine seront remplacés.</p>}
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setEtape('repos')} disabled={etape === 'enregistrement'}>
                            Annuler
                        </button>
                        <button className="btn-primary" onClick={valider} disabled={etape === 'enregistrement' || (propositions.length === 0 && aRemplacer.length === 0)}>
                            {etape === 'enregistrement' ? 'Ajout…' : `Ajouter ${propositions.length} créneau${propositions.length > 1 ? 'x' : ''}`}
                        </button>
                    </div>
                </>
            )}
        </section>
    )
}
