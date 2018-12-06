require('../lib/logger').init();
const assert = require('assert');
const { HTTPClient } = require('../lib/http-client');

describe('RegisterLoginTest', () => {
    let client = new HTTPClient(process.env.HOST, parseInt(process.env.PORT, 10));

    it('registers a user and logs in as that user', async () => {
        let name = `U${Date.now()}`;
        let password = 'test';

        await client.register({ name, password });
        await client.login(name, password);

        assert(client.getCookie('auth'), 'Expected auth cookie after logging in');
        // TODO: probably also want to validate that requesting a page, e.g.
        // the index, shows the logged in banner
    });
});
