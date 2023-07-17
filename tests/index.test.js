const indexModule = require('../src/index');

const { expectOwnPropertyNamesToEqual } = require('./test-utils');

describe('index', () => {

    it('should export correctly', () => {
        expectOwnPropertyNamesToEqual(indexModule, [
            'UsageError',
            'parseArgs',
            'main',
            'ScriptManager',
            'Script',
            'utils',
        ]);
    });

});
