// Petit stockage synchronisé entre appareils (18/11/2026), sur le même principe que l'avancement des TD :
// une copie sur l'appareil (localStorage) + une copie en ligne via le webhook /revisions (table cours_donnees,
// clés « prog:… »). La version la plus récente (updatedAt) gagne ; une fusion personnalisée est possible.
const API = 'https://n8n-production-bdf5.up.railway.app/webhook/revisions'

type Element = { cle: string; data: unknown }
let etatEnCours: Promise<Element[]> | null = null
let etatDate = 0
let etatCache: Element[] = []

/** Tout l'état en ligne (une seule requête partagée, gardée 20 s). */
export function etatEnLigne(forcer = false): Promise<Element[]> {
    if (!forcer && Date.now() - etatDate < 20000) return Promise.resolve(etatCache)
    etatEnCours ??= fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'etat' }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { elements?: Element[] } | null) => {
            etatCache = d?.elements ?? []
            etatDate = Date.now()
            return etatCache
        })
        .catch(() => etatCache)
        .finally(() => {
            etatEnCours = null
        })
    return etatEnCours
}

export type Stock<T extends { updatedAt: number }> = {
    lire: () => T
    modifier: (f: (v: T) => T) => T
    abonner: (f: () => void) => () => void
    synchroniser: () => Promise<void>
}

export function creerStock<T extends { updatedAt: number }>(
    cleLocale: string,
    cleEnLigne: string,
    vide: () => T,
    fusion?: (local: T, enLigne: T) => T,
): Stock<T> {
    let cache: T | null = null
    const abonnes = new Set<() => void>()
    let minuteur: number | undefined

    const lire = (): T => {
        if (cache) return cache
        try {
            const brut = localStorage.getItem(cleLocale)
            cache = brut ? { ...vide(), ...(JSON.parse(brut) as T) } : vide()
        } catch {
            cache = vide()
        }
        return cache
    }
    const local = (v: T) => {
        cache = v
        try {
            localStorage.setItem(cleLocale, JSON.stringify(v))
        } catch {
            // stockage plein ou indisponible
        }
        abonnes.forEach((f) => f())
    }
    const envoyer = (v: T) => {
        window.clearTimeout(minuteur)
        minuteur = window.setTimeout(() => {
            fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ecrire', cle: cleEnLigne, data: v }) }).catch(() => {
                // hors ligne : renvoyé à la prochaine synchro
            })
        }, 800)
    }
    return {
        lire,
        modifier(f) {
            const v = { ...f(structuredClone(lire())), updatedAt: Date.now() }
            local(v)
            envoyer(v)
            return v
        },
        abonner(f) {
            abonnes.add(f)
            return () => {
                abonnes.delete(f)
            }
        },
        async synchroniser() {
            const els = await etatEnLigne()
            const enLigne = els.find((e) => e.cle === cleEnLigne)?.data as T | undefined
            const loc = lire()
            if (enLigne && fusion) {
                const f = { ...fusion(loc, { ...vide(), ...enLigne }), updatedAt: Math.max(loc.updatedAt || 0, enLigne.updatedAt || 0) }
                if (JSON.stringify(f) !== JSON.stringify(loc)) local(f)
                if (JSON.stringify(f) !== JSON.stringify(enLigne)) envoyer(f)
                return
            }
            if (enLigne && (enLigne.updatedAt || 0) > (loc.updatedAt || 0)) local({ ...vide(), ...enLigne })
            else if (loc.updatedAt && (!enLigne || loc.updatedAt > (enLigne.updatedAt || 0))) envoyer(loc)
        },
    }
}

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const jourIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
