import { internalMutation } from "./_generated/server";

type LocationRow = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
  country: string;
  city: string;
  projects_count: number;
};

type ProjectRow = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  location: string;
  country: string;
  price_from: number;
  status: "ongoing" | "upcoming" | "completed";
  image_url: string;
  gallery: string[];
  bedrooms_min: number;
  bedrooms_max: number;
  area_from: number;
  area_to: number;
  amenities: string[];
  completion_date: string;
  featured: boolean;
};

/**
 * One-time seed mutation to populate Convex with data from Supabase.
 *
 * How to run:
 * 1. Export your data from Supabase Dashboard → Table Editor → Export CSV
 * 2. Replace the placeholder arrays below with your actual data rows
 * 3. Run `npx convex dev` to deploy this file
 * 4. Go to Convex Dashboard → Functions → seed:seedAll → Run Function
 * 5. Verify data in Convex Dashboard → Data tab
 * 6. You can delete this file after seeding is confirmed
 */
export const seedAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    // --- LOCATIONS ---
    // Replace with your actual location rows from Supabase
    const locationsData: LocationRow[] = [
      // Example:
      // {
      //   name: "Nairobi",
      //   slug: "nairobi",
      //   description: "Kenya's vibrant capital city...",
      //   image_url: "https://...",
      //   country: "Kenya",
      //   city: "Nairobi",
      //   projects_count: 3,
      // },
    ];

    for (const loc of locationsData) {
      await ctx.db.insert("locations", loc);
    }

    // --- PROJECTS ---
    // Replace with your actual project rows from Supabase
    const projectsData: ProjectRow[] = [
      // Example:
      // {
      //   name: "Kelani Heights",
      //   slug: "kelani-heights",
      //   tagline: "Where Nairobi meets the sky",
      //   description: "A landmark development...",
      //   location: "Westlands, Nairobi",
      //   country: "Kenya",
      //   price_from: 12500000,
      //   status: "ongoing",
      //   image_url: "https://...",
      //   gallery: ["https://...", "https://..."],
      //   bedrooms_min: 2,
      //   bedrooms_max: 4,
      //   area_from: 1200,
      //   area_to: 3500,
      //   amenities: ["Rooftop pool", "24/7 concierge", "Smart home systems"],
      //   completion_date: "Q4 2026",
      //   featured: true,
      // },
    ];

    for (const project of projectsData) {
      await ctx.db.insert("projects", project);
    }

    console.log(
      `Seeded ${locationsData.length} locations and ${projectsData.length} projects.`
    );
  },
});
