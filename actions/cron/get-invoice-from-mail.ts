"use server";

import axios from "axios";

export async function runCronJob() {
  const response = await axios.get(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/invoice/get-invoice-from-email`
  );
  const data = await response.data;
  console.log("Response from cron job:", data);
  //refresh the page

  return data;
}
