const scriptModule = require('../src/script');

const { expectOwnPropertyNamesToEqual } = require('./test-utils');

describe('script', () => {

    it('should export correctly', () => {
        expectOwnPropertyNamesToEqual(scriptModule, [
            'Script',
        ]);
    });

    describe('Script', () => {

        const { Script } = scriptModule;

        it('should export correctly', () => {
            expectOwnPropertyNamesToEqual(Script.prototype, [
                'constructor',
                'run',
            ]);
        });

        it('constructor() should work correctly', () => {
            const scriptFilename = {};
            const scriptFunction1 = () => {};

            const script1 = new Script(scriptFilename, scriptFunction1);

            expectOwnPropertyNamesToEqual(script1, [
                'scriptFilename',
                'scriptFunction',
                'phase',
                'phaseInfo',
            ]);

            expect(script1.scriptFilename).toBe(scriptFilename);
            expect(script1.scriptFunction).toBe(scriptFunction1);
            expect(script1.phase).toBe('SETUP');
            expect(script1.phaseInfo).toBe(null);

            const scriptFilename2 = 'script2.js';
            const scriptFunction2 = '';

            const script2 = new Script(scriptFilename2, scriptFunction2);

            expect(script2.scriptFilename).toBe(scriptFilename2);
            expect(typeof script2.scriptFunction).toBe('function');
            expect(script2.phase).toBe('SETUP');
            expect(script2.phaseInfo).toBe(null);

            expect(() => {
                return new Script(scriptFilename, null);
            }).toThrow('Unsupported script function');
        });

        it('run() should work correctly', async () => {
            const scriptFunction1 = jest.fn(async () => {});

            const script1 = new Script(null, scriptFunction1);

            const $1 = {};

            const promise1 = script1.run($1);

            expect(scriptFunction1.mock.calls).toHaveLength(1);
            expect(scriptFunction1.mock.calls [0]).toHaveLength(2);
            expect(scriptFunction1.mock.calls [0] [0]).toBe($1);

            await promise1;
        });

    });

});
