const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const app = express();
const multer = require("multer");
const fs = require('fs');
const req = require("express/lib/request"); 

const port = 3000;

// Definir directorio de carga
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración del almacenamiento de Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Directorio donde se guardarán las imágenes
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Nombre único basado en la fecha
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const tiposValidos = ["image/jpeg", "image/png", "image/gif"];
        if (!tiposValidos.includes(file.mimetype)) {
            return cb(new Error("Archivo no permitido. Solo se permiten imágenes JPEG, PNG o GIF."));
        }
        cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
});

// Middleware para manejar errores en la carga de archivos
function handleUploadError(req, res, next) {
    upload.array('imagenes[]', 5)(req, res, (err) => { // Usar upload.array aquí como middleware
        if (err instanceof multer.MulterError) {
            return res.status(500).send("Error de Multer: " + err.message);
        } else if (err) {
            return res.status(500).send("Error al cargar archivos: " + err.message);
        }
        next();  // Si no hay errores, continuar
    });
}

app.use(session({
    secret: 'tu_clave_secreta',  
    resave: false,                
    saveUninitialized: true,     
    cookie: { secure: false }    
}));

const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

con.connect((err) => {
    if (err) {
        console.error("Error al conectar", err);
        return;
    }
    console.log("Conectado a la base de datos");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Registro de usuario
app.post('/registrarus', (req, res) => {
    const { correo, contra, usuario, rol } = req.body;

    if (!correo || !contra || !usuario || !rol) {
        return res.status(400).json({ error: "Todos los campos son requeridos." });
    }

    // Verificar si el correo ya está registrado
    con.query('SELECT * FROM clientes WHERE correo = ?', [correo], (err, result) => {
        if (err) {
            console.log("ERROR: ", err);
            return res.status(500).json({ error: 'Error al consultar la base de datos' });
        }

        if (result.length > 0) {
            return res.status(400).json({ error: 'El correo ya está registrado' });
        }

        // Insertar el nuevo usuario en la base de datos sin encriptar la contraseña
        const query = 'INSERT INTO clientes (nombre, correo, contraseña, tipo_usuario) VALUES (?, ?, ?, ?)';
        con.query(query, [usuario, correo, contra, rol], (err, result) => {
            if (err) {
                console.log("ERROR: ", err);
                return res.status(500).json({ error: 'Error al registrar el usuario' });
            }

            // Responder con éxito
            res.status(200).json({ success: true });
        });
    });
});

// Inicio de sesión
app.post('/iniciarsesion', (req, res) => {
    const { correo_i, contra_i } = req.body;

    if (!correo_i || !contra_i) {
        return res.status(400).json({ error: "Por favor, completa todos los campos." });
    }

    // Buscar al usuario en la base de datos
    con.query('SELECT id_usuario, correo, contraseña, tipo_usuario FROM clientes WHERE correo = ?', [correo_i], (err, respuesta) => {
        if (err) {
            console.log('ERROR: ', err);
            return res.status(500).json({ error: "Error al consultar la base de datos" });
        }

        if (respuesta.length > 0) {
            // Verificar la contraseña sin encriptación
            if (contra_i === respuesta[0].contraseña) {
                req.session.userId = respuesta[0].id_usuario;
                req.session.tipo_usuario = respuesta[0].tipo_usuario;

                // Redirigir dependiendo del tipo de usuario
                if (respuesta[0].tipo_usuario === 'admin') {
                    return res.status(200).json({ message: "Inicio de sesión exitoso", redirectTo: "/admin" });
                } else {
                    return res.status(200).json({ message: "Inicio de sesión exitoso", redirectTo: "/cliente" });
                }
            } else {
                return res.status(400).json({ error: "Credenciales incorrectas" });
            }
        } else {
            return res.status(400).json({ error: "Credenciales incorrectas" });
        }
    });
});

// Cerrar sesión
app.post('/cerrarsesion', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Error al cerrar sesión" });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: "Sesión cerrada correctamente" });
    });
});

// Página de login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página de registro
app.get('/registro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'registro.html'));
});

// Página de admin
app.get('/admin', (req, res) => {
    if (req.session.userId && req.session.tipo_usuario === 'admin') {
        res.sendFile(path.join(__dirname, 'public', 'crud.html'));
    } else {
        res.redirect('/login');
    }
});

// Página de cliente
app.get('/cliente', (req, res) => {
    if (req.session.userId) {
        res.sendFile(path.join(__dirname, 'public', 'inicio.html'));
    } else {
        res.redirect('/login');
    }
});

// Agregar producto
app.post('/agregarProducto', handleUploadError, (req, res) => {
    // Verificar que el usuario tenga rol de admin
    if (!req.session.userId || req.session.tipo_usuario !== 'admin') {
        return res.status(403).send("Acceso no autorizado");
    }

    const { nombre, precio, stock } = req.body;

    // Validar que los datos del producto estén presentes
    if (!nombre || !precio || !stock) {
        return res.status(400).send("Todos los campos del producto son requeridos");
    }

    // Insertar el producto en la base de datos
    con.query('INSERT INTO panes (nombre_pan, cantidad, precio_pan) VALUES (?, ?, ?)', 
        [nombre, stock, precio], (err, result) => {
            if (err) {
                console.log("Error al insertar el producto:", err);
                return res.status(500).send("Error al insertar el producto");
            }

            const id_pan = result.insertId; // ID del producto recién insertado

            // Si se han subido imágenes, guardarlas en la base de datos
            if (req.files && req.files.length > 0) {
                req.files.forEach(file => {
                    const imageUrl = `/uploads/${path.basename(file.path)}`;
                    console.log('Imagen subida:', imageUrl); // Verifica si la URL de la imagen es correcta
                    con.query('INSERT INTO Fotos (id_pan, url) VALUES (?, ?)', [id_pan, imageUrl], (err) => {
                        if (err) {
                            console.log("Error al insertar foto en la base de datos", err);
                            return res.status(500).send("Error al insertar fotos en la base de datos");
                        }
                    });
                });
            }

            return res.send("Producto y fotos agregados correctamente");
        });
});

// Consultar productos con sus imágenes
app.get('/obtenerProductos', (req, res) => {
    const query = `
        SELECT p.id_pan, p.nombre_pan, p.precio_pan, p.cantidad, f.url 
        FROM panes p
        LEFT JOIN Fotos f ON p.id_pan = f.id_pan
    `;
    
    con.query(query, (err, panes) => {
        if (err) {
            console.log('Error al obtener productos:', err);
            return res.status(500).json({ error: "Error al obtener productos" });
        }

        // Formatear las URLs de las imágenes
        panes = panes.map(pan => {
            return {
                ...pan,
                url_imagen: pan.url ? `/uploads/${path.basename(pan.url)}` : '/uploads/default.jpg'
            };
        });

        console.log("Panes:", panes);  // Verifica que los panes y las imágenes se obtengan correctamente
        return res.json(panes);
    });
});


// Actualizar producto
app.post('/actualizarProducto', (req, res) => {
    // Verificar que el usuario tenga rol de admin
    if (!req.session.userId || req.session.tipo_usuario !== 'admin') {
        return res.status(403).send("Acceso no autorizado");
    }

    const { id_producto, nuevo_nombre, nuevo_precio, nuevo_stock } = req.body;

    // Validar que los datos del producto estén presentes
    if (!id_producto || !nuevo_nombre || !nuevo_precio || !nuevo_stock) {
        return res.status(400).send("Todos los campos del producto son requeridos");
    }

    // Actualizar producto
    con.query('UPDATE panes SET nombre_pan = ?, precio_pan = ?, cantidad = ? WHERE id_pan = ?', 
        [nuevo_nombre, nuevo_precio, nuevo_stock, id_producto], (err) => {
            if (err) {
                console.log("Error al actualizar producto:", err);
                return res.status(500).send("Error al actualizar producto");
            }

            return res.send("Producto actualizado correctamente");
        });
});

// Eliminar producto
app.post('/borrarProducto', (req, res) => {
    // Verificar que el usuario tenga rol de admin
    if (!req.session.userId || req.session.tipo_usuario !== 'admin') {
        return res.status(403).send("Acceso no autorizado");
    }

    const { id_producto } = req.body;

    if (!id_producto) {
        return res.status(400).send("El ID del producto es requerido");
    }

    // Eliminar las fotos asociadas al producto
    con.query('SELECT url FROM Fotos WHERE id_pan = ?', [id_producto], (err, fotos) => {
        if (err) {
            console.log("Error al obtener fotos del producto:", err);
            return res.status(500).send("Error al obtener fotos del producto");
        }

        fotos.forEach(foto => {
            const filePath = path.join(__dirname, 'public', foto.url);
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.log("Error al eliminar archivo:", err);
                }
            });
        });

        // Eliminar fotos de la base de datos y producto
        con.query('DELETE FROM Fotos WHERE id_pan = ?', [id_producto], (err) => {
            if (err) {
                console.log("Error al eliminar fotos", err);
                return res.status(500).send("Error al eliminar fotos");
            }

            // Eliminar el producto
            con.query('DELETE FROM panes WHERE id_pan = ?', [id_producto], (err) => {
                if (err) {
                    console.log("Error al eliminar producto", err);
                    return res.status(500).send("Error al eliminar producto");
                }

                return res.send("Producto y fotos eliminados correctamente");
            });
        });
    });
});

app.post('/agregarfondos', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "No has iniciado sesión" });
    }
    const userId = req.session.userId;
    const { cantidad } = req.body;

    
    if (isNaN(cantidad)) {
        return res.status(400).json({ error: "La cantidad debe ser un número" });
    }

    
    con.query('INSERT INTO dinero (id_usuario, cantidad) VALUES (?, ?) ON DUPLICATE KEY UPDATE cantidad = cantidad + VALUES(cantidad)', 
    [userId, cantidad], (err, respuesta) => {
        if (err) {
            console.log('ERROR: ', err);
            return res.status(500).json({ error: "Error al actualizar los fondos" });
        }
        return res.status(200).json({ message: "Fondos agregados correctamente" });
    });
});

app.post('/cargarfondos', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: "No has iniciado sesión" });
    }
    const userId = req.session.userId;

    con.query('SELECT cantidad FROM dinero WHERE id_usuario = ?', [userId], (err, respuesta) => {
        if (err) {
            console.log('ERROR: ', err);
            return res.status(500).json({ error: "Error al consultar la base de datos" });
        }
        if (respuesta.length > 0) {
            return res.status(200).json({ message: "Fondos cargados correctamente", cantidad: respuesta[0].cantidad });
        } else {
            return res.status(404).json({ error: "No se encontraron fondos para este usuario" });
        }
    });
});





app.post('/comprarpanes', (req, res) => {
    const userId = req.session.userId;
    const { productos, total } = req.body;

    if (!productos || productos.length === 0) {
        return res.status(400).json({ error: "No se ha proporcionado ningún producto" });
    }

    con.beginTransaction((err) => {
        if (err) {
            console.error("Error al iniciar la transacción:", err);
            return res.status(500).json({ error: "Error al iniciar la transacción" });
        }

        const obtenerDineroUsuario = 'SELECT cantidad FROM dinero WHERE id_usuario = ?';
        con.query(obtenerDineroUsuario, [userId], (err, result) => {
            if (err) {
                console.error("Error al obtener el saldo del usuario:", err);
                return con.rollback(() => {
                    res.status(500).json({ error: "Error al obtener el saldo del usuario" });
                });
            }

            if (result.length === 0 || result[0].cantidad < total) {
                console.error("Saldo insuficiente para el usuario:", userId);
                return con.rollback(() => {
                    res.status(400).json({ error: "No tienes suficiente dinero para realizar la compra" });
                });
            }

            const actualizarSaldoUsuario = 'UPDATE dinero SET cantidad = cantidad - ? WHERE id_usuario = ?';
            con.query(actualizarSaldoUsuario, [total, userId], (err) => {
                if (err) {
                    console.error("Error al actualizar el saldo del usuario:", err);
                    return con.rollback(() => {
                        res.status(500).json({ error: "Error al actualizar el saldo del usuario" });
                    });
                }

                const insertarPedido = 'INSERT INTO pedidos (id_usuario, total) VALUES (?, ?)';
                con.query(insertarPedido, [userId, total], (err, resultadoPedido) => {
                    if (err) {
                        console.error("Error al registrar el pedido:", err);
                        return con.rollback(() => {
                            res.status(500).json({ error: "Error al registrar el pedido" });
                        });
                    }

                    const idPedido = resultadoPedido.insertId;
                    let queryActualizarPanes = '';
                    let valoresActualizarPanes = [];
                    let queryInsertarCompras = ''; // Para insertar en la tabla 'compras'
                    let valoresInsertarCompras = [];

                    for (const producto of productos) {
                        const idPan = parseInt(producto.id_pan);
                        const cantidad = parseInt(producto.cantidad);

                        if (!idPan || isNaN(cantidad) || cantidad <= 0) {
                            console.error(`Producto inválido: ${JSON.stringify(producto)}`);
                            return con.rollback(() => {
                                res.status(400).json({ error: "Producto con datos inválidos" });
                            });
                        }

                        queryActualizarPanes += 'UPDATE panes SET cantidad = cantidad - ? WHERE id_pan = ?;';
                        valoresActualizarPanes.push(cantidad, idPan);

                        // Aquí insertamos en la tabla 'compras'
                        const precioPanQuery = 'SELECT precio_pan FROM panes WHERE id_pan = ?';
                        con.query(precioPanQuery, [idPan], (err, precioResult) => {
                            if (err || precioResult.length === 0) {
                                console.error("Error al obtener el precio del pan:", err);
                                return con.rollback(() => {
                                    res.status(500).json({ error: "Error al obtener el precio del pan" });
                                });
                            }

                            const precioPan = precioResult[0].precio_pan;
                            const totalCompra = precioPan * cantidad;
                            queryInsertarCompras += 'INSERT INTO compras (id_usuario, id_pan, cantidad, total_compra) VALUES (?, ?, ?, ?);';
                            valoresInsertarCompras.push(userId, idPan, cantidad, totalCompra);

                            // Si es el último producto, ejecutamos todo
                            if (productos.indexOf(producto) === productos.length - 1) {
                                con.query(queryActualizarPanes, valoresActualizarPanes, (err) => {
                                    if (err) {
                                        console.error("Error al actualizar los panes en la base de datos:", err);
                                        return con.rollback(() => {
                                            res.status(500).json({ error: "Error al actualizar los panes en la base de datos" });
                                        });
                                    }

                                    // Insertamos los datos en la tabla 'compras'
                                    con.query(queryInsertarCompras, valoresInsertarCompras, (err) => {
                                        if (err) {
                                            console.error("Error al insertar en la tabla de compras:", err);
                                            return con.rollback(() => {
                                                res.status(500).json({ error: "Error al insertar en la tabla de compras" });
                                            });
                                        }

                                        con.commit((err) => {
                                            if (err) {
                                                console.error("Error al confirmar la transacción:", err);
                                                return con.rollback(() => {
                                                    res.status(500).json({ error: "Error al confirmar la transacción" });
                                                });
                                            }

                                            res.status(200).json({ message: "Compra realizada exitosamente", idPedido });
                                        });
                                    });
                                });
                            }
                        });
                    }
                });
            });
        });
    });
});

// Ruta para obtener todas las compras realizadas
app.get('/compras', (req, res) => {
    // Consulta SQL para obtener todas las compras
    const query = `
      SELECT c.nombre AS cliente, cp.id_pan, p.nombre_pan, cp.cantidad, p.precio_pan, 
        (cp.cantidad * p.precio_pan) AS total_compra
      FROM compras cp
      JOIN panes p ON cp.id_pan = p.id_pan
      JOIN clientes c ON cp.id_usuario = c.id_usuario
    `;
  
    con.execute(query, (err, results) => {
      if (err) {
        console.error('Error al obtener las compras:', err);
        return res.status(500).json({ error: 'Hubo un error al obtener las compras' });
      }
  
      if (results.length === 0) {
        return res.status(404).json({ message: 'No se encontraron compras.' });
      }
  
      // Enviar la respuesta con los datos de las compras
      res.status(200).json(results);
    });
});



app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
