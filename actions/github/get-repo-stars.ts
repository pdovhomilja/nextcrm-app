export default async function getGithubRepoStars(): Promise<number> {
  try {
    // Unauthenticated GitHub API call — no token. (The old NEXT_PUBLIC_GITHUB_TOKEN
    // shipped a token to the browser and isn't needed: this is just the login-page
    // star count, which falls back to 0 on any error.)
    const response = await fetch(
      process.env.NEXT_PUBLIC_GITHUB_REPO_API ||
        "https://api.github.com/repos/pdovhomilja/nextcrm-app",
      {
        headers: {
          Accept: "application/vnd.github.v3+json",
        },
      }
    );
    const stars = await response.json();
    return stars.stargazers_count;
  } catch (error) {
    console.error("Error fetching commits:", error);
    return 0;
  }
}
