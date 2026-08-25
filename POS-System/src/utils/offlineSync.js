import { db } from '../database';
import toast from 'react-hot-toast';

const QUEUE_KEY = 'pso_sync_queue';

export const addToSyncQueue = (table, action, data, id = null) => {
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    const newItem = {
        id: Date.now().toString(),
        table,
        action, // 'insert', 'update', 'delete'
        data,
        targetId: id,
        timestamp: new Date().toISOString(),
        retryCount: 0
    };
    queue.push(newItem);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[OfflineSync] Added to queue: ${action} on ${table}`);
    
    // Trigger sync attempt
    processSyncQueue();
};

export const processSyncQueue = async () => {
    if (!navigator.onLine) return;
    
    const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log(`[OfflineSync] Attempting to sync ${queue.length} items...`);
    
    const remainingQueue = [];

    for (const item of queue) {
        try {
            let error = null;
            
            if (item.action === 'insert') {
                const { error: err } = await db.from(item.table).insert(Array.isArray(item.data) ? item.data : [item.data]);
                error = err;
            } else if (item.action === 'update') {
                const { error: err } = await db.from(item.table).update(item.data).eq('id', item.targetId);
                error = err;
            } else if (item.action === 'delete') {
                const { error: err } = await db.from(item.table).delete().eq('id', item.targetId);
                error = err;
            }

            if (error) {
                console.error(`[OfflineSync] Sync failed for item ${item.id}:`, error);
                item.retryCount += 1;
                if (item.retryCount < 5) {
                    remainingQueue.push(item);
                } else {
                    console.error(`[OfflineSync] Max retries reached for item ${item.id}. Dropping.`);
                }
            } else {
                console.log(`[OfflineSync] Successfully synced item ${item.id}`);
            }
        } catch (err) {
            console.error(`[OfflineSync] Fatal error syncing item ${item.id}:`, err);
            remainingQueue.push(item);
        }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    
    if (remainingQueue.length === 0 && queue.length > 0) {
        toast.success("All offline data synced to cloud!");
    }
};

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log("[OfflineSync] Back online! Processing queue...");
        processSyncQueue();
    });
}
