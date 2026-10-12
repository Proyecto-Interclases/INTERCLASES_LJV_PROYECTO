function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  console.error(error.stack || error);
  const status = Number(error.status || error.statusCode);
  const responseStatus = status >= 400 && status < 600 ? status : 500;
  const response = {
    error: 'Error interno del servidor',
  };

  if (process.env.NODE_ENV !== 'production' && error.message) {
    response.details = error.message;
  }

  return res.status(responseStatus).json(response);
}

module.exports = errorHandler;
