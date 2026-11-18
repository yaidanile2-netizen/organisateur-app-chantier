// Replanification après un changement de programme (18/11/2026).
// Pour chaque semaine touchée : on recalcule les séances de sport et les blocs de révision encore à venir
// (ceux déjà faits ou passés restent), puis on dit à Daniel ce qui bouge : « Séance B : mar. 18 h → mer. 10 h 30 ».
import { creerTache, getCategories, getCoursEntre, getTachesEntre, supprimerTache, type Cours, type NouvelleTache, type Tache } from './api'
import { MARQUEUR_ETUDE, descriptionBloc, echeances, lireReglagesEtudes, planifierEtudes, titreBloc } from './etudes'
import type { CodeSeance } from './programme'
import { jourIso } from './stockage'
import { MARQUEUR, codeDeTache, debutDeSemaine, descriptionSeance, lireReglages, planifierSemaine, titreSeance } from './sport'

const JOUR = 24 * 3600 * 1000

export type Mouvement = {
    genre: 'sport' | 'etude'
    nom: string
    avant?: { debut: Date; fin: Date }
    apres?: { debut: Date; fin: Date }
}

export type Replan = {
    mouvements: Mouvement[]
    supprimer: Tache[]
    creer: (NouvelleTache & { genre: 'sport' | 'etude' })[]
}

const jourF = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const heureF = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
export const quandTexte = (q: { debut: Date; fin: Date }) => `${jourF.format(q.debut)} ${heureF.format(q.debut)}–${heureF.format(q.fin)}`

const plage = (t: Tache) => ({ debut: new Date(t.date_debut as string), fin: new Date((t.date_fin || t.date_debut) as string) })
const cleEtude = (t: { description?: string | null }) => (t.description || '').match(/#etude-auto (\S+ e\d+)/)?.[1] ?? null
const nomEtude = (titre: string) => titre.replace(/^[^\p{L}\d]+/u, '').trim()

async function semaineSport(lundi: Date, maintenant: Date, cours: Cours[], taches: Tache[], du: string, au: string): Promise<Replan> {
    const auto = taches.filter((t) => t.description?.includes(MARQUEUR) && t.statut !== 'annule' && t.date_debut)
    // Seules les séances à venir des jours changés bougent ; les autres restent où elles sont.
    const dansPeriode = (t: Tache) => {
        const j = jourIso(new Date(t.date_debut as string))
        return du <= j && j <= au
    }
    const aVenir = auto.filter((t) => t.statut !== 'fait' && new Date(t.date_debut as string) > maintenant && dansPeriode(t))
    if (!aVenir.length) return { mouvements: [], supprimer: [], creer: [] }
    const codes = aVenir.map(codeDeTache).filter((c): c is CodeSeance => c !== null)
    const fixes = auto.filter((t) => !aVenir.includes(t))
    const props = planifierSemaine(lundi, cours, taches.filter((t) => !aVenir.includes(t)), lireReglages(), maintenant, {
        seulement: codes,
        joursPris: fixes.map((t) => new Date(t.date_debut as string)),
    })
    const mouvements: Mouvement[] = []
    const creer: Replan['creer'] = []
    for (const code of codes) {
        const t = aVenir.find((x) => codeDeTache(x) === code) as Tache
        const p = props.find((x) => x.seance.code === code)
        const avant = plage(t)
        const apres = p ? { debut: p.depart, fin: p.retour } : undefined
        if (apres && Math.abs(apres.debut.getTime() - avant.debut.getTime()) < 60000 && Math.abs(apres.fin.getTime() - avant.fin.getTime()) < 60000) continue
        mouvements.push({ genre: 'sport', nom: `Séance ${code}`, avant, apres })
    }
    if (!mouvements.length) return { mouvements: [], supprimer: [], creer: [] }
    const bouges = new Set(mouvements.map((m) => m.nom))
    const supprimer = aVenir.filter((t) => bouges.has(`Séance ${codeDeTache(t)}`))
    for (const p of props) {
        if (!bouges.has(`Séance ${p.seance.code}`)) continue
        creer.push({
            genre: 'sport',
            titre: titreSeance(p.seance),
            description: descriptionSeance(p),
            categorie_id: null,
            date_debut: p.depart.toISOString(),
            date_fin: p.retour.toISOString(),
            toute_la_journee: false,
            statut: 'a_faire',
            priorite: 'normale',
        })
    }
    return { mouvements, supprimer, creer }
}

async function semaineEtudes(lundi: Date, maintenant: Date): Promise<Replan> {
    const dimanche = new Date(lundi.getTime() + 7 * JOUR - 1)
    const finFenetre = new Date(dimanche.getTime() + 14 * JOUR)
    const [cours, taches] = await Promise.all([getCoursEntre(new Date(lundi.getTime() - 3 * JOUR), finFenetre), getTachesEntre(new Date(lundi.getTime() - 21 * JOUR), finFenetre)])
    const remplacees = taches.filter(
        (t) => t.description?.includes(MARQUEUR_ETUDE) && t.statut !== 'fait' && t.statut !== 'annule' && t.date_debut && new Date(t.date_debut) >= lundi && new Date(t.date_debut) <= dimanche && new Date(t.date_debut) > maintenant,
    )
    if (!remplacees.length) return { mouvements: [], supprimer: [], creer: [] }
    const r = lireReglagesEtudes()
    const gardees = taches.filter((t) => !remplacees.includes(t))
    const liste = echeances(cours, gardees, maintenant, finFenetre, r)
    const { blocs } = planifierEtudes(lundi, cours, gardees, liste, r, maintenant)
    const nouveaux = blocs.map((b) => ({ b, titre: titreBloc(b, r), description: descriptionBloc(b, r, cours) }))
    const mouvements: Mouvement[] = []
    const supprimer: Tache[] = []
    const creer: Replan['creer'] = []
    const vus = new Set<string>()
    for (const t of remplacees) {
        const cle = cleEtude(t)
        const n = nouveaux.find((x) => cleEtude(x) === cle)
        if (cle) vus.add(cle)
        const avant = plage(t)
        const apres = n ? { debut: n.b.debut, fin: n.b.fin } : undefined
        if (apres && Math.abs(apres.debut.getTime() - avant.debut.getTime()) < 60000 && Math.abs(apres.fin.getTime() - avant.fin.getTime()) < 60000) continue
        mouvements.push({ genre: 'etude', nom: nomEtude(t.titre), avant, apres })
        supprimer.push(t)
        if (n) creer.push(versTache(n))
    }
    // Nouvelles étapes qui trouvent de la place (ex. un jour sans cours libère du temps).
    for (const n of nouveaux) {
        const cle = cleEtude(n)
        if (cle && vus.has(cle)) continue
        mouvements.push({ genre: 'etude', nom: nomEtude(n.titre), apres: { debut: n.b.debut, fin: n.b.fin } })
        creer.push(versTache(n))
    }
    return { mouvements, supprimer, creer }

    function versTache(n: (typeof nouveaux)[number]): Replan['creer'][number] {
        return {
            genre: 'etude',
            titre: n.titre,
            description: n.description,
            categorie_id: null,
            date_debut: n.b.debut.toISOString(),
            date_fin: n.b.fin.toISOString(),
            toute_la_journee: false,
            statut: 'a_faire',
            priorite: n.b.echeance.type === 'ds' || n.b.echeance.type === 'soutenance' ? 'haute' : 'normale',
        }
    }
}

/** Ce qui changerait dans l'agenda entre `du` et `au` (AAAA-MM-JJ), sans rien enregistrer. */
export async function calculerReplan(du: string, au: string, maintenant = new Date()): Promise<Replan> {
    const res: Replan = { mouvements: [], supprimer: [], creer: [] }
    const fin = new Date(`${au}T23:59:59`)
    for (let lundi = debutDeSemaine(new Date(`${du}T12:00:00`)); lundi <= fin; lundi = new Date(lundi.getTime() + 7 * JOUR + 2 * 3600 * 1000)) {
        lundi = debutDeSemaine(lundi)
        const dimanche = new Date(lundi.getTime() + 7 * JOUR - 1)
        if (dimanche < maintenant) continue
        const [cours, taches] = await Promise.all([getCoursEntre(lundi, dimanche), getTachesEntre(lundi, dimanche)])
        for (const r of [await semaineSport(lundi, maintenant, cours, taches, du, au), await semaineEtudes(lundi, maintenant)]) {
            res.mouvements.push(...r.mouvements)
            res.supprimer.push(...r.supprimer)
            res.creer.push(...r.creer)
        }
    }
    res.mouvements.sort((a, b) => (a.avant ?? a.apres)!.debut.getTime() - (b.avant ?? b.apres)!.debut.getTime())
    return res
}

/** Enregistre la replanification : supprime les anciens créneaux et crée les nouveaux. */
export async function appliquerReplan(r: Replan): Promise<void> {
    const cats = await getCategories()
    const sport = cats.find((c) => c.nom.toLowerCase() === 'sport')?.id ?? null
    const etude = cats.find((c) => /cours|[ée]tude/i.test(c.nom))?.id ?? null
    for (const t of r.supprimer) await supprimerTache(t.id)
    for (const { genre, ...t } of r.creer) await creerTache({ ...t, categorie_id: genre === 'sport' ? sport : etude })
}

/** Phrase pour un mouvement : « l'heure optimale pour X a été déplacée à Y ». */
export function phraseMouvement(m: Mouvement): string {
    if (m.avant && m.apres) return `${m.nom} : ${quandTexte(m.avant)} → ${quandTexte(m.apres)}`
    if (m.avant) return `${m.nom} : ${quandTexte(m.avant)} → retirée (plus de place adaptée cette semaine)`
    return `${m.nom} : nouveau créneau ${quandTexte(m.apres!)}`
}
