/*
TODO: delete this page in future - it is for testing only
*/
import { getRossumToken } from "@/lib/get-rossum-token";
import axios from "axios";
import React from "react";

async function AnnotationPage(
  props: {
    params: Promise<{ annotationId: string }>;
  }
) {
  const params = await props.params;
  const queueId = process.env.ROSSUM_QUEUE_ID;
  const { annotationId } = params;
  const token = await getRossumToken();

  console.log("Token", token);

  const rossumAnnotation = await axios.get(
    `${process.env.ROSSUM_API_URL}/annotations/${annotationId}/content`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return (
    <div>
      <pre>{JSON.stringify(rossumAnnotation.data, null, 2)}</pre>
    </div>
  );
}

export default AnnotationPage;
