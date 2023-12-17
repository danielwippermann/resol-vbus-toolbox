const fs = require('fs/promises');
const repl = require('repl');

const vbus = require('resol-vbus');

const { UsageError, parseArgs } = require('./arg-parser');
const { ScriptManager } = require('./script-manager');
const utils = require('./utils');


const {
    Connection,
    Datagram,
    Header,
    HeaderSet,
    Packet,
    SerialConnection,
    Specification,
    SpecificationFile,
    TcpConnection,
    Telegram,
} = vbus;

class VirtualConnection extends Connection {

    constructor() {
        super();
        this.pipe(this);
    }

    connect() {
        this._setConnectionState(Connection.STATE_CONNECTED);
    }

    disconnect() {
        this._setConnectionState(Connection.STATE_DISCONNECTED);
    }

}

const connectionClassByName = {
    SerialConnection,
    TcpConnection,
    VirtualConnection,
};

async function main(args) {
    const config = parseArgs(args);

    let specification;
    if (config.vsfFilename) {
        const vsfContents = await fs.readFile(config.vsfFilename);
        const specificationFile = new SpecificationFile(vsfContents);
        specification = new Specification({ specificationFile });
    } else {
        specification = Specification.getDefaultSpecification();
    }

    const ConnectionClass = connectionClassByName [config.connectionClassName];
    const connection = new ConnectionClass(config.connectionOptions);

    const headerSet = new HeaderSet();

    connection.on('packet', packet => {
        headerSet.addHeader(packet);
    });

    const waitForSettledHeaderSetPromise = utils.waitForSettledHeaderSet(headerSet);

    const scriptManager = new ScriptManager(connection);

    const scripts = [];
    for (const scriptFilename of config.scriptFilenames) {
        const script = await scriptManager.loadScript(scriptFilename);

        scripts.push(script);
    }

    const commonDollar = {

        utils,

        config,

        getScriptConfig(key, defaultConfigGenerator) {
            // console.log(defaultConfigGenerator.toString());

            const defaultConfig = defaultConfigGenerator();

            let scriptConfig = config.scriptConfigMap [key];
            if (scriptConfig == null) {
                scriptConfig = config.scriptConfigMap [key] = { ...defaultConfig };
            }

            for (const key of Object.getOwnPropertyNames(defaultConfig)) {
                if (!utils.hasOwn(scriptConfig, key)) {
                    scriptConfig [key] = defaultConfig [key];
                }
            }

            return scriptConfig;
        },

        vbus,

        specification,

        sprintf(...args) {
            return specification.i18n.sprintf(...args);
        },

        on(...args) {
            connection.on(...args);
        },

        once(...args) {
            connection.once(...args);
        },

        off(...args) {
            connection.off(...args);
        },

        async delay(milliseconds) {
            await new Promise(resolve => setTimeout(resolve, milliseconds));
        },

        async waitForSettledHeaderSet() {
            await waitForSettledHeaderSetPromise;
        },

        getSortedHeaderSet() {
            return headerSet.getSortedHeaderSet();
        },

        getSortedPackets() {
            return headerSet.getSortedHeaders();
        },

        send(data) {
            if (Buffer.isBuffer(data)) {
                connection.send(data);
            } else if (data instanceof Header) {
                connection.send(data);
            } else  {
                throw new Error('Unsupported data to send');
            }
        },

        createPacket(options) {
            if (Array.isArray(options.frameData)) {
                if (typeof options.frameData [0] === 'string') {
                    options.frameData = Buffer.from(options.frameData.join(''), 'hex');
                } else {
                    options.frameData = Buffer.from(options.frameData);
                }
            }
            const packet = new Packet(options);
            if (options.packetFieldRawValues) {
                const packetFields = specification.getPacketFieldsForHeaders([ packet ]);
                specification.setPacketFieldRawValues(packetFields, options.packetFieldRawValues);
            }
            return packet;
        },

        createDatagram(options) {
            return new Datagram(options);
        },

        createTelegram(options) {
            if (Array.isArray(options.frameData)) {
                if (typeof options.frameData [0] === 'string') {
                    options.frameData = Buffer.from(options.frameData.join(''), 'hex');
                } else {
                    options.frameData = Buffer.from(options.frameData);
                }
            }
            return new Telegram(options);
        },

        async transceive(...args) {
            return await connection.transceive(...args);
        },

        async waitForFreeBus(...args) {
            return await connection.waitForFreeBus(...args);
        },

        async releaseBus(...args) {
            return await connection.releaseBus(...args);
        },

        async getValueById(...args) {
            return await connection.getValueById(...args);
        },

        async setValueById(...args) {
            return await connection.setValueById(...args);
        },

        async getValueIdHashById(...args) {
            return await connection.getValueIdHashById(...args);
        },

        async getValueIdByIdHash(...args) {
            return await connection.getValueIdByIdHash(...args);
        },

        async getCaps1(...args) {
            return await connection.getCaps1(...args);
        },

        async beginBulkValueTransaction(...args) {
            return await connection.beginBulkValueTransaction(...args);
        },

        async commitBulkValueTransaction(...args) {
            return await connection.commitBulkValueTransaction(...args);
        },

        async rollbackBulkValueTransaction(...args) {
            return await connection.rollbackBulkValueTransaction(...args);
        },

        async setBulkValueById(...args) {
            return await connection.setBulkValueById(...args);
        },

        async ping(...args) {
            return await connection.ping(...args);
        },

        async getStorageActivity(...args) {
            return await connection.getStorageActivity(...args);
        },

    };

    const runScriptsPromise = scriptManager.run(commonDollar);

    if (config.repl) {
        const replServer = repl.start();

        const origEval = replServer.eval;

        replServer.eval = (cmd, context, filename, callback) => {
            origEval(cmd, context, filename, (err, result) => {
                if (err) {
                    callback(err);
                } else if (result && (typeof result === 'object') && (typeof result.then === 'function')) {
                    result.then(result => {
                        callback(null, result);
                    }, err => {
                        callback(err);
                    });
                } else {
                    callback(null, result);
                }
            });
        };

        Object.assign(replServer.context, {

            $: commonDollar,

            connection,

            getService(serviceId) {
                return scriptManager.getService(serviceId);
            },

        });
    }

    await runScriptsPromise;
}


module.exports = {
    UsageError,
    main,
};
