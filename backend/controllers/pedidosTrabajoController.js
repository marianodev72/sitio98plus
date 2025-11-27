import PedidoTrabajo from "../models/PedidoTrabajo.js";

// ------------------------------
// LISTAR MIS PEDIDOS
// ------------------------------
export const listarMisPedidos = async (req, res) => {
  try {
    const pedidos = await PedidoTrabajo.find({ creadoPor: req.user.id })
      .sort({ createdAt: -1 });

    res.json(pedidos);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener pedidos" });
  }
};

// ------------------------------
// CREAR BORRADOR
// ------------------------------
export const crearPedido = async (req, res) => {
  try {
    const pedido = await PedidoTrabajo.create({
      creadoPor: req.user.id,
      permisionario: req.body.permisionario,
    });

    res.json(pedido);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error al crear pedido" });
  }
};

// ------------------------------
// EDITAR BORRADOR
// ------------------------------
export const editarPedido = async (req, res) => {
  try {
    const pedido = await PedidoTrabajo.findOne({
      _id: req.params.id,
      creadoPor: req.user.id,
      estado: "BORRADOR",
    });

    if (!pedido) {
      return res.status(400).json({ error: "El pedido no está en borrador o no existe" });
    }

    pedido.permisionario = req.body.permisionario;

    await pedido.save();
    res.json(pedido);
  } catch (error) {
    res.status(500).json({ error: "Error al actualizar pedido" });
  }
};

// ------------------------------
// ENVIAR AL INSPECTOR
// ------------------------------
export const enviarPedido = async (req, res) => {
  try {
    const pedido = await PedidoTrabajo.findOne({
      _id: req.params.id,
      creadoPor: req.user.id,
      estado: "BORRADOR",
    });

    if (!pedido) {
      return res.status(400).json({ error: "No se puede enviar este pedido" });
    }

    pedido.estado = "ENVIADO_A_INSPECTOR";
    pedido.permisionario.fechaEnvio = new Date();

    pedido.historialEstados.push({
      estado: "ENVIADO_A_INSPECTOR",
      cambiadoPor: req.user.id,
      fecha: new Date(),
    });

    await pedido.save();

    res.json({ message: "Pedido enviado al inspector", pedido });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar pedido" });
  }
};
