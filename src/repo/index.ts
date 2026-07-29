import type { Repository } from "@/repo/repository";
import { createLocalRepo } from "@/repo/localRepo";
import { createApiRepo } from "@/repo/apiRepo";

console.log(import.meta.env.VITE_USE_API);
let repo: Repository | null = null;

export function getRepo(): Repository {
  if (!repo) {
    if (import.meta.env.VITE_USE_API === "true") {
      repo = createApiRepo();
    } else {
      repo = createLocalRepo();
    }
  }
  return repo;
}
