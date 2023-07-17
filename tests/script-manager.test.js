const path = require('path');

const scriptManagerModule = require('../src/script-manager');

const { expectOwnPropertyNamesToEqual } = require('./test-utils');

describe('script-manager', () => {

    it('should export correctly', () => {
        expectOwnPropertyNamesToEqual(scriptManagerModule, [
            'ScriptManager',
        ]);
    });

    describe('ScriptManager', () => {

        const { ScriptManager } = scriptManagerModule;

        it('should export correctly', () => {
            expectOwnPropertyNamesToEqual(ScriptManager.prototype, [
                'constructor',
                'notifyEvent',
                'loadScript',
                'registerScript',
                'registerService',
                'requireService',
                'connect',
                'disconnect',
                'run',
            ]);
        });

        it('constructor() should work correctly', () => {
            const connection = {};

            const sm = new ScriptManager(connection);

            expectOwnPropertyNamesToEqual(sm, [
                'connection',
                'scripts',
                'phase',
                'serviceMap',

                // EventEmitter
                '_events',
                '_eventsCount',
                '_maxListeners',
            ]);

            expect(sm.connection).toBe(connection);
            expect(sm.scripts).toHaveLength(0);
            expect(sm.phase).toBe('SETUP');
            expect(sm.serviceMap.size).toBe(0);
        });

        it('notifyEvent() should work correctly', async () => {
            const sm = new ScriptManager();

            const payload1 = {};

            const filter1 = jest.fn(ev => ev.payload === payload1);

            const promise1 = sm.notifyEvent('eventName', filter1);

            // ignore other events
            sm.emit('otherEventName', null);

            // should not match filter criteria => filter call #1
            sm.emit('eventName', {});

            // should match filter criteria => filter call #2
            sm.emit('eventName', { payload: payload1 });

            // should have unregistered by this time
            sm.emit('eventName', { payload: payload1 });

            expect(filter1.mock.calls).toHaveLength(2);

            await promise1;
        });

        it('registerScript() should work correctly', () => {
            const sm = new ScriptManager();

            const onScriptRegistered = jest.fn(() => {});
            sm.on('scriptRegistered', onScriptRegistered);

            const scriptFilename1 = 'script1.js';

            const scriptFunction1 = () => {};

            const script1 = sm.registerScript(scriptFilename1, scriptFunction1);

            expect(script1.scriptFilename).toBe(scriptFilename1);
            expect(script1.scriptFunction).toBe(scriptFunction1);

            sm.off('scriptRegistered', onScriptRegistered);

            expect(onScriptRegistered.mock.calls).toHaveLength(1);
            expect(onScriptRegistered.mock.calls [0]).toHaveLength(1);

            const ev1 = onScriptRegistered.mock.calls [0] [0];

            expectOwnPropertyNamesToEqual(ev1, [
                'script',
            ]);
            expect(ev1.script).toBe(script1);
        });

        it('loadScript() should work correctly', async () => {
            const sm = new ScriptManager();

            const scriptFilename1 = path.resolve(__dirname, 'assets/script1.js');

            await sm.loadScript(scriptFilename1);

            expect(sm.scripts).toHaveLength(1);
            expect(sm.scripts [0].scriptFilename).toBe(scriptFilename1);
        });

        it('registerService() should work correctly', () => {
            const sm = new ScriptManager();

            const onServiceRegistered = jest.fn(() => {});
            sm.on('serviceRegistered', onServiceRegistered);

            const script1 = sm.registerScript('script1.js', () => {});
            const serviceId1 = 'serviceId1';
            const service1 = {};

            sm.registerService(script1, serviceId1, service1);

            sm.off('serviceRegistered', onServiceRegistered);

            expect(onServiceRegistered.mock.calls).toHaveLength(1);
            expect(onServiceRegistered.mock.calls [0]).toHaveLength(1);

            const ev1 = onServiceRegistered.mock.calls [0] [0];

            expectOwnPropertyNamesToEqual(ev1, [
                'script',
                'serviceId',
                'service',
            ]);
            expect(ev1.script).toBe(script1);
            expect(ev1.serviceId).toBe(serviceId1);
            expect(ev1.service).toBe(service1);

            expect(sm.serviceMap.has(serviceId1)).toBe(true);
            expect(sm.serviceMap.get(serviceId1).script).toBe(script1);
            expect(sm.serviceMap.get(serviceId1).service).toBe(service1);

            expect(() => {
                sm.registerService(script1, serviceId1, null);
            }).toThrow('Script "script1.js" re-registered known service "serviceId1"');

            script1.phase = 'DISCONNECTED';

            expect(() => {
                sm.registerService(script1, 'serviceId2', null);
            }).toThrow('Script "script1.js" registered service "serviceId2" after connecting');

            sm.off('serviceRegistered', onServiceRegistered);
        });

        it('requireService() should work correctly', async () => {
            const sm = new ScriptManager();

            const script1 = sm.registerScript('script1.js', () => {});
            const serviceId1 = 'serviceId1';
            const service1 = {};

            const script2 = sm.registerScript('script2.js', () => {});
            const serviceId2 = 'serviceId2';
            const service2 = {};

            sm.registerService(script1, serviceId1, service1);

            const promise1 = sm.requireService(script2, serviceId1);

            const result1 = await promise1;

            expect(result1).toBe(service1);

            const promise2 = sm.requireService(script1, serviceId2);

            sm.registerService(script2, serviceId2, service2);

            const result2 = await promise2;

            expect(result2).toBe(service2);

            script1.phase = 'DISCONNECTED';

            await expect(sm.requireService(script1, 'otherServiceId')).rejects.toThrow('Script "script1.js" required service "otherServiceId" after connecting');

            await expect(sm.requireService(script2, 'unknownServiceId')).rejects.toThrow('Requiring the following services failed:\n- Script "script2.js", service "unknownServiceId"');
        });

        it('connect() should work correctly', async () => {
            const connection = {

                connect: jest.fn(async () => {}),

            };

            const sm = new ScriptManager(connection);

            const onConnected = jest.fn(() => {});
            sm.on('connected', onConnected);

            const script1 = sm.registerScript('script1.js', () => {});
            const script2 = sm.registerScript('script2.js', () => {});

            const promise1 = sm.connect(script1);

            expect(script1.phase).toBe('CONNECTING');

            expect(onConnected.mock.calls).toHaveLength(0);

            const promise2 = sm.connect(script2);

            expect(script2.phase).toBe('CONNECTING');

            expect(onConnected.mock.calls).toHaveLength(0);

            await promise1;
            await promise2;

            sm.off('connected', onConnected);

            expect(script1.phase).toBe('CONNECTED');
            expect(script2.phase).toBe('CONNECTED');
            expect(sm.phase).toBe('CONNECTED');

            expect(onConnected.mock.calls).toHaveLength(1);

            expect(connection.connect.mock.calls).toHaveLength(1);

            await expect(sm.connect(script1)).rejects.toThrow('Script "script1.js" tried connecting after setup');
        });

        it('disconnect() should work correctly', async () => {
            const connection = {

                async connect() {},

                disconnect: jest.fn(async () => {}),

            };

            const sm = new ScriptManager(connection);

            const script1 = sm.registerScript('script1.js', () => {});
            const script2 = sm.registerScript('script2.js', () => {});

            const connectPromise1 = sm.connect(script1);
            const connectPromise2 = sm.connect(script2);

            await connectPromise1;
            await connectPromise2;

            expect(sm.phase).toBe('CONNECTED');
            expect(connection.disconnect.mock.calls).toHaveLength(0);

            const promise1 = sm.disconnect(script1);

            expect(script1.phase).toBe('DISCONNECTED');
            expect(sm.phase).toBe('CONNECTED');
            expect(connection.disconnect.mock.calls).toHaveLength(0);

            await promise1;

            expect(script1.phase).toBe('DISCONNECTED');
            expect(sm.phase).toBe('CONNECTED');
            expect(connection.disconnect.mock.calls).toHaveLength(0);

            const promise2 = sm.disconnect(script2);

            expect(script2.phase).toBe('DISCONNECTED');
            expect(sm.phase).toBe('DISCONNECTING');
            expect(connection.disconnect.mock.calls).toHaveLength(1);

            await promise2;

            expect(script2.phase).toBe('DISCONNECTED');
            expect(sm.phase).toBe('DISCONNECTED');
            expect(connection.disconnect.mock.calls).toHaveLength(1);

            await expect(sm.disconnect(script1)).rejects.toThrow('Script "script1.js" tried disconnecting while not connected');
        });

        it('run() should work correctly', async () => {
            const connection = {

                async connect() {},

                async disconnect() {},

            };

            const sm = new ScriptManager(connection);

            const notifyPromise1 = sm.notifyEvent('scriptEvent1');
            const notifyPromise2 = sm.notifyEvent('scriptEvent2');

            const script1Service = {};

            const scriptFunction1 = jest.fn(async ($) => {
                $.registerService('script1Service', script1Service);

                await $.connect();

                await notifyPromise1;

                await $.disconnect();
            });

            const scriptFunction2 = jest.fn(async ($) => {
                const script1Service = await $.requireService('script1Service');

                $.registerService('script2Service', {
                    script1Service,
                });

                await $.connect();

                await notifyPromise2;

                await $.disconnect();
            });

            const script1 = sm.registerScript('script1.js', scriptFunction1);
            const script2 = sm.registerScript('script2.js', scriptFunction2);

            const baseDollar = {

                keyFromBaseDollar: {},

            };

            const runPromise1 = sm.run(baseDollar);

            expect(scriptFunction1.mock.calls).toHaveLength(1);
            expect(scriptFunction1.mock.calls [0]).toHaveLength(2);

            const $1 = scriptFunction1.mock.calls [0] [0];

            expectOwnPropertyNamesToEqual($1, [
                'keyFromBaseDollar',
                'log',
                'registerService',
                'requireService',
                'connect',
                'disconnect',
            ]);

            expect($1.keyFromBaseDollar).toBe(baseDollar.keyFromBaseDollar);

            expect(sm.phase).toBe('SETUP');
            expect(script1.phase).toBe('CONNECTING');
            expect(script2.phase).toBe('SETUP');

            await new Promise(resolve => process.nextTick(resolve));

            expect(sm.phase).toBe('CONNECTED');
            expect(script1.phase).toBe('CONNECTED');
            expect(script2.phase).toBe('CONNECTED');

            sm.emit('scriptEvent1');

            await new Promise(resolve => process.nextTick(resolve));

            expect(sm.phase).toBe('CONNECTED');
            expect(script1.phase).toBe('DISCONNECTED');
            expect(script2.phase).toBe('CONNECTED');

            sm.emit('scriptEvent2');

            await new Promise(resolve => process.nextTick(resolve));

            expect(sm.phase).toBe('DISCONNECTED');
            expect(script1.phase).toBe('DISCONNECTED');
            expect(script2.phase).toBe('DISCONNECTED');

            await runPromise1;
        });

    });

});
