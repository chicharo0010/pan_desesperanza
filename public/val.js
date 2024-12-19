document.getElementById('agregarProducto').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevenir el envío estándar del formulario

    const form = event.target;

    // Obtener los valores de los campos
    const nombre = document.getElementById('nomb_p').value.trim();
    const precio = parseFloat(document.getElementById('precio_p').value);
    const stock = parseInt(document.getElementById('cant_p').value, 10);
    const imagenes = document.getElementById('imagenes').files;

    // Validar que todos los campos estén completos
    if (!nombre || isNaN(precio) || isNaN(stock)) {
        alert('Por favor, completa todos los campos obligatorios.');
        return;
    }

    // Validar que el precio y el stock sean mayores que cero
    if (precio <= 0 || stock <= 0) {
        alert('El precio y el stock deben ser mayores que cero.');
        return;
    }

    // Validar que el precio y el stock no tengan más de 7 dígito
    if (precio > 9999999 || stock > 9999999) {
        alert('El precio y la cantidad no deben tener más de 7 dígitos.');
        return;
    }

    // Crear un FormData para incluir archivos e información del producto
    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('precio', precio);
    formData.append('stock', stock);

    for (const file of imagenes) {
        formData.append('imagenes[]', file);
    }

    try {
        // Realizar la petición al servidor
        const response = await fetch('/agregarProducto', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error desconocido al agregar el producto.');
        }

        const result = await response.text();
        alert(result); // Mostrar el resultado al usuario
        form.reset(); // Limpiar el formulario si fue exitoso

    } catch (error) {
        console.error('Error al registrar el producto:', error);
        alert(`Error al registrar el producto: ${error.message}`);
    }
});
