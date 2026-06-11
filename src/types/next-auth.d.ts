import type { DefaultSession, DefaultUser } from 'next-auth'
import type { UserRole } from './enums'

// Augment next-auth types so session.user carries role and id
declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id:             string
      role:           UserRole
      locationZoneId: string | null
    }
  }

  interface User extends DefaultUser {
    role:           UserRole
    locationZoneId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:             string
    role:           UserRole
    locationZoneId: string | null
  }
}
