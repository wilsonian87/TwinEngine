/**
 * Authentication Module
 *
 * Handles Passport.js configuration, session management,
 * and authentication middleware for the TwinEngine API.
 *
 * Session Storage:
 * - Development: In-memory (default express-session)
 * - Production: PostgreSQL via connect-pg-simple
 */

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express, RequestHandler, Request, Response } from "express";
import { storage } from "./storage";
import { pool } from "./db";
import { db } from "./db";
import { debugLog } from "./utils/config";
import { users } from "@shared/schema";
import type { User } from "@shared/schema";
import { requireEnvVar } from "./utils/config";
import { eq } from "drizzle-orm";

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

// Dev mock user constant (used in SKIP_AUTH bypass locations)
const DEV_MOCK_USER = {
  id: "dev-user-001",
  username: "dev@example.com",
  role: "admin" as const,
  status: "approved" as const,
};

// Extend Express types for session user
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      role: string;
      status: string;
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
      if (!user) {
        return done(null, false);
      }
      if (user.status !== "approved") {
        return done(null, false);
      }
      done(null, { id: user.id, username: user.username, role: user.role, status: user.status });
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

        if (user.status === "pending") {
          return done(null, false, { message: "Your account is pending admin approval" });
        }
        if (user.status === "rejected") {
          return done(null, false, { message: "Your account has been rejected" });
        }

        return done(null, { id: user.id, username: user.username, role: user.role, status: user.status });
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
  // Trust first proxy (Traefik/Coolify) so secure cookies and rate limiting work
  app.set("trust proxy", 1);

  // Configure session middleware
  const sessionSecret = requireEnvVar("SESSION_SECRET", "twinengine-dev-secret");
  const isProduction = process.env.NODE_ENV === "production";

  // Use PostgreSQL session store in production, in-memory for development
  const sessionConfig: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
    },
  };

  // Add PostgreSQL session store in production
  if (isProduction) {
    // Create session table inline (connect-pg-simple's createTableIfMissing
    // reads table.sql from disk, which breaks in esbuild single-file bundles)
    pool.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
      CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire");
    `).catch((err: unknown) => console.error("[Auth] Failed to create session table:", err));

    const PgSession = connectPgSimple(session);
    sessionConfig.store = new PgSession({
      pool: pool,
      tableName: "user_sessions",
    });
    debugLog("Auth", "Using PostgreSQL session store");
  } else {
    debugLog("Auth", "Using in-memory session store (development)");
  }

  app.use(session(sessionConfig));

  // Initialize Passport
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Development auth bypass - inject mock user for all requests when SKIP_AUTH is enabled
  if (process.env.SKIP_AUTH === "true") {
    debugLog("Auth", "⚠️  SKIP_AUTH enabled - all requests will use mock user (dev-user-001)");
    app.use((req, _res, next) => {
      if (!req.user) {
        (req as any).user = { ...DEV_MOCK_USER };
      }
      next();
    });
  }
}

/**
 * Middleware to require authentication
 * Returns 401 if user is not authenticated
 *
 * Set SKIP_AUTH=true in .env to bypass authentication during development.
 * This injects a mock user for all requests.
 */
export const requireAuth: RequestHandler = (req, res, next) => {
  // Development bypass - inject mock user when SKIP_AUTH is enabled
  if (process.env.SKIP_AUTH === "true") {
    if (!req.user) {
      (req as any).user = { ...DEV_MOCK_USER };
    }
    return next();
  }

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

/**
 * Middleware to require admin role
 * Extracts user ID from JWT, API token, or session and verifies admin role.
 */
export async function requireAdmin(req: Request, res: Response, next: () => void) {
  // Development bypass
  if (process.env.SKIP_AUTH === "true") {
    if (!req.user) {
      (req as any).user = { ...DEV_MOCK_USER };
    }
    return next();
  }

  const userId =
    (req as unknown as { jwtUser?: { sub: string } }).jwtUser?.sub ||
    (req as unknown as { apiToken?: { userId: string } }).apiToken?.userId ||
    (req as unknown as { user?: { id: string } }).user?.id;

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));

  if (!user || user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}
