const { createReadStream } = require('fs');
const fs = require('fs/promises');
const path = require('path');

const {
    HeaderSet,
    VBusRecordingConverter,
} = $.vbus;


const config = $.getScriptConfig('vbus-logger', () => ({

    // Whether webserver API endpoints should be added to allow
    // interaction with this script.
    extendWebserver: false,

    // Filename pattern to store the recorded VBus data to.
    // Can contain placeholders supported by `utils.formatTimestamp`.
    filenamePattern: 'log/vbus/%Y/%Y%m%d.vbus',

    // Recording interval in milliseconds.
    interval: 10000,

}));

async function getData(options) {
    const { startTimestamp, endTimestamp, sieveInterval } = options;

    const step = Math.max(sieveInterval, 86400000);

    const outConverter = new VBusRecordingConverter();

    const outChunks = [];

    outConverter.on('readable', () => {
        let chunk;
        while ((chunk = outConverter.read()) != null) {
            outChunks.push(chunk);
        }
    });

    const headerSet = new HeaderSet();

    const inConverter = new VBusRecordingConverter();

    let lastTimestamp = null;

    inConverter.on('headerSet', hs => {
        headerSet.addHeaders(hs.getHeaders());
        headerSet.timestamp = hs.timestamp;

        const timestamp = +hs.timestamp;
        if (lastTimestamp == null) {
            lastTimestamp = timestamp;
        }

        const lastInterval = Math.floor(lastTimestamp / sieveInterval);
        const currentInterval = Math.floor(timestamp / sieveInterval);
        const intervalDiff = currentInterval - lastInterval;
        const intervalChanged = ((intervalDiff < -1) || (intervalDiff > 0));

        if (intervalChanged) {
            lastTimestamp = timestamp;
            outConverter.convertHeaderSet(headerSet);
        }
    });

    for (let timestamp = startTimestamp; timestamp <= endTimestamp; timestamp += step) {
        const filename = $.utils.formatTimestamp(timestamp, config.filenamePattern);

        try {
            const fileStream = createReadStream(filename);

            await new Promise((resolve, reject) => {
                fileStream.on('error', err => reject(err));

                fileStream.on('end', () => resolve());

                fileStream.pipe(inConverter, { end: false });
            });
        } catch (err) {
            if (err.code === 'ENOENT') {
                // nop
            } else {
                throw err;
            }
        }
    }

    await new Promise(resolve => inConverter.end(resolve));

    await outConverter.finish();

    return Buffer.concat(outChunks);
}

$.registerService('vbus-logger', {

    getData,

});

if (config.extendWebserver) {
    const webserver = await $.requireService('webserver');

    const { post } = webserver.server.router;
    const { status } = webserver.server.reply;

    async function handleV1GetData(ctx) {
        const buffer = await getData(ctx.data);
        return status(200).type('application/octet-stream').send(buffer);
    }

    webserver.routes.push([
        post('/vbus-logger/api/v1/get-data', handleV1GetData),
    ]);
}

await $.connect();

const interval = new $.utils.Interval(config.interval);

while (await interval.wait()) {
    const conv = new $.vbus.VBusRecordingConverter();

    const convEndPromise = new Promise((resolve, reject) => {
        conv.on('error', reject);
        conv.on('end', resolve);
    });

    const chunks = [];
    conv.on('readable', () => {
        let chunk;
        while ((chunk = conv.read()) != null) {
            chunks.push(chunk);
        }
    });

    const headerSet = $.getSortedHeaderSet();
    headerSet.timestamp = interval.getDate();

    conv.convertHeaderSet(headerSet);

    conv.finish();

    await convEndPromise;

    const buffer = Buffer.concat(chunks);

    const filename = interval.formatTimestamp(config.filenamePattern);

    const dirname = path.dirname(filename);
    await fs.mkdir(dirname, { recursive: true });

    let file;
    try {
        file = await fs.open(filename, 'a');

        await file.write(buffer);
    } finally {
        await file?.close();
    }
}
