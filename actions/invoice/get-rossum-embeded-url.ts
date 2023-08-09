export const getRossumEmbeddedUrl = async (
  embUrl: string,
  rossumToken: string
) => {
  try {
    const data = await fetch(embUrl, {
      method: "POST",
      headers: { Authorization: rossumToken },
    })
      .then((r) => r.json())
      .then((data) => {
        //console.log(data);
        return data;
      });
    return data;
  } catch (error) {
    console.log(error, "error - get Rossum Embedded Url");
    return error;
  }
};
