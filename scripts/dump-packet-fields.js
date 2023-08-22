$.log('Connecting...');

await $.connect();

$.log('Connected, waiting for header set to settle...');

await $.waitForSettledHeaderSet();

$.log('Header set settled, disconnecting...');

await $.disconnect();


const output = [ 'List of packets and packet fields:' ];

const packets = $.getSortedPackets();
for (const packet of packets) {
    const packetSpec = $.specification.getPacketSpecification(packet);

    output.push(`${packetSpec.packetId}: ${packetSpec.fullName}`);

    const packetFields = $.specification.getPacketFieldsForHeaders([ packet ]);
    for (const packetField of packetFields) {
        output.push(`  - ${packetField.id}: ${packetField.name}`);
    }
}

$.log($.utils.flatten(output).join('\n'));
