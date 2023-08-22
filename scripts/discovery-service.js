/// Provide basis RESOL LAN devices discoverability.
///
/// Example:
///
/// ```
/// ❯ bin/resol-vbus-toolbox --virtual --script scripts/discovery-client.js --script scripts/discovery-service.js --script scripts/webserver.js
/// [scripts/webserver.js] Webserver running on port 3000...
/// [scripts/webserver.js] - http://127.0.0.1:3000/
/// [scripts/webserver.js] - http://[::1]:3000/
/// [scripts/webserver.js] - http://192.168.2.100:3000/
/// 192.168.2.100: DL2-001E66000000
/// ```

const dgram = require('dgram');

const config = $.getScriptConfig('discovery-service', () => ({

    vendor: 'RESOL',

    product: 'DL2',

    serial: '001E66000000',

    version: '2.1.0',

    build: '201311280853',

    name: 'DL2-001E66000000',

    features: 'vbus,dl2',

}));

const webserver = await $.requireService('webserver');

const { get } = webserver.server.router;
const { status } = webserver.server.reply;

function escape(input) {
    return JSON.stringify(`${input}`);
}

const reply = [
    `vendor = ${escape(config.vendor)}`,
    `product = ${escape(config.product)}`,
    `serial = ${escape(config.serial)}`,
    `version = ${escape(config.version)}`,
    `build = ${escape(config.build)}`,
    `name = ${escape(config.name)}`,
    `features = ${escape(config.features)}`,
    '',
].join('\n');

function handleGetResolDeviceInformation(ctx) {
    return status(200).type('text/plain').send(reply);
}

webserver.routes.push([
    get('/cgi-bin/get_resol_device_information', handleGetResolDeviceInformation),
]);

const queryString = '---RESOL-BROADCAST-QUERY---';
const replyBuffer = Buffer.from('---RESOL-BROADCAST-REPLY---', 'utf-8');

function setupDiscoveryServer(discoveryServer) {
    discoveryServer.on('error', err => {
        console.error(err);
    });

    discoveryServer.on('message', (msg, remote) => {
        // console.log('message', msg, remote);

        let msgString = msg.toString('utf-8');
        if (msgString === queryString) {
            discoveryServer.send(replyBuffer, remote.port, remote.address);
        }
    });

    discoveryServer.bind(7053);
}

const discoveryServer4 = dgram.createSocket('udp4');
setupDiscoveryServer(discoveryServer4);

const discoveryServer6 = dgram.createSocket('udp6');
setupDiscoveryServer(discoveryServer6);

await $.connect();
