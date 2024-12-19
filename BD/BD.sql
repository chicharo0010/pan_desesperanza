create database  desesperanza;
use desesperanza;
select * from clientes;
create table clientes(
id_usuario int auto_increment primary key,
nombre varchar(50) not null,
correo varchar(50) not null,
contraseña varchar(100) not null,
tipo_usuario ENUM('cliente', 'admin') NOT NULL
);
create table panes(
id_pan int auto_increment primary key,
nombre_pan varchar(30) not null,
cantidad int not null,
precio_pan int not null
);
create table tiket(
id_factura  int auto_increment primary key,
id_usuario int not null,
total int not null,
foreign key (id_usuario) references clientes (id_usuario)
);
 create table Productos_Facturas(
 id_factura  int not null,
 id_pan  int not null,
 cantidad int not null,
 foreign key (id_factura) references facturas (id_factura),
 foreign key (id_pan) references panes (id_pan)
 );
create table pedidos(
id_pedido int auto_increment primary key,
id_usuario int not null,
total int not null, 
foreign key (id_usuario) references clientes (id_usuario)
);

CREATE TABLE Fotos (
    id_foto INT AUTO_INCREMENT PRIMARY KEY,
    id_pan INT NOT NULL,
    url VARCHAR(255) NOT NULL,
    FOREIGN KEY (id_pan) REFERENCES panes(id_pan)
);

create table prdts_pedidos (
id_pedido int not null,
id_pan int not null,
cantidad int not null,
foreign key (id_pedido) references pedidos (id_pedido),
foreign key (id_pan) references panes (id_pan)
);
