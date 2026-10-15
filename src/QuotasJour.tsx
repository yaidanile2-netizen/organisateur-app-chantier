import type { CSSProperties } from 'react'
import type { ApportsJour, Objectif, SanteJour } from './api'
import { apportsDu, BONUS, jourParis, niveauSucres, quotasDuJour, SUCRES_IDEAL, SUCRES_MAX } from './quotas'
import Repliable from './Repliable'

const LIBELLE_PRIORITE: Record<Objectif, string> = {
    musculation: '💪 Musculation',
    cardio: '❤️ Cardio',
    croissance: '📈 Croissance',
    perte_gras: '🔥 Moins de gras',
    peau: '✨ Peau',
}
const JOURS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const nombre = (n: number) => Math.round(n).toLocaleString('fr-FR')
const g = (n: number) => `${Math.round(n * 10) / 10} g`.replace('.', ',')

type Props = { apports: ApportsJour[]; sante: SanteJour[]; priorite: Objectif }

function Jauge({ valeur, max, repere, niveau }: { valeur: number; max: number; repere?: number; niveau: string }) {
    const pct = Math.min(100, (valeur / max) * 100)
    return (
        <div className={`qj-jauge ${niveau}`}>
            <span className="qj-rempli" style={{ width: `${pct}%` } as CSSProperties} />
            {repere !== undefined && <span className="qj-repere" style={{ left: `${(repere / max) * 100}%` } as CSSProperties} />}
        </div>
    )
}

export default function QuotasJour({ apports, sante, priorite }: Props) {
    const maintenant = new Date()
    const auj = jourParis(maintenant)
    const santeAuj = sante.find((s) => s.jour === auj) ?? null
    const q = quotasDuJour(priorite, santeAuj, maintenant)
    const a = apportsDu(apports, auj)
    const reste = q.kcal - a.kcal
    const nivKcal = a.kcal > q.kcal * 1.1 ? 'trop' : a.kcal >= q.kcal * 0.9 ? 'ok' : 'encours'
    const nivSucres = niveauSucres(a.sucres)
    const nivGras = a.gras > q.gras ? 'trop' : a.gras > q.gras * 0.8 ? 'attention' : 'ok'

    // Semaine en cours (lundi → dimanche) : sucres ajoutés par jour.
    const lundi = new Date(maintenant)
    lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7))
    const semaine = JOURS.map((lettre, k) => {
        const d = new Date(lundi)
        d.setDate(lundi.getDate() + k)
        const j = jourParis(d)
        const ap = apports.find((x) => x.jour === j)
        const note = !!ap && ap.repas + ap.prises > 0
        return { lettre, j, futur: j > auj, note, sucres: ap?.sucres ?? 0, niveau: note ? niveauSucres(ap!.sucres) : 'vide' }
    })
    const passes = semaine.filter((s) => !s.futur && s.note)
    const sages = passes.filter((s) => s.niveau === 'ok').length

    return (
        <Repliable
            cle="nutri.quotas"
            className="nu-carte qj"
            titre="⚖️ Mes quotas du jour"
            resume={`${nombre(a.kcal)} / ${nombre(q.kcal)} kcal`}
        >
            <div className="qj-lignes">
                <div className="qj-ligne">
                    <div className="qj-tete">
                        <span>🔥 Calories</span>
                        <b>
                            {nombre(a.kcal)} <small>/ {nombre(q.kcal)} kcal</small>
                        </b>
                    </div>
                    <Jauge valeur={a.kcal} max={q.kcal * 1.15} repere={q.kcal} niveau={nivKcal} />
                    <p className="qj-note">
                        {reste > 0 ? `Il te reste environ ${nombre(reste)} kcal aujourd’hui.` : `Objectif atteint (+${nombre(-reste)} kcal).`}
                    </p>
                </div>
                <div className="qj-ligne">
                    <div className="qj-tete">
                        <span>🍬 Sucres ajoutés</span>
                        <b>
                            {g(a.sucres)} <small>/ idéal {SUCRES_IDEAL} g</small>
                        </b>
                    </div>
                    <Jauge valeur={a.sucres} max={SUCRES_MAX * 1.2} repere={SUCRES_IDEAL} niveau={nivSucres} />
                    <p className="qj-note">
                        {nivSucres === 'ok'
                            ? 'Parfait, tu es sous le repère idéal.'
                            : nivSucres === 'attention'
                              ? `Au-dessus de l’idéal, reste sous ${SUCRES_MAX} g.`
                              : 'Journée chargée en sucre : pas grave, on rattrape demain.'}
                    </p>
                </div>
                <div className="qj-ligne">
                    <div className="qj-tete">
                        <span>🧈 Gras saturés</span>
                        <b>
                            {g(a.gras)} <small>/ max {q.gras} g</small>
                        </b>
                    </div>
                    <Jauge valeur={a.gras} max={q.gras * 1.2} repere={q.gras} niveau={nivGras} />
                </div>
            </div>

            <div className="qj-semaine">
                <span className="qj-semaine-titre">Sucre cette semaine</span>
                <div className="qj-jours">
                    {semaine.map((s) => (
                        <span
                            key={s.j}
                            className={`qj-jour ${s.futur ? 'futur' : s.niveau} ${s.j === auj ? 'auj' : ''}`}
                            title={s.note ? `${s.j} : ${g(s.sucres)} de sucres ajoutés` : `${s.j} : rien de noté`}
                        >
                            <i>{s.lettre}</i>
                            {s.futur ? '' : s.niveau === 'ok' ? '✓' : s.niveau === 'vide' ? '·' : s.niveau === 'attention' ? '!' : '✕'}
                        </span>
                    ))}
                </div>
                {passes.length > 0 && (
                    <p className="qj-note">
                        {sages}/{passes.length} jour{passes.length > 1 ? 's' : ''} sous {SUCRES_IDEAL} g de sucres ajoutés
                        {sages === passes.length ? ' 🎉' : ''}
                    </p>
                )}
            </div>

            <p className="qj-calcul">
                Cible calculée pour ta priorité n°1 <b>{LIBELLE_PRIORITE[priorite]}</b> ({BONUS[priorite].texte}) : {nombre(q.base)} kcal de base +{' '}
                {nombre(q.actives)} kcal d’activité {q.activesMesurees ? 'mesurées par ta montre ⌚' : '(estimées, en attendant la montre)'}
                {q.bonus ? ` ${q.bonus > 0 ? '+' : '−'} ${Math.abs(q.bonus)} kcal` : ''}. Les chiffres viennent des estimations du coach et des
                portions cochées dans ta liste.
            </p>
        </Repliable>
    )
}
