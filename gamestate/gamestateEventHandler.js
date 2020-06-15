const twitch = require("../custom_modules/twitch")
const queries = require("../api/db/queries")
const gamestateClass = require("./gamestateClass")
const GSU = require("./gamestateUpdater")
const GSF = require("./gamestateFunctions")

/* Array holding all current 'games' */
let gamestateArray = []
/* Transaction Id management (catches transaction notifications that might be sent twice) */
let transactionIds = []

const initTransactionWebhook = () => {
	// Set up webhook sub on server start
	// TODO(Jack): Re-establish webhook sub before access token expires
	twitch.getAppAccessToken()
	.then((token) => {
		// Subscribe to transactions webhook. This request will override any old subscription.
		twitch.subscribeToTransactions(token.data.access_token)
		.then((response) => {
			console.log('[gamestate.unsubscribeFromTransactions] Subscribing to transactions webhook')
			console.log(response.status, response.statusText)
		})
	}).catch((err) => {
		console.log('[gamestate.getAppAccessToken] Error:', err.response.data)
	})
} 

// Set up webhook for Twitch transactions
// initTransactionWebhook()

exports.playRequestHandler = async (JWT) => {
	// Get gamestate for channel (if it exists, else gs = false)
	let gamestate = GSF.findGamestate(JWT.channel_id, gamestateArray)

	if (gamestate) { // if gamestate exists
		// Check if user exists in gamestate
		if (GSF.userIsInGamestate(gamestate, JWT.opaque_user_id)) {
			// TODO(Jack): Write ^ function
			// IF user is already 'present' in gamestate, break out of function
			return
		}	
	} else { 
		// Create new gamestate and push to array
		gamestate = new gamestateClass(JWT.channel_id)

		// Update timeToIdle with new date()
		gamestate.timeToIdle = new Date()
		gamestate.timeToIdle.setMinutes(gamestate.timeToIdle.getMinutes() + 10)

		// Store ref to gamestate in array
		gamestateArray.push(gamestate)
	}

	// Create new user object to use
	let newUser = { 
		opaque_user_id: JWT.opaque_user_id,
		display_name: '',
		persistent: false
	}

	// Store user details in newUser obj (passed by ref.)
	getUserDetailsFromTwitch(newUser, () => {
		// Add new user to gamestate queue
		// Func needs to be in callback to wait for Twitch api.
		GSU.addUserToGamestateQueue(newUser, gamestate)		
	})
}

/* Characters can now be set at any time, by any user in channel */
exports.charSelectHandler = async (characterSelection, JWT) => {
	// Need to find gamestate for channel. If it exists, update char selection of user
	let gamestate = GSF.findGamestate(JWT.channel_id, gamestateArray)
	if (!gamestate) {
		return console.log('[gamestate.charSelectHandler] game doesn\'t exist for channel')
	} else {

		// TODO(Jack): Make sure the char is in range of roster

		// Pass id and character selection to gamestate object
		GSU.setPlayerCharacter(JWT.opaque_user_id, characterSelection, gamestate)
	}
}

exports.actionSelectHandler = async (actionSelection, JWT) => {
	let gamestate = GSF.findGamestate(JWT.channel_id, gamestateArray)
	if (!gamestate) {
		// If there is an action request for a non-existent gamestate -
		// It is an error, so return to exit.
		return console.log('[gamestate.actionSelectHandler] game doesn\'t exist for channel')
	} else {
		// If action not valid integer, set to 1 by default. 
		if (![1,2,3].includes(parseInt(actionSelection))) {
			actionSelection = 1;
		}
		GSU.setPlayerAction(JWT.opaque_user_id, actionSelection, gamestate)	
	}
}

// Interval for sending packets via pub sub
// - Also checking if we should remove stale gamestates
setInterval(() => {
	gamestateArray = gamestateArray.filter((gamestate) => {
		if (gamestate.timeToIdle < new Date()) {
			console.log('Gamestate has been idle for too long, removing')
			return false
		} else {
			// Update gamestate before sending
			GSU.updateState(gamestate)

			// Pull packet variables out of gamestate
			let packet = GSF.getGamestatePacket(gamestate)

			/* Get JWT from gamestate */
			let JWT = gamestate.JWT
			// Before updating client state via pub sub, 
			// check if a server JWT exists for this channel
			// ... And it does, check if it has expired 
			if (JWT.token <= '' || JWT.expiry < new Date()) {
				console.log('[gamestate.gameStateUpdateInterval] Server jwt invalid, creating new server jwt. ')
				twitch.createServerJWT(gamestate.channel_id, (err, token, expiry) => {
					
					// Update JWT details for this gamestate
					JWT.expiry = expiry
					JWT.token = token

					// Send gamestate to client via pub sub
					twitch.sendViaPubSub(gamestate.channel_id, packet, JWT.token)

				}).catch((err) => {
					console.log('[gamestate.gameStateUpdateInterval] err: ', err)
				})
			} else {
				// If server JWT still valid, send gamestate straight to channel
				twitch.sendViaPubSub(gamestate.channel_id, packet, JWT.token)
			}
			return true
		}
	})

}, 1000)



/* Misc functions */
const getUserDetailsFromTwitch = async (newUser, callback) => {
	if (newUser.opaque_user_id[0] == 'U') { // If user opaque IS persistent - NOTE(Jack): (not v. secure)
		try {
			// Get user details from twitch (we only want display_name)	
			let response = await twitch.getUserById(newUser.opaque_user_id)
			newUser.display_name = response.data.display_name
			newUser.persistent = true
		} catch(err) {
			// If theres an error getting information (probably because its coming from dev rig) ...
			// ... set dummy display name, and dont persist
			console.log(err.response.data)
			console.log('[gamestateEventHandler.getUserDetails] Error getting user details. Setting dummy name.')
			newUser.display_name = 'DUMMY'
		}
	} else { 
		// If user opaque id is NOT persistent, set default display name, and dont persist
		// console.log('[gamestateEventHandler.playRequestHandler] Id not persistent. Setting default name.')
		newUser.display_name = 'STEVE'
	}
	callback();	
}

const getExecutionTime = ((func) => {
	let hrstart = process.hrtime()
	func()
	let hrend = process.hrtime(hrstart)
  	console.info('Execution time (hr): %ds %dms', hrend[0], hrend[1] / 1000000)
})

// TODO(Jack): LOok at transaction logic again.
// Any transactions that get here are verified
// exports.transactionHandler = async (data) => {
// 	// Catch any notifications sent twice, and stop them here.
// 	if (transactionIds[data[0].id]) {
// 		return console.log('[gameState.transactionHandler] Transaction double up, ignoring.')
// 	}

// 	// Push unique ids into array to stop double ups.
// 	transactionIds.push(data[0].id)

// 	// Get gamestate
// 	transactionGamestate = findGamestate(data[0].broadcaster_id)

// 	// Get JWT for gamestate...
// 	// ...then notify channel chat of turbo purchase
// 	let msg = `${data[0].user_name} went turbo!`
// 	let jwt = transactionGamestate.getJwt()
// 	twitch.sendToChat(data[0].broadcaster_id, msg, jwt.token)

// 	// Store transaction in database 
// 	addTransactionToDb(data[0], () => {
// 		// Create a gamestate instance for this channel
// 		if (!transactionGamestate) {
// 			console.log('[gamestate.playRequestHandler] Gamestate for transaction does not exist, creating one.')
// 			let gs = new gamestateClass(data[0].broadcaster_id)
// 			gameStateArray.push(gs)
// 		}

// 		// Call 'turbo' method on gamestate instance
// 		transactionGamestate.addTurbo(data[0].user_name, data[0].id)
// 	})
// }

