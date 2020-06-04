const axios = require('axios');
const jsonwebtoken = require('jsonwebtoken')
const key = process.env.SECRET;
const secret = Buffer.from(key, 'base64');

exports.getSubscriptions = async (token, callback) => {
	let res = await axios({
		method: 'get',
		url: `https://api.twitch.tv/helix/webhooks/subscriptions`,
		headers: {
			"Authorization": "Bearer " + token
		}
	}).catch((err) => {
		console.log(err);
	})
	callback(res);
}

exports.getTransactions = async (token, callback) => {
	let res = await axios({
		method: 'get',
		url: `https://api.twitch.tv/helix/extensions/transactions?extension_id=${process.env.CLIENT_ID}`,
		headers: {
			"Authorization": "Bearer " + token
		}
	}).catch((err) => {
		console.log(err);
	})
	callback(res);
}

exports.subscribeToTransactions = async(token) => {
	return axios({
		method: 'post',
		url: 'https://api.twitch.tv/helix/webhooks/hub',
		headers: {
			"Authorization": "Bearer " + token,
			"Content-Type": "application/json"
		},
		data: JSON.stringify({
			'hub.callback': `${process.env.URL}/api/transaction`,
			'hub.mode': 'subscribe',
			'hub.topic': `https://api.twitch.tv/helix/extensions/transactions?extension_id=${process.env.CLIENT_ID}&first=1`,
			'hub.lease_seconds': 864000,
			'hub.secret': process.env.SIGNATURE
		})
	})
}

exports.getAppAccessToken = async () => {
	console.log('[twitch.getAppAccessToken] Getting app access token');
	return axios.post(`https://id.twitch.tv/oauth2/token?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`);
}

// Send message to channel chat
exports.sendToChat = async (channel, message, token) => {
	axios({
		method: 'post',
		url: `https://api.twitch.tv/extensions/${process.env.CLIENT_ID}/0.0.1/channels/${channel}/chat`,
		headers: {
			"Client-ID": process.env.CLIENT_ID,
			"Authorization": "Bearer " + token
		},
		data: {
			"content_type": "application/json",
			"message": JSON.stringify({"text" : `${message}`})
		}
	})
	.catch((err) => {
		console.log("Failed to send channel chat message");
		console.log(err.response.data);
	})
}


// Twitch PubSub messaging
exports.sendViaPubSub = async (channel, state, token) => {
	// console.log('[twitch.sendToPubSub] Sending to pub sub to channel id: ' + channel);
	axios({
		method: 'post',
		url: `https://api.twitch.tv/extensions/message/${channel}`,
		headers: {
			"Client-ID": process.env.CLIENT_ID,
			"Authorization": "Bearer " + token
		},
		data: {
			"content_type": "application/json",
			"targets": ["broadcast"],
			"message": JSON.stringify(state)
		}
	})
	.catch((err) => {
		console.log("Failed to send Twitch PubSub message");
		console.log(err.response.data);
	})
}

exports.verifyAndDecode = async (header, callback) => {
	const token = header.substring('Bearer '.length); // remove Bearer prefix
	jsonwebtoken.verify(token, secret, { algorithms: ['HS256'] }, (err, decoded) => {
		callback(err, decoded)
	})
}

// Create JWT's to go with requests
exports.createServerJWT = async (channel, callback) => {
	// console.log('[twitch.createServerJWT] Creating server jwt')
	// 60min expiry
	let timeNow = new Date();
	timeNow.setMinutes(timeNow.getMinutes() + 60);
	// Create and sign JWT. Role must be 'external'
	let rawJWT = {
		exp: Math.floor(timeNow/1000),
		user_id: process.env.CLIENT_ID, // the account that owns the extension
		channel_id: channel,
		role: 'external',
		pubsub_perms: {
			send: ["broadcast"]
		}
	}

	// callback with token + expiry time
	jsonwebtoken.sign(rawJWT, secret, (err, token) => {
		callback(err, token, timeNow)
	});
}


// Get user information from twitch API with ID
exports.getUserById = async (userId) => {
	return axios({
		method: 'get',
		url: `https://api.twitch.tv/kraken/users/${userId.substring(1)}`,
		headers: {
			"Accept": "application/vnd.twitchtv.v5+json",
			"Client-ID": process.env.CLIENT_ID
		}
	})
}

// Get user information from twitch API with username
exports.getUserByUsername = async (username) => {
	 return axios({
		method: 'get',
		url: `https://api.twitch.tv/helix/users?login=${username}`,
		headers: {
			"Accept": "application/vnd.twitchtv.v5+json",
			"Client-ID": process.env.CLIENT_ID
		}
	})
}
