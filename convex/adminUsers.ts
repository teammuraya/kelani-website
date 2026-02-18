import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Check if a Clerk user is an admin
export const isAdmin = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.db
      .query("admin_users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
    return admin !== null;
  },
});

export const getAdmin = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("admin_users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("admin_users").collect();
  },
});

// Add an admin user (super_admin only or first-time setup)
export const addAdmin = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("super_admin")),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("admin_users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("admin_users", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const removeAdmin = mutation({
  args: { id: v.id("admin_users") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
