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

// Zone point (normalized 0-1 coordinates for resolution independence)
const zonePointValidator = v.object({
  x: v.number(),
  y: v.number(),
});

// Master plan zone (a building zone drawn on the site/master plan)
const masterPlanZoneValidator = v.object({
  id: v.string(),         // client-generated UUID
  label: v.string(),      // e.g. "Block A", "Tower 1"
  points: v.array(zonePointValidator),
  buildingId: v.optional(v.id("project_buildings")),
  status: v.union(
    v.literal("available"),
    v.literal("coming_soon"),
    v.literal("sold_out"),
  ),
});

// Building floor plan zone (a unit polygon drawn on the floor plan image)
const buildingFloorZoneValidator = v.object({
  id: v.string(),         // client-generated UUID
  label: v.string(),      // e.g. "A101"
  points: v.array(zonePointValidator),
  unitId: v.optional(v.id("project_units")),
  status: v.union(
    v.literal("available"),
    v.literal("reserved"),
    v.literal("sold"),
  ),
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
    // Rich media
    exterior_media: v.optional(v.array(mediaItemValidator)),
    interior_media: v.optional(v.array(mediaItemValidator)),
    gallery_media: v.optional(v.array(mediaItemValidator)),
    panoramas: v.optional(v.array(panoramaValidator)),
    floor_plan_url: v.optional(v.string()),
    video_url: v.optional(v.string()),
    // Master plan / site plan
    master_plan_url: v.optional(v.string()),        // the site/master plan image
    master_plan_zones: v.optional(v.array(masterPlanZoneValidator)), // drawn building zones
  })
    .index("by_slug", ["slug"])
    .index("by_featured", ["featured"])
    .index("by_status", ["status"]),

  // ─── PROJECT BUILDINGS ────────────────────────────────────────────────────
  project_buildings: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    // Floor plan image on which unit zones are drawn
    floor_plan_url: v.optional(v.string()),
    floor_plan_zones: v.optional(v.array(buildingFloorZoneValidator)),
    // Rich media (same as units)
    exterior_media: v.optional(v.array(mediaItemValidator)),
    interior_media: v.optional(v.array(mediaItemValidator)),
    gallery_media: v.optional(v.array(mediaItemValidator)),
    panoramas: v.optional(v.array(panoramaValidator)),
    displayOrder: v.optional(v.number()),
    total_units: v.optional(v.number()),
    floors: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_slug", ["projectId", "slug"]),

  // ─── PROJECT UNITS ────────────────────────────────────────────────────────
  project_units: defineTable({
    projectId: v.id("projects"),
    buildingId: v.optional(v.id("project_buildings")),   // which building this unit is in
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
    .index("by_building", ["buildingId"])
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
