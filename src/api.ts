// Chantier 8 — client API vers les webhooks n8n (CRUD tâches, cours, catégories).
// Même backend que la voix : la PWA passe par n8n, jamais directement par Supabase.

const BASE_URL = 'https://n8n-production-bdf5.up.railway.app/webhook'

export type Statut = 'a_faire' | 'en_cours' | 'fait' | 'annule'
export type Priorite = 'basse' | 'normale' | 'haute'
export type Source = 'ia' | 'manuel' | 'iut'

export type Tache = {
    id: string
    titre: string
    description: string | null
    categorie_id: number | null
    date_debut: string | null
    date_fin: string | null
    toute_la_journee: boolean
    statut: Statut
    priorite: Priorite
    source: Source
    modifiable: boolean
    notifie: boolean
    categorie_nom: string | null
    categorie_couleur: string | null
}

export type Cours = {
    id: string
    titre: string
    description: string | null
    lieu: string | null
    date_debut: string
    date_fin: string
    type?: string | null // CM, TD, TP, Contrôle continu TD, Travail en autonomie…
    groupes?: string | null
}

export type Categorie = {
    id: number
    nom: string
    couleur: string
}

export type NouvelleTache = {
    titre: string
    description?: string
    categorie_id?: number | null
    date_debut?: string
    date_fin?: string
    toute_la_journee?: boolean
    statut?: Statut
    priorite?: Priorite
    modifiable?: boolean
}

export type ModificationTache = Partial<NouvelleTache> & { id: string }

function debutEtFinDeJournee(date: Date): { debut: string; fin: string } {
    const debut = new Date(date)
    debut.setHours(0, 0, 0, 0)
    const fin = new Date(date)
    fin.setHours(23, 59, 59, 999)
    return { debut: debut.toISOString(), fin: fin.toISOString() }
}

async function lireJson<T>(res: Response, messageErreur: string, siVide: T): Promise<T> {
    if (!res.ok) {
        throw new Error(`${messageErreur} (${res.status})`)
    }
    // n8n renvoie une réponse vide (pas « [] ») quand la requête SQL ne trouve
    // aucune ligne — par exemple un jour sans cours.
    const texte = await res.text()
    if (!texte.trim()) return siVide
    return JSON.parse(texte) as T
}

function dansIntervalle(iso: string | null, debut: string, fin: string): boolean {
    if (!iso) return false
    const t = new Date(iso).getTime()
    return t >= new Date(debut).getTime() && t <= new Date(fin).getTime()
}

export async function getTachesEntre(debutPeriode: Date, finPeriode: Date): Promise<Tache[]> {
    const debut = debutPeriode.toISOString()
    const fin = finPeriode.toISOString()
    const url = `${BASE_URL}/taches?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`
    const res = await fetch(url)
    const taches = await lireJson<Tache[]>(res, 'Impossible de charger les tâches', [])
    // Filet de sécurité : on ne garde que les tâches de la période, même si le
    // webhook renvoie plus large.
    return taches.filter((t) => dansIntervalle(t.date_debut, debut, fin))
}

export async function getCoursEntre(debutPeriode: Date, finPeriode: Date): Promise<Cours[]> {
    const debut = debutPeriode.toISOString()
    const fin = finPeriode.toISOString()
    const url = `${BASE_URL}/cours?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`
    const res = await fetch(url)
    const cours = await lireJson<Cours[]>(res, 'Impossible de charger les cours', [])
    return cours.filter((c) => dansIntervalle(c.date_debut, debut, fin))
}

export async function getTaches(date: Date): Promise<Tache[]> {
    const { debut, fin } = debutEtFinDeJournee(date)
    return getTachesEntre(new Date(debut), new Date(fin))
}

export async function getCours(date: Date): Promise<Cours[]> {
    const { debut, fin } = debutEtFinDeJournee(date)
    return getCoursEntre(new Date(debut), new Date(fin))
}

export async function getCategories(): Promise<Categorie[]> {
    const res = await fetch(`${BASE_URL}/categories`)
    return lireJson<Categorie[]>(res, 'Impossible de charger les catégories', [])
}

export async function creerTache(data: NouvelleTache): Promise<Tache> {
    const res = await fetch(`${BASE_URL}/creer-tache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    const rows = await lireJson<Tache[]>(res, 'Impossible de créer la tâche', [])
    return rows[0]
}

export async function modifierTache(data: ModificationTache): Promise<Tache> {
    const res = await fetch(`${BASE_URL}/modifier-tache`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    const rows = await lireJson<Tache[]>(res, 'Impossible de modifier la tâche', [])
    return rows[0]
}

export async function supprimerTache(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/supprimer-tache`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    })
    if (!res.ok) {
        throw new Error(`Impossible de supprimer la tâche (${res.status})`)
    }
}

// Coach nutrition — webhooks n8n /nutrition, /nutrition-etat, /supprimer-repas

export type Objectif = 'musculation' | 'cardio' | 'croissance' | 'perte_gras' | 'peau'
export type Moment = 'petit_dejeuner' | 'dejeuner' | 'diner' | 'collation'

export type Repas = {
    id: string
    date: string
    moment: Moment
    description: string
    nutriments: string[]
}

export type ItemListe = {
    id: string
    emoji: string
    aliment: string
    pourquoi: string
    /** Ce que représente une pastille, ex. « 1 œuf », « 1 pot ». */
    portion?: string
    /** repas = aliment de base, facile = sans cuisson / 5 min, grignoter = en-cas entre les repas. */
    type?: 'repas' | 'facile' | 'grignoter'
    cible: number
    fait: number
}

export type EtatNutrition = {
    priorites: Objectif[]
    repas_semaine: Repas[]
    liste: ItemListe[]
    semaine: string
}

export type Suggestion = { emoji?: string; aliment: string; nutriment?: string; comment?: string }

export type LignePlan = { jour: string; repas?: string; idee: string; pour?: string }

export type Coche = { id: string; aliment: string; emoji: string; avant: number; apres: number; quantite?: string; equivalent?: string }

export type ArticleConseil = { emoji: string; aliment: string; detail: string; prix: string }
export type OptionConseil = { titre: string; prix: string; pour: string; items: ArticleConseil[] }
export type Conseil = { options: OptionConseil[]; astuces: string[]; eviter: string[] }

export type MomentConseil = 'petit_dejeuner' | 'midi' | 'gouter' | 'soir'
export type LieuConseil = 'supermarche' | 'boulangerie' | 'fast_food' | 'cafeteria' | 'maison'
export type CuisineConseil = 'non' | 'micro_ondes' | 'oui'
export type ContexteConseil = { moment: MomentConseil; lieu: LieuConseil; cuisine: CuisineConseil; budget: number | null }

export type ReponseNutrition = {
    intent: 'repas' | 'bilan' | 'objectifs' | 'liste' | 'question' | 'conseil'
    titre: string
    reponse: string
    apports: string[]
    manques: string[]
    suggestions: Suggestion[]
    points_forts: string[]
    plan: LignePlan[]
    repas: Omit<Repas, 'id' | 'date'> | null
    objectifs: Objectif[] | null
    liste: ItemListe[] | null
    coches: Coche[]
    /** Réponse personnalisée « quoi manger / acheter » (intent conseil). */
    conseil?: Conseil | null
    detail: string
}

export type DemandeNutrition =
    | { texte: string }
    | { action: 'bilan' }
    | { action: 'liste' }
    | { action: 'objectifs'; objectifs: Objectif[] }
    | { action: 'conseil'; texte: string; contexte: ContexteConseil }

export async function getEtatNutrition(): Promise<EtatNutrition> {
    const res = await fetch(`${BASE_URL}/nutrition-etat`)
    const etat = await lireJson<EtatNutrition>(res, 'Impossible de charger le suivi nutrition', {
        priorites: [],
        repas_semaine: [],
        liste: [],
        semaine: '',
    })
    return { ...etat, liste: Array.isArray(etat.liste) ? etat.liste : [] }
}

export async function envoyerNutrition(demande: DemandeNutrition): Promise<ReponseNutrition> {
    const res = await fetch(`${BASE_URL}/nutrition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demande),
    })
    const vide: ReponseNutrition = {
        intent: 'question',
        titre: '',
        reponse: '',
        apports: [],
        manques: [],
        suggestions: [],
        points_forts: [],
        plan: [],
        repas: null,
        objectifs: null,
        liste: null,
        coches: [],
        detail: '',
    }
    return lireJson<ReponseNutrition>(res, 'Le coach nutrition ne répond pas', vide)
}

export async function supprimerRepas(id: string): Promise<void> {
    const res = await fetch(`${BASE_URL}/supprimer-repas`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
    })
    if (!res.ok) {
        throw new Error(`Impossible de supprimer le repas (${res.status})`)
    }
}

export async function cocherListe(id: string, fait: number): Promise<ItemListe[]> {
    const res = await fetch(`${BASE_URL}/liste-cocher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, fait }),
    })
    const r = await lireJson<{ items: ItemListe[] }>(res, 'Impossible de mettre à jour la liste', { items: [] })
    return Array.isArray(r.items) ? r.items : []
}

// Suivi muscu synchronisé (charges et historique des séances).
export type Ressenti = 'dur' | 'bien' | 'facile'
export type ExoFait = { id: string; faites: number; total: number; kg: number | null; ressenti: Ressenti }
export type SeanceFaite = { id: string; code: 'A' | 'B' | 'C' | 'D'; date: string; exercices: ExoFait[] }
export type EtatMuscu = { charges: Record<string, number>; seances: SeanceFaite[] }

export type DemandeMuscu =
    | { action: 'etat' }
    | { action: 'charge'; id: string; kg: number | null }
    | { action: 'seance'; code: string; date: string; exercices: ExoFait[]; charges: Record<string, number | null> }
    | { action: 'supprimer'; id: string }
    | { action: 'import'; charges: Record<string, number | null>; seances: { code: string; date: string; exercices: ExoFait[] }[] }

export async function envoyerMuscu(demande: DemandeMuscu): Promise<EtatMuscu> {
    const res = await fetch(`${BASE_URL}/muscu`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demande),
    })
    const r = await lireJson<EtatMuscu>(res, 'Impossible de synchroniser le suivi muscu', { charges: {}, seances: [] })
    return {
        charges: r && typeof r.charges === 'object' && r.charges ? r.charges : {},
        seances: Array.isArray(r?.seances) ? r.seances : [],
    }
}
