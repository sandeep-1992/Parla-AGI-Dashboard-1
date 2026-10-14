import fs from 'node:fs'
import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()
const extra = [
  '',
  `VAPID_PUBLIC_KEY=${keys.publicKey}`,
  `VAPID_PRIVATE_KEY=${keys.privateKey}`,
  'VAPID_SUBJECT=mailto:admin@localhost',
  `CRON_SECRET=${keys.publicKey.slice(0, 24)}`,
  '',
].join('\n')

fs.appendFileSync(new URL('../.env', import.meta.url), extra)
console.log('vapid-written')
