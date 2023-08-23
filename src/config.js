module.exports = {
    /// Name of the connection class. Can be one of the following:
    /// - 'SerialConnection'
    /// - 'TcpConnection'
    /// - 'VirtualConnection'
    connectionClassName: null,

    /// Options to pass to the connection class constructor, see the
    /// respective class documentation for details.
    connectionOptions: {
        /// -------- TcpConnection --------

        /// The host name / IP address to connect to. Can be set by using the
        /// `--host <host>` command line option.
        host: null,

        /// The port to connect to (defaults to 7053). Can be set by using the
        /// `--port <port>` command line option.
        port: null,

        /// The via tag to connect to (only on VBus.net). Can be set by using
        /// the `--via <via>` command line option.
        viaTag: null,

        /// The password used to authenticate. Can be set by using the
        /// `--password` command line option.
        password: null,

        /// The VBus channel to connect to (if multiple channels are
        /// supported). Can be set by using the `--channel` command line
        /// option.
        channel: null,

        /// -------- SerialConnection --------

        /// The path of the serial port. Can be set by using the `--path`
        /// command line option.
        path: null,
    },

    /// The filename of the VBus specification file (VSF). Can be set using
    /// the `--vsf <filename>` command line option.
    vsfFilename: null,

    /// The list of scripts to load on startup. Can be set by using the
    /// `--script` command line option.
    scriptFilenames: [],

    /// Indicates whether the REPL should be started. Can be set by using the
    /// `--repl` command line option.
    repl: false,

    /// Configuration objects for scripts. Can be accessed by calling
    /// `$.getScriptConfig`.
    scriptConfigMap: {

    },
};
