// Fiche détaillée d'un événement de la vue Jour (cours, tâche ou séance de sport).
import type { Cours, Priorite, Statut, Tache } from './api'
import { codeModule, detailsCours, nomModule, typeDe } from './coursType'
import { lireBloc } from './etudes'
import { dureeDe, seanceParCode } from './programme'
import { MARQUEUR, codeDeTache, lireReglages } from './sport'
import { duree } from './temps'

export type Item =
    | { type: 'tache'; data: Tache; debut: Date | null; fin: Date | null }
    | { type: 'cours'; data: Cours; debut: Date; fin: Date }

const hm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
const jourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const MIN = 60000


const PRIORITES: Record<Priorite, string> = { basse: '🟢 Basse', normale: '🟡 Normale', haute: '🔴 Haute' }
const STATUTS: Record<Statut, string> = { a_faire: '⏳ À faire', en_cours: '▶️ En cours', fait: '✅ Fait', annule: '✖️ Annulé' }

type Etape = { heure: Date; emoji: string; texte: string; detail?: string; principal?: boolean }

function etapesDe(item: Item, jour: Item[]): Etape[] {
    const r = lireReglages()
    const { debut, fin } = item
    if (!debut) return []
    const etapes: Etape[] = []

    if (item.type === 'cours') {
        const fin = item.fin
        const coursDuJour = jour.filter((i): i is Extract<Item, { type: 'cours' }> => i.type === 'cours')
        const index = coursDuJour.findIndex((c) => c.data.id === item.data.id)
        if (index === 0) {
            etapes.push({ heure: new Date(debut.getTime() - r.trajetIut * MIN), emoji: '🚌', texte: 'Pars de chez toi', detail: `${duree(r.trajetIut)} de trajet` })
        }
        etapes.push({ heure: debut, emoji: '📚', texte: `Début : ${typeDe(item.data).libelle}`, detail: item.data.lieu || undefined, principal: true })
        etapes.push({ heure: fin, emoji: '🔔', texte: 'Fin du cours', principal: true })
        const suivant = coursDuJour[index + 1]
        if (suivant) {
            etapes.push({
                heure: suivant.debut,
                emoji: '⏭️',
                texte: `Ensuite : ${typeDe(suivant.data).court} ${nomModule(suivant.data.titre)}`,
                detail: `pause de ${duree((suivant.debut.getTime() - fin.getTime()) / MIN)}`,
            })
        } else {
            etapes.push({ heure: new Date(fin.getTime() + r.trajetIut * MIN), emoji: '🏠', texte: 'Rentré à la maison vers', detail: `${duree(r.trajetIut)} de trajet` })
        }
        return etapes
    }

    const t = item.data
    const code = t.description?.includes(MARQUEUR) ? codeDeTache(t) : null
    if (code) {
        const s = seanceParCode(code)
        if (s.lieu === 'salle') {
            const dSeance = new Date(debut.getTime() + r.trajetSalle * MIN)
            const fSeance = new Date(dSeance.getTime() + dureeDe(s, r.duree) * MIN)
            etapes.push({ heure: debut, emoji: '🚶', texte: 'Pars pour la salle', detail: `${duree(r.trajetSalle)} jusqu’au Basic-Fit` })
            etapes.push({ heure: dSeance, emoji: s.emoji, texte: `Séance ${s.code} : ${s.titre}`, detail: `${duree(dureeDe(s, r.duree))}`, principal: true })
            etapes.push({ heure: fSeance, emoji: '🧘', texte: 'Étirements, puis retour' })
            if (fin) etapes.push({ heure: fin, emoji: '🏠', texte: 'De retour à la maison', detail: `objectif : avant ${r.retourAvant}` })
        } else {
            etapes.push({ heure: debut, emoji: s.emoji, texte: `Séance ${s.code} à la maison`, detail: 'renfo au poids du corps et aux élastiques', principal: true })
            if (fin) etapes.push({ heure: fin, emoji: '✅', texte: 'Fin de la séance' })
        }
    } else {
        etapes.push({ heure: debut, emoji: '▶️', texte: 'Début', principal: true })
        if (fin) etapes.push({ heure: fin, emoji: '⏹️', texte: 'Fin', principal: true })
    }
    // Ce qui vient juste après dans la journée.
    const apres = jour.find((i) => i.debut && i.debut.getTime() >= (fin ?? debut).getTime() && i.data.id !== t.id)
    if (apres?.debut) {
        etapes.push({
            heure: apres.debut,
            emoji: '⏭️',
            texte: `Ensuite : ${apres.data.titre}`,
            detail: `${duree((apres.debut.getTime() - (fin ?? debut).getTime()) / MIN)} de libre avant`,
        })
    }
    return etapes
}

function compteARebours(debut: Date | null, fin: Date | null, maintenant: number): { texte: string; classe: string } | null {
    if (!debut) return null
    const d = debut.getTime()
    const f = (fin ?? debut).getTime()
    if (maintenant < d) {
        const min = (d - maintenant) / MIN
        return { texte: min > 24 * 60 ? `Dans ${Math.round(min / 1440)} j` : `Dans ${duree(min)}`, classe: 'avenir' }
    }
    if (maintenant <= f) return { texte: `En cours · encore ${duree((f - maintenant) / MIN)}`, classe: 'encours' }
    return { texte: 'Terminé', classe: 'passe' }
}

function lignesDescription(texte: string | null): string[] {
    return (texte || '')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.includes(MARQUEUR) && !/^\(?export|^\(?modifi/i.test(l))
        .slice(0, 12)
}

type Props = {
    item: Item
    jour: Item[]
    maintenant: number
    onFermer: () => void
    onModifier: (t: Tache) => void
    onBasculerFait: (t: Tache) => void
    onVoirSeance?: () => void
}

export default function EventDetail({ item, jour, maintenant, onFermer, onModifier, onBasculerFait, onVoirSeance }: Props) {
    const { debut, fin } = item
    const tache = item.type === 'tache' ? item.data : null
    const code = tache?.description?.includes(MARQUEUR) ? codeDeTache(tache) : null
    const seance = code ? seanceParCode(code) : null
    const bloc = tache ? lireBloc(tache) : null
    const typeCours = item.type === 'cours' ? typeDe(item.data) : null
    const infosCours = item.type === 'cours' ? detailsCours(item.data) : null
    const couleur = typeCours ? typeCours.couleur : seance ? seance.couleur : bloc ? '#6366f1' : tache?.categorie_couleur || '#4f46e5'
    const emoji = typeCours ? (typeCours.cle === 'ds' ? '📝' : '📚') : seance ? seance.emoji : bloc ? '📖' : '📌'
    const sousTitre = typeCours
        ? `${typeCours.libelle} · Cours IUT`
        : seance
          ? `Séance de sport · ${seance.lieu === 'salle' ? 'Basic-Fit' : 'maison'}`
          : bloc
            ? `Révision${bloc.total > 1 ? ` · étape ${bloc.etape}/${bloc.total}` : ''}`
            : tache?.categorie_nom || 'Tâche'
    const titre = item.type === 'cours' ? nomModule(item.data.titre) : item.data.titre
    const rebours = compteARebours(debut, fin, maintenant)
    const etapes = etapesDe(item, jour)
    const description =
        item.type === 'cours'
            ? lignesDescription((item.data.description || '').split('\n').slice(1).join('\n'))
            : seance || bloc
              ? []
              : lignesDescription(tache?.description ?? null)

    return (
        <div className="modal-overlay" onClick={onFermer}>
            <div className="modal ev" style={{ '--ev': couleur } as React.CSSProperties} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="ev-tete">
                    <span className="ev-emoji">{emoji}</span>
                    <div className="ev-titres">
                        <span className="ev-sous">{sousTitre}</span>
                        <h2>{titre}</h2>
                    </div>
                    <button className="ev-fermer" onClick={onFermer} aria-label="Fermer">
                        ×
                    </button>
                </div>

                {rebours && <span className={`ev-rebours ${rebours.classe}`}>{rebours.texte}</span>}

                <table className="ev-infos">
                    <tbody>
                        {debut && (
                            <tr>
                                <th>📅 Date</th>
                                <td>{jourLong.format(debut)}</td>
                            </tr>
                        )}
                        <tr>
                            <th>🕐 Horaire</th>
                            <td>
                                {debut ? (tache?.toute_la_journee ? 'Toute la journée' : `${hm(debut)}${fin ? ` → ${hm(fin)}` : ''}`) : 'Pas d’heure fixée'}
                            </td>
                        </tr>
                        {debut && fin && !tache?.toute_la_journee && (
                            <tr>
                                <th>⏱️ Durée</th>
                                <td>{duree((fin.getTime() - debut.getTime()) / MIN)}{seance?.lieu === 'salle' ? ' (trajets compris)' : ''}</td>
                            </tr>
                        )}
                        {typeCours && (
                            <tr>
                                <th>🏷️ Type</th>
                                <td>
                                    <span className="type-badge" style={{ '--t': typeCours.couleur } as React.CSSProperties}>
                                        {typeCours.court}
                                    </span>{' '}
                                    {typeCours.libelle}
                                </td>
                            </tr>
                        )}
                        {item.type === 'cours' && codeModule(item.data.titre) && (
                            <tr>
                                <th>📘 Module</th>
                                <td>{codeModule(item.data.titre)}</td>
                            </tr>
                        )}
                        {infosCours?.profs && (
                            <tr>
                                <th>👤 Enseignant</th>
                                <td>{infosCours.profs}</td>
                            </tr>
                        )}
                        {infosCours?.groupes && (
                            <tr>
                                <th>👥 Groupe</th>
                                <td>{infosCours.groupes}</td>
                            </tr>
                        )}
                        {item.type === 'cours' && item.data.lieu && (
                            <tr>
                                <th>📍 Salle</th>
                                <td>{item.data.lieu}</td>
                            </tr>
                        )}
                        {seance && (
                            <tr>
                                <th>📍 Lieu</th>
                                <td>{seance.lieu === 'salle' ? 'Basic-Fit Saint-Herblain Atlantis' : 'À la maison'}</td>
                            </tr>
                        )}
                        {tache?.categorie_nom && (
                            <tr>
                                <th>🏷️ Catégorie</th>
                                <td>
                                    <span className="ev-pastille" style={{ background: tache.categorie_couleur || '#4f46e5' }} /> {tache.categorie_nom}
                                </td>
                            </tr>
                        )}
                        {tache && (
                            <tr>
                                <th>⚡ Priorité</th>
                                <td>{PRIORITES[tache.priorite] ?? tache.priorite}</td>
                            </tr>
                        )}
                        {tache && (
                            <tr>
                                <th>📋 Statut</th>
                                <td>{STATUTS[tache.statut] ?? tache.statut}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {bloc && (
                    <>
                        <h3 className="ev-h3">Programme de cette séance</h3>
                        {bloc.noms.length > 1 && (
                            <div className="ev-etapes">
                                {bloc.noms.map((n, i) => (
                                    <span key={i} className={i + 1 < bloc.etape ? 'avant' : i + 1 === bloc.etape ? 'actuelle' : ''}>
                                        {i + 1}. {n}
                                    </span>
                                ))}
                            </div>
                        )}
                        <ul className="ev-checklist">
                            {bloc.consignes.map((c) => (
                                <li key={c}>{c}</li>
                            ))}
                        </ul>
                        {bloc.urgence && <p className="muted">⚡ Placé hors de ton créneau du soir : l’échéance est très proche.</p>}
                    </>
                )}

                {etapes.length > 0 && (
                    <>
                        <h3 className="ev-h3">Déroulé</h3>
                        <ol className="ev-frise">
                            {etapes.map((e, i) => (
                                <li key={i} className={e.principal ? 'principal' : ''}>
                                    <span className="ev-heure">{hm(e.heure)}</span>
                                    <span className="ev-point">{e.emoji}</span>
                                    <span className="ev-texte">
                                        {e.texte}
                                        {e.detail && <small>{e.detail}</small>}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </>
                )}

                {description.length > 0 && (
                    <>
                        <h3 className="ev-h3">Détails</h3>
                        <div className="ev-description">
                            {description.map((l, i) => (
                                <p key={i}>{l}</p>
                            ))}
                        </div>
                    </>
                )}

                <div className="ev-actions">
                    {item.type === 'cours' && <p className="muted">Cours de ton emploi du temps IUT : il se met à jour tout seul.</p>}
                    {seance && onVoirSeance && (
                        <button className="btn-secondary" onClick={onVoirSeance}>
                            {seance.emoji} Voir la séance {seance.code}
                        </button>
                    )}
                    {tache && (
                        <>
                            <button className="btn-secondary" onClick={() => onBasculerFait(tache)}>
                                {tache.statut === 'fait' ? '↺ Remettre à faire' : bloc ? '✓ Étape validée' : '✓ Marquer fait'}
                            </button>
                            <button className="btn-primary" onClick={() => onModifier(tache)}>
                                ✏️ Modifier
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
