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


module.exports = {
    flatten,
    promisify,
    iterateRange,
    waitForSettledHeaderSet,
};
