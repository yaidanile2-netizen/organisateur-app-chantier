// Avancement des TD : après chaque TD, Daniel note jusqu'à quel exo il est arrivé (et ce qu'il a compris).
// Ça sert à : 1) finir les exos restants avant le TD suivant (révision « Préparer le TD »),
// 2) prévoir jusqu'où la classe sera arrivée au DS, 3) refaire en priorité les exos « à revoir » avant le DS.
// Synchronisé entre appareils via le webhook /revisions (clé « prog:avancement-td », table cours_donnees).
import type { Cours } from './api'
import { cleDuType, nomModule } from './coursType'

/** fait = fait en classe (ou à la maison) · compris = fait et bien compris · revoir = pas bien compris */
export type EtatExo = 'fait' | 'compris' | 'revoir'
/** importants : exos que Daniel signale comme importants (à refaire en priorité avant le DS). */
export type InfoTD = { total?: number; exos: Record<string, EtatExo>; importants?: Record<string, true> }

export const ETATS_EXO: Record<EtatExo, { icone: string; libelle: string }> = {
    fait: { icone: '✏️', libelle: 'fait' },
    compris: { icone: '💡', libelle: 'compris' },
    revoir: { icone: '🔁', libelle: 'à revoir' },
}
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

/** Exos signalés importants (⭐), dans l'ordre. */
export function exosImportants(s: SuiviMatiere | undefined): [number, number][] {
    if (!s) return []
    const res: [number, number][] = []
    for (const [td, info] of Object.entries(s.tds)) for (const e of Object.keys(info.importants ?? {})) res.push([Number(td), Number(e)])
    return res.sort((a, b) => a[0] - b[0] || a[1] - b[1])
}

export const texteExos = regrouper

// ---------- Noms de matières « proches » ----------
// Les noms n'ont pas besoin d'être exactement ceux de l'emploi du temps : « Régulation » ↔ « Régulation
// des installations », « Thermo » ↔ « Thermodynamique », « Réseaux hydro » ↔ « Réseaux hydro. & aéro. »,
// une faute ou un pluriel près, ou le même code de module (R3.08).

const MOTS_VIDES = new Set(['de', 'des', 'du', 'la', 'le', 'les', 'et', 'en', 'aux', 'au', 'un', 'une', 'pour', 'sur', 'dans', 'avec', 'cours', 'td', 'tp', 'ds', 'cm', 'semestre', 'module'])

const codesDe = (t: string) => [...t.matchAll(/\b([rs]\d)\s*[.,]?\s*(\d{2})\b/gi)].map((m) => (m[1] + m[2]).toLowerCase())
const motsDe = (t: string) => cleMatiere(t.replace(/\b[rs]\d\s*[.,]?\s*\d{2}\b/gi, ' ')).split('-').filter((w) => w.length >= 3 && !MOTS_VIDES.has(w) && !/^\d+$/.test(w))

function distance(a: string, b: string): number {
    const d = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
        let prec = d[0]
        d[0] = i
        for (let j = 1; j <= b.length; j++) {
            const t = d[j]
            d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1))
            prec = t
        }
    }
    return d[b.length]
}

function motsProches(a: string, b: string): boolean {
    if (a === b) return true
    let p = 0
    while (p < a.length && p < b.length && a[p] === b[p]) p++
    if (p >= 4 && p >= Math.min(a.length, b.length) - 1) return true // abréviation : « thermo », « clim », « maths »
    return Math.min(a.length, b.length) >= 5 && distance(a, b) <= (Math.min(a.length, b.length) >= 8 ? 2 : 1) // faute, pluriel
}

/** Ressemblance entre deux noms de matière, de 0 à 1 (1 = même code de module ou tous les mots retrouvés). */
export function similarite(x: string, y: string): number {
    const cx = codesDe(x)
    if (cx.length && codesDe(y).some((c) => cx.includes(c))) return 1
    const a = motsDe(x)
    const b = motsDe(y)
    if (!a.length || !b.length) return 0
    const [petit, grand] = a.length <= b.length ? [a, b] : [b, a]
    return petit.filter((w) => grand.some((v) => motsProches(w, v))).length / petit.length
}

/** Même matière ? (au moins les deux tiers des mots du nom le plus court retrouvés) */
export const memeMatiere = (x: string, y: string) => similarite(x, y) >= 0.66

export function trouverMatiere(a: Avancement, matiere: string): SuiviMatiere | undefined {
    const k = cleMatiere(matiere)
    if (a.matieres[k]) return a.matieres[k]
    let meilleur: SuiviMatiere | undefined
    let score = 0.66
    for (const m of Object.values(a.matieres)) {
        const sc = similarite(matiere, m.nom)
        if (sc >= score) {
            score = sc + 1e-9
            meilleur = m
        }
    }
    return meilleur
}

/** Prochain DS de la matière dans l'emploi du temps. */
export function prochainDS(cours: Cours[], s: SuiviMatiere, maintenant = new Date()): Date | null {
    const ds = cours
        .filter((c) => cleDuType(c.type) === 'ds' && new Date(c.date_debut) > maintenant && memeMatiere(nomModule(c.titre), s.nom))
        .map((c) => new Date(c.date_debut))
        .sort((x, y) => x.getTime() - y.getTime())
    return ds[0] ?? null
}

/** Pour l'onglet Cours : où la classe devrait en être au prochain DS de chaque matière. */
export function previsionsDS(cours: Cours[], maintenant = new Date()): Record<string, { td: number; exo: number; date: string }> {
    const res: Record<string, { td: number; exo: number; date: string }> = {}
    for (const [cle, s] of Object.entries(lireAvancement().matieres)) {
        const ds = prochainDS(cours, s, maintenant)
        const p = ds ? prevoirDS(s, ds, cours, maintenant) : null
        if (ds && p) res[cle] = { td: p.td, exo: p.exo, date: ds.toISOString() }
    }
    return res
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
    const seances = cours.filter((c) => {
        if (cleDuType(c.type) !== 'td') return false
        const d = new Date(c.date_debut)
        return d > maintenant && d < dateDS && memeMatiere(nomModule(c.titre), s.nom)
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

/** etats / importants : pour les exos faits pendant la séance (après `depuis`). */
export type Reponse = { td: number; jusqua: number; total?: number; depuis: number; etats: Record<number, EtatExo>; importants: number[] }

export function repondre(q: Question, r: Reponse): void {
    modifierAvancement((a) => {
        const m: SuiviMatiere = a.matieres[q.cleMat] ?? { nom: q.matiere, tds: {}, seances: [] }
        const info: InfoTD = m.tds[r.td] ?? { exos: {} }
        if (r.total) info.total = r.total
        const importants = { ...info.importants }
        for (let e = 1; e <= r.jusqua; e++) {
            if (e > r.depuis) {
                info.exos[e] = r.etats[e] ?? 'fait'
                if (r.importants.includes(e)) importants[e] = true
                else delete importants[e]
            } else if (!info.exos[e]) info.exos[e] = 'fait'
        }
        info.importants = importants
        m.tds[r.td] = info
        m.seances = [...m.seances.filter((s) => s.cle !== q.cle), { cle: q.cle, date: q.fin.toISOString(), td: r.td, jusqua: r.jusqua }].slice(-60)
        a.matieres[q.cleMat] = m
        return a
    })
}

export function ignorer(q: Question): void {
    modifierAvancement((a) => ({ ...a, ignores: [...a.ignores, q.cle].slice(-80) }))
}

/** État d'un exo changé depuis le suivi (null = pas fait). */
export function definirExo(cleMat: string, td: number, exo: number, etat: EtatExo | null): void {
    modifierAvancement((a) => {
        const info = a.matieres[cleMat]?.tds[td]
        if (!info) return a
        if (etat) info.exos[exo] = etat
        else delete info.exos[exo]
        return a
    })
}

/** Exo important (⭐) ou non. */
export function basculerImportant(cleMat: string, td: number, exo: number): void {
    modifierAvancement((a) => {
        const info = a.matieres[cleMat]?.tds[td]
        if (!info) return a
        const imp = { ...info.importants }
        if (imp[exo]) delete imp[exo]
        else imp[exo] = true
        info.importants = imp
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
    const importants = exosImportants(s).filter(([td, e]) => !revoir.some(([t2, e2]) => t2 === td && e2 === e))
    if (importants.length) res.push(`Relis un exo important ⭐ : ${nomExo(...importants[importants.length - 1])}`)
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
    const importants = exosImportants(s)
    if (etape === 0 && importants.length) res.push(`Exos importants ⭐ signalés en TD : ${regrouper(importants.slice(0, 8))}`)
    // Cours à revoir et à laisser : calculés par l'onglet Cours d'après les TD (si la matière y a été ouverte).
    const cle = Object.entries(lireAvancement().matieres).find(([, m]) => m === s)?.[0]
    const plan = cle ? lireJSON<Record<string, PlanCours>>('cours.ds', {})[cle] : undefined
    if (plan && etape <= 1) {
        if (plan.prio.length) res.push(`Cours à revoir en priorité : ${plan.prio.slice(0, 5).join(', ')}`)
        if (etape === 0 && plan.voir.length) res.push(`Chapitres du DS : ${plan.voir.join(', ')}`)
        if (etape === 0 && plan.laisser.length) res.push(`Pas besoin pour ce DS (pas encore vu en TD) : ${plan.laisser.join(', ')}`)
    } else if (etape === 0) res.push('Onglet Cours → DS : la liste des cours à revoir et de ceux à laisser, d’après tes TD')
    if (etape === 1 && revoir.length) res.push(`Commence par tes exos « à revoir » : ${regrouper(revoir.slice(0, 8))}`)
    if (etape === 1 && importants.length) res.push(`Puis refais les exos importants ⭐ : ${regrouper(importants.slice(0, 8))}`)
    return res
}

type PlanCours = { sujet: string; T: number; prio: string[]; voir: string[]; laisser: string[]; at: number }

function lireJSON<T>(cle: string, defaut: T): T {
    try {
        const brut = localStorage.getItem(cle)
        return brut ? (JSON.parse(brut) as T) : defaut
    } catch {
        return defaut
    }
}

/** Résumé pour l'assistant IA. */
export function resumeAvancement(): string {
    const a = lireAvancement()
    const lignes = Object.values(a.matieres).map((m) => {
        const p = positionDe(m)
        const restants = exosRestants(m)
        const revoir = exosARevoir(m)
        const importants = exosImportants(m)
        return `- ${m.nom} : ${p ? `${nomExo(p.td, p.jusqua)}${p.total ? `/${p.total}` : ''}` : 'rien noté'}${restants.length ? ` · à finir : ${regrouper(restants)}` : ''}${revoir.length ? ` · à revoir : ${regrouper(revoir)}` : ''}${importants.length ? ` · importants : ${regrouper(importants)}` : ''}`
    })
    return lignes.length ? `Avancement des TD :\n${lignes.join('\n')}` : ''
}
