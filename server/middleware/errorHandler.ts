import { ErrorRequestHandler } from 'express';
import createHttpError from 'http-errors';

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err.stack);

    if (err instanceof createHttpError.HttpError) {
        res.status(err.statusCode).json({
            error: {
                message: err.message,
                status: err.statusCode
            }
        });
        return;
    }

    res.status(500).json({
        error: {
            message: 'Internal Server Error',
            status: 500
        }
    });
};

export default errorHandler;