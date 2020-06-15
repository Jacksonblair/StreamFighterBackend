class gamestate {
	constructor(channel_id) {
		this.channel_id = channel_id

		// When gamestate is initialized, add it to database automatically
		this.init = async () => {
			queries.addChannelToDb(this.channel_id)
		}
		// this.init()
	}

	// Time after which the gamestate is considered
	// idle and should be removed
	timeToIdle = null

	// Track jwt for this channel
	JWT = { expiry: {}, token: '' }

	// Flow control
	ties = 0
	FSM = 1 //	waitingForPlayers by default

	// Game related properties
	queue = []
	scores = []
	results = []
	round = 0
	victor = 0
	smited = 0
	tieLimit = 2
	gameId = 0

	players = [
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

module.exports = gamestate
