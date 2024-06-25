/// Starts a webserver.
///
/// Other scripts can extend that webserver by adding routes or extending the
/// configuration.

const os = require('os');

const server = require('server');


const { get, socket } = server.router;
const { status } = server.reply;

const config = $.getScriptConfig('webserver', () => ({

    options: {

        security: false,

        socket: {
            path: '/websocket',
        },

    },

    routes: [],

}));

async function handleV1GetCurrentPackets(ctx) {
    const packets = $.getSortedPackets();

    const reply = {
        timestamp: Date.now(),
        packets: packets.map(packet => {
            const packetSpec = $.specification.getPacketSpecification(packet);

            const packetFields = $.specification.getPacketFieldsForHeaders([ packet ]);

            return {
                packetId: packetSpec.packetId,
                timestamp: +packet.timestamp,
                channel: packet.channel,
                destinationAddress: packet.destinationAddress,
                sourceAddress: packet.sourceAddress,
                command: packet.command,
                frameCount: packet.frameCount,
                frameData: packet.frameData.slice(0, packet.frameCount * 4).toString('base64'),
                fullName: packetSpec.fullName,
                fields: packetFields.map(pf => {
                    return {
                        id: pf.id,
                        fieldId: pf.packetFieldSpec.fieldId,
                        rawValue: pf.rawValue,
                        textValue: pf.formatTextValue(false),
                        name: pf.name,
                        unitCode: pf.packetFieldSpec.type.unit.unitCode,
                        unitText: pf.packetFieldSpec.type.unit.unitText,
                    };
                }),
            };
        }),
    };

    return status(200).json(reply);
}

const socketConnectHandlers = [];
const socketMessageHandlers = [];

async function handleWebsocketConnect(ctx) {
    // console.log('connect', ctx);
    for (const handler of socketConnectHandlers) {
        handler(ctx);
    }
}

async function handleWebsocketMessage(ctx) {
    // console.log('message', ctx);
    for (const handler of socketMessageHandlers) {
        handler(ctx);
    }
}

config.routes.push([
    get('/webserver/api/v1/get-current-packets', handleV1GetCurrentPackets),
    socket('connect', handleWebsocketConnect),
    socket('message', handleWebsocketMessage),
]);

let app;

const service = $.registerService('webserver', {

    server,

    options: config.options,

    routes: config.routes,

    onSocketConnect: (handler) => {
        socketConnectHandlers.push(handler);
    },

    onSocketMessage: (handler) => {
        socketMessageHandlers.push(handler);
    },

    socketEmit: (type, data) => {
        app.io.emit(type, data);
    },

});

await $.connect();

const routes = $.utils.flatten(service.routes);

app = await server(service.options, routes);

const { port } = app.options;

$.log(`Webserver running on port ${port}...`);

const addressesByInterface =  os.networkInterfaces();
for (const iface of Object.keys(addressesByInterface)) {
    const addresses = addressesByInterface [iface];
    for (const address of addresses) {
        if (address.family === 'IPv4') {
            $.log(`- http://${address.address}:${port}/`);
        } else if ((address.family === 'IPv6') && (address.scopeid === 0)) {
            $.log(`- http://[${address.address}]:${port}/`);
        }
    }
}
