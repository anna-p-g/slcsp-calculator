const { parse } = require('csv-parse/sync');
const fs  = require("fs");

// Creates a map of zip codes as keys and rate areas as values
const mapZipsToRateAreas = (zipRateAreas) => {
    const zipRateAreaMap = zipRateAreas.reduce((acc, curr) => {
        // if zipCode has more than one rate area, leave rate area null
        if (acc[curr.zipcode]) {
            acc[curr.zipcode] = null
        }
        else {
            acc[curr.zipcode] = `${curr.state}, ${curr.rate_area}`
        }
        return acc
    }, {})

    return zipRateAreaMap
}

// Creates a array where each entry is an object with the 
// zip code from slcsp.csv, and the determined rate area,
// preserving the slcsp.csv zip code order
const getSlcspRateAreasFromZips = (zipRateAreaMap) => {
    // parse zips for which we need to find slcsp
    let slcspZips = fs.readFileSync("./slcsp.csv", {encoding: 'utf8'})
    slcspZips = parse(slcspZips, {columns: true})

    // get rate area for the above zips
    const slcspZipAndRateAreas = []
    for (i in slcspZips) {
        const zip = slcspZips[i].zipcode
        slcspZipAndRateAreas.push({
            zip,
            rateArea: zipRateAreaMap[zip]
        })
    }
    return slcspZipAndRateAreas
}

// Processes the zips.csv file to get zip code and rate area matches
// Uses two helper functions to determine rate area for the zip codes in slcsp.csv
const getRateAreasForSlcspZips = () => {
    let zipRateAreas = fs.readFileSync("./zips.csv", {encoding: 'utf8'})
    zipRateAreas = parse(zipRateAreas, {columns: true})

    const zipRateAreaMap = mapZipsToRateAreas(zipRateAreas)
    const rateAreasForSlcspZips = getSlcspRateAreasFromZips(zipRateAreaMap)

    return rateAreasForSlcspZips
} 

// Main function to find the Slcsp for each zip code in slcps.csv
const findSlcsps = () => {
    const rateAreasForSlcspZips = getRateAreasForSlcspZips()

    // parse plans csv
    let parsedPlans = fs.readFileSync("./plans.csv", {encoding: 'utf8'})
    parsedPlans = parse(parsedPlans, {columns: true})

    // creates a map of silver rates by rateAreas, ie: [...{'NY 1': [200.50, 205.50...]}..]
    const silverPlanRatesByRateArea = parsedPlans.reduce((acc, curr) => {
        rate_area = `${curr.state}, ${curr.rate_area}`

        if (curr.metal_level == "Silver") {
            if (acc[rate_area]) {
                acc[rate_area].push(curr.rate)
            }
            else {
                acc[rate_area] = [curr.rate]
            }
        }
        return acc

    }, {})

    // for each rateArea in slcsp.csv, get the slcsp
    const slcsps = []
    for (i in rateAreasForSlcspZips) {
        const silverRates = silverPlanRatesByRateArea[rateAreasForSlcspZips[i].rateArea]
        const uniqueSilverRates = [...new Set(silverRates)];

        // get silver rates in ascending order
        if (uniqueSilverRates && uniqueSilverRates.length > 1) {
            uniqueSilverRates.sort()
            const slcpsRate = uniqueSilverRates[1]
            slcsps.push({zip: rateAreasForSlcspZips[i].zip, rate: slcpsRate})
        }
        else {
            slcsps.push({zip: rateAreasForSlcspZips[i].zip})
        }
    }

    printSlcsps(slcsps)

}

const printSlcsps = (slcsps) => {
    console.log('zipcode, rate')
    const fileData = ['zipcode, rate']
    for (i in slcsps) {
        if (slcsps[i].rate) {
            const row = `${slcsps[i].zip},${slcsps[i].rate}`
            fileData.push(row)
            console.log(row)
        }
        else {
            const row = `${slcsps[i].zip},`
            fileData.push(row)
            console.log(row)
        }
    }

    fs.writeFileSync("./slcsp.csv", fileData.join('\r\n'))
}


findSlcsps()
