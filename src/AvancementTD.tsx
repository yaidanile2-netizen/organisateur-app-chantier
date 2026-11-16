// Avancement des TD : la question après chaque TD (« jusqu'où es-tu arrivé ? ») et le suivi par matière.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { getCoursEntre, type Cours } from './api'
import {
    abonnerAvancement,
    ETATS_EXO,
    basculerImportant,
    changerTotal,
    cleMatiere,
    definirExo,
    exosARevoir,
    exosImportants,
    exosRestants,
    ignorer,
    lireAvancement,
    positionDe,
    prevoirDS,
    questionsEnAttente,
    repondre,
    suggestion,
    synchroniserAvancement,
    texteExos,
    type EtatExo,
    type Question,
    type SuiviMatiere,
} from './suiviTD'
import { cleDuType, nomModule } from './coursType'
import { ecouter, emettre } from './evenements'
import Repliable from './Repliable'
import './avancement.css'

const JOUR = 24 * 3600 * 1000
const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
const dateCourte = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' })

export function useAvancement() {
    return useSyncExternalStore(abonnerAvancement, lireAvancement)
}

/** Cours d'une période, rechargés quand l'agenda change. */
function useCours(avant: number, apres: number): Cours[] | null {
    const [cours, setCours] = useState<Cours[] | null>(null)
    const [version, setVersion] = useState(0)
    useEffect(() => ecouter('organisateur:actualiser', () => setVersion((v) => v + 1)), [])
    useEffect(() => {
        let annule = false
        const maintenant = Date.now()
        getCoursEntre(new Date(maintenant - avant * JOUR), new Date(maintenant + apres * JOUR))
            .then((c) => !annule && setCours(c))
            .catch(() => !annule && setCours([]))
        synchroniserAvancement()
        return () => {
            annule = true
        }
    }, [avant, apres, version])
    return cours
}

function Compteur({ valeur, min, max, onChange, vide }: { valeur: number | undefined; min: number; max: number; onChange: (v: number | undefined) => void; vide?: string }) {
    return (
        <span className="av-compteur">
            <button type="button" onClick={() => onChange(valeur === undefined ? undefined : valeur - 1 < min ? (vide ? undefined : min) : valeur - 1)} aria-label="Moins">
                −
            </button>
            <b>{valeur ?? vide ?? min}</b>
            <button type="button" onClick={() => onChange(Math.min(max, (valeur ?? min - 1) + 1))} aria-label="Plus">
                +
            </button>
        </span>
    )
}

// ---------- La question après un TD ----------

function Formulaire({ q, s, onFini }: { q: Question; s: SuiviMatiere | undefined; onFini: () => void }) {
    const sug = suggestion(s)
    const [td, setTd] = useState(sug.td)
    const memeTd = (n: number) => (positionDe(s)?.td === n ? sug.depuis : 0)
    const depuis = memeTd(td)
    const [jusqua, setJusqua] = useState(depuis)
    const [total, setTotal] = useState<number | undefined>(s?.tds[sug.td]?.total)
    const [etats, setEtats] = useState<Record<number, EtatExo>>({})
    const [importants, setImportants] = useState<number[]>([])

    function changerTd(n: number | undefined) {
        const v = Math.max(1, n ?? 1)
        setTd(v)
        setJusqua(memeTd(v))
        setTotal(s?.tds[v]?.total)
        setEtats({})
        setImportants([])
    }

    const faitsIci = Array.from({ length: Math.max(0, jusqua - depuis) }, (_, i) => depuis + i + 1)

    return (
        <div className="av-form">
            <div className="av-ligne">
                <span>TD n°</span>
                <Compteur valeur={td} min={1} max={30} onChange={changerTd} />
            </div>
            <div className="av-ligne">
                <span>
                    Dernier exo fini
                    {depuis > 0 && <small>tu en étais à l’exo {depuis}</small>}
                </span>
                <Compteur
                    valeur={jusqua}
                    min={0}
                    max={total ?? 30}
                    onChange={(v) => {
                        setJusqua(v ?? 0)
                        setImportants((r) => r.filter((x) => x <= (v ?? 0)))
                    }}
                />
            </div>
            <div className="av-ligne">
                <span>
                    Nombre d’exos du TD
                    <small>si tu le connais</small>
                </span>
                <Compteur valeur={total} min={1} max={30} vide="?" onChange={(v) => setTotal(v === undefined ? undefined : Math.max(v, jusqua))} />
            </div>
            {faitsIci.length > 0 && (
                <div className="av-compris">
                    <span>Pour chaque exo : fait, compris ou à revoir ? Et ⭐ si c’est un exo important (pour le DS).</span>
                    <div className="av-exos-seance">
                        {faitsIci.map((e) => {
                            const etat = etats[e] ?? 'fait'
                            const imp = importants.includes(e)
                            return (
                                <div key={e} className="av-exo-ligne">
                                    <b>Ex. {e}</b>
                                    <div className="av-etats" role="radiogroup" aria-label={`État de l’exo ${e}`}>
                                        {(Object.keys(ETATS_EXO) as EtatExo[]).map((k) => (
                                            <button
                                                key={k}
                                                type="button"
                                                role="radio"
                                                aria-checked={etat === k}
                                                className={`av-etat ${k}${etat === k ? ' actif' : ''}`}
                                                onClick={() => setEtats((x) => ({ ...x, [e]: k }))}
                                            >
                                                {ETATS_EXO[k].icone} {ETATS_EXO[k].libelle}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        className={`av-star${imp ? ' actif' : ''}`}
                                        aria-pressed={imp}
                                        aria-label={`Exo ${e} important`}
                                        title="Exo important"
                                        onClick={() => setImportants((x) => (imp ? x.filter((y) => y !== e) : [...x, e]))}
                                    >
                                        {imp ? '⭐' : '☆'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
            {jusqua === 0 && depuis === 0 && <p className="muted av-note">0 = aucun exo fini (le TD vient de commencer).</p>}
            <div className="av-boutons">
                <button className="btn-secondary" type="button" onClick={() => (ignorer(q), onFini())}>
                    Pas eu ce TD
                </button>
                <button
                    className="btn-primary"
                    type="button"
                    onClick={() => {
                        repondre(q, { td, jusqua, total, depuis, etats, importants })
                        emettre('organisateur:actualiser', { domaine: 'agenda' })
                        onFini()
                    }}
                >
                    Enregistrer
                </button>
            </div>
        </div>
    )
}

/** Cartes « Jusqu'où es-tu arrivé ? » pour les TD terminés. `bandeau` : version compacte (onglet Cours). */
export function QuestionsTD({ bandeau = false }: { bandeau?: boolean }) {
    const a = useAvancement()
    const cours = useCours(7, 0)
    const [ouverte, setOuverte] = useState<string | null>(null)
    const [plusTard, setPlusTard] = useState<string[]>([])
    const questions = useMemo(() => (cours ? questionsEnAttente(cours, a) : []), [cours, a]).filter((q) => !plusTard.includes(q.cle))
    if (!questions.length) return null
    const liste = bandeau && !ouverte ? questions.slice(0, 1) : questions.slice(0, 3)

    return (
        <div className={bandeau ? 'av-bandeau' : 'av-questions'}>
            {liste.map((q) => {
                const s = a.matieres[q.cleMat]
                const ouvert = ouverte === q.cle || (!bandeau && questions.length === 1)
                return (
                    <section key={q.cle} className="card av-question">
                        <button className="av-question-tete" type="button" aria-expanded={ouvert} onClick={() => setOuverte(ouvert ? null : q.cle)}>
                            <span className="av-question-emoji">✏️</span>
                            <span>
                                <b>TD de {q.matiere} : jusqu’où es-tu arrivé ?</b>
                                <small>
                                    {jourCourt.format(q.fin)}
                                    {bandeau && questions.length > 1 ? ` · +${questions.length - 1} autre${questions.length > 2 ? 's' : ''}` : ''}
                                </small>
                            </span>
                            <span className="av-chevron">{ouvert ? '▴' : '▾'}</span>
                        </button>
                        {ouvert && (
                            <>
                                <Formulaire key={q.cle} q={q} s={s} onFini={() => setOuverte(null)} />
                                <button className="btn-link av-plus-tard" type="button" onClick={() => setPlusTard((p) => [...p, q.cle])}>
                                    Plus tard
                                </button>
                            </>
                        )}
                    </section>
                )
            })}
        </div>
    )
}

// ---------- Le suivi par matière (onglet Agenda) ----------

function prochainDS(cours: Cours[], s: SuiviMatiere): Date | null {
    const k = cleMatiere(s.nom)
    const ds = cours
        .filter((c) => cleDuType(c.type) === 'ds' && new Date(c.date_debut) > new Date())
        .filter((c) => {
            const m = cleMatiere(nomModule(c.titre))
            return m === k || m.includes(k) || k.includes(m)
        })
        .map((c) => new Date(c.date_debut))
        .sort((x, y) => x.getTime() - y.getTime())
    return ds[0] ?? null
}

function Matiere({ cle, s, cours }: { cle: string; s: SuiviMatiere; cours: Cours[] | null }) {
    const p = positionDe(s)
    const restants = exosRestants(s)
    const revoir = exosARevoir(s)
    const importants = exosImportants(s)
    const [sel, setSel] = useState<{ td: number; e: number } | null>(null)
    const ds = cours ? prochainDS(cours, s) : null
    const prev = ds && cours ? prevoirDS(s, ds, cours) : null
    const tds = Object.keys(s.tds)
        .map(Number)
        .sort((x, y) => x - y)
    return (
        <div className="av-matiere">
            <div className="av-matiere-tete">
                <b>{s.nom}</b>
                {p && (
                    <span className="av-pos">
                        TD {p.td} · ex. {p.jusqua}
                        {p.total ? `/${p.total}` : ''}
                    </span>
                )}
            </div>
            {tds.map((td) => {
                const info = s.tds[td]
                const n = Math.max(info.total ?? 0, ...Object.keys(info.exos).map(Number), p?.td === td ? p.jusqua : 0)
                const choisi = sel?.td === td ? sel.e : null
                const etatChoisi = choisi ? info.exos[choisi] : undefined
                return (
                    <div key={td} className="av-td-bloc">
                        <div className="av-td">
                            <span className="av-td-nom">TD {td}</span>
                            <div className="av-chips">
                                {Array.from({ length: n }, (_, i) => i + 1).map((e) => {
                                    const etat = info.exos[e]
                                    const imp = !!info.importants?.[e]
                                    return (
                                        <button
                                            key={e}
                                            type="button"
                                            className={`av-exo ${etat ?? 'afaire'}${choisi === e ? ' choisi' : ''}`}
                                            title={`Exo ${e} : ${etat ? ETATS_EXO[etat].libelle : 'pas fait'}${imp ? ', important' : ''}`}
                                            aria-expanded={choisi === e}
                                            onClick={() => setSel(choisi === e ? null : { td, e })}
                                        >
                                            {etat ? ETATS_EXO[etat].icone : e}
                                            {etat && <small className="av-exo-n">{e}</small>}
                                            {imp && <span className="av-exo-star">⭐</span>}
                                        </button>
                                    )
                                })}
                            </div>
                            <span className="av-total">
                                <small>sur</small>
                                <Compteur valeur={info.total} min={1} max={30} vide="?" onChange={(v) => changerTotal(cle, td, v)} />
                            </span>
                        </div>
                        {choisi && (
                            <div className="av-actions" role="group" aria-label={`Exo ${choisi} du TD ${td}`}>
                                <b>Ex. {choisi}</b>
                                <button type="button" className={`av-etat afaire${!etatChoisi ? ' actif' : ''}`} onClick={() => definirExo(cle, td, choisi, null)}>
                                    pas fait
                                </button>
                                {(Object.keys(ETATS_EXO) as EtatExo[]).map((k) => (
                                    <button key={k} type="button" className={`av-etat ${k}${etatChoisi === k ? ' actif' : ''}`} onClick={() => definirExo(cle, td, choisi, k)}>
                                        {ETATS_EXO[k].icone} {ETATS_EXO[k].libelle}
                                    </button>
                                ))}
                                <button type="button" className={`av-star${info.importants?.[choisi] ? ' actif' : ''}`} aria-pressed={!!info.importants?.[choisi]} onClick={() => basculerImportant(cle, td, choisi)}>
                                    {info.importants?.[choisi] ? '⭐' : '☆'} important
                                </button>
                            </div>
                        )}
                    </div>
                )
            })}
            <ul className="av-infos">
                {restants.length > 0 && <li>📌 À finir avant le prochain TD : {texteExos(restants)}</li>}
                {revoir.length > 0 && <li>🔁 À revoir avant le DS : {texteExos(revoir)}</li>}
                {importants.length > 0 && <li>⭐ Exos importants : {texteExos(importants)}</li>}
                {ds && (
                    <li>
                        📝 DS le {dateCourte.format(ds)} :{' '}
                        {prev
                            ? `vous devriez être vers le TD ${prev.td} ex. ${prev.exo} (${prev.seances} TD d’ici là, ≈ ${String(prev.rythme).replace('.', ',')} exos par séance).`
                            : 'note encore une séance de TD pour que je puisse estimer le programme.'}
                    </li>
                )}
            </ul>
        </div>
    )
}

export function SuiviTD() {
    const a = useAvancement()
    const cours = useCours(1, 90)
    const matieres = Object.entries(a.matieres)
    const aFinir = matieres.reduce((n, [, s]) => n + exosRestants(s).length, 0)
    const aRevoir = matieres.reduce((n, [, s]) => n + exosARevoir(s).length, 0)
    return (
        <Repliable
            cle="agenda.td"
            className="card av-suivi"
            titre="📈 Avancement des TD"
            resume={matieres.length ? [aFinir ? `${aFinir} à finir` : '', aRevoir ? `${aRevoir} à revoir` : ''].filter(Boolean).join(' · ') || '✅ à jour' : undefined}
        >
            {matieres.length === 0 ? (
                <p className="muted">
                    Après chaque TD, l’app te demandera jusqu’à quel exo tu es arrivé. Ton avancement s’affichera ici, avec les exos à finir, ceux à revoir, et le programme probable de chaque DS.
                </p>
            ) : (
                <>
                    <p className="muted av-legende">
                        <span className="av-exo afaire">1</span> pas fait · <span className="av-exo fait">✏️</span> fait · <span className="av-exo compris">💡</span> compris ·{' '}
                        <span className="av-exo revoir">🔁</span> à revoir · ⭐ important. Touche un exo pour le changer.
                    </p>
                    {matieres.map(([cle, s]) => (
                        <Matiere key={cle} cle={cle} s={s} cours={cours} />
                    ))}
                </>
            )}
        </Repliable>
    )
}
