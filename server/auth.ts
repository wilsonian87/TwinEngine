/**
 * Authentication Module
 *
 * Handles Passport.js configuration, session management,
 * and authentication middleware for the TwinEngine API.
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";
import { requireEnvVar } from "./utils/config";

// Augment express-session types
import "express-session";

declare module "express-session" {
  interface SessionData {
    inviteCodeId?: string;
    inviteEmail?: string;
    inviteLabel?: string | null;
  }
}

const scryptAsync = promisify(scrypt);

// Extend Express types for session user
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
    }
  }
}

/**
 * Hash a password using scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

/**
 * Compare a password with its hash
 */
export async function comparePasswords(
  supplied: string,
  stored: string
): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

/**
 * Configure Passport.js with local strategy
 */
function configurePassport(): void {
  // Serialize user to session (store only ID)
  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUserById(id);
      if (user) {
        done(null, { id: user.id, username: user.username });
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });

  // Local strategy for username/password authentication
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await comparePasswords(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        return done(null, { id: user.id, username: user.username });
      } catch (error) {
        return done(error);
      }
    })
  );
}

/**
 * Set up session and authentication middleware
 */
export function setupAuth(app: Express): void {
  // Configure session middleware
  const sessionSecret = requireEnvVar("SESSION_SECRET", "twinengine-dev-secret");

  app.use(
    session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: "lax",
      },
    })
  );

  // Initialize Passport
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());
}

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Authentication required" });
};

/**
 * Middleware for optional authentication
 * Continues regardless of auth status, but populates req.user if authenticated
 */
export const optionalAuth: RequestHandler = (req, res, next) => {
  // passport.session already populates req.user if authenticated
  next();
};
