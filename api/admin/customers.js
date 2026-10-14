import {
  adminCustomer,
  createCustomer,
  hasDurableCustomerStore,
  listCustomers,
} from '../../lib/customers.js'
import { requirePlatformAuth } from '../../lib/platformAuth.js'

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

  res.setHeader('Content-Type', 'application/json')

  if (req.method === 'GET') {
    const customers = await listCustomers()
    res.statusCode = 200
    res.end(
      JSON.stringify({
        customers: customers.map(adminCustomer),
        durable: hasDurableCustomerStore(),
      }),
    )
    return
  }

  if (req.method === 'POST') {
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : await readBody(req)
      const customer = await createCustomer(body)
      res.statusCode = 201
      res.end(JSON.stringify({ ok: true, customer: adminCustomer(customer) }))
    } catch (error) {
      res.statusCode = 400
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not create customer' }))
    }
    return
  }

  res.statusCode = 405
  res.setHeader('Allow', 'GET, POST')
  res.end(JSON.stringify({ error: 'Method not allowed' }))
}
