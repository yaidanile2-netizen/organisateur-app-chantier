// Chantier 7 — abonnement aux notifications push.

// Clé publique VAPID (publique par nature, sans risque de la mettre dans le
// code du site — la clé privée, elle, ne quitte jamais n8n).
const VAPID_PUBLIC_KEY =
    'BBsFWevFp3lkK7EAZVPu14mC9vs5487xSrgtyt8Q-xWLkJq35SOPrGMqpcdjDfB6ga3A8k-4KJ_T3QuAaBeJWsc'

const SAVE_SUBSCRIPTION_URL =
    'https://n8n-production-bdf5.up.railway.app/webhook/save-subscription'

export type EtatNotifications = 'indisponible' | 'refuse' | 'inactif' | 'actif'

export function notificationsDisponibles(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export async function etatNotifications(): Promise<EtatNotifications> {
    if (!notificationsDisponibles()) return 'indisponible'
    if (Notification.permission === 'denied') return 'refuse'

  const registration = await navigator.serviceWorker.ready
    const existing = await registration.pushManager.getSubscription()
    return existing ? 'actif' : 'inactif'
}

export async function activerNotifications(): Promise<EtatNotifications> {
    if (!notificationsDisponibles()) return 'indisponible'

  const permission = await Notification.requestPermission()
    if (permission !== 'granted') return 'refuse'

  const registration = await navigator.serviceWorker.ready
    let subscription = await registration.pushManager.getSubscription()

  if (!subscription) {
        subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
        })
  }

  await fetch(SAVE_SUBSCRIPTION_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
  })

  return 'actif'
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const rawData = atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; i++) {
          outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
