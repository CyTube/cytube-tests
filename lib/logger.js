const JSLI = require('@calzoneman/jsli');
const { ConsoleLogBackend } = require('@calzoneman/jsli/lib/consolelogger');

exports.init = () => {
    JSLI.setLogBackend(name => ConsoleLogBackend(name, JSLI.LogLevel.DEBUG));
};
