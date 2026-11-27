// Chrono de repos (27/11/2026, demande de Daniel) : un vrai minuteur qui continue de tourner quand l'app est
// fermée ou le téléphone verrouillé. On ne compte pas les secondes : on garde l'heure de fin et on recalcule.
// - App ouverte : bip + vibration à la fin.
// - App fermée / écran éteint : n8n attend la durée puis envoie une notification push à CE téléphone
//   (« ⏱️ Repos terminé »). « Passer » prévient n8n (clé prog:minuteur) pour qu'il n'envoie rien.
import { ecrireCle } from './notifs'
import { notificationsDisponibles } from './push'

export type Minuteur = { id: string; fin: number; total: number; libelle: string }

const CLE = 'muscu.repos'
const WEBHOOK = 'https://n8n-production-bdf5.up.railway.app/webhook/minuteur'
const REVISIONS = 'https://n8n-production-bdf5.up.railway.app/webhook/revisions'

const abonnes = new Set<() => void>()
let courant: Minuteur | null = (() => {
    try {
        const m = JSON.parse(localStorage.getItem(CLE) || 'null') as Minuteur | null
        // Un repos fini depuis plus de 10 min n'a plus d'intérêt.
        return m && m.fin > Date.now() - 600000 ? m : null
    } catch {
        return null
    }
})()

export const minuteurEnCours = () => courant
export const restantMs = (m: Minuteur) => Math.max(0, m.fin - Date.now())

export function abonnerMinuteur(f: () => void) {
    abonnes.add(f)
    return () => {
        abonnes.delete(f)
    }
}

function garder(m: Minuteur | null) {
    courant = m
    try {
        if (m) localStorage.setItem(CLE, JSON.stringify(m))
        else localStorage.removeItem(CLE)
    } catch {
        // stockage indisponible
    }
    // Le service worker lit cette copie quand la notification arrive.
    ecrireCle('minuteur', m)
    abonnes.forEach((f) => f())
}

/** Dit à n8n si ce repos compte encore (lu par le workflow juste avant d'envoyer la notification). */
function signaler(m: Minuteur, actif: boolean) {
    fetch(REVISIONS, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'ecrire', cle: 'prog:minuteur', data: { updatedAt: Date.now(), id: m.id, fin: m.fin, actif } }),
    }).catch(() => {})
}

async function programmerPush(m: Minuteur) {
    if (!notificationsDisponibles() || Notification.permission !== 'granted') return false
    try {
        const reg = await navigator.serviceWorker.ready
        const abo = await reg.pushManager.getSubscription()
        if (!abo) return false
        const r = await fetch(WEBHOOK, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id: m.id, secondes: Math.round(restantMs(m) / 1000), endpoint: abo.endpoint }),
        })
        return r.ok
    } catch {
        return false
    }
}

/** Lance (ou relance) le repos. Renvoie si la sonnerie téléphone verrouillé est programmée. */
export async function lancerRepos(secondes: number, libelle = 'Repos'): Promise<boolean> {
    const m: Minuteur = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fin: Date.now() + secondes * 1000, total: secondes, libelle }
    if (courant) signaler(courant, false)
    garder(m)
    signaler(m, true)
    return programmerPush(m)
}

/** ±15 s : c'est un nouveau repos pour n8n (l'ancien est annulé). */
export async function ajusterRepos(deltaSec: number): Promise<boolean> {
    if (!courant) return false
    const reste = Math.max(5, Math.round((courant.fin - Date.now()) / 1000) + deltaSec)
    const total = Math.max(reste, courant.total + deltaSec)
    signaler(courant, false)
    const m: Minuteur = { ...courant, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), fin: Date.now() + reste * 1000, total }
    garder(m)
    signaler(m, true)
    return programmerPush(m)
}

/** Après avoir activé les notifications : programme la sonnerie du repos en cours. */
export const reprogrammer = () => (courant && courant.fin > Date.now() + 3000 ? programmerPush(courant) : Promise.resolve(false))

/** Le repos est fini et vu dans l'app : on l'enlève de l'écran (la copie du service worker reste). */
export function oublierRepos() {
    courant = null
    try {
        localStorage.removeItem(CLE)
    } catch {
        // stockage indisponible
    }
    abonnes.forEach((f) => f())
}

export function arreterRepos() {
    if (courant && courant.fin > Date.now()) signaler(courant, false)
    garder(null)
}

// ---- Sonnerie quand l'app est ouverte ----
let audio: AudioContext | null = null
/** Sur iPhone le son doit être débloqué pendant un toucher : appelé au moment où on coche une série. */
export function preparerSon() {
    try {
        audio ??= new AudioContext()
        audio.resume().catch(() => {})
    } catch {
        // pas de son possible
    }
}

export function sonner() {
    try {
        audio ??= new AudioContext()
        const t0 = audio.currentTime
        for (let i = 0; i < 3; i++) {
            const o = audio.createOscillator()
            const g = audio.createGain()
            o.type = 'square'
            o.frequency.value = i === 2 ? 1318 : 988
            const t = t0 + i * 0.32
            g.gain.setValueAtTime(0.0001, t)
            g.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
            g.gain.exponentialRampToValueAtTime(0.0001, t + (i === 2 ? 0.45 : 0.2))
            o.connect(g).connect(audio.destination)
            o.start(t)
            o.stop(t + 0.5)
        }
    } catch {
        // pas de son possible
    }
    if ('vibrate' in navigator) navigator.vibrate([300, 120, 300, 120, 500])
}
