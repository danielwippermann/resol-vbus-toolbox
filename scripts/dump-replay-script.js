/// Dump incoming VBus traffic into a textual form which then can be used
/// as a resol-vbus-toolbox script to replay that same VBus traffic.

const process = require('process');


function print(...args) {
    process.stdout.write($.utils.flatten(args, '').join('\n'));
}

print([
    'await $.connect();',
    '',
]);

// let lastRawDataTimestamp = null;

// $.on('rawData', chunk => {
//     const now = Date.now();
//     const diff = (lastRawDataTimestamp != null) ? (now - lastRawDataTimestamp) : null;
//     lastRawDataTimestamp = now;

//     print([
//         (diff != null) ? [
//             `// await $.delay(${diff});`,
//             '',
//         ] : [],
//         `// await $.send(Buffer.from('${chunk.toString('hex')}', 'hex'));`,
//         '',
//     ]);
// });

let lastTimestamp = null;

function getDelayStatement() {
    const now = Date.now();
    const diff = (lastTimestamp != null) ? (now - lastTimestamp) : null;
    lastTimestamp = now;

    const nowComment = `// ${new Date(now).toISOString()} / ${now}`;
    return (diff != null) ? [ `await $.delay(${diff});`, '', nowComment ] : [ nowComment ];
}

$.on('packet', packet => {
    const packetSpec = $.specification.getPacketSpecification(packet);

    const packetFields = $.specification.getPacketFieldsForHeaders([ packet ]);

    print([
        getDelayStatement(),
        'await $.send($.createPacket({',
        $.sprintf('    destinationAddress: 0x%04X,  // %s', packet.destinationAddress, packetSpec.destinationDevice.fullName),
        $.sprintf('    sourceAddress: 0x%04X,  // %s', packet.sourceAddress, packetSpec.sourceDevice.fullName),
        $.sprintf('    command: 0x%04X,', packet.command),
        $.sprintf('    frameCount: %d,', packet.frameCount),
        '    frameData: [',
        Array.from($.utils.iterateRange(0, packet.frameCount)).map(frameIndex => {
            const startOffset = frameIndex * 4;
            const endOffset = (frameIndex + 1) * 4;
            return `        '${packet.frameData.slice(startOffset, endOffset).toString('hex')}',  // Frame ${frameIndex}, offset ${startOffset}..${endOffset - 1}`;
        }),
        '    ],',
        '    // packetFieldRawValues: {',
        packetFields.map(packetField => {
            return `    //     '${packetField.id.slice(21)}': ${packetField.rawValue},  // ${packetField.name} [${packetField.packetFieldSpec.type.unit.unitText}]`;
        }),
        '    // },',
        '}));',
        '',
    ]);
});

$.on('datagram', dgram => {
    const destinationDeviceSpec = $.specification.getDeviceSpecification(dgram, 'destination');
    const sourceDeviceSpec = $.specification.getDeviceSpecification(dgram, 'source');

    print([
        getDelayStatement(),
        'await $.send($.createDatagram({',
        $.sprintf('    destinationAddress: 0x%04X,  // %s', dgram.destinationAddress, destinationDeviceSpec.fullName),
        $.sprintf('    sourceAddress: 0x%04X,  // %s', dgram.sourceAddress, sourceDeviceSpec.fullName),
        $.sprintf('    command: 0x%04X,', dgram.command),
        $.sprintf('    valueId: 0x%04X,  // %d', dgram.valueId, dgram.valueId),
        $.sprintf('    value: 0x%08X,  // %d', dgram.value, dgram.value),
        '}));',
        '',
    ]);
});

$.on('telegram', tgram => {
    const destinationDeviceSpec = $.specification.getDeviceSpecification(tgram, 'destination');
    const sourceDeviceSpec = $.specification.getDeviceSpecification(tgram, 'source');

    print([
        getDelayStatement(),
        'await $.send($.createTelegram({',
        $.sprintf('    destinationAddress: 0x%04X,  // %s', tgram.destinationAddress, destinationDeviceSpec.fullName),
        $.sprintf('    sourceAddress: 0x%04X,  // %s', tgram.sourceAddress, sourceDeviceSpec.fullName),
        $.sprintf('    command: 0x%02X,', tgram.command),
        '    frameData: [',
        Array.from($.utils.iterateRange(0, tgram.getFrameCount())).map(frameIndex => {
            const startOffset = frameIndex * 7;
            const endOffset = (frameIndex + 1) * 7;
            return `        '${tgram.frameData.slice(startOffset, endOffset).toString('hex')}',  // Frame ${frameIndex}, offset ${startOffset}..${endOffset - 1}`;
        }),
        '    ],',
        '}));',
        '',
    ]);
});

await $.connect();
