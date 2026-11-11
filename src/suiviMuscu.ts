// Suivi muscu : cache sur l'appareil, file d'attente hors ligne, et conseils de progression.
import { envoyerMuscu, type EtatMuscu, type ExoFait, type Ressenti, type SeanceFaite } from './api'
import { TOUS_LES_EXERCICES, type CodeSeance, type Exercice, type NiveauxChoisis } from './programme'

export const RESSENTIS: Record<Ressenti, { emoji: string; libelle: string }> = {
    dur: { emoji: '🥵', libelle: 'Dur' },
    bien: { emoji: '👍', libelle: 'Bien' },
    facile: { emoji: '😎', libelle: 'Facile' },
}

export const PAS_KG = 2.5

function lire<T>(cle: string, defaut: T): T {
    try {
        const brut = localStorage.getItem(cle)
        return brut ? (JSON.parse(brut) as T) : defaut
    } catch {
        return defaut
    }
}
function ecrire(cle: string, valeur: unknown): void {
    try {
        localStorage.setItem(cle, JSON.stringify(valeur))
    } catch {
        // stockage indisponible
    }
}

const EXERCICES: Record<string, Exercice> = Object.fromEntries(TOUS_LES_EXERCICES.map((e) => [e.id, e]))
export const exerciceParId = (id: string): Exercice | undefined => EXERCICES[id] ?? exercicePerso(id)
export const avecCharge = (e: Exercice) => e.charge !== false && ['machine', 'poulie', 'halteres', 'barre'].includes(e.materiel)

/** Unité de ce qu'on note pour l'exercice (null : rien à noter). */
export function uniteDe(e: Exercice): string | null {
    if (avecCharge(e)) return e.parHaltere ? 'kg/haltère' : e.assistance ? 'kg aide' : 'kg'
    if (e.mesure === 'km') return 'km'
    if (e.mesure === 'reps') return 'reps'
    if (e.mesure === 'sec') return 's'
    return null
}
/** Unité courte pour l'historique (« 12 kg », « 8 reps », « 20 s »). */
export const uniteCourte = (e: Exercice | undefined) => (!e ? '' : e.mesure === 'km' ? 'km' : e.mesure === 'reps' ? 'reps' : e.mesure === 'sec' ? 's' : 'kg')

// --- Exercices ajoutés par Daniel pendant une séance (hors programme) ---
// L'id « perso-nom-de-l-exo » part avec la séance ; le nom exact et l'unité restent sur l'appareil.

export type MesurePerso = 'kg' | 'reps' | 'sec' | 'km' | 'aucune'
type InfoPerso = { nom: string; mesure: MesurePerso }
const CLE_PERSO = 'muscu.nomsPerso'

export function idPerso(nom: string): string {
    const slug = nom
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 34)
        .replace(/-+$/, '')
    return `perso-${slug || 'exercice'}`
}

export function exercicePerso(id: string, info?: InfoPerso): Exercice | undefined {
    if (!id.startsWith('perso-')) return undefined
    const i = info ?? lire<Record<string, InfoPerso>>(CLE_PERSO, {})[id]
    const nomSlug = id.slice(6).replace(/-/g, ' ')
    const mesure = i?.mesure ?? 'aucune'
    return {
        id,
        nom: i?.nom ?? nomSlug.charAt(0).toUpperCase() + nomSlug.slice(1),
        machine: 'Ajouté pendant la séance',
        materiel: mesure === 'kg' ? 'halteres' : mesure === 'km' ? 'cardio' : 'corps',
        muscles: [],
        series: 3,
        reps: '',
        consignes: [],
        ...(mesure === 'kg' ? {} : { charge: false }),
        ...(mesure === 'reps' || mesure === 'sec' || mesure === 'km' ? { mesure } : {}),
    }
}

export function retenirPerso(id: string, nom: string, mesure: MesurePerso): void {
    ecrire(CLE_PERSO, { ...lire<Record<string, InfoPerso>>(CLE_PERSO, {}), [id]: { nom, mesure } })
}

export function versKg(v: string | number | null | undefined): number | null {
    const n = Math.round(Number(String(v ?? '').replace(',', '.')) * 2) / 2
    return Number.isFinite(n) && n > 0 ? n : null
}

// --- Cache local (affichage immédiat, et secours hors ligne) ---

export function lireCache(): EtatMuscu {
    const charges = lire<Record<string, string | number>>('muscu.charges', {})
    const propres: Record<string, number> = {}
    for (const [id, v] of Object.entries(charges)) {
        const kg = versKg(v)
        if (kg !== null) propres[id] = kg
    }
    return { charges: propres, seances: lire<SeanceFaite[]>('muscu.seances', []) }
}

export function ecrireCache(etat: EtatMuscu): void {
    ecrire('muscu.charges', etat.charges)
    ecrire('muscu.seances', etat.seances.slice(0, 80))
}

// --- File d'attente : ce qui n'a pas pu partir (pas de réseau) ---

type Attente = { charges: Record<string, number | null>; seances: Omit<SeanceFaite, 'id'>[] }
const lireAttente = () => lire<Attente>('muscu.attente', { charges: {}, seances: [] })

export function mettreEnAttente(a: Partial<Attente>): void {
    const actuelle = lireAttente()
    ecrire('muscu.attente', {
        charges: { ...actuelle.charges, ...a.charges },
        seances: [...actuelle.seances, ...(a.seances || [])],
    })
}

// --- Synchronisation au chargement ---

/** Envoie ce qui attendait, reprend les anciennes données de l'appareil si rien n'est en ligne, puis renvoie l'état serveur. */
export async function synchroniser(): Promise<EtatMuscu> {
    const attente = lireAttente()
    for (const s of attente.seances) {
        await envoyerMuscu({ action: 'seance', code: s.code, date: s.date, exercices: s.exercices, charges: {} })
    }
    for (const [id, kg] of Object.entries(attente.charges)) {
        await envoyerMuscu({ action: 'charge', id, kg })
    }
    ecrire('muscu.attente', { charges: {}, seances: [] })

    let etat = await envoyerMuscu({ action: 'etat' })
    if (Object.keys(etat.charges).length === 0 && etat.seances.length === 0) {
        // Première fois : on envoie ce qui était gardé seulement sur cet appareil.
        const cache = lireCache()
        const anciennes = lire<{ date: string; code: CodeSeance }[]>('muscu.historique', [])
        const seances = [
            ...cache.seances.map(({ code, date, exercices }) => ({ code, date, exercices })),
            ...anciennes.map(({ code, date }) => ({ code, date, exercices: [] as ExoFait[] })),
        ]
        if (Object.keys(cache.charges).length || seances.length) {
            etat = await envoyerMuscu({ action: 'import', charges: cache.charges, seances })
        }
    }
    ecrireCache(etat)
    return etat
}

// --- Conseils de progression ---

export type Conseil = { sens: 'monte' | 'descend' | 'garde'; texte: string; kg?: number }

/** Résultats passés d'un exercice, du plus récent au plus ancien. */
export function passesDe(id: string, seances: SeanceFaite[]): (ExoFait & { date: string })[] {
    return seances.flatMap((s) => s.exercices.filter((e) => e.id === id).map((e) => ({ ...e, date: s.date })))
}

const complet = (e: ExoFait) => e.total > 0 && e.faites >= e.total

export function conseilPour(e: Exercice, passes: ExoFait[], chargeActuelle: number | null): Conseil | null {
    const [dernier, avant] = passes
    if (!dernier) return null
    if (avecCharge(e)) {
        const base = dernier.kg ?? chargeActuelle
        if (base === null) return null
        const deuxReussies = avant && complet(avant) && avant.ressenti !== 'dur' && avant.kg === dernier.kg && dernier.ressenti !== 'dur'
        // Machine d'assistance (tractions) : progresser = enlever des kg.
        const pas = e.assistance ? -PAS_KG : PAS_KG
        const unite = e.parHaltere ? ' kg par haltère' : e.assistance ? ' kg d’assistance' : ' kg'
        if (complet(dernier) && (dernier.ressenti === 'facile' || deuxReussies) && base + pas > 0) {
            const kg = base + pas
            return { sens: 'monte', kg, texte: `Passe à ${fmtKg(kg)}${unite}` }
        }
        if (!complet(dernier) && dernier.ressenti === 'dur' && avant && !complet(avant) && avant.ressenti === 'dur' && base - pas > 0) {
            const kg = base - pas
            return { sens: 'descend', kg, texte: `${e.assistance ? 'Remets' : 'Redescends à'} ${fmtKg(kg)}${unite}` }
        }
        return { sens: 'garde', texte: `Garde ${fmtKg(base)}${unite}` }
    }
    if (complet(dernier) && dernier.ressenti === 'facile') {
        if (e.mesure === 'sec') return { sens: 'monte', texte: '+2 à 3 s par tenue la prochaine fois' }
        if (e.mesure === 'reps') return { sens: 'monte', texte: '+1 rep par série la prochaine fois' }
        if (e.materiel === 'cardio') return { sens: 'monte', texte: '+0,5 km/h sur la course la prochaine fois' }
        if (e.materiel === 'elastique') return { sens: 'monte', texte: 'Élastique plus dur, ou +2 reps' }
        return { sens: 'monte', texte: '+2 reps par série' }
    }
    return null
}

export const fmtKg = (kg: number) => String(kg).replace('.', ',')

// --- Niveaux des séances (choisis par Daniel, synchronisés via les « charges » niveau-a, niveau-b…) ---

export const cleNiveau = (code: CodeSeance) => `niveau-${code.toLowerCase()}`

/** Reprend les niveaux enregistrés en ligne (s'ils existent) dans les niveaux de l'appareil. */
export function niveauxDepuis(charges: Record<string, number>, locaux: NiveauxChoisis): NiveauxChoisis {
    const res: NiveauxChoisis = { ...locaux }
    for (const code of ['A', 'B', 'C', 'D'] as CodeSeance[]) {
        const n = charges[cleNiveau(code)]
        if (n && n !== locaux[code]?.n) res[code] = { n: Math.round(n), depuis: locaux[code]?.depuis }
    }
    return res
}

export type AvisNiveau = { sens: 'monte' | 'descend'; texte: string }

/** Après 2 séances du même niveau : prêt à monter (tout fait, souvent facile) ou trop dur ? */
export function avisNiveau(
    code: CodeSeance,
    niveau: number,
    nbNiveaux: number,
    depuis: string | undefined,
    seances: SeanceFaite[],
    ids: string[] = [],
): AvisNiveau | null {
    // Seulement les séances faites avec les exercices du niveau actuel.
    const recentes = seancesAuNiveau(code, depuis, ids, seances).slice(0, 2)
    if (recentes.length < 2) return null
    const exos = recentes.flatMap((s) => s.exercices)
    const tousFaits = exos.every(complet)
    const faciles = exos.filter((e) => e.ressenti === 'facile').length
    const durs = exos.filter((e) => e.ressenti === 'dur').length
    if (niveau < nbNiveaux && tousFaits && durs === 0 && faciles >= exos.length / 2)
        return { sens: 'monte', texte: `Tes 2 dernières séances étaient faciles : tu es prêt pour le niveau ${niveau + 1}.` }
    if (niveau > 1 && durs > exos.length / 2)
        return { sens: 'descend', texte: `Tes 2 dernières séances étaient dures : le niveau ${niveau - 1} peut t’aider à consolider.` }
    return null
}

/** Séances faites au niveau actuel (depuis le dernier changement, avec les exercices de ce niveau). */
export function seancesAuNiveau(code: CodeSeance, depuis: string | undefined, ids: string[], seances: SeanceFaite[]): SeanceFaite[] {
    return seances
        .filter((s) => s.code === code && s.exercices.length > 0 && (!depuis || s.date >= depuis))
        // Les exercices ajoutés en plus ne comptent pas : il faut surtout ceux du niveau.
        .filter((s) => {
            if (ids.length === 0) return true
            const prevus = s.exercices.filter((e) => ids.includes(e.id)).length
            return prevus > 0 && prevus * 2 >= s.exercices.length
        })
}

// --- Défis réussis (objectifs pour passer au niveau suivant) ---
// Gardés sur l'appareil avec la date, et synchronisés comme une « charge » defi-c1, defi-a2… = 1.

export type DefisReussis = Record<string, string> // clé → date ISO (ou '' si la date est inconnue)
// Depuis le passage à la callisthénie (nov. 2026), les défis de A, B et D ont changé : nouvelles clés « defi-a1k ».
export const cleDefi = (code: CodeSeance, niveau: number) => `defi-${code.toLowerCase()}${niveau}${code === 'C' ? '' : 'k'}`

export function lireDefis(): DefisReussis {
    return lire<DefisReussis>('muscu.defis', {})
}
export function ecrireDefis(d: DefisReussis): void {
    ecrire('muscu.defis', d)
}
/** Ajoute les défis enregistrés en ligne à ceux de l'appareil. */
export function defisDepuis(charges: Record<string, number>, locaux: DefisReussis): DefisReussis {
    const res = { ...locaux }
    for (const [id, v] of Object.entries(charges)) if ((id.startsWith('defi-') || id.startsWith('fig-')) && v > 0 && !(id in res)) res[id] = ''
    return res
}

/** Étape réussie d'une figure de callisthénie : « fig-muscle-up-2 ». */
export const cleFigure = (id: string, etape: number) => `fig-${id}-${etape}`

