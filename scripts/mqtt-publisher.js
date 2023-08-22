const mqtt = require('mqtt');

const config = $.getScriptConfig('mqtt-publisher', () => ({

    // URL to connect to the MQTT broker.
    url: 'mqtt://127.0.0.1',

    // Publish interval in milliseconds.
    interval: 10000,

    // Determines whether all values or just changed values will be published
    // when the interval elapses.
    valueChangesOnly: false,

    // The MQTT topic to publish values to. "%P" serves as a placeholder for
    // the packet field ID.
    valueTopicPattern: 'resol-vbus/%P',

    // An optional array of packet field IDs to publish. Will publish all
    // packet fields if `null`.
    //
    // Example:
    //
    // packetFieldIds: [
    //     '00_0010_7E11_10_0100_000_2_0',
    // ],
    packetFieldIds: null,

}));

const client = await mqtt.connectAsync(config.url);

await $.connect();

await $.waitForSettledHeaderSet();

const packetFieldValueMap = new Map();

const interval = new $.utils.Interval(config.interval);

while (await interval.wait()) {
    const packets = $.getSortedPackets();

    const packetFields = $.specification.getPacketFieldsForHeaders(packets);

    for (const packetField of packetFields) {
        const packetFieldId = packetField.id;

        const currentValue = packetField.rawValue;

        let report = true;
        if (config.valueChangesOnly) {
            const previousValue = packetFieldValueMap.get(packetFieldId);
            if (previousValue !== currentValue) {
                packetFieldValueMap.set(packetFieldId, currentValue);
            } else {
                report = false;
            }
        }
        if (config.packetFieldIds) {
            if (!config.packetFieldIds.includes(packetFieldId)) {
                report = false;
            }
        }

        if (report) {
            const topic = config.valueTopicPattern.replaceAll('%P', packetFieldId);
            const message = `${currentValue}`;

            await client.publishAsync(topic, message);
        }
    }
}
