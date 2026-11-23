// Veille de l'emploi du temps (23/11/2026) : à chaque ouverture de l'app (au plus toutes les 20 min),
// l'app compare l'emploi du temps des 3 prochaines semaines à la dernière version vue et signale ce qui a changé
// (cours ajoutés, annulés, déplacés, changement de salle). Et chaque semaine qui contient un DS ou un oral a son
// alerte « 📣 La semaine prochaine… » le vendredi d'avant à 18 h (une vraie tâche #rappel → notification push).
import { creerTache, getCoursEntre, getTachesEntre, modifierTache, type Cours, type Tache } from './api'
import { cleDuType, nomModule } from './coursType'
import { matiereDeTache, typeDeTache } from './etudes'
import { MARQUEUR_RAPPEL } from './notes'
import { noterNotif } from './notifs'
import { debutDeSemaine } from './sport'
import { creerStock, jourIso } from './stockage'

const JOUR = 24 * 3600 * 1000
const FENETRE = 21 * JOUR
export const MARQUEUR_ALERTE = '#alerte-semaine'

type Empreinte = { cle: string; matiere: string; type: string; debut: string; fin: string; lieu: string }
export type ChangementEdt = { genre: 'ajout' | 'annule' | 'deplace' | 'salle'; matiere: string; type: string; avant?: Empreinte; apres?: Empreinte }

type Etat = {
    updatedAt: number
    vuLe: string // date de la dernière photo de l'emploi du temps
    jusqua: string // fin de la fenêtre photographiée (ISO)
    cours: Empreinte[]
    alertes: { date: string; changements: ChangementEdt[] }[] // changements pas encore vus par Daniel
}
export const stockVeille = creerStock<Etat>('veille.edt', 'prog:veille-edt', () => ({ updatedAt: 0, vuLe: '', jusqua: '', cours: [], alertes: [] }))

const empreinte = (c: Cours): Empreinte => {
    const matiere = nomModule(c.titre)
    const type = c.type || ''
    return { cle: `${matiere}|${type}|${c.date_debut}|${c.date_fin}|${c.lieu || ''}`, matiere, type, debut: c.date_debut, fin: c.date_fin, lieu: c.lieu || '' }
}

/** Les différences entre deux photos, sur la partie de la fenêtre commune encore à venir. */
export function comparer(avant: Empreinte[], apres: Empreinte[], depuis: string, jusqua: string): ChangementEdt[] {
    const dans = (e: Empreinte) => e.debut >= depuis && e.debut <= jusqua
    const a = avant.filter(dans)
    const b = apres.filter(dans)
    const clesA = new Set(a.map((e) => e.cle))
    const clesB = new Set(b.map((e) => e.cle))
    const partis = a.filter((e) => !clesB.has(e.cle))
    const arrives = b.filter((e) => !clesA.has(e.cle))
    const res: ChangementEdt[] = []
    // Même matière et même type : un cours qui a bougé (même jour : déplacé ou changement de salle).
    for (const p of partis) {
        const i = arrives.findIndex((n) => n.matiere === p.matiere && n.type === p.type && Math.abs(Date.parse(n.debut) - Date.parse(p.debut)) < 7 * JOUR)
        if (i >= 0) {
            const n = arrives.splice(i, 1)[0]
            const salleSeule = n.debut === p.debut && n.fin === p.fin
            res.push({ genre: salleSeule ? 'salle' : 'deplace', matiere: p.matiere, type: p.type, avant: p, apres: n })
        } else res.push({ genre: 'annule', matiere: p.matiere, type: p.type, avant: p })
    }
    for (const n of arrives) res.push({ genre: 'ajout', matiere: n.matiere, type: n.type, apres: n })
    return res.sort((x, y) => (x.apres ?? x.avant)!.debut.localeCompare((y.apres ?? y.avant)!.debut))
}

const jourF = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
const heureF = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' })
const quand = (e: Empreinte) => `${jourF.format(new Date(e.debut))} ${heureF.format(new Date(e.debut))}`
const estEval = (type: string) => cleDuType(type) === 'ds'

export function phraseChangement(c: ChangementEdt): string {
    const t = `${estEval(c.type) ? '📝 ' : ''}${c.matiere}${c.type ? ` (${c.type})` : ''}`
    if (c.genre === 'ajout') return `➕ Nouveau : ${t} le ${quand(c.apres!)}${c.apres!.lieu ? `, ${c.apres!.lieu}` : ''}`
    if (c.genre === 'annule') return `✖️ Retiré : ${t} du ${quand(c.avant!)}`
    if (c.genre === 'salle') return `🚪 Salle changée : ${t} le ${quand(c.apres!)} → ${c.apres!.lieu || 'salle non indiquée'}`
    return `🔀 Déplacé : ${t} du ${quand(c.avant!)} → ${quand(c.apres!)}`
}

/** Prévient sur l'appareil (notification locale si elle est autorisée) et garde la trace dans l'historique 🔔. */
async function prevenir(titre: string, texte: string): Promise<void> {
    await noterNotif({ date: new Date().toISOString(), titre, texte })
    try {
        if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator && location.protocol !== 'file:') {
            const reg = await navigator.serviceWorker.getRegistration()
            await reg?.showNotification(titre, { body: texte, tag: 'veille-edt', icon: '/icon-192.png' })
        }
    } catch {
        // pas de notification possible : la carte de l'Agenda suffit
    }
}

/** Compare l'emploi du temps des 3 prochaines semaines à la dernière photo. Renvoie les nouveaux changements. */
export async function verifierEdt(maintenant = new Date()): Promise<ChangementEdt[]> {
    const fin = new Date(maintenant.getTime() + FENETRE)
    const cours = await getCoursEntre(maintenant, fin)
    const apres = cours.map(empreinte)
    await stockVeille.synchroniser().catch(() => {})
    const e = stockVeille.lire()
    const depuis = maintenant.toISOString()
    // Première fois : on prend juste la photo.
    const changements = e.vuLe ? comparer(e.cours, apres, depuis, e.jusqua < fin.toISOString() ? e.jusqua : fin.toISOString()) : []
    stockVeille.modifier((x) => ({
        ...x,
        vuLe: depuis,
        jusqua: fin.toISOString(),
        cours: apres,
        alertes: changements.length ? [...x.alertes, { date: depuis, changements }].slice(-10) : x.alertes,
    }))
    if (changements.length) {
        const evals = changements.filter((c) => estEval(c.type))
        await prevenir(
            evals.length ? '📅 Emploi du temps modifié (évaluation !)' : '📅 Emploi du temps modifié',
            changements.slice(0, 3).map(phraseChangement).join(' · ') + (changements.length > 3 ? ` (+${changements.length - 3})` : ''),
        )
    }
    return changements
}

export function alertesEnAttente(): ChangementEdt[] {
    return stockVeille.lire().alertes.flatMap((a) => a.changements)
}
export function marquerVu(): void {
    stockVeille.modifier((x) => ({ ...x, alertes: [] }))
}

// ---------- Alerte du week-end : DS et oraux de la semaine suivante ----------

export type Evaluation = { matiere: string; type: 'ds' | 'soutenance'; libelle: string; date: Date }

function evaluationsDe(cours: Cours[], taches: Tache[]): Evaluation[] {
    const res: Evaluation[] = []
    for (const c of cours) {
        if (!estEval(c.type || '')) continue
        const oral = /soutenance|oral/i.test(c.type || '')
        res.push({ matiere: nomModule(c.titre), type: oral ? 'soutenance' : 'ds', libelle: oral ? 'Oral' : 'DS', date: new Date(c.date_debut) })
    }
    for (const t of taches) {
        const ty = typeDeTache(t)
        if ((ty !== 'ds' && ty !== 'soutenance') || !t.date_debut || t.statut === 'annule' || t.description?.includes(MARQUEUR_ALERTE)) continue
        const m = matiereDeTache(t)
        const d = new Date(t.date_debut)
        // déjà dans l'emploi du temps ?
        if (res.some((r) => r.type === ty && Math.abs(r.date.getTime() - d.getTime()) < 2 * JOUR && (r.matiere.toLowerCase().includes(m.toLowerCase().slice(0, 6)) || m.toLowerCase().includes(r.matiere.toLowerCase().slice(0, 6))))) continue
        res.push({ matiere: m, type: ty, libelle: ty === 'soutenance' ? 'Oral' : 'DS', date: d })
    }
    return res.sort((a, b) => a.date.getTime() - b.date.getTime())
}

const jourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })
export const texteEvals = (l: Evaluation[]) => l.map((e) => `${e.libelle} ${e.matiere} (${jourCourt.format(e.date)})`).join(' · ')

/** Les DS et oraux de la semaine qui suit celle de `jour` (pour la carte du week-end). */
export async function evalsSemaineProchaine(jour = new Date()): Promise<Evaluation[]> {
    const lundi = debutDeSemaine(jour)
    lundi.setDate(lundi.getDate() + 7)
    const dimanche = new Date(lundi.getTime() + 7 * JOUR - 1)
    const [cours, taches] = await Promise.all([getCoursEntre(lundi, dimanche), getTachesEntre(lundi, dimanche)])
    return evaluationsDe(cours, taches)
}

/** Pour chaque semaine des 3 prochaines qui a un DS ou un oral : un rappel le vendredi d'avant à 18 h (créé ou mis à jour). */
export async function preparerAlertesSemaine(maintenant = new Date()): Promise<number> {
    const debut = debutDeSemaine(maintenant)
    const fin = new Date(debut.getTime() + 4 * 7 * JOUR)
    const [cours, taches] = await Promise.all([getCoursEntre(maintenant, fin), getTachesEntre(new Date(debut.getTime() - 7 * JOUR), fin)])
    const evals = evaluationsDe(cours, taches).filter((e) => e.date > maintenant)
    const existantes = taches.filter((t) => t.description?.includes(MARQUEUR_ALERTE) && t.statut !== 'annule')
    let n = 0
    for (let k = 1; k <= 3; k++) {
        const lundi = new Date(debut.getTime() + k * 7 * JOUR + 12 * 3600 * 1000)
        const l0 = debutDeSemaine(lundi)
        const semaine = evals.filter((e) => debutDeSemaine(e.date).getTime() === l0.getTime())
        if (!semaine.length) continue
        const cle = `${MARQUEUR_ALERTE} ${jourIso(l0)}`
        const titre = `📣 La semaine prochaine : ${texteEvals(semaine)}`
        const deja = existantes.find((t) => t.description?.includes(cle))
        if (deja) {
            if (deja.titre !== titre && deja.statut !== 'fait') await modifierTache({ id: deja.id, titre })
            continue
        }
        // Vendredi 18 h avant la semaine ; si c'est déjà passé (on est le week-end), dans 10 minutes.
        const vendredi = new Date(l0.getTime() - 3 * JOUR)
        vendredi.setHours(18, 0, 0, 0)
        const quandAlerte = vendredi > maintenant ? vendredi : new Date(maintenant.getTime() + 10 * 60000)
        if (quandAlerte >= l0) continue
        await creerTache({
            titre,
            description: `${MARQUEUR_RAPPEL} ${cle}\nPrépare ta semaine : révisions de ces évaluations dans l’Agenda → Révisions.`,
            categorie_id: null,
            date_debut: quandAlerte.toISOString(),
            date_fin: new Date(quandAlerte.getTime() + 5 * 60000).toISOString(),
            toute_la_journee: false,
            statut: 'a_faire',
            priorite: 'haute',
        })
        n++
    }
    return n
}

/** Tout ce qu'il faut faire à l'ouverture de l'app (au plus toutes les 20 min, une seule fois à la fois). */
let enCours: Promise<{ changements: ChangementEdt[]; alertes: number }> | null = null
export function veiller(forcer = false): Promise<{ changements: ChangementEdt[]; alertes: number }> {
    try {
        const der = Number(localStorage.getItem('veille.derniere') || 0)
        if (!forcer && Date.now() - der < 20 * 60000) return Promise.resolve({ changements: [], alertes: 0 })
    } catch {
        // stockage indisponible : on vérifie quand même
    }
    enCours ??= (async () => {
        const changements = await verifierEdt().catch((e) => {
            console.warn('Veille EDT :', e)
            return [] as ChangementEdt[]
        })
        const alertes = await preparerAlertesSemaine().catch((e) => {
            console.warn('Alertes semaine :', e)
            return 0
        })
        try {
            localStorage.setItem('veille.derniere', String(Date.now()))
        } catch {
            // stockage indisponible
        }
        return { changements, alertes }
    })().finally(() => {
        enCours = null
    })
    return enCours
}
