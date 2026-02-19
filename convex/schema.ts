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

// Master plan zone — now references a PHASE (not a building)
const masterPlanZoneValidator = v.object({
  id: v.string(),
  label: v.string(),        // e.g. "Phase 1", "Phase 2"
  points: v.array(zonePointValidator),
  phaseId: v.optional(v.id("project_phases")),
  status: v.union(
    v.literal("available"),
    v.literal("coming_soon"),
    v.literal("sold_out"),
  ),
});

// Phase unit zone — a unit polygon drawn on the phase plan image/video
const phaseUnitZoneValidator = v.object({
  id: v.string(),
  label: v.string(),        // e.g. "Unit A1", "Plot 12"
  points: v.array(zonePointValidator),
  unitId: v.optional(v.id("project_units")),
  status: v.union(
    v.literal("available"),
    v.literal("reserved"),
    v.literal("sold"),
  ),
});

// Legacy building floor plan zone (kept for backwards compat)
const buildingFloorZoneValidator = v.object({
  id: v.string(),
  label: v.string(),
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
    // Rich media — at project level these are "Site Views" + "Gallery"
    exterior_media: v.optional(v.array(mediaItemValidator)),   // displayed as "Site Views"
    interior_media: v.optional(v.array(mediaItemValidator)),   // displayed as "Project Views"
    gallery_media: v.optional(v.array(mediaItemValidator)),    // "Gallery"
    panoramas: v.optional(v.array(panoramaValidator)),
    floor_plan_url: v.optional(v.string()),
    video_url: v.optional(v.string()),
    // Master plan / site plan
    master_plan_url: v.optional(v.string()),
    master_plan_video_url: v.optional(v.string()),            // video that plays behind the master plan canvas
    master_plan_zones: v.optional(v.array(masterPlanZoneValidator)), // phase zones on master plan
  })
    .index("by_slug", ["slug"])
    .index("by_featured", ["featured"])
    .index("by_status", ["status"]),

  // ─── PROJECT PHASES ───────────────────────────────────────────────────────
  project_phases: defineTable({
    projectId: v.id("projects"),
    name: v.string(),          // e.g. "Phase 1 — Lakefront"
    slug: v.string(),          // e.g. "phase-1"
    description: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    // Phase plan — can be image AND/OR video (canvas overlays the video)
    phase_plan_url: v.optional(v.string()),       // image used as canvas background
    phase_plan_video_url: v.optional(v.string()), // video that plays behind canvas
    phase_unit_zones: v.optional(v.array(phaseUnitZoneValidator)), // unit zones on phase plan
    // Rich media — "Phase Views" + "Gallery"
    exterior_media: v.optional(v.array(mediaItemValidator)),  // "Phase Views"
    gallery_media: v.optional(v.array(mediaItemValidator)),   // "Gallery"
    panoramas: v.optional(v.array(panoramaValidator)),
    displayOrder: v.optional(v.number()),
    total_units: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_slug", ["projectId", "slug"]),

  // ─── PROJECT BUILDINGS (legacy — kept for migration safety) ──────────────
  project_buildings: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    floor_plan_url: v.optional(v.string()),
    floor_plan_zones: v.optional(v.array(buildingFloorZoneValidator)),
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
    phaseId: v.optional(v.id("project_phases")),           // which phase this unit belongs to
    buildingId: v.optional(v.id("project_buildings")),     // legacy
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
    .index("by_phase", ["phaseId"])
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
