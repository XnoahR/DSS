document.addEventListener('DOMContentLoaded', (event) => {
    document.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        const selectedSector = document.getElementById('sector').value;
        fetch('data.json')
            .then(response => response.json())
            .then(data => {
                const filteredData = data.filter(row => row['Kode_Kbli'] == selectedSector);
                if (filteredData.length > 0) {
                    calculateVIKOR(filteredData);
                } else {
                    alert('No data available for the selected sector.');
                }
            })
            .catch(error => console.error('Error fetching the data:', error));
    });
});

function calculateVIKOR(data) {
    const criteria = ["Resiko", "Jumlah Tenaga Kerja pada Sektor", "Klaster Industri", "Distribusi Listrik PLN", "Jumlah Pelanggan Air"];
    const weights = [0.2, 0.2, 0.2, 0.2, 0.2]; // Adjust weights to include the new criterion
    const n = data.length;
    const m = criteria.length;

    if (n < 1) {
        alert('No data points to calculate VIKOR.');
        return;
    }

    if (n === 1) {
        // Handle the case where there is only one data point
        const result = [{
            area: data[0].Kelurahan + ", " + data[0].Kecamatan,
            score: 1.0
        }];

        // Display results
        const resultTable = document.getElementById("resultTable");
        resultTable.innerHTML = result.map((result, index) => `
            <tr class="bg-white dark:bg-gray-800">
                <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                    ${index + 1}
                </th>
                <td class="px-6 py-4">
                    ${result.area}
                </td>
                <td class="px-6 py-4">
                    ${result.score.toFixed(4)}
                </td>
            </tr>
        `).join('');
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
    const normalized = data.map(row => {
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
        score: Q[i]
    }));

    results.sort((a, b) => b.score - a.score); // Sort in descending order

    // Display results
    const resultTable = document.getElementById("resultTable");
    resultTable.innerHTML = results.map((result, index) => `
        <tr class="bg-white dark:bg-gray-800">
            <th scope="row" class="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
                ${index + 1}
            </th>
            <td class="px-6 py-4">
                ${result.area}
            </td>
            <td class="px-6 py-4">
                ${result.score.toFixed(4)}
            </td>
        </tr>
    `).join('');
}