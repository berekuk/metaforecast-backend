/* Imports */
import fs from 'fs'
import readline from "readline"

import { astralcodexten } from "./platforms/astralcodexten-fetch.js"
import { betfair } from "./platforms/betfair-fetch.js"
import { coupcast } from "./platforms/coupcast-fetch.js"
import { csetforetell } from "./platforms/csetforetell-fetch.js"
import { elicit } from "./platforms/elicit-fetch.js"
import { estimize } from "./platforms/estimize-fetch.js"
import { fantasyscotus } from "./platforms/fantasyscotus-fetch.js"
import { foretold } from "./platforms/foretold-fetch.js"
import { goodjudgment } from "./platforms/goodjudgment-fetch.js"
import { goodjudgmentopen } from "./platforms/goodjudmentopen-fetch.js"
import { hypermind } from "./platforms/hypermind-fetch.js"
import { kalshi } from "./platforms/kalshi-fetch.js"
import { ladbrokes } from "./platforms/ladbrokes-fetch.js"
import { manifoldmarkets } from "./platforms/manifoldmarkets-fetch.js"
import { metaculus } from "./platforms/metaculus-fetch.js"
import { omen } from "./platforms/omen-fetch.js"
import { polymarket } from "./platforms/polymarket-fetch.js"
import { predictit } from "./platforms/predictit-fetch.js"
import { rootclaim } from "./platforms/rootclaim-fetch.js"
import { smarkets } from "./platforms/smarkets-fetch.js"
import { wildeford } from "./platforms/wildeford-fetch.js"
import { williamhill } from "./platforms/williamhill-fetch.js"
import { mergeEverything } from "./utils/mergeEverything.js"
import { updateHistory } from "./utils/history/updateHistory.js"
import { rebuildAlgoliaDatabase } from "./utils/algolia.js"
import { rebuildNetlifySiteWithNewData } from "./utils/rebuildNetliftySiteWithNewData.js"
import { doEverything, tryCatchTryAgain } from "./utils/doEverything.js"

/* Support functions */
let functions = [astralcodexten, betfair, coupcast, csetforetell, elicit, /* estimize, */ fantasyscotus, foretold, goodjudgment, goodjudgmentopen, hypermind, kalshi, ladbrokes, manifoldmarkets, metaculus, omen, polymarket, predictit, rootclaim, smarkets, wildeford, williamhill, mergeEverything, updateHistory, rebuildAlgoliaDatabase, rebuildNetlifySiteWithNewData, doEverything]
let functionNames = functions.map(fun => fun.name)

let whattodoMessage = functionNames
	.slice(0, functionNames.length - 5)
	.map((functionName, i) => `[${i}]: Download predictions from ${functionName}`)
	.join('\n') +
	`\n[${functionNames.length - 5}]: Merge jsons them into one big json (and push it to mongodb database)` +
	`\n[${functionNames.length - 4}]: Update history` +
	`\n[${functionNames.length - 3}]: Rebuild algolia database ("index")` +
	`\n[${functionNames.length - 2}]: Rebuild netlify site with new data` +
	// `\n[${functionNames.length-1}]: Add to history` +
	`\n[${functionNames.length - 1}]: All of the above` +
	`\nChoose one option, wisely: #`

/* BODY */
let commandLineUtility = async () => {
	let whattodo = async (message, callback) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		rl.question(message, async (answer) => {
			rl.close();
			await callback(answer)
		});
	}

	let executeoption = async (option) => {
		option = Number(option)
		//console.log(functionNames[option])
		if (option < 0) {
			console.log(`Error, ${option} < 0 or ${option} < 0`)
		} else if (option < functions.length) {
			await tryCatchTryAgain(functions[option])
		}
	}

	if (process.argv.length == 3) {
		const option = process.argv[2] // e.g., npm start 15 <-
		const optionNum = Number(option)
		if (!isNaN(optionNum)) {
			await executeoption(optionNum)
		} else if (option == "all") {
			await executeoption(functions.length - 1) // 15 = execute all fetchers
		} else {
			await whattodo(whattodoMessage, executeoption)
		}
	} else (
		await whattodo(whattodoMessage, executeoption)
	)
}

// console.log("1")
// console.log(process.argv)
commandLineUtility()
// doEverything()
