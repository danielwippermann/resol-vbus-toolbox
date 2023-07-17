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

### Choosing your connection

If you want to use a VBus-over-TCP device like a datalogger or communications
module, you can pass the `--host` and `--password` options as well as
optionally the `--port`, `--viaTag` and `--channel` options like in the
following example:

```
bin/resol-vbus-toolbox --host 192.168.178.200 --password vbus <... other options ...>
```

If you want to use a serial-port-based VBus device like a VBus/USB adapter, you
can pass the `--path` option, like in the following example:

```
bin/resol-vbus-toolbox --path /dev/tty.usbmodem101 <... other options ...>
```

If you do not want to connect to a real VBus topology you can choose the
virtual VBus that only exchanges traffic between the loaded scripts:

```
bin/resol-vbus-toolbox --virtual <... other options ...>
```


### Loading scripts



## Scripts


## Example scripts


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
