import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Generate a short-lived upload URL for client-side file uploads to Convex storage */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Get a served URL for a file in Convex storage */
export const getUrl = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/** Query version — useful for display without triggering mutations */
export const getUrlQuery = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/** Delete a file from Convex storage */
export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    try {
      await ctx.storage.delete(args.storageId);
      return { success: true };
    } catch {
      return { success: false, reason: "File not found or already deleted" };
    }
  },
});
