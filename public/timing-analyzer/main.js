const elCanvas = document.getElementById('canvas');

const items = [];

function redraw() {
    const { width, height } = elCanvas;

    const ctx = elCanvas.getContext('2d');
    ctx.clearRect(-1, -1, width + 2, height + 2);

    let baseTimestamp = null;
    let y = 10;

    const scale = 0.5;
    function timestampToXCoord(timestamp) {
        return Math.round((timestamp - baseTimestamp) * scale) + 10;
    }

    function drawSeparators() {
        let timestamp = 200;
        while (true) {
            const x = timestampToXCoord(timestamp);
            if (x >= width) {
                break;
            }

            if ((timestamp % 1000) === 0) {
                ctx.strokeStyle = '#000';
            } else {
                ctx.strokeStyle = '#ccc';
            }
            ctx.strokeRect(x, -1, 1, height + 2);

            timestamp += 200;
        }
    }

    drawSeparators();

    const itemHeight = 32;

    const rowIndices = [];

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
        const { id, color, isStartOfSequence, startTimestamp, endTimestamp } = items [itemIndex];

        if (isStartOfSequence && (baseTimestamp != null)) {
            const tmpX = timestampToXCoord(startTimestamp);
            ctx.fillStyle = '#000';
            ctx.fillRect(tmpX, y + 20, 10, 10);

            baseTimestamp = null;
            y += 50;

            rowIndices.push(itemIndex);
        }

        if (baseTimestamp == null) {
            baseTimestamp = startTimestamp;
        }

        const itemStartX = timestampToXCoord(startTimestamp);
        const itemEndX = timestampToXCoord(endTimestamp);

        ctx.fillStyle = `rgb(from ${color} r g b / 0.5)`;
        ctx.fillRect(itemStartX, y, itemEndX - itemStartX, itemHeight);
        ctx.strokeStyle = color;
        ctx.strokeRect(itemStartX, y, itemEndX - itemStartX, itemHeight);
    }

    if (y + itemHeight >= height) {
        items.splice(0, rowIndices [0]);
    }
}

function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight - 10;

    elCanvas.width = width;
    elCanvas.height = height;
    elCanvas.style = `width: ${width}px; height: ${height}px;`;

    redraw();
}

addEventListener('resize', () => {
    resize();
});

resize();

const url = `ws://${window.location.host}/`;
const socket = new io(url, {
    path: '/websocket'
});

socket.on('timing-analyzer-item', data => {
    const item = JSON.parse(data);
    items.push(item);
    redraw();
});

socket.on('connect', () => {
    console.log('connect');
});

socket.on('message', () => {
    console.log('message', message);
});
