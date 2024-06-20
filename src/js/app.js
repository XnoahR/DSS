document.addEventListener("DOMContentLoaded", (event) => {
  document.querySelector("form").addEventListener("submit", function (e) {
    e.preventDefault();
    const selectedSector = document.getElementById("sector").value;
    const selectedMethod = document.getElementById("method").value;
    fetch("../data/data.json")
      .then((response) => response.json())
      .then((data) => {
        const filteredData = data.filter(
          (row) => row["Kode_Kbli"] == selectedSector
        );
        if (filteredData.length > 0) {
          if (selectedMethod === "VIKOR") {
            calculateVIKOR(filteredData);
          } else if (selectedMethod === "TOPSIS") {
            calculateTOPSIS(filteredData);
          } else {
            alert("Please select a valid method.");
          }
        } else {
          alert("No data available for the selected sector.");
        }
      })
      .catch((error) => console.error("Error fetching the data:", error));
  });
});

function displayResult(result) {
  const resultTable = document.getElementById("resultTable");
  resultTable.innerHTML = "";

  result.forEach((row, index) => {
    const tr = document.createElement("tr");
    tr.className = "bg-white dark:bg-gray-800";

    const rankTd = document.createElement("td");
    rankTd.className =
      "px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white";
    rankTd.textContent = index + 1;

    const areaTd = document.createElement("td");
    areaTd.className = "px-6 py-4";
    areaTd.textContent = row.area;

    const scoreTd = document.createElement("td");
    scoreTd.className = "px-6 py-4";
    scoreTd.textContent = row.score.toFixed(4);

    tr.appendChild(rankTd);
    tr.appendChild(areaTd);
    tr.appendChild(scoreTd);

    resultTable.appendChild(tr);
  });
}

function calculateVIKOR(data) {
  const criteria = [
    "Resiko",
    "Jumlah Tenaga Kerja pada Sektor",
    "Klaster Industri",
    "Distribusi Listrik PLN",
    "Jumlah Pelanggan Air",
  ];
  const weights = [0.2, 0.2, 0.2, 0.2, 0.2]; // Adjust weights to include the new criterion
  const n = data.length;
  const m = criteria.length;

  if (n < 1) {
    alert("No data points to calculate VIKOR.");
    return;
  }

  if (n === 1) {
    // Handle the case where there is only one data point
    const result = [
      {
        area: data[0].Kelurahan + ", " + data[0].Kecamatan,
        score: 1.0,
      },
    ];
    displayResult(result);
    return;
  }

  // Step 1: Determine the best and worst values
  const best = Array(m).fill(Number.NEGATIVE_INFINITY);
  const worst = Array(m).fill(Number.POSITIVE_INFINITY);

  for (let j = 0; j < m; j++) {
    for (let i = 0; i < n; i++) {
      const value = parseFloat(data[i][criteria[j]]);
      if (value > best[j]) best[j] = value;
      if (value < worst[j]) worst[j] = value;
    }
  }

  // Step 2: Normalize the decision matrix
  const normalized = data.map((row) => {
    const normalizedRow = {};
    criteria.forEach((criterion, j) => {
      const value = parseFloat(row[criterion]);
      if (best[j] === worst[j]) {
        normalizedRow[criterion] = 0; // Prevent division by zero
      } else {
        if (criterion === "Resiko") {
          normalizedRow[criterion] = (worst[j] - value) / (worst[j] - best[j]);
        } else {
          normalizedRow[criterion] = (value - worst[j]) / (best[j] - worst[j]);
        }
      }
    });
    return normalizedRow;
  });

  // Step 3: Calculate Si and Ri
  const Si = Array(n).fill(0);
  const Ri = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const weight = weights[j];
      const value = normalized[i][criteria[j]];
      Si[i] += weight * value;
      if (value > Ri[i]) Ri[i] = value;
    }
  }

  // Step 4: Calculate the VIKOR index
  const S_min = Math.min(...Si);
  const S_max = Math.max(...Si);
  const R_min = Math.min(...Ri);
  const R_max = Math.max(...Ri);

  const Q = Si.map((si, i) => {
    const S_diff = S_max - S_min;
    const R_diff = R_max - R_min;
    const S_term = S_diff === 0 ? 0 : (si - S_min) / S_diff;
    const R_term = R_diff === 0 ? 0 : (Ri[i] - R_min) / R_diff;
    return 0.5 * S_term + 0.5 * R_term;
  });

  // Step 5: Rank the alternatives
  const results = data.map((row, i) => ({
    area: row.Kelurahan + ", " + row.Kecamatan,
    score: Q[i],
  }));

  results.sort((a, b) => b.score - a.score); // Sort in descending order

  displayResult(results);
}

function calculateTOPSIS(data) {
  const criteria = [
    "Resiko",
    "Jumlah Tenaga Kerja pada Sektor",
    "Klaster Industri",
    "Distribusi Listrik PLN",
    "Jumlah Pelanggan Air",
  ];
  const n = data.length;
  const m = criteria.length;

  if (n < 1) {
    alert("No data points to calculate TOPSIS.");
    return;
  }

  if (n === 1) {
    // Handle the case where there is only one data point
    const result = [
      {
        area: data[0].Kelurahan + ", " + data[0].Kecamatan,
        score: 1.0,
      },
    ];
    displayResult(result);
    return;
  }

  // Step 1: Normalize the decision matrix
  const normalized = data.map((row) => {
    const normalizedRow = {};
    criteria.forEach((criterion) => {
      normalizedRow[criterion] = parseFloat(row[criterion]);
    });
    return normalizedRow;
  });

  criteria.forEach((criterion) => {
    const column = normalized.map((row) => row[criterion]);
    const sumOfSquares = column.reduce((acc, value) => acc + value ** 2, 0);
    const normalizationFactor = Math.sqrt(sumOfSquares);
    normalized.forEach((row) => {
      row[criterion] = row[criterion] / normalizationFactor;
    });
  });

  // Step 2: Calculate entropy weights
  const entropyWeights = calculateEntropyWeights(normalized);

  // Step 3: Calculate weighted normalized matrix
  const weightedNormalized = normalized.map((row) => {
    const weightedRow = {};
    criteria.forEach((criterion, index) => {
      weightedRow[criterion] = row[criterion] * entropyWeights[index];
    });
    return weightedRow;
  });

  // Step 4: Determine positive and negative ideal solutions
  const positiveIdeal = {};
  const negativeIdeal = {};

  criteria.forEach((criterion) => {
    positiveIdeal[criterion] = Math.max(
      ...weightedNormalized.map((row) => row[criterion])
    );
    negativeIdeal[criterion] = Math.min(
      ...weightedNormalized.map((row) => row[criterion])
    );
  });

  // Step 5: Calculate distances to positive and negative ideal solutions
  const distancesToPositive = weightedNormalized.map((row) => {
    return Math.sqrt(
      criteria.reduce(
        (acc, criterion) =>
          acc + (row[criterion] - positiveIdeal[criterion]) ** 2,
        0
      )
    );
  });

  const distancesToNegative = weightedNormalized.map((row) => {
    return Math.sqrt(
      criteria.reduce(
        (acc, criterion) =>
          acc + (row[criterion] - negativeIdeal[criterion]) ** 2,
        0
      )
    );
  });

  // Step 6: Calculate similarity to ideal solution
  const similarity = distancesToNegative.map((distance, i) => {
    return distance / (distance + distancesToPositive[i]);
  });

  // Step 7: Rank the alternatives
  const results = data.map((row, i) => ({
    area: row.Kelurahan + ", " + row.Kecamatan,
    score: similarity[i],
  }));

  results.sort((a, b) => b.score - a.score); // Sort in descending order

  displayResult(results);
}

function calculateEntropyWeights(data) {
  const criteria = Object.keys(data[0]);
  const totalRows = data.length;
  const entropy = criteria.map((criterion) => {
    const column = data.map((row) => row[criterion]);
    const sum = column.reduce((acc, value) => acc + value, 0);
    const normalizedColumn = column.map((value) => value / sum);
    const entropy =
      -normalizedColumn.reduce((acc, value) => {
        return acc + (value === 0 ? 0 : value * Math.log(value));
      }, 0) / Math.log(totalRows);
    return 1 - entropy;
  });

  const totalEntropy = entropy.reduce((acc, value) => acc + value, 0);
  return entropy.map((value) => value / totalEntropy);
}
