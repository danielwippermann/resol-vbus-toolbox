/// Discover RESOL devices (or simulations of them) connected to the local networks.
///
/// Example of a real device:
///
/// ```
/// ❯ bin/resol-vbus-toolbox --virtual --script scripts/discovery-client.js
/// 192.168.2.101: My-DL2Plus
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
/// ```

await $.connect();

const { TcpDataSourceProvider } = $.vbus;

const devices = await TcpDataSourceProvider.discoverDevices();

for (const device of devices) {
    console.log(`${device.__address__}: ${device.name}`);
}

await $.disconnect();
