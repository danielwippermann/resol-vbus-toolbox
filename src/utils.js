// FIXME(daniel): copyright header

function flatten(...args) {
    function flattenReducer(memo, arg) {
        if (Array.isArray(arg)) {
            memo = arg.reduce(flattenReducer, memo);
        } else {
            memo.push(arg);
        }
        return memo;
    }

    return flattenReducer([], args);
}

function promisify(fn) {
    return new Promise((resolve, reject) => {
        fn((err, result) => {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        });
    });
}

function iterateRange(start, end) {
    let nextValue = start;

    const iterator = {
        next() {
            const done = (nextValue >= end);
            let value;
            if (!done) {
                value = nextValue;
                nextValue += 1;
            }
            return {
                done,
                value,
            };
        },

        [Symbol.iterator]() {
            return iterator;
        },
    };

    return iterator;
}

async function waitForSettledHeaderSet(headerSet) {
    await new Promise(resolve => {
        let lastHeaderCount = headerSet.getHeaderCount();
        let settledCountdown = lastHeaderCount * 3;

        const onAddHeader = () => {
            const headerCount = headerSet.getHeaderCount();
            if (lastHeaderCount !== headerCount) {
                lastHeaderCount = headerCount;
                settledCountdown = headerCount * 3;
            } else if (settledCountdown > 0) {
                settledCountdown -= 1;
            } else {
                headerSet.off('addHeader', onAddHeader);
                resolve();
            }
        };

        headerSet.on('addHeader', onAddHeader);
    });
}

class Interval {

    constructor(interval) {
        this.interval = interval;
        this.timestamp = null;
    }

    now() {
        return Date.now();
    }

    async sleep(milliseconds) {
        await new Promise(resolve => setTimeout(resolve, milliseconds));
    }

    update() {
        const now = this.now();
        if (this.timestamp == null) {
            this.timestamp = now;
        }

        const { interval } = this;

        const lastInterval = Math.floor(this.timestamp / interval);
        const currentInterval = Math.floor(now / interval);
        const intervalDiff = currentInterval - lastInterval;

        const intervalChanged = ((intervalDiff < -1) || (intervalDiff > 0));
        let remaining;
        if (intervalChanged) {
            this.timestamp = now;
            remaining = 0;
        } else {
            remaining = ((lastInterval + 1) * interval) - now;
        }

        return { intervalChanged, remaining };
    }

    async wait() {
        while (true) {
            const { intervalChanged, remaining } = this.update();

            if (intervalChanged) {
                break;
            }

            await this.sleep(remaining);
        }

        return true;
    }

    getTimestamp() {
        if (this.timestamp == null) {
            this.timestamp = this.now();
        }
        return this.timestamp;
    }

    getTimestampComponents() {
        const timestamp = this.getTimestamp();

        const datecode = new Date(timestamp).toISOString();

        return {
            Y: datecode.slice(0, 4),
            m: datecode.slice(5, 7),
            d: datecode.slice(8, 10),
        };
    }

    format(pattern) {
        const tsc = this.getTimestampComponents();

        return pattern
            .replaceAll('%Y', tsc.Y)
            .replaceAll('%m', tsc.m)
            .replaceAll('%d', tsc.d);
    }

}

module.exports = {
    flatten,
    promisify,
    iterateRange,
    waitForSettledHeaderSet,
    Interval,
};
