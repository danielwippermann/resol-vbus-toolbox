/// Dumps the current config object.

const util = require('util');


// NOTE(daniel): connecting waits for all loaded scripts to connect,
// improving chances for a complete config
await $.connect();

const configString = util.inspect($.config, {
    depth: null,
});

$.log(`Dump of current config:\nmodule.exports = ${configString};`);

await $.disconnect();
