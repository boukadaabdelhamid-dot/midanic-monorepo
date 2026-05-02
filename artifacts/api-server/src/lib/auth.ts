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

export function signToken(payload: { id: number; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
}

export interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
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

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      req.user = verifyToken(authHeader.slice(7));
    } catch {
      // ignore — auth is optional
    }
  }
  next();
}
