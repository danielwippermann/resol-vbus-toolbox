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
            'Interval',
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

    describe('Interval', () => {

        const { Interval } = utils;

        class TestableInterval extends Interval {

            constructor(...args) {
                super(...args);

                this.nowCallCount = 0;
                this.nowResult = this.interval / 2;
            }

            now() {
                this.nowCallCount += 1;
                return this.nowResult;
            }

            async sleep(milliseconds) {
                this.sleepSync(milliseconds);
            }

            sleepSync(milliseconds) {
                this.nowResult += milliseconds;
            }

        }

        it('should be a class', () => {
            expect(typeof Interval).toBe('function');
            expectOwnPropertyNamesToEqual(Interval.prototype, [
                'constructor',
                'now',
                'sleep',
                'update',
                'wait',
                'getTimestamp',
                'getTimestampComponents',
                'format',
            ]);
        });

        it('constructor() should work correctly', () => {
            const interval = 12345;

            const iv1 = new Interval(interval);

            expectOwnPropertyNamesToEqual(iv1, [
                'interval',
                'timestamp',
            ]);

            expect(iv1.interval).toBe(interval);
            expect(iv1.timestamp).toBe(null);
        });

        it('now() should work correctly', () => {
            const iv1 = new Interval(1000);

            const before = Date.now();
            const now = iv1.now();
            const after = Date.now();

            expect(now).toBeGreaterThanOrEqual(before);
            expect(now).toBeLessThanOrEqual(after);
        });

        it('sleep() should work correctly', async () => {
            const iv1 = new Interval(100);

            const before = Date.now();
            await iv1.sleep(100);
            const after = Date.now();

            const diff = after - before;

            expect(diff).toBeGreaterThanOrEqual(100);
            expect(diff).toBeLessThanOrEqual(150);
        });

        it('update() should work correctly', () => {
            const iv1 = new TestableInterval(100);

            expect(iv1.timestamp).toBe(null);

            const result1 = iv1.update();

            expectOwnPropertyNamesToEqual(result1, [
                'intervalChanged',
                'remaining',
            ]);

            expect(result1.intervalChanged).toBe(false);
            expect(result1.remaining).toBe(50);

            expect(iv1.timestamp).toBe(50);

            iv1.sleepSync(30);

            const result2 = iv1.update();

            expect(result2.intervalChanged).toBe(false);
            expect(result2.remaining).toBe(20);

            expect(iv1.timestamp).toBe(50);

            iv1.sleepSync(20);

            const result3 = iv1.update();

            expect(result3.intervalChanged).toBe(true);
            expect(result3.remaining).toBe(0);

            expect(iv1.timestamp).toBe(100);

            const result4 = iv1.update();

            expect(result4.intervalChanged).toBe(false);
            expect(result4.remaining).toBe(100);
        });

        it('wait() should work correctly', async () => {
            const iv1 = new TestableInterval(100);

            await iv1.wait();

            expect(iv1.timestamp).toBe(100);
            expect(iv1.nowCallCount).toBe(2);
            expect(iv1.nowResult).toBe(100);
        });

        it('getTimestamp() should work correctly', () => {
            const iv1 = new TestableInterval(100);

            const result1 = iv1.getTimestamp();

            expect(result1).toBe(50);

            expect(iv1.timestamp).toBe(50);
        });

        it('getTimestampComponents() should work correctly', () => {
            const iv1 = new TestableInterval(100);

            iv1.sleepSync(1689693850000);

            const tsc1 = iv1.getTimestampComponents();

            expectOwnPropertyNamesToEqual(tsc1, [
                'Y',
                'm',
                'd',
            ]);

            expect(tsc1.Y).toBe('2023');
            expect(tsc1.m).toBe('07');
            expect(tsc1.d).toBe('18');
        });

        it('format() should work correctly', () => {
            const iv1 = new TestableInterval(100);

            iv1.sleepSync(1689693850000);

            const result1 = iv1.format('log/%Y%m%d.csv');

            expect(result1).toBe('log/20230718.csv');
        });

    });

});
