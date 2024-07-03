document.getElementById('vlsmForm').addEventListener('submit', function (e) {
    e.preventDefault();

    const subnets = Array.from(document.querySelectorAll('.subnet-input input')).map(input => parseInt(input.value));
    const results = calculateVLSM(subnets);
    displayResults(results);
});

document.addEventListener('DOMContentLoaded', function () {
    const subnetContainer = document.getElementById('subnets');

    // Función para eliminar un host
    function deleteHostInput(inputContainer) {
        inputContainer.querySelector('.delete-host-button').addEventListener('click', function () {
            inputContainer.remove();
        });
    }

    function addSubnetInput() {
        const newIndex = subnetContainer.children.length + 1;
        const newSubnetInput = document.createElement('div');
        newSubnetInput.className = 'subnet-input';
        newSubnetInput.innerHTML = `
            <label for="subnet-${newIndex}">Subred ${newIndex}:</label>
            <input type="number" id="subnet-${newIndex}" name="subnet-${newIndex}" placeholder="0" required>
            <button type="button" class="delete-host-button">-</button>
        `;
        subnetContainer.appendChild(newSubnetInput);
        deleteHostInput(newSubnetInput);
    }

    document.getElementById('addSubnetButton').addEventListener('click', addSubnetInput);

    // Manejar clics en botones de eliminación utilizando enfoque delegado
    subnetContainer.addEventListener('click', function (event) {
        if (event.target && event.target.classList.contains('delete-host-button')) {
            const inputContainer = event.target.closest('.subnet-input');
            if (inputContainer) {
                inputContainer.remove();
            }
        }
    });

});

function calculateVLSM(subnets) {
    subnets.sort((a, b) => b - a); // Ordenar subredes por tamaño descendente

    let currentAddress = ipToBinary("0.0.0.0");
    const results = subnets.map((hosts, index) => {
        const bitsNeeded = Math.ceil(Math.log2(hosts + 2)); // +2 para incluir network y broadcast
        const prefixLength = 32 - bitsNeeded;
        const subnetSize = Math.pow(2, bitsNeeded);

        const startIp = binaryToIp(currentAddress);
        const endIp = binaryToIp(addBinary(currentAddress, subnetSize - 1));

        // Calcular la dirección de broadcast
        const broadcastAddress = binaryToIp(addBinary(currentAddress, subnetSize - 1));

        // Calcular el rango utilizable (excluyendo la dirección de red y la de broadcast)
        const usableRange = `${binaryToIp(addBinary(currentAddress, 1))} - ${binaryToIp(addBinary(currentAddress, subnetSize - 2))}`;

        const subnet = {
            subnet: `Subred ${index + 1}`,
            hosts: hosts,
            mask: prefixLengthToMask(prefixLength),
            slash: `/${prefixLength}`,
            startIp: startIp,
            endIp: endIp,
            usableRange: usableRange,
            broadcast: broadcastAddress,
            wildcard: calculateWildcard(prefixLengthToMask(prefixLength))
        };

        currentAddress = addBinary(currentAddress, subnetSize);
        return subnet;
    });

    return results;
}

function ipToBinary(ip) {
    return ip.split('.').map(Number).map(dec => dec.toString(2).padStart(8, '0')).join('');
}

function binaryToIp(binary) {
    return binary.match(/.{1,8}/g).map(bin => parseInt(bin, 2)).join('.');
}

function addBinary(binary, value) {
    return (parseInt(binary, 2) + value).toString(2).padStart(32, '0');
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'table-responsive';

    const table = document.createElement('table');
    table.className = 'cell-border';
    table.id = 'miTabla';
    table.style = 'width:100%';

    // Encabezados de columna
    const headerRow = document.createElement('tr');
    const headers = ['Subred', 'Hosts', 'Máscara', 'Slash', 'Inicio IP', 'Fin IP', 'Rango Utilizable', 'Broadcast', 'Wildcard'];
    headers.forEach(headerText => {
        const header = document.createElement('th');
        header.textContent = headerText;
        headerRow.appendChild(header);
    });
    const thead = document.createElement('thead');
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Contenido de la tabla
    const tbody = document.createElement('tbody');
    results.forEach(subnet => {
        const row = document.createElement('tr');
        const data = [
            subnet.subnet,
            subnet.hosts,
            subnet.mask,
            subnet.slash,
            subnet.startIp,
            subnet.endIp,
            subnet.usableRange,
            subnet.broadcast,
            subnet.wildcard
        ];
        data.forEach(text => {
            const cell = document.createElement('td');
            cell.textContent = text;
            row.appendChild(cell);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    tableWrapper.appendChild(table);
    resultsDiv.appendChild(tableWrapper);

    // Inicializar DataTables después de generar la tabla
    $('#miTabla').DataTable({
        responsive: true
    });
}

function prefixLengthToMask(prefixLength) {
    const binaryMask = '1'.repeat(prefixLength).padEnd(32, '0');
    return binaryToIp(binaryMask);
}

function calculateWildcard(mask) {
    const binaryMask = ipToBinary(mask);
    const wildcardBinary = binaryMask.split('').map(bit => bit === '1' ? '0' : '1').join('');
    return binaryToIp(wildcardBinary);
}