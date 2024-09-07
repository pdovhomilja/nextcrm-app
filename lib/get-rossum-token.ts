import axios from "axios";

export async function getRossumToken() {
  const loginUrl = `${process.env.ROSSUM_API_URL}/auth/login`;
  const username = process.env.ROSSUM_USER;
  const password = process.env.ROSSUM_PASS;

  const response = await axios.post(
    loginUrl,
    {
      username: username,
      password: password,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const token = response.data.key;

  return token;
}
