// Función para obtener todas las compras y mostrarlas en la tabla
function mostrarCompras() {
  // Hacemos la solicitud fetch al servidor para obtener todas las compras
  fetch('http://localhost:3000/compras')
    .then(response => {
      // Si la respuesta es ok (200), la parseamos como JSON
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('No se encontraron compras o hubo un error al obtener los datos.');
      }
    })
    .then(compras => {
      // Llamamos a la función que muestra los datos en la tabla
      mostrarDatosEnTabla(compras);
    })
    .catch(error => {
      alert(error.message);
    });
}

// Función para mostrar los datos en la tabla
function mostrarDatosEnTabla(compras) {
  const tableBody = document.querySelector('#comprasTable tbody');
  
  // Limpiamos la tabla antes de agregar nuevos datos
  tableBody.innerHTML = '';

  // Si no hay compras, mostramos un mensaje
  if (compras.length === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.textContent = 'No se encontraron compras.';
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  // Iteramos sobre las compras y agregamos una fila para cada una
  compras.forEach(compra => {
    const row = document.createElement('tr');

    // Creamos las celdas para cada dato de la compra
    const clienteCell = document.createElement('td');
    clienteCell.textContent = compra.cliente;
    row.appendChild(clienteCell);

    const idPanCell = document.createElement('td');
    idPanCell.textContent = compra.id_pan;
    row.appendChild(idPanCell);

    const nombrePanCell = document.createElement('td');
    nombrePanCell.textContent = compra.nombre_pan;
    row.appendChild(nombrePanCell);

    const cantidadCell = document.createElement('td');
    cantidadCell.textContent = compra.cantidad;
    row.appendChild(cantidadCell);

    const precioCell = document.createElement('td');
    precioCell.textContent = compra.precio_pan;
    row.appendChild(precioCell);

    const totalCompraCell = document.createElement('td');
    totalCompraCell.textContent = compra.total_compra;
    row.appendChild(totalCompraCell);

    // Agregamos la fila a la tabla
    tableBody.appendChild(row);
  });
}

// Llamamos a la función para cargar las compras al inicio
mostrarCompras();
