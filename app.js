require('dotenv').config()
const app = require("express")();
const server = require('http').Server(app);
const routes = require('./api/routes/routes');
const bodyParser = require('body-parser');
const cors = require('cors');
// const twitch = require('./twitch');
const crypto = require('crypto');

// Body parser middleware: Verify webhook notice
const verifyNotice = (req, res, buf) => {
    const expected = req.headers['x-hub-signature'];
    const calculated = 'sha256=' + crypto.createHmac('sha256', process.env.SIGNATURE).update(buf).digest('hex');
    req.verified = expected === calculated;
};

// cors policy#
app.use(cors());
app.options('*', cors());
bodyParser.urlencoded({extended: false});
app.use(bodyParser.json({verify: verifyNotice}));
app.use('/api', routes);

// Server listen
server.listen(process.env.PORT || 5000, () => {
	console.log('Listening...')
});

module.exports = server;