import { User } from "next-auth";
import { Fetcher } from "swr";

const fetcher: Fetcher<any, string> = (url) =>
  fetch(url).then((res) => res.json());

export default fetcher;
