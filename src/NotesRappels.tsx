// Carte « Notes et rappels » (18/11/2026) : notes rapides (synchronisées) et rappels datés (= tâches « #rappel »
// qui déclenchent une notification). Les rappels créés par l'assistant IA apparaissent aussi ici.
import { useCallback, useEffect, useState } from 'react'
import Repliable from './Repliable'
import { creerTache, getTachesEntre, modifierTache, supprimerTache, type Tache } from './api'
import { MARQUEUR_ETUDE } from './etudes'
import { ecouter, emettre } from './evenements'
import { MARQUEUR_RAPPEL, ajouterNote, basculerNote, stockNotes, supprimerNote, type Note } from './notes'
import { MARQUEUR } from './sport'
import { jourIso } from './stockage'

type Onglet = 'rappels' | 'notes'
const JOUR = 24 * 3600 * 1000
const quandF = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Un rappel : créé ici (#rappel) ou par l'assistant (source « ia », hors séances et révisions automatiques). */
export const estRappel = (t: Tache) =>
    t.statut !== 'annule' && (t.description?.includes(MARQUEUR_RAPPEL) || (t.source === 'ia' && !t.description?.includes(MARQUEUR) && !t.description?.includes(MARQUEUR_ETUDE)))

function dansUneHeure(): { date: string; heure: string } {
    const d = new Date(Date.now() + 60 * 60000)
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0)
    return { date: jourIso(d), heure: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }
}

export default function NotesRappels({ version, onChange }: { version: number; onChange: () => void }) {
    const [onglet, setOnglet] = useState<Onglet>('rappels')
    const [notes, setNotes] = useState<Note[]>(() => stockNotes.lire().notes)
    const [rappels, setRappels] = useState<Tache[]>([])
    const [chargement, setChargement] = useState(true)
    const [texte, setTexte] = useState('')
    const [quand, setQuand] = useState(dansUneHeure)
    const [occupe, setOccupe] = useState(false)
    const [erreur, setErreur] = useState<string | null>(null)
    const [voirPasses, setVoirPasses] = useState(false)

    const charger = useCallback(async () => {
        try {
            const t = await getTachesEntre(new Date(Date.now() - 7 * JOUR), new Date(Date.now() + 90 * JOUR))
            setRappels(t.filter(estRappel).sort((a, b) => (a.date_debut || '').localeCompare(b.date_debut || '')))
        } catch {
            // hors ligne : on garde la liste
        } finally {
            setChargement(false)
        }
    }, [])

    useEffect(() => {
        charger()
    }, [charger, version])
    useEffect(() => ecouter('organisateur:actualiser', () => charger()), [charger])
    useEffect(() => {
        const maj = () => setNotes(stockNotes.lire().notes)
        const fin = stockNotes.abonner(maj)
        stockNotes.synchroniser().then(maj).catch(() => {})
        return fin
    }, [])

    async function ajouter() {
        const t = texte.trim()
        if (!t) return
        setErreur(null)
        if (onglet === 'notes') {
            ajouterNote(t)
            setTexte('')
            return
        }
        const debut = new Date(`${quand.date}T${quand.heure || '09:00'}`)
        if (Number.isNaN(debut.getTime()) || debut.getTime() < Date.now()) {
            setErreur('Choisis une date et une heure à venir.')
            return
        }
        setOccupe(true)
        try {
            await creerTache({
                titre: `🔔 ${t}`,
                description: `${MARQUEUR_RAPPEL} — rappel créé depuis « Notes et rappels »`,
                categorie_id: null,
                date_debut: debut.toISOString(),
                date_fin: new Date(debut.getTime() + 5 * 60000).toISOString(),
                toute_la_journee: false,
                statut: 'a_faire',
                priorite: 'normale',
            })
            setTexte('')
            setQuand(dansUneHeure())
            await charger()
            onChange()
        } catch (e) {
            setErreur(e instanceof Error ? e.message : 'Impossible de créer le rappel.')
        } finally {
            setOccupe(false)
        }
    }

    async function basculerRappel(t: Tache) {
        await modifierTache({ id: t.id, statut: t.statut === 'fait' ? 'a_faire' : 'fait' })
        await charger()
        onChange()
    }
    async function retirerRappel(t: Tache) {
        if (!window.confirm(`Supprimer le rappel « ${t.titre.replace(/^🔔\s*/, '')} » ?`)) return
        await supprimerTache(t.id)
        await charger()
        onChange()
    }

    const maintenant = Date.now()
    const aVenir = rappels.filter((t) => t.statut !== 'fait' && new Date(t.date_fin || t.date_debut || 0).getTime() >= maintenant - 30 * 60000)
    const passes = rappels.filter((t) => !aVenir.includes(t)).reverse()
    const notesOuvertes = notes.filter((n) => !n.fait)
    const notesFaites = notes.filter((n) => n.fait)

    return (
        <Repliable
            cle="agenda.notes"
            className="card notes"
            titre="📝 Notes et rappels"
            resume={[aVenir.length && `${aVenir.length} rappel${aVenir.length > 1 ? 's' : ''}`, notesOuvertes.length && `${notesOuvertes.length} note${notesOuvertes.length > 1 ? 's' : ''}`].filter(Boolean).join(' · ') || undefined}
        >
            <div className="segmented" role="group" aria-label="Notes ou rappels">
                <button className={onglet === 'rappels' ? 'actif' : ''} onClick={() => setOnglet('rappels')}>
                    🔔 Rappels{aVenir.length ? ` (${aVenir.length})` : ''}
                </button>
                <button className={onglet === 'notes' ? 'actif' : ''} onClick={() => setOnglet('notes')}>
                    📝 Notes{notesOuvertes.length ? ` (${notesOuvertes.length})` : ''}
                </button>
            </div>

            <form
                className="notes-form"
                onSubmit={(e) => {
                    e.preventDefault()
                    ajouter()
                }}
            >
                <input
                    type="text"
                    value={texte}
                    onChange={(e) => setTexte(e.target.value)}
                    placeholder={onglet === 'rappels' ? 'ex. Rendre le compte rendu de TP' : 'ex. Demander au prof la correction du TD 3'}
                    aria-label={onglet === 'rappels' ? 'Texte du rappel' : 'Texte de la note'}
                />
                {onglet === 'rappels' && (
                    <div className="notes-quand">
                        <input type="date" value={quand.date} min={jourIso(new Date())} onChange={(e) => setQuand((q) => ({ ...q, date: e.target.value }))} aria-label="Jour du rappel" />
                        <input type="time" value={quand.heure} onChange={(e) => setQuand((q) => ({ ...q, heure: e.target.value }))} aria-label="Heure du rappel" />
                    </div>
                )}
                <button className="btn-primary" type="submit" disabled={!texte.trim() || occupe}>
                    {occupe ? 'Ajout…' : onglet === 'rappels' ? '＋ Rappel' : '＋ Note'}
                </button>
            </form>
            {erreur && <p className="form-error">{erreur}</p>}
            <p className="muted notes-astuce">
                {onglet === 'rappels'
                    ? 'Tu reçois une notification un peu avant l’heure (jusqu’à 15 min avant). Tu peux aussi dire à l’assistant : « rappelle-moi demain à 9 h d’appeler la banque ».'
                    : 'Les notes n’ont pas d’heure : une idée, un truc à ne pas oublier. Avec l’assistant : « note que je dois racheter des protéines ».'}
            </p>

            {onglet === 'rappels' && (
                <>
                    {chargement && <p className="muted">Chargement…</p>}
                    {!chargement && aVenir.length === 0 && <p className="muted">Aucun rappel à venir.</p>}
                    <ul className="notes-liste">
                        {aVenir.map((t) => (
                            <li key={t.id}>
                                <button className="notes-coche" aria-label="Marquer comme fait" onClick={() => basculerRappel(t)}>
                                    ○
                                </button>
                                <span className="notes-texte">
                                    {t.titre.replace(/^🔔\s*/, '')}
                                    <small>
                                        {t.date_debut ? quandF.format(new Date(t.date_debut)) : 'sans heure'}
                                        {t.source === 'ia' ? ' · par l’assistant' : ''}
                                    </small>
                                </span>
                                <button className="btn-icon" aria-label="Supprimer le rappel" onClick={() => retirerRappel(t)}>
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                    {passes.length > 0 && (
                        <button className="btn-link" onClick={() => setVoirPasses((v) => !v)}>
                            {voirPasses ? 'Masquer' : 'Voir'} les rappels passés ou faits ({passes.length})
                        </button>
                    )}
                    {voirPasses && (
                        <ul className="notes-liste passes">
                            {passes.map((t) => (
                                <li key={t.id}>
                                    <button className="notes-coche" aria-label={t.statut === 'fait' ? 'Remettre à faire' : 'Marquer comme fait'} onClick={() => basculerRappel(t)}>
                                        {t.statut === 'fait' ? '✓' : '○'}
                                    </button>
                                    <span className="notes-texte">
                                        {t.titre.replace(/^🔔\s*/, '')}
                                        <small>{t.date_debut ? quandF.format(new Date(t.date_debut)) : ''}</small>
                                    </span>
                                    <button className="btn-icon" aria-label="Supprimer le rappel" onClick={() => retirerRappel(t)}>
                                        ×
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}

            {onglet === 'notes' && (
                <>
                    {notesOuvertes.length === 0 && <p className="muted">Aucune note pour l’instant.</p>}
                    <ul className="notes-liste">
                        {[...notesOuvertes, ...notesFaites].map((n) => (
                            <li key={n.id} className={n.fait ? 'fait' : ''}>
                                <button className="notes-coche" aria-label={n.fait ? 'Remettre à faire' : 'Marquer comme fait'} onClick={() => basculerNote(n.id)}>
                                    {n.fait ? '✓' : '○'}
                                </button>
                                <span className="notes-texte">
                                    {n.texte}
                                    <small>{new Date(n.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</small>
                                </span>
                                <button
                                    className="btn-icon"
                                    aria-label="Transformer en rappel"
                                    title="En faire un rappel"
                                    onClick={() => {
                                        setOnglet('rappels')
                                        setTexte(n.texte)
                                    }}
                                >
                                    🔔
                                </button>
                                <button className="btn-icon" aria-label="Supprimer la note" onClick={() => supprimerNote(n.id)}>
                                    ×
                                </button>
                            </li>
                        ))}
                    </ul>
                    {notes.length > 0 && (
                        <button className="btn-link" onClick={() => emettre('organisateur:ia', { texte: 'Aide-moi à organiser mes notes : lesquelles je devrais planifier et quand ?', envoyer: true })}>
                            🤖 Demander à l’assistant de les planifier
                        </button>
                    )}
                </>
            )}
        </Repliable>
    )
}
