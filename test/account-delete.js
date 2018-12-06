require('../lib/logger').init();
const assert = require('assert');
const { HTTPClient } = require('../lib/http-client');

describe('AccountDeleteTest', () => {
    let client;
    let username;
    let password;

    beforeEach(async () => {
        client = new HTTPClient(process.env.HOST, parseInt(process.env.PORT, 10));
        username = `U${Date.now()}`;
        password = 'test';

        await client.register({ name: username, password });
    });

    it('succeeds if the request is valid', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password,
            confirmed: true,
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 200, 'Delete failed');
        assert(result.body.match(/Account Deleted/), 'Expected success message');
    });

    it('rejects if the user is not logged in', async () => {
        let page = await client.get('/account/delete');

        assert.strictEqual(page.statusCode, 401);
    });

    it('rejects if the CSRF token is missing', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let formData = {
            password,
            confirmed: true
            // _csrf: missing
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 403, 'Expected delete to fail');
    });

    it('rejects if the confirmation is missing', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password,
            // confirmed: missing
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 200);

        assert(
            result.body.match(
                /You must check the box to confirm you want to delete your account/
            ),
            'Expected error due to missing confirmation'
        );
    });

    it('rejects if the password is wrong', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password: 'not the password',
            confirmed: true,
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 403);

        assert(
            result.body.match(/Password was incorrect/),
            'Expected error due to wrong password'
        );
    });

    it('rejects if channels are registered', async () => {
        await client.login(username, password);

        let channel = `C${Date.now()}`;
        await client.registerChannel(channel);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password,
            confirmed: true,
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 200);

        assert(
            result.body.match(/you have one or more channels/),
            'Expected error due to channels registered'
        );
    });

    it('doesn\'t allow logging into an account pending deletion', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password,
            confirmed: true,
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 200);

        try {
            await client.login(username, password);
            assert.fail('Expected login to fail due to missing user');
        } catch (error) {
            assert(
                error.message.match(/User does not exist/),
                'Expected error to be caused by user does not exist'
            );
        }
    });

    it('doesn\'t allow accessing the profile page for an account pending deletion', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password,
            confirmed: true,
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 200);

        let profilePage = await client.get('/account/profile');
        assert(
            profilePage.body.match(/Authorization Required/),
            'Expected error message due to not being logged in'
        );
    });

    it('doesn\'t allow accessing the account edit page for an account pending deletion', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password,
            confirmed: true,
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 200);

        let profilePage = await client.get('/account/edit');
        assert(
            profilePage.body.match(/Authorization Required/),
            'Expected error message due to not being logged in'
        );
    });

    it('doesn\'t allow accessing the my channels page for an account pending deletion', async () => {
        await client.login(username, password);

        let page = await client.get('/account/delete');
        assert.strictEqual(page.statusCode, 200, 'Expected GET to return 200');

        let csrfToken = client.extractCsrfToken(page.body);
        let formData = {
            password,
            confirmed: true,
            _csrf: csrfToken
        };

        let result = await client.post('/account/delete', formData);
        assert.strictEqual(result.statusCode, 200);

        let profilePage = await client.get('/account/channels');
        assert(
            profilePage.body.match(/Authorization Required/),
            'Expected error message due to not being logged in'
        );
    });
});
