/// Starts a webserver.
///
/// Other scripts can extend that webserver by adding routes or extending the
/// configuration.

const os = require('os');

const server = require('server');


const config = $.getScriptConfig('webserver', () => ({

    options: {

        security: false,

    },

    routes: [],

}));

const service = $.registerService('webserver', {

    server,

    options: config.options,

    routes: config.routes,

});

await $.connect();

const app = await server(service.options, $.utils.flatten(service.routes));

const port = app.options.port;

$.log(`Webserver running on port ${port}...`);

const addressesByInterface =  os.networkInterfaces();
for (const interface of Object.keys(addressesByInterface)) {
    const addresses = addressesByInterface [interface];
    for (const address of addresses) {
        if (address.family === 'IPv4') {
            $.log(`- http://${address.address}:${port}/`);
        } else if ((address.family === 'IPv6') && (address.scopeid === 0)) {
            $.log(`- http://[${address.address}]:${port}/`);
        }
    }
}
