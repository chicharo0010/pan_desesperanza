document.addEventListener("DOMContentLoaded", () => {
    cargarPanes(); // Cargar propiedades al iniciar
});

function cargarPanes() {
    // Obtener todas las propiedades sin filtros
    fetch('/obtenerProductos')
        .then(response => {
            if (!response.ok) throw new Error("Error al cargar los productos");
            return response.json();
        })
        .then(data => {
            mostrarPanes(data);
        })
        .catch(error => {
            console.error("Error al cargar los productos:", error);
        });
}

function mostrarPanes(productos = []) {
    const catalogo = document.getElementById("catalogopanes");
    catalogo.innerHTML = ''; // Limpiar el catálogo

    if (productos.length === 0) {
        catalogo.innerHTML = '<p>No se encontraron productos.</p>';
        return;
    }

    productos.forEach(producto => {

        const nombre = producto.nombre_pan || 'No disponible';
        const precio = producto.precio_pan || 'No disponible';
        const stock = producto.cantidad || 'No disponible';
        const img = producto.url || 'No disponible';
        const panDiv = document.createElement("div");
        panDiv.className = "productos";
        panDiv.innerHTML = `
            <img src="${img}" alt="pan" class="pan-img">
            <div class="productos-info">
                <h3>${nombre}</h3>
                <p><strong>Precio:</strong> ${precio}</p>
                <p><strong>Cantidad:</strong> ${stock}</p>
                <button class="btn-agregar-carrito" data-id="${producto.id}">Agregar al carrito</button>
            </div>
        `;
        catalogo.appendChild(panDiv);
    });

    // Añadir eventos a los botones "Agregar al carrito"
    const botonesCarrito = document.querySelectorAll(".btn-agregar-carrito");
    botonesCarrito.forEach(boton => {
        boton.addEventListener("click", agregarAlCarrito);
    });
}


document.getElementById('cerrarSesion').addEventListener('click', function(event) {
    event.preventDefault(); // Evita que el enlace haga la acción predeterminada

    // Realiza la solicitud al servidor para cerrar la sesión
    fetch('/cerrarsesion', {
        method: 'POST', // Especificamos que es una solicitud POST
        headers: {
            'Content-Type': 'application/json' // Indicamos que el cuerpo de la solicitud es JSON
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message);  // Muestra el mensaje de éxito
            window.location.href = '/login';  // Redirige a la página de login
        }
    })
    .catch(error => {
        console.error('Error al cerrar sesión:', error);
        alert('Hubo un error al cerrar la sesión.');
    });
});
