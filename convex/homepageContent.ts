import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/** Get the homepage content document (single row) */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const docs = await ctx.db.query("homepage_content").collect();
    return docs[0] ?? null;
  },
});

/** Create or update the homepage content document */
export const upsert = mutation({
  args: {
    hero_bg: v.optional(v.string()),
    hero_thumb_1: v.optional(v.string()),
    hero_thumb_2: v.optional(v.string()),
    card_amenities: v.optional(v.string()),
    card_floor_plans: v.optional(v.string()),
    card_neighbourhood: v.optional(v.string()),
    about_main: v.optional(v.string()),
    about_detail: v.optional(v.string()),
    cta_bg: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("homepage_content").collect();
    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, args);
      return existing[0]._id;
    } else {
      return await ctx.db.insert("homepage_content", args);
    }
  },
});
