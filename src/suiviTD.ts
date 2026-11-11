// Avancement des TD : après chaque TD, Daniel note jusqu'à quel exo il est arrivé (et ce qu'il a compris).
// Ça sert à : 1) finir les exos restants avant le TD suivant (révision « Préparer le TD »),
// 2) prévoir jusqu'où la classe sera arrivée au DS, 3) refaire en priorité les exos « à revoir » avant le DS.
// Synchronisé entre appareils via le webhook /revisions (clé « prog:avancement-td », table cours_donnees).
import type { Cours } from './api'
import { cleDuType, nomModule } from './coursType'

export type EtatExo = 'fait' | 'revoir'
export type InfoTD = { total?: number; exos: Record<string, EtatExo> }
export type SeanceTD = { cle: string; date: string; td: number; jusqua: number }
export type SuiviMatiere = { nom: string; tds: Record<string, InfoTD>; seances: SeanceTD[] }
export type Avancement = { v: 1; updatedAt: number; matieres: Record<string, SuiviMatiere>; ignores: string[] }

const CLE_LOCALE = 'td.avancement'
const CLE_EN_LIGNE = 'prog:avancement-td'
const API = 'https://n8n-production-bdf5.up.railway.app/webhook/revisions'
const JOUR = 24 * 3600 * 1000
/** Nombre d'exos supposé pour un TD dont on ne connaît pas encore le total. */
const EXOS_PAR_DEFAUT = 5

const vide = (): Avancement => ({ v: 1, updatedAt: 0, matieres: {}, ignores: [] })

export const cleMatiere = (nom: string) =>
    nom
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')

/** Matières sans exercices de TD (langues, communication). */
export const sansExos = (matiere: string) => /anglais|communication|ppp/i.test(matiere)

// ---------- Lecture / écriture ----------

let cache: Avancement | null = null
const abonnes = new Set<() => void>()

export function lireAvancement(): Avancement {
    if (cache) return cache
    try {
        const brut = localStorage.getItem(CLE_LOCALE)
        cache = brut ? { ...vide(), ...(JSON.parse(brut) as Avancement) } : vide()
    } catch {
        cache = vide()
    }
    return cache
}

function enregistrerLocal(a: Avancement) {
    cache = a
    try {
        localStorage.setItem(CLE_LOCALE, JSON.stringify(a))
    } catch {
        // stockage indisponible
    }
    abonnes.forEach((f) => f())
}

let minuteur: number | undefined
function envoyer(a: Avancement) {
    window.clearTimeout(minuteur)
    minuteur = window.setTimeout(() => {
        fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'ecrire', cle: CLE_EN_LIGNE, data: a }) }).catch(() => {
            // hors ligne : ce sera renvoyé à la prochaine synchro (la version locale est plus récente)
        })
    }, 600)
}

export function modifierAvancement(f: (a: Avancement) => Avancement): void {
    const a = { ...f(structuredClone(lireAvancement())), updatedAt: Date.now() }
    enregistrerLocal(a)
    envoyer(a)
}

export function abonnerAvancement(f: () => void): () => void {
    abonnes.add(f)
    return () => {
        abonnes.delete(f)
    }
}

let synchroEnCours: Promise<void> | null = null
/** Récupère la version en ligne (la plus récente gagne), ou envoie la version locale si elle est plus récente. */
export function synchroniserAvancement(): Promise<void> {
    synchroEnCours ??= fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'etat' }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { elements?: { cle: string; data: Avancement }[] } | null) => {
            const enLigne = d?.elements?.find((e) => e.cle === CLE_EN_LIGNE)?.data
            const local = lireAvancement()
            if (enLigne && (enLigne.updatedAt || 0) > (local.updatedAt || 0)) enregistrerLocal({ ...vide(), ...enLigne })
            else if (local.updatedAt && (!enLigne || local.updatedAt > (enLigne.updatedAt || 0))) envoyer(local)
        })
        .catch(() => {})
        .finally(() => {
            synchroEnCours = null
        })
    return synchroEnCours
}

// ---------- Position, exos restants et à revoir ----------

export type Position = { td: number; jusqua: number; total?: number }

/** Dernière position notée (TD et dernier exo fini). */
export function positionDe(s: SuiviMatiere | undefined): Position | null {
    if (!s || s.seances.length === 0) return null
    const der = [...s.seances].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!
    return { td: der.td, jusqua: der.jusqua, total: s.tds[der.td]?.total }
}

/** Le TD et l'exo à proposer pour la prochaine séance. */
export function suggestion(s: SuiviMatiere | undefined): { td: number; depuis: number } {
    const p = positionDe(s)
    if (!p) return { td: 1, depuis: 0 }
    if (p.total && p.jusqua >= p.total) return { td: p.td + 1, depuis: 0 }
    return { td: p.td, depuis: p.jusqua }
}

const nomExo = (td: number, exo: number) => `TD ${td} ex. ${exo}`

function regrouper(liste: [number, number][]): string {
    // [[2,4],[2,5],[3,1]] → « TD 2 ex. 4-5 · TD 3 ex. 1 »
    const parTd = new Map<number, number[]>()
    for (const [td, exo] of liste) parTd.set(td, [...(parTd.get(td) || []), exo])
    return [...parTd.entries()]
        .map(([td, exos]) => {
            const tri = [...new Set(exos)].sort((a, b) => a - b)
            const suite = tri.length > 1 && tri.every((x, i) => i === 0 || x === tri[i - 1] + 1)
            return `TD ${td} ex. ${suite ? `${tri[0]}-${tri.at(-1)}` : tri.join(', ')}`
        })
        .join(' · ')
}

/** Exos des TD déjà commencés qui ne sont pas encore faits (à finir avant le TD suivant). */
export function exosRestants(s: SuiviMatiere | undefined): [number, number][] {
    const p = positionDe(s)
    if (!s || !p) return []
    const res: [number, number][] = []
    for (let td = 1; td <= p.td; td++) {
        const info = s.tds[td]
        if (!info) continue
        const connus = Object.keys(info.exos).map(Number)
        const total = info.total ?? (td === p.td ? 0 : Math.max(0, ...connus))
        for (let e = 1; e <= total; e++) if (!info.exos[e]) res.push([td, e])
    }
    return res
}

export function exosARevoir(s: SuiviMatiere | undefined): [number, number][] {
    if (!s) return []
    const res: [number, number][] = []
    for (const [td, info] of Object.entries(s.tds)) for (const [e, etat] of Object.entries(info.exos)) if (etat === 'revoir') res.push([Number(td), Number(e)])
    return res.sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

export const texteExos = regrouper

export function trouverMatiere(a: Avancement, matiere: string): SuiviMatiere | undefined {
    const k = cleMatiere(matiere)
    if (a.matieres[k]) return a.matieres[k]
    // DS « Régulation des installations » ↔ TD « Régulation » : on accepte une inclusion.
    return Object.entries(a.matieres).find(([cle]) => cle.length > 3 && (k.includes(cle) || cle.includes(k)))?.[1]
}

// ---------- Rythme et prévision pour le DS ----------

function totalTd(s: SuiviMatiere, td: number): number {
    const info = s.tds[td]
    if (info?.total) return info.total
    const connus = Object.values(s.tds).map((i) => i.total).filter((x): x is number => !!x)
    const moyenne = connus.length ? Math.round(connus.reduce((a, b) => a + b, 0) / connus.length) : EXOS_PAR_DEFAUT
    return Math.max(moyenne, ...Object.keys(info?.exos || {}).map(Number))
}

const indice = (s: SuiviMatiere, td: number, exo: number) => {
    let n = 0
    for (let t = 1; t < td; t++) n += totalTd(s, t)
    return n + exo
}

function depuisIndice(s: SuiviMatiere, n: number): { td: number; exo: number } {
    let td = 1
    while (n > totalTd(s, td) && td < 50) {
        n -= totalTd(s, td)
        td++
    }
    return { td, exo: Math.max(1, Math.round(n)) }
}

/** Exos faits par séance de TD (à partir de 2 séances notées). */
export function rythme(s: SuiviMatiere | undefined): number | null {
    if (!s) return null
    const seances = [...s.seances].sort((a, b) => a.date.localeCompare(b.date))
    if (seances.length < 2) return null
    const premier = seances[0]
    const dernier = seances.at(-1)!
    // Avant la 1re séance notée, on suppose qu'elle commençait au début de son TD.
    const debut = indice(s, premier.td, 0)
    const fin = indice(s, dernier.td, dernier.jusqua)
    return Math.max(0.5, (fin - debut) / seances.length)
}

export type Prevision = { td: number; exo: number; seances: number; rythme: number }

/** Où la classe devrait en être au DS, d'après le rythme et le nombre de TD d'ici là. */
export function prevoirDS(s: SuiviMatiere | undefined, dateDS: Date, cours: Cours[], maintenant = new Date()): Prevision | null {
    const r = rythme(s)
    const p = positionDe(s)
    if (!s || !r || !p) return null
    const k = cleMatiere(s.nom)
    const seances = cours.filter((c) => {
        if (cleDuType(c.type) !== 'td') return false
        const d = new Date(c.date_debut)
        const m = cleMatiere(nomModule(c.titre))
        return d > maintenant && d < dateDS && (m === k || m.includes(k) || k.includes(m))
    }).length
    const fin = depuisIndice(s, indice(s, p.td, p.jusqua) + r * seances)
    return { ...fin, seances, rythme: Math.round(r * 10) / 10 }
}

// ---------- Questions après un TD ----------

export type Question = { cle: string; matiere: string; cleMat: string; fin: Date; coursIds: string[] }

/** TD terminés (7 derniers jours) sans réponse : seulement le plus récent de chaque matière. */
export function questionsEnAttente(cours: Cours[], a: Avancement, maintenant = new Date()): Question[] {
    const parSeance = new Map<string, Question>()
    for (const c of cours) {
        if (cleDuType(c.type) !== 'td') continue
        const fin = new Date(c.date_fin)
        if (fin > maintenant || maintenant.getTime() - fin.getTime() > 7 * JOUR) continue
        const matiere = nomModule(c.titre)
        if (sansExos(matiere)) continue
        const cleMat = cleMatiere(matiere)
        const cle = `${cleMat}|${fin.toISOString().slice(0, 10)}`
        const q = parSeance.get(cle)
        if (q) {
            q.coursIds.push(c.id)
            if (fin > q.fin) q.fin = fin
        } else parSeance.set(cle, { cle, matiere, cleMat, fin, coursIds: [c.id] })
    }
    const repondues = new Set([...a.ignores, ...Object.values(a.matieres).flatMap((m) => m.seances.map((s) => s.cle))])
    const plusRecente = new Map<string, Question>()
    for (const q of parSeance.values()) {
        const derniere = a.matieres[q.cleMat]?.seances.map((s) => s.date).sort().at(-1)
        if (repondues.has(q.cle) || (derniere && derniere >= q.fin.toISOString())) continue
        const deja = plusRecente.get(q.cleMat)
        if (!deja || q.fin > deja.fin) plusRecente.set(q.cleMat, q)
    }
    return [...plusRecente.values()].sort((x, y) => y.fin.getTime() - x.fin.getTime())
}

export type Reponse = { td: number; jusqua: number; total?: number; aRevoir: number[]; depuis: number }

export function repondre(q: Question, r: Reponse): void {
    modifierAvancement((a) => {
        const m: SuiviMatiere = a.matieres[q.cleMat] ?? { nom: q.matiere, tds: {}, seances: [] }
        const info: InfoTD = m.tds[r.td] ?? { exos: {} }
        if (r.total) info.total = r.total
        for (let e = 1; e <= r.jusqua; e++) {
            if (r.aRevoir.includes(e)) info.exos[e] = 'revoir'
            else if (e > r.depuis || !info.exos[e]) info.exos[e] = 'fait'
        }
        m.tds[r.td] = info
        m.seances = [...m.seances.filter((s) => s.cle !== q.cle), { cle: q.cle, date: q.fin.toISOString(), td: r.td, jusqua: r.jusqua }].slice(-60)
        a.matieres[q.cleMat] = m
        return a
    })
}

export function ignorer(q: Question): void {
    modifierAvancement((a) => ({ ...a, ignores: [...a.ignores, q.cle].slice(-80) }))
}

/** Exo coché à la maison : pas fait → fait → à revoir → pas fait. */
export function basculerExo(cleMat: string, td: number, exo: number): void {
    modifierAvancement((a) => {
        const info = a.matieres[cleMat]?.tds[td]
        if (!info) return a
        const etat = info.exos[exo]
        if (!etat) info.exos[exo] = 'fait'
        else if (etat === 'fait') info.exos[exo] = 'revoir'
        else delete info.exos[exo]
        return a
    })
}

export function changerTotal(cleMat: string, td: number, total: number | undefined): void {
    modifierAvancement((a) => {
        const m = a.matieres[cleMat]
        if (!m) return a
        m.tds[td] = { ...(m.tds[td] ?? { exos: {} }), total }
        return a
    })
}

// ---------- Pour les révisions planifiées (etudes.ts) ----------

/** Consignes « avancement » pour la préparation du TD de demain. */
export function consignesTD(matiere: string): string[] {
    const s = trouverMatiere(lireAvancement(), matiere)
    if (!s) return []
    const restants = exosRestants(s)
    const revoir = exosARevoir(s)
    const p = positionDe(s)
    const res: string[] = []
    if (restants.length) res.push(`Finis les exos pas terminés en TD : ${regrouper(restants.slice(0, 6))}`)
    if (revoir.length) res.push(`Refais un exo « à revoir » : ${nomExo(...revoir[0])}`)
    if (p) res.push(`Tu en étais à : ${nomExo(p.td, p.jusqua)}${p.total ? ` (sur ${p.total})` : ''}`)
    return res
}

/** Consignes « avancement » pour un DS (étape Réviser ou Appliquer). */
export function consignesDS(matiere: string, etape: number, prevision: Prevision | null): string[] {
    const s = trouverMatiere(lireAvancement(), matiere)
    if (!s) return []
    const p = positionDe(s)
    const revoir = exosARevoir(s)
    const res: string[] = []
    if (etape === 0 && (prevision || p)) {
        const jusqua = prevision ? `TD ${prevision.td} ex. ${prevision.exo} (prévu)` : `TD ${p!.td} ex. ${p!.jusqua}`
        res.push(`Programme probable du DS : du TD 1 jusqu’au ${jusqua}`)
    }
    if (etape === 1 && revoir.length) res.push(`Commence par tes exos « à revoir » : ${regrouper(revoir.slice(0, 8))}`)
    return res
}

/** Résumé pour l'assistant IA. */
export function resumeAvancement(): string {
    const a = lireAvancement()
    const lignes = Object.values(a.matieres).map((m) => {
        const p = positionDe(m)
        const restants = exosRestants(m)
        const revoir = exosARevoir(m)
        return `- ${m.nom} : ${p ? `${nomExo(p.td, p.jusqua)}${p.total ? `/${p.total}` : ''}` : 'rien noté'}${restants.length ? ` · à finir : ${regrouper(restants)}` : ''}${revoir.length ? ` · à revoir : ${regrouper(revoir)}` : ''}`
    })
    return lignes.length ? `Avancement des TD :\n${lignes.join('\n')}` : ''
}
