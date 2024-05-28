const mainModule = require('../src/main');

const { expectOwnPropertyNamesToEqual } = require('./test-utils');

describe('main', () => {

    it('should export correctly', () => {
        expectOwnPropertyNamesToEqual(mainModule, [
            'UsageError',
            'main',
        ]);
    });

});
