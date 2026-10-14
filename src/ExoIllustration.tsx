import { useMemo, useSyncExternalStore } from 'react'
import { illustration, type Forme } from './illustrations'

const requete = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null
function abonner(f: () => void) {
    requete?.addEventListener('change', f)
    return () => requete?.removeEventListener('change', f)
}
const mouvementReduit = () => requete?.matches ?? false

const EPAISSEUR: Partial<Record<Forme['sorte'], number>> = { corps: 4.6, loin: 4.2, accent: 4.8, machine: 3, piece: 4, cable: 1, elastique: 1.6, sol: 1.4 }

/** Illustration animée d'un exercice (personnage + machine), dans la couleur de la séance (--c). */
export default function ExoIllustration({ id, grand = false, titre }: { id: string; grand?: boolean; titre?: string }) {
    const ill = useMemo(() => illustration(id), [id])
    const reduit = useSyncExternalStore(abonner, mouvementReduit, () => false)
    if (!ill) return null
    const { formes, temps, duree } = ill
    const dur = `${duree}s`
    const keyTimes = temps.join(';')
    const splines = temps
        .slice(1)
        .map(() => '0.45 0 0.55 1')
        .join(';')
    // Mouvement réduit : on montre la position « travail » (milieu de la séquence), sans animation.
    const fixe = (v: number[]) => (v.length === 1 ? v[0] : v[Math.floor((v.length - 1) / 2)])
    return (
        <svg className={`mu-ill${grand ? ' grand' : ''}`} viewBox="0 0 120 90" role="img" aria-label={titre ?? ill.legende}>
            {formes.map((f, k) => {
                const anims = reduit
                    ? []
                    : Object.entries(f.attrs)
                          .filter(([, v]) => v.length > 1)
                          .map(([attr, v]) => (
                              <animate
                                  key={attr}
                                  attributeName={attr}
                                  values={v.join(';')}
                                  keyTimes={keyTimes}
                                  calcMode="spline"
                                  keySplines={splines}
                                  dur={dur}
                                  repeatCount="indefinite"
                              />
                          ))
                const a = Object.fromEntries(Object.entries(f.attrs).map(([attr, v]) => [attr, fixe(v)]))
                const cls = `ill-${f.sorte}`
                if (f.tag === 'line')
                    return (
                        <line key={k} className={cls} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} strokeWidth={f.w ?? EPAISSEUR[f.sorte]} strokeLinecap="round">
                            {anims}
                        </line>
                    )
                if (f.tag === 'circle')
                    return (
                        <circle key={k} className={`${cls}${f.vide ? ' vide' : ''}`} cx={a.cx} cy={a.cy} r={a.r}>
                            {anims}
                        </circle>
                    )
                return <rect key={k} className={`${cls} plein`} x={a.x} y={a.y} width={a.width} height={a.height} rx={a.rx} />
            })}
        </svg>
    )
}
