import type { CSSProperties, ReactNode } from 'react'
import { useRepli } from './repli'

/** Titre cliquable avec chevron : à mettre dans le h2 d'une carte. */
export function BoutonRepli({ ouvert, onClick, children }: { ouvert: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" className="repli-bouton" aria-expanded={ouvert} onClick={onClick}>
            <span className="repli-texte">{children}</span>
            <span className="repli-chevron" aria-hidden="true">
                ▾
            </span>
        </button>
    )
}

type Props = {
    cle: string
    className: string
    style?: CSSProperties
    titre: ReactNode
    h2Class?: string
    /** Boutons ou badges à droite du titre (toujours visibles). */
    entete?: ReactNode
    /** Petit résumé affiché quand la carte est repliée. */
    resume?: ReactNode
    children: ReactNode
}

export default function Repliable({ cle, className, style, titre, h2Class, entete, resume, children }: Props) {
    const [ouvert, basculer] = useRepli(cle)
    return (
        <section className={`${className} repliable${ouvert ? '' : ' replie'}`} style={style}>
            <div className="repli-tete">
                <h2 className={h2Class}>
                    <BoutonRepli ouvert={ouvert} onClick={() => basculer()}>
                        {titre}
                    </BoutonRepli>
                </h2>
                {!ouvert && resume ? <span className="repli-resume">{resume}</span> : null}
                {entete}
            </div>
            {ouvert && children}
        </section>
    )
}
