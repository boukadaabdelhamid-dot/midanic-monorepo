import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";

function resolveJwtSecret(): string {
  const envSecret = process.env["JWT_SECRET"];
  if (envSecret) return envSecret;
  if (process.env["NODE_ENV"] === "production") {
    throw new Error("JWT_SECRET environment variable must be set in production.");
  }
  const generated = randomBytes(32).toString("hex");
  console.warn("[auth] WARNING: JWT_SECRET not set — using a randomly generated secret. Tokens will be invalidated on restart. Set JWT_SECRET for persistence.");
  return generated;
}

const JWT_SECRET: string = resolveJwtSecret();

export type JwtPayload = { id: number; email: string; role: string; currentStoreId?: number | null };

export function signToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  currentStoreId?: number;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const token = authHeader.slice(7);
    req.user = verifyToken(token);
    if (typeof req.user.currentStoreId === "number") {
      req.currentStoreId = req.user.currentStoreId;
    }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

export function requireStaff(req: AuthRequest, res: Response, next: NextFunction) {
  const role = req.user?.role;
  if (role !== "admin" && role !== "employee") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}

/**
 * Ensure a current store is selected. Used on every tenant-scoped ERP route.
 * Must be placed AFTER authenticate.
 */
export function requireStore(req: AuthRequest, res: Response, next: NextFunction) {
  if (typeof req.currentStoreId !== "number") {
    res.status(400).json({ error: "No store selected. Call /auth/select-store first." });
    return;
  }
  next();
}

export function isAdmin(req: AuthRequest): boolean {
  return req.user?.role === "admin";
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(authHeader.slice(7));
      if (typeof req.user.currentStoreId === "number") {
        req.currentStoreId = req.user.currentStoreId;
      }
    } catch {
      // ignore — auth is optional
    }
  }
  next();
}
