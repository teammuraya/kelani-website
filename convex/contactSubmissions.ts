import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: {
    full_name: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    project_interest: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("contact_submissions", {
      full_name: args.full_name,
      email: args.email,
      phone: args.phone,
      message: args.message,
      project_interest: args.project_interest,
    });
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("contact_submissions").order("desc").collect();
  },
});

export const remove = mutation({
  args: { id: v.id("contact_submissions") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
