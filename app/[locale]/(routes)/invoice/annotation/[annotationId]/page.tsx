/*
TODO: delete this page in future - it is for testing only
*/
import { getRossumToken } from "@/lib/get-rossum-token";
import React from "react";

async function AnnotationPage({
  params,
}: {
  params: { annotationId: string };
}) {
  const queueId = process.env.ROSSUM_QUEUE_ID;
  const { annotationId } = params;
  const token = await getRossumToken();

  const data = await fetch(
    `${process.env.ROSSUM_API_URL}/queues/${queueId}/export/?format=json&id=${annotationId}`,
    {
      method: "POST",
      headers: { Authorization: token },
    }
  )
    .then((r) => r.json())
    .then((data) => {
      //console.log(data);
      return data;
    });

  return (
    <div>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

export default AnnotationPage;
