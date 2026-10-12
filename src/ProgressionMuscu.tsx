import Repliable from './Repliable'
// Onglet Muscu : chiffres clés, progression des charges et historique des séances (synchronisés).
import type { SeanceFaite } from './api'
import { seanceParCode } from './programme'
import { RESSENTIS, avecCharge, exerciceParId, fmtKg } from './suiviMuscu'

const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

function Courbe({ valeurs, couleur }: { valeurs: number[]; couleur: string }) {
    if (valeurs.length < 2) return <span className="mu-courbe-vide">—</span>
    const min = Math.min(...valeurs)
    const max = Math.max(...valeurs)
    const l = 84
    const h = 26
    const pts = valeurs.map((v, i) => {
        const x = (i / (valeurs.length - 1)) * (l - 6) + 3
        const y = max === min ? h / 2 : h - 4 - ((v - min) / (max - min)) * (h - 8)
        return [x, y]
    })
    const [dx, dy] = pts[pts.length - 1]
    return (
        <svg className="mu-courbe" width={l} height={h} viewBox={`0 0 ${l} ${h}`} aria-hidden>
            <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={couleur} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={dx} cy={dy} r="3" fill={couleur} />
        </svg>
    )
}

type Props = {
    seances: SeanceFaite[]
    lundi: Date
    synchro: 'chargement' | 'ok' | 'hors-ligne'
    onSupprimer: (s: SeanceFaite) => void
}

export default function ProgressionMuscu({ seances, lundi, synchro, onSupprimer }: Props) {
    const debutSemaine = new Date(lundi)
    // 30 derniers jours, comptés jusqu'à la fin de la semaine en cours.
    const il30j = lundi.getTime() + (7 - 30) * 24 * 3600 * 1000
    const cetteSemaine = seances.filter((s) => new Date(s.date) >= debutSemaine).length
    const sur30j = seances.filter((s) => new Date(s.date).getTime() >= il30j).length

    // Charges par exercice, de la plus ancienne à la plus récente.
    const parExo = new Map<string, number[]>()
    for (const s of [...seances].reverse()) {
        for (const e of s.exercices) {
            const exo = exerciceParId(e.id)
            if (!exo || !avecCharge(exo) || e.kg === null) continue
            parExo.set(e.id, [...(parExo.get(e.id) || []), e.kg])
        }
    }
    const lignes = [...parExo.entries()]
        .map(([id, kgs]) => ({ id, exo: exerciceParId(id)!, kgs, gain: kgs[kgs.length - 1] - kgs[0] }))
        .sort((a, b) => a.id.localeCompare(b.id))
    const gainTotal = lignes.reduce((n, l) => n + Math.max(0, l.gain), 0)

    return (
        <>
            <Repliable
                cle="muscu.progression"
                className="mu-carte"
                h2Class="mu-h2"
                titre="📈 MA PROGRESSION"
                resume={`${cetteSemaine}/4 cette semaine`}
                entete={
                    <span className={`mu-synchro ${synchro}`}>
                        {synchro === 'ok' ? '☁ Synchronisé' : synchro === 'chargement' ? '… Synchro' : '⚠ Hors ligne'}
                    </span>
                }
            >
                <div className="mu-stats">
                    <div className="mu-stat">
                        <b>{cetteSemaine}/4</b>
                        <span>cette semaine</span>
                    </div>
                    <div className="mu-stat">
                        <b>{sur30j}</b>
                        <span>séances en 30 j</span>
                    </div>
                    <div className="mu-stat">
                        <b>+{fmtKg(gainTotal)}</b>
                        <span>kg gagnés</span>
                    </div>
                </div>

                {lignes.length === 0 ? (
                    <p className="mu-gris">
                        Note tes charges pendant les séances A et B, puis touche « Séance terminée » : ta progression s’affichera ici.
                    </p>
                ) : (
                    <table className="mu-table mu-table-prog">
                        <thead>
                            <tr>
                                <th>Machine</th>
                                <th>Début</th>
                                <th>Actuel</th>
                                <th>Courbe</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lignes.map(({ id, exo, kgs, gain }) => {
                                const s = seanceParCode(id.startsWith('a-') ? 'A' : 'B')
                                return (
                                    <tr key={id}>
                                        <td>
                                            <b className="mu-prog-nom">{exo.nom}</b>
                                        </td>
                                        <td className="mu-gris-cell">{fmtKg(kgs[0])}</td>
                                        <td>
                                            <b>{fmtKg(kgs[kgs.length - 1])}</b>
                                            {gain > 0 && <small className="mu-gain"> +{fmtKg(gain)}</small>}
                                        </td>
                                        <td>
                                            <Courbe valeurs={kgs.slice(-8)} couleur={s.couleur} />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </Repliable>

            {seances.length > 0 && (
                <Repliable cle="muscu.historique" className="mu-carte" h2Class="mu-h2" titre="🗓️ MES DERNIÈRES SÉANCES" resume={`${seances.length}`}>
                    <table className="mu-table">
                        <tbody>
                            {seances.slice(0, 8).map((h) => {
                                const s = seanceParCode(h.code)
                                const total = h.exercices.reduce((n, e) => n + e.total, 0)
                                const faites = h.exercices.reduce((n, e) => n + Math.min(e.faites, e.total), 0)
                                const ressentis = (['facile', 'bien', 'dur'] as const)
                                    .map((r) => ({ r, n: h.exercices.filter((e) => e.ressenti === r && e.faites > 0).length }))
                                    .filter((x) => x.n > 0)
                                return (
                                    <tr key={h.id}>
                                        <td>
                                            <span className="mu-badge" style={{ '--c': s.couleur } as React.CSSProperties}>
                                                {s.code}
                                            </span>{' '}
                                            {s.emoji}
                                        </td>
                                        <td>
                                            {jourCourt.format(new Date(h.date))}
                                            {ressentis.length > 0 && (
                                                <small className="mu-ressentis">
                                                    {ressentis.map(({ r, n }) => `${RESSENTIS[r].emoji}×${n}`).join('  ')}
                                                </small>
                                            )}
                                        </td>
                                        <td className="mu-droite">
                                            {total > 0 ? (
                                                <span className="mu-pct" style={{ '--c': s.couleur, '--p': `${Math.round((faites / total) * 100)}%` } as React.CSSProperties}>
                                                    {faites}/{total}
                                                </span>
                                            ) : (
                                                <span className="mu-gris-cell">—</span>
                                            )}
                                        </td>
                                        <td className="mu-droite">
                                            {!h.id.startsWith('local-') && (
                                                <button className="mu-suppr" onClick={() => onSupprimer(h)} aria-label="Retirer cette séance">
                                                    ×
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </Repliable>
            )}
        </>
    )
}
