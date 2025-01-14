import { NextApiRequest, NextApiResponse } from "next/types";

import { pgInsertIntoDashboard } from "../../backend/database/pg-wrapper";
import { hash } from "../../backend/utils/hash";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.status(400).send("Expected POST request");
    return;
  }

  let body = req.body;
  console.log(body);
  try {
    let id = hash(JSON.stringify(body.ids));
    let pgResponse = await pgInsertIntoDashboard({
      datum: {
        id: id,
        title: body.title || "",
        description: body.description || "",
        contents: body.ids,
        creator: body.creator || "",
        extra: [],
      },
    });
    res.status(200).send({
      dashboardId: id,
      pgResponse: pgResponse,
    });
  } catch (error) {
    res.status(400).send({
      id: null,
      pgResponse: JSON.stringify(error),
    });
  }
}
