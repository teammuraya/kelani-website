import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Reusable media item validator
const mediaItemValidator = v.object({
  url: v.string(),
  type: v.union(v.literal("video"), v.literal("image")),
  thumbnailUrl: v.optional(v.string()),
  isTransition: v.optional(v.boolean()),
  transitionFromIndex: v.optional(v.number()),
  transitionToIndex: v.optional(v.number()),
  displayOrder: v.optional(v.number()),
  caption: v.optional(v.string()),
});

// Reusable panorama validator
const panoramaValidator = v.object({
  name: v.string(),
  panoramaUrl: v.string(),
  description: v.optional(v.string()),
  initialView: v.optional(v.object({
    yaw: v.number(),
    pitch: v.number(),
    fov: v.number(),
  })),
});

export default defineSchema({
  // ─── PROJECTS ─────────────────────────────────────────────────────────────
  projects: defineTable({
    name: v.string(),
    slug: v.string(),
    tagline: v.string(),
    description: v.string(),
    location: v.string(),
    country: v.string(),
    price_from: v.number(),
    status: v.union(
      v.literal("ongoing"),
      v.literal("upcoming"),
      v.literal("completed")
    ),
    image_url: v.string(),
    gallery: v.array(v.string()),
    bedrooms_min: v.number(),
    bedrooms_max: v.number(),
    area_from: v.number(),
    area_to: v.number(),
    amenities: v.array(v.string()),
    completion_date: v.string(),
    featured: v.boolean(),
    // New media fields
    exterior_media: v.optional(v.array(mediaItemValidator)),
    interior_media: v.optional(v.array(mediaItemValidator)),
    gallery_media: v.optional(v.array(mediaItemValidator)),
    panoramas: v.optional(v.array(panoramaValidator)),
    floor_plan_url: v.optional(v.string()),
    video_url: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_featured", ["featured"])
    .index("by_status", ["status"]),

  // ─── PROJECT UNITS ────────────────────────────────────────────────────────
  project_units: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    bedrooms: v.number(),
    bathrooms: v.number(),
    area_sqft: v.number(),
    price: v.number(),
    status: v.union(
      v.literal("available"),
      v.literal("reserved"),
      v.literal("sold")
    ),
    floor_number: v.optional(v.number()),
    unit_type: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    floor_plan_url: v.optional(v.string()),
    exterior_media: v.optional(v.array(mediaItemValidator)),
    interior_media: v.optional(v.array(mediaItemValidator)),
    gallery_media: v.optional(v.array(mediaItemValidator)),
    panoramas: v.optional(v.array(panoramaValidator)),
    amenities: v.optional(v.array(v.string())),
    featured: v.optional(v.boolean()),
    displayOrder: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_slug", ["projectId", "slug"]),

  // ─── LOCATIONS ────────────────────────────────────────────────────────────
  locations: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    image_url: v.string(),
    country: v.string(),
    city: v.string(),
    projects_count: v.number(),
  }).index("by_slug", ["slug"]),

  // ─── CONTACT ──────────────────────────────────────────────────────────────
  contact_submissions: defineTable({
    full_name: v.string(),
    email: v.string(),
    phone: v.string(),
    message: v.string(),
    project_interest: v.string(),
  }),

  // ─── ADMIN USERS ──────────────────────────────────────────────────────────
  admin_users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("super_admin")),
    createdAt: v.number(),
  })
    .index("by_clerk_id", ["clerkUserId"])
    .index("by_email", ["email"]),
});
