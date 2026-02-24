import { db } from "./db";
import { users, type User } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export interface UserCreateInput {
  username: string;
  email?: string;
  password: string;
  role?: "admin" | "user";
}

export interface UserUpdateInput {
  email?: string;
  role?: "admin" | "user";
  isActive?: boolean;
  password?: string;
}

export class UserManagement {
  async hasAnyUsers() {
    const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
    return existingUsers.length > 0;
  }

  async hasAdminUser() {
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    return adminUsers.length > 0;
  }

  async createUser(input: UserCreateInput) {
    const hashedPassword = this.hashPassword(input.password);

    const [user] = await db
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        password: hashedPassword,
        role: input.role || "user",
      })
      .returning();

    return this.sanitizeUser(user);
  }

  async getUser(id: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    return user ? this.sanitizeUser(user) : null;
  }

  async getUserByUsername(username: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    return user || null;
  }

  async getAllUsers() {
    const allUsers = await db.select().from(users);
    return allUsers.map((u: User) => this.sanitizeUser(u));
  }

  async updateUser(id: number, input: UserUpdateInput) {
    const updateData: any = {};

    if (input.email !== undefined) updateData.email = input.email;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.password !== undefined) {
      updateData.password = this.hashPassword(input.password);
    }

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return user ? this.sanitizeUser(user) : null;
  }

  async deleteUser(id: number) {
    await db.delete(users).where(eq(users.id, id));
  }

  async verifyPassword(username: string, password: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    if (!user) return false;

    const hashedInput = this.hashPassword(password);
    return user.password === hashedInput;
  }

  async updateLastLogin(id: number) {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, id));
  }

  private hashPassword(password: string): string {
    // 本番環境ではbcryptを使用してください
    // This is a simple hash for development
    return crypto.createHash("sha256").update(password).digest("hex");
  }

  private sanitizeUser(user: User) {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

export const userManagement = new UserManagement();
