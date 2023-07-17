/// Reads the device- and version-dependent changeset ID from the controller.

const { vbus, specification } = $;

const conn = await $.connect();

const dgram1 = await conn.waitForFreeBus();
if (dgram1) {
    const peerAddress = dgram1.sourceAddress;

    const peerDevice = $.specification.getDeviceSpecification(peerAddress, 0);

    $.log($.sprintf('Peer address: 0x%04X (%s)', peerAddress, peerDevice.fullName));

    const dgram2 = await conn.getValueById(peerAddress, 0);
    if (dgram2) {
        const changesetId = dgram2.value;

        $.log($.sprintf('Changeset ID: 0x%08X', changesetId));
    } else {
        $.log(`Unable to get changeset ID`);
    }

    await conn.releaseBus(peerAddress);
} else {
    $.log(`Unable to get peer address`);
}

await $.disconnect();
