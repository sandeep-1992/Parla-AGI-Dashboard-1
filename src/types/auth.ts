export interface AuthUser {
  userId: string
}

export interface AuthSession {
  user: AuthUser
  loggedInAt: string
}
