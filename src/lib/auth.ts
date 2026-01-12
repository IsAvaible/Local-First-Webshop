import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db/connection";
import * as schema from "@/db/schema";
import { networkInterfaces } from "os";
import { moveAnonymousUserData } from "@/lib/auth-migrations.ts";

// Get network IP for trusted origins
const nets = networkInterfaces();
let networkIP = "192.168.1.1"; // fallback

for (const name of Object.keys(nets)) {
  const netInterfaces = nets[name];
  if (netInterfaces) {
    for (const net of netInterfaces) {
      if (net.family === "IPv4" && !net.internal) {
        networkIP = net.address;
        break;
      }
    }
  }
}

export const auth = betterAuth({
  plugins: [
    anonymous({
      // When an anonymous user links to a new account, this function is called
      // to migrate data from the anonymous user to the new user.
      onLinkAccount: async ({ newUser, anonymousUser }) => {
        await moveAnonymousUserData(anonymousUser.user.id, newUser.user.id);
      }
    })
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Immediately create the settings row when a user is created
          try {
            await db.insert(schema.userSettingsTable).values({
              user_id: user.id
            });
          } catch (e) {
            console.error("Failed to create user settings:", e);
          }
        }
      }
    }
  },

  database: drizzleAdapter(db, {
    provider: "pg",
    usePlural: true,
    schema
    // debugLogs: true,
  }),
  emailAndPassword: {
    enabled: true,
    // Disable signup in production, allow in dev
    disableSignUp: process.env.NODE_ENV === "production",
    minPasswordLength: process.env.NODE_ENV === "production" ? 8 : 1
  },
  trustedOrigins: [
    "https://local-first-webshop.localhost",
    `https://${networkIP}`,
    "http://localhost:5173" // fallback for direct Vite access
  ]
});
