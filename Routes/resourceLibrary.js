// Backend/Routes/tabRoutes.js
const express = require('express');
const router = express.Router();
const {getTabs} = require('../Controllers/resourceLibrary');

router.get('/tabs', getTabs);

module.exports = router;