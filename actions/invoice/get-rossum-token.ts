export const getRossumToken = async () => {
  try {
    const loginUrl = `${process.env.ROSSUM_API_URL}/auth/login`;
    const username = process.env.NEXT_PUBLIC_ROSSUM_USER;
    const password = process.env.NEXT_PUBLIC_ROSSUM_PASS;

    const showKey = await fetch(loginUrl, {
      method: "POST",
      body: JSON.stringify({ username, password }),
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then(({ key }) => {
        const showKey = key;
        return showKey;
      });
    return showKey;
  } catch (error) {
    console.log(error, "error - getRossumToken action");
    return error;
  }
};
