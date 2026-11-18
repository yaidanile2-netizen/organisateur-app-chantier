import { ajouterNote, demandeDeNote } from './notes'
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import './assistant.css'
import type { ReponseNutrition } from './api'
import { ecouter, emettre } from './evenements'
import { demandeDeRetenir, demanderIA, ecrireHistorique, executerAction, extraireSouvenirs, fil as filIA, lireHistorique, memoire, oublier, retenir, type Message } from './ia'

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

const jourTexte = (iso: string) => {
    const d = new Date(iso)
    const auj = new Date()
    const hier = new Date(Date.now() - 86400000)
    const meme = (a: Date, b: Date) => a.toDateString() === b.toDateString()
    if (meme(d, auj)) return 'Aujourd’hui'
    if (meme(d, hier)) return 'Hier'
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ---------- Bouton flottant déplaçable (position gardée sur l'appareil) ----------
type Pos = { x: number; y: number } // en fraction de l'écran (0 à 1), coin haut-gauche du bouton
const CLE_POS = 'ia.fab.position'
function lirePos(): Pos | null {
    try {
        const p = JSON.parse(localStorage.getItem(CLE_POS) || 'null') as Pos | null
        return p && typeof p.x === 'number' && typeof p.y === 'number' ? p : null
    } catch {
        return null
    }
}
const borner = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

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
    const [souvenirs, setSouvenirs] = useState(() => memoire.lire().souvenirs)
    const [voirMemoire, setVoirMemoire] = useState(false)
    const [nouveauSouvenir, setNouveauSouvenir] = useState('')
    const [pos, setPos] = useState<Pos | null>(() => lirePos())
    const glisse = useRef<{ dx: number; dy: number; x0: number; y0: number; bouge: boolean } | null>(null)

    // Synchro de la conversation (30 jours) et de la mémoire entre appareils
    useEffect(() => {
        const a = filIA.abonner(() => setMessages(lireHistorique()))
        const b = memoire.abonner(() => setSouvenirs(memoire.lire().souvenirs))
        filIA.synchroniser().catch(() => {})
        memoire.synchroniser().catch(() => {})
        return () => {
            a()
            b()
        }
    }, [])
    useEffect(() => {
        if (ouvert) {
            filIA.synchroniser().catch(() => {})
            memoire.synchroniser().catch(() => {})
        }
    }, [ouvert])

    // Bouton : on le glisse où on veut ; un simple toucher ouvre l'assistant.
    function fabDown(e: React.PointerEvent<HTMLButtonElement>) {
        const r = e.currentTarget.getBoundingClientRect()
        glisse.current = { dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, bouge: false }
        e.currentTarget.setPointerCapture(e.pointerId)
    }
    function fabMove(e: React.PointerEvent<HTMLButtonElement>) {
        const g = glisse.current
        if (!g) return
        if (!g.bouge && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 8) return
        g.bouge = true
        const w = window.innerWidth
        const h = window.innerHeight
        setPos({ x: borner((e.clientX - g.dx) / w, 0, (w - 56) / w), y: borner((e.clientY - g.dy) / h, 60 / h, (h - 56 - 64) / h) })
    }
    function fabUp(e: React.PointerEvent<HTMLButtonElement>) {
        const g = glisse.current
        glisse.current = null
        try {
            e.currentTarget.releasePointerCapture(e.pointerId)
        } catch {
            // déjà relâché
        }
        if (!g?.bouge) {
            setOuvert(true)
            return
        }
        // on le colle au bord le plus proche (gauche ou droite)
        setPos((p) => {
            if (!p) return p
            const w = window.innerWidth
            const x = p.x * w + 28 < w / 2 ? 12 / w : (w - 56 - 12) / w
            const n = { x, y: p.y }
            try {
                localStorage.setItem(CLE_POS, JSON.stringify(n))
            } catch {
                // stockage indisponible
            }
            return n
        })
    }
    function replacerBouton() {
        setPos(null)
        try {
            localStorage.removeItem(CLE_POS)
        } catch {
            // stockage indisponible
        }
    }
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
            // « note que … » : la note est ajoutée tout de suite à « Notes et rappels », sans attendre l'IA.
            const note = demandeDeNote(message)
            if (note) {
                ajouterNote(note)
                setTexte('')
                ajouter({ id: id(), role: 'assistant', texte: `📝 Noté : « ${note} ». Tu la retrouves dans l’Agenda → Notes et rappels. Si tu veux un rappel à une heure précise, dis-moi quand.`, date: new Date().toISOString() })
                emettre('organisateur:actualiser', { domaine: 'agenda' })
                return
            }
            const aRetenir = demandeDeRetenir(message)
            if (aRetenir) retenir(aRetenir)
            const avant = memoire.lire().souvenirs.length
            setTexte('')
            setOccupe(true)
            try {
                const r = await demanderIA(message, historique, ecran)
                r.reponse = extraireSouvenirs(r.reponse || '')
                const nouveaux = memoire.lire().souvenirs.slice(avant)
                if (nouveaux.length) r.reponse = `${r.reponse}\n\n🧠 Je retiens : ${nouveaux.map((x) => x.texte).join(' · ')}`
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
                className={`ia-fab${ouvert ? ' cache' : ''}${ecran === 'cours' && !pos ? ' haut' : ''}${pos ? ' libre' : ''}`}
                style={pos ? { left: `${pos.x * 100}%`, top: `${pos.y * 100}%`, right: 'auto', bottom: 'auto' } : undefined}
                onPointerDown={fabDown}
                onPointerMove={fabMove}
                onPointerUp={fabUp}
                onPointerCancel={() => (glisse.current = null)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setOuvert(true)
                }}
                aria-label="Ouvrir l’assistant (glisse-le pour le déplacer)"
                title="Touche pour ouvrir · glisse pour déplacer"
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
                        <button onClick={() => setVoirMemoire((v) => !v)} aria-label="Ce que l’assistant retient" title="Ce que l’assistant retient">
                            🧠
                        </button>
                        {pos && (
                            <button onClick={replacerBouton} aria-label="Remettre le bouton à sa place" title="Remettre le bouton ✨ à sa place">
                                ↘︎
                            </button>
                        )}
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
                    {voirMemoire && (
                        <div className="ia-memoire">
                            <b>🧠 Ce que je retiens de toi</b>
                            <p className="ia-gris">Je m’en sers à chaque réponse. Dis « retiens que… » pour en ajouter, ou écris-le ici.</p>
                            {souvenirs.length === 0 && <p className="ia-gris">Rien pour l’instant.</p>}
                            <ul>
                                {souvenirs.map((s) => (
                                    <li key={s.id}>
                                        <span>{s.texte}</span>
                                        <button onClick={() => oublier(s.id)} aria-label="Oublier">
                                            ×
                                        </button>
                                    </li>
                                ))}
                            </ul>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    retenir(nouveauSouvenir)
                                    setNouveauSouvenir('')
                                }}
                            >
                                <input value={nouveauSouvenir} onChange={(e) => setNouveauSouvenir(e.target.value)} placeholder="ex. Je ne mange pas de porc" />
                                <button type="submit" disabled={!nouveauSouvenir.trim()}>
                                    Ajouter
                                </button>
                            </form>
                        </div>
                    )}
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
                    {messages.map((m, k) => (
                        <Fragment key={m.id}>
                        {(k === 0 || jourTexte(messages[k - 1].date) !== jourTexte(m.date)) && <div className="ia-jour">{jourTexte(m.date)}</div>}
                        <div className={`ia-msg ${m.role}${m.erreur ? ' erreur' : ''}`}>
                            <div className="ia-bulle">
                                {m.role === 'assistant' ? <Riche texte={m.texte} /> : m.texte}
                                {m.nutrition && <CarteNutrition r={m.nutrition} />}
                            </div>
                        </div>
                        </Fragment>
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
