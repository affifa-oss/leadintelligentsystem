import { Router, type NextFunction, type Request, type RequestHandler, type Response } from 'express'

/**
 * Express 4 ignores rejected promises from async handlers (the request would hang).
 * This router passes any error from an async handler to the error middleware instead.
 */
const wrap = (fn: unknown) =>
  typeof fn === 'function' && fn.length < 4
    ? ((req: Request, res: Response, next: NextFunction) => {
        try {
          const r = (fn as RequestHandler)(req, res, next) as unknown
          if (r instanceof Promise) r.catch(next)
        } catch (e) {
          next(e)
        }
      })
    : fn

export function asyncRouter() {
  const router = Router()
  for (const m of ['get', 'post', 'put', 'patch', 'delete', 'use'] as const) {
    const original = router[m].bind(router) as (...args: unknown[]) => unknown
    ;(router as unknown as Record<string, unknown>)[m] = (...args: unknown[]) => original(...args.map(wrap))
  }
  return router
}
