const morgan = require('morgan');

const logger = console;

const requestLogger = morgan('dev');

module.exports = {
  logger,
  requestLogger
};
