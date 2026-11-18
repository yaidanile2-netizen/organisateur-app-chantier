// Bouton 🔔 de la barre du haut (18/11/2026) : l'historique des notifications de la journée.
// Deux sources : les notifications reçues sur CET appareil (notées par le service worker), et les rappels
// de l'agenda déjà envoyés (tâches « notifie »), pour voir aussi ce qui est arrivé sur un autre appareil.
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getTachesEntre } from './api'
import { lireNotifs, viderNotifs, type Notif } from './notifs'
import { jourIso } from './stockage'

type Ligne = { cle: string; date: Date; titre: string; texte: string; ici: boolean }
const heureF = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const jourF = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
const propre = (s: string) => s.replace(/^[^\p{L}\d]+/u, '').trim().toLowerCase()

export default function HistoriqueNotifs({ etatNotifs }: { etatNotifs: string }) {
    const [ouvert, setOuvert] = useState(false)
    const [decalage, setDecalage] = useState(0) // 0 = aujourd'hui, -1 = hier…
    const [locales, setLocales] = useState<Notif[]>([])
    const [lignes, setLignes] = useState<Ligne[]>([])
    const [chargement, setChargement] = useState(false)
    const [vuesJusqua, setVuesJusqua] = useState<string>(() => {
        try {
            return localStorage.getItem('notifs.vues') || ''
        } catch {
            return ''
        }
    })

    const relireLocales = useCallback(() => {
        lireNotifs().then(setLocales)
    }, [])

    // Le service worker prévient l'app à chaque notification affichée.
    useEffect(() => {
        relireLocales()
        const surMessage = (e: MessageEvent) => {
            if ((e.data as { type?: string } | null)?.type === 'notif') relireLocales()
        }
        navigator.serviceWorker?.addEventListener('message', surMessage)
        const surVisible = () => document.visibilityState === 'visible' && relireLocales()
        document.addEventListener('visibilitychange', surVisible)
        return () => {
            navigator.serviceWorker?.removeEventListener('message', surMessage)
            document.removeEventListener('visibilitychange', surVisible)
        }
    }, [relireLocales])

    const jour = new Date()
    jour.setDate(jour.getDate() + decalage)
    const cleJour = jourIso(jour)

    // Liste du jour affiché : notifications de l'appareil + rappels déjà envoyés.
    useEffect(() => {
        if (!ouvert) return
        let fini = false
        const debut = new Date(`${cleJour}T00:00:00`)
        const fin = new Date(`${cleJour}T23:59:59`)
        const ici: Ligne[] = locales
            .filter((n) => jourIso(new Date(n.date)) === cleJour)
            .map((n, i) => ({ cle: `n${n.id ?? i}`, date: new Date(n.date), titre: n.titre, texte: n.texte, ici: true }))
        setLignes(ici)
        setChargement(true)
        getTachesEntre(debut, fin)
            .then((taches) => {
                if (fini) return
                const limite = Date.now() + 15 * 60000
                const envoyees = taches.filter((t) => t.notifie && t.date_debut && t.statut !== 'annule' && new Date(t.date_debut).getTime() <= limite && !t.toute_la_journee)
                const deja = ici.map((l) => `${propre(l.titre)} ${propre(l.texte)}`)
                const autres: Ligne[] = envoyees
                    .filter((t) => !deja.some((d) => d.includes(propre(t.titre).slice(0, 25))))
                    .map((t) => ({ cle: `t${t.id}`, date: new Date(t.date_debut as string), titre: t.titre, texte: 'Rappel de l’agenda', ici: false }))
                setLignes([...ici, ...autres].sort((a, b) => b.date.getTime() - a.date.getTime()))
            })
            .catch(() => {})
            .finally(() => !fini && setChargement(false))
        return () => {
            fini = true
        }
    }, [ouvert, cleJour, locales])

    const nonVues = locales.filter((n) => jourIso(new Date(n.date)) === jourIso(new Date()) && n.date > vuesJusqua).length

    function ouvrir() {
        setDecalage(0)
        setOuvert(true)
        const maintenant = new Date().toISOString()
        setVuesJusqua(maintenant)
        try {
            localStorage.setItem('notifs.vues', maintenant)
        } catch {
            // stockage indisponible
        }
    }

    async function vider() {
        if (!window.confirm('Effacer l’historique des notifications de cet appareil ?')) return
        await viderNotifs()
        relireLocales()
    }

    return (
        <>
            <button className="notif-cloche" onClick={ouvrir} aria-label={`Historique des notifications${nonVues ? ` (${nonVues} nouvelles)` : ''}`} title="Historique des notifications">
                🔔
                {nonVues > 0 && <span className="notif-badge">{nonVues > 9 ? '9+' : nonVues}</span>}
            </button>
            {ouvert &&
                createPortal(
                <div className="modal-overlay notif-overlay" onClick={() => setOuvert(false)}>
                    <div className="modal notif-modal" role="dialog" aria-label="Historique des notifications" onClick={(e) => e.stopPropagation()}>
                        <div className="notif-tete">
                            <h2>🔔 Notifications</h2>
                            <button className="btn-icon" onClick={() => setOuvert(false)} aria-label="Fermer">
                                ×
                            </button>
                        </div>
                        <div className="notif-jour">
                            <button className="btn-icon" onClick={() => setDecalage((d) => Math.max(-30, d - 1))} aria-label="Jour précédent" disabled={decalage <= -30}>
                                ‹
                            </button>
                            <b>{decalage === 0 ? 'Aujourd’hui' : decalage === -1 ? 'Hier' : jourF.format(jour)}</b>
                            <button className="btn-icon" onClick={() => setDecalage((d) => Math.min(0, d + 1))} aria-label="Jour suivant" disabled={decalage >= 0}>
                                ›
                            </button>
                        </div>
                        {etatNotifs !== 'actif' && etatNotifs !== 'chargement' && (
                            <p className="muted notif-info">Les notifications ne sont pas activées sur cet appareil : active-les dans la carte « 🔔 Notifications » de l’Agenda pour recevoir tes rappels.</p>
                        )}
                        {lignes.length === 0 && !chargement && <p className="muted">Aucune notification ce jour-là.</p>}
                        {lignes.length === 0 && chargement && <p className="muted">Chargement…</p>}
                        <ul className="notif-liste">
                            {lignes.map((l) => (
                                <li key={l.cle}>
                                    <span className="notif-heure">{heureF.format(l.date)}</span>
                                    <span className="notif-corps">
                                        <b>{l.titre}</b>
                                        {l.texte && <span>{l.texte}</span>}
                                        {!l.ici && <small>envoyé à tes appareils</small>}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        {locales.length > 0 && (
                            <button className="btn-link notif-vider" onClick={vider}>
                                Effacer l’historique de cet appareil
                            </button>
                        )}
                    </div>
                </div>,
                document.body,
            )}
        </>
    )
}
