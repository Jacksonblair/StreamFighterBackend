const express = require('express');
const router = express.Router();
const controllers = require('../controllers/controllers');
const mw = require('../middleware/middleware')

/* Gameplay Routes */
router.post('/play', mw.verifyAndDecode, controllers.play)
router.post('/select/:char', mw.verifyAndDecode, controllers.select)
router.post('/action/:action', mw.verifyAndDecode, controllers.action)

/* Route to get character roster */
router.get('/roster', controllers.roster)

/* Transaction Routes */
router.get('/transaction', controllers.getTransaction)
router.post('/transaction', controllers.postTransaction)

module.exports = router;

