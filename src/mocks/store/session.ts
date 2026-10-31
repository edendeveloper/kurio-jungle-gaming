import { requestToken, sessionByToken } from './accounts'
export function currentSession(request?: Request) {
  return sessionByToken(requestToken(request))
}
