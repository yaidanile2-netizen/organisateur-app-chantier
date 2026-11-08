// Petits événements entre les parties de l'app (assistant IA, onglets, cours).
import type { ReponseNutrition } from './api'

export type ItemRevision = {
    quand: string
    titre: string
    matiere: string
    etape: string
    type: string
    fait: boolean
    echeance?: string
}

type Evenements = {
    /** Ouvrir l'assistant, avec éventuellement un message prérempli (ou envoyé tout de suite). */
    'organisateur:ia': { texte?: string; envoyer?: boolean }
    /** Ouvrir l'onglet Cours sur la bonne matière / la bonne partie. */
    'organisateur:cours': ItemRevision
    /** Des données ont changé (après une action de l'assistant) : les écrans concernés se rechargent. */
    'organisateur:actualiser': { domaine: 'agenda' | 'nutrition' | 'tout' }
    /** Une réponse du coach nutrition obtenue par l'assistant (repas analysé, conseil, bilan). */
    'organisateur:nutrition': ReponseNutrition
}

export function emettre<K extends keyof Evenements>(nom: K, detail: Evenements[K]): void {
    window.dispatchEvent(new CustomEvent(nom, { detail }))
}

export function ecouter<K extends keyof Evenements>(nom: K, f: (detail: Evenements[K]) => void): () => void {
    const h = (e: Event) => f((e as CustomEvent<Evenements[K]>).detail)
    window.addEventListener(nom, h)
    return () => window.removeEventListener(nom, h)
}
