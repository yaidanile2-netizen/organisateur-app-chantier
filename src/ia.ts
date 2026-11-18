// Assistant IA général (bouton flottant) : appel n8n /webhook/ia, puis l'action éventuelle
// (noter un repas, conseil, bilan, liste, organiser l'agenda) via les webhooks existants.
import { envoyerNutrition, type ContexteConseil, type MomentConseil, type ReponseNutrition } from './api'
import { creerStock, uid } from './stockage'
import { resumeChangements } from './jours'
import { resumeNotes } from './notes'

const BASE_URL = 'https://n8n-production-bdf5.up.railway.app/webhook'

export type ActionIA = 'aucune' | 'repas' | 'conseil' | 'bilan' | 'liste' | 'organiser'

export type ReponseIA = {
    reponse: string
    action: ActionIA
    texte_action: string
    conseil: { moment: MomentConseil | null; lieu: ContexteConseil['lieu']; cuisine: ContexteConseil['cuisine']; budget: number | null } | null
    relances: string[]
    detail: string
}

export type Message = {
    id: string
    role: 'user' | 'assistant'
    texte: string
    date: string
    action?: ActionIA
    nutrition?: ReponseNutrition | null
    organiser?: string | null
    relances?: string[]
    erreur?: boolean
}

// ---------- Contexte de l'écran ----------
// Chaque onglet peut fournir un résumé de ce qui est affiché ; sinon on lit le texte de l'écran.

type Fournisseur = () => string
const fournisseurs = new Map<string, Fournisseur>()

export function fournirContexte(ecran: string, f: Fournisseur): () => void {
    fournisseurs.set(ecran, f)
    return () => {
        if (fournisseurs.get(ecran) === f) fournisseurs.delete(ecran)
    }
}

export function contexteEcran(ecran: string): string {
    const f = fournisseurs.get(ecran)
    let texte = ''
    try {
        texte = f ? f() : ''
    } catch {
        texte = ''
    }
    if (!texte) {
        const main = document.querySelector('main.content') as HTMLElement | null
        texte = main?.innerText || ''
    }
    return texte.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, 3200)
}

// ---------- Appels ----------

async function poster<T>(chemin: string, corps: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}/${chemin}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(corps),
    })
    if (!res.ok) throw new Error(`Le serveur ne répond pas (${res.status}).`)
    const texte = await res.text()
    if (!texte) throw new Error('Réponse vide du serveur.')
    return JSON.parse(texte) as T
}

export function demanderIA(message: string, historique: Message[], ecran: string): Promise<ReponseIA> {
    // Ce que l'IA doit retenir de Daniel passe en tête du contexte (l'IA le lit à chaque question).
    const memo = texteMemoire()
    const consigne =
        '[Mémoire] Si Daniel te donne une information durable sur lui (préférence, contrainte, santé, objectif, organisation) ou te demande de retenir quelque chose, ajoute à la toute fin de ta réponse une ligne qui commence par « [RETENIR] » suivie de l’info en une phrase courte. Sinon, n’ajoute rien.'
    const contexte = [memo ? `Ce que tu sais de Daniel (à garder en tête) :\n${memo}` : '', consigne, resumeChangements(), resumeNotes(), contexteEcran(ecran)].filter(Boolean).join('\n\n')
    return poster<ReponseIA>('ia', {
        message,
        ecran,
        contexte_ecran: contexte.slice(0, 4200),
        historique: historique
            .filter((m) => !m.erreur)
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.texte.slice(0, 700) })),
    })
}

// ---------- Mémoire : ce que l'IA retient (synchronisé) ----------

export type Souvenir = { id: string; texte: string; date: string }
type Memoire = { updatedAt: number; souvenirs: Souvenir[] }
export const memoire = creerStock<Memoire>('ia.memoire', 'prog:ia-memoire', () => ({ updatedAt: 0, souvenirs: [] }))

export function texteMemoire(): string {
    return memoire
        .lire()
        .souvenirs.slice(-25)
        .map((s) => `- ${s.texte}`)
        .join('\n')
        .slice(0, 1400)
}

export function retenir(texte: string): void {
    const t = texte.replace(/\s+/g, ' ').trim().replace(/^[«"“]|[»"”]$/g, '').trim()
    if (t.length < 3) return
    memoire.modifier((m) => {
        const deja = m.souvenirs.some((s) => s.texte.toLowerCase() === t.toLowerCase())
        return deja ? m : { ...m, souvenirs: [...m.souvenirs, { id: uid(), texte: t.slice(0, 220), date: new Date().toISOString() }].slice(-60) }
    })
}

export function oublier(id: string): void {
    memoire.modifier((m) => ({ ...m, souvenirs: m.souvenirs.filter((s) => s.id !== id) }))
}

/** Sépare les lignes « [RETENIR] … » de la réponse de l'IA et les enregistre. */
export function extraireSouvenirs(reponse: string): string {
    const garder: string[] = []
    for (const ligne of reponse.split('\n')) {
        const m = ligne.match(/^\s*\[?\s*RETENIR\s*\]?\s*[:：-]?\s*(.+)$/i)
        if (m) retenir(m[1])
        else garder.push(ligne)
    }
    return garder.join('\n').trim()
}

/** « Retiens que… », « souviens-toi que… », « n'oublie pas que… » : noté tout de suite, sans attendre l'IA. */
export function demandeDeRetenir(message: string): string | null {
    const m = message.match(/^\s*(?:retiens|souviens[- ]toi|rappelle[- ]toi|n['’]oublie pas|note bien|garde en t[eê]te)\s*(?:que|qu['’]|bien que|de|:)?\s*(.+)$/i)
    return m ? m[1].trim() : null
}

function momentActuel(): MomentConseil {
    const h = new Date().getHours()
    if (h < 10) return 'petit_dejeuner'
    if (h < 14) return 'midi'
    if (h < 18) return 'gouter'
    return 'soir'
}

/** Exécute l'action demandée par l'IA. Renvoie la réponse du coach nutrition ou le texte de l'organisateur. */
export async function executerAction(r: ReponseIA, message: string): Promise<{ nutrition?: ReponseNutrition; organiser?: string }> {
    switch (r.action) {
        case 'repas':
            return { nutrition: await envoyerNutrition({ texte: r.texte_action || message }) }
        case 'conseil': {
            const c = r.conseil
            const contexte: ContexteConseil = {
                moment: c?.moment ?? momentActuel(),
                lieu: c?.lieu ?? 'supermarche',
                cuisine: c?.cuisine ?? 'non',
                budget: c?.budget ?? null,
            }
            return { nutrition: await envoyerNutrition({ action: 'conseil', texte: message, contexte }) }
        }
        case 'bilan':
            return { nutrition: await envoyerNutrition({ action: 'bilan' }) }
        case 'liste':
            return { nutrition: await envoyerNutrition({ action: 'liste' }) }
        case 'organiser': {
            const o = await poster<{ reponse?: string }>('organisateur', { texte: r.texte_action || message })
            return { organiser: o.reponse || 'C’est fait.' }
        }
        default:
            return {}
    }
}

// ---------- Historique : 30 jours, synchronisé entre appareils ----------

const CLE = 'ia.historique'
const JOURS_GARDES = 30
const MAX_MESSAGES = 500

const recent = (m: Message[]) => {
    const limite = Date.now() - JOURS_GARDES * 24 * 3600 * 1000
    return m.filter((x) => new Date(x.date).getTime() >= limite).slice(-MAX_MESSAGES)
}

type Fil = { updatedAt: number; efface: number; messages: Message[] }
// En ligne : sans les grosses réponses du coach nutrition, pour rester léger.
const allege = (m: Message): Message => ({ ...m, nutrition: undefined, texte: m.texte.slice(0, 2500) })
export const fil = creerStock<Fil>(
    'ia.fil',
    'prog:ia-historique',
    () => ({ updatedAt: 0, efface: 0, messages: [] }),
    (a, b) => {
        const efface = Math.max(a.efface || 0, b.efface || 0)
        const par = new Map<string, Message>()
        for (const m of [...b.messages, ...a.messages]) if (new Date(m.date).getTime() > efface) par.set(m.id, m)
        return { updatedAt: 0, efface, messages: recent([...par.values()].sort((x, y) => x.date.localeCompare(y.date))) }
    },
)

export function lireHistorique(): Message[] {
    let local: Message[] = []
    try {
        // copie complète de l'appareil (avec les cartes nutrition) ; c'est aussi l'ancien historique
        const brut = localStorage.getItem(CLE)
        local = brut ? (JSON.parse(brut) as Message[]) : []
    } catch {
        local = []
    }
    const complet = new Map(local.map((m) => [m.id, m]))
    const f = fil.lire().messages
    return recent((f.length ? f : local).map((m) => complet.get(m.id) ?? m))
}

export function ecrireHistorique(m: Message[]): void {
    const garde = recent(m)
    fil.modifier((f) => ({ ...f, efface: m.length ? f.efface : Date.now(), messages: garde.map(allege) }))
    try {
        // la version complète (avec les cartes nutrition) reste sur l'appareil
        localStorage.setItem(CLE, JSON.stringify(garde.slice(-80)))
    } catch {
        // stockage plein ou indisponible
    }
}
