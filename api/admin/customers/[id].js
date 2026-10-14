import { adminCustomer, deleteCustomer, updateCustomer } from '../../../lib/customers.js'
import { requirePlatformAuth } from '../../../lib/platformAuth.js'

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim()
      if (!raw) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(raw))
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (!requirePlatformAuth(req, res)) return

  const id = String(req.query?.id ?? '')
  if (!id) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ error: 'Customer id is required.' }))
    return
  }

  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : await readBody(req)
      const customer = await updateCustomer(id, body)
      res.statusCode = 200
      res.end(JSON.stringify({ ok: true, customer: adminCustomer(customer) }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update customer'
      res.statusCode = message === 'Customer not found.' ? 404 : 400
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  if (req.method === 'DELETE') {
    try {
      await deleteCustomer(id)
      res.statusCode = 200
      res.end(JSON.stringify({ ok: true }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete customer'
      res.statusCode = message === 'Customer not found.' ? 404 : 400
      res.end(JSON.stringify({ error: message }))
    }
    return
  }

  res.statusCode = 405
  res.setHeader('Allow', 'PUT, PATCH, DELETE')
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
