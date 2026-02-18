import { query } from "./_generated/server";

export const getTopFour = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("locations").collect();
    return all.sort((a, b) => b.projects_count - a.projects_count).slice(0, 4);
  },
});

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("locations").collect();
    return all.sort((a, b) => b.projects_count - a.projects_count);
  },
});
