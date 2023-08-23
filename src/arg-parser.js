const path = require('path');

const baseConfig = require('./config');
const { flatten } = require('./utils');

class UsageError extends Error {}

function parseArgs(args) {
    let argIndex = 0;

    function usage(message) {
        function row(left, right) {
            return `  ${left.padEnd(24, ' ')} ${right}`;
        }

        const fullMessage = flatten([
            message ? [ message, '' ] : [],
            'USAGE: resol-vbus-toolbox <... options ...>',
            '',
            'GENERAL OPTIONS:',
            row('--help', 'Print this usage message'),
            row('--config <FILENAME>', 'Load configuration from file'),
            row('--vsf <FILENAME>', 'Load VBus specification from file'),
            row('--script <FILENAME>', 'Load script from file (can be used more than once)'),
            row('--repl', 'Start a Read-Eval-Print-Loop'),
            '',
            'TCP CONNECTION OPTIONS:',
            row('--host <HOST>', 'IP address or host name to connect to'),
            row('--port <PORT>', 'Port number to connect to (default: 7053)'),
            row('--viaTag <VIATAG>', 'Via tag to connect to (only usable on VBus.net)'),
            row('--password <PASSWORD>', 'Password used to authenticate'),
            row('--channel <CHANNEL>', 'VBus channel to connect to'),
            '',
            'SERIAL PORT CONNECTION OPTIONS:',
            row('--path <PATH>', 'Name of the serial port to connect to'),
            '',
        ]).join('\n');

        throw new UsageError(fullMessage);
    }

    function consume() {
        let result;
        if (argIndex < args.length) {
            result = args [argIndex];
            argIndex += 1;
        } else {
            result = null;
        }
        return result;
    }

    function consumeArg(message) {
        const result = consume();

        if (result == null) {
            usage(message);
        } else if (result.startsWith('--')) {
            usage(`${message}, but got "${result}"`);
        }

        return result;
    }

    const config = { ...baseConfig };

    function ensureConnectionClassName(connectionClassName) {
        if (!config.connectionClassName) {
            config.connectionClassName = connectionClassName;
            config.connectionOptions = {};
        } else if (config.connectionClassName === connectionClassName) {
            // nop
        } else {
            usage(`Cannot mix options for different connection types: "${config.connectionClassName}" vs "${connectionClassName}"`);
        }
        return config.connectionOptions;
    }

    while (argIndex < args.length) {
        const arg = consume();
        if (arg === '--help') {
            usage();
        } else if (arg === '--config') {
            const relConfigFilename = consumeArg('Expected argument for --config');
            const absConfigFilename = path.resolve(relConfigFilename);
            const loadedConfig = require(absConfigFilename);
            for (const key of Object.getOwnPropertyNames(loadedConfig)) {
                config [key] = loadedConfig [key];
            }
        } else if (arg === '--host') {
            const options = ensureConnectionClassName('TcpConnection');
            options.host = consumeArg('Expected argument for --host');
        } else if (arg === '--port') {
            const options = ensureConnectionClassName('TcpConnection');
            options.port = +consumeArg('Expected argument for --port');
        } else if (arg === '--viaTag') {
            const options = ensureConnectionClassName('TcpConnection');
            options.viaTag = consumeArg('Expected argument for --viaTag');
        } else if (arg === '--password') {
            const options = ensureConnectionClassName('TcpConnection');
            options.password = consumeArg('Expected argument for --password');
        } else if (arg === '--channel') {
            const options = ensureConnectionClassName('TcpConnection');
            options.channel = +consumeArg('Expected argument for --channel');
        } else if (arg === '--path') {
            const options = ensureConnectionClassName('SerialConnection');
            options.path = consumeArg('Expected argument for --path');
        } else if (arg === '--virtual') {
            ensureConnectionClassName('VirtualConnection');
        // } else if (arg === '--listen') {
        } else if (arg === '--vsf') {
            config.vsfFilename = consumeArg('Expected arumgent for --vsf');
        } else if (arg === '--script') {
            config.scriptFilenames.push(consumeArg('Expected argument for --script'));
        } else if (arg === '--repl') {
            config.repl = true;
        } else if (arg.startsWith('--')) {
            usage(`Unexpected option "${arg}"`);
        } else {
            usage(`Unexpected argument "${arg}"`);
        }
    }

    return config;
}


module.exports = {
    UsageError,
    parseArgs,
};
