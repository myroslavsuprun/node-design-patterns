import { createReadStream } from "fs";
import { PassThrough, pipeline } from "stream";
import * as R from "ramda";

const LONDON_CRIME_DATA = "london_crime_by_lsoa.csv";

main();

const parseLines = (chunk, prevChunkLastLine) => {
  const completeWithPrev = prevChunkLastLine + chunk;
  const lines = completeWithPrev.split("\n");
  const isCompleteChunk = completeWithPrev.endsWith("\n");
  const lastUnfinishedLine = R.not(isCompleteChunk)
    ? R.nth(0, R.takeLast(1, lines))
    : "";

  return [isCompleteChunk ? lines : R.dropLast(1, lines), lastUnfinishedLine];
};

const isNotEmpty = (line) => line.length > 0;
const isNotHeader = (line, index) => index > 0 || !line.startsWith("lsoa_code");
const parseLine = (line) => line.split(",");
const processLines = (lines) =>
  R.filter(isNotEmpty, lines).filter(isNotHeader).map(parseLine);

const parseColumns = (columns) => {
  const [lsoa, borough, majorCategory, minorCategory, value, year, month] =
    columns;
  return {
    lsoa,
    borough,
    majorCategory,
    minorCategory,
    value: Number(value),
    year: Number(year),
    month: Number(month),
  };
};
const processCrimes = (crimesMap, majorCategory, value) => {
  if (crimesMap.has(majorCategory)) {
    const prev = crimesMap.get(majorCategory);
    crimesMap.set(majorCategory, value + prev);
  } else {
    crimesMap.set(majorCategory, value);
  }

  return crimesMap;
};
const processBoroughCrimes = (
  boroughCrimesMap,
  borough,
  majorCategory,
  value,
) => {
  if (boroughCrimesMap.has(borough)) {
    const boroughCrimes = boroughCrimesMap.get(borough);

    if (boroughCrimes.has(majorCategory)) {
      const crimeValue = boroughCrimes.get(majorCategory);
      boroughCrimes.set(majorCategory, value + crimeValue);
    } else {
      boroughCrimes.set(majorCategory, value);
    }
  } else {
    boroughCrimesMap.set(borough, new Map([[majorCategory, value]]));
  }

  return boroughCrimesMap;
};
const processBoroughs = (boroughsMap, borough, value) => {
  if (boroughsMap.has(borough)) {
    const prev = boroughsMap.get(borough);
    boroughsMap.set(borough, prev + value);
  } else {
    boroughsMap.set(borough, value);
  }

  return boroughsMap;
};
const processYears = (yearMap, year, value) => {
  if (yearMap.has(year)) {
    const prev = yearMap.get(year);
    yearMap.set(year, prev + value);
  } else {
    yearMap.set(year, value);
  }

  return yearMap;
};
const accumulateCrimeData = (acc, columns) => {
  const { borough, majorCategory, year, value } = parseColumns(columns);

  const crimesMap = processCrimes(acc.crimesMap, majorCategory, value);
  const boroughCrimesMap = processBoroughCrimes(
    acc.boroughCrimesMap,
    borough,
    majorCategory,
    value,
  );
  const boroughsMap = processBoroughs(acc.boroughsMap, borough, value);
  const yearMap = processYears(acc.yearMap, year, value);

  return {
    crimesMap,
    boroughCrimesMap,
    boroughsMap,
    yearMap,
  };
};

const getLeastCommonCrime = (crimesMap) => {
  const sorted = R.sort(([, a], [, b]) => a - b, Array.from(crimesMap));

  return R.nth(0, sorted);
};
const getBoroughsMostCommonCrimes = (boroughCrimesMap) => {
  return R.map(([borough, crimes]) => {
    const sorted = R.sort(([, a], [, b]) => b - a, Array.from(crimes));
    const mostCommon = R.nth(0, sorted);
    return {
      borough,
      crime: mostCommon[0],
      value: mostCommon[1],
    };
  }, Array.from(boroughCrimesMap));
};
const getMostDangerousBorough = (boroughsMap) => {
  const sorted = R.sort(([, a], [, b]) => b - a, Array.from(boroughsMap));

  return R.nth(0, sorted);
};
const getIfLastYearsPositiveTendency = (yearMap, fromYears) => {
  const sortedByYearsDesc = R.sort(R.descend(R.head), Array.from(yearMap));

  const recentYears = R.take(fromYears, sortedByYearsDesc);

  const reduce = R.addIndex(R.reduce);
  return reduce(
    (acc, [, value], idx, arr) => {
      if (idx === 0) {
        return acc;
      }
      const prev = R.nth(idx - 1, arr);
      const prevValue = R.nth(1, prev);
      return prevValue < value || acc;
    },
    false,
    recentYears,
  );
};
const finalizeDataProcessing = (acc) => {
  const leastCommonCrime = getLeastCommonCrime(acc.crimesMap);
  const boroughsMostCommonCrimes = getBoroughsMostCommonCrimes(
    acc.boroughCrimesMap,
  );
  const mostDangerousBorough = getMostDangerousBorough(acc.boroughsMap);
  const hasPositiveLastYearsTendency = getIfLastYearsPositiveTendency(
    acc.yearMap,
    4,
  );
  return {
    leastCommonCrime,
    boroughsMostCommonCrimes,
    mostDangerousBorough,
    hasPositiveLastYearsTendency,
  };
};

function main() {
  const read = createReadStream(LONDON_CRIME_DATA);
  const passThrough = new PassThrough();

  passThrough.setEncoding("utf8");

  let dataAccumulation = {
    yearMap: new Map(),
    boroughsMap: new Map(),
    boroughCrimesMap: new Map(),
    crimesMap: new Map(),
  };
  let lastLineBuffer = "";

  passThrough.on("data", (chunk) => {
    const [lines, incompleteLine] = parseLines(chunk, lastLineBuffer);
    lastLineBuffer = incompleteLine;
    const processedLines = processLines(lines);

    dataAccumulation = R.reduce(
      accumulateCrimeData,
      dataAccumulation,
      processedLines,
    );
  });

  pipeline(read, passThrough, (err) => {
    if (err) {
      console.error("Pipeline failed", err);
      return;
    }

    const {
      hasPositiveLastYearsTendency,
      mostDangerousBorough,
      leastCommonCrime,
      boroughsMostCommonCrimes,
    } = finalizeDataProcessing(dataAccumulation);

    console.log(
      `The least common crime in the City of London is ${leastCommonCrime[0]} - ${leastCommonCrime[1]}.`,
    );
    console.log(
      `Did the number of crimes increased over the last 4 years? - ${hasPositiveLastYearsTendency}.`,
    );
    console.log(
      `Most dangerous borough: ${mostDangerousBorough[0]} - ${mostDangerousBorough[1]}.`,
    );
    R.forEach(
      ({ borough, crime, value }) =>
        console.log(`Most common crime in ${borough} is ${crime} - ${value}.`),
      boroughsMostCommonCrimes,
    );
  });
}

// ✅ Did the number of crimes go up or down over the years?
// ✅ What are the most dangerous areas of London?
// ✅ What is the most common crime per area?
// ✅ What is the least common crime?
//
// Output:
// The least common crime in the City of London is Sexual Offences - 1273.
// Did the number of crimes increased over the last 4 years? - true.
// Most dangerous borough: Westminster - 455028.
// Most common crime in Croydon is Theft and Handling - 91437.
// Most common crime in Greenwich is Theft and Handling - 64923.
// Most common crime in Bromley is Theft and Handling - 69742.
// Most common crime in Redbridge is Theft and Handling - 71496.
// Most common crime in Wandsworth is Theft and Handling - 92523.
// Most common crime in Ealing is Theft and Handling - 93834.
// Most common crime in Hounslow is Theft and Handling - 70180.
// Most common crime in Newham is Theft and Handling - 106146.
// Most common crime in Sutton is Theft and Handling - 39533.
// Most common crime in Haringey is Theft and Handling - 83979.
// Most common crime in Lambeth is Theft and Handling - 114899.
// Most common crime in Richmond upon Thames is Theft and Handling - 40858.
// Most common crime in Hillingdon is Theft and Handling - 80028.
// Most common crime in Havering is Theft and Handling - 52609.
// Most common crime in Barking and Dagenham is Theft and Handling - 50999.
// Most common crime in Kingston upon Thames is Theft and Handling - 38226.
// Most common crime in Westminster is Theft and Handling - 277617.
// Most common crime in Hackney is Theft and Handling - 91118.
// Most common crime in Enfield is Theft and Handling - 70371.
// Most common crime in Harrow is Theft and Handling - 40800.
// Most common crime in Lewisham is Theft and Handling - 70382.
// Most common crime in Brent is Theft and Handling - 72523.
// Most common crime in Southwark is Theft and Handling - 109432.
// Most common crime in Barnet is Theft and Handling - 87285.
// Most common crime in Waltham Forest is Theft and Handling - 77940.
// Most common crime in Camden is Theft and Handling - 140596.
// Most common crime in Bexley is Theft and Handling - 40071.
// Most common crime in Kensington and Chelsea is Theft and Handling - 95963.
// Most common crime in Islington is Theft and Handling - 107661.
// Most common crime in Tower Hamlets is Theft and Handling - 87620.
// Most common crime in Hammersmith and Fulham is Theft and Handling - 86381.
// Most common crime in Merton is Theft and Handling - 44128.
// Most common crime in City of London is Theft and Handling - 561.
