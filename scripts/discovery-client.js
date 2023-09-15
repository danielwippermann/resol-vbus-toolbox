/// Discover RESOL devices (or simulations of them) connected to the local networks.
///
/// Example of a real device:
///
/// ```
/// ❯ bin/resol-vbus-toolbox --virtual --script scripts/discovery-client.js
/// 192.168.2.101: My-DL2Plus
/// fe80::xxxx:xxff:fexx:xxxx%en0: My-DL2Plus
/// ```
///
/// Example of a simulated device running within resol-vbus-toolbox:
///
/// ```
/// ❯ bin/resol-vbus-toolbox --virtual --script scripts/discovery-client.js --script scripts/discovery-service.js --script scripts/webserver.js
/// [scripts/webserver.js] Webserver running on port 3000...
/// [scripts/webserver.js] - http://127.0.0.1:3000/
/// [scripts/webserver.js] - http://[::1]:3000/
/// [scripts/webserver.js] - http://192.168.2.100:3000/
/// 192.168.2.100: DL2-001E66000000
/// fe80::1%lo0: DL2-001E66000000
/// ```

const os = require('os');


await $.connect();

const { TcpDataSourceProvider } = $.vbus;

const promises = [
    TcpDataSourceProvider.discoverDevices(),
];

const ifaceMap = os.networkInterfaces();
const ifaceNames = Object.getOwnPropertyNames(ifaceMap);

for (const ifaceName of ifaceNames) {
    const addresses = ifaceMap [ifaceName];
    const hasIPv6 = addresses.some(address => address.family === 'IPv6');
    if (hasIPv6) {
        const promise = TcpDataSourceProvider.discoverDevices({
            ipv6: true,
            broadcastInterface: ifaceName,
        });

        promises.push(promise);
    }
}

const allDevices = [];
for (const promise of promises) {
    const devices = await promise;
    for (const device of devices) {
        allDevices.push(device);
    }
}

allDevices.sort((l, r) => {
    if (l.name < r.name) {
        return -1;
    } else if (l.name > r.name) {
        return 1;
    } else if (l.__address__ < r.__address__) {
        return -1;
    } else if (l.__address__ > r.__address__) {
        return 1;
    } else {
        return 0;
    }
});

for (const device of allDevices) {
    console.log(`${device.__address__}: ${device.name}`);
}

await $.disconnect();
