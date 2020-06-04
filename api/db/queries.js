const db = require('./index');

module.exports = {
	fulfilTurbo: async (id) => {
		db.query('UPDATE transactions SET fulfilled = true WHERE id = $1', [id], (err, /*res*/) => {
			if (err) {
				console.log('[queries.fulfilTurbo] Error: ', err);
			} else {
				console.log('[queries.fulfilTurbo] Fulfilled.');
			}
		})
	},
	checkForUnfulfilledTurbo: async (channel_id, callback) => {
		db.query(`SELECT data -> 'user_name' AS user_name, id, fulfilled FROM transactions WHERE fulfilled = false AND channel_id = $1`, [channel_id], (err, res) => {
			if (err) {
				console.log('[queries.checkForUnfulfilledTurbo] Error: ', err);
				callback(false)
			} else if (res.rows[0]) {
				console.log('[queries.checkForUnfulfilledTurbo] Found unfulfilled turbo');	
				console.log(res.rows[0]);
				callback(res.rows[0])
			}
		})
	},
	updateDbChannelScores: async (winner_id, winner_username, channel_id, callback) => {
		db.getClient((err, client, release) => {		
			client.query('SELECT score FROM scores WHERE user_id = $1 AND channel_id = $2', [winner_id, channel_id], (err, res) => {
			if (err) { 
				console.log('[queries.updateDbChannelScores] Error: ', err) 
			} else if (res.rows[0]) {
				console.log('[queries.updateDbChannelScores] Found a score for user, updating...');			
				client.query('UPDATE scores SET score = score + 1000, display_name = $3 WHERE user_id = $1 AND channel_id = $2', [winner_id, channel_id, winner_username], (err, /*res*/) => {
					if (err) console.log('[queries.updateDbChannelScores] Error: ', err);
					console.log('[queries.updateDbChannelScores] Updated a users score');
				})
			} else {
				console.log('[queries.updateDbChannelScores] Did not find a score for user, creating...');	
				client.query('INSERT INTO scores (user_id, channel_id, display_name) VALUES ($1, $2, $3)', [winner_id, channel_id, winner_username], (err, /*res*/) => {
					if (err) console.log('[queries.updateDbChannelScores] Error: ', err);
					console.log('[queries.updateDbChannelScores] Created a score for user');		
				})
			}
			// release database client
			release();
			callback();
			})
		})
	},
	getDbChannelScores: async (channel_id, callback) => {
		// get scores for gamestate
		db.query("SELECT score, display_name FROM scores WHERE channel_id = $1 ORDER BY score LIMIT 10", [channel_id], (err, res) => {
			if (err) {
				console.log('[queries.getDbChannelScores] Error: ', err);
				callback(false)
			} else if (res) {
				console.log('[queries.getDbChannelScores] Got channel scores');	
				console.log(res.rows[0]);
				callback(res)
			}
		})
	}, 
	addUserToDb: async (user) => {
		// Query adds user to database. Doesn't conflict if user already exists
		db.query('INSERT INTO users (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;', 
		[user.opaque_user_id, user.display_name], 
		(err, /*res*/) => {
			if (err) {
				console.log('[queries.addUserToDb] Error: ', err)
			} else {
				console.log('[queries.addUserToDb] Added user to database');
			}
		})
	},
	addTransactionToDb: async (data, callback) => {
		// Query adds transaction to database.
		console.log('[queries.addTransactionToDb] Trying to add transaction to database');
		db.query('INSERT INTO transactions (id, channel_id, data) VALUES ($1, $2, $3)', [data.id, data.broadcaster_id, JSON.stringify(data)], callback);
	},
	addChannelToDb: async (channel_id) => {
		// Query adds channel to database. Doesn't conflict if channel already exists
		db.query('INSERT INTO channels (id) VALUES ($1) ON CONFLICT (id) DO NOTHING', 
		[channel_id], 
		(err, /*res*/) => {
			if (err) console.log(err);
			console.log('[queries.addChannelToDb] Added channel to database (note: Query will do nothing if entry already exists)');
		})
	}
}