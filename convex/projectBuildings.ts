import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_buildings")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
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
      .query("project_buildings")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
  },
});

export const getBySlug = query({
  args: { projectId: v.id("projects"), slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_buildings")
      .withIndex("by_project_slug", (q) =>
        q.eq("projectId", args.projectId).eq("slug", args.slug)
      )
      .unique();
  },
});

export const getByProjectSlugAndBuildingSlug = query({
  args: { projectSlug: v.string(), buildingSlug: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.projectSlug))
      .unique();
    if (!project) return null;
    return await ctx.db
      .query("project_buildings")
      .withIndex("by_project_slug", (q) =>
        q.eq("projectId", project._id).eq("slug", args.buildingSlug)
      )
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("project_buildings") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    floor_plan_url: v.optional(v.string()),
    total_units: v.optional(v.number()),
    floors: v.optional(v.number()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("project_buildings", {
      ...args,
      exterior_media: [],
      interior_media: [],
      gallery_media: [],
      panoramas: [],
      floor_plan_zones: [],
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("project_buildings"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    floor_plan_url: v.optional(v.string()),
    floor_plan_zones: v.optional(v.array(v.any())),
    exterior_media: v.optional(v.array(v.any())),
    interior_media: v.optional(v.array(v.any())),
    gallery_media: v.optional(v.array(v.any())),
    panoramas: v.optional(v.array(v.any())),
    total_units: v.optional(v.number()),
    floors: v.optional(v.number()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("project_buildings") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Update master plan zones on the project ─────────────────────────────────

export const updateProjectMasterPlan = mutation({
  args: {
    projectId: v.id("projects"),
    master_plan_url: v.optional(v.string()),
    master_plan_zones: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const { projectId, ...fields } = args;
    await ctx.db.patch(projectId, fields);
    return projectId;
  },
});
