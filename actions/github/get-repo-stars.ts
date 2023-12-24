import axios, { AxiosResponse } from "axios";

export default async function getGithubRepoStars(): Promise<number> {
  try {
    const response: AxiosResponse<any> = await axios.get(
      process.env.NEXT_PUBLIC_GITHUB_REPO_URL ||
        "https://github.com/pdovhomilja/nextcrm-app",
      {
        headers: {
          Authorization: `token ${process.env.NEXT_PUBLIC_GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    const stars = response.data;

    return stars.stargazers_count;
  } catch (error) {
    console.error("Error fetching commits:", error);
    return 0;
  }
}
