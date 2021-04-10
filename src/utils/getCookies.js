import fs from 'fs'

export function getCookie(property){
    let answer = 0
    try {
        let rawcookie = fs.readFileSync("./src/input/privatekeys.json")
        let cookie = JSON.parse(rawcookie)
        if (cookie[property]){
            answer = cookie[property]
            console.log(`Got cookie: ${answer.slice(0,5)}...`)
        }
    } catch (error) {
        console.log(error)
    }
    return answer
}

export async function applyIfCookieExists(cookie, fun){
    if(cookie){
        await fun(cookie)
    }else if(!cookie){
        console.log(`Cannot proceed with ${fun.name} because cookie does not exist`)
        throw new Error(`No cookie for ${fun.name}`)
    }
}