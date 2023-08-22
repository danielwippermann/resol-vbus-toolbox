$.on('packet', packet => {
    console.log(packet.getId());
});

await $.connect();
