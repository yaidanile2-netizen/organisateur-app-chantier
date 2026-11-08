import { useEffect, useRef, useState } from 'react'
import { getTachesEntre } from './api'
import { ecouter, type ItemRevision } from './evenements'
import { fournirContexte } from './ia'
import { programmeRevision } from './revision'

// L'app de révision vit dans public/cours/ (fichiers statiques, même origine) : on la charge
// dans un cadre et on lui parle directement via window.Cours (programme du jour, ouverture
// d'une matière, contexte pour l'assistant).
type ApiCours = {
    jour: (items: ItemRevision[]) => void
    ouvrir: (it: ItemRevision) => void
    contexte: () => { vue: string; matiere: string | null; titre: string; texte: string }
}

export default function CoursView({ actif }: { actif: boolean }) {
    const cadre = useRef<HTMLIFrameElement>(null)
    const [monte, setMonte] = useState(actif)
    const [pret, setPret] = useState(false)
    const [items, setItems] = useState<ItemRevision[]>([])
    const [version, setVersion] = useState(0)
    const enAttente = useRef<ItemRevision | null>(null)

    const api = (): ApiCours | null => {
        try {
            const w = cadre.current?.contentWindow as (Window & { Cours?: ApiCours }) | null | undefined
            return w?.Cours ?? null
        } catch {
            return null
        }
    }

    useEffect(() => {
        if (actif) setMonte(true)
    }, [actif])

    // Programme de révision : les blocs d'étude d'aujourd'hui (ou les prochains).
    useEffect(() => {
        if (!monte) return
        const debut = new Date()
        debut.setHours(0, 0, 0, 0)
        const fin = new Date(debut)
        fin.setDate(fin.getDate() + 4)
        getTachesEntre(debut, fin)
            .then((t) => setItems(programmeRevision(t)))
            .catch(() => setItems([]))
    }, [monte, version, actif])

    useEffect(() => {
        if (pret) api()?.jour(items)
    }, [pret, items])

    useEffect(() => ecouter('organisateur:actualiser', () => setVersion((v) => v + 1)), [])

    // « Ouvrir le cours » depuis l'agenda
    useEffect(
        () =>
            ecouter('organisateur:cours', (it) => {
                setMonte(true)
                const a = api()
                if (pret && a) a.ouvrir(it)
                else enAttente.current = it
            }),
        [pret]
    )

    // Ce que l'assistant voit quand l'onglet Cours est ouvert
    useEffect(
        () =>
            fournirContexte('cours', () => {
                const c = api()?.contexte()
                if (!c) return 'Onglet Cours (révisions) : la bibliothèque des matières.'
                return `Onglet Cours (révisions)${c.matiere ? ` · matière : ${c.matiere}` : ''} · page : ${c.titre}\n${c.texte}`
            }),
        []
    )

    return (
        <div className="cours-zone" hidden={!actif}>
            {monte && (
                <iframe
                    ref={cadre}
                    src="/cours/index.html"
                    title="Mes cours"
                    onLoad={() => {
                        setPret(true)
                        const a = api()
                        if (a) {
                            a.jour(items)
                            if (enAttente.current) {
                                a.ouvrir(enAttente.current)
                                enAttente.current = null
                            }
                        }
                    }}
                />
            )}
        </div>
    )
}
