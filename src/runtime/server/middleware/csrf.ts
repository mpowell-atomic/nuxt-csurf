
import * as csrf from 'uncsrf'
import { defineEventHandler, getCookie, getHeader, createError } from 'h3'
import { useRuntimeConfig } from '#imports'
import { useSecretKey } from '../helpers'

const csrfConfig = useRuntimeConfig().csurf
const methodsToProtect = csrfConfig.methodsToProtect ?? []
const excludedUrls = csrfConfig.excludedUrls ?? []

export default defineEventHandler(async (event) => {
  const method = event.node.req.method ?? ''
  if (!methodsToProtect.includes(method)) { return }

  const secret = getCookie(event, csrfConfig.cookieKey!) ?? ''
  const formToken = event.node.req[Symbol.for('h3ParsedBody')]['csrf-token'];
  const token = getHeader(event, 'csrf-token') ?? formToken ?? '';
  // verify the incoming csrf token
  const url = event.node.req.url ?? ''
  const excluded = excludedUrls.some(el => Array.isArray(el)
    ? new RegExp(...el).test(url)
    : el === url)
  if (!excluded && !(await csrf.verify(secret, token, await useSecretKey(csrfConfig), csrfConfig.encryptAlgorithm))) {
    throw createError({
      statusCode: 403,
      name: 'EBADCSRFTOKEN',
      statusMessage: 'CSRF Token Mismatch'
    })
  }
})
