exports.findGamestate = (channel_id, gamestateArray) => {
	return gamestateArray.find(gamestate => gamestate.channel_id == channel_id);
}

exports.userIsInGamestate = (gamestate, opaque_user_id) => {
	let found = false;
		gamestate.players.forEach((p) => {
			if (p.opaque_user_id == opaque_user_id) {
				console.log('Found player in gamestate (Player)')
				found = true;
			}
		})
		gamestate.queue.forEach((p) => {
			if (p.opaque_user_id == opaque_user_id) {
				console.log('Found player in gamestate (Queue)')
				found = true;	
			}
		})
	return found
}

exports.getGamestatePacket = (gamestate) => {
	let packet = {
		queue: gamestate.queue,
		scores: gamestate.scores,
		results: gamestate.results,
		round: gamestate.round,
		victor: gamestate.victor,
		smited: gamestate.smited,
		players: gamestate.players
	}
	return packet
}
