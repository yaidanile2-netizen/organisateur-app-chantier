import { Fragment, useEffect, useMemo, useState } from 'react'
import './muscu.css'
import { getCoursEntre, getTachesEntre, modifierTache, type Tache } from './api'
import BodyMap from './BodyMap'
import {
    MATERIEL,
    MUSCLES,
    PROGRAMME,
    SALLE,
    seanceParCode,
    type Bloc,
    type CodeSeance,
    type Exercice,
    type Muscle,
} from './programme'
import {
    MARQUEUR,
    codeDeTache,
    creneauManuel,
    creneauxPourDeplacer,
    debutDeSemaine,
    descriptionSeance,
    lireReglages,
    type Creneau,
} from './sport'

type Historique = { date: string; code: CodeSeance }[]

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
        // stockage indisponible
    }
}

const JOURS_COURTS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })
const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

function memeJour(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function dansCombien(d: Date): string {
    const auj = new Date()
    auj.setHours(0, 0, 0, 0)
    const j = new Date(d)
    j.setHours(0, 0, 0, 0)
    const n = Math.round((j.getTime() - auj.getTime()) / 86400000)
    if (n <= 0) return "aujourd'hui"
    if (n === 1) return 'demain'
    return `dans ${n} jours`
}

// Heures de séance (pas de trajet) à partir de la tâche.
function horaireSeance(t: Tache): { debut: Date; fin: Date } {
    const code = codeDeTache(t)
    const s = seanceParCode(code ?? 'A')
    const r = lireReglages()
    const depart = new Date(t.date_debut || Date.now())
    const trajet = s.lieu === 'salle' ? r.trajetSalle : 0
    const debut = new Date(depart.getTime() + trajet * 60000)
    return { debut, fin: new Date(debut.getTime() + r.duree * 60000) }
}

function musclesDe(exos: Exercice[]): Muscle[] {
    return [...new Set(exos.flatMap((e) => e.muscles))]
}

type Deplacement = {
    tache: Tache
    chargement: boolean
    options: { jour: Date; creneau: Creneau | null }[]
    date: string
    heure: string
    erreur: string | null
}

export default function MuscuView() {
    const [decalage, setDecalage] = useState(0)
    const [taches, setTaches] = useState<Tache[]>([])
    const [chargement, setChargement] = useState(true)
    const [code, setCode] = useState<CodeSeance>('A')
    const [deplacement, setDeplacement] = useState<Deplacement | null>(null)
    const [charges, setCharges] = useState<Record<string, string>>(() => lire('muscu.charges', {}))
    const [series, setSeries] = useState<Record<string, boolean[]>>(() => lire('muscu.series', {}))
    const [historique, setHistorique] = useState<Historique>(() => lire('muscu.historique', []))
    const [conseils, setConseils] = useState<string | null>(null)
    const [repos, setRepos] = useState<{ restant: number; total: number } | null>(null)
    const [message, setMessage] = useState<string | null>(null)

    const lundi = useMemo(() => {
        const l = debutDeSemaine(new Date())
        l.setDate(l.getDate() + 7 * decalage)
        return l
    }, [decalage])
    const dimanche = useMemo(() => {
        const d = new Date(lundi)
        d.setDate(d.getDate() + 6)
        d.setHours(23, 59, 59, 999)
        return d
    }, [lundi])

    async function chargerSemaine(choisirProchaine = false) {
        setChargement(true)
        try {
            const t = (await getTachesEntre(lundi, dimanche))
                .filter((x) => x.description?.includes(MARQUEUR) && x.statut !== 'annule')
                .sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || ''))
            setTaches(t)
            if (choisirProchaine) {
                const prochaine = t.find((x) => x.statut !== 'fait' && new Date(x.date_fin || x.date_debut || 0) >= new Date())
                const c = prochaine && codeDeTache(prochaine)
                if (c) setCode(c)
            }
        } catch {
            setTaches([])
        } finally {
            setChargement(false)
        }
    }

    useEffect(() => {
        chargerSemaine(decalage === 0)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lundi])

    useEffect(() => {
        if (!repos || repos.restant <= 0) return
        const id = window.setTimeout(() => {
            if (repos.restant === 1 && 'vibrate' in navigator) navigator.vibrate([200, 100, 200])
            setRepos((r) => (r && r.restant > 1 ? { ...r, restant: r.restant - 1 } : null))
        }, 1000)
        return () => window.clearTimeout(id)
    }, [repos])

    const seance = seanceParCode(code)
    const exercices = seance.blocs.flatMap((b) => b.exercices)
    const total = exercices.reduce((n, e) => n + e.series, 0)
    const faites = exercices.reduce((n, e) => n + (series[e.id] || []).filter(Boolean).length, 0)
    const pourcent = total ? Math.round((faites / total) * 100) : 0
    const prochaine = taches.find((x) => x.statut !== 'fait' && new Date(x.date_fin || x.date_debut || 0) >= new Date())

    function changerCharge(id: string, valeur: string) {
        const c = { ...charges, [id]: valeur }
        setCharges(c)
        ecrire('muscu.charges', c)
    }

    function ajusterCharge(id: string, delta: number) {
        const actuelle = parseFloat((charges[id] || '0').replace(',', '.')) || 0
        changerCharge(id, String(Math.max(0, Math.round((actuelle + delta) * 2) / 2)))
    }

    function basculerSerie(bloc: Bloc, e: Exercice, i: number) {
        const actuelles = series[e.id] ? [...series[e.id]] : Array(e.series).fill(false)
        actuelles[i] = !actuelles[i]
        const s = { ...series, [e.id]: actuelles }
        setSeries(s)
        ecrire('muscu.series', s)
        // Tour terminé (tous les exercices du bloc cochés pour cette série) : repos automatique.
        if (actuelles[i] && bloc.repos > 0) {
            const tourFini = bloc.exercices.every((x) => (x.id === e.id ? actuelles : s[x.id] || [])[i])
            if (tourFini) setRepos({ restant: bloc.repos, total: bloc.repos })
        }
    }

    async function marquerFaite(t: Tache) {
        try {
            await modifierTache({ id: t.id, statut: 'fait' })
            await chargerSemaine()
        } catch {
            setMessage("Impossible de mettre à jour l'agenda pour l'instant.")
        }
    }

    async function terminer() {
        const h = [{ date: new Date().toISOString(), code }, ...historique].slice(0, 30)
        setHistorique(h)
        ecrire('muscu.historique', h)
        const s = { ...series }
        for (const e of exercices) delete s[e.id]
        setSeries(s)
        ecrire('muscu.series', s)
        setRepos(null)
        const duJour = taches.find(
            (t) => t.date_debut && memeJour(new Date(t.date_debut), new Date()) && codeDeTache(t) === code && t.statut !== 'fait'
        )
        if (duJour) {
            await marquerFaite(duJour)
            setMessage(`Séance ${code} terminée et cochée dans ton agenda. Bravo 💪`)
        } else {
            setMessage(`Séance ${code} terminée. Bravo 💪`)
        }
    }

    async function ouvrirDeplacement(t: Tache) {
        const c = codeDeTache(t) ?? 'A'
        const debut = new Date(t.date_debut || Date.now())
        const pad = (n: number) => String(n).padStart(2, '0')
        const { debut: debutSeance } = horaireSeance(t)
        setDeplacement({
            tache: t,
            chargement: true,
            options: [],
            date: `${debut.getFullYear()}-${pad(debut.getMonth() + 1)}-${pad(debut.getDate())}`,
            heure: `${pad(debutSeance.getHours())}:${pad(debutSeance.getMinutes())}`,
            erreur: null,
        })
        try {
            const [cours, toutes] = await Promise.all([getCoursEntre(lundi, dimanche), getTachesEntre(lundi, dimanche)])
            const autres = toutes.filter((x) => x.id !== t.id)
            const options = creneauxPourDeplacer(seanceParCode(c), lundi, cours, autres, lireReglages())
            setDeplacement((d) => (d && d.tache.id === t.id ? { ...d, chargement: false, options } : d))
        } catch (err) {
            setDeplacement((d) =>
                d ? { ...d, chargement: false, erreur: err instanceof Error ? err.message : 'Erreur de chargement.' } : d
            )
        }
    }

    async function deplacerVers(cr: Creneau) {
        if (!deplacement) return
        try {
            await modifierTache({
                id: deplacement.tache.id,
                date_debut: cr.depart.toISOString(),
                date_fin: cr.retour.toISOString(),
                description: descriptionSeance(cr),
            })
            setDeplacement(null)
            setMessage(`Séance ${cr.seance.code} déplacée au ${jourLong.format(cr.debut)} à ${hm(cr.debut)}.`)
            await chargerSemaine()
        } catch (err) {
            setDeplacement((d) => (d ? { ...d, erreur: err instanceof Error ? err.message : 'Erreur.' } : d))
        }
    }

    function deplacerManuel() {
        if (!deplacement) return
        const c = codeDeTache(deplacement.tache) ?? 'A'
        const debut = new Date(`${deplacement.date}T${deplacement.heure}`)
        if (isNaN(debut.getTime())) return
        deplacerVers(creneauManuel(seanceParCode(c), debut, lireReglages()))
    }

    const parJour = Array.from({ length: 7 }, (_, i) => {
        const jour = new Date(lundi)
        jour.setDate(lundi.getDate() + i)
        return { jour, seances: taches.filter((t) => t.date_debut && memeJour(new Date(t.date_debut), jour)) }
    })

    return (
        <div className="mu">
            {/* En-tête */}
            <section className="mu-hero">
                <div>
                    <h1 className="mu-titre">MUSCU</h1>
                    <p className="mu-sous">
                        {SALLE.nom} · {SALLE.horaires}
                    </p>
                </div>
                {prochaine && prochaine.date_debut && (
                    <div className="mu-prochaine" style={{ '--c': seanceParCode(codeDeTache(prochaine) ?? 'A').couleur } as React.CSSProperties}>
                        <span className="mu-prochaine-label">PROCHAINE SÉANCE · {dansCombien(new Date(prochaine.date_debut)).toUpperCase()}</span>
                        <span className="mu-prochaine-texte">
                            {seanceParCode(codeDeTache(prochaine) ?? 'A').emoji} Séance {codeDeTache(prochaine)} ·{' '}
                            {jourLong.format(horaireSeance(prochaine).debut)} à {hm(horaireSeance(prochaine).debut)}
                        </span>
                    </div>
                )}
            </section>

            {/* Planning de la semaine */}
            <section className="mu-carte">
                <div className="mu-entete-ligne">
                    <button className="mu-fleche" onClick={() => setDecalage((d) => Math.max(0, d - 1))} disabled={decalage === 0} aria-label="Semaine précédente">
                        ‹
                    </button>
                    <h2 className="mu-h2">{decalage === 0 ? 'CETTE SEMAINE' : 'SEMAINE PROCHAINE'}</h2>
                    <button className="mu-fleche" onClick={() => setDecalage((d) => Math.min(1, d + 1))} disabled={decalage === 1} aria-label="Semaine suivante">
                        ›
                    </button>
                </div>

                <div className="mu-semaine">
                    {parJour.map(({ jour, seances }, i) => {
                        const auj = memeJour(jour, new Date())
                        return (
                            <div key={i} className={`mu-jour ${auj ? 'auj' : ''}`}>
                                <span className="mu-jour-lettre">{JOURS_COURTS[i]}</span>
                                <span className="mu-jour-date">{jour.getDate()}</span>
                                {seances.length === 0 ? (
                                    <span className="mu-jour-vide">·</span>
                                ) : (
                                    seances.map((t) => {
                                        const s = seanceParCode(codeDeTache(t) ?? 'A')
                                        return (
                                            <button
                                                key={t.id}
                                                className={`mu-pastille ${t.statut === 'fait' ? 'fait' : ''}`}
                                                style={{ background: `linear-gradient(135deg, ${s.degrade[0]}, ${s.degrade[1]})` }}
                                                onClick={() => setCode(s.code)}
                                                title={`Séance ${s.code}`}
                                            >
                                                {t.statut === 'fait' ? '✓' : s.emoji}
                                                <b>{s.code}</b>
                                            </button>
                                        )
                                    })
                                )}
                            </div>
                        )
                    })}
                </div>

                {chargement ? (
                    <p className="mu-gris">Chargement…</p>
                ) : taches.length === 0 ? (
                    <p className="mu-gris">Aucune séance programmée cette semaine — utilise « Séances de sport » dans l’onglet Agenda.</p>
                ) : (
                    <table className="mu-table">
                        <thead>
                            <tr>
                                <th>Séance</th>
                                <th>Quand</th>
                                <th>Lieu</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {taches.map((t) => {
                                const s = seanceParCode(codeDeTache(t) ?? 'A')
                                const { debut, fin } = horaireSeance(t)
                                const ouvert = deplacement?.tache.id === t.id
                                return (
                                    <Fragment key={t.id}>
                                        <tr className={t.statut === 'fait' ? 'fait' : ''}>
                                            <td>
                                                <span className="mu-badge" style={{ background: s.couleur }}>
                                                    {s.code}
                                                </span>{' '}
                                                {s.emoji}
                                            </td>
                                            <td>
                                                <b>{jourCourt.format(debut)}</b>
                                                <br />
                                                {hm(debut)}–{hm(fin)}
                                            </td>
                                            <td>{s.lieu === 'maison' ? '🏠 Maison' : '🏋️ Salle'}</td>
                                            <td className="mu-actions-cellule">
                                                {t.statut === 'fait' ? (
                                                    <span className="mu-ok">✓ Faite</span>
                                                ) : (
                                                    <>
                                                        <button className="mu-mini" onClick={() => (ouvert ? setDeplacement(null) : ouvrirDeplacement(t))}>
                                                            {ouvert ? 'Fermer' : '📅 Déplacer'}
                                                        </button>
                                                        <button className="mu-mini mu-mini-ok" onClick={() => marquerFaite(t)}>
                                                            ✓
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                        {ouvert && deplacement && (
                                            <tr className="mu-dep-ligne">
                                                <td colSpan={4}>
                                                    <div className="mu-dep">
                                                        <p className="mu-dep-titre">
                                                            Déplacer la séance {s.code} {s.lieu === 'maison' ? '(à la maison)' : '(en salle, trajets compris)'} :
                                                        </p>
                                                        {deplacement.chargement ? (
                                                            <p className="mu-gris">Recherche des créneaux libres…</p>
                                                        ) : (
                                                            <div className="mu-dep-grille">
                                                                {deplacement.options.map(({ jour, creneau }) => (
                                                                    <button
                                                                        key={jour.toISOString()}
                                                                        className="mu-dep-jour"
                                                                        disabled={!creneau}
                                                                        onClick={() => creneau && deplacerVers(creneau)}
                                                                    >
                                                                        <span>{jourCourt.format(jour)}</span>
                                                                        <b>{creneau ? hm(creneau.debut) : '—'}</b>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <div className="mu-dep-manuel">
                                                            <span>Ou choisis :</span>
                                                            <input
                                                                type="date"
                                                                value={deplacement.date}
                                                                onChange={(e) => setDeplacement({ ...deplacement, date: e.target.value })}
                                                            />
                                                            <input
                                                                type="time"
                                                                value={deplacement.heure}
                                                                onChange={(e) => setDeplacement({ ...deplacement, heure: e.target.value })}
                                                            />
                                                            <button className="mu-mini mu-mini-ok" onClick={deplacerManuel}>
                                                                OK
                                                            </button>
                                                        </div>
                                                        {deplacement.erreur && <p className="mu-erreur">{deplacement.erreur}</p>}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                )}
                {message && <p className="mu-message">{message}</p>}
            </section>

            {/* Choix de la séance */}
            <div className="mu-cartes-seances">
                {PROGRAMME.map((s) => {
                    const nb = s.blocs.reduce((n, b) => n + b.exercices.length, 0)
                    return (
                        <button
                            key={s.code}
                            className={`mu-carte-seance ${s.code === code ? 'actif' : ''}`}
                            style={{ background: `linear-gradient(140deg, ${s.degrade[0]}, ${s.degrade[1]})` }}
                            onClick={() => {
                                setCode(s.code)
                                setConseils(null)
                            }}
                        >
                            <span className="mu-cs-emoji">{s.emoji}</span>
                            <span className="mu-cs-code">{s.code}</span>
                            <span className="mu-cs-titre">{s.titre.replace(/^Maison : /, '')}</span>
                            <span className="mu-cs-meta">
                                30 MIN · {nb} EXOS · {s.lieu === 'maison' ? 'MAISON' : 'SALLE'}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* Détail de la séance */}
            <section
                className="mu-detail"
                style={{ '--c': seance.couleur, '--g1': seance.degrade[0], '--g2': seance.degrade[1] } as React.CSSProperties}
            >
                <div className="mu-detail-hero">
                    <div className="mu-detail-texte">
                        <span className="mu-detail-lieu">{seance.lieu === 'maison' ? '🏠 À LA MAISON' : '🏋️ EN SALLE'}</span>
                        <h2 className="mu-detail-titre">
                            {seance.emoji} SÉANCE {seance.code}
                        </h2>
                        <p className="mu-detail-sous">{seance.titre.replace(/^Maison : /, '')}</p>
                        <div className="mu-anneau" style={{ '--p': `${pourcent}%` } as React.CSSProperties}>
                            <span>
                                {faites}/{total}
                                <small>séries</small>
                            </span>
                        </div>
                    </div>
                    <BodyMap muscles={musclesDe(exercices)} couleur={seance.couleur} />
                </div>
                <div className="mu-muscles">
                    {musclesDe(exercices).map((m) => (
                        <span key={m} className="mu-muscle">
                            {MUSCLES[m]}
                        </span>
                    ))}
                </div>

                <div className="mu-etape">
                    <span className="mu-etape-num">1</span>
                    <div>
                        <b>ÉCHAUFFEMENT</b>
                        {seance.echauffement.map((l) => (
                            <p key={l}>{l}</p>
                        ))}
                    </div>
                </div>

                {seance.blocs.map((bloc, bi) => (
                    <div key={bloc.titre} className="mu-bloc">
                        <div className="mu-bloc-tete">
                            <span className="mu-etape-num">{bi + 2}</span>
                            <b>{bloc.titre.toUpperCase()}</b>
                            <span className="mu-tags">
                                {bloc.tours > 1 && <span className="mu-tag">{bloc.tours} TOURS</span>}
                                {bloc.repos > 0 && <span className="mu-tag">⏱ {bloc.repos} S</span>}
                            </span>
                        </div>
                        {bloc.exercices.length > 1 && bloc.tours > 1 && (
                            <p className="mu-bloc-info">Enchaîne les exercices sans pause, puis repos.</p>
                        )}
                        {bloc.exercices.map((e) => {
                            const faitesExo = series[e.id] || []
                            const ouvert = conseils === e.id
                            return (
                                <div key={e.id} className="mu-exo">
                                    <div className="mu-exo-haut">
                                        <span className="mu-exo-icone" title={MATERIEL[e.materiel].libelle}>
                                            {MATERIEL[e.materiel].emoji}
                                        </span>
                                        <div className="mu-exo-nom">
                                            <b>{e.nom.toUpperCase()}</b>
                                            <span>{e.machine}</span>
                                        </div>
                                        <span className="mu-cible">
                                            {e.series > 1 ? `${e.series} × ` : ''}
                                            {e.reps}
                                        </span>
                                    </div>
                                    <div className="mu-exo-bas">
                                        <div className="mu-series">
                                            {Array.from({ length: e.series }, (_, i) => (
                                                <button
                                                    key={i}
                                                    className={`mu-serie ${faitesExo[i] ? 'fait' : ''}`}
                                                    onClick={() => basculerSerie(bloc, e, i)}
                                                    aria-label={`Série ${i + 1}`}
                                                >
                                                    {faitesExo[i] ? '✓' : i + 1}
                                                </button>
                                            ))}
                                        </div>
                                        {e.materiel === 'machine' || e.materiel === 'poulie' ? (
                                            <div className="mu-charge">
                                                <button onClick={() => ajusterCharge(e.id, -2.5)} aria-label="Moins">
                                                    −
                                                </button>
                                                <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    step="0.5"
                                                    min="0"
                                                    placeholder="0"
                                                    value={charges[e.id] ?? ''}
                                                    onChange={(ev) => changerCharge(e.id, ev.target.value)}
                                                    aria-label={`Charge pour ${e.nom}`}
                                                />
                                                <span>kg</span>
                                                <button onClick={() => ajusterCharge(e.id, 2.5)} aria-label="Plus">
                                                    +
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                    <button className="mu-conseils-lien" onClick={() => setConseils(ouvert ? null : e.id)}>
                                        {ouvert ? '▾ Masquer les conseils' : '▸ Conseils'} · {e.muscles.map((m) => MUSCLES[m]).join(', ')}
                                    </button>
                                    {ouvert && (
                                        <div className="mu-conseils">
                                            <ul>
                                                {e.consignes.map((c) => (
                                                    <li key={c}>{c}</li>
                                                ))}
                                            </ul>
                                            {e.alternative && <p>🔁 Si c’est pris : {e.alternative}</p>}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                ))}

                <div className="mu-etape">
                    <span className="mu-etape-num">✓</span>
                    <div>
                        <b>RETOUR AU CALME</b>
                        {seance.retourAuCalme.map((l) => (
                            <p key={l}>{l}</p>
                        ))}
                    </div>
                </div>

                <p className="mu-progression">
                    {seance.lieu === 'maison'
                        ? '📈 Quand c’est facile : élastique plus dur, ou +1 pompe par séance.'
                        : seance.code === 'C'
                          ? '📈 Chaque semaine, un peu plus vite sur les minutes rapides.'
                          : '📈 Toutes les séries réussies en haut de la fourchette ? Monte d’un cran (+2,5 kg) la prochaine fois.'}
                </p>

                <div className="mu-boutons">
                    <button className="mu-btn-sec" onClick={() => setRepos({ restant: 60, total: 60 })}>
                        ⏱ REPOS 60 S
                    </button>
                    <button className="mu-btn" onClick={terminer}>
                        SÉANCE TERMINÉE
                    </button>
                </div>
            </section>

            {historique.length > 0 && (
                <section className="mu-carte">
                    <h2 className="mu-h2">MES DERNIÈRES SÉANCES</h2>
                    <table className="mu-table">
                        <tbody>
                            {historique.slice(0, 6).map((h) => {
                                const s = seanceParCode(h.code)
                                return (
                                    <tr key={h.date}>
                                        <td>
                                            <span className="mu-badge" style={{ background: s.couleur }}>
                                                {s.code}
                                            </span>{' '}
                                            {s.emoji}
                                        </td>
                                        <td>{s.titre.replace(/^Maison : /, '')}</td>
                                        <td className="mu-droite">{jourCourt.format(new Date(h.date))}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </section>
            )}

            {repos && (
                <div className="mu-repos" role="timer">
                    <div className="mu-repos-barre" style={{ width: `${(repos.restant / repos.total) * 100}%` }} />
                    <span className="mu-repos-texte">
                        REPOS · {Math.floor(repos.restant / 60)}:{String(repos.restant % 60).padStart(2, '0')}
                    </span>
                    <button onClick={() => setRepos(null)}>Passer ›</button>
                </div>
            )}
        </div>
    )
}
