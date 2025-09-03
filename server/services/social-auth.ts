import { OAuth2Client } from 'google-auth-library';
import { SocialAccount, users, socialAccounts } from '../db/schema';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword } from '../utils/auth';
import { logger } from '../utils/logger';
import { InternalServerError, BadRequestError } from '../middleware/error-handler';

type SocialProvider = 'google' | 'facebook' | 'apple';

interface SocialProfile {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  emailVerified?: boolean;
}

export class SocialAuthService {
  private googleClient: OAuth2Client;

  constructor() {
    this.googleClient = new OAuth2Client({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    });
  }

  /**
   * Authenticate with Google
   */
  async authenticateWithGoogle(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new BadRequestError('Invalid Google token');
      }

      const profile: SocialProfile = {
        id: payload.sub,
        email: payload.email!,
        name: payload.name,
        firstName: payload.given_name,
        lastName: payload.family_name,
        avatar: payload.picture,
        emailVerified: payload.email_verified,
      };

      return this.findOrCreateUser('google', profile);
    } catch (error) {
      logger.error('Google authentication failed', { error });
      throw new BadRequestError('Google authentication failed');
    }
  }

  /**
   * Authenticate with Facebook
   */
  async authenticateWithFacebook(accessToken: string) {
    try {
      // In a real implementation, you would validate the Facebook access token
      // and fetch the user's profile using the Facebook Graph API
      // This is a simplified example
      const profile = await this.fetchFacebookProfile(accessToken);
      return this.findOrCreateUser('facebook', profile);
    } catch (error) {
      logger.error('Facebook authentication failed', { error });
      throw new BadRequestError('Facebook authentication failed');
    }
  }

  /**
   * Link a social account to an existing user
   */
  async linkSocialAccount(userId: string, provider: SocialProvider, profile: SocialProfile) {
    return db.transaction(async (tx) => {
      // Check if social account is already linked to another user
      const existingAccount = await tx.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.provider, provider),
          eq(socialAccounts.providerAccountId, profile.id)
        ),
      });

      if (existingAccount) {
        if (existingAccount.userId !== userId) {
          throw new BadRequestError('This social account is already linked to another user');
        }
        return existingAccount; // Already linked to this user
      }

      // Link the social account
      const [account] = await tx.insert(socialAccounts).values({
        id: `social_${uuidv4()}`,
        userId,
        provider,
        providerAccountId: profile.id,
        email: profile.email,
        name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
        avatar: profile.avatar,
        accessToken: '', // Store access token if needed
        refreshToken: '', // Store refresh token if needed
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30), // 30 days
        tokenType: 'bearer',
        scope: 'email,profile',
        idToken: '', // For OIDC providers
        sessionState: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      return account;
    });
  }

  /**
   * Unlink a social account from a user
   */
  async unlinkSocialAccount(userId: string, provider: SocialProvider) {
    const [account] = await db.delete(socialAccounts)
      .where(
        and(
          eq(socialAccounts.userId, userId),
          eq(socialAccounts.provider, provider)
        )
      )
      .returning();

    if (!account) {
      throw new NotFoundError('Social account not found');
    }

    return account;
  }

  /**
   * Get a user's linked social accounts
   */
  async getUserSocialAccounts(userId: string) {
    return db.query.socialAccounts.findMany({
      where: eq(socialAccounts.userId, userId),
    });
  }

  // Private methods

  private async findOrCreateUser(provider: SocialProvider, profile: SocialProfile) {
    return db.transaction(async (tx) => {
      // Check if social account exists
      let account = await tx.query.socialAccounts.findFirst({
        where: and(
          eq(socialAccounts.provider, provider),
          eq(socialAccounts.providerAccountId, profile.id)
        ),
        with: {
          user: true,
        },
      });

      // If account exists, return the user
      if (account?.user) {
        return account.user;
      }

      // Check if user with this email already exists
      let user = await tx.query.users.findFirst({
        where: eq(users.email, profile.email),
      });

      // If user doesn't exist, create a new one
      if (!user) {
        const [newUser] = await tx.insert(users).values({
          id: `user_${uuidv4()}`,
          email: profile.email,
          name: profile.name || `${profile.firstName || ''} ${profile.lastName || ''}`.trim(),
          emailVerified: profile.emailVerified ? new Date() : null,
          image: profile.avatar,
          // Generate a random password for the user
          // They can reset it later if they want to use email/password login
          password: await hashPassword(uuidv4()),
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        user = newUser;
      }

      // Link the social account to the user
      await this.linkSocialAccount(user.id, provider, profile);

      return user;
    });
  }

  private async fetchFacebookProfile(accessToken: string): Promise<SocialProfile> {
    // In a real implementation, you would make a request to the Facebook Graph API
    // to fetch the user's profile using the access token
    // This is a simplified example
    try {
      // Example: const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture&access_token=${accessToken}`);
      // const data = await response.json();
      
      // For now, we'll return a mock response
      return {
        id: 'facebook-user-id',
        email: 'user@example.com',
        name: 'Facebook User',
        firstName: 'Facebook',
        lastName: 'User',
        emailVerified: true,
      };
    } catch (error) {
      logger.error('Failed to fetch Facebook profile', { error });
      throw new InternalServerError('Failed to fetch Facebook profile');
    }
  }
}

// Example usage:
/*
const socialAuthService = new SocialAuthService();

// Authenticate with Google
const user = await socialAuthService.authenticateWithGoogle('google-id-token');

// Authenticate with Facebook
const fbUser = await socialAuthService.authenticateWithFacebook('facebook-access-token');

// Link a social account to an existing user
await socialAuthService.linkSocialAccount('user-123', 'google', {
  id: 'google-user-id',
  email: 'user@example.com',
  name: 'John Doe',
  emailVerified: true,
});

// Unlink a social account
await socialAuthService.unlinkSocialAccount('user-123', 'google');

// Get user's social accounts
const accounts = await socialAuthService.getUserSocialAccounts('user-123');
*/
