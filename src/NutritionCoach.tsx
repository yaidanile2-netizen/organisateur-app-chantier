import QuotasJour from './QuotasJour'
import Repliable, { BoutonRepli } from './Repliable'
import { definirOuvert, useRepli } from './repli'
import { Fragment, useEffect, useState } from 'react'
import './nutrition.css'
import {
    cocherListe,
    envoyerNutrition,
    getEtatNutrition,
    supprimerRepas,
    type ApportsJour,
    type ItemListe,
    type SanteJour,
    type Moment,
    type Objectif,
    type Repas,
    type ReponseNutrition,
} from './api'
import { GUIDE, sansAccent } from './aliments'
import GuideAliments from './GuideAliments'
import ConseilCoach from './ConseilCoach'

const OBJECTIFS: { cle: Objectif; libelle: string; emoji: string }[] = [
    { cle: 'musculation', libelle: 'Musculation', emoji: '💪' },
    { cle: 'cardio', libelle: 'Cardio', emoji: '❤️' },
    { cle: 'croissance', libelle: 'Croissance', emoji: '📈' },
    { cle: 'perte_gras', libelle: 'Moins de gras', emoji: '🔥' },
    { cle: 'peau', libelle: 'Peau du visage', emoji: '✨' },
]
const PAR_DEFAUT: Objectif[] = OBJECTIFS.map((o) => o.cle)
const objectif = (o: Objectif) => OBJECTIFS.find((x) => x.cle === o) ?? { cle: o, libelle: o, emoji: '•' }

const MOMENTS: Record<Moment, { libelle: string; emoji: string }> = {
    petit_dejeuner: { libelle: 'Petit-déj', emoji: '🌅' },
    dejeuner: { libelle: 'Déjeuner', emoji: '🍽️' },
    diner: { libelle: 'Dîner', emoji: '🌙' },
    collation: { libelle: 'Collation', emoji: '🍎' },
}

// Lignes du tableau de la semaine : un nutriment est « couvert » un jour donné si un repas
// de ce jour l'apporte (d'après l'analyse du coach). Mêmes nutriments que le guide des aliments.
const NUTRIMENTS = GUIDE
/** On peut cocher plus que la cible (9 bananes au lieu de 7) : jusqu'à 30 portions. */
const MAX_FAIT = 30
const estEncas = (i: ItemListe) => i.type === 'facile' || i.type === 'grignoter'
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const jourIndex = (d: Date) => (d.getDay() + 6) % 7
const jourNom = new Intl.DateTimeFormat('fr-FR', { weekday: 'short' })

export default function NutritionCoach() {
    const [priorites, setPriorites] = useState<Objectif[]>(PAR_DEFAUT)
    const [prioritesServeur, setPrioritesServeur] = useState<Objectif[]>(PAR_DEFAUT)
    const [repas, setRepas] = useState<Repas[]>([])
    const [liste, setListe] = useState<ItemListe[]>([])
    const [apportsJours, setApportsJours] = useState<ApportsJour[]>([])
    const [sante, setSante] = useState<SanteJour[]>([])
    const [filtre, setFiltre] = useState<'reste' | 'encas' | 'tout'>('reste')
    const [texte, setTexte] = useState('')
    const [analyse, setAnalyse] = useState<ReponseNutrition | null>(null)
    const [bilan, setBilan] = useState<ReponseNutrition | null>(null)
    const [enCours, setEnCours] = useState<null | 'repas' | 'bilan' | 'objectifs' | 'liste' | 'conseil'>(null)
    const [conseil, setConseil] = useState<ReponseNutrition | null>(null)
    const [listeOuverte, basculerListe] = useRepli('nutri.liste')
    const [erreur, setErreur] = useState<string | null>(null)

    async function recharger() {
        try {
            const etat = await getEtatNutrition()
            const p = etat.priorites.length ? etat.priorites : PAR_DEFAUT
            setPriorites(p)
            setPrioritesServeur(p)
            setRepas(etat.repas_semaine)
            setListe(etat.liste)
            setApportsJours(etat.apports_jours)
            setSante(etat.sante)
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Erreur de chargement.')
        }
    }

    useEffect(() => {
        recharger()
    }, [])

    async function demander(type: 'repas' | 'bilan' | 'objectifs' | 'liste') {
        setEnCours(type)
        setErreur(null)
        try {
            const r =
                type === 'repas'
                    ? await envoyerNutrition({ texte: texte.trim() })
                    : type === 'bilan'
                      ? await envoyerNutrition({ action: 'bilan' })
                      : type === 'liste'
                        ? await envoyerNutrition({ action: 'liste' })
                        : await envoyerNutrition({ action: 'objectifs', objectifs: priorites })
            if (type === 'bilan') setBilan(r)
            else if (r.intent === 'conseil') {
                setConseil(r)
                definirOuvert('nutri.conseil', true)
            }
            else if (type !== 'liste') setAnalyse(r)
            if (type === 'repas') setTexte('')
            await recharger()
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Une erreur est survenue.')
        } finally {
            setEnCours(null)
        }
    }

    async function cocher(item: ItemListe, fait: number) {
        const avant = liste
        setListe((l) => l.map((i) => (i.id === item.id ? { ...i, fait } : i)))
        try {
            const items = await cocherListe(item.id, fait)
            if (items.length) setListe(items)
            recharger() // les portions cochées à la main comptent dans les quotas du jour
        } catch {
            setListe(avant)
            setErreur('Impossible de mettre à jour la liste pour l’instant.')
        }
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

    const totalCible = liste.reduce((n, i) => n + i.cible, 0)
    const totalFait = liste.reduce((n, i) => n + Math.min(i.fait, i.cible), 0)
    const pourcent = totalCible ? Math.round((totalFait / totalCible) * 100) : 0
    const listeAffichee = [...liste]
        .filter((i) => (filtre === 'tout' ? true : filtre === 'encas' ? estEncas(i) && i.fait < i.cible : i.fait < i.cible))
        .sort((a, b) => Number(a.fait >= a.cible) - Number(b.fait >= b.cible))
    const prioritesModifiees = priorites.join() !== prioritesServeur.join()
    const aujourdhui = jourIndex(new Date())

    // Tableau de la semaine
    const couverture = NUTRIMENTS.map((n) => {
        const jours = Array(7).fill(false) as boolean[]
        for (const r of repas) {
            const texteRepas = sansAccent(`${r.nutriments.join(' ')} ${r.description}`)
            if (n.motifs.test(texteRepas)) jours[jourIndex(new Date(r.date))] = true
        }
        return { ...n, jours }
    })

    return (
        <div className="nu">
            <section className="nu-hero">
                <h1>Nutrition</h1>
                <p>Ton coach te dit quoi manger, en nutriments et en aliments simples.</p>
            </section>

            {erreur && <p className="form-error">{erreur}</p>}

            {/* Quotas du jour (calories, sucres ajoutés, gras saturés) */}
            <QuotasJour apports={apportsJours} sante={sante} priorite={prioritesServeur[0] ?? 'musculation'} />

            {/* Liste de la semaine */}
            <section className={`nu-carte repliable${listeOuverte ? '' : ' replie'}`}>
                <div className="nu-carte-tete">
                    <div className="nu-anneau" style={{ '--p': `${pourcent}%` } as React.CSSProperties}>
                        <span>{pourcent}%</span>
                    </div>
                    <div className="nu-carte-titre">
                        <h2>
                            <BoutonRepli ouvert={listeOuverte} onClick={() => basculerListe()}>
                                🛒 Ma liste de la semaine
                            </BoutonRepli>
                        </h2>
                        <p>
                            {liste.length
                                ? `${totalFait} portions sur ${totalCible} · il en reste ${totalCible - totalFait}`
                                : 'Ce que tu dois manger cette semaine, à cocher au fur et à mesure.'}
                        </p>
                    </div>
                </div>

                {listeOuverte && (liste.length === 0 ? (
                    <button className="btn-primary" onClick={() => demander('liste')} disabled={enCours !== null}>
                        {enCours === 'liste' ? 'Le coach prépare ta liste…' : '✨ Générer ma liste de la semaine'}
                    </button>
                ) : (
                    <>
                        <div className="segmented nu-filtre" role="group" aria-label="Filtre">
                            <button className={filtre === 'reste' ? 'actif' : ''} onClick={() => setFiltre('reste')}>
                                À manger ({liste.filter((i) => i.fait < i.cible).length})
                            </button>
                            {liste.some(estEncas) && (
                                <button className={filtre === 'encas' ? 'actif' : ''} onClick={() => setFiltre('encas')}>
                                    ⚡ Vite fait ({liste.filter((i) => estEncas(i) && i.fait < i.cible).length})
                                </button>
                            )}
                            <button className={filtre === 'tout' ? 'actif' : ''} onClick={() => setFiltre('tout')}>
                                Tout ({liste.length})
                            </button>
                        </div>
                        <ul className="nu-liste">
                            {listeAffichee.map((i) => {
                                const fini = i.fait >= i.cible
                                return (
                                    <li key={i.id} className={fini ? 'fini' : ''}>
                                        <span className="nu-liste-emoji">{i.emoji}</span>
                                        <div className="nu-liste-texte">
                                            <b>
                                                {i.aliment}
                                                {i.type === 'facile' && <em className="nu-type facile">⚡ facile</em>}
                                                {i.type === 'grignoter' && <em className="nu-type grignoter">🥜 en-cas</em>}
                                            </b>
                                            <span>{i.pourquoi}</span>
                                            {i.portion && <span className="nu-portion">● = {i.portion}</span>}
                                            <div className="nu-points">
                                                {Array.from({ length: Math.max(i.cible, i.fait) }, (_, k) => (
                                                    <button
                                                        key={k}
                                                        className={`nu-point ${k < i.fait ? 'ok' : ''} ${k >= i.cible ? 'bonus' : ''}`}
                                                        onClick={() => cocher(i, k < i.fait ? k : k + 1)}
                                                        aria-label={`${i.aliment} : ${k + 1} portion(s)${k >= i.cible ? ' (en plus)' : ''}`}
                                                    />
                                                ))}
                                                {fini && i.fait < MAX_FAIT && (
                                                    <button
                                                        className="nu-point nu-point-plus"
                                                        onClick={() => cocher(i, i.fait + 1)}
                                                        aria-label={`${i.aliment} : j’en ai mangé une portion de plus`}
                                                        title="J’en ai mangé plus que prévu"
                                                    >
                                                        +
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`nu-reste ${fini ? 'ok' : ''} ${i.fait > i.cible ? 'plus' : ''}`}>
                                            {i.fait > i.cible ? `+${i.fait - i.cible}` : fini ? '✓' : `${i.cible - i.fait}`}
                                            <small>{i.fait > i.cible ? 'en plus' : fini ? 'fait' : 'reste'}</small>
                                        </span>
                                    </li>
                                )
                            })}
                            {listeAffichee.length === 0 && <li className="nu-vide">🎉 Tout est coché pour cette semaine !</li>}
                        </ul>
                        <button className="btn-link nu-refaire" onClick={() => demander('liste')} disabled={enCours !== null}>
                            {enCours === 'liste' ? 'Le coach refait ta liste…' : '↻ Refaire ma liste (garde ce qui est coché)'}
                        </button>
                    </>
                ))}
            </section>

            {/* Noter un repas */}
            <Repliable cle="nutri.repas" className="nu-carte" titre="🍽️ Qu’est-ce que tu as mangé ?">
                <form
                    className="nu-saisie"
                    onSubmit={(e) => {
                        e.preventDefault()
                        if (texte.trim()) demander('repas')
                    }}
                >
                    <textarea
                        value={texte}
                        onChange={(e) => setTexte(e.target.value)}
                        placeholder="Ex. : ce midi 3 œufs, du riz complet et 2 bananes"
                        rows={2}
                        disabled={enCours !== null}
                    />
                    <p className="nu-astuce">
                        💡 Donne les quantités (3 œufs, 2 bananes, 1 boîte de sardines…) : ta liste se coche toute seule.
                    </p>
                    <button type="submit" className="btn-primary" disabled={enCours !== null || !texte.trim()}>
                        {enCours === 'repas' ? 'Analyse…' : 'Analyser'}
                    </button>
                </form>

                {analyse && (analyse.apports.length > 0 || analyse.reponse) && (
                    <div className="nu-resultat">
                        <h3>{analyse.titre || 'Analyse'}</h3>
                        <p className="nu-phrase">{analyse.reponse}</p>
                        {analyse.repas && (analyse.repas.kcal ?? null) !== null && (
                            <p className="nu-estimation">
                                ≈ {Math.round(analyse.repas.kcal ?? 0)} kcal · 🍬 {analyse.repas.sucres_ajoutes ?? 0} g de sucres ajoutés · 🧈{' '}
                                {analyse.repas.gras_satures ?? 0} g de gras saturés
                            </p>
                        )}
                        {(analyse.apports.length > 0 || analyse.manques.length > 0) && (
                            <div className="nu-deux">
                                <div className="nu-col nu-col-ok">
                                    <span className="nu-col-titre">✅ Ce repas apporte</span>
                                    {analyse.apports.map((a) => (
                                        <span key={a} className="nu-pastille ok">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                                <div className="nu-col nu-col-manque">
                                    <span className="nu-col-titre">⚠️ Il te manque</span>
                                    {analyse.manques.map((m) => (
                                        <span key={m} className="nu-pastille manque">
                                            {m}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {analyse.suggestions.length > 0 && (
                            <>
                                <span className="nu-col-titre">🥗 À ajouter ensuite</span>
                                <div className="nu-suggestions">
                                    {analyse.suggestions.map((s, k) => (
                                        <div key={k} className="nu-sugg">
                                            <span className="nu-sugg-emoji">{s.emoji || '🍽️'}</span>
                                            <b>{s.aliment}</b>
                                            {s.comment && <span>{s.comment}</span>}
                                            {s.nutriment && <span className="nu-pastille info">{s.nutriment}</span>}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                        {analyse.coches.length > 0 && (
                            <div className="nu-coches">
                                <p className="nu-col-titre">📝 Ajouté à ta liste</p>
                                <table className="nu-coches-table">
                                    <tbody>
                                        {analyse.coches.map((c) => {
                                            const item = liste.find((i) => i.id === c.id)
                                            const fait = item ? item.fait : c.apres
                                            const cible = item ? item.cible : c.apres
                                            const ajoute = fait - c.avant
                                            return (
                                                <tr key={c.id}>
                                                    <td className="nu-coches-aliment">
                                                        <span>{c.emoji}</span>
                                                        <div>
                                                            <b>{c.aliment}</b>
                                                            {c.quantite && <small>{c.quantite}</small>}
                                                            {c.equivalent && <small className="nu-equiv">≈ {c.equivalent}</small>}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="nu-pas">
                                                            <button
                                                                onClick={() => item && cocher(item, Math.max(0, fait - 1))}
                                                                disabled={!item || fait <= 0}
                                                                aria-label="Une portion de moins"
                                                            >
                                                                −
                                                            </button>
                                                            <b className={ajoute > 0 ? 'plus' : ''}>
                                                                {ajoute >= 0 ? `+${ajoute}` : ajoute}
                                                            </b>
                                                            <button
                                                                onClick={() => item && cocher(item, Math.min(MAX_FAIT, fait + 1))}
                                                                disabled={!item || fait >= MAX_FAIT}
                                                                aria-label="Une portion de plus"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="nu-coches-total">
                                                        <b>{fait}</b>/{cible}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                                <p className="nu-gris-petit">Le coach s'est trompé de quantité ? Corrige avec − / +.</p>
                            </div>
                        )}
                    </div>
                )}
            </Repliable>

            {/* Conseil personnalisé : quoi prendre, où, avec quel budget */}
            <ConseilCoach
                reponse={conseil}
                onReponse={setConseil}
                occupe={enCours !== null && enCours !== 'conseil'}
                onOccupe={(o) => setEnCours(o ? 'conseil' : null)}
            />

            {/* Tableau de la semaine */}
            <Repliable cle="nutri.tableau" className="nu-carte" titre="📊 Mon tableau de la semaine">
                <p className="nu-sous">Les nutriments que tes repas ont apportés, jour par jour.</p>
                <div className="nu-tableau-scroll">
                    <table className="nu-tableau">
                        <thead>
                            <tr>
                                <th />
                                {JOURS.map((j, k) => (
                                    <th key={k} className={k === aujourdhui ? 'auj' : ''}>
                                        {j}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {couverture.map((n) => (
                                <tr key={n.libelle}>
                                    <th>
                                        <span>{n.emoji}</span> {n.libelle}
                                    </th>
                                    {n.jours.map((ok, k) => (
                                        <td key={k} className={`${k === aujourdhui ? 'auj' : ''} ${k > aujourdhui ? 'futur' : ''}`}>
                                            <span className={`nu-case ${ok ? 'ok' : ''}`}>{ok ? '✓' : ''}</span>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {repas.length === 0 && <p className="nu-sous">Note tes repas pour remplir le tableau.</p>}
            </Repliable>

            {/* Guide des aliments */}
            <GuideAliments
                nomsListe={liste.map((i) => i.aliment)}
                manques={[...(analyse?.manques ?? []), ...(bilan?.manques ?? [])]}
                joursCouverts={Object.fromEntries(couverture.map((n) => [n.libelle, n.jours.filter(Boolean).length]))}
                aDesRepas={repas.length > 0}
            />

            {/* Bilan */}
            <Repliable
                cle="nutri.bilan"
                className="nu-carte"
                titre="🧭 Bilan de la semaine"
                entete={
                    <button
                        className="btn-secondary nu-petit"
                        onClick={() => {
                            definirOuvert('nutri.bilan', true)
                            demander('bilan')
                        }}
                        disabled={enCours !== null}
                    >
                        {enCours === 'bilan' ? 'Bilan…' : bilan ? '↻ Refaire' : 'Faire le bilan'}
                    </button>
                }
            >
                {!bilan && <p className="nu-sous">Ce qui est bien couvert, ce qui manque, et quoi manger les prochains jours.</p>}
                {bilan && (
                    <div className="nu-resultat">
                        <h3>{bilan.titre || 'Bilan'}</h3>
                        <p className="nu-phrase">{bilan.reponse}</p>
                        <div className="nu-deux">
                            <div className="nu-col nu-col-ok">
                                <span className="nu-col-titre">✅ Points forts</span>
                                {bilan.points_forts.map((a) => (
                                    <span key={a} className="nu-pastille ok">
                                        {a}
                                    </span>
                                ))}
                            </div>
                            <div className="nu-col nu-col-manque">
                                <span className="nu-col-titre">⚠️ À améliorer</span>
                                {bilan.manques.map((m) => (
                                    <span key={m} className="nu-pastille manque">
                                        {m}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {bilan.plan.length > 0 && (
                            <>
                                <span className="nu-col-titre">📅 Plan des prochains jours</span>
                                <table className="nu-plan">
                                    <thead>
                                        <tr>
                                            <th>Jour</th>
                                            <th>Repas</th>
                                            <th>Idée</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bilan.plan.map((p, k) => {
                                            const nouveauJour = k === 0 || bilan.plan[k - 1].jour !== p.jour
                                            const nb = bilan.plan.filter((x) => x.jour === p.jour).length
                                            return (
                                                <tr key={k} className={nouveauJour ? 'nouveau' : ''}>
                                                    {nouveauJour && (
                                                        <td rowSpan={nb} className="nu-plan-jour">
                                                            {p.jour}
                                                        </td>
                                                    )}
                                                    <td className="nu-plan-repas">{p.repas}</td>
                                                    <td>
                                                        <b>{p.idee}</b>
                                                        {p.pour && <span className="nu-plan-pour">{p.pour}</span>}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                )}
            </Repliable>

            {/* Priorités */}
            <Repliable cle="nutri.priorites" className="nu-carte" titre="🎯 Mes priorités" resume={`n°1 : ${objectif(priorites[0]).emoji} ${objectif(priorites[0]).libelle}`}>
                <p className="nu-sous">Touche un objectif pour le passer en n°1.</p>
                <div className="nu-objectifs">
                    {priorites.map((o, k) => (
                        <button
                            key={o}
                            className={`nu-objectif ${k === 0 ? 'top' : ''}`}
                            onClick={() => setPriorites((p) => [o, ...p.filter((x) => x !== o)])}
                            disabled={enCours !== null}
                        >
                            <span className="nu-objectif-rang">{k + 1}</span>
                            {objectif(o).emoji} {objectif(o).libelle}
                        </button>
                    ))}
                </div>
                {prioritesModifiees && (
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setPriorites(prioritesServeur)} disabled={enCours !== null}>
                            Annuler
                        </button>
                        <button className="btn-primary" onClick={() => demander('objectifs')} disabled={enCours !== null}>
                            {enCours === 'objectifs' ? 'Enregistrement…' : 'Enregistrer'}
                        </button>
                    </div>
                )}
            </Repliable>

            {/* Journal */}
            <Repliable cle="nutri.journal" className="nu-carte" titre="📖 Mon journal de la semaine" resume={`${repas.length} repas`}>
                {repas.length === 0 ? (
                    <p className="nu-sous">Aucun repas noté depuis lundi.</p>
                ) : (
                    <table className="nu-journal">
                        <tbody>
                            {repas.map((r, k) => {
                                const d = new Date(r.date)
                                const nouveauJour = k === 0 || jourIndex(new Date(repas[k - 1].date)) !== jourIndex(d)
                                const m = MOMENTS[r.moment] ?? { libelle: r.moment, emoji: '🍽️' }
                                return (
                                    <Fragment key={r.id}>
                                        {nouveauJour && (
                                            <tr className="nu-journal-jour">
                                                <td colSpan={3}>{jourNom.format(d)}</td>
                                            </tr>
                                        )}
                                        <tr>
                                            <td className="nu-journal-moment">
                                                <span>{m.emoji}</span>
                                                {m.libelle}
                                            </td>
                                            <td>
                                                <b>{r.description}</b>
                                                {(r.kcal ?? null) !== null && (
                                                    <small className="nu-journal-kcal">
                                                        ≈ {r.kcal} kcal{r.sucres_ajoutes ? ` · ${r.sucres_ajoutes} g sucres ajoutés` : ''}
                                                    </small>
                                                )}
                                                <div className="nu-journal-nutri">
                                                    {r.nutriments.slice(0, 5).map((n) => (
                                                        <span key={n} className="nu-pastille info">
                                                            {n}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="nu-journal-x">
                                                <button className="btn-icon" onClick={() => retirer(r)} aria-label="Retirer ce repas">
                                                    ×
                                                </button>
                                            </td>
                                        </tr>
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                )}
            </Repliable>
        </div>
    )
}
