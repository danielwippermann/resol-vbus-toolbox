const { Packet } = $.vbus;

const config = $.getScriptConfig('em-simulator', () => ({

    // Whether webserver API endpoints should be added to allow
    // interaction with this script.
    extendWebserver: false,

    // An array of module numbers (sub addresses between 1 and 15)
    // that should be simulated.
    enabledModuleNrs: [],

}));

const state = {
    modules: [],
};

for (let moduleNr = 1; moduleNr <= 15; moduleNr++) {
    const enabled = config.enabledModuleNrs.includes(moduleNr);

    const module = {
        enabled,
        sensors: [],
        relais: [],
    };

    for (let sensorNr = 1; sensorNr <= 6; sensorNr++) {
        module.sensors [sensorNr - 1] = {
            value: 0,
        };
    }

    for (let relaisNr = 1; relaisNr <= 5; relaisNr++) {
        module.relais [relaisNr - 1] = {
            valueA: 0,
            timeA: 0,
            valueB: 0,
            timeB: 0,
            value: 0,
            time: 0,
        };
    }

    state.modules [moduleNr - 1] = module;
}

function updateRelais(relais, advanceTime) {
    if (advanceTime) {
        relais.time += 1;
    }

    const totalTime = relais.timeA + relais.timeB;
    if (relais.time >= totalTime) {
        relais.time = 0;
    }

    if ((totalTime === 0) || (relais.time < relais.timeA)) {
        relais.value = relais.valueA;
    } else {
        relais.value = relais.valueB;
    }
}

function setEnabled(moduleNr, enabled) {
    if ((moduleNr < 1) || (moduleNr > 15)) {
        throw new Error(`Module number out-of-bounds`);
    } else {
        state.modules [moduleNr - 1].enabled = !!enabled;
    }
}

function setSensorValue(moduleNr, sensorNr, value) {
    if ((moduleNr < 1) || (moduleNr > 15)) {
        throw new Error(`Module number out-of-bounds`);
    } else if ((sensorNr < 1) || (sensorNr > 6)) {
        throw new Error(`Sensor number out-of-bounds`);
    } else {
        state.modules [moduleNr - 1].sensors [sensorNr - 1].value = value;
    }
}

function getRelais(moduleNr, relaisNr) {
    if ((moduleNr < 1) || (moduleNr > 15)) {
        throw new Error(`Module number out-of-bounds`);
    } else if ((relaisNr < 1) || (relaisNr > 5)) {
        throw new Error(`Relais number out-of-bounds`);
    } else {
        return state.modules [moduleNr - 1].relais [relaisNr - 1];
    }
}

function getRelaisValue(moduleNr, relaisNr) {
    const relais = getRelais(moduleNr, relaisNr);
    return relais.value;
}

const service = $.registerService('em-simulator', {

    setEnabled,

    setSensorValue,

    getRelais,

    getRelaisValue,

});

if (config.extendWebserver) {
    const webserver = await $.requireService('webserver');

    const { post } = webserver.server.router;
    const { status } = webserver.server.reply;

    function handleV1SetEnabled(ctx) {
        const { moduleNr, enabled } = ctx.data;
        setEnabled(moduleNr, enabled);
        return status(200).json({});
    }

    function handleV1SetSensorValue(ctx) {
        const { moduleNr, sensorNr, value } = ctx.data;
        setSensorValue(moduleNr, sensorNr, value);
        return status(200).json({});
    }

    function handleV1GetRelais(ctx) {
        const { moduleNr, relaisNr } = ctx.data;
        const relais = getRelais(moduleNr, relaisNr);
        return status(200).json(relais);
    }

    function handleV1GetRelaisValue(ctx) {
        const { moduleNr, relaisNr } = ctx.data;
        const value = getRelaisValue(moduleNr, relaisNr);
        return status(200).json(value);
    }

    webserver.routes.push([
        post('/em-simulator/api/v1/set-enabled', handleV1SetEnabled),
        post('/em-simulator/api/v1/set-sensor-value', handleV1SetSensorValue),
        post('/em-simulator/api/v1/get-relais', handleV1GetRelais),
        post('/em-simulator/api/v1/get-relais-value', handleV1GetRelaisValue),
    ]);
}

$.on('packet', rxPacket => {
    if (((rxPacket.destinationAddress & 0xFFF0) === 0x6650) && (rxPacket.command === 0x0200) && (rxPacket.frameCount >= 10)) {
        const moduleNr = rxPacket.destinationAddress & 0x000F;
        const module = state.modules [moduleNr - 1];

        if (module.enabled) {
            for (let relaisNr = 1; relaisNr <= 5; relaisNr++) {
                const relais = module.relais [relaisNr - 1];
                const baseOffset = (relaisNr - 1) * 8;
                relais.valueA = rxPacket.frameData [baseOffset + 0];
                relais.timeA = rxPacket.frameData.readUIntLE(baseOffset + 1, 3);
                relais.valueB = rxPacket.frameData [baseOffset + 4];
                relais.timeB = rxPacket.frameData.readUIntLE(baseOffset + 5, 3);

                updateRelais(relais, false);
            }

            const txPacket = new Packet({
                destinationAddress: rxPacket.sourceAddress,
                sourceAddress: rxPacket.destinationAddress,
                command: 0x0100,
                frameCount: 6,
            });

            for (let sensorNr = 1; sensorNr <= 6; sensorNr++) {
                const sensor = module.sensors [sensorNr - 1];
                const baseOffset = (sensorNr - 1) * 4;
                txPacket.frameData.writeUInt32LE(sensor.value * 1000, baseOffset + 0);
            }

            $.send(txPacket);
        }
    }
});

setInterval(() => {
    for (const module of state.modules) {
        for (const relais of module.relais) {
            updateRelais(relais, true);
        }
    }
}, 1000);

await $.connect();
