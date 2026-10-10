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

async function lireJson<T>(res: Response, messageErreur: string): Promise<T> {
    if (!res.ok) {
        throw new Error(`${messageErreur} (${res.status})`)
    }
    return res.json() as Promise<T>
}

export async function getTaches(date: Date): Promise<Tache[]> {
    const { debut, fin } = debutEtFinDeJournee(date)
    const url = `${BASE_URL}/taches?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`
    const res = await fetch(url)
    return lireJson<Tache[]>(res, 'Impossible de charger les tâches')
}

export async function getCours(date: Date): Promise<Cours[]> {
    const { debut, fin } = debutEtFinDeJournee(date)
    const url = `${BASE_URL}/cours?debut=${encodeURIComponent(debut)}&fin=${encodeURIComponent(fin)}`
    const res = await fetch(url)
    return lireJson<Cours[]>(res, 'Impossible de charger les cours')
}

export async function getCategories(): Promise<Categorie[]> {
    const res = await fetch(`${BASE_URL}/categories`)
    return lireJson<Categorie[]>(res, 'Impossible de charger les catégories')
}

export async function creerTache(data: NouvelleTache): Promise<Tache> {
    const res = await fetch(`${BASE_URL}/creer-tache`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    const rows = await lireJson<Tache[]>(res, 'Impossible de créer la tâche')
    return rows[0]
}

export async function modifierTache(data: ModificationTache): Promise<Tache> {
    const res = await fetch(`${BASE_URL}/modifier-tache`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    })
    const rows = await lireJson<Tache[]>(res, 'Impossible de modifier la tâche')
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
