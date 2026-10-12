import { useState } from 'react'
import {
    envoyerNutrition,
    type ContexteConseil,
    type CuisineConseil,
    type LieuConseil,
    type MomentConseil,
    type ReponseNutrition,
} from './api'

const MOMENTS: { cle: MomentConseil; libelle: string; emoji: string }[] = [
    { cle: 'petit_dejeuner', libelle: 'Petit-déj', emoji: '🌅' },
    { cle: 'midi', libelle: 'Midi', emoji: '🍽️' },
    { cle: 'gouter', libelle: 'Goûter', emoji: '🍎' },
    { cle: 'soir', libelle: 'Soir', emoji: '🌙' },
]
const LIEUX: { cle: LieuConseil; libelle: string; emoji: string }[] = [
    { cle: 'supermarche', libelle: 'Supermarché', emoji: '🛒' },
    { cle: 'boulangerie', libelle: 'Boulangerie', emoji: '🥖' },
    { cle: 'cafeteria', libelle: 'Cafét / RU', emoji: '🏫' },
    { cle: 'fast_food', libelle: 'Fast-food', emoji: '🍔' },
    { cle: 'maison', libelle: 'Maison', emoji: '🏠' },
]
const CUISINES: { cle: CuisineConseil; libelle: string; emoji: string }[] = [
    { cle: 'non', libelle: 'Pas de cuisine', emoji: '🚫' },
    { cle: 'micro_ondes', libelle: 'Micro-ondes', emoji: '📦' },
    { cle: 'oui', libelle: 'Je peux cuisiner', emoji: '🍳' },
]
const BUDGETS = [3, 5, 7, 10]
const CLE = 'nutrition.conseil'

function momentParDefaut(d: Date): MomentConseil {
    const h = d.getHours()
    if (h < 10) return 'petit_dejeuner'
    if (h < 14) return 'midi'
    if (h < 18) return 'gouter'
    return 'soir'
}

function lirePreferences(): Pick<ContexteConseil, 'lieu' | 'cuisine' | 'budget'> {
    const defaut = { lieu: 'supermarche' as LieuConseil, cuisine: 'non' as CuisineConseil, budget: 5 }
    try {
        const brut = localStorage.getItem(CLE)
        if (brut) return { ...defaut, ...JSON.parse(brut) }
    } catch {
        // stockage indisponible
    }
    return defaut
}

type Props = {
    reponse: ReponseNutrition | null
    onReponse: (r: ReponseNutrition) => void
    occupe: boolean
    onOccupe: (o: boolean) => void
}

export default function ConseilCoach({ reponse, onReponse, occupe, onOccupe }: Props) {
    const [prefs] = useState(lirePreferences)
    const [moment, setMoment] = useState<MomentConseil>(() => momentParDefaut(new Date()))
    const [lieu, setLieu] = useState<LieuConseil>(prefs.lieu)
    const [cuisine, setCuisine] = useState<CuisineConseil>(prefs.cuisine)
    const [budget, setBudget] = useState<string>(prefs.budget ? String(prefs.budget) : '')
    const [texte, setTexte] = useState('')
    const [enCours, setEnCours] = useState(false)
    const [erreur, setErreur] = useState<string | null>(null)

    async function demander() {
        const b = Number(budget.replace(',', '.'))
        const contexte: ContexteConseil = { moment, lieu, cuisine, budget: b > 0 ? Math.round(b * 100) / 100 : null }
        try {
            localStorage.setItem(CLE, JSON.stringify({ lieu, cuisine, budget: contexte.budget }))
        } catch {
            // stockage indisponible
        }
        setEnCours(true)
        onOccupe(true)
        setErreur(null)
        try {
            onReponse(await envoyerNutrition({ action: 'conseil', texte: texte.trim(), contexte }))
        } catch (err) {
            setErreur(err instanceof Error ? err.message : 'Le coach ne répond pas.')
        } finally {
            setEnCours(false)
            onOccupe(false)
        }
    }

    const conseil = reponse?.conseil

    return (
        <section className="nu-carte co">
            <h2>💬 Demande au coach</h2>
            <p className="nu-sous">Il te conseille quoi prendre selon ta semaine, l’endroit et ton budget.</p>

            <form
                className="co-form"
                onSubmit={(e) => {
                    e.preventDefault()
                    demander()
                }}
            >
                <div className="co-ligne">
                    <span className="co-label">Quand</span>
                    <div className="co-choix">
                        {MOMENTS.map((m) => (
                            <button type="button" key={m.cle} className={moment === m.cle ? 'actif' : ''} onClick={() => setMoment(m.cle)}>
                                {m.emoji} {m.libelle}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="co-ligne">
                    <span className="co-label">Où</span>
                    <div className="co-choix">
                        {LIEUX.map((l) => (
                            <button type="button" key={l.cle} className={lieu === l.cle ? 'actif' : ''} onClick={() => setLieu(l.cle)}>
                                {l.emoji} {l.libelle}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="co-ligne">
                    <span className="co-label">Cuisine</span>
                    <div className="co-choix">
                        {CUISINES.map((c) => (
                            <button type="button" key={c.cle} className={cuisine === c.cle ? 'actif' : ''} onClick={() => setCuisine(c.cle)}>
                                {c.emoji} {c.libelle}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="co-ligne">
                    <span className="co-label">Budget</span>
                    <div className="co-choix">
                        {BUDGETS.map((b) => (
                            <button type="button" key={b} className={Number(budget) === b ? 'actif' : ''} onClick={() => setBudget(String(b))}>
                                {b} €
                            </button>
                        ))}
                        <label className="co-budget">
                            <input
                                inputMode="decimal"
                                value={BUDGETS.includes(Number(budget)) ? '' : budget}
                                onChange={(e) => setBudget(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
                                placeholder="autre"
                                aria-label="Budget en euros, boisson comprise"
                            />
                            €
                        </label>
                    </div>
                </div>
                <p className="co-note">Budget pour tout : repas, boisson, dessert.</p>
                <textarea
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    placeholder="Une précision ? Ex. : j’ai sport ce soir, pas de porc, j’ai très faim…"
                    rows={2}
                    disabled={enCours}
                />
                <button className="btn-primary" type="submit" disabled={enCours || occupe}>
                    {enCours ? 'Le coach réfléchit…' : '✨ Qu’est-ce que je prends ?'}
                </button>
                {erreur && <p className="form-error">{erreur}</p>}
            </form>

            {reponse && (
                <div className="nu-resultat co-resultat">
                    {reponse.titre && <h3>{reponse.titre}</h3>}
                    {reponse.reponse && <p className="nu-phrase">{reponse.reponse}</p>}
                    {conseil && conseil.options.length > 0 && (
                        <div className="co-options">
                            {conseil.options.map((o, k) => (
                                <div key={k} className="co-option">
                                    <div className="co-option-tete">
                                        <span className="co-num">{k + 1}</span>
                                        <b>{o.titre || `Option ${k + 1}`}</b>
                                        {o.prix && <span className="co-prix">{o.prix}</span>}
                                    </div>
                                    <ul>
                                        {o.items.map((i, j) => (
                                            <li key={j}>
                                                <span className="co-emoji">{i.emoji || '•'}</span>
                                                <span className="co-article">
                                                    {i.aliment}
                                                    {i.detail && <small>{i.detail}</small>}
                                                </span>
                                                {i.prix && <span className="co-prix-article">{i.prix}</span>}
                                            </li>
                                        ))}
                                    </ul>
                                    {o.pour && <p className="co-pour">🎯 {o.pour}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                    {conseil && (conseil.astuces.length > 0 || conseil.eviter.length > 0) && (
                        <div className="nu-deux">
                            {conseil.astuces.length > 0 && (
                                <div className="nu-col nu-col-ok">
                                    <span className="nu-col-titre">💡 Astuces</span>
                                    {conseil.astuces.map((a) => (
                                        <span key={a} className="nu-pastille ok">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {conseil.eviter.length > 0 && (
                                <div className="nu-col nu-col-manque">
                                    <span className="nu-col-titre">🚫 Plutôt éviter</span>
                                    {conseil.eviter.map((a) => (
                                        <span key={a} className="nu-pastille manque">
                                            {a}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <p className="nu-gris-petit">Prix et Nutri-Score donnés à titre indicatif : vérifie en rayon.</p>
                </div>
            )}
        </section>
    )
}
