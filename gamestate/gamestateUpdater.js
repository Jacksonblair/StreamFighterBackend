// FSM 'enum'
const fsm = {
	waitingForPlayers: 1,
	hasPlayers: 2,
	checkingForInput: 3,
	resolvingRound: 4,
	roundResolved: 5,
	smitingPlayer: 6,
	endingMatch: 7,
	resettingGamestate: 8
}

exports.addUserToGamestateQueue = (newUser, gamestate) => {
	// console.log('Added new user to queue')
	gamestate.queue.push(newUser)
}

exports.setPlayerCharacter = (opaque_user_id, characterSelection, gamestate) => {
	console.log('[setPlayerCharacter] Set the player character')
//		Set character of player with id == opaque_user_Id, in gamestate
}

exports.setPlayerAction = (opaque_user_id, action, gamestate) => {
	// Check if user is a player
	// If yes, and there is no action for this round, set the action
	gamestate.players.forEach((p) => {
		if (p.opaque_user_id == opaque_user_id) {
			if (!p.actions[gamestate.round]) {
				p.actions[gamestate.round] = action
				console.log('Set the player action')
			}
		}
	})
}

exports.updateState = (gamestate) => {

	let gs = gamestate

	/* Check if users in queue need to be pushed to player slots */
	gs.players.forEach((p, i) => {
		if (!p.opaque_user_id && gs.queue.length > 0) {
			console.log('Pushing user to player slot')
			gs.players[i].opaque_user_id = gs.queue[0].opaque_user_id
			gs.players[i].display_name = gs.queue[0].display_name
			gs.queue.splice(0, 1)
		}		
	})

	/* Manage FSM */
	switch(gs.FSM) {
		case fsm.waitingForPlayers:
			if (numberOfPlayers(gs) == 2) {

				// update timeToIdle so gamestate doesnt get
				// cleaned up halfway through a match.
				updateTimeToIdle(gs)

				console.log('Game has 2 players')
				gs.FSM = fsm.hasPlayers
				setTimeout(() => {
					console.log('Checking for input')
					gs.FSM = fsm.checkingForInput
					// set timeout to set player actions automatically
					setCharTimeout(gs)
				}, 3000)
			} break;

		case fsm.checkingForInput:
			if (gs.players[0].actions[gs.round] && gs.players[1].actions[gs.round]) {
				console.log('Game has both inputs')
				console.log(`Resolving round ${gs.round + 1}`)
				gs.FSM = fsm.resolvingRound
				resolveFight(gs)

				setTimeout(() => {
					console.log('Round is resolved')
					++gs.round
					gs.FSM = fsm.roundResolved
				}, 5000)
			} break;

		case fsm.roundResolved:
			if (gs.ties >= gs.tieLimit) {	
				console.log('Smiting player')
				gs.FSM = fsm.smitingPlayer
			} else if (gs.players[0].hp == 0 || gs.players[1].hp == 0) {
				console.log('Ending match')
				gs.FSM = fsm.endingMatch
			} else {
				setCharTimeout(gs)
				console.log('Checking for input')
				gs.FSM = fsm.checkingForInput
			} break;

		case fsm.smitingPlayer:
			// get players randomly
			let [ player1, player2 ] = getRandomPlayers()
			gs.players[player1].hp = 0
			gs.results[gs.round - 1].winner = (player2 + 1)
			console.log(`The impatient gods smited player: ${player1 + 1}`)
			console.log('Ending match')
			gs.FSM = fsm.endingMatch
			break;

		case fsm.endingMatch:
			gs.victor = gs.results[gs.round - 1].winner
			gs.defeated = gs.results[gs.round - 1].loser
			console.log(`Victor is player ${gs.victor}`)
			console.log('Resetting gamestate')
			gs.FSM = fsm.resettingGamestate

			// Update timeToIdle at end of match
			updateTimeToIdle(gs)

			setTimeout(() => {
				console.log('Waiting for players')
				resetGamestate(gs)
				gs.FSM = fsm.waitingForPlayers
				++gs.gameId // increment gameId (for client to track game id)
			}, 3000)
	}
}

let setCharTimeout = (gs) => {
	setTimeout(() => {
		gs.players.forEach((p, i) => {
			if (!p.actions[gs.round]) {
				console.log(`Setting random action for player: ${i + 1}`)
				p.actions[gs.round] = getRandomAction()
			}
		})
	}, 3000)
}

let getRandomChar = () => {
	return getRandomIntInRange(1, 3)
}

let getRandomAction = () => {
	return getRandomIntInRange(1, 3)
}

let getRandomPlayers = () => {
	a = getRandomIntInRange(0, 1)
	b = (a == 1 ? 0 : 1)
	return [a, b]
}

let getRandomIntInRange = (min, max) => {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

let numberOfPlayers = (gamestate) => {
	let p1_id = gamestate.players[0].opaque_user_id
	let p2_id = gamestate.players[1].opaque_user_id
	if (p1_id && p2_id) {
		return 2
	} else if (p1_id || p2_id) {
		return 1
	} else {
		return 0
	}
}

let resetGamestate = (gs) => {
	gs.ties = 0
	gs.results = []
	gs.round = 0
	gs.victor = 0
	gs.defeated = 0
	gs.tieLimit = getRandomIntInRange(2, 6)
	gs.players = [
		{
			opaque_user_id: 0,
			display_name: 0,
			char: 0,
			actions: [],
			hp: 3,
			persistent: false
		},
		{
			opaque_user_id: 0,
			display_name: 0,
			char: 0,
			actions: [],
			hp: 3,
			persistent: false
		}
	]
}

let updateTimeToIdle = (gs) => {
	gs.timeToIdle = new Date()
	gs.timeToIdle.setMinutes(gs.timeToIdle.getMinutes() + 10)
}

let resolveFight = (gs) => {
	// resolve the fight and adjust player health.
    let a = gs.players[0].actions[gs.round] - 1
    let b = gs.players[1].actions[gs.round] - 1

    let result = { winner: undefined, loser: undefined }

    // scissors = 0, paper = 1, rock = 2
    /*https://stackoverflow.com/questions/11377117/rock-paper-scissors-determine-win-loss-tie-using-math*/
    if (a === b) { 
        result.winner = 10 // tie
        result.loser = 10
        console.log('Round result: tie')
        ++gs.ties
    } else if ((a - b + 3) % 3 == 1) {
    	--gs.players[1].hp
        result.winner = 1 // player 1 wins
        result.loser = 2
        console.log('Round result: player one wins')
    } else {
        --gs.players[0].hp
   		result.winner = 2 // player 2 wins
   		result.loser = 1
   		console.log('Round result: player two wins')
    }

    gs.results.push(result)
}