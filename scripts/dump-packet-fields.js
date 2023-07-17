const headerSet = new $.vbus.HeaderSet();

$.on('packet', packet => {
    $.log(packet.getId(), headerSet.getHeaderCount());
    headerSet.addHeader(packet);
});

await $.connect();

$.log('Connected');

await $.utils.waitForSettledHeaderSet(headerSet);

$.log('Disconnecting');

await $.disconnect();


const output = [ 'List of packets and packet fields:' ];

const packets = headerSet.getSortedHeaders();
for (const packet of packets) {
    const packetSpec = $.specification.getPacketSpecification(packet);

    output.push(`${packetSpec.packetId}: ${packetSpec.fullName}`);

    const packetFields = $.specification.getPacketFieldsForHeaders([ packet ]);
    for (const packetField of packetFields) {
        output.push(`  - ${packetField.id}: ${packetField.name}`);
    }
}

$.log($.utils.flatten(output).join('\n'));
