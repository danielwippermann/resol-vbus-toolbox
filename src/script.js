const vm = require('vm');


function prepareScriptFunction(scriptFilename, rawScriptFunction) {
    let scriptFunction;
    if (typeof rawScriptFunction === 'function') {
        scriptFunction = rawScriptFunction;
    } else if (typeof rawScriptFunction === 'string') {
        const wrappedScriptContents = `(function() { return async function($, require) {\n${rawScriptFunction}\n}; })();`;

        scriptFunction = vm.runInThisContext(wrappedScriptContents, undefined, {
            filename: scriptFilename,
            lineOffset: -1,
        });
    } else {
        throw new Error('Unsupported script function');
    }

    return scriptFunction;
}

class Script {

    constructor(scriptFilename, scriptFunction) {
        this.scriptFilename = scriptFilename;
        this.scriptFunction = prepareScriptFunction(scriptFilename, scriptFunction);

        this.phase = 'SETUP';
        this.phaseInfo = null;
    }

    async run($) {
        await this.scriptFunction($, require);
    }
}


module.exports = {
    Script,
};
