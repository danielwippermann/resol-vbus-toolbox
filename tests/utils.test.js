const vbus = require('resol-vbus');

const utils = require('../src/utils');

const {
    expectOwnPropertyNamesToEqual,
} = require('./test-utils');

describe('utils', () => {

    it('should export correctly', () => {
        expectOwnPropertyNamesToEqual(utils, [
            'flatten',
            'promisify',
            'iterateRange',
            'waitForSettledHeaderSet',
        ]);
    });

    it('flatten() should work correctly', () => {
        const { flatten } = utils;

        expect(typeof flatten).toBe('function');

        expect(flatten([])).toEqual([]);
        expect(flatten([ 1, 2 ])).toEqual([ 1, 2 ]);
        expect(flatten([ [ 1 ], [ 2 ] ])).toEqual([ 1, 2 ]);
    });

    it('promisify() should work correctly', async () => {
        const { promisify } = utils;

        expect(typeof promisify).toBe('function');

        const result1 = promisify(cb => cb(null, 'TestableResult'));

        await expect(result1).resolves.toBe('TestableResult');

        const result2 = promisify(cb => cb(new Error('TestableError')));

        await expect(result2).rejects.toThrow('TestableError');
    });

    it('iterateRange() should work correctly', () => {
        const { iterateRange } = utils;

        expect(typeof iterateRange).toBe('function');

        const it1 = iterateRange(0, 3);

        expectOwnPropertyNamesToEqual(it1, [
            'next',
        ]);

        expect(it1 [Symbol.iterator]()).toBe(it1);

        expect(it1.next()).toEqual({
            done: false,
            value: 0,
        });

        expect(it1.next()).toEqual({
            done: false,
            value: 1,
        });

        expect(it1.next()).toEqual({
            done: false,
            value: 2,
        });

        expect(it1.next()).toEqual({
            done: true,
        });

        expect(it1.next()).toEqual({
            done: true,
        });
    });

    it('waitForSettledHeaderSet() should work correctly', async () => {
        const headerSet = new vbus.HeaderSet();

        const promiseResolved1 = jest.fn(() => {});

        const promise1 = utils.waitForSettledHeaderSet(headerSet).then(promiseResolved1);

        function addTestablePacket(sourceAddress) {
            const packet = new vbus.Packet({
                destinationAddress: 0x0010,
                sourceAddress,
                command: 0x0100,
                frameCount: 0,
            });

            headerSet.addHeader(packet);
        }

        addTestablePacket(0x7E11);  // unknown packet -> settledCountdown = 3
        addTestablePacket(0x7E12);  // unknown packet -> settledCountdown = 6
        addTestablePacket(0x7E11);  // known packet -> settledCountdown = 5
        addTestablePacket(0x7E13);  // unknown packet -> settledCountdown = 9
        addTestablePacket(0x7E11);  // known packet -> settledCountdown = 8
        addTestablePacket(0x7E12);  // known packet -> settledCountdown = 7
        addTestablePacket(0x7E11);  // known packet -> settledCountdown = 6
        addTestablePacket(0x7E13);  // known packet -> settledCountdown = 5
        addTestablePacket(0x7E11);  // known packet -> settledCountdown = 4
        addTestablePacket(0x7E12);  // known packet -> settledCountdown = 3
        addTestablePacket(0x7E11);  // known packet -> settledCountdown = 2
        addTestablePacket(0x7E13);  // known packet -> settledCountdown = 1
        addTestablePacket(0x7E11);  // known packet -> settledCountdown = 0

        await new Promise(resolve => process.nextTick(resolve));

        expect(promiseResolved1.mock.calls).toHaveLength(0);

        addTestablePacket(0x7E11);  // known packet -> settled

        await new Promise(resolve => process.nextTick(resolve));

        expect(promiseResolved1.mock.calls).toHaveLength(1);

        await promise1;
    });

});
