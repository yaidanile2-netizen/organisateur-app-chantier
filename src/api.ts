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
