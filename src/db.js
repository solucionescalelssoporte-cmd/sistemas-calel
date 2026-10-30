import Dexie from 'dexie'

export const localDb = new Dexie('calel-offline')
localDb.version(1).stores({
  pendingOrders: 'id, createdAt, syncStatus',
  pendingPhotos: 'id, orderId, createdAt, syncStatus'
})

export function makeId() {
  return globalThis.crypto?.randomUUID?.() || `calel-${Date.now()}-${Math.random().toString(16).slice(2)}`
}