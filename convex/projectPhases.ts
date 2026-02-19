import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_phases")
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
      .query("project_phases")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
  },
});

export const getByProjectSlugAndPhaseSlug = query({
  args: { projectSlug: v.string(), phaseSlug: v.string() },
  handler: async (ctx, args) => {
    const project = await ctx.db
      .query("projects")
      .withIndex("by_slug", (q) => q.eq("slug", args.projectSlug))
      .unique();
    if (!project) return null;
    return await ctx.db
      .query("project_phases")
      .withIndex("by_project_slug", (q) =>
        q.eq("projectId", project._id).eq("slug", args.phaseSlug)
      )
      .unique();
  },
});

export const getById = query({
  args: { id: v.id("project_phases") },
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
    phase_plan_url: v.optional(v.string()),
    phase_plan_video_url: v.optional(v.string()),
    total_units: v.optional(v.number()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("project_phases", {
      ...args,
      exterior_media: [],
      gallery_media: [],
      panoramas: [],
      phase_unit_zones: [],
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("project_phases"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    phase_plan_url: v.optional(v.string()),
    phase_plan_video_url: v.optional(v.string()),
    phase_unit_zones: v.optional(v.array(v.any())),
    exterior_media: v.optional(v.array(v.any())),
    gallery_media: v.optional(v.array(v.any())),
    panoramas: v.optional(v.array(v.any())),
    total_units: v.optional(v.number()),
    displayOrder: v.optional(v.number()),
  },
  handler: async (ctx, { id, ...fields }) => {
    await ctx.db.patch(id, fields);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("project_phases") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// ─── Update master plan zones on the project ─────────────────────────────────

export const updateProjectMasterPlan = mutation({
  args: {
    projectId: v.id("projects"),
    master_plan_url: v.optional(v.string()),
    master_plan_video_url: v.optional(v.string()),
    master_plan_zones: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args) => {
    const { projectId, ...fields } = args;
    await ctx.db.patch(projectId, fields);
    return projectId;
  },
});
