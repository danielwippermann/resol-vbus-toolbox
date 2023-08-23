# resol-vbus-toolbox

A scripting environment to interact with the RESOL VBus.


## Features

- Supports connecting to RESOL VBus using TCP/IP or serial port
- Supports scripting


## Setup

```
# Clone the repo
git clone https://github.com/danielwippermann/resol-vbus-toolbox

# Install dependencies
cd resol-vbus-toolbox
npm install

# Run it to check whether the setup was successful
bin/resol-vbus-toolbox --help
```


## Usage

```
❯ bin/resol-vbus-toolbox --help
USAGE: resol-vbus-toolbox <... options ...>

GENERAL OPTIONS:
  --help                   Print this usage message
  --config <FILENAME>      Load configuration from file
  --vsf <FILENAME>         Load VBus specification from file
  --script <FILENAME>      Load script from file (can be used more than once)
  --repl                   Start a Read-Eval-Print-Loop

TCP CONNECTION OPTIONS:
  --host <HOST>            IP address or host name to connect to
  --port <PORT>            Port number to connect to (default: 7053)
  --viaTag <VIATAG>        Via tag to connect to (only usable on VBus.net)
  --password <PASSWORD>    Password used to authenticate
  --channel <CHANNEL>      VBus channel to connect to

SERIAL PORT CONNECTION OPTIONS:
  --path <PATH>            Name of the serial port to connect to
```


### Choosing your connection

If you want to use a VBus-over-TCP device like a datalogger or communications
module, you can pass the `--host` and `--password` options as well as
optionally the `--port`, `--viaTag` and `--channel` options like in the
following example:

```
❯ bin/resol-vbus-toolbox --host 192.168.178.200 --password vbus <... other options ...>
```

If you want to use a serial-port-based VBus device like a VBus/USB adapter, you
can pass the `--path` option, like in the following example:

```
❯ bin/resol-vbus-toolbox --path /dev/tty.usbmodem101 <... other options ...>
```

If you do not want to connect to a real VBus topology you can choose the
virtual VBus that only exchanges traffic between the loaded scripts:

```
❯ bin/resol-vbus-toolbox --virtual <... other options ...>
```


### Loading scripts

Scripts can be loaded by passing their filenames on the command line using the
`--script` option:

```
❯ bin/resol-vbus-toolbox <... other options ...> --script script1.js --script script2.js
```

The `scripts` directory of this repo contains several example scripts to use:

- `scripts/discovery-client.js`: Discovers RESOL's LAN connected devices on local networks
- `scripts/discovery-service.js`: Provides service to allow being discovered
- `scripts/dump-config-file.js`: Dump current config as a template for a configuration file
- `scripts/dump-packet-fields.js`: Prints a list of known packet field IDs received over the VBus
- `scripts/dump-packet-ids.js`: Print a list of packet IDs received over the VBus
- `scripts/dump-replay-script.js`: Convert incoming VBus traffic to script for later replay
- `scripts/em-simulator.js`: Simulates extension modules (EM)
- `scripts/get-changeset-id.js`: Reads the changeset ID from the VBus controller
- `scripts/load-monitor.js`: Show the load on the VBus
- `scripts/mqtt-publisher.js`: Publish VBus values to MQTT
- `scripts/text-logger.js`: Log VBus values to text files
- `scripts/vbus-logger.js`: Log VBus packets to binary files
- `scripts/webserver.js`: Provide a webserver, can be extended by other scripts


### Using a configuration file

Most command line options can also be provided using a configuration file.

You can use the `dump-config-file.js` script to generate a config file template
based on your current command line options which is printed to standard output:

```
❯ bin/resol-vbus-toolbox <... other options ...> --script scripts/dump-config-file.js
[scripts/dump-config-file.js] Dump of current config:
module.exports = {
  connectionClassName: 'TcpConnection',
  connectionOptions: { host: '192.168.180.160', password: 'vbus' },
  vsfFilename: null,
  scriptFilenames: [ 'scripts/dump-config-file.js' ],
  repl: false,
  scriptConfigMap: {}
};
```

Copy that dumped config file template, store it in a dedicated file (in the
example below that is called `my-config-1.js`), edit it if necessary and then
run the tool just using the `--config <filename>` option:

```
❯ bin/resol-vbus-toolbox --config my-config-1.js <... other options ...>
```


## Contributors


## Legal Notices

RESOL, VBus, VBus.net and others are trademarks or registered trademarks
of RESOL - Elektronische Regelungen GmbH.

All other trademarks are the property of their respective owners.


## License

The MIT License (MIT)

Copyright (c) 2023-present, Daniel Wippermann.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
