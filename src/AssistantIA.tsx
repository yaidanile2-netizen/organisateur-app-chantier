import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './assistant.css'
import type { ReponseNutrition } from './api'
import { ecouter, emettre } from './evenements'
import { demanderIA, ecrireHistorique, executerAction, lireHistorique, type Message } from './ia'

const NOMS: Record<string, string> = { agenda: 'Agenda', muscu: 'Muscu', nutrition: 'Nutrition', cours: 'Cours' }

const SUGGESTIONS: Record<string, { texte: string; prerempli?: boolean }[]> = {
    agenda: [
        { texte: 'Qu’est-ce que j’ai de prévu demain ?' },
        { texte: 'Rappelle-moi de ', prerempli: true },
        { texte: 'Comment organiser ma soirée de révision ?' },
    ],
    muscu: [
        { texte: 'Explique-moi ma prochaine séance' },
        { texte: 'Je suis courbaturé, j’adapte comment ?' },
        { texte: 'Suis-je prêt pour mon défi ?' },
    ],
    nutrition: [
        { texte: 'J’ai mangé ', prerempli: true },
        { texte: 'Je mange quoi ce midi au supermarché avec 5 € ?' },
        { texte: 'Donne-moi 3 idées de dîner rapide' },
        { texte: 'Fais le bilan de ma semaine' },
    ],
    cours: [
        { texte: 'Explique-moi ça simplement' },
        { texte: 'Donne-moi un exercice d’entraînement' },
        { texte: 'Pose-moi 3 questions pour réviser' },
    ],
}

const id = () => Math.random().toString(36).slice(2, 10)

/** Texte de l'IA : **gras**, listes « - », paragraphes. */
function Riche({ texte }: { texte: string }) {
    const enLigne = (s: string): ReactNode[] =>
        s.split(/(\*\*[^*]+\*\*)/g).map((p, k) => (p.startsWith('**') && p.endsWith('**') ? <strong key={k}>{p.slice(2, -2)}</strong> : <Fragment key={k}>{p}</Fragment>))
    const blocs: ReactNode[] = []
    let liste: string[] = []
    const vider = () => {
        if (liste.length) blocs.push(<ul key={`l${blocs.length}`}>{liste.map((l, k) => <li key={k}>{enLigne(l)}</li>)}</ul>)
        liste = []
    }
    for (const ligne of texte.split('\n')) {
        const m = ligne.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/)
        if (m) liste.push(m[1])
        else {
            vider()
            if (ligne.trim()) blocs.push(<p key={`p${blocs.length}`}>{enLigne(ligne)}</p>)
        }
    }
    vider()
    return <>{blocs}</>
}

function CarteNutrition({ r }: { r: ReponseNutrition }) {
    if (r.intent === 'conseil' && r.conseil) {
        return (
            <div className="ia-carte">
                {r.conseil.options.map((o, k) => (
                    <div key={k} className="ia-option">
                        <div className="ia-option-tete">
                            <b>{o.titre || `Option ${k + 1}`}</b>
                            {o.prix && <span className="ia-prix">{o.prix}</span>}
                        </div>
                        <ul>
                            {o.items.map((i, j) => (
                                <li key={j}>
                                    <span>{i.emoji || '•'}</span> {i.aliment}
                                    {i.prix && <small> · {i.prix}</small>}
                                </li>
                            ))}
                        </ul>
                        {o.pour && <p className="ia-gris">🎯 {o.pour}</p>}
                    </div>
                ))}
                {r.conseil.astuces.length > 0 && <p className="ia-gris">💡 {r.conseil.astuces.join(' · ')}</p>}
            </div>
        )
    }
    if (r.intent === 'bilan') {
        return (
            <div className="ia-carte">
                {r.points_forts.length > 0 && (
                    <p>
                        <b>✅ Points forts :</b> {r.points_forts.join(', ')}
                    </p>
                )}
                {r.manques.length > 0 && (
                    <p>
                        <b>⚠️ À améliorer :</b> {r.manques.join(', ')}
                    </p>
                )}
                {r.plan.length > 0 && (
                    <ul>
                        {r.plan.slice(0, 6).map((l, k) => (
                            <li key={k}>
                                <b>{l.jour}</b> · {l.repas} : {l.idee}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        )
    }
    if (r.intent === 'liste' && r.liste) {
        return <div className="ia-carte ia-gris">🛒 Ta liste a été refaite : {r.liste.length} aliments, ce qui était coché est gardé.</div>
    }
    const kcal = r.repas?.kcal
    return (
        <div className="ia-carte">
            {r.titre && <b className="ia-carte-titre">{r.titre}</b>}
            {kcal !== null && kcal !== undefined && (
                <p className="ia-gris">
                    ≈ {Math.round(kcal)} kcal · 🍬 {r.repas?.sucres_ajoutes ?? 0} g · 🧈 {r.repas?.gras_satures ?? 0} g
                </p>
            )}
            {(r.apports.length > 0 || r.manques.length > 0) && (
                <div className="ia-pastilles">
                    {r.apports.map((a) => (
                        <span key={a} className="ia-pastille ok">
                            {a}
                        </span>
                    ))}
                    {r.manques.map((m) => (
                        <span key={m} className="ia-pastille manque">
                            {m}
                        </span>
                    ))}
                </div>
            )}
            {r.coches.length > 0 && (
                <p className="ia-gris">
                    📝 Coché dans ta liste : {r.coches.map((c) => `${c.emoji ?? ''} ${c.aliment} +${Math.max(0, c.apres - c.avant)}`).join(' · ')}
                </p>
            )}
            {r.suggestions.length > 0 && (
                <p className="ia-gris">🥗 Ensuite : {r.suggestions.map((s) => `${s.emoji ?? ''} ${s.aliment}`).join(', ')}</p>
            )}
        </div>
    )
}

export default function AssistantIA({ ecran }: { ecran: string }) {
    const [ouvert, setOuvert] = useState(false)
    const [messages, setMessages] = useState<Message[]>(() => lireHistorique())
    const [texte, setTexte] = useState('')
    const [occupe, setOccupe] = useState(false)
    const fil = useRef<HTMLDivElement>(null)
    const champ = useRef<HTMLTextAreaElement>(null)
    const messagesRef = useRef(messages)
    messagesRef.current = messages

    const ajouter = useCallback((m: Message) => {
        setMessages((l) => {
            const n = [...l, m]
            ecrireHistorique(n)
            return n
        })
    }, [])
    const remplacer = useCallback((idm: string, m: Partial<Message>) => {
        setMessages((l) => {
            const n = l.map((x) => (x.id === idm ? { ...x, ...m } : x))
            ecrireHistorique(n)
            return n
        })
    }, [])

    const envoyer = useCallback(
        async (brut: string) => {
            const message = brut.trim()
            if (!message || occupe) return
            const historique = messagesRef.current
            ajouter({ id: id(), role: 'user', texte: message, date: new Date().toISOString() })
            setTexte('')
            setOccupe(true)
            try {
                const r = await demanderIA(message, historique, ecran)
                const idr = id()
                ajouter({ id: idr, role: 'assistant', texte: r.reponse, date: new Date().toISOString(), action: r.action, relances: r.relances })
                if (r.action !== 'aucune') {
                    try {
                        const res = await executerAction(r, message)
                        if (res.nutrition) {
                            remplacer(idr, { nutrition: res.nutrition, texte: res.nutrition.reponse ? `${r.reponse}\n\n${res.nutrition.reponse}` : r.reponse })
                            emettre('organisateur:nutrition', res.nutrition)
                            emettre('organisateur:actualiser', { domaine: 'nutrition' })
                        }
                        if (res.organiser) {
                            remplacer(idr, { organiser: res.organiser, texte: res.organiser })
                            emettre('organisateur:actualiser', { domaine: 'agenda' })
                        }
                    } catch (e) {
                        remplacer(idr, { texte: `${r.reponse}\n\n⚠️ Je n’ai pas pu terminer : ${e instanceof Error ? e.message : 'erreur'}`, erreur: true })
                    }
                }
            } catch (e) {
                ajouter({
                    id: id(),
                    role: 'assistant',
                    texte: `Je n’arrive pas à joindre l’assistant pour l’instant. ${e instanceof Error ? e.message : ''} Réessaie dans un instant.`,
                    date: new Date().toISOString(),
                    erreur: true,
                })
            } finally {
                setOccupe(false)
            }
        },
        [occupe, ecran, ajouter, remplacer]
    )

    // Ouverture depuis n'importe où (bouton d'un écran, raccourci…)
    useEffect(
        () =>
            ecouter('organisateur:ia', ({ texte: t, envoyer: tout }) => {
                setOuvert(true)
                if (t && tout) envoyer(t)
                else if (t) {
                    setTexte(t)
                    window.setTimeout(() => {
                        const c = champ.current
                        if (c) {
                            c.focus()
                            c.setSelectionRange(t.length, t.length)
                        }
                    }, 350)
                }
            }),
        [envoyer]
    )

    useEffect(() => {
        if (!ouvert) return
        const f = fil.current
        if (f) f.scrollTo({ top: f.scrollHeight, behavior: 'smooth' })
    }, [messages, occupe, ouvert])

    useEffect(() => {
        document.body.classList.toggle('ia-ouvert', ouvert)
        if (!ouvert) return
        const echap = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false)
        window.addEventListener('keydown', echap)
        return () => window.removeEventListener('keydown', echap)
    }, [ouvert])

    useEffect(() => {
        const c = champ.current
        if (!c) return
        c.style.height = 'auto'
        c.style.height = `${Math.min(140, c.scrollHeight)}px`
    }, [texte])

    const dernier = messages[messages.length - 1]
    const suggestions = SUGGESTIONS[ecran] ?? SUGGESTIONS.agenda

    function choisirSuggestion(s: { texte: string; prerempli?: boolean }) {
        if (s.prerempli) {
            setTexte(s.texte)
            window.setTimeout(() => champ.current?.focus(), 50)
        } else envoyer(s.texte)
    }

    return (
        <>
            <button
                className={`ia-fab${ouvert ? ' cache' : ''}${ecran === 'cours' ? ' haut' : ''}`}
                onClick={() => setOuvert(true)}
                aria-label="Ouvrir l’assistant"
            >
                <span aria-hidden="true">✨</span>
            </button>

            <div className={`ia-fond${ouvert ? ' ouvert' : ''}`} onClick={() => setOuvert(false)} aria-hidden="true" />
            <section className={`ia-panneau${ouvert ? ' ouvert' : ''}`} role="dialog" aria-modal="true" aria-label="Assistant" aria-hidden={!ouvert}>
                <div className="ia-poignee" onClick={() => setOuvert(false)} />
                <header className="ia-tete">
                    <div>
                        <b>✨ Assistant</b>
                        <span className="ia-ecran">voit l’écran : {NOMS[ecran] ?? ecran}</span>
                    </div>
                    <div className="ia-tete-btns">
                        {messages.length > 0 && (
                            <button
                                onClick={() => {
                                    if (window.confirm('Effacer la conversation ?')) {
                                        setMessages([])
                                        ecrireHistorique([])
                                    }
                                }}
                                aria-label="Nouvelle conversation"
                                title="Nouvelle conversation"
                            >
                                ↺
                            </button>
                        )}
                        <button onClick={() => setOuvert(false)} aria-label="Fermer">
                            ✕
                        </button>
                    </div>
                </header>

                <div className="ia-fil" ref={fil}>
                    {messages.length === 0 && (
                        <div className="ia-accueil">
                            <div className="ia-orbe" aria-hidden="true">
                                ✨
                            </div>
                            <h3>Salut Daniel 👋</h3>
                            <p>
                                Demande-moi n’importe quoi : tes repas, une idée de plat, ta séance, ton planning, un rappel, ou une notion de cours. Je
                                vois l’écran ouvert.
                            </p>
                        </div>
                    )}
                    {messages.map((m) => (
                        <div key={m.id} className={`ia-msg ${m.role}${m.erreur ? ' erreur' : ''}`}>
                            <div className="ia-bulle">
                                {m.role === 'assistant' ? <Riche texte={m.texte} /> : m.texte}
                                {m.nutrition && <CarteNutrition r={m.nutrition} />}
                            </div>
                        </div>
                    ))}
                    {occupe && (
                        <div className="ia-msg assistant">
                            <div className="ia-bulle ia-points" aria-label="L’assistant réfléchit">
                                <i />
                                <i />
                                <i />
                            </div>
                        </div>
                    )}
                    {!occupe && (
                        <div className="ia-relances">
                            {(dernier?.role === 'assistant' && dernier.relances?.length ? dernier.relances.map((t) => ({ texte: t })) : messages.length ? [] : suggestions).map(
                                (s) => (
                                    <button key={s.texte} onClick={() => choisirSuggestion(s)}>
                                        {s.texte}
                                        {'prerempli' in s && s.prerempli ? '…' : ''}
                                    </button>
                                )
                            )}
                        </div>
                    )}
                </div>

                <form
                    className="ia-saisie"
                    onSubmit={(e) => {
                        e.preventDefault()
                        envoyer(texte)
                    }}
                >
                    <textarea
                        ref={champ}
                        value={texte}
                        rows={1}
                        placeholder="Écris ou dicte ta demande…"
                        onChange={(e) => setTexte(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
                                e.preventDefault()
                                envoyer(texte)
                            }
                        }}
                    />
                    <button type="submit" disabled={occupe || !texte.trim()} aria-label="Envoyer">
                        ↑
                    </button>
                </form>
            </section>
        </>
    )
}
