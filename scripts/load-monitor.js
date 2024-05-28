const byteCountHistory = new Array(80);
let byteCountHistoryIndex = 0;

for (let i = 0; i < byteCountHistory.length; i++) {
    byteCountHistory [i] = null;
}

const packetInfoMap = new Map();

$.on('rawData', chunk => {
    byteCountHistory [byteCountHistoryIndex] += chunk.length;
});

$.on('packet', packet => {
    const packetId = packet.getId();
    if (!packetInfoMap.has(packetId)) {
        packetInfoMap.set(packetId, {
            packetCount: 0,
            byteCount: 0,
            activity: 0,
            lastTimestamp: null,
            lastInterval: null,
        });
    }

    const packetInfo = packetInfoMap.get(packetId);
    packetInfo.packetCount += 1;
    packetInfo.byteCount += packet.toLiveBuffer().length;
    packetInfo.activity = 8;
    if (packetInfo.lastTimestamp != null) {
        packetInfo.lastInterval = packet.timestamp - packetInfo.lastTimestamp;
    }
    packetInfo.lastTimestamp = packet.timestamp;
});

$.on('datagram', dgram => {

});

$.on('telegram', tgram => {

});

await $.connect();

const esc = '\x1b';

// Clear screen once
process.stdout.write(`${esc}[2J`);

const activityIndicators = [
    ' ',
    '\u2581',
    '\u2582',
    '\u2583',
    '\u2584',
    '\u2585',
    '\u2586',
    '\u2587',
    '\u2588',
];

setInterval(() => {
    const packets = $.getSortedPackets();

    let history = '';
    let loadSum = 0;
    let loadCount = 0;
    for (let i = 0; i < byteCountHistory.length; i++) {
        const byteCount = byteCountHistory [(byteCountHistoryIndex + 1 + i) % byteCountHistory.length];
        if (byteCount != null) {
            let activity = Math.round(byteCount / 24);
            if (activity > 8) {
                activity = 8;
            }
            history += activityIndicators [activity];
            loadSum += byteCount * 100;
            loadCount += 192;
        } else {
            history += ' ';
        }
    }

    const load = (loadCount > 0) ? (loadSum / loadCount) : 0;
    history += `   ${load.toFixed(2).padStart(6)}%`;

    const line = ''.padStart(80, '\u2550');

    const now = Date.now();

    const output = [
        `${esc}[1;1H${esc}[0J${esc}[1m${line.slice(0, 41)} PACKETS ${line.slice(0, 40)}${esc}[0m`,
        '',
        '  ID                       INTERVAL    COUNT    BYTES',
        packets.map(packet => {
            const packetId = packet.getId();
            const packetInfo = packetInfoMap.get(packetId);
            const indicator = activityIndicators [packetInfo.activity];
            const lastInterval = `${packetInfo.lastInterval ?? ''}`;
            const count = `${packetInfo.packetCount}`;
            const bytes = `${packetInfo.byteCount}`;
            const currentInterval = now - packetInfo.lastTimestamp;
            const isCurrent = packetInfo.lastInterval ? (currentInterval < packetInfo.lastInterval * 3) : true;
            const color = isCurrent ? `${esc}[0;97m` : `${esc}[0;37m`;
            return `${color}${indicator} ${packetId.padEnd(24)} ${lastInterval.padStart(8)} ${count.padStart(8)} ${bytes.padStart(8)}${esc}[0m`;
        }),
        '',
        '',
        `${esc}[1m${line.slice(0, 42)} LOAD ${line.slice(0, 42)}${esc}[0m`,
        '',
        history,
        '',
        '',
        '',
    ];

    process.stdout.write(output.flat(3).join('\n'));

    for (const packet of packets) {
        const packetId = packet.getId();
        const packetInfo = packetInfoMap.get(packetId);
        if (packetInfo) {
            if (packetInfo.activity > 0) {
                packetInfo.activity -= 1;
            }
        }
    }

    byteCountHistoryIndex = (byteCountHistoryIndex + 1) % byteCountHistory.length;
    byteCountHistory [byteCountHistoryIndex] = 0;
}, 200);
