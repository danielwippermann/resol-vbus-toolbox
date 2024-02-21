// ==========================================================================
// This script provides an example on how to run external controller logic
// over the RESOL VBus using a RESOL DeltaSol MX as the physical controller.
//
// This script makes use of the `em-simulator` service, which simulates an
// extension module allowing to send simulated resistor values to the
// controller which then in turn switches a real relay based on the value
// of such a simulated sensor.
//
// The script performs some initial setup and then starts two tasks that
// run indefinitely:
//
// 1. A task that (after an initial wait) runs the custom controller logic
//    once per second and afterwards converts the virtual relay information
//    into simulated extension module sensor values in order to transfer
//    them to the physical controller at the next occassion.
//
// 2. An optional task that regularly fetches values from the RESOL DeltaSol
//    MX controller in order to use those values in the custom controller
//    logic. The most recent values are stored in the `values` object.
//
// You can run this script by passing its filename as one of the `--script`
// arguments to the `resol-vbus-toolbox` script:
//
// ```
// bin/resol-vbus-toolbox \
//     <connection options> \
//     --script scripts/custom-controller-mx.js \
//     --script scripts/em-simulator.js \
// ```
//
// See `bin/resol-vbus-toolbox --help` for details about connection options.
//
// Some manual configuration of the RESOL DeltaSol MX controller is needed
// to make this work:
//
// - All simulated extension modules must be enabled by checking their
//   checkbox under "Main menu" / "Inputs/Modules" / "Modules".
// - Each virtual sensor must be bound to switch a real relay. The easiest
//   way to achieve this is to add one optional function of type `Function
//   block` per virtual relay. Those function blocks need to be configured
//   to use a simulated extension module sensor for "Thermostat a".
//
// The example configuration in this script provides 6 virtual relays by
// simulating an extension module nr 5 and its 6 sensors. The initial
// manual configuration would look like this:
//
// - Run this script in order to start simulating the extension module.
// - Go to the controller's main menu
// - Go into the "User code" menu and enter the appropriate code
// - Go into the "Inputs/Modules" menu
// - Go into the "Modules" menu
// - Make sure that the checkbox before "Module 5" is checked. If it is not
//   checked yet, check it now and make sure, that the confirmation message
//   reads "Module available". If the message reads "Module not avail."
//   please make sure that this script is running and has a good VBus
//   connection.
// - Use "back" to go into the main menu
// - Go into "Arrangement"
// - Go into "Opt. functions"
// - Go into "Add new function..."
// - Select "Function block <optional number>"
// - Make sure the suggested relay is correct
// - Enable the "Thermostat a" option
// - Go to "Sensor" three lines below "Thermostat a"
// - Select "M5-S1"
// - Use "Save function"
// - Repeat adding five other new function blocks for each of the other
//   simulated extension module sensors
// - Well done!
// ==========================================================================

// The `values` object is a key-value storage of the most recent values
// received by either passively listening to incoming VBus protocol version
// 1.0 packets or actively fetching them from task 2 described above.
// The `valueConfigurations` array below contains all supported values.
// The `id` entries of the `valueConfigurations` elements is used as the
// key for the `values` object. E.g. if one of the `valueConfigurations`
// elements has an `id` of `"sensorS1"` you can access its most recent value
// using `values.sensorS1`.
const values = {};

// This function is the heart of the custom controller logic. It gets
// called once per second and has access to the `values` object above.
// The objective of this function is to calculate and set values to the
// `virtualRelais<number>` members of the `values` object. Those
// `virtualRelais<number>` values are then converted into resistor values
// of the simulated extension module.
//
// This function must not be `async` and hence must not use `await`!
//
// Instead of using `await $.delay(...)` something like a state machine
// needs to be implemented that tracks passing of time over the course
// of multiple calls to this function!
function runCustomLogic() {
    $.log('Running custom logic:', new Date(), values);

    if (values.sensorS12 < 55) {
        if (values.sensorS15 > values.sensorS12) {
            values.virtualRelais1 = 100;
        }
    } else if (values.sensorS12 > 65) {
        values.virtualRelais1 = 0;
    }

    if (values.sensorS4 < 27.5) {
        if ((values.sensorS9 + 5) > values.sensorS10) {
            values.virtualRelais2 = 100;
        }
    }

    // ... and so on ...

    //-------------------------------------------------
    // Example for a time-related function using a FSM
    // without using `async` or `await $.delay(...)`
    //-------------------------------------------------

    // Initialize FSM during first run
    if (values.exampleFsm == null) {
        values.exampleFsm = {
            state: 0,
            timer: 0,
        };
    }
    const fsm = values.exampleFsm;

    // Increment the timer (up to a certain cap)
    if (fsm.timer < 10000) {
        fsm.timer += 1;
    }

    // Protect against endless loop by limiting to 10 rounds
    for (let rounds = 0; rounds < 10; rounds++) {
        // Set `nextState` to perform a transition
        let nextState = null;
        if (fsm.state === 0) {
            // State 0:
            // - Waiting for S12 to reach 60 °C => State = 1
            // - Until then keep virtual relays 4 and 5 inactive
            if (values.sensorS12 >= 60) {
                nextState = 1;
            } else {
                values.virtualRelais4 = 0;
                values.virtualRelais5 = 0;
            }
        } else if (fsm.state === 1) {
            // State 1:
            // - Wait for 3 seconds => State = 2
            // - Until then keep virtual relay 4 active
            if (fsm.timer >= 3) {
                nextState = 2;
            } else {
                values.virtualRelais4 = 100;
                values.virtualRelais5 = 0;
            }
        } else if (fsm.state === 2) {
            // State 2:
            // - Waiting for S12 to fall below 55 °C => State = 0
            // - Until then keep virtual relay 5 active
            if (values.sensorS12 <= 55) {
                nextState = 0;
            } else {
                values.virtualRelais4 = 0;
                values.virtualRelais5 = 100;
            }
        } else {
            // Invalid state:
            // - Reset => State = 0
            nextState = 0;
        }

        if (nextState != null) {
            fsm.state = nextState;
            fsm.timer = 0;
        } else {
            // exit loop early if no transition happened
            break;
        }
    }
}

// The `valueConfigurations` is used to populate the `values` object above.
// Elements of this array can define three kinds of values:
//
// 1. Values received by passively listening to incoming VBus protocol
//    version 1.0 packets. Those values have a `packetFieldId` configuration
//    property. Detail about those packet field IDs can be found at:
//
//        https://danielwippermann.github.io/resol-vbus/#/vsf
//
// 2. Values received by actively fetching them from the controller using
//    VBus protocol version 2.0 datagrams. Those values have a `valueIdHash`
//    or `valueIndex` configuration property.
//
// 3. Virtual relay values which are set by the custom controller logic.
//    Those values have a `simulatedEm` configuration property.
const valueConfigurations = [{
    id: 'sensorS1',
    packetFieldId: '01_0010_7E11_10_0100_000_2_0',
}, {
    id: 'sensorS2',
    packetFieldId: '01_0010_7E11_10_0100_002_2_0',
}, {
    id: 'sensorS3',
    packetFieldId: '01_0010_7E11_10_0100_004_2_0',
}, {
    id: 'sensorS4',
    packetFieldId: '01_0010_7E11_10_0100_006_2_0',
}, {
    id: 'sensorS5',
    packetFieldId: '01_0010_7E11_10_0100_008_2_0',
}, {
    id: 'sensorS6',
    packetFieldId: '01_0010_7E11_10_0100_010_2_0',
}, {
    id: 'sensorS7',
    packetFieldId: '01_0010_7E11_10_0100_012_2_0',
}, {
    id: 'sensorS8',
    packetFieldId: '01_0010_7E11_10_0100_014_2_0',
}, {
    id: 'sensorS9',
    packetFieldId: '01_0010_7E11_10_0100_016_2_0',
}, {
    id: 'sensorS10',
    packetFieldId: '01_0010_7E11_10_0100_018_2_0',
}, {
    id: 'sensorS11',
    packetFieldId: '01_0010_7E11_10_0100_020_2_0',
}, {
    id: 'sensorS12',
    packetFieldId: '01_0010_7E11_10_0100_022_2_0',
}, {
    id: 'sensorS13',
    packetFieldId: '01_0010_7E11_10_0100_024_2_0',
}, {
    id: 'sensorS14',
    packetFieldId: '01_0010_7E11_10_0100_026_2_0',
}, {
    id: 'sensorS15',
    packetFieldId: '01_0010_7E11_10_0100_028_2_0',
}, {
    id: 'sensorS17',
    packetFieldId: '01_0010_7E11_10_0100_032_2_0',
}, {
    id: 'sensorS18',
    packetFieldId: '01_0010_7E11_10_0100_034_2_0',
}, {
    id: 'sensorS19',
    packetFieldId: '01_0010_7E11_10_0100_036_2_0',
}, {
    id: 'sensorS20',
    packetFieldId: '01_0010_7E11_10_0100_038_2_0',
}, {
    id: 'relaisR1',
    packetFieldId: '01_0010_7E11_10_0100_076_1_0',
}, {
    id: 'relaisR2',
    packetFieldId: '01_0010_7E11_10_0100_077_1_0',
}, {
    id: 'relaisR3',
    packetFieldId: '01_0010_7E11_10_0100_078_1_0',
}, {
    id: 'relaisR4',
    packetFieldId: '01_0010_7E11_10_0100_079_1_0',
}, {
    id: 'relaisR5',
    packetFieldId: '01_0010_7E11_10_0100_080_1_0',
}, {
    id: 'relaisR6',
    packetFieldId: '01_0010_7E11_10_0100_081_1_0',
}, {
    id: 'relaisR7',
    packetFieldId: '01_0010_7E11_10_0100_082_1_0',
}, {
    id: 'relaisR8',
    packetFieldId: '01_0010_7E11_10_0100_083_1_0',
}, {
    id: 'relaisR9',
    packetFieldId: '01_0010_7E11_10_0100_084_1_0',
}, {
    id: 'relaisR10',
    packetFieldId: '01_0010_7E11_10_0100_085_1_0',
}, {
    id: 'relaisR11',
    packetFieldId: '01_0010_7E11_10_0100_086_1_0',
}, {
    id: 'relaisR12',
    packetFieldId: '01_0010_7E11_10_0100_087_1_0',
}, {
    id: 'relaisR13',
    packetFieldId: '01_0010_7E11_10_0100_088_1_0',
}, {
    id: 'relaisR14',
    packetFieldId: '01_0010_7E11_10_0100_089_1_0',
}, {
    id: 'outputA1',
    packetFieldId: '01_0010_7E11_10_0100_100_1_0',
}, {
    id: 'outputA2',
    packetFieldId: '01_0010_7E11_10_0100_101_1_0',
}, {
    id: 'outputA3',
    packetFieldId: '01_0010_7E11_10_0100_102_1_0',
}, {
    id: 'outputA4',
    packetFieldId: '01_0010_7E11_10_0100_103_1_0',
}, {
    id: 'sensorM1S1',
    packetFieldId: '01_0010_7E41_10_0100_000_2_0',
}, {
    id: 'sensorM1S2',
    packetFieldId: '01_0010_7E41_10_0100_002_2_0',
}, {
    id: 'sensorM1S3',
    packetFieldId: '01_0010_7E41_10_0100_004_2_0',
}, {
    id: 'sensorM1S4',
    packetFieldId: '01_0010_7E41_10_0100_006_2_0',
}, {
    id: 'sensorM1S5',
    packetFieldId: '01_0010_7E41_10_0100_008_2_0',
}, {
    id: 'sensorM1S6',
    packetFieldId: '01_0010_7E41_10_0100_010_2_0',
}, {
    id: 'relaisM1R1',
    packetFieldId: '01_0010_7E41_10_0100_012_1_0',
}, {
    id: 'relaisM1R2',
    packetFieldId: '01_0010_7E41_10_0100_013_1_0',
}, {
    id: 'relaisM1R3',
    packetFieldId: '01_0010_7E41_10_0100_014_1_0',
}, {
    id: 'relaisM1R4',
    packetFieldId: '01_0010_7E41_10_0100_015_1_0',
}, {
    id: 'relaisM1R5',
    packetFieldId: '01_0010_7E41_10_0100_016_1_0',
}, {
    id: 'sensorM2S1',
    packetFieldId: '01_0010_7E42_10_0100_000_2_0',
}, {
    id: 'sensorM2S2',
    packetFieldId: '01_0010_7E42_10_0100_002_2_0',
}, {
    id: 'sensorM2S3',
    packetFieldId: '01_0010_7E42_10_0100_004_2_0',
}, {
    id: 'sensorM2S4',
    packetFieldId: '01_0010_7E42_10_0100_006_2_0',
}, {
    id: 'sensorM2S5',
    packetFieldId: '01_0010_7E42_10_0100_008_2_0',
}, {
    id: 'sensorM2S6',
    packetFieldId: '01_0010_7E42_10_0100_010_2_0',
}, {
    id: 'relaisM2R1',
    packetFieldId: '01_0010_7E42_10_0100_012_1_0',
}, {
    id: 'relaisM2R2',
    packetFieldId: '01_0010_7E42_10_0100_013_1_0',
}, {
    id: 'relaisM2R3',
    packetFieldId: '01_0010_7E42_10_0100_014_1_0',
}, {
    id: 'relaisM2R4',
    packetFieldId: '01_0010_7E42_10_0100_015_1_0',
}, {
    id: 'relaisM2R5',
    packetFieldId: '01_0010_7E42_10_0100_016_1_0',
}, {
    id: 'virtualRelais1',
    simulatedEm: {
        moduleNr: 5,
        sensorNr: 1,
    },
}, {
    id: 'virtualRelais2',
    simulatedEm: {
        moduleNr: 5,
        sensorNr: 2,
    },
}, {
    id: 'virtualRelais3',
    simulatedEm: {
        moduleNr: 5,
        sensorNr: 3,
    },
}, {
    id: 'virtualRelais4',
    simulatedEm: {
        moduleNr: 5,
        sensorNr: 4,
    },
}, {
    id: 'virtualRelais5',
    simulatedEm: {
        moduleNr: 5,
        sensorNr: 5,
    },
}, {
    id: 'virtualRelais6',
    simulatedEm: {
        moduleNr: 5,
        sensorNr: 6,
    },
}];

// A helper function use to print detailed tracing information
function trace(...args) {
    // $.log(...args);
}

// Initialize all `values` with `null`
for (const config of valueConfigurations) {
    values [config.id] = null;
}

// Determine whether the value synchronization task is needed
let needsValueSynchronizationTask = false;
for (const config of valueConfigurations) {
    if (config.valueIdHash || config.valueIndex) {
        needsValueSynchronizationTask = true;
    }
}

// Subscribe to incoming packets
$.on('packet', packet => {
    trace('@packet', packet.getId());

    const packetFields = $.specification.getPacketFieldsForHeaders([ packet ]);
    for (const config of valueConfigurations) {
        if (config.packetFieldId) {
            const packetField = packetFields.find(packetField => packetField.id === config.packetFieldId);
            if (packetField) {
                values [config.id] = packetField.rawValue;
            }
        }
    }
});

// Subscribe to incoming datagrams
$.on('datagram', dgram => {
    trace('@datagram', dgram.getId());
});

// Require the `em-simulator` service
const emSimulatorService = await $.requireService('em-simulator');

// Enable all simulated extension modules used by elements of the
// `valueConfigurations` array above.
const enabledModuleNrsSet = new Set();
for (const config of valueConfigurations) {
    if (config.simulatedEm) {
        enabledModuleNrsSet.add(config.simulatedEm.moduleNr);
    }
}

for (const moduleNr of enabledModuleNrsSet.values()) {
    emSimulatorService.setEnabled(moduleNr, true);
}

// Connect to the VBus data source and start receiving packets
// and other values
await $.connect();

function convertVirtualRelaisToSensorValues() {
    for (const config of valueConfigurations) {
        if (config.simulatedEm) {
            const { moduleNr, sensorNr } = config.simulatedEm;
            const value = values [config.id];
            emSimulatorService.setSensorValue(moduleNr, sensorNr, value ? 1000 : 1500);
        }
    }
}

// This first parallel task is responsible for running the custom
// controller logic once per second.
async function runCustomLogicTask() {
    $.log('Waiting for settled header set before starting custom logic...');

    // wait for the header set to settle
    await $.waitForSettledHeaderSet();

    $.log('Starting custom logic...');

    function runCustomLogicLoop() {
        try {
            runCustomLogic(values);
            convertVirtualRelaisToSensorValues();
        } catch (err) {
            console.error(err);
        }
        rescheduleCustomLogicLoop();
    }

    function rescheduleCustomLogicLoop() {
        setTimeout(runCustomLogicLoop, 1000 - (Date.now() % 1000));
    }

    rescheduleCustomLogicLoop();
}

// This second (but optional) parallel task is responsible to regularly
// fetch all values that have a `valueIdHash` configuration property.
async function runValueSynchronisationTask() {
    if (!needsValueSynchronizationTask) {
        return;
    }

    while (true) {
        // Wait for the controller to offer VBus control
        trace('[Task2]: Waiting for free bus...');
        const dgram1 = await $.waitForFreeBus();
        if (dgram1) {
            // Remember the controller's address
            const peerAddress = dgram1.sourceAddress;

            // Fetch the controller's changeset ID (internal SW version)
            trace('[Task2]: Getting changeset ID...');
            const dgram2 = await $.getValueById(peerAddress, 0);
            if (dgram2) {
                const changesetId = dgram2.value;

                // Forget all cached value indices if the changeset ID
                // differs (e.g. because a firmware update was applied
                // to the controller while running this script)
                let needsResync = false;
                for (const config of valueConfigurations) {
                    if (!config.valueIdHash && !config.valueIndex) {
                        // not a datagram-based value, skip
                        continue;
                    } else if (!config.valueIdHash && config.valueIndex) {
                        // uses hard-coded value index, skip
                        continue;
                    }

                    // forget cached value index if changeset ID differs
                    if (config.valueIdHash && (config.changesetId !== changesetId)) {
                        config.changesetId = changesetId;
                        config.valueIndex = null;
                    }

                    if (config.valueIdHash && (config.valueIndex == null)) {
                        needsResync = true;

                        trace('[Task2]: Getting value index by value ID hash...');
                        const dgram3 = await $.getValueIdByIdHash(peerAddress, config.valueIdHash);
                        if (dgram3) {
                            config.valueIndex = dgram3.valueIndex;
                        } else {
                            config.valueIndex = 0;
                        }
                    }
                }

                if (needsResync) {
                    trace('[Task2]: Resyncing...');
                    await $.getValueById(peerAddress, 0);
                }
            }

            // Fetch current values
            for (const config of valueConfigurations) {
                if (config.valueIndex) {
                    trace('[Task2]: Getting value by value index...');
                    const dgram3 = await $.getValueById(peerAddress, config.valueIndex);
                    if (dgram3) {
                        const storeFactor = config.storeFactor || 1.0;
                        values [config.id] = dgram3.value * storeFactor;
                    }
                }
            }

            // Return bus control back to the physical controller
            trace('[Task2]: Releasing bus...');
            await $.releaseBus(peerAddress);
        }
    }
}

// Run both tasks in parallel
Promise.all([
    runCustomLogicTask(),
    runValueSynchronisationTask(),
]);
