import { useEffect, useState } from 'react'
import { getEtatNutrition, type SanteJour } from './api'
import { jourParis } from './quotas'
import Repliable from './Repliable'

const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const heures = (min: number | null) => (min ? `${Math.floor(min / 60)}h${String(Math.round(min % 60)).padStart(2, '0')}` : '—')
const milliers = (n: number | null) => (n === null || n === undefined ? '—' : Math.round(n).toLocaleString('fr-FR'))
const quand = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })

/** Données de la montre (Da Halo → Santé iPhone → Raccourci → n8n), dans l'onglet Muscu. */
export default function MontreMuscu() {
    const [sante, setSante] = useState<SanteJour[] | null>(null)

    useEffect(() => {
        getEtatNutrition()
            .then((e) => setSante(e.sante))
            .catch(() => setSante([]))
    }, [])

    const maintenant = new Date()
    const auj = jourParis(maintenant)
    const hier = jourParis(new Date(maintenant.getTime() - 24 * 3600 * 1000))
    const parJour = new Map((sante ?? []).map((s) => [s.jour, s]))
    const dernier = (sante ?? []).at(-1)
    const jourAff = parJour.get(auj) ?? parJour.get(hier) ?? null

    // 7 derniers jours (le plus ancien à gauche)
    const semaine = Array.from({ length: 7 }, (_, k) => {
        const d = new Date(maintenant.getTime() - (6 - k) * 24 * 3600 * 1000)
        const j = jourParis(d)
        return { j, lettre: JOURS[(d.getDay() + 6) % 7], s: parJour.get(j) ?? null }
    })
    const maxPas = Math.max(10000, ...semaine.map((x) => x.s?.pas ?? 0))
    const sommeilCourt = jourAff?.sommeil_min !== null && jourAff?.sommeil_min !== undefined && jourAff.sommeil_min < 6 * 60

    return (
        <Repliable
            cle="muscu.montre"
            className="mu-carte mu-montre"
            h2Class="mu-h2"
            titre="⌚ MA MONTRE"
            resume={jourAff ? `${milliers(jourAff.pas)} pas · ${heures(jourAff.sommeil_min)}` : sante ? 'pas encore de données' : undefined}
        >
            {sante === null ? (
                <p className="mu-montre-vide">Chargement…</p>
            ) : sante.length === 0 ? (
                <p className="mu-montre-vide">
                    Pas encore de données. Une fois le Raccourci iPhone installé, tes pas, ton sommeil et ton cœur arrivent ici chaque soir (Da
                    Halo → Santé → Organisateur).
                </p>
            ) : (
                <>
                    <p className="mu-montre-jour">{jourAff?.jour === auj ? 'Aujourd’hui' : jourAff ? 'Hier' : 'Rien depuis hier'}</p>
                    <div className="mu-stats">
                        <div className="mu-stat">
                            <b>{milliers(jourAff?.pas ?? null)}</b>
                            <span>pas</span>
                        </div>
                        <div className="mu-stat">
                            <b>{milliers(jourAff?.kcal_actives ?? null)}</b>
                            <span>kcal en activité</span>
                        </div>
                        <div className="mu-stat">
                            <b>{heures(jourAff?.sommeil_min ?? null)}</b>
                            <span>sommeil</span>
                        </div>
                        <div className="mu-stat">
                            <b>{jourAff?.fc_repos ?? '—'}</b>
                            <span>FC repos</span>
                        </div>
                    </div>
                    {sommeilCourt && (
                        <p className="mu-montre-alerte">😴 Nuit courte : garde tes charges mais fais 1 série de moins, et couche-toi plus tôt ce soir.</p>
                    )}
                    <div className="mu-montre-graph" aria-label="Pas des 7 derniers jours">
                        {semaine.map((x) => (
                            <div key={x.j} className={`mu-montre-barre ${x.j === auj ? 'auj' : ''}`} title={`${x.j} : ${milliers(x.s?.pas ?? null)} pas`}>
                                <span style={{ height: `${Math.max(4, ((x.s?.pas ?? 0) / maxPas) * 100)}%` }} className={x.s?.pas ? '' : 'vide'} />
                                <i>{x.lettre}</i>
                            </div>
                        ))}
                    </div>
                    <p className="mu-montre-maj">
                        Pas sur 7 jours (repère 10 000) · dernière synchro {dernier ? quand.format(new Date(dernier.maj)) : '—'}
                    </p>
                </>
            )}
        </Repliable>
    )
}
