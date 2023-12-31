const fs = require('fs/promises');
const path = require('path');

const config = $.getScriptConfig('text-logger', () => ({

    // The interval in milliseconds.
    interval: 10000,

    // The filename pattern.
    filenamePattern: 'log/text/%Y%m%d.csv',

    columnSeparator: '\t',

    lineSeparator: '\r\n',

    // The column title for the "Date / Time" column.
    dateTimeTitle: 'Date / Time',

    // The format pattern for the "Date / Time" column.
    dateTimeFormat: '%d.%m.%Y %H:%M:%S',

    // A map from packet-field-ID to column title.
    packetFieldTitleById: {
        '00_0010_7E11_10_0100_000_2_0': 'Temperature collector',
    },

}));

await $.connect();

await $.waitForSettledHeaderSet();

const interval = new $.utils.Interval(config.interval);

let lastTopologyId = null;

while (await interval.wait()) {
    const filename = interval.formatTimestamp(config.filenamePattern);

    const dirname = path.dirname(filename);
    await fs.mkdir(dirname, { recursive: true });

    let file;
    try {
        let needsHeaders = false;
        try {
            file = await fs.open(filename, 'wx');
            needsHeaders = true;
        } catch (err) {
            if (err.code === 'EEXIST') {
                file = await fs.open(filename, 'a');
            } else {
                throw err;
            }
        }

        const packets = $.getSortedPackets();

        const topologyId = packets.map(packet => packet.getId()).join(',');
        if (lastTopologyId !== topologyId) {
            lastTopologyId = topologyId;
            needsHeaders = true;
        }

        const packetFields = $.specification.getPacketFieldsForHeaders(packets);

        const colSep = config.columnSeparator;
        const lineSep = config.lineSeparator;
        const output = [];

        if (needsHeaders) {
            // Header line 1: Packet names

            let lastPacketId = null;
            for (const packetField of packetFields) {
                output.push(colSep);

                const packetId = packetField.packetSpec.id;
                if (lastPacketId !== packetId) {
                    lastPacketId = packetId;
                    output.push(packetField.packetSpec.fullName);
                }
            }

            output.push(lineSep);

            // Header line 2: Field names
            output.push(config.dateTimeTitle);

            for (const packetField of packetFields) {
                const name = config.packetFieldTitleById [packetField.id] || packetField.name;

                output.push(colSep);
                output.push(name);
            }

            output.push(lineSep);
        }

        // Values line
        output.push(interval.formatTimestamp(config.dateTimeFormat));

        for (const packetField of packetFields) {
            output.push(colSep);
            output.push(packetField.formatTextValue('None'));
        }

        output.push(lineSep);

        await file.write(output.join(''));
    } finally {
        await file?.close();
    }
}
