// Historique des notifications (18/11/2026) : le service worker note chaque notification qu'il affiche
// dans IndexedDB (même origine que l'app) ; l'app les relit pour le bouton 🔔. Gardé 30 jours.
export type Notif = { id?: number; date: string; titre: string; texte: string }

const BASE = 'organisateur'
const MAGASIN = 'notifs'
// v2 (27/11/2026) : petit magasin clé → valeur partagé avec le service worker (chrono de repos).
const CLES = 'cles'

function ouvrir(): Promise<IDBDatabase> {
    return new Promise((ok, ko) => {
        const r = indexedDB.open(BASE, 2)
        r.onupgradeneeded = () => {
            const db = r.result
            if (!db.objectStoreNames.contains(MAGASIN)) db.createObjectStore(MAGASIN, { keyPath: 'id', autoIncrement: true })
            if (!db.objectStoreNames.contains(CLES)) db.createObjectStore(CLES)
        }
        r.onsuccess = () => ok(r.result)
        r.onerror = () => ko(r.error)
    })
}

export async function noterNotif(n: Notif): Promise<void> {
    try {
        const db = await ouvrir()
        await new Promise<void>((ok) => {
            const tx = db.transaction(MAGASIN, 'readwrite')
            const st = tx.objectStore(MAGASIN)
            st.add(n)
            // ménage : on ne garde que 30 jours
            const limite = new Date(Date.now() - 30 * 86400000).toISOString()
            const c = st.openCursor()
            c.onsuccess = () => {
                const cur = c.result
                if (!cur) return
                if ((cur.value as Notif).date < limite) cur.delete()
                cur.continue()
            }
            tx.oncomplete = () => ok()
            tx.onerror = () => ok()
        })
        db.close()
    } catch {
        // IndexedDB indisponible : tant pis pour l'historique
    }
}

export async function lireNotifs(): Promise<Notif[]> {
    try {
        const db = await ouvrir()
        const l = await new Promise<Notif[]>((ok) => {
            const r = db.transaction(MAGASIN, 'readonly').objectStore(MAGASIN).getAll()
            r.onsuccess = () => ok((r.result as Notif[]) || [])
            r.onerror = () => ok([])
        })
        db.close()
        return l.sort((a, b) => b.date.localeCompare(a.date))
    } catch {
        return []
    }
}

export async function viderNotifs(): Promise<void> {
    try {
        const db = await ouvrir()
        await new Promise<void>((ok) => {
            const tx = db.transaction(MAGASIN, 'readwrite')
            tx.objectStore(MAGASIN).clear()
            tx.oncomplete = () => ok()
            tx.onerror = () => ok()
        })
        db.close()
    } catch {
        // rien
    }
}

/** Valeur partagée app ↔ service worker (ex. : le chrono de repos en cours). */
export async function lireCle<T>(cle: string): Promise<T | null> {
    try {
        const db = await ouvrir()
        const v = await new Promise<T | null>((ok) => {
            const r = db.transaction(CLES, 'readonly').objectStore(CLES).get(cle)
            r.onsuccess = () => ok((r.result as T) ?? null)
            r.onerror = () => ok(null)
        })
        db.close()
        return v
    } catch {
        return null
    }
}

export async function ecrireCle(cle: string, valeur: unknown): Promise<void> {
    try {
        const db = await ouvrir()
        await new Promise<void>((ok) => {
            const tx = db.transaction(CLES, 'readwrite')
            if (valeur === null || valeur === undefined) tx.objectStore(CLES).delete(cle)
            else tx.objectStore(CLES).put(valeur, cle)
            tx.oncomplete = () => ok()
            tx.onerror = () => ok()
        })
        db.close()
    } catch {
        // IndexedDB indisponible
    }
}
