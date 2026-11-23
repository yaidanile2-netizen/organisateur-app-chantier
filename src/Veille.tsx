// Carte du haut de l'Agenda (23/11/2026) : « ton emploi du temps a changé » et, du vendredi au dimanche,
// « 📣 la semaine prochaine : DS…, oral… ». La vérification tourne à chaque ouverture (au plus toutes les 20 min).
import { useEffect, useState } from 'react'
import { ecouter } from './evenements'
import { appliquerReplan, calculerReplan, phraseMouvement } from './replanifier'
import { jourIso } from './stockage'
import { alertesEnAttente, evalsSemaineProchaine, marquerVu, phraseChangement, stockVeille, texteEvals, veiller, type ChangementEdt, type Evaluation } from './veille'

const finDeSemaine = () => [0, 5, 6].includes(new Date().getDay())

export default function Veille({ onChange }: { onChange: () => void }) {
    const [changements, setChangements] = useState<ChangementEdt[]>(() => alertesEnAttente())
    const [evals, setEvals] = useState<Evaluation[]>([])
    const [etat, setEtat] = useState<'repos' | 'calcul' | 'fait'>('repos')
    const [bilan, setBilan] = useState<string[]>([])
    const [verif, setVerif] = useState(false)

    useEffect(() => {
        const maj = () => setChangements(alertesEnAttente())
        const fin = stockVeille.abonner(maj)
        const lancer = (forcer = false) =>
            veiller(forcer).then((r) => {
                maj()
                if (r.alertes) onChange()
            })
        lancer()
        const visible = () => document.visibilityState === 'visible' && lancer()
        document.addEventListener('visibilitychange', visible)
        const stop = ecouter('organisateur:actualiser', () => maj())
        if (finDeSemaine()) evalsSemaineProchaine().then(setEvals).catch(() => {})
        return () => {
            fin()
            stop()
            document.removeEventListener('visibilitychange', visible)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function verifierMaintenant() {
        setVerif(true)
        const r = await veiller(true).catch(() => ({ changements: [], alertes: 0 }))
        setChangements(alertesEnAttente())
        if (finDeSemaine()) setEvals(await evalsSemaineProchaine().catch(() => []))
        if (r.alertes) onChange()
        setVerif(false)
    }

    async function replacer() {
        const dates = changements.flatMap((c) => [c.avant?.debut, c.apres?.debut]).filter((d): d is string => !!d).sort()
        if (!dates.length) return
        const auj = jourIso(new Date())
        const du = jourIso(new Date(dates[0])) < auj ? auj : jourIso(new Date(dates[0]))
        const au = jourIso(new Date(dates[dates.length - 1]))
        setEtat('calcul')
        try {
            const r = await calculerReplan(du, au < du ? du : au)
            if (r.mouvements.length) await appliquerReplan(r)
            setBilan(r.mouvements.length ? r.mouvements.map(phraseMouvement) : ['Rien à déplacer : tes séances et révisions restent bien placées.'])
            onChange()
        } catch (e) {
            setBilan([`⚠️ ${e instanceof Error ? e.message : 'Erreur'}`])
        }
        setEtat('fait')
    }

    const vu = stockVeille.lire().vuLe
    if (!changements.length && !evals.length && etat !== 'fait')
        return (
            <p className="veille-ok">
                ✅ Emploi du temps vérifié{vu ? ` (${new Date(vu).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' })})` : ''} : rien n’a changé sur 3 semaines.{' '}
                <button className="btn-link" onClick={verifierMaintenant} disabled={verif}>
                    {verif ? 'Vérification…' : 'Vérifier'}
                </button>
            </p>
        )

    return (
        <section className="card veille">
            {changements.length > 0 && (
                <>
                    <h2 className="veille-titre">📅 Ton emploi du temps a changé</h2>
                    <ul className="veille-liste">
                        {changements.slice(0, 12).map((c, i) => (
                            <li key={i} className={c.genre}>
                                {phraseChangement(c)}
                            </li>
                        ))}
                        {changements.length > 12 && <li>… et {changements.length - 12} autre(s)</li>}
                    </ul>
                    {etat === 'fait' && (
                        <ul className="veille-bilan">
                            {bilan.map((l, i) => (
                                <li key={i}>{l}</li>
                            ))}
                        </ul>
                    )}
                    <div className="modal-actions">
                        <button
                            className="btn-secondary"
                            onClick={() => {
                                marquerVu()
                                setEtat('repos')
                            }}
                        >
                            ✓ Vu
                        </button>
                        {etat !== 'fait' && (
                            <button className="btn-primary" onClick={replacer} disabled={etat === 'calcul'}>
                                {etat === 'calcul' ? 'Je replace…' : '🔄 Replacer sport et révisions'}
                            </button>
                        )}
                    </div>
                </>
            )}
            {evals.length > 0 && (
                <div className={changements.length ? 'veille-semaine sep' : 'veille-semaine'}>
                    <h2 className="veille-titre">📣 La semaine prochaine</h2>
                    <p>{texteEvals(evals)}</p>
                    <p className="muted">Tes révisions sont dans la carte Révisions : « Proposer mes révisions » pour la semaine prochaine si ce n’est pas déjà fait.</p>
                </div>
            )}
        </section>
    )
}
