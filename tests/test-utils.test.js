const testUtils = require('./test-utils');

describe('test-utils', () => {

    it('should export correctly', () => {
        expect(Object.getOwnPropertyNames(testUtils).sort()).toEqual([
            'expectOwnPropertyNamesToEqual',
        ].sort());
    });

    it('expectOwnPropertyNamesToEqual() should work correctly', () => {
        const { expectOwnPropertyNamesToEqual } = testUtils;

        expect(typeof expectOwnPropertyNamesToEqual).toBe('function');

        const obj1 = { a: 1, b: 2 };

        expectOwnPropertyNamesToEqual(obj1, [ 'b', 'a' ]);
        expectOwnPropertyNamesToEqual(obj1, [ 'a', 'b' ]);
    });

});
