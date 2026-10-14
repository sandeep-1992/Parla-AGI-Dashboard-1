export function verifyPlatformLogin(username: string, password: string): boolean
export function issuePlatformToken(): string
export function verifyPlatformToken(token: string): { role: string; user: string; exp: number } | null
export function readPlatformAuth(req: { headers?: { authorization?: string } }): {
  role: string
  user: string
  exp: number
} | null
export function requirePlatformAuth(
  req: { headers?: { authorization?: string } },
  res: {
    statusCode: number
    setHeader: (k: string, v: string) => void
    end: (body: string) => void
  },
): { role: string; user: string; exp: number } | null
