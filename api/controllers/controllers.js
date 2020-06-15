const request = require('request');
const gamestateEventHandler = require('../../gamestate/gamestateEventHandler');

/* Controllers for routes */

exports.play = (req, res) => {
	gamestateEventHandler.playRequestHandler(req.JWT)
	res.sendStatus(200)
}

exports.select = (req, res) => {
	gamestateEventHandler.charSelectHandler(req.params.char, req.JWT);
	res.sendStatus(200)
}

exports.action = (req, res) => {
	gamestateEventHandler.actionSelectHandler(req.params.action, req.JWT);
	res.sendStatus(200)
}

exports.roster = (req, res) => {
	// get roster
	request('https://pastebin.com/raw/9rmbSV4r', function (err, response, body) {
		console.log(body)
		if (!err && response.statusCode == 200) {
			res.json(body)
		} else {
			res.json(0)
		}
	})
}

// TODO(Jack): Reexamine these functions below

exports.getTransaction = (req, res) => {
	let challenge = req.query['hub.challenge'];
	// console.log(req.query)
	// console.log(challenge);
	if (challenge) {
		res.status(200).send(challenge);
		console.log('[controller.getTransaction] Subscription challenged')
	}
}

exports.postTransaction = (req, res) => {
	// console.log('[controller.postTransaction] Transaction recieved')
	if (req.verified) { 
		// console.log('[controller.postTransaction] Transaction is verified')
		res.status(200).send();
	} else {
		console.log('[controller.postTransaction] Transaction failed to verify')
		res.status(200).send('Not quite right')
	}
	// gamestate.transactionHandler(req.body.data);
	res.status(200).send();
}