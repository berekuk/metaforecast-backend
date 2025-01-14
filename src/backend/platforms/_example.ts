/* Imports */
import axios from "axios";

import { calculateStars } from "../utils/stars";
import { Platform } from "./";

/* Definitions */
const platformName = "example";
const endpoint = "https://example.com/";

/* Support functions */

async function fetchData() {
  let response = await axios({
    url: endpoint,
    method: "GET",
    headers: {
      "Content-Type": "text/html",
    },
  }).then((response) => response.data);
  // console.log(response)
  return response;
}

async function processPredictions(predictions) {
  let results = await predictions.map((prediction) => {
    let id = `${platformName}-${prediction.id}`;
    let probability = prediction.probability;
    let options = [
      {
        name: "Yes",
        probability: probability,
        type: "PROBABILITY",
      },
      {
        name: "No",
        probability: 1 - probability,
        type: "PROBABILITY",
      },
    ];
    let result = {
      title: prediction.title,
      url: `https://example.com`,
      platform: platformName,
      description: prediction.description,
      options: options,
      timestamp: new Date().toISOString(),
      qualityindicators: {
        stars: calculateStars(platformName, {
          /* some: somex, factors: factors */
        }),
        other: prediction.otherx,
        indicators: prediction.indicatorx,
      },
    };
    return result;
  });
  return results; //resultsProcessed
}

/* Body */

export const example: Platform = {
  name: platformName,
  label: "Example platform",
  color: "#ff0000",
  async fetcher() {
    let data = await fetchData();
    let results = await processPredictions(data); // somehow needed
    return results;
  },
};
