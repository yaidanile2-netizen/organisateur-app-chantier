/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
import { ecrireCle, lireCle, noterNotif } from './notifs'

declare let self: ServiceWorkerGlobalScope

// Précache généré par vite-plugin-pwa (chantier 1) — inchangé.
precacheAndRoute(self.__WB_MANIFEST)

// Mise à jour automatique (registerType: 'autoUpdate') : sans ces deux lignes,
// une nouvelle version reste « en attente » tant que l'app n'est pas
// entièrement fermée — on l'active tout de suite et elle prend le contrôle
// des pages déjà ouvertes (registerSW.js recharge alors la page).
self.addEventListener('install', () => {
    self.skipWaiting()
})

self.addEventListener('activate', (event: ExtendableEvent) => {
    event.waitUntil(self.clients.claim())
})

// Chantier 7 — notifications : le serveur envoie un push SANS contenu
// (juste pour réveiller le service worker), on va chercher le texte du
// rappel nous-mêmes auprès de n8n avant d'afficher la notification.
const RAPPEL_URL = 'https://n8n-production-bdf5.up.railway.app/webhook/prochain-rappel'

self.addEventListener('push', (event: PushEvent) => {
    event.waitUntil(reposOuRappel())
})

// Chrono de repos (27/11/2026) : le push de fin de repos est vide lui aussi ; on le reconnaît parce que
// l'app a noté l'heure de fin dans IndexedDB et qu'on est autour de cette heure-là.
type Minuteur = { id: string; fin: number; total: number; libelle?: string; notifie?: boolean }
async function reposOuRappel() {
    const m = await lireCle<Minuteur>('minuteur')
    if (m && !m.notifie && Math.abs(Date.now() - m.fin) < 150000) {
        await ecrireCle('minuteur', { ...m, notifie: true })
        const title = '⏱️ Repos terminé'
        const body = 'C’est reparti : série suivante !'
        await self.registration.showNotification(title, {
            body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'repos',
            requireInteraction: false,
            data: { vue: 'muscu' },
            // vibration (Android) ; sur iPhone c'est la sonnerie des notifications
            vibrate: [300, 120, 300, 120, 500],
        } as NotificationOptions)
        await noterNotif({ date: new Date().toISOString(), titre: title, texte: body })
        const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        pages.forEach((c) => c.postMessage({ type: 'notif' }))
        return
    }
    await afficherRappel()
}

async function afficherRappel() {
    let title = 'Organisateur'
    let body = "Tu as quelque chose de prévu — ouvre l'app pour voir."

  try {
        const res = await fetch(RAPPEL_URL)
        if (res.ok) {
                const data = await res.json()
                if (data && typeof data.titre === 'string' && data.titre) title = data.titre
                if (data && typeof data.texte === 'string' && data.texte) body = data.texte
        }
  } catch {
        // Pas de réseau ou n8n indisponible : on garde le message par défaut
      // plutôt que de ne rien afficher du tout.
  }

  await self.registration.showNotification(title, {
        body,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
  })
  // Historique (bouton 🔔 de l'app) ; prévient aussi les pages ouvertes.
  await noterNotif({ date: new Date().toISOString(), titre: title, texte: body })
  const pages = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  pages.forEach((c) => c.postMessage({ type: 'notif' }))
}

self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close()
    event.waitUntil(
          (async () => {
                  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
                  for (const client of clientList) {
                            if ('focus' in client) {
                                        await (client as WindowClient).focus()
                                        return
                            }
                  }
                  if (self.clients.openWindow) {
                            await self.clients.openWindow('/')
                  }
          })(),
        )
})
