// Cartes repliables : on retient sur l'appareil quelles cartes sont ouvertes.
// Par défaut (choix de Daniel), toutes les cartes sont repliées.
import { useSyncExternalStore } from 'react'

const CLE = 'ui.cartes-ouvertes'
const abonnes = new Set<() => void>()

function lire(): Record<string, boolean> {
    try {
        const brut = localStorage.getItem(CLE)
        if (brut) return JSON.parse(brut) as Record<string, boolean>
    } catch {
        // stockage indisponible
    }
    return {}
}

let ouvertes = lire()

export function definirOuvert(cle: string, ouvert: boolean): void {
    if ((ouvertes[cle] === true) === ouvert) return
    ouvertes = { ...ouvertes, [cle]: ouvert }
    try {
        localStorage.setItem(CLE, JSON.stringify(ouvertes))
    } catch {
        // stockage indisponible
    }
    abonnes.forEach((f) => f())
}

function abonner(f: () => void) {
    abonnes.add(f)
    return () => {
        abonnes.delete(f)
    }
}

/** [ouvert, basculer(ouvert?)] pour la carte `cle`. */
export function useRepli(cle: string): [boolean, (ouvert?: boolean) => void] {
    const ouvert = useSyncExternalStore(abonner, () => ouvertes[cle] === true)
    return [ouvert, (o?: boolean) => definirOuvert(cle, o ?? !(ouvertes[cle] === true))]
}
