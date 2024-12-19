// Variables
const carrito = document.querySelector('#carrito');
const catalogo = document.querySelector('#catalogo');
const contenedorCarrito = document.querySelector('#lista-carrito tbody');
const vaciarCarritoBtn = document.querySelector('#vaciar-carrito'); 
let articulosCarrito = [];

// Listeners
cargarEventListeners();

function cargarEventListeners() {
    // Agregar al carrito
    catalogo.addEventListener('click', agregarAlCarrito);

    // Eliminar producto del carrito
    carrito.addEventListener('click', eliminarProducto);

    // Vaciar carrito
    vaciarCarritoBtn.addEventListener('click', vaciarCarrito);

    // Cargar datos al iniciar la página
    document.addEventListener("DOMContentLoaded", () => {
        cargarPanes(); // Cargar los panes del servidor
        cargarCarritoDesdeStorage(); // Cargar carrito desde LocalStorage
    });
}

// Función para cargar panes desde la base de datos
function cargarPanes() {
    fetch('/obtenerProductos')
        .then(response => {
            if (!response.ok) throw new Error("Error al cargar los productos");
            return response.json();
        })
        .then(data => {
            mostrarPanes(data);
        })
        .catch(error => console.error("Error al cargar los productos:", error));
}

// Función para mostrar panes en el catálogo
function mostrarPanes(productos = []) {
    const catalogo = document.getElementById('catalogo');  // Asegúrate de tener este elemento en tu HTML
    catalogo.innerHTML = ''; // Limpiar el catálogo

    if (productos.length === 0) {
        catalogo.innerHTML = '<p>No se encontraron productos.</p>';
        return;
    }

    productos.forEach(producto => {
        const nombre = producto.nombre_pan || 'No disponible';
        const precio = producto.precio_pan || 'No disponible';
        const stock = producto.cantidad || 'No disponible';
        const img = producto.url_imagen || 'https://via.placeholder.com/150'; // Imagen por defecto si no existe
        const id = producto.id_pan;  // Asegúrate de usar id_pan que es el que el backend retorna
        console.log(id);  // Debugging para asegurar que el id esté bien

        const panDiv = document.createElement("div");
        panDiv.className = "productos";
        panDiv.innerHTML = `
            <img src="${img}" alt="${nombre}" class="pan-img">
            <div class="productos-info">
                <h3>${nombre}</h3>
                <p><strong>Precio:</strong> ${precio}</p>
                <p><strong>Cantidad:</strong> ${stock}</p>
                <button class="btn-agregar-carrito" 
                data-id="${id}" 
                data-stock="${stock}">
                Agregar al carrito
                </button>
            </div>
        `;
        catalogo.appendChild(panDiv);
    });
}



// Función para agregar un pan al carrito
function agregarAlCarrito(e) {
    e.preventDefault();

    if (e.target.classList.contains('btn-agregar-carrito')) {
        const pan = e.target.closest('.productos'); // Obtener el contenedor principal
        leerDatosPan(pan);
    }
}

// Leer los datos del pan seleccionado
function leerDatosPan(pan) {
    const btnAgregar = pan.querySelector('.btn-agregar-carrito');
    const stockDisponible = parseInt(btnAgregar.getAttribute('data-stock')) || 0;

    const infoPan = {
        imagen: pan.querySelector('img').src,
        nombre: pan.querySelector('h3').textContent,
        precio: pan.querySelector('p strong').nextSibling.textContent.trim(),
        id: btnAgregar.getAttribute('data-id'),
        stock: stockDisponible,
        cantidad: 1
    };

    // Verificar si el producto ya está en el carrito
    const productoExistente = articulosCarrito.find(producto => producto.id === infoPan.id);

    if (productoExistente) {
        if (productoExistente.cantidad < stockDisponible) {
            productoExistente.cantidad++;
        } else {
            alert(`No puedes agregar más unidades de "${infoPan.nombre}". Stock máximo alcanzado.`);
        }
    } else {
        if (stockDisponible > 0) {
            articulosCarrito = [...articulosCarrito, infoPan];
        } else {
            alert(`"${infoPan.nombre}" está agotado y no se puede agregar al carrito.`);
        }
    }

    // Guardar en LocalStorage y actualizar el carrito en el DOM
    sincronizarCarrito();
    carritoHTML();
}

// Eliminar un producto del carrito
function eliminarProducto(e) {
    e.preventDefault();

    if (e.target.classList.contains('borrar-curso')) {
        const productoId = e.target.getAttribute('data-id');
        articulosCarrito = articulosCarrito.filter(producto => producto.id !== productoId);

        sincronizarCarrito();
        carritoHTML();
    }
}

// Mostrar carrito en el DOM
function carritoHTML() {
    vaciarCarritoDOM(); // Limpiar el HTML previo

    articulosCarrito.forEach(producto => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${producto.imagen}" width="100"></td>
            <td>${producto.nombre}</td>
            <td>$${producto.precio}</td>
            <td>${producto.cantidad}</td>
            <td><a href="#" class="borrar-curso" data-id="${producto.id}">X</a></td>
        `;
        contenedorCarrito.appendChild(row);
    });
}

// Vaciar carrito en el DOM sin afectar la memoria
function vaciarCarritoDOM() {
    while (contenedorCarrito.firstChild) {
        contenedorCarrito.removeChild(contenedorCarrito.firstChild);
    }
}

// Vaciar carrito completo
function vaciarCarrito() {
    articulosCarrito = [];
    sincronizarCarrito();
    carritoHTML();
}

// Sincronizar carrito con LocalStorage
function sincronizarCarrito() {
    localStorage.setItem('carrito', JSON.stringify(articulosCarrito));
}

// Cargar carrito desde LocalStorage
function cargarCarritoDesdeStorage() {
    const carritoStorage = JSON.parse(localStorage.getItem('carrito')) || [];
    articulosCarrito = carritoStorage;
    carritoHTML();
}
