import { useState } from 'react'
import { GUIDE, dansLaListe, sansAccent, type Aliment, type GuideNutriment } from './aliments'

type Props = {
    nomsListe: string[] // aliments de la liste de la semaine
    manques: string[] // ce que le dernier repas / bilan signale comme manquant
    joursCouverts: Record<string, number> // nutriment → nombre de jours couverts depuis lundi
    aDesRepas: boolean
}

const COLONNES: { cle: 'repas' | 'facile' | 'grignoter'; titre: string; emoji: string; sous: string }[] = [
    { cle: 'repas', titre: 'Aux repas', emoji: '🍽️', sous: 'les aliments de base' },
    { cle: 'facile', titre: 'Facile & rapide', emoji: '⚡', sous: 'prêt en 5 min' },
    { cle: 'grignoter', titre: 'À grignoter', emoji: '🥜', sous: 'entre deux repas' },
]

const SNACKS = 'snacks'

function aSurveiller(g: GuideNutriment, p: Props): boolean {
    if (p.manques.some((m) => g.motifs.test(sansAccent(m)))) return true
    return p.aDesRepas && (p.joursCouverts[g.libelle] ?? 0) === 0
}

/** Tous les grignotages, avec les nutriments que chacun apporte. */
function tousLesGrignotages(): { a: Aliment; nutriments: GuideNutriment[] }[] {
    const parNom = new Map<string, { a: Aliment; nutriments: GuideNutriment[] }>()
    for (const g of GUIDE) {
        for (const a of g.grignoter) {
            const cle = sansAccent(a.n)
            const deja = parNom.get(cle)
            if (deja) deja.nutriments.push(g)
            else parNom.set(cle, { a, nutriments: [g] })
        }
    }
    return [...parNom.values()].sort((x, y) => y.nutriments.length - x.nutriments.length)
}

export default function GuideAliments(props: Props) {
    const surveilles = GUIDE.filter((g) => aSurveiller(g, props))
    const [choix, setChoix] = useState<string | null>(null)
    const [toutVoir, setToutVoir] = useState(false)
    const actif = choix ?? surveilles[0]?.libelle ?? GUIDE[0].libelle
    const guide = GUIDE.find((g) => g.libelle === actif)

    const ligne = (a: Aliment) => {
        const ok = dansLaListe(a, props.nomsListe)
        return (
            <li key={a.n} className={ok ? 'dans-liste' : ''}>
                <span className="gu-emoji">{a.e}</span>
                <span className="gu-nom">
                    {a.n}
                    {a.p && <small>{a.p}</small>}
                </span>
                {ok && <span className="gu-ok" title="Déjà dans ta liste de la semaine">✓ liste</span>}
            </li>
        )
    }

    return (
        <section className="nu-carte gu">
            <h2>🥗 Guide des aliments</h2>
            <p className="nu-sous">Quoi manger pour chaque nutriment : aux repas, vite fait, ou en grignotant.</p>

            <div className="gu-chips" role="tablist">
                <button
                    role="tab"
                    aria-selected={actif === SNACKS}
                    className={`gu-chip gu-chip-snack ${actif === SNACKS ? 'actif' : ''}`}
                    onClick={() => setChoix(SNACKS)}
                >
                    🥜 Tous les grignotages
                </button>
                {GUIDE.map((g) => (
                    <button
                        key={g.libelle}
                        role="tab"
                        aria-selected={actif === g.libelle}
                        className={`gu-chip ${actif === g.libelle ? 'actif' : ''}`}
                        onClick={() => setChoix(g.libelle)}
                    >
                        {g.emoji} {g.libelle}
                        {surveilles.includes(g) && <span className="gu-point" title="À surveiller cette semaine" />}
                    </button>
                ))}
            </div>
            {surveilles.length > 0 && (
                <p className="gu-legende">
                    <span className="gu-point" /> à surveiller cette semaine
                </p>
            )}

            {guide && (
                <>
                    <div className="gu-role">
                        <span className="gu-role-emoji">{guide.emoji}</span>
                        <div>
                            <b>{guide.libelle}</b>
                            <p>{guide.role}</p>
                            {guide.astuce && <p className="gu-astuce">💡 {guide.astuce}</p>}
                        </div>
                    </div>
                    <div className="gu-colonnes">
                        {COLONNES.map((c) => (
                            <div key={c.cle} className={`gu-col gu-col-${c.cle}`}>
                                <div className="gu-col-tete">
                                    <span>{c.emoji}</span>
                                    <div>
                                        <b>{c.titre}</b>
                                        <small>{c.sous}</small>
                                    </div>
                                </div>
                                <ul>{guide[c.cle].map(ligne)}</ul>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {actif === SNACKS && (
                <>
                    <p className="nu-sous gu-snack-intro">
                        Des en-cas qui comptent vraiment : chacun apporte les nutriments indiqués. Ceux qui en couvrent le plus sont en
                        haut.
                    </p>
                    <ul className="gu-snacks">
                        {tousLesGrignotages()
                            .slice(0, toutVoir ? undefined : 12)
                            .map(({ a, nutriments }) => {
                            const ok = dansLaListe(a, props.nomsListe)
                            return (
                                <li key={a.n} className={ok ? 'dans-liste' : ''}>
                                    <span className="gu-emoji">{a.e}</span>
                                    <span className="gu-nom">
                                        {a.n}
                                        {a.p && <small>{a.p}</small>}
                                    </span>
                                    {ok && <span className="gu-ok">✓ liste</span>}
                                    <span className="gu-apports">
                                        {nutriments.map((g) => (
                                            <span
                                                key={g.libelle}
                                                className={`gu-apport ${surveilles.includes(g) ? 'manque' : ''}`}
                                                title={g.libelle}
                                            >
                                                {g.emoji} {g.libelle}
                                            </span>
                                        ))}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                    {!toutVoir && tousLesGrignotages().length > 12 && (
                        <button className="btn-link gu-plus" onClick={() => setToutVoir(true)}>
                            Voir les {tousLesGrignotages().length - 12} autres en-cas
                        </button>
                    )}
                </>
            )}
        </section>
    )
}
