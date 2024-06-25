const { EventEmitter } = require('events');
const fs = require('fs/promises');

const { Script } = require('./script');


class ScriptManager extends EventEmitter {

    constructor(connection) {
        super();
        this.connection = connection;
        this.scripts = [];
        this.phase = 'SETUP';
        this.serviceMap = new Map();
    }

    notifyEvent(eventName, filter) {
        return new Promise(resolve => {
            const handler = (ev) => {
                if (!filter || filter(ev)) {
                    this.removeListener(eventName, handler);
                    resolve(ev);
                }
            };
            this.on(eventName, handler);
        });
    }

    registerScript(scriptFilename, scriptFunction) {
        const script = new Script(scriptFilename, scriptFunction);

        this.scripts.push(script);

        this.emit('scriptRegistered', {
            script,
        });

        return script;
    }

    async loadScript(scriptFilename) {
        const scriptFunction = await fs.readFile(scriptFilename, 'utf-8');
        this.registerScript(scriptFilename, scriptFunction);
    }

    registerService(script, serviceId, service) {
        if (script.phase !== 'SETUP') {
            throw new Error(`Script "${script.scriptFilename}" registered service "${serviceId}" after connecting`);
        } else if (this.serviceMap.has(serviceId)) {
            throw new Error(`Script "${script.scriptFilename}" re-registered known service "${serviceId}"`);
        }

        this.serviceMap.set(serviceId, {
            script,
            service,
        });

        this.emit('serviceRegistered', {
            script,
            serviceId,
            service,
        });

        return service;
    }

    _checkDeadlockedScripts() {
        let maxPhasePrio = 0;
        for (const script of this.scripts) {
            let phasePrio = 1;
            switch (script.phase) {
            case 'SETUP':
                phasePrio = 5;
                break;
            case 'REQUIRING':
                if (this.serviceMap.has(script.phaseInfo.serviceId)) {
                    phasePrio = 4;
                } else {
                    phasePrio = 3;
                }
                break;
            case 'CONNECTING':
                phasePrio = 2;
                break;
            }
            if (maxPhasePrio < phasePrio) {
                maxPhasePrio = phasePrio;
            }
        }

        if (maxPhasePrio === 3) {
            // NOTE(daniel): all scripts are either requiring an unregistered service
            // or are already connecting, hence there will be no script will be registering
            // that service anymore

            const info = this.scripts.filter(script => script.phase === 'REQUIRING').map(script => {
                return `- Script "${script.scriptFilename}", service "${script.phaseInfo.serviceId}"`;
            }).join('\n');

            throw new Error(`Requiring the following services failed:\n${info}`);
        }
    }

    async requireService(script, serviceId) {
        if (script.phase !== 'SETUP') {
            throw new Error(`Script "${script.scriptFilename}" required service "${serviceId}" after connecting`);
        }

        if (!this.serviceMap.has(serviceId)) {
            script.phase = 'REQUIRING';
            script.phaseInfo = {
                serviceId,
            };

            this._checkDeadlockedScripts();

            await this.notifyEvent('serviceRegistered', ev => ev.serviceId === serviceId);

            script.phase = 'SETUP';
            script.phaseInfo = null;
        }

        const { service } = this.serviceMap.get(serviceId);

        return service;
    }

    getService(serviceId) {
        const entry = this.serviceMap.get(serviceId);

        const service = entry ? entry.service : null;

        return service;
    }

    async connect(script) {
        if (script.phase !== 'SETUP') {
            throw new Error(`Script "${script.scriptFilename}" tried connecting after setup`);
        }

        const onConnectedPromise = this.notifyEvent('connected', () => true);

        script.phase = 'CONNECTING';

        this._checkDeadlockedScripts();

        const allScriptsConnecting = this.scripts.every(script => script.phase === 'CONNECTING');

        if (allScriptsConnecting) {
            this.phase = 'CONNECTING';

            await this.connection.connect();

            this.phase = 'CONNECTED';

            this.emit('connected');
        }

        await onConnectedPromise;

        script.phase = 'CONNECTED';

        return this.connection;
    }

    async disconnect(script) {
        if (script.phase !== 'CONNECTED') {
            throw new Error(`Script "${script.scriptFilename}" tried disconnecting while not connected`);
        }

        script.phase = 'DISCONNECTED';

        const allScriptsDisconnected = this.scripts.every(script => script.phase === 'DISCONNECTED');

        if (allScriptsDisconnected) {
            this.phase = 'DISCONNECTING';

            await this.connection.disconnect();

            this.phase = 'DISCONNECTED';

            this.emit('disconnected');
        }
    }

    async run(commonDollar) {
        const onDisconnectedPromise = this.notifyEvent('disconnected', () => true);

        const scriptManager = this;

        const scriptPromises = [];
        for (const script of this.scripts) {
            const $ = {

                ...commonDollar,

                /* istanbul ignore next */
                log(...args) {
                    console.log(`[${script.scriptFilename}]`, ...args);
                },

                registerService(serviceId, service) {
                    return scriptManager.registerService(script, serviceId, service);
                },

                async requireService(serviceId) {
                    return await scriptManager.requireService(script, serviceId);
                },

                async connect() {
                    return await scriptManager.connect(script);
                },

                async disconnect() {
                    return await scriptManager.disconnect(script);
                },

            };

            const promise = script.run($);
            scriptPromises.push(promise);
        }

        await Promise.all(scriptPromises);

        await onDisconnectedPromise;
    }
}


module.exports = {
    ScriptManager,
};
