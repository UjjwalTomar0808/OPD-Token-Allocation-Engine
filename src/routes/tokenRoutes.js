const express = require('express');
const router = express.Router();
const tokenController = require('../controllers/tokenController');

router.post('/issue', tokenController.issueToken);
router.patch('/:id/cancel', tokenController.cancelToken);

module.exports = router;
