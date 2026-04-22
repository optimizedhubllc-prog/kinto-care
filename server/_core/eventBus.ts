import { EventEmitter } from "events";

/**
 * Singleton EventEmitter for real-time webhook event broadcasting.
 * 
 * Usage:
 * - Emit: eventBus.emit('webhook:event', { hubId, event })
 * - Listen: eventBus.on('webhook:event', (data) => { ... })
 * - Subscribe: eventBus.on(`webhook:hub:${hubId}`, (event) => { ... })
 */
const eventBus = new EventEmitter();

// Set max listeners to prevent memory leak warnings
eventBus.setMaxListeners(100);

export default eventBus;
