/* Imports */
import axios from "axios";
import { Tabletojson } from "tabletojson";

import { applyIfSecretExists } from "../utils/getSecrets";
import { measureTime } from "../utils/measureTime";
import { calculateStars } from "../utils/stars";
import toMarkdown from "../utils/toMarkdown";
import { Forecast, Platform } from "./";

/* Definitions */
const platformName = "infer";
let htmlEndPoint = "https://www.infer-pub.com/questions";
String.prototype.replaceAll = function replaceAll(search, replace) {
  return this.split(search).join(replace);
};
const DEBUG_MODE: "on" | "off" = "off"; // "off"
const SLEEP_TIME_RANDOM = 7000; // miliseconds
const SLEEP_TIME_EXTRA = 2000;

/* Support functions */

async function fetchPage(page, cookie) {
  console.log(`Page #${page}`);
  if (page == 1) {
    cookie = cookie.split(";")[0]; // Interesting that it otherwise doesn't work :(
  }
  let urlEndpoint = `${htmlEndPoint}/?page=${page}`;
  console.log(urlEndpoint);
  let response = await axios({
    url: urlEndpoint,
    method: "GET",
    headers: {
      "Content-Type": "text/html",
      Cookie: cookie,
    },
  }).then((res) => res.data);
  // console.log(response)
  return response;
}

async function fetchStats(questionUrl, cookie) {
  let response = await axios({
    url: questionUrl + "/stats",
    method: "GET",
    headers: {
      "Content-Type": "text/html",
      Cookie: cookie,
      Referer: questionUrl,
    },
  }).then((res) => res.data);

  if (response.includes("Sign up or sign in to forecast")) {
    throw Error("Not logged in");
  }
  // Init
  let options = [];

  // Parse the embedded json
  let htmlElements = response.split("\n");
  let jsonLines = htmlElements.filter((element) =>
    element.includes("data-react-props")
  );
  let embeddedJsons = jsonLines.map((jsonLine, i) => {
    let innerJSONasHTML = jsonLine.split('data-react-props="')[1].split('"')[0];
    let json = JSON.parse(innerJSONasHTML.replaceAll("&quot;", '"'));
    return json;
  });
  let firstEmbeddedJson = embeddedJsons[0];
  let title = firstEmbeddedJson.question.name;
  let description = firstEmbeddedJson.question.description;
  let comments_count = firstEmbeddedJson.question.comments_count;
  let numforecasters = firstEmbeddedJson.question.predictors_count;
  let numforecasts = firstEmbeddedJson.question.prediction_sets_count;
  let forecastType = firstEmbeddedJson.question.type;
  if (
    forecastType.includes("Binary") ||
    forecastType.includes("NonExclusiveOpinionPoolQuestion") ||
    forecastType.includes("Forecast::Question") ||
    !forecastType.includes("Forecast::MultiTimePeriodQuestion")
  ) {
    options = firstEmbeddedJson.question.answers.map((answer) => ({
      name: answer.name,
      probability: answer.normalized_probability,
      type: "PROBABILITY",
    }));
    if (options.length == 1 && options[0].name == "Yes") {
      let probabilityNo =
        options[0].probability > 1
          ? 1 - options[0].probability / 100
          : 1 - options[0].probability;
      let optionNo = {
        name: "No",
        probability: probabilityNo,
        type: "PROBABILITY",
      };
      options.push(optionNo);
    }
  }
  let result = {
    description: description,
    options: options,
    timestamp: new Date().toISOString(),
    qualityindicators: {
      numforecasts: Number(numforecasts),
      numforecasters: Number(numforecasters),
      comments_count: Number(comments_count),
      stars: calculateStars(platformName, { numforecasts }),
    },
  };
  // console.log(JSON.stringify(result, null, 4));
  return result;
}

function isSignedIn(html) {
  let isSignedInBool = !(
    html.includes("You need to sign in or sign up before continuing") ||
    html.includes("Sign up")
  );
  if (!isSignedInBool) {
    console.log("Error: Not signed in.");
  }
  console.log(`Signed in? ${isSignedInBool}`);
  return isSignedInBool;
}

function isEnd(html) {
  let isEndBool = html.includes("No questions match your filter");
  if (isEndBool) {
    //console.log(html)
  }
  console.log(`IsEnd? ${isEndBool}`);
  return isEndBool;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* Body */

async function infer_inner(cookie: string) {
  let i = 1;
  let response = await fetchPage(i, cookie);
  let results: Forecast[] = [];

  await measureTime(async () => {
    // console.log("Downloading... This might take a couple of minutes. Results will be shown.")
    while (!isEnd(response) && isSignedIn(response)) {
      let htmlLines = response.split("\n");
      // let h4elements = htmlLines.filter(str => str.includes("<h5> <a href=") || str.includes("<h4> <a href="))
      let questionHrefs = htmlLines.filter((str) =>
        str.includes("https://www.infer-pub.com/questions/")
      );
      // console.log(questionHrefs)

      if (process.env.DEBUG_MODE == "on" || DEBUG_MODE == "on") {
        console.log("questionHrefs: ");
        console.log(questionHrefs);
      }

      for (let questionHref of questionHrefs) {
        let elementSplit = questionHref.split('"><span>');
        let url = elementSplit[0].split('<a href="')[1];
        let title = elementSplit[1]
          .replace("</h4>", "")
          .replace("</h5>", "")
          .replace("</span></a>", "");
        await sleep(Math.random() * SLEEP_TIME_RANDOM + SLEEP_TIME_EXTRA); // don't be as noticeable

        try {
          let moreinfo = await fetchStats(url, cookie);
          let questionNumRegex = new RegExp("questions/([0-9]+)");
          let questionNum = url.match(questionNumRegex)[1]; //.split("questions/")[1].split("-")[0];
          let id = `${platformName}-${questionNum}`;
          let question: Forecast = {
            id: id,
            title: title,
            description: moreinfo.description,
            url: url,
            platform: platformName,
            options: moreinfo.options,
            ...moreinfo,
          };
          console.log(JSON.stringify(question, null, 4));
          if (
            i % 30 == 0 &&
            !(process.env.DEBUG_MODE == "on" || DEBUG_MODE == "on")
          ) {
            console.log(`Page #${i}`);
            console.log(question);
          }
          results.push(question);
          if (process.env.DEBUG_MODE == "on" || DEBUG_MODE == "on") {
            console.log(url);
            console.log(question);
          }
        } catch (error) {
          console.log(error);
          console.log(
            `We encountered some error when fetching the URL: ${url}, so it won't appear on the final json`
          );
        }
      }

      i++;

      console.log(
        "Sleeping for ~5secs so as to not be as noticeable to the infer servers"
      );
      await sleep(Math.random() * SLEEP_TIME_RANDOM + SLEEP_TIME_EXTRA); // don't be as noticeable

      try {
        response = await fetchPage(i, cookie);
      } catch (error) {
        console.log(error);
        console.log(
          `The program encountered some error when fetching page #${i}, so it won't appear on the final json. It is possible that this page wasn't actually a prediction question pages`
        );
      }
    }
  });

  if (results.length === 0) {
    console.log("Not updating results, as process was not signed in");
    return;
  }
  return results;
}

export const infer: Platform = {
  name: platformName,
  label: "Infer",
  color: "#223900",
  async fetcher() {
    let cookie = process.env.INFER_COOKIE;
    return await applyIfSecretExists(cookie, infer_inner);
  },
};
