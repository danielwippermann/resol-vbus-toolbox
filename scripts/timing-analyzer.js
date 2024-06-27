const crypto = require('crypto');

const {
    Connection,
    HeaderSet,
} = $.vbus;

const config = $.getScriptConfig('timing-analyzer', () => ({

    itemColorById: {},

    getItemColorById: null,

}));

const headerSet = new HeaderSet();

function getItemColorById(id) {
    let color;
    if (/^.._...._...._20_0500_0000_00000000$/.test(id)) {
        color = '#f00';
    } else if (/^.._...._...._20_0600_0000_00000000$/.test(id)) {
        color = '#0f0';
    } else if (/^.._...._...._10_....$/.test(id)) {
        const ids = headerSet.getSortedHeaders().map(header => header.getId());
        const index = ids.indexOf(id);
        const degrees = (120 + index * 50) % 360;
        const saturation = Math.max(50 - index * 2, 10);
        color = `hsl(${degrees}, ${saturation}%, 50%)`;
    } else {
        const hash = crypto.createHash('sha256');
        hash.update(id);
        const buffer = hash.digest();
        const degrees = Math.round(buffer [0] / 256 * 360);
        color = `hsl(${degrees}, 33%, 50%)`;
    }
    return color;
}

$.registerService('timing-analyzer', {

    config,

    headerSet,

    getItemColorById,

});

const webserver = await $.requireService('webserver');

webserver.onSocketMessage(message => {
    console.log('MESSAGE', message);
});

const baudrate = 9600;
const msPerByte = 10000 / baudrate;

let currentSegment = null;
let currentChunk = null;

function commitChunk() {
    if (currentChunk != null) {
        if (currentSegment == null) {
            currentSegment = {
                byteCount: 0,
                startTimestamp: currentChunk.startTimestamp,
                endTimestamp: null,
                chunks: [],
            };
        }

        currentSegment.byteCount += currentChunk.byteCount;
        currentSegment.endTimestamp = currentChunk.endTimestamp;
        currentSegment.chunks.push(currentChunk);

        currentChunk = null;
    }
}

function commitSegment() {
    commitChunk();

    console.log(currentSegment);

    let segment;
    if (currentSegment != null) {
        segment = currentSegment;
        currentSegment = null;
    }

    return segment;
}

function hex(value, max) {
    if (value < 0) {
        value += max + 1;
    }
    const digits = max.toString(16).length;
    return value.toString(16).padStart(digits, '0');
}

function emitItem(id, segment, options = {}) {
    let color = null;
    if ((color == null) && config.itemColorById) {
        color = config.itemColorById [id];
    }
    if ((color == null) && config.getItemColorById) {
        color = config.getItemColorById(id);
    }
    if (color == null) {
        color = getItemColorById(id);
    }

    // const simplifiedSegments = segments.map(segment => {
    //     const { startTimestamp, endTimestamp, buffer, chunks } = segment;
    //     const simplifiedChunks = chunks.map(chunk => {
    //         const { startTimestamp, endTimestamp, buffer } = chunk;
    //         return {
    //             startTimestamp,
    //             endTimestamp,
    //             bufferLength: buffer.length,
    //         };
    //     });
    //     return {
    //         startTimestamp,
    //         endTimestamp,
    //         bufferLength: buffer.length,
    //         chunks: simplifiedChunks,
    //     };
    // });

    webserver.socketEmit('timing-analyzer-item', JSON.stringify({
        id,
        color,
        startTimestamp: segment.chunks [0].startTimestamp,
        endTimestamp: segment.chunks [segment.chunks.length - 1].endTimestamp,
        // segments: simplifiedSegments,
        ...options,
    }));
}

const connection = new Connection();

connection.on('junkData', junkData => {
    // FIXME(daniel): emit item
});

connection.on('packet', packet => {
    headerSet.removeHeadersOlderThan(Date.now() - 10 * 60 * 1000);
    headerSet.addHeader(packet);

    const id = packet.getId();
    const isStartOfSequence = (headerSet.getSortedHeaders() [0].getId() === id);

    const segment = commitSegment();
    emitItem(id, segment, {
        isStartOfSequence,
    });
});

connection.on('datagram', dgram => {
    const segment = commitSegment();
    emitItem(`${dgram.getId().slice(0, 20)}_${hex(dgram.valueId, 0xFFFF)}_${hex(dgram.value, 0xFFFFFFFF)}`, segment);
});

$.on('rawData', (chunk, timestamp) => {
    const chunkEndTimestamp = +timestamp;

    for (let idx = 0; idx < chunk.length; idx++) {
        const byteStartTimestamp = chunkEndTimestamp - (chunk.length - idx) * msPerByte;
        const byteEndTimestamp = chunkEndTimestamp - (chunk.length - idx - 1) * msPerByte;

        if ((currentChunk != null) && ((byteStartTimestamp - currentChunk.endTimestamp) > 10)) {
            commitChunk();
        }

        if (currentChunk == null) {
            currentChunk = {
                byteCount: 0,
                // bytes: [],
                // byteStartTimestamps: [],
                // byteEndTimestamps: [],
                startTimestamp: byteStartTimestamp,
                endTimestamp: null,
            };
        }

        currentChunk.byteCount += 1;
        // currentChunk.bytes.push(chunk [idx]);
        // currentChunk.byteStartTimestamps.push(byteStartTimestamp);
        // currentChunk.byteEndTimestamps.push(byteEndTimestamp);
        currentChunk.endTimestamp = byteEndTimestamp;

        connection.write(chunk.slice(idx, idx + 1));
    }
});

await $.connect();
