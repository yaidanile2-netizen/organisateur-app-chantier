// Carte « Changer mon programme » (18/11/2026) : pas cours, malade, blessé, imprévu, repos.
// L'app pose quelques questions (tu vas quand même en cours ? sport ? révisions ?), note le changement,
// puis replace le sport et les révisions : « vu que ton programme a changé, la séance B passe à… ».
import { useEffect, useState } from 'react'
import Repliable from './Repliable'
import { getCoursEntre, type Cours } from './api'
import {
    TYPES,
    ZONES,
    ajouterChangement,
    effetsTexte,
    lireChangements,
    periodeTexte,
    stockJours,
    supprimerChangement,
    type Changement,
    type NiveauRevisions,
    type NiveauSport,
    type TypeChangement,
    type Zone,
} from './jours'
import { parcoursDe } from './programme'
import { appliquerReplan, calculerReplan, quandTexte, type Replan } from './replanifier'
import { jourIso } from './stockage'

type Etape = 'repos' | 'quoi' | 'questions' | 'calcul' | 'apercu' | 'enregistrement' | 'fait'
type Brouillon = {
    type: TypeChangement
    quand: 'auj' | 'demain' | 'autre'
    du: string
    au: string
    enCours: 'oui' | 'non' | 'certains'
    sautes: string[]
    sport: NiveauSport
    revisions: NiveauRevisions
    zone: Zone
    debut: string
    fin: string
    note: string
}

const heureF = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const jourF = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })

function demain(): string {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return jourIso(d)
}

function nouveau(type: TypeChangement): Brouillon {
    const auj = jourIso(new Date())
    return {
        type,
        quand: type === 'pas_cours' ? 'demain' : 'auj',
        du: type === 'pas_cours' ? demain() : auj,
        au: type === 'pas_cours' ? demain() : auj,
        enCours: type === 'pas_cours' ? 'non' : 'oui',
        sautes: [],
        sport: type === 'blesse' ? 'adapte' : type === 'malade' || type === 'repos' ? 'non' : 'normal',
        revisions: type === 'malade' ? 'allege' : 'normal',
        zone: 'haut',
        debut: '14:00',
        fin: '16:00',
        note: '',
    }
}

/** Une question à choix (boutons), comme dans un petit QCM. */
function Choix<T extends string>({ question, valeur, options, onChange }: { question: string; valeur: T; options: [T, string][]; onChange: (v: T) => void }) {
    return (
        <fieldset className="chg-q">
            <legend>{question}</legend>
            <div className="chg-options">
                {options.map(([v, l]) => (
                    <button type="button" key={v} className={valeur === v ? 'actif' : ''} aria-pressed={valeur === v} onClick={() => onChange(v)}>
                        {l}
                    </button>
                ))}
            </div>
        </fieldset>
    )
}

export default function ChangerProgramme({ onPlanifie }: { onPlanifie: () => void }) {
    const [etape, setEtape] = useState<Etape>('repos')
    const [b, setB] = useState<Brouillon>(() => nouveau('pas_cours'))
    const [cours, setCours] = useState<Cours[]>([])
    const [liste, setListe] = useState<Changement[]>(() => lireChangements())
    const [replan, setReplan] = useState<Replan | null>(null)
    const [dernier, setDernier] = useState<Changement | null>(null)
    const [erreur, setErreur] = useState<string | null>(null)

    useEffect(() => {
        const maj = () => setListe(lireChangements())
        const fin = stockJours.abonner(maj)
        stockJours.synchroniser().then(maj).catch(() => {})
        return fin
    }, [])

    // Les cours des jours choisis (pour « quels cours n'ont pas lieu ? »)
    useEffect(() => {
        if (etape !== 'questions' || b.du > b.au) return
        let fini = false
        getCoursEntre(new Date(`${b.du}T00:00:00`), new Date(`${b.au}T23:59:59`))
            .then((c) => {
                if (!fini) setCours(c.sort((x, y) => x.date_debut.localeCompare(y.date_debut)))
            })
            .catch(() => setCours([]))
        return () => {
            fini = true
        }
    }, [etape, b.du, b.au])

    const maj = (p: Partial<Brouillon>) => setB((x) => ({ ...x, ...p }))
    const auj = jourIso(new Date())
    const aVenir = liste.filter((c) => c.au >= auj).sort((x, y) => x.du.localeCompare(y.du))

    function choisirQuand(q: Brouillon['quand']) {
        if (q === 'auj') maj({ quand: q, du: auj, au: auj })
        else if (q === 'demain') maj({ quand: q, du: demain(), au: demain() })
        else maj({ quand: q })
    }

    async function recalculer(du: string, au: string) {
        setEtape('calcul')
        setErreur(null)
        try {
            setReplan(await calculerReplan(du, au))
            setEtape('apercu')
        } catch (e) {
            setErreur(e instanceof Error ? e.message : 'Impossible de recalculer le programme.')
            setEtape('apercu')
            setReplan({ mouvements: [], supprimer: [], creer: [] })
        }
    }

    async function noter() {
        const coursSautes: Changement['coursSautes'] =
            b.type === 'indispo' || b.type === 'repos'
                ? undefined
                : b.enCours === 'non'
                  ? b.type === 'pas_cours' && cours.length && b.sautes.length && b.sautes.length < cours.length
                      ? b.sautes
                      : 'tous'
                  : b.enCours === 'certains'
                    ? b.sautes
                    : undefined
        const c = ajouterChangement({
            type: b.type,
            du: b.du,
            au: b.au < b.du ? b.du : b.au,
            coursSautes,
            sport: b.sport,
            revisions: b.revisions,
            zone: b.type === 'blesse' ? b.zone : undefined,
            debut: b.type === 'indispo' ? b.debut : undefined,
            fin: b.type === 'indispo' ? b.fin : undefined,
            note: b.note.trim() || undefined,
        })
        setDernier(c)
        await recalculer(c.du, c.au)
    }

    async function retirer(c: Changement) {
        if (!window.confirm(`Retirer « ${TYPES[c.type].court} ${periodeTexte(c)} » ? Le programme normal revient pour ces jours.`)) return
        supprimerChangement(c.id)
        setDernier(null)
        await recalculer(c.du < auj ? auj : c.du, c.au)
    }

    async function appliquer() {
        if (!replan) return
        setEtape('enregistrement')
        setErreur(null)
        try {
            await appliquerReplan(replan)
            setEtape('fait')
            onPlanifie()
        } catch (e) {
            setErreur(e instanceof Error ? e.message : 'Une erreur est survenue.')
            setEtape('apercu')
        }
    }

    const coursCoches = (id: string) => b.sautes.includes(id)
    const basculerCours = (id: string) => maj({ sautes: coursCoches(id) ? b.sautes.filter((x) => x !== id) : [...b.sautes, id] })
    const courseC = parcoursDe('C') !== 'velo'

    return (
        <Repliable
            cle="agenda.changer"
            className="card chg"
            titre="🔄 Changer mon programme"
            resume={aVenir.length ? `${aVenir.length} changement${aVenir.length > 1 ? 's' : ''}` : undefined}
        >
            <p className="muted">Pas cours, malade, blessé, un imprévu ? Dis-le à l’app : elle replace ton sport et tes révisions.</p>

            {aVenir.length > 0 && (
                <ul className="chg-liste">
                    {aVenir.map((c) => (
                        <li key={c.id}>
                            <span className="chg-emoji">{TYPES[c.type].emoji}</span>
                            <span className="chg-texte">
                                <b>
                                    {TYPES[c.type].court} · {periodeTexte(c)}
                                </b>
                                <small>{effetsTexte(c).join(' · ') || 'programme normal'}</small>
                                {c.note && <small>📝 {c.note}</small>}
                            </span>
                            <button className="btn-icon chg-x" aria-label="Retirer ce changement" onClick={() => retirer(c)} disabled={etape === 'calcul' || etape === 'enregistrement'}>
                                ×
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {erreur && <p className="form-error">{erreur}</p>}

            {(etape === 'repos' || etape === 'fait') && (
                <button className="btn-primary chg-ajout" onClick={() => setEtape('quoi')}>
                    ＋ Un changement
                </button>
            )}

            {etape === 'quoi' && (
                <div className="chg-types">
                    <p className="chg-titre">Qu’est-ce qui change ?</p>
                    {(Object.keys(TYPES) as TypeChangement[]).map((t) => (
                        <button
                            key={t}
                            className="chg-type"
                            onClick={() => {
                                setB(nouveau(t))
                                setEtape('questions')
                            }}
                        >
                            <span>{TYPES[t].emoji}</span> {TYPES[t].libelle}
                        </button>
                    ))}
                    <button className="btn-link" onClick={() => setEtape('repos')}>
                        Annuler
                    </button>
                </div>
            )}

            {etape === 'questions' && (
                <div className="chg-form">
                    <p className="chg-titre">
                        {TYPES[b.type].emoji} {TYPES[b.type].libelle}
                    </p>

                    <Choix
                        question="Quand ?"
                        valeur={b.quand}
                        options={[
                            ['auj', 'Aujourd’hui'],
                            ['demain', 'Demain'],
                            ['autre', b.type === 'indispo' ? 'Un autre jour' : 'Autres dates'],
                        ]}
                        onChange={choisirQuand}
                    />
                    {b.quand === 'autre' && (
                        <div className="form-row">
                            <label>
                                {b.type === 'indispo' ? 'Le' : 'Du'}
                                <input type="date" value={b.du} min={auj} onChange={(e) => maj({ du: e.target.value, au: b.type === 'indispo' || e.target.value > b.au ? e.target.value : b.au })} />
                            </label>
                            {b.type !== 'indispo' && (
                                <label>
                                    Au (inclus)
                                    <input type="date" value={b.au} min={b.du} onChange={(e) => maj({ au: e.target.value })} />
                                </label>
                            )}
                        </div>
                    )}

                    {b.type === 'indispo' && (
                        <div className="form-row">
                            <label>
                                Pas dispo de
                                <input type="time" value={b.debut} onChange={(e) => maj({ debut: e.target.value })} />
                            </label>
                            <label>
                                à
                                <input type="time" value={b.fin} onChange={(e) => maj({ fin: e.target.value })} />
                            </label>
                        </div>
                    )}

                    {b.type === 'blesse' && (
                        <Choix question="Où es-tu blessé ?" valeur={b.zone} options={(Object.keys(ZONES) as Zone[]).map((z) => [z, ZONES[z]])} onChange={(zone) => maj({ zone })} />
                    )}

                    {(b.type === 'malade' || b.type === 'blesse') && (
                        <Choix
                            question="Tu vas quand même en cours ?"
                            valeur={b.enCours}
                            options={[
                                ['oui', 'Oui, j’y vais'],
                                ['non', 'Non, je reste chez moi'],
                                ['certains', 'Seulement à certains'],
                            ]}
                            onChange={(enCours) => maj({ enCours, sautes: [] })}
                        />
                    )}

                    {(b.type === 'pas_cours' || b.enCours === 'certains') && (b.type === 'pas_cours' || b.type === 'malade' || b.type === 'blesse') && (
                        <fieldset className="chg-q">
                            <legend>{b.type === 'pas_cours' ? 'Quels cours n’ont pas lieu ?' : 'À quels cours tu ne vas pas ?'}</legend>
                            {cours.length === 0 ? (
                                <p className="muted">Aucun cours trouvé ces jours-là{b.type === 'pas_cours' ? ' : la journée sera libre de toute façon.' : '.'}</p>
                            ) : (
                                <div className="chg-cours">
                                    {b.type === 'pas_cours' && <p className="muted">Rien de coché = tous les cours.</p>}
                                    {cours.map((c) => (
                                        <label key={c.id} className="checkbox-row">
                                            <input type="checkbox" checked={coursCoches(c.id)} onChange={() => basculerCours(c.id)} />
                                            {jourF.format(new Date(c.date_debut))} {heureF.format(new Date(c.date_debut))} · {c.titre}
                                        </label>
                                    ))}
                                </div>
                            )}
                        </fieldset>
                    )}

                    {b.type === 'malade' && (
                        <Choix
                            question="Et le sport ?"
                            valeur={b.sport}
                            options={[
                                ['non', 'Pas de sport (conseillé)'],
                                ['leger', courseC ? 'Juste du cardio très léger (vélo tranquille)' : 'Juste du vélo très tranquille'],
                            ]}
                            onChange={(sport) => maj({ sport })}
                        />
                    )}
                    {b.type === 'blesse' && (
                        <Choix
                            question="Et le sport ?"
                            valeur={b.sport}
                            options={[
                                ['adapte', 'On adapte (on évite la zone)'],
                                ['non', 'Pas de sport du tout'],
                            ]}
                            onChange={(sport) => maj({ sport })}
                        />
                    )}
                    {(b.type === 'malade' || b.type === 'blesse' || b.type === 'repos') && (
                        <Choix
                            question="Et les révisions ?"
                            valeur={b.revisions}
                            options={[
                                ['normal', 'Comme d’habitude'],
                                ['allege', 'Allégées (≈ 1 h le soir)'],
                                ['non', 'Pas du tout'],
                            ]}
                            onChange={(revisions) => maj({ revisions })}
                        />
                    )}
                    {b.type === 'malade' && b.sport === 'leger' && (
                        <p className="muted chg-conseil">
                            Règle simple : rhume léger (au-dessus du cou) → vélo très tranquille possible. Fièvre, courbatures ou toux grasse → repos complet.
                        </p>
                    )}
                    {b.type === 'blesse' && b.sport === 'adapte' && (
                        <p className="muted chg-conseil">
                            {b.zone === 'haut' && 'Les séances A et D (haut du corps, équilibre) sont mises de côté ; B et le cardio restent si ça ne tire pas.'}
                            {b.zone === 'bas' && `La séance B (jambes)${courseC ? ' et la course' : ''} sont mises de côté ; ${courseC ? 'passe le cardio C en vélo si ton genou ou ta cheville le supporte.' : 'le vélo reste si ça ne fait pas mal.'}`}
                            {b.zone === 'dos' && 'Seul le cardio en vélo tranquille reste, s’il ne fait pas mal.'}
                            {b.zone === 'autre' && 'Toutes les séances restent : arrête l’exercice qui fait mal. Si la douleur dure, demande l’avis d’un médecin.'}
                        </p>
                    )}

                    <label className="chg-note">
                        Une précision ? (facultatif)
                        <input type="text" value={b.note} placeholder={b.type === 'indispo' ? 'ex. rendez-vous chez le dentiste' : 'ex. prof absent'} onChange={(e) => maj({ note: e.target.value })} />
                    </label>

                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setEtape('repos')}>
                            Annuler
                        </button>
                        <button className="btn-primary" onClick={noter} disabled={b.du < auj || b.au < b.du}>
                            Recalculer mon programme
                        </button>
                    </div>
                </div>
            )}

            {etape === 'calcul' && <p className="muted">Je recalcule ton programme…</p>}

            {(etape === 'apercu' || etape === 'enregistrement') && replan && (
                <div className="chg-resultat">
                    {dernier && (
                        <p className="status">
                            ✅ Noté : {TYPES[dernier.type].court} {periodeTexte(dernier)}
                            {effetsTexte(dernier).length ? ` (${effetsTexte(dernier).join(', ')})` : ''}.
                        </p>
                    )}
                    {replan.mouvements.length === 0 ? (
                        <p className="muted">Rien à déplacer dans ton agenda : aucune séance ni révision prévue n’est touchée (ou elles sont déjà bien placées).</p>
                    ) : (
                        <>
                            <p className="chg-titre">Vu que ton programme a changé :</p>
                            <ul className="chg-mouvements">
                                {replan.mouvements.map((m, i) => (
                                    <li key={i}>
                                        <span>{m.genre === 'sport' ? '🏋️' : '📚'}</span>
                                        <span>
                                            {m.avant && m.apres && (
                                                <>
                                                    l’heure optimale pour <b>{m.nom}</b> a été déplacée à <b>{quandTexte(m.apres)}</b> <small>(au lieu de {quandTexte(m.avant)})</small>
                                                </>
                                            )}
                                            {m.avant && !m.apres && (
                                                <>
                                                    <b>{m.nom}</b> ({quandTexte(m.avant)}) est retirée : plus de créneau adapté cette semaine
                                                </>
                                            )}
                                            {!m.avant && m.apres && (
                                                <>
                                                    du temps se libère : <b>{m.nom}</b> le <b>{quandTexte(m.apres)}</b>
                                                </>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                    <div className="modal-actions">
                        <button className="btn-secondary" onClick={() => setEtape('repos')} disabled={etape === 'enregistrement'}>
                            {replan.mouvements.length ? 'Pas maintenant' : 'OK'}
                        </button>
                        {replan.mouvements.length > 0 && (
                            <button className="btn-primary" onClick={appliquer} disabled={etape === 'enregistrement'}>
                                {etape === 'enregistrement' ? 'Mise à jour…' : '✅ Mettre à jour mon agenda'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {etape === 'fait' && <p className="status">✅ Agenda mis à jour. Les rappels suivent les nouveaux horaires.</p>}
        </Repliable>
    )
}
