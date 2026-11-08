// Assistant IA général (bouton flottant) : appel n8n /webhook/ia, puis l'action éventuelle
// (noter un repas, conseil, bilan, liste, organiser l'agenda) via les webhooks existants.
import { envoyerNutrition, type ContexteConseil, type MomentConseil, type ReponseNutrition } from './api'

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
    return poster<ReponseIA>('ia', {
        message,
        ecran,
        contexte_ecran: contexteEcran(ecran),
        historique: historique.slice(-8).map((m) => ({ role: m.role, content: m.texte })),
    })
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

// ---------- Historique (sur l'appareil) ----------

const CLE = 'ia.historique'

export function lireHistorique(): Message[] {
    try {
        const brut = localStorage.getItem(CLE)
        return brut ? (JSON.parse(brut) as Message[]) : []
    } catch {
        return []
    }
}

export function ecrireHistorique(m: Message[]): void {
    try {
        localStorage.setItem(CLE, JSON.stringify(m.slice(-40)))
    } catch {
        // stockage plein ou indisponible
    }
}
