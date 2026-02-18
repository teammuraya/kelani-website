import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getFeatured = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_featured", (q) => q.eq("featured", true))
      .take(3);
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects").order("desc").collect();
  },
});

export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getRelated = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("projects").collect();
    return all.filter((p) => p.slug !== args.slug).slice(0, 2);
  },
});

export const getNamesAndSlugs = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("projects").collect();
    return all.map((p) => ({ name: p.name, slug: p.slug }));
  },
});

// ─── ADMIN MUTATIONS ────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    tagline: v.string(),
    description: v.string(),
    location: v.string(),
    country: v.string(),
    price_from: v.number(),
    status: v.union(v.literal("ongoing"), v.literal("upcoming"), v.literal("completed")),
    image_url: v.string(),
    gallery: v.array(v.string()),
    bedrooms_min: v.number(),
    bedrooms_max: v.number(),
    area_from: v.number(),
    area_to: v.number(),
    amenities: v.array(v.string()),
    completion_date: v.string(),
    featured: v.boolean(),
    floor_plan_url: v.optional(v.string()),
    video_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      ...args,
      exterior_media: [],
      interior_media: [],
      gallery_media: [],
      panoramas: [],
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    price_from: v.optional(v.number()),
    status: v.optional(v.union(v.literal("ongoing"), v.literal("upcoming"), v.literal("completed"))),
    image_url: v.optional(v.string()),
    gallery: v.optional(v.array(v.string())),
    bedrooms_min: v.optional(v.number()),
    bedrooms_max: v.optional(v.number()),
    area_from: v.optional(v.number()),
    area_to: v.optional(v.number()),
    amenities: v.optional(v.array(v.string())),
    completion_date: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    floor_plan_url: v.optional(v.string()),
    video_url: v.optional(v.string()),
    exterior_media: v.optional(v.array(v.any())),
    interior_media: v.optional(v.array(v.any())),
    gallery_media: v.optional(v.array(v.any())),
    panoramas: v.optional(v.array(v.any())),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    // Also delete all units for this project
    const units = await ctx.db
      .query("project_units")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();
    for (const unit of units) {
      await ctx.db.delete(unit._id);
    }
    await ctx.db.delete(args.id);
  },
});
