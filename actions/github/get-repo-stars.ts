export default async function getGithubRepoStars(): Promise<number> {
  try {
    const response = await fetch(
      process.env.NEXT_PUBLIC_GITHUB_REPO_API ||
        "https://api.github.com/repos/pdovhomilja/nextcrm-app",
      {
        headers: {
          Authorization: `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
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
