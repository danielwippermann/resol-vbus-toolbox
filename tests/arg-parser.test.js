const argParserModule = require('../src/arg-parser');

const { expectOwnPropertyNamesToEqual } = require('./test-utils');

describe('arg-parser', () => {

    it('should export correctly', () => {
        expectOwnPropertyNamesToEqual(argParserModule, [
            'UsageError',
            'parseArgs',
        ]);
    });

    it('parseArgs() should work correctly', () => {
        const { parseArgs } = argParserModule;

        expect(typeof parseArgs).toBe('function');

        const result1 = parseArgs([]);

        expectOwnPropertyNamesToEqual(result1, [
            'connectionClassName',
            'connectionOptions',
            'vsfFilename',
            'scriptFilenames',
            'repl',
            'scriptConfigMap',
        ]);

        expect(result1.connectionClassName).toBe(null);
        expect(typeof result1.connectionOptions).toBe('object');
        expect(result1.vsfFilename).toBe(null);
        expect(result1.scriptFilenames).toHaveLength(0);
        expect(result1.repl).toBe(false);
        expect(typeof result1.scriptConfigMap).toBe('object');

        expect(() => {
            parseArgs([ '--help' ]);
        }).toThrow('USAGE:');

        const result2 = parseArgs([
            '--host', 'HOST',
            '--port', '12345',
            '--viaTag', 'VIATAG',
            '--password', 'PASSWORD',
            '--channel', '234',
        ]);

        expect(result2.connectionClassName).toBe('TcpConnection');
        expectOwnPropertyNamesToEqual(result2.connectionOptions, [
            'host',
            'port',
            'viaTag',
            'password',
            'channel',
        ]);
        expect(result2.connectionOptions.host).toBe('HOST');
        expect(result2.connectionOptions.port).toBe(12345);
        expect(result2.connectionOptions.viaTag).toBe('VIATAG');
        expect(result2.connectionOptions.password).toBe('PASSWORD');
        expect(result2.connectionOptions.channel).toBe(234);

        const result3 = parseArgs([
            '--path', 'PATH',
        ]);

        expect(result3.connectionClassName).toBe('SerialConnection');
        expectOwnPropertyNamesToEqual(result3.connectionOptions, [
            'path',
        ]);
        expect(result3.connectionOptions.path).toBe('PATH');

        const result4 = parseArgs([
            '--virtual',
        ]);

        expect(result4.connectionClassName).toBe('VirtualConnection');
        expectOwnPropertyNamesToEqual(result4.connectionOptions, [
        ]);

        const result5 = parseArgs([
            '--vsf', 'VSF',
            '--script', 'SCRIPT1',
            '--script', 'SCRIPT2',
            '--repl',
        ]);

        expect(result5.vsfFilename).toBe('VSF');
        expect(result5.scriptFilenames).toHaveLength(2);
        expect(result5.scriptFilenames [0]).toBe('SCRIPT1');
        expect(result5.scriptFilenames [1]).toBe('SCRIPT2');
        expect(result5.repl).toBe(true);

        expect(() => {
            parseArgs([
                '--script',
            ]);
        }).toThrow('Expected argument for --script');

        expect(() => {
            parseArgs([
                '--script',
                '--script',
            ]);
        }).toThrow('Expected argument for --script, but got "--script"');

        expect(() => {
            parseArgs([
                '--host', 'HOST',
                '--path', 'PATH',
            ]);
        }).toThrow('Cannot mix options for different connection types: "TcpConnection" vs "SerialConnection"');

        expect(() => {
            parseArgs([
                '--unexpected',
            ]);
        }).toThrow('Unexpected option "--unexpected"');

        expect(() => {
            parseArgs([
                'unexpected',
            ]);
        }).toThrow('Unexpected argument "unexpected"');
    });
});
