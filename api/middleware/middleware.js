const twitch = require('../../custom_modules/twitch.js');

/* Middleware */

exports.verifyAndDecode = async (req, res, next) => {
	// verify and decode Twitch JWT
	// - kill any requests not from twitch

	if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
		twitch.verifyAndDecode(req.headers.authorization, (err, decoded) => {
			if (err) {
				console.log('[middleware.verifyAndDecode] Error', err);
				res.end('Request could not be verified and decoded.');
			} else {
				// Add decoded jwt to request
				req.JWT = decoded;
				next();	
			}
		})
	} else {

		// TODO(Jack): Remove this for production
		req.JWT = {
			opaque_user_id: req.headers.authorization,
			channel_id: 1234
		}	
		next();
		// console.log('[middleware.verifyAndDecode] Request did not start with bearer prefix.');
		// res.end('Request could not be verified and decoded.')
	}
}