import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_units")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getById = query({
  args: { unitId: v.id("project_units") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.unitId);
  },
});

export const getByProjectSlug = query({
  args: { projectSlug: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.projectSlug))
      .unique();
    if (!project) return [];
    return await ctx.db
      .query("project_units")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
  },
});

export const getByProjectSlugAndUnitSlug = query({
  args: { projectSlug: v.string(), unitSlug: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.projectSlug))
      .unique();
    if (!project) return null;
    return await ctx.db
      .query("project_units")
      .withIndex("by_project_slug", (q) =>
        q.eq("projectId", project._id).eq("slug", args.unitSlug)
      )
      .unique();
  },
});

export const getBySlug = query({
  args: { projectId: v.id("projects"), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_units")
      .withIndex("by_project_slug", (q) =>
        q.eq("projectId", args.projectId).eq("slug", args.slug)
      )
      .unique();
  },
});

export const getByPhase = query({
  args: { phaseId: v.id("project_phases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_units")
      .withIndex("by_phase", (q) => q.eq("phaseId", args.phaseId))
      .collect();
  },
});

export const getByBuilding = query({
  args: { buildingId: v.id("project_buildings") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_units")
      .withIndex("by_building", (q) => q.eq("buildingId", args.buildingId))
      .collect();
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    phaseId: v.optional(v.id("project_phases")),
    buildingId: v.optional(v.id("project_buildings")),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    bedrooms: v.number(),
    bathrooms: v.number(),
    area_sqft: v.number(),
    price: v.number(),
    status: v.union(v.literal("available"), v.literal("reserved"), v.literal("sold")),
    floor_number: v.optional(v.number()),
    unit_type: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    banner_image_url: v.optional(v.string()),
    floor_plan_url: v.optional(v.string()),
    amenities: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("project_units", {
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
    id: v.id("project_units"),
    phaseId: v.optional(v.id("project_phases")),
    buildingId: v.optional(v.id("project_buildings")),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    area_sqft: v.optional(v.number()),
    price: v.optional(v.number()),
    status: v.optional(v.union(v.literal("available"), v.literal("reserved"), v.literal("sold"))),
    floor_number: v.optional(v.number()),
    unit_type: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    banner_image_url: v.optional(v.string()),
    floor_plan_url: v.optional(v.string()),
    exterior_media: v.optional(v.array(v.any())),
    interior_media: v.optional(v.array(v.any())),
    gallery_media: v.optional(v.array(v.any())),
    panoramas: v.optional(v.array(v.any())),
    amenities: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("project_units") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
