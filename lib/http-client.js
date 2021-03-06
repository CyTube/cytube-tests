const cheerio = require('cheerio');
const http = require('http');
const querystring = require('querystring');

const LOGGER = require('@calzoneman/jsli')('http-client');
const TIMEOUT = 30000;

class HTTPClient {
    constructor(host, port) {
        this._host = host;
        this._port = port;
        this._cookies = new Map();
    }

    async register(opts) {
        let { name, password, email } = opts;

        let registerPage = await this._get('/register');
        if (registerPage.statusCode !== 200) {
            throw new Error(`GET /register: HTTP ${registerPage.statusCode}`);
        }

        let csrfToken = this._extractCsrfToken(registerPage.body);
        let formBody = {
            _csrf: csrfToken,
            name,
            password,
            email
        };

        let resultPage = await this._post('/register', formBody);
        if (resultPage.statusCode !== 200) {
            throw new Error(`POST /register: HTTP ${resultPage.statusCode}`);
        }

        let $ = cheerio.load(resultPage.body);
        let registrationError = $('.alert-danger');
        if (registrationError &&
            registrationError.find('strong').text() === 'Registration Failed') {
            throw new Error(
                `Registration failed: ${registrationError.find('p').text()}`
            );
        }

        let success = $('.alert-success');
        if (!success ||
            success.find('strong').text() !== 'Registration Successful') {
            throw new Error('Unknown error when registering');
        }

        LOGGER.info('Registered user %s', name);
    }

    async login(name, password) {
        let loginPage = await this._get('/login');
        if (loginPage.statusCode !== 200) {
            throw new Error(`GET /login: HTTP ${loginPage.statusCode}`);
        }

        let csrfToken = this._extractCsrfToken(loginPage.body);
        let formBody = {
            _csrf: csrfToken,
            name,
            password
        };

        let resultPage = await this._post('/login', formBody);
        if (resultPage.statusCode !== 200) {
            throw new Error(`POST /login: HTTP ${resultPage.statusCode}`);
        }

        let $ = cheerio.load(resultPage.body);
        let loginError = $('.alert-danger');
        if (loginError &&
            loginError.find('strong').text() === 'Login Failed') {
            throw new Error(
                `Login failed: ${loginError.find('p').text()}`
            );
        }

        let success = $('.alert-success');
        if (!success ||
            success.find('strong').text() !== 'Login Successful') {
            throw new Error('Unknown error when logging in');
        }

        LOGGER.info('Logged in as %s', name);
        LOGGER.trace('cookies = %j', Array.from(this._cookies));
    }

    getCookie(name) {
        if (this._cookies.has(name)) {
            return this._cookies.get(name);
        }

        return null;
    }

    async _get(path) {
        return new Promise((resolve, reject) => {
            let options = {
                host: this._host,
                port: this._port,
                path
            };

            let req = http.get(options);

            req.setTimeout(TIMEOUT, () => {
                const error = new Error('Request timed out');
                error.code = 'ETIMEDOUT';
                reject(error);
            });

            req.on('error', error => {
                reject(error);
            });

            req.on('response', res => {
                let buffer = '';
                res.setEncoding('utf8');

                res.on('data', data => {
                    buffer += data;
                });

                res.on('end', () => {
                    this._setCookies(res.headers);

                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: buffer
                    });
                });
            });
        });
    }

    async _post(path, formData) {
        return new Promise((resolve, reject) => {
            let encodedForm = querystring.stringify(formData);
            let options = {
                method: 'POST',
                host: this._host,
                port: this._port,
                path,
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(encodedForm),
                    'Cookie': this._cookieString()
                }
            };

            LOGGER.trace('post.options = %j', options);
            LOGGER.trace('post.body = %s', encodedForm);

            let req = http.request(options);

            req.setTimeout(TIMEOUT, () => {
                const error = new Error('Request timed out');
                error.code = 'ETIMEDOUT';
                reject(error);
            });

            req.on('error', error => {
                reject(error);
            });

            req.on('response', res => {
                let buffer = '';
                res.setEncoding('utf8');

                res.on('data', data => {
                    buffer += data;
                });

                res.on('end', () => {
                    LOGGER.trace('post.response.headers = %j', res.headers);
                    this._setCookies(res.headers);

                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: buffer
                    });
                });
            });

            req.write(encodedForm);
            req.end();
        });
    }

    _setCookies(headers) {
        if (!headers['set-cookie']) {
            return;
        }

        for (let line of headers['set-cookie']) {
            let [cookie] = line.split('; ');
            let [name, value] = cookie.split('=');

            LOGGER.trace('Setting cookie %s=%s', name, value);
            this._cookies.set(name, value);
        }
    }

    _extractCsrfToken(body) {
        let $ = cheerio.load(body);
        return $('input[name=_csrf]').val();
    }

    _cookieString() {
        let entries = [];

        for (let [name, value] of this._cookies) {
            entries.push(`${name}=${value}`);
        }

        return entries.join('; ');
    }
}

exports.HTTPClient = HTTPClient;
