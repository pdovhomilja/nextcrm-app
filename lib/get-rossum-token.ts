export async function getRossumToken() {
  const loginUrl = `${process.env.ROSSUM_API_URL}/auth/login`;
  const username = process.env.ROSSUM_USER;
  const password = process.env.ROSSUM_PASS;

  const key = await fetch(loginUrl, {
    method: "POST",
    body: JSON.stringify({ username, password }),
    headers: { "Content-Type": "application/json" },
  })
    .then((r) => r.json())
    .then(({ key }) => {
      return key;
    });

  const token = "token " + " " + key;

  return token;
}
