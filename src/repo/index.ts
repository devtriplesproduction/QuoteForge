import type { Repository } from "@/repo/repository";
import { createLocalRepo } from "@/repo/localRepo";
import { createApiRepo } from "@/repo/apiRepo";

let repo: Repository | null = null;
console.log(import.meta.env.VITE_USE_API);

// export function getRepo(): Repository {
//   if (!repo) {
//     if (import.meta.env.VITE_USE_API === "true") {
//       repo = createApiRepo();
//     } else {
//       repo = createLocalRepo();
//     }
//   }
//   return repo;
// }
export function getRepo(): Repository {
  if (!repo) {
    console.log("VITE_USE_API =", import.meta.env.VITE_USE_API);

    if (import.meta.env.VITE_USE_API === "true") {
      console.log("Using API Repo");
      repo = createApiRepo();
    } else {
      console.log("Using Local Repo");
      repo = createLocalRepo();
    }
  }
  return repo;
}