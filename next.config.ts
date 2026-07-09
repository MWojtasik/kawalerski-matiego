import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	// Pin the workspace root to this project. Git worktrees nest under the main
	// repo, so Next would otherwise pick the parent repo's lockfile as the root
	// and fail to resolve the app during build.
	turbopack: {
		root: __dirname,
	},
};

export default nextConfig;

// Enable calling `getCloudflareContext()` in `next dev`.
// See https://opennext.js.org/cloudflare/bindings#local-access-to-bindings.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
