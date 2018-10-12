
class Throttler {

    constructor (maxConcurrentTasks, maxTotalTasks) {
        this.maxConcurrentTasks = maxConcurrentTasks;
        this.maxTotalTasks = maxTotalTasks;
        this.drainListeners = [];
        this.maxRunsReachedListeners = [];
        this.ongoingTasks = 0;
        this.totalTasks = 0;
        this.queue = [];
    }

    async offer(task) {
        if (this.totalTasks >= this.maxTotalTasks) {
            // max runs reached; call listeners
            for (const listener of this.maxRunsReachedListeners) {
                listener();
            }
            this.maxRunsReachedListeners = [];  // these are one-time listeners
            return false;
        }

        if (this.ongoingTasks >= this.maxConcurrentTasks) {
            this.queue.push(task);
        } else {
            this.runTask(task);
        }
        return true;
    }

    async runTask(task) {
        this.totalTasks++;
        this.ongoingTasks++;
        try {
            await task();
        } catch (e) {
            console.error("Task failed!");
        }
        this.ongoingTasks--;

        if (this.queue.length > 0) {
            setImmediate(() => this.offer(this.queue.shift()));
        } else if (this.ongoingTasks === 0) {
            // no more tasks to run; call drain listeners
            for (const listener of this.drainListeners) {
                listener();
            }
        }
    }

    onDrain(listener) {
        this.drainListeners.push(listener);
    }

    onMaxRunsReached(listener) {
        this.maxRunsReachedListeners.push(listener);
    }
}

module.exports = Throttler;
