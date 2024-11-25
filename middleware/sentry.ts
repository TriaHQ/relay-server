import { Request, Response, NextFunction } from 'express';
import * as Sentry from "@sentry/node";

export const setUserContext = async (req: Request, res: Response, next: NextFunction) => {
    const {uuid} = req.body;
    console.log("userUuid", uuid);
    Sentry.setUser({id: uuid});
    next()
}